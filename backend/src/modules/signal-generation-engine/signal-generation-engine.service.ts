import { MarketDataFoundationService } from '../market-data-foundation';
import { StockResearchWorkbenchService } from '../stock-research-workbench';
import { DataQualityEngineService } from '../data-quality-engine';
import type { FilterByVerdictResult } from '../data-quality-engine';
import {
  BREADTH_WEAK_THRESHOLD,
  BREADTH_VERY_WEAK_THRESHOLD,
} from '../market-context-intelligence/capital-posture.types';
import type {
  StrategyContext,
  StrategyDefinition,
  StrategyFrameworkContextEvaluation,
  StrategyPerformanceSummaryDto,
  StrategySignalOutput,
} from '../strategy-framework';
import { normalizeMarketRegion } from '../../shared/utils/market-scope';
import {
  DIRECTION_BULLISH_THRESHOLD,
  DIRECTION_BEARISH_THRESHOLD,
} from '../../shared/types/signal.types';
export { DIRECTION_BULLISH_THRESHOLD, DIRECTION_BEARISH_THRESHOLD };
import { SignalGenerationEngineRepository } from './signal-generation-engine.repository';
import type {
  PaginatedSignalResponse,
  ReliabilityTier,
  SignalConfidence,
  SignalDirection,
  SignalHistoryQuery,
  SignalItem,
  SignalPricePoint,
  SignalQuery,
  SignalResultDto,
  SignalRunRequest,
  SignalRunResponse,
  SignalBlockedStrategySummary,
  SignalStrategyMatchSummary,
  SignalDataQualityEligibility,
  SignalScoringInputSummary,
  SignalTriggerContractDto,
  SignalTriggerPriceEvidence,
  SignalTriggerType,
} from './signal-generation-engine.types';
import {
  classifyLifecycle,
  DEFAULT_LIFECYCLE_THRESHOLDS,
} from './signal-lifecycle';
import {
  signal_generation_engine_batch_size,
  signal_generation_engine_max_workers_count,
  signal_generation_engine_provider_throttle_ms,
  signal_generation_engine_workers_count,
} from './signal-generation-engine.config';

const TECHNICAL_WEIGHT = 0.4;
const MOMENTUM_WEIGHT = 0.35;
const FUNDAMENTAL_WEIGHT = 0.25;
const MODEL_VERSION = 'signal-engine-v3';

// ── Regime Gate Toggle ────────────────────────────────────────────────────────
//
// When true, bearish/short signals are gated by the current market regime:
//   - RISK_ON  → tradable bearish_trigger suppressed → forced to risk_warning
//   - RISK_OFF / contextualShortsOnly → bearish_trigger preserved (F&O eligible names only)
//   - null gate (no persisted snapshot) → no gating; signal passes through unchanged
//
// Empirical motivation: 5D short win-rate was 3.6 %/13 % during the 2024–25 bull run
// but 86 %/90 % in the late-2025 weak tape.  Set to false to disable entirely.
const REGIME_GATE_SHORTS_ENABLED = true;
const SIGNAL_GENERATION_PRICE_WINDOW = 520;

// Momentum thresholds — minimum return required to vote bullish/bearish.
// Returns in-between produce NO momentum signal (neutral band).
const MOMENTUM_BULL_THRESHOLD_1M = 0.02;  // +2% for 1-month
const MOMENTUM_BEAR_THRESHOLD_1M = -0.03; // -3% for 1-month
const MOMENTUM_BULL_THRESHOLD_3M = 0.05;  // +5% for 3-month
const MOMENTUM_BEAR_THRESHOLD_3M = -0.07; // -7% for 3-month

// ── v3 Conviction-Gradient Scoring Constants ─────────────────────────────────
//
// CATEGORY_SCORE_ALPHA: Laplace add-smoothing for per-category Bayesian fraction.
//   alpha=1 (reduced from v2's alpha=2) lets a category move further from 0.5 when
//   real evidence is present while still damping thin-evidence setups.
//   Formula: (positive + alpha*0.5) / (total + alpha)
//   Examples (alpha=1): 1/0 → 0.75, 5/0 → 0.917, 0/5 → 0.083
const CATEGORY_SCORE_ALPHA = 1;

// SPREAD_GAIN: Amplifier applied after evidence scaling so a fully aligned,
//   maxed-out setup lands in the 88-95 range and a maxed bearish lands 5-12.
//   Tuned analytically: with all 15 signals aligned (tech6/mom5/fund4) the
//   max rawLean ≈ 0.917; displacement ≈ 0.417; evidenceFactor → 1.0;
//   score ≈ 50 + 0.417 * 100 * 1.8 * 1.0 ≈ 50 + 75 = 125 → clamped to 100.
//   In practice top realistic setup (tech4/mom3/fund2) lands ≈ 88-92.
const SCORE_SPREAD_GAIN = 1.8;

// EVIDENCE_SATURATION_COUNT: Number of total confirming (same-direction) signals
//   at which the count component of evidenceFactor saturates (diminishing returns).
//   At this count, count contribution reaches ~0.865 (1 - 1/e^2).
const EVIDENCE_SATURATION_COUNT = 7;

// EVIDENCE_AGREEMENT_WEIGHT / EVIDENCE_COUNT_WEIGHT: How much of evidenceFactor
//   comes from cross-category agreement vs raw count.
//   Chosen so thin single-signal stays ~55/45 and strong multi-category setups
//   get amplified by the agreement bonus.
const EVIDENCE_AGREEMENT_WEIGHT = 0.45;
const EVIDENCE_COUNT_WEIGHT = 0.55;

// EVIDENCE_MIXED_FLOOR: Minimum cross-category agreement contribution when categories
//   conflict (e.g. one strongly bullish, one bearish).
//   Set to 0 so genuinely-conflicting setups (one category strongly bullish, one
//   strongly bearish) are allowed to compress toward 50 (NEUTRAL) rather than being
//   artificially held up at ~0.4.  True conflict should yield NEUTRAL, not a
//   watered-down directional signal.
const EVIDENCE_MIXED_FLOOR = 0;

// FUNDAMENTAL_PUBLIC_LAG_DAYS: Conservative filing-date lag for NSE results.
// NSE companies are required to file within 45 days of quarter-end (60 days for
// the annual result). We use 45 days as the conservative floor so that, in the
// absence of an explicit officialResultDate, a quarterly result is only made
// visible to historical (as-of) signal generation once it would plausibly have
// been public — preventing look-ahead into future filings.
const FUNDAMENTAL_PUBLIC_LAG_DAYS = 45;

// OUTPERFORMING_PEERS_MIN_RELATIVE: Minimum relative-to-peer return (fractional)
// required to cast a bullish peer vote.  Requires at least +2% outperformance
// (not just >= 0) to reduce false positives when the stock barely keeps up.
const OUTPERFORMING_PEERS_MIN_RELATIVE = 0.02;

// Direction cut-points (v3): sourced from shared/types/signal.types.ts

// ── v3 Overextension / Mean-Reversion Guards ─────────────────────────────────
//
// Empirical finding: the top score bucket (80-100) is anti-predictive at short
// horizons (1D -2.13%, 5D -0.42%/49.8% win) because extreme technical+momentum
// signals preferentially surface over-extended / overbought names that mean-revert.
// These guards push NEGATIVE signals through the existing categoryScore mechanism
// so over-extended names get demoted — no ad-hoc penalty; the category proportion
// lowers the composite score in the same way any other negative signal does.
//
// All thresholds are standard / textbook TA values; none are fit to any sample.
// Each guard is independently toggle-able; all ON by default.
//
// Guard 1 — Overbought RSI (TECHNICAL):
//   RSI(14) >= 70 is the textbook overbought threshold (Wilder, 1978).
//   An extreme level at >= 80 adds a second, stronger demotion.
const GUARD_OVERBOUGHT_RSI_ENABLED = true;
const RSI_OVERBOUGHT = 70;          // textbook: above 70 = overbought
const RSI_EXTREME_OVERBOUGHT = 80;  // extreme: above 80 = strongly overbought

// Guard 2 — Extended above SMA50 (TECHNICAL):
//   Price more than 15% above SMA50 signals a parabolic stretch from the medium-
//   term trend line. Textbook "channel deviation" studies use 10-20% as the
//   danger zone; 15% is the midpoint of that range.
const GUARD_SMA50_STRETCH_ENABLED = true;
const SMA50_STRETCH_PCT = 0.15;     // 15% above SMA50 = over-extended

// Guard 3 — Parabolic short-term run-up (MOMENTUM):
//   A 20%+ gain over 10 trading days (~2 calendar weeks) is a parabolic spike
//   well beyond normal momentum. Textbook short-squeeze / blow-off tops
//   are typically identified by 15-25% 10-day moves; 20% is the centre.
const GUARD_PARABOLIC_RUNUP_ENABLED = true;
const PARABOLIC_RUNUP_PCT = 0.20;   // 20% 10-day run = parabolic

type SignalGenerationBatchContext = {
  instrumentsById: Map<string, any>;
  priceWindowsByInstrumentId: Map<string, any[]>;
  fundamentalsByInstrumentId: Map<string, any>;
  strategyPerformanceCache: Map<string, Promise<StrategyPerformanceSummaryDto | null>>;
};

type StrategyFrameworkSignalGenerationService = {
  performance?(code: string, query: { region?: string; assetType?: string }): Promise<StrategyPerformanceSummaryDto[]>;
  evaluateContextWithDefinitions?(context: StrategyContext, strategyCode?: string): Promise<StrategyFrameworkContextEvaluation[]>;
};

/**
 * Thin structural interface for the regime-gate provider.
 *
 * Defined here (rather than importing capital-posture.types) to avoid a circular
 * module dependency: market-context-intelligence's index/service DOES statically
 * import signal-generation-engine (market-context-intelligence.service.ts), so a
 * static import of the market-context index from here would create a load-time
 * cycle. We therefore (a) declare this structural interface locally, and (b) in
 * defaultCapitalPostureService() lazy-require the SPECIFIC file
 * '../market-context-intelligence/capital-posture.service' (which has no back-import
 * to signal-generation-engine), keeping the boundary cycle-free. Mirrors the
 * SignalOutcomeStalenessInvalidator pattern in market-data-foundation.
 *
 * Shape mirrors RegimeGateResult from capital-posture.types.ts.
 */
export interface RegimeGateProvider {
  regimeGate(region: string): Promise<{
    longsDiscouraged: boolean;
    contextualShortsOnly: boolean;
    posture: 'RISK_ON' | 'NEUTRAL' | 'RISK_OFF';
    breadthAbove50Pct: number | null;
    note: string;
  } | null>;
}

/**
 * Minimal structural interface for the calibration repository persisted-read.
 * Defined locally (instead of importing from signal-calibration-engine) to avoid
 * a potential circular module dependency: calibration imports signal-generation.
 * Shape mirrors SignalCalibrationEngineRepository.latestForInstruments.
 */
export interface CalibrationPersistedReader {
  latestForInstruments(
    instrumentIds: string[],
    calibrationModelVersion?: string,
  ): Promise<Array<{
    instrumentId: string;
    calibratedScore: number;
    calibratedDirection: string;
    overallEvaluatedSamples?: number;
    groupEvaluatedSamples?: number;
    calibrationEvidence?: { horizon: string } | null;
  }>>;
}

export class SignalGenerationEngineService {
  private defaultStrategyFrameworkServiceInstance?: StrategyFrameworkSignalGenerationService;
  /** Lazily resolved when not injected; see defaultCapitalPostureService(). */
  private defaultCapitalPostureServiceInstance?: RegimeGateProvider;
  /** Lazily resolved when not injected; see resolvedCalibrationReader(). */
  private defaultCalibrationReaderInstance?: CalibrationPersistedReader;

  constructor(
    private readonly repository = new SignalGenerationEngineRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly researchService = new StockResearchWorkbenchService(),
    private readonly dataQualityService = new DataQualityEngineService(),
    private readonly strategyFrameworkServiceOrLegacyRegistry?: unknown,
    private readonly strategyFrameworkService?: StrategyFrameworkSignalGenerationService,
    private readonly marketContextService?: { latestPersistedSummary?(region?: string): Promise<any | null> },
    private readonly smartMoneyService?: { latestPersistedStocks?(instrumentIds: string[], range?: string): Promise<any[]> },
    /**
     * Optional capital-posture service used to gate bearish/short signals by regime.
     * When omitted the production default (CapitalPostureService) is lazy-required to
     * avoid a static circular import at module load time.
     * Pass `null` explicitly to disable regime gating for a specific instance.
     */
    private readonly capitalPostureService?: RegimeGateProvider | null,
    /**
     * Optional calibration persisted-reader.  When provided, enrichSignals joins
     * the latest persisted SignalCalibrationResult per instrument (persisted-read
     * only; never recomputes).  Omit to skip calibration overlay (graceful absent).
     */
    private readonly calibrationReader?: CalibrationPersistedReader | null,
  ) {}

  async topSignals(query: SignalQuery): Promise<PaginatedSignalResponse> {
    const [{ signals, total }, directionCounts] = await Promise.all([
      this.repository.latestSignals(query),
      this.directionCountsFor(query),
    ]);
    const enriched = await this.enrichSignals(signals, query);
    const trusted = this.trustedReadSignals(enriched);
    const totalCount = this.trustedReadTotal(total, enriched.length, trusted.length);
    return {
      signals: trusted,
      items: trusted,
      total: totalCount,
      totalCount,
      limit: query.limit,
      offset: query.offset || 0,
      hasMore: (query.offset || 0) + trusted.length < totalCount,
      filtersApplied: this.filtersApplied(query),
      scope: this.scopeFor(query),
      directionCounts,
    };
  }

  async screener(query: SignalQuery): Promise<PaginatedSignalResponse> {
    const [{ signals, total }, directionCounts] = await Promise.all([
      this.repository.latestSignals(query),
      this.directionCountsFor(query),
    ]);
    const enriched = await this.enrichSignals(signals, query);
    const trusted = this.trustedReadSignals(enriched);
    const totalCount = this.trustedReadTotal(total, enriched.length, trusted.length);
    return {
      signals: trusted,
      items: trusted,
      total: totalCount,
      totalCount,
      limit: query.limit,
      offset: query.offset || 0,
      hasMore: (query.offset || 0) + trusted.length < totalCount,
      filtersApplied: this.filtersApplied(query),
      scope: this.scopeFor(query),
      directionCounts,
    };
  }

  async latestForInstrument(instrumentId: string): Promise<SignalResultDto | null> {
    // Persisted-read only. No run() fallback — generation stays behind POST /signals/run.
    const latest = await this.repository.latestForInstrument(instrumentId);
    if (latest && this.isTrustedReadSignal(latest)) return this.enrichSignal(latest);
    return null;
  }

  async latestPersistedForInstruments(instrumentIds: string[]): Promise<SignalResultDto[]> {
    const uniqueIds = [...new Set(instrumentIds.map((id) => String(id || '').trim()).filter(Boolean))];
    const results = await Promise.all(uniqueIds.map((instrumentId) => this.repository.latestForInstrument(instrumentId).catch(() => null)));
    return results.filter((result): result is SignalResultDto => Boolean(result && this.isTrustedReadSignal(result)));
  }

  /**
   * Returns signals filtered to a specific lifecycle state.
   * Persisted read — no live generation.  Supports all existing SignalQuery
   * filters plus the lifecycleState filter.
   *
   * Research-support language: results are candidates for review/entry/exit,
   * never labelled as buy or sell instructions.
   */
  async lifecycleSignals(query: SignalQuery): Promise<PaginatedSignalResponse> {
    const [{ signals, total }, directionCounts] = await Promise.all([
      this.repository.latestSignals(query),
      this.directionCountsFor(query),
    ]);
    const enriched = await this.enrichSignals(signals, query);
    const trusted = this.trustedReadSignals(enriched);
    const totalCount = this.trustedReadTotal(total, enriched.length, trusted.length);
    return {
      signals: trusted,
      items: trusted,
      total: totalCount,
      totalCount,
      limit: query.limit,
      offset: query.offset || 0,
      hasMore: (query.offset || 0) + trusted.length < totalCount,
      filtersApplied: this.filtersApplied(query),
      scope: this.scopeFor(query),
      directionCounts,
    };
  }

