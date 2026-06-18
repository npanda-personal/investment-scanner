/**
 * tradingViewSymbol — map an instrument to the `EXCHANGE:SYMBOL` form the TradingView
 * widget expects, across the markets this app supports (NSE/BSE India, US NASDAQ/NYSE,
 * crypto). Pure function, no fetching.
 *
 * Why the exchange prefix matters: TradingView silently falls back to its DEFAULT symbol
 * (AAPL) when handed a bare ticker it can't resolve. Indian tickers (e.g. "CAPITALSFB")
 * are not resolvable without the `NSE:`/`BSE:` prefix, so we MUST derive one — from the
 * explicit exchange when known, otherwise from the market region.
 *
 * Examples:
 *   { symbol: 'RELIANCE', exchange: 'NSE' }                 -> 'NSE:RELIANCE'
 *   { symbol: 'CAPITALSFB', region: 'IN', exchange: null }  -> 'NSE:CAPITALSFB'
 *   { symbol: 'RELIANCE', exchange: 'BSE' }                 -> 'BSE:RELIANCE'
 *   { symbol: 'AAPL', region: 'US', exchange: 'NASDAQ' }    -> 'NASDAQ:AAPL'
 *   { symbol: 'AAPL', region: 'US', exchange: null }        -> 'AAPL' (US bare ticker resolves)
 *   { symbol: 'BTC', asset_type: 'CRYPTO' }                 -> 'BINANCE:BTCUSDT' (best-effort)
 */

export interface TradingViewSymbolInput {
  symbol?: string | null;
  exchange?: string | null;
  asset_type?: string | null;
  region?: string | null;
}

/** TradingView exchange prefixes we map directly from our `exchange` field. */
const KNOWN_EXCHANGES = new Set(['NSE', 'BSE', 'NASDAQ', 'NYSE', 'AMEX', 'ARCA', 'BATS']);

export function buildTradingViewSymbol(input: TradingViewSymbolInput): string {
  const rawSymbol = String(input.symbol ?? '').trim().toUpperCase();
  if (!rawSymbol) return '';

  const assetType = String(input.asset_type ?? '').trim().toUpperCase();
  const exchange = String(input.exchange ?? '').trim().toUpperCase();
  const region = String(input.region ?? '').trim().toUpperCase();

  // Crypto: TradingView has no single canonical feed; use a widely-available spot pair.
  // Best-effort only — falls back gracefully if the pair is not recognized.
  if (assetType === 'CRYPTO') {
    if (/(USDT|USD|USDC|BUSD)$/.test(rawSymbol)) return `BINANCE:${rawSymbol}`;
    return `BINANCE:${rawSymbol}USDT`;
  }

  // Strip any Yahoo-style exchange suffix (e.g. "360ONE.NS" → "360ONE") — TradingView
  // wants the bare ticker, the exchange is conveyed by the prefix.
  const ticker = rawSymbol.replace(/\.(NS|BO|BS|NL)$/, '');

  // Prefer an explicit, recognized exchange.
  if (exchange && KNOWN_EXCHANGES.has(exchange)) {
    return `${exchange}:${ticker}`;
  }

  // India: a bare ticker silently resolves to AAPL on TradingView, so the NSE:/BSE: prefix
  // is mandatory. Derive it from region when the exchange field is missing/non-standard;
  // default to NSE (BSE only when the exchange field explicitly says so).
  if (region === 'IN') {
    return exchange === 'BSE' ? `BSE:${ticker}` : `NSE:${ticker}`;
  }

  // US / EU / unknown: a bare ticker resolves to the primary listing on TradingView.
  return ticker;
}
