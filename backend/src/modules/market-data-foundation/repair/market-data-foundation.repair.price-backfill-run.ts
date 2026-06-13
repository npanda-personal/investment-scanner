// Auto-extracted repair sibling (Phase 5c). Bodies are byte-identical to the pre-extraction inline
// implementation in market-data-foundation.service.ts, except that stays-on-service / cross-engine
// collaborators are reached through the host (this.X -> this.host.X) and pure util/mapper helpers
// are imported directly. The service constructs this once and keeps byte-identical public delegators
// for the controller-facing repair surface.

import type { MarketDataRepairHost } from './market-data-foundation.repair-host';
import type {
  MarketDataRepairRequest,
  MarketDataRepairSummary,
  PriceBackfillRunRequest,
  PriceBackfillRunStatusResponse,
} from '../market-data-foundation.types';
import type {
  MarketDataPipelineRecorder,
  MarketDataPipelineSnapshotInput,
  PriceBackfillRunRecord,
} from './market-data-foundation.repair.types';
import {
  NSE_BSE_ONLY_PROVIDER_DISABLED_CODE,
  NSE_BSE_ONLY_PROVIDER_DISABLED_MESSAGE,
} from './market-data-foundation.repair.types';
import {
  toPriceBackfillPipelineSnapshot as toPriceBackfillPipelineSnapshotFn,
  toPriceBackfillRunResponse as toPriceBackfillRunResponseFn,
} from './market-data-foundation.repair.price-backfill-run.format';

export class RepairPriceBackfillRunEngine {
  constructor(private readonly host: MarketDataRepairHost) {}

  // Process-wide price-backfill run state (moved verbatim from MarketDataFoundationService — the
  // service's getPriceBackfillRun/activePriceBackfillRun/cancelPriceBackfillRun now delegate here).
  static priceBackfillRuns = new Map<string, PriceBackfillRunRecord>();
  static activePriceBackfillRuns = new Map<string, string>();
  static priceBackfillPipelineSnapshotChains = new Map<string, Promise<void>>();

