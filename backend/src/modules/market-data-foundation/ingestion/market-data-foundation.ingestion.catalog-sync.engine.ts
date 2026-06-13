// Catalog-sync RUN engine (ingestion-extraction phase).
//
// Owns the long-running catalog-sync run lifecycle: run start/poll/cancel, the batch/worker
// processing loop, and the official NSE EOD bulk fast-path. Extends CatalogSyncEngineBase (which
// holds the process-wide static run registries + the counting/listing/bookkeeping/persistence
// helpers) so each file stays <500 lines. Bodies are byte-identical to the pre-extraction inline
// implementation in market-data-foundation.service.ts (this.X -> this.host.X for stays-on-service
// collaborators — evaluateSyncFreshnessGate, manualSyncCooldownMinutes, ingestSymbol,
// tryOfficialNseEodBulkLatestCandle, officialNseEodBulkEnabled — while PURE util/mapper delegators
// are imported directly). The service keeps thin byte-identical delegators for the public surface
// (startCatalogSyncRun / getCatalogSyncRun / cancelCatalogSyncRun), the `(service as any)
// .processCatalogSyncRun` test seam, and the repair-host seams (clampCatalogSyncNumber /
// isCatalogSyncTerminal, inherited from the base and re-exposed via the engine instance).

import type {
  CatalogSyncRunRequest,
  CatalogSyncRunStatusResponse,
  StockSyncTask,
  SyncSummary,
} from '../market-data-foundation.types';
import { latestCompletedTradingDateForRegion, tradingDateForRegion } from './market-data-foundation.market-session';
import { normalizeAssetType as normalizeAssetTypeUtil } from '../util/market-data-foundation.util.instrument-metadata';
import { chunkArray as chunkArrayUtil } from '../util/market-data-foundation.util.concurrency';
import { endOfTradingDateUtc as endOfTradingDateUtcUtil } from '../util/market-data-foundation.util.dates';
import { CatalogSyncEngineBase, type CatalogSyncRunRecord } from './market-data-foundation.ingestion.catalog-sync';

export class CatalogSyncEngine extends CatalogSyncEngineBase {
  async startCatalogSyncRun(request: CatalogSyncRunRequest = {}): Promise<CatalogSyncRunStatusResponse> {
    const region = this.normalizeRunRegion(request.region);
    const assetType = normalizeAssetTypeUtil(request.assetType || 'STOCK');
    const activeKey = this.catalogSyncActiveKey(region, assetType);
    const activeRunId = CatalogSyncEngineBase.activeCatalogSyncRuns.get(activeKey);
    if (activeRunId) {
      const activeRun = CatalogSyncEngineBase.catalogSyncRuns.get(activeRunId);
      if (activeRun && !activeRun.completedAt) {
        return this.toCatalogSyncRunResponse(activeRun, {
          alreadyRunning: true,
          message: `A catalog sync is already running for ${region}/${assetType}.`,
        });
      }
      CatalogSyncEngineBase.activeCatalogSyncRuns.delete(activeKey);
    }

    const now = new Date();
    const clamped = this.normalizeCatalogSyncRunRequest(request);
    const tradingDate = tradingDateForRegion(region, now) || now.toISOString().slice(0, 10);
    const targetTradingDate = latestCompletedTradingDateForRegion(region, now) || tradingDate;
    const force = request.force === true || request.fullReload === true;
    const totalCount = await this.countCatalogSyncTasks({ region, assetType }, {
      force,
      targetTradingDate,
    });
    const runId = this.createCatalogSyncRunId(now);
    const warnings = [...clamped.warnings];
    const run: CatalogSyncRunRecord = {
      success: true,
      runId,
      status: 'RUNNING',
      message: 'Catalog sync started.',
      region,
      assetType,
      scopeType: 'CATALOG',
      batchSize: clamped.batchSize,
      workerCount: clamped.workerCount,
      workerConcurrency: clamped.workerConcurrency,
      delayBetweenBatchesMs: clamped.delayBetweenBatchesMs,
      maxBatches: clamped.maxBatches,
      totalCount,
      processedCount: 0,
      currentBatchNumber: 0,
      batchesPlanned: Math.min(clamped.maxBatches, Math.ceil(totalCount / clamped.batchSize)),
      batchesExecuted: 0,
      succeededCount: 0,
      failedCount: 0,
      skippedCount: 0,
      noOpCount: 0,
      rowsReceived: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      warningCount: warnings.length,
      warnings,
      recentErrors: [],
      hasMore: totalCount > 0,
      percentComplete: totalCount > 0 ? 0 : 100,
      startedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: null,
      statusUrl: `/api/market-data-foundation/stocks/sync-runs/${runId}`,
      activeKey,
      cancelRequested: false,
      force,
      fullReload: request.fullReload === true,
      tradingDate,
      targetTradingDate,
      processedTaskIds: new Set<string>(),
    };

    CatalogSyncEngineBase.catalogSyncRuns.set(runId, run);
    CatalogSyncEngineBase.activeCatalogSyncRuns.set(activeKey, runId);
    this.pruneCatalogSyncRuns();

    setTimeout(() => {
      void this.processCatalogSyncRun(runId);
    }, 0);

    return this.toCatalogSyncRunResponse(run);
  }

