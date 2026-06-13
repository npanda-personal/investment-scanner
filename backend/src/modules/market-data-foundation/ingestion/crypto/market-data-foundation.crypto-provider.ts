import type { CryptoAssetInput, CryptoHistoricalPrice } from './market-data-foundation.crypto-repository';
import { getCryptoEndpoints } from '../market-data-foundation.endpoints';

/**
 * Crypto market-data provider (FREE sources only).
 *
 *  - Universe / ranking / market-cap: CoinPaprika free API
 *    (https://api.coinpaprika.com/v1/tickers) — keyless, COMMERCIAL-USE allowed,
 *    ~20k calls/month.  Chosen over CoinGecko because the product is commercial
 *    and CoinGecko's free/Demo tier is non-commercial + attribution-required.
 *    CoinGecko remains available as an opt-in fallback (CRYPTO_UNIVERSE_SOURCE=coingecko).
 *  - OHLCV history: Binance public REST klines
 *    (https://api.binance.com/api/v3/klines) — keyless, generous limits.
 *
 * Universe target = "Top N by market cap that are TRADABLE on Binance": we page
 * the ranked list in descending market-cap order and keep collecting until N
 * coins with a Binance spot pair are found (not "top N of the universe then drop
 * the non-Binance ones").  Quote-asset preference USDT→USDC→… maximizes coverage.
 *
 * This is the ONLY sanctioned external HTTP path in the runtime (crypto-only).
 * It is asset-gated behind MARKET_DATA_CRYPTO_PROVIDER_ENABLED so the NSE/BSE
 * equity path stays strictly file-based and the legacy equity provider gate is
 * left untouched.  No API keys are required for the free tiers used here.
 */

const cryptoEndpoints = getCryptoEndpoints();
const COINPAPRIKA_BASE = cryptoEndpoints.coinpaprikaBase.url;
const COINGECKO_BASE = cryptoEndpoints.coingeckoBase.url;
const BINANCE_BASE = cryptoEndpoints.binanceBase.url;
const COINGECKO_PAGE_SIZE = 250; // CoinGecko free max per_page
const COINGECKO_THROTTLE_MS = Number(process.env.CRYPTO_COINGECKO_THROTTLE_MS || 6500);
const BINANCE_THROTTLE_MS = Number(process.env.CRYPTO_BINANCE_THROTTLE_MS || 250);
/** Default universe source. CoinPaprika is commercial-OK; CoinGecko is opt-in fallback. */
const UNIVERSE_SOURCE = (process.env.CRYPTO_UNIVERSE_SOURCE || 'coinpaprika').toLowerCase();
/** Quote-asset preference order (first available on Binance wins). */
const QUOTE_ASSETS = (process.env.CRYPTO_QUOTE_ASSETS || 'USDT,USDC,FDUSD,TUSD,BUSD')
  .split(',')
  .map((q) => q.trim().toUpperCase())
  .filter(Boolean);
const QUOTE_ASSET = (process.env.CRYPTO_QUOTE_ASSET || QUOTE_ASSETS[0] || 'USDT').toUpperCase();
const HTTP_TIMEOUT_MS = Number(process.env.CRYPTO_HTTP_TIMEOUT_MS || 20000);

export const CRYPTO_PROVIDER_DISABLED_CODE = 'CRYPTO_PROVIDER_DISABLED';

export function isCryptoProviderEnabled(): boolean {
  // Default ON; set MARKET_DATA_CRYPTO_PROVIDER_ENABLED=false to disable.
  return String(process.env.MARKET_DATA_CRYPTO_PROVIDER_ENABLED ?? 'true').toLowerCase() !== 'false';
}

