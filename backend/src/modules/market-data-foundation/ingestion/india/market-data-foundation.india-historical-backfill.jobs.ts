// India exchange historical-backfill RUNNER — base layer (job + leaf helpers).
//
// Extracted from MarketDataFoundationService (Phase 4a). Behaviour is byte-identical
// to the pre-extraction inline implementation: each body was moved verbatim, with
// `this.<sharedHelper>` rewritten to `this.host.<sharedHelper>` (collaborators that
// stay on the service) and the concurrency-control static state rebased onto this
// class. This base class holds the job-level + leaf helpers; the orchestration and
// public runner methods live in the subclasses (see india-historical-backfill.ts).
//
// File split solely to respect the 500-line source-file backstop — the runner is one
// logical unit composed via a 3-layer inheritance chain (JobsBase -> OrchestrationBase
// -> Runner). Cross-layer calls only go downward (subclass -> base), so no abstract
// declarations are needed.

import type {
  IndiaHistoricalBackfillHost,
  ExchangeHistoricalBackfillJobRecord,
  ExchangeHistoricalBackfillJobStatus,
  ExchangeHistoricalBackfillRunResponse,
  ExchangeHistoricalBackfillRunStatus,
  ExchangeHistoricalBackfillDatabasePause,
  NseDeliveryHistoricalBackfillInput,
} from './market-data-foundation.india-ingestion-host';

export class IndiaHistoricalBackfillJobsBase {
  // Concurrency-control state shared across ALL runner instances (kept static, as it
  // was on MarketDataFoundationService). Declared on the base of the inheritance chain
  // so every layer references the single shared Set/Map.
  // Public so the host service can alias these onto its own class statics, preserving
  // the pre-extraction `MarketDataFoundationService.activeHistoricalBackfillRuns` /
  // `...historicalBackfillDatabasePauses` access used by tests and any in-process callers.
  public static historicalBackfillDatabasePauses = new Map<string, ExchangeHistoricalBackfillDatabasePause>();
  public static activeHistoricalBackfillRuns = new Set<string>();

  constructor(protected readonly host: IndiaHistoricalBackfillHost) {}

  protected async normalizeNseDeliveryHistoricalBackfillInput(input: NseDeliveryHistoricalBackfillInput) {
    const region = (input.region || 'IN').trim().toUpperCase();
    const assetType = (input.assetType || 'STOCK').trim().toUpperCase();
    if (region !== 'IN' || assetType !== 'STOCK') {
      throw new Error('NSE delivery backfill currently supports IN/STOCK only.');
    }
    const explicitStart = input.startDate !== undefined && input.startDate !== null && String(input.startDate).trim().length > 0;
    const endDate = input.endDate
      ? this.host.normalizeExchangeTradingDate(input.endDate)
      : this.host.latestCompletedExchangeTradingDateOrThrow(region);
    const latestCompletedDate = this.host.latestCompletedExchangeTradingDateOrThrow(region);
    const warnings: string[] = [];
    const cappedEndDate = endDate.getTime() > latestCompletedDate.getTime() ? latestCompletedDate : endDate;
    if (endDate.getTime() > latestCompletedDate.getTime()) {
      warnings.push(`Requested delivery end date ${this.host.exchangeDateKey(endDate)} was capped to latest completed trading date ${this.host.exchangeDateKey(latestCompletedDate)}.`);
    }
    const requestedSessions = Number(input.sessions);
    const targetSessions = explicitStart
      ? null
      : Number.isFinite(requestedSessions) && requestedSessions > 0
        ? Math.max(30, Math.min(Math.floor(requestedSessions), 90))
        : 90;
    const startDate = explicitStart
      ? this.host.normalizeExchangeTradingDate(input.startDate as Date | string)
      : this.host.addUtcDays(cappedEndDate, -Math.max((targetSessions || 90) * 3, 60));
    if (startDate.getTime() > cappedEndDate.getTime()) {
      throw new Error('NSE delivery backfill startDate must be on or before endDate.');
    }

    const allCandidateDates = this.host.exchangeBackfillDates(startDate, cappedEndDate)
      .filter((date) => this.host.isWeekdayTradingCandidate(date));
    const officialHolidayDates = await this.host.nseCmTradingHolidayDatesForRange(startDate, cappedEndDate);
    const tradingDates = allCandidateDates.filter((date) => !officialHolidayDates.has(this.host.exchangeDateKey(date)));
    const dates = targetSessions === null ? tradingDates : tradingDates.slice(-targetSessions);
    if (dates.length === 0) {
      throw new Error('No NSE delivery trading dates were available for the requested backfill range.');
    }
    const skippedOfficialHolidayDates = allCandidateDates.length - tradingDates.length;
    if (skippedOfficialHolidayDates > 0) {
      warnings.push(`Skipped ${skippedOfficialHolidayDates} official NSE trading holiday date(s) from the delivery backfill range.`);
    }
    if (targetSessions !== null && dates.length < targetSessions) {
      warnings.push(`Only ${dates.length} delivery trading date(s) were available before ${this.host.exchangeDateKey(cappedEndDate)}; target was ${targetSessions}.`);
    }

    const batchSize = this.host.clampNumber(Number(input.batchSize), 1, 100, 25);
    const offset = this.host.clampNumber(Number(input.offset), 0, Math.max(0, dates.length), 0);
    return {
      region,
      assetType,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      startDateKey: this.host.exchangeDateKey(dates[0]),
      endDateKey: this.host.exchangeDateKey(dates[dates.length - 1]),
      targetSessions,
      dates,
      batchSize,
      offset,
      force: input.force === true,
      downloadDelayMs: this.host.clampNumber(Number(input.downloadDelayMs), 0, 60_000, 350),
      jitterMs: this.host.clampNumber(Number(input.jitterMs), 0, 10_000, 250),
      warnings,
    };
  }

