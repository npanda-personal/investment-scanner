import { PrismaClient } from '@prisma/client';
import prisma from '../../db/prisma';
import type { SmartMoneyEvidenceReasonCode, SmartMoneyListQuery, SmartMoneyRange, SmartMoneyStockSummary, SectorSmartMoneySummary, SectorSmartMoneyStatus } from './smart-money-intelligence.types';
import { resolveMarketRegionFilter } from '../../shared/utils/market-scope';

export type SmartMoneySnapshotWriteAction = 'created' | 'updated' | 'unchanged';

/**
 * Classify an average sector smart-money score into a 5-band status.
 * Bands are tuned to the observed NSE score spread (approx 41–59 as of 2026-06):
 *   >= 62  → STRONG_ACCUMULATION
 *   56–61  → ACCUMULATING
 *   48–55  → NEUTRAL
 *   38–47  → DISTRIBUTING
 *   < 38   → STRONG_DISTRIBUTION
 */
function classifySectorScore(score: number): SectorSmartMoneyStatus {
  if (score >= 62) return 'STRONG_ACCUMULATION';
  if (score >= 56) return 'ACCUMULATING';
  if (score >= 48) return 'NEUTRAL';
  if (score >= 38) return 'DISTRIBUTING';
  return 'STRONG_DISTRIBUTION';
}

export class SmartMoneyIntelligenceRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async latestSnapshots(query: SmartMoneyListQuery, isDistribution: boolean = false): Promise<{ results: SmartMoneyStockSummary[], total: number }> {
    const stockFilters = this.stockScopeFilters(query.region, query.assetType);

    const baseWhere: any = {
      ...(stockFilters.length > 0 ? { stock: { AND: stockFilters } } : {}),
      range: query.range,
      ...(query.sector && { sector: query.sector }),
    };
    const snapshotDate = await this.latestSnapshotDate(this.validSnapshotWhere(baseWhere));
    if (!snapshotDate) return { results: [], total: 0 };

    const where: any = {
      ...baseWhere,
      snapshotDate,
    };

