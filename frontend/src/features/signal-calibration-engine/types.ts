import type { SignalConfidence, SignalDirection, SignalResult } from '@/features/signal-generation-engine';

export interface CalibrationAdjustment {
  type: string;
  label: string;
  delta: number;
  evidence?: Record<string, unknown>;
}

export interface SignalCalibrationResult {
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
  dataStatus: string;
  researchUrl: string;
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
  skippedCount: number;
  failedCount: number;
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
  minSampleSize: number;
  perAdjustmentDeltaCap: number;
  totalDeltaCap: number;
  rules: string[];
}
