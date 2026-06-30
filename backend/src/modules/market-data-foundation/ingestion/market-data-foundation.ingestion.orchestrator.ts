// Region-sync orchestrator cluster (ingestion-extraction phase).
//
// Owns syncScheduledRegion — the scheduler/pipeline-facing region sync entry point that selects the
// ingestion path (NSE/BSE exchange-file import for IN, the free region-provider path for US/EU, or
// the official NSE EOD bulk + provider-disabled fallback) and assembles the ScheduledRegionSyncSummary
// downstream DQ/pipeline catch-up consumes. Also owns the two path-selection predicates. Bodies are
// byte-identical to the pre-extraction inline implementation in market-data-foundation.service.ts
// (this.X -> this.host.X for stays-on-service collaborators — repository, evaluateSyncFreshnessGate,
// manualSyncCooldownMinutes, the sync-gate summary/fingerprint/task helpers, the India daily importers,
// the official NSE EOD bulk seams — while PURE util/mapper delegators are imported directly). The
// service keeps a thin byte-identical delegator for syncScheduledRegion (a jest-spy test seam).

import type { MarketDataIngestionHost } from './market-data-foundation.ingestion-host';
import type {
  ScheduledRegionSyncSummary,
} from '../market-data-foundation.types';
import { latestCompletedTradingDateForRegion, shouldRunMarketDataSync, tradingDateForRegion } from './market-data-foundation.market-session';
import { regionUsesRegionProviderPath } from './market-data-foundation.provider-registry';
import { resolveRegionAdapter } from './market-data-foundation.region-ingestion-registry';
import { usEquityIngestionService } from './us/market-data-foundation.us-equity-ingestion.service';
import { UniverseCurationService } from '../market-data-foundation.universe-curation.service';

// Singleton — standalone (own Prisma via CoverageRepository default), used only inside
// the provider-path branch to re-rank the tracked set before each sync so instruments
// that gained data since the last curation (e.g. after a historical backfill) are
// re-activated and picked up in the same pipeline run rather than staying excluded forever.
const universeCurationService = new UniverseCurationService();

export class RegionSyncOrchestrator {
  constructor(private readonly host: MarketDataIngestionHost) {}

