export type DagStageStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'SKIPPED'
  | 'BLOCKED';

export interface StageContext {
  tradingDate: string;
  region: string;
  assetType: string;
  timeframe: string;
  trigger: 'scheduled' | 'manual' | 'retry';
  instrumentScope?: string[] | null;
  heartbeat(): void;
  log(msg: string): void;
}

export interface StageResult {
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'SKIPPED';
  succeededCount?: number;
  failedCount?: number;
  failedInstrumentIds?: string[];
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export interface PipelineStageAdapter {
  key: string;
  stageOrder: number;
  stageVersion: string;
  dependsOn: string[];
  supportsInstrumentScope?: boolean;
  run(ctx: StageContext): Promise<StageResult>;
}

export interface DagRunnerConfig {
  maxConcurrency: number;
  leaseMs: number;
  heartbeatMs: number;
}

export interface DagRunInput {
  tradingDate: string;
  region: string;
  assetType: string;
  timeframe: string;
  trigger: 'scheduled' | 'manual' | 'retry';
  fromStage?: string;
  instrumentScope?: string[] | null;
  sourceFingerprint?: string;
}

export interface DagStageOutcome {
  status: DagStageStatus;
  succeededCount: number;
  failedCount: number;
  failedInstrumentIds?: string[];
  durationMs: number;
  cached: boolean;
  errors?: string[];
}

export interface DagRunResult {
  runStatus: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  stages: Record<string, DagStageOutcome>;
  durationMs: number;
}
