import { latestCompletedTradingDateForRegion } from '../market-data-foundation';
import { MarketPulseSnapshotRepository } from './market-pulse-snapshot.repository';
import type {
  MarketPulseBreadthSummary,
  MarketPulseCalculationData,
  MarketPulseCalculationOptions,
  MarketPulseDeliveryPoint,
  MarketPulseDeliverySummary,
  MarketPulseHealthLabel,
  MarketPulseIndexSummary,
  MarketPulsePricePoint,
  MarketPulseRefreshRequest,
  MarketPulseScope,
  MarketPulseSectorSummary,
  MarketPulseSnapshotDto,
  MarketPulseSnapshotEnvelope,
  MarketPulseSnapshotInput,
  MarketPulseSnapshotRecord,
  MarketPulseSnapshotStatus,
  MarketPulseSourceImport,
  MarketPulseSourceSummary,
  MarketPulseStockUniverseItem,
} from './market-pulse-snapshot.types';

type FreshnessResult = {
  status: MarketPulseSnapshotStatus;
  score: number;
  dataThroughDate: Date | null;
  warnings: string[];
  sourceSummary: MarketPulseSourceSummary;
};

type ComponentResult<T> = {
  score: number;
  rows?: T[];
  summary?: T;
  warnings: string[];
};

const REQUIRED_SOURCE_SEGMENTS = ['CM', 'INDEX', 'SECTOR_INDEX'] as const;
const ALL_SOURCE_SEGMENTS = ['CM', 'INDEX', 'SECTOR_INDEX', 'DELIVERY'] as const;
const HIGH_DELIVERY_THRESHOLD = 50;

export class MarketPulseSnapshotService {
  constructor(private readonly repository = new MarketPulseSnapshotRepository()) {}

  async latestSnapshot(scope: MarketPulseScope): Promise<MarketPulseSnapshotEnvelope> {
    const normalized = this.normalizeScope(scope);
    const row = await this.repository.latestSnapshot(normalized);
    if (!row) {
      return {
        availability: 'EMPTY',
        scope: normalized,
        snapshot: null,
        message: 'Market Pulse snapshot is not available for this scope.',
        warnings: ['Run MARKET_PULSE_REFRESH after persisted market data has been imported.'],
      };
    }

    return {
      availability: 'READY',
      scope: normalized,
      snapshot: this.toDto(row),
      message: 'Persisted Market Pulse snapshot loaded.',
      warnings: row.warningsJson,
    };
  }

  async snapshotHistory(scope: MarketPulseScope & { limit?: number }) {
    const normalized = this.normalizeScope(scope);
    const snapshots = await this.repository.snapshotHistory({ ...normalized, limit: scope.limit });
    return {
      availability: snapshots.length > 0 ? 'READY' : 'EMPTY',
      scope: normalized,
      snapshots: snapshots.map((snapshot) => this.toDto(snapshot)),
      message: snapshots.length > 0 ? 'Persisted Market Pulse history loaded.' : 'No persisted Market Pulse history exists for this scope.',
      warnings: snapshots.length > 0 ? [] : ['Run MARKET_PULSE_REFRESH to create the first snapshot.'],
    };
  }

  async refreshSnapshot(request: MarketPulseRefreshRequest): Promise<MarketPulseSnapshotRecord> {
    const normalized = this.normalizeScope(request);
    const generatedAt = request.generatedAt || new Date();
    const data = await this.repository.loadCalculationData({ ...normalized, generatedAt });
    const snapshot = this.calculateSnapshot(data, {
      generatedAt,
      pipelineRunId: request.pipelineRunId ?? null,
      timeframe: normalized.timeframe,
    });
    return this.repository.upsertSnapshot(snapshot);
  }

