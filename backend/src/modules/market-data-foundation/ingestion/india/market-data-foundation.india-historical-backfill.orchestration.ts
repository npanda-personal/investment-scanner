// India exchange historical-backfill RUNNER — orchestration layer (mid).
//
// Extends the job/leaf base (IndiaHistoricalBackfillJobsBase) with the
// delivery-backfill batch driver, run-read composition, run-input normalization, and
// the per-date job processor. Behaviour byte-identical to the pre-extraction inline
// implementation; see india-historical-backfill.jobs.ts for the layering rationale.

import { IndiaHistoricalBackfillJobsBase } from './market-data-foundation.india-historical-backfill.jobs';
import { latestCompletedTradingDateForRegion } from '../market-data-foundation.market-session';
import type {
  ExchangeDailyImportSummary,
  ExchangeHistoricalBackfillRunInput,
  ExchangeHistoricalBackfillRunResponse,
  NseDeliveryHistoricalBackfillDateResult,
  NseDeliveryHistoricalBackfillInput,
  NseDeliveryHistoricalBackfillResponse,
} from './market-data-foundation.india-ingestion-host';

export class IndiaHistoricalBackfillOrchestrationBase extends IndiaHistoricalBackfillJobsBase {

  async runNseDeliveryHistoricalBackfill(input: NseDeliveryHistoricalBackfillInput = {}): Promise<NseDeliveryHistoricalBackfillResponse> {
    const config = await this.normalizeNseDeliveryHistoricalBackfillInput(input);
    const repository = this.host.repository as any;
    const completedDates = !config.force && typeof repository.listCompletedSourceFileImportDates === 'function'
      ? await repository.listCompletedSourceFileImportDates({
        source: 'NSE',
        segment: 'DELIVERY',
        startDate: config.startDate,
        endDate: config.endDate,
      })
      : [];
    const completedDateKeys = new Set(completedDates.map((date: Date) => this.host.exchangeDateKey(date)));
    const batchDates = config.dates.slice(config.offset, config.offset + config.batchSize);
    const dateResults: NseDeliveryHistoricalBackfillDateResult[] = [];
    const coveredSymbols = new Set<string>();
    const sourceFileImportIds = new Set<string>();
    const warnings: string[] = [...config.warnings];
    const errors: string[] = [];

    for (let index = 0; index < batchDates.length; index += 1) {
      const date = batchDates[index];
      const key = this.host.exchangeDateKey(date);
      if (!config.force && completedDateKeys.has(key)) {
        dateResults.push({
          tradingDate: key,
          status: 'SKIPPED_DUPLICATE',
          sourceFileImportId: null,
          rowsRead: 0,
          rowsParsed: 0,
          rowsInserted: 0,
          rowsUpdated: 0,
          rowsNoOp: 0,
          rowsSkipped: 1,
          symbolsCovered: 0,
          warnings: [],
          errors: [],
        });
        continue;
      }

      const delayMs = config.downloadDelayMs + Math.floor(Math.random() * (config.jitterMs + 1));
      if (delayMs > 0 && index > 0) await this.host.sleep(delayMs);
      const summary = await this.host.importNseDeliveryOfficialDaily({
        tradingDate: date,
        force: config.force,
      });
      const summarySymbols = new Set([...(summary.downstreamSymbols || []), ...(summary.changedSymbols || [])]);
      summarySymbols.forEach((symbol) => coveredSymbols.add(symbol));
      if (summary.sourceFileImportId) sourceFileImportIds.add(summary.sourceFileImportId);
      const notAvailable = summary.status === 'FAILED' && this.host.isHistoricalBackfillNotAvailable(summary);
      dateResults.push({
        tradingDate: key,
        status: notAvailable ? 'NOT_AVAILABLE' : summary.status,
        sourceFileImportId: summary.sourceFileImportId || null,
        rowsRead: Number(summary.rowsRead || 0),
        rowsParsed: Number(summary.rowsParsed || 0),
        rowsInserted: Number(summary.rowsInserted || 0),
        rowsUpdated: Number(summary.rowsUpdated || 0),
        rowsNoOp: Number(summary.rowsNoOp || 0),
        rowsSkipped: Number(summary.rowsSkipped || 0),
        symbolsCovered: summarySymbols.size,
        warnings: (summary.warnings || []).slice(0, 5),
        errors: (summary.errors || []).slice(0, 5),
      });
      warnings.push(...(summary.warnings || []));
      errors.push(...(summary.errors || []).map((error) => `${key}: ${error}`));
    }

    const nextOffset = config.offset + batchDates.length < config.dates.length
      ? config.offset + batchDates.length
      : null;
    const completed = dateResults.filter((result) => result.status === 'COMPLETED').length;
    const skippedDuplicates = dateResults.filter((result) => result.status === 'SKIPPED_DUPLICATE').length;
    const failed = dateResults.filter((result) => result.status === 'FAILED').length;
    const notAvailable = dateResults.filter((result) => result.status === 'NOT_AVAILABLE').length;
    const processedCount = dateResults.length;
    const status: NseDeliveryHistoricalBackfillResponse['status'] = failed > 0 || notAvailable > 0
      ? completed > 0 || skippedDuplicates > 0 ? 'PARTIAL' : 'FAILED'
      : 'COMPLETED';

    return {
      status,
      source: 'NSE',
      segment: 'DELIVERY',
      region: config.region,
      assetType: config.assetType,
      startDate: config.startDateKey,
      endDate: config.endDateKey,
      targetSessions: config.targetSessions,
      totalDates: config.dates.length,
      processedCount,
      batchSize: config.batchSize,
      offset: config.offset,
      nextOffset,
      hasMore: nextOffset !== null,
      completed,
      skippedDuplicates,
      failed,
      notAvailable,
      symbolsCovered: coveredSymbols.size,
      oldestDate: dateResults.length > 0 ? dateResults[0].tradingDate : null,
      newestDate: dateResults.length > 0 ? dateResults[dateResults.length - 1].tradingDate : null,
      rowsRead: dateResults.reduce((sum, result) => sum + result.rowsRead, 0),
      rowsParsed: dateResults.reduce((sum, result) => sum + result.rowsParsed, 0),
      rowsInserted: dateResults.reduce((sum, result) => sum + result.rowsInserted, 0),
      rowsUpdated: dateResults.reduce((sum, result) => sum + result.rowsUpdated, 0),
      rowsNoOp: dateResults.reduce((sum, result) => sum + result.rowsNoOp, 0),
      rowsSkipped: dateResults.reduce((sum, result) => sum + result.rowsSkipped, 0),
      sourceFileImportIds: [...sourceFileImportIds].sort((a, b) => a.localeCompare(b)),
      warnings: Array.from(new Set(warnings)).slice(0, 10),
      errors: errors.slice(0, 10),
      dates: dateResults,
    };
  }

