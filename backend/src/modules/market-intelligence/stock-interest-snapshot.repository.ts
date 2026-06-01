import prisma from '../../db/prisma';
import type {
  StockInterestCalculationInput,
  StockInterestDeliveryInput,
  StockInterestFundamentalInput,
  StockInterestLatestPriceInput,
  StockInterestPriceInput,
  StockInterestScope,
  StockInterestSnapshotDto,
  StockInterestSnapshotWriteInput,
  StockInterestSnapshotWriteSummary,
  StockInterestStockInput,
} from './stock-interest-snapshot.types';

type LoadQuery = StockInterestScope & {
  batchSize?: number;
  offset?: number;
};

export class StockInterestSnapshotRepository {
  constructor(private readonly db: any = prisma) {}

  async loadCalculationInput(query: LoadQuery): Promise<StockInterestCalculationInput> {
    const region = query.region.toUpperCase();
    const assetType = query.assetType.toUpperCase();
    const batchSize = Math.min(100, Math.max(1, Math.floor(Number(query.batchSize) || 25)));
    const offset = Math.max(0, Math.floor(Number(query.offset) || 0));
    const where = this.stockScopeWhere(region, assetType);

    const [totalUniverseCount, stockRows] = await Promise.all([
      this.db.stock.count({ where }),
      this.db.stock.findMany({
        where,
        orderBy: [{ symbol: 'asc' }],
        skip: offset,
        take: batchSize,
        select: {
          id: true,
          symbol: true,
          name: true,
          sector: true,
        },
      }),
    ]);

    const stocks: StockInterestStockInput[] = stockRows.map((stock: any) => ({
      id: stock.id,
      symbol: stock.symbol,
      company: stock.name || stock.symbol,
      sector: stock.sector || null,
    }));
    const symbols = stocks.map((stock) => stock.symbol);
    const stockIds = stocks.map((stock) => stock.id);
    if (symbols.length === 0) {
      return {
        region,
        assetType,
        stocks,
        priceTicks: [],
        latestPrices: [],
        deliverySnapshots: [],
        fundamentals: [],
        totalUniverseCount,
      };
    }

    const [priceRows, latestRows, deliveryRows, fundamentalRows] = await Promise.all([
      this.db.priceTick.findMany({
        where: {
          symbol: { in: symbols },
          ...(region ? { OR: [{ region }, { region: null }] } : {}),
        },
        orderBy: [{ timestamp: 'desc' }],
        take: Math.max(1000, batchSize * 180),
      }),
      this.db.latestPrice.findMany({
        where: {
          symbol: { in: symbols },
          ...(region ? { OR: [{ region }, { region: null }] } : {}),
        },
      }),
      this.db.marketDeliverySnapshot.findMany({
        where: {
          stockId: { in: stockIds },
        },
        orderBy: [{ tradingDate: 'desc' }],
        take: Math.max(100, batchSize * 10),
      }),
      this.db.fundamental.findMany({
        where: {
          stockId: { in: stockIds },
        },
        orderBy: [{ periodEndDate: 'asc' }],
        take: Math.max(100, batchSize * 8),
      }),
    ]);

    return {
      region,
      assetType,
      stocks,
      priceTicks: priceRows.map((row: any): StockInterestPriceInput => ({
        symbol: row.symbol,
        timestamp: row.timestamp,
        open: this.toNumberOrNull(row.open),
        high: this.toNumberOrNull(row.high),
        low: this.toNumberOrNull(row.low),
        close: this.toNumber(row.adjustedClose ?? row.close),
        adjustedClose: this.toNumberOrNull(row.adjustedClose),
        volume: this.toNumberOrNull(row.volume),
      })).sort((a: StockInterestPriceInput, b: StockInterestPriceInput) => a.timestamp.getTime() - b.timestamp.getTime()),
      latestPrices: latestRows.map((row: any): StockInterestLatestPriceInput => ({
        symbol: row.symbol,
        price: this.toNumber(row.price),
        timestamp: row.timestamp,
      })),
      deliverySnapshots: deliveryRows.map((row: any): StockInterestDeliveryInput => ({
        symbol: row.symbol,
        tradingDate: row.tradingDate,
        deliveryPercent: this.toNumberOrNull(row.deliveryPercent),
      })),
      fundamentals: fundamentalRows.map((row: any): StockInterestFundamentalInput => ({
        stockId: row.stockId,
        symbol: row.stock?.symbol || stocks.find((stock) => stock.id === row.stockId)?.symbol || '',
        periodEndDate: row.periodEndDate,
        revenue: this.toNumberOrNull(row.revenue),
        netIncome: this.toNumberOrNull(row.netIncome),
        eps: this.toNumberOrNull(row.eps),
      })),
      totalUniverseCount,
    };
  }

