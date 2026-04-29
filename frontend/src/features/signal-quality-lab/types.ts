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
  dataQualityFilterSummary?: {
    totalSignalsBeforeFilter: number;
    totalSignalsAfterFilter: number;
    excludedByDataQuality: number;
    missingQualityEvaluationCount: number;
    filterApplied: boolean;
  };
}

export interface QualityMetricGroup {
  group: string;
  horizon: QualityHorizon;
  sampleSize: number;
  winRate: number | null;
  averageForwardReturn: number | null;
  medianForwardReturn: number | null;
  averageMaxDrawdown: number | null;
  bestReturn: number | null;
  worstReturn: number | null;
  positiveCount: number;
  negativeCount: number;
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
  warnings: string[];
  durationMs: number;
}
