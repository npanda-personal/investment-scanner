import { MarketDataFoundationService } from '../market-data-foundation';
import { SignalGenerationEngineService, type SignalItem, type SignalResultDto } from '../signal-generation-engine';
import { HistoricalContextSnapshotsService } from '../historical-context-snapshots';
import { DataQualityEngineService } from '../data-quality-engine';
import { SignalQualityLabRepository } from './signal-quality-lab.repository';
import type {
  ForwardOutcome,
  NoisySignalItem,
  ParsedSignalType,
  PricePoint,
  QualityHorizon,
  QualityMetricGroup,
  QualityQuery,
  DataQualityFilterSummary,
  EvaluationDiagnostics,
  HorizonAvailabilitySummary,
  QualityRecalculateRequest,
  QualityRecalculateResponse,
  QualitySummary,
  SignalHistoryItem,
  SignalOutcomeSet,
  SignalTypePerformance,
} from './signal-quality-lab.types';

const HORIZON_DAYS: Record<QualityHorizon, number> = { '1D': 1, '5D': 5, '10D': 10, '20D': 20, '60D': 60 };
const SCORE_BUCKETS = [
  { label: '0-39', min: 0, max: 39 },
  { label: '40-69', min: 40, max: 69 },
  { label: '70-84', min: 70, max: 84 },
  { label: '85-100', min: 85, max: 100 },
];
const FLIP_THRESHOLD = 3;
const FAILED_BULLISH_10D = -0.03;
const FAILED_BEARISH_10D = 0.03;
const STALE_SIGNAL_DAYS = 7;
const PRICE_LOOKUP_CONCURRENCY = 8;

