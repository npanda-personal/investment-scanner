import { HistoricalContextSnapshotsService } from '../historical-context-snapshots';
import {
  SignalGenerationEngineService,
  type SignalResultDto,
} from '../signal-generation-engine';
import { SignalQualityLabService, type QualityHorizon } from '../signal-quality-lab';
import { DataQualityEngineService, type DataQualityEvaluationDto, type InstrumentEligibilityRow } from '../data-quality-engine';
import { SignalCalibrationEngineRepository } from './signal-calibration-engine.repository';
import {
  type CalibrationPolicy,
  type CalibrationScope,
  resolveCalibrationPolicy,
} from './signal-calibration-engine.config';
import { CalibrationEvidenceBuilder } from './signal-calibration-engine.evidence';
import { CalibrationScorer } from './signal-calibration-engine.scorer';
import { CalibrationMetricsProvider } from './signal-calibration-engine.metrics';
import { clampInt, mapWithConcurrency } from './signal-calibration-engine.util';
import type {
  BatchQualityMetrics,
  CalibrationComparison,
  CalibrationContext,
  CalibrationDataStatus,
  CalibrationHealthResponse,
  CalibrationModelInfo,
  CalibrationQuery,
  CalibrationRunRequest,
  CalibrationRunResponse,
  PaginatedCalibrationResponse,
  QualitySummary,
  SignalCalibrationResultDto,
  SignalLikeForCalibration,
} from './signal-calibration-engine.types';

/**
 * A scope-resolved bundle of calibration collaborators sharing one policy.
 * Built once per request scope so a batch run / page reuses the same policy.
 */
interface CalibrationEngine {
  policy: CalibrationPolicy;
  evidence: CalibrationEvidenceBuilder;
  scorer: CalibrationScorer;
  metrics: CalibrationMetricsProvider;
}

type BatchLookupCache = {
  qualityMetrics: BatchQualityMetrics;
  dataQualityEvaluationsByInstrumentId?: Map<string, DataQualityEvaluationDto>;
  eligibilityRowsByInstrumentId?: Map<string, InstrumentEligibilityRow>;
  historicalContextLookups: Map<string, Promise<any | null>>;
  skipHistoricalContext?: boolean;
};

type CalibrationRunItemOutcome =
  | { type: 'calibrated'; result: SignalCalibrationResultDto }
  | { type: 'skipped'; warning: string }
  | { type: 'failed'; error: string };

/**
 * Orchestrates calibration: resolves the per-scope {@link CalibrationPolicy},
 * gathers context (quality metrics, historical context, data-quality), delegates
 * scoring to {@link CalibrationScorer}, and persists via the repository. All
 * tunables live in the policy; this class only wires collaborators together.
 */
export class SignalCalibrationEngineService {
  /** Default-scope engine bundle (also backs the public `calibrate`/`model`). */
  private readonly defaultEngine: CalibrationEngine;

  constructor(
    private readonly repository = new SignalCalibrationEngineRepository(),
    private readonly signalService = new SignalGenerationEngineService(),
    private readonly qualityService = new SignalQualityLabService(),
    private readonly contextService = new HistoricalContextSnapshotsService(),
    private readonly dataQualityService = new DataQualityEngineService(),
    private readonly policyResolver: (scope: CalibrationScope) => CalibrationPolicy = resolveCalibrationPolicy
  ) {
    this.defaultEngine = this.buildEngine(this.policyResolver({}));
  }

  // ── Reads (persisted-only; no calibrateAndPersist on a GET) ─────────────────

  async latestForInstrument(instrumentId: string): Promise<SignalCalibrationResultDto | null> {
    return this.latestPersistedForInstrument(instrumentId);
  }

  async latestPersistedForInstrument(instrumentId: string): Promise<SignalCalibrationResultDto | null> {
    const existing = await this.repository.latestForInstrument(instrumentId, this.modelVersion);
    return existing ? this.defaultEngine.evidence.withEvidenceFromSummary(existing, this.defaultHorizon, null) : null;
  }

  async latestPersistedForInstruments(instrumentIds: string[]): Promise<SignalCalibrationResultDto[]> {
    const existing = await this.repository.latestForInstruments(instrumentIds, this.modelVersion).catch(() => []);
    return existing.map((item) => this.defaultEngine.evidence.withEvidenceFromSummary(item, this.defaultHorizon, null));
  }