  async upsertSnapshots(rows: StockInterestSnapshotWriteInput[]): Promise<StockInterestSnapshotWriteSummary> {
    const summary = { createdCount: 0, updatedCount: 0, unchangedCount: 0 };
    for (const row of rows) {
      const where = {
        snapshotDate_scopeRegion_scopeAssetType_timeframe_category_symbol: {
          snapshotDate: row.snapshotDate,
          scopeRegion: row.region,
          scopeAssetType: row.assetType,
          timeframe: row.timeframe,
          category: row.category,
          symbol: row.symbol,
        },
      };
      const existing = typeof this.db.stockInterestSnapshot.findUnique === 'function'
        ? await this.db.stockInterestSnapshot.findUnique({ where })
        : null;
      if (existing && this.sameSnapshotPayload(existing, row)) {
        summary.unchangedCount += 1;
        continue;
      }

      await this.db.stockInterestSnapshot.upsert({
        where,
        create: this.toPersistence(row),
        update: {
          dataThroughDate: row.dataThroughDate,
          generatedAt: row.generatedAt,
          stockId: row.stockId,
          company: row.company,
          sector: row.sector,
          score: row.score,
          direction: row.direction,
          reasonTags: row.reasonTags,
          riskTags: row.riskTags,
          freshness: row.freshness,
          warnings: row.warnings,
          calculationVersion: row.calculationVersion,
        },
      });
      if (existing) summary.updatedCount += 1;
      else summary.createdCount += 1;
    }
    return summary;
  }

  async latestSnapshots(query: StockInterestScope & { timeframe?: string }): Promise<StockInterestSnapshotDto[]> {
    const region = query.region.toUpperCase();
    const assetType = query.assetType.toUpperCase();
    const timeframe = query.timeframe || '1d';
    const latest = await this.db.stockInterestSnapshot.findFirst({
      where: { scopeRegion: region, scopeAssetType: assetType, timeframe },
      orderBy: [{ snapshotDate: 'desc' }, { generatedAt: 'desc' }, { updatedAt: 'desc' }],
      select: { snapshotDate: true },
    });
    if (!latest?.snapshotDate) return [];

    const rows = await this.db.stockInterestSnapshot.findMany({
      where: { scopeRegion: region, scopeAssetType: assetType, timeframe, snapshotDate: latest.snapshotDate },
      orderBy: [
        { category: 'asc' },
        { score: 'desc' },
        { symbol: 'asc' },
      ],
    });
    return rows.map((row: any) => this.toDto(row));
  }

  private stockScopeWhere(region: string, assetType: string) {
    const assetFilter = assetType === 'STOCK'
      ? { OR: [{ assetType: { in: ['STOCK', 'EQUITY'] } }, { assetType: null }] }
      : { assetType };
    return {
      isActive: true,
      isDelisted: false,
      AND: [
        { region },
        assetFilter,
      ],
    };
  }

  private toPersistence(row: StockInterestSnapshotWriteInput) {
    return {
      snapshotDate: row.snapshotDate,
      dataThroughDate: row.dataThroughDate,
      generatedAt: row.generatedAt,
      stockId: row.stockId,
      symbol: row.symbol,
      company: row.company,
      sector: row.sector,
      scopeRegion: row.region,
      scopeAssetType: row.assetType,
      timeframe: row.timeframe,
      category: row.category,
      score: row.score,
      direction: row.direction,
      reasonTags: row.reasonTags,
      riskTags: row.riskTags,
      freshness: row.freshness,
      warnings: row.warnings,
      calculationVersion: row.calculationVersion,
    };
  }

  private sameSnapshotPayload(row: any, input: StockInterestSnapshotWriteInput): boolean {
    const actual = {
      dataThroughDate: this.iso(row.dataThroughDate),
      stockId: row.stockId,
      company: row.company,
      sector: row.sector,
      score: this.toNumber(row.score),
      direction: row.direction,
      reasonTags: row.reasonTags || [],
      riskTags: row.riskTags || [],
      freshness: row.freshness,
      warnings: row.warnings || [],
      calculationVersion: row.calculationVersion,
    };
    const expected = {
      dataThroughDate: this.iso(input.dataThroughDate),
      stockId: input.stockId,
      company: input.company,
      sector: input.sector,
      score: input.score,
      direction: input.direction,
      reasonTags: input.reasonTags,
      riskTags: input.riskTags,
      freshness: input.freshness,
      warnings: input.warnings,
      calculationVersion: input.calculationVersion,
    };
    return this.stableStringify(actual) === this.stableStringify(expected);
  }

  private toDto(row: any): StockInterestSnapshotDto {
    return {
      snapshotDate: this.isoDate(row.snapshotDate),
      dataThroughDate: row.dataThroughDate ? this.isoDate(row.dataThroughDate) : null,
      generatedAt: row.generatedAt.toISOString(),
      category: row.category,
      symbol: row.symbol,
      company: row.company,
      sector: row.sector,
      score: this.toNumber(row.score),
      direction: row.direction,
      reasonTags: this.toStringArray(row.reasonTags),
      riskTags: this.toStringArray(row.riskTags),
      freshness: row.freshness,
      warnings: this.toStringArray(row.warnings),
    };
  }

  private toStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : [];
  }

  private iso(value: Date | null | undefined): string | null {
    return value instanceof Date ? value.toISOString() : null;
  }

  private isoDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined) return null;
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
      return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = this.stableValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
    }
    return value;
  }
}
