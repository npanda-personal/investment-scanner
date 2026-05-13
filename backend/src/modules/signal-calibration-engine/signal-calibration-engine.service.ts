import { HistoricalContextSnapshotsService } from '../historical-context-snapshots';
import { SignalGenerationEngineService, type SignalResultDto } from '../signal-generation-engine';
import { SignalQualityLabService, type NoisySignalItem, type QualityHorizon, type QualityMetricGroup, type SignalTypePerformance } from '../signal-quality-lab';
import { DataQualityEngineService, type DataQualityEvaluationDto } from '../data-quality-engine';
import { SignalCalibrationEngineRepository } from './signal-calibration-engine.repository';
import type {
  CalibrationAdjustment,
  CalibrationComparison,
  CalibrationContext,
  CalibrationDataStatus,
  CalibrationHealthResponse,
  CalibrationModelInfo,
  CalibrationQuery,
  CalibrationRunRequest,
  CalibrationRunResponse,
  CalibrationEvidenceStatus,
  CalibrationConfidenceLevel,
  CalibrationEvidence,
  CalibrationReadiness,
  SignalCalibrationResultDto,
  SignalLikeForCalibration,
  PaginatedCalibrationResponse,
} from './signal-calibration-engine.types';

const MODEL_VERSION = 'signal-calibration-v2';
const SUPPORTED_HORIZONS: QualityHorizon[] = ['1D', '5D', '10D', '20D', '60D'];
const DEFAULT_HORIZON: QualityHorizon = '20D';

const MIN_OVERALL_SAMPLES = 50;
const MIN_GROUP_SAMPLES = 20;

const THRESHOLDS = {
  HIGH: { overall: 200, group: 50 },
  MEDIUM: { overall: 100, group: 30 },
  LOW: { overall: MIN_OVERALL_SAMPLES, group: MIN_GROUP_SAMPLES },
};

const CAPS = {
  HIGH: 10,
  MEDIUM: 6,
  LOW: 3,
  INSUFFICIENT_SAMPLE: 1,
};

const TOTAL_DELTA_CAP = 25;
const RUN_CONCURRENCY = 4;

type BatchQualityMetrics = {
  byType: SignalTypePerformance[];
  byScore: QualityMetricGroup[];
  bySector: QualityMetricGroup[];
  noisy: NoisySignalItem[];
  signalTypeMetrics: Map<string, { winRate: number | null; averageForwardReturn: number | null; sampleSize: number }>;
  scoreBucketMetrics: Map<string, QualityMetricGroup>;
  sectorMetrics: Map<string, QualityMetricGroup>;
  noisyIssueTypesByInstrumentId: Map<string, string[]>;
};

type BatchLookupCache = {
  qualityMetrics: BatchQualityMetrics;
  dataQualityEvaluationsByInstrumentId?: Map<string, DataQualityEvaluationDto>;
  historicalContextLookups: Map<string, Promise<any | null>>;
  skipHistoricalContext?: boolean;
};

