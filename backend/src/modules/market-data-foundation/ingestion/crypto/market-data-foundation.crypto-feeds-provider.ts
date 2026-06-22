import { getCryptoEndpoints } from '../market-data-foundation.endpoints';

/**
 * Crypto FREE-feed providers (keyless, commercial-OK) for the persist-then-read
 * crypto feature. These supplement the universe/OHLCV provider with three extra
 * signals, each from a free public API:
 *
 *  - Fear & Greed sentiment  → alternative.me  (GET /fng)
 *  - Perp funding + OI        → Binance USDⓈ-M futures (GET /premiumIndex, /openInterest)
 *  - On-chain fundamentals    → DefiLlama (GET /protocols, /overview/fees)
 *
 * Hard rule: a provider outage must DEGRADE GRACEFULLY. Every exported fetcher
 * catches its own errors and returns null / [] + collects warnings — it NEVER
 * throws to the caller, so one dead feed can't abort a pipeline stage. No API
 * keys are used; all endpoints are resolved from the central endpoint registry.
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const HTTP_TIMEOUT_MS = Number(process.env.CRYPTO_FEEDS_HTTP_TIMEOUT_MS || 20000);
const HTTP_MAX_ATTEMPTS = Number(process.env.CRYPTO_FEEDS_HTTP_MAX_ATTEMPTS || 3);
const HTTP_BACKOFF_BASE_MS = Number(process.env.CRYPTO_FEEDS_HTTP_BACKOFF_BASE_MS || 1000);
/** Throttle between per-symbol futures requests (Binance rate-limit hygiene). */
const FUTURES_THROTTLE_MS = Number(process.env.CRYPTO_FUTURES_THROTTLE_MS || 150);

interface FetchOk {
  ok: true;
  data: unknown;
}
interface FetchErr {
  ok: false;
  status: number; // 0 = network/timeout (no HTTP response)
  retryAfterMs: number | null;
  message: string;
}

async function fetchJsonOnce(url: string): Promise<FetchOk | FetchErr> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'investment-scanner/crypto-feeds' },
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
 * GET JSON with bounded exponential backoff + deterministic jitter on transient
 * failures (HTTP 429, 5xx, network errors, timeouts). On a non-transient 4xx it
 * REJECTS with an error carrying `.status` so per-symbol callers can detect "no
 * perp exists" (4xx) and skip rather than retry. Mirrors the crypto-provider
 * fetchJson semantics; kept local so the feeds provider has no cross-file coupling.
 */
async function fetchJson(url: string): Promise<unknown> {
  let lastError: (Error & { status?: number }) | null = null;
  for (let attempt = 1; attempt <= HTTP_MAX_ATTEMPTS; attempt++) {
    let result: FetchOk | FetchErr;
    try {
      result = await fetchJsonOnce(url);
    } catch (error) {
      // Network error / timeout (AbortError) — always transient; retry until exhausted.
      lastError = error as Error & { status?: number };
      lastError.status = 0;
      if (attempt === HTTP_MAX_ATTEMPTS) throw lastError;
      await sleep(HTTP_BACKOFF_BASE_MS * 2 ** (attempt - 1) + attempt * 137);
      continue;
    }
    if (result.ok) return result.data;
    const err = new Error(result.message) as Error & { status?: number };
    err.status = result.status;
    lastError = err;
    const transient = result.status === 429 || result.status >= 500;
    if (!transient || attempt === HTTP_MAX_ATTEMPTS) throw err;
    const backoff = result.retryAfterMs ?? HTTP_BACKOFF_BASE_MS * 2 ** (attempt - 1);
    await sleep(backoff + attempt * 137);
  }
  throw lastError ?? new Error(`fetchJson failed for ${url}`);
}

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Uppercased base ticker from a canonical pair symbol (BTCUSDT → BTC). */
const QUOTE_SUFFIXES = ['USDT', 'USDC', 'FDUSD', 'TUSD', 'BUSD', 'USD'];
function baseTicker(symbol: string, displaySymbol?: string | null): string {
  const display = (displaySymbol ?? '').trim().toUpperCase();
  if (display) return display;
  const s = symbol.trim().toUpperCase();
  for (const q of QUOTE_SUFFIXES) if (s.endsWith(q) && s.length > q.length) return s.slice(0, -q.length);
  return s;
}

// ── Fear & Greed (alternative.me) ───────────────────────────────────────────

