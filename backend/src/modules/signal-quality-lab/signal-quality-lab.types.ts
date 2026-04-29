import type { SignalConfidence, SignalDirection, SignalItem, SignalResultDto } from '../signal-generation-engine';

export type QualityHorizon = '1D' | '5D' | '10D' | '20D' | '60D';
export type NoiseSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface QualityQuery {
  horizon: QualityHorizon;
  direction?: SignalDirection;
  sector?: string;
  country?: string;
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
  maxFavorableMovePercent: number | null;
  maxAdverseMovePercent: number | null;
  maxDrawdownPercent: number | null;
  researchUrl: string;
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
}

export interface PricePoint {
  date: string;
  adjustedClose: number;
}

export interface ParsedSignalType {
  code: string;
  category: string;
  label: string;
  polarity: 'POSITIVE' | 'NEGATIVE';
  item: SignalItem;
}
