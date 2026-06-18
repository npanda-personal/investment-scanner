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
import { isTrustedReadSignal } from './signal-read-policy';
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
  SignalTriggerPriceEvidence,
} from './signal-generation-engine.types';
import { withTriggerContract } from './signal-trigger-contract';
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
import * as Indicators from './signal-indicators';
import * as Scoring from './signal-scoring';
import { average, stddev, optionalNumber as toOptionalNumber, clampInt as clampIntHelper, normalizeUtcDay as normalizeUtcDayHelper } from './signal-math';
import {
  DEFAULT_SIGNAL_SCORING_CONFIG,
  resolveSignalScoringConfig,
  SIGNAL_ENGINE_MODEL_VERSION_V4,
  SIGNAL_GENERATION_PRICE_WINDOW,
  type SignalScoringConfig,
} from './signal-scoring.config';
import { areAdjacentSessions } from '../../shared/utils/daily-change';
const MODEL_VERSION = SIGNAL_ENGINE_MODEL_VERSION_V4; // SG-9: v4 is the active engine; persist + audit under v4

// Regime-gate + fundamentals-lag policy now live in signal-scoring.config.ts and are
// resolved per market scope; these module-level aliases preserve the prior defaults
// for the run/regime/fundamentals paths until they consume the per-scope config.
const REGIME_GATE_SHORTS_ENABLED = DEFAULT_SIGNAL_SCORING_CONFIG.regimeGateShortsEnabled;
const FUNDAMENTAL_PUBLIC_LAG_DAYS = DEFAULT_SIGNAL_SCORING_CONFIG.fundamentalPublicLagDays;

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
            readinessStatusByInstrumentId: {} as Record<string, string>,
          };
        }
        warnings.push(`Signal verdict filter unavailable; trusted signal generation failed closed: ${error?.message || 'unknown error'}`);
        return {
          eligibleInstrumentIds: [] as string[],
          excludedInstrumentIds: resolvedInstrumentIds,
          reasonsByInstrumentId: {} as Record<string, any>,
          readinessStatusByInstrumentId: {} as Record<string, string>,
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
    // Resolve the per-scope scoring config (weights, guards, delivery capability,
    // fundamentals-filing lag).  SG-1: an unscoped/GLOBAL run resolves to the GLOBAL
    // profile (no NSE delivery / VIX / institutional flow — never assumes India); an
    // explicit IN/US/EU/crypto scope gets market-appropriate parameters.
    const scoringConfig = resolveSignalScoringConfig({ region: this.canonicalRegion(options.region), assetType: options.assetType, engineVersion: 'v4' });
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
        : this.getFundamentalsForGeneration(instrumentId, marketScope, useFullResearchContext, asOfDate ?? undefined, scoringConfig.fundamentalPublicLagDays),
      useFullResearchContext ? this.researchService.workbench(instrumentId, '3M') : Promise.resolve(null),
    ]);

    if (!instrument) return null;

    const prices = this.toPricePoints(pricesResponse?.prices || []);
    const latestFundamental = fundamentalsResponse?.records?.[0] || null;
    // SG-4: in batch (LIGHTWEIGHT) mode research is null, so peer valuation/strength came
    // back null and the peer votes never fired.  Fall back to region-scoped peer context
    // derived from the in-memory batch context (no extra DB calls), restoring FULL parity.
    const peerCtx = research ? null : Scoring.peerAggregates(options.batchContext, instrument);
    const peerAveragePe = typeof research?.valuation?.peer_average_pe === 'number' ? research.valuation.peer_average_pe : (peerCtx?.peerAveragePe ?? null);
    const peerAverageYield = typeof research?.valuation?.peer_average_dividend_yield === 'number' ? research.valuation.peer_average_dividend_yield : (peerCtx?.peerAverageYield ?? null);
    const relativeToPeers = typeof research?.relative_strength?.relative_to_peer_average === 'number' ? research.relative_strength.relative_to_peer_average : (peerCtx?.relativeToPeers ?? null);

    // ── Delivery% evidence (NR-1) ─────────────────────────────────────────────
    // Delivery% is an NSE-only data source.  It is gated on the resolved market
    // capability (config.hasDelivery) so non-NSE scopes (US/EU/crypto) never read or
    // annotate it.  It is additive evidence/conviction context only — it does NOT
    // alter the composite score (no overfitting).
    //   High delivery (>= 40%): positional / institutional interest → conviction note.
    //   Low delivery (< 20%): intraday churn → caution note.
    //   20-40%: moderate, no annotation (avoid noise).
    //   absent (null): no annotation (BSE-only or data gap — never fabricate).
    const deliveryPercent: number | null =
      scoringConfig.hasDelivery && typeof (pricesResponse as any)?.delivery_percent === 'number'
        ? (pricesResponse as any).delivery_percent
        : null;
    const deliveryEvidence = this.buildDeliveryEvidence(deliveryPercent);

    // Version-agnostic scoring seam (signal-scoring.scoreInstrument): runs the three
    // category evaluators once, then routes the composite through v3 (legacy count) or
    // v4 (evidence model) per scoringConfig.scoringEngineVersion.  Equity generation runs
    // v4 (engineVersion:'v4' above) and scoreOutcome.components is persisted into
    // scoringInputSummary.v4 (the audit JSON) below; the crypto lane / DEFAULT config stay v3.
    const scoreOutcome = Scoring.scoreInstrument(
      { prices, relativeToPeers, fundamental: latestFundamental, peerAveragePe, peerAverageYield },
      scoringConfig,
    );
    const { score, direction, triggeredSignals, negativeSignals, totalEvaluated } = scoreOutcome;
    const rawConfidence = this.confidenceFor(prices, latestFundamental, totalEvaluated, asOfDate ?? undefined, scoreOutcome.components?.effectiveDisplacement ?? scoreOutcome.components?.displacement ?? null);

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

    const warnings: string[] = Scoring.peerContextWarnings(options.batchContext, instrument);
    const latestDate = prices[0]?.date ? new Date(prices[0].date) : null;
    // SG-7: staleness measured relative to asOfDate (backfill) or now, via the shared seam.
    if (latestDate && Scoring.isStaleAsOf(latestDate, asOfDate)) {
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
      scoringInputSummary: this.scoringInputSummary(prices, latestFundamental, useFullResearchContext || Boolean(options.includeStrategyMatches), scoreOutcome.components),
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
          previousClose = areAdjacentSessions(prevWindow?.[1]?.date, prevWindow?.[0]?.date) ? (prevWindow?.[1]?.adjusted_close ?? null) : null;
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
      return this.withRsPercentiles(enriched.filter((signal) => this.signalPassesStrategyFilters(signal, options)), { region: options.region, assetType: options.assetType });
    } catch (error) {
      console.error('Signal enrichment failed:', error);
      return this.withRsPercentiles(signals.map(signal => ({
        ...signal,
        currentPrice: null,
        previousClose: null,
        dailyChange: null,
        dailyChangePercent: null,
        priceTimestamp: null,
      })).map((signal) => this.withTriggerContract(signal)).filter((signal) => this.signalPassesStrategyFilters(signal, options)), { region: options.region, assetType: options.assetType });
    }
  }

  /**
   * SG-3b: assign each served signal a relative-strength percentile (0–100) ranked
   * against the COHORT UNIVERSE (region/asset-scoped latest trusted scores) so it is
   * stable regardless of the page's limit/filters.  The universe read is already
   * region-isolated (SG-1) and trusted-filtered.  Falls back to ranking within the served
   * set when the universe read is empty/too small (attachRsPercentiles handles that).
   */
  private async withRsPercentiles(signals: SignalResultDto[], scope: { region?: string; assetType?: string } = {}): Promise<SignalResultDto[]> {
    let universeScores: number[] = [];
    try {
      const cohort = await this.repository.latestSignalUniverse({ region: scope.region, assetType: scope.assetType, limit: 100000, offset: 0 } as SignalQuery);
      universeScores = cohort.map((c) => (typeof c.score === 'number' ? c.score : 0));
    } catch { /* fall back to served-set ranking */ }
    return Scoring.attachRsPercentiles(signals, universeScores);
  }

  async enrichSignal(signal: SignalResultDto): Promise<SignalResultDto> {
    const enriched = await this.enrichSignals([signal]);
    return enriched[0];
  }

  // Category evaluators delegate to the pure, config-driven scoring engine
  // (signal-scoring.ts).  Config defaults to the India-equity profile so existing
  // callers (incl. the crypto lane via this.compute) are byte-compatible; the
  // generation path passes a per-scope config for market-appropriate behaviour.
  evaluateTechnical(prices: SignalPricePoint[], config: SignalScoringConfig = DEFAULT_SIGNAL_SCORING_CONFIG) {
    return Scoring.evaluateTechnical(prices, config);
  }

  evaluateMomentum(prices: SignalPricePoint[], relativeToPeers: number | null, config: SignalScoringConfig = DEFAULT_SIGNAL_SCORING_CONFIG) {
    return Scoring.evaluateMomentum(prices, relativeToPeers, config);
  }

  evaluateFundamentals(fundamental: any, peerAveragePe: number | null, peerAverageYield: number | null, config: SignalScoringConfig = DEFAULT_SIGNAL_SCORING_CONFIG) {
    return Scoring.evaluateFundamentals(fundamental, peerAveragePe, peerAverageYield, config);
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

  // Trigger-contract projection lives in the pure signal-trigger-contract module.
  private withTriggerContract(signal: SignalResultDto, instrument?: any): SignalResultDto {
    return withTriggerContract(signal, instrument);
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
    if (this.marketContextService) {
      if (typeof this.marketContextService.latestPersistedSummary === 'function') {
        return this.marketContextService.latestPersistedSummary(region || undefined).catch(() => null);
      }
      return null;
    }
    // Production default: direct persisted-read via repository — no cross-module service import.
    if (typeof this.repository.latestPersistedMarketContext !== 'function') return null;
    return this.repository.latestPersistedMarketContext(region || undefined).catch(() => null);
  }

  private async latestPersistedSmartMoney(instrumentIds: string[]): Promise<Map<string, any>> {
    if (this.smartMoneyService) {
      if (typeof this.smartMoneyService.latestPersistedStocks !== 'function') return new Map();
      const rows = await this.smartMoneyService.latestPersistedStocks(instrumentIds, '3M').catch(() => []);
      return new Map((Array.isArray(rows) ? rows : []).map((row: any) => [row.instrumentId, row]));
    }
    // Production default: direct persisted-read via repository — no cross-module service import.
    if (typeof this.repository.latestPersistedSmartMoneyStocks !== 'function') return new Map();
    return this.repository.latestPersistedSmartMoneyStocks(instrumentIds, '3M').catch(() => new Map());
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

  // Technical indicators delegate to the pure signal-indicators module.  Kept as
  // public instance methods so strategy-context building and the crypto lane keep
  // calling them unchanged.
  sma(prices: SignalPricePoint[], period: number): number | null {
    return Indicators.sma(prices, period);
  }

  rsi(prices: SignalPricePoint[], period: number): number | null {
    return Indicators.rsi(prices, period);
  }

  adx(prices: SignalPricePoint[], period: number): number | null {
    return Indicators.adx(prices, period);
  }

  atr(prices: SignalPricePoint[], period: number): number | null {
    return Indicators.atr(prices, period);
  }

  closePosition(price: SignalPricePoint | undefined): number | null {
    return Indicators.closePosition(price);
  }

  periodHigh(prices: SignalPricePoint[], period: number): number | null {
    return Indicators.periodHigh(prices, period);
  }

  periodLow(prices: SignalPricePoint[], period: number): number | null {
    return Indicators.periodLow(prices, period);
  }

  // Composite score, direction cut-points, explanation and the delivery% phrase
  // delegate to the pure scoring engine.  compositeScore takes an optional config
  // (defaults to IN-equity) so the crypto lane can pass its redistributed weights.
  compositeScore(
    technical: number, momentum: number, fundamentals: number,
    techPos = 0, techNeg = 0,
    momPos  = 0, momNeg  = 0,
    fundPos = 0, fundNeg = 0,
    config: SignalScoringConfig = DEFAULT_SIGNAL_SCORING_CONFIG,
  ): number {
    return Scoring.compositeScore(technical, momentum, fundamentals, techPos, techNeg, momPos, momNeg, fundPos, fundNeg, config);
  }

  directionForScore(score: number): SignalDirection {
    return Scoring.directionForScore(score);
  }

  explain(direction: SignalDirection, triggeredSignals: SignalItem[], negativeSignals: SignalItem[], deliveryEvidence?: string | null): string {
    return Scoring.explain(direction, triggeredSignals, negativeSignals, deliveryEvidence);
  }

  buildDeliveryEvidence(deliveryPercent: number | null): string | null {
    return Scoring.buildDeliveryEvidence(deliveryPercent);
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
    return normalizeUtcDayHelper(value);
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

  private async getFundamentalsForGeneration(instrumentId: string, marketScope: Pick<SignalRunRequest, 'region' | 'assetType'>, useFullResearchContext: boolean, asOf?: Date, publicLagDays: number = FUNDAMENTAL_PUBLIC_LAG_DAYS) {
    let response: { records?: any[] } | null;
    if (useFullResearchContext || typeof (this.marketDataService as any).storedFundamentalsByInstrumentId !== 'function') {
      response = await this.marketDataService.fundamentalsByInstrumentId(instrumentId, marketScope);
    } else {
      response = await (this.marketDataService as any).storedFundamentalsByInstrumentId(instrumentId, marketScope);
    }
    if (!asOf || !response?.records) return response;
    // SG-7: point-in-time fundamentals visibility is centralized in signal-asof.ts
    // (Fix #2). Live runs (asOf undefined) returned above — they see the latest filings.
    return { ...response, records: Scoring.filterFundamentalsAsOf(response.records, asOf, publicLagDays) };
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
      const readinessStatus = filtered.readinessStatusByInstrumentId?.[instrumentId];
      return [instrumentId, this.toEligibilitySnapshot(true, eligible.has(instrumentId), excluded.has(instrumentId), reasons, readinessStatus)];
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

  private toEligibilitySnapshot(filterApplied: boolean, eligible: boolean, excluded: boolean, reasons: string[] | undefined, signalReadinessStatus?: string): SignalDataQualityEligibility {
    return {
      filterApplied,
      eligible: excluded ? false : (eligible ? true : null),
      excludedReason: excluded ? this.dataQualityExcludedReason(reasons) : undefined,
      // Carry readiness so the persisted snapshot satisfies the trusted-read predicate
      // (signal-read-policy.ts requires signalReadinessStatus === 'READY').
      ...(signalReadinessStatus ? { signalReadinessStatus } : {}),
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

  private scoringInputSummary(prices: SignalPricePoint[], latestFundamental: any, strategyContextLoaded: boolean, v4: SignalScoringInputSummary['v4'] = null): SignalScoringInputSummary {
    return {
      priceBarsUsed: prices.length,
      latestCloseDate: prices[0]?.date ?? null,
      hasSma50: this.sma(prices, 50) !== null,
      hasSma200: this.sma(prices, 200) !== null,
      hasVolume: prices.some((price) => typeof price.volume === 'number'),
      fundamentalsAvailable: Boolean(latestFundamental),
      strategyContextLoaded, v4,
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
    return normalizeMarketRegion(value) || 'GLOBAL'; // SG-1: never default unknown region to IN (isolation)
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
    return isTrustedReadSignal(signal);
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
    return clampIntHelper(value, fallback, min, max);
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private confidenceFor(prices: SignalPricePoint[], fundamental: any, signalCount: number, asOf?: Date, displacement?: number | null): SignalConfidence {
    // Staleness anchor: 5 calendar days relative to asOf (or now). SG-6 then folds the
    // v4 conviction (displacement) into the tier via resolveConfidence; when displacement
    // is null (v3) it reproduces the legacy data-sufficiency tiers exactly.
    const latestDate = prices[0]?.date ? new Date(prices[0].date) : null;
    const isStale = Scoring.isStaleAsOf(latestDate, asOf); // SG-7 shared staleness seam
    const { resolveConfidence } = require('./signal-confidence');
    return resolveConfidence({ priceBars: prices.length, hasFundamental: Boolean(fundamental), signalCount, isStale, displacement }).confidence;
  }

  private returnAtOffset(prices: SignalPricePoint[], offset: number): number | null {
    return Indicators.returnAtOffset(prices, offset);
  }

  private toPricePoints(prices: any[]): SignalPricePoint[] {
    return prices
      // Filter out bars where adjusted_close is null/undefined/non-numeric BEFORE the
      // map step, so we never silently fall back to raw close inside an adjusted series.
      // A mixed series (some bars adjusted, some raw) corrupts all indicators.
      .filter((price) => {
        const ac = price.adjusted_close;
        return ac !== null && ac !== undefined && Number.isFinite(Number(ac));
      })
      .map((price) => ({
        date: typeof price.date === 'string' ? price.date : new Date(price.date).toISOString(),
        open: toOptionalNumber(price.open),
        high: toOptionalNumber(price.high),
        low: toOptionalNumber(price.low),
        close: Number(price.close),
        adjusted_close: Number(price.adjusted_close),
        volume: price.volume !== null && price.volume !== undefined ? Number(price.volume) : null,
        // Pass through adjusted OHLCV from the price read layer when present.  Indicators
        // use `adjusted_high ?? high`, `adjusted_low ?? low`, `adjusted_volume ?? volume`
        // so callers without adjusted_h/l/v degrade gracefully to raw values.
        adjusted_high: toOptionalNumber(price.adjusted_high),
        adjusted_low: toOptionalNumber(price.adjusted_low),
        adjusted_volume: price.adjusted_volume !== null && price.adjusted_volume !== undefined
          ? toOptionalNumber(price.adjusted_volume)
          : null,
      }))
      .filter((price) => Number.isFinite(price.adjusted_close))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private average(values: number[]): number | null {
    return average(values);
  }

  private stddev(values: number[]): number | null {
    return stddev(values);
  }

  obv(prices: SignalPricePoint[]): number[] {
    return Indicators.obv(prices);
  }

  isObvTrendingUp(prices: SignalPricePoint[], period: number = 10): boolean {
    return Indicators.isObvTrendingUp(prices, period);
  }

  isObvTrendingDown(prices: SignalPricePoint[], period: number = 10): boolean {
    return Indicators.isObvTrendingDown(prices, period);
  }
}
