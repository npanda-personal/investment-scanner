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
  startedAt?: Date | null;
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
  pipelineKey?: string;
  stageKeys?: string[];
  limit?: number;
}

export interface PipelineStatusQuery {
  region: string;
  assetType: string;
  timeframe: string;
  pipelineKey: string;
  stageKeys?: string[];
  limit: number;
}

export type PipelineStatusRunDto = Pick<
  PipelineRunRecord,
  | 'id'
  | 'status'
  | 'triggerType'
  | 'dataThroughDate'
  | 'changedInstrumentCount'
  | 'totalCount'
  | 'processedCount'
  | 'succeededCount'
  | 'partialCount'
  | 'failedCount'
  | 'skippedCount'
  | 'unchangedCount'
  | 'sourceFingerprint'
  | 'startedAt'
  | 'completedAt'
  | 'durationMs'
  | 'warnings'
  | 'errors'
  | 'updatedAt'
>;

export type PipelineStatusStageDto = Pick<
  PipelineStageRunRecord,
  | 'id'
  | 'pipelineRunId'
  | 'stageKey'
  | 'stageOrder'
  | 'status'
  | 'dataThroughDate'
  | 'changedInstrumentCount'
  | 'batchSize'
  | 'offset'
  | 'nextOffset'
  | 'hasMore'
  | 'totalCount'
  | 'processedCount'
  | 'succeededCount'
  | 'partialCount'
  | 'failedCount'
  | 'skippedCount'
  | 'unchangedCount'
  | 'attemptCount'
  | 'cacheKey'
  | 'cacheStatus'
  | 'cacheExpiresAt'
  | 'inputFingerprint'
  | 'outputFingerprint'
  | 'leaseOwner'
  | 'leaseExpiresAt'
  | 'startedAt'
  | 'completedAt'
  | 'durationMs'
  | 'warnings'
  | 'errors'
  | 'metadata'
  | 'updatedAt'
>;

export interface PipelineStatusStageGroupDto {
  stageKey: string;
  stageOrder: number;
  activeStage: PipelineStatusStageDto | null;
  lastStage: PipelineStatusStageDto | null;
}