  calculateSnapshot(data: MarketPulseCalculationData, options: MarketPulseCalculationOptions = {}): MarketPulseSnapshotInput {
    const generatedAt = options.generatedAt || new Date();
    const normalized = this.normalizeScope({ region: data.region, assetType: data.assetType, timeframe: options.timeframe });
    const snapshotDate = this.utcDay(generatedAt);
    const freshness = this.calculateFreshness(data.sourceImports, normalized.region, generatedAt);
    const indexTrend = this.calculateIndexTrend(data.indexPrices);
    const sectorStrength = this.calculateSectorStrength(data.sectorIndexPrices);
    const breadth = this.calculateBreadth(data.stockUniverse, data.stockPrices);
    const delivery = this.calculateDelivery(data.deliverySnapshots);
    const candidateCount = this.calculateCandidateCount(data.stockUniverse, data.stockPrices, sectorStrength.rows || [], freshness.dataThroughDate);
    const warnings = this.uniqueStrings([
      ...freshness.warnings,
      ...indexTrend.warnings,
      ...sectorStrength.warnings,
      ...breadth.warnings,
      ...delivery.warnings,
    ]);
    const hasAnyPriceEvidence = data.indexPrices.length > 0 || data.sectorIndexPrices.length > 0 || data.stockPrices.length > 0;
    const status = this.snapshotStatus(hasAnyPriceEvidence, freshness.status, warnings);
    const marketHealthScore = Math.round(
      indexTrend.score * 0.25
      + sectorStrength.score * 0.25
      + breadth.score * 0.25
      + delivery.score * 0.15
      + freshness.score * 0.10
    );

    return {
      snapshotDate,
      dataThroughDate: freshness.dataThroughDate || this.latestEvidenceDate(data) || snapshotDate,
      generatedAt,
      region: normalized.region,
      assetType: normalized.assetType,
      timeframe: normalized.timeframe,
      status,
      marketHealthScore,
      marketHealthLabel: this.downgradeLabelForFreshness(this.marketHealthLabelForScore(marketHealthScore), freshness.status),
      indexTrendScore: Math.round(indexTrend.score),
      sectorStrengthScore: Math.round(sectorStrength.score),
      breadthScore: Math.round(breadth.score),
      deliveryParticipationScore: Math.round(delivery.score),
      dataFreshnessScore: Math.round(freshness.score),
      topIndicesJson: indexTrend.rows || [],
      strongSectorsJson: (sectorStrength.rows || []).filter((sector) => sector.classification === 'STRONG' || sector.classification === 'IMPROVING').slice(0, 5),
      weakSectorsJson: (sectorStrength.rows || []).filter((sector) => sector.classification === 'WEAK').slice(0, 5),
      breadthSummaryJson: breadth.summary || this.unavailableBreadthSummary(),
      deliverySummaryJson: delivery.summary || this.unavailableDeliverySummary(),
      candidateCount,
      warningsJson: warnings,
      sourceSummaryJson: freshness.sourceSummary,
      pipelineRunId: options.pipelineRunId ?? null,
    };
  }