  getCatalogSyncRun(runId: string): CatalogSyncRunStatusResponse | null {
    const run = CatalogSyncEngineBase.catalogSyncRuns.get(runId);
    return run ? this.toCatalogSyncRunResponse(run) : null;
  }

  cancelCatalogSyncRun(runId: string): CatalogSyncRunStatusResponse | null {
    const run = CatalogSyncEngineBase.catalogSyncRuns.get(runId);
    if (!run) return null;
    if (this.isCatalogSyncTerminal(run.status)) {
      return this.toCatalogSyncRunResponse(run);
    }
    run.cancelRequested = true;
    run.status = 'PARTIAL';
    run.message = 'Cancellation requested. The current batch will finish before the run stops.';
    this.touchCatalogSyncRun(run);
    return this.toCatalogSyncRunResponse(run);
  }

  async processCatalogSyncRun(runId: string): Promise<void> {
    const run = CatalogSyncEngineBase.catalogSyncRuns.get(runId);
    if (!run) return;

    try {
      const now = new Date();
      if (!run.force) {
        const gate = await this.host.evaluateSyncFreshnessGate({
          region: run.region,
          assetType: run.assetType,
          scopeType: 'CATALOG',
          scopeKey: run.region,
          tradingDate: run.tradingDate,
          now,
          force: false,
          cooldownMinutes: this.host.manualSyncCooldownMinutes,
        });
        if (gate.shouldSkip) {
          const staleCatchUpAllowed = await this.enableCatalogStaleCatchUpIfNeeded(run, now);
          if (staleCatchUpAllowed) {
            run.providerEndDate = endOfTradingDateUtcUtil(run.targetTradingDate);
          } else {
            run.processedCount = run.totalCount;
            run.skippedCount = run.totalCount;
            run.hasMore = false;
            run.percentComplete = 100;
            run.status = 'COMPLETED';
            run.message = gate.message;
            this.addCatalogSyncWarning(run, gate.message);
            await this.persistCatalogSyncRunState(run, gate.reason === 'FINAL_CANDLE_CONFIRMED' ? 'FINAL_CONFIRMED' : 'SYNCED', now);
            this.completeCatalogSyncRun(run);
            return;
          }
        } else {
          run.providerEndDate = gate.providerEndDate;
        }
      }

      await this.applyOfficialEodBulkForCatalogRun(run);

      while (run.batchesExecuted < run.maxBatches) {
        if (run.cancelRequested) {
          run.status = 'CANCELED';
          run.message = 'Catalog sync canceled after the current batch.';
          run.hasMore = run.processedCount < run.totalCount;
          await this.persistCatalogSyncRunState(run, 'FAILED', new Date());
          this.completeCatalogSyncRun(run);
          return;
        }

        const tasks = await this.listCatalogSyncTasks(run);
        if (tasks.length === 0) {
          run.hasMore = false;
          run.percentComplete = 100;
          run.status = run.failedCount > 0 ? 'PARTIAL' : 'COMPLETED';
          run.message = run.failedCount > 0
            ? 'Catalog sync completed with errors.'
            : 'Catalog sync completed.';
          await this.persistCatalogSyncRunState(run, run.failedCount > 0 ? 'FAILED' : 'SYNCED', new Date());
          this.completeCatalogSyncRun(run);
          return;
        }

        run.currentBatchNumber = run.batchesExecuted + 1;
        run.message = `Processing batch ${run.currentBatchNumber} of ${run.batchesPlanned || run.maxBatches}.`;
        this.touchCatalogSyncRun(run);

        const processedBeforeBatch = run.processedCount;
        const results = await this.processCatalogSyncBatch(run, tasks);
        run.batchesExecuted += 1;
        for (const task of tasks) {
          run.processedTaskIds.add(task.id);
        }
        this.applyCatalogSyncBatchResults(run, results);
        run.hasMore = run.processedCount < run.totalCount;
        run.percentComplete = this.catalogSyncPercent(run);
        this.touchCatalogSyncRun(run);

        if (run.processedCount === processedBeforeBatch && run.hasMore) {
          this.addCatalogSyncWarning(run, 'Catalog sync made no progress while more eligible rows appeared to remain.');
          run.status = 'PARTIAL';
          run.message = 'Catalog sync stopped because the last batch made no progress.';
          await this.persistCatalogSyncRunState(run, 'FAILED', new Date());
          this.completeCatalogSyncRun(run);
          return;
        }

        if (run.cancelRequested) {
          run.status = 'CANCELED';
          run.message = 'Catalog sync canceled after the current batch.';
          run.hasMore = run.processedCount < run.totalCount;
          await this.persistCatalogSyncRunState(run, 'FAILED', new Date());
          this.completeCatalogSyncRun(run);
          return;
        }

        if (!run.hasMore) {
          run.status = run.failedCount > 0 ? 'PARTIAL' : 'COMPLETED';
          run.message = run.failedCount > 0
            ? 'Catalog sync completed with errors.'
            : 'Catalog sync completed.';
          await this.persistCatalogSyncRunState(run, run.failedCount > 0 ? 'FAILED' : 'SYNCED', new Date());
          this.completeCatalogSyncRun(run);
          return;
        }

        if (run.batchesExecuted < run.maxBatches) {
          await new Promise(resolve => setTimeout(resolve, run.delayBetweenBatchesMs));
        }
      }

      run.hasMore = run.processedCount < run.totalCount;
      run.status = run.hasMore || run.failedCount > 0 ? 'PARTIAL' : 'COMPLETED';
      run.message = run.hasMore
        ? 'Catalog sync reached the maximum batch limit. More eligible rows remain.'
        : 'Catalog sync completed within the maximum batch limit.';
      if (run.hasMore) {
        this.addCatalogSyncWarning(run, 'Max batches reached before the catalog sync queue drained.');
      }
      await this.persistCatalogSyncRunState(run, run.failedCount > 0 || run.hasMore ? 'FAILED' : 'SYNCED', new Date());
      this.completeCatalogSyncRun(run);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown catalog sync failure';
      this.addCatalogSyncError(run, undefined, message);
      run.status = run.batchesExecuted === 0 && run.processedCount === 0 ? 'FAILED' : 'PARTIAL';
      run.message = `Catalog sync failed: ${message}`;
      await this.persistCatalogSyncRunState(run, 'FAILED', new Date()).catch(() => null);
      this.completeCatalogSyncRun(run);
    }
  }

