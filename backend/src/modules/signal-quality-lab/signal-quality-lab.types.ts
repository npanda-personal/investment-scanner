import type { SignalConfidence, SignalDirection, SignalItem, SignalResultDto } from '../signal-generation-engine';

export type QualityHorizon = '1D' | '5D' | '10D' | '20D' | '60D';
export type NoiseSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type EvidenceUsability = 'USABLE' | 'LIMITED' | 'UNAVAILABLE';

export interface QualityQuery {
  horizon: QualityHorizon;
  direction?: SignalDirection;
  sector?: string;
  country?: string;
  region?: string;
  assetType?: string;
  modelVersion?: string;
  from?: string;
  to?: string;
  limit: number;
  minSampleSize: number;
  readinessStatus?: 'READY' | 'LIMITED' | 'NOT_READY';
  coverageStatus?: 'GOOD' | 'PARTIAL' | 'POOR' | 'UNUSABLE';
  liquidityStatus?: 'LIQUID' | 'THIN' | 'ILLIQUID' | 'UNKNOWN';
  minReadinessScore?: number;
  onlySignalReady?: boolean;
  excludePoorQuality?: boolean;
}

export interface DataQualityFilterSummary {
  totalSignalsBeforeFilter: number;
  totalSignalsAfterFilter: number;
  excludedByDataQuality: number;
  missingQualityEvaluationCount: number;
  filterApplied: boolean;
}

export interface QualityRecalculateRequest {
  batchSize: number;
  offset: number;
  horizon?: QualityHorizon;
  region?: string;
  assetType?: string;
  modelVersion?: string;
  instrumentIds?: string[];
  from?: string;
  to?: string;
}

export interface QualityRecalculateResponse {
  processedCount: number;
  totalCount: number;
  batchSize: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  selectedHorizon: QualityHorizon;
  evidenceUsability: EvidenceUsability;
  inserted: number;
  updated: number;
  skipped: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  matureSignalsInBatch: number;
  evaluatedInBatch: number;
  evaluatedCount: number;
  notYetMatureInBatch: number;
  unevaluatedInBatch: number;
  unevaluatedCount: number;
  insufficientFuturePriceInBatch: number;
  insufficientFuturePriceCount: number;
  missingPriceHistoryInBatch: number;
  missingPriceHistoryCount: number;
  outcomesPersisted: boolean;
  signalsProcessed?: number;
  rowsUpserted?: number;
  matureCount?: number;
  immatureCount?: number;
  message: string;
  warnings: string[];
  durationMs: number;
}

export interface SignalHistoryItem extends SignalResultDto {
  signalResultId: string;
  researchUrl: string;
}

export interface ForwardOutcome {
  horizon: QualityHorizon;
  forwardReturnPercent: number | null;
  available: boolean;
  priceAtSignal: number | null;
  futurePrice: number | null;
  futureDate: string | null;
}

export interface SignalOutcomeSet {
  signalResultId: string;
  instrumentId: string;
  symbol: string;
  direction: SignalDirection;
  confidence: SignalConfidence;
  score: number;
  sector: string | null;
  country: string | null;
  generatedAt: string;
  outcomes: ForwardOutcome[];
  priceHistoryAvailable: boolean;
  startPriceDate: string | null;
  latestAvailablePriceDate: string | null;
  futureRowsAvailable: number;
  maxFavorableMovePercent: number | null;
  maxAdverseMovePercent: number | null;
  maxDrawdownPercent: number | null;
  researchUrl: string;
}

export interface QualityMetricGroup {
  group: string;
  name?: string;
  horizon: QualityHorizon;
  rawSignalCount: number;
  sampleSize: number;
  samples: number;
  unevaluatedCount: number;
  winRate: number | null;
  averageForwardReturn: number | null;
  averageReturn: number | null;
  medianForwardReturn: number | null;
  medianReturn: number | null;
  averageMaxDrawdown: number | null;
  bestReturn: number | null;
  worstReturn: number | null;
  positiveCount: number;
  negativeCount: number;
  status: 'EVALUATED' | 'INSUFFICIENT_FUTURE_DATA' | 'MISSING_PRICE_DATA' | 'FILTERED_OUT' | 'SMALL_SAMPLE';
  reason: string | null;
}