  calculateFreshness(sourceImports: MarketPulseSourceImport[], region: string, now = new Date()): FreshnessResult {
    const latestCompletedTradingDate = latestCompletedTradingDateForRegion(region, now);
    const latestBySegment = new Map<string, MarketPulseSourceImport>();
    for (const row of sourceImports) {
      if (String(row.status).toUpperCase() !== 'COMPLETED') continue;
      const segment = String(row.segment || '').trim().toUpperCase();
      const existing = latestBySegment.get(segment);
      if (!existing || row.tradingDate > existing.tradingDate) latestBySegment.set(segment, row);
    }

    const warnings: string[] = [];
    const segments: MarketPulseSourceSummary['segments'] = {};
    let requiredFreshCount = 0;
    let requiredPresentCount = 0;
    let staleRequiredCount = 0;
    let deliveryFresh = false;
    let latestDataThroughDate: Date | null = null;

    for (const segment of ALL_SOURCE_SEGMENTS) {
      const row = latestBySegment.get(segment);
      if (row && (!latestDataThroughDate || row.tradingDate > latestDataThroughDate)) {
        latestDataThroughDate = row.tradingDate;
      }
      if (!row) {
        segments[segment] = { status: 'MISSING', tradingDate: null, importedAt: null };
        warnings.push(`Source segment ${segment} has no completed persisted import.`);
        continue;
      }

      const rowDate = this.dateKey(row.tradingDate);
      const stale = latestCompletedTradingDate !== null && rowDate < latestCompletedTradingDate;
      segments[segment] = {
        status: stale ? 'STALE' : 'FRESH',
        tradingDate: rowDate,
        importedAt: row.importedAt ? row.importedAt.toISOString() : null,
      };
      if (stale) warnings.push(`Source segment ${segment} is stale at ${rowDate}; expected ${latestCompletedTradingDate}.`);
      if (REQUIRED_SOURCE_SEGMENTS.includes(segment as typeof REQUIRED_SOURCE_SEGMENTS[number])) {
        requiredPresentCount += 1;
        if (stale) staleRequiredCount += 1;
        else requiredFreshCount += 1;
      } else if (segment === 'DELIVERY' && !stale) {
        deliveryFresh = true;
      }
    }

    if (!latestCompletedTradingDate) {
      warnings.push(`Latest completed trading date is unavailable for ${region}; freshness is partial.`);
    }

    const requiredScore = requiredFreshCount / REQUIRED_SOURCE_SEGMENTS.length * 75;
    const score = Math.round(requiredScore + (deliveryFresh ? 25 : 0));
    let status: MarketPulseSnapshotStatus = 'PARTIAL';
    if (requiredPresentCount === 0) status = 'FAILED';
    else if (requiredFreshCount === REQUIRED_SOURCE_SEGMENTS.length && deliveryFresh && warnings.length === 0) status = 'FRESH';
    else if (requiredFreshCount === REQUIRED_SOURCE_SEGMENTS.length && !deliveryFresh) status = 'PARTIAL';
    else if (requiredPresentCount === REQUIRED_SOURCE_SEGMENTS.length && staleRequiredCount === REQUIRED_SOURCE_SEGMENTS.length) status = 'STALE';

    return {
      status,
      score,
      dataThroughDate: latestDataThroughDate,
      warnings,
      sourceSummary: {
        status,
        score,
        latestCompletedTradingDate,
        dataThroughDate: latestDataThroughDate ? this.dateKey(latestDataThroughDate) : null,
        segments,
      },
    };
  }

  marketHealthLabelForScore(score: number): MarketPulseHealthLabel {
    if (score >= 80) return 'HEALTHY';
    if (score >= 60) return 'TRADABLE_BUT_SELECTIVE';
    if (score >= 40) return 'FRAGILE';
    return 'RISKY';
  }

  private calculateIndexTrend(prices: MarketPulsePricePoint[]): ComponentResult<MarketPulseIndexSummary> {
    const groups = this.groupPrices(prices);
    const warnings: string[] = [];
    if (groups.size === 0) {
      return { score: 0, rows: [], warnings: ['Index trend score unavailable because persisted index price rows are missing.'] };
    }

    const rows = [...groups.entries()].map(([symbol, series]) => {
      const returns = this.seriesReturns(series);
      const score = this.seriesScore(series, returns);
      return {
        symbol,
        label: series[0]?.label || symbol,
        value: series[0]?.close ?? null,
        changePercent: this.periodReturn(series, 1),
        return1W: returns.return1W,
        return1M: returns.return1M,
        return3M: returns.return3M,
        score,
        freshness: this.dateKey(series[0].timestamp),
      };
    }).sort((left, right) => right.score - left.score);

    if (rows.some((row) => row.return3M === null)) {
      warnings.push('Some index rows have insufficient persisted history for 3M trend scoring.');
    }

    return {
      score: this.average(rows.map((row) => row.score)) ?? 0,
      rows: rows.slice(0, 5),
      warnings,
    };
  }

