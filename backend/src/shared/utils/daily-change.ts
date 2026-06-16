/**
 * Guards day-over-day price-change math against non-consecutive trading sessions.
 *
 * Several surfaces compute a "daily" move as (latest.close - previous.close) /
 * previous.close from the last two STORED price bars. When an instrument has a
 * data gap — the TEST_CONNECTED_CHAIN fixtures carry a ~1-yr hole, and any
 * instrument whose ingestion lapsed can too — those two "adjacent" bars are
 * actually months apart, so the "daily" move is really a multi-month move and
 * surfaces absurd values (e.g. TCS once showed -35.9% as its daily change).
 *
 * These helpers return null/false when the two bar dates are not adjacent
 * sessions, so a stale prior bar can never masquerade as a one-day move. Dates
 * may be a Date, an ISO string, or epoch millis — whatever the caller's bar
 * shape exposes.
 */

/** Max days between two bars still treated as consecutive sessions (covers weekends/holidays). */
export const MAX_ADJACENT_SESSION_GAP_DAYS = 7;

type SessionDate = Date | string | number | null | undefined;

function toEpochMs(value: SessionDate): number {
  if (value == null) return NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return Date.parse(value);
}

/**
 * True when `previousDate` is the trading session immediately preceding
 * `latestDate`: strictly earlier and within maxGapDays. Returns false when
 * either date is missing/unparseable.
 */
export function areAdjacentSessions(
  previousDate: SessionDate,
  latestDate: SessionDate,
  maxGapDays: number = MAX_ADJACENT_SESSION_GAP_DAYS,
): boolean {
  const prevMs = toEpochMs(previousDate);
  const latestMs = toEpochMs(latestDate);
  if (!Number.isFinite(prevMs) || !Number.isFinite(latestMs)) return false;
  const gapDays = (latestMs - prevMs) / 86_400_000;
  return gapDays > 0 && gapDays <= maxGapDays;
}

/**
 * Day-over-day change as a FRACTION (e.g. -0.012 = -1.2%; multiply by 100 for a
 * percent). Returns null when there is no usable prior close, a close is
 * non-finite, or the two bars are not consecutive sessions.
 */
export function dailyChangeFractionBetweenSessions(
  previousClose: number | null | undefined,
  previousDate: SessionDate,
  latestClose: number | null | undefined,
  latestDate: SessionDate,
  maxGapDays: number = MAX_ADJACENT_SESSION_GAP_DAYS,
): number | null {
  if (typeof previousClose !== 'number' || !(previousClose > 0)) return null;
  if (typeof latestClose !== 'number' || !Number.isFinite(latestClose)) return null;
  if (!areAdjacentSessions(previousDate, latestDate, maxGapDays)) return null;
  return (latestClose - previousClose) / previousClose;
}
