// Catalog / FX / search serving-reads (Phase 5a).
//
// CatalogReadsService owns the persisted-read catalog, FX, search, and health serving methods
// plus their pure private helpers (normalizePair, toV1FxRate moved cleanly — read-only, no
// external callers). MarketDataFoundationService constructs it once, passing itself as the
// MarketDataServingHost, and keeps a thin byte-identical delegator for each public method.
//
// Seam note: health dispatches the crypto branch to this.host.cryptoHealth() — the crypto-reads
// owner via the service delegator — exactly as it called this.cryptoHealth() before. isCryptoScope
// and getCatalogSourceConfigs are pure sibling-module functions imported directly. The disabled
// yahooSearch/searchProvider stubs stay on the service (they only throw). Behaviour is
// byte-identical to the pre-extraction inline implementation.

import type { MarketDataServingHost } from './market-data-foundation.serving-host';
import { CoverageRepository } from '../persistence/market-data-foundation.repository.coverage';

/** Lazy shared coverage reader for health freshness (curated-region tracked set). */
const coverageReader = new CoverageRepository();
import type { PaginationOptions } from '../market-data-foundation.types';
import { isCryptoScope } from '../../../shared/data-access/market-repository-router';
import { getCatalogSourceConfigs } from '../ingestion/market-data-foundation.catalog-sources';

export class CatalogReadsService {
  constructor(private readonly host: MarketDataServingHost) {}

  list(options: PaginationOptions) {
    return this.host.repository.listStocks(options);
  }

  get(id: string) {
    return this.host.repository.findStockById(id);
  }

  providerDataCleanupReport() {
    return this.host.repository.providerDataCleanupReport();
  }

  async listSourceFileImports(input: {
    region?: string;
    source?: string;
    segment?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    sortBy?: string;
    sortDirection?: string;
  } = {}) {
    const sortBy = input.sortBy === 'tradingDate' ? 'tradingDate' : 'importedAt';
    const sortDirection = String(input.sortDirection || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const rows = await this.host.repository.listSourceFileImports({
      region: input.region,
      source: input.source,
      segment: input.segment,
      status: input.status,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      limit: input.limit,
      sortBy,
      sortDirection,
    });
    return {
      count: rows.length,
      imports: rows.map((row: any) => ({
        id: row.id,
        source: row.source,
        segment: row.segment,
        tradingDate: row.tradingDate?.toISOString?.().slice(0, 10) ?? null,
        fileName: row.fileName,
        fileUrl: row.fileUrl,
        fileHash: row.fileHash,
        fileSize: row.fileSize,
        status: row.status,
        rowsRaw: row.rowsRaw,
        rowsAccepted: row.rowsAccepted,
        rowsRejected: row.rowsRejected,
        parserVersion: row.parserVersion,
        importedAt: row.importedAt?.toISOString?.() ?? null,
        errorMessage: row.errorMessage,
        createdAt: row.createdAt?.toISOString?.() ?? null,
        updatedAt: row.updatedAt?.toISOString?.() ?? null,
      })),
    };
  }

  async health(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    // Crypto scope → isolated crypto_* plane (counts + freshness from crypto tables).
    if (isCryptoScope(options)) {
      return this.host.cryptoHealth();
    }
    const [instrumentCount, latestDataTimestamp, trackedCoverage] = await Promise.all([
      this.host.repository.instrumentCount(options),
      this.host.repository.latestDataTimestamp(options),
      options.region ? coverageReader.trackedCoverageStats(options.region).catch(() => null) : Promise.resolve(null),
    ]);

    console.log('[MarketDataFoundation] health market filter', {
      receivedRegion: options.region || 'GLOBAL',
      receivedAssetType: options.assetType || 'ALL',
      instrumentCount,
    });

    return {
      status: 'ok',
      module: 'market-data-foundation',
      instrumentCount,
      latestDataTimestamp: latestDataTimestamp?.toISOString() ?? null,
      trackedCoverage,
      source: 'database',
      ingestion_timestamp: new Date().toISOString(),
      last_updated_timestamp: latestDataTimestamp?.toISOString() ?? null,
      data_status: latestDataTimestamp ? 'COMPLETE' : 'MISSING',
      timestamp: new Date().toISOString(),
      region: options.region || 'GLOBAL',
      assetType: options.assetType || 'ALL',
    };
  }

  async searchAssets(query: string, options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {}): Promise<any[]> {
    const localResults = await this.host.repository.searchStocks(query, 10, options);

    if (localResults.length > 0) {
      return localResults.map((stock: any) => ({
        symbol: stock.symbol,
        name: stock.name,
        region: stock.region,
        exchange: stock.exchange,
        source: 'database',
      }));
    }

    return [];
  }

  listCatalogSources() {
    return {
      sources: getCatalogSourceConfigs().map((source) => ({
        catalogSource: source.catalogSource,
        displayName: source.displayName,
        enabled: source.enabled,
        region: source.region,
        assetType: source.assetType,
        segmentClass: source.segmentClass,
        fileType: source.fileType,
        parserType: source.parserType,
        importModes: [
          ...(source.supportsConfiguredUrl ? ['CONFIGURED_URL'] : []),
          ...(source.supportsInternalSeed ? ['INTERNAL_SEED'] : []),
          ...(source.supportsManualCsv ? ['MANUAL_CSV'] : []),
        ],
        urlConfigured: Boolean(source.url),
        urlSource: source.urlSource,
        setupHint: source.setupHint,
        supportsManualCsv: source.supportsManualCsv,
        supportsConfiguredUrl: source.supportsConfiguredUrl,
        supportsInternalSeed: source.supportsInternalSeed,
        lastImportedAt: null,
      })),
    };
  }

  async listFxRates() {
    const rates = await this.host.repository.listFxRates();
    return {
      source: rates[0]?.source || 'database',
      ingestion_timestamp: rates[0]?.ingestionTimestamp?.toISOString?.() ?? null,
      last_updated_timestamp: rates[0]?.lastUpdatedTimestamp?.toISOString?.() ?? null,
      data_status: rates.length > 0 ? 'COMPLETE' : 'MISSING',
      rates: rates.map((rate: any) => this.toV1FxRate(rate)),
    };
  }

  async getFxRate(pair: string) {
    const normalizedPair = this.normalizePair(pair);
    const rate = await this.host.repository.findFxRate(normalizedPair);
    return rate ? this.toV1FxRate(rate) : null;
  }

  private normalizePair(pair: string): string {
    const stripped = pair.replace('/', '').toUpperCase();
    return `${stripped.slice(0, 3)}/${stripped.slice(3, 6)}`;
  }

  private toV1FxRate(rate: any) {
    return {
      pair: rate.pair,
      base_currency: rate.baseCurrency,
      quote_currency: rate.quoteCurrency,
      rate: Number(rate.rate),
      rate_timestamp: rate.rateTimestamp.toISOString(),
      source: rate.source,
      ingestion_timestamp: rate.ingestionTimestamp.toISOString(),
      last_updated_timestamp: rate.lastUpdatedTimestamp.toISOString(),
      data_status: rate.dataStatus,
    };
  }
}