  private calculateSectorStrength(prices: MarketPulsePricePoint[]): ComponentResult<MarketPulseSectorSummary> {
    const groups = this.groupPrices(prices);
    const warnings: string[] = [];
    if (groups.size === 0) {
      return { score: 0, rows: [], warnings: ['Sector strength score unavailable because persisted sector index rows are missing.'] };
    }

    const rows = [...groups.entries()].map(([symbol, series]) => {
      const returns = this.seriesReturns(series);
      const score = this.seriesScore(series, returns);
      return {
        sector: series[0]?.label || symbol,
        return1W: returns.return1W,
        return1M: returns.return1M,
        return3M: returns.return3M,
        score,
        classification: this.classifySector(score, returns.return1M, returns.return3M),
      };
    }).sort((left, right) => right.score - left.score);

    if (rows.some((row) => row.return3M === null)) {
      warnings.push('Some sector index rows have insufficient persisted history for 3M strength scoring.');
    }

    return {
      score: this.average(rows.map((row) => row.score)) ?? 0,
      rows,
      warnings,
    };
  }

  private calculateBreadth(stockUniverse: MarketPulseStockUniverseItem[], prices: MarketPulsePricePoint[]): ComponentResult<MarketPulseBreadthSummary> {
    const groups = this.groupPrices(prices);
    const warnings: string[] = [];
    const seriesRows = stockUniverse
      .map((stock) => groups.get(stock.symbol))
      .filter((series): series is MarketPulsePricePoint[] => Array.isArray(series) && series.length > 0);

    if (seriesRows.length === 0) {
      return { score: 0, summary: this.unavailableBreadthSummary(), warnings: ['Breadth score unavailable because persisted stock price rows are missing.'] };
    }

    const above20 = this.percentSeries(seriesRows, (series) => this.isAboveSma(series, 20));
    const above50 = this.percentSeries(seriesRows, (series) => this.isAboveSma(series, 50));
    const above200 = this.percentSeries(seriesRows, (series) => this.isAboveSma(series, 200));
    const positive1M = this.percentSeries(seriesRows, (series) => this.isPositiveReturn(series, 21));
    const positive3M = this.percentSeries(seriesRows, (series) => this.isPositiveReturn(series, 63));

    if (above20.value === null) warnings.push('Breadth metric above 20 DMA unavailable for the current persisted sample.');
    if (above50.value === null) warnings.push('Breadth metric above 50 DMA unavailable for the current persisted sample.');
    if (above200.value === null) warnings.push('Breadth metric above 200 DMA unavailable for the current persisted sample.');
    if (positive1M.value === null) warnings.push('Breadth metric positive 1M return unavailable for the current persisted sample.');
    if (positive3M.value === null) warnings.push('Breadth metric positive 3M return unavailable for the current persisted sample.');

    const score = (this.average([above20.value, above50.value, above200.value, positive1M.value, positive3M.value].filter(this.isNumber)) ?? 0) * 100;
    const summary: MarketPulseBreadthSummary = {
      status: warnings.length > 0 ? 'PARTIAL' : 'READY',
      percentAbove20Dma: above20.value,
      percentAbove50Dma: above50.value,
      percentAbove200Dma: above200.value,
      percentPositive1M: positive1M.value,
      percentPositive3M: positive3M.value,
      sampleCount: seriesRows.length,
      sma20SampleCount: above20.sampleCount,
      sma50SampleCount: above50.sampleCount,
      sma200SampleCount: above200.sampleCount,
      positive1MSampleCount: positive1M.sampleCount,
      positive3MSampleCount: positive3M.sampleCount,
      summaryText: `Breadth sample ${seriesRows.length}: ${this.formatPercent(above50.value)} above 50 DMA and ${this.formatPercent(positive1M.value)} positive over 1M.`,
    };

    return { score, summary, warnings };
  }