function assertEnabled(): void {
  if (!isCryptoProviderEnabled()) {
    const error = new Error('Crypto market-data provider is disabled (MARKET_DATA_CRYPTO_PROVIDER_ENABLED=false).');
    (error as Error & { code?: string }).code = CRYPTO_PROVIDER_DISABLED_CODE;
    throw error;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Max retry attempts for transient (429/5xx/network/timeout) failures. */
const HTTP_MAX_ATTEMPTS = Number(process.env.CRYPTO_HTTP_MAX_ATTEMPTS || 3);
/** Base backoff (ms); grows exponentially with jitter, honoring Retry-After when present. */
const HTTP_BACKOFF_BASE_MS = Number(process.env.CRYPTO_HTTP_BACKOFF_BASE_MS || 1000);

async function fetchJsonOnce(url: string): Promise<{ ok: true; data: unknown } | { ok: false; status: number; retryAfterMs: number | null; message: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'investment-scanner/crypto-ingest' },
    });
    if (!response.ok) {
      const retryAfter = response.headers.get('retry-after');
      const retryAfterMs = retryAfter && Number.isFinite(Number(retryAfter)) ? Number(retryAfter) * 1000 : null;
      return { ok: false, status: response.status, retryAfterMs, message: `HTTP ${response.status} ${response.statusText} for ${url}` };
    }
    return { ok: true, data: await response.json() };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET JSON with bounded exponential backoff + jitter on transient failures
 * (HTTP 429, 5xx, network errors, timeouts). Free crypto APIs rate-limit
 * aggressively, so a single 429 must not abort a whole universe/backfill run.
 */
async function fetchJson(url: string): Promise<unknown> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= HTTP_MAX_ATTEMPTS; attempt++) {
    let result: Awaited<ReturnType<typeof fetchJsonOnce>>;
    try {
      result = await fetchJsonOnce(url);
    } catch (error) {
      // Network error / timeout (AbortError) — always transient; retry until exhausted.
      lastError = error as Error;
      if (attempt === HTTP_MAX_ATTEMPTS) throw lastError;
      await sleep(HTTP_BACKOFF_BASE_MS * 2 ** (attempt - 1) + attempt * 137);
      continue;
    }
    if (result.ok) return result.data;
    lastError = new Error(result.message);
    const transient = result.status === 429 || result.status >= 500;
    // Non-transient (4xx other than 429) → fail fast; transient → backoff + retry.
    if (!transient || attempt === HTTP_MAX_ATTEMPTS) throw lastError;
    const backoff = result.retryAfterMs ?? HTTP_BACKOFF_BASE_MS * 2 ** (attempt - 1);
    // Deterministic jitter (no Math.random): vary by attempt to avoid a thundering herd.
    await sleep(backoff + attempt * 137);
  }
  throw lastError ?? new Error(`fetchJson failed for ${url}`);
}

/** Normalized ranked coin from whichever universe source is active. */
interface RankedCoin {
  id: string; // provider id (coinpaprika "btc-bitcoin" or coingecko "bitcoin")
  symbol: string; // base ticker (BTC)
  name: string;
  rank: number | null; // market-cap rank (1 = largest)
  marketCap: number | null;
}

interface CoinGeckoMarketRow {
  id?: string;
  symbol?: string;
  name?: string;
  market_cap?: number | null;
  market_cap_rank?: number | null;
}

interface CoinPaprikaTickerRow {
  id?: string;
  name?: string;
  symbol?: string;
  rank?: number | null;
  quotes?: { USD?: { market_cap?: number | null } };
}

interface CryptoUniverseCandidate extends CryptoAssetInput {
  /** Upper-cased base asset (BTC) used to build the Binance pair. */
  baseAsset: string;
  /** Binance quote asset actually matched (USDT/USDC/…). */
  quoteAsset?: string;
}

export interface CryptoUniverseResult {
  candidates: CryptoUniverseCandidate[];
  warnings: string[];
}

export interface CryptoProviderOptions {
  /** Target count of Binance-tradable coins (top N by market cap). Default 500. */
  limit?: number;
}

/** A Binance spot pair resolved from exchangeInfo. */
export interface BinanceSpotPair {
  symbol: string; // BTCUSDT
  baseAsset: string; // BTC
  quoteAsset: string; // USDT
}

