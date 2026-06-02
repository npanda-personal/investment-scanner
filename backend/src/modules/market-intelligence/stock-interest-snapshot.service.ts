import { StockInterestSnapshotRepository } from './stock-interest-snapshot.repository';
import {
  normalizeStockInterestAssetType,
  normalizeStockInterestRegion,
  normalizeStockInterestTimeframe,
  parseStockInterestBatchSize,
  parseStockInterestOffset,
} from './stock-interest-snapshot.validation';
import type {
  StockInterestCalculationInput,
  StockInterestCategory,
  StockInterestDeliveryInput,
  StockInterestFundamentalInput,
  StockInterestLatestPriceInput,
  StockInterestPriceInput,
  StockInterestRefreshRequest,
  StockInterestRefreshResponse,
  StockInterestSnapshotDto,
  StockInterestSnapshotEnvelope,
  StockInterestSnapshotWriteInput,
  StockInterestStockInput,
} from './stock-interest-snapshot.types';

const STOCK_INTEREST_VERSION = 'stock-interest-v1';
const CATEGORY_ORDER: StockInterestCategory[] = [
  'TODAY_TOP_INTEREST',
  'GROWTH_CONSISTENCY',
  'GROWTH_ACCELERATION',
  'SECTOR_LEADERS',
  'ACCUMULATION',
  'BREAKOUTS',
  'RISK_AVOID',
];

type StockMetrics = {
  stock: StockInterestStockInput;
  bars: StockInterestPriceInput[];
  latestPrice: StockInterestLatestPriceInput | null;
  latestDelivery: StockInterestDeliveryInput | null;
  fundamentals: StockInterestFundamentalInput[];
  dataThroughDate: Date | null;
  latestClose: number | null;
  previousClose: number | null;
  dailyReturnPercent: number | null;
  rangeReturnPercent: number | null;
  volumeRatio: number | null;
  deliveryPercent: number | null;
  breakoutPercent: number | null;
  revenueGrowthPercent: number | null;
  profitGrowthPercent: number | null;
  epsGrowthPercent: number | null;
  freshness: string;
  warnings: string[];
  riskTags: string[];
};

export class StockInterestSnapshotService {
  constructor(private readonly repository = new StockInterestSnapshotRepository()) {}

  async latestSnapshot(query: { region?: string; assetType?: string }): Promise<StockInterestSnapshotEnvelope> {
    const scope = {
      region: normalizeStockInterestRegion(query.region),
      assetType: normalizeStockInterestAssetType(query.assetType),
    };
    const rows = await this.repository.latestSnapshots({ ...scope, timeframe: '1d' });
    if (rows.length === 0) {
      return {
        availability: 'EMPTY',
        scope,
        snapshot: null,
        message: 'Stock Interest snapshot is not available for this scope.',
        warnings: ['Run STOCK_INTEREST_REFRESH after market data is imported.'],
      };
    }
    return {
      availability: 'READY',
      scope,
      snapshot: rows,
      message: 'Persisted Stock Interest snapshot rows loaded.',
      warnings: this.summarizeRowWarnings(rows),
    };
  }

