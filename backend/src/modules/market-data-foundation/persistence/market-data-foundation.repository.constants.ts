// ---------------------------------------------------------------------------
// Shared constants for MarketDataFoundationRepository sub-repositories.
// Byte-for-byte relocations of the original module-level constants. Pure relocation.
// ---------------------------------------------------------------------------

export const MARKET_MOVER_BASE_WINDOW_DAYS = 14;
export const MARKET_MOVER_MIN_PRICE = 10;
export const MARKET_MOVER_MIN_RECENT_TURNOVER = 1_000_000;
// Gainers/losers persisted per range (write) AND served by default (read). Single source of
// truth so the snapshot-write count and the serving default can never silently drift apart —
// historically the write slice was 5 while reads expected more, so each daily regeneration
// reverted the page to 5. Equity scan-snapshots writer + serving reader both import this.
export const MARKET_MOVERS_SNAPSHOT_COUNT = 10;
export const PROVIDER_MARKET_DATA_SOURCES = [
  'yahoo',
  'yahoo_finance',
  'yfinance',
  'YAHOO',
  'YAHOO_CHART',
  'angel_one',
  'ANGEL_ONE',
  'ANGEL_ONE_HISTORICAL',
];
export const PROVIDER_MARKET_DATA_SOURCE_UPPER = PROVIDER_MARKET_DATA_SOURCES.map((source) => source.toUpperCase());
export const PROVIDER_REPAIR_TYPES = ['PROVIDER_VALIDATION', 'PROVIDER_BUSINESS_METADATA'];
export const PROVIDER_CLEANUP_DELETE_BATCH_SIZE = 50_000;
export const EXCHANGE_PRICE_SOURCES = [
  'NSE',
  'NSE_CM',
  'NSE_CM_UDIFF',
  'NSE_CM_UDIFF_BHAVCOPY',
  'NSE_UDIFF_CM_BHAVCOPY',
  'NSE_SECURITY_BHAVDATA',
  'NSE_INDEX_EOD',
  'NIFTY_SECTOR_INDEX',
  'BSE',
  'BSE_CM',
  'BSE_CM_BHAVCOPY',
  'BSE_CM_BACKUP_BHAVCOPY',
  'BSE_UDIFF_CM_BHAVCOPY',
];