export interface PipelineStatusSnapshot {
  scope: {
    region: string;
    assetType: string;
    timeframe: string;
    pipelineKey: string;
  };
  generatedAt: string;
  activeRun: PipelineStatusRunDto | null;
  lastRun: PipelineStatusRunDto | null;
  stages: PipelineStatusStageGroupDto[];
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
  | 'MARKET_PULSE_REFRESH'
  | 'SECTOR_INTELLIGENCE_REFRESH'
  | 'SMART_MONEY_REFRESH_SCOPE'
  | 'STRATEGY_DECISION_EVALUATE_SCOPE'
  | 'BACKTEST_PROOF_REFRESH'
  | 'RESEARCH_PROJECTION_REFRESH'
  | 'TODAY_REVIEW_PUBLISH'
  | 'SIGNAL_POSITION_LEDGER_REFRESH'
  | 'EARNINGS_INTELLIGENCE_REFRESH'
  | 'STOCK_INTEREST_REFRESH'
  | 'PIPELINE_RUN_ALL'
  | 'MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL'
  | 'MARKET_DATA_MANUAL_VERIFIED_FUNDAMENTALS_IMPORT'
  | 'PIPELINE_RETRY_FAILED_STAGE'
  | 'PIPELINE_DRAIN_ALL_BATCHES'
  | 'PIPELINE_CANCEL_ACTIVE';

export type PipelineCommandAvailability = 'ENABLED' | 'DEFERRED' | 'FORBIDDEN';
export type PipelineCommandRunMode = 'single_batch' | 'incremental_changed_only' | 'full_latest_trading_date';
export type PipelineCommandResultStatus =
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'SKIPPED'
  | 'BLOCKED'
  | 'LEASE_HELD'
  | 'DUPLICATE_TERMINAL';

export interface PipelineCommandCatalogQuery {
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
  runModes: PipelineCommandRunMode[];
  defaultBatchSize: number;
  maxBatchSize: number;
  providerAccess: 'NONE' | 'FORBIDDEN' | 'APPROVED';
  schedulerAccess: 'NONE' | 'FORBIDDEN';
  downstreamFanout: 'NONE' | 'FORBIDDEN' | 'APPROVED';
}

export interface PipelineCommandCatalogResponse {
  scope: PipelineCommandCatalogQuery;
  generatedAt: string;
  commands: PipelineCommandCatalogItem[];
}

export interface PipelineCommandRequest {
  commandKey: PipelineCommandKey;
  region: string;
  assetType: string;
  timeframe: string;
  pipelineKey: string;
  runMode: PipelineCommandRunMode;
  batchSize: number;
  offset: number;
  idempotencyKey: string;
  reason?: string;
  params?: Record<string, unknown>;
  force: false;
}

export interface PipelineCommandExecutionContext {
  requestedByUserId: string;
}

export interface PipelineCommandResponse {
  commandId: string;
  commandKey: PipelineCommandKey;
  stageKey: string;
  status: PipelineCommandResultStatus;
  scope: PipelineCommandCatalogQuery;
  runMode: PipelineCommandRunMode;
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

export interface ScheduledDataQualityStageRequest {
  region: string;
  assetType: string;
  timeframe: '1d';
  pipelineKey: 'market-intelligence';
  triggerType: 'scheduled';
  dataThroughDate: string;
  sourceFingerprint: string;
  changedInstrumentIds: string[];
  batchSize: number;
  schedulerRunStartedAt: string;
}

export type ScheduledDataQualityStageStatus =
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'SKIPPED'
  | 'DUPLICATE_TERMINAL'
  | 'LEASE_HELD';

export interface ScheduledDataQualityStageResponse {
  status: ScheduledDataQualityStageStatus;
  pipelineRunId: string | null;
  stageRunId: string | null;
  stageKey: 'DATA_QUALITY';
  scope: {
    region: string;
    assetType: string;
    timeframe: string;
    pipelineKey: string;
  };
  triggerType: 'scheduled';
  dataThroughDate: string;
  inputFingerprint: string;
  outputFingerprint: string | null;
  batch: {
    totalInstrumentCount: number;
    processedCount: number;
    batchSize: number;
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
  startedAt: string | null;
  completedAt: string | null;
  downstreamRawSignals?: ScheduledRawSignalsStageResponse | null;
}

export interface ScheduledRawSignalsStageRequest {
  region: string;
  assetType: string;
  timeframe: '1d';
  pipelineKey: 'market-intelligence';
  triggerType: 'scheduled';
  dataThroughDate: string;
  sourceFingerprint: string;
  changedInstrumentIds: string[];
  batchSize: number;
  schedulerRunStartedAt: string;
  upstreamStageRunId?: string | null;
}

export type ScheduledRawSignalsStageStatus =
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'SKIPPED'
  | 'DUPLICATE_TERMINAL'
  | 'LEASE_HELD';

export interface ScheduledRawSignalsStageResponse {
  status: ScheduledRawSignalsStageStatus;
  pipelineRunId: string | null;
  stageRunId: string | null;
  stageKey: 'RAW_SIGNALS';
  scope: {
    region: string;
    assetType: string;
    timeframe: string;
    pipelineKey: string;
  };
  triggerType: 'scheduled';
  dataThroughDate: string;
  inputFingerprint: string;
  outputFingerprint: string | null;
  batch: {
    totalInstrumentCount: number;
    processedCount: number;
    batchSize: number;
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
  startedAt: string | null;
  completedAt: string | null;
  downstreamSignalCalibration?: ScheduledSignalCalibrationStageResponse | null;
}

export interface ScheduledSignalCalibrationStageRequest {
  region: string;
  assetType: string;
  timeframe: '1d';
  pipelineKey: 'market-intelligence';
  triggerType: 'scheduled';
  dataThroughDate: string;
  sourceFingerprint: string;
  changedInstrumentIds: string[];
  batchSize: number;
  schedulerRunStartedAt: string;
  upstreamStageRunId?: string | null;
}

export type ScheduledSignalCalibrationStageStatus =
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'SKIPPED'
  | 'DUPLICATE_TERMINAL'
  | 'LEASE_HELD';

export interface ScheduledSignalCalibrationStageResponse {
  status: ScheduledSignalCalibrationStageStatus;
  pipelineRunId: string | null;
  stageRunId: string | null;
  stageKey: 'SIGNAL_CALIBRATION';
  scope: {
    region: string;
    assetType: string;
    timeframe: string;
    pipelineKey: string;
  };
  triggerType: 'scheduled';
  dataThroughDate: string;
  inputFingerprint: string;
  outputFingerprint: string | null;
  batch: {
    totalInstrumentCount: number;
    processedCount: number;
    batchSize: number;
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
  startedAt: string | null;
  completedAt: string | null;
  downstream?: ScheduledPipelineStageResponse | null;
}

export type ScheduledPipelineStageStatus =
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'SKIPPED'
  | 'DUPLICATE_TERMINAL'
  | 'LEASE_HELD';

export interface ScheduledPipelineStageRequest {
  region: string;
  assetType: string;
  timeframe: '1d';
  pipelineKey: 'market-intelligence';
  triggerType: 'scheduled';
  dataThroughDate: string;
  sourceFingerprint: string;
  changedInstrumentIds: string[];
  batchSize: number;
  schedulerRunStartedAt: string;
  upstreamStageRunId?: string | null;
}

export interface ScheduledPipelineStageResponse {
  status: ScheduledPipelineStageStatus;
  pipelineRunId: string | null;
  stageRunId: string | null;
  stageKey: string;
  scope: {
    region: string;
    assetType: string;
    timeframe: string;
    pipelineKey: string;
  };
  triggerType: 'scheduled';
  dataThroughDate: string;
  inputFingerprint: string;
  outputFingerprint: string | null;
  batch: {
    totalInstrumentCount: number;
    processedCount: number;
    batchSize: number;
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
  startedAt: string | null;
  completedAt: string | null;
  downstream?: ScheduledPipelineStageResponse | null;
}

export interface MarketDataStageSnapshotRequest {
  region: string;
  assetType: string;
  timeframe: '1d';
  pipelineKey: 'market-intelligence';
  triggerType: 'scheduled' | 'startup' | 'backfill' | 'manual';
  operation:
    | 'INCREMENTAL_EOD_LOAD'
    | 'PRICE_BACKFILL'
    | 'CATALOG_SYNC'
    | 'HISTORICAL_EXCHANGE_BACKFILL'
    | 'MANUAL_VERIFIED_FUNDAMENTALS_IMPORT';
  runId: string;
  status: PipelineStageStatus | 'CANCELED';
  dataThroughDate?: string | null;
  totalCount: number;
  processedCount: number;
  succeededCount?: number;
  failedCount: number;
  skippedCount: number;
  unchangedCount?: number;
  changedInstrumentIds?: string[];
  downstreamInstrumentIds?: string[];
  batchSize?: number | null;
  nextOffset?: number | null;
  hasMore: boolean;
  startedAt: string;
  completedAt?: string | null;
  leaseOwner?: string | null;
  leaseMs?: number | null;
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, unknown> | null;
}
