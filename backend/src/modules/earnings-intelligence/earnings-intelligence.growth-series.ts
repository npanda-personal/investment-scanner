/**
 * Pure QoQ/YoY growth-series maths for Earnings Intelligence.
 *
 * All functions are standalone (no class state) so they can be unit-tested and
 * shared across calculation contexts without instantiating the full service.
 * Input sorting, prior-period resolution, growth-delta series, and date-cadence
 * projections all live here.
 */
import {
  addDays,
  addMonths,
  dateTime,
  daysBetween,
  round2,
  safeUtcDay,
} from './earnings-intelligence.date-utils';
import type { EarningsPeriodClass } from './earnings-intelligence.period';
import type { EarningsRegionConfig } from './earnings-intelligence.region-config';
import type { EarningsFundamentalInput, EarningsResultDateSource } from './earnings-intelligence.types';

// ── Sorting ──────────────────────────────────────────────────────────────────

export function sortFundamentals(records: EarningsFundamentalInput[]): EarningsFundamentalInput[] {
  return [...records].sort((left, right) => dateTime(right.periodEndDate) - dateTime(left.periodEndDate));
}

export function sortPricesAscending<T extends { timestamp: Date }>(prices: T[]): T[] {
  return [...prices].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
}

// ── Primitive growth delta ────────────────────────────────────────────────────

