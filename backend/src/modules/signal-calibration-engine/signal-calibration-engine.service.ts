import { HistoricalContextSnapshotsService } from '../historical-context-snapshots';
import { SignalGenerationEngineService, type SignalResultDto } from '../signal-generation-engine';
import { SignalQualityLabService, type QualityHorizon, type QualityMetricGroup, type SignalTypePerformance } from '../signal-quality-lab';
import { DataQualityEngineService } from '../data-quality-engine';
import { SignalCalibrationEngineRepository } from './signal-calibration-engine.repository';
import type {
  CalibrationAdjustment,
  CalibrationComparison,
  CalibrationContext,
  CalibrationModelInfo,
  CalibrationQuery,
  CalibrationRunRequest,
  CalibrationRunResponse,
  SignalCalibrationResultDto,
  SignalLikeForCalibration,
} from './signal-calibration-engine.types';

const MODEL_VERSION = 'signal-calibration-v1';
const QUALITY_HORIZON: QualityHorizon = '20D';
const MIN_SAMPLE_SIZE = 5;
const PER_ADJUSTMENT_CAP = 10;
const TOTAL_DELTA_CAP = 25;

export class SignalCalibrationEngineService {
  constructor(
    private readonly repository = new SignalCalibrationEngineRepository(),
    private readonly signalService = new SignalGenerationEngineService(),
    private readonly qualityService = new SignalQualityLabService(),
    private readonly contextService = new HistoricalContextSnapshotsService(),
    private readonly dataQualityService = new DataQualityEngineService()
  ) {}

  async latestForInstrument(instrumentId: string): Promise<SignalCalibrationResultDto | null> {
    const existing = await this.repository.latestForInstrument(instrumentId);
    if (existing) return existing;
    const raw = await this.signalService.latestForInstrument(instrumentId);
    return raw ? this.calibrateAndPersist(raw) : null;
  }

  async compare(instrumentId: string): Promise<CalibrationComparison | null> {
    const raw = await this.signalService.latestForInstrument(instrumentId);
    if (!raw) return null;
    return { rawSignal: raw, calibratedSignal: await this.calibrateAndPersist(raw) };
  }