export interface CryptoFearGreed {
  value: number; // 0..100
  classification: string; // e.g. "Extreme Fear"
  timestampSec: number; // unix seconds of the reading
}

/**
 * Latest Crypto Fear & Greed Index reading. Returns null on any failure (the
 * market-context stage that consumes this treats null as "unavailable").
 */
export async function fetchCryptoFearGreed(): Promise<CryptoFearGreed | null> {
  const base = getCryptoEndpoints().fearGreedBase.url;
  try {
    const raw = (await fetchJson(`${base}/fng/?limit=1`)) as {
      data?: Array<{ value?: string | number; value_classification?: string; timestamp?: string | number }>;
    };
    const row = Array.isArray(raw?.data) ? raw.data[0] : undefined;
    if (!row) return null;
    const value = toFiniteNumber(row.value);
    if (value === null) return null;
    return {
      value,
      classification: String(row.value_classification ?? '').trim() || 'Unknown',
      timestampSec: toFiniteNumber(row.timestamp) ?? Math.floor(Date.now() / 1000),
    };
  } catch {
    return null;
  }
}

// ── Binance USDⓈ-M futures (funding rate + open interest) ────────────────────

export interface CryptoFuturesRow {
  symbol: string; // perp symbol, equals the spot canonical symbol (BTCUSDT)
  fundingRatePct: number | null; // lastFundingRate * 100
  openInterestUsd: number | null; // openInterest * markPrice
  longShortRatioGlobal: number | null;
  longAccountPct: number | null;
  shortAccountPct: number | null;
  topTraderLongShortRatio: number | null;
  topTraderPositionRatio: number | null;
  takerBuySellRatio: number | null;
}

/**
 * Per-symbol funding rate + USD open interest from Binance USDⓈ-M futures.
 * Sequential with a small throttle. A symbol with no perp returns a 4xx — that
 * symbol is silently skipped (no row, no warning) since spot-only coins are
 * expected. Other errors are collected as warnings. Never throws.
 */
export async function fetchBinanceFuturesSnapshots(
  symbols: string[],
): Promise<{ rows: CryptoFuturesRow[]; warnings: string[] }> {
  const base = getCryptoEndpoints().binanceFuturesBase.url;
  const dataBase = getCryptoEndpoints().binanceFuturesDataBase.url;
  const rows: CryptoFuturesRow[] = [];
  const warnings: string[] = [];
  const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];

  for (let i = 0; i < unique.length; i++) {
    const symbol = unique[i];
    try {
      const premium = (await fetchJson(`${base}/premiumIndex?symbol=${encodeURIComponent(symbol)}`)) as {
        lastFundingRate?: string | number;
        markPrice?: string | number;
      };
      const lastFundingRate = toFiniteNumber(premium?.lastFundingRate);
      const markPrice = toFiniteNumber(premium?.markPrice);

      let openInterestUsd: number | null = null;
      try {
        const oi = (await fetchJson(`${base}/openInterest?symbol=${encodeURIComponent(symbol)}`)) as {
          openInterest?: string | number;
        };
        const openInterest = toFiniteNumber(oi?.openInterest);
        if (openInterest !== null && markPrice !== null) openInterestUsd = openInterest * markPrice;
      } catch (oiError) {
        const status = (oiError as { status?: number })?.status;
        if (status !== 400 && status !== 404) {
          warnings.push(`Open interest fetch failed for ${symbol}: ${(oiError as Error).message}`);
        }
      }

      // Long/short ratios + taker flow from /futures/data/ (best-effort per symbol)
      let longShortRatioGlobal: number | null = null;
      let longAccountPct: number | null = null;
      let shortAccountPct: number | null = null;
      let topTraderLongShortRatio: number | null = null;
      let topTraderPositionRatio: number | null = null;
      let takerBuySellRatio: number | null = null;
      try {
        const dataParams = `symbol=${encodeURIComponent(symbol)}&period=1d&limit=1`;
        const [globalRaw, topAcctRaw, topPosRaw, takerRaw] = await Promise.all([
          fetchJson(`${dataBase}/globalLongShortAccountRatio?${dataParams}`),
          fetchJson(`${dataBase}/topLongShortAccountRatio?${dataParams}`),
          fetchJson(`${dataBase}/topLongShortPositionRatio?${dataParams}`),
          fetchJson(`${dataBase}/takerlongshortRatio?${dataParams}`),
        ]);
        const g = Array.isArray(globalRaw) ? (globalRaw as Record<string, unknown>[])[0] : null;
        const ta = Array.isArray(topAcctRaw) ? (topAcctRaw as Record<string, unknown>[])[0] : null;
        const tp = Array.isArray(topPosRaw) ? (topPosRaw as Record<string, unknown>[])[0] : null;
        const tk = Array.isArray(takerRaw) ? (takerRaw as Record<string, unknown>[])[0] : null;
        if (g) {
          longShortRatioGlobal = toFiniteNumber(g.longShortRatio);
          longAccountPct = toFiniteNumber(g.longAccount);
          shortAccountPct = toFiniteNumber(g.shortAccount);
        }
        if (ta) topTraderLongShortRatio = toFiniteNumber(ta.longShortRatio);
        if (tp) topTraderPositionRatio = toFiniteNumber(tp.longShortRatio);
        if (tk) takerBuySellRatio = toFiniteNumber(tk.buySellRatio);
      } catch {
        // 4xx = no data for this symbol (spot-only or unlisted); skip silently
      }

      rows.push({
        symbol,
        fundingRatePct: lastFundingRate !== null ? lastFundingRate * 100 : null,
        openInterestUsd,
        longShortRatioGlobal,
        longAccountPct,
        shortAccountPct,
        topTraderLongShortRatio,
        topTraderPositionRatio,
        takerBuySellRatio,
      });
    } catch (error) {
      const status = (error as { status?: number })?.status;
      // No perp listed → 4xx → expected skip (spot-only coin). Other errors warn.
      if (status !== 400 && status !== 404) {
        warnings.push(`Futures fetch failed for ${symbol}: ${(error as Error).message}`);
      }
    }
    if (i < unique.length - 1) await sleep(FUTURES_THROTTLE_MS);
  }

  return { rows, warnings };
}

