/**
 * tradingViewSymbol — map an instrument to the `EXCHANGE:SYMBOL` form the TradingView
 * embed widget expects, across the markets this app supports (NSE/BSE India, US
 * NASDAQ/NYSE, crypto). Pure function, no fetching.
 *
 * Examples:
 *   { symbol: 'RELIANCE', exchange: 'NSE' }          -> 'NSE:RELIANCE'
 *   { symbol: 'RELIANCE', exchange: 'BSE' }          -> 'BSE:RELIANCE'
 *   { symbol: 'AAPL', exchange: 'NASDAQ' }           -> 'NASDAQ:AAPL'
 *   { symbol: 'MSFT', exchange: 'NYSE' }             -> 'NYSE:MSFT'
 *   { symbol: 'BTC', asset_type: 'CRYPTO' }          -> 'BINANCE:BTCUSDT' (best-effort)
 *   { symbol: 'INFY' }  (no exchange)                -> 'INFY' (TradingView auto-resolves)
 */

export interface TradingViewSymbolInput {
  symbol?: string | null;
  exchange?: string | null;
  asset_type?: string | null;
  region?: string | null;
}

/** TradingView exchange prefixes we know how to map directly from our `exchange` field. */
const KNOWN_EXCHANGES = new Set(['NSE', 'BSE', 'NASDAQ', 'NYSE', 'AMEX', 'ARCA', 'BATS']);

export function buildTradingViewSymbol(input: TradingViewSymbolInput): string {
  const symbol = String(input.symbol ?? '').trim().toUpperCase();
  if (!symbol) return '';

  const assetType = String(input.asset_type ?? '').trim().toUpperCase();
  const exchange = String(input.exchange ?? '').trim().toUpperCase();

  // Crypto: TradingView has no single canonical feed; use a widely-available spot pair.
  // Best-effort only — falls back gracefully if the pair is not recognized.
  if (assetType === 'CRYPTO') {
    // Symbols already carrying a quote (e.g. "BTCUSDT", "ETHUSD") are used as-is.
    if (/(USDT|USD|USDC|BUSD)$/.test(symbol)) return `BINANCE:${symbol}`;
    return `BINANCE:${symbol}USDT`;
  }

  // Strip any Yahoo-style exchange suffix (e.g. "360ONE.NS" → "360ONE") — TradingView
  // wants the bare ticker, the exchange is conveyed by the prefix.
  const ticker = symbol.replace(/\.(NS|BO|BS|NL)$/, '');

  if (exchange && KNOWN_EXCHANGES.has(exchange)) {
    return `${exchange}:${ticker}`;
  }

  // Unknown/missing exchange — hand the bare symbol to TradingView, which auto-resolves
  // to its best-matching listing. Keeps the chart usable even with incomplete metadata.
  return ticker;
}