export class SignalQualityLabService {
  constructor(
    _repository = new SignalQualityLabRepository(),
    private readonly signalService = new SignalGenerationEngineService(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly historicalContextService = new HistoricalContextSnapshotsService(),
    private readonly dataQualityService = new DataQualityEngineService()
  ) {}

  async history(instrumentId: string, query: QualityQuery): Promise<SignalHistoryItem[]> {
    const signals = await this.signalService.signalHistory({ ...query, instrumentId });
    return signals.map((signal) => this.historyItem(signal));
  }

  async outcomes(instrumentId: string, query: QualityQuery): Promise<SignalOutcomeSet[]> {
    const signals = await this.signalService.signalHistory({ ...query, instrumentId });
    return this.outcomesForSignals(signals, query);
  }

  async dashboard(query: QualityQuery) {
    const rawSignals = await this.signalService.signalHistory(query);
    const signals = await this.applyDataQualityFilters(rawSignals, query);
    const outcomes = await this.outcomesForSignals(signals, query);
    const dataQualityFilterSummary = await this.dataQualityFilterSummaryFrom(rawSignals, signals, query);
    const diagnostics = await this.evaluationDiagnostics(rawSignals, signals, outcomes, query, dataQualityFilterSummary);
    const horizonAvailability = this.horizonAvailability(outcomes);
    
    const evaluated = this.evaluatedForHorizon(outcomes, query.horizon);
    const byType = this.signalTypePerformance(signals, outcomes, query.horizon).filter((item) => item.sampleSize >= query.minSampleSize);
    const bySector = this.groupMetrics(outcomes, query.horizon, (item) => item.sector || 'Unknown').filter((item) => item.sampleSize >= query.minSampleSize);
    const noisy = this.detectNoisySignals(signals, outcomes);
    
    const summary: QualitySummary = {
      totalSignals: signals.length,
      evaluatedSignals: evaluated.length,
      unevaluatedSignals: signals.length - evaluated.length,
      overallBullishWinRate: this.winRate(outcomes, query.horizon, 'BULLISH'),
      overallBearishWinRate: this.winRate(outcomes, query.horizon, 'BEARISH'),
      average5DReturn: this.averageHorizon(outcomes, '5D'),
      average20DReturn: this.averageHorizon(outcomes, '20D'),
      bestPerformingSignalType: byType[0]?.signalType ?? null,
      worstPerformingSignalType: byType.length > 0 ? byType[byType.length - 1].signalType : null,
      bestSector: bySector[0]?.group ?? null,
      worstSector: bySector.length > 0 ? bySector[bySector.length - 1].group : null,
      noisySignalCount: noisy.length,
      dataStatus: signals.length === 0 ? 'MISSING' : evaluated.length < signals.length ? 'PARTIAL' : 'COMPLETE',
      generatedAt: new Date().toISOString(),
      dataQualityFilterSummary,
      evaluationDiagnostics: diagnostics,
      horizonAvailability,
      recommendedAction: diagnostics.recommendedAction,
      warnings: diagnostics.warnings,
    };

    const regimeBySignal = new Map<string, string>();
    await Promise.all(signals.map(async (signal) => {
      const regime = await this.historicalContextService.regimeForDate(new Date(signal.generated_at)).catch(() => null);
      regimeBySignal.set(signal.id || signal.generated_at, regime || 'MISSING_REGIME_CONTEXT');
    }));
    const byRegime = this.groupMetrics(outcomes, query.horizon, (item) => regimeBySignal.get(item.signalResultId) || 'MISSING_REGIME_CONTEXT')
      .filter((item) => item.sampleSize >= query.minSampleSize);

    const evaluations = await this.dataQualityService.getEvaluationsForInstruments(signals.map((signal) => signal.instrument_id)).catch(() => []);
    const byId = new Map(evaluations.map((evaluation) => [evaluation.instrumentId, evaluation]));
    const byDataQuality = [
      ...this.groupMetrics(outcomes, query.horizon, (item) => `coverage:${byId.get(item.instrumentId)?.coverageStatus || 'MISSING'}`),
      ...this.groupMetrics(outcomes, query.horizon, (item) => `readiness:${byId.get(item.instrumentId)?.signalReadinessStatus || 'MISSING'}`),
      ...this.groupMetrics(outcomes, query.horizon, (item) => `liquidity:${byId.get(item.instrumentId)?.liquidityStatus || 'MISSING'}`),
    ].filter((item) => item.sampleSize >= query.minSampleSize);

    return { summary, byType, bySector, byRegime, byDataQuality, noisy };
  }

  async summary(query: QualityQuery): Promise<QualitySummary> {
    const rawSignals = await this.signalService.signalHistory(query);
    const signals = await this.applyDataQualityFilters(rawSignals, query);
    const outcomes = await this.outcomesForSignals(signals, query);
    const dataQualityFilterSummary = await this.dataQualityFilterSummaryFrom(rawSignals, signals, query);
    const diagnostics = await this.evaluationDiagnostics(rawSignals, signals, outcomes, query, dataQualityFilterSummary);
    const horizonAvailability = this.horizonAvailability(outcomes);
    const evaluated = this.evaluatedForHorizon(outcomes, query.horizon);
    const byType = this.signalTypePerformance(signals, outcomes, query.horizon).filter((item) => item.sampleSize >= query.minSampleSize);
    const bySector = this.groupMetrics(outcomes, query.horizon, (item) => item.sector || 'Unknown').filter((item) => item.sampleSize >= query.minSampleSize);
    const noisy = this.detectNoisySignals(signals, outcomes);
    return {
      totalSignals: signals.length,
      evaluatedSignals: evaluated.length,
      unevaluatedSignals: signals.length - evaluated.length,
      overallBullishWinRate: this.winRate(outcomes, query.horizon, 'BULLISH'),
      overallBearishWinRate: this.winRate(outcomes, query.horizon, 'BEARISH'),
      average5DReturn: this.averageHorizon(outcomes, '5D'),
      average20DReturn: this.averageHorizon(outcomes, '20D'),
      bestPerformingSignalType: byType[0]?.signalType ?? null,
      worstPerformingSignalType: byType.length > 0 ? byType[byType.length - 1].signalType : null,
      bestSector: bySector[0]?.group ?? null,
      worstSector: bySector.length > 0 ? bySector[bySector.length - 1].group : null,
      noisySignalCount: noisy.length,
      dataStatus: signals.length === 0 ? 'MISSING' : evaluated.length < signals.length ? 'PARTIAL' : 'COMPLETE',
      generatedAt: new Date().toISOString(),
      dataQualityFilterSummary,
      evaluationDiagnostics: diagnostics,
      horizonAvailability,
      recommendedAction: diagnostics.recommendedAction,
      warnings: diagnostics.warnings,
    };
  }

  async byType(query: QualityQuery): Promise<SignalTypePerformance[]> {
    const signals = await this.loadSignals(query);
    return this.signalTypePerformance(signals, await this.outcomesForSignals(signals, query), query.horizon).filter((item) => item.sampleSize >= query.minSampleSize);
  }

  async bySector(query: QualityQuery): Promise<QualityMetricGroup[]> {
    return this.groupMetrics(await this.outcomesForSignals(await this.loadSignals(query), query), query.horizon, (item) => item.sector || 'Unknown')
      .filter((item) => item.sampleSize >= query.minSampleSize);
  }

  async byScoreBucket(query: QualityQuery): Promise<QualityMetricGroup[]> {
    return this.groupMetrics(await this.outcomesForSignals(await this.loadSignals(query), query), query.horizon, (item) => this.scoreBucket(item.score))
      .filter((item) => item.sampleSize >= query.minSampleSize);
  }

  async byDataQuality(query: QualityQuery): Promise<QualityMetricGroup[]> {
    const signals = await this.loadSignals(query);
    const outcomes = await this.outcomesForSignals(signals, query);
    const evaluations = await this.dataQualityService.getEvaluationsForInstruments(signals.map((signal) => signal.instrument_id)).catch(() => []);
    const byId = new Map(evaluations.map((evaluation) => [evaluation.instrumentId, evaluation]));
    const groups = [
      ...this.groupMetrics(outcomes, query.horizon, (item) => `coverage:${byId.get(item.instrumentId)?.coverageStatus || 'MISSING'}`),
      ...this.groupMetrics(outcomes, query.horizon, (item) => `readiness:${byId.get(item.instrumentId)?.signalReadinessStatus || 'MISSING'}`),
      ...this.groupMetrics(outcomes, query.horizon, (item) => `liquidity:${byId.get(item.instrumentId)?.liquidityStatus || 'MISSING'}`),
    ];
    return groups.filter((item) => item.sampleSize >= query.minSampleSize);
  }

  async byRegime(query: QualityQuery): Promise<QualityMetricGroup[]> {
    const signals = await this.loadSignals(query);
    const outcomes = await this.outcomesForSignals(signals, query);
    const regimeBySignal = new Map<string, string>();
    await Promise.all(signals.map(async (signal) => {
      const regime = await this.historicalContextService.regimeForDate(new Date(signal.generated_at)).catch(() => null);
      regimeBySignal.set(signal.id || signal.generated_at, regime || 'MISSING_REGIME_CONTEXT');
    }));
    return this.groupMetrics(outcomes, query.horizon, (item) => regimeBySignal.get(item.signalResultId) || 'MISSING_REGIME_CONTEXT')
      .filter((item) => item.sampleSize >= query.minSampleSize);
  }

  async noisy(query: QualityQuery): Promise<NoisySignalItem[]> {
    const signals = await this.loadSignals(query);
    return this.detectNoisySignals(signals, await this.outcomesForSignals(signals, query));
  }

  async recalculate(input: QualityRecalculateRequest): Promise<QualityRecalculateResponse> {
    const started = Date.now();
    const batchSize = this.clampInt(input.batchSize, 25, 1, 100);
    const offset = this.clampInt(input.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const [totalCount, signals] = await Promise.all([
      this.signalService.signalHistoryCount({ from: input.from, to: input.to }),
      this.signalService.signalHistory({
        limit: batchSize,
        offset,
        from: input.from,
        to: input.to,
      }),
    ]);
    const processedCount = signals.length;
    const selectedHorizon: QualityHorizon = input.horizon || '20D';
    const outcomes = await this.outcomesForSignals(signals, {
      horizon: selectedHorizon,
      limit: batchSize,
      minSampleSize: 0,
      region: input.region,
      assetType: input.assetType,
    });
    const evaluatedInBatch = this.evaluatedForHorizon(outcomes, selectedHorizon).length;
    const missingPriceHistoryInBatch = outcomes.filter((outcome) => !outcome.priceHistoryAvailable).length;
    const insufficientFuturePriceInBatch = outcomes.length - evaluatedInBatch - missingPriceHistoryInBatch;
    const nextOffset = offset + processedCount;
    return {
      processedCount,
      totalCount,
      batchSize,
      offset,
      nextOffset: nextOffset < totalCount ? nextOffset : null,
      hasMore: nextOffset < totalCount,
      inserted: 0,
      updated: 0,
      skipped: processedCount,
      evaluatedInBatch,
      insufficientFuturePriceInBatch,
      missingPriceHistoryInBatch,
      outcomesPersisted: false,
      message: 'Outcomes are calculated on demand; recalculation refreshed diagnostics only.',
      warnings: ['Signal Quality Lab outcomes are calculated on demand; no cached rows were persisted.'],
      durationMs: Date.now() - started,
    };
  }

  private clampInt(value: unknown, fallback: number, min: number, max: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(numeric)));
  }

