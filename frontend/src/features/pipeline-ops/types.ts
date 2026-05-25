export type PipelineStatusValue = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'SKIPPED' | 'BLOCKED' | string;

export interface PipelineStatusRun {
  id: string;
  status: PipelineStatusValue;
  triggerType: string;
  dataThroughDate: string | null;
  changedInstrumentCount: number;
  totalCount: number;
  processedCount: number;
  succeededCount: number;
  partialCount: number;
  failedCount: number;
  skippedCount: number;
  unchangedCount: number;
  sourceFingerprint: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  warnings: string[];
  errors: string[];
  updatedAt: string;
}

export interface PipelineStatusStage {
  id: string;
  pipelineRunId: string;
  stageKey: string;
  stageOrder: number;
  status: PipelineStatusValue;
  dataThroughDate: string | null;
  changedInstrumentCount: number;
  batchSize: number | null;
  offset: number | null;
  nextOffset: number | null;
  hasMore: boolean;
  totalCount: number;
  processedCount: number;
  succeededCount: number;
  partialCount: number;
  failedCount: number;
  skippedCount: number;
  unchangedCount: number;
  attemptCount: number;
  cacheKey: string | null;
  cacheStatus: string;
  cacheExpiresAt: string | null;
  inputFingerprint: string | null;
  outputFingerprint: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  warnings: string[];
  errors: string[];
  updatedAt: string;
}

export interface PipelineStatusStageGroup {
  stageKey: string;
  stageOrder: number;
  activeStage: PipelineStatusStage | null;
  lastStage: PipelineStatusStage | null;
}

export interface PipelineStatusSnapshot {
  scope: {
    region: string;
    assetType: string;
    timeframe: string;
    pipelineKey: string;
  };
  generatedAt: string;
  activeRun: PipelineStatusRun | null;
  lastRun: PipelineStatusRun | null;
  stages: PipelineStatusStageGroup[];
}

export interface PipelineStatusQuery {
  region: string;
  assetType: string;
  timeframe?: string;
  pipelineKey?: string;
  limit?: number;
}
