import { MarketDataFoundationService } from '../market-data-foundation';
import { SignalGenerationEngineService, type SignalItem, type SignalResultDto } from '../signal-generation-engine';
import { HistoricalContextSnapshotsService } from '../historical-context-snapshots';
import { resolveMarketProfile } from '../../shared/utils/market-profile';
import { DataQualityEngineService } from '../data-quality-engine';
import { SignalQualityLabRepository } from './signal-quality-lab.repository';
import type {
  ForwardOutcome,
  NoisySignalItem,
  ParsedSignalType,
  PersistedOutcomeMetricsQuery,
  PersistedQualityMetrics,
  PricePoint,
  QualityHorizon,
  QualityMetricGroup,
  QualityQuery,
  DataQualityFilterSummary,
  EvidenceUsability,
  EvaluationDiagnostics,
  HorizonAvailabilityItem,
  HorizonAvailabilitySummary,
  QualityRecalculateRequest,
  QualityRecalculateResponse,
  QualityRecalculateWithPersistRequest,
  QualitySummary,
  ScorecardGroupBy,
  ScorecardQuery,
  ScorecardResponse,
  ScorecardSummary,
  SignalHistoryItem,
  SignalOutcomeSet,
  SignalOutcomeUpsert,
  SignalTypePerformance,
  WinRateConfidence,
} from './signal-quality-lab.types';
import {
  WIN_RATE_CONFIDENCE_HIGH_THRESHOLD,
  WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD,
} from './signal-quality-lab.types';

const HORIZON_DAYS: Record<QualityHorizon, number> = { '1D': 1, '5D': 5, '10D': 10, '20D': 20, '60D': 60 };
const ANALYSIS_SIGNAL_LIMIT = 10000;
// Noisy-signal detection recomputes outcomes from price history per signal, so it must
// NOT run over the full ANALYSIS_SIGNAL_LIMIT set (that is O(corpus) price fetches and
// made the persisted dashboard/summary path ~24s on a 20k+ signal corpus). The noisy
// rules (direction flips, stale, failed-high-score) are recent-signal concerns, so a
// bounded most-recent window is both fast and sufficient. signalHistory is generatedAt-desc.
const NOISY_SIGNAL_LIMIT = 500;

/**
 * CANONICAL score-bucket boundaries.
 *
 * This is the single authoritative definition used by:
 *   - the on-demand `scoreBucket()` helper (service)
 *   - the scorecard SQL (`scoreBucket` case in groupExpressions in the repository)
 *   - the calibration engine's `scoreBucket()` helper
 *
 * INVARIANT: these four ranges must be kept in sync across all three locations.
 */
export const SCORE_BUCKETS = [
  { label: '0-39', min: 0, max: 39 },
  { label: '40-69', min: 40, max: 69 },
  { label: '70-84', min: 70, max: 84 },
  { label: '85-100', min: 85, max: 100 },
] as const;

/**
 * Advance a date by `n` trading days, skipping Saturday (day 6) and Sunday (day 0).
 * NSE/BSE public holidays are not enumerated; the estimate may be 1-2 days early
 * around holidays. Used for best-effort diagnostic date projections.
 * Exported so utilities and diagnostics outside this class can reuse it without
 * duplication.
 */
export function addTradingDays(from: Date, tradingDays: number): Date {
  const result = new Date(from);
  let remaining = tradingDays;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const dow = result.getUTCDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return result;
}

/** Minimum number of directional outcomes needed for a group to be EVALUATED (not SMALL_SAMPLE). */
const MIN_GROUP_SAMPLES_THRESHOLD = 10;
const FLIP_THRESHOLD = 3;
const FAILED_BULLISH_10D = -0.03;
const FAILED_BEARISH_10D = 0.03;
const STALE_SIGNAL_DAYS = 7;
const PRICE_LOOKUP_CONCURRENCY = 8;

export class SignalQualityLabService {
  private readonly repository: SignalQualityLabRepository;

