// Catalog-sync support base (ingestion-extraction phase).
//
// Holds the catalog-sync run support substrate: the process-wide run registries (the two `static`
// Maps that previously lived on MarketDataFoundationService), the CatalogSyncRunRecord type, and the
// run-request normalization + counting/listing/bookkeeping/persistence helpers. The run-loop
// orchestration (start/poll/cancel/process/batch) lives in CatalogSyncEngine (the subclass, in
// market-data-foundation.ingestion.catalog-sync.engine.ts) — split out so each file stays <500 lines.
// Bodies are byte-identical to the pre-extraction inline implementation in
// market-data-foundation.service.ts (this.X -> this.host.X for stays-on-service collaborators; PURE
// util/mapper delegators imported directly).

import type { MarketDataIngestionHost } from './market-data-foundation.ingestion-host';
import type {
  CatalogSyncRunRequest,
  CatalogSyncRunStatus,
  CatalogSyncRunStatusResponse,
  PaginationOptions,
  ScheduledRegionSyncSummary,
  StockSyncTask,
  SyncSummary,
} from '../market-data-foundation.types';
import {
  startOfUtcDay as startOfUtcDayUtil,
  defaultBackfillStartDate as defaultBackfillStartDateUtil,
} from '../util/market-data-foundation.util.dates';

export type CatalogSyncRunRecord = CatalogSyncRunStatusResponse & {
  activeKey: string;
  cancelRequested: boolean;
  force: boolean;
  fullReload: boolean;
  tradingDate: string;
  targetTradingDate: string;
  providerEndDate?: Date;
  processedTaskIds: Set<string>;
};

export class CatalogSyncEngineBase {
  // Process-wide catalog-sync run state (moved here from MarketDataFoundationService as `static`).
  // The service keeps `static` aliases pointing at these so legacy/test access
  // (MarketDataFoundationService.catalogSyncRuns) resolves to the same Map.
  static catalogSyncRuns = new Map<string, CatalogSyncRunRecord>();
  static activeCatalogSyncRuns = new Map<string, string>();

  constructor(protected readonly host: MarketDataIngestionHost) {}

  protected catalogSyncTaskStartDate(
    run: Pick<CatalogSyncRunRecord, 'force' | 'fullReload' | 'providerEndDate'>,
    task: StockSyncTask
  ): Date | undefined {
    if (run.force || run.fullReload || !run.providerEndDate) return undefined;

    if (!Object.prototype.hasOwnProperty.call(task, 'latestStoredTimestamp')) {
      return undefined;
    }

    if (!task.latestStoredTimestamp) {
      return defaultBackfillStartDateUtil();
    }

    const latestStored = task.latestStoredTimestamp instanceof Date
      ? task.latestStoredTimestamp
      : new Date(task.latestStoredTimestamp);
    if (Number.isNaN(latestStored.getTime())) {
      return defaultBackfillStartDateUtil();
    }

    const startDate = startOfUtcDayUtil(latestStored);
    startDate.setUTCDate(startDate.getUTCDate() - 3);
    return startDate;
  }

  protected normalizeCatalogSyncRunRequest(request: CatalogSyncRunRequest) {
    const warnings: string[] = [];
    const batchSize = this.clampCatalogSyncNumber(request.batchSize, 25, 1, 50, 'batchSize', warnings);
    const workerCount = this.clampCatalogSyncNumber(request.workerCount, 1, 1, 2, 'workerCount', warnings);
    const workerConcurrency = this.clampCatalogSyncNumber(request.workerConcurrency, 2, 1, 3, 'workerConcurrency', warnings);
    const delayBetweenBatchesMs = this.clampCatalogSyncNumber(request.delayBetweenBatchesMs, 3000, 1000, 30000, 'delayBetweenBatchesMs', warnings);
    const maxBatches = this.clampCatalogSyncNumber(request.maxBatches, 20, 1, 100, 'maxBatches', warnings);
    return { batchSize, workerCount, workerConcurrency, delayBetweenBatchesMs, maxBatches, warnings };
  }