  async getExchangeHistoricalBackfillRun(runId: string): Promise<ExchangeHistoricalBackfillRunResponse> {
    const db = this.host.marketDataDb();
    let run = await this.host.withTransientDatabaseRetry<any | null>(() => db.pipelineRun.findUnique({
      where: { id: runId },
      include: { stages: { orderBy: [{ dataThroughDate: 'asc' }, { stageOrder: 'asc' }] } },
    }), 'read historical backfill run');
    if (!run || run.pipelineKey !== 'market-data-historical-exchange-backfill') {
      throw new Error('Historical exchange backfill run not found.');
    }
    if (IndiaHistoricalBackfillJobsBase.historicalBackfillDatabasePauses.has(runId)) {
      await this.blockHistoricalBackfillForTransientDatabase(runId);
      run = await this.host.withTransientDatabaseRetry<any | null>(() => db.pipelineRun.findUnique({
        where: { id: runId },
        include: { stages: { orderBy: [{ dataThroughDate: 'asc' }, { stageOrder: 'asc' }] } },
      }), 'reread historical backfill after database pause recovery');
      if (!run || run.pipelineKey !== 'market-data-historical-exchange-backfill') {
        throw new Error('Historical exchange backfill run not found.');
      }
    }
    if (
      String(run.status || '').toUpperCase() === 'RUNNING'
      && !IndiaHistoricalBackfillJobsBase.activeHistoricalBackfillRuns.has(runId)
    ) {
      const staleCount = await this.markStaleHistoricalBackfillJobs(runId, Number(this.host.objectMetadata(run.metadata).staleJobTimeoutMs || 10 * 60_000));
      if (staleCount > 0) {
        const metadata = this.host.objectMetadata(run.metadata);
        const warning = `${staleCount} stale worker job(s) were marked retryable. Resume the historical backfill to continue.`;
        await this.host.withTransientDatabaseRetry<any>(() => db.pipelineRun.update({
          where: { id: runId },
          data: {
            status: 'BLOCKED',
            warnings: [...this.host.stringArray(run.warnings), warning].slice(-10),
            metadata: {
              ...metadata,
              staleWorkerDetectedAt: new Date().toISOString(),
              staleWorkerCount: staleCount,
            },
          },
        }), 'mark historical backfill blocked for stale workers');
        run = await this.host.withTransientDatabaseRetry<any | null>(() => db.pipelineRun.findUnique({
          where: { id: runId },
          include: { stages: { orderBy: [{ dataThroughDate: 'asc' }, { stageOrder: 'asc' }] } },
        }), 'reread historical backfill after stale worker detection');
      }
    }
    return this.historicalBackfillResponse(run);
  }

