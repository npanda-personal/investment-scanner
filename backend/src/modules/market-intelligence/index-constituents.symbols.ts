/**
 * Curated static index constituent symbol lists.
 *
 * Source: NSE India official index composition pages.
 * As of: 2026-01 (update when index reconstitutes; NSE publishes changes on
 * https://www.nseindia.com/products-services/indices-nifty50-index-details)
 *
 * Symbols match NSE CM segment symbols as stored in the stocks catalog
 * (column: symbol, region: IN, exchange: NSE or null, assetType: STOCK).
 */

/** NSE Nifty 50 constituents — 50 large-cap liquid stocks. */
export const NIFTY_50_SYMBOLS: readonly string[] = [
  'ADANIENT',
  'ADANIPORTS',
  'APOLLOHOSP',
  'ASIANPAINT',
  'AXISBANK',
  'BAJAJ-AUTO',
  'BAJAJFINSV',
  'BAJFINANCE',
  'BHARTIARTL',
  'BEL',
  'BPCL',
  'BRITANNIA',
  'CIPLA',
  'COALINDIA',
  'DIVISLAB',
  'DRREDDY',
  'EICHERMOT',
  'GRASIM',
  'HCLTECH',
  'HDFCBANK',
  'HDFCLIFE',
  'HEROMOTOCO',
  'HINDALCO',
  'HINDUNILVR',
  'ICICIBANK',
  'INDUSINDBK',
  'INFY',
  'ITC',
  'JSWSTEEL',
  'KOTAKBANK',
  'LT',
  'M&M',
  'MARUTI',
  'NESTLEIND',
  'NTPC',
  'ONGC',
  'POWERGRID',
  'RELIANCE',
  'SBILIFE',
  'SHRIRAMFIN',
  'SBIN',
  'SUNPHARMA',
  'TATACONSUM',
  'TATAMOTORS',
  'TATASTEEL',
  'TCS',
  'TECHM',
  'TITAN',
  'ULTRACEMCO',
  'WIPRO',
] as const;

/** NSE Nifty Bank constituents — 12 large-cap banking stocks. */
export const NIFTY_BANK_SYMBOLS: readonly string[] = [
  'AUBANK',
  'AXISBANK',
  'BANDHANBNK',
  'BANKBARODA',
  'FEDERALBNK',
  'HDFCBANK',
  'ICICIBANK',
  'IDFCFIRSTB',
  'INDUSINDBK',
  'KOTAKBANK',
  'PNB',
  'SBIN',
] as const;

export const INDEX_SYMBOL_LISTS: Record<string, readonly string[]> = {
  NIFTY_50: NIFTY_50_SYMBOLS,
  NIFTY_BANK: NIFTY_BANK_SYMBOLS,
};

export const INDEX_DISPLAY_LABELS: Record<string, string> = {
  NIFTY_50: 'Nifty 50',
  NIFTY_BANK: 'Nifty Bank',
};

export const MEMBERSHIP_AS_OF = '2026-01';