export function growth(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

// ── Period-prior resolution ───────────────────────────────────────────────────

/**
 * Same-period-type records strictly older than `latest`, newest-first.  Shared by
 * the QoQ (most-recent prior) and YoY (year-ago match) selectors so both look at
 * an identical, like-against-like candidate set.
 */
export function sameTypePriorsDesc(
  latest: EarningsFundamentalInput,
  records: EarningsFundamentalInput[],
): EarningsFundamentalInput[] {
  const latestPeriodEnd = safeUtcDay(latest.periodEndDate);
  if (!latestPeriodEnd) return [];
  return records
    .filter((record) => {
      const recordPeriodEnd = safeUtcDay(record.periodEndDate);
      return Boolean(
        recordPeriodEnd &&
          record.id !== latest.id &&
          record.periodType === latest.periodType &&
          recordPeriodEnd < latestPeriodEnd,
      );
    })
    .sort((left, right) => dateTime(right.periodEndDate) - dateTime(left.periodEndDate));
}

/**
 * QoQ comparable: the most-recent prior period of the same type — the dense,
 * always-available basis used for the legacy growth alias and downstream scoring.
 */
export function findPriorQuarter(
  latest: EarningsFundamentalInput,
  records: EarningsFundamentalInput[],
): EarningsFundamentalInput | null {
  return sameTypePriorsDesc(latest, records)[0] ?? null;
}

/**
 * YoY comparable: the same calendar period one year ago (same month, 300–430d
 * back).  Returns null when no true year-ago record exists — the caller then
 * reports YoY = null rather than silently falling back to the prior quarter.
 */
export function findYearAgoRecord(
  latest: EarningsFundamentalInput,
  records: EarningsFundamentalInput[],
): EarningsFundamentalInput | null {
  const latestPeriodEnd = safeUtcDay(latest.periodEndDate);
  if (!latestPeriodEnd) return null;
  return (
    sameTypePriorsDesc(latest, records).find((record) => {
      const recordPeriodEnd = safeUtcDay(record.periodEndDate);
      if (!recordPeriodEnd) return false;
      const monthMatches = recordPeriodEnd.getUTCMonth() === latestPeriodEnd.getUTCMonth();
      const diffDays = daysBetween(recordPeriodEnd, latestPeriodEnd);
      return monthMatches && diffDays >= 300 && diffDays <= 430;
    }) ?? null
  );
}

// ── Date cadence projection ───────────────────────────────────────────────────

export function expectedResultDate(
  latest: EarningsFundamentalInput,
  periodClass: EarningsPeriodClass,
  config: EarningsRegionConfig,
): Date | null {
  const periodEnd = safeUtcDay(latest.periodEndDate);
  if (!periodEnd) return null;
  // Quarterly and TTM cadences both refresh each quarter; annual uses the
  // longer year cadence.  All offsets come from the region config.
  if (periodClass === 'QUARTERLY' || periodClass === 'TTM') {
    const nextPeriodEnd = addMonths(periodEnd, config.quarterlyCadenceMonths);
    return addDays(nextPeriodEnd, config.quarterlyCadenceLagDays);
  }
  return addDays(addMonths(periodEnd, config.annualCadenceMonths), config.annualCadenceLagDays);
}

export function resolveResultDate(
  latest: EarningsFundamentalInput | null,
  projectedResultDate: Date | null,
  snapshotDate: Date,
  config: EarningsRegionConfig,
): {
  resultDate: Date | null;
  resultDateSource: EarningsResultDateSource;
  daysToResult: number | null;
} {
  if (!latest) {
    return { resultDate: null, resultDateSource: 'UNKNOWN', daysToResult: null };
  }

  const officialResultDate = safeUtcDay(latest.officialResultDate ?? null);
  if (officialResultDate) {
    const daysToResult = daysBetween(snapshotDate, officialResultDate);
    if (daysToResult >= 0) {
      // A forward official board-meeting date is always authoritative.
      return { resultDate: officialResultDate, resultDateSource: 'OFFICIAL_CALENDAR', daysToResult };
    }
    // A PAST official date is the announcement of an already-reported result.  While
    // that result is still recent it stays authoritative — it drives RESULT_REACTION_
    // HISTORY and the winner / disappointment classification (officialRecentResult is
    // gated on the same recent window).  Once it ages past that window, fall through to
    // the forward cadence estimate below so UPCOMING_RESULTS / PRE_RESULT_INTEREST
    // populate for the NEXT period instead of pinning to a stale past date forever.
    const daysSinceResult = daysBetween(officialResultDate, snapshotDate);
    if (daysSinceResult <= config.recentResultWindowDays) {
      return { resultDate: officialResultDate, resultDateSource: 'OFFICIAL_CALENDAR', daysToResult: null };
    }
  }

  // Phase 3: emit an honest forward estimate projected from the persisted period
  // cadence (periodEnd + cadence + lag), surfaced with an "Estimated" badge.  Only
  // when the projection is still in the future; a past projection means the result
  // is overdue with no official date, which stays DATE_TBA (no fabricated date).
  if (projectedResultDate) {
    const daysToResult = daysBetween(snapshotDate, projectedResultDate);
    return daysToResult >= 0
      ? { resultDate: projectedResultDate, resultDateSource: 'ESTIMATED_FROM_CADENCE', daysToResult }
      : { resultDate: null, resultDateSource: 'DATE_TBA', daysToResult: null };
  }

  const periodEndDate = safeUtcDay(latest.periodEndDate);
  if (periodEndDate) {
    return { resultDate: periodEndDate, resultDateSource: 'PERIOD_END_DATE_FALLBACK', daysToResult: null };
  }

  const validatedAt = safeUtcDay(latest.validatedAt ?? null);
  if (validatedAt) {
    return { resultDate: validatedAt, resultDateSource: 'VALIDATED_AT_FALLBACK', daysToResult: null };
  }

  return { resultDate: null, resultDateSource: 'UNKNOWN', daysToResult: null };
}

// ── QoQ series + trend scoring ────────────────────────────────────────────────

/**
 * Consecutive QoQ growth values for a metric across a same-period-type series
 * (newest-first input), returned newest-first.  Reuses the standard QoQ delta;
 * pairs with a null/zero base are skipped so only valid deltas accumulate.
 */
export function qoqGrowthSeries(
  seriesNewestFirst: EarningsFundamentalInput[],
  metric: 'revenue' | 'netIncome' | 'eps',
): number[] {
  const series: number[] = [];
  for (let index = 0; index < seriesNewestFirst.length - 1; index += 1) {
    const value = growth(
      seriesNewestFirst[index][metric] as number | null,
      seriesNewestFirst[index + 1][metric] as number | null,
    );
    if (value !== null) series.push(value);
  }
  return series;
}

/** Mean of the most-recent ≤`count` QoQ values (newest-first input); null below `minCount`. */
export function averageOfRecentQoQ(
  seriesNewestFirst: number[],
  count: number,
  minCount: number,
): number | null {
  if (seriesNewestFirst.length < minCount) return null;
  const window = seriesNewestFirst.slice(0, count);
  const sum = window.reduce((acc, value) => acc + value, 0);
  return round2(sum / window.length);
}

/**
 * Growth-tab score from the trailing QoQ EPS deltas (newest-first).  Recency-weighted
 * mean (newest delta weighted highest) plus a 0–10 bonus scaled by how many consecutive
 * steps are rising — so a company whose QoQ EPS growth is both high AND accelerating
 * ranks above one that is merely high.  Null below 2 deltas (needs ≥3 EPS-bearing
 * quarters) — the floor for a multi-quarter trend, and the depth US (TTM-only, ~3 rows
 * per name) actually carries, so the Growth tab populates for both IN and US.
 */
export function epsGrowthTrendScore(epsQoQSeriesNewestFirst: number[]): number | null {
  if (epsQoQSeriesNewestFirst.length < 2) return null;
  const window = epsQoQSeriesNewestFirst.slice(0, 4);
  let weightedSum = 0;
  let weightTotal = 0;
  window.forEach((value, index) => {
    const weight = window.length - index; // newest (index 0) gets the largest weight
    weightedSum += value * weight;
    weightTotal += weight;
  });
  const weightedMean = weightedSum / weightTotal;
  let risingSteps = 0;
  for (let index = 0; index < window.length - 1; index += 1) {
    // window is newest-first: window[index] is newer than window[index + 1].
    if (window[index] > window[index + 1]) risingSteps += 1;
  }
  const maxSteps = window.length - 1;
  // Bonus measures trajectory *improvement* (each delta higher than the prior), not
  // positive growth per se — a still-shrinking-but-decelerating series can earn it.
  // Acceptable: this is a signed ordering-only score, never displayed or gated on
  // sign, and the recency-weighted mean keeps truly-growing names on top.
  const uptrendBonus = maxSteps > 0 ? (risingSteps / maxSteps) * 10 : 0;
  return round2(weightedMean + uptrendBonus);
}

// ── Margin helpers ────────────────────────────────────────────────────────────

export function margin(record: EarningsFundamentalInput): number | null {
  if (record.revenue === null || record.netIncome === null || record.revenue === 0) return null;
  return (record.netIncome / Math.abs(record.revenue)) * 100;
}

export function marginTrend(
  current: EarningsFundamentalInput | null | undefined,
  previous: EarningsFundamentalInput | null | undefined,
): number | null {
  const currentMargin = current ? margin(current) : null;
  const previousMargin = previous ? margin(previous) : null;
  if (currentMargin === null || previousMargin === null) return null;
  return round2(currentMargin - previousMargin);
}

// ── Consistency + acceleration scores ────────────────────────────────────────

export function calculateConsistencyScore(records: EarningsFundamentalInput[]): number {
  const sorted = sortFundamentals(records).slice(0, 6).reverse();
  let checks = 0;
  let passed = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    for (const metric of ['revenue', 'netIncome', 'eps'] as const) {
      if (current[metric] === null || previous[metric] === null || previous[metric] === 0) continue;
      checks += 1;
      if ((current[metric] as number) >= (previous[metric] as number)) passed += 1;
    }
    const previousMargin = margin(previous);
    const currentMargin = margin(current);
    if (previousMargin !== null && currentMargin !== null) {
      checks += 1;
      if (currentMargin >= previousMargin) passed += 1;
    }
  }
  return checks === 0 ? 0 : round2((passed / checks) * 100);
}

export function calculateAccelerationScore(records: EarningsFundamentalInput[]): number {
  const sorted = sortFundamentals(records).slice(0, 6).reverse();
  let checks = 0;
  let passed = 0;
  for (const metric of ['revenue', 'netIncome', 'eps'] as const) {
    const growthRates: number[] = [];
    for (let index = 1; index < sorted.length; index += 1) {
      const g = growth(sorted[index][metric] as number | null, sorted[index - 1][metric] as number | null);
      if (g !== null) growthRates.push(g);
    }
    if (growthRates.length >= 2) {
      checks += 1;
      if (growthRates[growthRates.length - 1] > growthRates[growthRates.length - 2]) passed += 1;
    }
  }
  const marginDeltas: number[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const delta = marginTrend(sorted[index], sorted[index - 1]);
    if (delta !== null) marginDeltas.push(delta);
  }
  if (marginDeltas.length >= 2) {
    checks += 1;
    if (marginDeltas[marginDeltas.length - 1] > marginDeltas[marginDeltas.length - 2]) passed += 1;
  }
  return checks === 0 ? 0 : round2((passed / checks) * 100);
}