  async run(request: CalibrationRunRequest): Promise<CalibrationRunResponse> {
    const started = Date.now();
    const generatedAt = new Date().toISOString();
    const errors: string[] = [];
    const totalCount = await this.resolveTotalCount(request);
    const batchSize = request.instrumentId || request.symbol ? 1 : this.clampInt(request.batchSize ?? request.limit, 25, 1, 100);
    const offset = request.instrumentId || request.symbol ? 0 : this.clampInt(request.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const signals = await this.resolveSignals({ ...request, batchSize, offset });
    const results: SignalCalibrationResultDto[] = [];
    for (const signal of signals) {
      try {
        results.push(await this.calibrateAndPersist(signal));
      } catch (error: any) {
        errors.push(`${signal.instrument_id}: ${error?.message || 'calibration failed'}`);
      }
    }
    const processedCount = signals.length;
    const nextOffset = offset + processedCount;
    const skipped = Math.max(0, signals.length - results.length - errors.length);
    return {
      generated: results.length,
      skipped,
      errors,
      results,
      generatedAt,
      processedCount,
      totalCount,
      batchSize,
      offset,
      nextOffset: nextOffset < totalCount ? nextOffset : null,
      hasMore: nextOffset < totalCount,
      calibratedCount: results.length,
      skippedCount: skipped,
      failedCount: errors.length,
      warnings: errors,
      durationMs: Date.now() - started,
    };
  }

  top(query: CalibrationQuery): Promise<SignalCalibrationResultDto[]> {
    return this.repository.top(query);
  }

  async health() {
    const count = await this.repository.count();
    return {
      status: 'ok',
      module: 'signal-calibration-engine',
      calibrationModelVersion: MODEL_VERSION,
      calibratedSignals: count.total,
      latestGeneratedAt: count.latestGeneratedAt?.toISOString() ?? null,
      dataStatus: count.total > 0 ? 'PARTIAL' : 'MISSING',
      gaps: count.total === 0 ? ['No calibrated signal results persisted yet.'] : [],
    };
  }

  model(): CalibrationModelInfo {
    return {
      calibrationModelVersion: MODEL_VERSION,
      qualityMetricWindow: QUALITY_HORIZON,
      minSampleSize: MIN_SAMPLE_SIZE,
      perAdjustmentDeltaCap: PER_ADJUSTMENT_CAP,
      totalDeltaCap: TOTAL_DELTA_CAP,
      rules: [
        'Signal types with sufficient positive historical outcomes receive boosts; weak types receive penalties.',
        'Score buckets and sectors with poor historical performance are penalized; strong buckets and sectors are boosted.',
        'Regime, sector leadership, smart-money, data-quality, and noise context apply bounded explainable adjustments.',
        'Raw signal scores are never overwritten; calibrated results are persisted separately.',
      ],
    };
  }

  calibrate(signal: SignalLikeForCalibration, context: CalibrationContext): SignalCalibrationResultDto {
    const boosts: CalibrationAdjustment[] = [];
    const penalties: CalibrationAdjustment[] = [];
    const reasons: string[] = [];
    const add = (adjustment: CalibrationAdjustment) => {
      const bounded = { ...adjustment, delta: this.clamp(adjustment.delta, -PER_ADJUSTMENT_CAP, PER_ADJUSTMENT_CAP) };
      if (bounded.delta >= 0) boosts.push(bounded);
      else penalties.push(bounded);
      reasons.push(bounded.label);
    };

    for (const item of signal.triggered_signals || []) {
      const metric = context.signalTypeMetrics.get(item.code);
      if (!metric || metric.sampleSize < MIN_SAMPLE_SIZE) {
        context.dataGaps.push(`Low sample size for signal type ${item.code}.`);
        continue;
      }
      if ((metric.winRate ?? 0) >= 0.58 && (metric.averageForwardReturn ?? 0) > 0) add({ type: 'SIGNAL_TYPE', label: `${item.code} has favorable historical quality.`, delta: 4, evidence: metric });
      if ((metric.winRate ?? 1) <= 0.45 || (metric.averageForwardReturn ?? 0) < 0) add({ type: 'SIGNAL_TYPE', label: `${item.code} has weak historical quality.`, delta: -5, evidence: metric });
    }

    this.metricAdjustment(context.scoreBucketMetric, 'SCORE_BUCKET', 'Raw score bucket', add);
    this.metricAdjustment(context.sectorMetric, 'SECTOR', 'Sector history', add);
    this.regimeAdjustment(signal, context.regime, add, context.dataGaps);
    this.sectorLeadershipAdjustment(signal, context.sectorLeadership, add, context.dataGaps);
    this.smartMoneyAdjustment(signal, context.smartMoneyStatus, add, context.dataGaps);
    this.dataQualityAdjustment(signal, context.dataQuality, add, context.dataGaps);
    this.persistedDataQualityAdjustment(context.dataQualityEvaluation || null, add, context.dataGaps);
    for (const issue of context.noisyIssueTypes) add({ type: 'NOISE', label: `Noise flag detected: ${issue}.`, delta: issue.includes('FAILED') ? -6 : -3, evidence: { issue } });

    const rawDelta = [...boosts, ...penalties].reduce((sum, adjustment) => sum + adjustment.delta, 0);
    const scoreDelta = Math.round(this.clamp(rawDelta, -TOTAL_DELTA_CAP, TOTAL_DELTA_CAP));
    const calibratedScore = this.clamp(Math.round(signal.score + scoreDelta), 0, 100);
    const calibratedDirection = this.directionForScore(calibratedScore);
    const calibratedConfidence = this.confidence(signal.confidence, boosts, penalties, context);
    return {
      signalResultId: signal.id || '',
      instrumentId: signal.instrument_id,
      symbol: signal.symbol,
      companyName: signal.company_name,
      sector: signal.sector,
      country: signal.country,
      rawScore: signal.score,
      calibratedScore,
      scoreDelta,
      rawDirection: signal.direction,
      calibratedDirection,
      rawConfidence: signal.confidence,
      calibratedConfidence,
      boosts,
      penalties,
      calibrationReasons: reasons,
      dataGaps: [...new Set(context.dataGaps)],
      calibrationModelVersion: MODEL_VERSION,
      rawSignalModelVersion: signal.modelVersion || null,
      generatedAt: new Date().toISOString(),
      dataStatus: context.dataGaps.length > 0 ? 'PARTIAL' : 'COMPLETE',
      dataQuality: context.dataQualityEvaluation ? {
        coverageScore: context.dataQualityEvaluation.coverageScore,
        coverageStatus: context.dataQualityEvaluation.coverageStatus,
        signalReadinessScore: context.dataQualityEvaluation.signalReadinessScore,
        signalReadinessStatus: context.dataQualityEvaluation.signalReadinessStatus,
        liquidityScore: context.dataQualityEvaluation.liquidityScore,
        liquidityStatus: context.dataQualityEvaluation.liquidityStatus,
        eligibleForSignals: context.dataQualityEvaluation.eligibleForSignals,
        eligibleForCalibration: context.dataQualityEvaluation.eligibleForCalibration,
        warnings: context.dataQualityEvaluation.warnings,
        readinessBlockers: context.dataQualityEvaluation.readinessBlockers,
      } : null,
      researchUrl: `/research/stocks/${signal.instrument_id}`,
    };
  }

  private async calibrateAndPersist(signal: SignalResultDto): Promise<SignalCalibrationResultDto> {
    return this.repository.create(this.calibrate(signal, await this.context(signal)));
  }

  private async context(signal: SignalResultDto): Promise<CalibrationContext> {
    const query = { horizon: QUALITY_HORIZON, limit: 1000, minSampleSize: 0, sector: signal.sector || undefined, country: signal.country || undefined };
    const [byType, byScore, bySector, noisy, lookup, dataQualityEvaluation] = await Promise.all([
      this.qualityService.byType(query).catch(() => []),
      this.qualityService.byScoreBucket(query).catch(() => []),
      this.qualityService.bySector(query).catch(() => []),
      this.qualityService.noisy({ ...query, limit: 250 }).catch(() => []),
      this.contextService.lookup(new Date(signal.generated_at), 7, { instrumentId: signal.instrument_id, sector: signal.sector || undefined, country: signal.country || undefined }).catch(() => null),
      this.dataQualityService.getLatestEvaluationForInstrument(signal.instrument_id).catch(() => null),
    ]);
    const typeMetrics = new Map<string, { winRate: number | null; averageForwardReturn: number | null; sampleSize: number }>();
    for (const metric of byType as SignalTypePerformance[]) typeMetrics.set(metric.signalType, metric);
    const bucket = this.scoreBucket(signal.score);
    return {
      signalTypeMetrics: typeMetrics,
      scoreBucketMetric: (byScore as QualityMetricGroup[]).find((item) => item.group === bucket) || null,
      sectorMetric: (bySector as QualityMetricGroup[]).find((item) => item.group === (signal.sector || 'Unknown')) || null,
      regime: lookup?.market?.regime ?? null,
      sectorLeadership: lookup?.sector?.leadershipStatus ?? null,
      smartMoneyStatus: lookup?.smartMoney?.status ?? null,
      dataQuality: lookup?.dataQuality ?? null,
      dataQualityEvaluation,
      noisyIssueTypes: (noisy || []).filter((item) => item.instrumentId === signal.instrument_id).map((item) => item.issueType),
      dataGaps: lookup?.gaps?.length ? [...lookup.gaps] : lookup ? [] : ['Historical context lookup unavailable.'],
    };
  }

  private async resolveSignals(request: CalibrationRunRequest): Promise<SignalResultDto[]> {
    if (request.instrumentId) {
      const signal = await this.signalService.latestForInstrument(request.instrumentId);
      return signal ? [signal] : [];
    }
    if (request.symbol) {
      const run = await this.signalService.run({ symbol: request.symbol, limit: 1 });
      return run.results;
    }
    return this.signalService.latestSignalUniverse({
      direction: request.direction,
      sector: request.sector,
      country: request.country,
      limit: request.batchSize || request.limit || 25,
      offset: request.offset || 0,
    });
  }

  private async resolveTotalCount(request: CalibrationRunRequest): Promise<number> {
    if (request.instrumentId || request.symbol) return 1;
    return this.signalService.latestSignalUniverseCount({
      direction: request.direction,
      sector: request.sector,
      country: request.country,
    });
  }

  private metricAdjustment(metric: { winRate: number | null; averageForwardReturn: number | null; sampleSize: number } | null, type: CalibrationAdjustment['type'], label: string, add: (adjustment: CalibrationAdjustment) => void) {
    if (!metric || metric.sampleSize < MIN_SAMPLE_SIZE) return;
    if ((metric.winRate ?? 0) >= 0.6 && (metric.averageForwardReturn ?? 0) > 0) add({ type, label: `${label} has favorable measured outcomes.`, delta: 3, evidence: metric });
    if ((metric.winRate ?? 1) <= 0.45 || (metric.averageForwardReturn ?? 0) < 0) add({ type, label: `${label} has weak measured outcomes.`, delta: -4, evidence: metric });
  }

  private regimeAdjustment(signal: SignalLikeForCalibration, regime: string | null, add: (adjustment: CalibrationAdjustment) => void, gaps: string[]): void {
    if (!regime) {
      gaps.push('Missing regime context.');
      return;
    }
    if (signal.direction === 'BULLISH' && regime === 'RISK_ON') add({ type: 'REGIME', label: 'Bullish signal aligns with risk-on regime.', delta: 3 });
    if (signal.direction === 'BULLISH' && regime === 'RISK_OFF') add({ type: 'REGIME', label: 'Bullish signal conflicts with risk-off regime.', delta: -5 });
    if (signal.direction === 'BEARISH' && regime === 'RISK_OFF') add({ type: 'REGIME', label: 'Bearish signal aligns with risk-off regime.', delta: 3 });
    if (signal.direction === 'BEARISH' && regime === 'RISK_ON') add({ type: 'REGIME', label: 'Bearish signal conflicts with risk-on regime.', delta: -4 });
  }

  private sectorLeadershipAdjustment(signal: SignalLikeForCalibration, leadership: string | null, add: (adjustment: CalibrationAdjustment) => void, gaps: string[]): void {
    if (!leadership) {
      gaps.push('Missing sector leadership context.');
      return;
    }
    if (signal.direction === 'BULLISH' && ['LEADING', 'IMPROVING'].includes(leadership)) add({ type: 'SECTOR', label: `Bullish signal aligns with ${leadership.toLowerCase()} sector context.`, delta: 3 });
    if (signal.direction === 'BULLISH' && ['LAGGING', 'WEAKENING'].includes(leadership)) add({ type: 'SECTOR', label: `Bullish signal conflicts with ${leadership.toLowerCase()} sector context.`, delta: -4 });
    if (signal.direction === 'BEARISH' && leadership === 'LAGGING') add({ type: 'SECTOR', label: 'Bearish signal aligns with lagging sector context.', delta: 3 });
  }

  private smartMoneyAdjustment(signal: SignalLikeForCalibration, status: string | null, add: (adjustment: CalibrationAdjustment) => void, gaps: string[]): void {
    if (!status || status === 'INSUFFICIENT_DATA') {
      gaps.push('Missing or insufficient smart-money context.');
      return;
    }
    if (signal.direction === 'BULLISH' && status === 'ACCUMULATION') add({ type: 'SMART_MONEY', label: 'Smart-money accumulation supports bullish signal.', delta: 4 });
    if (signal.direction === 'BULLISH' && status === 'DISTRIBUTION') add({ type: 'SMART_MONEY', label: 'Smart-money distribution conflicts with bullish signal.', delta: -6 });
    if (signal.direction === 'BEARISH' && status === 'DISTRIBUTION') add({ type: 'SMART_MONEY', label: 'Smart-money distribution supports bearish signal.', delta: 4 });
    if (signal.direction === 'BEARISH' && status === 'ACCUMULATION') add({ type: 'SMART_MONEY', label: 'Smart-money accumulation conflicts with bearish signal.', delta: -5 });
  }

  private dataQualityAdjustment(signal: SignalLikeForCalibration, dataQuality: any, add: (adjustment: CalibrationAdjustment) => void, gaps: string[]): void {
    if (!dataQuality) {
      gaps.push('Missing data-quality snapshot.');
      return;
    }
    if (!dataQuality.hasLatestPrice) add({ type: 'DATA_QUALITY', label: 'Missing latest price lowers calibration confidence.', delta: -5 });
    if ((dataQuality.priceHistoryDays ?? 0) < 200) add({ type: 'DATA_QUALITY', label: 'Insufficient price history for robust calibration.', delta: -4 });
    const usesFundamentals = [...signal.triggered_signals, ...signal.negative_signals].some((item) => item.category === 'FUNDAMENTAL');
    if (usesFundamentals && !dataQuality.hasFundamentals) add({ type: 'DATA_QUALITY', label: 'Fundamental signal exists but fundamentals are missing.', delta: -4 });
  }

  private persistedDataQualityAdjustment(dataQuality: CalibrationContext['dataQualityEvaluation'], add: (adjustment: CalibrationAdjustment) => void, gaps: string[]): void {
    if (!dataQuality) {
      gaps.push('Missing latest Data Quality Engine evaluation.');
      return;
    }
    if (dataQuality.coverageStatus === 'UNUSABLE') add({ type: 'DATA_QUALITY', label: 'Data quality coverage is unusable.', delta: -10, evidence: dataQuality as any });
    else if (dataQuality.coverageStatus === 'POOR') add({ type: 'DATA_QUALITY', label: 'Data quality coverage is poor.', delta: -6, evidence: dataQuality as any });
    if (dataQuality.signalReadinessStatus === 'NOT_READY') add({ type: 'DATA_QUALITY', label: 'Signal readiness is not ready.', delta: -10, evidence: dataQuality as any });
    else if (dataQuality.signalReadinessStatus === 'LIMITED') add({ type: 'DATA_QUALITY', label: 'Signal readiness is limited.', delta: -4, evidence: dataQuality as any });
    if (dataQuality.liquidityStatus === 'ILLIQUID') add({ type: 'DATA_QUALITY', label: 'Liquidity quality is illiquid.', delta: -6, evidence: dataQuality as any });
    else if (dataQuality.liquidityStatus === 'UNKNOWN') add({ type: 'DATA_QUALITY', label: 'Liquidity quality is unknown.', delta: -3, evidence: dataQuality as any });
  }

  private confidence(raw: SignalCalibrationResultDto['rawConfidence'], boosts: CalibrationAdjustment[], penalties: CalibrationAdjustment[], context: CalibrationContext): SignalCalibrationResultDto['calibratedConfidence'] {
    const evidence = boosts.length - penalties.length;
    if (context.dataGaps.length > 2 || context.noisyIssueTypes.length > 0 || penalties.some((item) => item.delta <= -6)) return 'LOW';
    if (raw === 'HIGH' && evidence >= 2 && penalties.length === 0) return 'HIGH';
    if (raw !== 'LOW' && evidence >= 0) return 'MEDIUM';
    return 'LOW';
  }

  private directionForScore(score: number): SignalCalibrationResultDto['calibratedDirection'] {
    if (score >= 70) return 'BULLISH';
    if (score >= 40) return 'NEUTRAL';
    return 'BEARISH';
  }

  private scoreBucket(score: number): string {
    if (score < 40) return '0-39';
    if (score < 70) return '40-69';
    if (score < 85) return '70-84';
    return '85-100';
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private clampInt(value: unknown, fallback: number, min: number, max: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(numeric)));
  }
}
