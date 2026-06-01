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
  metadata: Record<string, unknown> | null;
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

export type PipelineCommandKey =
  | 'DATA_QUALITY_EVALUATE_SCOPE'
  | 'MARKET_DATA_INCREMENTAL_EOD_LOAD'
  | 'MARKET_DATA_PRICE_BACKFILL'
  | 'MARKET_DATA_CATALOG_SYNC'
  | 'RAW_SIGNALS_GENERATE_SCOPE'
  | 'SIGNAL_CALIBRATION_REFRESH_SCOPE'
  | 'SIGNAL_QUALITY_DIAGNOSTICS_REFRESH'
  | 'CONTEXT_SNAPSHOTS_GENERATE_SCOPE'
  | 'MARKET_CONTEXT_REFRESH_REGION'
  | 'SMART_MONEY_REFRESH_SCOPE'
  | 'STRATEGY_DECISION_EVALUATE_SCOPE'
  | 'BACKTEST_PROOF_REFRESH'
  | 'RESEARCH_PROJECTION_REFRESH'
  | 'TODAY_REVIEW_PUBLISH'
  | 'SIGNAL_POSITION_LEDGER_REFRESH'
  | 'PIPELINE_RUN_ALL'
  | 'MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL'
  | 'MARKET_DATA_MANUAL_VERIFIED_FUNDAMENTALS_IMPORT'
  | 'PIPELINE_RETRY_FAILED_STAGE'
  | 'PIPELINE_DRAIN_ALL_BATCHES'
  | 'PIPELINE_CANCEL_ACTIVE';

export type PipelineCommandAvailability = 'ENABLED' | 'DEFERRED' | 'FORBIDDEN';
export type PipelineCommandResultStatus =
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'SKIPPED'
  | 'BLOCKED'
  | 'LEASE_HELD'
  | 'DUPLICATE_TERMINAL';

export interface PipelineCommandCatalogScope {
  region: string;
  assetType: string;
  timeframe: string;
  pipelineKey: string;
}

export interface PipelineCommandCatalogItem {
  commandKey: PipelineCommandKey;
  stageKey: string;
  moduleName: string;
  operationName: string;
  availability: PipelineCommandAvailability;
  disabledReason: string | null;
  runModes: Array<'single_batch'>;
  defaultBatchSize: number;
  maxBatchSize: number;
  providerAccess: 'NONE' | 'FORBIDDEN' | 'APPROVED';
  schedulerAccess: 'NONE' | 'FORBIDDEN';
  downstreamFanout: 'NONE' | 'FORBIDDEN' | 'APPROVED';
}

export interface PipelineCommandCatalogResponse {
  scope: PipelineCommandCatalogScope;
  generatedAt: string;
  commands: PipelineCommandCatalogItem[];
}

export interface PipelineCommandRequest {
  commandKey: PipelineCommandKey;
  region: string;
  assetType: string;
  timeframe?: string;
  pipelineKey?: string;
  runMode: 'single_batch';
  batchSize?: number;
  offset?: number;
  idempotencyKey: string;
  reason?: string;
  params?: Record<string, unknown>;
  force?: false;
}

export interface PipelineCommandResponse {
  commandId: string;
  commandKey: PipelineCommandKey;
  stageKey: string;
  status: PipelineCommandResultStatus;
  scope: PipelineCommandCatalogScope;
  runMode: 'single_batch';
  pipelineRunId: string | null;
  stageRunId: string | null;
  idempotencyKey: string;
  lease: {
    acquired: boolean;
    reason: 'ACQUIRED' | 'STAGE_NOT_FOUND' | 'LEASE_HELD' | 'STAGE_TERMINAL' | 'NOT_ATTEMPTED';
    leaseOwner: string | null;
    leaseExpiresAt: string | null;
  };
  batch: {
    batchSize: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
  };
  counts: {
    totalCount: number;
    processedCount: number;
    succeededCount: number;
    partialCount: number;
    failedCount: number;
    skippedCount: number;
    unchangedCount: number;
  };
  warnings: string[];
  errors: string[];
  statusUrl: string;
  startedAt: string | null;
  completedAt: string | null;
}
