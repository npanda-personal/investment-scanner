export type PipelineRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'SKIPPED' | 'BLOCKED';
export type PipelineStageStatus = PipelineRunStatus;
export type PipelineTriggerType = 'scheduled' | 'manual' | 'startup' | 'repair' | 'backfill' | 'test';
export type PipelineCacheStatus = 'UNKNOWN' | 'HIT' | 'MISS' | 'STALE' | 'BYPASS';

export interface PipelineScopeInput {
  region: string;
  assetType: string;
  timeframe?: string;
  dataThroughDate?: Date | null;
}

export interface PipelineCounters {
  changedInstrumentCount?: number;
  totalCount?: number;
  processedCount?: number;
  succeededCount?: number;
  partialCount?: number;
  failedCount?: number;
  skippedCount?: number;
  unchangedCount?: number;
}

export interface PipelineRunCreateInput extends PipelineScopeInput, PipelineCounters {
  pipelineKey: string;
  triggerType: PipelineTriggerType | string;
  status?: PipelineRunStatus;
  idempotencyKey?: string;
  sourceFingerprint?: string | null;
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, unknown> | null;
  startedAt?: Date;
}

export interface PipelineRunCompleteInput extends PipelineCounters {
  idempotencyKey: string;
  status: PipelineRunStatus;
  completedAt?: Date;
  durationMs?: number | null;
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, unknown> | null;
}

export interface PipelineStageCreateInput extends PipelineScopeInput, PipelineCounters {
  pipelineRunId: string;
  stageKey: string;
  stageOrder: number;
  status?: PipelineStageStatus;
  idempotencyKey?: string;
  inputFingerprint?: string | null;
  outputFingerprint?: string | null;
  batchSize?: number | null;
  offset?: number | null;
  nextOffset?: number | null;
  hasMore?: boolean;
  cacheKey?: string | null;
  cacheStatus?: PipelineCacheStatus;
  cacheExpiresAt?: Date | null;
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, unknown> | null;
}

export interface PipelineStageLeaseInput {
  idempotencyKey: string;
  leaseOwner: string;
  leaseMs: number;
  now?: Date;
  allowTerminalRetry?: boolean;
}

export interface PipelineStageCompleteInput extends PipelineCounters {
  idempotencyKey: string;
  status: PipelineStageStatus;
  outputFingerprint?: string | null;
  nextOffset?: number | null;
  hasMore?: boolean;
  cacheStatus?: PipelineCacheStatus;
  cacheExpiresAt?: Date | null;
  completedAt?: Date;
  durationMs?: number | null;
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, unknown> | null;
}

export interface PipelineStageProgressInput extends PipelineCounters {
  idempotencyKey: string;
  status?: PipelineStageStatus;
  nextOffset?: number | null;
  hasMore?: boolean;
  leaseOwner?: string | null;
  leaseMs?: number | null;
  now?: Date;
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, unknown> | null;
}

export interface PipelineRunRecord {
  id: string;
  pipelineKey: string;
  region: string;
  assetType: string;
  timeframe: string;
  triggerType: string;
  status: PipelineRunStatus | string;
  idempotencyKey: string;
  dataThroughDate: string | null;
  sourceFingerprint: string | null;
  changedInstrumentCount: number;
  totalCount: number;
  processedCount: number;
  succeededCount: number;
  partialCount: number;
  failedCount: number;
  skippedCount: number;
  unchangedCount: number;
  warnings: string[];
  errors: string[];
  metadata: Record<string, unknown> | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStageRunRecord {
  id: string;
  pipelineRunId: string;
  stageKey: string;
  stageOrder: number;
  status: PipelineStageStatus | string;
  idempotencyKey: string;
  region: string;
  assetType: string;
  timeframe: string;
  dataThroughDate: string | null;
  inputFingerprint: string | null;
  outputFingerprint: string | null;
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
  cacheStatus: PipelineCacheStatus | string;
  cacheExpiresAt: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  warnings: string[];
  errors: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStageLeaseResult {
  acquired: boolean;
  reason: 'ACQUIRED' | 'STAGE_NOT_FOUND' | 'LEASE_HELD' | 'STAGE_TERMINAL';
  stage: PipelineStageRunRecord | null;
}

export interface PipelineLatestStageQuery {
  region?: string;
  assetType?: string;
  timeframe?: string;
  stageKeys?: string[];
  limit?: number;
}
