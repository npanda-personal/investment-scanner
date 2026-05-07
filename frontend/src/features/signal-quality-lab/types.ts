export type QualityHorizon = '1D' | '5D' | '10D' | '20D' | '60D';

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