// ── DefiLlama on-chain fundamentals (TVL, fees) ──────────────────────────────

export interface CryptoFundamentalRow {
  symbol: string; // canonical pair symbol we were asked about (BTCUSDT)
  defillamaSlug: string | null;
  category: string | null;
  chains: string[] | null;
  tvlUsd: number | null;
  tvlChange1dPct: number | null;
  tvlChange7dPct: number | null;
  fees24hUsd: number | null;
  fees7dUsd: number | null;
  revenue24hUsd: number | null;
  revenue30dUsd: number | null;
  annualizedRevenueUsd: number | null;
  coverageStatus: 'FULL' | 'NONE';
}

interface DefiLlamaProtocol {
  name?: string;
  symbol?: string;
  category?: string;
  chains?: string[];
  tvl?: number;
  change_1d?: number;
  change_7d?: number;
  slug?: string;
}

interface DefiLlamaFeesRow {
  name?: string;
  total24h?: number;
  total7d?: number;
  total30d?: number;
}

/**
 * Best-effort on-chain fundamentals for the given canonical symbols. We match a
 * DefiLlama protocol by uppercased base ticker. Only DeFi protocols have TVL —
 * non-DeFi coins simply get NO row (coverageStatus FULL is emitted only for
 * matched/covered coins). On total provider failure returns [] + a warning.
 * Never throws.
 */
/**
 * Base-layer / non-DeFi major coins. DefiLlama tracks DeFi protocols (Aave, Uniswap,
 * …), not L1/L2/payment coins, so a ticker join would falsely attach a same-symbol
 * junk protocol's TVL/category to these. Excluded from DeFi fundamental matching.
 */
const NON_DEFI_BASE = new Set([
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'TRX', 'AVAX', 'DOT', 'LTC',
  'BCH', 'XLM', 'XMR', 'ETC', 'ATOM', 'TON', 'NEAR', 'APT', 'SUI', 'ICP', 'HBAR',
  'FIL', 'ALGO', 'VET', 'XTZ', 'EOS', 'WBTC', 'SHIB', 'PEPE', 'KAS',
]);