  private async applyOfficialEodBulkForCatalogRun(run: CatalogSyncRunRecord): Promise<void> {
    if (run.force || run.fullReload) return;
    if (!this.host.officialNseEodBulkEnabled()) return;
    const tasks = await this.listStaleCatalogSyncTasks(
      { region: run.region, assetType: run.assetType },
      run.targetTradingDate,
      undefined,
      Array.from(run.processedTaskIds)
    );
    if (tasks.length === 0) return;

    run.currentBatchNumber = run.batchesExecuted + 1;
    run.message = `Processing official NSE EOD bulk file for ${tasks.length} stale instruments.`;
    this.touchCatalogSyncRun(run);

    const officialBulk = await this.host.tryOfficialNseEodBulkLatestCandle({
      region: run.region,
      assetType: run.assetType,
      targetTradingDate: run.targetTradingDate,
      tasks,
    });
    for (const warning of officialBulk.evidence.warnings || []) {
      this.addCatalogSyncWarning(run, warning);
    }
    if (officialBulk.evidence.fallbackReason && !['OFFICIAL_EOD_DISABLED', 'OFFICIAL_EOD_NO_TASKS'].includes(officialBulk.evidence.fallbackReason)) {
      this.addCatalogSyncWarning(run, `Official NSE EOD bulk fallback: ${officialBulk.evidence.fallbackReason}`);
    }
    if (officialBulk.matchedTaskIds.size === 0) return;

    const byId = new Map(tasks.map((task) => [task.id, task]));
    const results: Array<{ task: StockSyncTask; success: boolean; summary?: SyncSummary; message: string }> = [];
    for (const taskId of officialBulk.matchedTaskIds) {
      const task = byId.get(taskId);
      const summary = officialBulk.summaryByTaskId.get(taskId);
      if (!task || !summary) continue;
      run.processedTaskIds.add(task.id);
      results.push({
        task,
        success: true,
        summary,
        message: `Official NSE EOD bulk sync completed: ${summary.rowsInserted} inserted, ${summary.rowsUpdated} updated, ${summary.rowsNoOp || 0} no-op`,
      });
    }
    if (results.length === 0) return;

    run.batchesExecuted += 1;
    this.applyCatalogSyncBatchResults(run, results);
    run.hasMore = run.processedCount < run.totalCount;
    run.percentComplete = this.catalogSyncPercent(run);
    this.touchCatalogSyncRun(run);
  }