  protected async normalizeHistoricalBackfillRunInput(input: ExchangeHistoricalBackfillRunInput) {
    const region = (input.region || 'IN').trim().toUpperCase();
    const assetType = (input.assetType || 'STOCK').trim().toUpperCase();
    if (region !== 'IN' || !['STOCK', 'INDEX'].includes(assetType)) {
      throw new Error('Exchange historical backfill currently supports IN/STOCK and IN/INDEX only.');
    }
    const segment = assetType === 'INDEX' ? 'INDEX' : 'CM';
    const source = assetType === 'INDEX' ? 'NSE_INDEX' : input.includeBseFill === true ? 'NSE+BSE' : 'NSE';
    const startDate = this.host.normalizeExchangeTradingDate(input.startDate);
    const requestedEndDate = this.host.normalizeExchangeTradingDate(input.endDate);
    const latestCompletedDateKey = latestCompletedTradingDateForRegion(region);
    const latestCompletedDate = latestCompletedDateKey
      ? this.host.normalizeExchangeTradingDate(latestCompletedDateKey)
      : null;
    const warnings: string[] = [];
    if (latestCompletedDate && startDate.getTime() > latestCompletedDate.getTime()) {
      throw new Error(`Historical exchange backfill cannot start after the latest completed trading date ${latestCompletedDateKey}.`);
    }
    const endDate = latestCompletedDate && requestedEndDate.getTime() > latestCompletedDate.getTime()
      ? latestCompletedDate
      : requestedEndDate;
    if (latestCompletedDate && requestedEndDate.getTime() > latestCompletedDate.getTime()) {
      warnings.push(`Requested end date ${this.host.exchangeDateKey(requestedEndDate)} was capped to latest completed trading date ${latestCompletedDateKey}.`);
    }
    if (startDate.getTime() > endDate.getTime()) {
      throw new Error('startDate must be on or before endDate.');
    }
    const requestedMaxDates = Number(input.maxDates);
    const maxDates = Number.isFinite(requestedMaxDates) && requestedMaxDates > 0
      ? Math.max(1, Math.floor(requestedMaxDates))
      : null;
    const workerCount = this.host.clampHistoricalBackfillWorkers(input.workerCount);
    const maxRetries = this.host.clampHistoricalBackfillMaxRetries(input.maxRetries);
    const downloadDelayMs = this.host.clampNumber(input.downloadDelayMs, 0, 60_000, 350);
    const jitterMs = this.host.clampNumber(input.jitterMs, 0, 10_000, 250);
    const staleJobTimeoutMs = this.host.clampNumber(input.staleJobTimeoutMs, 60_000, 60 * 60_000, 10 * 60_000);
    const completedDates = await this.listCompletedNseSourceImportDates(segment, startDate, endDate);
    const completedDateKeys = new Set(completedDates.map((date: Date) => this.host.exchangeDateKey(date)));
    const allDates = this.host.exchangeBackfillDates(startDate, endDate);
    const officialHolidayDates = await this.host.nseCmTradingHolidayDatesForRange(startDate, endDate);
    const jobDates: Array<{ date: Date; key: string; alreadyImported: boolean }> = [];
    let skippedNonTradingDates = 0;
    let skippedOfficialHolidayDates = 0;
    for (const date of allDates) {
      if (!this.host.isWeekdayTradingCandidate(date)) {
        skippedNonTradingDates += 1;
        continue;
      }
      const key = this.host.exchangeDateKey(date);
      if (officialHolidayDates.has(key)) {
        skippedOfficialHolidayDates += 1;
        skippedNonTradingDates += 1;
        continue;
      }
      if (maxDates !== null && jobDates.length >= maxDates) break;
      jobDates.push({ date, key, alreadyImported: completedDateKeys.has(key) });
    }
    if (skippedOfficialHolidayDates > 0) {
      warnings.push(`Skipped ${skippedOfficialHolidayDates} official NSE CM trading holiday date(s) from the backfill range.`);
    }
    return {
      region,
      assetType,
      startDate,
      endDate,
      startDateKey: this.host.exchangeDateKey(startDate),
      endDateKey: this.host.exchangeDateKey(endDate),
      source,
      segment,
      maxDates,
      workerCount,
      maxRetries,
      includeBseFill: assetType === 'STOCK' && input.includeBseFill === true,
      downloadDelayMs,
      jitterMs,
      staleJobTimeoutMs,
      totalCalendarDates: allDates.length,
      skippedNonTradingDates,
      skippedOfficialHolidayDates,
      initialSkippedCount: jobDates.filter((job) => job.alreadyImported).length,
      jobDates,
      warnings,
    };
  }

