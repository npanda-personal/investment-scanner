/**
 * Shared types for the Stock Workspace "source list" — the list a user clicked from
 * to reach the workspace. Kept deliberately minimal: just what the source-list rail
 * needs to render and to navigate between stocks, sourced from fields every instrument
 * list already has in state. No fetching, research-support framing only.
 */

export interface StockListItem {
  /** Instrument catalog id — the `/stocks/:id` route param. */
  instrumentId: string;
  /** Ticker symbol shown in the rail (e.g. "RELIANCE", "AAPL", "BTC"). */
  symbol: string;
  /** Optional company/long name shown as the secondary line. */
  companyName?: string | null;
}

/** The captured source list plus a human-readable label for where it came from. */
export interface WorkspaceSource {
  /** e.g. "Screener", "52-Week Highs", "Watchlist: Momentum". */
  label: string;
  items: StockListItem[];
}
