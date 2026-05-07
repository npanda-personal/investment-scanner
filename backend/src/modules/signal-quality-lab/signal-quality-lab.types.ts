import type { SignalConfidence, SignalDirection, SignalItem, SignalResultDto } from '../signal-generation-engine';

export type QualityHorizon = '1D' | '5D' | '10D' | '20D' | '60D';
export type NoiseSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface QualityQuery {
  horizon: QualityHorizon;
  direction?: SignalDirection;
  sector?: string;
  country?: string;
  region?: string;
  assetType?: string;
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
  inserted: number;
  updated: number;
  skipped: number;
  evaluatedInBatch: number;
  insufficientFuturePriceInBatch: number;
  missingPriceHistoryInBatch: number;
  outcomesPersisted: boolean;
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
  totalSignals: number;
  evaluatedSignals: number;
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
}

export type HorizonAvailabilitySummary = Record<QualityHorizon, HorizonAvailabilityItem>;

export interface EvaluationDiagnostics {
  totalSignals: number;
  signalsAfterFilters: number;
  evaluatedSignals: number;
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
