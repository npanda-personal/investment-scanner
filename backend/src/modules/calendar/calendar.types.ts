// Calendar module — unified, TradingView-style event calendar assembled from persisted
// data only (no live provider fetch on read). Five event families share one DTO so the
// frontend renders them through a single tabbed table.

// IPO_UPCOMING is the forthcoming/ongoing-subscription family (descriptive NSE/BSE data,
// no price metrics yet); IPO stays the already-listed family (return/trend/health/signal).
// They are surfaced as two FE sub-tabs under one "IPO" parent tab.
export const CALENDAR_EVENT_TYPES = ['IPO', 'IPO_UPCOMING', 'DIVIDEND', 'SPLIT', 'EARNINGS', 'ECONOMIC'] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export type CalendarFreshness = 'FRESH' | 'PARTIAL' | 'NO_DATA';

/** Numeric/string metric bag — per-eventType keys documented at each mapper. */
export type CalendarMetricValue = number | string | null;

export interface CalendarEvent {
  id: string;
  eventType: CalendarEventType;
  /** ISO date (UTC midnight) the event is anchored to (listing / ex-date / result / release). */
  date: string;
  region: string;
  symbol: string | null;
  companyName: string | null;
  /** Short headline, e.g. "Dividend ₹4.50" or "Consumer Price Index". */
  title: string;
  /** Optional secondary line (label / source qualifier). */
  detail: string | null;
  metrics: Record<string, CalendarMetricValue>;
  sourceUrl: string | null;
}

export interface CalendarQuery {
  region: string;
  assetType: string;
  type: CalendarEventType | 'ALL';
  from: Date;
  to: Date;
  limit: number;
  /**
   * Backward look-back window (in months) for the IPO "Closed" sub-tab — decoupled from the
   * page's global from/to (which is forward-looking). 1 | 3 | 6; defaults to 3.
   */
  ipoMonths: number;
}

export interface CalendarResponse {
  scope: { region: string; assetType: string };
  type: CalendarEventType | 'ALL';
  range: { from: string; to: string };
  generatedAt: string;
  freshness: CalendarFreshness;
  counts: Record<CalendarEventType, number>;
  items: CalendarEvent[];
  warnings: string[];
}

export interface CalendarRefreshRequest {
  region: string;
  assetType: string;
  snapshotDate: Date;
  /** "Recently listed" window for the IPO snapshot. */
  lookbackDays: number;
  /** When false, skip the FRED economic ingest (e.g. no key, or IPO-only refresh). */
  includeEconomic: boolean;
  /** When true, fetch the NSE+BSE forthcoming/ongoing IPO feed into upcoming_ipo_snapshots. */
  includeUpcomingIpo: boolean;
}

/**
 * Normalized forthcoming/ongoing IPO record — the shared shape the NSE and BSE providers emit
 * and the calendar persists into upcoming_ipo_snapshots. Descriptive subscription data only.
 */
export interface UpcomingIpoRecord {
  source: 'NSE' | 'BSE';
  exchange: string | null;
  ipoType: 'MAINBOARD' | 'SME' | null;
  symbol: string | null;
  companyName: string;
  status: 'UPCOMING' | 'ONGOING';
  openDate: Date | null;
  closeDate: Date | null;
  priceBandMin: number | null;
  priceBandMax: number | null;
  issueSizeCr: number | null;
  lotSize: number | null;
  expectedListingDate: Date | null;
  sourceUrl: string | null;
  raw: unknown;
}

export interface CalendarRefreshSourceResult {
  processed: number;
  written: number;
  skipped: boolean;
  warnings: string[];
}

export interface CalendarRefreshResult {
  status: 'OK' | 'PARTIAL' | 'FAILED';
  region: string;
  snapshotDate: string;
  ipo: CalendarRefreshSourceResult;
  economic: CalendarRefreshSourceResult;
  upcomingIpo: CalendarRefreshSourceResult;
  generatedAt: string;
}
