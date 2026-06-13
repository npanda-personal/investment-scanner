import type { SignalConfidence, SignalDirection, SignalItem, SignalResultDto } from '../signal-generation-engine';
import type { DataQualityEvaluationDto } from '../data-quality-engine';
import type { NoisySignalItem, QualityMetricGroup, SignalTypePerformance } from '../signal-quality-lab';
import type { EligibilityFacts } from '../../shared/types/eligibility-policy';

/** Which data path produced the quality metrics used for calibration. */
export type MetricsSource = 'PERSISTED_OUTCOMES' | 'ON_DEMAND';

/** A signal-type metric keyed lookup (winRate / forward return / sample size). */
export type SignalTypeMetric = { winRate: number | null; averageForwardReturn: number | null; sampleSize: number };

/**
 * Pre-aggregated Signal Quality metrics for a calibration batch, indexed for
 * O(1) per-signal lookup so grouping is fetched once per batch, not per signal.
 */
export interface BatchQualityMetrics {
  byType: SignalTypePerformance[];
  byScore: QualityMetricGroup[];
  bySector: QualityMetricGroup[];
  noisy: NoisySignalItem[];
  signalTypeMetrics: Map<string, SignalTypeMetric>;
  scoreBucketMetrics: Map<string, QualityMetricGroup>;
  sectorMetrics: Map<string, QualityMetricGroup>;
  noisyIssueTypesByInstrumentId: Map<string, string[]>;
  metricsSource: MetricsSource;
  /** Real mature outcome count from countMatureByHorizon (persisted path only). */
  persistedMatureCount?: number;
}

export type CalibrationDataStatus = 'COMPLETE' | 'PARTIAL' | 'MISSING' | 'ERROR';

/** Per-horizon outcome availability counts from Signal Quality. */
export interface HorizonAvailabilityEntry {
  eligible: number;
  evaluated: number;
  insufficientFuturePrice: number;
}

/**
 * Shape of the Signal Quality summary the calibration engine consumes.
 * Named so the engine no longer threads `any` through its evidence path.
 */
export interface QualitySummary {
  generatedAt?: string | null;
  dataStatus?: string;
  evaluationDiagnostics?: {
    evaluatedSignals?: number;
    latestAvailablePriceDate?: string | null;
    nextEvaluableDate?: string | null;
  } | null;
  horizonAvailability?: Record<string, HorizonAvailabilityEntry> | null;
}
export type CalibrationAdjustmentType = 'SIGNAL_TYPE' | 'SCORE_BUCKET' | 'REGIME' | 'SECTOR' | 'SMART_MONEY' | 'DATA_QUALITY' | 'NOISE';
export type CalibrationConfidenceLevel = SignalConfidence | 'INSUFFICIENT_SAMPLE';
export type CalibrationEvidenceStatus = 'SUFFICIENT' | 'LOW_SAMPLE' | 'INSUFFICIENT' | 'MISSING';
export type CalibrationEvidenceBasisStatus =
  | 'MEASURED'
  | 'MEASURED_FROM_PERSISTED_OUTCOMES'
  | 'HORIZON_LIMITED'
  | 'MISSING_SIGNAL_QUALITY_EVIDENCE';
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
  evidenceBasis: CalibrationEvidenceBasis;
  /** Indicates whether quality metrics came from persisted outcomes or on-demand recomputation. */
  metricsSource?: 'PERSISTED_OUTCOMES' | 'ON_DEMAND';
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
  instrumentIds?: string[];
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
  calibrationModelVersion?: string;
}

export interface PaginatedCalibrationResponse {
  items: SignalCalibrationResultDto[];
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
  /** Canonical per-instrument facts from instrument_eligibility — used for priceBars threshold check. */
  eligibilityFacts?: EligibilityFacts | null;
  noisyIssueTypes: string[];
  dataGaps: string[];
  horizonAvailability?: Record<string, { eligible: number; evaluated: number; insufficientFuturePrice: number }> | null;
  evaluationDiagnostics?: any | null;
  signalQualityGeneratedAt?: string | null;
  horizon: string;
  /** Source of quality metrics used for calibration adjustments. */
  metricsSource?: 'PERSISTED_OUTCOMES' | 'ON_DEMAND';
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
