import type { SignalConfidence, SignalDirection, SignalItem, SignalResultDto } from '../signal-generation-engine';
import type { DataQualityEvaluationDto } from '../data-quality-engine';

export type CalibrationDataStatus = 'COMPLETE' | 'PARTIAL' | 'MISSING' | 'ERROR';
export type CalibrationAdjustmentType = 'SIGNAL_TYPE' | 'SCORE_BUCKET' | 'REGIME' | 'SECTOR' | 'SMART_MONEY' | 'DATA_QUALITY' | 'NOISE';
export type CalibrationConfidenceLevel = SignalConfidence | 'INSUFFICIENT_SAMPLE';
export type CalibrationEvidenceStatus = 'SUFFICIENT' | 'LOW_SAMPLE' | 'INSUFFICIENT' | 'MISSING';
export type CalibrationReadinessStatus = 'USABLE' | 'LIMITED' | 'UNAVAILABLE';
export type CalibrationDownstreamInfluence = 'NORMAL' | 'LIMITED' | 'NONE';
export type CalibrationAuthoritativeScore = 'CALIBRATED_SCORE' | 'RAW_SCORE' | 'NO_SCORE';

export interface CalibrationAdjustment {
  type: CalibrationAdjustmentType;
  label: string;
  delta: number;
  evidence?: Record<string, unknown>;
}

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
}

export interface CalibrationReadiness {
  status: CalibrationReadinessStatus;
  confidenceTier: CalibrationConfidenceLevel;
  calibrationApplied: boolean;
  adjustmentCapApplied: number;
  downstreamInfluence: CalibrationDownstreamInfluence;
  authoritativeScore: CalibrationAuthoritativeScore;
  reasons: string[];
  blockers: string[];
}

export interface SignalCalibrationResultDto {
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
  calibratedConfidence: CalibrationConfidenceLevel;
  boosts: CalibrationAdjustment[];
  penalties: CalibrationAdjustment[];
  calibrationReasons: string[];
  dataGaps: string[];
  calibrationModelVersion: string;
  rawSignalModelVersion: string | null;
  generatedAt: string;
  dataStatus: CalibrationDataStatus;
  dataQuality?: Pick<DataQualityEvaluationDto,
    'coverageScore' | 'coverageStatus' | 'signalReadinessScore' | 'signalReadinessStatus' |
    'liquidityScore' | 'liquidityStatus' | 'eligibleForSignals' | 'eligibleForCalibration' |
    'warnings' | 'readinessBlockers'
  > | null;
  researchUrl: string;

  calibrationApplied?: boolean;
  adjustmentCapApplied?: number;
  sampleSizePenaltyApplied?: boolean;
  calibrationEvidence?: CalibrationEvidence | null;
  calibrationReadiness?: CalibrationReadiness | null;
  overallEvaluatedSamples?: number;
  groupEvaluatedSamples?: number;
  evidenceStatus?: CalibrationEvidenceStatus;
  confidenceTier?: CalibrationConfidenceLevel;
  downstreamInfluence?: CalibrationDownstreamInfluence;
  authoritativeScore?: CalibrationAuthoritativeScore;
  warningsCount?: number;
}

export interface CalibrationRunRequest {
  instrumentId?: string;
  symbol?: string;
  limit?: number;
  batchSize?: number;
  offset?: number;
  direction?: SignalDirection;
  sector?: string;
  country?: string;
  region?: string;
  assetType?: string;
  horizon?: string;
}

export interface CalibrationQuery {
  direction?: SignalDirection;
  minScore?: number;
  limit: number;
  offset?: number;
  sector?: string;
  country?: string;
  region?: string;
  assetType?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  confidence?: SignalConfidence;
  calibrationConfidence?: string;
  evidenceStatus?: string;
  search?: string;
  horizon?: string;
  minRawScore?: number;
  minCalibratedScore?: number;
  minAbsDelta?: number;
  hasDataGaps?: boolean;
}

export interface PaginatedCalibrationResponse {
  items: SignalCalibrationResultDto[];
  totalCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

export interface CalibrationRunResponse {
  generated: number;
  skipped: number;
  errors: string[];
  results: SignalCalibrationResultDto[];
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

export interface CalibrationHealthResponse {
  status: 'ok';
  module: 'signal-calibration-engine';
  calibrationModelVersion: string;
  calibratedSignals: number;
  latestGeneratedAt: string | null;
  dataStatus: CalibrationDataStatus;
  gaps: string[];
  calibrationEvidence: CalibrationEvidence;
  calibrationReadiness: CalibrationReadiness;
}

export interface CalibrationComparison {
  rawSignal: SignalResultDto;
  calibratedSignal: SignalCalibrationResultDto;
}

export interface CalibrationModelInfo {
  calibrationModelVersion: string;
  qualityMetricWindow: string;
  supportedHorizons: string[];
  defaultHorizon: string;
  minSampleSize: number;
  minOverallSamples: number;
  minGroupSamples: number;
  perAdjustmentDeltaCap: number;
  totalDeltaCap: number;
  confidenceThresholds: {
    HIGH: { overall: number; group: number };
    MEDIUM: { overall: number; group: number };
    LOW: { overall: number; group: number };
  };
  adjustmentCaps: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    INSUFFICIENT_SAMPLE: number;
  };
  rules: string[];
  sampleSafetyRules: string[];
  calibrationReadinessRules: string[];
  fallbackBehavior: string;
  safeLanguageRules: string[];
}

export interface CalibrationContext {
  signalTypeMetrics: Map<string, { winRate: number | null; averageForwardReturn: number | null; sampleSize: number }>;
  scoreBucketMetric: { winRate: number | null; averageForwardReturn: number | null; sampleSize: number } | null;
  sectorMetric: { winRate: number | null; averageForwardReturn: number | null; sampleSize: number } | null;
  regime: string | null;
  sectorLeadership: string | null;
  smartMoneyStatus: string | null;
  dataQuality: any | null;
  dataQualityEvaluation?: DataQualityEvaluationDto | null;
  noisyIssueTypes: string[];
  dataGaps: string[];
  horizonAvailability?: Record<string, { eligible: number; evaluated: number; insufficientFuturePrice: number }> | null;
  evaluationDiagnostics?: any | null;
  horizon: string;
}

export interface SignalLikeForCalibration {
  id?: string;
  instrument_id: string;
  symbol: string;
  company_name: string | null;
  sector: string | null;
  country: string | null;
  score: number;
  direction: SignalDirection;
  confidence: SignalConfidence;
  triggered_signals: SignalItem[];
  negative_signals: SignalItem[];
  generated_at: string;
  modelVersion?: string | null;
}
