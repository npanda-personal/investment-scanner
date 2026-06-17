import type { MarketDataStatus } from '../market-data-foundation';
import type { StrategyDecision, StrategyDefinitionDrift, StrategyDefinitionSource, StrategyDirection, StrategyRatingGrade, StrategyReadinessLabel } from '../strategy-framework';
import type { SignalDirection, SignalConfidence, SignalLifecycleState } from '../../shared/types/signal.types';

export type { SignalDirection, SignalConfidence };
export type SignalCategory = 'TECHNICAL' | 'MOMENTUM' | 'FUNDAMENTAL';
export type ReliabilityTier = 'FULL' | 'PARTIAL';

export type { SignalLifecycleState };

export interface SignalItem {
  code: string;
  label: string;
  category: SignalCategory;
}

export interface SignalResultDto {
  id?: string;
  instrument_id: string;
  symbol: string;
  company_name: string | null;
  sector: string | null;
  country: string | null;
  currentPrice: number | null;
  previousClose: number | null;
  dailyChange: number | null;
  dailyChangePercent: number | null;
  currency: string | null;
  priceTimestamp: string | null;
  score: number;
  direction: SignalDirection;
  confidence: SignalConfidence;
  triggered_signals: SignalItem[];
  negative_signals: SignalItem[];
  explanation: string;
  generated_at: string;
  modelVersion?: string | null;
  rulesetVersion?: string | null;
  generatedDate?: string | null;
  sourceDataDate?: string | null;
  sourcePriceDate?: string | null;
  scoringInputSummary?: SignalScoringInputSummary | null;
  dataQualityEligibility?: SignalDataQualityEligibility | null;
  auditStatus?: 'CURRENT' | 'LEGACY_MISSING';
  generationRunId?: string | null;
  source: string;
  data_status: MarketDataStatus;
  reliabilityTier?: ReliabilityTier | null;
  isSme?: boolean;
  warnings?: string[];
  /** EXIT-candidate lifecycle state populated during/after a generation run. */
  lifecycleState?: SignalLifecycleState | null;
  /** Composite score from the immediately prior persisted run (null for ENTRY signals). */
  priorScore?: number | null;
  /**
   * Regime-gate annotation attached during signal generation.
   * Populated when REGIME_GATE_SHORTS_ENABLED=true and direction is BEARISH.
   * null when the gate was not consulted (BULLISH/NEUTRAL signals, or gate disabled).
   */
  regimeGateNote?: string | null;
  /**
   * True when a tradable bearish_trigger was suppressed to risk_warning by the regime gate.
   * False/absent when the gate allowed the signal, or the gate was not consulted.
   */
  regimeGateSuppressed?: boolean;
  strategyMatches?: SignalStrategyMatchSummary[];
  blockedStrategies?: SignalBlockedStrategySummary[];
  writeStatus?: SignalWriteStatus;
  triggerContract?: SignalTriggerContractDto;

  // ── Delivery% evidence (NSE-sourced, persisted-read, null when absent) ──────
  /**
   * Latest NSE delivery% (deliverable qty / traded qty × 100) for this stock.
   * null when delivery data is absent (BSE-only or data not yet ingested).
   * High delivery (>= 40%) indicates institutional/positional interest.
   * Low delivery (< 20%) indicates intraday churn with limited real conviction.
   */
  deliveryPercent?: number | null;
  /** Human-readable delivery% evidence phrase appended to explanation/evidence. */
  deliveryEvidence?: string | null;

