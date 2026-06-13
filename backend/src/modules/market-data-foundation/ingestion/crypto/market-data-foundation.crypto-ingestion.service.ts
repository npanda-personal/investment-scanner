import {
  MarketDataFoundationCryptoRepository,
  marketDataFoundationCryptoRepository,
} from './market-data-foundation.crypto-repository';
import {
  fetchCryptoUniverse,
  fetchCryptoHistory,
  isCryptoProviderEnabled,
} from './market-data-foundation.crypto-provider';

/**
 * Crypto ingestion service — orchestrates the FREE crypto provider
 * (CoinGecko universe + Binance OHLCV) into the isolated crypto_* tables via the
 * crypto foundation repository.  Self-contained: it never touches equity tables
 * and never goes through the legacy equity provider gate.
 *
 * Driven by the seed script (backend/scripts/seed-crypto-universe.ts) and the
 * scheduler's GLOBAL:CRYPTO lane (P3).
 */

export interface CryptoUniverseIngestSummary {
  source: 'CRYPTO';
  universeRequested: number;
  assetsReceived: number;
  assetsInserted: number;
  assetsUpdated: number;
  assetsSkipped: number;
  warnings: string[];
}

export interface CryptoPriceBackfillSummary {
  source: 'CRYPTO';
  symbolsProcessed: number;
  barsInserted: number;
  barsUpdated: number;
  barsSkipped: number;
  perSymbol: Array<{ symbol: string; received: number; inserted: number; updated: number }>;
  warnings: string[];
}

export class CryptoIngestionService {
  constructor(private readonly repo: MarketDataFoundationCryptoRepository = marketDataFoundationCryptoRepository) {}

  get enabled(): boolean {
    return isCryptoProviderEnabled();
  }

  /** Fetch the top-N crypto universe and upsert into crypto_assets. */
  async ingestUniverse(options: { limit?: number } = {}): Promise<CryptoUniverseIngestSummary> {
    const limit = options.limit ?? 500;
    const { candidates, warnings } = await fetchCryptoUniverse({ limit });
    const summary = await this.repo.upsertAssets(candidates);
    return {
      source: 'CRYPTO',
      universeRequested: limit,
      assetsReceived: summary.rowsReceived,
      assetsInserted: summary.rowsInserted,
      assetsUpdated: summary.rowsUpdated,
      assetsSkipped: summary.rowsSkipped,
      warnings: [...warnings, ...summary.warnings],
    };
  }

  /**
   * Backfill daily OHLCV for the given symbols (or all active crypto assets when
   * omitted) into crypto_price_ticks + crypto_latest_prices.
   */
  async backfillPrices(options: { symbols?: string[]; lookbackDays?: number; maxBars?: number; incremental?: boolean; minLookbackDays?: number } = {}): Promise<CryptoPriceBackfillSummary> {
    const warnings: string[] = [];
    const DAY_MS = 24 * 60 * 60 * 1000;
    let symbols = options.symbols;
    if (!symbols || symbols.length === 0) {
      const assets = await this.repo.listAssets({ activeOnly: true });
      symbols = assets.map((a) => a.symbol);
    }

    const globalStartTime = options.lookbackDays
      ? new Date(Date.now() - options.lookbackDays * DAY_MS)
      : null;
    const minLookbackDays = options.minLookbackDays ?? 2;
    const maxBars = options.maxBars ?? (options.lookbackDays ? options.lookbackDays + 5 : 1000);

    const summary: CryptoPriceBackfillSummary = {
      source: 'CRYPTO',
      symbolsProcessed: 0,
      barsInserted: 0,
      barsUpdated: 0,
      barsSkipped: 0,
      perSymbol: [],
      warnings,
    };

    for (const symbol of symbols) {
      try {
        // Incremental: resume from the latest stored candle (minus a small overlap
        // floor); full backfill when nothing is stored yet for the symbol.
        let startTime = globalStartTime;
        if (options.incremental) {
          const latest = await this.repo.latestStoredCandleDate(symbol);
          startTime = latest ? new Date(latest.getTime() - minLookbackDays * DAY_MS) : null;
        }
        const bars = await fetchCryptoHistory(symbol, { interval: '1d', limit: maxBars, startTime });
        const stored = await this.repo.storeHistoricalPrices(bars, { source: 'BINANCE_KLINES' });
        summary.symbolsProcessed += 1;
        summary.barsInserted += stored.rowsInserted;
        summary.barsUpdated += stored.rowsUpdated;
        summary.barsSkipped += stored.rowsSkipped;
        summary.perSymbol.push({
          symbol,
          received: stored.rowsReceived,
          inserted: stored.rowsInserted,
          updated: stored.rowsUpdated,
        });
        if (stored.warnings.length) warnings.push(...stored.warnings);
      } catch (error) {
        warnings.push(`Backfill failed for ${symbol}: ${(error as Error).message}`);
      }
    }

    return summary;
  }
}

export const cryptoIngestionService = new CryptoIngestionService();
