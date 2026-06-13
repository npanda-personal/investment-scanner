// Crypto serving-reads (Phase 5a).
//
// CryptoReadsService owns the read methods that route only through the isolated crypto_*
// plane (the crypto repository). MarketDataFoundationService constructs it once, passing
// itself as the MarketDataServingHost, and keeps a thin byte-identical delegator for each
// public method. cryptoHealth / cryptoUniverseHealth were private on the service and are
// kept as service delegators because `health` (-> cryptoHealth) and `universeHealth`
// (-> cryptoUniverseHealth) stay on the service and must still resolve them. Behaviour is
// byte-identical to the pre-extraction inline implementation.

import type { MarketDataServingHost } from './market-data-foundation.serving-host';
import type { MarketDataUniverseHealth } from '../market-data-foundation.types';

export class CryptoReadsService {
  constructor(private readonly host: MarketDataServingHost) {}

  /** List crypto assets from crypto_assets (ranked by market cap). */
  listCryptoAssets(options: { activeOnly?: boolean; limit?: number; offset?: number } = {}) {
    return this.host.cryptoRepository.listAssets(options);
  }

  /** Fetch a single crypto asset (crypto_assets) by id. */
  getCryptoAssetById(id: string) {
    return this.host.cryptoRepository.getAssetById(id);
  }

  /** Fetch a single crypto asset (crypto_assets) by canonical symbol (e.g. BTCUSDT). */
  getCryptoAssetBySymbol(symbol: string) {
    return this.host.cryptoRepository.getAssetBySymbol(symbol);
  }

  /** Ascending crypto price history (crypto_price_ticks) for a symbol. */
  listCryptoPriceHistory(symbol: string, limit?: number) {
    return this.host.cryptoRepository.getPriceHistory(symbol, limit);
  }

  /** Crypto prices response (same shape as listPricesByInstrumentId; newest-first; delivery N/A). */
  async listCryptoPricesByInstrumentId(instrumentId: string, limit = 250) {
    const asset = await this.host.cryptoRepository.getAssetById(instrumentId);
    if (!asset) return null;
    const ascending = await this.host.cryptoRepository.getPriceHistory(asset.symbol, limit);
    const prices = [...ascending].reverse(); // newest-first to match equity response
    return {
      instrument_id: asset.id,
      symbol: asset.symbol,
      adjustment_strategy: 'crypto: no splits/dividends; adjusted_close equals close.',
      source: prices[0]?.source || 'BINANCE_KLINES',
      ingestion_timestamp: prices[0]?.ingestionTimestamp instanceof Date ? prices[0].ingestionTimestamp.toISOString() : null,
      last_updated_timestamp: prices[0]?.lastUpdatedTimestamp instanceof Date ? prices[0].lastUpdatedTimestamp.toISOString() : null,
      data_status: prices.length > 0 ? 'COMPLETE' : 'MISSING',
      delivery_percent: null, // not applicable for crypto
      prices: prices.map((price) => ({
        date: price.timestamp,
        open: Number(price.open),
        high: Number(price.high),
        low: Number(price.low),
        close: Number(price.close),
        adjusted_close: price.adjustedClose !== null ? Number(price.adjustedClose) : Number(price.close),
        volume: price.volume !== null && price.volume !== undefined ? Number(price.volume) : null,
        delivery_percent: null,
        source: price.source || 'BINANCE_KLINES',
        ingestion_timestamp: price.ingestionTimestamp instanceof Date ? price.ingestionTimestamp.toISOString() : new Date().toISOString(),
        last_updated_timestamp: price.lastUpdatedTimestamp instanceof Date ? price.lastUpdatedTimestamp.toISOString() : new Date().toISOString(),
        data_status: price.dataStatus || 'COMPLETE',
      })),
    };
  }

  async cryptoHealth() {
    const [instrumentCount, latestDataTimestamp] = await Promise.all([
      this.host.cryptoRepository.countAssets({ activeOnly: true }),
      this.host.cryptoRepository.latestPriceTimestamp(),
    ]);
    return {
      status: 'ok',
      module: 'market-data-foundation',
      instrumentCount,
      latestDataTimestamp: latestDataTimestamp?.toISOString() ?? null,
      source: 'database',
      ingestion_timestamp: new Date().toISOString(),
      last_updated_timestamp: latestDataTimestamp?.toISOString() ?? null,
      data_status: latestDataTimestamp ? 'COMPLETE' : 'MISSING',
      timestamp: new Date().toISOString(),
      region: 'GLOBAL',
      assetType: 'CRYPTO',
    };
  }

  /** Reduced crypto universe-health: active count + price coverage; reuses trust/signoff helpers. */
  async cryptoUniverseHealth(): Promise<MarketDataUniverseHealth> {
    const scope = { region: 'GLOBAL', assetType: 'CRYPTO' };
    const [total, priceReady, latest] = await Promise.all([
      this.host.cryptoRepository.countAssets({ activeOnly: true }),
      this.host.cryptoRepository.countLatestPrices(),
      this.host.cryptoRepository.latestPriceTimestamp(),
    ]);
    const counts = this.host.emptyUniverseCounts();
    counts.totalCatalogInstruments = total;
    counts.activeInstruments = total;
    counts.providerSupported = total;
    counts.priceReady = priceReady;
    counts.readiness.priceReady = priceReady;
    counts.contextReady = priceReady;
    counts.readiness.contextReady = priceReady;
    counts.reviewReady = priceReady;
    counts.readiness.reviewReady = priceReady;
    const denom = total || 1;
    const coverage = {
      priceCoveragePercentage: this.host.percent(priceReady, denom),
      metadataCoveragePercentage: this.host.percent(total, denom),
      reviewReadyPercentage: this.host.percent(priceReady, denom),
    };
    const latestStoredEodDate = latest ? latest.toISOString().slice(0, 10) : null;
    const healthWithoutSignoff = {
      scope,
      generatedAt: new Date().toISOString(),
      latestStoredEodDate,
      expectedLatestTradingDate: latestStoredEodDate,
      counts,
      coverage,
      topBlockers: [],
      warnings: ['Crypto universe health reports price coverage only; equity-style readiness blockers (ISIN, sector, delivery) are not applicable.'],
      trustStatus: this.host.universeTrustStatus(counts, coverage),
      trustReasons: this.host.universeTrustReasons(counts, coverage),
    } as Omit<MarketDataUniverseHealth, 'universeSignoff'>;
    return {
      ...healthWithoutSignoff,
      universeSignoff: this.host.universeSignoffFromHealth(healthWithoutSignoff),
    };
  }
}