  // ── Calibration overlay (additive, persisted-read only) ────────────────────
  /**
   * Calibration-adjusted score from the latest persisted SignalCalibrationResult
   * for this instrument.  null when no calibration row exists yet.
   * The raw `score` field above is always preserved as-is.
   */
  calibratedScore?: number | null;
  /**
   * NR-6: relative-strength percentile (0–100) — rank of this signal's composite
   * `score` within the served universe, ascending (weakest→0, strongest→100). Ties
   * share the lower-bound rank. null when the served universe has < 2 signals.
   */
  rsPercentile?: number | null;
  /** NR-6: normalized relative-return proxy = (score-50)/50, range [-1,+1]. */
  relativeReturn?: number | null;
  /**
   * The evaluation horizon used by the calibration model (e.g. '20D').
   * Sourced from calibrationEvidence.horizon on the persisted row.
   * null when calibration is absent.
   */
  calibrationHorizon?: string | null;
  /**
   * Convenience alias for calibrationHorizon exposed as selectedHorizon so
   * consumers can label which time window the calibration was measured over.
   */
  selectedHorizon?: string | null;
  /**
   * 'CALIBRATED'  — a valid persisted calibration row was found and applied.
   * 'UNAVAILABLE' — no persisted row exists; raw score is the authoritative value.
   * Never fabricated: when absent the raw score stands unchanged.
   */
  calibrationStatus?: 'CALIBRATED' | 'UNAVAILABLE';
  /**
   * Number of mature (dataComplete=true) signal_outcomes used by the
   * calibration engine for this instrument's model version, if available.
   * Surfaces the outcome depth so consumers can judge confidence.
   */
  calibrationSampleSize?: number | null;

  // ── Historical cohort hit-rate overlay (additive, persisted-read only) ─────
  /**
   * Win-rate (0–1) of MATURE historical outcomes for this signal's cohort —
   * its direction × score-bucket over `cohortMetricsHorizon`.  "Signals like
   * this resolved in-direction X% historically."  null when the cohort has no
   * mature outcomes yet (honest absent — never fabricated).
   */
  cohortWinRate?: number | null;
  /** Directional sample size (BULLISH+BEARISH) behind cohortWinRate; judge significance. */
  cohortDirectionalSampleSize?: number | null;
  /** Average forward return (%) of the cohort over the horizon. */
  cohortAvgReturnPercent?: number | null;
  /** Horizon the cohort metrics are measured over (e.g. '20D'). */
  cohortMetricsHorizon?: string | null;
  /** Sample-size-based confidence in the win-rate: HIGH (>=100), MEDIUM (>=30), LOW, or null (no sample). */
  cohortWinRateConfidence?: SignalWinRateConfidence | null;
}

/** Confidence in a cohort win-rate, derived from its directional sample size. */
export type SignalWinRateConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type SignalWriteStatus = 'CREATED' | 'UPDATED' | 'NO_OP';

export type SignalTriggerContractStatus = 'COMPLETE' | 'CONTRACT_INCOMPLETE' | 'LEGACY_INCOMPLETE';
export type SignalTriggerType = 'bullish_entry_trigger' | 'bearish_trigger' | 'risk_warning';
export type SignalTriggerPriceEvidenceStatus = 'SOURCE_PROVEN' | 'UNAVAILABLE';

export interface SignalTriggerPriceEvidence {
  status: SignalTriggerPriceEvidenceStatus;
  triggerPrice: number | null;
  triggerTimestamp: string | null;
  sourceModule: 'signal-generation-engine';
  sourceField: string | null;
  strategyCode: string | null;
  strategyVersion: string | null;
  timeframe: string | null;
  entryRuleIds: string[];
  compatibilityOnly: boolean;
  unavailableReason?: string;
}

export interface SignalTriggerConditionEvidence {
  code: string;
  label: string;
  category: SignalCategory;
}

export interface SignalTriggerContractDto {
  contractVersion: 'TriggerObjectV1';
  contractStatus: SignalTriggerContractStatus;
  signal_id: string | null;
  instrument_id: string;
  symbol: string;
  asset_class: string | null;
  region: string | null;
  strategy_id: string | null;
  strategy_version: string | null;
  trigger_type: SignalTriggerType;
  trigger_price: number | null;
  trigger_timestamp: string | null;
  timeframe: string | null;
  entry_rule_id: string | null;
  exit_rule_id: string | null;
  invalidation_rule_id: string | null;
  reason_summary: string;
  passed_conditions: SignalTriggerConditionEvidence[];
  failed_conditions: SignalTriggerConditionEvidence[];
  data_quality_status: string | null;
  lifecycle_status: null;
  created_at: string | null;
  updated_at: string | null;
  audit: {
    auditStatus: SignalResultDto['auditStatus'];
    generationRunId: string | null;
    modelVersion: string | null;
    rulesetVersion: string | null;
  };
  trigger_price_evidence: {
    status: SignalTriggerPriceEvidenceStatus;
    source_module: string | null;
    source_field: string | null;
    source_timestamp: string | null;
    strategy_id: string | null;
    strategy_version: string | null;
    timeframe: string | null;
    entry_rule_ids: string[];
    compatibility_only: boolean;
    unavailable_reason?: string;
  };
  unavailable_fields: string[];
  incomplete_reasons: string[];
}

