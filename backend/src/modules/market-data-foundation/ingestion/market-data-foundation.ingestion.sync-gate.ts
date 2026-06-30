// Sync freshness-gate + sync-task helper cluster (ingestion-extraction phase).
//
// Owns the per-region/per-instrument freshness gate (evaluateSyncFreshnessGate and its leaf
// helpers), the skipped-summary builders, the scheduled-region source fingerprint, and the
// sync-lane task helpers (region resolution, symbol-alias matching, load-timestamp updates).
// Bodies are byte-identical to the pre-extraction inline implementation in
// market-data-foundation.service.ts (this.X -> this.host.X for stays-on-service collaborators —
// repository, latestStoredCandleInfo — while PURE util/mapper delegators are imported directly).
// The service keeps thin byte-identical delegators that forward into this cluster, including the
// PUBLIC delegators reached by IndiaOfficialEodService (taskPriceRegionInfo / taskSymbolAliases /
// symbolAliasCandidates / instrumentIdsForImportedSymbols / updateStockLoadTimestampsForSymbols /
// isNseLikeExchange / hasExplicitExchangeSuffix) and the orchestrator/catalog-sync clusters
// (evaluateSyncFreshnessGate / buildSkipped*Summary / scheduledRegionSourceFingerprint).

import { createHash } from 'crypto';
import type { MarketDataIngestionHost } from './market-data-foundation.ingestion-host';
import type {
  MarketDataSyncSkipReason,
  ScheduledRegionSyncSummary,
  StockSyncTask,
  SyncSummary,
} from '../market-data-foundation.types';
import { latestCompletedTradingDateForRegion, shouldRunMarketDataSync } from './market-data-foundation.market-session';
import { baseSymbolFromProviderSymbol as baseSymbolFromProviderSymbolMapper } from '../analytics/market-data-foundation.instrument-mapper';
import { endOfTradingDateUtc as endOfTradingDateUtcUtil, addMinutes as addMinutesUtil } from '../util/market-data-foundation.util.dates';
import { trimmedUpper as trimmedUpperUtil } from '../util/market-data-foundation.util.misc';

type PriceRegionInfo = {
  region: string;
  exchange?: string | null;
};

export class SyncGateService {
  constructor(private readonly host: MarketDataIngestionHost) {}

  async shouldRunScheduledSync(region: string, assetType = 'STOCK', now = new Date(), options: {
    syncDuringMarketHours?: boolean;
    postCloseSyncWindowMinutes?: number;
    finalizationGraceMinutes?: number;
    skipWeekends?: boolean;
  } = {}) {
    const latest = await this.host.latestStoredCandleInfo(region, assetType, now);
    return shouldRunMarketDataSync(region, now, {
      latestTradingDate: latest.latestTradingDate,
      finalConfirmed: latest.finalConfirmed,
    }, options);
  }

  taskPriceRegionInfo(defaultRegion: string, task: StockSyncTask): PriceRegionInfo {
    const exchange = this.trimmedUpper(task.exchange);
    if (defaultRegion === 'IN' && (this.isNseLikeExchange(exchange || '') || this.hasExplicitExchangeSuffix(task.providerSymbol, '.NS') || this.hasExplicitExchangeSuffix(task.symbol, '.NS'))) {
      return { region: 'IN', exchange: 'NSE' };
    }
    if (defaultRegion === 'IN' && (exchange === 'BSE' || this.hasExplicitExchangeSuffix(task.providerSymbol, '.BO') || this.hasExplicitExchangeSuffix(task.symbol, '.BO'))) {
      return { region: 'IN', exchange: 'BSE' };
    }
    return { region: defaultRegion, exchange: exchange || null };
  }

  instrumentIdsForImportedSymbols(tasks: StockSyncTask[], symbols: string[]): string[] {
    const symbolSet = new Set(symbols.flatMap((symbol) => [...this.symbolAliasCandidates(symbol)]));
    return tasks
      .filter((task) => [...this.taskSymbolAliases(task)].some((alias) => symbolSet.has(alias)))
      .map((task) => task.id)
      .sort((a, b) => a.localeCompare(b));
  }