/**
 * Fetch the "top-N by market cap of coins TRADABLE on Binance" universe.
 *
 * Binance-driven: Binance's spot pairs DEFINE the tradable universe (one entry per
 * distinct base asset, quote-asset preference USDT→USDC→…); CoinPaprika supplies the
 * market-cap ranking metadata via a base-ticker join.  We then sort by market cap
 * (desc) and take the top N.  Coins tradable on Binance but absent from CoinPaprika's
 * free ranking are still INCLUDED (rank/marketCap null, catalogSource BINANCE_SPOT) so
 * the full tradable set is captured.  Canonical symbol = Binance pair.
 *
 * Note: Binance lists ~430 distinct base assets against USD-pegged quotes, so a literal
 * N=500 collapses to "all ~430 tradable coins".  The cap is honored when N < tradable.
 */
export async function fetchCryptoUniverse(options: CryptoProviderOptions = {}): Promise<CryptoUniverseResult> {
  assertEnabled();
  const limit = Math.max(1, Math.min(options.limit ?? 500, 1000));
  const warnings: string[] = [];

  // 1) Binance spot pairs → the tradable universe (base-asset → preferred pair).
  const pairs = await fetchBinanceSpotPairs();
  const baseToPair = buildBaseToPreferredPair(pairs);

  // 2) Ranking metadata from the configured source, indexed by base ticker.
  const { ranked, source, sourceWarnings } = await fetchRankedUniverse(limit);
  warnings.push(...sourceWarnings);
  const rankedCatalog = source === 'coingecko' ? 'COINGECKO_CRYPTO_UNIVERSE' : 'COINPAPRIKA_CRYPTO_UNIVERSE';
  const metaByBase = new Map<string, RankedCoin>();
  for (const coin of ranked) {
    const base = coin.symbol.trim().toUpperCase();
    if (!base) continue;
    if (!metaByBase.has(base)) metaByBase.set(base, coin); // highest-ranked wins on ticker collision
  }

  // 3) Build one candidate per Binance-tradable base, joining ranking metadata.
  const candidates: CryptoUniverseCandidate[] = [];
  for (const [base, pair] of baseToPair) {
    const meta = metaByBase.get(base);
    candidates.push({
      baseAsset: base,
      quoteAsset: pair.quoteAsset,
      symbol: pair.symbol,
      name: meta?.name || base,
      displaySymbol: base,
      providerSymbol: pair.symbol,
      sourceSymbol: meta?.id ?? null,
      marketCap: meta?.marketCap ?? null,
      rank: meta?.rank ?? null,
      exchange: 'BINANCE',
      currency: 'USD',
      catalogSource: meta ? rankedCatalog : 'BINANCE_SPOT',
      providerSupportStatus: 'SUPPORTED',
      dataStatus: 'PARTIAL',
      isActive: true,
    });
  }

  // 4) Rank by market cap (desc); unranked coins sort last by symbol.
  candidates.sort((a, b) => {
    const ma = a.marketCap ?? -1;
    const mb = b.marketCap ?? -1;
    if (ma !== mb) return mb - ma;
    return a.symbol.localeCompare(b.symbol);
  });
  // Re-stamp a dense 1-based rank reflecting the final market-cap order.
  candidates.forEach((c, i) => {
    c.rank = c.marketCap != null ? i + 1 : c.rank;
  });

  const tradableTotal = baseToPair.size;
  const unranked = candidates.filter((c) => c.marketCap == null).length;
  const top = candidates.slice(0, limit);

  if (top.length === 0) {
    warnings.push(`No crypto universe candidates resolved (Binance spot universe empty).`);
  } else {
    warnings.push(
      `Collected ${top.length} coins (Binance USD-tradable universe = ${tradableTotal}; ${unranked} lacked a ${source} market-cap rank).`,
    );
    if (limit > tradableTotal) {
      warnings.push(`Requested ${limit} but Binance only lists ${tradableTotal} distinct USD-tradable coins (hard ceiling).`);
    }
  }

  return { candidates: top, warnings };
}

/** Fetch the ranked universe (descending market cap) from the configured source. */
async function fetchRankedUniverse(
  limit: number,
): Promise<{ ranked: RankedCoin[]; source: 'coinpaprika' | 'coingecko'; sourceWarnings: string[] }> {
  if (UNIVERSE_SOURCE === 'coingecko') {
    return { ...(await fetchCoinGeckoRanked(limit)), source: 'coingecko' };
  }
  return { ...(await fetchCoinPaprikaRanked()), source: 'coinpaprika' };
}

