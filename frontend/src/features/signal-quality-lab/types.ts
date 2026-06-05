export type QualityHorizon = '1D' | '5D' | '10D' | '20D' | '60D';
export type EvidenceUsability = 'USABLE' | 'LIMITED' | 'UNAVAILABLE';

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
  evaluationDiagnostics: EvaluationDiagnostics;
  horizonAvailability: HorizonAvailabilitySummary;
  recommendedAction: string;
  warnings: string[];
  dataQualityFilterSummary?: {
    totalSignalsBeforeFilter: number;
    totalSignalsAfterFilter: number;
    excludedByDataQuality: number;
    missingQualityEvaluationCount: number;
    filterApplied: boolean;
  };
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

export interface QualityFilters {
  readinessStatus?: '' | 'READY' | 'LIMITED' | 'NOT_READY';
  coverageStatus?: '' | 'GOOD' | 'PARTIAL' | 'POOR' | 'UNUSABLE';
  liquidityStatus?: '' | 'LIQUID' | 'THIN' | 'ILLIQUID' | 'UNKNOWN';
  modelVersion?: string;
  onlySignalReady?: boolean;
  excludePoorQuality?: boolean;
}

export interface SignalTypePerformance extends QualityMetricGroup {
  signalType: string;
  category: string;
}

export interface NoisySignalItem {
  instrumentId: string;
  symbol: string;
  issueType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  evidence: Record<string, unknown>;
  researchUrl: string;
}

export interface SignalHistoryItem {
  signalResultId: string;
  instrument_id: string;
  symbol: string;
  company_name: string | null;
  sector: string | null;
  country: string | null;
  score: number;
  direction: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  explanation: string;
  generated_at: string;
  modelVersion?: string | null;
  researchUrl: string;
}

export interface SignalOutcomeSet {
  signalResultId: string;
  instrumentId: string;
  symbol: string;
  generatedAt: string;
  outcomes: Array<{
    horizon: QualityHorizon;
    forwardReturnPercent: number | null;
    available: boolean;
    priceAtSignal: number | null;
    futurePrice: number | null;
    futureDate: string | null;
  }>;
  maxFavorableMovePercent: number | null;
  maxAdverseMovePercent: number | null;
  maxDrawdownPercent: number | null;
  researchUrl: string;
}

export interface QualityRecalculateRequest {
  batchSize?: number;
  offset?: number;
  horizon?: QualityHorizon;
  region?: string;
  assetType?: string;
  modelVersion?: string;
  from?: string;
  to?: string;
}

// ---------------------------------------------------------------------------
// Scorecard types (task #12 — Signal Track-Record Scorecard read API)
// ---------------------------------------------------------------------------

export type WinRateConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type ScorecardGroupBy = 'direction' | 'sector' | 'scoreBucket';

/**
 * One row in the scorecard — one (horizon x groupKey) combination.
 * winRateConfidence must be shown alongside winRate; a 60% rate from 22 samples
 * (LOW) must not be treated the same as one from 500 (HIGH).
 */
export interface ScorecardRow {
  horizon: QualityHorizon;
  groupKey: string;
  sampleSize: number;
  directionalSampleSize: number;
  winRate: number | null;
  winRateConfidence: WinRateConfidence | null;
  avgReturnPercent: number | null;
  avgAlphaPercent?: number | null;
  medianReturnPercent: number | null;
  expectancy: number | null;
  profitFactor: number | null;
  avgMaxAdverseExcursion: number | null;
  avgMaxFavorableExcursion: number | null;
  bestReturnPercent: number | null;
  worstReturnPercent: number | null;
}

/** Per-horizon rollup (all groupBy dimensions collapsed). */
export interface ScorecardSummary {
  horizon: QualityHorizon;
  sampleSize: number;
  directionalSampleSize: number;
  winRate: number | null;
  winRateConfidence: WinRateConfidence | null;
  avgReturnPercent: number | null;
  avgAlphaPercent?: number | null;
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
  horizon: QualityHorizon | null;
  rows: ScorecardRow[];
  summary: ScorecardSummary[];
}

export interface QualityRecalculateResponse {
  processedCount: number;
  totalCount: number;
  batchSize: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  selectedHorizon?: QualityHorizon;
  evidenceUsability?: EvidenceUsability;
  inserted: number;
  updated: number;
  skipped: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  matureSignalsInBatch?: number;
  evaluatedInBatch: number;
  evaluatedCount: number;
  notYetMatureInBatch?: number;
  unevaluatedInBatch: number;
  unevaluatedCount: number;
  insufficientFuturePriceInBatch: number;
  insufficientFuturePriceCount?: number;
  missingPriceHistoryInBatch: number;
  missingPriceHistoryCount: number;
  outcomesPersisted: boolean;
  message: string;
  warnings: string[];
  durationMs: number;
}