type CalibrationRunItemOutcome =
  | { type: 'calibrated'; result: SignalCalibrationResultDto }
  | { type: 'skipped'; warning: string }
  | { type: 'failed'; error: string };

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
    if (existing) {
      const summary = await this.qualityService.summary({ horizon: DEFAULT_HORIZON, limit: 1, minSampleSize: 0 }).catch(() => null);
      return this.withEvidenceFromSummary(existing, DEFAULT_HORIZON, summary);
    }
    const raw = await this.signalService.latestForInstrument(instrumentId);
    return raw ? this.calibrateAndPersist(raw) : null;
  }

  async latestPersistedForInstrument(instrumentId: string): Promise<SignalCalibrationResultDto | null> {
    const existing = await this.repository.latestForInstrument(instrumentId);
    return existing ? this.withEvidenceFromSummary(existing, DEFAULT_HORIZON, null) : null;
  }

  async latestPersistedForInstruments(instrumentIds: string[]): Promise<SignalCalibrationResultDto[]> {
    const repositoryAny = this.repository as any;
    const existing = typeof repositoryAny.latestForInstruments === 'function'
      ? await repositoryAny.latestForInstruments(instrumentIds).catch(() => [])
      : [];
    return (existing as SignalCalibrationResultDto[]).map((item) => this.withEvidenceFromSummary(item, DEFAULT_HORIZON, null));
  }

  async compare(instrumentId: string, region?: string, assetType?: string, horizonInput?: string): Promise<CalibrationComparison | null> {
    const raw = await this.signalService.latestForInstrument(instrumentId);
    if (!raw) return null;
    const horizon = this.parseHorizon(horizonInput);
    const summary = await this.qualityService.summary({ horizon, limit: 1, minSampleSize: 0, region, assetType, sector: raw.sector || undefined, country: raw.country || undefined }).catch(() => null);
    const stock = await this.repository.instrumentInScope(instrumentId, region, assetType);
    if (!stock && region && region !== 'GLOBAL') {
      return null;
    }

    const calibratedSignal = await this.calibrateAndPersist(raw, horizon, summary, { region, assetType });
    if (stock) {
      calibratedSignal.region = stock.region ?? null;
      calibratedSignal.exchange = stock.exchange ?? null;
      calibratedSignal.assetType = stock.assetType ?? null;
    }

    return { rawSignal: raw, calibratedSignal };
  }

  async run(request: CalibrationRunRequest): Promise<CalibrationRunResponse> {
    const started = Date.now();
    const generatedAt = new Date().toISOString();
    const errors: string[] = [];
    const warnings: string[] = [];
    const totalCount = await this.resolveTotalCount(request);
    const batchSize = request.instrumentId || request.symbol ? 1 : this.clampInt(request.batchSize ?? request.limit, 25, 1, 100);
    const offset = request.instrumentId || request.symbol ? 0 : this.clampInt(request.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const signals = await this.resolveSignals({ ...request, batchSize, offset });
    const results: SignalCalibrationResultDto[] = [];
    
    let outOfScopeSkipped = 0;
    const horizon = (request.horizon as QualityHorizon) || DEFAULT_HORIZON;
    const summaryQuery = { horizon, limit: 1, minSampleSize: 0, sector: request.sector, country: request.country, region: request.region, assetType: request.assetType };
    const qualityWarning = 'Signal Quality diagnostics unavailable; using raw score because calibration evidence is missing.';
    const globalSummary = await this.qualityService.summary(summaryQuery).catch(() => null);
    const skipCalibrationEvidenceWork = this.shouldSkipCalibrationEvidenceWork(globalSummary, horizon);
    const batchQualityMetrics = skipCalibrationEvidenceWork ? this.emptyQualityMetrics() : await this.batchQualityMetrics(summaryQuery);
    const batchLookupCache: BatchLookupCache = {
      qualityMetrics: batchQualityMetrics,
      dataQualityEvaluationsByInstrumentId: await this.batchDataQualityEvaluations(signals),
      historicalContextLookups: new Map(),
      skipHistoricalContext: skipCalibrationEvidenceWork,
    };

    const outcomes = await this.mapWithConcurrency(signals, this.runConcurrency(signals.length, request), async (signal): Promise<CalibrationRunItemOutcome> => {
      try {
        if (await this.outsideRequestedScope(signal.instrument_id, request)) {
          return {
            type: 'skipped',
            warning: `${signal.instrument_id}: outside requested market scope (${request.region} / ${request.assetType || 'ALL'}).`,
          };
        }
        const calibrated = await this.calibrateAndPersist(signal, horizon, globalSummary, { region: request.region, assetType: request.assetType }, batchLookupCache);
        if (!globalSummary) {
          calibrated.dataGaps.push(qualityWarning);
          calibrated.calibrationEvidence?.evidenceWarnings.push(qualityWarning);
        }
        return { type: 'calibrated', result: calibrated };
      } catch (error: any) {
        return { type: 'failed', error: `${signal.instrument_id}: ${error?.message || 'calibration failed'}` };
      }
    });

    for (const outcome of outcomes) {
      if (outcome.type === 'calibrated') {
        results.push(outcome.result);
      } else if (outcome.type === 'skipped') {
        outOfScopeSkipped += 1;
        warnings.push(outcome.warning);
      } else {
        errors.push(outcome.error);
      }
    }
    
    const processedCount = signals.length;
    const nextOffset = offset + processedCount;
    const passthroughCount = results.filter((result) => !result.calibrationApplied).length;
    const skipped = Math.max(0, signals.length - results.length - errors.length);
    const runEvidence = this.runEvidenceFromSummary(horizon, globalSummary, results);
    const runReadiness = this.aggregateReadiness(results, horizon, runEvidence, Boolean(globalSummary));
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
      selectedHorizon: horizon,
      calibrationEvidence: runEvidence,
      calibrationReadiness: runReadiness,
      calibratedCount: results.filter((result) => result.calibrationApplied).length,
      passthroughCount,
      skippedCount: skipped,
      failedCount: errors.length,
      outOfScopeSkipped,
      warnings: [...(globalSummary ? [] : [qualityWarning]), ...warnings, ...errors],
      durationMs: Date.now() - started,
    };
  }

  async top(query: CalibrationQuery): Promise<PaginatedCalibrationResponse> {
    const page = await this.repository.top(query);
    const horizon = this.parseHorizon(query.horizon);
    const summary = await this.qualityService.summary({
      horizon,
      limit: 1,
      minSampleSize: 0,
      region: query.region,
      assetType: query.assetType,
      sector: query.sector,
      country: query.country,
    }).catch(() => null);
    return {
      ...page,
      items: page.items.map((item) => this.withEvidenceFromSummary(item, horizon, summary)),
    };
  }

  async health(): Promise<CalibrationHealthResponse> {
    const count = await this.repository.count();
    const hasPersistedRows = count.total > 0;
    const dataStatus: CalibrationDataStatus = hasPersistedRows ? 'PARTIAL' : 'MISSING';
    const evidenceReason = hasPersistedRows
      ? 'Existing persisted calibration rows do not store readiness evidence; refresh calibration to attach source evidence.'
      : 'No calibrated signal results persisted yet.';
    return {
      status: 'ok',
      module: 'signal-calibration-engine',
      calibrationModelVersion: MODEL_VERSION,
      calibratedSignals: count.total,
      latestGeneratedAt: count.latestGeneratedAt?.toISOString() ?? null,
      dataStatus,
      gaps: hasPersistedRows ? [] : [evidenceReason],
      calibrationEvidence: this.healthCalibrationEvidence({
        dataStatus,
        evidenceStatus: hasPersistedRows ? 'MISSING' : 'INSUFFICIENT',
        reason: evidenceReason,
      }),
      calibrationReadiness: hasPersistedRows
        ? this.missingPersistedReadiness(evidenceReason)
        : this.noScoreReadiness(evidenceReason),
    };
  }

  model(): CalibrationModelInfo {
    return {
      calibrationModelVersion: MODEL_VERSION,
      qualityMetricWindow: DEFAULT_HORIZON,
      supportedHorizons: SUPPORTED_HORIZONS,
      defaultHorizon: DEFAULT_HORIZON,
      minSampleSize: MIN_OVERALL_SAMPLES, // for backwards compat
      minOverallSamples: MIN_OVERALL_SAMPLES,
      minGroupSamples: MIN_GROUP_SAMPLES,
      perAdjustmentDeltaCap: CAPS.HIGH,
      totalDeltaCap: TOTAL_DELTA_CAP,
      confidenceThresholds: THRESHOLDS,
      adjustmentCaps: CAPS,
      rules: [
        'Signal types with sufficient positive historical outcomes receive boosts; weak types receive penalties.',
        'Score buckets and sectors with poor historical performance are penalized; strong buckets and sectors are boosted.',
        'Regime, sector leadership, smart-money, data-quality, and noise context apply bounded explainable adjustments.',
        'Raw signal scores are never overwritten; calibrated results are persisted separately.',
      ],
      sampleSafetyRules: [
        'Each group must meet minimum sample size; fallback to broader group or skip if insufficient.',
        'Maximum adjustment delta is capped dynamically based on overall calibration confidence.',
        'If horizon has 0 evaluated samples, calibration is conservative or passthrough.',
      ],
      calibrationReadinessRules: [
        'USABLE evidence allows normal downstream influence and calibrated score authority.',
        'LIMITED evidence caps downstream influence and exposes low-sample reasons.',
        'UNAVAILABLE or missing evidence sets downstream influence to NONE and preserves raw score authority.',
        'Existing persisted rows without derived source evidence fail conservative until refreshed.',
      ],
      fallbackBehavior: 'When samples are missing or extremely low, a zero or tiny +/-1 adjustment is applied to preserve raw score.',
      safeLanguageRules: [
        'Use "calibration evidence", "sample confidence", "historical measurement", "insufficient sample".',
        'Avoid forecast certainty, urgency, and direct financial advice language.'
      ],
    };
  }

  calibrate(signal: SignalLikeForCalibration, context: CalibrationContext): SignalCalibrationResultDto {
    const boosts: CalibrationAdjustment[] = [];
    const penalties: CalibrationAdjustment[] = [];
    const reasons: string[] = [];
    const evidenceWarnings: string[] = [];
    
    let overallEvaluatedSamples = context.evaluationDiagnostics?.evaluatedSignals ?? 0;
    const evaluatedForHorizon = context.horizonAvailability?.[context.horizon]?.evaluated ?? overallEvaluatedSamples;
    
    // In case evaluationDiagnostics wasn't provided or is 0, attempt to infer from score bucket if available
    if (overallEvaluatedSamples === 0 && context.scoreBucketMetric) {
      overallEvaluatedSamples = context.scoreBucketMetric.sampleSize;
    }

    let evidenceStatus: CalibrationEvidenceStatus = 'SUFFICIENT';
    if (!context.evaluationDiagnostics && !context.horizonAvailability) evidenceStatus = 'MISSING';
    else if (evaluatedForHorizon === 0) evidenceStatus = 'INSUFFICIENT';
    else if (overallEvaluatedSamples < MIN_OVERALL_SAMPLES) evidenceStatus = 'INSUFFICIENT';
    else if (overallEvaluatedSamples < THRESHOLDS.MEDIUM.overall) evidenceStatus = 'LOW_SAMPLE';

    let baseConfidence: CalibrationConfidenceLevel = 'LOW';
    if (overallEvaluatedSamples >= THRESHOLDS.HIGH.overall) baseConfidence = 'HIGH';
    else if (overallEvaluatedSamples >= THRESHOLDS.MEDIUM.overall) baseConfidence = 'MEDIUM';
    else if (overallEvaluatedSamples >= MIN_OVERALL_SAMPLES) baseConfidence = 'LOW';
    else baseConfidence = 'INSUFFICIENT_SAMPLE';

    if (evidenceStatus === 'MISSING') {
      baseConfidence = 'INSUFFICIENT_SAMPLE';
      evidenceWarnings.push('Using raw score because calibration evidence is missing.');
    } else if (evaluatedForHorizon === 0) {
      baseConfidence = 'INSUFFICIENT_SAMPLE';
      evidenceWarnings.push(`Using raw score because calibration evidence is insufficient. Calibration skipped because selected horizon ${context.horizon} has insufficient evaluated outcomes.`);
    } else if (evidenceStatus === 'LOW_SAMPLE' || evidenceStatus === 'INSUFFICIENT') {
      evidenceWarnings.push(`Horizon ${context.horizon} has ${overallEvaluatedSamples} evaluated samples overall. Calibration confidence is ${baseConfidence}.`);
    }

    let adjustmentCap = CAPS[baseConfidence] || CAPS.INSUFFICIENT_SAMPLE;

    const add = (adjustment: CalibrationAdjustment, groupSampleSize?: number) => {
      if (baseConfidence === 'INSUFFICIENT_SAMPLE') {
        reasons.push(`Skipped ${adjustment.type} adjustment because selected horizon has insufficient evaluated outcomes.`);
        return;
      }
      if (groupSampleSize !== undefined && groupSampleSize < MIN_GROUP_SAMPLES) {
        reasons.push(`Skipped ${adjustment.type} adjustment due to low group sample (${groupSampleSize} < ${MIN_GROUP_SAMPLES}).`);
        return;
      }
      
      const boundedDelta = Math.sign(adjustment.delta) * Math.min(Math.abs(adjustment.delta), adjustmentCap);
      const bounded = { ...adjustment, delta: boundedDelta };
      
      if (bounded.delta > 0) boosts.push(bounded);
      else if (bounded.delta < 0) penalties.push(bounded);
      
      reasons.push(bounded.label);
    };

    let groupEvaluatedSamples = 0;

    for (const item of signal.triggered_signals || []) {
      const metric = context.signalTypeMetrics.get(item.code);
      if (metric) groupEvaluatedSamples = Math.max(groupEvaluatedSamples, metric.sampleSize);
      
      if (!metric || metric.sampleSize < MIN_GROUP_SAMPLES) {
        context.dataGaps.push(`Low sample size for signal type ${item.code}.`);
        continue;
      }
      if ((metric.winRate ?? 0) >= 0.58 && (metric.averageForwardReturn ?? 0) > 0) add({ type: 'SIGNAL_TYPE', label: `${item.code} has favorable historical quality.`, delta: 4, evidence: metric }, metric.sampleSize);
      if ((metric.winRate ?? 1) <= 0.45 || (metric.averageForwardReturn ?? 0) < 0) add({ type: 'SIGNAL_TYPE', label: `${item.code} has weak historical quality.`, delta: -5, evidence: metric }, metric.sampleSize);
    }

    const sourceEvidenceStatus = this.finalEvidenceStatus(evidenceStatus, groupEvaluatedSamples);
    const sourceConfidenceTier = this.confidenceTier(overallEvaluatedSamples, groupEvaluatedSamples, evaluatedForHorizon, sourceEvidenceStatus);
    adjustmentCap = CAPS[sourceConfidenceTier] || CAPS.INSUFFICIENT_SAMPLE;

    this.metricAdjustment(context.scoreBucketMetric, 'SCORE_BUCKET', 'Raw score bucket', add);
    this.metricAdjustment(context.sectorMetric, 'SECTOR', 'Sector history', add);
    
    // For non-metric context, we don't strict-filter by MIN_GROUP_SAMPLES because they apply fixed heuristics 
    // unless baseConfidence is INSUFFICIENT, in which case they are capped strictly anyway.
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
    const finalEvidenceStatus = this.finalEvidenceStatus(evidenceStatus, groupEvaluatedSamples);
    const confidenceTier = this.confidenceTier(overallEvaluatedSamples, groupEvaluatedSamples, evaluatedForHorizon, finalEvidenceStatus);
    const calibratedConfidence = this.confidence(signal.confidence, confidenceTier, boosts, penalties, context);

    const calibrationApplied = boosts.length > 0 || penalties.length > 0;
    const sampleSizePenaltyApplied = confidenceTier === 'INSUFFICIENT_SAMPLE' || confidenceTier === 'LOW';
    const calibrationEvidence = this.calibrationEvidence({
      horizon: context.horizon,
      overallEvaluatedSamples,
      groupEvaluatedSamples,
      horizonAvailability: context.horizonAvailability || {},
      dataStatus: context.dataGaps.length > 0 ? 'PARTIAL' : 'COMPLETE',
      evidenceStatus: finalEvidenceStatus,
      evidenceReasons: reasons,
      evidenceWarnings,
    });
    const calibrationReadiness = this.calibrationReadiness({
      evidenceStatus: finalEvidenceStatus,
      confidenceTier,
      calibrationApplied,
      adjustmentCapApplied: adjustmentCap,
      rawScoreAvailable: Number.isFinite(signal.score),
      evaluatedForHorizon,
      overallEvaluatedSamples,
      groupEvaluatedSamples,
      evidenceWarnings,
      dataGaps: context.dataGaps,
    });

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
      
      calibrationApplied,
      adjustmentCapApplied: adjustmentCap,
      sampleSizePenaltyApplied,
      overallEvaluatedSamples,
      groupEvaluatedSamples,
      evidenceStatus: finalEvidenceStatus,
      confidenceTier,
      downstreamInfluence: calibrationReadiness.downstreamInfluence,
      authoritativeScore: calibrationReadiness.authoritativeScore,
      warningsCount: evidenceWarnings.length + context.dataGaps.length,
      calibrationEvidence,
      calibrationReadiness,
    };
  }

  private async calibrateAndPersist(
    signal: SignalResultDto,
    horizon: QualityHorizon = DEFAULT_HORIZON,
    globalSummary: any = null,
    scope: { region?: string; assetType?: string } = {},
    batchLookupCache?: BatchLookupCache
  ): Promise<SignalCalibrationResultDto> {
    return this.repository.create(this.calibrate(signal, await this.context(signal, horizon, globalSummary, scope, batchLookupCache)));
  }

  private async context(signal: SignalResultDto, horizon: QualityHorizon, globalSummary: any, scope: { region?: string; assetType?: string }, batchLookupCache?: BatchLookupCache): Promise<CalibrationContext> {
    const query = {
      horizon,
      limit: 1000,
      minSampleSize: 0,
      sector: signal.sector || undefined,
      country: signal.country || undefined,
      region: scope.region,
      assetType: scope.assetType,
    };
    const [qualityMetrics, lookup, dataQualityEvaluation] = await Promise.all([
      batchLookupCache?.qualityMetrics ? Promise.resolve(batchLookupCache.qualityMetrics) : this.qualityMetrics(query),
      this.historicalContextLookup(signal, batchLookupCache).catch(() => null),
      this.dataQualityEvaluation(signal.instrument_id, batchLookupCache).catch(() => null),
    ]);
    const bucket = this.scoreBucket(signal.score);
    return {
      signalTypeMetrics: qualityMetrics.signalTypeMetrics,
      scoreBucketMetric: qualityMetrics.scoreBucketMetrics.get(bucket) || null,
      sectorMetric: qualityMetrics.sectorMetrics.get(signal.sector || 'Unknown') || null,
      regime: lookup?.market?.regime ?? null,
      sectorLeadership: lookup?.sector?.leadershipStatus ?? null,
      smartMoneyStatus: lookup?.smartMoney?.status ?? null,
      dataQuality: lookup?.dataQuality ?? null,
      dataQualityEvaluation,
      noisyIssueTypes: qualityMetrics.noisyIssueTypesByInstrumentId.get(signal.instrument_id) || [],
      dataGaps: lookup?.gaps?.length ? [...lookup.gaps] : lookup ? [] : ['Historical context lookup unavailable.'],
      horizonAvailability: globalSummary?.horizonAvailability || null,
      evaluationDiagnostics: globalSummary?.evaluationDiagnostics || null,
      horizon,
    };
  }

  private async batchQualityMetrics(query: { horizon: QualityHorizon; limit: number; minSampleSize: number; sector?: string; country?: string; region?: string; assetType?: string }): Promise<BatchQualityMetrics> {
    const [byType, byScore, bySector, noisy] = await Promise.all([
      this.qualityService.byType(query).catch(() => []),
      this.qualityService.byScoreBucket(query).catch(() => []),
      this.qualityService.bySector(query).catch(() => []),
      this.qualityService.noisy({ ...query, limit: 5000 }).catch(() => []),
    ]);
    return this.prepareQualityMetrics(byType as SignalTypePerformance[], byScore as QualityMetricGroup[], bySector as QualityMetricGroup[], noisy as NoisySignalItem[]);
  }

  private async qualityMetrics(query: { horizon: QualityHorizon; limit: number; minSampleSize: number; sector?: string; country?: string; region?: string; assetType?: string }): Promise<BatchQualityMetrics> {
    const [byType, byScore, bySector, noisy] = await Promise.all([
      this.qualityService.byType(query).catch(() => []),
      this.qualityService.byScoreBucket(query).catch(() => []),
      this.qualityService.bySector(query).catch(() => []),
      this.qualityService.noisy({ ...query, limit: 250 }).catch(() => []),
    ]);
    return this.prepareQualityMetrics(byType as SignalTypePerformance[], byScore as QualityMetricGroup[], bySector as QualityMetricGroup[], noisy as NoisySignalItem[]);
  }

  private prepareQualityMetrics(
    byType: SignalTypePerformance[],
    byScore: QualityMetricGroup[],
    bySector: QualityMetricGroup[],
    noisy: NoisySignalItem[]
  ): BatchQualityMetrics {
    const signalTypeMetrics = new Map<string, { winRate: number | null; averageForwardReturn: number | null; sampleSize: number }>();
    for (const metric of byType) signalTypeMetrics.set(metric.signalType, metric);
    const scoreBucketMetrics = new Map(byScore.map((item) => [item.group, item]));
    const sectorMetrics = new Map(bySector.map((item) => [item.group, item]));
    const noisyIssueTypesByInstrumentId = new Map<string, string[]>();
    for (const item of noisy) {
      const existing = noisyIssueTypesByInstrumentId.get(item.instrumentId) || [];
      existing.push(item.issueType);
      noisyIssueTypesByInstrumentId.set(item.instrumentId, existing);
    }
    return { byType, byScore, bySector, noisy, signalTypeMetrics, scoreBucketMetrics, sectorMetrics, noisyIssueTypesByInstrumentId };
  }

  private emptyQualityMetrics(): BatchQualityMetrics {
    return this.prepareQualityMetrics([], [], [], []);
  }

  private shouldSkipCalibrationEvidenceWork(globalSummary: any, horizon: QualityHorizon): boolean {
    if (!globalSummary) return true;
    const evaluatedForHorizon = Number(globalSummary?.horizonAvailability?.[horizon]?.evaluated ?? globalSummary?.evaluationDiagnostics?.evaluatedSignals ?? 0);
    return !Number.isFinite(evaluatedForHorizon) || evaluatedForHorizon <= 0;
  }

  private async batchDataQualityEvaluations(signals: SignalResultDto[]): Promise<Map<string, DataQualityEvaluationDto> | undefined> {
    const instrumentIds = [...new Set(signals.map((signal) => signal.instrument_id).filter(Boolean))];
    const serviceAny = this.dataQualityService as any;
    if (instrumentIds.length === 0 || typeof serviceAny.getEvaluationsForInstruments !== 'function') return undefined;
    const evaluations = await serviceAny.getEvaluationsForInstruments(instrumentIds).catch(() => []);
    return new Map((evaluations as DataQualityEvaluationDto[]).map((evaluation) => [evaluation.instrumentId, evaluation]));
  }

  private async dataQualityEvaluation(instrumentId: string, batchLookupCache?: BatchLookupCache): Promise<DataQualityEvaluationDto | null> {
    if (batchLookupCache?.dataQualityEvaluationsByInstrumentId) {
      return batchLookupCache.dataQualityEvaluationsByInstrumentId.get(instrumentId) || null;
    }
    return this.dataQualityService.getLatestEvaluationForInstrument(instrumentId).catch(() => null);
  }

  private historicalContextLookup(signal: SignalResultDto, batchLookupCache?: BatchLookupCache): Promise<any | null> {
    if (batchLookupCache?.skipHistoricalContext) return Promise.resolve(null);
    const date = new Date(signal.generated_at);
    const filters = { instrumentId: signal.instrument_id, sector: signal.sector || undefined, country: signal.country || undefined };
    if (!batchLookupCache) return this.contextService.lookup(date, 7, filters).catch(() => null);

    const key = `${date.toISOString().slice(0, 10)}|${signal.instrument_id}|${signal.sector || ''}|${signal.country || ''}`;
    if (!batchLookupCache.historicalContextLookups.has(key)) {
      batchLookupCache.historicalContextLookups.set(key, this.contextService.lookup(date, 7, filters).catch(() => null));
    }
    return batchLookupCache.historicalContextLookups.get(key)!;
  }

  private withEvidenceFromSummary(item: SignalCalibrationResultDto, horizon: QualityHorizon, summary: any): SignalCalibrationResultDto {
    if (item.calibrationEvidence && item.calibrationReadiness) return item;
    const overallEvaluatedSamples = summary?.evaluationDiagnostics?.evaluatedSignals ?? 0;
    const evaluatedForHorizon = summary?.horizonAvailability?.[horizon]?.evaluated ?? overallEvaluatedSamples;
    const groupEvaluatedSamples = Math.max(
      0,
      ...[...item.boosts, ...item.penalties].map((adjustment) => Number((adjustment.evidence as any)?.sampleSize || 0))
    );
    const confidence = this.sampleConfidence(overallEvaluatedSamples, groupEvaluatedSamples, evaluatedForHorizon);
    const evidenceStatus = this.finalEvidenceStatus(this.evidenceStatusForSamples(overallEvaluatedSamples, evaluatedForHorizon, Boolean(summary)), groupEvaluatedSamples);
    const warnings = summary ? this.sampleWarnings(horizon, overallEvaluatedSamples, groupEvaluatedSamples, evaluatedForHorizon) : ['Signal Quality diagnostics unavailable for this scope.'];
    const calibrationApplied = evidenceStatus === 'SUFFICIENT' || evidenceStatus === 'LOW_SAMPLE' ? item.scoreDelta !== 0 : false;
    const calibrationEvidence = this.calibrationEvidence({
      horizon,
      overallEvaluatedSamples,
      groupEvaluatedSamples,
      horizonAvailability: summary?.horizonAvailability || {},
      dataStatus: summary?.dataStatus || 'MISSING',
      evidenceStatus,
      evidenceReasons: item.calibrationReasons,
      evidenceWarnings: warnings,
    });
    const calibrationReadiness = this.calibrationReadiness({
      evidenceStatus,
      confidenceTier: confidence,
      calibrationApplied,
      adjustmentCapApplied: CAPS[confidence],
      rawScoreAvailable: Number.isFinite(item.rawScore),
      evaluatedForHorizon,
      overallEvaluatedSamples,
      groupEvaluatedSamples,
      evidenceWarnings: warnings,
      dataGaps: item.dataGaps,
    });
    return {
      ...item,
      calibrationApplied,
      adjustmentCapApplied: CAPS[confidence],
      sampleSizePenaltyApplied: confidence === 'LOW' || confidence === 'INSUFFICIENT_SAMPLE',
      calibratedConfidence: confidence === 'INSUFFICIENT_SAMPLE' ? 'INSUFFICIENT_SAMPLE' : item.calibratedConfidence,
      overallEvaluatedSamples,
      groupEvaluatedSamples,
      evidenceStatus,
      confidenceTier: confidence,
      downstreamInfluence: calibrationReadiness.downstreamInfluence,
      authoritativeScore: calibrationReadiness.authoritativeScore,
      warningsCount: warnings.length + item.dataGaps.length,
      calibrationEvidence,
      calibrationReadiness,
    };
  }

  private calibrationEvidence(input: {
    horizon: QualityHorizon | string;
    overallEvaluatedSamples: number;
    groupEvaluatedSamples: number;
    horizonAvailability: Record<string, { eligible: number; evaluated: number; insufficientFuturePrice: number }>;
    dataStatus: string;
    evidenceStatus: CalibrationEvidenceStatus;
    evidenceReasons: string[];
    evidenceWarnings: string[];
  }): CalibrationEvidence {
    return {
      horizon: input.horizon,
      overallEvaluatedSamples: input.overallEvaluatedSamples,
      groupEvaluatedSamples: input.groupEvaluatedSamples,
      minimumOverallSamples: MIN_OVERALL_SAMPLES,
      minimumGroupSamples: MIN_GROUP_SAMPLES,
      requiredOverallSamples: MIN_OVERALL_SAMPLES,
      requiredGroupSamples: MIN_GROUP_SAMPLES,
      horizonAvailability: input.horizonAvailability,
      dataStatus: input.dataStatus,
      evidenceStatus: input.evidenceStatus,
      evidenceReasons: input.evidenceReasons,
      evidenceWarnings: input.evidenceWarnings,
      warnings: input.evidenceWarnings,
    };
  }

  private healthCalibrationEvidence(input: {
    dataStatus: CalibrationDataStatus;
    evidenceStatus: CalibrationEvidenceStatus;
    reason: string;
  }): CalibrationEvidence {
    return this.calibrationEvidence({
      horizon: DEFAULT_HORIZON,
      overallEvaluatedSamples: 0,
      groupEvaluatedSamples: 0,
      horizonAvailability: Object.fromEntries(SUPPORTED_HORIZONS.map((horizon) => [
        horizon,
        { eligible: 0, evaluated: 0, insufficientFuturePrice: 0 },
      ])),
      dataStatus: input.dataStatus,
      evidenceStatus: input.evidenceStatus,
      evidenceReasons: [input.reason],
      evidenceWarnings: [input.reason],
    });
  }

  private calibrationReadiness(input: {
    evidenceStatus: CalibrationEvidenceStatus;
    confidenceTier: CalibrationConfidenceLevel;
    calibrationApplied: boolean;
    adjustmentCapApplied: number;
    rawScoreAvailable: boolean;
    evaluatedForHorizon: number;
    overallEvaluatedSamples: number;
    groupEvaluatedSamples: number;
    evidenceWarnings: string[];
    dataGaps: string[];
  }): CalibrationReadiness {
    const blockers: string[] = [];
    const reasons: string[] = [];
    if (!input.rawScoreAvailable) blockers.push('Raw signal score is unavailable.');
    if (input.evidenceStatus === 'MISSING') blockers.push('Signal Quality evidence is missing.');
    if (input.evaluatedForHorizon === 0) blockers.push('Selected horizon has 0 evaluated outcome samples.');
    if (input.overallEvaluatedSamples < MIN_OVERALL_SAMPLES) blockers.push(`Overall evaluated samples ${input.overallEvaluatedSamples} are below required ${MIN_OVERALL_SAMPLES}.`);
    if (input.groupEvaluatedSamples > 0 && input.groupEvaluatedSamples < MIN_GROUP_SAMPLES) reasons.push(`Group evaluated samples ${input.groupEvaluatedSamples} are below preferred ${MIN_GROUP_SAMPLES}.`);
    reasons.push(...input.evidenceWarnings, ...input.dataGaps);

    if (!input.rawScoreAvailable) {
      return {
        status: 'UNAVAILABLE',
        confidenceTier: 'INSUFFICIENT_SAMPLE',
        calibrationApplied: false,
        adjustmentCapApplied: 0,
        downstreamInfluence: 'NONE',
        authoritativeScore: 'NO_SCORE',
        reasons: [...new Set(reasons)],
        blockers: [...new Set(blockers)],
      };
    }

    if (input.evidenceStatus === 'MISSING' || input.evidenceStatus === 'INSUFFICIENT' || input.confidenceTier === 'INSUFFICIENT_SAMPLE' || input.evaluatedForHorizon === 0) {
      return {
        status: 'UNAVAILABLE',
        confidenceTier: 'INSUFFICIENT_SAMPLE',
        calibrationApplied: false,
        adjustmentCapApplied: input.adjustmentCapApplied,
        downstreamInfluence: 'NONE',
        authoritativeScore: 'RAW_SCORE',
        reasons: [...new Set(reasons)],
        blockers: [...new Set(blockers)],
      };
    }

    if (input.evidenceStatus === 'LOW_SAMPLE' || input.confidenceTier === 'LOW') {
      return {
        status: 'LIMITED',
        confidenceTier: input.confidenceTier,
        calibrationApplied: input.calibrationApplied,
        adjustmentCapApplied: input.adjustmentCapApplied,
        downstreamInfluence: 'LIMITED',
        authoritativeScore: input.calibrationApplied ? 'CALIBRATED_SCORE' : 'RAW_SCORE',
        reasons: [...new Set(reasons)],
        blockers: [...new Set(blockers)],
      };
    }

    return {
      status: 'USABLE',
      confidenceTier: input.confidenceTier,
      calibrationApplied: input.calibrationApplied,
      adjustmentCapApplied: input.adjustmentCapApplied,
      downstreamInfluence: 'NORMAL',
      authoritativeScore: 'CALIBRATED_SCORE',
      reasons: [...new Set(reasons)],
      blockers: [],
    };
  }

  private runEvidenceFromSummary(horizon: QualityHorizon, summary: any, results: SignalCalibrationResultDto[]): CalibrationEvidence | null {
    const firstEvidence = results.find((result) => result.calibrationEvidence)?.calibrationEvidence;
    if (firstEvidence) return firstEvidence;
    if (!summary) {
      return this.calibrationEvidence({
        horizon,
        overallEvaluatedSamples: 0,
        groupEvaluatedSamples: 0,
        horizonAvailability: {},
        dataStatus: 'MISSING',
        evidenceStatus: 'MISSING',
        evidenceReasons: [],
        evidenceWarnings: ['Signal Quality diagnostics unavailable for this scope.'],
      });
    }
    const overallEvaluatedSamples = summary.evaluationDiagnostics?.evaluatedSignals ?? 0;
    const evaluatedForHorizon = summary.horizonAvailability?.[horizon]?.evaluated ?? overallEvaluatedSamples;
    return this.calibrationEvidence({
      horizon,
      overallEvaluatedSamples,
      groupEvaluatedSamples: Math.max(0, ...results.map((result) => result.groupEvaluatedSamples ?? 0)),
      horizonAvailability: summary.horizonAvailability || {},
      dataStatus: summary.dataStatus || 'MISSING',
      evidenceStatus: this.evidenceStatusForSamples(overallEvaluatedSamples, evaluatedForHorizon, true),
      evidenceReasons: [],
      evidenceWarnings: this.sampleWarnings(horizon, overallEvaluatedSamples, Math.max(0, ...results.map((result) => result.groupEvaluatedSamples ?? 0)), evaluatedForHorizon),
    });
  }

  private aggregateReadiness(results: SignalCalibrationResultDto[], horizon: QualityHorizon, evidence: CalibrationEvidence | null, hasSummary: boolean): CalibrationReadiness {
    if (results.length === 0) return this.noScoreReadiness(`No calibrated results were produced for ${horizon}.`);
    const resultReadiness = results.map((result) => result.calibrationReadiness).filter((item): item is CalibrationReadiness => Boolean(item));
    if (resultReadiness.some((item) => item.status === 'UNAVAILABLE')) {
      return this.calibrationReadiness({
        evidenceStatus: evidence?.evidenceStatus ?? (hasSummary ? 'INSUFFICIENT' : 'MISSING'),
        confidenceTier: 'INSUFFICIENT_SAMPLE',
        calibrationApplied: false,
        adjustmentCapApplied: CAPS.INSUFFICIENT_SAMPLE,
        rawScoreAvailable: true,
        evaluatedForHorizon: evidence?.horizonAvailability?.[horizon]?.evaluated ?? 0,
        overallEvaluatedSamples: evidence?.overallEvaluatedSamples ?? 0,
        groupEvaluatedSamples: evidence?.groupEvaluatedSamples ?? 0,
        evidenceWarnings: evidence?.warnings ?? [],
        dataGaps: ['At least one result has unavailable calibration evidence.'],
      });
    }
    if (resultReadiness.some((item) => item.status === 'LIMITED')) {
      return {
        ...resultReadiness.find((item) => item.status === 'LIMITED')!,
        status: 'LIMITED',
        downstreamInfluence: 'LIMITED',
      };
    }
    return resultReadiness[0] ?? this.noScoreReadiness(`No readiness evidence was attached for ${horizon}.`);
  }

  private noScoreReadiness(reason: string): CalibrationReadiness {
    return {
      status: 'UNAVAILABLE',
      confidenceTier: 'INSUFFICIENT_SAMPLE',
      calibrationApplied: false,
      adjustmentCapApplied: 0,
      downstreamInfluence: 'NONE',
      authoritativeScore: 'NO_SCORE',
      reasons: [reason],
      blockers: [reason],
    };
  }

  private missingPersistedReadiness(reason: string): CalibrationReadiness {
    return {
      status: 'UNAVAILABLE',
      confidenceTier: 'INSUFFICIENT_SAMPLE',
      calibrationApplied: false,
      adjustmentCapApplied: CAPS.INSUFFICIENT_SAMPLE,
      downstreamInfluence: 'NONE',
      authoritativeScore: 'RAW_SCORE',
      reasons: [reason],
      blockers: [reason],
    };
  }

  private sampleConfidence(overall: number, group: number, evaluatedForHorizon: number): CalibrationConfidenceLevel {
    if (evaluatedForHorizon === 0 || overall < MIN_OVERALL_SAMPLES || group < MIN_GROUP_SAMPLES) return 'INSUFFICIENT_SAMPLE';
    if (overall >= THRESHOLDS.HIGH.overall && group >= THRESHOLDS.HIGH.group) return 'HIGH';
    if (overall >= THRESHOLDS.MEDIUM.overall && group >= THRESHOLDS.MEDIUM.group) return 'MEDIUM';
    return 'LOW';
  }

  private confidenceTier(overall: number, group: number, evaluatedForHorizon: number, evidenceStatus: CalibrationEvidenceStatus): CalibrationConfidenceLevel {
    if (evidenceStatus === 'MISSING' || evidenceStatus === 'INSUFFICIENT' || evaluatedForHorizon === 0 || overall < MIN_OVERALL_SAMPLES) return 'INSUFFICIENT_SAMPLE';
    if (overall >= THRESHOLDS.HIGH.overall && group >= THRESHOLDS.HIGH.group) return 'HIGH';
    if (overall >= THRESHOLDS.MEDIUM.overall && group >= THRESHOLDS.MEDIUM.group) return 'MEDIUM';
    return 'LOW';
  }

  private evidenceStatusForSamples(overall: number, evaluatedForHorizon: number, hasSummary: boolean): CalibrationEvidenceStatus {
    if (!hasSummary) return 'MISSING';
    if (evaluatedForHorizon === 0 || overall < MIN_OVERALL_SAMPLES) return 'INSUFFICIENT';
    if (overall < THRESHOLDS.MEDIUM.overall) return 'LOW_SAMPLE';
    return 'SUFFICIENT';
  }

  private finalEvidenceStatus(status: CalibrationEvidenceStatus, groupEvaluatedSamples: number): CalibrationEvidenceStatus {
    if (status === 'SUFFICIENT' && groupEvaluatedSamples > 0 && groupEvaluatedSamples < MIN_GROUP_SAMPLES) return 'LOW_SAMPLE';
    return status;
  }

  private sampleWarnings(horizon: QualityHorizon, overall: number, group: number, evaluatedForHorizon: number): string[] {
    if (evaluatedForHorizon === 0) return [`Calibration is limited for ${horizon} because 0 signals have enough future price data. Scores are not aggressively adjusted.`];
    if (overall < MIN_OVERALL_SAMPLES || group < MIN_GROUP_SAMPLES) {
      return [`${horizon} has ${overall} evaluated samples, below the recommended ${MIN_OVERALL_SAMPLES} overall / ${MIN_GROUP_SAMPLES} per group minimum. Calibration confidence is low.`];
    }
    if (overall < THRESHOLDS.MEDIUM.overall) return [`${horizon} sample evidence is limited; score adjustments are capped conservatively.`];
    return [];
  }

  private parseHorizon(value: unknown): QualityHorizon {
    return SUPPORTED_HORIZONS.includes(value as QualityHorizon) ? value as QualityHorizon : DEFAULT_HORIZON;
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
      region: request.region,
      assetType: request.assetType,
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
      region: request.region,
      assetType: request.assetType,
    });
  }

  private runConcurrency(signalCount: number, request: CalibrationRunRequest): number {
    if (request.instrumentId || request.symbol || signalCount <= 1) return 1;
    return Math.min(RUN_CONCURRENCY, signalCount);
  }

  private async mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
    if (items.length === 0) return [];
    const results = new Array<R>(items.length);
    let nextIndex = 0;
    const workerCount = Math.max(1, Math.min(limit, items.length));

    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(items[index], index);
      }
    }));

    return results;
  }

  private async outsideRequestedScope(instrumentId: string, request: CalibrationRunRequest): Promise<boolean> {
    if (!request.region || request.region === 'GLOBAL') return false;
    if (!request.instrumentId && !request.symbol) return false;
    const stock = await this.repository.instrumentInScope(instrumentId, request.region, request.assetType);
    return !stock;
  }

  private metricAdjustment(metric: { winRate: number | null; averageForwardReturn: number | null; sampleSize: number } | null, type: CalibrationAdjustment['type'], label: string, add: (adjustment: CalibrationAdjustment, groupSize?: number) => void) {
    if (!metric) return;
    if ((metric.winRate ?? 0) >= 0.6 && (metric.averageForwardReturn ?? 0) > 0) add({ type, label: `${label} has favorable measured outcomes.`, delta: 3, evidence: metric }, metric.sampleSize);
    if ((metric.winRate ?? 1) <= 0.45 || (metric.averageForwardReturn ?? 0) < 0) add({ type, label: `${label} has weak measured outcomes.`, delta: -4, evidence: metric }, metric.sampleSize);
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

  private confidence(raw: SignalCalibrationResultDto['rawConfidence'], baseConfidence: CalibrationConfidenceLevel, boosts: CalibrationAdjustment[], penalties: CalibrationAdjustment[], context: CalibrationContext): SignalCalibrationResultDto['calibratedConfidence'] {
    if (baseConfidence === 'INSUFFICIENT_SAMPLE') return 'INSUFFICIENT_SAMPLE';
    
    const evidence = boosts.length - penalties.length;
    if (context.dataGaps.length > 2 || context.noisyIssueTypes.length > 0 || penalties.some((item) => item.delta <= -6)) return 'LOW';
    if (raw === 'HIGH' && evidence >= 2 && penalties.length === 0 && baseConfidence === 'HIGH') return 'HIGH';
    if (raw !== 'LOW' && evidence >= 0 && baseConfidence !== 'LOW') return 'MEDIUM';
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