/** CoinPaprika /tickers — one call returns the full ranked universe (commercial-OK, keyless). */
async function fetchCoinPaprikaRanked(): Promise<{ ranked: RankedCoin[]; sourceWarnings: string[] }> {
  const sourceWarnings: string[] = [];
  const data = (await fetchJson(`${COINPAPRIKA_BASE}/tickers?quotes=USD`)) as CoinPaprikaTickerRow[];
  if (!Array.isArray(data) || data.length === 0) {
    sourceWarnings.push('CoinPaprika /tickers returned no rows.');
    return { ranked: [], sourceWarnings };
  }
  const ranked: RankedCoin[] = data
    .map((row) => ({
      id: String(row.id || '').trim(),
      symbol: String(row.symbol || '').trim(),
      name: String(row.name || '').trim(),
      rank: typeof row.rank === 'number' && row.rank > 0 ? row.rank : null,
      marketCap: row.quotes?.USD?.market_cap ?? null,
    }))
    .filter((c) => c.id && c.symbol);
  // Rank asc (ranked first), then market cap desc as a tiebreaker for rank=0 rows.
  ranked.sort((a, b) => {
    const ra = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rb = b.rank ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return (b.marketCap ?? 0) - (a.marketCap ?? 0);
  });
  return { ranked, sourceWarnings };
}