  async loadSignals(query: QualityQuery): Promise<SignalResultDto[]> {
    const signals = await this.signalService.signalHistory(query);
    return this.applyDataQualityFilters(signals, query);
  }

  async dataQualityFilterSummary(query: QualityQuery): Promise<DataQualityFilterSummary> {
    const filterApplied = this.qualityFilterApplied(query);
    const before = await this.signalService.signalHistory(query);
    if (!filterApplied) {
      return { totalSignalsBeforeFilter: before.length, totalSignalsAfterFilter: before.length, excludedByDataQuality: 0, missingQualityEvaluationCount: 0, filterApplied: false };
    }
    const after = await this.applyDataQualityFilters(before, query);
    return this.dataQualityFilterSummaryFrom(before, after, query);
  }

  private async dataQualityFilterSummaryFrom(before: SignalResultDto[], after: SignalResultDto[], query: QualityQuery): Promise<DataQualityFilterSummary> {
    const filterApplied = this.qualityFilterApplied(query);
    if (!filterApplied) {
      return { totalSignalsBeforeFilter: before.length, totalSignalsAfterFilter: after.length, excludedByDataQuality: 0, missingQualityEvaluationCount: 0, filterApplied: false };
    }
    const evaluations = await this.dataQualityService.getEvaluationsForInstruments(before.map((signal) => signal.instrument_id)).catch(() => []);
    return {
      totalSignalsBeforeFilter: before.length,
      totalSignalsAfterFilter: after.length,
      excludedByDataQuality: before.length - after.length,
      missingQualityEvaluationCount: before.length - evaluations.length,
      filterApplied: true,
    };
  }