  private async processCatalogSyncBatch(run: CatalogSyncRunRecord, tasks: StockSyncTask[]) {
    const chunks = chunkArrayUtil(tasks, Math.ceil(tasks.length / run.workerCount));
    const workerResults = await Promise.all(chunks.map((chunk) =>
      this.processCatalogSyncWorkerChunk(run, chunk, run.workerConcurrency)
    ));
    return workerResults.flat();
  }

  private async processCatalogSyncWorkerChunk(run: CatalogSyncRunRecord, tasks: StockSyncTask[], concurrency: number) {
    const results: Array<{ task: StockSyncTask; success: boolean; summary?: SyncSummary; message: string }> = [];
    for (const chunk of chunkArrayUtil(tasks, concurrency)) {
      const chunkResults = await Promise.all(chunk.map(async (task) => {
        try {
          const startDate = this.catalogSyncTaskStartDate(run, task);
          const summary = await this.host.ingestSymbol(task.symbol, startDate, run.providerEndDate || new Date(), run.fullReload, {
            force: run.force,
            region: run.region,
            assetType: run.assetType,
            skipFreshnessGate: true,
          });
          return {
            task,
            success: true,
            summary,
            message: summary.noNewData
              ? `No new data to ingest: ${summary.skippedReasons?.join(', ') || 'skipped'}`
              : `Sync completed: ${summary.rowsInserted} inserted, ${summary.rowsUpdated} updated, ${summary.rowsSkipped} skipped`,
          };
        } catch (error) {
          return {
            task,
            success: false,
            message: error instanceof Error ? error.message : 'Unknown provider sync failure',
          };
        }
      }));
      results.push(...chunkResults);
    }
    return results;
  }
}