export interface SignalTypePerformance extends QualityMetricGroup {
  signalType: string;
  category: string;
}

export interface NoisySignalItem {
  instrumentId: string;
  symbol: string;
  issueType: string;
  severity: NoiseSeverity;
  description: string;
  evidence: Record<string, unknown>;
  researchUrl: string;
}

export interface QualitySummary {
  selectedHorizon: QualityHorizon;
  evidenceUsability: EvidenceUsability;
  totalSignals: number;
  matureSignals: number;
  evaluatedSignals: number;
  notYetMatureSignals: number;
  unevaluatedSignals: number;
  overallBullishWinRate: number | null;
  overallBearishWinRate: number | null;
  average5DReturn: number | null;
  average20DReturn: number | null;
  bestPerformingSignalType: string | null;
  worstPerformingSignalType: string | null;
  bestSector: string | null;
  worstSector: string | null;
  noisySignalCount: number;
  dataStatus: 'COMPLETE' | 'PARTIAL' | 'MISSING';
  generatedAt: string;
  dataQualityFilterSummary?: DataQualityFilterSummary;
  evaluationDiagnostics: EvaluationDiagnostics;
  horizonAvailability: HorizonAvailabilitySummary;
  recommendedAction: string;
  warnings: string[];
}

export interface PricePoint {
  date: string;
  adjustedClose: number;
}

export interface HorizonAvailabilityItem {
  eligible: number;
  evaluated: number;
  insufficientFuturePrice: number;
  missingPriceHistory: number;
  evidenceUsability: EvidenceUsability;
}

export type HorizonAvailabilitySummary = Record<QualityHorizon, HorizonAvailabilityItem>;

export interface EvaluationDiagnostics {
  totalSignals: number;
  signalsAfterFilters: number;
  matureSignals: number;
  evaluatedSignals: number;
  notYetMatureSignals: number;
  unevaluatedSignals: number;
  insufficientFuturePriceCount: number;
  missingPriceHistoryCount: number;
  missingInstrumentCount: number;
  excludedByDataQualityCount: number;
  excludedByDateFilterCount: number;
  excludedByDirectionCount: number;
  selectedHorizon: QualityHorizon;
  earliestSignalDate: string | null;
  latestSignalDate: string | null;
  latestAvailablePriceDate: string | null;
  minimumRequiredFutureRows: number;
  nextEvaluableDate: string | null;
  recommendedAction: string;
  warnings: string[];
}

export interface ParsedSignalType {
  code: string;
  category: string;
  label: string;
  polarity: 'POSITIVE' | 'NEGATIVE';
  item: SignalItem;
}

/** One horizon row ready to upsert into signal_outcomes. */
export interface SignalOutcomeUpsert {
  signalResultId: string;
  instrumentId: string;
  symbol: string;
  direction: string;
  score: number;
  sector: string | null;
  country: string | null;
  modelVersion: string;
  signalGeneratedDate: Date;
  horizon: QualityHorizon;
  dataComplete: boolean;
  priceAtSignal: number | null;
  futurePrice: number | null;
  windowEndDate: Date | null;
  forwardReturnPercent: number | null;
  maxFavorableExcursion: number | null;
  maxAdverseExcursion: number | null;
  maxDrawdownPercent: number | null;
  evaluatedAt: Date;
}

/** Summary returned by upsertOutcomeBatch. */
export interface OutcomeBatchResult {
  upserted: number;
}

/** Extended recalculate request that enables persistence. */
export interface QualityRecalculateWithPersistRequest extends QualityRecalculateRequest {
  persistOutcomes?: boolean;
}

// ---------------------------------------------------------------------------
// Scorecard types (Slice 2)
// ---------------------------------------------------------------------------

export type ScorecardGroupBy = 'direction' | 'sector' | 'scoreBucket';

export interface ScorecardQuery {
  /** Filter to a specific horizon; if omitted, all horizons are returned grouped by horizon. */
  horizon?: QualityHorizon;
  /** Dimension to group within each horizon. Default: 'direction'. */
  groupBy?: ScorecardGroupBy;
  /** Optional pre-filter: only include rows for this direction. */
  direction?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  /** Optional pre-filter: only include rows for this sector. */
  sector?: string;
  /** Optional pre-filter: only include rows for this modelVersion. */
  modelVersion?: string;
  /** Optional date range filter on signalGeneratedDate (ISO string, inclusive). */
  from?: string;
  to?: string;
  /**
   * Minimum directionalSampleSize to include a row in the response.
   * Rows below this threshold are filtered out. Default: 1.
   */
  minSampleSize?: number;
}

