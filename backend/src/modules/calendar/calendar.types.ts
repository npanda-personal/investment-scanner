// Calendar module — unified, TradingView-style event calendar assembled from persisted
// data only (no live provider fetch on read). Five event families share one DTO so the
// frontend renders them through a single tabbed table.

export const CALENDAR_EVENT_TYPES = ['IPO', 'DIVIDEND', 'SPLIT', 'EARNINGS', 'ECONOMIC'] as const;
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
  generatedAt: string;
}
