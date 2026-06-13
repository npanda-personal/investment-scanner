// India exchange historical-backfill RUNNER — top layer (public surface + run start/finalize).
//
// `IndiaHistoricalBackfillRunner` is the concrete class MarketDataFoundationService
// constructs (once, passing itself as the IndiaHistoricalBackfillHost). The service
// keeps a thin delegator for each of the 7 controller-facing public methods; their
// implementations live here (and on the orchestration/jobs base classes). Behaviour
// is byte-identical to the pre-extraction inline implementation.
//
// Layering: IndiaHistoricalBackfillJobsBase (jobs/leaf) <- IndiaHistoricalBackfillOrchestrationBase
// (orchestration) <- IndiaHistoricalBackfillRunner (this). Files are split only to respect
// the 500-line source backstop; cross-layer calls go downward only.

import { randomUUID } from 'crypto';
import { IndiaHistoricalBackfillOrchestrationBase } from './market-data-foundation.india-historical-backfill.orchestration';
import { IndiaHistoricalBackfillJobsBase } from './market-data-foundation.india-historical-backfill.jobs';
import { getNseEndpoints } from '../market-data-foundation.endpoints';
import type {
  ExchangeHistoricalBackfillRunInput,
  ExchangeHistoricalBackfillRunResponse,
  ExchangeHistoricalBackfillRunStatus,
} from './market-data-foundation.india-ingestion-host';

export class IndiaHistoricalBackfillRunner extends IndiaHistoricalBackfillOrchestrationBase {

  async runExchangeHistoricalBackfill(input: ExchangeHistoricalBackfillRunInput): Promise<ExchangeHistoricalBackfillRunResponse> {
    return this.startExchangeHistoricalBackfillRun({ ...input, autoStart: input.autoStart !== false });
  }

  async startExchangeHistoricalBackfillRun(input: ExchangeHistoricalBackfillRunInput): Promise<ExchangeHistoricalBackfillRunResponse> {
    const config = await this.normalizeHistoricalBackfillRunInput(input);
    const db = this.host.marketDataDb();
    const now = new Date();
    const activeRun = await this.findActiveHistoricalBackfillRun(config);
    if (activeRun) {
      if (
        input.autoStart !== false
        && String(activeRun.status || '').toUpperCase() === 'RUNNING'
        && !IndiaHistoricalBackfillJobsBase.activeHistoricalBackfillRuns.has(activeRun.id)
      ) {
        this.host.startHistoricalBackfillWorkers(activeRun.id);
      }
      return this.getExchangeHistoricalBackfillRun(activeRun.id);
    }
    const idempotencyKey = `historical-exchange-backfill:${config.region}:${config.assetType}:${config.startDateKey}:${config.endDateKey}:${randomUUID()}`;
    const run = await db.pipelineRun.create({
      data: {
        pipelineKey: 'market-data-historical-exchange-backfill',
        scopeRegion: config.region,
        scopeAssetType: config.assetType,
        timeframe: '1d',
        triggerType: 'backfill',
        status: 'RUNNING',
        idempotencyKey,
        totalCount: config.jobDates.length,
        processedCount: config.initialSkippedCount,
        succeededCount: 0,
        failedCount: 0,
        skippedCount: config.initialSkippedCount,
        unchangedCount: 0,
        warnings: config.warnings,
        errors: [],
        metadata: {
          kind: 'HISTORICAL_EXCHANGE_BACKFILL_RUN',
          source: 'NSE',
          segment: config.segment,
          startDate: config.startDateKey,
          endDate: config.endDateKey,
          maxDates: config.maxDates,
          workerCount: config.workerCount,
          maxWorkers: 5,
          maxRetries: config.maxRetries,
          includeBseFill: config.includeBseFill,
          downloadDelayMs: config.downloadDelayMs,
          jitterMs: config.jitterMs,
          staleJobTimeoutMs: config.staleJobTimeoutMs,
          cancelRequested: false,
          totalCalendarDates: config.totalCalendarDates,
          skippedNonTradingDates: config.skippedNonTradingDates,
          skippedOfficialHolidayDates: config.skippedOfficialHolidayDates,
          officialHolidayCalendarSource: `${getNseEndpoints().wwwBase.url}/api/holiday-master?type=trading&year={year}`,
        },
        startedAt: now,
      },
    });

    if (config.jobDates.length > 0) {
      await db.pipelineStageRun.createMany({
        data: config.jobDates.map((job, index) => ({
          pipelineRunId: run.id,
          stageKey: `HISTORICAL_EXCHANGE_BACKFILL_${job.key}`,
          stageOrder: index + 1,
          status: job.alreadyImported ? 'SKIPPED' : 'PENDING',
          idempotencyKey: `${idempotencyKey}:${job.key}`,
          scopeRegion: config.region,
          scopeAssetType: config.assetType,
          timeframe: '1d',
          dataThroughDate: job.date,
          inputFingerprint: `NSE:${config.segment}:${job.key}`,
          outputFingerprint: null,
          totalCount: 1,
          processedCount: job.alreadyImported ? 1 : 0,
          succeededCount: 0,
          failedCount: 0,
          skippedCount: job.alreadyImported ? 1 : 0,
          unchangedCount: 0,
          batchSize: 1,
          offset: index,
          nextOffset: index + 1,
          hasMore: index < config.jobDates.length - 1,
          warnings: [],
          errors: [],
          completedAt: job.alreadyImported ? now : null,
          metadata: {
            kind: 'HISTORICAL_EXCHANGE_BACKFILL_JOB',
            tradingDate: job.key,
            dateRange: job.key,
            source: config.source,
            segment: config.segment,
            assetType: config.assetType,
            jobStatus: job.alreadyImported ? 'SKIPPED_ALREADY_IMPORTED' : 'PENDING',
            rowsRead: 0,
            rowsParsed: 0,
            rowsInserted: 0,
            rowsUpdated: 0,
            rowsNoOp: 0,
            rowsSkipped: 0,
            bseFills: 0,
            sourceFileImportId: null,
            retryCount: 0,
            lastError: null,
          },
        })),
        skipDuplicates: true,
      });
    }

    await this.refreshExchangeHistoricalBackfillRun(run.id);
    if (input.autoStart !== false) {
      this.host.startHistoricalBackfillWorkers(run.id);
    }
    return this.getExchangeHistoricalBackfillRun(run.id);
  }

