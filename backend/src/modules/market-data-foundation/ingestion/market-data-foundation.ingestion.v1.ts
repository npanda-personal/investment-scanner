// V1 ingestion cluster (ingestion-extraction phase).
//
// Owns the V1 single-instrument sync orchestration (syncV1 — provider search/create, company-master
// enrichment, price ingestion, fundamentals/corporate-actions persistence, response assembly), the
// disabled bulk-sync stub (syncAll), the disabled FX-rate sync stub (syncFxRates), and the
// daily-refresh eligibility read (listDailyRefreshEligibleInstrumentIds). Bodies are byte-identical
// to the pre-extraction inline implementation in market-data-foundation.service.ts (this.X ->
// this.host.X for stays-on-service collaborators — repository, marketDataProvider, create,
// throttleIngestion, ingestSymbol, fetchCoreFundamentals, fetchCorporateActions, toV1Instrument —
// while PURE util/mapper delegators are imported directly). The service keeps thin byte-identical
// delegators for the public surface (syncV1 / syncAll / syncFxRates /
// listDailyRefreshEligibleInstrumentIds), each a jest-spy / direct-call test seam.

import type { MarketDataIngestionHost } from './market-data-foundation.ingestion-host';
import type {
  DailyRefreshEligibilityResult,
  SearchResult,
  SyncSummary,
  V1IngestionRequest,
  V1SyncResult,
} from '../market-data-foundation.types';
import { tradingDateForRegion } from './market-data-foundation.market-session';
import {
  defaultCountryForRegion as defaultCountryForRegionUtil,
  defaultCurrencyForRegion as defaultCurrencyForRegionUtil,
  normalizeAssetType as normalizeAssetTypeUtil,
  defaultCountryForInstrument as defaultCountryForInstrumentUtil,
  defaultCurrencyForInstrument as defaultCurrencyForInstrumentUtil,
} from '../util/market-data-foundation.util.instrument-metadata';

const NSE_BSE_ONLY_PROVIDER_DISABLED_CODE = 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY';
const NSE_BSE_ONLY_PROVIDER_DISABLED_MESSAGE =
  'External Yahoo/yfinance and Angel One provider paths are disabled. Use NSE/BSE exchange-file imports or manual verified evidence only.';

const providerDisabledError = (operation: string) => {
  const error = new Error(`${operation} disabled: ${NSE_BSE_ONLY_PROVIDER_DISABLED_MESSAGE}`);
  (error as any).code = NSE_BSE_ONLY_PROVIDER_DISABLED_CODE;
  return error;
};

export class V1IngestionService {
  constructor(private readonly host: MarketDataIngestionHost) {}