  constructor(
    repository: SignalQualityLabRepository = new SignalQualityLabRepository(),
    private readonly signalService = new SignalGenerationEngineService(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly historicalContextService = new HistoricalContextSnapshotsService(),
    private readonly dataQualityService = new DataQualityEngineService()
  ) {
    this.repository = repository;
  }

  async history(instrumentId: string, query: QualityQuery): Promise<SignalHistoryItem[]> {
    const rawSignals = await this.signalService.signalHistory({ ...query, instrumentId });
    const signals = await this.applyDataQualityFilters(rawSignals, query);
    return signals.map((signal) => this.historyItem(signal));
  }

  async outcomes(instrumentId: string, query: QualityQuery): Promise<SignalOutcomeSet[]> {
    const rawSignals = await this.signalService.signalHistory({ ...query, instrumentId });
    const signals = await this.applyDataQualityFilters(rawSignals, query);
    return this.outcomesForSignals(signals, query);
  }

  /**
   * Per-instrument track-record aggregate from persisted signal_outcomes.
   * Win-rate is directional (BULLISH + BEARISH only; NEUTRAL excluded).
   * Returns null when no mature (dataComplete=true) rows exist.
   */
  async instrumentOutcomeAggregate(
    instrumentId: string,
    horizon: QualityHorizon,
  ): Promise<{
    matureCount: number;
    directionalSampleSize: number;
    winRate: number | null;
    avgForwardReturn: number | null;
  } | null> {
    return this.repository.instrumentOutcomeAggregate(instrumentId, horizon);
  }

  async dashboard(query: QualityQuery) {
    // Trader-facing read: serve from persisted SignalOutcome rows only.
    // No live price-history fetch happens on this GET path.
    // If zero mature persisted outcomes exist for the requested scope, return an
    // explicit "not yet computed" pending state — do NOT silently recompute live.
    // To populate outcomes run: POST /signals/quality/recalculate?persistOutcomes=true
    // or the scheduled SIGNAL_QUALITY_LAB pipeline stage.
    const persistedPath = await this.tryPersistedDashboard(query);
    if (persistedPath !== null) return persistedPath;

    // Fallback: live computation path.
    // In production this path is NEVER reached: tryPersistedDashboard returns a non-null
    // value (either persisted data, or pending state, or catches all errors and returns pending).
    // The only way to reach here is when the repository does not implement countMatureByHorizon
    // — i.e. lightweight unit-test mocks. It is NOT reachable via any production code path.
    const analysisQuery = this.analysisQuery(query);
    const rawSignals = await this.signalService.signalHistory(analysisQuery);
    const signals = await this.applyDataQualityFilters(rawSignals, analysisQuery);
    const outcomes = await this.outcomesForSignals(signals, analysisQuery);
    const dataQualityFilterSummary = await this.dataQualityFilterSummaryFrom(rawSignals, signals, analysisQuery);
    const diagnostics = await this.evaluationDiagnostics(rawSignals, signals, outcomes, analysisQuery, dataQualityFilterSummary);
    const horizonAvailability = this.horizonAvailability(outcomes);

    const evaluated = this.evaluatedForHorizon(outcomes, analysisQuery.horizon);
    const byType = this.signalTypePerformance(signals, outcomes, analysisQuery.horizon).filter((item) => item.sampleSize >= analysisQuery.minSampleSize);
    const bySector = this.groupMetrics(outcomes, analysisQuery.horizon, (item) => item.sector || 'Unknown').filter((item) => item.sampleSize >= analysisQuery.minSampleSize);
    const noisy = this.detectNoisySignals(signals, outcomes);
    const unevaluatedSignals = diagnostics.insufficientFuturePriceCount;
    const evidenceUsability = this.evidenceUsability(signals.length, evaluated.length, diagnostics.missingPriceHistoryCount, diagnostics.insufficientFuturePriceCount, analysisQuery.minSampleSize);

    const summary: QualitySummary = {
      selectedHorizon: analysisQuery.horizon,
      evidenceUsability,
      totalSignals: signals.length,
      matureSignals: evaluated.length,
      evaluatedSignals: evaluated.length,
      notYetMatureSignals: diagnostics.notYetMatureSignals,
      unevaluatedSignals,
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

    const regimeLookup = await this.regimeMapForSignals(signals, analysisQuery);
    const byRegime = this.groupMetrics(outcomes, analysisQuery.horizon, (item) => regimeLookup.regimeBySignal.get(item.signalResultId) || 'MISSING_REGIME_CONTEXT')
      .filter((item) => item.sampleSize >= analysisQuery.minSampleSize);

    const evaluations = await this.dataQualityService.getEvaluationsForInstruments(signals.map((signal) => signal.instrument_id)).catch(() => []);
    const byId = new Map(evaluations.map((evaluation) => [evaluation.instrumentId, evaluation]));
    const byDataQuality = [
      ...this.groupMetrics(outcomes, query.horizon, (item) => `coverage:${byId.get(item.instrumentId)?.coverageStatus || 'MISSING'}`),
      ...this.groupMetrics(outcomes, query.horizon, (item) => `readiness:${byId.get(item.instrumentId)?.signalReadinessStatus || 'MISSING'}`),
      ...this.groupMetrics(outcomes, query.horizon, (item) => `liquidity:${byId.get(item.instrumentId)?.liquidityStatus || 'MISSING'}`),
    ].filter((item) => item.sampleSize >= analysisQuery.minSampleSize);

    summary.warnings = [...summary.warnings, ...regimeLookup.warnings];
    return { summary, byType, bySector, byRegime, byDataQuality, noisy };
  }

  async summary(query: QualityQuery): Promise<QualitySummary> {
    // Trader-facing read: serve from persisted SignalOutcome rows only.
    // No live price-history fetch happens on this GET path.
    // If zero mature persisted outcomes exist for the requested scope, return an
    // explicit "not yet computed" pending state — do NOT silently recompute live.
    // To populate outcomes run: POST /signals/quality/recalculate?persistOutcomes=true
    // or the scheduled SIGNAL_QUALITY_LAB pipeline stage.
    const persisted = await this.tryPersistedSummary(query);
    if (persisted !== null) return persisted;

    // Fallback: live computation path.
    // In production this path is NEVER reached: tryPersistedSummary returns a non-null
    // value (either persisted data, or pending state, or catches all errors and returns pending).
    // The only way to reach here is when the repository does not implement countMatureByHorizon
    // — i.e. lightweight unit-test mocks. It is NOT reachable via any production code path.
    const analysisQuery = this.analysisQuery(query);
    const rawSignals = await this.signalService.signalHistory(analysisQuery);
    const signals = await this.applyDataQualityFilters(rawSignals, analysisQuery);
    const outcomes = await this.outcomesForSignals(signals, analysisQuery);
    const dataQualityFilterSummary = await this.dataQualityFilterSummaryFrom(rawSignals, signals, analysisQuery);
    const diagnostics = await this.evaluationDiagnostics(rawSignals, signals, outcomes, analysisQuery, dataQualityFilterSummary);
    const horizonAvailability = this.horizonAvailability(outcomes);
    const evaluated = this.evaluatedForHorizon(outcomes, analysisQuery.horizon);
    const byType = this.signalTypePerformance(signals, outcomes, analysisQuery.horizon).filter((item) => item.sampleSize >= analysisQuery.minSampleSize);
    const bySector = this.groupMetrics(outcomes, analysisQuery.horizon, (item) => item.sector || 'Unknown').filter((item) => item.sampleSize >= analysisQuery.minSampleSize);
    const noisy = this.detectNoisySignals(signals, outcomes);
    const unevaluatedSignals = diagnostics.insufficientFuturePriceCount;
    const evidenceUsability = this.evidenceUsability(signals.length, evaluated.length, diagnostics.missingPriceHistoryCount, diagnostics.insufficientFuturePriceCount, analysisQuery.minSampleSize);
    return {
      selectedHorizon: analysisQuery.horizon,
      evidenceUsability,
      totalSignals: signals.length,
      matureSignals: evaluated.length,
      evaluatedSignals: evaluated.length,
      notYetMatureSignals: diagnostics.notYetMatureSignals,
      unevaluatedSignals,
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
    const { regimeBySignal } = await this.regimeMapForSignals(signals, query);
    return this.groupMetrics(outcomes, query.horizon, (item) => regimeBySignal.get(item.signalResultId) || 'MISSING_REGIME_CONTEXT')
      .filter((item) => item.sampleSize >= query.minSampleSize);
  }

  async noisy(query: QualityQuery): Promise<NoisySignalItem[]> {
    const signals = await this.loadSignals(query);
    return this.detectNoisySignals(signals, await this.outcomesForSignals(signals, query));
  }

  /**
   * Bounded noisy detection: same rules as noisy(), but over the most-recent
   * `limit` signals only (bypassing analysisQuery's 10k floor). Used by the
   * persisted dashboard/summary/calibration path so noisy detection stays O(1)
   * in corpus size instead of recomputing outcomes from prices for 10k signals.
   */
  private async noisyBounded(query: QualityQuery, limit: number): Promise<NoisySignalItem[]> {
    const bounded: QualityQuery = { ...query, limit };
    const signals = await this.applyDataQualityFilters(
      await this.signalService.signalHistory(bounded as any),
      bounded,
    );
    return this.detectNoisySignals(signals, await this.outcomesForSignals(signals, bounded));
  }

  // ---------------------------------------------------------------------------
  // Scorecard API (Slice 2)
  // ---------------------------------------------------------------------------

  /**
   * Count mature (dataComplete=true) signal_outcomes rows for the given horizon.
   * Used by the calibration engine to decide whether persisted outcomes are
   * sufficient to skip on-demand price-history recomputation.
   */
  async countMatureByHorizon(horizon: QualityHorizon, modelVersion?: string): Promise<number> {
    return this.repository.countMatureByHorizon(horizon, undefined, modelVersion);
  }

  /**
   * Return scorecard rows grouped by `horizon × groupBy`.
   * Delegates SQL aggregation to the repository; applies minSampleSize after.
   *
   * Each row carries `winRateConfidence` computed from `directionalSampleSize`
   * (honest-labeling #48): HIGH ≥ 100, MEDIUM ≥ 30, LOW < 30, null when
   * directionalSampleSize = 0 (no directional win-rate).
   */
  async scorecard(query: ScorecardQuery): Promise<ScorecardResponse> {
    const normalizedQuery = this.normalizeScorecardQuery(query);
    const [rows, summaryRows] = await Promise.all([
      this.repository.scorecard(normalizedQuery),
      this.repository.scorecardSummary(normalizedQuery),
    ]);

    const minSample = normalizedQuery.minSampleSize ?? 1;
    const filteredRows = rows
      .filter((row) => row.directionalSampleSize >= minSample)
      .map((row) => ({ ...row, winRateConfidence: this.computeWinRateConfidence(row.directionalSampleSize) }));

    const annotatedSummary = summaryRows.map((row) => ({
      ...row,
      winRateConfidence: this.computeWinRateConfidence(row.directionalSampleSize),
    }));

    return {
      groupBy: normalizedQuery.groupBy as ScorecardGroupBy,
      horizon: normalizedQuery.horizon ?? null,
      rows: filteredRows,
      summary: annotatedSummary,
    };
  }

  /**
   * Return per-horizon summary stats only (no secondary group-by).
   * Useful for a quick "what's the overall 5D win-rate?" query.
   *
   * Each summary row carries `winRateConfidence` (honest-labeling #48).
   */
  async scorecardSummary(query: ScorecardQuery): Promise<ScorecardSummary[]> {
    const normalizedQuery = this.normalizeScorecardQuery(query);
    const rows = await this.repository.scorecardSummary(normalizedQuery);
    return rows.map((row) => ({ ...row, winRateConfidence: this.computeWinRateConfidence(row.directionalSampleSize) }));
  }

  /**
   * Compute win-rate confidence from directionalSampleSize.
   *
   * Thresholds are sourced from WIN_RATE_CONFIDENCE_HIGH/MEDIUM_THRESHOLD constants —
   * do NOT hard-code numbers anywhere that uses this classification.
   *
   *   HIGH   — directionalSampleSize >= WIN_RATE_CONFIDENCE_HIGH_THRESHOLD   (≥ 100)
   *   MEDIUM — directionalSampleSize >= WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD (≥  30)
   *   LOW    — directionalSampleSize <  WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD (<  30)
   *   null   — directionalSampleSize === 0 (no directional win-rate available)
   */
  private computeWinRateConfidence(directionalSampleSize: number): WinRateConfidence | null {
    if (directionalSampleSize <= 0) return null;
    if (directionalSampleSize >= WIN_RATE_CONFIDENCE_HIGH_THRESHOLD) return 'HIGH';
    if (directionalSampleSize >= WIN_RATE_CONFIDENCE_MEDIUM_THRESHOLD) return 'MEDIUM';
    return 'LOW';
  }

  // ---------------------------------------------------------------------------
  // Persisted-outcome quality metrics (Slice 3)
  // ---------------------------------------------------------------------------

  /**
   * Derive calibration quality metrics entirely from persisted signal_outcomes
   * (dataComplete=true), avoiding re-fetching price series on every calibration
   * run.
   *
   * Returns the same four arrays consumed by the calibration engine:
   *   byType  — per signal-type-code win rate / avg return (via SQL join to signal_results)
   *   byScore — per score-bucket metrics (calibration-compatible bucket boundaries)
   *   bySector — per sector metrics
   *   noisy   — populated via a lightweight on-demand pass that reuses
   *              detectNoisySignals; keeps win-rate/return metrics from persisted
   *              SQL aggregates while ensuring noisy penalties are never lost
   *
   * Win-rate is direction-aware (BULLISH / BEARISH only; NEUTRAL excluded),
   * matching the on-demand path and the Slice-2 scorecard semantics.
   *
   * matureCount is the number of dataComplete=true rows for the horizon —
   * callers should gate on this before trusting the metrics.
   */
  async qualityMetricsFromPersistedOutcomes(query: PersistedOutcomeMetricsQuery): Promise<PersistedQualityMetrics> {
    const scorecardBase: ScorecardQuery = {
      horizon: query.horizon,
      modelVersion: query.modelVersion,
      minSampleSize: 0,
    };

    // Noisy-signal detection over a BOUNDED most-recent window (NOISY_SIGNAL_LIMIT),
    // not the full corpus — recomputing outcomes from prices for 10k signals made this
    // path ~24s on a 20k+ corpus. Runs concurrently with the scorecard SQL aggregates.
    const noisyQuery: QualityQuery = {
      horizon: query.horizon,
      modelVersion: query.modelVersion,
      limit: NOISY_SIGNAL_LIMIT,
      minSampleSize: 0,
    };

    const [scoreBucketRows, sectorRows, signalTypeRows, matureCount, noisy] = await Promise.all([
      this.repository.scorecard({ ...scorecardBase, groupBy: 'calibrationScoreBucket' as any }),
      this.repository.scorecard({ ...scorecardBase, groupBy: 'sector' }),
      this.repository.signalTypeMetricsFromPersistedOutcomes({ horizon: query.horizon, modelVersion: query.modelVersion }),
      this.repository.countMatureByHorizon(query.horizon),
      this.noisyBounded(noisyQuery, NOISY_SIGNAL_LIMIT).catch(() => [] as NoisySignalItem[]),
    ]);

    const byScore: QualityMetricGroup[] = scoreBucketRows.map((row) => this.scorecardRowToMetricGroup(row, query.horizon));
    const bySector: QualityMetricGroup[] = sectorRows.map((row) => this.scorecardRowToMetricGroup(row, query.horizon));

    const byType: SignalTypePerformance[] = signalTypeRows.map((row) => ({
      group: row.signalTypeCode,
      name: row.signalTypeCode,
      horizon: query.horizon,
      rawSignalCount: row.sampleSize,
      sampleSize: row.directionalSampleSize,
      samples: row.directionalSampleSize,
      unevaluatedCount: 0,
      winRate: row.winRate,
      averageForwardReturn: row.avgReturnPercent,
      averageReturn: row.avgReturnPercent,
      medianForwardReturn: null,
      medianReturn: null,
      averageMaxDrawdown: null,
      bestReturn: null,
      worstReturn: null,
      positiveCount: 0,
      negativeCount: 0,
      status: (row.directionalSampleSize >= 5 ? 'EVALUATED' : 'SMALL_SAMPLE') as QualityMetricGroup['status'],
      reason: row.directionalSampleSize < 5 ? 'Small evaluated sample; interpret as historical measurement only.' : null,
      signalType: row.signalTypeCode,
      category: 'UNKNOWN',
    }));

    return { byType, byScore, bySector, noisy, matureCount };
  }

  /**
   * Map a ScorecardRow (persisted aggregate) to the QualityMetricGroup shape
   * that the calibration engine consumes.
   *
   * sampleSize is set to directionalSampleSize so that the calibration engine's
   * MIN_GROUP_SAMPLES guard (which checks sampleSize) uses the directional count —
   * matching the semantics of the on-demand path which only counts evaluated outcomes.
   */
  private scorecardRowToMetricGroup(row: import('./signal-quality-lab.types').ScorecardRow, horizon: QualityHorizon): QualityMetricGroup {
    return {
      group: row.groupKey,
      name: row.groupKey,
      horizon,
      rawSignalCount: row.sampleSize,
      sampleSize: row.directionalSampleSize,
      samples: row.directionalSampleSize,
      unevaluatedCount: 0,
      winRate: row.winRate,
      averageForwardReturn: row.avgReturnPercent,
      averageReturn: row.avgReturnPercent,
      medianForwardReturn: row.medianReturnPercent,
      medianReturn: row.medianReturnPercent,
      averageMaxDrawdown: row.avgMaxAdverseExcursion,
      bestReturn: row.bestReturnPercent,
      worstReturn: row.worstReturnPercent,
      positiveCount: 0,
      negativeCount: 0,
      status: (row.directionalSampleSize >= 5 ? 'EVALUATED' : 'SMALL_SAMPLE') as QualityMetricGroup['status'],
      reason: row.directionalSampleSize < 5 ? 'Small evaluated sample; interpret as historical measurement only.' : null,
    };
  }

  private normalizeScorecardQuery(query: ScorecardQuery): ScorecardQuery & { groupBy: ScorecardGroupBy; minSampleSize: number } {
    return {
      ...query,
      groupBy: (query.groupBy === 'sector' || query.groupBy === 'scoreBucket') ? query.groupBy : 'direction',
      minSampleSize: Number.isFinite(Number(query.minSampleSize)) && Number(query.minSampleSize) >= 0
        ? Math.trunc(Number(query.minSampleSize))
        : 1,
    };
  }

  async recalculate(input: QualityRecalculateWithPersistRequest | QualityRecalculateRequest): Promise<QualityRecalculateResponse> {
    const started = Date.now();
    const persistOutcomes = (input as QualityRecalculateWithPersistRequest).persistOutcomes === true;
    const batchSize = this.clampInt(input.batchSize, 25, 1, 100);
    const offset = this.clampInt(input.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const explicitInstrumentIds = [...new Set((input.instrumentIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
    const explicitBatchIds = explicitInstrumentIds.slice(offset, offset + batchSize);
    const [totalCount, signals] = explicitInstrumentIds.length > 0
      ? [
        explicitInstrumentIds.length,
        typeof (this.signalService as any).latestPersistedForInstruments === 'function'
          ? await (this.signalService as any).latestPersistedForInstruments(explicitBatchIds).catch(() => [])
          : [],
      ]
      : await Promise.all([
        this.signalService.signalHistoryCount({
          from: input.from,
          to: input.to,
          region: input.region,
          assetType: input.assetType,
          modelVersion: input.modelVersion,
        }),
        this.signalService.signalHistory({
          limit: batchSize,
          offset,
          from: input.from,
          to: input.to,
          region: input.region,
          assetType: input.assetType,
          modelVersion: input.modelVersion,
        }),
      ]);
    const processedCount = explicitInstrumentIds.length > 0 ? explicitBatchIds.length : signals.length;
    const missingPersistedSignalCount = explicitInstrumentIds.length > 0 ? Math.max(0, explicitBatchIds.length - signals.length) : 0;
    const selectedHorizon: QualityHorizon = input.horizon || '20D';
    const outcomes = await this.outcomesForSignals(signals, {
      horizon: selectedHorizon,
      limit: batchSize,
      minSampleSize: 0,
      region: input.region,
      assetType: input.assetType,
      modelVersion: input.modelVersion,
    });
    const evaluatedInBatch = this.evaluatedForHorizon(outcomes, selectedHorizon).length;
    const missingPriceHistoryInBatch = outcomes.filter((outcome) => !outcome.priceHistoryAvailable).length;
    const insufficientFuturePriceInBatch = Math.max(0, outcomes.length - evaluatedInBatch - missingPriceHistoryInBatch);
    const unevaluatedInBatch = insufficientFuturePriceInBatch;
    const evidenceUsability = this.evidenceUsability(outcomes.length, evaluatedInBatch, missingPriceHistoryInBatch, insufficientFuturePriceInBatch, 0);
    const nextOffset = offset + processedCount;

    // ------------------------------------------------------------------
    // Persist outcomes when requested
    // ------------------------------------------------------------------
    let rowsUpserted = 0;
    let matureCount = 0;
    let immatureCount = 0;

    if (persistOutcomes && outcomes.length > 0) {
      const now = new Date();
      const horizons = Object.keys({ '1D': 1, '5D': 5, '10D': 10, '20D': 20, '60D': 60 }) as QualityHorizon[];
      const rows: SignalOutcomeUpsert[] = [];

      // CB-8: fetch benchmark prices once for the batch (covering the full date range).
      // Benchmark symbol is resolved per region (^NSEI for IN, ^GSPC for US, etc.).
      // Used to compute same-horizon benchmark return and alpha alongside signal return.
      const benchmarkPrices = await this.fetchBenchmarkPrices(outcomes, input.region).catch(() => [] as PricePoint[]);

      for (const outcomeSet of outcomes) {
        if (!outcomeSet.signalResultId) continue;

        const signalGeneratedDate = new Date(outcomeSet.generatedAt);
        signalGeneratedDate.setUTCHours(0, 0, 0, 0);

        // CB-8: find the T+1 entry index in the benchmark price series
        // (same entry logic as calculateOutcome: the bar after signal day).
        const benchmarkSignalDayIdx = benchmarkPrices.findIndex(
          (p) => this.utcTradingDay(new Date(p.date)).getTime() >= signalGeneratedDate.getTime()
        );
        const benchmarkEntryIdx = benchmarkSignalDayIdx >= 0 ? benchmarkSignalDayIdx + 1 : -1;
        const benchmarkEntry = benchmarkEntryIdx >= 0 && benchmarkEntryIdx < benchmarkPrices.length
          ? benchmarkPrices[benchmarkEntryIdx]
          : null;

        for (const horizon of horizons) {
          const fo = outcomeSet.outcomes.find((o) => o.horizon === horizon);
          const dataComplete = Boolean(fo?.available && fo.forwardReturnPercent !== null);
          const windowEndDate = fo?.futureDate ? new Date(fo.futureDate) : null;

          // CB-8: compute same-horizon benchmark return and alpha when possible.
          let benchmarkReturnPercent: number | null = null;
          let alphaPercent: number | null = null;
          if (benchmarkEntry && benchmarkEntry.adjustedClose > 0) {
            const horizonRows = HORIZON_DAYS[horizon];
            const benchmarkFutureIdx = benchmarkEntryIdx + horizonRows;
            const benchmarkFuture = benchmarkFutureIdx < benchmarkPrices.length
              ? benchmarkPrices[benchmarkFutureIdx]
              : null;
            if (benchmarkFuture) {
              benchmarkReturnPercent = (benchmarkFuture.adjustedClose - benchmarkEntry.adjustedClose) / benchmarkEntry.adjustedClose;
              if (fo?.forwardReturnPercent !== null && fo?.forwardReturnPercent !== undefined) {
                alphaPercent = fo.forwardReturnPercent - benchmarkReturnPercent;
              }
            }
          }

          rows.push({
            signalResultId: outcomeSet.signalResultId,
            instrumentId: outcomeSet.instrumentId,
            symbol: outcomeSet.symbol,
            direction: outcomeSet.direction,
            score: outcomeSet.score,
            sector: outcomeSet.sector ?? null,
            country: outcomeSet.country ?? null,
            modelVersion: (signals.find((s: SignalResultDto) => s.id === outcomeSet.signalResultId)?.modelVersion) || 'signal-engine-v1',
            signalGeneratedDate,
            horizon,
            dataComplete,
            priceAtSignal: fo?.priceAtSignal ?? null,
            futurePrice: fo?.futurePrice ?? null,
            windowEndDate,
            forwardReturnPercent: fo?.forwardReturnPercent ?? null,
            // Fix 6: use per-horizon excursion (scoped to this horizon's row count),
            // not the full-window outer set fields (which only cover the 60D window).
            maxFavorableExcursion: fo?.maxFavorableExcursion ?? null,
            maxAdverseExcursion: fo?.maxAdverseExcursion ?? null,
            maxDrawdownPercent: fo?.maxDrawdown ?? null,
            // CB-8: benchmark return and alpha (absolute numbers preserved separately)
            benchmarkReturnPercent,
            alphaPercent,
            evaluatedAt: now,
          });

          if (dataComplete) matureCount++;
          else immatureCount++;
        }
      }

      const result = await this.repository.upsertOutcomeBatch(rows);
      rowsUpserted = result.upserted;
    }

    const warnings: string[] = [];
    if (missingPersistedSignalCount > 0) {
      warnings.push(`${missingPersistedSignalCount} requested instruments did not have persisted trusted raw signals for signal-quality diagnostics.`);
    }

    return {
      processedCount,
      totalCount,
      batchSize,
      offset,
      nextOffset: nextOffset < totalCount ? nextOffset : null,
      hasMore: nextOffset < totalCount,
      selectedHorizon,
      evidenceUsability,
      inserted: 0,
      updated: 0,
      skipped: missingPersistedSignalCount,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: missingPersistedSignalCount,
      failedCount: 0,
      matureSignalsInBatch: evaluatedInBatch,
      evaluatedInBatch,
      evaluatedCount: evaluatedInBatch,
      notYetMatureInBatch: unevaluatedInBatch,
      unevaluatedInBatch,
      unevaluatedCount: unevaluatedInBatch,
      insufficientFuturePriceInBatch,
      insufficientFuturePriceCount: insufficientFuturePriceInBatch,
      missingPriceHistoryInBatch,
      missingPriceHistoryCount: missingPriceHistoryInBatch,
      outcomesPersisted: persistOutcomes,
      signalsProcessed: persistOutcomes ? outcomes.length : undefined,
      rowsUpserted: persistOutcomes ? rowsUpserted : undefined,
      matureCount: persistOutcomes ? matureCount : undefined,
      immatureCount: persistOutcomes ? immatureCount : undefined,
      message: persistOutcomes
        ? `Persisted ${rowsUpserted} outcome rows (${matureCount} mature, ${immatureCount} immature) for ${outcomes.length} signals.`
        : 'Outcomes are calculated on demand; recalculation refreshed diagnostics only.',
      warnings,
      durationMs: Date.now() - started,
    };
  }

  private clampInt(value: unknown, fallback: number, min: number, max: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(numeric)));
  }

  async loadSignals(query: QualityQuery): Promise<SignalResultDto[]> {
    const analysisQuery = this.analysisQuery(query);
    const signals = await this.signalService.signalHistory(analysisQuery);
    return this.applyDataQualityFilters(signals, analysisQuery);
  }

  async dataQualityFilterSummary(query: QualityQuery): Promise<DataQualityFilterSummary> {
    const analysisQuery = this.analysisQuery(query);
    const filterApplied = this.qualityFilterApplied(analysisQuery);
    const before = await this.signalService.signalHistory(analysisQuery);
    if (!filterApplied) {
      return { totalSignalsBeforeFilter: before.length, totalSignalsAfterFilter: before.length, excludedByDataQuality: 0, missingQualityEvaluationCount: 0, filterApplied: false };
    }
    const after = await this.applyDataQualityFilters(before, analysisQuery);
    return this.dataQualityFilterSummaryFrom(before, after, analysisQuery);
  }

  // ---------------------------------------------------------------------------
  // Persisted-read entry points: try the persisted path, return null to signal
  // that the live fallback should be used (happens only when repository methods
  // are unavailable — e.g. in minimal test mocks).
  // Production repositories always have scorecardSummary / countMatureByHorizon,
  // so the live fallback is never reached in production.
  // ---------------------------------------------------------------------------

  private async tryPersistedSummary(query: QualityQuery): Promise<QualitySummary | null> {
    // null return is the signal that the live fallback in summary() should be used.
    // This ONLY happens when the repository lacks countMatureByHorizon (unit-test mocks);
    // production repositories always implement it.
    if (typeof (this.repository as any).countMatureByHorizon !== 'function') return null;
    try {
      const persistedMetrics = await this.qualityMetricsFromPersistedOutcomes({
        horizon: query.horizon,
        modelVersion: query.modelVersion,
      });
      if (persistedMetrics.matureCount === 0) {
        return this.pendingPersistedSummary(query.horizon);
      }
      return this.summaryFromPersistedMetrics(query, persistedMetrics);
    } catch {
      // On any DB error return an honest pending state rather than falling back
      // to live price-history computation on the GET path (persisted-read contract).
      return this.pendingPersistedSummary(query.horizon);
    }
  }

  /**
   * Build the by-regime QualityMetricGroup array from the persisted path.
   *
   * Calls the repository SQL (signal_outcomes LATERAL JOIN market_context_snapshots)
   * to resolve the market regime in effect at each signal's generated date, then:
   *   - Maps DB rows to QualityMetricGroup shape
   *   - Injects all known regime buckets (RISK_ON / NEUTRAL / RISK_OFF / UNKNOWN)
   *     with sampleSize=0 / winRate=null / averageForwardReturn=null so the FE can
   *     always render a complete table instead of a hidden/empty section
   *   - Marks groups with directionalSampleSize < MIN_GROUP_SAMPLES_THRESHOLD as
   *     SMALL_SAMPLE (honest low-sample flag)
   */
  private async byRegimeFromPersistedOutcomes(query: QualityQuery): Promise<QualityMetricGroup[]> {
    const rows = await this.repository.byRegimeFromPersistedOutcomes({
      horizon: query.horizon,
      modelVersion: query.modelVersion,
      region: query.region,
    }).catch(() => [] as Awaited<ReturnType<typeof this.repository.byRegimeFromPersistedOutcomes>>);

    const KNOWN_REGIMES = ['RISK_ON', 'NEUTRAL', 'RISK_OFF', 'UNKNOWN'] as const;
    const horizon = query.horizon;

    const byRegimeKey = new Map(rows.filter((r) => r.horizon === horizon).map((r) => [r.regime, r]));

    return KNOWN_REGIMES.map((regime) => {
      const row = byRegimeKey.get(regime);
      if (!row) {
        return {
          group: regime,
          name: regime,
          horizon,
          rawSignalCount: 0,
          sampleSize: 0,
          samples: 0,
          unevaluatedCount: 0,
          winRate: null,
          averageForwardReturn: null,
          averageReturn: null,
          medianForwardReturn: null,
          medianReturn: null,
          averageMaxDrawdown: null,
          bestReturn: null,
          worstReturn: null,
          positiveCount: 0,
          negativeCount: 0,
          status: 'SMALL_SAMPLE' as const,
          reason: 'No evaluated outcomes in this regime bucket.',
        };
      }
      const isSmall = row.directionalSampleSize < MIN_GROUP_SAMPLES_THRESHOLD;
      return {
        group: regime,
        name: regime,
        horizon,
        rawSignalCount: row.sampleSize,
        sampleSize: row.directionalSampleSize,
        samples: row.directionalSampleSize,
        unevaluatedCount: 0,
        winRate: row.winRate,
        averageForwardReturn: row.avgReturnPercent,
        averageReturn: row.avgReturnPercent,
        medianForwardReturn: null,
        medianReturn: null,
        averageMaxDrawdown: null,
        bestReturn: null,
        worstReturn: null,
        positiveCount: 0,
        negativeCount: 0,
        status: (isSmall ? 'SMALL_SAMPLE' : 'EVALUATED') as QualityMetricGroup['status'],
        reason: isSmall ? `Only ${row.directionalSampleSize} directional outcome(s); interpret as indicative only.` : null,
      };
    });
  }

  private async tryPersistedDashboard(query: QualityQuery): Promise<{
    summary: QualitySummary;
    byType: SignalTypePerformance[];
    bySector: QualityMetricGroup[];
    byRegime: QualityMetricGroup[];
    byDataQuality: QualityMetricGroup[];
    noisy: NoisySignalItem[];
  } | null> {
    const pendingDashboard = () => {
      const pending = this.pendingPersistedSummary(query.horizon);
      return { summary: pending, byType: [], bySector: [], byRegime: [], byDataQuality: [], noisy: [] };
    };

    // null return is the signal that the live fallback in dashboard() should be used.
    // This ONLY happens when the repository lacks countMatureByHorizon (unit-test mocks);
    // production repositories always implement it.
    if (typeof (this.repository as any).countMatureByHorizon !== 'function') return null;
    try {
      const persistedMetrics = await this.qualityMetricsFromPersistedOutcomes({
        horizon: query.horizon,
        modelVersion: query.modelVersion,
      });
      if (persistedMetrics.matureCount === 0) {
        return pendingDashboard();
      }
      const summary = await this.summaryFromPersistedMetrics(query, persistedMetrics);
      const minSample = query.minSampleSize;
      const byType = persistedMetrics.byType.filter((item) => item.sampleSize >= minSample);
      const bySector = persistedMetrics.bySector.filter((item) => item.sampleSize >= minSample);
      const noisy = persistedMetrics.noisy;
      // byRegime: SQL join signal_outcomes → market_context_snapshots (LATERAL subquery).
      // Resolves the market regime in effect at each signal's generated date.
      // All 4 known regime buckets are returned — zero-sample ones with sampleSize=0 / winRate=null.
      const byRegime = await this.byRegimeFromPersistedOutcomes(query);

      // byDataQuality requires a join to DQ evaluations — not yet materialised
      // in the persisted path; return empty with a warning.
      const warnings = [
        ...summary.warnings,
        'by-data-quality grouping is not available in the persisted read path; run recalculate to refresh.',
      ];
      return { summary: { ...summary, warnings }, byType, bySector, byRegime, byDataQuality: [], noisy };
    } catch {
      // On any DB error return an honest pending state rather than falling back
      // to live price-history computation on the GET path (persisted-read contract).
      return pendingDashboard();
    }
  }

  // ---------------------------------------------------------------------------
  // Persisted-read helpers for summary() / dashboard()
  // ---------------------------------------------------------------------------

  /**
   * Build the full QualitySummary DTO from already-computed persisted metrics.
   * No price fetching, no signal history, no live recomputation.
   * Metric semantics (win-rate definition, NEUTRAL exclusion, score buckets,
   * by-sector, by-type) are identical to the on-demand path — they are sourced
   * from the same SQL aggregates that back the scorecard and calibration engine.
   */
  private async summaryFromPersistedMetrics(
    query: QualityQuery,
    persistedMetrics: import('./signal-quality-lab.types').PersistedQualityMetrics,
  ): Promise<QualitySummary> {
    const horizon = query.horizon;
    const minSample = query.minSampleSize;

    // Per-direction win rates via scorecardSummary filtered to the selected horizon.
    // scorecardSummary gives overall (all-direction) win rate; for separate
    // BULLISH / BEARISH rates we use scorecard({ groupBy: 'direction' }).
    const [scoreSummaryRows, directionRows] = await Promise.all([
      this.repository.scorecardSummary({ horizon, modelVersion: query.modelVersion, minSampleSize: 0 }),
      this.repository.scorecard({ horizon, groupBy: 'direction', modelVersion: query.modelVersion, minSampleSize: 0 }),
    ]);

    const horizonSummary = scoreSummaryRows.find((row) => row.horizon === horizon);
    const bullishRow = directionRows.find((row) => row.horizon === horizon && row.groupKey === 'BULLISH');
    const bearishRow = directionRows.find((row) => row.horizon === horizon && row.groupKey === 'BEARISH');

    // Derive average returns from persisted scorecard summary rows.
    const fiveDaySummary = scoreSummaryRows.find((row) => row.horizon === '5D');
    const twentyDaySummary = scoreSummaryRows.find((row) => row.horizon === '20D');

    const matureCount = persistedMetrics.matureCount;
    const byType = persistedMetrics.byType.filter((item) => item.sampleSize >= minSample);
    const bySector = persistedMetrics.bySector.filter((item) => item.sampleSize >= minSample);
    const noisy = persistedMetrics.noisy;

    // horizonAvailability: use persisted count from scorecardSummary per horizon.
    const horizonAvailability = (Object.keys({ '1D': 1, '5D': 5, '10D': 10, '20D': 20, '60D': 60 }) as QualityHorizon[])
      .reduce((acc, h) => {
        const row = scoreSummaryRows.find((r) => r.horizon === h);
        const evaluated = row?.directionalSampleSize ?? 0;
        const total = row?.sampleSize ?? 0;
        acc[h] = {
          eligible: total,
          evaluated,
          insufficientFuturePrice: 0,
          missingPriceHistory: 0,
          evidenceUsability: this.evidenceUsability(total, evaluated, 0, 0, minSample),
        };
        return acc;
      }, {} as HorizonAvailabilitySummary);

    const totalSignals = horizonSummary?.sampleSize ?? 0;
    const matureSignals = horizonSummary?.directionalSampleSize ?? 0;
    const evidenceUsability = this.evidenceUsability(totalSignals, matureSignals, 0, 0, minSample);

    const diagnostics: EvaluationDiagnostics = {
      totalSignals,
      signalsAfterFilters: totalSignals,
      matureSignals,
      evaluatedSignals: matureSignals,
      notYetMatureSignals: 0,
      unevaluatedSignals: 0,
      insufficientFuturePriceCount: 0,
      missingPriceHistoryCount: 0,
      missingInstrumentCount: 0,
      excludedByDataQualityCount: 0,
      excludedByDateFilterCount: 0,
      excludedByDirectionCount: 0,
      selectedHorizon: horizon,
      earliestSignalDate: null,
      latestSignalDate: null,
      latestAvailablePriceDate: null,
      minimumRequiredFutureRows: ({ '1D': 1, '5D': 5, '10D': 10, '20D': 20, '60D': 60 } as Record<QualityHorizon, number>)[horizon],
      nextEvaluableDate: null,
      recommendedAction: matureSignals > 0
        ? 'Review evaluated historical forward returns and keep market data current.'
        : 'Run recalculate with persistOutcomes=true to populate persisted outcome metrics.',
      warnings: [],
    };

    return {
      selectedHorizon: horizon,
      evidenceUsability,
      totalSignals,
      matureSignals,
      evaluatedSignals: matureSignals,
      notYetMatureSignals: 0,
      unevaluatedSignals: 0,
      overallBullishWinRate: bullishRow?.winRate ?? null,
      overallBearishWinRate: bearishRow?.winRate ?? null,
      average5DReturn: fiveDaySummary?.avgReturnPercent ?? null,
      average20DReturn: twentyDaySummary?.avgReturnPercent ?? null,
      bestPerformingSignalType: byType[0]?.signalType ?? null,
      worstPerformingSignalType: byType.length > 0 ? byType[byType.length - 1].signalType : null,
      bestSector: bySector[0]?.group ?? null,
      worstSector: bySector.length > 0 ? bySector[bySector.length - 1].group : null,
      noisySignalCount: noisy.length,
      dataStatus: matureCount === 0 ? 'MISSING' : 'COMPLETE',
      generatedAt: new Date().toISOString(),
      dataQualityFilterSummary: {
        totalSignalsBeforeFilter: totalSignals,
        totalSignalsAfterFilter: totalSignals,
        excludedByDataQuality: 0,
        missingQualityEvaluationCount: 0,
        filterApplied: false,
      },
      evaluationDiagnostics: diagnostics,
      horizonAvailability,
      recommendedAction: diagnostics.recommendedAction,
      warnings: [],
    };
  }

  /**
   * Return an explicit "not yet computed" pending QualitySummary.
   * Called when matureCount === 0 so the trader page sees a clear state
   * instead of a misleading empty result or a silent live recompute.
   */
  private pendingPersistedSummary(horizon: QualityHorizon): QualitySummary {
    const horizonDays: Record<QualityHorizon, number> = { '1D': 1, '5D': 5, '10D': 10, '20D': 20, '60D': 60 };
    const emptyHorizonItem: HorizonAvailabilityItem = {
      eligible: 0,
      evaluated: 0,
      insufficientFuturePrice: 0,
      missingPriceHistory: 0,
      evidenceUsability: 'UNAVAILABLE',
    };
    const horizonAvailability = (Object.keys(horizonDays) as QualityHorizon[]).reduce((acc, h) => {
      acc[h] = { ...emptyHorizonItem };
      return acc;
    }, {} as HorizonAvailabilitySummary);

    const diagnostics: EvaluationDiagnostics = {
      totalSignals: 0,
      signalsAfterFilters: 0,
      matureSignals: 0,
      evaluatedSignals: 0,
      notYetMatureSignals: 0,
      unevaluatedSignals: 0,
      insufficientFuturePriceCount: 0,
      missingPriceHistoryCount: 0,
      missingInstrumentCount: 0,
      excludedByDataQualityCount: 0,
      excludedByDateFilterCount: 0,
      excludedByDirectionCount: 0,
      selectedHorizon: horizon,
      earliestSignalDate: null,
      latestSignalDate: null,
      latestAvailablePriceDate: null,
      minimumRequiredFutureRows: horizonDays[horizon],
      nextEvaluableDate: null,
      recommendedAction: 'No persisted mature outcomes exist yet. Run recalculate with persistOutcomes=true or the SIGNAL_QUALITY_LAB pipeline stage.',
      warnings: ['No persisted mature outcomes exist yet for the selected scope.'],
    };

    return {
      selectedHorizon: horizon,
      evidenceUsability: 'UNAVAILABLE',
      totalSignals: 0,
      matureSignals: 0,
      evaluatedSignals: 0,
      notYetMatureSignals: 0,
      unevaluatedSignals: 0,
      overallBullishWinRate: null,
      overallBearishWinRate: null,
      average5DReturn: null,
      average20DReturn: null,
      bestPerformingSignalType: null,
      worstPerformingSignalType: null,
      bestSector: null,
      worstSector: null,
      noisySignalCount: 0,
      dataStatus: 'MISSING',
      generatedAt: new Date().toISOString(),
      dataQualityFilterSummary: {
        totalSignalsBeforeFilter: 0,
        totalSignalsAfterFilter: 0,
        excludedByDataQuality: 0,
        missingQualityEvaluationCount: 0,
        filterApplied: false,
      },
      evaluationDiagnostics: diagnostics,
      horizonAvailability,
      recommendedAction: diagnostics.recommendedAction,
      warnings: diagnostics.warnings,
    };
  }

  private analysisQuery(query: QualityQuery): QualityQuery {
    return { ...query, limit: Math.max(query.limit || 0, ANALYSIS_SIGNAL_LIMIT) };
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
      if (!evaluation) {
        return !(query.readinessStatus || query.coverageStatus || query.liquidityStatus || query.minReadinessScore !== undefined || query.onlySignalReady);
      }
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

  private async regimeMapForSignals(signals: SignalResultDto[], query: Partial<QualityQuery>): Promise<{ regimeBySignal: Map<string, string>; warnings: string[] }> {
    const warnings: string[] = [];
    const dateByKey = new Map<string, Date>();
    const signalDateKey = new Map<string, string>();
    for (const signal of signals) {
      const date = this.utcTradingDay(new Date(signal.generated_at));
      const dateKey = date.toISOString().slice(0, 10);
      dateByKey.set(dateKey, date);
      signalDateKey.set(signal.id || signal.generated_at, dateKey);
    }

    const regimeEntries = await Promise.all([...dateByKey.entries()].map(async ([dateKey, date]) => {
      try {
        const regime = await this.historicalContextService.regimeForDate(date, { region: query.region, assetType: query.assetType });
        return [dateKey, regime || 'MISSING_REGIME_CONTEXT'] as const;
      } catch (error: any) {
        warnings.push(`Historical regime lookup failed for ${dateKey}: ${error?.message || 'failed'}`);
        return [dateKey, 'MISSING_REGIME_CONTEXT'] as const;
      }
    }));
    const regimeByDate = new Map(regimeEntries);
    const regimeBySignal = new Map<string, string>();
    for (const [signalKey, dateKey] of signalDateKey.entries()) {
      regimeBySignal.set(signalKey, regimeByDate.get(dateKey) || 'MISSING_REGIME_CONTEXT');
    }
    return { regimeBySignal, warnings };
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
    // CB-10: find the signal-day bar (T+0), then enter at the NEXT bar (T+1).
    // This avoids capturing overnight gap between signal generation and open,
    // which inflated short-horizon (1D/5D) returns in earlier versions.
    const signalDayIndex = prices.findIndex((price) => this.utcTradingDay(new Date(price.date)).getTime() >= generatedAt.getTime());
    const entryIndex = signalDayIndex >= 0 ? signalDayIndex + 1 : -1;
    const entry = entryIndex >= 0 && entryIndex < prices.length ? prices[entryIndex] : null;
    // window starts at the entry bar (T+1) and covers up to 61 bars forward (T+1 through T+61).
    // INVARIANT: prices must come from normalizePrices() so window[N] = N trading days from entry.
    const window = entryIndex >= 0 ? prices.slice(entryIndex, entryIndex + 61) : [];
    const outcomes = (Object.keys(HORIZON_DAYS) as QualityHorizon[]).map((horizon) =>
      this.forwardOutcome(horizon, entry, window)
    );
    // Full-window (60D) excursion fields kept on the outer set for backward-compat.
    const pathReturns = entry && entry.adjustedClose > 0 ? window.map((price) => (price.adjustedClose - entry.adjustedClose) / entry.adjustedClose) : [];
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
      startPriceDate: entry?.date ?? null,
      latestAvailablePriceDate: prices.length > 0 ? prices[prices.length - 1].date : null,
      futureRowsAvailable: entryIndex >= 0 ? Math.max(0, window.length - 1) : 0,
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
    // Fix 10: dedup LOW_CONFIDENCE_SIGNAL per instrument (emit at most one item per
    // instrument, like DIRECTION_FLIPS / STALE do implicitly via byInstrument grouping).
    const lowConfidenceSeen = new Set<string>();
    for (const outcome of outcomes) {
      const tenDay = outcome.outcomes.find((item) => item.horizon === '10D');
      if (!tenDay?.available || tenDay.forwardReturnPercent === null) continue;
      // v3 score distribution: p90=70, p95=74, p99≈85. Under v3, score≥70 is only the top-10% —
      // not "high conviction". Score≥85 (~top 3%) is genuinely high conviction (85-100 bucket).
      // Raised from 70 → 85 so the flag fires only on true high-score failures, not on above-median signals.
      if (outcome.direction === 'BULLISH' && outcome.score >= 85 && tenDay.forwardReturnPercent < FAILED_BULLISH_10D) {
        items.push(this.noise(outcome, 'FAILED_HIGH_SCORE_BULLISH', 'MEDIUM', 'High-score bullish signal had a negative 10D outcome.', { return10D: tenDay.forwardReturnPercent, score: outcome.score }));
      }
      if (outcome.direction === 'BEARISH' && tenDay.forwardReturnPercent > FAILED_BEARISH_10D) {
        items.push(this.noise(outcome, 'FAILED_BEARISH', 'MEDIUM', 'Bearish signal had a positive 10D outcome.', { return10D: tenDay.forwardReturnPercent }));
      }
      if (outcome.confidence === 'LOW' && !lowConfidenceSeen.has(outcome.instrumentId)) {
        lowConfidenceSeen.add(outcome.instrumentId);
        items.push(this.noise(outcome, 'LOW_CONFIDENCE_SIGNAL', 'LOW', 'Low-confidence signal should be reviewed with caution.', { confidence: outcome.confidence }));
      }
    }
    return items;
  }

  /**
   * CB-8: Fetch and normalize the region benchmark price series for a batch of outcomes.
   *
   * Fetches a window wide enough to cover the earliest signal date through the
   * latest horizon end (60 trading days ≈ 90 calendar days after the latest signal).
   * Returns a normalized (deduplicated, ascending) PricePoint array identical to
   * the per-instrument series, so benchmark[N] = N trading days from entry.
   *
   * Benchmark symbol is resolved per region via resolveMarketProfile (^NSEI for IN,
   * ^GSPC for US, etc.). region defaults to IN for backward-compatibility.
   * Returns an empty array when benchmark data is unavailable — callers treat null
   * benchmark as "data unavailable" and leave benchmarkReturnPercent/alphaPercent as null.
   */
  private async fetchBenchmarkPrices(outcomes: SignalOutcomeSet[], region?: string): Promise<PricePoint[]> {
    if (outcomes.length === 0) return [];
    const signalDates = outcomes
      .map((o) => this.utcTradingDay(new Date(o.generatedAt)).getTime())
      .filter(Number.isFinite);
    if (signalDates.length === 0) return [];
    const earliest = new Date(Math.min(...signalDates));
    // Extend end by 90 calendar days to cover the 60D horizon
    const latest = new Date(Math.max(...signalDates) + 90 * 24 * 60 * 60 * 1000);
    const benchmarkSymbol = resolveMarketProfile({ region }).benchmark.symbol;
    try {
      const raw = await (this.marketDataService as any).listPrices(benchmarkSymbol, 5000, earliest, latest);
      if (!raw || !Array.isArray(raw)) return [];
      return this.normalizePrices(
        raw.map((p: any) => ({
          date: new Date(p.timestamp ?? p.date).toISOString(),
          adjusted_close: Number(p.adjustedClose ?? p.adjusted_close ?? p.close),
        }))
      );
    } catch {
      return [];
    }
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

  /**
   * Normalize a raw price series into a strictly-contiguous trading-day array.
   *
   * INVARIANT: after this method, consecutive rows are always exactly one
   * trading day apart (no weekend / holiday / duplicate gaps).  This is
   * required so that `window[N]` in `forwardOutcome` is genuinely N trading
   * days forward and not a calendar-day approximation.
   *
   * Steps:
   *   1. Map to { date (UTC ISO), adjustedClose } and drop rows with non-finite prices.
   *   2. Normalise each date to its UTC calendar day (midnight) — removes intraday
   *      duplicates caused by different timestamp offsets for the same session.
   *   3. Sort ascending by date.
   *   4. Deduplicate: keep the LAST row per calendar day (most-recent intraday print).
   *
   * Non-trading-day filtering (weekends/holidays) is deliberately NOT done here
   * because the source data from NSE/BSE already contains only trading-day rows —
   * filtering on day-of-week would incorrectly drop holiday-make-up sessions.
   * The deduplication step is sufficient to guarantee window[N] = N trading days.
   */
  private normalizePrices(prices: any[]): PricePoint[] {
    const mapped = prices
      .map((price: any) => ({
        date: new Date(new Date(price.date).toISOString().slice(0, 10) + 'T00:00:00.000Z').toISOString(),
        adjustedClose: Number(price.adjusted_close ?? price.close),
      }))
      .filter((price) => Number.isFinite(price.adjustedClose));

    // Sort ascending
    mapped.sort((a, b) => a.date.localeCompare(b.date));

    // Deduplicate by calendar-day key — keep last row per day
    const seen = new Map<string, PricePoint>();
    for (const p of mapped) {
      seen.set(p.date, p);
    }
    return [...seen.values()];
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

  /**
   * Compute the forward outcome for a single horizon.
   *
   * INVARIANT (Fix 1): `window` must be produced by `normalizePrices`, which
   * deduplicates by calendar day.  Under that invariant `window[N]` is
   * genuinely N trading days forward from the signal date (window[0]).
   * Do NOT call this method with a raw, un-normalized price series.
   *
   * Fix 6: excursion metrics (maxFavorableExcursion / maxAdverseExcursion /
   * maxDrawdown) are scoped to window[0..horizonRows] rather than the full
   * 61-row window.  This means 1D excursion only covers 1 future bar while
   * 60D excursion covers the full 60-bar window — values will differ per horizon.
   */
  private forwardOutcome(horizon: QualityHorizon, start: PricePoint | null, window: PricePoint[]): ForwardOutcome {
    const horizonRows = HORIZON_DAYS[horizon];
    const future = window[horizonRows];
    if (!start || !future || start.adjustedClose <= 0) {
      return {
        horizon,
        forwardReturnPercent: null,
        available: false,
        priceAtSignal: start?.adjustedClose ?? null,
        futurePrice: null,
        futureDate: null,
        maxFavorableExcursion: null,
        maxAdverseExcursion: null,
        maxDrawdown: null,
        // CB-8: benchmark and alpha populated later in the persist path
        benchmarkReturnPercent: null,
        alphaPercent: null,
      };
    }
    // Horizon-scoped sub-window: rows [0, horizonRows] inclusive
    const subWindow = window.slice(0, horizonRows + 1);
    const subReturns = subWindow.map((price) => (price.adjustedClose - start.adjustedClose) / start.adjustedClose);
    return {
      horizon,
      forwardReturnPercent: (future.adjustedClose - start.adjustedClose) / start.adjustedClose,
      available: true,
      priceAtSignal: start.adjustedClose,
      futurePrice: future.adjustedClose,
      futureDate: future.date,
      maxFavorableExcursion: subReturns.length > 0 ? Math.max(...subReturns) : null,
      maxAdverseExcursion: subReturns.length > 0 ? Math.min(...subReturns) : null,
      maxDrawdown: this.maxDrawdown(subWindow),
      // CB-8: benchmark and alpha populated later in the persist path
      benchmarkReturnPercent: null,
      alphaPercent: null,
    };
  }

  private metric(group: string, horizon: QualityHorizon, items: SignalOutcomeSet[]): QualityMetricGroup {
    const available = items.map((item) => ({ item, outcome: item.outcomes.find((outcome) => outcome.horizon === horizon) })).filter((entry) => entry.outcome?.available && entry.outcome.forwardReturnPercent !== null);
    const returns = available.map((entry) => entry.outcome!.forwardReturnPercent!);
    const missingPrice = items.filter((item) => !item.priceHistoryAvailable).length;
    const unevaluatedCount = Math.max(0, items.length - returns.length - missingPrice);

    // Fix 3: directionalSampleSize = outcomes for BULLISH or BEARISH items only,
    // consistent with the win-rate denominator (winRate() excludes NEUTRAL).
    // sampleSize stays as the full evaluated count (used for avg return, median etc).
    const directionalSampleSize = available.filter((entry) => entry.item.direction !== 'NEUTRAL').length;
    const status = this.groupStatus(items.length, directionalSampleSize, missingPrice);
    const reason = this.groupReason(items.length, returns.length, missingPrice);
    return {
      group,
      name: group,
      horizon,
      rawSignalCount: items.length,
      // Fix 3: expose directional count so calibration MIN_GROUP_SAMPLES guard
      // is not inflated by NEUTRAL signals.
      sampleSize: directionalSampleSize,
      samples: directionalSampleSize,
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

  private averageHorizon(items: SignalOutcomeSet[], horizon: QualityHorizon): number | null {
    return this.average(items.map((item) => item.outcomes.find((outcome) => outcome.horizon === horizon)?.forwardReturnPercent).filter((value): value is number => value !== null && value !== undefined));
  }

  private horizonAvailability(outcomes: SignalOutcomeSet[]): HorizonAvailabilitySummary {
    return (Object.keys(HORIZON_DAYS) as QualityHorizon[]).reduce((summary, horizon) => {
      const evaluated = this.evaluatedForHorizon(outcomes, horizon).length;
      const missingPriceHistory = outcomes.filter((item) => !item.priceHistoryAvailable).length;
      const insufficientFuturePrice = Math.max(0, outcomes.length - missingPriceHistory - evaluated);
      summary[horizon] = {
        eligible: outcomes.length - missingPriceHistory,
        evaluated,
        insufficientFuturePrice,
        missingPriceHistory,
        evidenceUsability: this.evidenceUsability(outcomes.length, evaluated, missingPriceHistory, insufficientFuturePrice, 0),
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
      ? addTradingDays(new Date(Math.min(...newestUnevaluated)), HORIZON_DAYS[query.horizon]).toISOString()
      : null;
    const [excludedByDirectionCount, excludedByDateFilterCount] = await Promise.all([
      query.direction ? this.countDelta(query, { direction: undefined }) : Promise.resolve(0),
      query.from || query.to ? this.countDelta(query, { from: undefined, to: undefined }) : Promise.resolve(0),
    ]);
    const warnings = this.diagnosticWarnings(filteredSignals.length, evaluatedSignals, insufficientFuturePriceCount, missingPriceHistoryCount, dataQualityFilterSummary);
    return {
      totalSignals: rawSignals.length,
      signalsAfterFilters: filteredSignals.length,
      matureSignals: evaluatedSignals,
      evaluatedSignals,
      notYetMatureSignals: insufficientFuturePriceCount,
      unevaluatedSignals: insufficientFuturePriceCount,
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
    if (missing >= total) return 'Sync historical market data for these instruments before measuring outcomes.';
    if (missing > 0 && insufficient > 0) return `Only ${evaluated} of ${total} signals are evaluated. Sync missing Market Data Foundation price history, then use a shorter horizon or wait for future trading rows.`;
    if (missing > 0) return `Only ${evaluated} of ${total} signals are evaluated. Sync missing Market Data Foundation price history before relying on this sample.`;
    if (insufficient > 0) return 'Try a shorter horizon such as 1D or 5D, sync latest market data, or wait until enough future trading days exist.';
    if (evaluated > 0) return 'Review evaluated historical forward returns and keep market data current.';
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

  private evidenceUsability(total: number, evaluated: number, missing: number, insufficient: number, minSampleSize: number): EvidenceUsability {
    if (total === 0 || evaluated === 0) return 'UNAVAILABLE';
    if (evaluated < Math.max(5, minSampleSize) || missing > 0 || insufficient > 0) return 'LIMITED';
    return 'USABLE';
  }

  /**
   * Fix 9: groupStatus SMALL_SAMPLE guard.
   *
   * Previously this used `HORIZON_DAYS[horizon]` as the minimum sample threshold —
   * conflating the forward-window length (e.g. 60 bars) with the number of
   * independent outcomes needed for statistical meaningfulness.  A 60D horizon
   * would require 60 outcomes before being EVALUATED even when 20 would be fine,
   * and a 1D horizon would only require 1.
   *
   * Correct: use a fixed statistical minimum (`MIN_GROUP_SAMPLES_THRESHOLD = 10`)
   * across all horizons — matches the semantics of the persisted-scorecard path,
   * which uses directionalSampleSize (not horizonRows).
   *
   * Also Fix 3: `evaluatedCount` passed in is now the directional count
   * (BULLISH + BEARISH only), consistent with the win-rate denominator.
   */
  private groupStatus(rawCount: number, directionalEvaluatedCount: number, missingPriceCount: number): QualityMetricGroup['status'] {
    if (rawCount === 0) return 'FILTERED_OUT';
    if (directionalEvaluatedCount === 0 && missingPriceCount >= rawCount) return 'MISSING_PRICE_DATA';
    if (directionalEvaluatedCount === 0) return 'INSUFFICIENT_FUTURE_DATA';
    if (directionalEvaluatedCount < MIN_GROUP_SAMPLES_THRESHOLD) return 'SMALL_SAMPLE';
    return 'EVALUATED';
  }

  private groupReason(rawCount: number, evaluatedCount: number, missingPriceCount: number): string | null {
    if (rawCount === 0) return 'Filtered out by the selected query.';
    if (evaluatedCount === 0 && missingPriceCount >= rawCount) return 'Missing price history for this group.';
    if (evaluatedCount === 0) return 'No evaluated outcomes for the selected horizon.';
    if (evaluatedCount < MIN_GROUP_SAMPLES_THRESHOLD) return 'Small evaluated sample; interpret as historical measurement only.';
    return null;
  }

  private utcTradingDay(value: Date): Date {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  /** Fix 5: use canonical SCORE_BUCKETS — single source of truth. */
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