export async function fetchDefiLlamaFundamentals(
  symbols: Array<string | { symbol: string; displaySymbol?: string | null }>,
): Promise<{ rows: CryptoFundamentalRow[]; warnings: string[] }> {
  const base = getCryptoEndpoints().defillamaBase.url;
  const warnings: string[] = [];

  // Normalize request set → base ticker → canonical symbol.
  const wanted = new Map<string, string>(); // baseTicker → canonical symbol
  for (const entry of symbols) {
    const canonical = typeof entry === 'string' ? entry : entry.symbol;
    const display = typeof entry === 'string' ? null : entry.displaySymbol ?? null;
    const sym = (canonical ?? '').trim().toUpperCase();
    if (!sym) continue;
    const base2 = baseTicker(sym, display);
    if (base2 && !wanted.has(base2)) wanted.set(base2, sym);
  }
  if (wanted.size === 0) return { rows: [], warnings };

  let protocols: DefiLlamaProtocol[];
  try {
    protocols = (await fetchJson(`${base}/protocols`)) as DefiLlamaProtocol[];
    if (!Array.isArray(protocols)) {
      warnings.push('DefiLlama /protocols returned a non-array payload.');
      return { rows: [], warnings };
    }
  } catch (error) {
    warnings.push(`DefiLlama /protocols fetch failed: ${(error as Error).message}`);
    return { rows: [], warnings };
  }

  // Fees overview is best-effort — keyed by protocol name (matches /protocols name).
  const feesByName = new Map<string, DefiLlamaFeesRow>();
  try {
    const fees = (await fetchJson(
      `${base}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
    )) as { protocols?: DefiLlamaFeesRow[] };
    for (const f of fees?.protocols ?? []) {
      const name = String(f?.name ?? '').trim();
      if (name) feesByName.set(name.toUpperCase(), f);
    }
  } catch (error) {
    warnings.push(`DefiLlama /overview/fees fetch failed (fees left null): ${(error as Error).message}`);
  }

  // Revenue overview (same endpoint with dataType=dailyRevenue) — best-effort.
  const revenueByName = new Map<string, DefiLlamaFeesRow>();
  try {
    const rev = (await fetchJson(
      `${base}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyRevenue`,
    )) as { protocols?: DefiLlamaFeesRow[] };
    for (const r of rev?.protocols ?? []) {
      const name = String(r?.name ?? '').trim();
      if (name) revenueByName.set(name.toUpperCase(), r);
    }
  } catch (error) {
    warnings.push(`DefiLlama /overview/fees?dataType=dailyRevenue fetch failed (revenue left null): ${(error as Error).message}`);
  }

  // For a given base ticker keep the largest-TVL protocol match (handles ticker
  // collisions where multiple protocols share a symbol).
  const bestByBase = new Map<string, DefiLlamaProtocol>();
  for (const p of protocols) {
    const sym = String(p?.symbol ?? '').trim().toUpperCase();
    if (!sym || !wanted.has(sym)) continue;
    const current = bestByBase.get(sym);
    if (!current || (toFiniteNumber(p.tvl) ?? -1) > (toFiniteNumber(current.tvl) ?? -1)) {
      bestByBase.set(sym, p);
    }
  }

  const rows: CryptoFundamentalRow[] = [];
  for (const [base2, canonical] of wanted) {
    // Skip base-layer / non-DeFi majors: DefiLlama tracks DeFi PROTOCOLS, so a
    // ticker-only join wrongly maps coins like BTC/ETH to a junk protocol that
    // merely shares the symbol. These coins are not DeFi protocols → no TVL row.
    if (NON_DEFI_BASE.has(base2)) continue;
    const p = bestByBase.get(base2);
    if (!p) continue; // non-DeFi coin → no row (keep it simple, coverage explicit by absence)
    const fees = p.name ? feesByName.get(p.name.trim().toUpperCase()) : undefined;
    const rev = p.name ? revenueByName.get(p.name.trim().toUpperCase()) : undefined;
    const rev24h = rev ? toFiniteNumber(rev.total24h) : null;
    rows.push({
      symbol: canonical,
      defillamaSlug: String(p.slug ?? '').trim() || null,
      category: String(p.category ?? '').trim() || null,
      chains: Array.isArray(p.chains) && p.chains.length ? p.chains.map((c) => String(c)) : null,
      tvlUsd: toFiniteNumber(p.tvl),
      tvlChange1dPct: toFiniteNumber(p.change_1d),
      tvlChange7dPct: toFiniteNumber(p.change_7d),
      fees24hUsd: fees ? toFiniteNumber(fees.total24h) : null,
      fees7dUsd: fees ? toFiniteNumber(fees.total7d) : null,
      revenue24hUsd: rev24h,
      revenue30dUsd: rev ? toFiniteNumber(rev.total30d) ?? (rev24h != null ? rev24h * 30 : null) : null,
      annualizedRevenueUsd: rev24h != null ? rev24h * 365 : null,
      coverageStatus: 'FULL',
    });
  }

  return { rows, warnings };
}
