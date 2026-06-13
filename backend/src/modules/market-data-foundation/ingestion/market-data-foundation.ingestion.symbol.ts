// Per-symbol ingestion cluster (ingestion-extraction phase).
//
// Owns single-instrument ingestion (ingestSymbol + the Indian official-EOD exchange fallback it
// triggers), the historical-price storage helpers (storeHistorical / storeHistoricalBulk /
// mergeHistoricalPriceRows), the per-instrument sync entry point (syncData), and the sequential
// multi-symbol driver (ingestSymbols). Bodies are byte-identical to the pre-extraction inline
// implementation in market-data-foundation.service.ts (this.X -> this.host.X for stays-on-service
// collaborators — repository, marketDataProvider, manualSyncCooldownMinutes, evaluateSyncFreshnessGate,
// buildSkippedSyncSummary, fetchHistorical, and ingestSymbol itself routed back through the host so
// the jest.spyOn(service,'ingestSymbol') seam keeps resolving — while PURE util/mapper delegators
// are imported directly). The service keeps thin byte-identical delegators (PUBLIC for ingestSymbol /
// storeHistorical / storeHistoricalBulk which IndiaExchangeIngestion + repair hosts reach).

import type { MarketDataIngestionHost } from './market-data-foundation.ingestion-host';
import type {
  HistoricalPrice,
  SyncSummary,
} from '../market-data-foundation.types';
import { tradingDateForRegion } from './market-data-foundation.market-session';
import {
  buildNseSecurityBhavdataArchiveUrl,
  parseIndianExchangeEodCsv,
} from './india/market-data-foundation.exchange-eod-adapter';
import {
  internalStorageSymbol as internalStorageSymbolMapper,
  yahooHistoricalProviderSymbol as yahooHistoricalProviderSymbolMapper,
  baseSymbolFromProviderSymbol as baseSymbolFromProviderSymbolMapper,
} from '../analytics/market-data-foundation.instrument-mapper';
import {
  startOfUtcDay as startOfUtcDayUtil,
  addMinutes as addMinutesUtil,
  defaultBackfillStartDate as defaultBackfillStartDateUtil,
} from '../util/market-data-foundation.util.dates';
import { downloadOfficialExchangeText as downloadOfficialExchangeTextUtil, readPositiveNumber as readPositiveNumberUtil } from '../util/market-data-foundation.util.download';
import { eachWithConcurrency as eachWithConcurrencyUtil } from '../util/market-data-foundation.util.concurrency';

type PriceRegionInfo = {
  region: string;
  exchange?: string | null;
};

type HistoricalStoreOptions = {
  sourceFileImportId?: string | null;
  skipLatestPriceUpdate?: boolean;
};

type HistoricalBulkStoreResult = SyncSummary & {
  summaryBySymbol: Map<string, SyncSummary>;
};

type IndianExchangeFallbackResult = {
  attempted: boolean;
  prices: HistoricalPrice[];
  warnings: string[];
  sourceName: string | null;
  daysAttempted: number;
  rowsParsed: number;
};

export class SymbolIngestionService {
  constructor(private readonly host: MarketDataIngestionHost) {}

  async syncData(id: string) {
    const stock = await this.host.repository.findStockById(id);
    if (!stock) {
      throw new Error('Stock not found');
    }

    try {
      const syncSummary = await this.host.ingestSymbol(stock.symbol, undefined, new Date());
      if (!syncSummary.noNewData) {
        await this.host.repository.updateStockLoadTimestampById(id);
      }

      return {
        success: true,
        noNewData: syncSummary.noNewData,
        message: syncSummary.noNewData ? 'No new data to ingest. Latest daily candles already checked recently.' : `Data ingestion completed for ${stock.symbol}`,
        syncSummary,
      };
    } catch (error: any) {
      console.error(`Data ingestion failed for ${stock.symbol}:`, error);
      return { success: false, message: error.message };
    }
  }

  async storeHistorical(prices: HistoricalPrice[]): Promise<SyncSummary> {
    try {
      return await this.host.repository.storeHistorical(
        prices,
        this.host.marketDataProvider.inferRegion.bind(this.host.marketDataProvider)
      );
    } catch (error) {
      console.error(`  Failed to store price ticks for ${prices[0]?.symbol}:`, error);
      throw error;
    }
  }

