import { PrismaClient, Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type { SmartMoneyEvidenceReasonCode, SmartMoneyListQuery, SmartMoneyRange, SmartMoneyStockSummary, SectorSmartMoneySummary } from './smart-money-intelligence.types';
import { resolveMarketRegionFilter } from '../../shared/utils/market-scope';
import { resolveSmartMoneyConfig } from './smart-money-intelligence.config';
import { aggregateSectorSummaries } from './smart-money-intelligence.scoring';
import { missingOwnership } from './smart-money-intelligence.constants';
import {
  buildEvidenceEnvelope,
  computeFreshnessStatus,
  freshnessReasonCode,
  snapshotBoundary,
  validDate,
} from './smart-money-intelligence.evidence';

export type SmartMoneySnapshotWriteAction = 'created' | 'updated' | 'unchanged';

type SnapshotWhere = Prisma.SmartMoneyContextSnapshotWhereInput;

export class SmartMoneyIntelligenceRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async latestSnapshots(query: SmartMoneyListQuery, isDistribution: boolean = false): Promise<{ results: SmartMoneyStockSummary[], total: number }> {
    const config = resolveSmartMoneyConfig(query.region, query.assetType);
    const stockFilters = this.stockScopeFilters(query.region, query.assetType);

    const baseWhere: SnapshotWhere = {
      ...(stockFilters.length > 0 ? { stock: { AND: stockFilters } } : {}),
      range: query.range,
      ...(query.sector && { sector: query.sector }),
    };
    const snapshotDate = await this.latestSnapshotDate(this.validSnapshotWhere(baseWhere));
    if (!snapshotDate) return { results: [], total: 0 };

    const eligibility = isDistribution
      ? { OR: [{ status: 'DISTRIBUTION' }, { smartMoneyScore: { lte: config.distributionListScoreCeil } }] }
      : { OR: [{ status: 'ACCUMULATION' }, { smartMoneyScore: { gte: config.accumulationListScoreFloor } }] };

    const where: SnapshotWhere = {
      ...baseWhere,
      snapshotDate,
      AND: [
        ...(Array.isArray(baseWhere.AND) ? baseWhere.AND : baseWhere.AND ? [baseWhere.AND] : []),
        { status: { not: 'INSUFFICIENT_DATA' } },
        eligibility,
      ],
    };

    const orderBy: Prisma.SmartMoneyContextSnapshotOrderByWithRelationInput[] = [
      { smartMoneyScore: isDistribution ? 'asc' : 'desc' },
      { symbol: 'asc' },
      { instrumentId: 'asc' },
    ];

    const [count, rows] = await Promise.all([
      this.db.smartMoneyContextSnapshot.count({ where }),
      this.db.smartMoneyContextSnapshot.findMany({
        where,
        orderBy,
        skip: query.offset || 0,
        take: query.limit,
      })
    ]);

    return {
      results: rows.map(r => this.mapSnapshotToSummary(r)),
      total: count,
    };
  }

  async latestStockSnapshot(instrumentId: string, range: SmartMoneyRange): Promise<SmartMoneyStockSummary | null> {
    const row = await this.db.smartMoneyContextSnapshot.findFirst({
      where: {
        instrumentId,
        range,
      },
      orderBy: [
        { updatedAt: 'desc' },
        { snapshotDate: 'desc' },
      ],
    });

    if (!row) return null;
    return this.mapSnapshotToSummary(row);
  }

  async latestStockSnapshots(instrumentIds: string[], range: SmartMoneyRange): Promise<SmartMoneyStockSummary[]> {
    const uniqueIds = [...new Set(instrumentIds.filter(Boolean))];
    if (uniqueIds.length === 0) return [];
    const latestByInstrument = await this.db.smartMoneyContextSnapshot.groupBy({
      by: ['instrumentId'],
      where: {
        instrumentId: { in: uniqueIds },
        range,
      },
      _max: { updatedAt: true },
    });
    const latestPairs: Array<{ instrumentId: string; updatedAt: Date }> = latestByInstrument.flatMap((item: any) => (
      item._max?.updatedAt ? [{ instrumentId: item.instrumentId, updatedAt: item._max.updatedAt }] : []
    ));
    if (latestPairs.length === 0) return [];

    const rows = await this.db.smartMoneyContextSnapshot.findMany({
      where: {
        range,
        OR: latestPairs,
      },
      orderBy: [
        { updatedAt: 'desc' },
        { snapshotDate: 'desc' },
      ],
    });

    const latestRowsByInstrument = new Map<string, any>();
    for (const row of rows) {
      if (!latestRowsByInstrument.has(row.instrumentId)) {
        latestRowsByInstrument.set(row.instrumentId, row);
      }
    }
    return uniqueIds
      .flatMap((instrumentId) => {
        const row = latestRowsByInstrument.get(instrumentId);
        return row ? [this.mapSnapshotToSummary(row)] : [];
      });
  }

  async latestSectorSnapshots(range: SmartMoneyRange, query: Pick<SmartMoneyListQuery, 'region' | 'assetType'> = {}): Promise<SectorSmartMoneySummary[]> {
    const config = resolveSmartMoneyConfig(query.region, query.assetType);
    const stockFilters = this.stockScopeFilters(query.region, query.assetType);
    const baseWhere: SnapshotWhere = {
      ...(stockFilters.length > 0 ? { stock: { AND: stockFilters } } : {}),
      range,
    };
    const snapshotDate = await this.latestSnapshotDate(this.validSnapshotWhere(baseWhere));
    if (!snapshotDate) return [];

    const rows = await this.db.smartMoneyContextSnapshot.findMany({
      where: {
        ...baseWhere,
        snapshotDate,
        status: { not: 'INSUFFICIENT_DATA' },
      }
    });

    // Aggregate on the fly from the daily snapshots via the SHARED aggregator (the same
    // one the on-the-fly service path uses) so the two can never diverge — including the
    // thin-universe softening that prevents a 1–2 stock "sector" carrying a STRONG_* verdict.
    // Aggregating a few thousand integers in memory is <1ms, unlike refetching price bars.
    return aggregateSectorSummaries(rows.map((r) => this.mapSnapshotToSummary(r)), config);
  }

  async saveSnapshot(summary: SmartMoneyStockSummary): Promise<SmartMoneySnapshotWriteAction> {
    const snapshotDate = this.snapshotDateForSummary(summary);
    const where = {
      snapshotDate_instrumentId_range: {
        snapshotDate,
        instrumentId: summary.instrumentId,
        range: summary.range,
      }
    };

    const existing = await this.db.smartMoneyContextSnapshot.findUnique({ where });
    if (existing && this.sameSnapshotPayload(existing, summary)) {
      return 'unchanged';
    }

    await this.db.smartMoneyContextSnapshot.upsert({
      where,
      create: {
        snapshotDate,
        instrumentId: summary.instrumentId,
        symbol: summary.symbol,
        companyName: summary.companyName,
        sector: summary.sector,
        smartMoneyScore: summary.smartMoneyScore,
        status: summary.status,
        confidence: summary.confidence,
        accumulationSignalCount: summary.signals.filter(s => s.direction === 'ACCUMULATION').length,
        distributionSignalCount: summary.signals.filter(s => s.direction === 'DISTRIBUTION').length,
        unusualVolumeDetected: summary.signals.some(s => s.type === 'UNUSUAL_VOLUME'),
        explanation: summary.explanation,
        source: summary.source,
        dataStatus: summary.dataStatus,
        latestClose: summary.latestClose,
        latestVolume: summary.latestVolume,
        averageVolume20: summary.averageVolume20,
        dailyChangePercent: summary.dailyChangePercent,
        signals: summary.signals as any,
        insiderOwnership: summary.insiderOwnership as any,
        range: summary.range,
      },
      update: {
        companyName: summary.companyName,
        sector: summary.sector,
        smartMoneyScore: summary.smartMoneyScore,
        status: summary.status,
        confidence: summary.confidence,
        accumulationSignalCount: summary.signals.filter(s => s.direction === 'ACCUMULATION').length,
        distributionSignalCount: summary.signals.filter(s => s.direction === 'DISTRIBUTION').length,
        unusualVolumeDetected: summary.signals.some(s => s.type === 'UNUSUAL_VOLUME'),
        explanation: summary.explanation,
        source: summary.source,
        dataStatus: summary.dataStatus,
        latestClose: summary.latestClose,
        latestVolume: summary.latestVolume,
        averageVolume20: summary.averageVolume20,
        dailyChangePercent: summary.dailyChangePercent,
        signals: summary.signals as any,
        insiderOwnership: summary.insiderOwnership as any,
      }
    });
    return existing ? 'updated' : 'created';
  }

  private snapshotDateForSummary(summary: SmartMoneyStockSummary): Date {
    const basis = summary.snapshotDate || summary.dataThroughDate || summary.updatedAt;
    const parsed = basis ? new Date(String(basis)) : new Date();
    const snapshotDate = Number.isFinite(parsed.getTime()) ? parsed : new Date();
    snapshotDate.setUTCHours(0, 0, 0, 0);
    return snapshotDate;
  }

  private sameSnapshotPayload(row: any, summary: SmartMoneyStockSummary): boolean {
    const expected = this.snapshotComparable(summary);
    const actual = {
      symbol: row.symbol,
      companyName: row.companyName,
      sector: row.sector,
      smartMoneyScore: this.numberOrNull(row.smartMoneyScore),
      status: row.status,
      confidence: row.confidence,
      accumulationSignalCount: row.accumulationSignalCount,
      distributionSignalCount: row.distributionSignalCount,
      unusualVolumeDetected: row.unusualVolumeDetected,
      explanation: row.explanation,
      source: row.source,
      dataStatus: row.dataStatus,
      latestClose: this.numberOrNull(row.latestClose),
      latestVolume: this.numberOrNull(row.latestVolume),
      averageVolume20: this.numberOrNull(row.averageVolume20),
      dailyChangePercent: this.numberOrNull(row.dailyChangePercent),
      signals: row.signals || [],
      insiderOwnership: row.insiderOwnership || null,
    };
    return this.stableStringify(actual) === this.stableStringify(expected);
  }

  private snapshotComparable(summary: SmartMoneyStockSummary) {
    return {
      symbol: summary.symbol,
      companyName: summary.companyName,
      sector: summary.sector,
      smartMoneyScore: this.numberOrNull(summary.smartMoneyScore),
      status: summary.status,
      confidence: summary.confidence,
      accumulationSignalCount: summary.signals.filter(s => s.direction === 'ACCUMULATION').length,
      distributionSignalCount: summary.signals.filter(s => s.direction === 'DISTRIBUTION').length,
      unusualVolumeDetected: summary.signals.some(s => s.type === 'UNUSUAL_VOLUME'),
      explanation: summary.explanation,
      source: summary.source,
      dataStatus: summary.dataStatus,
      latestClose: this.numberOrNull(summary.latestClose),
      latestVolume: this.numberOrNull(summary.latestVolume),
      averageVolume20: this.numberOrNull(summary.averageVolume20),
      dailyChangePercent: this.numberOrNull(summary.dailyChangePercent),
      signals: summary.signals || [],
      insiderOwnership: summary.insiderOwnership || null,
    };
  }

  private numberOrNull(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private stableStringify(value: unknown): string {
    return JSON.stringify(this.stableValue(value));
  }

  private stableValue(value: unknown): unknown {
    if (value === null || value === undefined) return value ?? null;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => this.stableValue(item));
    if (typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = this.stableValue((value as Record<string, unknown>)[key]);
          return acc;
        }, {});
    }
    return value;
  }

  private assetTypeFilter(assetType?: string): Prisma.StockWhereInput | null {
    const normalized = assetType?.trim().toUpperCase();
    if (!normalized) return null;
    if (normalized === 'STOCK' || normalized === 'EQUITY') {
      return {
        OR: [
          { assetType: { in: ['STOCK', 'EQUITY'], mode: 'insensitive' } },
          { assetType: null },
        ],
      };
    }
    return { assetType: { equals: normalized, mode: 'insensitive' } };
  }

  private stockScopeFilters(region?: string, assetType?: string): Prisma.StockWhereInput[] {
    const stockFilters: Prisma.StockWhereInput[] = [];
    const regionFilter = resolveMarketRegionFilter(region);
    if (Object.keys(regionFilter).length > 0) stockFilters.push(regionFilter);
    const assetTypeFilter = this.assetTypeFilter(assetType);
    if (assetTypeFilter) stockFilters.push(assetTypeFilter);
    return stockFilters;
  }

  private validSnapshotWhere(where: SnapshotWhere): SnapshotWhere {
    return {
      ...where,
      status: { not: 'INSUFFICIENT_DATA' },
    };
  }

  private async latestSnapshotDate(where: SnapshotWhere): Promise<Date | null> {
    const groups = await this.db.smartMoneyContextSnapshot.groupBy({
      by: ['snapshotDate'],
      where,
      _count: { _all: true },
      _max: { updatedAt: true },
      orderBy: { snapshotDate: 'desc' },
    });
    if (!groups.length) return null;
    // Among date-groups with SUBSTANTIAL coverage, pick the most-recent DATA date.
    // The substantial filter is RELATIVE (>=50% of the peak day's row count): minor
    // day-to-day coverage variance is accepted (so the freshest run wins) while a tiny
    // partial/test-seed day is skipped. (An absolute `count >= maxCount` floor previously
    // stuck reads permanently on the single all-time-peak day.)
    const maxCount = Math.max(...groups.map((item: any) => Number(item._count?._all || 0)));
    const floor = maxCount * 0.5;
    const stableGroups = groups
      .filter((item: any) => Number(item._count?._all || 0) >= floor)
      .sort((a: any, b: any) => {
        // Latest DATA date (snapshotDate) wins — that is what the screen's "as of" means.
        // updatedAt (compute time) is only a tiebreak for the SAME snapshotDate; it must NOT
        // be the primary key, or re-computing an OLDER date would shadow the latest data date.
        const dateDelta = this.timeValue(b.snapshotDate) - this.timeValue(a.snapshotDate);
        if (dateDelta !== 0) return dateDelta;
        return this.timeValue(b._max?.updatedAt) - this.timeValue(a._max?.updatedAt);
      });
    return stableGroups[0]?.snapshotDate ?? groups[0]?.snapshotDate ?? null;
  }

  private timeValue(value: unknown): number {
    if (!value) return 0;
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isFinite(date.getTime()) ? date.getTime() : 0;
  }

  private mapSnapshotToSummary(row: any): SmartMoneyStockSummary {
    const snapshotDate = row.snapshotDate instanceof Date ? row.snapshotDate.toISOString().slice(0, 10) : null;
    const ownership = (row.insiderOwnership as any) || missingOwnership();
    const summary: SmartMoneyStockSummary = {
      instrumentId: row.instrumentId,
      symbol: row.symbol,
      companyName: row.companyName,
      sector: row.sector,
      smartMoneyScore: row.smartMoneyScore,
      status: row.status as any,
      confidence: row.confidence as any,
      explanation: row.explanation || '',
      updatedAt: row.updatedAt.toISOString(),
      dataStatus: row.dataStatus as any,
      source: row.source,
      range: row.range as SmartMoneyRange,
      latestClose: row.latestClose,
      latestVolume: row.latestVolume,
      averageVolume20: row.averageVolume20,
      dailyChangePercent: row.dailyChangePercent,
      signals: (row.signals as any) || [],
      insiderOwnership: ownership,
      researchUrl: `/research/stocks/${row.instrumentId}`,
      snapshotDate,
      dataThroughDate: snapshotDate,
    };
    return {
      ...summary,
      evidence: this.persistedEvidence(summary, row),
    };
  }

  private persistedEvidence(summary: SmartMoneyStockSummary, row: any): SmartMoneyStockSummary['evidence'] {
    const snapshotDate = summary.snapshotDate || null;
    const freshnessStatus = computeFreshnessStatus(validDate(row.updatedAt), snapshotBoundary(snapshotDate));
    const ownershipMissing = summary.insiderOwnership.ownershipDataStatus === 'MISSING';
    const unavailable = summary.status === 'INSUFFICIENT_DATA' || summary.dataStatus === 'ERROR';
    const limited = ownershipMissing || freshnessStatus !== 'CURRENT' || summary.dataStatus !== 'COMPLETE';
    const freshnessReason = freshnessReasonCode(freshnessStatus);
    const reasonCodes: SmartMoneyEvidenceReasonCode[] = [
      'PERSISTED_SNAPSHOT_USED',
      ...(freshnessReason ? [freshnessReason] : []),
      'DATA_THROUGH_FROM_SNAPSHOT_DATE',
      'DOWNSTREAM_PERSISTED_ONLY',
      ...(ownershipMissing ? ['OWNERSHIP_PLACEHOLDER' as SmartMoneyEvidenceReasonCode] : []),
    ];
    return buildEvidenceEnvelope({
      source: 'PERSISTED_SNAPSHOT',
      downstreamSafe: true,
      persistedAvailableAtRequestStart: true,
      requestedRange: summary.range,
      snapshotDate,
      dataThroughDate: snapshotDate,
      dataThroughBasis: 'SNAPSHOT_DATE',
      freshnessStatus,
      ownershipDataStatus: summary.insiderOwnership.ownershipDataStatus,
      evidenceStatus: unavailable ? 'UNAVAILABLE' : limited ? 'LIMITED' : 'USABLE',
      reasonCodes,
    });
  }
}
