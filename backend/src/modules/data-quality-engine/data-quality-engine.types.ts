export type CoverageStatus = 'GOOD' | 'PARTIAL' | 'POOR' | 'UNUSABLE';
export type SignalReadinessStatus = 'READY' | 'LIMITED' | 'NOT_READY';
export type LiquidityStatus = 'LIQUID' | 'THIN' | 'ILLIQUID' | 'UNKNOWN';
export type DataQualityStatus = CoverageStatus | SignalReadinessStatus | LiquidityStatus;

export interface DataQualityQuery {
  status?: CoverageStatus;
  readinessStatus?: SignalReadinessStatus;
  liquidityStatus?: LiquidityStatus;
  sector?: string;
  country?: string;
  minCoverageScore?: number;
  minReadinessScore?: number;
  limit: number;
  offset: number;
}

export interface DataQualityEvaluateRequest {
  instrumentId?: string;
  symbol?: string;
  batchSize: number;
  offset: number;
}

export interface DataQualityEvaluationDto {
  id?: string;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  currency: string | null;
  coverageScore: number;
  coverageStatus: CoverageStatus;
  signalReadinessScore: number;
  signalReadinessStatus: SignalReadinessStatus;
  liquidityScore: number;
  liquidityStatus: LiquidityStatus;
  eligibleForSignals: boolean;
  eligibleForBacktesting: boolean;
  eligibleForCalibration: boolean;
  dataGaps: string[];
  warnings: string[];
  readinessReasons: string[];
  readinessBlockers: string[];
  recommendedFixes: string[];
  lastEvaluatedAt: string;
  researchUrl: string;
}

export interface DataQualitySummary {
  totalInstruments: number;
  goodCoverageCount: number;
  partialCoverageCount: number;
  poorCoverageCount: number;
  unusableCoverageCount: number;
  signalReadyCount: number;
  notSignalReadyCount: number;
  stalePriceCount: number;
  missingFundamentalsCount: number;
  missingSectorCount: number;
  missingIndustryCount: number;
  missingCountryCount: number;
  lowLiquidityCount: number;
  missingVolumeCount: number;
  latestEvaluationAt: string | null;
  dataStatus: 'COMPLETE' | 'PARTIAL' | 'MISSING';
}

export interface DataQualityEvaluateResponse {
  processedCount: number;
  totalCount: number;
  batchSize: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  evaluatedCount: number;
  skippedCount: number;
  failedCount: number;
  warnings: string[];
  durationMs: number;
}

export interface PriceForQuality {
  date: string | Date;
  close: number;
  adjusted_close?: number | null;
  volume?: number | null;
  data_status?: string;
}