  private async applyDataQualityFilters(signals: SignalResultDto[], query: QualityQuery): Promise<SignalResultDto[]> {
    if (!this.qualityFilterApplied(query)) return signals;
    const evaluations = await this.dataQualityService.getEvaluationsForInstruments(signals.map((signal) => signal.instrument_id)).catch(() => []);
    const byId = new Map(evaluations.map((evaluation) => [evaluation.instrumentId, evaluation]));
    return signals.filter((signal) => {
      const evaluation = byId.get(signal.instrument_id);
      if (!evaluation) return true;
      if (query.readinessStatus && evaluation.signalReadinessStatus !== query.readinessStatus) return false;
      if (query.coverageStatus && evaluation.coverageStatus !== query.coverageStatus) return false;
      if (query.liquidityStatus && evaluation.liquidityStatus !== query.liquidityStatus) return false;
      if (query.minReadinessScore !== undefined && evaluation.signalReadinessScore < query.minReadinessScore) return false;
      if (query.onlySignalReady && !evaluation.eligibleForSignals) return false;
      if (query.excludePoorQuality && ['POOR', 'UNUSABLE'].includes(evaluation.coverageStatus)) return false;
      return true;
    });
  }

  private qualityFilterApplied(query: QualityQuery): boolean {
    return Boolean(query.readinessStatus || query.coverageStatus || query.liquidityStatus || query.minReadinessScore !== undefined || query.onlySignalReady || query.excludePoorQuality);
  }

  async outcomesForSignals(signals: SignalResultDto[], query?: Partial<QualityQuery>): Promise<SignalOutcomeSet[]> {
    const pricesByKey = await this.pricesForSignals(signals, query);
    return signals.map((signal) => {
      const cacheKey = this.priceCacheKey(signal.instrument_id, query);
      return this.calculateOutcome(signal, pricesByKey.get(cacheKey) || []);
    });
  }

  private async pricesForSignals(signals: SignalResultDto[], query?: Partial<QualityQuery>): Promise<Map<string, PricePoint[]>> {
    const bulkPrices = await this.bulkPricesForSignals(signals, query);
    if (bulkPrices) return bulkPrices;

    const uniqueSignals = [...new Map(signals.map((signal) => [this.priceCacheKey(signal.instrument_id, query), signal])).values()];
    const entries = await this.mapConcurrent(uniqueSignals, PRICE_LOOKUP_CONCURRENCY, async (signal) => {
      const cacheKey = this.priceCacheKey(signal.instrument_id, query);
      const prices = await this.prices(signal.instrument_id, query);
      return [cacheKey, prices] as const;
    });
    return new Map(entries);
  }

  private async bulkPricesForSignals(signals: SignalResultDto[], query?: Partial<QualityQuery>): Promise<Map<string, PricePoint[]> | null> {
    const bulkLoader = (this.marketDataService as any).listForwardPriceWindowsByInstrumentIds;
    if (typeof bulkLoader !== 'function' || signals.length === 0) return null;

    const earliestGeneratedAt = signals
      .map((signal) => this.utcTradingDay(new Date(signal.generated_at)).getTime())
      .filter(Number.isFinite)
      .reduce((earliest, value) => Math.min(earliest, value), Number.POSITIVE_INFINITY);
    if (!Number.isFinite(earliestGeneratedAt)) return null;

    const instrumentIds = [...new Set(signals.map((signal) => signal.instrument_id).filter(Boolean))];
    const response = await bulkLoader.call(
      this.marketDataService,
      instrumentIds,
      new Date(earliestGeneratedAt),
      { region: query?.region, assetType: query?.assetType }
    ).catch(() => null);
    if (!response) return null;

    const result = new Map<string, PricePoint[]>();
    for (const instrumentId of instrumentIds) {
      const rawPrices = response instanceof Map ? response.get(instrumentId) : response[instrumentId];
      result.set(this.priceCacheKey(instrumentId, query), this.normalizePrices(rawPrices || []));
    }
    return result;
  }

