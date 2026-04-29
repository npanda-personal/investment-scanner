import type { SignalConfidence, SignalDirection, SignalItem, SignalResultDto } from '../signal-generation-engine';

export type CalibrationDataStatus = 'COMPLETE' | 'PARTIAL' | 'MISSING' | 'ERROR';
export type CalibrationAdjustmentType = 'SIGNAL_TYPE' | 'SCORE_BUCKET' | 'REGIME' | 'SECTOR' | 'SMART_MONEY' | 'DATA_QUALITY' | 'NOISE';

export interface CalibrationAdjustment {
  type: CalibrationAdjustmentType;
  label: string;
  delta: number;
  evidence?: Record<string, unknown>;
}

export interface SignalCalibrationResultDto {
  id?: string;
  signalResultId: string;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  sector: string | null;
  country: string | null;
  rawScore: number;
  calibratedScore: number;
  scoreDelta: number;
  rawDirection: SignalDirection;
  calibratedDirection: SignalDirection;
  rawConfidence: SignalConfidence;
  calibratedConfidence: SignalConfidence;
  boosts: CalibrationAdjustment[];
  penalties: CalibrationAdjustment[];
  calibrationReasons: string[];
  dataGaps: string[];
  calibrationModelVersion: string;
  rawSignalModelVersion: string | null;
  generatedAt: string;
  dataStatus: CalibrationDataStatus;
  researchUrl: string;
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
}

export interface CalibrationQuery {
  direction?: SignalDirection;
  minScore?: number;
  limit: number;
  sector?: string;
  country?: string;
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
  calibratedCount: number;
  skippedCount: number;
  failedCount: number;
  warnings: string[];
  durationMs: number;
}

export interface CalibrationComparison {
  rawSignal: SignalResultDto;
  calibratedSignal: SignalCalibrationResultDto;
}

export interface CalibrationModelInfo {
  calibrationModelVersion: string;
  qualityMetricWindow: string;
  minSampleSize: number;
  perAdjustmentDeltaCap: number;
  totalDeltaCap: number;
  rules: string[];
}

export interface CalibrationContext {
  signalTypeMetrics: Map<string, { winRate: number | null; averageForwardReturn: number | null; sampleSize: number }>;
  scoreBucketMetric: { winRate: number | null; averageForwardReturn: number | null; sampleSize: number } | null;
  sectorMetric: { winRate: number | null; averageForwardReturn: number | null; sampleSize: number } | null;
  regime: string | null;
  sectorLeadership: string | null;
  smartMoneyStatus: string | null;
  dataQuality: any | null;
  noisyIssueTypes: string[];
  dataGaps: string[];
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