export interface SignalScoringInputSummary {
  priceBarsUsed: number;
  latestCloseDate: string | null;
  hasSma50: boolean;
  hasSma200: boolean;
  hasVolume: boolean;
  fundamentalsAvailable: boolean;
  strategyContextLoaded: boolean;
  /** v4 evidence-model breakdown (rawLean, displacement, evidenceFactor, effective
   *  weights, aligned families). Null on the legacy v3 path. Persisted in JSON for
   *  audit/explainability without a schema change. */
  v4?: import('./signal-evidence').V4Components | null;
}

export interface SignalDataQualityEligibility {
  filterApplied: boolean;
  eligible: boolean | null;
  coverageStatus?: string;
  signalReadinessStatus?: string;
  liquidityStatus?: string;
  excludedReason?: string;
}

export type SignalGenerationRunStatus = 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';

export interface SignalGenerationRunAudit {
  id: string;
  scope: { region: string; assetType: string };
  requestedByUserId: string;
  status: SignalGenerationRunStatus;
  modelVersion: string;
  rulesetVersion: string;
  sourceDataDate: string | null;
  generatedDate: string;
  batchSize: number;
  offset: number;
  totalCount: number;
  processedCount: number;
  generatedCount: number;
  updatedCount: number;
  noOpCount: number;
  duplicateOrIdempotentCount: number;
  skippedCount: number;
  failedCount: number;
  excludedByDataQuality: number;
  missingQualityEvaluationCount: number;
  durationMs: number;
  startedAt: string;
  completedAt: string | null;
  warnings: string[];
}

export interface SignalWriteResult {
  result: SignalResultDto;
  status: SignalWriteStatus;
}

export interface SignalStrategyMatchSummary {
  strategyCode: string;
  strategyName?: string;
  strategyVersion: string;
  decision: StrategyDecision;
  direction: StrategyDirection;
  score: number;
  confidence: SignalConfidence;
  reasons: string[];
  entryRulesPassed: string[];
  timeframe?: string | null;
  triggerPriceEvidence?: SignalTriggerPriceEvidence | null;
  readinessLabel?: StrategyReadinessLabel | null;
  ratingGrade?: StrategyRatingGrade | null;
  strategyDefinitionSource?: StrategyDefinitionSource | null;
  strategyDefinitionDrift?: StrategyDefinitionDrift[];
}

export interface SignalBlockedStrategySummary {
  strategyCode: string;
  strategyName?: string;
  strategyVersion: string;
  timeframe?: string | null;
  category?: string | null;
  blockers: string[];
  warnings: string[];
  dataGaps: string[];
  noiseFiltersTriggered: string[];
  reason: string;
  triggerPriceEvidence?: SignalTriggerPriceEvidence | null;
  strategyDefinitionSource?: StrategyDefinitionSource | null;
  strategyDefinitionDrift?: StrategyDefinitionDrift[];
}

export interface PaginatedSignalResponse {
  signals: SignalResultDto[];
  items?: SignalResultDto[];
  total: number;
  totalCount?: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
  filtersApplied?: Record<string, unknown>;
  scope?: {
    region: string;
    assetType: string;
  };
  directionCounts?: Record<SignalDirection, number>;
  warnings?: string[];
}