  async refreshSnapshots(request: StockInterestRefreshRequest = {}): Promise<StockInterestRefreshResponse> {
    const region = normalizeStockInterestRegion(request.region);
    const assetType = normalizeStockInterestAssetType(request.assetType);
    const timeframe = normalizeStockInterestTimeframe(request.timeframe);
    const batchSize = parseStockInterestBatchSize(request.batchSize);
    const offset = parseStockInterestOffset(request.offset);
    const generatedAt = request.generatedAt || new Date();
    const input = await this.repository.loadCalculationInput({ region, assetType, batchSize, offset });
    const rows = this.calculateSnapshots(input, {
      generatedAt,
      snapshotDate: request.snapshotDate,
      dataThroughDate: request.dataThroughDate ?? undefined,
      timeframe,
    });
    const writeSummary = await this.repository.upsertSnapshots(rows);
    const prunedCount = typeof (this.repository as any).pruneSnapshotRowsForSymbols === 'function'
      ? await (this.repository as any).pruneSnapshotRowsForSymbols({
        snapshotDate: this.snapshotDateFor(generatedAt, request.snapshotDate),
        region,
        assetType,
        timeframe,
        symbols: input.stocks.map((stock) => stock.symbol),
        keepKeys: rows.map((row) => ({ category: row.category, symbol: row.symbol })),
      })
      : 0;
    writeSummary.prunedCount = prunedCount;
    const processedCount = input.stocks.length;
    const totalUniverseCount = input.totalUniverseCount ?? input.stocks.length;
    const nextOffset = offset + processedCount < totalUniverseCount ? offset + processedCount : null;
    const categories = this.emptyCategoryCounts();
    for (const row of rows) categories[row.category] += 1;
    const warnings = this.summarizeRowWarnings(rows);
    const succeededCount = writeSummary.createdCount + writeSummary.updatedCount;
    const status = rows.length === 0 ? 'SKIPPED' : 'COMPLETED';

    return {
      status,
      scope: { region, assetType, timeframe },
      snapshotDate: this.isoDate(this.snapshotDateFor(generatedAt, request.snapshotDate)),
      dataThroughDate: rows[0]?.dataThroughDate ? this.isoDate(rows[0].dataThroughDate) : this.isoDateOrNull(request.dataThroughDate ?? this.latestInputDate(input)),
      generatedAt: generatedAt.toISOString(),
      totalCount: rows.length,
      processedCount: rows.length,
      succeededCount,
      failedCount: 0,
      skippedCount: rows.length === 0 ? processedCount : 0,
      unchangedCount: writeSummary.unchangedCount,
      nextOffset,
      hasMore: nextOffset !== null,
      warnings,
      errors: [],
      categories,
    };
  }

  calculateSnapshots(
    input: StockInterestCalculationInput,
    options: { generatedAt: Date; snapshotDate?: Date; dataThroughDate?: Date | null; timeframe?: string }
  ): StockInterestSnapshotWriteInput[] {
    const snapshotDate = this.snapshotDateFor(options.generatedAt, options.snapshotDate);
    const generatedAt = options.generatedAt;
    const timeframe = options.timeframe || '1d';
    const metrics = this.calculateMetrics(input, generatedAt, options.dataThroughDate);
    const rows: StockInterestSnapshotWriteInput[] = [];

    rows.push(...this.rank(metrics, 'TODAY_TOP_INTEREST', (item) => this.todayInterestScore(item), 'bullish interest'));
    rows.push(...this.rank(metrics.filter((item) => item.fundamentals.length >= 2), 'GROWTH_CONSISTENCY', (item) => this.growthConsistencyScore(item), 'growth review'));
    rows.push(...this.rank(metrics.filter((item) => item.fundamentals.length >= 2), 'GROWTH_ACCELERATION', (item) => this.growthAccelerationScore(item), 'growth acceleration review'));
    rows.push(...this.rank(metrics, 'SECTOR_LEADERS', (item) => this.sectorLeaderScore(item, metrics), 'sector leadership'));
    rows.push(...this.rank(metrics, 'ACCUMULATION', (item) => this.accumulationScore(item), 'accumulation review'));
    rows.push(...this.rank(metrics, 'BREAKOUTS', (item) => this.breakoutScore(item), 'breakout review'));
    rows.push(...this.rank(metrics, 'RISK_AVOID', (item) => this.riskAvoidScore(item), 'risk warning'));

    return rows
      .filter((row) => row.score > 0)
      .map((row) => ({
        ...row,
        snapshotDate,
        generatedAt,
        timeframe,
        region: input.region,
        assetType: input.assetType,
      }))
      .sort((a, b) => {
        const categoryDelta = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
        if (categoryDelta !== 0) return categoryDelta;
        const scoreDelta = b.score - a.score;
        if (scoreDelta !== 0) return scoreDelta;
        return a.symbol.localeCompare(b.symbol);
      });
  }