  private calculateDelivery(deliverySnapshots: MarketPulseDeliveryPoint[]): ComponentResult<MarketPulseDeliverySummary> {
    if (deliverySnapshots.length === 0) {
      return {
        score: 0,
        summary: this.unavailableDeliverySummary(),
        warnings: ['Delivery participation data is unavailable from persisted MarketDeliverySnapshot rows.'],
      };
    }

    const latestBySymbol = new Map<string, MarketPulseDeliveryPoint>();
    for (const row of deliverySnapshots) {
      const existing = latestBySymbol.get(row.symbol);
      if (!existing || row.tradingDate > existing.tradingDate) latestBySymbol.set(row.symbol, row);
    }
    const latestRows = [...latestBySymbol.values()].filter((row) => this.isNumber(row.deliveryPercent ?? null));
    if (latestRows.length === 0) {
      return {
        score: 0,
        summary: this.unavailableDeliverySummary(),
        warnings: ['Delivery participation data has no usable delivery percent values.'],
      };
    }

    const highDeliveryCount = latestRows.filter((row) => Number(row.deliveryPercent) >= HIGH_DELIVERY_THRESHOLD).length;
    const highDeliveryPercent = highDeliveryCount / latestRows.length;
    const latestDate = latestRows.map((row) => row.tradingDate).sort((left, right) => right.getTime() - left.getTime())[0];
    const summary: MarketPulseDeliverySummary = {
      status: 'READY',
      sampleCount: latestRows.length,
      highDeliveryCount,
      highDeliveryPercent,
      latestTradingDate: latestDate ? this.dateKey(latestDate) : null,
      summaryText: `${highDeliveryCount} of ${latestRows.length} stocks show high delivery participation.`,
    };

    return { score: highDeliveryPercent * 100, summary, warnings: [] };
  }

  private calculateCandidateCount(
    stockUniverse: MarketPulseStockUniverseItem[],
    prices: MarketPulsePricePoint[],
    weakSectors: MarketPulseSectorSummary[],
    dataThroughDate: Date | null
  ): number {
    if (!dataThroughDate) return 0;
    const groups = this.groupPrices(prices);
    const weakSectorNames = new Set(weakSectors.map((sector) => sector.sector.toUpperCase()));
    let count = 0;
    for (const stock of stockUniverse) {
      if (stock.sector && weakSectorNames.has(stock.sector.toUpperCase())) continue;
      const series = groups.get(stock.symbol);
      if (!series || series.length < 22) continue;
      const latest = series[0];
      if (this.daysBetween(latest.timestamp, dataThroughDate) > 5) continue;
      const positive1M = this.periodReturn(series, 21);
      const positive3M = this.periodReturn(series, 63);
      const hasPositiveReturn = (positive1M !== null && positive1M > 0) || (positive3M !== null && positive3M > 0);
      const hasLiquidity = latest.volume === null || latest.volume === undefined || latest.volume > 0;
      if (hasPositiveReturn && hasLiquidity) count += 1;
    }
    return count;
  }

  private snapshotStatus(hasAnyPriceEvidence: boolean, freshnessStatus: MarketPulseSnapshotStatus, warnings: string[]): MarketPulseSnapshotStatus {
    if (!hasAnyPriceEvidence) return 'FAILED';
    if (freshnessStatus === 'FAILED') return 'FAILED';
    if (freshnessStatus === 'STALE') return 'STALE';
    if (freshnessStatus === 'PARTIAL' || warnings.length > 0) return 'PARTIAL';
    return 'FRESH';
  }

  private downgradeLabelForFreshness(label: MarketPulseHealthLabel, freshnessStatus: MarketPulseSnapshotStatus): MarketPulseHealthLabel {
    if (freshnessStatus === 'FRESH') return label;
    if (freshnessStatus === 'FAILED') return 'RISKY';
    if (freshnessStatus === 'STALE' && label === 'HEALTHY') return 'FRAGILE';
    if (freshnessStatus === 'STALE' && label === 'TRADABLE_BUT_SELECTIVE') return 'FRAGILE';
    if (freshnessStatus === 'PARTIAL' && label === 'HEALTHY') return 'TRADABLE_BUT_SELECTIVE';
    return label;
  }