  clampCatalogSyncNumber(
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
    field: string,
    warnings: string[]
  ): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    const integer = Math.floor(parsed);
    const clamped = Math.max(min, Math.min(max, integer));
    if (clamped !== integer) {
      warnings.push(`${field} was capped to ${clamped}.`);
    }
    return clamped;
  }

  protected normalizeRunRegion(value?: string | null): string {
    const normalized = value?.trim().toUpperCase();
    if (!normalized || normalized === 'ALL') return 'GLOBAL';
    if (['IN', 'US', 'EU', 'GLOBAL'].includes(normalized)) return normalized;
    return normalized;
  }

  protected catalogSyncActiveKey(region: string, assetType: string): string {
    return `${region}:${assetType}:CATALOG`;
  }

  protected createCatalogSyncRunId(now: Date): string {
    const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const suffix = Math.random().toString(36).slice(2, 8);
    return `catalog-sync-${stamp}-${suffix}`;
  }

  isCatalogSyncTerminal(status: CatalogSyncRunStatus): boolean {
    return ['PARTIAL', 'COMPLETED', 'FAILED', 'CANCELED'].includes(status);
  }

  protected async countActiveStockSyncTasks(options: Pick<PaginationOptions, 'region' | 'assetType'>): Promise<number> {
    const repository = this.host.repository as any;
    if (typeof repository.countActiveStockSyncTasks === 'function') {
      return repository.countActiveStockSyncTasks(options);
    }
    if (typeof repository.listActiveStockSyncTasks === 'function') {
      const tasks = await repository.listActiveStockSyncTasks(options);
      return Array.isArray(tasks) ? tasks.length : 0;
    }
    if (typeof repository.instrumentCount === 'function') {
      return repository.instrumentCount(options);
    }
    return 0;
  }

  protected async countCatalogSyncTasks(
    options: Pick<PaginationOptions, 'region' | 'assetType'>,
    config: { force: boolean; targetTradingDate: string }
  ): Promise<number> {
    const repository = this.host.repository as any;
    if (!config.force && typeof repository.countStaleActiveStockSyncTasks === 'function') {
      return repository.countStaleActiveStockSyncTasks(options, config.targetTradingDate);
    }
    return this.countActiveStockSyncTasks(options);
  }

  async countStaleCatalogSyncTasks(
    options: Pick<PaginationOptions, 'region' | 'assetType'>,
    targetTradingDate: string
  ): Promise<number> {
    const repository = this.host.repository as any;
    if (typeof repository.countStaleActiveStockSyncTasks !== 'function') return 0;
    return repository.countStaleActiveStockSyncTasks(options, targetTradingDate);
  }

  protected async listCatalogSyncTasks(run: CatalogSyncRunRecord): Promise<StockSyncTask[]> {
    const repository = this.host.repository as any;
    const options = { region: run.region, assetType: run.assetType };
    const excludeIds = Array.from(run.processedTaskIds);
    if (!run.force && !run.fullReload && typeof repository.listStaleActiveStockSyncTasks === 'function') {
      return repository.listStaleActiveStockSyncTasks(options, run.targetTradingDate, run.batchSize, excludeIds);
    }
    return this.host.repository.listActiveStockSyncTasks(options, run.batchSize, excludeIds);
  }

  async listStaleCatalogSyncTasks(
    options: Pick<PaginationOptions, 'region' | 'assetType'>,
    targetTradingDate: string,
    batchSize?: number,
    excludeIds: string[] = []
  ): Promise<StockSyncTask[]> {
    const repository = this.host.repository as any;
    if (typeof repository.listStaleActiveStockSyncTasks === 'function') {
      return repository.listStaleActiveStockSyncTasks(options, targetTradingDate, batchSize, excludeIds);
    }
    return this.host.repository.listActiveStockSyncTasks(options, batchSize, excludeIds);
  }

  protected async enableCatalogStaleCatchUpIfNeeded(run: CatalogSyncRunRecord, now: Date): Promise<boolean> {
    if (run.force || run.fullReload) return false;
    const staleCount = await this.countStaleCatalogSyncTasks({ region: run.region, assetType: run.assetType }, run.targetTradingDate);
    if (staleCount <= 0) return false;

    run.totalCount = staleCount;
    run.hasMore = true;
    run.percentComplete = this.catalogSyncPercent(run);
    run.batchesPlanned = Math.min(run.maxBatches, Math.ceil(staleCount / run.batchSize));
    run.message = `Catalog freshness is current at region level, but ${staleCount} instruments still need latest completed candle ${run.targetTradingDate}.`;
    this.addCatalogSyncWarning(run, run.message);
    run.updatedAt = now.toISOString();
    return true;
  }

  protected applyCatalogSyncBatchResults(
    run: CatalogSyncRunRecord,
    results: Array<{ task: StockSyncTask; success: boolean; summary?: SyncSummary; message: string }>
  ): void {
    for (const result of results) {
      run.processedCount += 1;
      if (!result.success) {
        run.failedCount += 1;
        this.addCatalogSyncError(run, result.task.symbol, result.message);
        continue;
      }

      run.succeededCount += 1;
      const summary = result.summary;
      if (!summary) continue;
      run.rowsReceived += summary.rowsReceived || 0;
      run.rowsInserted += summary.rowsInserted || 0;
      run.rowsUpdated += summary.rowsUpdated || 0;
      run.rowsSkipped += summary.rowsSkipped || 0;
      run.noOpCount += summary.rowsNoOp || 0;
      if (summary.noNewData || (summary.providerFetchSkippedCount || 0) > 0) {
        run.skippedCount += 1;
      }
      if ((summary.warningCount || 0) > 0) {
        run.warningCount += summary.warningCount || 0;
        for (const warning of summary.warnings || []) {
          this.addCatalogSyncWarning(run, `${result.task.symbol}: ${warning}`, false);
        }
      }
    }
  }

  protected addCatalogSyncWarning(run: CatalogSyncRunRecord, warning: string, incrementCount = true): void {
    if (incrementCount) run.warningCount += 1;
    run.warnings.push(warning);
    if (run.warnings.length > 20) {
      run.warnings.splice(0, run.warnings.length - 20);
    }
  }

  protected addCatalogSyncError(run: CatalogSyncRunRecord, symbol: string | undefined, message: string): void {
    run.recentErrors.push({ symbol, message, timestamp: new Date().toISOString() });
    if (run.recentErrors.length > 20) {
      run.recentErrors.splice(0, run.recentErrors.length - 20);
    }
  }

  protected catalogSyncPercent(run: CatalogSyncRunRecord): number {
    if (run.totalCount <= 0) return 100;
    return Math.min(100, Number(((run.processedCount / run.totalCount) * 100).toFixed(1)));
  }

  protected touchCatalogSyncRun(run: CatalogSyncRunRecord): void {
    run.updatedAt = new Date().toISOString();
  }

  protected completeCatalogSyncRun(run: CatalogSyncRunRecord): void {
    const now = new Date().toISOString();
    run.percentComplete = this.catalogSyncPercent(run);
    run.updatedAt = now;
    run.completedAt = now;
    CatalogSyncEngineBase.activeCatalogSyncRuns.delete(run.activeKey);
    this.pruneCatalogSyncRuns();
  }

  protected toCatalogSyncRunResponse(
    run: CatalogSyncRunRecord,
    overrides: Partial<CatalogSyncRunStatusResponse> = {}
  ): CatalogSyncRunStatusResponse {
    return {
      success: true,
      runId: run.runId,
      status: run.status,
      message: run.message,
      region: run.region,
      assetType: run.assetType,
      scopeType: 'CATALOG',
      batchSize: run.batchSize,
      workerCount: run.workerCount,
      workerConcurrency: run.workerConcurrency,
      delayBetweenBatchesMs: run.delayBetweenBatchesMs,
      maxBatches: run.maxBatches,
      totalCount: run.totalCount,
      processedCount: run.processedCount,
      currentBatchNumber: run.currentBatchNumber,
      batchesPlanned: run.batchesPlanned,
      batchesExecuted: run.batchesExecuted,
      succeededCount: run.succeededCount,
      failedCount: run.failedCount,
      skippedCount: run.skippedCount,
      noOpCount: run.noOpCount,
      rowsReceived: run.rowsReceived,
      rowsInserted: run.rowsInserted,
      rowsUpdated: run.rowsUpdated,
      rowsSkipped: run.rowsSkipped,
      warningCount: run.warningCount,
      warnings: [...run.warnings],
      recentErrors: [...run.recentErrors],
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

  protected async persistCatalogSyncRunState(
    run: CatalogSyncRunRecord,
    status: 'PENDING' | 'SYNCED' | 'FINAL_CONFIRMED' | 'FAILED',
    now: Date
  ): Promise<void> {
    const repository = this.host.repository as any;
    if (typeof repository.upsertSyncState !== 'function') return;
    const summary: ScheduledRegionSyncSummary = {
      region: run.region,
      assetType: run.assetType,
      tradingDate: run.tradingDate,
      instrumentsProcessed: run.processedCount,
      rowsReceived: run.rowsReceived,
      rowsInserted: run.rowsInserted,
      rowsUpdated: run.rowsUpdated,
      rowsSkipped: run.rowsSkipped,
      rowsNoOp: run.noOpCount,
      warningCount: run.warningCount,
      warnings: run.warnings.slice(-10),
      errors: run.recentErrors.map((error) => `${error.symbol ? `${error.symbol}: ` : ''}${error.message}`).slice(-10),
    };
    await repository.upsertSyncState({
      region: run.region,
      assetType: run.assetType,
      scopeType: 'CATALOG',
      scopeKey: run.region,
      tradingDate: run.tradingDate,
      timeframe: '1D',
      status,
      summary,
      lastCheckedAt: now,
      lastProviderFetchAt: run.processedCount > 0 ? now : undefined,
    });
  }

  protected pruneCatalogSyncRuns(): void {
    const terminalRuns = Array.from(CatalogSyncEngineBase.catalogSyncRuns.values())
      .filter((run) => run.completedAt)
      .sort((a, b) => Date.parse(b.completedAt || b.updatedAt) - Date.parse(a.completedAt || a.updatedAt));
    const keepIds = new Set(terminalRuns.slice(0, 10).map((run) => run.runId));
    const cutoff = Date.now() - 30 * 60_000;
    for (const run of terminalRuns) {
      if (!keepIds.has(run.runId) && Date.parse(run.completedAt || run.updatedAt) < cutoff) {
        CatalogSyncEngineBase.catalogSyncRuns.delete(run.runId);
      }
    }
  }
}