  protected async processHistoricalBackfillJob(stage: any, metadata: Record<string, unknown>, leaseOwner: string): Promise<void> {
    const tradingDate = String(metadata.tradingDate || this.host.exchangeDateKey(stage.dataThroughDate));
    const date = this.host.normalizeExchangeTradingDate(tradingDate);
    const assetType = String(stage.scopeAssetType || metadata.assetType || 'STOCK').trim().toUpperCase();
    const includeBseFill = String(metadata.source || '') === 'NSE+BSE';
    const startedAt = stage.startedAt instanceof Date ? stage.startedAt : new Date();
    try {
      if (assetType === 'INDEX') {
        if (await this.hasCompletedNseSourceImportForDate(date, 'INDEX')) {
          await this.completeHistoricalBackfillJob(stage, {
            status: 'SKIPPED',
            jobStatus: 'SKIPPED_ALREADY_IMPORTED',
            rowsRead: 0,
            rowsParsed: 0,
            rowsInserted: 0,
            rowsUpdated: 0,
            rowsNoOp: 0,
            rowsSkipped: 1,
            bseFills: 0,
            sourceFileImportId: null,
            warnings: [],
            errors: [],
            startedAt,
            leaseOwner,
          });
          return;
        }
        const nse = await this.host.importNseIndexOfficialDaily({ tradingDate: date, skipLatestPriceUpdate: true });
        const jobStatus = nse.status === 'SKIPPED_DUPLICATE'
          ? 'SKIPPED_ALREADY_IMPORTED'
          : nse.status === 'FAILED' && this.host.isHistoricalBackfillNotAvailable(nse)
            ? 'NOT_AVAILABLE'
            : nse.status === 'FAILED'
              ? 'FAILED'
              : 'COMPLETED';
        await this.completeHistoricalBackfillJob(stage, {
          status: jobStatus === 'COMPLETED' ? 'COMPLETED' : jobStatus === 'FAILED' ? 'FAILED' : 'SKIPPED',
          jobStatus,
          rowsRead: Number(nse.rowsRead || 0),
          rowsParsed: Number(nse.rowsParsed || 0),
          rowsInserted: Number(nse.rowsInserted || 0),
          rowsUpdated: Number(nse.rowsUpdated || 0),
          rowsNoOp: Number(nse.rowsNoOp || 0),
          rowsSkipped: Number(nse.rowsSkipped || 0),
          bseFills: 0,
          sourceFileImportId: nse.sourceFileImportId || null,
          warnings: (nse.warnings || []).slice(0, 10),
          errors: [...(nse.errors || [])],
          startedAt,
          leaseOwner,
        });
        return;
      }

      if (await this.hasCompletedNseCmImportForDate(date)) {
        await this.completeHistoricalBackfillJob(stage, {
          status: 'SKIPPED',
          jobStatus: 'SKIPPED_ALREADY_IMPORTED',
          rowsRead: 0,
          rowsParsed: 0,
          rowsInserted: 0,
          rowsUpdated: 0,
          rowsNoOp: 0,
          rowsSkipped: 1,
          bseFills: 0,
          sourceFileImportId: null,
          warnings: [],
          errors: [],
          startedAt,
          leaseOwner,
        });
        return;
      }
      const nse = await this.host.importNseCmOfficialDaily({ tradingDate: date, skipLatestPriceUpdate: true });
      let bse: ExchangeDailyImportSummary | null = null;
      if (includeBseFill && nse.status !== 'FAILED') {
        try {
          bse = await this.host.importBseCmBackupDaily({ tradingDate: date, skipLatestPriceUpdate: true });
        } catch (error) {
          bse = {
            status: 'FAILED',
            source: 'BSE',
            segment: 'CM',
            tradingDate,
            sourceName: 'BSE_UDIFF_CM_BHAVCOPY',
            fileName: `BhavCopy_BSE_CM_${tradingDate.replace(/-/g, '')}.csv`,
            fileUrl: null,
            sourceFileImportId: null,
            sourceFingerprint: null,
            rowsRead: 0,
            rowsParsed: 0,
            rowsInserted: 0,
            rowsUpdated: 0,
            rowsNoOp: 0,
            rowsSkipped: 0,
            warningCount: 1,
            warnings: [error instanceof Error ? error.message : 'BSE fill-only import unavailable'],
            errors: [],
            changedSymbols: [],
            downstreamSymbols: [],
          };
        }
      }
      const errors = [...(nse.errors || [])];
      const warnings = [...(nse.warnings || []), ...(bse?.warnings || [])].slice(0, 10);
      const bseFills = Math.max(0, Number(bse?.rowsInserted || 0) + Number(bse?.rowsUpdated || 0));
      const jobStatus = nse.status === 'SKIPPED_DUPLICATE'
        ? 'SKIPPED_ALREADY_IMPORTED'
        : nse.status === 'FAILED' && this.host.isHistoricalBackfillNotAvailable(nse)
          ? 'NOT_AVAILABLE'
          : nse.status === 'FAILED'
            ? 'FAILED'
            : 'COMPLETED';
      await this.completeHistoricalBackfillJob(stage, {
        status: jobStatus === 'COMPLETED' ? 'COMPLETED' : jobStatus === 'FAILED' ? 'FAILED' : 'SKIPPED',
        jobStatus,
        rowsRead: Number(nse.rowsRead || 0) + Number(bse?.rowsRead || 0),
        rowsParsed: Number(nse.rowsParsed || 0) + Number(bse?.rowsParsed || 0),
        rowsInserted: Number(nse.rowsInserted || 0) + Number(bse?.rowsInserted || 0),
        rowsUpdated: Number(nse.rowsUpdated || 0) + Number(bse?.rowsUpdated || 0),
        rowsNoOp: Number(nse.rowsNoOp || 0) + Number(bse?.rowsNoOp || 0),
        rowsSkipped: Number(nse.rowsSkipped || 0) + Number(bse?.rowsSkipped || 0),
        bseFills,
        sourceFileImportId: nse.sourceFileImportId || null,
        warnings,
        errors,
        startedAt,
        leaseOwner,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Historical backfill date job failed';
      await this.completeHistoricalBackfillJob(stage, {
        status: this.host.isNotAvailableErrorMessage(message) ? 'SKIPPED' : 'FAILED',
        jobStatus: this.host.isNotAvailableErrorMessage(message) ? 'NOT_AVAILABLE' : 'FAILED',
        rowsRead: 0,
        rowsParsed: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: 0,
        bseFills: 0,
        sourceFileImportId: null,
        warnings: [],
        errors: [message],
        startedAt,
        leaseOwner,
      });
    }
  }
}
