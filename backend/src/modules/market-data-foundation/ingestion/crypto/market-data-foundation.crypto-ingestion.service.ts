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

/** OHLC sanity: all finite & positive, and low ≤ {open,close} ≤ high. */
function isValidOhlc(open: number, high: number, low: number, close: number): boolean {
  if (![open, high, low, close].every((v) => Number.isFinite(v) && v > 0)) return false;
  return low <= high && low <= open && low <= close && open <= high && close <= high;
}

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
  /** Symbols whose fetch/store threw (isolated — did not abort the run). */
  symbolsFailed: number;
  /** Bars dropped at ingest for failing OHLC sanity (low<=high, positive prices). */
  barsDropped: number;
  /** True if the circuit breaker paused the run (provider likely down/throttling). */
  aborted: boolean;
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
  async backfillPrices(options: { symbols?: string[]; lookbackDays?: number; maxBars?: number; incremental?: boolean; minLookbackDays?: number; maxConsecutiveFailures?: number } = {}): Promise<CryptoPriceBackfillSummary> {
    const warnings: string[] = [];
    const DAY_MS = 24 * 60 * 60 * 1000;
    const maxConsecutiveFailures = Math.max(1, options.maxConsecutiveFailures ?? 25);
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
      symbolsFailed: 0,
      barsDropped: 0,
      aborted: false,
      perSymbol: [],
      warnings,
    };

    let consecutiveFailures = 0;
    for (const symbol of symbols) {
      if (summary.aborted) break;
      try {
        // Incremental: resume from the latest stored candle (minus a small overlap
        // floor); full backfill when nothing is stored yet for the symbol.
        let startTime = globalStartTime;
        if (options.incremental) {
          const latest = await this.repo.latestStoredCandleDate(symbol);
          startTime = latest ? new Date(latest.getTime() - minLookbackDays * DAY_MS) : null;
        }
        const rawBars = await fetchCryptoHistory(symbol, { interval: '1d', limit: maxBars, startTime });
        consecutiveFailures = 0;
        // OHLC sanity: drop malformed candles (non-finite, non-positive, or low>high)
        // so a bad provider row never enters crypto_price_ticks.
        const bars = rawBars.filter((b) => isValidOhlc(b.open, b.high, b.low, b.close));
        summary.barsDropped += rawBars.length - bars.length;
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
        consecutiveFailures += 1;
        summary.symbolsFailed += 1;
        warnings.push(`Backfill failed for ${symbol}: ${(error as Error).message}`);
        // Circuit breaker: a sustained failure run means the provider is down or
        // throttling — stop hammering it across the remaining symbols.
        if (consecutiveFailures >= maxConsecutiveFailures) {
          summary.aborted = true;
          warnings.push(`Crypto backfill paused after ${consecutiveFailures} consecutive failures (provider likely down/throttling).`);
        }
      }
    }

    return summary;
  }
}

export const cryptoIngestionService = new CryptoIngestionService();