  async storeHistoricalBulk(
    prices: HistoricalPrice[],
    regionInfoBySymbol: Map<string, PriceRegionInfo> = new Map(),
    options: HistoricalStoreOptions = {}
  ): Promise<HistoricalBulkStoreResult> {
    const repository = this.host.repository as any;
    if (typeof repository.storeHistoricalBulk === 'function') {
      return repository.storeHistoricalBulk(
        prices,
        this.host.marketDataProvider.inferRegion.bind(this.host.marketDataProvider),
        regionInfoBySymbol,
        options
      );
    }

    const summaryBySymbol = new Map<string, SyncSummary>();
    let aggregate: SyncSummary = {
      rowsReceived: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    };
    const bySymbol = new Map<string, HistoricalPrice[]>();
    for (const price of prices) {
      bySymbol.set(price.symbol, [...(bySymbol.get(price.symbol) || []), price]);
    }
    for (const [symbol, symbolPrices] of bySymbol.entries()) {
      const symbolSummary = await this.host.storeHistorical(symbolPrices);
      summaryBySymbol.set(symbol, symbolSummary);
      aggregate = {
        rowsReceived: aggregate.rowsReceived + (symbolSummary.rowsReceived || 0),
        rowsInserted: aggregate.rowsInserted + (symbolSummary.rowsInserted || 0),
        rowsUpdated: aggregate.rowsUpdated + (symbolSummary.rowsUpdated || 0),
        rowsSkipped: aggregate.rowsSkipped + (symbolSummary.rowsSkipped || 0),
        rowsNoOp: (aggregate.rowsNoOp || 0) + (symbolSummary.rowsNoOp || 0),
        warningCount: aggregate.warningCount + (symbolSummary.warningCount || 0),
        warnings: [...(aggregate.warnings || []), ...(symbolSummary.warnings || [])].slice(0, 10),
      };
    }
    return { ...aggregate, summaryBySymbol };
  }

