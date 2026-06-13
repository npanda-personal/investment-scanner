import type { LatestStoredCandleInfo, MarketDataSchedulerDecision } from '../market-data-foundation.types';
import { normalizeMarketRegion } from '../../../shared/utils/market-scope';
import { US_NYSE_HOLIDAYS } from './us/market-data-foundation.us-holidays';
import { EU_EUROZONE_HOLIDAYS } from './eu/market-data-foundation.eu-holidays';
import { getStaticNseHolidaysForYear } from './india/market-data-foundation.nse-holidays';

export interface MarketSessionConfig {
  region: string;
  timezone: string;
  regularOpen: string;
  regularClose: string;
  postCloseSyncWindowMinutes: number;
  finalizationGraceMinutes: number;
  weekdays: number[];
  holidays: string[];
  syncDuringMarketHours: boolean;
  skipWeekends: boolean;
}

/**
 * Options for holiday-aware trading-calendar helpers.
 * Pass `holidays` as a Set/array of ISO date strings (YYYY-MM-DD) to enable
 * full holiday awareness.  When omitted the helpers degrade gracefully to
 * weekend-only logic and set `calendarUncertain = true` on the result.
 */
export interface TradingCalendarOptions {
  /** ISO date strings (YYYY-MM-DD) that are exchange holidays. */
  holidays?: string[] | Set<string>;
}

/** Returned by expectedLatestTradingDate when the holiday calendar is absent. */
export const MARKET_CALENDAR_UNCERTAIN = 'MARKET_CALENDAR_UNCERTAIN' as const;

/**
 * Compute the most recent completed trading date for a given region as of
 * `asOf`, honouring explicit `holidays`.
 *
 * - When `holidays` is supplied the result is fully holiday-aware.
 * - When `holidays` is absent the function degrades to weekend-only mode and
 *   sets `calendarUncertain = true` in the returned object so callers can
 *   propagate the MARKET_CALENDAR_UNCERTAIN signal rather than silently
 *   misclassifying data.
 *
 * @returns `{ date: string | null; calendarUncertain: boolean }`
 */
export function expectedLatestTradingDate(
  region: string,
  asOf: Date = new Date(),
  options: TradingCalendarOptions = {}
): { date: string | null; calendarUncertain: boolean } {
  const config = getMarketSessionConfig(region);
  if (!config) return { date: null, calendarUncertain: true };

  const holidaySet = toHolidaySet(options.holidays);
  const calendarUncertain = holidaySet === null;

  const configWithHolidays: MarketSessionConfig = {
    ...config,
    holidays: holidaySet ? [...holidaySet] : [],
  };

  const local = zonedParts(asOf, config.timezone);
  const todayCloseAt = zonedDateTimeToUtc(local.date, config.regularClose, config.timezone);
  const finalCandleExpectedAt = addMinutes(todayCloseAt, config.finalizationGraceMinutes);
  const todayIsTradingDay =
    config.weekdays.includes(local.weekday) &&
    !(holidaySet?.has(local.date) ?? false);

  let date: string | null;
  if (todayIsTradingDay && asOf >= finalCandleExpectedAt) {
    date = local.date;
  } else {
    date = previousTradingDate(local.date, configWithHolidays);
  }

  return { date, calendarUncertain };
}

/**
 * Count the number of trading sessions between `fromDate` and `toDate`
 * (both inclusive, both YYYY-MM-DD strings) for the given region.
 *
 * - Weekends are always excluded.
 * - `holidays` (ISO date strings) are excluded when supplied.
 * - When `holidays` is absent, `calendarUncertain = true` is set.
 * - Returns `{ count: number; calendarUncertain: boolean }`.
 * - Caps the walk at 365 days to protect against runaway iteration.
 */