  async syncV1(request: V1IngestionRequest): Promise<V1SyncResult> {
    await this.host.throttleIngestion();

    const errors: string[] = [];
    let stock = request.instrumentId ? await this.host.repository.findStockById(request.instrumentId) : null;
    let symbol = stock?.symbol || request.symbol?.trim().toUpperCase();

    if (!symbol) {
      return { success: false, instrument: null, message: 'symbol or instrumentId is required', errors: ['symbol or instrumentId is required'] };
    }

    if (!stock) {
      const existing = await this.host.repository.findStockBySymbol(symbol);
      if (existing) {
        stock = existing;
      } else {
        const searchResults = await this.host.marketDataProvider.search(symbol).catch((error) => {
          errors.push(`External search failed: ${error instanceof Error ? error.message : 'unknown error'}`);
          return [] as SearchResult[];
        });
        const match = searchResults.find((result) => result.symbol === symbol) || searchResults[0];
        const regionInfo = this.host.marketDataProvider.inferRegion(symbol);
        stock = await this.host.create({
          symbol,
          name: request.company_name || match?.name || symbol,
        region: request.region || regionInfo.region || 'US',
          exchange: request.exchange || match?.exchange || regionInfo.exchange || 'UNKNOWN',
          country: defaultCountryForRegionUtil(request.region || regionInfo.region),
          currency: request.currency || defaultCurrencyForRegionUtil(request.region || regionInfo.region),
          assetType: normalizeAssetTypeUtil(request.asset_type || match?.type || 'STOCK'),
        }, false);
      }
    }

    let pricesStored = false;
    let syncSummary: SyncSummary | undefined;
    try {
      const masterData = await this.host.marketDataProvider.fetchCompanyMasterData(stock.providerSymbol || stock.symbol).catch(() => null);
      if (masterData) {
        const normalizedAssetType = normalizeAssetTypeUtil(request.asset_type || masterData.assetType || stock.assetType);
        const exchange = request.exchange || masterData.exchange || stock.exchange || undefined;
        const region = stock.region || request.region || this.host.marketDataProvider.inferRegion(stock.symbol).region;
        stock = await this.host.repository.updateCompanyMasterData(stock.id, {
          name: masterData.companyName || stock.name,
          region,
          exchange,
          country: masterData.country || defaultCountryForInstrumentUtil(stock.symbol, exchange, region),
          sector: masterData.sector,
          industry: masterData.industry,
          currency: request.currency || masterData.currency || defaultCurrencyForInstrumentUtil(stock.symbol, exchange, region),
          marketCap: masterData.marketCap,
          assetType: normalizedAssetType,
          isDelisted: masterData.isDelisted ?? false,
          ipoDate: masterData.ipoDate,
          isin: request.isin,
        });
      }
    } catch (error) {
      errors.push(`Company master sync failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }

    try {
      syncSummary = await this.host.ingestSymbol(stock.symbol, undefined, new Date(), request.fullReload, {
        force: request.force,
        region: stock.region || request.region,
        assetType: stock.assetType || request.asset_type,
      });
      pricesStored = syncSummary.noNewData !== true;
    } catch (error) {
      errors.push(`Price ingestion failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }

    let fundamentalsAvailable = false;
    let corporateActionsAvailable = false;
    let fundamentalsInserted = 0;
    let fundamentalsUpdated = 0;
    let corporateActionsInserted = 0;
    let corporateActionsUpdated = 0;
    const started = Date.now();

    const [fundamentals, corporateActions] = await Promise.all([
      this.host.fetchCoreFundamentals(stock.symbol).catch(() => null),
      this.host.fetchCorporateActions(stock.symbol).catch(() => []),
    ]);
    if (fundamentals) {
      await this.host.repository.upsertFundamentals(stock.id, fundamentals).then(() => {
        fundamentalsAvailable = true;
        fundamentalsUpdated = 1; // Since upsert is idempotent, we count it as updated for simplicity or check if it was new.
      }).catch((error) => {
        errors.push(`Fundamentals persistence failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      });
    }
    if (corporateActions.length > 0) {
      await this.host.repository.upsertCorporateActions(stock.id, corporateActions).then((ops) => {
        corporateActionsAvailable = true;
        corporateActionsUpdated = ops.length;
      }).catch((error) => {
        errors.push(`Corporate action persistence failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      });
    }

    return {
      success: errors.length === 0 || pricesStored,
      instrument: this.host.toV1Instrument(stock, {
        symbol: stock.symbol,
        company_name: stock.name,
        exchange: stock.exchange || request.exchange || 'UNKNOWN',
        currency: request.currency || defaultCurrencyForRegionUtil(stock.region),
        asset_type: normalizeAssetTypeUtil(request.asset_type || stock.assetType || 'STOCK'),
        isin: request.isin,
      }),
      message: syncSummary?.noNewData
        ? 'No new data to ingest. Latest daily candles already checked recently.'
        : errors.length > 0 ? 'Sync completed with partial data' : 'Sync completed',
      pricesStored,
      fundamentalsAvailable,
      corporateActionsAvailable,
      syncSummary,
      errors: errors.length > 0 ? errors : undefined,

      instrumentsReceived: 1,
      instrumentsInserted: !request.instrumentId && !stock.lastSuccessfulDataLoadTimestamp ? 1 : 0,
      instrumentsUpdated: 1,
      instrumentsSkipped: 0,

      priceRowsReceived: syncSummary?.rowsReceived || 0,
      priceRowsInserted: syncSummary?.rowsInserted || 0,
      priceRowsUpdated: syncSummary?.rowsUpdated || 0,
      priceRowsSkipped: syncSummary?.rowsSkipped || 0,

      fundamentalsReceived: fundamentals ? 1 : 0,
      fundamentalsInserted,
      fundamentalsUpdated,
      fundamentalsSkipped: 0,

      corporateActionsReceived: corporateActions.length,
      corporateActionsInserted,
      corporateActionsUpdated,
      corporateActionsSkipped: 0,

      fxRatesReceived: 0,
      fxRatesInserted: 0,
      fxRatesUpdated: 0,
      fxRatesSkipped: 0,

      warningCount: (syncSummary?.warningCount || 0) + errors.length,
      warnings: [...(syncSummary?.warnings || []), ...errors].slice(0, 10),
      durationMs: Date.now() - started,
      duplicateProviderRowsSkipped: 0,
      malformedRowsSkipped: syncSummary?.rowsSkipped || 0,
      noNewData: syncSummary?.noNewData,
      skippedBeforeFetchCount: syncSummary?.skippedBeforeFetchCount,
      providerFetchSkippedCount: syncSummary?.providerFetchSkippedCount,
      skippedReasonCounts: syncSummary?.skippedReasonCounts,
      skippedReasons: syncSummary?.skippedReasons,
      lastCheckedAt: syncSummary?.lastCheckedAt,
      nextEligibleSyncAt: syncSummary?.nextEligibleSyncAt,
    };
  }

  async syncAll(
    workerCount: number = 4,
    workerConcurrency: number = 4,
    delayBetweenBatchesMs: number = 3000,
    options: Pick<import('../market-data-foundation.types').PaginationOptions, 'region' | 'assetType'> & { force?: boolean; fullReload?: boolean } = {}
  ) {
    try { void workerCount; void workerConcurrency; void delayBetweenBatchesMs; // params retained for signature compatibility; worker path disabled (NSE/BSE-only)
      const region = options.region || 'GLOBAL';
      const assetType = options.assetType || 'STOCK';
      const now = new Date();
      const tradingDate = tradingDateForRegion(region, now) || now.toISOString().slice(0, 10);
      return {
        success: false,
        noNewData: true,
        message: NSE_BSE_ONLY_PROVIDER_DISABLED_MESSAGE,
        totalStocks: 0,
        succeeded: 0,
        failed: 0,
        workerCount: 0,
        workerConcurrency: 0,
        skippedBeforeFetchCount: 0,
        providerFetchSkippedCount: 0,
        skippedReasonCounts: { EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY: 1 },
        skippedReasons: ['EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY'],
        warnings: [NSE_BSE_ONLY_PROVIDER_DISABLED_MESSAGE],
        region,
        assetType,
        tradingDate,
        timestamp: now.toISOString(),
      };
    } catch (error: any) {
      console.error('Bulk sync failed:', error);
      return {
        success: false,
        message: `Bulk sync failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async syncFxRates(pairs = ['USD/EUR', 'USD/GBP', 'USD/INR', 'EUR/GBP']) {
    void pairs;
    throw providerDisabledError('provider FX-rate sync');
  }

  async listDailyRefreshEligibleInstrumentIds(input: {
    region: string;
    assetType: string;
    dataThroughDate: string;
    limit?: number;
  }): Promise<DailyRefreshEligibilityResult> {
    const repository = this.host.repository as any;
    const dataThroughDate = String(input.dataThroughDate || '').slice(0, 10);
    if (!dataThroughDate || typeof repository.listDailyRefreshEligibleInstrumentIds !== 'function') {
      return {
        region: input.region,
        assetType: input.assetType,
        dataThroughDate,
        source: 'NONE',
        instrumentIds: [],
        instrumentCount: 0,
      };
    }
    return repository.listDailyRefreshEligibleInstrumentIds({
      region: input.region,
      assetType: input.assetType,
      dataThroughDate,
      limit: input.limit,
    });
  }
}
