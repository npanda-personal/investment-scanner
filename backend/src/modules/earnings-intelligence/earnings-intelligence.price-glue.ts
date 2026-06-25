/**
 * Price/delivery pure helpers for Earnings Intelligence.
 *
 * Extracted from the service: deliveryInterest, priceReaction, priceMove, freshness.
 * All are pure functions (no class state, no I/O).
 *
 * `priceReaction` uses `addTradingSessions` from market-data-foundation to
 * convert a result date + session count into the correct target date.
 */
import { addTradingSessions } from '../market-data-foundation';
import { daysBetween, round2, safeUtcDay } from './earnings-intelligence.date-utils';
import type { EarningsRegionConfig } from './earnings-intelligence.region-config';
import type {
  EarningsDeliveryInput,
  EarningsFreshness,
  EarningsFundamentalInput,
  EarningsPricePointInput,
} from './earnings-intelligence.types';

export function deliveryInterest(
  deliverySnapshots: EarningsDeliveryInput[],
  config: EarningsRegionConfig,
): boolean {
  const recent = [...deliverySnapshots]
    .filter((snapshot) => snapshot.deliveryPercent !== null)
    .sort((left, right) => right.tradingDate.getTime() - left.tradingDate.getTime())
    .slice(0, 10);
  if (recent.length === 0) return false;
  const latest = recent[0].deliveryPercent ?? 0;
  const average =
    recent.reduce((sum, snapshot) => sum + Number(snapshot.deliveryPercent || 0), 0) / recent.length;
  return latest >= config.deliveryInterestAbsolutePercent || latest >= average + config.deliveryInterestRelativePercent;
}

/**
 * Calculate the price reaction following an earnings result.
 *
 * The "after" bar is the first available bar at or after
 * `resultDate + config.priceReactionSessions` trading sessions.  Using trading
 * sessions instead of raw calendar days means holiday / long-weekend clusters
 * do not shift the comparison bar into a different trading week.
 *
 * Holiday-calendar injection is not available at this synchronous call site;
 * `addTradingSessions` is called weekend-only (no holiday set), which is safe:
 * in the worst case the target date is one calendar day early and the
 * `sorted.find` scan then naturally picks the next available bar.
 */
export function priceReaction(
  prices: EarningsPricePointInput[],
  resultDate: Date,
  region: string,
  config: EarningsRegionConfig,
): number | null {
  const sorted = [...prices].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
  if (sorted.length < 2) return null;
  const before = [...sorted].reverse().find((price) => price.timestamp <= resultDate);
  if (!before || before.close <= 0) return null;

  const sessions = config.priceReactionSessions;
  const resultDateStr = resultDate.toISOString().slice(0, 10);
  const { date: targetDateStr } = addTradingSessions(region, resultDateStr, sessions);
  const targetMs = targetDateStr
    ? Date.parse(`${targetDateStr}T00:00:00.000Z`)
    // Weekend-only fallback (~7 calendar days per 5 sessions) when the region's
    // trading calendar is unavailable.
    : resultDate.getTime() + (sessions * 7 * 24 * 60 * 60 * 1000) / 5;

  const after = sorted.find((price) => price.timestamp.getTime() >= targetMs);
  if (!after) return null;
  return round2(((after.close - before.close) / before.close) * 100);
}

export function priceMove(
  prices: EarningsPricePointInput[],
  lookbackBars: number,
): number | null {
  const sorted = [...prices].sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
  if (sorted.length <= lookbackBars) return null;
  const latest = sorted[0];
  const previous = sorted[lookbackBars];
  if (previous.close <= 0) return null;
  return round2(((latest.close - previous.close) / previous.close) * 100);
}

export function freshness(
  snapshotDate: Date,
  latest: EarningsFundamentalInput | null,
  config: EarningsRegionConfig,
): EarningsFreshness {
  if (!latest) return 'MISSING';
  const latestDate = safeUtcDay(latest.periodEndDate);
  const ageDays = latestDate ? daysBetween(latestDate, snapshotDate) : Number.POSITIVE_INFINITY;
  if (ageDays <= config.freshnessFreshMaxDays) return 'FRESH';
  if (ageDays <= config.freshnessPartialMaxDays) return 'PARTIAL';
  return 'STALE';
}
