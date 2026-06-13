// Date / exchange-trading-date / numeric-parse / hash leaf utilities extracted from
// MarketDataFoundationService. Free functions, no instance/repository state. Behavior is
// byte-identical to the prior private/public methods.
import { createHash } from 'crypto';
import { latestCompletedTradingDateForRegion } from '../ingestion/market-data-foundation.market-session';

export function startOfUtcDay(date: Date): Date {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

export function normalizeExchangeTradingDate(value: Date | string): Date {
  const date = value instanceof Date
    ? value
    : new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error('tradingDate must be a valid exchange trading date.');
  }
  return startOfUtcDay(date);
}

export function latestCompletedExchangeTradingDateOrThrow(region: string): Date {
  const latestCompletedDateKey = latestCompletedTradingDateForRegion(region);
  if (!latestCompletedDateKey) {
    throw new Error(`Latest completed trading date is unavailable for ${region}.`);
  }
  return normalizeExchangeTradingDate(latestCompletedDateKey);
}

export function exchangeDateKey(date: Date): string {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

export function addUtcDays(date: Date, days: number): Date {
  const next = startOfUtcDay(date);
  next.setUTCDate(next.getUTCDate() + days);
  return startOfUtcDay(next);
}

export function exchangeBackfillDates(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const cursor = startOfUtcDay(startDate);
  const stop = startOfUtcDay(endDate);
  while (cursor.getTime() <= stop.getTime()) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function isWeekdayTradingCandidate(date: Date): boolean {
  const day = startOfUtcDay(date).getUTCDay();
  return day !== 0 && day !== 6;
}

export function endOfTradingDateUtc(tradingDate: string | null): Date {
  const safeDate = tradingDate || new Date().toISOString().slice(0, 10);
  return new Date(`${safeDate}T23:59:59.999Z`);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function defaultBackfillStartDate(anchorDate?: string | Date): Date {
  const date = anchorDate instanceof Date
    ? new Date(anchorDate)
    : anchorDate
      ? new Date(`${anchorDate}T00:00:00.000Z`)
      : new Date();
  date.setUTCFullYear(date.getUTCFullYear() - 15);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function parseMarketDataNumber(value: string): number | null {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized || normalized === '-' || /^NA$/i.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseCatalogDate(value: string): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }
  const dmyDate = /^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{2,4})$/.exec(trimmed);
  if (dmyDate) {
    const [, day, monthText, yearText] = dmyDate;
    const monthIndex = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].indexOf(monthText.slice(0, 3).toUpperCase());
    if (monthIndex >= 0) {
      const shortYear = Number(yearText);
      const year = yearText.length === 2 ? (shortYear >= 70 ? 1900 + shortYear : 2000 + shortYear) : shortYear;
      return new Date(Date.UTC(year, monthIndex, Number(day)));
    }
  }
  const numericDmyDate = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/.exec(trimmed);
  if (numericDmyDate) {
    const [, dayText, monthText, yearText] = numericDmyDate;
    const shortYear = Number(yearText);
    const year = yearText.length === 2 ? (shortYear >= 70 ? 1900 + shortYear : 2000 + shortYear) : shortYear;
    return new Date(Date.UTC(year, Number(monthText) - 1, Number(dayText)));
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
