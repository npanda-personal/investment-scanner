export type CoverageStatus = 'GOOD' | 'PARTIAL' | 'POOR' | 'UNUSABLE';
export type SignalReadinessStatus = 'READY' | 'LIMITED' | 'NOT_READY';
export type LiquidityStatus = 'LIQUID' | 'THIN' | 'ILLIQUID' | 'UNKNOWN';
export type DataQualityStatus = CoverageStatus | SignalReadinessStatus | LiquidityStatus;
export type DataQualityUseCaseTierStatus = 'READY' | 'LIMITED' | 'BLOCKED';

export interface DataQualityUseCaseTier {
  status: DataQualityUseCaseTierStatus;
  reasons: string[];
}

export interface DataQualityUseCaseTiers {
  dailyReview: DataQualityUseCaseTier;
  signal: DataQualityUseCaseTier;
  backtest: DataQualityUseCaseTier;
  calibration: DataQualityUseCaseTier;
  automation: DataQualityUseCaseTier;
}

export interface DataQualityTierEvidence {
  trustedBaselineResidualState?: string | null;
  requiredHistoryStatus?: string | null;
  listingDateStatus?: string | null;
  trustedBaselineBlockerCodes?: string[];
  hasSignalHistory?: boolean;
}

export interface DataQualityQuery {
  search?: string;
  status?: CoverageStatus;
  readinessStatus?: SignalReadinessStatus;
  liquidityStatus?: LiquidityStatus;
  sector?: string;
  country?: string;
  region?: string;
  assetType?: string;
  eligibleForSignals?: boolean;
  eligibleForBacktesting?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  minCoverageScore?: number;
  minReadinessScore?: number;
  limit: number;
  offset: number;
}

export interface DataQualityEvaluateRequest {
  instrumentId?: string;
  symbol?: string;
  region?: string;
  assetType?: string;
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
  useCaseTiers?: DataQualityUseCaseTiers;
  tierEvidence?: DataQualityTierEvidence;
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

export interface DataQualityListResponse {
  items: DataQualityEvaluationDto[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
  };
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

export interface DataQualityScheduledEvaluateRequest {
  instrumentIds: string[];
  region: string;
  assetType: string;
  batchSize: number;
}

export interface DataQualityScheduledEvaluateResponse {
  processedCount: number;
  totalCount: number;
  evaluatedCount: number;
  failedCount: number;
  skippedCount: number;
  warnings: string[];
  durationMs: number;
}

export interface DataQualityFilterOptions {
  minSignalReadinessScore?: number;
  allowedReadinessStatuses?: SignalReadinessStatus[];
  includeLimited?: boolean;
  skipUnusable?: boolean;
  missingQualityBehavior?: 'WARN_AND_PROCESS' | 'SKIP';
  excludeNotReady?: boolean;
  excludeIlliquid?: boolean;
  excludeMissingQuality?: boolean;
}

export interface DataQualityFilterResult {
  eligibleInstrumentIds: string[];
  excludedInstrumentIds: string[];
  missingQualityEvaluationCount: number;
  warnings: string[];
  evaluationsByInstrumentId: Record<string, DataQualityEvaluationDto>;
}

export interface PriceForQuality {
  date: string | Date;
  close: number;
  adjusted_close?: number | null;
  volume?: number | null;
  data_status?: string;
}