  importedSymbolsForInstrumentIds(tasks: StockSyncTask[], instrumentIds: string[]): string[] {
    const ids = new Set(instrumentIds);
    return tasks
      .filter((task) => ids.has(task.id))
      .map((task) => task.symbol)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  async updateStockLoadTimestampsForSymbols(symbols: string[]): Promise<void> {
    const uniqueSymbols = [...new Set(symbols.filter(Boolean))];
    if (uniqueSymbols.length === 0) return;
    const repository = this.host.repository as any;
    if (typeof repository.updateStockLoadTimestampBySymbols === 'function') {
      try {
        await repository.updateStockLoadTimestampBySymbols(uniqueSymbols);
        return;
      } catch {
        // Fall through to per-symbol compatibility path for older repository doubles.
      }
    }
    if (typeof repository.updateStockLoadTimestampBySymbol !== 'function') return;
    await Promise.all(uniqueSymbols.map((symbol) =>
      this.host.repository.updateStockLoadTimestampBySymbol(symbol).catch(() => null)
    ));
  }

  isNseLikeExchange(exchange: string): boolean {
    return exchange === 'NSE'
      || exchange === 'NSE_EQ'
      || exchange === 'NSE_EQUITY'
      || exchange.startsWith('NSE');
  }

  hasExplicitExchangeSuffix(symbol: string | null | undefined, suffix: '.NS' | '.BO'): boolean {
    return this.trimmedUpper(symbol)?.endsWith(suffix) || false;
  }

  taskSymbolAliases(task: StockSyncTask): string[] {
    const aliases = new Set<string>();
    for (const value of [task.symbol, task.providerSymbol, task.sourceSymbol, task.displaySymbol]) {
      for (const alias of this.symbolAliasCandidates(value)) {
        aliases.add(alias);
      }
    }
    return [...aliases];
  }

  symbolAliasCandidates(symbol: string | null | undefined): string[] {
    const normalized = String(symbol || '').trim().toUpperCase();
    if (!normalized) return [];
    const base = baseSymbolFromProviderSymbolMapper(normalized);
    const aliases = new Set<string>([normalized, base]);
    if (base) aliases.add(`${base}.NS`);
    return [...aliases].filter(Boolean);
  }

  async evaluateSyncFreshnessGate(input: {
    region: string;
    assetType: string;
    scopeType: 'CATALOG' | 'INSTRUMENT';
    scopeKey: string;
    tradingDate: string;
    now: Date;
    force: boolean;
    cooldownMinutes: number;
    syncDuringMarketHours?: boolean;
    postCloseSyncWindowMinutes?: number;
    finalizationGraceMinutes?: number;
    skipWeekends?: boolean;
  }): Promise<{
    shouldSkip: boolean;
    reason: MarketDataSyncSkipReason;
    message: string;
    nextEligibleSyncAt?: string;
    providerEndDate?: Date;
  }> {
    if (input.force) {
      return { shouldSkip: false, reason: 'RECENTLY_SYNCED', message: 'Force sync requested.' };
    }

    const [latestTradingDate, syncState] = await Promise.all([
      this.host.repository.latestStoredTradingDateForRegion(input.region, input.assetType),
      this.host.repository.getSyncState(input.region, input.assetType, input.tradingDate, {
        scopeType: input.scopeType,
        scopeKey: input.scopeKey,
        timeframe: '1D',
      }),
    ]);
    const latestCompletedTradingDate = latestCompletedTradingDateForRegion(input.region, input.now);
    const latestCompletedCandleMissing = this.isLatestCompletedCandleMissing(latestTradingDate, latestCompletedTradingDate);
    const completedCatchUpEndDate = latestCompletedCandleMissing
      ? endOfTradingDateUtcUtil(latestCompletedTradingDate)
      : undefined;

    if (syncState?.status === 'FINAL_CONFIRMED' && !latestCompletedCandleMissing) {
      return {
        shouldSkip: true,
        reason: 'FINAL_CANDLE_CONFIRMED',
        message: this.skipMessage(input.scopeType, 'FINAL_CANDLE_CONFIRMED'),
      };
    }

    if (syncState?.status === 'PENDING') {
      return {
        shouldSkip: false,
        reason: 'RECENTLY_SYNCED',
        message: 'Previous market-data sync did not complete; retrying from Market Data.',
        providerEndDate: completedCatchUpEndDate,
      };
    }

    if (syncState?.lastCheckedAt && syncState.status !== 'FAILED' && !latestCompletedCandleMissing) {
      const lastCheckedAt = new Date(syncState.lastCheckedAt);
      const nextEligibleAt = addMinutesUtil(lastCheckedAt, input.cooldownMinutes);
      if (input.now < nextEligibleAt) {
        return {
          shouldSkip: true,
          reason: 'RECENTLY_SYNCED',
          message: this.skipMessage(input.scopeType, 'RECENTLY_SYNCED'),
          nextEligibleSyncAt: nextEligibleAt.toISOString(),
        };
      }
    }

    const decision = shouldRunMarketDataSync(input.region, input.now, {
      latestTradingDate,
      finalConfirmed: false,
    }, {
      syncDuringMarketHours: input.syncDuringMarketHours,
      postCloseSyncWindowMinutes: input.postCloseSyncWindowMinutes,
      finalizationGraceMinutes: input.finalizationGraceMinutes,
      skipWeekends: input.skipWeekends,
    });

    const marketReason = this.marketDecisionToSkipReason(decision.reasonCode);
    if (marketReason && !decision.shouldRun) {
      // Do not override the grace-period gate: the EOD file is not yet published,
      // so a "missing" completed date is likely a calendar artefact from an
      // incomplete static holiday list — not a genuine data gap to backfill.
      if (latestCompletedCandleMissing && decision.reasonCode !== 'MARKET_CLOSED_AWAITING_EOD_FILE') {
        return {
          shouldSkip: false,
          reason: 'RECENTLY_SYNCED',
          message: `Latest completed daily candle ${latestCompletedTradingDate} is missing; completed EOD catch-up is eligible.`,
          providerEndDate: completedCatchUpEndDate,
        };
      }
      return {
        shouldSkip: true,
        reason: marketReason,
        message: this.skipMessage(input.scopeType, marketReason),
        nextEligibleSyncAt: decision.nextSuggestedRunAt ?? undefined,
      };
    }

    return {
      shouldSkip: false,
      reason: 'RECENTLY_SYNCED',
      message: 'Sync is eligible.',
      providerEndDate: completedCatchUpEndDate,
    };
  }

  isLatestCompletedCandleMissing(latestTradingDate: string | null | undefined, latestCompletedTradingDate: string | null): boolean {
    if (!latestCompletedTradingDate) return false;
    if (!latestTradingDate) return true;
    return latestTradingDate < latestCompletedTradingDate;
  }

  marketDecisionToSkipReason(reasonCode: string): MarketDataSyncSkipReason | null {
    if (reasonCode === 'BEFORE_MARKET_OPEN') return 'BEFORE_MARKET_OPEN';
    if (reasonCode === 'WEEKEND_OR_HOLIDAY') return 'WEEKEND_OR_HOLIDAY';
    if (reasonCode === 'FINAL_CANDLE_CONFIRMED') return 'FINAL_CANDLE_CONFIRMED';
    if (reasonCode === 'MARKET_CLOSED_NO_SYNC' || reasonCode === 'MARKET_OPEN' || reasonCode === 'MARKET_CLOSED_AWAITING_EOD_FILE') return 'MARKET_CLOSED_NO_NEW_DAILY_DATA';
    return null;
  }

  buildSkippedSyncSummary(
    skippedCount: number,
    reason: MarketDataSyncSkipReason,
    message: string,
    checkedAt: Date,
    nextEligibleSyncAt?: string
  ): SyncSummary {
    return {
      rowsReceived: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      noNewData: true,
      skippedBeforeFetchCount: skippedCount,
      providerFetchSkippedCount: skippedCount,
      skippedReasonCounts: { [reason]: skippedCount },
      skippedReasons: [reason],
      lastCheckedAt: checkedAt.toISOString(),
      nextEligibleSyncAt,
      warningCount: 0,
      warnings: [message],
    };
  }

  buildSkippedRegionSummary(
    region: string,
    assetType: string,
    tradingDate: string,
    skippedCount: number,
    reason: MarketDataSyncSkipReason,
    message: string,
    checkedAt: Date,
    nextEligibleSyncAt?: string
  ): ScheduledRegionSyncSummary {
    return {
      region,
      assetType,
      tradingDate,
      dataThroughDate: tradingDate,
      sourceFingerprint: this.scheduledRegionSourceFingerprint({
        region,
        assetType,
        dataThroughDate: tradingDate,
        rowsInserted: 0,
        rowsUpdated: 0,
        changedInstrumentIds: [],
        downstreamInstrumentIds: [],
      }),
      changedInstrumentIds: [],
      downstreamInstrumentIds: [],
      changedInstrumentCount: 0,
      dqStageEligible: false,
      instrumentsProcessed: 0,
      rowsReceived: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      noNewData: true,
      skippedBeforeFetchCount: skippedCount,
      providerFetchSkippedCount: skippedCount,
      skippedReasonCounts: { [reason]: skippedCount },
      skippedReasons: [reason],
      lastCheckedAt: checkedAt.toISOString(),
      nextEligibleSyncAt,
      warningCount: 0,
      warnings: [message],
      errors: [],
    };
  }

  scheduledRegionSourceFingerprint(input: {
    region: string;
    assetType: string;
    dataThroughDate: string;
    rowsInserted: number;
    rowsUpdated: number;
    changedInstrumentIds: string[];
    downstreamInstrumentIds?: string[];
  }): string {
    const payload = [
      input.region,
      input.assetType,
      input.dataThroughDate,
      String(input.rowsInserted),
      String(input.rowsUpdated),
      input.changedInstrumentIds.join(','),
      (input.downstreamInstrumentIds || []).join(','),
    ].join('|');
    return `scheduled-region:${createHash('sha256').update(payload).digest('hex').slice(0, 16)}`;
  }

  skipMessage(scopeType: 'CATALOG' | 'INSTRUMENT', reason: MarketDataSyncSkipReason): string {
    const scope = scopeType === 'CATALOG' ? 'Catalog' : 'Instrument';
    if (reason === 'RECENTLY_SYNCED') return `No new data to ingest. ${scope} was synced recently.`;
    if (reason === 'BEFORE_MARKET_OPEN') return 'No new data to ingest. Daily candle is not useful before market open.';
    if (reason === 'WEEKEND_OR_HOLIDAY') return 'No new data to ingest. Market is closed for weekend or holiday.';
    if (reason === 'FINAL_CANDLE_CONFIRMED') return 'No new data to ingest. Final daily candle is already confirmed.';
    return 'No new data to ingest. Market session has no useful new daily data.';
  }

  private trimmedUpper(value: unknown): string {
    return trimmedUpperUtil(value);
  }
}