export interface SignalRunRequest {
  instrumentId?: string;
  instrumentIds?: string[];
  symbol?: string;
  researchContextMode?: 'FULL' | 'LIGHTWEIGHT';
  limit?: number;
  batchSize?: number;
  offset?: number;
  maxConcurrency?: number;
  providerThrottleMs?: number;
  direction?: SignalDirection;
  sector?: string;
  country?: string;
  region?: string;
  assetType?: string;
  modelVersion?: string;
  rulesetVersion?: string;
  requestedByUserId?: string;
  useDataQualityFilter?: boolean;
  minSignalReadinessScore?: number;
  allowedReadinessStatuses?: Array<'READY' | 'LIMITED' | 'NOT_READY'>;
  includeLimited?: boolean;
  skipUnusable?: boolean;
  missingQualityBehavior?: 'WARN_AND_PROCESS' | 'SKIP';
  strategyCode?: string;
  includeStrategyMatches?: boolean;
  onlyStrategyEligible?: boolean;
  excludeNoiseFiltered?: boolean;
  force?: boolean;
  /** Optional point-in-time date for historical signal generation.
   *  When provided, price windows are sliced to <= asOfDate, staleness is measured
   *  relative to asOfDate, fundamentals are filtered to periods ending <= asOfDate,
   *  and generatedDate/generatedAt are set from asOfDate instead of now.
   *  Omitting this field (or passing undefined) preserves today's behavior exactly. */
  asOfDate?: string | Date;
}

export interface SignalQuery {
  direction?: SignalDirection;
  minScore?: number;
  limit: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  sector?: string;
  country?: string;
  region?: string;
  assetType?: string;
  modelVersion?: string;
  signalType?: string;
  confidence?: SignalConfidence;
  search?: string;
  strategyCode?: string;
  includeStrategyMatches?: boolean;
  onlyStrategyEligible?: boolean;
  excludeNoiseFiltered?: boolean;
  hasStrategyMatch?: boolean;
  hasBlockedStrategies?: boolean;
  frameworkBackedDecisionAvailable?: boolean;
  /** When true, exclude SME-segment signals from results. Default: false (include all). */
  excludeSme?: boolean;
  /** When provided, only return signals matching this reliability tier. Default: include all. */
  reliabilityTier?: ReliabilityTier;
  /** When provided, filter signals to this lifecycle state (ENTRY | ACTIVE | EXIT | EXPIRED). */
  lifecycleState?: SignalLifecycleState;
}

export interface SignalHistoryQuery extends SignalQuery {
  instrumentId?: string;
  from?: string;
  to?: string;
}

export interface SignalRunResponse {
  generated: number;
  skipped: number;
  errors: string[];
  warnings: string[];
  dataQuality?: {
    filterApplied: boolean;
    beforeFilter: number;
    afterFilter: number;
    excludedByDataQuality: number;
    missingQualityEvaluationCount: number;
    eligibleInstrumentCount?: number;
    attemptedGenerationCount?: number;
  };
  results: SignalResultDto[];
  runAudit?: SignalGenerationRunAudit;
  generated_at: string;
  processedCount?: number;
  totalCount?: number;
  batchSize?: number;
  maxConcurrency?: number;
  providerThrottleMs?: number;
  offset?: number;
  nextOffset?: number | null;
  hasMore?: boolean;
  generatedCount?: number;
  updatedCount?: number;
  noOpCount?: number;
  skippedCount?: number;
  failedCount?: number;
  strategyMatchedCount?: number;
  strategyBlockedCount?: number;
  outOfScopeSkipped?: number;
  directionCountsGenerated?: Record<SignalDirection, number>;
  scope?: {
    region: string;
    assetType: string;
  };
  latestGeneratedAt?: string | null;
  durationMs?: number;
  eligibleInstrumentCount?: number;
  attemptedGenerationCount?: number;
}

export interface SignalPricePoint {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  adjusted_close: number;
  volume: number | null;
  /** Corporate-action-adjusted high — present when the price read layer supplies it.
   *  Falls back to raw `high` in indicators when absent (safe fallback). */
  adjusted_high?: number | null;
  /** Corporate-action-adjusted low — present when the price read layer supplies it.
   *  Falls back to raw `low` in indicators when absent (safe fallback). */
  adjusted_low?: number | null;
  /** Corporate-action-adjusted volume (split-factor applied) — present when the
   *  price read layer supplies it.  Falls back to raw `volume` in indicators. */
  adjusted_volume?: number | null;
}
