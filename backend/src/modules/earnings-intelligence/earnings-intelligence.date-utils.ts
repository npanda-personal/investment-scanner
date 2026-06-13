/**
 * UTC date helpers for Earnings-Intelligence.
 *
 * These were previously private methods on the service; they are pure,
 * dependency-free, and reused across the service, repository, and the date-source
 * adapters, so they live here as standalone functions.  Everything operates on
 * UTC-midnight boundaries to keep snapshot maths timezone-stable.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Truncate a Date to UTC midnight of the same calendar day. */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** UTC-midnight of `date`, or null if the value is missing/invalid. */
export function safeUtcDay(date: Date | null | undefined): Date | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return startOfUtcDay(date);
}

/** Numeric UTC-midnight time for sorting; missing/invalid sorts oldest. */
export function dateTime(date: Date | null | undefined): number {
  return safeUtcDay(date)?.getTime() ?? Number.NEGATIVE_INFINITY;
}

/** Add `days` calendar days (UTC). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Add `months` calendar months (UTC), clamping to the target month's last day. */
export function addMonths(date: Date, months: number): Date {
  const targetMonth = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(date.getUTCDate(), lastDay)));
}

/** Whole-day difference `right - left` measured at UTC-midnight boundaries. */
export function daysBetween(left: Date, right: Date): number {
  const leftDay = startOfUtcDay(left).getTime();
  const rightDay = startOfUtcDay(right).getTime();
  return Math.round((rightDay - leftDay) / MS_PER_DAY);
}

/** Most-recent valid date from the list, or null when none are valid. */
export function maxDate(values: Array<Date | null | undefined>): Date | null {
  return (
    values
      .filter((value): value is Date => Boolean(value && !Number.isNaN(value.getTime())))
      .sort((left, right) => right.getTime() - left.getTime())[0] || null
  );
}

/** Round to two decimal places (the canonical precision for all snapshot metrics). */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