  calculateOutcome(signal: SignalResultDto, prices: PricePoint[]): SignalOutcomeSet {
    const generatedAt = this.utcTradingDay(new Date(signal.generated_at));
    const startIndex = prices.findIndex((price) => this.utcTradingDay(new Date(price.date)).getTime() >= generatedAt.getTime());
    const start = startIndex >= 0 ? prices[startIndex] : null;
    const window = startIndex >= 0 ? prices.slice(startIndex, startIndex + 61) : [];
    const outcomes = (Object.keys(HORIZON_DAYS) as QualityHorizon[]).map((horizon) =>
      this.forwardOutcome(horizon, start, window)
    );
    const pathReturns = start && start.adjustedClose > 0 ? window.map((price) => (price.adjustedClose - start.adjustedClose) / start.adjustedClose) : [];
    return {
      signalResultId: signal.id || '',
      instrumentId: signal.instrument_id,
      symbol: signal.symbol,
      direction: signal.direction,
      confidence: signal.confidence,
      score: signal.score,
      sector: signal.sector,
      country: signal.country,
      generatedAt: signal.generated_at,
      outcomes,
      priceHistoryAvailable: prices.length > 0,
      startPriceDate: start?.date ?? null,
      latestAvailablePriceDate: prices.length > 0 ? prices[prices.length - 1].date : null,
      futureRowsAvailable: startIndex >= 0 ? Math.max(0, window.length - 1) : 0,
      maxFavorableMovePercent: pathReturns.length > 0 ? Math.max(...pathReturns) : null,
      maxAdverseMovePercent: pathReturns.length > 0 ? Math.min(...pathReturns) : null,
      maxDrawdownPercent: this.maxDrawdown(window),
      researchUrl: `/research/stocks/${signal.instrument_id}`,
    };
  }

  groupMetrics(outcomes: SignalOutcomeSet[], horizon: QualityHorizon, groupBy: (item: SignalOutcomeSet) => string): QualityMetricGroup[] {
    const groups = new Map<string, SignalOutcomeSet[]>();
    for (const outcome of outcomes) {
      const group = groupBy(outcome);
      groups.set(group, [...(groups.get(group) || []), outcome]);
    }
    return [...groups.entries()].map(([group, items]) => this.metric(group, horizon, items)).sort(this.metricSort);
  }

  signalTypePerformance(signals: SignalResultDto[], outcomes: SignalOutcomeSet[], horizon: QualityHorizon): SignalTypePerformance[] {
    const outcomeById = new Map(outcomes.map((outcome) => [outcome.signalResultId, outcome]));
    const byType = new Map<string, SignalOutcomeSet[]>();
    const category = new Map<string, string>();
    for (const signal of signals) {
      const outcome = outcomeById.get(signal.id || '');
      if (!outcome) continue;
      for (const parsed of this.parseSignalTypes(signal)) {
        byType.set(parsed.code, [...(byType.get(parsed.code) || []), outcome]);
        category.set(parsed.code, parsed.category);
      }
    }
    return [...byType.entries()]
      .map(([signalType, items]) => ({ ...this.metric(signalType, horizon, items), signalType, category: category.get(signalType) || 'UNKNOWN' }))
      .sort(this.metricSort);
  }

  parseSignalTypes(signal: Pick<SignalResultDto, 'triggered_signals' | 'negative_signals'>): ParsedSignalType[] {
    const parse = (items: SignalItem[] | undefined, polarity: 'POSITIVE' | 'NEGATIVE') => (Array.isArray(items) ? items : [])
      .map((item: any) => ({
        code: String(item.code || item.type || item.label || 'UNKNOWN'),
        category: String(item.category || 'UNKNOWN'),
        label: String(item.label || item.code || 'Unknown signal'),
        polarity,
        item,
      }));
    return [...parse(signal.triggered_signals, 'POSITIVE'), ...parse(signal.negative_signals, 'NEGATIVE')];
  }

