import prisma from '../../db/prisma';
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

    const stockIds = stocks.map((stock: any) => stock.id);
    const symbols = stocks.map((stock: any) => stock.symbol);
    const priceCutoff = new Date(query.snapshotDate.getTime() - 420 * 24 * 60 * 60 * 1000);
    const deliveryCutoff = new Date(query.snapshotDate.getTime() - 120 * 24 * 60 * 60 * 1000);
    const [fundamentals, priceTicks, latestPrices, deliverySnapshots] = await Promise.all([
      this.db.fundamental.findMany({
        where: { stockId: { in: stockIds } },
        orderBy: [{ stockId: 'asc' }, { periodEndDate: 'desc' }],
      }),
      this.db.priceTick.findMany({
        where: {
          symbol: { in: symbols },
          timestamp: { gte: priceCutoff },
        },
        orderBy: [{ symbol: 'asc' }, { timestamp: 'desc' }],
      }),
      this.db.latestPrice.findMany({
        where: { symbol: { in: symbols } },
      }),
      this.db.marketDeliverySnapshot.findMany({
        where: {
          stockId: { in: stockIds },
          tradingDate: { gte: deliveryCutoff },
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
        adjustedClose: Number(row.price),
        volume: null,
      } as EarningsPricePointInput)),
    ];
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
    const saved: EarningsSnapshotDto[] = [];
    for (const row of rows) {
      const record = await this.db.earningsIntelligenceSnapshot.upsert({
        where: {
          snapshotDate_scopeRegion_scopeAssetType_symbol: {
            snapshotDate: row.snapshotDate,
            scopeRegion: row.scopeRegion,
            scopeAssetType: row.scopeAssetType,
            symbol: row.symbol,
          },
        },
        create: {
          snapshotDate: row.snapshotDate,
          dataThroughDate: row.dataThroughDate,
          stockId: row.stockId,
          symbol: row.symbol,
          scopeRegion: row.scopeRegion,
          scopeAssetType: row.scopeAssetType,
          resultDate: row.resultDate,
          resultDateSource: row.resultDateSource,
          periodEndDate: row.periodEndDate,
          validatedAt: row.validatedAt,
          daysToResult: row.daysToResult,
          revenueGrowth: row.revenueGrowth,
          profitGrowth: row.profitGrowth,
          epsGrowth: row.epsGrowth,
          marginTrend: row.marginTrend,
          consistencyScore: row.consistencyScore,
          accelerationScore: row.accelerationScore,
          reasonTags: row.reasonTags,
          riskTags: row.riskTags,
          warnings: row.warnings,
          freshness: row.freshness,
          categories: row.categories,
        },
        update: {
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
          marginTrend: row.marginTrend,
          consistencyScore: row.consistencyScore,
          accelerationScore: row.accelerationScore,
          reasonTags: row.reasonTags,
          riskTags: row.riskTags,
          warnings: row.warnings,
          freshness: row.freshness,
          categories: row.categories,
          calculationVersion: 'earnings-intelligence-v1',
        },
      });
      saved.push(this.toDto(record));
    }
    return saved;
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
      officialResultDate: null,
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
    return {
      id: record.id,
      snapshotDate: this.iso(record.snapshotDate) ?? '',
      dataThroughDate: this.iso(record.dataThroughDate),
      symbol: record.symbol,
      resultDate: this.iso(record.resultDate),
      resultDateSource: record.resultDateSource || 'UNKNOWN',
      periodEndDate: this.iso(record.periodEndDate),
      validatedAt: this.iso(record.validatedAt),
      daysToResult: record.daysToResult ?? null,
      revenueGrowth: nullableNumber(record.revenueGrowth),
      profitGrowth: nullableNumber(record.profitGrowth),
      epsGrowth: nullableNumber(record.epsGrowth),
      marginTrend: nullableNumber(record.marginTrend),
      consistencyScore: Number(record.consistencyScore),
      accelerationScore: Number(record.accelerationScore),
      reasonTags: stringArray(record.reasonTags),
      riskTags: stringArray(record.riskTags),
      warnings: stringArray(record.warnings),
      freshness: record.freshness,
      categories: stringArray(record.categories).filter(isKnownCategory) as EarningsIntelligenceCategory[],
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

function isKnownCategory(value: string): value is EarningsIntelligenceCategory {
  return [
    'UPCOMING_RESULTS',
    'PRE_RESULT_INTEREST',
    'RESULT_WINNERS',
    'RESULT_DISAPPOINTMENTS',
    'RESULT_REACTION_HISTORY',
    'EARNINGS_WATCHLIST',
  ].includes(value);
}
