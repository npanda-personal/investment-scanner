/**
 * Derived recent-result classification for Earnings-Intelligence.
 *
 * WHY THIS EXISTS
 * ----------------
 * The official-calendar path (`resolveResultDate`) is the authoritative source of
 * a result date and is the ONLY path that feeds UPCOMING_RESULTS,
 * PRE_RESULT_INTEREST and RESULT_REACTION_HISTORY.  For India that single field
 * doubles as both "next result" and "recent result": NSE's board-meeting date in
 * `officialResultDate` becomes a *recent past* date shortly after the meeting, so
 * the official path naturally yields a recent result and RESULT_WINNERS /
 * RESULT_DISAPPOINTMENTS populate.
 *
 * For the US (and any provider whose `officialResultDate` always holds the NEXT,
 * forward earnings date — e.g. Yahoo), that field is never a recent *past* date,
 * so the official path never produces a recent result and the Result Winners /
 * Disappointments buckets stay empty even though the most-recent reported quarter
 * is sitting right there in the fundamentals.
 *
 * This module adds a PARALLEL, clearly-estimated path that runs ONLY when the
 * official path did not already yield a recent past result.  It estimates when
 * the *last reported* quarter's result became available
 * (`periodEnd + quarterly/annual cadence lag`) and, if that estimated date lands
 * inside the recent-result window and on/before the snapshot, treats it as a
 * recent result for the winner/disappointment gates only.  It is labelled with a
 * distinct, honestly-estimated source (`ESTIMATED_FROM_PERIOD_CADENCE`) so it can
 * never be mistaken for an official date and never leaks into the official-only
 * buckets.
 *
 * The estimate is deliberately scoped: it is used solely to decide whether a row
 * qualifies as a recent winner/disappointment and to time the price-reaction
 * measurement.  The row-level `resultDate` / `resultDateSource` the engine
 * persists are left to the official path (so a US stock keeps its forward
 * Upcoming date and its "Official" label), and the recent classification rides on
 * an internal flag rather than overwriting that authoritative date.
 */
import { classifyPeriod, type EarningsPeriodClass } from './earnings-intelligence.period';
import { addDays, daysBetween, safeUtcDay } from './earnings-intelligence.date-utils';
import type { EarningsRegionConfig } from './earnings-intelligence.region-config';
import type { EarningsFundamentalInput } from './earnings-intelligence.types';

/**
 * Source label for a recent result whose date is ESTIMATED from the reported
 * period end plus the region's quarterly/annual reporting lag.  It is never an
 * official announcement date — the presentation layer maps it to a not-announced
 * warning, and the engine keeps it out of UPCOMING_RESULTS / PRE_RESULT_INTEREST.
 */
export const ESTIMATED_RECENT_RESULT_SOURCE = 'ESTIMATED_FROM_PERIOD_CADENCE' as const;

export interface DerivedRecentResult {
  /** True when the estimated last-result date is a recent past result. */
  applies: boolean;
  /** The estimated date the last reported quarter's result became available. */
  derivedResultDate: Date | null;
  /**
   * Price reaction (%) measured around the derived date with the SAME routine the
   * official path uses.  Null when no reaction window is available.
   */
  priceReaction: number | null;
}

/**
 * Estimate when the *most-recent reported* period's result became available:
 * its period end plus the region's reporting lag.  Unlike `expectedResultDate`
 * (which projects the NEXT result by first advancing a full cadence period), this
 * is the lag applied to the period that has ALREADY been reported.
 */
export function estimateLastResultDate(
  latest: EarningsFundamentalInput,
  periodClass: EarningsPeriodClass,
  config: EarningsRegionConfig
): Date | null {
  const periodEnd = safeUtcDay(latest.periodEndDate);
  if (!periodEnd) return null;
  // Quarterly and TTM both report on the quarterly cadence lag; annual uses the
  // longer annual lag.  Mirrors the cadence branch in `expectedResultDate`.
  if (periodClass === 'QUARTERLY' || periodClass === 'TTM') {
    return addDays(periodEnd, config.quarterlyCadenceLagDays);
  }
  return addDays(periodEnd, config.annualCadenceLagDays);
}

/**
 * Decide whether the derived recent-result path applies and, if so, compute the
 * price reaction around the estimated date.
 *
 * @param officialRecentResult  whether the official path already produced a
 *                              recent PAST result (the IN path).  When true this
 *                              function is a no-op — the official path wins and
 *                              the derived path must not double-fire or alter it.
 * @param computePriceReaction  the service's price-reaction routine, injected so
 *                              the derived path measures reaction identically to
 *                              the official path (just around the derived date).
 */
export function deriveRecentResult(params: {
  latest: EarningsFundamentalInput | null;
  snapshotDate: Date;
  config: EarningsRegionConfig;
  officialRecentResult: boolean;
  computePriceReaction: (resultDate: Date) => number | null;
}): DerivedRecentResult {
  const { latest, snapshotDate, config, officialRecentResult, computePriceReaction } = params;
  const none: DerivedRecentResult = { applies: false, derivedResultDate: null, priceReaction: null };

  // The official path already yielded a recent past result (IN): leave it alone.
  if (officialRecentResult) return none;
  if (!latest) return none;

  const periodClass = classifyPeriod(latest.periodType);
  const derivedResultDate = estimateLastResultDate(latest, periodClass, config);
  if (!derivedResultDate) return none;

  // Must be on/before the snapshot and inside the recent-result window.
  if (derivedResultDate > snapshotDate) return none;
  if (daysBetween(derivedResultDate, snapshotDate) > config.recentResultWindowDays) return none;

  return {
    applies: true,
    derivedResultDate,
    priceReaction: computePriceReaction(derivedResultDate),
  };
}