/**
 * One row in the scorecard — represents one (horizon × groupKey) combination.
 */
export interface ScorecardRow {
  /** The horizon this row applies to, e.g. '5D'. */
  horizon: QualityHorizon;
  /** The value of the groupBy dimension, e.g. 'BULLISH', 'Technology', '60-79'. */
  groupKey: string;
  /**
   * Total rows with dataComplete=true in this group (includes NEUTRAL).
   * Used for avg return etc.
   */
  sampleSize: number;
  /**
   * Rows that are BULLISH or BEARISH (excluding NEUTRAL).
   * This is the win-rate denominator.
   */
  directionalSampleSize: number;
  /**
   * Win rate over directional rows only.
   * BULLISH win = forwardReturnPercent > 0; BEARISH win = forwardReturnPercent < 0.
   * null when directionalSampleSize === 0.
   */
  winRate: number | null;
  avgReturnPercent: number | null;
  medianReturnPercent: number | null;
  /**
   * Expectancy = (winRate × avgWin) + ((1 − winRate) × avgLoss).
   * Computed over directional rows only. null when not enough data.
   */
  expectancy: number | null;
  /**
   * Profit factor = sum(positive returns) / |sum(negative returns)|.
   * null when no negative returns exist (infinite profit factor treated as null).
   */
  profitFactor: number | null;
  avgMaxAdverseExcursion: number | null;
  avgMaxFavorableExcursion: number | null;
  bestReturnPercent: number | null;
  worstReturnPercent: number | null;
}

/**
 * Overall (all groupBy dimensions collapsed) stats per horizon.
 * Same fields as ScorecardRow minus groupKey.
 */
export interface ScorecardSummary {
  horizon: QualityHorizon;
  sampleSize: number;
  directionalSampleSize: number;
  winRate: number | null;
  avgReturnPercent: number | null;
  medianReturnPercent: number | null;
  expectancy: number | null;
  profitFactor: number | null;
  avgMaxAdverseExcursion: number | null;
  avgMaxFavorableExcursion: number | null;
  bestReturnPercent: number | null;
  worstReturnPercent: number | null;
}

export interface ScorecardResponse {
  groupBy: ScorecardGroupBy;
  /** Echoes back the horizon filter if one was supplied. */
  horizon: QualityHorizon | null;
  rows: ScorecardRow[];
  /** Per-horizon summary (one entry per horizon present in rows, or all 5 when horizon is null). */
  summary: ScorecardSummary[];
}

// ---------------------------------------------------------------------------
// Persisted-outcome metrics types (Slice 3)
// ---------------------------------------------------------------------------

/**
 * Query parameters for deriving calibration quality metrics from persisted
 * signal_outcomes (dataComplete=true) rows.
 */
export interface PersistedOutcomeMetricsQuery {
  horizon: QualityHorizon;
  modelVersion?: string;
}

/**
 * One signal-type row from the persisted-outcome signal-type aggregation.
 */
export interface PersistedSignalTypeRow {
  horizon: QualityHorizon;
  signalTypeCode: string;
  sampleSize: number;
  directionalSampleSize: number;
  winRate: number | null;
  avgReturnPercent: number | null;
}

/**
 * The same grouping arrays consumed by the calibration engine's
 * prepareQualityMetrics helper, but sourced from persisted signal_outcomes.
 * noisy is always empty — noisy detection requires in-memory signal history
 * and is not derivable from persisted outcomes.
 */
export interface PersistedQualityMetrics {
  byType: SignalTypePerformance[];
  byScore: QualityMetricGroup[];
  bySector: QualityMetricGroup[];
  /**
   * Noisy-signal items detected via a lightweight on-demand pass that reuses
   * detectNoisySignals. Win-rate/return metrics come from persisted SQL
   * aggregates; only the noisy list is derived from in-memory signal history
   * so that noisy penalties are never dropped when the persisted path is used.
   */
  noisy: NoisySignalItem[];
  /** Number of mature (dataComplete=true) outcome rows for the selected horizon. */
  matureCount: number;
}