  public async startPriceBackfillRun(request: PriceBackfillRunRequest = {}): Promise<PriceBackfillRunStatusResponse> {
    const scope = this.host.repairScope(request);
    const now = new Date();
    return {
      success: false,
      runId: `provider-backfill-disabled-${now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
      status: 'FAILED',
      message: NSE_BSE_ONLY_PROVIDER_DISABLED_MESSAGE,
      region: scope.region,
      assetType: scope.assetType,
      scopeType: 'PRICE_BACKFILL',
      batchSize: 0,
      workerConcurrency: 0,
      providerThrottleMs: 0,
      maxBatches: 0,
      totalCount: 0,
      processedCount: 0,
      currentBatchNumber: 0,
      batchesPlanned: 0,
      batchesExecuted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      noOp: 0,
      priceRowsReceived: 0,
      priceRowsInserted: 0,
      priceRowsUpdated: 0,
      priceRowsNoOp: 0,
      zeroRowProviderReturns: 0,
      warningCount: 1,
      warnings: [NSE_BSE_ONLY_PROVIDER_DISABLED_CODE],
      recentErrors: [],
      latestBatch: null,
      remainingCandidates: 0,
      hasMore: false,
      percentComplete: 100,
      startedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: now.toISOString(),
      statusUrl: '',
    };
    // Legacy provider backfill remains below as historical code only. It is unreachable from the approved runtime path.
    const activeKey = this.priceBackfillActiveKey(scope.region, scope.assetType);
    const activeRunId = RepairPriceBackfillRunEngine.activePriceBackfillRuns.get(activeKey);
    if (activeRunId) {
      const activeRun = RepairPriceBackfillRunEngine.priceBackfillRuns.get(activeRunId as string) as PriceBackfillRunRecord | undefined;
      if (!activeRun) {
        RepairPriceBackfillRunEngine.activePriceBackfillRuns.delete(activeKey);
      } else {
        const activeRunRecord = activeRun as PriceBackfillRunRecord;
        if (!activeRunRecord.completedAt) {
          return this.toPriceBackfillRunResponse(activeRunRecord, {
            alreadyRunning: true,
            message: `A price backfill run is already running for ${scope.region}/${scope.assetType}.`,
          });
        }
        RepairPriceBackfillRunEngine.activePriceBackfillRuns.delete(activeKey);
      }
    }

    const clamped = this.normalizePriceBackfillRunRequest(request);
    const policy = request.policy || (request.fullReload ? 'FORCE_DEEP' : 'INCREMENTAL_LATEST_ONLY');
    const totalCount = await this.host.countPriceBackfillRunCandidates(scope, { ...request, policy });
    const runId = this.createPriceBackfillRunId(now);
    const run: PriceBackfillRunRecord = {
      success: true,
      runId,
      status: 'RUNNING',
      message: 'Price backfill started in the background.',
      region: scope.region,
      assetType: scope.assetType,
      scopeType: 'PRICE_BACKFILL',
      batchSize: clamped.batchSize,
      workerConcurrency: clamped.workerConcurrency,
      providerThrottleMs: clamped.providerThrottleMs,
      maxBatches: clamped.maxBatches,
      totalCount,
      processedCount: 0,
      currentBatchNumber: 0,
      batchesPlanned: Math.min(clamped.maxBatches, Math.ceil(totalCount / clamped.batchSize)),
      batchesExecuted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      noOp: 0,
      priceRowsReceived: 0,
      priceRowsInserted: 0,
      priceRowsUpdated: 0,
      priceRowsNoOp: 0,
      zeroRowProviderReturns: 0,
      warningCount: 0,
      warnings: [],
      recentErrors: [],
      latestBatch: null,
      remainingCandidates: totalCount,
      hasMore: totalCount > 0,
      percentComplete: totalCount > 0 ? 0 : 100,
      startedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: null,
      statusUrl: `/api/v1/market-data/prices/backfill-runs/${runId}`,
      activeKey,
      cancelRequested: false,
      force: request.force === true || request.fullReload === true,
      fullReload: request.fullReload === true,
      policy,
      triggerType: request.triggerType ?? 'backfill',
      processedStockIds: new Set<string>(),
    };

    for (const warning of clamped.warnings) this.addPriceBackfillRunWarning(run, warning);
    RepairPriceBackfillRunEngine.priceBackfillRuns.set(runId, run);
    RepairPriceBackfillRunEngine.activePriceBackfillRuns.set(activeKey, runId);
    this.prunePriceBackfillRuns();
    this.enqueuePriceBackfillPipelineSnapshot(run);

    setTimeout(() => {
      void this.processPriceBackfillRun(runId);
    }, 0);

    return this.toPriceBackfillRunResponse(run);
  }


  public getPriceBackfillRun(runId: string): PriceBackfillRunStatusResponse | null {
    const run = RepairPriceBackfillRunEngine.priceBackfillRuns.get(runId);
    return run ? this.toPriceBackfillRunResponse(run) : null;
  }


  public activePriceBackfillRun(request: Pick<MarketDataRepairRequest, 'region' | 'assetType'> = {}): PriceBackfillRunStatusResponse | null {
    const scope = this.host.repairScope(request);
    const activeKey = this.priceBackfillActiveKey(scope.region, scope.assetType);
    const activeRunId = RepairPriceBackfillRunEngine.activePriceBackfillRuns.get(activeKey);
    if (!activeRunId) return null;
    const run = RepairPriceBackfillRunEngine.priceBackfillRuns.get(activeRunId);
    if (!run || run.completedAt) {
      RepairPriceBackfillRunEngine.activePriceBackfillRuns.delete(activeKey);
      return null;
    }
    return this.toPriceBackfillRunResponse(run);
  }


  public cancelPriceBackfillRun(runId: string): PriceBackfillRunStatusResponse | null {
    const run = RepairPriceBackfillRunEngine.priceBackfillRuns.get(runId);
    if (!run) return null;
    if (this.host.isCatalogSyncTerminal(run.status)) {
      return this.toPriceBackfillRunResponse(run);
    }
    run.cancelRequested = true;
    run.status = 'PARTIAL';
    run.message = 'Cancellation requested. The current price-backfill batch will finish before the run stops.';
    this.touchPriceBackfillRun(run);
    return this.toPriceBackfillRunResponse(run);
  }


  private async processPriceBackfillRun(runId: string): Promise<void> {
    const run = RepairPriceBackfillRunEngine.priceBackfillRuns.get(runId);
    if (!run) return;

    try {
      if (run.totalCount <= 0) {
        run.status = 'COMPLETED';
        run.message = 'Price backfill queue is already empty.';
        run.hasMore = false;
        run.percentComplete = 100;
        this.completePriceBackfillRun(run);
        return;
      }

      while (run.batchesExecuted < run.maxBatches) {
        if (run.cancelRequested) {
          run.status = 'CANCELED';
          run.message = 'Price backfill canceled after the current batch.';
          this.completePriceBackfillRun(run);
          return;
        }

        run.currentBatchNumber = run.batchesExecuted + 1;
        run.message = `Processing price backfill batch ${run.currentBatchNumber} of ${run.batchesPlanned || run.maxBatches}.`;
        this.touchPriceBackfillRun(run);

        const processedBeforeBatch = run.processedCount;
        const summary = await this.host.backfillPrices({
          region: run.region,
          assetType: run.assetType,
          batchSize: run.batchSize,
          offset: 0,
          workerConcurrency: run.workerConcurrency,
          force: run.force,
          fullReload: run.fullReload,
          policy: run.policy,
          excludeStockIds: Array.from(run.processedStockIds),
        });
        run.batchesExecuted += 1;
        this.applyPriceBackfillBatchSummary(run, summary);
        this.touchPriceBackfillRun(run);

        if (run.cancelRequested) {
          run.status = 'CANCELED';
          run.message = 'Price backfill canceled after the current batch.';
          this.completePriceBackfillRun(run);
          return;
        }

        if (!summary.hasMore) {
          run.hasMore = false;
          run.percentComplete = 100;
          run.status = run.failed > 0 ? 'PARTIAL' : 'COMPLETED';
          run.message = run.failed > 0
            ? 'Price backfill completed with errors.'
            : 'Price backfill completed.';
          this.completePriceBackfillRun(run);
          return;
        }

        if (run.processedCount === processedBeforeBatch) {
          run.status = 'PARTIAL';
          run.hasMore = true;
          run.message = 'Price backfill stopped because the last batch made no progress.';
          this.addPriceBackfillRunWarning(run, 'Last price-backfill batch made no progress while eligible rows remain.');
          this.completePriceBackfillRun(run);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      run.status = 'PARTIAL';
      run.hasMore = run.remainingCandidates > 0;
      run.message = run.hasMore
        ? 'Price backfill reached the maximum background batch limit. More eligible rows remain.'
        : 'Price backfill completed within the maximum background batch limit.';
      if (run.hasMore) {
        this.addPriceBackfillRunWarning(run, 'Max batches reached before the price-backfill queue drained.');
      }
      this.completePriceBackfillRun(run);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown price backfill failure';
      this.addPriceBackfillRunError(run, undefined, message);
      run.status = run.batchesExecuted === 0 && run.processedCount === 0 ? 'FAILED' : 'PARTIAL';
      run.message = `Price backfill failed: ${message}`;
      this.completePriceBackfillRun(run);
    }
  }


  private applyPriceBackfillBatchSummary(run: PriceBackfillRunRecord, summary: MarketDataRepairSummary): void {
    run.latestBatch = summary;
    run.processedCount += summary.processedCount || 0;
    run.updated += summary.updated || 0;
    run.skipped += summary.skipped || 0;
    run.failed += summary.failed || 0;
    run.noOp += summary.noOp || 0;
    run.priceRowsReceived += summary.priceRowsReceived || 0;
    run.priceRowsInserted += summary.priceRowsInserted || 0;
    run.priceRowsUpdated += summary.priceRowsUpdated || 0;
    run.priceRowsNoOp += summary.priceRowsNoOp || 0;
    run.zeroRowProviderReturns += summary.zeroRowProviderReturns || 0;
    for (const stockId of summary.processedStockIds || []) {
      run.processedStockIds.add(stockId);
    }
    run.remainingCandidates = summary.remainingCandidates ?? Math.max(0, run.totalCount - run.processedCount);
    run.hasMore = summary.hasMore === true;
    run.percentComplete = this.priceBackfillPercent(run);

    for (const warning of summary.warnings || []) {
      this.addPriceBackfillRunWarning(run, warning);
    }
    if ((summary.failed || 0) > 0) {
      this.addPriceBackfillRunError(run, undefined, `${summary.failed} symbols failed in batch ${run.currentBatchNumber}.`);
    }
  }


  private normalizePriceBackfillRunRequest(request: PriceBackfillRunRequest) {
    const warnings: string[] = [];
    const batchSize = this.host.clampCatalogSyncNumber(request.batchSize ?? request.limit, 20, 1, 100, 'batchSize', warnings);
    const workerConcurrency = this.host.clampCatalogSyncNumber(
      request.workerConcurrency,
      this.host.priceBackfillConcurrency(request),
      1,
      4,
      'workerConcurrency',
      warnings
    );
    const maxBatches = this.host.clampCatalogSyncNumber(
      request.maxBatches ?? request.maxBatchesPerAction,
      5,
      1,
      500,
      'maxBatches',
      warnings
    );
    return {
      batchSize,
      workerConcurrency,
      maxBatches,
      providerThrottleMs: this.host.priceBackfillProviderThrottleMs(),
      warnings,
    };
  }


  private priceBackfillActiveKey(region: string, assetType: string): string {
    return `${region}:${assetType}:PRICE_BACKFILL`;
  }


  private createPriceBackfillRunId(now: Date): string {
    const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const suffix = Math.random().toString(36).slice(2, 8);
    return `price-backfill-${stamp}-${suffix}`;
  }


  private priceBackfillPercent(run: PriceBackfillRunRecord): number {
    if (run.totalCount <= 0) return 100;
    const completedByRemaining = Math.max(0, run.totalCount - run.remainingCandidates);
    const completed = Math.max(run.processedCount, completedByRemaining);
    return Math.min(100, Number(((completed / run.totalCount) * 100).toFixed(1)));
  }


  private touchPriceBackfillRun(run: PriceBackfillRunRecord): void {
    run.updatedAt = new Date().toISOString();
    this.enqueuePriceBackfillPipelineSnapshot(run);
  }


  private completePriceBackfillRun(run: PriceBackfillRunRecord): void {
    const now = new Date().toISOString();
    run.percentComplete = this.priceBackfillPercent(run);
    run.updatedAt = now;
    run.completedAt = now;
    RepairPriceBackfillRunEngine.activePriceBackfillRuns.delete(run.activeKey);
    this.prunePriceBackfillRuns();
    this.enqueuePriceBackfillPipelineSnapshot(run);
  }


  private enqueuePriceBackfillPipelineSnapshot(run: PriceBackfillRunRecord): void {
    const snapshot = this.toPriceBackfillPipelineSnapshot(run);
    const previous = RepairPriceBackfillRunEngine.priceBackfillPipelineSnapshotChains.get(run.runId) || Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(() => this.recordPriceBackfillPipelineSnapshot(snapshot))
      .finally(() => {
        if (RepairPriceBackfillRunEngine.priceBackfillPipelineSnapshotChains.get(run.runId) === next) {
          RepairPriceBackfillRunEngine.priceBackfillPipelineSnapshotChains.delete(run.runId);
        }
      });
    RepairPriceBackfillRunEngine.priceBackfillPipelineSnapshotChains.set(run.runId, next);
  }


  private toPriceBackfillPipelineSnapshot(run: PriceBackfillRunRecord): MarketDataPipelineSnapshotInput {
    return toPriceBackfillPipelineSnapshotFn(run);
  }


  private async recordPriceBackfillPipelineSnapshot(snapshot: MarketDataPipelineSnapshotInput): Promise<void> {
    try {
      const recorder = this.host.pipelineRecorder || await this.createPipelineRecorder();
      await recorder.recordMarketDataStageSnapshot(snapshot);
    } catch (error) {
      console.error('[MarketDataPipelineLedger] failed to record price-backfill snapshot', {
        runId: snapshot.runId,
        region: snapshot.region,
        assetType: snapshot.assetType,
        error: error instanceof Error ? error.message : 'unknown error',
      });
    }
  }


  private async createPipelineRecorder(): Promise<MarketDataPipelineRecorder> {
    const module = await import('../../pipeline-orchestration/pipeline-orchestration.service');
    return new module.PipelineOrchestrationService();
  }


  private addPriceBackfillRunWarning(run: PriceBackfillRunRecord, warning: string): void {
    run.warningCount += 1;
    run.warnings.push(warning);
    if (run.warnings.length > 20) {
      run.warnings.splice(0, run.warnings.length - 20);
    }
  }


  private addPriceBackfillRunError(run: PriceBackfillRunRecord, symbol: string | undefined, message: string): void {
    run.recentErrors.push({ symbol, message, timestamp: new Date().toISOString() });
    if (run.recentErrors.length > 20) {
      run.recentErrors.splice(0, run.recentErrors.length - 20);
    }
  }


  private toPriceBackfillRunResponse(
    run: PriceBackfillRunRecord,
    overrides: Partial<PriceBackfillRunStatusResponse> = {}
  ): PriceBackfillRunStatusResponse {
    return toPriceBackfillRunResponseFn(run, overrides);
  }


  private prunePriceBackfillRuns(): void {
    const terminalRuns = Array.from(RepairPriceBackfillRunEngine.priceBackfillRuns.values())
      .filter((run) => run.completedAt)
      .sort((a, b) => Date.parse(b.completedAt || b.updatedAt) - Date.parse(a.completedAt || a.updatedAt));
    const keepIds = new Set(terminalRuns.slice(0, 10).map((run) => run.runId));
    const cutoff = Date.now() - 30 * 60_000;
    for (const run of terminalRuns) {
      if (!keepIds.has(run.runId) && Date.parse(run.completedAt || run.updatedAt) < cutoff) {
        RepairPriceBackfillRunEngine.priceBackfillRuns.delete(run.runId);
      }
    }
  }

}
