import type { CatalogSource } from './market-data-foundation.types.core';
import type {
  MarketDataRepairRequest,
  MarketDataRepairSummary,
} from './market-data-foundation.types.repair';

export interface CatalogImportRequest {
  catalogSource: CatalogSource | string;
  importMode?: 'MANUAL_CSV' | 'CONFIGURED_URL' | 'INTERNAL_SEED';
  csvText?: string;
  validateProvider?: boolean;
  batchSize?: number;
  offset?: number;
}

export interface CatalogImportSummary {
  catalogSource: string;
  importMode?: 'MANUAL_CSV' | 'CONFIGURED_URL' | 'INTERNAL_SEED';
  downloaded?: boolean;
  downloadUrlName?: string;
  fileSizeBytes?: number;
  tempFileDeleted?: boolean;
  tempFileDeleteError?: string;
  processedCount?: number;
  totalCount?: number;
  batchSize?: number;
  offset?: number;
  nextOffset?: number | null;
  hasMore?: boolean;
  insertedCount?: number;
  updatedCount?: number;
  noOpCount?: number;
  invalidCount?: number;
  providerValidatedCount?: number;
  providerUnsupportedCount?: number;
  sourceRows: number;
  inserted: number;
  updated: number;
  noOp: number;
  skipped: number;
  invalid: number;
  providerValidated: number;
  providerUnsupported: number;
  underlyingsRead?: number;
  stockUnderlyingsMatched?: number;
  indexUnderlyingsMatched?: number;
  newInstrumentsCreated?: number;
  unmatchedUnderlyings?: number;
  warnings: string[];
  durationMs: number;
}

export interface CatalogBackfillRequest {
  region?: string;
  assetType?: string;
  catalogSource?: CatalogSource | string;
  batchSize?: number;
  limit?: number;
  offset?: number;
  validateProvider?: boolean;
  workerConcurrency?: number;
}

export interface CatalogBackfillSummary {
  catalogSource?: string;
  processedCount: number;
  totalCount: number;
  batchSize: number;
  workerConcurrency?: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  updated: number;
  noOp: number;
  skipped: number;
  validated: number;
  providerUnsupported: number;
  warnings: string[];
  durationMs: number;
}

export type CatalogSyncRunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PARTIAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED';

export interface CatalogSyncRunRequest {
  region?: string;
  assetType?: string;
  batchSize?: number;
  workerCount?: number;
  workerConcurrency?: number;
  delayBetweenBatchesMs?: number;
  force?: boolean;
  fullReload?: boolean;
  maxBatches?: number;
}

export interface CatalogSyncRunError {
  symbol?: string;
  message: string;
  timestamp: string;
}

export interface CatalogSyncRunStatusResponse {
  success: boolean;
  runId: string;
  status: CatalogSyncRunStatus;
  message: string;
  region: string;
  assetType: string;
  scopeType: 'CATALOG';
  batchSize: number;
  workerCount: number;
  workerConcurrency: number;
  delayBetweenBatchesMs: number;
  maxBatches: number;
  totalCount: number;
  processedCount: number;
  currentBatchNumber: number;
  batchesPlanned: number;
  batchesExecuted: number;
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
  noOpCount: number;
  rowsReceived: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  warningCount: number;
  warnings: string[];
  recentErrors: CatalogSyncRunError[];
  hasMore: boolean;
  percentComplete: number;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  statusUrl: string;
  alreadyRunning?: boolean;
  cancelRequested?: boolean;
}

export interface PriceBackfillRunError {
  symbol?: string;
  message: string;
  timestamp: string;
}

export interface PriceBackfillRunRequest extends MarketDataRepairRequest {
  maxBatches?: number;
  maxBatchesPerAction?: number;
  triggerType?: 'startup' | 'backfill' | 'manual' | 'scheduled';
}

export interface PriceBackfillRunStatusResponse {
  success: boolean;
  runId: string;
  status: CatalogSyncRunStatus;
  message: string;
  region: string;
  assetType: string;
  scopeType: 'PRICE_BACKFILL';
  batchSize: number;
  workerConcurrency: number;
  providerThrottleMs: number;
  maxBatches: number;
  totalCount: number;
  processedCount: number;
  currentBatchNumber: number;
  batchesPlanned: number;
  batchesExecuted: number;
  updated: number;
  skipped: number;
  failed: number;
  noOp: number;
  priceRowsReceived: number;
  priceRowsInserted: number;
  priceRowsUpdated: number;
  priceRowsNoOp: number;
  zeroRowProviderReturns: number;
  warningCount: number;
  warnings: string[];
  recentErrors: PriceBackfillRunError[];
  latestBatch: MarketDataRepairSummary | null;
  remainingCandidates: number;
  hasMore: boolean;
  percentComplete: number;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  statusUrl: string;
  alreadyRunning?: boolean;
  cancelRequested?: boolean;
}
