import type { SignalConfidence, SignalDirection, SignalResult } from '@/features/signal-generation-engine';

export interface CalibrationAdjustment {
  type: string;
  label: string;
  delta: number;
  evidence?: Record<string, unknown>;
}

export type CalibrationEvidenceStatus = 'SUFFICIENT' | 'LOW_SAMPLE' | 'INSUFFICIENT' | 'MISSING';
export type CalibrationEvidenceBasisStatus = 'MEASURED' | 'HORIZON_LIMITED' | 'MISSING_SIGNAL_QUALITY_EVIDENCE';
export type CalibrationReadinessStatus = 'USABLE' | 'LIMITED' | 'UNAVAILABLE';
export type CalibrationDownstreamInfluence = 'NORMAL' | 'LIMITED' | 'NONE';
export type CalibrationAuthoritativeScore = 'CALIBRATED_SCORE' | 'RAW_SCORE' | 'NO_SCORE';

export interface CalibrationEvidence {
  horizon: string;
  overallEvaluatedSamples: number;
  groupEvaluatedSamples: number;
  minimumOverallSamples: number;
  minimumGroupSamples: number;
  requiredOverallSamples: number;
  requiredGroupSamples: number;
  horizonAvailability: Record<string, { eligible: number; evaluated: number; insufficientFuturePrice: number }>;
  dataStatus: string;
  evidenceStatus: CalibrationEvidenceStatus;
  evidenceReasons: string[];
  evidenceWarnings: string[];
  warnings: string[];
  evidenceBasis: CalibrationEvidenceBasis;
}

export interface CalibrationEvidenceBasis {
  status: CalibrationEvidenceBasisStatus;
  signalQualityGeneratedAt: string | null;
  latestMeasurablePriceDate: string | null;
  nextEvaluableDate: string | null;
  reasonSummary: string;
}

export interface CalibrationReadiness {
  status: CalibrationReadinessStatus;
  confidenceTier: SignalConfidence | 'INSUFFICIENT_SAMPLE';
  calibrationApplied: boolean;
  adjustmentCapApplied: number;
  downstreamInfluence: CalibrationDownstreamInfluence;
  authoritativeScore: CalibrationAuthoritativeScore;
  reasons: string[];
  blockers: string[];
}

export interface SignalCalibrationResult {
  id?: string;
  signalResultId: string;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  sector: string | null;
  country: string | null;
  exchange?: string | null;
  region?: string | null;
  assetType?: string | null;
  rawScore: number;
  calibratedScore: number;
  scoreDelta: number;
  rawDirection: SignalDirection;
  calibratedDirection: SignalDirection;
  rawConfidence: SignalConfidence;
  calibratedConfidence: SignalConfidence | 'INSUFFICIENT_SAMPLE';
  boosts: CalibrationAdjustment[];
  penalties: CalibrationAdjustment[];
  calibrationReasons: string[];
  dataGaps: string[];
  calibrationModelVersion: string;
  rawSignalModelVersion: string | null;
  generatedAt: string;
  dataStatus: string;
  dataQuality?: {
    coverageScore: number;
    coverageStatus: string;
    signalReadinessScore: number;
    signalReadinessStatus: string;
    liquidityScore: number;
    liquidityStatus: string;
    eligibleForSignals: boolean;
    eligibleForCalibration: boolean;
    warnings: string[];
    readinessBlockers: string[];
  } | null;
  researchUrl: string;
  
  // New evidence and sample fields
  calibrationApplied?: boolean;
  adjustmentCapApplied?: number;
  sampleSizePenaltyApplied?: boolean;
  calibrationEvidence?: CalibrationEvidence | null;
  calibrationReadiness?: CalibrationReadiness | null;
  overallEvaluatedSamples?: number;
  groupEvaluatedSamples?: number;
  evidenceStatus?: CalibrationEvidenceStatus;
  confidenceTier?: SignalConfidence | 'INSUFFICIENT_SAMPLE';
  downstreamInfluence?: CalibrationDownstreamInfluence;
  authoritativeScore?: CalibrationAuthoritativeScore;
  warningsCount?: number;
}

export interface CalibrationRunResponse {
  generated: number;
  skipped: number;
  errors: string[];
  results: SignalCalibrationResult[];
  generatedAt: string;
  processedCount: number;
  totalCount: number;
  batchSize: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  selectedHorizon?: string;
  calibrationEvidence?: CalibrationEvidence | null;
  calibrationReadiness?: CalibrationReadiness | null;
  calibratedCount: number;
  passthroughCount: number;
  skippedCount: number;
  failedCount: number;
  outOfScopeSkipped?: number;
  warnings: string[];
  durationMs: number;
}

export interface CalibrationComparison {
  rawSignal: SignalResult;
  calibratedSignal: SignalCalibrationResult;
}

export interface CalibrationModelInfo {
  calibrationModelVersion: string;
  qualityMetricWindow: string;
  supportedHorizons?: string[];
  defaultHorizon?: string;
  minSampleSize: number;
  minOverallSamples?: number;
  minGroupSamples?: number;
  perAdjustmentDeltaCap: number;
  totalDeltaCap: number;
  confidenceThresholds?: {
    HIGH: { overall: number; group: number };
    MEDIUM: { overall: number; group: number };
    LOW: { overall: number; group: number };
  };
  adjustmentCaps?: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    INSUFFICIENT_SAMPLE: number;
  };
  rules: string[];
  sampleSafetyRules?: string[];
  calibrationReadinessRules?: string[];
  fallbackBehavior?: string;
  safeLanguageRules?: string[];
}

export interface PaginatedCalibrationResponse {
  items: SignalCalibrationResult[];
  totalCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  pageSummary?: CalibrationPageSummary;
}

export interface CalibrationPageSummary {
  scope: {
    region: string;
    assetType: string;
    horizon: string;
  };
  itemsOnPage: number;
  totalScopedRows: number;
  calibrationEvidence: CalibrationEvidence;
  calibrationReadiness: CalibrationReadiness;
}