/** CoinGecko fallback — pages deep enough to find `limit` tradable coins (opt-in). */
async function fetchCoinGeckoRanked(limit: number): Promise<{ ranked: RankedCoin[]; sourceWarnings: string[] }> {
  const sourceWarnings: string[] = [];
  // Scan well beyond `limit` since many ranked coins lack a Binance pair.
  const maxScan = Math.min(Math.max(limit * 4, 1000), 2000);
  const pages = Math.ceil(maxScan / COINGECKO_PAGE_SIZE);
  const ranked: RankedCoin[] = [];
  for (let page = 1; page <= pages; page += 1) {
    const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${COINGECKO_PAGE_SIZE}&page=${page}&sparkline=false`;
    const data = (await fetchJson(url)) as CoinGeckoMarketRow[];
    if (!Array.isArray(data) || data.length === 0) break;
    for (const row of data) {
      ranked.push({
        id: String(row.id || '').trim(),
        symbol: String(row.symbol || '').trim(),
        name: String(row.name || '').trim(),
        rank: row.market_cap_rank ?? null,
        marketCap: row.market_cap ?? null,
      });
    }
    if (page < pages) await sleep(COINGECKO_THROTTLE_MS);
  }
  return { ranked: ranked.filter((c) => c.id && c.symbol), sourceWarnings };
}

/** Fetch Binance spot pairs (status TRADING, spot allowed) from exchangeInfo. */
export async function fetchBinanceSpotPairs(): Promise<BinanceSpotPair[]> {
  assertEnabled();
  const data = (await fetchJson(`${BINANCE_BASE}/exchangeInfo`)) as {
    symbols?: Array<{
      symbol?: string;
      status?: string;
      baseAsset?: string;
      quoteAsset?: string;
      isSpotTradingAllowed?: boolean;
    }>;
  };
  const pairs: BinanceSpotPair[] = [];
  for (const entry of data.symbols ?? []) {
    const tradable = entry.status === undefined || entry.status === 'TRADING';
    const spot = entry.isSpotTradingAllowed === undefined || entry.isSpotTradingAllowed === true;
    if (entry.symbol && tradable && spot) {
      pairs.push({
        symbol: entry.symbol.toUpperCase(),
        // Fall back to parsing when exchangeInfo omits base/quote (older fixtures).
        baseAsset: (entry.baseAsset || inferBaseAsset(entry.symbol)).toUpperCase(),
        quoteAsset: (entry.quoteAsset || inferQuoteAsset(entry.symbol)).toUpperCase(),
      });
    }
  }
  return pairs;
}

/** base asset → its preferred Binance pair, honoring QUOTE_ASSETS priority. */
function buildBaseToPreferredPair(pairs: BinanceSpotPair[]): Map<string, BinanceSpotPair> {
  const priority = (q: string) => {
    const idx = QUOTE_ASSETS.indexOf(q);
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };
  const map = new Map<string, BinanceSpotPair>();
  for (const pair of pairs) {
    if (!QUOTE_ASSETS.includes(pair.quoteAsset)) continue; // only USD-pegged quotes
    const current = map.get(pair.baseAsset);
    if (!current || priority(pair.quoteAsset) < priority(current.quoteAsset)) {
      map.set(pair.baseAsset, pair);
    }
  }
  return map;
}

/** Best-effort base/quote parsing for fixtures/exchangeInfo rows lacking the fields. */
function inferQuoteAsset(symbol: string): string {
  const s = symbol.toUpperCase();
  for (const q of QUOTE_ASSETS) if (s.endsWith(q)) return q;
  return QUOTE_ASSET;
}
function inferBaseAsset(symbol: string): string {
  const s = symbol.toUpperCase();
  const q = inferQuoteAsset(s);
  return s.endsWith(q) ? s.slice(0, -q.length) : s;
}

/**
 * Back-compat: the set of actively-trading Binance symbols (e.g. "BTCUSDT").
 * Retained for callers that only need a membership check.
 */
export async function fetchBinanceTradingSymbols(): Promise<Set<string>> {
  const pairs = await fetchBinanceSpotPairs();
  return new Set(pairs.map((p) => p.symbol));
}

type BinanceKline = [
  number, // open time
  string, // open
  string, // high
  string, // low
  string, // close
  string, // volume (base asset)
  number, // close time
  string, // quote asset volume
  ...unknown[]
];

export interface FetchKlinesOptions {
  /** Candle interval. Default '1d'. */
  interval?: string;
  /** Max bars to fetch (paged at 1000/request). Default 1000. */
  limit?: number;
  /** Only return bars on/after this date. */
  startTime?: Date | null;
}

/**
 * Fetch daily OHLCV history for a Binance pair as CryptoHistoricalPrice[]
 * (ascending by date).  Pages backward in 1000-bar requests when limit > 1000.
 */
export async function fetchCryptoHistory(symbol: string, options: FetchKlinesOptions = {}): Promise<CryptoHistoricalPrice[]> {
  assertEnabled();
  const interval = options.interval || '1d';
  const target = Math.max(1, options.limit ?? 1000);
  const startMs = options.startTime ? options.startTime.getTime() : undefined;

  const collected: CryptoHistoricalPrice[] = [];
  let endTime: number | undefined;
  // Page backward until we have enough bars or the source is exhausted.
  while (collected.length < target) {
    const pageLimit = Math.min(1000, target - collected.length);
    let url = `${BINANCE_BASE}/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${pageLimit}`;
    if (endTime !== undefined) url += `&endTime=${endTime}`;
    if (startMs !== undefined) url += `&startTime=${startMs}`;
    const data = (await fetchJson(url)) as BinanceKline[];
    if (!Array.isArray(data) || data.length === 0) break;

    for (const k of data) {
      const openTime = Number(k[0]);
      collected.push({
        symbol,
        date: new Date(openTime),
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
        adjustedClose: Number(k[4]),
        volume: Number(k[5]),
        quoteVolume: Number(k[7]),
        source: 'BINANCE_KLINES',
      });
    }

    // Oldest bar in this page → page further back next iteration.
    const oldest = Number(data[0][0]);
    if (!Number.isFinite(oldest) || (startMs !== undefined && oldest <= startMs)) break;
    endTime = oldest - 1;
    if (data.length < pageLimit) break; // source exhausted
    await sleep(BINANCE_THROTTLE_MS);
  }

  // Dedup by date and sort ascending (oldest first).
  const byTime = new Map<number, CryptoHistoricalPrice>();
  for (const bar of collected) {
    if (startMs !== undefined && bar.date.getTime() < startMs) continue;
    byTime.set(bar.date.getTime(), bar);
  }
  return [...byTime.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

export const CRYPTO_PROVIDER_THROTTLE_MS = BINANCE_THROTTLE_MS;