  private classifySector(score: number, return1M: number | null, return3M: number | null): MarketPulseSectorSummary['classification'] {
    if (score >= 65 && (return1M ?? 0) >= 0) return 'STRONG';
    if (score >= 55 && (return3M ?? 0) >= -0.02) return 'IMPROVING';
    if (score <= 40 || ((return1M ?? 0) < 0 && (return3M ?? 0) < 0)) return 'WEAK';
    return 'NEUTRAL';
  }

  private seriesReturns(series: MarketPulsePricePoint[]) {
    return {
      return1W: this.periodReturn(series, 5),
      return1M: this.periodReturn(series, 21),
      return3M: this.periodReturn(series, 63),
    };
  }

  private seriesScore(series: MarketPulsePricePoint[], returns: { return1W: number | null; return1M: number | null; return3M: number | null }): number {
    const latest = series[0]?.close ?? null;
    const sma20 = this.sma(series, 20);
    const sma50 = this.sma(series, 50);
    const trendScore = latest === null
      ? null
      : this.average([
        sma20 === null ? null : latest > sma20 ? 65 : 35,
        sma50 === null ? null : latest > sma50 ? 70 : 30,
      ].filter(this.isNumber));
    const parts = [
      { value: this.returnScore(returns.return1W), weight: 25 },
      { value: this.returnScore(returns.return1M), weight: 45 },
      { value: this.returnScore(returns.return3M), weight: 20 },
      { value: trendScore, weight: 10 },
    ].filter((item): item is { value: number; weight: number } => this.isNumber(item.value));
    if (parts.length === 0) return 0;
    const weightTotal = parts.reduce((sum, item) => sum + item.weight, 0);
    return parts.reduce((sum, item) => sum + item.value * item.weight, 0) / weightTotal;
  }

  private returnScore(value: number | null): number | null {
    if (value === null) return null;
    return this.clamp(50 + value * 250, 0, 100);
  }

  private periodReturn(series: MarketPulsePricePoint[], offset: number): number | null {
    if (series.length <= offset) return null;
    const latest = series[0]?.close;
    const prior = series[offset]?.close;
    if (!this.isNumber(latest) || !this.isNumber(prior) || prior <= 0) return null;
    return (latest - prior) / prior;
  }

  private sma(series: MarketPulsePricePoint[], period: number): number | null {
    if (series.length < period) return null;
    return this.average(series.slice(0, period).map((row) => row.close));
  }

  private isAboveSma(series: MarketPulsePricePoint[], period: number): boolean | null {
    const latest = series[0]?.close;
    const average = this.sma(series, period);
    if (!this.isNumber(latest) || average === null) return null;
    return latest > average;
  }

  private isPositiveReturn(series: MarketPulsePricePoint[], offset: number): boolean | null {
    const result = this.periodReturn(series, offset);
    return result === null ? null : result > 0;
  }

  private percentSeries(seriesRows: MarketPulsePricePoint[][], predicate: (series: MarketPulsePricePoint[]) => boolean | null) {
    const evaluated = seriesRows.map(predicate).filter((value): value is boolean => value !== null);
    if (evaluated.length === 0) return { value: null as number | null, sampleCount: 0 };
    return {
      value: evaluated.filter(Boolean).length / evaluated.length,
      sampleCount: evaluated.length,
    };
  }