  async ingestSymbol(symbol: string, startDate?: Date, endDate?: Date, fullReload = false, options: {
    force?: boolean;
    region?: string;
    assetType?: string;
    skipFreshnessGate?: boolean;
    preserveProviderSupportOnZeroRows?: boolean;
  } = {}): Promise<SyncSummary> {
    console.log(`Ingesting ${symbol}...`);

    const stock = await this.host.repository.findStockBySymbol(symbol);
    const region = options.region || stock?.region || this.host.marketDataProvider.inferRegion(symbol).region || 'GLOBAL';
    const assetType = options.assetType || stock?.assetType || 'STOCK';
    const storageSymbol = stock?.symbol || internalStorageSymbolMapper(symbol, { region, assetType, exchange: stock?.exchange });
    const providerSymbol = stock?.providerSymbol || yahooHistoricalProviderSymbolMapper(symbol, { region, assetType, exchange: stock?.exchange });
    const now = endDate || new Date();
    let providerEndDate = now;
    const tradingDate = tradingDateForRegion(region, now) || now.toISOString().slice(0, 10);

    if (!fullReload && !options.force && !options.skipFreshnessGate) {
      const gate = await this.host.evaluateSyncFreshnessGate({
        region,
        assetType,
        scopeType: 'INSTRUMENT',
        scopeKey: storageSymbol,
        tradingDate,
        now,
        force: false,
        cooldownMinutes: this.host.manualSyncCooldownMinutes,
      });
      if (gate.shouldSkip) {
        console.log(`  Skipping ${symbol}: ${gate.reason}, no provider fetch required. Next eligible sync at ${gate.nextEligibleSyncAt ?? 'unknown'}`);
        const summary = this.host.buildSkippedSyncSummary(1, gate.reason, gate.message, now, gate.nextEligibleSyncAt);
        await this.host.repository.upsertSyncState({
          region,
          assetType,
          scopeType: 'INSTRUMENT',
          scopeKey: storageSymbol,
          tradingDate,
          timeframe: '1D',
          status: gate.reason === 'FINAL_CANDLE_CONFIRMED' ? 'FINAL_CONFIRMED' : 'SYNCED',
          summary,
          lastCheckedAt: now,
        });
        return summary;
      }
      providerEndDate = gate.providerEndDate ?? now;
    }

    let effectiveStartDate = startDate;

    if (!effectiveStartDate) {
      if (fullReload) {
        effectiveStartDate = defaultBackfillStartDateUtil();
        console.log(`  Full reload requested for ${symbol} from ${effectiveStartDate.toISOString().split('T')[0]}`);
      } else if (stock?.lastSuccessfulDataLoadTimestamp) {
        effectiveStartDate = new Date(stock.lastSuccessfulDataLoadTimestamp);
        effectiveStartDate.setDate(effectiveStartDate.getDate() - 3);
        console.log(`  Using incremental start date: ${effectiveStartDate.toISOString().split('T')[0]} (based on lastSuccessfulDataLoadTimestamp with 3-day overlap)`);
      } else {
        effectiveStartDate = defaultBackfillStartDateUtil();
        console.log(`  Using default start date: ${effectiveStartDate.toISOString().split('T')[0]} (15-year first-time load)`);
      }
    }

    const effectiveEndDate = providerEndDate;

    if (effectiveStartDate >= effectiveEndDate) {
      console.log(`  Skipping ${symbol}: already up to date (last load: ${stock?.lastSuccessfulDataLoadTimestamp})`);
      return this.host.buildSkippedSyncSummary(1, 'RECENTLY_SYNCED', 'Latest daily candles already checked recently.', now, addMinutesUtil(now, this.host.manualSyncCooldownMinutes).toISOString());
    }

    console.log(`  Fetching data from ${effectiveStartDate.toISOString().split('T')[0]} to ${effectiveEndDate.toISOString().split('T')[0]}`);

    let prices = await this.host.fetchHistorical(providerSymbol, effectiveStartDate, effectiveEndDate, {
      region,
      assetType,
      exchange: stock?.exchange,
    });
    const exchangeFallback = await this.fetchIndianExchangeEodFallbackIfNeeded({
      stock,
      symbol: storageSymbol,
      providerSymbol,
      region,
      assetType,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      providerPrices: prices,
      enabled: Boolean(options.preserveProviderSupportOnZeroRows),
    });
    if (exchangeFallback.prices.length > 0) {
      prices = this.mergeHistoricalPriceRows([...prices, ...exchangeFallback.prices]);
    }

    if (prices.length === 0) {
      console.log(`  No new price data available for ${symbol}`);
      const emptySummary = {
        rowsReceived: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        warningCount: 1 + exchangeFallback.warnings.length,
        warnings: ['Provider returned zero usable historical price rows.', ...exchangeFallback.warnings],
      };
      await this.host.repository.upsertSyncState({
        region,
        assetType,
        scopeType: 'INSTRUMENT',
        scopeKey: storageSymbol,
        tradingDate,
        timeframe: '1D',
        status: 'FAILED',
        summary: emptySummary,
        lastCheckedAt: now,
        lastProviderFetchAt: now,
      });
      if (!options.preserveProviderSupportOnZeroRows && stock && typeof (this.host.repository as any).updateProviderSupportStatus === 'function') {
        await this.host.repository.updateProviderSupportStatus(storageSymbol, 'UNSUPPORTED', 'Provider returned zero usable historical price rows.').catch(() => null);
      }
      return emptySummary;
    }

    const pricesForStorage = prices.map((price) => ({ ...price, symbol: storageSymbol }));
    const syncSummary = await this.storeHistorical(pricesForStorage);
    if (exchangeFallback.attempted) {
      syncSummary.warnings = [
        ...(syncSummary.warnings || []),
        ...exchangeFallback.warnings,
      ].slice(0, 10);
      syncSummary.warningCount = (syncSummary.warningCount || 0) + exchangeFallback.warnings.length;
    }
    await this.host.repository.updateStockLoadTimestampBySymbol(storageSymbol);
    if (typeof (this.host.repository as any).updateProviderSupportStatus === 'function') {
      await this.host.repository.updateProviderSupportStatus(storageSymbol, 'SUPPORTED', null).catch(() => null);
    }
    await this.host.repository.upsertSyncState({
      region,
      assetType,
      scopeType: 'INSTRUMENT',
      scopeKey: storageSymbol,
      tradingDate,
      timeframe: '1D',
      status: 'SYNCED',
      summary: syncSummary,
      lastCheckedAt: now,
      lastProviderFetchAt: now,
    });

    console.log(`  Successfully ingested ${prices.length} price ticks for ${storageSymbol}`);
    return syncSummary;
  }

