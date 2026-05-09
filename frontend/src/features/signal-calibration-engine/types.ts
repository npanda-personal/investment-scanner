import type { SignalConfidence, SignalDirection, SignalResult } from '@/features/signal-generation-engine';

export interface CalibrationAdjustment {
  type: string;
  label: string;
  delta: number;
  evidence?: Record<string, unknown>;
}

export type CalibrationEvidenceStatus = 'SUFFICIENT' | 'LOW_SAMPLE' | 'INSUFFICIENT' | 'MISSING';

export interface CalibrationEvidence {
  horizon: string;
  overallEvaluatedSamples: number;
  groupEvaluatedSamples: number;
  minimumOverallSamples: number;
  minimumGroupSamples: number;
  horizonAvailability: Record<string, { eligible: number; evaluated: number; insufficientFuturePrice: number }>;
  dataStatus: string;
  evidenceStatus: CalibrationEvidenceStatus;
  evidenceReasons: string[];
  evidenceWarnings: string[];
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
  overallEvaluatedSamples?: number;
  groupEvaluatedSamples?: number;
  evidenceStatus?: CalibrationEvidenceStatus;
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
}