  private groupPrices(prices: MarketPulsePricePoint[]): Map<string, MarketPulsePricePoint[]> {
    const groups = new Map<string, MarketPulsePricePoint[]>();
    for (const price of prices) {
      if (!price.symbol || !this.isNumber(price.close) || price.close <= 0) continue;
      const symbol = price.symbol.trim();
      groups.set(symbol, [...(groups.get(symbol) || []), price]);
    }
    for (const [symbol, series] of groups.entries()) {
      groups.set(symbol, series.sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime()));
    }
    return groups;
  }

  private latestEvidenceDate(data: MarketPulseCalculationData): Date | null {
    const dates = [
      ...data.stockPrices.map((row) => row.timestamp),
      ...data.indexPrices.map((row) => row.timestamp),
      ...data.sectorIndexPrices.map((row) => row.timestamp),
      ...data.deliverySnapshots.map((row) => row.tradingDate),
    ];
    return dates.length > 0 ? dates.sort((left, right) => right.getTime() - left.getTime())[0] : null;
  }

  private unavailableBreadthSummary(): MarketPulseBreadthSummary {
    return {
      status: 'UNAVAILABLE',
      percentAbove20Dma: null,
      percentAbove50Dma: null,
      percentAbove200Dma: null,
      percentPositive1M: null,
      percentPositive3M: null,
      sampleCount: 0,
      sma20SampleCount: 0,
      sma50SampleCount: 0,
      sma200SampleCount: 0,
      positive1MSampleCount: 0,
      positive3MSampleCount: 0,
      summaryText: 'Breadth is unavailable because persisted stock price rows are missing.',
    };
  }

  private unavailableDeliverySummary(): MarketPulseDeliverySummary {
    return {
      status: 'UNAVAILABLE',
      sampleCount: 0,
      highDeliveryCount: 0,
      highDeliveryPercent: null,
      latestTradingDate: null,
      summaryText: 'Delivery participation is unavailable from persisted delivery snapshots.',
    };
  }

  private toDto(row: MarketPulseSnapshotRecord): MarketPulseSnapshotDto {
    return {
      snapshotDate: this.dateKey(row.snapshotDate),
      dataThroughDate: this.dateKey(row.dataThroughDate),
      generatedAt: row.generatedAt.toISOString(),
      status: row.status,
      marketHealthScore: row.marketHealthScore,
      marketHealthLabel: row.marketHealthLabel,
      indexTrendScore: row.indexTrendScore,
      sectorStrengthScore: row.sectorStrengthScore,
      breadthScore: row.breadthScore,
      deliveryParticipationScore: row.deliveryParticipationScore,
      dataFreshnessScore: row.dataFreshnessScore,
      topIndices: row.topIndicesJson,
      strongSectors: row.strongSectorsJson.map((sector) => sector.sector),
      weakSectors: row.weakSectorsJson.map((sector) => sector.sector),
      breadthSummary: row.breadthSummaryJson.summaryText,
      deliverySummary: row.deliverySummaryJson.summaryText,
      candidateCount: row.candidateCount,
      warnings: row.warningsJson,
      sourceSummary: row.sourceSummaryJson,
      pipelineRunId: row.pipelineRunId,
    };
  }

  private normalizeScope(scope: MarketPulseScope): Required<MarketPulseScope> {
    return {
      region: String(scope.region || 'IN').trim().toUpperCase() || 'IN',
      assetType: String(scope.assetType || 'STOCK').trim().toUpperCase() || 'STOCK',
      timeframe: String(scope.timeframe || '1d').trim().toLowerCase() || '1d',
    };
  }

  private utcDay(value: Date): Date {
    const day = new Date(value);
    day.setUTCHours(0, 0, 0, 0);
    return day;
  }

  private dateKey(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private daysBetween(left: Date, right: Date): number {
    return Math.abs(this.utcDay(left).getTime() - this.utcDay(right).getTime()) / (24 * 60 * 60 * 1000);
  }

  private average(values: number[]): number | null {
    return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private isNumber(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private formatPercent(value: number | null): string {
    return value === null ? 'unavailable' : `${(value * 100).toFixed(1)}%`;
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
  }
}