  private async fetchIndianExchangeEodFallbackIfNeeded(input: {
    stock: any;
    symbol: string;
    providerSymbol: string;
    region: string;
    assetType: string;
    startDate: Date;
    endDate: Date;
    providerPrices: HistoricalPrice[];
    enabled: boolean;
  }): Promise<IndianExchangeFallbackResult> {
    const empty = (warnings: string[] = []): IndianExchangeFallbackResult => ({
      attempted: false,
      prices: [],
      warnings,
      sourceName: null,
      daysAttempted: 0,
      rowsParsed: 0,
    });
    if (!input.enabled || !this.exchangeEodFallbackEnabled()) return empty();
    if (input.region !== 'IN' || input.assetType !== 'STOCK') return empty();
    const exchange = String(input.stock?.exchange || '').trim().toUpperCase();
    const symbolText = `${input.symbol} ${input.providerSymbol}`.toUpperCase();
    if (exchange && exchange !== 'NSE' && exchange !== 'BSE') return empty();
    if (exchange === 'BSE' || symbolText.includes('.BO')) {
      return empty(['BSE official/public EOD fallback parsing is available, but no stable configured free BSE download URL is active for automatic backfill.']);
    }
    if (!this.providerHistoryNeedsExchangeFallback(input.providerPrices, input.startDate)) return empty();

    const dates = this.exchangeEodFallbackDates(input.startDate, input.endDate);
    if (dates.length === 0) return empty();
    const targetSymbols = this.exchangeEodTargetSymbols(input);
    const concurrency = this.exchangeEodFallbackConcurrency();
    const warnings: string[] = [];
    const prices: HistoricalPrice[] = [];
    let rowsParsed = 0;

    await eachWithConcurrencyUtil(dates, concurrency, async (date) => {
      const archive = buildNseSecurityBhavdataArchiveUrl(date);
      try {
        const csvText = await downloadOfficialExchangeTextUtil(archive.url);
        const parsed = parseIndianExchangeEodCsv(csvText, {
          source: archive.sourceName,
          sourceUrl: archive.url,
          exchange: 'NSE',
          includeSeries: ['EQ', 'BE'],
          tradingDate: date,
        });
        rowsParsed += parsed.rowsParsed;
        warnings.push(...parsed.warnings.slice(0, 2));
        prices.push(...parsed.prices.filter((price) => targetSymbols.has(price.symbol.toUpperCase())));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'official exchange fallback download failed';
        warnings.push(`${archive.sourceName} ${archive.fileName}: ${message}`);
      }
    });

    const uniquePrices = this.mergeHistoricalPriceRows(prices.map((price) => ({ ...price, symbol: input.symbol })));
    if (uniquePrices.length === 0) {
      warnings.unshift(`${input.symbol}: free official NSE EOD fallback attempted ${dates.length} day(s), but no matching daily OHLCV rows were stored.`);
    } else {
      warnings.unshift(`${input.symbol}: free official NSE EOD fallback stored ${uniquePrices.length} daily OHLCV row(s) from ${dates.length} bounded archive day(s).`);
    }

    return {
      attempted: true,
      prices: uniquePrices,
      warnings: warnings.slice(0, 10),
      sourceName: 'NSE_SECURITY_BHAVDATA',
      daysAttempted: dates.length,
      rowsParsed,
    };
  }

  private exchangeEodFallbackEnabled(): boolean {
    const value = process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_ENABLED;
    if (value !== undefined) return !['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase());
    return process.env.NODE_ENV !== 'test';
  }

  private providerHistoryNeedsExchangeFallback(prices: HistoricalPrice[], startDate: Date): boolean {
    if (prices.length === 0) return true;
    const earliest = prices.reduce((earliestDate, price) => price.date < earliestDate ? price.date : earliestDate, prices[0].date);
    const gapDays = Math.floor((startOfUtcDayUtil(earliest).getTime() - startOfUtcDayUtil(startDate).getTime()) / 86_400_000);
    return gapDays > readPositiveNumberUtil(process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_EARLIEST_GAP_DAYS, 14);
  }

  private exchangeEodFallbackDates(startDate: Date, endDate: Date): Date[] {
    const maxDays = Math.max(1, Math.min(readPositiveNumberUtil(process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_MAX_DAYS_PER_SYMBOL, 20), 90));
    const dates: Date[] = [];
    const cursor = startOfUtcDayUtil(startDate);
    const stop = startOfUtcDayUtil(endDate);
    while (cursor <= stop && dates.length < maxDays) {
      dates.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
  }

  private exchangeEodTargetSymbols(input: { stock: any; symbol: string; providerSymbol: string }): Set<string> {
    const candidates = [
      input.symbol,
      input.providerSymbol,
      input.stock?.symbol,
      input.stock?.providerSymbol,
      input.stock?.sourceSymbol,
      input.stock?.displaySymbol,
    ].filter(Boolean).map((value) => String(value).trim().toUpperCase());
    const withNseSuffix = candidates.flatMap((value) => {
      const base = baseSymbolFromProviderSymbolMapper(value);
      return [value, base, `${base}.NS`];
    });
    return new Set(withNseSuffix.filter(Boolean));
  }

  private mergeHistoricalPriceRows(prices: HistoricalPrice[]): HistoricalPrice[] {
    const byKey = new Map<string, HistoricalPrice>();
    for (const price of prices) {
      byKey.set(`${price.symbol}|${startOfUtcDayUtil(price.date).toISOString()}`, {
        ...price,
        date: startOfUtcDayUtil(price.date),
      });
    }
    return [...byKey.values()].sort((left, right) => left.date.getTime() - right.date.getTime());
  }

  private exchangeEodFallbackConcurrency(): number {
    return Math.max(1, Math.min(readPositiveNumberUtil(process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_CONCURRENCY, 4), 8));
  }

  async ingestSymbols(symbols: string[], startDate?: Date, endDate?: Date): Promise<void> {
    for (const symbol of symbols) {
      try {
        await this.host.ingestSymbol(symbol, startDate, endDate);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Ingestion failed for ${symbol}:`, error);
      }
    }
  }
}