  async resumeExchangeHistoricalBackfillRun(runId: string): Promise<ExchangeHistoricalBackfillRunResponse> {
    const db = this.host.marketDataDb();
    const run = await this.requireHistoricalBackfillRun(runId);
    const metadata = this.host.objectMetadata(run.metadata);
    await this.markStaleHistoricalBackfillJobs(runId, Number(metadata.staleJobTimeoutMs || 10 * 60_000));
    await db.pipelineRun.update({
      where: { id: runId },
      data: {
        status: 'RUNNING',
        completedAt: null,
        metadata: { ...metadata, cancelRequested: false, resumedAt: new Date().toISOString() },
      },
    });
    this.host.startHistoricalBackfillWorkers(runId);
    return this.getExchangeHistoricalBackfillRun(runId);
  }

  async retryFailedExchangeHistoricalBackfillRun(runId: string, options: { maxRetries?: number } = {}): Promise<ExchangeHistoricalBackfillRunResponse> {
    const db = this.host.marketDataDb();
    const run = await this.requireHistoricalBackfillRun(runId);
    const metadata = this.host.objectMetadata(run.metadata);
    const maxRetries = this.host.clampHistoricalBackfillMaxRetries(options.maxRetries ?? Number(metadata.maxRetries || 2));
    const stages = await db.pipelineStageRun.findMany({ where: { pipelineRunId: runId } });
    const retryableIds = stages
      .filter((stage: any) => {
        const jobStatus = this.historicalJobStatus(stage);
        const retryCount = Math.max(0, Number(stage.attemptCount || 0));
        return ['FAILED', 'NOT_AVAILABLE', 'STALE_RETRYABLE'].includes(jobStatus) && retryCount <= maxRetries;
      })
      .map((stage: any) => stage.id);

    if (retryableIds.length > 0) {
      await db.pipelineStageRun.updateMany({
        where: { id: { in: retryableIds } },
        data: {
          status: 'PENDING',
          completedAt: null,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });
      const retryableRows = await db.pipelineStageRun.findMany({ where: { id: { in: retryableIds } } });
      await Promise.all(retryableRows.map((stage: any) => db.pipelineStageRun.update({
        where: { id: stage.id },
        data: {
          metadata: {
            ...this.host.objectMetadata(stage.metadata),
            jobStatus: 'PENDING',
            retryCount: Math.max(0, Number(stage.attemptCount || 0)),
            lastError: null,
          },
          errors: [],
          warnings: [],
        },
      })));
    }

    await db.pipelineRun.update({
      where: { id: runId },
      data: {
        status: 'RUNNING',
        completedAt: null,
        metadata: {
          ...metadata,
          maxRetries,
          cancelRequested: false,
          retryRequestedAt: new Date().toISOString(),
          retryableDatesQueued: retryableIds.length,
        },
      },
    });
    await this.refreshExchangeHistoricalBackfillRun(runId);
    this.host.startHistoricalBackfillWorkers(runId);
    return this.getExchangeHistoricalBackfillRun(runId);
  }

  async cancelExchangeHistoricalBackfillRun(runId: string): Promise<ExchangeHistoricalBackfillRunResponse> {
    const db = this.host.marketDataDb();
    const run = await this.requireHistoricalBackfillRun(runId);
    const metadata = this.host.objectMetadata(run.metadata);
    const pendingStages = await db.pipelineStageRun.findMany({ where: { pipelineRunId: runId, status: 'PENDING' } });
    await Promise.all(pendingStages.map((stage: any) => db.pipelineStageRun.update({
      where: { id: stage.id },
      data: {
        status: 'SKIPPED',
        processedCount: 1,
        skippedCount: 1,
        completedAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
        metadata: {
          ...this.host.objectMetadata(stage.metadata),
          jobStatus: 'CANCELLED',
          lastError: 'Backfill run was cancelled before this date started.',
        },
      },
    })));
    await db.pipelineRun.update({
      where: { id: runId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        metadata: { ...metadata, cancelRequested: true, cancelledAt: new Date().toISOString() },
      },
    });
    await this.refreshExchangeHistoricalBackfillRun(runId, 'CANCELLED');
    return this.getExchangeHistoricalBackfillRun(runId);
  }

  protected startHistoricalBackfillWorkers(runId: string): void {
    setTimeout(() => {
      this.processExchangeHistoricalBackfillRun(runId).catch((error) => {
        console.error(`[MarketDataFoundation] historical exchange backfill ${runId} failed`, error);
      });
    }, 0);
  }

  protected async processExchangeHistoricalBackfillRun(runId: string): Promise<void> {
    IndiaHistoricalBackfillJobsBase.activeHistoricalBackfillRuns.add(runId);
    try {
      const run = await this.requireHistoricalBackfillRun(runId);
      const metadata = this.host.objectMetadata(run.metadata);
      const workerCount = this.host.clampHistoricalBackfillWorkers(Number(metadata.workerCount || 3));
      await this.markStaleHistoricalBackfillJobs(runId, Number(metadata.staleJobTimeoutMs || 10 * 60_000));
      const workerResults = await Promise.all(Array.from({ length: workerCount }, (_, index) => this.exchangeHistoricalBackfillWorkerLoop(runId, index + 1)));
      if (workerResults.includes('PAUSED_DATABASE')) {
        await this.blockHistoricalBackfillForTransientDatabase(runId);
        return;
      }
      await this.finalizeExchangeHistoricalBackfillRun(runId);
    } catch (error) {
      if (this.host.isTransientDatabaseError(error)) {
        this.recordHistoricalBackfillDatabasePause(runId, error);
        console.warn(`[MarketDataFoundation] historical exchange backfill ${runId} paused because the database is temporarily unavailable: ${this.host.transientDatabaseMessage(error)}`);
        return;
      }
      throw error;
    } finally {
      IndiaHistoricalBackfillJobsBase.activeHistoricalBackfillRuns.delete(runId);
    }
  }

  protected async exchangeHistoricalBackfillWorkerLoop(runId: string, workerIndex: number): Promise<'IDLE' | 'PAUSED_DATABASE'> {
    const db = this.host.marketDataDb();
    const run = await this.requireHistoricalBackfillRun(runId);
    const runMetadata = this.host.objectMetadata(run.metadata);
    const leaseOwner = `historical-backfill:${runId}:worker-${workerIndex}:${process.pid}`;
    const leaseMs = 5 * 60_000;
    while (true) {
      try {
        const latestRun = await this.host.withTransientDatabaseRetry<any | null>(() => db.pipelineRun.findUnique({ where: { id: runId } }), 'read historical backfill worker state');
        const metadata = this.host.objectMetadata(latestRun?.metadata);
        if (!latestRun || metadata.cancelRequested === true || latestRun.status === 'CANCELLED') return 'IDLE';
        const memoryPercent = this.host.currentMemoryUtilizationPercent();
        if (memoryPercent >= 95) {
          await this.pauseHistoricalBackfillForMemory(runId, memoryPercent);
          return 'IDLE';
        }
        const job = await this.claimNextHistoricalBackfillJob(runId, leaseOwner, leaseMs);
        if (!job) return 'IDLE';
        const jobMetadata = this.host.objectMetadata(job.metadata);
        const delayMs = this.host.clampNumber(Number(runMetadata.downloadDelayMs), 0, 60_000, 350)
          + Math.floor(Math.random() * (this.host.clampNumber(Number(runMetadata.jitterMs), 0, 10_000, 250) + 1));
        if (delayMs > 0) await this.host.sleep(delayMs);
        await this.processHistoricalBackfillJob(job, jobMetadata, leaseOwner);
        await this.refreshExchangeHistoricalBackfillRun(runId);
      } catch (error) {
        if (this.host.isTransientDatabaseError(error)) {
          this.recordHistoricalBackfillDatabasePause(runId, error);
          console.warn(`[MarketDataFoundation] historical exchange backfill worker ${workerIndex} paused because the database is temporarily unavailable: ${this.host.transientDatabaseMessage(error)}`);
          return 'PAUSED_DATABASE';
        }
        throw error;
      }
    }
  }

  protected async finalizeExchangeHistoricalBackfillRun(runId: string): Promise<void> {
    const run = await this.requireHistoricalBackfillRun(runId);
    const runStatus = String(run.status || '').toUpperCase();
    if (runStatus === 'BLOCKED' || runStatus === 'CANCELLED') return;
    const response = await this.refreshExchangeHistoricalBackfillRun(runId);
    if (response.running > 0 || response.pending > 0) return;
    const db = this.host.marketDataDb();
    let latestPriceRebuildFailed = false;
    if ((response.completed > 0 || response.skipped > 0) && typeof (this.host.repository as any).rebuildLatestPricesFromExchangeCandles === 'function') {
      try {
        await (this.host.repository as any).rebuildLatestPricesFromExchangeCandles();
      } catch (error) {
        latestPriceRebuildFailed = true;
        const message = `LatestPrice rebuild failed after historical exchange backfill: ${error instanceof Error ? error.message : 'unknown error'}`;
        const existingRun = await this.host.withTransientDatabaseRetry<any | null>(() => db.pipelineRun.findUnique({ where: { id: runId } }), 'read historical backfill run after LatestPrice rebuild failure');
        await this.host.withTransientDatabaseRetry<any>(() => db.pipelineRun.update({
          where: { id: runId },
          data: {
            errors: [...(existingRun?.errors || []), message].slice(0, 10),
            warnings: [...(existingRun?.warnings || []), 'LatestPrice rebuild failed after backfill; persisted candles were still imported.'].slice(0, 10),
          },
        }), 'record historical backfill LatestPrice rebuild failure');
      }
    }
    const terminalStatus = this.historicalBackfillTerminalStatus(response, latestPriceRebuildFailed);
    await this.host.withTransientDatabaseRetry<any>(() => db.pipelineRun.update({
      where: { id: runId },
      data: {
        status: terminalStatus,
        completedAt: new Date(),
        durationMs: response.startedAt ? Math.max(0, Date.now() - Date.parse(response.startedAt)) : null,
      },
    }), 'finalize historical backfill run');
    await this.refreshExchangeHistoricalBackfillRun(runId, terminalStatus);
  }

  protected async refreshExchangeHistoricalBackfillRun(runId: string, statusOverride?: ExchangeHistoricalBackfillRunStatus): Promise<ExchangeHistoricalBackfillRunResponse> {
    const db = this.host.marketDataDb();
    const response = await this.getExchangeHistoricalBackfillRun(runId);
    const previousRun = await this.host.withTransientDatabaseRetry<any | null>(() => db.pipelineRun.findUnique({ where: { id: runId } }), 'read historical backfill run before refresh');
    const metadata = this.host.objectMetadata(previousRun?.metadata);
    const currentStatus = String(previousRun?.status || '').toUpperCase();
    const terminalish = response.pending === 0 && response.running === 0;
    const nextStatus = statusOverride || (currentStatus === 'CANCELLED'
      ? 'CANCELLED'
      : currentStatus === 'BLOCKED' && !terminalish
        ? 'BLOCKED'
        : terminalish
      ? this.historicalBackfillTerminalStatus(response)
      : 'RUNNING');
    await this.host.withTransientDatabaseRetry<any>(() => db.pipelineRun.update({
      where: { id: runId },
      data: {
        status: nextStatus,
        totalCount: response.totalDates,
        processedCount: response.completed + response.skipped + response.failed + response.notAvailable,
        succeededCount: response.completed,
        failedCount: response.failed,
        skippedCount: response.skipped + response.notAvailable,
        unchangedCount: response.rowsNoOp,
        warnings: response.warnings,
        errors: response.errors,
        metadata: {
          ...metadata,
          totalDates: response.totalDates,
          pending: response.pending,
          running: response.running,
          completed: response.completed,
          skipped: response.skipped,
          failed: response.failed,
          notAvailable: response.notAvailable,
          retryCount: response.retryCount,
          currentWorkers: response.currentWorkers,
          rowsRead: response.rowsRead,
          rowsParsed: response.rowsParsed,
          rowsInserted: response.rowsInserted,
          rowsUpdated: response.rowsUpdated,
          rowsNoOp: response.rowsNoOp,
          rowsSkipped: response.rowsSkipped,
          bseFills: response.bseFills,
          progressPercent: response.progressPercent,
        },
      },
    }), 'refresh historical backfill run counters');
    return this.getExchangeHistoricalBackfillRun(runId);
  }
}