  private calculateMetrics(
    input: StockInterestCalculationInput,
    generatedAt: Date,
    overrideDataThroughDate?: Date | null
  ): StockMetrics[] {
    const pricesBySymbol = this.groupBy(input.priceTicks, (row) => row.symbol);
    const deliveryBySymbol = this.groupBy(input.deliverySnapshots, (row) => row.symbol);
    const fundamentalsByStock = this.groupBy(input.fundamentals, (row) => row.stockId);
    const latestBySymbol = new Map(input.latestPrices.map((row) => [row.symbol, row]));

    return input.stocks.map((stock) => {
      const bars = (pricesBySymbol.get(stock.symbol) || []).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const latestPrice = latestBySymbol.get(stock.symbol) || null;
      const latestBar = bars.at(-1) || null;
      const previousBar = bars.at(-2) || null;
      const latestClose = latestPrice?.price ?? latestBar?.close ?? null;
      const previousClose = previousBar?.close ?? null;
      const dailyReturnPercent = latestClose !== null && previousClose && previousClose > 0
        ? ((latestClose - previousClose) / previousClose) * 100
        : null;
      const firstClose = bars[0]?.close ?? null;
      const rangeReturnPercent = latestClose !== null && firstClose && firstClose > 0
        ? ((latestClose - firstClose) / firstClose) * 100
        : null;
      const latestVolume = latestBar?.volume ?? null;
      const averageVolume = this.average(bars.slice(0, -1).map((bar) => bar.volume));
      const volumeRatio = latestVolume !== null && averageVolume ? latestVolume / averageVolume : null;
      const latestDelivery = (deliveryBySymbol.get(stock.symbol) || []).sort((a, b) => b.tradingDate.getTime() - a.tradingDate.getTime())[0] || null;
      const fundamentals = (fundamentalsByStock.get(stock.id) || []).sort((a, b) => a.periodEndDate.getTime() - b.periodEndDate.getTime());
      const latestFundamental = fundamentals.at(-1) || null;
      const previousFundamental = fundamentals.at(-2) || null;
      const priorHigh = bars.length > 1 ? Math.max(...bars.slice(0, -1).map((bar) => bar.high ?? bar.close)) : null;
      const breakoutPercent = latestClose !== null && priorHigh && priorHigh > 0
        ? ((latestClose - priorHigh) / priorHigh) * 100
        : null;
      const dataThroughDate = overrideDataThroughDate
        ?? this.maxDate([latestPrice?.timestamp, latestBar?.timestamp, latestDelivery?.tradingDate, latestFundamental?.periodEndDate]);
      const freshness = this.freshness(dataThroughDate, generatedAt);
      const warnings = this.metricWarnings(stock, bars, fundamentals, dataThroughDate);
      const riskTags = this.metricRiskTags(dailyReturnPercent, rangeReturnPercent, latestDelivery?.deliveryPercent ?? null, freshness, warnings);

      return {
        stock,
        bars,
        latestPrice,
        latestDelivery,
        fundamentals,
        dataThroughDate,
        latestClose,
        previousClose,
        dailyReturnPercent,
        rangeReturnPercent,
        volumeRatio,
        deliveryPercent: latestDelivery?.deliveryPercent ?? null,
        breakoutPercent,
        revenueGrowthPercent: this.growthPercent(latestFundamental?.revenue, previousFundamental?.revenue),
        profitGrowthPercent: this.growthPercent(latestFundamental?.netIncome, previousFundamental?.netIncome),
        epsGrowthPercent: this.growthPercent(latestFundamental?.eps, previousFundamental?.eps),
        freshness,
        warnings,
        riskTags,
      };
    });
  }

