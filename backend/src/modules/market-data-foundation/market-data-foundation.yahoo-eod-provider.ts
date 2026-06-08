import type { CorporateAction, HistoricalPrice } from './market-data-foundation.types';
import type { MarketRegion } from '../../shared/utils/market-scope';

/**
 * Yahoo EOD provider (FREE — US/EU equities + indices).
 *
 *  - Daily OHLCV history: Yahoo chart API
 *    (https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d) —
 *    keyless JSON, split/dividend-adjusted close included.  No payment, no key.
 *  - Corporate actions: the same response carries `events.{dividends,splits}`
 *    (requested via `events=div,splits`) — parsed into CorporateAction[].
 *
 * Scoped strictly to US/EU regions via the provider-registry; the India NSE/BSE
 * path stays file-based and the legacy global Yahoo gate is untouched.  This
 * provider only returns parsed rows; persistence is the caller's job (shared
 * equity repository, region-discriminated rows).
 *
 * Transient failures (HTTP 429/5xx, timeouts, network resets) are retried with
 * exponential backoff so a multi-hour full-universe backfill survives Yahoo's
 * intermittent throttling without aborting the whole run.
 */

const YAHOO_BASE = (process.env.YAHOO_CHART_API_BASE || 'https://query1.finance.yahoo.com').replace(/\/+$/, '');
const YAHOO_THROTTLE_MS = Number(process.env.YAHOO_THROTTLE_MS || 300);
const HTTP_TIMEOUT_MS = Number(process.env.YAHOO_HTTP_TIMEOUT_MS || 20000);
const YAHOO_MAX_RETRIES = Number(process.env.YAHOO_MAX_RETRIES || 4);

export const YAHOO_PROVIDER_THROTTLE_MS = YAHOO_THROTTLE_MS;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Per-exchange Yahoo symbol suffix (US needs none). */
const EXCHANGE_SUFFIX: Record<string, string> = {
  // EU — eurozone exchanges (EUR). Canonical EU symbols already carry the
  // suffix, so this map is the fallback when a bare symbol + exchange is given.
  LSE: '.L',
  XETRA: '.DE',
  EURONEXT: '.PA',
  EURONEXT_PAR: '.PA',
  EURONEXT_AMS: '.AS',
  EURONEXT_BRU: '.BR',
  EURONEXT_LIS: '.LS',
  EURONEXT_DUB: '.IR',
  BORSA_ITALIANA: '.MI',
  BME: '.MC',
  VIENNA: '.VI',
  HELSINKI: '.HE',
};

const REGION_DEFAULT_SUFFIX: Partial<Record<MarketRegion, string>> = {
  US: '',
  EU: '.DE',
};

/**
 * Map a canonical symbol to the Yahoo chart symbol.
 *  - Indices pass through (caller supplies Yahoo form, e.g. `^GSPC`, `^VIX`).
 *  - Symbols that already carry a suffix (contain a dot/caret) pass through.
 *  - US tickers are used as-is; EU tickers get the exchange/region suffix.
 */
export function toYahooSymbol(symbol: string, region: MarketRegion, exchange?: string | null): string {
  const raw = String(symbol || '').trim();
  if (!raw) return '';
  if (raw.startsWith('^')) return raw.toUpperCase();
  if (raw.includes('.')) return raw.toUpperCase();
  const upper = raw.toUpperCase();
  if (region === 'US') return upper;
  const byExchange = exchange ? EXCHANGE_SUFFIX[exchange.trim().toUpperCase()] : undefined;
  const suffix = byExchange ?? REGION_DEFAULT_SUFFIX[region] ?? '';
  return `${upper}${suffix}`;
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        // Yahoo rejects unknown agents; a browser-like UA is required.
        'User-Agent': 'Mozilla/5.0 (compatible; investment-scanner/yahoo-ingest)',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/** True for failures worth retrying — transient throttling/network, NOT a bad symbol (404/401). */
function isRetryableYahooError(error: unknown): boolean {
  const message = (error as Error)?.message || String(error);
  if (/HTTP 40[14]\b/.test(message)) return false; // not-found / unauthorized — permanent for this symbol
  return /HTTP 429\b|HTTP 5\d\d\b|aborted|timeout|ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|fetch failed|network|socket/i.test(
    message
  );
}

/** fetchJson with exponential backoff on transient errors. */
async function fetchJsonWithRetry(url: string, throttleMs: number): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt < Math.max(1, YAHOO_MAX_RETRIES); attempt += 1) {
    try {
      return await fetchJson(url);
    } catch (error) {
      lastError = error;
      const isLast = attempt >= Math.max(1, YAHOO_MAX_RETRIES) - 1;
      if (isLast || !isRetryableYahooError(error)) break;
      // 2^attempt growth on top of the polite throttle, capped at 30s.
      const backoff = Math.min(30000, (throttleMs || 300) * 2 ** (attempt + 1) + attempt * 500);
      await sleep(backoff);
    }
  }
  throw lastError;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: { currency?: string; symbol?: string };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
        adjclose?: Array<{ adjclose?: (number | null)[] }>;
      };
      events?: {
        dividends?: Record<string, { amount?: number; date?: number }>;
        splits?: Record<
          string,
          { date?: number; numerator?: number; denominator?: number; splitRatio?: string }
        >;
      };
    }>;
    error?: { code?: string; description?: string } | null;
  };
}