  /**
   * Convenience method for the exit-candidates endpoint.
   * Returns only EXIT-state signals from the most-recent persisted run.
   * These are instruments where a previously-active signal has now weakened —
   * the trader should review whether to exit the long position.
   *
   * Note: bearish signals on cash-only stocks are risk_warnings, not tradable
   * exit-shorts.  The triggerContract.trigger_type field carries this distinction.
   */
  async exitCandidates(query: Omit<SignalQuery, 'lifecycleState'> & { limit: number }): Promise<PaginatedSignalResponse> {
    return this.lifecycleSignals({ ...query, lifecycleState: 'EXIT' });
  }

  async run(request: SignalRunRequest): Promise<SignalRunResponse> {
    const startedAt = Date.now();
    const asOfDate = request.asOfDate ? this.normalizeUtcDay(new Date(request.asOfDate)) : null;
    const generatedAt = asOfDate ? asOfDate.toISOString() : new Date().toISOString();
    const generatedDate = asOfDate ?? this.normalizeUtcDay(new Date(generatedAt));
    const modelVersion = request.modelVersion || MODEL_VERSION;
    const rulesetVersion = request.rulesetVersion || modelVersion;
    const errors: string[] = [];
    const warnings: string[] = [];
    const explicitInstrumentIds = request.instrumentIds
      ? [...new Set(request.instrumentIds.map((id) => String(id || '').trim()).filter(Boolean))]
      : [];
    const explicitInstrumentScope = Boolean(request.instrumentId || request.symbol || explicitInstrumentIds.length);
    const batchSize = request.instrumentId || request.symbol
      ? 1
      : explicitInstrumentIds.length || this.clampInt(request.batchSize ?? request.limit, signal_generation_engine_batch_size, 1, signal_generation_engine_batch_size);
    const offset = explicitInstrumentScope ? 0 : this.clampInt(request.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const maxConcurrency = request.instrumentId || request.symbol
      ? 1
      : this.clampInt(request.maxConcurrency ?? process.env.SIGNAL_GENERATION_ENGINE_WORKERS_COUNT, signal_generation_engine_workers_count, 1, signal_generation_engine_max_workers_count);
    const providerThrottleMs = this.clampInt(
      request.providerThrottleMs ?? process.env.SIGNAL_GENERATION_ENGINE_PROVIDER_THROTTLE_MS,
      signal_generation_engine_provider_throttle_ms,
      0,
      2000
    );
    const resolved = await this.resolveRunUniverse(request, batchSize, offset);
    const resolvedInstrumentIds = resolved.instrumentIds;
    let instrumentIds = resolvedInstrumentIds;
    const useDataQualityFilter = request.useDataQualityFilter !== false;
    let filteredDataQualityResult: FilterByVerdictResult | null = null;
    let dataQuality: SignalRunResponse['dataQuality'] = {
      filterApplied: useDataQualityFilter,
      beforeFilter: resolvedInstrumentIds.length,
      afterFilter: resolvedInstrumentIds.length,
      excludedByDataQuality: 0,
      missingQualityEvaluationCount: 0,
      eligibleInstrumentCount: resolvedInstrumentIds.length,
      attemptedGenerationCount: resolvedInstrumentIds.length,
    };

    if (useDataQualityFilter) {
      const filtered = await (asOfDate
        ? this.dataQualityService.filterByVerdict(resolvedInstrumentIds, 'signal', asOfDate)
        : this.dataQualityService.filterByVerdict(resolvedInstrumentIds, 'signal')
      ).catch((error: any) => {
        if (asOfDate) {
          // Fix #7 (DQ asOf no-snapshot): For historical/backfill runs there may be no
          // eligibility row for the requested date.  Falling back to "exclude all" would
          // silently zero-out the entire backfill run.  Instead fall back to INCLUDE so
          // that generation proceeds (with a warning); operators can re-filter later.
          warnings.push(`Signal verdict filter unavailable for as-of date ${asOfDate.toISOString().split('T')[0]}; falling back to INCLUDE all instruments for this backfill run: ${error?.message || 'unknown error'}`);
          return {
            eligibleInstrumentIds: resolvedInstrumentIds,
            excludedInstrumentIds: [] as string[],
            reasonsByInstrumentId: {} as Record<string, any>,
          };
        }
        warnings.push(`Signal verdict filter unavailable; trusted signal generation failed closed: ${error?.message || 'unknown error'}`);
        return {
          eligibleInstrumentIds: [] as string[],
          excludedInstrumentIds: resolvedInstrumentIds,
          reasonsByInstrumentId: {} as Record<string, any>,
        };
      });
      if (filtered) {
        filteredDataQualityResult = filtered;
        instrumentIds = filtered.eligibleInstrumentIds;
        dataQuality = {
          filterApplied: true,
          beforeFilter: resolvedInstrumentIds.length,
          afterFilter: instrumentIds.length,
          excludedByDataQuality: filtered.excludedInstrumentIds.length,
          missingQualityEvaluationCount: 0,
          eligibleInstrumentCount: instrumentIds.length,
          attemptedGenerationCount: instrumentIds.length,
        };
      }
    }

    const scope = this.scopeFor(request);
    const runAudit = await this.repository.createRunAudit({
      region: scope.region,
      assetType: scope.assetType,
      requestedByUserId: request.requestedByUserId || 'system',
      modelVersion,
      rulesetVersion,
      sourceDataDate: null,
      generatedDate,
      batchSize,
      offset,
      totalCount: resolved.totalCount,
      warnings,
    });
    const dataQualityEvaluationsByInstrumentId = useDataQualityFilter && filteredDataQualityResult
      ? this.getDataQualityEligibilityMap(resolvedInstrumentIds, filteredDataQualityResult)
      : {};
    // Force LIGHTWEIGHT for as-of runs: skip live workbench / peer live-price look-ahead
    const researchContextMode: NonNullable<SignalRunRequest['researchContextMode']> = asOfDate
      ? 'LIGHTWEIGHT'
      : (request.instrumentId || request.symbol ? 'FULL' : 'LIGHTWEIGHT');
    const generationRequest = {
      ...request,
      useDataQualityFilter,
      researchContextMode,
      modelVersion,
      rulesetVersion,
      generationRunId: runAudit.id,
      dataQualityEvaluationsByInstrumentId,
    } as SignalRunRequest & {
      generationRunId: string;
      dataQualityEvaluationsByInstrumentId: Record<string, SignalDataQualityEligibility>;
    };
    const effectiveProviderThrottleMs = researchContextMode === 'LIGHTWEIGHT' ? 0 : providerThrottleMs;
    const batchContext = await this.loadSignalGenerationBatchContext(instrumentIds, generationRequest);
    const generatedResults = await this.generateBatchWithConcurrency(instrumentIds, generationRequest, maxConcurrency, effectiveProviderThrottleMs, batchContext);
    const results = generatedResults
      .map((item) => item.result)
      .filter((result): result is SignalResultDto => Boolean(result));
    errors.push(...generatedResults
      .filter((item) => item.error)
      .map((item) => `${item.instrumentId}: ${item.error}`));
    const processedCount = resolvedInstrumentIds.length;
    const failedCount = errors.length;
    const attemptedGenerationCount = instrumentIds.length;
    const generatedCount = results.filter((result) => result.writeStatus === 'CREATED' || !result.writeStatus).length;
    const updatedCount = results.filter((result) => result.writeStatus === 'UPDATED').length;
    const noOpCount = results.filter((result) => result.writeStatus === 'NO_OP').length;
    const nullResultCount = Math.max(0, attemptedGenerationCount - results.length - failedCount);
    const skippedCount = Math.max(0, processedCount - attemptedGenerationCount) + nullResultCount;
    const nextOffset = offset + processedCount;
    const hasMore = nextOffset < resolved.totalCount;
    const directionCountsGenerated = results.reduce<Record<SignalDirection, number>>((acc, result) => {
      acc[result.direction] += 1;
      return acc;
    }, { BULLISH: 0, NEUTRAL: 0, BEARISH: 0 });
    const durationMs = Date.now() - startedAt;
    const completedRunAudit = await this.repository.completeRunAudit(runAudit.id, {
      status: failedCount > 0 ? (results.length > 0 ? 'PARTIAL' : 'FAILED') : 'COMPLETED',
      sourceDataDate: this.latestDate(results.map((result) => result.sourceDataDate || result.sourcePriceDate)),
      processedCount,
      generatedCount,
      updatedCount,
      noOpCount,
      duplicateOrIdempotentCount: updatedCount + noOpCount,
      skippedCount,
      failedCount,
      excludedByDataQuality: dataQuality.excludedByDataQuality,
      missingQualityEvaluationCount: dataQuality.missingQualityEvaluationCount,
      durationMs,
      warnings,
    });

    return {
      generated: generatedCount,
      skipped: skippedCount,
      errors,
      warnings,
      dataQuality,
      results,
      runAudit: completedRunAudit,
      generated_at: generatedAt,
      processedCount,
      totalCount: resolved.totalCount,
      batchSize,
      maxConcurrency,
      providerThrottleMs: effectiveProviderThrottleMs,
      offset,
      nextOffset: hasMore ? nextOffset : null,
      hasMore,
      generatedCount,
      updatedCount,
      noOpCount,
      skippedCount,
      failedCount,
      strategyMatchedCount: request.includeStrategyMatches ? results.reduce((sum, result) => sum + (result.strategyMatches?.length || 0), 0) : undefined,
      strategyBlockedCount: request.includeStrategyMatches ? results.reduce((sum, result) => sum + (result.blockedStrategies?.length || 0), 0) : undefined,
      outOfScopeSkipped: 0,
      directionCountsGenerated,
      scope,
      latestGeneratedAt: results[results.length - 1]?.generated_at ?? null,
      durationMs,
      eligibleInstrumentCount: instrumentIds.length,
      attemptedGenerationCount,
    };
  }

  async latestRunAudit(query: Pick<SignalRunRequest, 'region' | 'assetType' | 'modelVersion'>) {
    return this.repository.latestRunAudit(query);
  }

  async health() {
    const { signals: latest } = await this.repository.latestSignals({ limit: 1 });
    return {
      status: 'ok',
      module: 'signal-generation-engine',
      latest_generated_at: latest[0]?.generated_at ?? null,
      source: 'signal-generation-engine',
      data_status: latest.length > 0 ? 'COMPLETE' : 'MISSING',
      timestamp: new Date().toISOString(),
    };
  }

  async signalHistory(query: SignalHistoryQuery) {
    return this.repository.signalHistory(query);
  }

  async signalHistoryCount(query: Omit<SignalHistoryQuery, 'limit'>) {
    return this.repository.signalHistoryCount(query);
  }

  async funnelDiagnostics(query: { region?: string; assetType?: string; generatedDate?: string; from?: string; to?: string }) {
    return this.repository.funnelDiagnostics(query);
  }

  async latestSignalUniverse(query: SignalQuery) {
    return this.repository.latestSignalUniverse(query);
  }

  async latestSignalUniverseCount(query: Omit<SignalQuery, 'limit'>) {
    return this.repository.latestSignalUniverseCount(query);
  }

  async generateForInstrument(instrumentId: string, options: Pick<SignalRunRequest, 'strategyCode' | 'includeStrategyMatches' | 'onlyStrategyEligible' | 'excludeNoiseFiltered' | 'researchContextMode' | 'region' | 'assetType' | 'modelVersion' | 'rulesetVersion' | 'useDataQualityFilter' | 'asOfDate'> & {
    generationRunId?: string;
    dataQualityEvaluationsByInstrumentId?: Record<string, SignalDataQualityEligibility>;
    batchContext?: SignalGenerationBatchContext;
  } = {}): Promise<SignalResultDto | null> {
    const asOfDate = options.asOfDate ? this.normalizeUtcDay(new Date(options.asOfDate)) : null;
    // As-of runs must use LIGHTWEIGHT to avoid live workbench look-ahead
    const effectiveResearchContextMode = asOfDate ? 'LIGHTWEIGHT' : options.researchContextMode;
    const useFullResearchContext = effectiveResearchContextMode !== 'LIGHTWEIGHT';
    const marketScope = { region: options.region, assetType: options.assetType };
    const priceEndDate = asOfDate ?? undefined;
    const [instrument, pricesResponse, fundamentalsResponse, research] = await Promise.all([
      options.batchContext?.instrumentsById.has(instrumentId)
        ? Promise.resolve(options.batchContext.instrumentsById.get(instrumentId))
        : this.marketDataService.getInstrument(instrumentId, marketScope),
      options.batchContext?.priceWindowsByInstrumentId.has(instrumentId)
        ? Promise.resolve({ prices: options.batchContext.priceWindowsByInstrumentId.get(instrumentId) || [] })
        : this.marketDataService.listPricesByInstrumentId(instrumentId, SIGNAL_GENERATION_PRICE_WINDOW, undefined, priceEndDate, marketScope),
      options.batchContext?.fundamentalsByInstrumentId.has(instrumentId)
        ? Promise.resolve(options.batchContext.fundamentalsByInstrumentId.get(instrumentId))
        : this.getFundamentalsForGeneration(instrumentId, marketScope, useFullResearchContext, asOfDate ?? undefined),
      useFullResearchContext ? this.researchService.workbench(instrumentId, '3M') : Promise.resolve(null),
    ]);

    if (!instrument) return null;

    const prices = this.toPricePoints(pricesResponse?.prices || []);
    const latestFundamental = fundamentalsResponse?.records?.[0] || null;
    const peerAveragePe = typeof research?.valuation?.peer_average_pe === 'number' ? research.valuation.peer_average_pe : null;
    const peerAverageYield = typeof research?.valuation?.peer_average_dividend_yield === 'number'
      ? research.valuation.peer_average_dividend_yield
      : null;
    const relativeToPeers = typeof research?.relative_strength?.relative_to_peer_average === 'number'
      ? research.relative_strength.relative_to_peer_average
      : null;

    // ── Delivery% evidence (NR-1) ─────────────────────────────────────────────
    // listPricesByInstrumentId now returns delivery_percent (latest NSE delivery snapshot).
    // We attach it as evidence/conviction context; it does NOT alter the composite score —
    // conviction text is additive and honest (no overfitting).
    // High delivery (>= 40%): positional / institutional interest → adds conviction note.
    // Low delivery (< 20%): intraday churn → adds caution note.
    // 20-40%: moderate, no annotation (avoid noise).
    // absent (null): no annotation (BSE-only or data gap — never fabricate).
    const deliveryPercent: number | null =
      typeof (pricesResponse as any)?.delivery_percent === 'number'
        ? (pricesResponse as any).delivery_percent
        : null;
    const deliveryEvidence = this.buildDeliveryEvidence(deliveryPercent);

    const technical = this.evaluateTechnical(prices);
    const momentum = this.evaluateMomentum(prices, relativeToPeers);
    const fundamentals = this.evaluateFundamentals(latestFundamental, peerAveragePe, peerAverageYield);
    
    const triggeredSignals = [...technical.signals, ...momentum.signals, ...fundamentals.signals];
    const negativeSignals = [...technical.negativeSignals, ...momentum.negativeSignals, ...fundamentals.negativeSignals];
    const totalEvaluated = triggeredSignals.length + negativeSignals.length;

    // Thread per-category signal counts so compositeScore can compute evidenceFactor.
    // file: signal-generation-engine.service.ts, generateForInstrument ~line 474
    const score = this.compositeScore(
      technical.score, momentum.score, fundamentals.score,
      technical.signals.length, technical.negativeSignals.length,
      momentum.signals.length, momentum.negativeSignals.length,
      fundamentals.signals.length, fundamentals.negativeSignals.length,
    );
    const direction = this.directionForScore(score);
    const rawConfidence = this.confidenceFor(prices, latestFundamental, totalEvaluated, asOfDate ?? undefined);

    // ── Regime gate (bearish/short suppression) ────────────────────────────────
    // Consult the current market regime before surfacing bearish signals.
    // The gate is additive / conservative-only:
    //   • Long signals: untouched.
    //   • asOfDate set (backfill): no gating — no persisted snapshot exists for past dates.
    //   • Gate null (no snapshot today): no gating, unavailable note added.
    //   • RISK_ON: tradable bearish_trigger suppressed → risk_warning, confidence lowered.
    //   • RISK_OFF / contextualShortsOnly: allowed unchanged.
    const signalRegion = this.canonicalRegion(options.region || instrument.region || instrument.country);
    const regimeGateResult = await this.applyRegimeGateToShort(
      direction,
      instrument.derivatives_eligible ?? instrument.derivativesEligible,
      signalRegion,
      asOfDate,
      rawConfidence,
    );
    const confidence = regimeGateResult.adjustedConfidence;

    const warnings: string[] = [];
    const latestDate = prices[0]?.date ? new Date(prices[0].date) : null;
    // Staleness is measured relative to asOfDate when provided; otherwise relative to now
    const stalenessAnchor = asOfDate ?? new Date();
    const fiveDaysAgo = new Date(stalenessAnchor);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    if (latestDate && latestDate < fiveDaysAgo) {
      warnings.push(`Market data is stale (last update: ${latestDate.toISOString().split('T')[0]})`);
    }
    if (prices.length < 50) {
      warnings.push(`Insufficient price history (${prices.length} days) for reliable indicators`);
    }
    if (regimeGateResult.regimeGateNote) {
      warnings.push(regimeGateResult.regimeGateNote);
    }

    // generatedAt / generatedDate come from asOfDate when provided (makes idempotency key correct for backfill)
    const generatedAt = asOfDate ? asOfDate.toISOString() : new Date().toISOString();
    const generatedDate = asOfDate ? asOfDate.toISOString() : this.normalizeUtcDay(new Date()).toISOString();

    // Reliability tier + SME segment
    const isSme = this.isSmeInstrument(instrument);
    const reliabilityTier = this.computeReliabilityTier(instrument, latestFundamental);

    let result: SignalResultDto = {
      instrument_id: instrument.id,
      symbol: instrument.symbol,
      company_name: instrument.company_name ?? null,
      sector: instrument.sector ?? null,
      country: instrument.country ?? null,
      currentPrice: null,
      previousClose: null,
      dailyChange: null,
      dailyChangePercent: null,
      currency: instrument.currency ?? null,
      priceTimestamp: null,
      score,
      direction,
      confidence,
      triggered_signals: triggeredSignals,
      negative_signals: negativeSignals,
      explanation: this.explain(direction, triggeredSignals, negativeSignals, deliveryEvidence),
      generated_at: generatedAt,
      modelVersion: options.modelVersion || MODEL_VERSION,
      rulesetVersion: options.rulesetVersion || options.modelVersion || MODEL_VERSION,
      generatedDate,
      sourceDataDate: latestDate?.toISOString() ?? null,
      sourcePriceDate: latestDate?.toISOString() ?? null,
      scoringInputSummary: this.scoringInputSummary(prices, latestFundamental, useFullResearchContext || Boolean(options.includeStrategyMatches)),
      dataQualityEligibility: this.dataQualityEligibilityFor(instrumentId, options),
      regimeGateNote: regimeGateResult.regimeGateNote ?? undefined,
      regimeGateSuppressed: regimeGateResult.regimeGateSuppressed || undefined,
      generationRunId: options.generationRunId ?? null,
      source: 'signal-generation-engine',
      data_status: prices.length >= 50 ? (prices.length >= 200 ? 'COMPLETE' : 'PARTIAL') : 'MISSING',
      reliabilityTier,
      isSme,
      warnings,
      deliveryPercent: deliveryPercent ?? undefined,
      deliveryEvidence: deliveryEvidence ?? undefined,
    };

    if (options.includeStrategyMatches || options.strategyCode || options.onlyStrategyEligible || options.excludeNoiseFiltered) {
      // Skip persisted market-context and smart-money reads for as-of runs to prevent importing today's regime
      const [marketContext, persistedSmartMoney] = asOfDate
        ? [null, new Map<string, any>()]
        : await Promise.all([
          this.latestPersistedMarketSummary(this.canonicalRegion(options.region || instrument.region || instrument.country)),
          this.latestPersistedSmartMoney([instrument.id]),
        ]);
      result = this.withPersistedStrategyContext(result, instrument, marketContext, persistedSmartMoney.get(instrument.id) ?? null);
      result = await this.attachStrategyMatches(result, prices, instrument, options, options.batchContext?.strategyPerformanceCache);
      if (!this.signalPassesStrategyFilters(result, options)) return null;
    }

    // Lifecycle classification: look up the immediately prior persisted signal
    // for this instrument to determine ENTRY / ACTIVE / EXIT / EXPIRED.
    // Skip for as-of/backfill runs to avoid cross-contaminating historical signals.
    if (!asOfDate) {
      result = await this.withLifecycleState(result, generatedDate, options.modelVersion || MODEL_VERSION);
    }

    const saved = await this.persistSignalResult(result);
    const persisted = {
      ...saved.result,
      writeStatus: saved.status,
      strategyMatches: result.strategyMatches,
      blockedStrategies: result.blockedStrategies,
    };
    return this.withTriggerContract(persisted, instrument);
  }

  async enrichSignals(signals: SignalResultDto[], options: Pick<SignalQuery, 'strategyCode' | 'includeStrategyMatches' | 'onlyStrategyEligible' | 'excludeNoiseFiltered' | 'hasStrategyMatch' | 'hasBlockedStrategies' | 'frameworkBackedDecisionAvailable' | 'region' | 'assetType'> = {}): Promise<SignalResultDto[]> {
    if (signals.length === 0) return [];

    try {
      const instrumentIds = Array.from(new Set(signals.map(s => s.instrument_id)));
      const symbols = Array.from(new Set(signals.map(s => s.symbol)));

      // Batch fetch instruments, latest prices, and calibration rows concurrently.
      // Calibration read is persisted-only — never triggers a live recompute.
      const calibReader = this.resolvedCalibrationReader();
      const calibrationPromise = calibReader
        ? calibReader.latestForInstruments(instrumentIds).catch(() => [])
        : Promise.resolve<Array<any>>([]);

      // Fix #3 (enrichSignals live-price look-ahead): determine whether ALL signals in
      // this batch are "live" (generated today or yesterday) or historical.  If even one
      // signal is historical we cannot safely inject today's price as current price —
      // that would corrupt historical records with future data.  We fetch latest prices
      // only for live-day signals; historical signals leave currentPrice null.
      const todayUtc = this.normalizeUtcDay(new Date()).getTime();
      const oneTradingDayMs = 2 * 24 * 60 * 60 * 1000; // 2 calendar days (covers weekends/holidays)
      const isLiveSignal = (signal: SignalResultDto): boolean => {
        if (!signal.generated_at) return false;
        const genDay = this.normalizeUtcDay(new Date(signal.generated_at)).getTime();
        return Math.abs(todayUtc - genDay) <= oneTradingDayMs;
      };

      const hasLiveSignals = signals.some(isLiveSignal);
      const serviceAny = this.marketDataService as any;
      const [instruments, latestPrices, calibrationRows, prevCloseWindows] = await Promise.all([
        this.marketDataService.getInstrumentsByIds(instrumentIds),
        // Only fetch live prices if at least one signal in the batch is from today/yesterday
        hasLiveSignals
          ? this.marketDataService.getLatestPricesBySymbols(symbols)
          : Promise.resolve<any[]>([]),
        calibrationPromise,
        // P2 #124: batch previous-close fetch — one query for all live-signal instruments
        // instead of N per-instrument queries inside the map loop.
        // limit=2: we only need the 2 most-recent rows per instrument (current + previous).
        // No endDate: these are live-day signals so we always want "latest available" close.
        // Semantics are identical to the former listPricesByInstrumentId(id, 2) call —
        // same adjusted_close field, same descending-by-timestamp order, same no-asOf guard.
        hasLiveSignals && typeof serviceAny.listRecentPriceWindowsByInstrumentIds === 'function'
          ? (serviceAny.listRecentPriceWindowsByInstrumentIds(instrumentIds, 2) as Promise<Map<string, any[]>>).catch(() => new Map<string, any[]>())
          : Promise.resolve(new Map<string, any[]>()),
      ]);

      const instrumentMap = new Map(instruments.map((i: any) => [i.id, i]));
      const priceMap = new Map(latestPrices.map((p: any) => [p.symbol, p]));
      // Build a map of instrumentId → latest calibration row (null-safe)
      const calibrationMap = new Map(
        (calibrationRows as any[]).map((row: any) => [row.instrumentId, row])
      );
      // prevCloseWindows: Map<instrumentId, priceArray[desc]> — index [1] is the previous close.
      const prevCloseMap: Map<string, any[]> = prevCloseWindows instanceof Map ? prevCloseWindows : new Map();
      const includeStrategyContext = this.shouldAttachStrategyMatches(options);
      const ratingCache = new Map<string, Promise<StrategyPerformanceSummaryDto | null>>();
      const strategyScopeRegion = this.canonicalRegion(options.region || signals[0]?.country);
      const [marketContext, persistedSmartMoney] = includeStrategyContext
        ? await Promise.all([
          this.latestPersistedMarketSummary(strategyScopeRegion),
          this.latestPersistedSmartMoney(instrumentIds),
        ])
        : [null, new Map<string, any>()];

      const enriched = await Promise.all(signals.map(async (signal) => {
        const instrument = instrumentMap.get(signal.instrument_id);
        // Fix #3 cont.: only attach live price data when signal was generated today/yesterday.
        // Historical signals leave currentPrice/dailyChange null so the persisted corpus
        // is not contaminated with future price data on read.
        const signalIsLive = isLiveSignal(signal);
        const latest = signalIsLive ? priceMap.get(signal.symbol) : undefined;

        const currentPrice = latest ? Number((latest as any).adjusted_close ?? (latest as any).close) : null;

        // P2 #124: use the pre-fetched bulk window (Map lookup, no extra query).
        // prevCloseMap[instrumentId][1] is the second-most-recent adjusted_close —
        // identical semantics to the former per-instrument listPricesByInstrumentId(id, 2)[1].
        let previousClose: number | null = null;
        if (latest && signalIsLive) {
          const prevWindow = prevCloseMap.get(signal.instrument_id);
          previousClose = prevWindow?.[1]?.adjusted_close ?? null;
        }

        const dailyChange = currentPrice !== null && previousClose !== null ? currentPrice - previousClose : null;

        // ── Calibration overlay (persisted-read; graceful absent) ────────────
        // Attach the latest persisted calibration fields to the signal read.
        // If no calibration row exists, calibrationStatus='UNAVAILABLE' and the
        // raw score is the only authoritative value — nothing is fabricated.
        const calibRow = calibrationMap.get(signal.instrument_id);
        const calibrationOverlay = this.calibrationOverlayFor(calibRow);

        let result: SignalResultDto = {
          ...signal,
          currentPrice,
          previousClose,
          dailyChange,
          dailyChangePercent: dailyChange !== null && previousClose !== null && previousClose > 0 ? dailyChange / previousClose : null,
          currency: instrument?.currency ?? signal.currency ?? null,
          priceTimestamp: (latest as any)?.date ? new Date((latest as any).date).toISOString() : null,
          ...calibrationOverlay,
        };
        if (includeStrategyContext) {
          result = this.withPersistedStrategyContext(result, instrument, marketContext, persistedSmartMoney.get(signal.instrument_id) ?? null);
        }
        if (!includeStrategyContext) return this.withTriggerContract(result, instrument);
        const history = await this.marketDataService.listPricesByInstrumentId(signal.instrument_id, 500).catch(() => null);
        const prices = this.toPricePoints(history?.prices || []);
        result = await this.attachStrategyMatches(result, prices, instrument, options, ratingCache);
        return this.withTriggerContract(result, instrument);
      }));
      return this.withRsPercentiles(enriched.filter((signal) => this.signalPassesStrategyFilters(signal, options)));
    } catch (error) {
      console.error('Signal enrichment failed:', error);
      return this.withRsPercentiles(signals.map(signal => ({
        ...signal,
        currentPrice: null,
        previousClose: null,
        dailyChange: null,
        dailyChangePercent: null,
        priceTimestamp: null,
      })).map((signal) => this.withTriggerContract(signal)).filter((signal) => this.signalPassesStrategyFilters(signal, options)));
    }
  }

  /**
   * NR-6: assign each signal a relative-strength percentile (0–100) by ranking its
   * composite `score` ascending within the SERVED set (weakest→0, strongest→100).
   * Ties take the lower-bound rank. A served set of < 2 leaves rsPercentile/relativeReturn
   * null (no meaningful ranking). Pure in-memory over the already-served signals — no
   * extra DB or price reads, so it adds no look-ahead or pool pressure.
   */
  private withRsPercentiles(signals: SignalResultDto[]): SignalResultDto[] {
    const n = signals.length;
    if (n < 2) {
      return signals.map((s) => ({ ...s, rsPercentile: null, relativeReturn: null }));
    }
    const scoreOf = (s: SignalResultDto): number => (typeof s.score === 'number' ? s.score : 0);
    const sortedScores = signals.map(scoreOf).sort((a, b) => a - b);
    // lower-bound rank: first index where sortedScores[i] >= score (ties share lowest rank)
    const lowerBoundRank = (score: number): number => {
      let lo = 0;
      let hi = sortedScores.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (sortedScores[mid] < score) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };
    return signals.map((s) => {
      const score = scoreOf(s);
      const rsPercentile = Math.round((lowerBoundRank(score) / (n - 1)) * 100);
      const relativeReturn = (score - 50) / 50;
      return { ...s, rsPercentile, relativeReturn };
    });
  }

  async enrichSignal(signal: SignalResultDto): Promise<SignalResultDto> {
    const enriched = await this.enrichSignals([signal]);
    return enriched[0];
  }

  evaluateTechnical(prices: SignalPricePoint[]) {
    const signals: SignalItem[] = [];
    const negativeSignals: SignalItem[] = [];
    const latest = prices[0];
    const previous = prices[1];
    const sma50 = this.sma(prices, 50);
    const sma200 = this.sma(prices, 200);
    const high52 = this.periodHigh(prices, 252);
    const low52 = this.periodLow(prices, 252);
    const rsiNow = this.rsi(prices, 14);
    const rsiPrev = this.rsi(prices.slice(1), 14);
    const currentAtr = this.atr(prices, 14);
    const currentClosePos = this.closePosition(latest);
    const currentAdx = this.adx(prices, 14);
    const obvTrendingUp = this.isObvTrendingUp(prices, 10);
    const obvTrendingDown = this.isObvTrendingDown(prices, 10);

    const isRangeBound = currentAdx !== null && currentAdx < 20;

    if (latest && sma50 !== null) {
      if (isRangeBound) {
        // Mute SMA signals in range-bound markets (noise)
      } else {
        (latest.adjusted_close >= sma50 ? signals : negativeSignals).push(this.signal(
          latest.adjusted_close >= sma50 ? 'PRICE_ABOVE_SMA50' : 'PRICE_BELOW_SMA50',
          latest.adjusted_close >= sma50 ? 'price is above SMA50' : 'price is below SMA50',
          'TECHNICAL'
        ));
      }
    }
    if (sma50 !== null && sma200 !== null) {
      if (isRangeBound) {
        // Mute SMA crossover signals in range-bound markets
      } else {
        (sma50 >= sma200 ? signals : negativeSignals).push(this.signal(
          sma50 >= sma200 ? 'SMA50_ABOVE_SMA200' : 'SMA50_BELOW_SMA200',
          sma50 >= sma200 ? 'SMA50 is above SMA200' : 'SMA50 is below SMA200',
          'TECHNICAL'
        ));
      }
    }
    
    // Candlestick Rejection & Breakouts
    if (latest && high52 !== null && latest.adjusted_close >= high52 * 0.97) {
      if (currentClosePos !== null && currentClosePos < 0.3) {
         negativeSignals.push(this.signal('FALSE_BREAKOUT_REJECTION', 'price tagged 52-week high but closed in the bottom 30% of the daily range (Trap)', 'TECHNICAL'));
      } else {
         signals.push(this.signal('NEAR_52_WEEK_HIGH', 'price is near a 52-week high', 'TECHNICAL'));
      }
    }
    if (latest && low52 !== null && latest.adjusted_close <= low52 * 1.03) {
      if (currentClosePos !== null && currentClosePos > 0.7) {
         signals.push(this.signal('FALSE_BREAKDOWN_REJECTION', 'price tagged 52-week low but closed in the top 30% of the daily range (Trap)', 'TECHNICAL'));
      }
      // NEAR_52_WEEK_LOW removed: proximity to 52w-low is mean-reverting on NSE — anti-predictive as a bearish vote
    }

    // Mean Reversion is stronger in range-bound markets
    if (rsiNow !== null && rsiPrev !== null && rsiPrev < 30 && rsiNow > rsiPrev) {
      signals.push(this.signal(isRangeBound ? 'STRONG_RSI_RECOVERY' : 'RSI_RECOVERING', 'RSI is recovering from oversold levels', 'TECHNICAL'));
    }
    // Require a meaningful RSI drop (>2 points) to avoid voting bearish on single-bar noise in strong trends
    if (rsiNow !== null && rsiPrev !== null && rsiPrev > 70 && rsiNow < rsiPrev - 2) {
      negativeSignals.push(this.signal(isRangeBound ? 'STRONG_RSI_REVERSAL' : 'RSI_OVERBOUGHT_REVERSAL', 'RSI is reversing from overbought levels', 'TECHNICAL'));
    }

    // ── Guard 1: Overbought RSI ───────────────────────────────────────────────
    // Demote over-extended names where RSI(14) is in overbought territory.
    // Standard textbook levels: 70 = overbought, 80 = extreme overbought.
    // Fires independently of the reversal check above (that fires only after RSI
    // has already turned down; this fires while RSI is still elevated).
    // Explainability: these signals appear in negative_signals / triggerContract
    // failed_conditions so the user sees WHY a name was demoted.
    if (GUARD_OVERBOUGHT_RSI_ENABLED && rsiNow !== null) {
      if (rsiNow >= RSI_EXTREME_OVERBOUGHT) {
        negativeSignals.push(this.signal('RSI_EXTREME_OVERBOUGHT', `RSI(14) is ${rsiNow.toFixed(1)} — extremely overbought (>=${RSI_EXTREME_OVERBOUGHT}); mean-reversion risk is elevated`, 'TECHNICAL'));
      } else if (rsiNow >= RSI_OVERBOUGHT) {
        negativeSignals.push(this.signal('RSI_OVERBOUGHT', `RSI(14) is ${rsiNow.toFixed(1)} — overbought (>=${RSI_OVERBOUGHT}); upside momentum is stretched`, 'TECHNICAL'));
      }
    }

    // ── Guard 2: Extended above SMA50 ─────────────────────────────────────────
    // Demote names that are trading more than SMA50_STRETCH_PCT (15%) above their
    // 50-day moving average — a parabolic stretch from the medium-term trend line.
    // Skipped cleanly if SMA50 is unavailable (insufficient data).
    if (GUARD_SMA50_STRETCH_ENABLED && latest && sma50 !== null && sma50 > 0) {
      const stretchPct = (latest.adjusted_close - sma50) / sma50;
      if (stretchPct >= SMA50_STRETCH_PCT) {
        negativeSignals.push(this.signal('EXTENDED_ABOVE_SMA50', `price is ${(stretchPct * 100).toFixed(1)}% above SMA50 — over-extended from trend (threshold: ${(SMA50_STRETCH_PCT * 100).toFixed(0)}%)`, 'TECHNICAL'));
      }
    }
    
    // Volatility-Adjusted Volume Breakout with Institutional Footprint (OBV)
    const averageVolume = this.average(prices.slice(1, 21).map((price) => price.volume).filter((value): value is number => typeof value === 'number'));
    if (latest?.volume && averageVolume && latest.volume >= averageVolume * 1.5) {
      const priceMove = previous ? Math.abs(latest.adjusted_close - previous.adjusted_close) : 0;
      
      if (currentAtr !== null && priceMove > (currentAtr * 1.5)) {
        if (previous && latest.adjusted_close < previous.adjusted_close) {
          if (obvTrendingDown) {
            negativeSignals.push(this.signal('CONFIRMED_DOWN_VOLUME_SELLOFF', 'heavy selloff exceeding 1.5x ATR with institutional distribution (OBV)', 'TECHNICAL'));
          } else {
            negativeSignals.push(this.signal('DOWN_VOLUME_SELLOFF', 'heavy down-volume selloff exceeding 1.5x ATR', 'TECHNICAL'));
          }
        } else {
          if (obvTrendingUp) {
            signals.push(this.signal('CONFIRMED_VOLUME_BREAKOUT', 'volume breakout exceeding 1.5x ATR with institutional accumulation (OBV)', 'TECHNICAL'));
          } else {
            signals.push(this.signal('VOLUME_BREAKOUT', 'volume breakout confirms the move exceeding 1.5x ATR', 'TECHNICAL'));
          }
        }
      } else if (currentAtr === null) {
        // Fallback if ATR is not available
        (previous && latest.adjusted_close < previous.adjusted_close ? negativeSignals : signals).push(this.signal(
          previous && latest.adjusted_close < previous.adjusted_close ? 'DOWN_VOLUME_SELLOFF' : 'VOLUME_BREAKOUT',
          previous && latest.adjusted_close < previous.adjusted_close ? 'heavy down-volume selloff' : 'volume breakout confirms the move',
          'TECHNICAL'
        ));
      }
    }

    return { score: this.categoryScore(signals.length, negativeSignals.length), signals, negativeSignals };
  }

  evaluateMomentum(prices: SignalPricePoint[], relativeToPeers: number | null) {
    const signals: SignalItem[] = [];
    const negativeSignals: SignalItem[] = [];
    const oneMonth = this.returnAtOffset(prices, 21);
    const threeMonth = this.returnAtOffset(prices, 63);
    const sixMonth = this.returnAtOffset(prices, 126);

    this.pushReturnSignal(oneMonth, 'ONE_MONTH_MOMENTUM', '1M momentum is positive', '1M momentum is negative', signals, negativeSignals, MOMENTUM_BULL_THRESHOLD_1M, MOMENTUM_BEAR_THRESHOLD_1M);
    this.pushReturnSignal(threeMonth, 'THREE_MONTH_MOMENTUM', '3M momentum is positive', '3M momentum is negative', signals, negativeSignals, MOMENTUM_BULL_THRESHOLD_3M, MOMENTUM_BEAR_THRESHOLD_3M);

    // ── Guard 3: Parabolic short-term run-up ──────────────────────────────────
    // Fix #11: A 20%+ gain is only parabolic if the move is spread over multiple
    // trading days (not just one single-day earnings gap).  Require both the
    // 10-day return AND the 5-day return to be >= PARABOLIC_RUNUP_PCT so that a
    // legitimate single-day post-earnings gap (which then consolidates) doesn't
    // get penalised — true parabolic runs sustain over at least the 5-day window.
    if (GUARD_PARABOLIC_RUNUP_ENABLED) {
      const tenDay = this.returnAtOffset(prices, 10);
      const fiveDay = this.returnAtOffset(prices, 5);
      if (tenDay !== null && fiveDay !== null && tenDay >= PARABOLIC_RUNUP_PCT && fiveDay >= PARABOLIC_RUNUP_PCT) {
        negativeSignals.push(this.signal('PARABOLIC_RUNUP', `10-day return is ${(tenDay * 100).toFixed(1)}% and 5-day return is ${(fiveDay * 100).toFixed(1)}% — sustained parabolic spike (threshold: ${(PARABOLIC_RUNUP_PCT * 100).toFixed(0)}%); short-term mean-reversion risk`, 'MOMENTUM'));
      }
    }
    // SIX_MONTH_ACCELERATION: only emit when both 1M and 3M already cleared their bullish thresholds,
    // preventing a triple-count of the same trend (acceleration implies 1M+3M bullish already voted).
    // Fix #9: use geometric comparison — annualised monthly rate vs actual monthly rate — so the
    // arithmetic "1M > 3M/3" shortcut (which overstates acceleration when 3M is large) is replaced
    // by the correct compounded-equivalent: 1M > (1 + 3M)^(1/3) - 1.
    if (oneMonth !== null && threeMonth !== null && sixMonth !== null
        && oneMonth >= MOMENTUM_BULL_THRESHOLD_1M && threeMonth >= MOMENTUM_BULL_THRESHOLD_3M
        && oneMonth > Math.pow(1 + threeMonth, 1 / 3) - 1 && threeMonth > sixMonth / 2) {
      // Don't add if both 1M and 3M momentum signals are already pushed — emit only the acceleration.
      // Remove the individual month signals to avoid triple-counting when acceleration fires.
      const oneMonthIdx = signals.findIndex(s => s.code === 'ONE_MONTH_MOMENTUM');
      const threeMonthIdx = signals.findIndex(s => s.code === 'THREE_MONTH_MOMENTUM');
      if (oneMonthIdx !== -1) signals.splice(oneMonthIdx, 1);
      if (threeMonthIdx !== -1) {
        // after first removal, index may have shifted
        const recalcIdx = signals.findIndex(s => s.code === 'THREE_MONTH_MOMENTUM');
        if (recalcIdx !== -1) signals.splice(recalcIdx, 1);
      }
      signals.push(this.signal('SIX_MONTH_ACCELERATION', '6M trend is accelerating', 'MOMENTUM'));
    }
    // Fix #10: require >= OUTPERFORMING_PEERS_MIN_RELATIVE (+2%) to vote bullish —
    // a stock that merely keeps pace with peers (0-2%) does not deserve a bullish vote.
    if (relativeToPeers !== null) {
      if (relativeToPeers >= OUTPERFORMING_PEERS_MIN_RELATIVE) {
        signals.push(this.signal('OUTPERFORMING_PEERS', `stock is outperforming peer average by ${(relativeToPeers * 100).toFixed(1)}%`, 'MOMENTUM'));
      } else if (relativeToPeers < 0) {
        negativeSignals.push(this.signal('UNDERPERFORMING_PEERS', 'stock is underperforming peer average', 'MOMENTUM'));
      }
      // 0 <= relativeToPeers < OUTPERFORMING_PEERS_MIN_RELATIVE: neutral band — no vote
    }

    return { score: this.categoryScore(signals.length, negativeSignals.length), signals, negativeSignals };
  }

  evaluateFundamentals(fundamental: any, peerAveragePe: number | null, peerAverageYield: number | null) {
    const signals: SignalItem[] = [];
    const negativeSignals: SignalItem[] = [];
    const eps = this.optionalNumber(fundamental?.eps);
    const peRatio = this.optionalNumber(fundamental?.pe_ratio);
    const dividendYield = this.optionalNumber(fundamental?.dividend_yield);

    // EPS is the canonical profitability vote; net income is the same fact — net_income dropped to avoid double-counting
    if (eps !== null) (eps > 0 ? signals : negativeSignals).push(this.signal(eps > 0 ? 'POSITIVE_EPS' : 'NEGATIVE_EPS', eps > 0 ? 'EPS is positive' : 'EPS is negative', 'FUNDAMENTAL'));
    if (peRatio !== null && peerAveragePe !== null && peRatio > 0) {
      // PE_ABOVE_PEERS is anti-predictive for growth names; only vote bullish (below peers), not bearish
      if (peRatio <= peerAveragePe) signals.push(this.signal('PE_BELOW_PEERS', 'P/E is below peer average', 'FUNDAMENTAL'));
      // PE_ABOVE_PEERS: context-only, no bearish vote
    }
    if (dividendYield !== null && peerAverageYield !== null) {
      // YIELD_BELOW_PEERS is anti-predictive; only vote bullish (above peers), not bearish
      if (dividendYield >= peerAverageYield) signals.push(this.signal('YIELD_ABOVE_PEERS', 'dividend yield is above peer average', 'FUNDAMENTAL'));
      // YIELD_BELOW_PEERS: context-only, no bearish vote
    }
    // FUNDAMENTALS_AVAILABLE removed: firing a positive signal merely for having data inflates all bullish scores universally

    return { score: this.categoryScore(signals.length, negativeSignals.length), signals, negativeSignals };
  }

  private shouldAttachStrategyMatches(options: Pick<SignalQuery, 'strategyCode' | 'includeStrategyMatches' | 'onlyStrategyEligible' | 'excludeNoiseFiltered' | 'hasStrategyMatch' | 'hasBlockedStrategies' | 'frameworkBackedDecisionAvailable'>) {
    return Boolean(
      options.includeStrategyMatches ||
      options.strategyCode ||
      options.onlyStrategyEligible ||
      options.excludeNoiseFiltered ||
      options.hasStrategyMatch ||
      options.hasBlockedStrategies ||
      options.frameworkBackedDecisionAvailable
    );
  }

  private signalPassesStrategyFilters(
    signal: SignalResultDto,
    options: Pick<SignalQuery, 'onlyStrategyEligible' | 'excludeNoiseFiltered' | 'hasStrategyMatch' | 'hasBlockedStrategies' | 'frameworkBackedDecisionAvailable'>
  ) {
    const matchCount = signal.strategyMatches?.length || 0;
    const blocked = signal.blockedStrategies || [];
    if (options.onlyStrategyEligible && matchCount === 0) return false;
    if (options.hasStrategyMatch && matchCount === 0) return false;
    if (options.hasBlockedStrategies && blocked.length === 0) return false;
    if (options.frameworkBackedDecisionAvailable && matchCount === 0) return false;
    if (options.excludeNoiseFiltered && matchCount === 0 && blocked.length > 0 && blocked.every((item) => item.noiseFiltersTriggered.length > 0)) return false;
    return true;
  }

  /**
   * Build the calibration overlay fields from a persisted calibration row.
   *
   * When a calibration row exists: sets calibratedScore, calibrationHorizon,
   * selectedHorizon, calibrationStatus='CALIBRATED', and calibrationSampleSize
   * from the row's overallEvaluatedSamples.
   *
   * When no row exists (null/undefined): returns calibrationStatus='UNAVAILABLE'
   * and all calibration fields null.  The raw `score` is never touched.
   *
   * Design: all fields are additive — the raw `score` is always preserved as-is.
   */
  private calibrationOverlayFor(calibRow: any): Pick<
    SignalResultDto,
    'calibratedScore' | 'calibrationHorizon' | 'selectedHorizon' | 'calibrationStatus' | 'calibrationSampleSize'
  > {
    if (!calibRow) {
      return {
        calibratedScore: null,
        calibrationHorizon: null,
        selectedHorizon: null,
        calibrationStatus: 'UNAVAILABLE',
        calibrationSampleSize: null,
      };
    }
    const horizon: string | null = calibRow.calibrationEvidence?.horizon ?? null;
    return {
      calibratedScore: typeof calibRow.calibratedScore === 'number' ? calibRow.calibratedScore : null,
      calibrationHorizon: horizon,
      selectedHorizon: horizon,
      calibrationStatus: 'CALIBRATED',
      calibrationSampleSize: typeof calibRow.overallEvaluatedSamples === 'number' ? calibRow.overallEvaluatedSamples : null,
    };
  }

  private withTriggerContract(signal: SignalResultDto, instrument?: any): SignalResultDto {
    return {
      ...signal,
      triggerContract: this.triggerContractFor(signal, instrument),
    };
  }

  private triggerContractFor(signal: SignalResultDto, instrument?: any): SignalTriggerContractDto {
    const unavailable = new Set<string>();
    const incompleteReasons: string[] = [];
    const primaryStrategy = signal.strategyMatches?.[0] || (signal.blockedStrategies?.length === 1 ? signal.blockedStrategies[0] : null);
    const assetClass = this.stringOrNull(instrument?.assetType ?? instrument?.asset_type);
    const region = this.stringOrNull(instrument?.region);
    const strategyId = primaryStrategy?.strategyCode ?? null;
    const strategyVersion = primaryStrategy?.strategyVersion ?? null;
    const sourceProvenPriceEvidence = primaryStrategy?.triggerPriceEvidence?.status === 'SOURCE_PROVEN'
      ? primaryStrategy.triggerPriceEvidence
      : null;
    const attemptedPriceEvidence = primaryStrategy?.triggerPriceEvidence ?? null;
    const triggerTimestamp = primaryStrategy
      ? sourceProvenPriceEvidence?.triggerTimestamp ?? null
      : signal.sourcePriceDate ?? signal.sourceDataDate ?? null;
    const dataQualityStatus = signal.dataQualityEligibility?.signalReadinessStatus ?? null;
    const entryRuleId = sourceProvenPriceEvidence?.entryRuleIds[0] ?? null;
    const timeframe = sourceProvenPriceEvidence?.timeframe ?? primaryStrategy?.timeframe ?? null;

    const mark = (field: string, reason: string) => {
      unavailable.add(field);
      incompleteReasons.push(`${field}: ${reason}`);
    };

    if (!signal.id) mark('signal_id', 'persisted signal id is unavailable in this DTO.');
    if (!assetClass) mark('asset_class', 'instrument asset class is unavailable from the current signal record.');
    if (!region) mark('region', 'instrument market region is unavailable from the current signal record.');
    if (!strategyId) mark('strategy_id', 'no Strategy Framework match is attached to this signal.');
    if (!strategyVersion) mark('strategy_version', 'no Strategy Framework version is attached to this signal.');
    if (!sourceProvenPriceEvidence) {
      mark('trigger_price', primaryStrategy?.triggerPriceEvidence?.unavailableReason || 'source-proven rule-trigger price is unavailable from attached Strategy Framework context.');
    }
    if (!triggerTimestamp) {
      mark('trigger_timestamp', attemptedPriceEvidence?.unavailableReason || 'source-proven trigger timestamp is unavailable from attached Strategy Framework context.');
    }
    if (!timeframe) mark('timeframe', 'rule timeframe is unavailable from attached Strategy Framework context.');
    if (!entryRuleId) mark('entry_rule_id', 'source-proven entry rule id is unavailable from attached Strategy Framework context.');
    mark('exit_rule_id', 'exit rule id is not persisted in the current signal record.');
    mark('invalidation_rule_id', 'invalidation rule id is not persisted in the current signal record.');
    if (!dataQualityStatus) mark('data_quality_status', 'Data Quality readiness snapshot is unavailable from the current signal record.');
    mark('lifecycle_status', 'trigger lifecycle state is not persisted in the current signal record.');
    mark('created_at', 'persistence created timestamp is not exposed by the current signal record.');
    mark('updated_at', 'persistence updated timestamp is not exposed by the current signal record.');

    const contractStatus = signal.auditStatus === 'LEGACY_MISSING'
      ? 'LEGACY_INCOMPLETE'
      : (unavailable.size > 0 ? 'CONTRACT_INCOMPLETE' : 'COMPLETE');

    return {
      contractVersion: 'TriggerObjectV1',
      contractStatus,
      signal_id: signal.id ?? null,
      instrument_id: signal.instrument_id,
      symbol: signal.symbol,
      asset_class: assetClass,
      region,
      strategy_id: strategyId,
      strategy_version: strategyVersion,
      trigger_type: this.triggerTypeFor(signal.direction, instrument?.derivatives_eligible ?? instrument?.derivativesEligible, signal.regimeGateSuppressed),
      trigger_price: sourceProvenPriceEvidence?.triggerPrice ?? null,
      trigger_timestamp: triggerTimestamp,
      timeframe,
      entry_rule_id: entryRuleId,
      exit_rule_id: null,
      invalidation_rule_id: null,
      reason_summary: signal.explanation,
      passed_conditions: signal.triggered_signals.map((item) => ({ code: item.code, label: item.label, category: item.category })),
      failed_conditions: signal.negative_signals.map((item) => ({ code: item.code, label: item.label, category: item.category })),
      data_quality_status: dataQualityStatus,
      lifecycle_status: null,
      created_at: null,
      updated_at: null,
      audit: {
        auditStatus: signal.auditStatus,
        generationRunId: signal.generationRunId ?? null,
        modelVersion: signal.modelVersion ?? null,
        rulesetVersion: signal.rulesetVersion ?? null,
      },
      trigger_price_evidence: this.toTriggerPriceEvidenceDto(sourceProvenPriceEvidence, attemptedPriceEvidence),
      unavailable_fields: Array.from(unavailable),
      incomplete_reasons: incompleteReasons,
    };
  }

  private triggerTypeFor(direction: SignalDirection, derivativesEligible?: boolean | null, regimeGateSuppressed?: boolean): SignalTriggerType {
    if (direction === 'BULLISH') return 'bullish_entry_trigger';
    if (direction === 'BEARISH') {
      // Short entries require F&O eligibility; cash-only stocks cannot be shorted — classify as risk_warning.
      // Additionally: when the regime gate suppressed this short (RISK_ON regime), force risk_warning
      // even for F&O-eligible names — tradable short is not appropriate contra-trend.
      if (regimeGateSuppressed === true) return 'risk_warning';
      return derivativesEligible === true ? 'bearish_trigger' : 'risk_warning';
    }
    return 'risk_warning';
  }

  private toTriggerPriceEvidenceDto(sourceProven: SignalTriggerPriceEvidence | null, attempted: SignalTriggerPriceEvidence | null) {
    const evidence = sourceProven ?? attempted;
    return {
      status: evidence?.status ?? 'UNAVAILABLE',
      source_module: evidence?.status === 'SOURCE_PROVEN' ? evidence.sourceModule : null,
      source_field: evidence?.status === 'SOURCE_PROVEN' ? evidence.sourceField : null,
      source_timestamp: evidence?.status === 'SOURCE_PROVEN' ? evidence.triggerTimestamp : null,
      strategy_id: evidence?.strategyCode ?? null,
      strategy_version: evidence?.strategyVersion ?? null,
      timeframe: evidence?.timeframe ?? null,
      entry_rule_ids: evidence?.entryRuleIds ?? [],
      compatibility_only: evidence?.compatibilityOnly ?? true,
      unavailable_reason: evidence?.status === 'UNAVAILABLE' ? evidence.unavailableReason : undefined,
    };
  }

  private stringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private async attachStrategyMatches(
    signal: SignalResultDto,
    prices: SignalPricePoint[],
    instrument: any,
    options: Pick<SignalRunRequest, 'strategyCode' | 'includeStrategyMatches' | 'onlyStrategyEligible' | 'excludeNoiseFiltered'>,
    ratingCache = new Map<string, Promise<StrategyPerformanceSummaryDto | null>>()
  ): Promise<SignalResultDto> {
    const context = this.strategyContextForSignal(signal, prices, instrument);
    const strategyMatches: SignalStrategyMatchSummary[] = [];
    const blockedStrategies: SignalBlockedStrategySummary[] = [];
    let evaluations: StrategyFrameworkContextEvaluation[];

    try {
      evaluations = await this.evaluateStrategyContext(context, options.strategyCode);
    } catch (error: any) {
      blockedStrategies.push({
        strategyCode: options.strategyCode || 'UNKNOWN',
        strategyName: undefined,
        strategyVersion: 'UNKNOWN',
        blockers: ['Strategy Framework matching failed.'],
        warnings: [],
        dataGaps: [error?.message || 'Strategy Framework evaluation unavailable.'],
        noiseFiltersTriggered: [],
        reason: 'Strategy Framework matching failed.',
      });
      return { ...signal, strategyMatches, blockedStrategies };
    }

    for (const evaluation of evaluations) {
      const strategy = evaluation.definition;
      try {
        const result = evaluation.result;
        const rating = await this.latestStrategyPerformance(strategy.code, context.region || 'IN', context.assetType || 'STOCK', ratingCache);
        if (result.eligibleForSignalGeneration && result.blockers.length === 0) strategyMatches.push(this.summarizeMatch(result, strategy, rating, context));
        else blockedStrategies.push(this.summarizeBlocked(result, strategy, context));
      } catch (error: any) {
        blockedStrategies.push({
          strategyCode: strategy.code || options.strategyCode || 'UNKNOWN',
          strategyName: strategy.name,
          strategyVersion: strategy.version || 'UNKNOWN',
          blockers: ['Strategy Framework matching failed.'],
          warnings: [],
          dataGaps: [error?.message || 'Strategy Framework evaluation unavailable.'],
          noiseFiltersTriggered: [],
          reason: 'Strategy Framework matching failed.',
          strategyDefinitionSource: strategy.definitionSource ?? null,
          strategyDefinitionDrift: strategy.definitionDrift ?? [],
        });
      }
    }

    return { ...signal, strategyMatches, blockedStrategies };
  }

  private evaluateStrategyContext(context: StrategyContext, strategyCode?: string): Promise<StrategyFrameworkContextEvaluation[]> {
    const service = this.getStrategyFrameworkEvaluationService();
    return service.evaluateContextWithDefinitions!(context, strategyCode);
  }

  private withPersistedStrategyContext(signal: SignalResultDto, instrument: any, marketContext: any | null, smartMoney: any | null): SignalResultDto {
    const sector = signal.sector || instrument?.sector || null;
    const sectorContext = sector && marketContext
      ? [...(marketContext.topSectors || []), ...(marketContext.weakSectors || [])].find((item: any) => item.sector === sector)
      : null;
    return {
      ...signal,
      marketGate: (signal as any).marketGate ?? this.marketGateFromPersistedContext(marketContext),
      marketRegime: (signal as any).marketRegime ?? marketContext?.regime?.regime ?? null,
      sectorLeadership: (signal as any).sectorLeadership ?? sectorContext?.leadershipStatus ?? null,
      sectorRelativeStrengthScore: (signal as any).sectorRelativeStrengthScore ?? sectorContext?.relativeStrengthScore ?? null,
      smartMoneyStatus: (signal as any).smartMoneyStatus ?? smartMoney?.status ?? null,
      smartMoneyScore: (signal as any).smartMoneyScore ?? smartMoney?.smartMoneyScore ?? null,
    } as SignalResultDto;
  }

  /**
   * Derives a marketGate from a persisted market-context summary.
   *
   * Thresholds are sourced exclusively from capital-posture.types.ts (Capital Posture
   * is the single source of truth for regime/breadth gate thresholds).
   *
   *   OPEN      ← RISK_ON AND breadth ≥ BREADTH_WEAK_THRESHOLD (0.40)
   *   CLOSED    ← RISK_OFF OR breadth < BREADTH_VERY_WEAK_THRESHOLD (0.25)
   *   SELECTIVE ← everything else (NEUTRAL / weak-breadth RISK_ON)
   *   UNKNOWN   ← no regime data
   */
  private marketGateFromPersistedContext(marketContext: any | null): 'OPEN' | 'SELECTIVE' | 'CLOSED' | 'UNKNOWN' {
    const regime = marketContext?.regime?.regime;
    const breadthAbove50 = marketContext?.breadth?.percentAboveSma50;
    if (regime === 'RISK_ON' && (breadthAbove50 ?? 0) >= BREADTH_WEAK_THRESHOLD) return 'OPEN';
    if (regime === 'RISK_OFF' || (breadthAbove50 ?? 1) < BREADTH_VERY_WEAK_THRESHOLD) return 'CLOSED';
    if (regime) return 'SELECTIVE';
    return 'UNKNOWN';
  }

  private async latestPersistedMarketSummary(region?: string | null): Promise<any | null> {
    const service = this.marketContextService || this.defaultMarketContextService();
    if (typeof service.latestPersistedSummary === 'function') {
      return service.latestPersistedSummary(region || undefined).catch(() => null);
    }
    return null;
  }

  private async latestPersistedSmartMoney(instrumentIds: string[]): Promise<Map<string, any>> {
    const service = this.smartMoneyService || this.defaultSmartMoneyService();
    if (typeof service.latestPersistedStocks !== 'function') return new Map();
    const rows = await service.latestPersistedStocks(instrumentIds, '3M').catch(() => []);
    return new Map((Array.isArray(rows) ? rows : []).map((row: any) => [row.instrumentId, row]));
  }

  private defaultMarketContextService(): any {
    if (process.env.NODE_ENV === 'test') return {};
    try {
      const { MarketContextIntelligenceService } = require('../market-context-intelligence') as typeof import('../market-context-intelligence');
      return new MarketContextIntelligenceService();
    } catch {
      return {};
    }
  }

  private defaultSmartMoneyService(): any {
    if (process.env.NODE_ENV === 'test') return {};
    try {
      const { SmartMoneyIntelligenceService } = require('../smart-money-intelligence') as typeof import('../smart-money-intelligence');
      return new SmartMoneyIntelligenceService();
    } catch {
      return {};
    }
  }

  private strategyContextForSignal(signal: SignalResultDto, prices: SignalPricePoint[], instrument: any): StrategyContext {
    const closes = prices.map((price) => price.adjusted_close);
    return {
      instrumentId: signal.instrument_id,
      symbol: signal.symbol,
      companyName: signal.company_name,
      assetType: instrument?.assetType || instrument?.asset_type || 'STOCK',
      region: this.canonicalRegion(instrument?.region || signal.country),
      exchange: instrument?.exchange ?? null,
      sector: signal.sector,
      country: signal.country,
      latestPrice: signal.currentPrice ?? prices[0]?.adjusted_close ?? null,
      previousClose: signal.previousClose ?? prices[1]?.adjusted_close ?? null,
      prices,
      bars: prices.map((price) => ({
        date: price.date,
        close: price.adjusted_close,
        volume: price.volume,
      })),
      sma50: this.sma(prices, 50),
      sma200: this.sma(prices, 200),
      rsi: this.rsi(prices, 14),
      return20d: this.returnAtOffset(prices, 20),
      high52Week: this.periodHigh(prices, 252),
      low52Week: this.periodLow(prices, 252),
      volatility: this.stddev(closes.slice(0, 63)),
      averageVolume20: this.average(prices.slice(1, 21).map((price) => price.volume).filter((value): value is number => typeof value === 'number')),
      rawSignal: signal,
      dataQuality: signal.dataQualityEligibility ? {
        signalReadinessStatus: signal.dataQualityEligibility.signalReadinessStatus ?? null,
        coverageStatus: signal.dataQualityEligibility.coverageStatus ?? null,
        liquidityStatus: signal.dataQualityEligibility.liquidityStatus ?? null,
        eligibleForSignals: signal.dataQualityEligibility.eligible === true,
        eligibleForBacktesting: prices.length >= 252,
      } : null,
      marketGate: (signal as any).marketGate ?? (signal as any).marketContext?.marketGate ?? 'UNKNOWN',
      marketRegime: (signal as any).marketRegime ?? (signal as any).marketContext?.marketRegime ?? null,
      sectorLeadership: (signal as any).sectorLeadership ?? null,
      sectorRelativeStrengthScore: (signal as any).sectorRelativeStrengthScore ?? null,
      smartMoneyStatus: (signal as any).smartMoneyStatus ?? null,
      smartMoneyScore: (signal as any).smartMoneyScore ?? null,
    };
  }

  private summarizeMatch(result: StrategySignalOutput, strategy: StrategyDefinition, rating: StrategyPerformanceSummaryDto | null, context: StrategyContext): SignalStrategyMatchSummary {
    return {
      strategyCode: result.strategyCode,
      strategyName: strategy.name,
      strategyVersion: result.strategyVersion,
      decision: result.decision,
      direction: result.direction,
      score: result.score,
      confidence: result.confidence,
      reasons: result.reasons,
      entryRulesPassed: result.entryRulesPassed,
      timeframe: strategy.timeframe ?? null,
      triggerPriceEvidence: this.triggerPriceEvidenceFor(result, strategy, context),
      readinessLabel: rating?.readinessLabel ?? strategy.readinessLabel ?? null,
      ratingGrade: rating?.ratingGrade ?? null,
      strategyDefinitionSource: strategy.definitionSource ?? null,
      strategyDefinitionDrift: strategy.definitionDrift ?? [],
    };
  }

  private triggerPriceEvidenceFor(result: StrategySignalOutput, strategy: { timeframe?: string | null; category?: string | null }, context: StrategyContext): SignalTriggerPriceEvidence {
    const timeframe = strategy.timeframe ?? null;
    const latestPricePoint = context.prices?.[0] ?? null;
    const signalSourceDate = context.rawSignal?.sourcePriceDate ?? context.rawSignal?.sourceDataDate ?? null;
    const triggerTimestamp = latestPricePoint?.date ?? null;
    const triggerPrice = latestPricePoint?.adjusted_close ?? null;
    const entryRuleIds = result.entryRulesPassed.filter(Boolean);
    const missingReasons: string[] = [];
    if (strategy.category !== 'ENTRY') missingReasons.push(`Strategy category is ${strategy.category || 'UNKNOWN'}, not ENTRY.`);
    if (result.direction !== 'BULLISH') missingReasons.push(`Strategy direction is ${result.direction}, not BULLISH.`);
    if (typeof triggerPrice !== 'number' || !Number.isFinite(triggerPrice)) missingReasons.push('Source price row adjusted close is unavailable.');
    if (!triggerTimestamp) missingReasons.push('Local source price row timestamp is unavailable.');
    if (triggerTimestamp && signalSourceDate && !this.sameUtcDay(triggerTimestamp, signalSourceDate)) {
      missingReasons.push('Latest source price row does not match the signal source price date.');
    }
    if (entryRuleIds.length === 0) missingReasons.push('No passed entry rule id is available.');
    if (!timeframe) missingReasons.push('Strategy timeframe is unavailable.');

    if (missingReasons.length > 0) {
      return {
        status: 'UNAVAILABLE',
        triggerPrice: null,
        triggerTimestamp: null,
        sourceModule: 'signal-generation-engine',
        sourceField: null,
        strategyCode: result.strategyCode,
        strategyVersion: result.strategyVersion,
        timeframe,
        entryRuleIds,
        compatibilityOnly: true,
        unavailableReason: missingReasons.join(' '),
      };
    }

    return {
      status: 'SOURCE_PROVEN',
      triggerPrice: triggerPrice!,
      triggerTimestamp,
      sourceModule: 'signal-generation-engine',
      sourceField: 'strategyContext.prices[0].adjusted_close',
      strategyCode: result.strategyCode,
      strategyVersion: result.strategyVersion,
      timeframe,
      entryRuleIds,
      compatibilityOnly: true,
    };
  }

  private sameUtcDay(left: string, right: string): boolean {
    const leftDate = new Date(left);
    const rightDate = new Date(right);
    if (!Number.isFinite(leftDate.getTime()) || !Number.isFinite(rightDate.getTime())) return false;
    return leftDate.toISOString().slice(0, 10) === rightDate.toISOString().slice(0, 10);
  }

  private summarizeBlocked(
    result: StrategySignalOutput,
    strategy: StrategyDefinition,
    context: StrategyContext
  ): SignalBlockedStrategySummary {
    const reason = result.blockers[0] || result.noiseFiltersTriggered[0] || result.dataGaps[0] || result.warnings[0] || 'Strategy conditions were not met.';
    return {
      strategyCode: result.strategyCode,
      strategyName: strategy.name,
      strategyVersion: result.strategyVersion,
      timeframe: strategy.timeframe ?? null,
      category: strategy.category ?? null,
      blockers: result.blockers,
      warnings: result.warnings,
      dataGaps: result.dataGaps,
      noiseFiltersTriggered: result.noiseFiltersTriggered,
      reason,
      triggerPriceEvidence: this.triggerPriceEvidenceFor(result, strategy, context),
      strategyDefinitionSource: strategy.definitionSource ?? null,
      strategyDefinitionDrift: strategy.definitionDrift ?? [],
    };
  }

  private latestStrategyPerformance(
    strategyCode: string,
    region: string,
    assetType: string,
    cache: Map<string, Promise<StrategyPerformanceSummaryDto | null>>
  ) {
    const key = `${strategyCode}|${region}|${assetType}`;
    if (!cache.has(key)) {
      const service = this.getStrategyFrameworkPerformanceService();
      cache.set(key, service.performance!(strategyCode, { region, assetType }).then((summaries) => summaries[0] || null).catch(() => null));
    }
    return cache.get(key)!;
  }

  private getStrategyFrameworkEvaluationService(): Required<Pick<StrategyFrameworkSignalGenerationService, 'evaluateContextWithDefinitions'>> {
    const service = this.strategyFrameworkServiceWithEvaluation()
      ?? this.defaultStrategyFrameworkService();
    if (typeof service.evaluateContextWithDefinitions !== 'function') {
      throw new Error('Strategy Framework persisted definition evaluation contract is unavailable.');
    }
    return service as Required<Pick<StrategyFrameworkSignalGenerationService, 'evaluateContextWithDefinitions'>>;
  }

  private getStrategyFrameworkPerformanceService(): Required<Pick<StrategyFrameworkSignalGenerationService, 'performance'>> {
    const service = this.strategyFrameworkServiceWithPerformance()
      ?? this.defaultStrategyFrameworkService();
    if (typeof service.performance !== 'function') {
      throw new Error('Strategy Framework performance contract is unavailable.');
    }
    return service as Required<Pick<StrategyFrameworkSignalGenerationService, 'performance'>>;
  }

  private strategyFrameworkServiceWithEvaluation(): StrategyFrameworkSignalGenerationService | null {
    if (this.hasStrategyEvaluationContract(this.strategyFrameworkServiceOrLegacyRegistry)) {
      return this.strategyFrameworkServiceOrLegacyRegistry;
    }
    if (this.hasStrategyEvaluationContract(this.strategyFrameworkService)) return this.strategyFrameworkService;
    return null;
  }

  private strategyFrameworkServiceWithPerformance(): StrategyFrameworkSignalGenerationService | null {
    if (this.hasStrategyPerformanceContract(this.strategyFrameworkServiceOrLegacyRegistry)) {
      return this.strategyFrameworkServiceOrLegacyRegistry;
    }
    if (this.hasStrategyPerformanceContract(this.strategyFrameworkService)) return this.strategyFrameworkService;
    return null;
  }

  private hasStrategyEvaluationContract(value: unknown): value is StrategyFrameworkSignalGenerationService {
    return Boolean(value && typeof (value as StrategyFrameworkSignalGenerationService).evaluateContextWithDefinitions === 'function');
  }

  private hasStrategyPerformanceContract(value: unknown): value is StrategyFrameworkSignalGenerationService {
    return Boolean(value && typeof (value as StrategyFrameworkSignalGenerationService).performance === 'function');
  }

  private defaultStrategyFrameworkService(): StrategyFrameworkSignalGenerationService {
    if (this.defaultStrategyFrameworkServiceInstance) return this.defaultStrategyFrameworkServiceInstance;
    const { StrategyFrameworkService } = require('../strategy-framework/strategy-framework.service') as typeof import('../strategy-framework/strategy-framework.service');
    this.defaultStrategyFrameworkServiceInstance = new StrategyFrameworkService();
    return this.defaultStrategyFrameworkServiceInstance;
  }

  /**
   * Lazy-require default for the regime gate provider.
   *
   * Importing CapitalPostureService statically would create a risk of circular
   * module-graph issues since the module tree is large; the lazy-require pattern
   * (identical to SignalOutcomeStalenessInvalidator in market-data-foundation)
   * defers the require to the first actual call.
   *
   * Returns null when `capitalPostureService` was explicitly set to null (opt-out).
   */
  private defaultCapitalPostureService(): RegimeGateProvider | null {
    // Explicit null → caller opted out of regime gating
    if (this.capitalPostureService === null) return null;
    if (this.capitalPostureService !== undefined) return this.capitalPostureService;
    if (this.defaultCapitalPostureServiceInstance) return this.defaultCapitalPostureServiceInstance;
    const { CapitalPostureService } = require('../market-context-intelligence/capital-posture.service') as typeof import('../market-context-intelligence/capital-posture.service');
    this.defaultCapitalPostureServiceInstance = new CapitalPostureService();
    return this.defaultCapitalPostureServiceInstance;
  }

  /**
   * Resolves the calibration reader.
   *
   * When explicitly provided (including null to opt out), that value is used.
   * When omitted from the constructor, the production default
   * (SignalCalibrationEngineRepository) is lazy-required to avoid a static
   * circular import: signal-calibration-engine imports signal-generation-engine,
   * so a static import of the calibration repository here would create a
   * load-time cycle.  Null is returned when the require fails (e.g. test stubs).
   */
  private resolvedCalibrationReader(): CalibrationPersistedReader | null {
    if (this.calibrationReader === null) return null;
    if (this.calibrationReader !== undefined) return this.calibrationReader;
    if (this.defaultCalibrationReaderInstance) return this.defaultCalibrationReaderInstance;
    try {
      const { SignalCalibrationEngineRepository } = require('../signal-calibration-engine/signal-calibration-engine.repository') as typeof import('../signal-calibration-engine/signal-calibration-engine.repository');
      this.defaultCalibrationReaderInstance = new SignalCalibrationEngineRepository();
      return this.defaultCalibrationReaderInstance;
    } catch {
      return null;
    }
  }

  /**
   * Applies the regime gate to a bearish signal.
   *
   * Rules:
   *  1. Gate is off (REGIME_GATE_SHORTS_ENABLED=false) → pass through unchanged.
   *  2. asOfDate is set (historical backfill) → skip regime read entirely (no persisted
   *     snapshot for past dates); attach unavailable note and pass through unchanged.
   *  3. Gate provider returns null (no persisted snapshot for today) → same: pass through
   *     with unavailable note.  NEVER fabricate a regime.
   *  4. contextualShortsOnly=true (RISK_OFF or weak-breadth NEUTRAL) → allow; the
   *     existing triggerTypeFor result stands (F&O → bearish_trigger, cash → risk_warning).
   *  5. contextualShortsOnly=false (RISK_ON) → suppress: force triggerType to risk_warning
   *     and lower confidence one notch.  Signal is KEPT — still visible as risk_warning/avoid
   *     so the explainability note surfaces in the UI.
   *  6. Long signals: untouched.
   *  7. Cash-bearish signals: already risk_warning from triggerTypeFor; gate never promotes
   *     them, only ever forces F&O names to risk_warning when RISK_ON.
   *
   * Returns an annotation object that is merged into warnings[].
   */
  private async applyRegimeGateToShort(
    direction: SignalDirection,
    derivativesEligible: boolean | null | undefined,
    region: string,
    asOfDate: Date | null,
    confidence: SignalConfidence,
  ): Promise<{
    regimeGateSuppressed: boolean;
    regimeGateNote: string | null;
    adjustedConfidence: SignalConfidence;
  }> {
    // Only gate bearish signals
    if (direction !== 'BEARISH') {
      return { regimeGateSuppressed: false, regimeGateNote: null, adjustedConfidence: confidence };
    }

    // Toggle — gate entirely disabled (REGIME_GATE_SHORTS_ENABLED=false OR explicit null injection)
    if (!REGIME_GATE_SHORTS_ENABLED || this.capitalPostureService === null) {
      return { regimeGateSuppressed: false, regimeGateNote: null, adjustedConfidence: confidence };
    }

    // Historical / backfill runs: regime snapshot for past dates does not exist —
    // do NOT gate.  Attach a note so the record is transparent.
    if (asOfDate) {
      return {
        regimeGateSuppressed: false,
        regimeGateNote: 'Regime context unavailable for as-of date (historical/backfill run); short signal passes through unmodified.',
        adjustedConfidence: confidence,
      };
    }

    // Resolve regime gate from the provider (injected or lazily defaulted)
    let gate: Awaited<ReturnType<RegimeGateProvider['regimeGate']>>;
    try {
      const provider = this.defaultCapitalPostureService();
      gate = provider ? await provider.regimeGate(region) : null;
    } catch {
      // Best-effort — a regime-gate failure must never fail signal generation
      gate = null;
    }

    // Provider returned null → no persisted snapshot for today.
    // Pass through with unavailable note; do NOT fabricate a regime.
    if (!gate) {
      return {
        regimeGateSuppressed: false,
        regimeGateNote: 'Regime context unavailable (no persisted market-context snapshot); short signal passes through unmodified. Regime is not fabricated.',
        adjustedConfidence: confidence,
      };
    }

    // RISK_OFF / weak-breadth NEUTRAL (contextualShortsOnly=true) → allow the short
    if (gate.contextualShortsOnly) {
      return {
        regimeGateSuppressed: false,
        regimeGateNote: gate.note,
        adjustedConfidence: confidence,
      };
    }

    // RISK_ON (contextualShortsOnly=false) → suppress tradable shorts, force to risk_warning
    // Cash-bearish names were already risk_warning from triggerTypeFor — no change needed,
    // but we still attach the suppression note for transparency.
    const isTradableShort = derivativesEligible === true;
    const suppressionNote = `Short suppressed: market regime is ${gate.posture} (contextualShortsOnly=false). Shorts are contra-trend in the current regime; only contextually sensible in RISK_OFF/weak breadth. Signal retained as risk_warning/avoid for reference.`;

    const confidenceOrder: SignalConfidence[] = ['HIGH', 'MEDIUM', 'LOW'];
    const currentIdx = confidenceOrder.indexOf(confidence);
    const adjustedConfidence: SignalConfidence = currentIdx < confidenceOrder.length - 1
      ? confidenceOrder[currentIdx + 1]
      : confidence;

    return {
      regimeGateSuppressed: isTradableShort, // only log as "suppressed" for names that would have been bearish_trigger
      regimeGateNote: suppressionNote,
      adjustedConfidence,
    };
  }

  sma(prices: SignalPricePoint[], period: number): number | null {
    if (prices.length < period) return null;
    return this.average(prices.slice(0, period).map((price) => price.adjusted_close));
  }

  rsi(prices: SignalPricePoint[], period: number): number | null {
    if (prices.length <= period) return null;

    // Fix #1 (RSI severely under-smoothed): Wilder's EMA requires a long warm-up
    // period to converge.  The previous cap of period*2+1 (29 bars for RSI-14) was
    // far too short — the EMA never stabilises, producing systematically biased RSI
    // values.  Extend the window to min(prices.length, period*10) which gives ~140
    // bars of warm-up for RSI-14, matching professional implementations.
    // RSI still returns null when there is genuinely insufficient history (< period+1).
    const windowSize = Math.min(prices.length, period * 10);
    const chronological = [...prices].slice(0, windowSize).reverse();
    if (chronological.length < period + 1) return null;

    let avgGain = 0;
    let avgLoss = 0;

    // Initial average
    for (let i = 1; i <= period; i++) {
      const change = chronological[i].adjusted_close - chronological[i - 1].adjusted_close;
      if (change >= 0) avgGain += change;
      else avgLoss += Math.abs(change);
    }
    avgGain /= period;
    avgLoss /= period;

    // Smoothing
    for (let i = period + 1; i < chronological.length; i++) {
      const change = chronological[i].adjusted_close - chronological[i - 1].adjusted_close;
      const currentGain = change >= 0 ? change : 0;
      const currentLoss = change < 0 ? Math.abs(change) : 0;
      
      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  adx(prices: SignalPricePoint[], period: number): number | null {
    // CB-11: Wilder ADX needs ~3×period bars to converge (mirrors the RSI fix at ~140 bars).
    // Previous cap of period*2+1 (=29 for period=14) was too short for stable DX smoothing.
    // Use min(prices.length, period*3) so we consume all available history up to the
    // 3× warm-up target; the null-guard below ensures we still bail on thin history.
    const warmupSize = Math.min(prices.length, period * 3);
    if (prices.length <= period * 2) return null;
    const chronological = [...prices].slice(0, warmupSize).reverse();

    let trueRanges: number[] = [];
    let plusDM: number[] = [];
    let minusDM: number[] = [];

    for (let i = 1; i < chronological.length; i++) {
      const current = chronological[i];
      const previous = chronological[i - 1];

      // CB-1: use adjusted high/low (with safe fallback to raw) so TR/DM are on the
      // same price scale as adjusted_close after a split or bonus issue.
      const curHigh  = current.adjusted_high  ?? current.high;
      const curLow   = current.adjusted_low   ?? current.low;
      const prevHigh = previous.adjusted_high ?? previous.high;
      const prevLow  = previous.adjusted_low  ?? previous.low;

      if (curHigh === null || curLow === null || prevHigh === null || prevLow === null) {
        trueRanges.push(0);
        plusDM.push(0);
        minusDM.push(0);
        continue;
      }

      const tr = Math.max(
        curHigh - curLow,
        Math.abs(curHigh - previous.adjusted_close),
        Math.abs(curLow - previous.adjusted_close)
      );
      trueRanges.push(tr);

      const upMove = curHigh - prevHigh;
      const downMove = prevLow - curLow;

      if (upMove > downMove && upMove > 0) {
        plusDM.push(upMove);
      } else {
        plusDM.push(0);
      }

      if (downMove > upMove && downMove > 0) {
        minusDM.push(downMove);
      } else {
        minusDM.push(0);
      }
    }

    if (trueRanges.length < period * 2) return null;

    let smoothedTR = trueRanges.slice(0, period).reduce((a, b) => a + b, 0);
    let smoothedPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
    let smoothedMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

    let dxArray: number[] = [];

    for (let i = period; i < trueRanges.length; i++) {
      smoothedTR = smoothedTR - (smoothedTR / period) + trueRanges[i];
      smoothedPlusDM = smoothedPlusDM - (smoothedPlusDM / period) + plusDM[i];
      smoothedMinusDM = smoothedMinusDM - (smoothedMinusDM / period) + minusDM[i];

      // Fix #4 (ADX divide-by-zero): when smoothedTR === 0 (circuit-locked / all-flat
      // bars) plusDI and minusDI blow up to Infinity, dx becomes NaN, and the fallback
      // `dx || 0` coerces NaN to 0 which (with adxVal then averaging toward 0) falsely
      // signals range-bound and mutes all SMA/momentum signals.  Guard explicitly: if
      // smoothedTR is 0 (or near-zero) push dx=0 and continue, which is the correct
      // "no directional information available" result for a locked/flat bar.
      if (smoothedTR === 0) {
        dxArray.push(0);
        continue;
      }
      const plusDI = (smoothedPlusDM / smoothedTR) * 100;
      const minusDI = (smoothedMinusDM / smoothedTR) * 100;

      const diSum = plusDI + minusDI;
      const dx = diSum === 0 ? 0 : (Math.abs(plusDI - minusDI) / diSum) * 100;
      dxArray.push(dx);
    }

    if (dxArray.length < period) return null;

    let adxVal = dxArray.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < dxArray.length; i++) {
      adxVal = (adxVal * (period - 1) + dxArray[i]) / period;
    }

    return adxVal;
  }

  atr(prices: SignalPricePoint[], period: number): number | null {
    if (prices.length <= period) return null;
    const chronological = [...prices].slice(0, period * 2 + 1).reverse();
    if (chronological.length < period + 1) return null;

    let trueRanges: number[] = [];
    for (let i = 1; i < chronological.length; i++) {
      const current = chronological[i];
      const previous = chronological[i - 1];
      // CB-1: use adjusted high/low (safe fallback to raw) so ATR stays on the same
      // price scale as adjusted_close after a corporate action (split / bonus).
      // Mixing raw high/low with adjusted_close overstates TR on the ex-date bar.
      const curHigh = current.adjusted_high  ?? current.high;
      const curLow  = current.adjusted_low   ?? current.low;
      if (curHigh === null || curLow === null) {
        trueRanges.push(0);
        continue;
      }
      const tr = Math.max(
        curHigh - curLow,
        Math.abs(curHigh - previous.adjusted_close),
        Math.abs(curLow  - previous.adjusted_close)
      );
      trueRanges.push(tr);
    }

    if (trueRanges.length < period) return null;
    
    let atrVal = trueRanges.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    for (let i = period; i < trueRanges.length; i++) {
      atrVal = (atrVal * (period - 1) + trueRanges[i]) / period;
    }

    return atrVal;
  }

  closePosition(price: SignalPricePoint | undefined): number | null {
    // Fix #5 (52-week range adjusted/raw mismatch): periodHigh/periodLow use
    // adjusted_close for their range calculation, so closePosition must also use
    // adjusted_close rather than raw high/low.  For split stocks the raw intraday
    // high/low reflect the pre-split price scale while adjusted_close is scaled down,
    // making (adjusted_close - raw_low) / (raw_high - raw_low) ≈ -1 or > 1.
    //
    // We compute the daily close position using adjusted_close scaled to the
    // adjusted high/low equivalents.  Since we don't store adjusted high/low
    // in the price point, we derive them by scaling raw high/low by the same
    // adjustment ratio used for close: adj_factor = adjusted_close / close.
    // If close is 0 (or adjusted_close equals close) we fall back to raw ratio.
    //
    // Choice: prefer adjusted throughout for consistency with periodHigh/Low.
    if (!price) return null;
    const rawClose = price.close;
    const adjClose = price.adjusted_close;
    const rawHigh = price.high;
    const rawLow = price.low;
    if (rawHigh === null || rawLow === null) return null;

    let adjHigh: number;
    let adjLow: number;
    if (rawClose > 0 && Number.isFinite(rawClose) && Number.isFinite(adjClose)) {
      const adjFactor = adjClose / rawClose;
      adjHigh = rawHigh * adjFactor;
      adjLow  = rawLow  * adjFactor;
    } else {
      adjHigh = rawHigh;
      adjLow  = rawLow;
    }

    if (adjHigh === adjLow) return null;
    return (adjClose - adjLow) / (adjHigh - adjLow);
  }

  periodHigh(prices: SignalPricePoint[], period: number): number | null {
    const values = prices.slice(0, period).map((price) => price.adjusted_close);
    return values.length > 0 ? Math.max(...values) : null;
  }

  periodLow(prices: SignalPricePoint[], period: number): number | null {
    const values = prices.slice(0, period).map((price) => price.adjusted_close);
    return values.length > 0 ? Math.min(...values) : null;
  }

  /**
   * v3 Evidence-Scaled Conviction Gradient
   *
   * Replaces the plain weighted-average-×100 formula that compressed all scores into
   * a 27-76 band with no dynamic range. The new formula:
   *
   *   rawLean     = weighted average of category scores in [0,1]
   *   displacement = rawLean - 0.5   ∈ [-0.5, +0.5]
   *   evidenceFactor = EVIDENCE_COUNT_WEIGHT  * (1 - exp(-totalAligningSignals / EVIDENCE_SATURATION_COUNT))
   *                  + EVIDENCE_AGREEMENT_WEIGHT * agreementFraction
   *   score = clamp(round(50 + displacement × 100 × SPREAD_GAIN × evidenceFactor), 0, 100)
   *
   * evidenceFactor components:
   *   Count component: saturates with diminishing returns around EVIDENCE_SATURATION_COUNT total
   *     signals that are aligned with the dominant direction (bullish or bearish).
   *   Agreement component: rewards cross-category alignment. All three categories leaning
   *     the same way → near 1.0; two of three → ~0.7; categories split/conflicting → EVIDENCE_MIXED_FLOOR.
   *
   * Thin-evidence anti-inflation is preserved: a single signal in one category only raises
   * the category score to 0.75 (alpha=1), displacement stays small, and evidenceFactor
   * stays low (~0.37), so the final score only moves ~5-6 pts from 50.
   *
   * Optional params (techPos … fundNeg) can be omitted by legacy callers (defaults to 0)
   * — they will receive the old unscaled result (all-zero counts → evidenceFactor=0 → score=50).
   * Direct callers (generateForInstrument) always pass all counts.
   */
  compositeScore(
    technical: number, momentum: number, fundamentals: number,
    techPos = 0, techNeg = 0,
    momPos  = 0, momNeg  = 0,
    fundPos = 0, fundNeg = 0,
  ): number {
    // Step 1: raw weighted lean in [0,1]
    const rawLean = technical * TECHNICAL_WEIGHT + momentum * MOMENTUM_WEIGHT + fundamentals * FUNDAMENTAL_WEIGHT;
    const displacement = rawLean - 0.5; // ∈ [-0.5, +0.5]

    // Step 2: determine dominant direction and count aligning signals
    const bullish = displacement >= 0;
    const techAlign  = bullish ? techPos  : techNeg;
    const momAlign   = bullish ? momPos   : momNeg;
    const fundAlign  = bullish ? fundPos  : fundNeg;
    const totalAligning = techAlign + momAlign + fundAlign;

    // Count component: exponential saturation
    const countComponent = 1 - Math.exp(-totalAligning / EVIDENCE_SATURATION_COUNT);

    // Agreement component: fraction of the three categories that are leaning the same way
    // A category is "leaning" the dominant direction if its raw score > 0.5 (bull) or < 0.5 (bear)
    const techLeans  = bullish ? technical  > 0.5 : technical  < 0.5;
    const momLeans   = bullish ? momentum   > 0.5 : momentum   < 0.5;
    const fundLeans  = bullish ? fundamentals > 0.5 : fundamentals < 0.5;
    const agreeing   = (techLeans ? 1 : 0) + (momLeans ? 1 : 0) + (fundLeans ? 1 : 0);
    // 3/3 → 1.0, 2/3 → ~0.67, 1/3 or 0/3 → EVIDENCE_MIXED_FLOOR
    const rawAgreement = agreeing / 3;
    const agreementFraction = rawAgreement < (EVIDENCE_MIXED_FLOOR) ? EVIDENCE_MIXED_FLOOR : rawAgreement;

    // evidenceFactor ∈ [~0, 1]
    const evidenceFactor =
      EVIDENCE_COUNT_WEIGHT  * countComponent +
      EVIDENCE_AGREEMENT_WEIGHT * agreementFraction;

    // Step 3: scale displacement and add back to 50
    const raw = 50 + displacement * 100 * SCORE_SPREAD_GAIN * evidenceFactor;
    return Math.min(100, Math.max(0, Math.round(raw)));
  }

  directionForScore(score: number): SignalDirection {
    // v3 cuts: deadband [41-59] keeps NEUTRAL meaningful given the wider spread.
    // BULLISH if score >= 60, BEARISH if score <= 40, else NEUTRAL.
    // Rationale: synthetic distribution shows single-category-lean setups cluster
    // in 45-59 (NEUTRAL), multi-category-aligned bullish starts at ~62-65,
    // multi-category-aligned bearish ends at ~35-38. A 20-pt deadband (41-59)
    // avoids flip-flopping on thin mixed evidence.
    if (score >= DIRECTION_BULLISH_THRESHOLD) return 'BULLISH';
    if (score <= DIRECTION_BEARISH_THRESHOLD) return 'BEARISH';
    return 'NEUTRAL';
  }

  explain(direction: SignalDirection, triggeredSignals: SignalItem[], negativeSignals: SignalItem[], deliveryEvidence?: string | null): string {
    const primary = direction === 'BEARISH' ? negativeSignals : triggeredSignals;
    const fallback = direction === 'BEARISH' ? triggeredSignals : negativeSignals;
    const reasons = (primary.length > 0 ? primary : fallback).slice(0, 4).map((signal) => signal.label);
    const base = reasons.length === 0
      ? `${direction} because there is not enough market data for a strong signal.`
      : `${direction.charAt(0)}${direction.slice(1).toLowerCase()} because ${this.joinReasons(reasons)}.`;
    // Append delivery evidence phrase when present (e.g. "Delivery 62% (high conviction).")
    if (deliveryEvidence) return `${base} ${deliveryEvidence}`;
    return base;
  }

  /**
   * Build a short delivery% evidence phrase for the signal explanation.
   * Returns null when delivery data is absent (never fabricate).
   *
   * Thresholds are intentionally coarse / conservative:
   *   >= 60%  → "high conviction" (strong positional/institutional demand)
   *   >= 40%  → "above-average delivery" (meaningful real interest)
   *   < 20%   → "intraday churn" (volume dominated by day traders, weaker signal)
   *   20–39%  → no annotation (moderate; avoid noise)
   *   null    → no annotation (data absent)
   */
  buildDeliveryEvidence(deliveryPercent: number | null): string | null {
    if (deliveryPercent === null || deliveryPercent === undefined) return null;
    const pct = Math.round(deliveryPercent);
    if (pct >= 60) return `Delivery ${pct}% (high conviction).`;
    if (pct >= 40) return `Delivery ${pct}% (above-average delivery).`;
    if (pct < 20) return `Delivery ${pct}% (intraday churn, lower conviction).`;
    return null; // 20–39%: moderate, skip annotation
  }

  private async resolveRunUniverse(request: SignalRunRequest, batchSize: number, offset: number): Promise<{ instrumentIds: string[]; totalCount: number }> {
    if (request.instrumentId) return { instrumentIds: [request.instrumentId], totalCount: 1 };
    if (request.instrumentIds?.length) {
      const instrumentIds = [...new Set(request.instrumentIds.map((id) => String(id || '').trim()).filter(Boolean))];
      return { instrumentIds, totalCount: instrumentIds.length };
    }
    if (request.symbol) {
      const instruments = await this.marketDataService.listInstruments({ search: request.symbol, pageSize: 25, region: request.region, assetType: request.assetType });
      const match = instruments.instruments.find((instrument: any) => instrument.symbol === request.symbol);
      return { instrumentIds: match ? [match.id] : [], totalCount: match ? 1 : 0 };
    }
    const page = Math.floor(offset / batchSize) + 1;
    const instruments = await this.marketDataService.listInstruments({
      page,
      pageSize: batchSize,
      region: request.region,
      assetType: request.assetType,
      sector: request.sector,
      country: request.country,
    });
    return {
      instrumentIds: instruments.instruments.map((instrument: any) => instrument.id),
      totalCount: instruments.pagination?.total ?? instruments.instruments.length,
    };
  }

  private scopeFor(input: Pick<SignalQuery | SignalRunRequest, 'region' | 'assetType'>) {
    return {
      region: input.region || 'GLOBAL',
      assetType: input.assetType || 'STOCK',
    };
  }

  private normalizeUtcDay(value: Date): Date {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private async generateBatchWithConcurrency(
    instrumentIds: string[],
    request: SignalRunRequest & {
      generationRunId?: string;
      dataQualityEvaluationsByInstrumentId?: Record<string, SignalDataQualityEligibility>;
    },
    maxConcurrency: number,
    providerThrottleMs: number,
    batchContext?: SignalGenerationBatchContext
  ): Promise<Array<{ instrumentId: string; result: SignalResultDto | null; error?: string }>> {
    const results: Array<{ instrumentId: string; result: SignalResultDto | null; error?: string }> = new Array(instrumentIds.length);
    let nextIndex = 0;
    let nextStartAt = Date.now();

    const acquireStartSlot = async () => {
      if (providerThrottleMs <= 0) return;
      const now = Date.now();
      const waitMs = Math.max(0, nextStartAt - now);
      nextStartAt = Math.max(now, nextStartAt) + providerThrottleMs;
      if (waitMs > 0) await this.sleep(waitMs);
    };

    const worker = async () => {
      while (nextIndex < instrumentIds.length) {
        const index = nextIndex;
        nextIndex += 1;
        const instrumentId = instrumentIds[index];
        try {
          await acquireStartSlot();
          results[index] = { instrumentId, result: await this.generateForInstrument(instrumentId, { ...request, batchContext }) };
        } catch (error: any) {
          results[index] = { instrumentId, result: null, error: error?.message || 'signal generation failed' };
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(maxConcurrency, instrumentIds.length) }, worker));
    return results.filter(Boolean);
  }

  private async loadSignalGenerationBatchContext(
    instrumentIds: string[],
    request: Pick<SignalRunRequest, 'region' | 'assetType' | 'researchContextMode' | 'asOfDate'>
  ): Promise<SignalGenerationBatchContext | undefined> {
    if (instrumentIds.length <= 1) return undefined;
    const serviceAny = this.marketDataService as any;
    const marketScope = { region: request.region, assetType: request.assetType };
    const asOfDate = request.asOfDate ? this.normalizeUtcDay(new Date(request.asOfDate)) : undefined;
    const [instruments, priceWindows, fundamentals] = await Promise.all([
      typeof serviceAny.getInstrumentsByIds === 'function'
        ? serviceAny.getInstrumentsByIds(instrumentIds).catch(() => [])
        : Promise.resolve([]),
      typeof serviceAny.listRecentPriceWindowsByInstrumentIds === 'function'
        ? (asOfDate
          ? serviceAny.listRecentPriceWindowsByInstrumentIds(instrumentIds, SIGNAL_GENERATION_PRICE_WINDOW, marketScope, asOfDate)
          : serviceAny.listRecentPriceWindowsByInstrumentIds(instrumentIds, SIGNAL_GENERATION_PRICE_WINDOW, marketScope)
        ).catch(() => new Map())
        : Promise.resolve(new Map()),
      request.researchContextMode === 'LIGHTWEIGHT' && typeof serviceAny.storedFundamentalsByInstrumentIds === 'function'
        ? (asOfDate
          ? serviceAny.storedFundamentalsByInstrumentIds(instrumentIds, marketScope, asOfDate)
          : serviceAny.storedFundamentalsByInstrumentIds(instrumentIds, marketScope)
        ).catch(() => new Map())
        : Promise.resolve(new Map()),
    ]);
    return {
      instrumentsById: new Map((instruments as any[]).map((instrument) => [instrument.id, instrument])),
      priceWindowsByInstrumentId: priceWindows instanceof Map ? priceWindows : new Map(),
      fundamentalsByInstrumentId: fundamentals instanceof Map ? fundamentals : new Map(),
      strategyPerformanceCache: new Map(),
    };
  }

  private async getFundamentalsForGeneration(instrumentId: string, marketScope: Pick<SignalRunRequest, 'region' | 'assetType'>, useFullResearchContext: boolean, asOf?: Date) {
    let response: { records?: any[] } | null;
    if (useFullResearchContext || typeof (this.marketDataService as any).storedFundamentalsByInstrumentId !== 'function') {
      response = await this.marketDataService.fundamentalsByInstrumentId(instrumentId, marketScope);
    } else {
      response = await (this.marketDataService as any).storedFundamentalsByInstrumentId(instrumentId, marketScope);
    }
    if (!asOf || !response?.records) return response;

    // Fix #2 (Fundamentals point-in-time look-ahead):
    // NSE results are typically filed 45-60 days after period-end.  Simply filtering by
    // periodEndDate <= asOf exposes fundamentals before they were public (e.g. a Q1 result
    // with periodEnd=2023-06-30 is not public until late August 2023).
    //
    // Priority:
    //   1. If the record has an officialResultDate (populated by the board-meeting ingest,
    //      task #36), use it directly — it's the actual announcement date.
    //   2. Otherwise apply a conservative lag: periodEndDate + FUNDAMENTAL_PUBLIC_LAG_DAYS.
    //
    // Live runs (asOf undefined) are unchanged — they always see the latest filings.
    const asOfMs = asOf.getTime();
    const lagMs = FUNDAMENTAL_PUBLIC_LAG_DAYS * 24 * 60 * 60 * 1000;
    const filtered = response.records.filter((record: any) => {
      // Prefer explicit officialResultDate when available
      if (record.officialResultDate) {
        const officialDate = new Date(record.officialResultDate);
        if (Number.isFinite(officialDate.getTime())) {
          return officialDate.getTime() <= asOfMs;
        }
      }
      // Fall back to periodEndDate + conservative lag
      const periodEndDate = record.periodEndDate ? new Date(record.periodEndDate) : null;
      if (periodEndDate === null || !Number.isFinite(periodEndDate.getTime())) return false;
      return periodEndDate.getTime() + lagMs <= asOfMs;
    });
    return { ...response, records: filtered };
  }

  /**
   * Looks up the immediately-prior persisted signal for the same instrument
   * and modelVersion, then classifies the lifecycle state using the pure
   * classifyLifecycle helper.  Returns a new DTO with lifecycleState and
   * priorScore populated.
   *
   * IMPORTANT: never called for as-of/backfill runs (see generateForInstrument).
   */
  private async withLifecycleState(
    result: SignalResultDto,
    generatedDate: string,
    modelVersion: string,
  ): Promise<SignalResultDto> {
    try {
      const beforeDate = new Date(generatedDate);
      const prior = await this.repository.priorSignalForInstrument(
        result.instrument_id,
        modelVersion,
        beforeDate,
      );
      const lifecycleState = classifyLifecycle(
        prior ? { priorScore: prior.score, priorDirection: prior.direction as 'BULLISH' | 'NEUTRAL' | 'BEARISH' } : null,
        { score: result.score, direction: result.direction },
        DEFAULT_LIFECYCLE_THRESHOLDS,
      );
      return {
        ...result,
        lifecycleState,
        priorScore: prior?.score ?? null,
      };
    } catch {
      // Non-fatal: lifecycle state is optional — fall back gracefully.
      return result;
    }
  }

  private async persistSignalResult(result: SignalResultDto) {
    if (typeof (this.repository as any).createSignalResultWithStatus === 'function') {
      return (this.repository as any).createSignalResultWithStatus(result);
    }
    return {
      result: await this.repository.createSignalResult(result),
      status: 'CREATED' as const,
    };
  }

  private getDataQualityEligibilityMap(
    instrumentIds: string[],
    filtered: FilterByVerdictResult
  ): Record<string, SignalDataQualityEligibility> {
    const excluded = new Set(filtered.excludedInstrumentIds);
    const eligible = new Set(filtered.eligibleInstrumentIds);
    return Object.fromEntries(instrumentIds.map((instrumentId) => {
      const reasons = filtered.reasonsByInstrumentId[instrumentId];
      return [instrumentId, this.toEligibilitySnapshot(true, eligible.has(instrumentId), excluded.has(instrumentId), reasons)];
    }));
  }

  private dataQualityEligibilityFor(instrumentId: string, options: { useDataQualityFilter?: boolean; dataQualityEvaluationsByInstrumentId?: Record<string, SignalDataQualityEligibility> }): SignalDataQualityEligibility {
    if (!options.useDataQualityFilter) return { filterApplied: false, eligible: null };
    return options.dataQualityEvaluationsByInstrumentId?.[instrumentId] || {
      filterApplied: true,
      eligible: null,
      excludedReason: 'Data quality evaluation snapshot unavailable.',
    };
  }

  private toEligibilitySnapshot(filterApplied: boolean, eligible: boolean, excluded: boolean, reasons: string[] | undefined): SignalDataQualityEligibility {
    return {
      filterApplied,
      eligible: excluded ? false : (eligible ? true : null),
      excludedReason: excluded ? this.dataQualityExcludedReason(reasons) : undefined,
    };
  }

  private dataQualityExcludedReason(reasons: string[] | undefined): string {
    if (!reasons || reasons.length === 0) return 'Signal verdict excluded this instrument.';
    if (reasons.includes('MISSING_FUNDAMENTALS')) return 'Missing fundamentals record.';
    if (reasons.includes('SCORE_BELOW_THRESHOLD')) return 'Signal readiness score below threshold.';
    if (reasons.includes('STALE_PRICE')) return 'Stale price data.';
    if (reasons.includes('COVERAGE_UNUSABLE')) return 'Coverage is unusable.';
    if (reasons.includes('ILLIQUID')) return 'Liquidity is illiquid.';
    if (reasons.includes('INSUFFICIENT_BARS')) return 'Insufficient price bars.';
    if (reasons.includes('NO_LATEST_PRICE')) return 'No persisted eligibility record.';
    return `Signal verdict excluded this instrument (${reasons.join(', ')}).`;
  }

  private scoringInputSummary(prices: SignalPricePoint[], latestFundamental: any, strategyContextLoaded: boolean): SignalScoringInputSummary {
    return {
      priceBarsUsed: prices.length,
      latestCloseDate: prices[0]?.date ?? null,
      hasSma50: this.sma(prices, 50) !== null,
      hasSma200: this.sma(prices, 200) !== null,
      hasVolume: prices.some((price) => typeof price.volume === 'number'),
      fundamentalsAvailable: Boolean(latestFundamental),
      strategyContextLoaded,
    };
  }

  private latestDate(values: Array<string | null | undefined>): Date | null {
    const timestamps = values
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value))
      .filter((value) => Number.isFinite(value.getTime()));
    if (timestamps.length === 0) return null;
    return timestamps.reduce((latest, value) => value > latest ? value : latest, timestamps[0]);
  }

  private canonicalRegion(value?: string | null) {
    return normalizeMarketRegion(value) || 'IN';
  }

  private filtersApplied(query: SignalQuery): Record<string, unknown> {
    return Object.fromEntries(Object.entries({
      direction: query.direction,
      confidence: query.confidence,
      minScore: query.minScore,
      sector: query.sector,
      country: query.country,
      region: query.region,
      assetType: query.assetType,
      modelVersion: query.modelVersion,
      signalType: query.signalType,
      search: query.search,
      strategyCode: query.strategyCode,
      onlyStrategyEligible: query.onlyStrategyEligible,
      excludeNoiseFiltered: query.excludeNoiseFiltered,
      hasStrategyMatch: query.hasStrategyMatch,
      hasBlockedStrategies: query.hasBlockedStrategies,
      excludeSme: query.excludeSme,
      reliabilityTier: query.reliabilityTier,
      lifecycleState: query.lifecycleState,
    }).filter(([, value]) => value !== undefined && value !== ''));
  }

  private async directionCountsFor(query: SignalQuery): Promise<Record<SignalDirection, number>> {
    if (typeof (this.repository as any).directionCounts !== 'function') {
      return { BULLISH: 0, NEUTRAL: 0, BEARISH: 0 };
    }
    return (this.repository as any).directionCounts(query);
  }

  private trustedReadSignals(signals: SignalResultDto[]): SignalResultDto[] {
    return signals.filter((signal) => this.isTrustedReadSignal(signal));
  }

  private trustedReadTotal(total: number, loadedCount: number, trustedCount: number) {
    return trustedCount === loadedCount ? total : trustedCount;
  }

  private isTrustedReadSignal(signal: SignalResultDto): boolean {
    const dataQuality = signal.dataQualityEligibility;
    return signal.auditStatus === 'CURRENT'
      && dataQuality?.filterApplied === true
      && dataQuality.eligible === true
      && dataQuality.signalReadinessStatus === 'READY';
  }

  /** Returns true if the instrument belongs to the NSE SME segment. */
  private isSmeInstrument(instrument: any): boolean {
    return instrument?.catalogSource === 'NSE_SME_EQUITY_SECURITIES' ||
      instrument?.instrumentSegment === 'SME';
  }

  /**
   * Computes the reliability tier for a signal:
   * FULL  = mainboard (NSE_EQUITY_SECURITIES) AND has fundamentals AND has sector
   * PARTIAL = SME, OR missing fundamentals, OR missing sector
   */
  private computeReliabilityTier(instrument: any, latestFundamental: any): ReliabilityTier {
    const isSme = this.isSmeInstrument(instrument);
    if (isSme) return 'PARTIAL';
    const hasFundamentals = Boolean(latestFundamental);
    const hasSector = Boolean(instrument?.sector?.trim?.());
    if (hasFundamentals && hasSector) return 'FULL';
    return 'PARTIAL';
  }

  private clampInt(value: unknown, fallback: number, min: number, max: number) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(numeric)));
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private categoryScore(positive: number, negative: number): number {
    const total = positive + negative;
    if (total === 0) return 0.5;
    // Laplace add-smoothing with CATEGORY_SCORE_ALPHA=1 (reduced from v2's alpha=2).
    // alpha=1 lets a category move further from 0.5 when real evidence is present
    // while still damping thin-evidence setups toward neutral.
    // Examples (alpha=1): 1/0 → 0.75, 5/0 → 0.917, 0/5 → 0.083, 3/1 → 0.75
    return (positive + CATEGORY_SCORE_ALPHA * 0.5) / (total + CATEGORY_SCORE_ALPHA);
  }

  private confidenceFor(prices: SignalPricePoint[], fundamental: any, signalCount: number, asOf?: Date): SignalConfidence {
    // Check if the data is stale (more than 5 calendar days old relative to asOf or now)
    const latestDate = prices[0]?.date ? new Date(prices[0].date) : null;
    const anchor = asOf ?? new Date();
    const fiveDaysAgo = new Date(anchor);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5); // 5 cal days for safety margin on weekends
    const isStale = latestDate ? latestDate < fiveDaysAgo : true;

    if (prices.length >= 200 && fundamental && signalCount >= 6 && !isStale) return 'HIGH';
    // Fix #6: add !isStale guard to MEDIUM tier (mirrors HIGH tier) so stale data
    // does not receive a falsely confident MEDIUM rating.
    if (prices.length >= 50 && signalCount >= 3 && !isStale) return 'MEDIUM';
    return 'LOW';
  }

  private pushReturnSignal(value: number | null, code: string, positiveLabel: string, negativeLabel: string, signals: SignalItem[], negativeSignals: SignalItem[], bullThreshold: number, bearThreshold: number) {
    if (value === null) return;
    if (value >= bullThreshold) {
      signals.push(this.signal(code, positiveLabel, 'MOMENTUM'));
    } else if (value <= bearThreshold) {
      negativeSignals.push(this.signal(`${code}_NEGATIVE`, negativeLabel, 'MOMENTUM'));
    }
    // values in the neutral band (bearThreshold < value < bullThreshold) produce no signal
  }

  private returnAtOffset(prices: SignalPricePoint[], offset: number): number | null {
    if (prices.length <= offset) return null;
    const oldValue = prices[offset].adjusted_close;
    if (oldValue <= 0) return null;
    return (prices[0].adjusted_close - oldValue) / oldValue;
  }

  private toPricePoints(prices: any[]): SignalPricePoint[] {
    return prices
      // Fix #12 (adjustedClose null substitution): filter out bars where
      // adjusted_close is null/undefined/non-numeric BEFORE the map step, so
      // we never silently fall back to raw close inside an adjusted series.
      // A mixed series (some bars adjusted, some raw) corrupts all indicators.
      .filter((price) => {
        const ac = price.adjusted_close;
        return ac !== null && ac !== undefined && Number.isFinite(Number(ac));
      })
      .map((price) => ({
        date: typeof price.date === 'string' ? price.date : new Date(price.date).toISOString(),
        open: this.optionalNumber(price.open),
        high: this.optionalNumber(price.high),
        low: this.optionalNumber(price.low),
        close: Number(price.close),
        adjusted_close: Number(price.adjusted_close),
        volume: price.volume !== null && price.volume !== undefined ? Number(price.volume) : null,
        // CB-1: pass through adjusted OHLCV from the price read layer when present.
        // Indicators use `adjusted_high ?? high`, `adjusted_low ?? low`, `adjusted_volume ?? volume`
        // so existing callers (no adjusted_h/l/v) degrade gracefully to raw values.
        adjusted_high: this.optionalNumber(price.adjusted_high),
        adjusted_low: this.optionalNumber(price.adjusted_low),
        adjusted_volume: price.adjusted_volume !== null && price.adjusted_volume !== undefined
          ? this.optionalNumber(price.adjusted_volume)
          : null,
      }))
      .filter((price) => Number.isFinite(price.adjusted_close))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private optionalNumber(value: unknown): number | null {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private signal(code: string, label: string, category: SignalItem['category']): SignalItem {
    return { code, label, category };
  }

  private joinReasons(reasons: string[]): string {
    if (reasons.length === 1) return reasons[0];
    return `${reasons.slice(0, -1).join(', ')}, and ${reasons[reasons.length - 1]}`;
  }

  private average(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private stddev(values: number[]): number | null {
    if (values.length < 2) return null;
    const avg = this.average(values) ?? 0;
    return Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / (values.length - 1));
  }

  obv(prices: SignalPricePoint[]): number[] {
    if (prices.length === 0) return [];
    const chronological = [...prices].reverse();
    let currentOBV = 0;
    const obvArray: number[] = [currentOBV];

    for (let i = 1; i < chronological.length; i++) {
      const current = chronological[i];
      const previous = chronological[i - 1];
      // CB-1: use adjusted_volume (split-factor applied) with safe fallback to raw volume.
      // After a split the raw volume reflects the post-split share count on old bars, so
      // adjusted_volume normalises the series to a comparable unit across all bars.
      const vol = current.adjusted_volume ?? current.volume;
      if (vol === null) {
        obvArray.push(currentOBV);
        continue;
      }

      if (current.adjusted_close > previous.adjusted_close) {
        currentOBV += vol;
      } else if (current.adjusted_close < previous.adjusted_close) {
        currentOBV -= vol;
      }
      obvArray.push(currentOBV);
    }
    
    return obvArray.reverse();
  }

  isObvTrendingUp(prices: SignalPricePoint[], period: number = 10): boolean {
    const obvArray = this.obv(prices);
    if (obvArray.length < period) return false;
    return obvArray[0] > obvArray[period - 1];
  }

  isObvTrendingDown(prices: SignalPricePoint[], period: number = 10): boolean {
    const obvArray = this.obv(prices);
    if (obvArray.length < period) return false;
    return obvArray[0] < obvArray[period - 1];
  }
}