  detectNoisySignals(signals: SignalResultDto[], outcomes: SignalOutcomeSet[]): NoisySignalItem[] {
    const items: NoisySignalItem[] = [];
    const byInstrument = new Map<string, SignalResultDto[]>();
    for (const signal of signals) byInstrument.set(signal.instrument_id, [...(byInstrument.get(signal.instrument_id) || []), signal]);
    for (const instrumentSignals of byInstrument.values()) {
      const sorted = [...instrumentSignals].sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
      const latest = sorted[0];
      const thirtyDaysAgo = Date.now() - 30 * 86400000;
      const recent = sorted.filter((signal) => new Date(signal.generated_at).getTime() >= thirtyDaysAgo);
      let flips = 0;
      for (let i = 1; i < recent.length; i += 1) if (recent[i].direction !== recent[i - 1].direction) flips += 1;
      if (flips >= FLIP_THRESHOLD) items.push(this.noise(latest, 'DIRECTION_FLIPS', 'HIGH', `${flips} direction flips in the last 30 days.`, { flips }));
      if ((Date.now() - new Date(latest.generated_at).getTime()) / 86400000 > STALE_SIGNAL_DAYS) items.push(this.noise(latest, 'STALE_SIGNAL', 'LOW', 'Latest signal is older than 7 days.', { generatedAt: latest.generated_at }));
    }
    for (const outcome of outcomes) {
      const tenDay = outcome.outcomes.find((item) => item.horizon === '10D');
      if (!tenDay?.available || tenDay.forwardReturnPercent === null) continue;
      if (outcome.direction === 'BULLISH' && outcome.score >= 70 && tenDay.forwardReturnPercent < FAILED_BULLISH_10D) {
        items.push(this.noise(outcome, 'FAILED_HIGH_SCORE_BULLISH', 'MEDIUM', 'High-score bullish signal had a negative 10D outcome.', { return10D: tenDay.forwardReturnPercent, score: outcome.score }));
      }
      if (outcome.direction === 'BEARISH' && tenDay.forwardReturnPercent > FAILED_BEARISH_10D) {
        items.push(this.noise(outcome, 'FAILED_BEARISH', 'MEDIUM', 'Bearish signal had a positive 10D outcome.', { return10D: tenDay.forwardReturnPercent }));
      }
      if (outcome.confidence === 'LOW') items.push(this.noise(outcome, 'LOW_CONFIDENCE_SIGNAL', 'LOW', 'Low-confidence signal should be reviewed with caution.', { confidence: outcome.confidence }));
    }
    return items;
  }

  private async prices(instrumentId: string, query?: Partial<QualityQuery>): Promise<PricePoint[]> {
    const response = await this.marketDataService.listPricesByInstrumentId(
      instrumentId,
      6000,
      undefined,
      undefined,
      { region: query?.region, assetType: query?.assetType }
    );
    return this.normalizePrices(response?.prices || []);
  }