    if (isDistribution) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { status: { not: 'INSUFFICIENT_DATA' } },
        { OR: [{ status: 'DISTRIBUTION' }, { smartMoneyScore: { lte: 40 } }] },
      ];
    } else {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { status: { not: 'INSUFFICIENT_DATA' } },
        { OR: [{ status: 'ACCUMULATION' }, { smartMoneyScore: { gte: 60 } }] },
      ];
    }

    const orderBy: any = [
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
     const stockFilters = this.stockScopeFilters(query.region, query.assetType);
     const baseWhere: any = {
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

     // We aggregate on the fly from the daily snapshots.
     // In a truly massive system, we'd persist SectorSmartMoneySummary as well,
     // but aggregating 5,000 integers in memory takes <1ms and is fine for this scale,
     // unlike fetching price bars and recalculating signals from scratch.
     const groups = new Map<string, SmartMoneyStockSummary[]>();
     rows.forEach(r => {
       const summary = this.mapSnapshotToSummary(r);
       const sector = summary.sector || 'Unknown';
       groups.set(sector, [...(groups.get(sector) || []), summary]);
     });

     return [...groups.entries()].map(([sector, items]) => {
       const average = Math.round(items.reduce((sum, item) => sum + item.smartMoneyScore, 0) / Math.max(1, items.length));
       const sectorStatus: SectorSmartMoneyStatus = classifySectorScore(average);
       const dataStatus: any = items.some((item) => item.dataStatus === 'PARTIAL' || item.dataStatus === 'ERROR') ? 'PARTIAL' : 'COMPLETE';
       const updatedAt = items.map((item) => item.updatedAt).sort().at(-1) || new Date(0).toISOString();
       return {
         sector,
         averageSmartMoneyScore: average,
         accumulationCount: items.filter((item) => item.status === 'ACCUMULATION').length,
         distributionCount: items.filter((item) => item.status === 'DISTRIBUTION').length,
         unusualVolumeCount: items.filter((item) => item.signals.some((signal) => signal.type === 'UNUSUAL_VOLUME')).length,
         instrumentCount: items.length,
         sectorStatus,
         dataStatus,
         updatedAt,
       };
     }).sort((a, b) => b.averageSmartMoneyScore - a.averageSmartMoneyScore);
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

  private assetTypeFilter(assetType?: string): any | null {
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

  private stockScopeFilters(region?: string, assetType?: string): any[] {
    const stockFilters: any[] = [];
    const regionFilter = resolveMarketRegionFilter(region);
    if (Object.keys(regionFilter).length > 0) stockFilters.push(regionFilter);
    const assetTypeFilter = this.assetTypeFilter(assetType);
    if (assetTypeFilter) stockFilters.push(assetTypeFilter);
    return stockFilters;
  }

  private validSnapshotWhere(where: any): any {
    return {
      ...where,
      status: { not: 'INSUFFICIENT_DATA' },
    };
  }

  private async latestSnapshotDate(where: any): Promise<Date | null> {
    const groups = await this.db.smartMoneyContextSnapshot.groupBy({
      by: ['snapshotDate'],
      where,
      _count: { _all: true },
      _max: { updatedAt: true },
      orderBy: { snapshotDate: 'desc' },
    });
    if (!groups.length) return null;
    // Among date-groups with SUBSTANTIAL coverage, pick the most-recently-computed one
    // (latest _max.updatedAt; snapshotDate as a tiebreak). The substantial filter previously
    // used `count >= maxCount` (the single ABSOLUTE-peak day) — so once one day had the most
    // rows ever (e.g. 28 May, 2,660) every later day with slightly lower coverage (~2,324) was
    // excluded and the reads got permanently stuck on that old peak day, even though fresh 6/5
    // data existed. Now the floor is RELATIVE (>=50% of the peak): minor day-to-day coverage
    // variance is accepted (so the freshest run wins on updatedAt) while a tiny partial/test-seed
    // day is still skipped.
    const maxCount = Math.max(...groups.map((item: any) => Number(item._count?._all || 0)));
    const floor = maxCount * 0.5;
    const stableGroups = groups
      .filter((item: any) => Number(item._count?._all || 0) >= floor)
      .sort((a: any, b: any) => {
        const updatedDelta = this.timeValue(b._max?.updatedAt) - this.timeValue(a._max?.updatedAt);
        if (updatedDelta !== 0) return updatedDelta;
        return this.timeValue(b.snapshotDate) - this.timeValue(a.snapshotDate);
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
    const ownership = (row.insiderOwnership as any) || {
      insiderBuyCount: null,
      insiderSellCount: null,
      netInsiderActivity: null,
      institutionalOwnershipPercent: null,
      ownershipDataStatus: 'MISSING',
      source: 'not-configured',
      explanation: 'Free insider and institutional ownership provider is not configured for the MVP.',
    };
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
    const updatedAt = row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt);
    const boundary = snapshotDate ? new Date(`${snapshotDate}T00:00:00.000Z`) : null;
    const freshnessStatus = !boundary || !Number.isFinite(updatedAt.getTime())
      ? 'UNKNOWN'
      : updatedAt.getTime() + 1 < boundary.getTime()
        ? 'STALE'
        : 'CURRENT';
    const ownershipMissing = summary.insiderOwnership.ownershipDataStatus === 'MISSING';
    const unavailable = summary.status === 'INSUFFICIENT_DATA' || summary.dataStatus === 'ERROR';
    const limited = ownershipMissing || freshnessStatus !== 'CURRENT' || summary.dataStatus !== 'COMPLETE';
    const freshnessReason = freshnessStatus === 'STALE'
      ? 'SNAPSHOT_STALE'
      : freshnessStatus === 'CURRENT'
        ? 'SNAPSHOT_CURRENT'
        : null;
    const reasonCodes: SmartMoneyEvidenceReasonCode[] = [
      'PERSISTED_SNAPSHOT_USED',
      ...(freshnessReason ? [freshnessReason as SmartMoneyEvidenceReasonCode] : []),
      'DATA_THROUGH_FROM_SNAPSHOT_DATE',
      'DOWNSTREAM_PERSISTED_ONLY',
      ...(ownershipMissing ? ['OWNERSHIP_PLACEHOLDER' as SmartMoneyEvidenceReasonCode] : []),
    ];
    const provenanceSummary = 'Persisted smart-money snapshot was used.';
    const ownershipSummary = ownershipMissing
      ? 'Insider and institutional ownership evidence is unavailable; treat this as partial price-volume evidence.'
      : 'Ownership evidence is present.';
    return {
      evidenceStatus: unavailable ? 'UNAVAILABLE' : limited ? 'LIMITED' : 'USABLE',
      freshnessStatus,
      provenance: {
        source: 'PERSISTED_SNAPSHOT',
        persistedSnapshotAvailableAtRequestStart: true,
        downstreamSafe: true,
        reasonSummary: provenanceSummary,
      },
      coverage: {
        requestedRange: summary.range,
        snapshotDate,
        dataThroughDate: snapshotDate,
        dataThroughBasis: 'SNAPSHOT_DATE',
        rangeLabel: `${summary.range} price-volume window`,
      },
      ownershipTrust: {
        status: ownershipMissing ? 'PARTIAL_OWNERSHIP_GAP' : 'COMPLETE',
        ownershipDataStatus: summary.insiderOwnership.ownershipDataStatus,
        reasonSummary: ownershipSummary,
      },
      reasonCodes: [...new Set(reasonCodes)],
      reasonSummary: `${provenanceSummary} ${ownershipSummary}`,
    };
  }
}
