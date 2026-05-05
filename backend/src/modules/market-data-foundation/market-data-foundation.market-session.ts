import type { LatestStoredCandleInfo, MarketDataSchedulerDecision } from './market-data-foundation.types';
import { normalizeMarketRegion } from '../../shared/utils/market-scope';

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

export const DEFAULT_MARKET_SESSION_CONFIGS: Record<string, Omit<MarketSessionConfig, 'syncDuringMarketHours' | 'skipWeekends'>> = {
  IN: {
    region: 'IN',
    timezone: 'Asia/Kolkata',
    regularOpen: '09:15',
    regularClose: '15:30',
    postCloseSyncWindowMinutes: 120,
    finalizationGraceMinutes: 15,
    weekdays: [1, 2, 3, 4, 5],
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
    holidays: [],
  },
  EU: {
    region: 'EU',
    timezone: 'Europe/Berlin',
    regularOpen: '09:00',
    regularClose: '17:30',
    postCloseSyncWindowMinutes: 120,
    finalizationGraceMinutes: 15,
    weekdays: [1, 2, 3, 4, 5],
    holidays: [],
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
  return {
    ...base,
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
      reason: isHoliday ? `${config.region} market holiday.` : `${config.region} market weekend.`,
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