  private normalizePrices(prices: any[]): PricePoint[] {
    return prices
      .map((price: any) => ({ date: new Date(price.date).toISOString(), adjustedClose: Number(price.adjusted_close ?? price.close) }))
      .filter((price) => Number.isFinite(price.adjustedClose))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private priceCacheKey(instrumentId: string, query?: Partial<QualityQuery>): string {
    return `${instrumentId}:${query?.region || 'GLOBAL'}:${query?.assetType || 'STOCK'}`;
  }

  private async mapConcurrent<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
    if (items.length === 0) return [];
    const results = new Array<R>(items.length);
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await worker(items[currentIndex]);
      }
    });
    await Promise.all(workers);
    return results;
  }

  private forwardOutcome(horizon: QualityHorizon, start: PricePoint | null, window: PricePoint[]): ForwardOutcome {
    const future = window[HORIZON_DAYS[horizon]];
    if (!start || !future || start.adjustedClose <= 0) {
      return { horizon, forwardReturnPercent: null, available: false, priceAtSignal: start?.adjustedClose ?? null, futurePrice: null, futureDate: null };
    }
    return {
      horizon,
      forwardReturnPercent: (future.adjustedClose - start.adjustedClose) / start.adjustedClose,
      available: true,
      priceAtSignal: start.adjustedClose,
      futurePrice: future.adjustedClose,
      futureDate: future.date,
    };
  }

  private metric(group: string, horizon: QualityHorizon, items: SignalOutcomeSet[]): QualityMetricGroup {
    const available = items.map((item) => ({ item, outcome: item.outcomes.find((outcome) => outcome.horizon === horizon) })).filter((entry) => entry.outcome?.available && entry.outcome.forwardReturnPercent !== null);
    const returns = available.map((entry) => entry.outcome!.forwardReturnPercent!);
    const missingPrice = items.filter((item) => !item.priceHistoryAvailable).length;
    const unevaluatedCount = items.length - returns.length;
    const status = this.groupStatus(items.length, returns.length, missingPrice, horizon);
    const reason = this.groupReason(items.length, returns.length, missingPrice, horizon);
    return {
      group,
      name: group,
      horizon,
      rawSignalCount: items.length,
      sampleSize: returns.length,
      samples: returns.length,
      unevaluatedCount,
      winRate: this.winRate(items, horizon),
      averageForwardReturn: this.average(returns),
      averageReturn: this.average(returns),
      medianForwardReturn: this.median(returns),
      medianReturn: this.median(returns),
      averageMaxDrawdown: this.average(items.map((item) => item.maxDrawdownPercent).filter((value): value is number => value !== null)),
      bestReturn: returns.length > 0 ? Math.max(...returns) : null,
      worstReturn: returns.length > 0 ? Math.min(...returns) : null,
      positiveCount: returns.filter((value) => value > 0).length,
      negativeCount: returns.filter((value) => value < 0).length,
      status,
      reason,
    };
  }

  private winRate(items: SignalOutcomeSet[], horizon: QualityHorizon, direction?: 'BULLISH' | 'BEARISH'): number | null {
    const eligible = items.filter((item) => (direction ? item.direction === direction : item.direction !== 'NEUTRAL'));
    const outcomes = eligible.map((item) => ({ item, outcome: item.outcomes.find((outcome) => outcome.horizon === horizon) })).filter((entry) => entry.outcome?.available && entry.outcome.forwardReturnPercent !== null);
    if (outcomes.length === 0) return null;
    const wins = outcomes.filter(({ item, outcome }) => item.direction === 'BULLISH' ? outcome!.forwardReturnPercent! > 0 : outcome!.forwardReturnPercent! < 0).length;
    return wins / outcomes.length;
  }

  private averageHorizon(items: SignalOutcomeSet[], horizon: QualityHorizon): number | null {
    return this.average(items.map((item) => item.outcomes.find((outcome) => outcome.horizon === horizon)?.forwardReturnPercent).filter((value): value is number => value !== null && value !== undefined));
  }

  private maxDrawdown(window: PricePoint[]): number | null {
    if (window.length === 0) return null;
    let peak = window[0].adjustedClose;
    let drawdown = 0;
    for (const price of window) {
      peak = Math.max(peak, price.adjustedClose);
      if (peak > 0) drawdown = Math.min(drawdown, (price.adjustedClose - peak) / peak);
    }
    return drawdown;
  }

  private historyItem(signal: SignalResultDto): SignalHistoryItem {
    return { ...signal, signalResultId: signal.id || '', researchUrl: `/research/stocks/${signal.instrument_id}` };
  }

  private evaluatedForHorizon(outcomes: SignalOutcomeSet[], horizon: QualityHorizon): SignalOutcomeSet[] {
    return outcomes.filter((item) => {
      const outcome = item.outcomes.find((entry) => entry.horizon === horizon);
      return Boolean(outcome?.available && outcome.forwardReturnPercent !== null);
    });
  }

  private horizonAvailability(outcomes: SignalOutcomeSet[]): HorizonAvailabilitySummary {
    return (Object.keys(HORIZON_DAYS) as QualityHorizon[]).reduce((summary, horizon) => {
      const evaluated = this.evaluatedForHorizon(outcomes, horizon).length;
      const missingPriceHistory = outcomes.filter((item) => !item.priceHistoryAvailable).length;
      summary[horizon] = {
        eligible: outcomes.length - missingPriceHistory,
        evaluated,
        insufficientFuturePrice: outcomes.length - missingPriceHistory - evaluated,
      };
      return summary;
    }, {} as HorizonAvailabilitySummary);
  }

  private async evaluationDiagnostics(
    rawSignals: SignalResultDto[],
    filteredSignals: SignalResultDto[],
    outcomes: SignalOutcomeSet[],
    query: QualityQuery,
    dataQualityFilterSummary: DataQualityFilterSummary
  ): Promise<EvaluationDiagnostics> {
    const evaluatedSignals = this.evaluatedForHorizon(outcomes, query.horizon).length;
    const missingPriceHistoryCount = outcomes.filter((item) => !item.priceHistoryAvailable).length;
    const insufficientFuturePriceCount = Math.max(0, filteredSignals.length - evaluatedSignals - missingPriceHistoryCount);
    const signalDates = filteredSignals.map((signal) => new Date(signal.generated_at)).filter((date) => Number.isFinite(date.getTime()));
    const latestPriceDates = outcomes.map((item) => item.latestAvailablePriceDate).filter((date): date is string => Boolean(date));
    const latestAvailablePriceDate = latestPriceDates.length > 0
      ? new Date(Math.max(...latestPriceDates.map((date) => new Date(date).getTime()))).toISOString()
      : null;
    const newestUnevaluated = outcomes
      .filter((item) => item.priceHistoryAvailable && !item.outcomes.find((outcome) => outcome.horizon === query.horizon)?.available)
      .map((item) => new Date(item.generatedAt).getTime())
      .filter(Number.isFinite);
    const nextEvaluableDate = newestUnevaluated.length > 0
      ? new Date(Math.min(...newestUnevaluated) + HORIZON_DAYS[query.horizon] * 86400000).toISOString()
      : null;
    const [excludedByDirectionCount, excludedByDateFilterCount] = await Promise.all([
      query.direction ? this.countDelta(query, { direction: undefined }) : Promise.resolve(0),
      query.from || query.to ? this.countDelta(query, { from: undefined, to: undefined }) : Promise.resolve(0),
    ]);
    const warnings = this.diagnosticWarnings(filteredSignals.length, evaluatedSignals, insufficientFuturePriceCount, missingPriceHistoryCount, dataQualityFilterSummary);
    return {
      totalSignals: rawSignals.length,
      signalsAfterFilters: filteredSignals.length,
      evaluatedSignals,
      unevaluatedSignals: filteredSignals.length - evaluatedSignals,
      insufficientFuturePriceCount,
      missingPriceHistoryCount,
      missingInstrumentCount: 0,
      excludedByDataQualityCount: dataQualityFilterSummary.excludedByDataQuality,
      excludedByDateFilterCount,
      excludedByDirectionCount,
      selectedHorizon: query.horizon,
      earliestSignalDate: signalDates.length > 0 ? new Date(Math.min(...signalDates.map((date) => date.getTime()))).toISOString() : null,
      latestSignalDate: signalDates.length > 0 ? new Date(Math.max(...signalDates.map((date) => date.getTime()))).toISOString() : null,
      latestAvailablePriceDate,
      minimumRequiredFutureRows: HORIZON_DAYS[query.horizon],
      nextEvaluableDate,
      recommendedAction: this.recommendedAction(filteredSignals.length, evaluatedSignals, insufficientFuturePriceCount, missingPriceHistoryCount, dataQualityFilterSummary),
      warnings,
    };
  }

  private async countDelta(query: QualityQuery, override: Partial<QualityQuery>): Promise<number> {
    const withoutFilter = await this.signalService.signalHistoryCount({ ...query, ...override });
    const withFilter = await this.signalService.signalHistoryCount(query);
    return Math.max(0, withoutFilter - withFilter);
  }

  private recommendedAction(total: number, evaluated: number, insufficient: number, missing: number, dataQuality: DataQualityFilterSummary): string {
    if (total === 0 && dataQuality.filterApplied && dataQuality.excludedByDataQuality > 0) return '0 signals remain after data-quality filters. Reset filters or use a less restrictive readiness filter.';
    if (total === 0) return 'Run Signal Generation for the selected market scope, then return after price data exists.';
    if (evaluated > 0) return 'Review evaluated historical forward returns and keep market data current.';
    if (missing >= total) return 'Sync historical market data for these instruments before measuring outcomes.';
    if (insufficient > 0) return 'Try a shorter horizon such as 1D or 5D, sync latest market data, or wait until enough future trading days exist.';
    return 'Check whether signal dates, filters, and market scope match available price history.';
  }

  private diagnosticWarnings(total: number, evaluated: number, insufficient: number, missing: number, dataQuality: DataQualityFilterSummary): string[] {
    const warnings: string[] = [];
    if (total > 0 && evaluated === 0) warnings.push('No evaluated outcomes are available for the selected horizon.');
    if (insufficient > 0) warnings.push('Some signals do not yet have enough future trading rows for the selected horizon.');
    if (missing > 0) warnings.push('Some signals have no available price history in Market Data Foundation.');
    if (dataQuality.filterApplied && dataQuality.totalSignalsAfterFilter === 0) warnings.push('0 signals remain after data-quality filters.');
    return warnings;
  }

  private groupStatus(rawCount: number, evaluatedCount: number, missingPriceCount: number, horizon: QualityHorizon): QualityMetricGroup['status'] {
    if (rawCount === 0) return 'FILTERED_OUT';
    if (evaluatedCount === 0 && missingPriceCount >= rawCount) return 'MISSING_PRICE_DATA';
    if (evaluatedCount === 0) return 'INSUFFICIENT_FUTURE_DATA';
    if (evaluatedCount < 5 || evaluatedCount < HORIZON_DAYS[horizon]) return 'SMALL_SAMPLE';
    return 'EVALUATED';
  }

  private groupReason(rawCount: number, evaluatedCount: number, missingPriceCount: number, horizon: QualityHorizon): string | null {
    if (rawCount === 0) return 'Filtered out by the selected query.';
    if (evaluatedCount === 0 && missingPriceCount >= rawCount) return 'Missing price history for this group.';
    if (evaluatedCount === 0) return `No evaluated outcomes for the selected ${horizon} horizon.`;
    if (evaluatedCount < 5) return 'Small evaluated sample; interpret as historical measurement only.';
    return null;
  }

  private utcTradingDay(value: Date): Date {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private scoreBucket(score: number): string {
    return SCORE_BUCKETS.find((bucket) => score >= bucket.min && score <= bucket.max)?.label || 'UNKNOWN';
  }

  private noise(signal: Pick<SignalOutcomeSet, 'instrumentId' | 'symbol' | 'researchUrl'> | SignalResultDto, issueType: string, severity: NoisySignalItem['severity'], description: string, evidence: Record<string, unknown>): NoisySignalItem {
    const instrumentId = 'instrumentId' in signal ? signal.instrumentId : signal.instrument_id;
    return { instrumentId, symbol: signal.symbol, issueType, severity, description, evidence, researchUrl: `/research/stocks/${instrumentId}` };
  }

  private average(values: number[]): number | null {
    return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  private median(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private metricSort(a: QualityMetricGroup, b: QualityMetricGroup) {
    return (b.averageForwardReturn ?? Number.NEGATIVE_INFINITY) - (a.averageForwardReturn ?? Number.NEGATIVE_INFINITY);
  }
}
