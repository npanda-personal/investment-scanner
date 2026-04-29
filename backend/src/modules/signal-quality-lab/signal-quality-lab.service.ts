import { MarketDataFoundationService } from '../market-data-foundation';
import { SignalGenerationEngineService, type SignalItem, type SignalResultDto } from '../signal-generation-engine';
import { HistoricalContextSnapshotsService } from '../historical-context-snapshots';
import { SignalQualityLabRepository } from './signal-quality-lab.repository';
import type {
  ForwardOutcome,
  NoisySignalItem,
  ParsedSignalType,
  PricePoint,
  QualityHorizon,
  QualityMetricGroup,
  QualityQuery,
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

export class SignalQualityLabService {
  constructor(
    _repository = new SignalQualityLabRepository(),
    private readonly signalService = new SignalGenerationEngineService(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly historicalContextService = new HistoricalContextSnapshotsService()
  ) {}

  async history(instrumentId: string, query: QualityQuery): Promise<SignalHistoryItem[]> {
    const signals = await this.signalService.signalHistory({ ...query, instrumentId });
    return signals.map((signal) => this.historyItem(signal));
  }

  async outcomes(instrumentId: string, query: QualityQuery): Promise<SignalOutcomeSet[]> {
    const signals = await this.signalService.signalHistory({ ...query, instrumentId });
    return this.outcomesForSignals(signals);
  }

  async summary(query: QualityQuery): Promise<QualitySummary> {
    const signals = await this.loadSignals(query);
    const outcomes = await this.outcomesForSignals(signals);
    const evaluated = outcomes.filter((item) => item.outcomes.some((outcome) => outcome.available));
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
    };
  }

  async byType(query: QualityQuery): Promise<SignalTypePerformance[]> {
    const signals = await this.loadSignals(query);
    return this.signalTypePerformance(signals, await this.outcomesForSignals(signals), query.horizon).filter((item) => item.sampleSize >= query.minSampleSize);
  }

  async bySector(query: QualityQuery): Promise<QualityMetricGroup[]> {
    return this.groupMetrics(await this.outcomesForSignals(await this.loadSignals(query)), query.horizon, (item) => item.sector || 'Unknown')
      .filter((item) => item.sampleSize >= query.minSampleSize);
  }

  async byScoreBucket(query: QualityQuery): Promise<QualityMetricGroup[]> {
    return this.groupMetrics(await this.outcomesForSignals(await this.loadSignals(query)), query.horizon, (item) => this.scoreBucket(item.score))
      .filter((item) => item.sampleSize >= query.minSampleSize);
  }

  async byRegime(query: QualityQuery): Promise<QualityMetricGroup[]> {
    const signals = await this.loadSignals(query);
    const outcomes = await this.outcomesForSignals(signals);
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
    return this.detectNoisySignals(signals, await this.outcomesForSignals(signals));
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
    return this.signalService.signalHistory(query);
  }

  async outcomesForSignals(signals: SignalResultDto[]): Promise<SignalOutcomeSet[]> {
    const cache = new Map<string, PricePoint[]>();
    const result: SignalOutcomeSet[] = [];
    for (const signal of signals) {
      let prices = cache.get(signal.instrument_id);
      if (!prices) {
        prices = await this.prices(signal.instrument_id);
        cache.set(signal.instrument_id, prices);
      }
      result.push(this.calculateOutcome(signal, prices));
    }
    return result;
  }

  calculateOutcome(signal: SignalResultDto, prices: PricePoint[]): SignalOutcomeSet {
    const generatedAt = new Date(signal.generated_at);
    const startIndex = prices.findIndex((price) => new Date(price.date).getTime() >= generatedAt.getTime());
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

  private async prices(instrumentId: string): Promise<PricePoint[]> {
    const response = await this.marketDataService.listPricesByInstrumentId(instrumentId, 6000);
    return (response?.prices || [])
      .map((price: any) => ({ date: new Date(price.date).toISOString(), adjustedClose: Number(price.adjusted_close ?? price.close) }))
      .filter((price) => Number.isFinite(price.adjustedClose))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
    return {
      group,
      horizon,
      sampleSize: returns.length,
      winRate: this.winRate(items, horizon),
      averageForwardReturn: this.average(returns),
      medianForwardReturn: this.median(returns),
      averageMaxDrawdown: this.average(items.map((item) => item.maxDrawdownPercent).filter((value): value is number => value !== null)),
      bestReturn: returns.length > 0 ? Math.max(...returns) : null,
      worstReturn: returns.length > 0 ? Math.min(...returns) : null,
      positiveCount: returns.filter((value) => value > 0).length,
      negativeCount: returns.filter((value) => value < 0).length,
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