/** Pure parser: Yahoo chart JSON → HistoricalPrice[] (ascending). Exported for tests. */
export function parseYahooChart(payload: unknown, symbol: string): HistoricalPrice[] {
  const data = payload as YahooChartResponse;
  const error = data?.chart?.error;
  if (error) throw new Error(`Yahoo chart error for ${symbol}: ${error.code || ''} ${error.description || ''}`.trim());
  const result = data?.chart?.result?.[0];
  if (!result) return [];
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  const adjclose = result.indicators?.adjclose?.[0]?.adjclose;
  if (!quote || timestamps.length === 0) return [];

  const out: HistoricalPrice[] = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const close = quote.close?.[i];
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    // Yahoo emits nulls for non-trading gaps — skip incomplete bars.
    if (close == null || open == null || high == null || low == null) continue;
    if (![open, high, low, close].every((n) => Number.isFinite(n))) continue;
    const ts = Number(timestamps[i]);
    if (!Number.isFinite(ts)) continue;
    const volume = quote.volume?.[i];
    const adj = adjclose?.[i];
    out.push({
      symbol,
      date: new Date(ts * 1000),
      open: open as number,
      high: high as number,
      low: low as number,
      close: close as number,
      adjustedClose: adj != null && Number.isFinite(adj) ? (adj as number) : (close as number),
      volume: volume != null && Number.isFinite(volume) ? (volume as number) : undefined,
      source: 'YAHOO_EOD',
    });
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Pure parser: Yahoo chart `events` → CorporateAction[] (ascending by date).
 * Dividends carry a cash `amount`; splits carry a numeric `splitRatio`
 * (numerator/denominator), classified as `split` (≥1) or `reverse_split` (<1).
 * Exported for tests.  Source-tagged `YAHOO_EVENTS`.
 */
export function parseYahooEvents(payload: unknown, symbol: string): CorporateAction[] {
  const data = payload as YahooChartResponse;
  const result = data?.chart?.result?.[0];
  const events = result?.events;
  if (!events) return [];

  const toIsoDay = (ts?: number): string | null => {
    if (ts == null || !Number.isFinite(ts)) return null;
    return new Date(Number(ts) * 1000).toISOString().slice(0, 10);
  };

  const actions: CorporateAction[] = [];
  for (const div of Object.values(events.dividends ?? {})) {
    const date = toIsoDay(div?.date);
    const amount = div?.amount;
    if (!date || amount == null || !Number.isFinite(amount) || amount <= 0) continue;
    actions.push({
      symbol,
      type: 'dividend',
      date,
      value: amount as number,
      amount: amount as number,
      currency: 'USD',
      source: 'YAHOO_EVENTS',
    });
  }
  for (const split of Object.values(events.splits ?? {})) {
    const date = toIsoDay(split?.date);
    if (!date) continue;
    const numerator = Number(split?.numerator);
    const denominator = Number(split?.denominator);
    const ratio =
      Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0
        ? numerator / denominator
        : NaN;
    if (!Number.isFinite(ratio) || ratio <= 0) continue;
    actions.push({
      symbol,
      type: ratio >= 1 ? 'split' : 'reverse_split',
      date,
      value: split?.splitRatio || `${numerator}:${denominator}`,
      splitRatio: ratio,
      source: 'YAHOO_EVENTS',
    });
  }
  return actions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export interface FetchYahooOptions {
  startTime?: Date | null;
  throttleMs?: number;
  exchange?: string | null;
}

function buildYahooChartUrl(yahooSymbol: string, options: FetchYahooOptions): string {
  const period1 = options.startTime ? Math.floor(options.startTime.getTime() / 1000) : 0;
  const period2 = Math.floor(Date.now() / 1000) + 86400;
  return (
    `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}` +
    `?period1=${period1}&period2=${period2}&interval=1d&includeAdjustedClose=true&events=div%2Csplits`
  );
}

/**
 * Fetch daily OHLCV history AND corporate-action events for a canonical symbol
 * in a single Yahoo request (ascending).  `region`/`exchange` drive the Yahoo
 * symbol mapping; an already-suffixed symbol passes through unchanged.
 */
export async function fetchYahooHistoryWithEvents(
  symbol: string,
  region: MarketRegion,
  options: FetchYahooOptions = {}
): Promise<{ bars: HistoricalPrice[]; actions: CorporateAction[] }> {
  const yahooSymbol = toYahooSymbol(symbol, region, options.exchange);
  if (!yahooSymbol) return { bars: [], actions: [] };
  const url = buildYahooChartUrl(yahooSymbol, options);
  const throttle = options.throttleMs ?? YAHOO_THROTTLE_MS;
  const payload = await fetchJsonWithRetry(url, throttle);
  const bars = parseYahooChart(payload, symbol);
  const actions = parseYahooEvents(payload, symbol);
  if (throttle > 0) await sleep(throttle);
  return { bars, actions };
}

/**
 * Fetch daily OHLCV history for a canonical symbol from Yahoo as
 * HistoricalPrice[] (ascending).  Thin wrapper over fetchYahooHistoryWithEvents
 * for callers that only need prices.
 */
export async function fetchYahooHistory(
  symbol: string,
  region: MarketRegion,
  options: FetchYahooOptions = {}
): Promise<HistoricalPrice[]> {
  const { bars } = await fetchYahooHistoryWithEvents(symbol, region, options);
  return bars;
}