  protected async findActiveHistoricalBackfillRun(config: any): Promise<any | null> {
    const db = this.host.marketDataDb();
    if (typeof db.pipelineRun.findMany !== 'function') return null;
    const runs = await this.host.withTransientDatabaseRetry<any[]>(() => db.pipelineRun.findMany({
      where: {
        pipelineKey: 'market-data-historical-exchange-backfill',
        scopeRegion: config.region,
        scopeAssetType: config.assetType,
        timeframe: '1d',
        status: { in: ['PENDING', 'RUNNING', 'BLOCKED'] },
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
    }), 'find active historical backfill run');
    return runs.find((run: any) => {
      const metadata = this.host.objectMetadata(run.metadata);
      return String(metadata.startDate || '') === config.startDateKey
        && String(metadata.endDate || '') === config.endDateKey
        && String(metadata.maxDates ?? '') === String(config.maxDates ?? '')
        && Boolean(metadata.includeBseFill) === Boolean(config.includeBseFill);
    }) || null;
  }

  protected async claimNextHistoricalBackfillJob(runId: string, leaseOwner: string, leaseMs: number): Promise<any | null> {
    const db = this.host.marketDataDb();
    return this.host.withTransientDatabaseRetry<any | null>(async () => {
      const now = new Date();
      const candidates = await db.pipelineStageRun.findMany({
        where: { pipelineRunId: runId, status: 'PENDING' },
        orderBy: [{ dataThroughDate: 'asc' }, { stageOrder: 'asc' }],
        take: 10,
      });
      for (const candidate of candidates) {
        const result = await db.pipelineStageRun.updateMany({
          where: {
            id: candidate.id,
            status: 'PENDING',
            OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }, { leaseOwner }],
          },
          data: {
            status: 'RUNNING',
            leaseOwner,
            leaseExpiresAt: new Date(now.getTime() + leaseMs),
            attemptCount: { increment: 1 },
            startedAt: candidate.startedAt ?? now,
            completedAt: null,
            metadata: { ...this.host.objectMetadata(candidate.metadata), jobStatus: 'RUNNING' },
          },
        });
        if (result.count > 0) {
          return db.pipelineStageRun.findUnique({ where: { id: candidate.id } });
        }
      }
      return null;
    }, 'claim historical backfill date job');
  }

  protected async completeHistoricalBackfillJob(stage: any, input: {
    status: string;
    jobStatus: ExchangeHistoricalBackfillJobStatus;
    rowsRead: number;
    rowsParsed: number;
    rowsInserted: number;
    rowsUpdated: number;
    rowsNoOp: number;
    rowsSkipped: number;
    bseFills: number;
    sourceFileImportId: string | null;
    warnings: string[];
    errors: string[];
    startedAt: Date;
    leaseOwner: string;
  }) {
    const db = this.host.marketDataDb();
    const completedAt = new Date();
    const previousMetadata = this.host.objectMetadata(stage.metadata);
    const result = await this.host.withTransientDatabaseRetry<any>(() => db.pipelineStageRun.updateMany({
      where: {
        id: stage.id,
        status: 'RUNNING',
        leaseOwner: input.leaseOwner,
      },
      data: {
        status: input.status,
        processedCount: 1,
        succeededCount: input.jobStatus === 'COMPLETED' ? 1 : 0,
        failedCount: input.jobStatus === 'FAILED' ? 1 : 0,
        skippedCount: ['SKIPPED_ALREADY_IMPORTED', 'NOT_AVAILABLE', 'CANCELLED'].includes(input.jobStatus) ? 1 : 0,
        unchangedCount: input.rowsNoOp,
        warnings: input.warnings,
        errors: input.errors,
        outputFingerprint: `${previousMetadata.tradingDate || stage.stageKey}:${input.jobStatus}:${input.rowsInserted}:${input.rowsUpdated}:${input.rowsNoOp}`,
        completedAt,
        durationMs: Math.max(0, completedAt.getTime() - input.startedAt.getTime()),
        leaseOwner: null,
        leaseExpiresAt: null,
        metadata: {
          ...previousMetadata,
          jobStatus: input.jobStatus,
          rowsRead: input.rowsRead,
          rowsParsed: input.rowsParsed,
          rowsInserted: input.rowsInserted,
          rowsUpdated: input.rowsUpdated,
          rowsNoOp: input.rowsNoOp,
          rowsSkipped: input.rowsSkipped,
          bseFills: input.bseFills,
          sourceFileImportId: input.sourceFileImportId,
          retryCount: Math.max(0, Number(stage.attemptCount || 1) - 1),
          lastError: input.errors[0] || null,
        },
      },
    }), 'complete historical backfill date job');
    if (Number(result?.count || 0) === 0) {
      console.warn(`[MarketDataFoundation] skipped completion for historical backfill job ${stage.id}; worker no longer owns the lease.`);
    }
  }

  protected async pauseHistoricalBackfillForMemory(runId: string, memoryPercent: number): Promise<void> {
    const db = this.host.marketDataDb();
    const run = await this.requireHistoricalBackfillRun(runId);
    const metadata = this.host.objectMetadata(run.metadata);
    const message = `Historical backfill paused: memory utilization ${memoryPercent.toFixed(1)}% reached the 95% stop threshold.`;
    await this.host.withTransientDatabaseRetry<any>(() => db.pipelineRun.update({
      where: { id: runId },
      data: {
        status: 'BLOCKED',
        warnings: [...this.host.stringArray(run.warnings), message].slice(-10),
        metadata: { ...metadata, memoryPausedAt: new Date().toISOString(), memoryPercent, cancelRequested: false },
      },
    }), 'pause historical backfill for memory');
  }

  protected async blockHistoricalBackfillForTransientDatabase(runId: string): Promise<void> {
    const db = this.host.marketDataDb();
    const run = await this.host.withTransientDatabaseRetry<any | null>(() => db.pipelineRun.findUnique({ where: { id: runId } }), 'read historical backfill run for database pause');
    if (!run) return;
    const pause = IndiaHistoricalBackfillJobsBase.historicalBackfillDatabasePauses.get(runId);
    const metadata = this.host.objectMetadata(run.metadata);
    const message = pause?.message || 'Historical backfill paused because the database was temporarily unavailable. Resume the run after database recovery.';
    const pausedAt = pause?.pausedAt || new Date().toISOString();
    const runningStages = await this.host.withTransientDatabaseRetry<any[]>(() => db.pipelineStageRun.findMany({
      where: { pipelineRunId: runId, status: 'RUNNING' },
    }), 'find historical backfill jobs claimed during database pause');
    await Promise.all(runningStages.map((stage: any) => this.host.withTransientDatabaseRetry<any>(() => db.pipelineStageRun.update({
      where: { id: stage.id },
      data: {
        status: 'PENDING',
        leaseOwner: null,
        leaseExpiresAt: null,
        metadata: {
          ...this.host.objectMetadata(stage.metadata),
          jobStatus: 'STALE_RETRYABLE',
          databasePausedAt: pausedAt,
          lastError: message,
        },
        warnings: [message],
      },
    }), 'release historical backfill job after database pause')));
    await this.host.withTransientDatabaseRetry<any>(() => db.pipelineRun.update({
      where: { id: runId },
      data: {
        status: 'BLOCKED',
        warnings: Array.from(new Set([...this.host.stringArray(run.warnings), message])).slice(-10),
        metadata: { ...metadata, databasePausedAt: pausedAt, databasePausedJobCount: runningStages.length, cancelRequested: false },
      },
    }), 'mark historical backfill blocked for transient database outage');
    IndiaHistoricalBackfillJobsBase.historicalBackfillDatabasePauses.delete(runId);
  }

  protected historicalBackfillTerminalStatus(response: ExchangeHistoricalBackfillRunResponse, latestPriceRebuildFailed = false): ExchangeHistoricalBackfillRunStatus {
    if (response.failed > 0 || response.notAvailable > 0) {
      return response.completed > 0 || response.skipped > 0 ? 'PARTIAL' : 'FAILED';
    }
    return latestPriceRebuildFailed ? 'PARTIAL' : 'COMPLETED';
  }

  protected async markStaleHistoricalBackfillJobs(runId: string, staleJobTimeoutMs: number): Promise<number> {
    const db = this.host.marketDataDb();
    const staleBefore = new Date(Date.now() - staleJobTimeoutMs);
    const staleJobs = await this.host.withTransientDatabaseRetry<any[]>(() => db.pipelineStageRun.findMany({
      where: {
        pipelineRunId: runId,
        status: 'RUNNING',
        leaseExpiresAt: { lt: new Date() },
        updatedAt: { lt: staleBefore },
      },
    }), 'find stale historical backfill jobs');
    await Promise.all(staleJobs.map((stage: any) => this.host.withTransientDatabaseRetry<any>(() => db.pipelineStageRun.update({
      where: { id: stage.id },
      data: {
        status: 'PENDING',
        leaseOwner: null,
        leaseExpiresAt: null,
        metadata: {
          ...this.host.objectMetadata(stage.metadata),
          jobStatus: 'STALE_RETRYABLE',
          lastError: 'Previous worker lease became stale before completion.',
        },
      },
    }), 'mark stale historical backfill job retryable')));
    return staleJobs.length;
  }

  protected async hasCompletedNseCmImportForDate(date: Date): Promise<boolean> {
    return this.hasCompletedNseSourceImportForDate(date, 'CM');
  }

  protected async hasCompletedNseSourceImportForDate(date: Date, segment: 'CM' | 'INDEX'): Promise<boolean> {
    const completedDates = await this.listCompletedNseSourceImportDates(segment, date, date);
    return completedDates.some((item: Date) => this.host.exchangeDateKey(item) === this.host.exchangeDateKey(date));
  }

  protected async listCompletedNseSourceImportDates(segment: 'CM' | 'INDEX', startDate: Date, endDate: Date): Promise<Date[]> {
    const repository = this.host.repository as any;
    if (segment === 'INDEX' && typeof repository.listCompletedOfficialNseIndexImportDates === 'function') {
      return repository.listCompletedOfficialNseIndexImportDates({ startDate, endDate });
    }
    if (typeof repository.listCompletedSourceFileImportDates === 'function') {
      return repository.listCompletedSourceFileImportDates({ source: 'NSE', segment, startDate, endDate });
    }
    return [];
  }

  protected historicalBackfillResponse(run: any): ExchangeHistoricalBackfillRunResponse {
    const metadata = this.host.objectMetadata(run.metadata);
    const stages = Array.isArray(run.stages) ? run.stages : [];
    const jobs: ExchangeHistoricalBackfillJobRecord[] = stages.map((stage: any) => this.toHistoricalBackfillJobRecord(stage));
    const stageMetadataById = new Map<string, Record<string, any>>(stages.map((stage: any) => [stage.id, this.host.objectMetadata(stage.metadata)]));
    const pending = jobs.filter((job: ExchangeHistoricalBackfillJobRecord) => job.status === 'PENDING' || job.status === 'STALE_RETRYABLE').length;
    const running = jobs.filter((job: ExchangeHistoricalBackfillJobRecord) => job.status === 'RUNNING').length;
    const completed = jobs.filter((job: ExchangeHistoricalBackfillJobRecord) => job.status === 'COMPLETED').length;
    const skipped = jobs.filter((job: ExchangeHistoricalBackfillJobRecord) => job.status === 'SKIPPED_ALREADY_IMPORTED' || job.status === 'SKIPPED_NON_TRADING' || job.status === 'CANCELLED').length;
    const failed = jobs.filter((job: ExchangeHistoricalBackfillJobRecord) => job.status === 'FAILED').length;
    const notAvailable = jobs.filter((job: ExchangeHistoricalBackfillJobRecord) => job.status === 'NOT_AVAILABLE').length;
    const rowsRead = jobs.reduce((sum: number, job: ExchangeHistoricalBackfillJobRecord) => sum + Number(stageMetadataById.get(job.id)?.rowsRead || 0), 0);
    const rowsParsed = jobs.reduce((sum: number, job: ExchangeHistoricalBackfillJobRecord) => sum + Number(stageMetadataById.get(job.id)?.rowsParsed || 0), 0);
    const rowsInserted = jobs.reduce((sum: number, job: ExchangeHistoricalBackfillJobRecord) => sum + job.rowsInserted, 0);
    const rowsUpdated = jobs.reduce((sum: number, job: ExchangeHistoricalBackfillJobRecord) => sum + job.rowsUpdated, 0);
    const rowsNoOp = jobs.reduce((sum: number, job: ExchangeHistoricalBackfillJobRecord) => sum + job.rowsNoOp, 0);
    const rowsSkipped = jobs.reduce((sum: number, job: ExchangeHistoricalBackfillJobRecord) => sum + job.rowsSkipped, 0);
    const bseFills = jobs.reduce((sum: number, job: ExchangeHistoricalBackfillJobRecord) => sum + job.bseFills, 0);
    const processed = completed + skipped + failed + notAvailable;
    const totalDates = jobs.length;
    const progressPercent = totalDates > 0 ? Math.round((processed / totalDates) * 1000) / 10 : 100;
    const startedAt = this.host.iso(run.startedAt);
    const elapsedMs = startedAt ? Math.max(0, Date.now() - Date.parse(startedAt)) : 0;
    const estimatedRemainingMs = processed > 0 && pending + running > 0
      ? Math.max(0, Math.round((elapsedMs / processed) * (pending + running)))
      : null;
    return {
      runId: run.id,
      status: String(run.status || 'RUNNING') as ExchangeHistoricalBackfillRunStatus,
      source: 'NSE',
      segment: String(metadata.segment || (String(run.scopeAssetType || '').toUpperCase() === 'INDEX' ? 'INDEX' : 'CM')),
      region: run.scopeRegion,
      assetType: run.scopeAssetType,
      startDate: String(metadata.startDate || ''),
      endDate: String(metadata.endDate || ''),
      maxDates: metadata.maxDates === null || metadata.maxDates === undefined ? null : Number(metadata.maxDates),
      workerCount: this.host.clampHistoricalBackfillWorkers(Number(metadata.workerCount || 3)),
      maxWorkers: 5,
      maxRetries: this.host.clampHistoricalBackfillMaxRetries(Number(metadata.maxRetries || 2)),
      totalDates,
      pending,
      running,
      completed,
      skipped,
      failed,
      notAvailable,
      retryCount: jobs.reduce((sum: number, job: ExchangeHistoricalBackfillJobRecord) => sum + job.retryCount, 0),
      currentWorkers: running,
      rowsRead,
      rowsParsed,
      rowsInserted,
      rowsUpdated,
      rowsNoOp,
      rowsSkipped,
      bseFills,
      progressPercent,
      estimatedRemainingMs,
      startedAt,
      completedAt: this.host.iso(run.completedAt),
      warnings: [...this.host.stringArray(run.warnings), ...jobs.flatMap((job: ExchangeHistoricalBackfillJobRecord) => job.error && job.status !== 'FAILED' ? [job.error] : [])].slice(0, 10),
      errors: [...this.host.stringArray(run.errors), ...jobs.filter((job: ExchangeHistoricalBackfillJobRecord) => job.status === 'FAILED' && job.error).map((job: ExchangeHistoricalBackfillJobRecord) => `${job.tradingDate}: ${job.error}`)].slice(0, 10),
      jobs,
    };
  }

  protected toHistoricalBackfillJobRecord(stage: any): ExchangeHistoricalBackfillJobRecord {
    const metadata = this.host.objectMetadata(stage.metadata);
    const status = this.historicalJobStatus(stage);
    const rowsInserted = Number(metadata.rowsInserted || 0);
    const rowsUpdated = Number(metadata.rowsUpdated || 0);
    const rowsNoOp = Number(metadata.rowsNoOp || 0);
    return {
      id: stage.id,
      tradingDate: String(metadata.tradingDate || this.host.exchangeDateKey(stage.dataThroughDate)),
      dateRange: String(metadata.dateRange || metadata.tradingDate || this.host.exchangeDateKey(stage.dataThroughDate)),
      status,
      source: String(metadata.source || 'NSE') === 'NSE+BSE'
        ? 'NSE+BSE'
        : String(metadata.source || 'NSE') === 'NSE_INDEX'
          ? 'NSE_INDEX'
          : 'NSE',
      rowsImported: rowsInserted + rowsUpdated + rowsNoOp,
      rowsInserted,
      rowsUpdated,
      rowsNoOp,
      rowsSkipped: Number(metadata.rowsSkipped || stage.skippedCount || 0),
      bseFills: Number(metadata.bseFills || 0),
      error: typeof metadata.lastError === 'string' && metadata.lastError ? metadata.lastError : (this.host.stringArray(stage.errors)[0] || null),
      retryCount: Math.max(0, Number(metadata.retryCount ?? Math.max(0, Number(stage.attemptCount || 0) - 1))),
      startedAt: this.host.iso(stage.startedAt),
      completedAt: this.host.iso(stage.completedAt),
      sourceFileImportId: typeof metadata.sourceFileImportId === 'string' ? metadata.sourceFileImportId : null,
    };
  }

  protected historicalJobStatus(stage: any): ExchangeHistoricalBackfillJobStatus {
    const metadata = this.host.objectMetadata(stage.metadata);
    const value = String(metadata.jobStatus || '').toUpperCase();
    if (['PENDING', 'RUNNING', 'COMPLETED', 'SKIPPED_ALREADY_IMPORTED', 'SKIPPED_NON_TRADING', 'FAILED', 'NOT_AVAILABLE', 'STALE_RETRYABLE', 'CANCELLED'].includes(value)) {
      return value as ExchangeHistoricalBackfillJobStatus;
    }
    const status = String(stage.status || '').toUpperCase();
    if (status === 'RUNNING') return 'RUNNING';
    if (status === 'COMPLETED') return 'COMPLETED';
    if (status === 'FAILED') return 'FAILED';
    if (status === 'SKIPPED') return 'SKIPPED_ALREADY_IMPORTED';
    return 'PENDING';
  }

  protected async requireHistoricalBackfillRun(runId: string): Promise<any> {
    const db = this.host.marketDataDb();
    const run = await this.host.withTransientDatabaseRetry<any | null>(() => db.pipelineRun.findUnique({ where: { id: runId } }), 'read historical backfill run');
    if (!run || run.pipelineKey !== 'market-data-historical-exchange-backfill') {
      throw new Error('Historical exchange backfill run not found.');
    }
    return run;
  }

  protected recordHistoricalBackfillDatabasePause(runId: string, error: unknown): void {
    IndiaHistoricalBackfillJobsBase.historicalBackfillDatabasePauses.set(runId, {
      pausedAt: new Date().toISOString(),
      message: `Historical backfill paused because the database was temporarily unavailable: ${this.host.transientDatabaseMessage(error)}. Resume the run after database recovery.`,
    });
  }
}
