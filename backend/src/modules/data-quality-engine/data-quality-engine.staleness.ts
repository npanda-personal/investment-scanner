/**
 * Single staleness primitive for the Data Quality Engine.
 *
 * Previously the engine had TWO methods that measured the same thing with
 * different fallback behavior: `isPriceStale` (calendar-day fallback of 7 days)
 * and `staleSessions` (returned 0 on calendar failure). For an unknown-calendar
 * region they could disagree — one flagging stale while the other recorded
 * "fresh". This module computes both the numeric session count and the boolean
 * from one code path so they are always consistent.
 */
import { expectedLatestTradingDate, tradingSessionsBetween } from '../market-data-foundation';
import type { DataQualityConfig } from './data-quality-engine.config';

const DAY_MS = 86_400_000;
/** Sentinel session count used when there is no price at all. */
export const MAX_STALE_SESSIONS = 99;

export interface StalenessResult {
  /** Trading sessions (or calendar days, for continuous markets) behind. */
  staleSessions: number;
  isStale: boolean;
  calendarUncertain: boolean;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function calendarDaysBehind(latestDate: Date, asOf: Date): number {
  return Math.max(0, Math.floor((asOf.getTime() - latestDate.getTime()) / DAY_MS));
}

/**
 * Compute staleness for a price as of `asOf` using the supplied config.
 *
 * - CONTINUOUS markets (crypto) treat every calendar day as a session.
 * - SESSIONS markets use the region trading calendar; if that calendar is
 *   unavailable they fall back to a calendar-day window — the SAME window used
 *   for both the numeric count and the boolean, so the two never disagree.
 */
export function computeStaleness(
  latestDate: Date | null,
  config: DataQualityConfig,
  asOf: Date = new Date(),
): StalenessResult {
  if (!latestDate) {
    return { staleSessions: MAX_STALE_SESSIONS, isStale: true, calendarUncertain: false };
  }

  if (config.tradingMode === 'CONTINUOUS') {
    const daysBehind = calendarDaysBehind(latestDate, asOf);
    return {
      staleSessions: daysBehind,
      isStale: daysBehind > config.staleSessionThreshold,
      calendarUncertain: false,
    };
  }

  const { date: expectedDate } = expectedLatestTradingDate(config.calendarRegion, asOf);
  if (!expectedDate) {
    // Calendar unavailable — consistent calendar-day fallback for BOTH outputs.
    const daysBehind = calendarDaysBehind(latestDate, asOf);
    return {
      staleSessions: daysBehind,
      isStale: daysBehind > config.staleFallbackDays,
      calendarUncertain: true,
    };
  }

  const latestDateStr = isoDate(latestDate);
  if (latestDateStr >= expectedDate) {
    return { staleSessions: 0, isStale: false, calendarUncertain: false };
  }

  // tradingSessionsBetween counts both endpoints — subtract 1 so a price ON the
  // expected date is 0 sessions behind.
  const { count } = tradingSessionsBetween(config.calendarRegion, latestDateStr, expectedDate);
  const sessionsBehind = Math.max(0, count - 1);
  return {
    staleSessions: sessionsBehind,
    isStale: sessionsBehind > config.staleSessionThreshold,
    calendarUncertain: false,
  };
}