  async compare(instrumentId: string, region?: string, assetType?: string, horizonInput?: string): Promise<CalibrationComparison | null> {
    // Persisted-read only. Honors region/assetType (scope gate) and horizon (evidence derivation).
    const horizon = this.defaultEngine.evidence.parseHorizon(horizonInput);
    if (region && region !== 'GLOBAL') {
      const inScope = await this.repository.instrumentInScope(instrumentId, region, assetType);
      if (!inScope) return null;
    }
    const [raw, persisted] = await Promise.all([
      this.signalService.latestForInstrument(instrumentId),
      this.repository.latestForInstrument(instrumentId, this.modelVersion),
    ]);
    if (!raw || !persisted) return null;
    const calibratedSignal = this.defaultEngine.evidence.withEvidenceFromSummary(persisted, horizon, null);
    return { rawSignal: raw, calibratedSignal };
  }

  // ── Calibration run (POST) ──────────────────────────────────────────────────

  async run(request: CalibrationRunRequest): Promise<CalibrationRunResponse> {
    const started = Date.now();
    const generatedAt = new Date().toISOString();
    const errors: string[] = [];
    const warnings: string[] = [];
    const engine = this.engineFor({ region: request.region, assetType: request.assetType });

    const explicitInstrumentIds = request.instrumentIds
      ? [...new Set(request.instrumentIds.map((id) => String(id || '').trim()).filter(Boolean))]
      : [];
    const totalCount = await this.resolveTotalCount(request);
    const batchSize = request.instrumentId || request.symbol
      ? 1
      : explicitInstrumentIds.length || clampInt(request.batchSize ?? request.limit, 25, 1, 100);
    const offset = request.instrumentId || request.symbol || explicitInstrumentIds.length ? 0 : clampInt(request.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const signals = await this.resolveSignals({ ...request, batchSize, offset });
    const resolvedExplicitIds = new Set(signals.map((signal) => String(signal.instrument_id || '').trim()).filter(Boolean));
    const missingExplicitSignalCount = explicitInstrumentIds.length
      ? Math.max(0, explicitInstrumentIds.length - resolvedExplicitIds.size)
      : 0;
    const results: SignalCalibrationResultDto[] = [];

    let outOfScopeSkipped = 0;
    const horizon = engine.evidence.parseHorizon(request.horizon);
    const summaryQuery = { horizon, limit: 1, minSampleSize: 0, sector: request.sector, country: request.country, region: request.region, assetType: request.assetType };
    const qualityWarning = 'Signal Quality diagnostics unavailable; using raw score because calibration evidence is missing.';
    const globalSummary = await this.qualityService.summary(summaryQuery).catch(() => null) as QualitySummary | null;
    const skipOnDemandEvidenceWork = engine.metrics.shouldSkipCalibrationEvidenceWork(globalSummary, horizon);
    // Even when the on-demand summary lacks evaluated outcomes, the persisted path may
    // have sufficient mature rows — try it before falling back to empty metrics.
    const resolvedBatchMetrics = skipOnDemandEvidenceWork
      ? await engine.metrics.tryPersistedMetrics(horizon) ?? engine.metrics.emptyQualityMetrics()
      : await engine.metrics.batchQualityMetrics(summaryQuery);
    // When persisted metrics drove the batch, synthesize a minimal summary so calibrate()
    // sees non-zero evaluatedForHorizon and does not short-circuit to passthrough mode.
    const syntheticSummary = (resolvedBatchMetrics.metricsSource === 'PERSISTED_OUTCOMES')
      ? engine.metrics.syntheticSummaryFromPersistedMetrics(horizon, resolvedBatchMetrics, globalSummary)
      : null;
    const effectiveSummary = syntheticSummary ?? globalSummary;
    // Skip historical context lookups only when both on-demand AND persisted paths produce empty metrics.
    const skipCalibrationEvidenceWork = resolvedBatchMetrics.metricsSource === 'ON_DEMAND'
      && resolvedBatchMetrics.byType.length === 0
      && resolvedBatchMetrics.byScore.length === 0
      && resolvedBatchMetrics.bySector.length === 0
      && skipOnDemandEvidenceWork;
    const [batchDqeEvaluations, batchEligibilityRows] = await Promise.all([
      this.batchDataQualityEvaluations(signals),
      this.batchEligibilityRows(signals),
    ]);
    const batchLookupCache: BatchLookupCache = {
      qualityMetrics: resolvedBatchMetrics,
      dataQualityEvaluationsByInstrumentId: batchDqeEvaluations,
      eligibilityRowsByInstrumentId: batchEligibilityRows,
      historicalContextLookups: new Map(),
      skipHistoricalContext: skipCalibrationEvidenceWork,
    };

    const outcomes = await mapWithConcurrency(signals, this.runConcurrency(signals.length, request, engine.policy), async (signal): Promise<CalibrationRunItemOutcome> => {
      try {
        if (await this.outsideRequestedScope(signal.instrument_id, request)) {
          return {
            type: 'skipped',
            warning: `${signal.instrument_id}: outside requested market scope (${request.region} / ${request.assetType || 'ALL'}).`,
          };
        }
        const calibrated = await this.calibrateAndPersist(signal, engine, horizon, effectiveSummary, { region: request.region, assetType: request.assetType }, batchLookupCache);
        if (!effectiveSummary) {
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
    const nextOffset = explicitInstrumentIds.length ? totalCount : offset + processedCount;
    const hasMore = explicitInstrumentIds.length ? false : nextOffset < totalCount;
    const passthroughCount = results.filter((result) => !result.calibrationApplied).length;
    if (missingExplicitSignalCount > 0) {
      warnings.push(`${missingExplicitSignalCount} requested instruments did not have persisted raw signals for calibration.`);
    }
    const skipped = Math.max(0, signals.length - results.length - errors.length) + missingExplicitSignalCount;
    const runEvidence = engine.evidence.runEvidenceFromSummary(horizon, effectiveSummary, results);
    const runReadiness = engine.evidence.aggregateReadiness(results, horizon, runEvidence, Boolean(effectiveSummary));
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
      nextOffset: hasMore ? nextOffset : null,
      hasMore,
      selectedHorizon: horizon,
      calibrationEvidence: runEvidence,
      calibrationReadiness: runReadiness,
      calibratedCount: results.filter((result) => result.calibrationApplied).length,
      passthroughCount,
      skippedCount: skipped,
      failedCount: errors.length,
      outOfScopeSkipped,
      warnings: [...(effectiveSummary ? [] : [qualityWarning]), ...warnings, ...errors],
      durationMs: Date.now() - started,
    };
  }

  // ── Top / list ──────────────────────────────────────────────────────────────

  async top(query: CalibrationQuery): Promise<PaginatedCalibrationResponse> {
    const engine = this.engineFor({ region: query.region, assetType: query.assetType });
    const horizon = engine.evidence.parseHorizon(query.horizon);
    const summary = await this.scopedSummary(engine, horizon, query);

    // §1e: evidenceStatus is derived at read time (not persisted), so when the
    // client filters by it we enrich the full scoped set, filter, then paginate
    // in-service to keep counts honest.
    if (query.evidenceStatus) {
      return this.topFilteredByEvidenceStatus(engine, query, horizon, summary);
    }

    const page = await this.repository.top({ ...query, calibrationModelVersion: engine.policy.calibrationModelVersion });
    const items = page.items.map((item) => engine.evidence.withEvidenceFromSummary(item, horizon, summary));
    return {
      ...page,
      items,
      pageSummary: engine.evidence.pageSummary(query, horizon, summary, items, page.totalCount),
    };
  }

  private async topFilteredByEvidenceStatus(
    engine: CalibrationEngine,
    query: CalibrationQuery,
    horizon: QualityHorizon,
    summary: QualitySummary | null
  ): Promise<PaginatedCalibrationResponse> {
    const full = await this.repository.top({
      ...query,
      calibrationModelVersion: engine.policy.calibrationModelVersion,
      limit: Number.MAX_SAFE_INTEGER,
      offset: 0,
    });
    const enriched = full.items
      .map((item) => engine.evidence.withEvidenceFromSummary(item, horizon, summary))
      .filter((item) => item.evidenceStatus === query.evidenceStatus);
    const limit = query.limit || 25;
    const offset = query.offset || 0;
    const items = enriched.slice(offset, offset + limit);
    return {
      items,
      totalCount: enriched.length,
      limit,
      offset,
      hasMore: offset + limit < enriched.length,
      sortBy: full.sortBy,
      sortDirection: full.sortDirection,
      pageSummary: engine.evidence.pageSummary(query, horizon, summary, items, enriched.length),
    };
  }

  /**
   * Scoped quality summary for reads. Mirrors run(): when the on-demand summary
   * has no evaluated outcomes for the horizon, fall back to persisted outcomes so
   * a read agrees with what a fresh run would produce for the same scope.
   */
  private async scopedSummary(engine: CalibrationEngine, horizon: QualityHorizon, query: CalibrationQuery): Promise<QualitySummary | null> {
    let summary = await this.qualityService.summary(this.signalQualitySummaryQuery({
      horizon,
      region: query.region,
      assetType: query.assetType,
      sector: query.sector,
      country: query.country,
    })).catch(() => null) as QualitySummary | null;
    if (engine.metrics.shouldSkipCalibrationEvidenceWork(summary, horizon)) {
      const persisted = await engine.metrics.tryPersistedMetrics(horizon);
      if (persisted) summary = engine.metrics.syntheticSummaryFromPersistedMetrics(horizon, persisted, summary) ?? summary;
    }
    return summary;
  }

  // ── Health / model ────────────────────────────────────────────────────────

  async health(): Promise<CalibrationHealthResponse> {
    const evidence = this.defaultEngine.evidence;
    const count = await this.repository.count();
    const hasPersistedRows = count.total > 0;
    const dataStatus: CalibrationDataStatus = hasPersistedRows ? 'PARTIAL' : 'MISSING';
    const evidenceReason = hasPersistedRows
      ? 'Existing persisted calibration rows do not store readiness evidence; refresh calibration to attach source evidence.'
      : 'No calibrated signal results persisted yet.';
    return {
      status: 'ok',
      module: 'signal-calibration-engine',
      calibrationModelVersion: this.modelVersion,
      calibratedSignals: count.total,
      latestGeneratedAt: count.latestGeneratedAt?.toISOString() ?? null,
      dataStatus,
      gaps: hasPersistedRows ? [] : [evidenceReason],
      calibrationEvidence: evidence.healthCalibrationEvidence({
        dataStatus,
        evidenceStatus: hasPersistedRows ? 'MISSING' : 'INSUFFICIENT',
        reason: evidenceReason,
      }),
      calibrationReadiness: hasPersistedRows
        ? evidence.missingPersistedReadiness(evidenceReason)
        : evidence.noScoreReadiness(evidenceReason),
    };
  }

  model(): CalibrationModelInfo {
    const p = this.defaultEngine.policy;
    return {
      calibrationModelVersion: p.calibrationModelVersion,
      qualityMetricWindow: p.horizons.default,
      supportedHorizons: p.horizons.supported,
      defaultHorizon: p.horizons.default,
      minSampleSize: p.samples.minOverall, // for backwards compat
      minOverallSamples: p.samples.minOverall,
      minGroupSamples: p.samples.minGroup,
      perAdjustmentDeltaCap: p.adjustmentCaps.HIGH,
      totalDeltaCap: p.totalDeltaCap,
      confidenceThresholds: p.confidenceThresholds,
      adjustmentCaps: p.adjustmentCaps,
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

  /**
   * Public pure-calibration entry point (used by tests and other modules).
   * Uses the default-scope policy; the batch run path uses a scope-resolved one.
   */
  calibrate(signal: SignalLikeForCalibration, context: CalibrationContext): SignalCalibrationResultDto {
    return this.defaultEngine.scorer.calibrate(signal, context);
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  private get modelVersion(): string {
    return this.defaultEngine.policy.calibrationModelVersion;
  }

  private get defaultHorizon(): QualityHorizon {
    return this.defaultEngine.policy.horizons.default;
  }

  private buildEngine(policy: CalibrationPolicy): CalibrationEngine {
    const evidence = new CalibrationEvidenceBuilder(policy);
    return {
      policy,
      evidence,
      scorer: new CalibrationScorer(policy, evidence),
      metrics: new CalibrationMetricsProvider(this.qualityService, policy),
    };
  }

  /** Resolve (and reuse) the engine bundle for a request scope. */
  private engineFor(scope: CalibrationScope): CalibrationEngine {
    const policy = this.policyResolver(scope);
    return policy === this.defaultEngine.policy ? this.defaultEngine : this.buildEngine(policy);
  }

  private async calibrateAndPersist(
    signal: SignalResultDto,
    engine: CalibrationEngine,
    horizon: QualityHorizon,
    globalSummary: QualitySummary | null,
    scope: { region?: string; assetType?: string },
    batchLookupCache?: BatchLookupCache
  ): Promise<SignalCalibrationResultDto> {
    return this.repository.create(engine.scorer.calibrate(signal, await this.context(signal, engine, horizon, globalSummary, scope, batchLookupCache)));
  }

  private async context(
    signal: SignalResultDto,
    engine: CalibrationEngine,
    horizon: QualityHorizon,
    globalSummary: QualitySummary | null,
    scope: { region?: string; assetType?: string },
    batchLookupCache?: BatchLookupCache
  ): Promise<CalibrationContext> {
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
      batchLookupCache?.qualityMetrics ? Promise.resolve(batchLookupCache.qualityMetrics) : engine.metrics.qualityMetrics(query),
      this.historicalContextLookup(signal, batchLookupCache).catch(() => null),
      this.dataQualityEvaluation(signal.instrument_id, batchLookupCache).catch(() => null),
    ]);
    const bucket = engine.scorer.scoreBucket(signal.score);
    const eligibilityFacts = batchLookupCache?.eligibilityRowsByInstrumentId
      ? (batchLookupCache.eligibilityRowsByInstrumentId.get(signal.instrument_id)?.facts ?? null)
      : null;
    return {
      signalTypeMetrics: qualityMetrics.signalTypeMetrics,
      scoreBucketMetric: qualityMetrics.scoreBucketMetrics.get(bucket) || null,
      sectorMetric: qualityMetrics.sectorMetrics.get(signal.sector || 'Unknown') || null,
      regime: lookup?.market?.regime ?? null,
      sectorLeadership: lookup?.sector?.leadershipStatus ?? null,
      smartMoneyStatus: lookup?.smartMoney?.status ?? null,
      dataQuality: lookup?.dataQuality ?? null,
      dataQualityEvaluation,
      eligibilityFacts,
      noisyIssueTypes: qualityMetrics.noisyIssueTypesByInstrumentId.get(signal.instrument_id) || [],
      dataGaps: lookup?.gaps?.length ? [...lookup.gaps] : lookup ? [] : ['Historical context lookup unavailable.'],
      horizonAvailability: globalSummary?.horizonAvailability || null,
      evaluationDiagnostics: globalSummary?.evaluationDiagnostics || null,
      signalQualityGeneratedAt: globalSummary?.generatedAt || null,
      horizon,
      metricsSource: qualityMetrics.metricsSource,
    };
  }

  private async batchDataQualityEvaluations(signals: SignalResultDto[]): Promise<Map<string, DataQualityEvaluationDto> | undefined> {
    const instrumentIds = [...new Set(signals.map((signal) => signal.instrument_id).filter(Boolean))];
    if (instrumentIds.length === 0) return undefined;
    const evaluations = await this.dataQualityService.getEvaluationsForInstruments(instrumentIds).catch(() => []);
    return new Map(evaluations.map((evaluation) => [evaluation.instrumentId, evaluation]));
  }

  private async batchEligibilityRows(signals: SignalResultDto[]): Promise<Map<string, InstrumentEligibilityRow> | undefined> {
    const instrumentIds = [...new Set(signals.map((signal) => signal.instrument_id).filter(Boolean))];
    if (instrumentIds.length === 0) return undefined;
    const rows = await this.dataQualityService.getEligibility(instrumentIds).catch(() => []);
    return new Map(rows.map((row) => [row.instrumentId, row]));
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

  private signalQualitySummaryQuery(input: {
    horizon: QualityHorizon;
    region?: string;
    assetType?: string;
    sector?: string;
    country?: string;
  }) {
    return {
      horizon: input.horizon,
      limit: 1,
      minSampleSize: 0,
      region: input.region,
      assetType: input.assetType,
      sector: input.sector,
      country: input.country,
    };
  }

  private async resolveSignals(request: CalibrationRunRequest): Promise<SignalResultDto[]> {
    if (request.instrumentId) {
      const signal = await this.signalService.latestForInstrument(request.instrumentId);
      return signal ? [signal] : [];
    }
    if (request.instrumentIds?.length) {
      const uniqueIds = [...new Set(request.instrumentIds.map((id) => String(id || '').trim()).filter(Boolean))];
      return this.signalService.latestPersistedForInstruments(uniqueIds);
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
    if (request.instrumentIds?.length) {
      return new Set(request.instrumentIds.map((id) => String(id || '').trim()).filter(Boolean)).size;
    }
    return this.signalService.latestSignalUniverseCount({
      direction: request.direction,
      sector: request.sector,
      country: request.country,
      region: request.region,
      assetType: request.assetType,
    });
  }

  private runConcurrency(signalCount: number, request: CalibrationRunRequest, policy: CalibrationPolicy): number {
    if (request.instrumentId || request.symbol || signalCount <= 1) return 1;
    return Math.min(policy.runConcurrency, signalCount);
  }

  /**
   * True when an instrument falls outside the requested market scope. Enforced
   * for any EXPLICIT request (single id, symbol, or instrumentIds[]); universe
   * runs are already region-filtered upstream so they short-circuit to false.
   */
  private async outsideRequestedScope(instrumentId: string, request: CalibrationRunRequest): Promise<boolean> {
    if (!request.region || request.region === 'GLOBAL') return false;
    const isExplicit = Boolean(request.instrumentId || request.symbol || request.instrumentIds?.length);
    if (!isExplicit) return false;
    const stock = await this.repository.instrumentInScope(instrumentId, request.region, request.assetType);
    return !stock;
  }
}