  async syncScheduledRegion(region: string, options: {
    assetType?: string;
    batchSize?: number;
    lookbackTradingDays?: number;
    now?: Date;
    syncDuringMarketHours?: boolean;
    postCloseSyncWindowMinutes?: number;
    finalizationGraceMinutes?: number;
    skipWeekends?: boolean;
  } = {}): Promise<ScheduledRegionSyncSummary> {
    const assetType = options.assetType || 'STOCK';
    const now = options.now || new Date();
    const tradingDate = tradingDateForRegion(region, now) || now.toISOString().slice(0, 10);
    const targetTradingDate = latestCompletedTradingDateForRegion(region, now) || tradingDate;
    const gate = await this.host.evaluateSyncFreshnessGate({
      region,
      assetType,
      scopeType: 'CATALOG',
      scopeKey: region,
      tradingDate,
      now,
      force: false,
      cooldownMinutes: this.host.manualSyncCooldownMinutes,
      syncDuringMarketHours: options.syncDuringMarketHours,
      postCloseSyncWindowMinutes: options.postCloseSyncWindowMinutes,
      finalizationGraceMinutes: options.finalizationGraceMinutes,
      skipWeekends: options.skipWeekends,
    });
    if (gate.shouldSkip) {
      const staleCount = await this.host.countStaleCatalogSyncTasks({ region, assetType }, targetTradingDate);
      if (staleCount > 0) {
        console.log(`Catalog sync continuing: ${staleCount} instruments still need latest completed candle ${targetTradingDate}.`);
      } else {
        console.log(`Catalog sync skipped: ${gate.reason}. No provider fetch required. Next eligible sync at ${gate.nextEligibleSyncAt ?? 'unknown'}`);
        const skippedCount = await this.host.repository.instrumentCount({ region, assetType });
        const summary = this.host.buildSkippedRegionSummary(region, assetType, tradingDate, skippedCount, gate.reason, gate.message, now, gate.nextEligibleSyncAt);
        await this.host.repository.upsertSyncState({
          region,
          assetType,
          scopeType: 'CATALOG',
          scopeKey: region,
          tradingDate,
          timeframe: '1D',
          status: gate.reason === 'FINAL_CANDLE_CONFIRMED' ? 'FINAL_CONFIRMED' : 'SYNCED',
          summary,
          lastCheckedAt: now,
        });
        return summary;
      }
    }

    const batchSize = Math.max(1, Math.min(options.batchSize ?? 25, 2000));

    if (this.shouldUseExchangeDailyImportPath(region, assetType)) {
      const summary: ScheduledRegionSyncSummary = {
        region,
        assetType,
        tradingDate,
        dataThroughDate: targetTradingDate,
        instrumentsProcessed: 0,
        rowsReceived: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        changedInstrumentIds: [],
        downstreamInstrumentIds: [],
        changedInstrumentCount: 0,
        dqStageEligible: false,
        warningCount: 0,
        warnings: [],
        errors: [],
      };
      await this.host.repository.upsertSyncState({ region, assetType, tradingDate, status: 'PENDING', summary, lastCheckedAt: now });

      const tasks = await this.host.repository.listActiveStockSyncTasks({ region, assetType });
      const importSummary = assetType === 'INDEX'
        ? await this.host.importNseIndexOfficialDaily({ tradingDate: targetTradingDate })
        : await this.host.importNseCmUdiffDaily({ tradingDate: targetTradingDate });
      const importNotAvailable = importSummary.status === 'NOT_AVAILABLE';
      const latestValidDataThroughDate = importNotAvailable
        ? await this.host.repository.latestStoredTradingDateForRegion(region, assetType).catch(() => null)
        : targetTradingDate;
      const effectiveDataThroughDate = latestValidDataThroughDate || (importNotAvailable ? null : targetTradingDate);
      const availabilityWarnings = importNotAvailable
        ? [
          effectiveDataThroughDate
            ? `NSE EOD file for ${targetTradingDate} is not available yet; using latest stored dataThroughDate ${effectiveDataThroughDate} for downstream refresh.`
            : `NSE EOD file for ${targetTradingDate} is not available yet and no prior stored dataThroughDate is available for downstream refresh.`,
        ]
        : [];
      const changedInstrumentIds = this.host.instrumentIdsForImportedSymbols(tasks, importSummary.changedSymbols || []);
      const matchedInstrumentIds = this.host.instrumentIdsForImportedSymbols(tasks, importSummary.downstreamSymbols || importSummary.changedSymbols || []);
      const downstreamInstrumentIds = matchedInstrumentIds;

      summary.dataThroughDate = effectiveDataThroughDate;
      summary.instrumentsProcessed = importSummary.rowsParsed;
      summary.rowsReceived = importSummary.rowsParsed;
      summary.rowsInserted = importSummary.rowsInserted;
      summary.rowsUpdated = importSummary.rowsUpdated;
      summary.rowsSkipped = importSummary.rowsSkipped;
      summary.rowsNoOp = importSummary.rowsNoOp;
      summary.warningCount = importSummary.warningCount + availabilityWarnings.length;
      summary.warnings = [...importSummary.warnings, ...availabilityWarnings].slice(0, 10);
      summary.errors = importSummary.errors.slice(0, 10);
      summary.sourceFingerprint = importSummary.sourceFingerprint || this.host.scheduledRegionSourceFingerprint({
        region,
        assetType,
        dataThroughDate: effectiveDataThroughDate || targetTradingDate,
        rowsInserted: importSummary.rowsInserted,
        rowsUpdated: importSummary.rowsUpdated,
        changedInstrumentIds,
        downstreamInstrumentIds,
      });
      summary.changedInstrumentIds = changedInstrumentIds;
      summary.downstreamInstrumentIds = downstreamInstrumentIds;
      summary.downstreamEligibilitySource = downstreamInstrumentIds.length > 0 ? 'exchange_file_summary' : null;
      summary.changedInstrumentCount = changedInstrumentIds.length;
      summary.dqStageEligible = changedInstrumentIds.length > 0 && importSummary.status !== 'FAILED';
      summary.officialEodBulk = {
        enabled: true,
        attempted: true,
        sourceName: importSummary.sourceName,
        sourceUrl: importSummary.fileUrl,
        sourceFileName: importSummary.fileName,
        targetTradingDate,
        sourceFingerprint: importSummary.status === 'NOT_AVAILABLE' ? null : importSummary.sourceFingerprint,
        rowsRead: importSummary.rowsRead,
        rowsParsed: importSummary.rowsParsed,
        matchedInstruments: matchedInstrumentIds.length,
        rowsInserted: importSummary.rowsInserted,
        rowsUpdated: importSummary.rowsUpdated,
        rowsNoOp: importSummary.rowsNoOp,
        fallbackReason: importSummary.status === 'SKIPPED_DUPLICATE'
          ? 'SOURCE_FILE_ALREADY_IMPORTED'
          : importSummary.status === 'NOT_AVAILABLE'
            ? 'OFFICIAL_EOD_NOT_AVAILABLE'
            : null,
        warnings: importSummary.warnings.slice(0, 10),
      };

      if (matchedInstrumentIds.length > 0) {
        const matchedSymbols = this.host.importedSymbolsForInstrumentIds(tasks, matchedInstrumentIds);
        await this.host.updateStockLoadTimestampsForSymbols(matchedSymbols);
      }

      const status = importSummary.status === 'FAILED' ? 'FAILED' : 'SYNCED';
      await this.host.repository.upsertSyncState({ region, assetType, tradingDate, status, summary, lastCheckedAt: now, lastProviderFetchAt: null });
      return {
        ...summary,
        warnings: summary.warnings.slice(0, 10),
        errors: summary.errors.slice(0, 10),
      };
    }

    // US/EU FREE region provider path (Yahoo EOD via the provider-registry).
    // Mirrors the NSE exchange-file branch shape so downstream DQ/pipeline
    // catch-up consumes a byte-compatible ScheduledRegionSyncSummary.
    if (this.shouldUseRegionProviderImportPath(region, assetType)) {
      const summary: ScheduledRegionSyncSummary = {
        region,
        assetType,
        tradingDate,
        dataThroughDate: targetTradingDate,
        instrumentsProcessed: 0,
        rowsReceived: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        changedInstrumentIds: [],
        downstreamInstrumentIds: [],
        changedInstrumentCount: 0,
        dqStageEligible: false,
        warningCount: 0,
        warnings: [],
        errors: [],
      };
      await this.host.repository.upsertSyncState({ region, assetType, tradingDate, status: 'PENDING', summary, lastCheckedAt: now });

      // Re-curate the universe before fetching so instruments that gained price data
      // since the last curation (e.g. after a historical backfill) are re-ranked and
      // re-activated. Without this, a deactivated instrument stays excluded forever
      // even when it legitimately ranks within the top-N by liquidity.
      // Errors are non-fatal: a curation hiccup should not abort the data sync.
      try {
        const curationResult = await universeCurationService.curateRegion(region);
        console.log(`[syncScheduledRegion:${region}] universe re-curation complete: tracked=${curationResult.trackedTotal}, activated=${curationResult.activated}, deactivated=${curationResult.deactivated}`);
      } catch (curationErr) {
        console.warn(`[syncScheduledRegion:${region}] universe re-curation failed (non-fatal):`, curationErr instanceof Error ? curationErr.message : curationErr);
      }

      const tasks = await this.host.repository.listActiveStockSyncTasks({ region, assetType });
      const symbols = tasks.map((task) => task.symbol).filter(Boolean);
      // Small forward lookback so a single tick captures the latest completed candle
      // plus a few prior days (covers weekends/holidays); full history is seeded offline.
      const lookbackDays = Math.max(5, (options.lookbackTradingDays ?? 2) + 5);
      // Dispatch through the region-ingestion registry (the single region→adapter
      // seam). US/EU resolve to the shared free-provider adapter; the direct call
      // remains as a defensive fallback so behaviour is byte-identical if no
      // adapter resolves.
      const regionAdapter = resolveRegionAdapter(region, assetType);
      const backfill = regionAdapter
        ? await regionAdapter.syncDaily({ region, assetType, symbols, lookbackTradingDays: lookbackDays })
        : await usEquityIngestionService.backfillPrices({ region, symbols, lookbackDays });

      const changedInstrumentIds = this.host.instrumentIdsForImportedSymbols(tasks, backfill.changedSymbols);
      const allBatchInstrumentIds = this.host.instrumentIdsForImportedSymbols(tasks, symbols);
      const downstreamInstrumentIds = allBatchInstrumentIds;

      summary.instrumentsProcessed = backfill.symbolsProcessed;
      summary.rowsReceived = backfill.barsReceived;
      summary.rowsInserted = backfill.barsInserted;
      summary.rowsUpdated = backfill.barsUpdated;
      summary.rowsSkipped = backfill.barsSkipped;
      summary.rowsNoOp = 0;
      summary.warningCount = backfill.warnings.length;
      summary.warnings = backfill.warnings.slice(0, 10);
      summary.changedInstrumentIds = changedInstrumentIds;
      summary.downstreamInstrumentIds = downstreamInstrumentIds;
      summary.downstreamEligibilitySource = downstreamInstrumentIds.length > 0 ? 'region_provider_backfill' : null;
      summary.changedInstrumentCount = changedInstrumentIds.length;
      summary.dqStageEligible = changedInstrumentIds.length > 0;
      summary.sourceFingerprint = this.host.scheduledRegionSourceFingerprint({
        region,
        assetType,
        dataThroughDate: targetTradingDate,
        rowsInserted: backfill.barsInserted,
        rowsUpdated: backfill.barsUpdated,
        changedInstrumentIds,
        downstreamInstrumentIds,
      });

      const timestampSymbols = backfill.processedSymbols ?? symbols;
      if (timestampSymbols.length > 0) {
        await this.host.updateStockLoadTimestampsForSymbols(timestampSymbols);
      }

      await this.host.repository.upsertSyncState({ region, assetType, tradingDate, status: 'SYNCED', summary, lastCheckedAt: now, lastProviderFetchAt: now });
      return {
        ...summary,
        warnings: summary.warnings.slice(0, 10),
        errors: summary.errors.slice(0, 10),
      };
    }

    const repositoryAny = this.host.repository as any;
    const canListStaleTasks = typeof repositoryAny.listStaleActiveStockSyncTasks === 'function';
    const officialBulkEnabled = this.host.officialNseEodBulkEnabled();
    const staleTasksForOfficial = officialBulkEnabled && canListStaleTasks
      ? await this.host.listStaleCatalogSyncTasks({ region, assetType }, targetTradingDate, undefined)
      : [];
    const providerTasks = gate.shouldSkip
      ? (staleTasksForOfficial.length > 0
        ? staleTasksForOfficial.slice(0, batchSize)
        : await this.host.listStaleCatalogSyncTasks({ region, assetType }, targetTradingDate, batchSize))
      : await this.host.repository.listActiveStockSyncTasks({ region, assetType }, batchSize);
    const officialTasks = staleTasksForOfficial.length > 0 ? staleTasksForOfficial : providerTasks;
    const summary: ScheduledRegionSyncSummary = {
      region,
      assetType,
      tradingDate,
      dataThroughDate: targetTradingDate,
      instrumentsProcessed: 0,
      rowsReceived: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      changedInstrumentIds: [],
      downstreamInstrumentIds: [],
      changedInstrumentCount: 0,
      dqStageEligible: false,
      warningCount: 0,
      warnings: [],
      errors: [],
    };
    const changedInstrumentIds = new Set<string>();
    const downstreamInstrumentIds = new Set<string>();

    await this.host.repository.upsertSyncState({ region, assetType, tradingDate, status: 'PENDING', summary, lastCheckedAt: now });

    const officialBulk = await this.host.tryOfficialNseEodBulkLatestCandle({
      region,
      assetType,
      targetTradingDate,
      tasks: officialTasks,
    });
    summary.officialEodBulk = officialBulk.evidence;
    for (const taskId of officialBulk.matchedTaskIds) {
      const taskSummary = officialBulk.summaryByTaskId.get(taskId);
      if (!taskSummary) continue;
      downstreamInstrumentIds.add(taskId);
      if ((taskSummary.rowsInserted || 0) > 0 || (taskSummary.rowsUpdated || 0) > 0) {
        changedInstrumentIds.add(taskId);
      }
      summary.instrumentsProcessed += 1;
      summary.rowsReceived += taskSummary.rowsReceived || 0;
      summary.rowsInserted += taskSummary.rowsInserted || 0;
      summary.rowsUpdated += taskSummary.rowsUpdated || 0;
      summary.rowsSkipped += taskSummary.rowsSkipped || 0;
      summary.rowsNoOp += taskSummary.rowsNoOp || 0;
      summary.warningCount += taskSummary.warningCount || 0;
      summary.warnings.push(...(taskSummary.warnings || []));
    }
    if (officialBulk.evidence.fallbackReason) {
      summary.warningCount += 1;
      summary.warnings.push(`Official NSE EOD bulk fallback: ${officialBulk.evidence.fallbackReason}`);
    }

    for (const task of providerTasks) {
      if (officialBulk.matchedTaskIds.has(task.id)) continue;
      summary.instrumentsProcessed += 1;
      summary.rowsSkipped += 1;
      summary.warningCount += 1;
      summary.warnings.push(`${task.symbol}: no NSE/BSE exchange-file row matched; Yahoo/Angel provider fallback is disabled.`);
    }
    const sortedChangedInstrumentIds = [...changedInstrumentIds].sort((a, b) => a.localeCompare(b));
    const sortedDownstreamInstrumentIds = [...downstreamInstrumentIds].sort((a, b) => a.localeCompare(b));
    summary.changedInstrumentIds = sortedChangedInstrumentIds;
    summary.downstreamInstrumentIds = sortedDownstreamInstrumentIds;
    summary.downstreamEligibilitySource = sortedDownstreamInstrumentIds.length > 0 ? 'official_eod_bulk' : null;
    summary.changedInstrumentCount = sortedChangedInstrumentIds.length;
    summary.dqStageEligible = sortedChangedInstrumentIds.length > 0;
    summary.sourceFingerprint = summary.officialEodBulk?.sourceFingerprint
      || this.host.scheduledRegionSourceFingerprint({
        region,
        assetType,
        dataThroughDate: targetTradingDate,
        rowsInserted: summary.rowsInserted,
        rowsUpdated: summary.rowsUpdated,
        changedInstrumentIds: sortedChangedInstrumentIds,
        downstreamInstrumentIds: sortedDownstreamInstrumentIds,
      });

    const latestTradingDate = await this.host.repository.latestStoredTradingDateForRegion(region, assetType);
    const remainingStaleCount = await this.host.countStaleCatalogSyncTasks({ region, assetType }, targetTradingDate).catch(() => 0);
    if (remainingStaleCount > 0) {
      (summary as any).remainingStaleCount = remainingStaleCount;
      summary.warningCount += 1;
      summary.warnings.push(`${remainingStaleCount} instruments still need latest completed candle ${targetTradingDate}.`);
    }
    const decisionAfterRun = shouldRunMarketDataSync(region, now, {
      latestTradingDate,
      finalConfirmed: false,
    }, {
      syncDuringMarketHours: options.syncDuringMarketHours,
      postCloseSyncWindowMinutes: options.postCloseSyncWindowMinutes,
      finalizationGraceMinutes: options.finalizationGraceMinutes,
      skipWeekends: options.skipWeekends,
    });
    const canConfirmFinal = latestTradingDate === tradingDate
      && summary.rowsInserted === 0
      && summary.rowsUpdated === 0
      && summary.rowsNoOp > 0
      && (decisionAfterRun.reasonCode === 'POST_CLOSE_FINALIZATION_WINDOW' || decisionAfterRun.reasonCode === 'MARKET_CLOSED_NO_SYNC' || decisionAfterRun.reasonCode === 'MARKET_CLOSED_AWAITING_EOD_FILE');
    const status = summary.errors.length > 0 || remainingStaleCount > 0
      ? 'FAILED'
      : canConfirmFinal
        ? 'FINAL_CONFIRMED'
        : 'SYNCED';

    await this.host.repository.upsertSyncState({ region, assetType, tradingDate, status, summary, lastCheckedAt: now, lastProviderFetchAt: now });
    return {
      ...summary,
      warnings: summary.warnings.slice(0, 10),
      errors: summary.errors.slice(0, 10),
    };
  }

  private shouldUseExchangeDailyImportPath(region: string, assetType: string): boolean {
    const repository = this.host.repository as any;
    return region === 'IN'
      && ['STOCK', 'INDEX'].includes(assetType)
      && typeof repository.upsertSourceFileImport === 'function'
      && typeof repository.storeHistoricalBulk === 'function';
  }

  /**
   * US/EU equities flow through the FREE region provider (Yahoo EOD) when that
   * region's provider is enabled.  IN stays on the exchange-file path above and
   * GLOBAL (crypto) is served by its own isolated lane, so neither is affected.
   */
  private shouldUseRegionProviderImportPath(region: string, assetType: string): boolean {
    const repository = this.host.repository as any;
    return assetType === 'STOCK'
      && regionUsesRegionProviderPath(region)
      && typeof repository.storeHistoricalBulk === 'function';
  }
}