  private rank(
    metrics: StockMetrics[],
    category: StockInterestCategory,
    scorer: (item: StockMetrics) => number,
    direction: string
  ): StockInterestSnapshotWriteInput[] {
    return metrics
      .map((item) => this.toRow(item, category, scorer(item), direction))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol))
      .slice(0, 25);
  }

  private toRow(
    item: StockMetrics,
    category: StockInterestCategory,
    score: number,
    direction: string
  ): StockInterestSnapshotWriteInput {
    return {
      snapshotDate: new Date(0),
      dataThroughDate: item.dataThroughDate,
      generatedAt: new Date(0),
      stockId: item.stock.id,
      symbol: item.stock.symbol,
      company: item.stock.company,
      sector: item.stock.sector,
      region: '',
      assetType: '',
      timeframe: '1d',
      category,
      score: this.clampScore(score),
      direction,
      reasonTags: this.reasonTags(category, item),
      riskTags: item.riskTags,
      freshness: item.freshness,
      warnings: item.warnings,
      calculationVersion: STOCK_INTEREST_VERSION,
    };
  }

  private todayInterestScore(item: StockMetrics): number {
    return 35
      + Math.max(-20, item.dailyReturnPercent ?? -10) * 2
      + Math.max(-20, item.rangeReturnPercent ?? -10) * 0.6
      + Math.min(25, (item.volumeRatio ?? 0) * 9)
      + Math.min(20, (item.deliveryPercent ?? 0) / 4)
      - this.warningPenalty(item);
  }

  private growthConsistencyScore(item: StockMetrics): number {
    const values = [item.revenueGrowthPercent, item.profitGrowthPercent, item.epsGrowthPercent].filter(this.isNumber);
    if (values.length === 0) return 0;
    const positiveCount = values.filter((value) => value > 0).length;
    return 35 + positiveCount * 12 + Math.min(30, Math.max(0, this.average(values) ?? 0));
  }

  private growthAccelerationScore(item: StockMetrics): number {
    const values = [item.revenueGrowthPercent, item.profitGrowthPercent, item.epsGrowthPercent].filter(this.isNumber);
    if (values.length === 0) return 0;
    return 30 + Math.min(50, Math.max(0, Math.max(...values))) + Math.max(0, item.rangeReturnPercent ?? 0) * 0.5;
  }

  private sectorLeaderScore(item: StockMetrics, allMetrics: StockMetrics[]): number {
    const sector = item.stock.sector || 'Unknown';
    const sectorPeers = allMetrics.filter((candidate) => (candidate.stock.sector || 'Unknown') === sector);
    const sectorAverage = this.average(sectorPeers.map((candidate) => candidate.rangeReturnPercent)) ?? 0;
    return 45 + Math.max(-20, item.rangeReturnPercent ?? -20) * 1.2 + Math.max(-10, sectorAverage) * 0.8 + Math.min(15, sectorPeers.length);
  }

  private accumulationScore(item: StockMetrics): number {
    const positivePrice = Math.max(0, item.dailyReturnPercent ?? 0) * 1.5 + Math.max(0, item.rangeReturnPercent ?? 0) * 0.5;
    const delivery = Math.max(0, (item.deliveryPercent ?? 0) - 35) * 0.8;
    const volume = Math.max(0, (item.volumeRatio ?? 0) - 1) * 18;
    return 35 + positivePrice + delivery + volume - this.warningPenalty(item);
  }

  private breakoutScore(item: StockMetrics): number {
    const breakout = Math.max(0, item.breakoutPercent ?? 0) * 4;
    const trend = Math.max(0, item.rangeReturnPercent ?? 0) * 0.8;
    const volume = Math.max(0, (item.volumeRatio ?? 0) - 1) * 12;
    return breakout <= 0 ? 0 : 45 + breakout + trend + volume - this.warningPenalty(item);
  }

  private riskAvoidScore(item: StockMetrics): number {
    const downside = Math.max(0, -(item.dailyReturnPercent ?? 0)) * 3 + Math.max(0, -(item.rangeReturnPercent ?? 0)) * 1.2;
    const lowDelivery = Math.max(0, 40 - (item.deliveryPercent ?? 40)) * 0.8;
    const stale = item.freshness === 'FRESH' ? 0 : 25;
    const weakFundamentals = [item.revenueGrowthPercent, item.profitGrowthPercent, item.epsGrowthPercent]
      .filter(this.isNumber)
      .filter((value) => value < 0).length * 12;
    return 25 + downside + lowDelivery + stale + weakFundamentals;
  }

  private reasonTags(category: StockInterestCategory, item: StockMetrics): string[] {
    const tags: string[] = [];
    if ((item.dailyReturnPercent ?? 0) > 2) tags.push('positive-daily-price-action');
    if ((item.rangeReturnPercent ?? 0) > 10) tags.push('positive-multi-day-trend');
    if ((item.volumeRatio ?? 0) >= 1.3) tags.push('above-average-volume');
    if ((item.deliveryPercent ?? 0) >= 55) tags.push('high-delivery-participation');
    if ((item.breakoutPercent ?? 0) > 0) tags.push('close-above-recent-range');
    if ((item.revenueGrowthPercent ?? 0) > 0 && (item.profitGrowthPercent ?? 0) > 0) tags.push('fundamental-growth-positive');
    if (category === 'RISK_AVOID') {
      if ((item.dailyReturnPercent ?? 0) < 0) tags.push('negative-daily-price-action');
      if ((item.rangeReturnPercent ?? 0) < 0) tags.push('negative-multi-day-trend');
      if ((item.deliveryPercent ?? 100) < 40) tags.push('weak-delivery-participation');
    }
    return tags.length > 0 ? tags : ['persisted-data-reviewed'];
  }

  private metricWarnings(
    stock: StockInterestStockInput,
    bars: StockInterestPriceInput[],
    fundamentals: StockInterestFundamentalInput[],
    dataThroughDate: Date | null
  ): string[] {
    const warnings: string[] = [];
    if (bars.length < 2) warnings.push(`${stock.symbol}: insufficient persisted price history for full price-action scoring.`);
    if (fundamentals.length < 2) warnings.push(`${stock.symbol}: insufficient persisted fundamentals for growth scoring.`);
    if (!stock.sector) warnings.push(`${stock.symbol}: sector metadata is unavailable.`);
    if (!dataThroughDate) warnings.push(`${stock.symbol}: source data-through date is unavailable.`);
    return warnings;
  }

  private summarizeRowWarnings(rows: Array<{ symbol: string; warnings?: string[] }>): string[] {
    const warningCount = rows.reduce((sum, row) => sum + (row.warnings?.length || 0), 0);
    if (warningCount === 0) return [];
    const symbolCount = new Set(rows.filter((row) => (row.warnings?.length || 0) > 0).map((row) => row.symbol)).size;
    return [`${warningCount} row-level Stock Interest data warnings across ${symbolCount} symbols. Row warnings remain available in snapshot rows for audit detail.`];
  }

  private metricRiskTags(
    dailyReturnPercent: number | null,
    rangeReturnPercent: number | null,
    deliveryPercent: number | null,
    freshness: string,
    warnings: string[]
  ): string[] {
    const tags: string[] = [];
    if ((dailyReturnPercent ?? 0) < -3) tags.push('negative-daily-move');
    if ((rangeReturnPercent ?? 0) < -8) tags.push('negative-trend');
    if (deliveryPercent !== null && deliveryPercent < 40) tags.push('weak-delivery');
    if (freshness !== 'FRESH') tags.push('stale-or-partial-data');
    if (warnings.length > 0) tags.push('data-gap');
    return [...new Set(tags)];
  }

  private warningPenalty(item: StockMetrics): number {
    return item.warnings.length * 3 + (item.freshness === 'FRESH' ? 0 : 8);
  }

  private freshness(dataThroughDate: Date | null, generatedAt: Date): string {
    if (!dataThroughDate) return 'UNAVAILABLE';
    const days = Math.floor(Math.abs(generatedAt.getTime() - dataThroughDate.getTime()) / 86_400_000);
    if (days <= 4) return 'FRESH';
    if (days <= 10) return 'STALE';
    return 'VERY_STALE';
  }

  private growthPercent(current: number | null | undefined, previous: number | null | undefined): number | null {
    if (!this.isNumber(current) || !this.isNumber(previous) || previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
  }

  private latestInputDate(input: StockInterestCalculationInput): Date | null {
    return this.maxDate([
      ...input.priceTicks.map((row) => row.timestamp),
      ...input.latestPrices.map((row) => row.timestamp),
      ...input.deliverySnapshots.map((row) => row.tradingDate),
      ...input.fundamentals.map((row) => row.periodEndDate),
    ]);
  }

  private snapshotDateFor(generatedAt: Date, override?: Date): Date {
    const date = new Date(override || generatedAt);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private maxDate(values: Array<Date | null | undefined>): Date | null {
    const timestamps = values
      .filter((value): value is Date => value instanceof Date && Number.isFinite(value.getTime()))
      .map((value) => value.getTime());
    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps));
  }

  private groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const groupKey = key(row);
      map.set(groupKey, [...(map.get(groupKey) || []), row]);
    }
    return map;
  }

  private average(values: Array<number | null | undefined>): number | null {
    const numeric = values.filter(this.isNumber);
    if (numeric.length === 0) return null;
    return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
  }

  private isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private clampScore(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private emptyCategoryCounts(): Record<StockInterestCategory, number> {
    return CATEGORY_ORDER.reduce((acc, category) => {
      acc[category] = 0;
      return acc;
    }, {} as Record<StockInterestCategory, number>);
  }

  private isoDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private isoDateOrNull(value: Date | null | undefined): string | null {
    return value ? this.isoDate(value) : null;
  }
}

export { CATEGORY_ORDER as STOCK_INTEREST_CATEGORIES, STOCK_INTEREST_VERSION };
export type { StockInterestSnapshotDto };
