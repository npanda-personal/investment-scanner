import prisma from '../../db/prisma';
import { CALCULATION_VERSION } from './earnings-intelligence.constants';
import { isEarningsIntelligenceCategory } from './earnings-intelligence.categories';
import { getEarningsRegionConfig } from './earnings-intelligence.region-config';
import {
  isTbaSource,
  remapLegacySource,
  remapLegacyWarnings,
  resultDateLabelFor,
} from './earnings-intelligence.presentation';
import type {
  EarningsDeliveryInput,
  EarningsFundamentalInput,
  EarningsIntelligenceCategory,
  EarningsIntelligenceQuery,
  EarningsPricePointInput,
  EarningsSnapshotCalculationInput,
  EarningsSnapshotDto,
  EarningsSnapshotUpsertInput,
} from './earnings-intelligence.types';

const MAX_API_ROWS = 5000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class EarningsIntelligenceRepository {
  constructor(private readonly db = prisma as any) {}

  async countRefreshUniverse(query: { region: string; assetType: string; instrumentIds?: string[] }): Promise<number> {
    return this.db.stock.count({
      where: this.stockWhere(query),
    });
  }

  async loadCalculationInputs(query: {
    region: string;
    assetType: string;
    batchSize: number;
    offset: number;
    instrumentIds?: string[];
    snapshotDate: Date;
  }): Promise<EarningsSnapshotCalculationInput[]> {
    const stocks = await this.db.stock.findMany({
      where: this.stockWhere(query),
      orderBy: { symbol: 'asc' },
      skip: query.instrumentIds?.length ? 0 : query.offset,
      take: query.instrumentIds?.length ? undefined : query.batchSize,
      select: {
        id: true,
        symbol: true,
        region: true,
        assetType: true,
      },
    });
    if (stocks.length === 0) return [];

    // Region-configured data-load windows.
    const config = getEarningsRegionConfig(query.region);
    const stockIds = stocks.map((stock: any) => stock.id);
    const symbols = stocks.map((stock: any) => stock.symbol);
    const priceCutoff = new Date(query.snapshotDate.getTime() - config.priceHistoryLookbackDays * MS_PER_DAY);
    const deliveryCutoff = new Date(query.snapshotDate.getTime() - config.deliveryLookbackDays * MS_PER_DAY);
    const [fundamentals, priceTicks, latestPrices, deliverySnapshots] = await Promise.all([
      this.db.fundamental.findMany({
        where: { stockId: { in: stockIds } },
        orderBy: [{ stockId: 'asc' }, { periodEndDate: 'desc' }],
      }),
      this.db.priceTick.findMany({
        where: {
          symbol: { in: symbols },
          // Upper-bounded at the snapshot date so a backdated snapshot never reads
          // prices that postdate it (no look-ahead bias on historical backfills).
          timestamp: { gte: priceCutoff, lte: query.snapshotDate },
        },
        orderBy: [{ symbol: 'asc' }, { timestamp: 'desc' }],
      }),
      this.db.latestPrice.findMany({
        where: { symbol: { in: symbols } },
      }),
      this.db.marketDeliverySnapshot.findMany({
        where: {
          stockId: { in: stockIds },
          tradingDate: { gte: deliveryCutoff, lte: query.snapshotDate },
        },
        orderBy: [{ stockId: 'asc' }, { tradingDate: 'desc' }],
      }),
    ]);

    const fundamentalRows: EarningsFundamentalInput[] = fundamentals.map((row: any) => this.toFundamental(row));
    const priceRows: EarningsPricePointInput[] = [
      ...priceTicks.map((row: any) => this.toPricePoint(row)),
      ...latestPrices.map((row: any) => ({
        symbol: row.symbol,
        timestamp: row.timestamp,
        close: Number(row.price),
        // LatestPrice carries only a close — no intraday range for the technicals.
        high: null,
        low: null,
        adjustedClose: Number(row.price),
        volume: null,
      } as EarningsPricePointInput)),
    ]
      // Guard the merged latestPrice rows against the same look-ahead bound.
      .filter((row) => row.timestamp.getTime() <= query.snapshotDate.getTime());
    const deliveryRows: EarningsDeliveryInput[] = deliverySnapshots.map((row: any) => this.toDelivery(row));
    const fundamentalsByStockId = groupBy(fundamentalRows, (row) => row.stockId);
    const pricesBySymbol = groupBy(priceRows, (row) => row.symbol);
    const deliveryByStockId = groupBy(deliveryRows, (row) => row.stockId);

    return stocks.map((stock: any) => ({
      stockId: stock.id,
      symbol: stock.symbol,
      region: query.region,
      assetType: query.assetType,
      snapshotDate: query.snapshotDate,
      dataThroughDate: null,
      fundamentals: fundamentalsByStockId.get(stock.id) || [],
      prices: this.uniquePricePoints(pricesBySymbol.get(stock.symbol) || []),
      deliverySnapshots: deliveryByStockId.get(stock.id) || [],
    }));
  }

  async upsertSnapshots(rows: EarningsSnapshotUpsertInput[]): Promise<EarningsSnapshotDto[]> {
    if (rows.length === 0) return [];
    // One atomic batch instead of N sequential round-trips.
    const operations = rows.map((row) =>
      this.db.earningsIntelligenceSnapshot.upsert({
        where: {
          snapshotDate_scopeRegion_scopeAssetType_symbol: {
            snapshotDate: row.snapshotDate,
            scopeRegion: row.scopeRegion,
            scopeAssetType: row.scopeAssetType,
            symbol: row.symbol,
          },
        },
        create: this.snapshotWriteData(row, true),
        update: this.snapshotWriteData(row, false),
      })
    );
    const records = await this.db.$transaction(operations);
    return records.map((record: any) => this.toDto(record));
  }

  async latestSnapshot(query: EarningsIntelligenceQuery): Promise<{
    rows: EarningsSnapshotDto[];
    truncated: boolean;
    snapshotDate: string | null;
    dataThroughDate: string | null;
  }> {
    const latest = await this.db.earningsIntelligenceSnapshot.findFirst({
      where: {
        scopeRegion: query.region,
        scopeAssetType: query.assetType,
      },
      orderBy: [{ snapshotDate: 'desc' }, { updatedAt: 'desc' }],
    });
    if (!latest) return { rows: [], truncated: false, snapshotDate: null, dataThroughDate: null };

    const records = await this.db.earningsIntelligenceSnapshot.findMany({
      where: {
        scopeRegion: query.region,
        scopeAssetType: query.assetType,
        snapshotDate: latest.snapshotDate,
      },
      orderBy: [
        { consistencyScore: 'desc' },
        { accelerationScore: 'desc' },
        { symbol: 'asc' },
      ],
      take: MAX_API_ROWS + 1,
    });
    const rows: EarningsSnapshotDto[] = records.slice(0, MAX_API_ROWS).map((record: any) => this.toDto(record));
    const filteredRows = query.category
      ? rows.filter((row) => row.categories.includes(query.category as EarningsIntelligenceCategory))
      : rows;
    return {
      rows: filteredRows,
      truncated: records.length > MAX_API_ROWS,
      snapshotDate: this.isoDate(latest.snapshotDate),
      dataThroughDate: this.isoDate(latest.dataThroughDate),
    };
  }

  /** Shared create/update payload — keeps calculationVersion stamped on both. */
  private snapshotWriteData(row: EarningsSnapshotUpsertInput, includeKeys: boolean) {
    return {
      ...(includeKeys
        ? {
            snapshotDate: row.snapshotDate,
            symbol: row.symbol,
            scopeRegion: row.scopeRegion,
            scopeAssetType: row.scopeAssetType,
          }
        : {}),
      dataThroughDate: row.dataThroughDate,
      stockId: row.stockId,
      resultDate: row.resultDate,
      resultDateSource: row.resultDateSource,
      periodEndDate: row.periodEndDate,
      validatedAt: row.validatedAt,
      daysToResult: row.daysToResult,
      revenueGrowth: row.revenueGrowth,
      profitGrowth: row.profitGrowth,
      epsGrowth: row.epsGrowth,
      revenueGrowthQoQ: row.revenueGrowthQoQ,
      profitGrowthQoQ: row.profitGrowthQoQ,
      epsGrowthQoQ: row.epsGrowthQoQ,
      revenueGrowthYoY: row.revenueGrowthYoY,
      profitGrowthYoY: row.profitGrowthYoY,
      epsGrowthYoY: row.epsGrowthYoY,
      growthComparisonBasis: row.growthComparisonBasis,
      marginTrend: row.marginTrend,
      consistencyScore: row.consistencyScore,
      accelerationScore: row.accelerationScore,
      reasonTags: row.reasonTags,
      riskTags: row.riskTags,
      warnings: row.warnings,
      freshness: row.freshness,
      categories: row.categories,
      rsi14: row.rsi14,
      smaPosture: row.smaPosture,
      pricePosition52w: row.pricePosition52w,
      adx14: row.adx14,
      deliveryPercent: row.deliveryPercent,
      calculationVersion: CALCULATION_VERSION,
    };
  }

  private stockWhere(query: { region: string; assetType: string; instrumentIds?: string[] }) {
    return {
      region: query.region,
      assetType: query.assetType,
      isActive: true,
      isDelisted: false,
      ...(query.instrumentIds?.length ? { id: { in: [...new Set(query.instrumentIds)] } } : {}),
    };
  }

  private toFundamental(row: any): EarningsFundamentalInput {
    return {
      id: row.id,
      stockId: row.stockId,
      revenue: row.revenue !== null ? Number(row.revenue) : null,
      eps: row.eps !== null ? Number(row.eps) : null,
      netIncome: row.netIncome !== null ? Number(row.netIncome) : null,
      periodType: row.periodType,
      periodEndDate: row.periodEndDate,
      // Read officialResultDate from the DB row — populated by the
      // ingest-nse-earnings-dates script (IN) / seed-us-earnings (US). When
      // present, the service resolves resultDateSource='OFFICIAL_CALENDAR',
      // unlocking RESULT_WINNERS, RESULT_DISAPPOINTMENTS, RESULT_REACTION_HISTORY.
      officialResultDate: row.officialResultDate ?? null,
      source: row.source,
      validatedAt: row.validatedAt ?? null,
      ingestionTimestamp: row.ingestionTimestamp ?? null,
      lastUpdatedTimestamp: row.lastUpdatedTimestamp ?? null,
      dataStatus: row.dataStatus ?? null,
    };
  }

  private toPricePoint(row: any): EarningsPricePointInput {
    return {
      symbol: row.symbol,
      timestamp: row.timestamp,
      close: Number(row.close),
      high: row.high !== null && row.high !== undefined ? Number(row.high) : null,
      low: row.low !== null && row.low !== undefined ? Number(row.low) : null,
      adjustedClose: row.adjustedClose !== null ? Number(row.adjustedClose) : null,
      volume: row.volume !== null ? Number(row.volume) : null,
    };
  }

  private toDelivery(row: any): EarningsDeliveryInput {
    return {
      stockId: row.stockId,
      symbol: row.symbol,
      tradingDate: row.tradingDate,
      deliveryPercent: row.deliveryPercent !== null ? Number(row.deliveryPercent) : null,
      tradedQuantity: row.tradedQuantity !== null ? Number(row.tradedQuantity) : null,
      deliverableQuantity: row.deliverableQuantity !== null ? Number(row.deliverableQuantity) : null,
    };
  }

  private uniquePricePoints(points: EarningsPricePointInput[]): EarningsPricePointInput[] {
    const seen = new Set<string>();
    return points
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
      .filter((point) => {
        const key = point.timestamp.toISOString().slice(0, 10);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  private toDto(record: any): EarningsSnapshotDto {
    // Read-time backward-compat: legacy ESTIMATED_FROM_PERIOD_CADENCE rows surface
    // as DATE_TBA so the honesty fix applies to already-persisted snapshots.
    const resultDateSource: string = remapLegacySource(record.resultDateSource || 'UNKNOWN');
    const resultDateLabel = resultDateLabelFor(resultDateSource);
    const isTba = isTbaSource(resultDateSource);

    const warnings = remapLegacyWarnings(stringArray(record.warnings));
    if (isTba && !warnings.includes('RESULT_DATE_NOT_ANNOUNCED')) {
      warnings.push('RESULT_DATE_NOT_ANNOUNCED');
    }

    return {
      id: record.id,
      stockId: record.stockId,
      snapshotDate: this.iso(record.snapshotDate) ?? '',
      dataThroughDate: this.iso(record.dataThroughDate),
      symbol: record.symbol,
      // For DATE_TBA rows (incl. legacy estimated): suppress the fabricated date
      // and daysToResult so the UI renders "—".
      resultDate: isTba ? null : this.iso(record.resultDate),
      resultDateLabel,
      resultDateSource,
      periodEndDate: this.iso(record.periodEndDate),
      validatedAt: this.iso(record.validatedAt),
      daysToResult: isTba ? null : (record.daysToResult ?? null),
      revenueGrowth: nullableNumber(record.revenueGrowth),
      profitGrowth: nullableNumber(record.profitGrowth),
      epsGrowth: nullableNumber(record.epsGrowth),
      revenueGrowthQoQ: nullableNumber(record.revenueGrowthQoQ),
      profitGrowthQoQ: nullableNumber(record.profitGrowthQoQ),
      epsGrowthQoQ: nullableNumber(record.epsGrowthQoQ),
      revenueGrowthYoY: nullableNumber(record.revenueGrowthYoY),
      profitGrowthYoY: nullableNumber(record.profitGrowthYoY),
      epsGrowthYoY: nullableNumber(record.epsGrowthYoY),
      growthComparisonBasis: record.growthComparisonBasis ?? null,
      marginTrend: nullableNumber(record.marginTrend),
      consistencyScore: Number(record.consistencyScore),
      accelerationScore: Number(record.accelerationScore),
      reasonTags: stringArray(record.reasonTags),
      riskTags: stringArray(record.riskTags),
      warnings,
      freshness: record.freshness,
      categories: stringArray(record.categories).filter(isEarningsIntelligenceCategory) as EarningsIntelligenceCategory[],
      rsi14: nullableNumber(record.rsi14),
      smaPosture: record.smaPosture ?? null,
      pricePosition52w: nullableNumber(record.pricePosition52w),
      adx14: nullableNumber(record.adx14),
      deliveryPercent: nullableNumber(record.deliveryPercent),
    };
  }

  private iso(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }

  private isoDate(value: Date | string | null | undefined): string | null {
    const iso = this.iso(value);
    return iso ? iso.slice(0, 10) : null;
  }
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const bucketKey = key(row);
    grouped.set(bucketKey, [...(grouped.get(bucketKey) || []), row]);
  }
  return grouped;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}