export function tradingSessionsBetween(
  region: string,
  fromDate: string,
  toDate: string,
  options: TradingCalendarOptions = {}
): { count: number; calendarUncertain: boolean } {
  const config = getMarketSessionConfig(region);
  if (!config) return { count: 0, calendarUncertain: true };

  const holidaySet = toHolidaySet(options.holidays);
  const calendarUncertain = holidaySet === null;

  const [fy, fm, fd] = fromDate.split('-').map(Number);
  const [ty, tm, td] = toDate.split('-').map(Number);
  const fromMs = Date.UTC(fy, fm - 1, fd, 12, 0, 0);
  const toMs = Date.UTC(ty, tm - 1, td, 12, 0, 0);

  if (fromMs > toMs) return { count: 0, calendarUncertain };

  let count = 0;
  const cursor = new Date(fromMs);
  const MAX_DAYS = 365;
  for (let i = 0; i <= MAX_DAYS; i += 1) {
    const local = zonedParts(cursor, config.timezone);
    if (config.weekdays.includes(local.weekday) && !(holidaySet?.has(local.date) ?? false)) {
      count += 1;
    }
    if (cursor.getTime() >= toMs) break;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { count, calendarUncertain };
}

/**
 * Advance `fromDate` (YYYY-MM-DD) by exactly `sessions` trading sessions for
 * the given region.  Weekends are always skipped; `holidays` are skipped when
 * supplied.  When `holidays` is absent, `calendarUncertain = true`.
 *
 * Returns `{ date: string | null; calendarUncertain: boolean }`.
 * Returns `null` if the walk exceeds 365 calendar days without finding enough
 * trading sessions (degenerate input guard).
 */
export function addTradingSessions(
  region: string,
  fromDate: string,
  sessions: number,
  options: TradingCalendarOptions = {}
): { date: string | null; calendarUncertain: boolean } {
  const config = getMarketSessionConfig(region);
  if (!config) return { date: null, calendarUncertain: true };
  if (sessions <= 0) return { date: fromDate, calendarUncertain: toHolidaySet(options.holidays) === null };

  const holidaySet = toHolidaySet(options.holidays);
  const calendarUncertain = holidaySet === null;

  const [fy, fm, fd] = fromDate.split('-').map(Number);
  const cursor = new Date(Date.UTC(fy, fm - 1, fd + 1, 12, 0, 0));
  let remaining = sessions;
  const MAX_DAYS = 365;
  for (let i = 0; i < MAX_DAYS; i += 1) {
    const local = zonedParts(cursor, config.timezone);
    if (config.weekdays.includes(local.weekday) && !(holidaySet?.has(local.date) ?? false)) {
      remaining -= 1;
      if (remaining === 0) return { date: local.date, calendarUncertain };
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return { date: null, calendarUncertain };
}

// ─── NSE holiday provider ──────────────────────────────────────────────────
// Live NSE holidays are fetched async by MarketDataFoundationService; to read
// them synchronously here without a circular dependency we keep a small
// in-process registry and fall back to the static list until the cache warms.

type NseHolidayProvider = (year: number) => string[] | null;
let _nseHolidayProvider: NseHolidayProvider | null = null;

/** Register a live-cache-backed NSE holiday provider (static fallback used until it warms). */
export function registerNseHolidayProvider(provider: NseHolidayProvider): void {
  _nseHolidayProvider = provider;
}

/**
 * Best-available NSE holiday date strings (YYYY-MM-DD) for a calendar year:
 * live provider if registered, else the static fallback (always non-null).
 */
export function getKnownNseHolidaysForYear(year: number): string[] {
  if (_nseHolidayProvider) {
    const live = _nseHolidayProvider(year);
    if (live && live.length > 0) return live;
  }
  return getStaticNseHolidaysForYear(year);
}

/** Combined NSE holiday list for the year(s) around `tradingDate` (year-boundary safe). */
export function getKnownNseHolidaysForSessionDate(tradingDate: string): string[] {
  const year = Number(tradingDate.slice(0, 4));
  const years = [year - 1, year, year + 1].filter((y) => y > 2020 && y < 2100);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const y of years) {
    for (const d of getKnownNseHolidaysForYear(y)) {
      if (!seen.has(d)) {
        seen.add(d);
        result.push(d);
      }
    }
  }
  return result;
}

// ─── internal helpers ──────────────────────────────────────────────────────

function toHolidaySet(holidays?: string[] | Set<string>): Set<string> | null {
  if (!holidays) return null;
  if (holidays instanceof Set) return holidays;
  return new Set(holidays);
}

export const DEFAULT_MARKET_SESSION_CONFIGS: Record<string, Omit<MarketSessionConfig, 'syncDuringMarketHours' | 'skipWeekends'>> = {
  IN: {
    region: 'IN',
    timezone: 'Asia/Kolkata',
    regularOpen: '09:15',
    regularClose: '15:30',
    // NSE's official UDiFF bhavcopy is typically published ~18:00 IST, so the
    // final daily candle is only treated as "expected" ~3h after the 15:30
    // close (≈18:30 IST), and the post-close fetch/retry window runs to ≈20:30
    // IST. Attempting earlier just 404s against the not-yet-published archive.
    postCloseSyncWindowMinutes: 300,
    finalizationGraceMinutes: 180,
    weekdays: [1, 2, 3, 4, 5],
    // Populated dynamically via getKnownNseHolidaysForSessionDate() at call
    // sites.  Left empty here so static object construction never needs an
    // async context; see getMarketSessionConfig() for the live injection.
    holidays: [],
  },
  US: {
    region: 'US',
    timezone: 'America/New_York',
    regularOpen: '09:30',
    regularClose: '16:00',
    postCloseSyncWindowMinutes: 120,
    finalizationGraceMinutes: 15,
    weekdays: [1, 2, 3, 4, 5],
    holidays: US_NYSE_HOLIDAYS,
  },
  EU: {
    region: 'EU',
    timezone: 'Europe/Berlin',
    regularOpen: '09:00',
    regularClose: '17:30',
    postCloseSyncWindowMinutes: 120,
    finalizationGraceMinutes: 15,
    weekdays: [1, 2, 3, 4, 5],
    holidays: EU_EUROZONE_HOLIDAYS,
  },
};

export interface MarketSessionOptions {
  syncDuringMarketHours?: boolean;
  postCloseSyncWindowMinutes?: number;
  finalizationGraceMinutes?: number;
  skipWeekends?: boolean;
}

export function getMarketSessionConfig(region: string, options: MarketSessionOptions = {}): MarketSessionConfig | null {
  const normalizedRegion = normalizeMarketRegion(region);
  if (!normalizedRegion || normalizedRegion === 'GLOBAL') return null;
  const base = DEFAULT_MARKET_SESSION_CONFIGS[normalizedRegion];
  if (!base) return null;

  // For the IN region, inject the best-available NSE holiday list so that
  // shouldRunMarketDataSync and latestCompletedTradingDateForRegion treat NSE
  // holidays as non-trading days.  We resolve relative to today so the list
  // always covers the current year.  US/EU configs carry their own static arrays.
  const holidays =
    normalizedRegion === 'IN'
      ? getKnownNseHolidaysForSessionDate(new Date().toISOString().slice(0, 10))
      : base.holidays;

  return {
    ...base,
    holidays,
    postCloseSyncWindowMinutes: options.postCloseSyncWindowMinutes ?? base.postCloseSyncWindowMinutes,
    finalizationGraceMinutes: options.finalizationGraceMinutes ?? base.finalizationGraceMinutes,
    syncDuringMarketHours: options.syncDuringMarketHours ?? false,
    skipWeekends: options.skipWeekends ?? true,
  };
}

export function shouldRunMarketDataSync(
  region: string,
  now: Date = new Date(),
  latestStoredCandleInfo: LatestStoredCandleInfo = {},
  options: MarketSessionOptions = {}
): MarketDataSchedulerDecision {
  const config = getMarketSessionConfig(region, options);
  if (!config) {
    return {
      shouldRun: false,
      reasonCode: 'UNKNOWN_SESSION',
      sessionState: 'UNKNOWN_SESSION',
      reason: 'No market session is configured for this region. Use explicit IN/US/EU scheduling.',
      todayTradingDate: null,
      nextSuggestedRunAt: null,
    };
  }

  const local = zonedParts(now, config.timezone);
  const tradingDate = local.date;
  const openAt = zonedDateTimeToUtc(tradingDate, config.regularOpen, config.timezone);
  const closeAt = zonedDateTimeToUtc(tradingDate, config.regularClose, config.timezone);
  const closeGraceAt = addMinutes(closeAt, config.finalizationGraceMinutes);
  const postCloseEndAt = addMinutes(closeAt, config.postCloseSyncWindowMinutes);
  const nextOpenAt = nextTradingOpenAfter(tradingDate, config);
  const isHoliday = config.holidays.includes(tradingDate);
  const isWeekend = !config.weekdays.includes(local.weekday);

  if ((config.skipWeekends && isWeekend) || isHoliday) {
    return {
      shouldRun: false,
      reasonCode: 'WEEKEND_OR_HOLIDAY',
      sessionState: 'WEEKEND_OR_HOLIDAY',
      reason: isHoliday
        ? `${config.region} market holiday on ${tradingDate} — NSE/exchange closed, sync skipped.`
        : `${config.region} market weekend.`,
      todayTradingDate: tradingDate,
      nextSuggestedRunAt: nextOpenAt.toISOString(),
    };
  }

  if (now < openAt) {
    return {
      shouldRun: false,
      reasonCode: 'BEFORE_MARKET_OPEN',
      sessionState: 'BEFORE_MARKET_OPEN',
      reason: 'Daily candle is not useful before market open.',
      todayTradingDate: tradingDate,
      nextSuggestedRunAt: openAt.toISOString(),
    };
  }

  if (now >= openAt && now <= closeAt) {
    return {
      shouldRun: config.syncDuringMarketHours,
      reasonCode: 'MARKET_OPEN',
      sessionState: 'MARKET_OPEN',
      reason: config.syncDuringMarketHours
        ? 'Market is open and in-progress daily candle updates are enabled.'
        : 'Market is open, but in-progress daily candle updates are disabled for 1D strategy workflows.',
      todayTradingDate: tradingDate,
      nextSuggestedRunAt: closeAt.toISOString(),
    };
  }

  // Market has closed but the official end-of-day file is typically not
  // published until the finalization grace elapses (NSE bhavcopy ≈18:00 IST).
  // Wait rather than hammer the provider with attempts that 404. A multi-day
  // stale backlog is unaffected: the caller's missing-completed override
  // (scheduler + sync-gate) still triggers a catch-up inside this window.
  if (now > closeAt && now < closeGraceAt) {
    return {
      shouldRun: false,
      reasonCode: 'MARKET_CLOSED_NO_SYNC',
      sessionState: 'MARKET_CLOSED_NO_SYNC',
      reason: `${config.region} market closed; awaiting end-of-day file publication (eligible after the finalization grace).`,
      todayTradingDate: tradingDate,
      nextSuggestedRunAt: closeGraceAt.toISOString(),
    };
  }

  const todayCandleStored = latestStoredCandleInfo.latestTradingDate === tradingDate;
  const finalConfirmed = latestStoredCandleInfo.finalConfirmed === true;

  if (finalConfirmed && todayCandleStored && now >= closeGraceAt) {
    return {
      shouldRun: false,
      reasonCode: 'FINAL_CANDLE_CONFIRMED',
      sessionState: 'FINAL_CANDLE_CONFIRMED',
      reason: 'Final daily candle is already confirmed unchanged for this trading day.',
      todayTradingDate: tradingDate,
      nextSuggestedRunAt: nextOpenAt.toISOString(),
    };
  }

  if (now > closeAt && now <= postCloseEndAt) {
    return {
      shouldRun: true,
      reasonCode: 'POST_CLOSE_FINALIZATION_WINDOW',
      sessionState: 'POST_CLOSE_FINALIZATION_WINDOW',
      reason: 'Market is closed and still inside the final daily candle capture window.',
      todayTradingDate: tradingDate,
      nextSuggestedRunAt: addMinutes(now, 15).toISOString(),
    };
  }

  if (!todayCandleStored) {
    return {
      shouldRun: true,
      reasonCode: 'MISSING_FINAL_CANDLE_RETRY',
      sessionState: 'MARKET_CLOSED_NO_SYNC',
      reason: 'Post-close window ended, but today daily candle is still missing; one retry is useful.',
      todayTradingDate: tradingDate,
      nextSuggestedRunAt: addMinutes(now, 60).toISOString(),
    };
  }

  return {
    shouldRun: false,
    reasonCode: 'MARKET_CLOSED_NO_SYNC',
    sessionState: 'MARKET_CLOSED_NO_SYNC',
    reason: 'Market is closed and finalization window has ended.',
    todayTradingDate: tradingDate,
    nextSuggestedRunAt: nextOpenAt.toISOString(),
  };
}

export function tradingDateForRegion(region: string, now: Date = new Date()): string | null {
  const config = getMarketSessionConfig(region);
  return config ? zonedParts(now, config.timezone).date : null;
}

export function latestCompletedTradingDateForRegion(region: string, now: Date = new Date()): string | null {
  const config = getMarketSessionConfig(region);
  if (!config) return null;

  const local = zonedParts(now, config.timezone);
  const todayCloseAt = zonedDateTimeToUtc(local.date, config.regularClose, config.timezone);
  const finalCandleExpectedAt = addMinutes(todayCloseAt, config.finalizationGraceMinutes);
  const todayIsTradingDay = config.weekdays.includes(local.weekday) && !config.holidays.includes(local.date);

  if (todayIsTradingDay && now >= finalCandleExpectedAt) {
    return local.date;
  }

  return previousTradingDate(local.date, config);
}

function zonedParts(date: Date, timezone: string): { date: string; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  const weekdayText = get('weekday');
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayText);
  return { date: `${get('year')}-${get('month')}-${get('day')}`, weekday };
}

function zonedDateTimeToUtc(date: string, time: string, timezone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const offset = timeZoneOffsetMs(utcGuess, timezone);
  return new Date(utcGuess.getTime() - offset);
}

function timeZoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - date.getTime();
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function nextTradingOpenAfter(date: string, config: MarketSessionConfig): Date {
  const [year, month, day] = date.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0));
  for (let i = 0; i < 10; i += 1) {
    const local = zonedParts(cursor, config.timezone);
    if (config.weekdays.includes(local.weekday) && !config.holidays.includes(local.date)) {
      return zonedDateTimeToUtc(local.date, config.regularOpen, config.timezone);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return addMinutes(new Date(), 24 * 60);
}

function previousTradingDate(date: string, config: MarketSessionConfig): string | null {
  const [year, month, day] = date.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day - 1, 12, 0, 0));
  for (let i = 0; i < 10; i += 1) {
    const local = zonedParts(cursor, config.timezone);
    if (config.weekdays.includes(local.weekday) && !config.holidays.includes(local.date)) {
      return local.date;
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return null;
}
