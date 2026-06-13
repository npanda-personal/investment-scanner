// Price-backfill run formatting helpers (Phase 5c). Pure projections of a PriceBackfillRunRecord to
// the wire shapes — extracted from RepairPriceBackfillRunEngine so the run-engine file stays under
// the 500-line source cap. Bodies are byte-identical to the pre-extraction inline implementation.

import type { PriceBackfillRunStatusResponse } from '../market-data-foundation.types';
import type {
  PriceBackfillRunRecord,
  MarketDataPipelineSnapshotInput,
} from './market-data-foundation.repair.types';

export function toPriceBackfillPipelineSnapshot(run: PriceBackfillRunRecord): MarketDataPipelineSnapshotInput {
  return {
    region: run.region,
    assetType: run.assetType,
    timeframe: '1d',
    pipelineKey: 'market-intelligence',
    triggerType: run.triggerType,
    operation: 'PRICE_BACKFILL',
    runId: run.runId,
    status: run.status,
    dataThroughDate: run.latestBatch?.targetEndDate || run.latestBatch?.latestCompletedEodDate || null,
    totalCount: run.totalCount,
    processedCount: run.processedCount,
    succeededCount: Math.max(0, run.updated + run.noOp),
    failedCount: run.failed,
    skippedCount: run.skipped,
    unchangedCount: run.noOp,
    changedInstrumentIds: [...run.processedStockIds],
    batchSize: run.batchSize,
    nextOffset: run.hasMore ? 0 : null,
    hasMore: run.hasMore,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    warnings: [...run.warnings],
    errors: run.recentErrors.map((entry) => entry.symbol ? `${entry.symbol}: ${entry.message}` : entry.message),
    metadata: {
      sourceRunId: run.runId,
      scopeType: run.scopeType,
      message: run.message,
      currentBatchNumber: run.currentBatchNumber,
      batchesPlanned: run.batchesPlanned,
      batchesExecuted: run.batchesExecuted,
      workerConcurrency: run.workerConcurrency,
      providerThrottleMs: run.providerThrottleMs,
      maxBatches: run.maxBatches,
      percentComplete: run.percentComplete,
      remainingCandidates: run.remainingCandidates,
      priceRowsReceived: run.priceRowsReceived,
      priceRowsInserted: run.priceRowsInserted,
      priceRowsUpdated: run.priceRowsUpdated,
      priceRowsNoOp: run.priceRowsNoOp,
      zeroRowProviderReturns: run.zeroRowProviderReturns,
      // FIX C: A price-backfill completing must NOT trigger a full DAG run via the
      // snapshot bridge — the DAG is only triggered from the scheduled market-data
      // sync path.  Suppress the bridge so the orchestration service skips
      // runDownstreamDataQualityForMarketDataSnapshot for PRICE_BACKFILL snapshots.
      downstreamSnapshotBridgeSuppressed: true,
    },
  };
}

export function toPriceBackfillRunResponse(
  run: PriceBackfillRunRecord,
  overrides: Partial<PriceBackfillRunStatusResponse> = {}
): PriceBackfillRunStatusResponse {
  return {
    success: true,
    runId: run.runId,
    status: run.status,
    message: run.message,
    region: run.region,
    assetType: run.assetType,
    scopeType: 'PRICE_BACKFILL',
    batchSize: run.batchSize,
    workerConcurrency: run.workerConcurrency,
    providerThrottleMs: run.providerThrottleMs,
    maxBatches: run.maxBatches,
    totalCount: run.totalCount,
    processedCount: run.processedCount,
    currentBatchNumber: run.currentBatchNumber,
    batchesPlanned: run.batchesPlanned,
    batchesExecuted: run.batchesExecuted,
    updated: run.updated,
    skipped: run.skipped,
    failed: run.failed,
    noOp: run.noOp,
    priceRowsReceived: run.priceRowsReceived,
    priceRowsInserted: run.priceRowsInserted,
    priceRowsUpdated: run.priceRowsUpdated,
    priceRowsNoOp: run.priceRowsNoOp,
    zeroRowProviderReturns: run.zeroRowProviderReturns,
    warningCount: run.warningCount,
    warnings: [...run.warnings],
    recentErrors: [...run.recentErrors],
    latestBatch: run.latestBatch,
    remainingCandidates: run.remainingCandidates,
    hasMore: run.hasMore,
    percentComplete: run.percentComplete,
    startedAt: run.startedAt,
    updatedAt: run.updatedAt,
    completedAt: run.completedAt,
    statusUrl: run.statusUrl,
    cancelRequested: run.cancelRequested,
    ...overrides,
  };
}
