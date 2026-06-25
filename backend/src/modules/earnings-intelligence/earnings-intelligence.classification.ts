/**
 * Result classification + tag generation for Earnings Intelligence.
 *
 * All functions are pure (no class state, no I/O) so they compose cleanly inside
 * calculateSnapshot and can be unit-tested in isolation.
 */
import { classifyPeriod, type EarningsPeriodClass } from './earnings-intelligence.period';
import type { EarningsRegionConfig } from './earnings-intelligence.region-config';
import type {
  EarningsFreshness,
  EarningsFundamentalInput,
  EarningsIntelligenceCategory,
  EarningsPricePointInput,
  EarningsResultDateSource,
} from './earnings-intelligence.types';
import {
  emptyCategoryBuckets,
  emptyCategoryCounts,
  EARNINGS_INTELLIGENCE_CATEGORIES,
} from './earnings-intelligence.categories';
import type { EarningsSnapshotDto } from './earnings-intelligence.types';

// ── Post-result classification ────────────────────────────────────────────────

/**
 * Resolve the post-result classification to a single bucket.  Both the winner
 * and disappointment guardrails can fire for the same row (strong growth that
 * still sold off, or two strong metrics alongside one sharp decline).  When
 * they conflict, the dominant side wins by net evidence (signed growth metrics
 * + margin direction + price-reaction direction) and `mixed` is set so the row
 * can be tagged MIXED_RESULT.  Returns {false,false,false} when no recent
 * result is in scope.
 */
export function classifyResult(input: {
  recentResult: boolean;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  marginTrend: number | null;
  consistencyScore: number;
  accelerationScore: number;
  priceReaction: number | null;
}): { winner: boolean; disappointment: boolean; mixed: boolean } {
  if (!input.recentResult) return { winner: false, disappointment: false, mixed: false };
  const winner = isWinner(input);
  const disappointment = isDisappointment(input);
  if (winner && disappointment) {
    const net = netResultScore(input);
    return net >= 0
      ? { winner: true, disappointment: false, mixed: true }
      : { winner: false, disappointment: true, mixed: true };
  }
  return { winner, disappointment, mixed: false };
}

/**
 * Net *magnitude-aware* evidence for a mixed result.  Sign alone is misleading:
 * a row needs >= 2 positive growth metrics to be a winner at all, so a sign-only
 * sum could never go negative — a -30% EPS collapse beside two small positives
 * would wrongly read as a winner.  Each growth metric and the price reaction is
 * therefore clamped to a sane band (so one extreme outlier can't dominate, but a
 * large miss still outweighs small gains) and summed; margin trend adds a small
 * tilt.  >= 0 leans winner, < 0 leans disappointment.
 */
export function netResultScore(input: {
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  marginTrend: number | null;
  priceReaction: number | null;
}): number {
  const clamp = (value: number, bound: number) => Math.max(-bound, Math.min(bound, value));
  let net = 0;
  for (const value of [input.revenueGrowth, input.profitGrowth, input.epsGrowth]) {
    if (value !== null) net += clamp(value, 50);
  }
  if (input.priceReaction !== null) net += clamp(input.priceReaction, 15);
  if (input.marginTrend !== null) net += clamp(input.marginTrend, 10);
  return net;
}

export function isWinner(input: {
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  marginTrend: number | null;
  consistencyScore: number;
  accelerationScore: number;
  priceReaction: number | null;
}): boolean {
  const positiveGrowthCount = [input.revenueGrowth, input.profitGrowth, input.epsGrowth].filter(
    (value) => value !== null && value > 0,
  ).length;
  return (
    positiveGrowthCount >= 2 &&
    (input.marginTrend === null || input.marginTrend >= 0) &&
    (input.consistencyScore >= 60 ||
      input.accelerationScore >= 60 ||
      (input.priceReaction !== null && input.priceReaction >= 2))
  );
}

export function isDisappointment(input: {
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  marginTrend: number | null;
  priceReaction: number | null;
}): boolean {
  return (
    [input.revenueGrowth, input.profitGrowth, input.epsGrowth].some(
      (value) => value !== null && value <= -5,
    ) ||
    (input.marginTrend !== null && input.marginTrend <= -2) ||
    (input.priceReaction !== null && input.priceReaction <= -3)
  );
}

// ── Tag generators ────────────────────────────────────────────────────────────

export function reasonTags(input: {
  latest: EarningsFundamentalInput | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  marginTrend: number | null;
  consistencyScore: number;
  accelerationScore: number;
  deliveryInterest: boolean;
  priceReaction: number | null;
  preResultPriceMove: number | null;
  upcoming: boolean;
  /** Recent result classified via the estimated period-cadence date (US path). */
  derivedRecentResult: boolean;
  /** Set when the result tripped BOTH winner and disappointment guardrails. */
  mixedResult: boolean;
  resultDateSource: EarningsResultDateSource;
  config: EarningsRegionConfig;
}): string[] {
  const tags: string[] = [];
  if (!input.latest) return tags;
  const periodClass: EarningsPeriodClass = classifyPeriod(input.latest.periodType);
  if (periodClass === 'QUARTERLY') tags.push('LATEST_QUARTERLY_RESULT');
  if (periodClass === 'ANNUAL') tags.push('LATEST_ANNUAL_RESULT');
  if (periodClass === 'TTM') tags.push('LATEST_TTM_RESULT');
  if (input.latest.source === 'MANUAL_VERIFIED') tags.push('MANUAL_VERIFIED_RESULT');
  if (input.revenueGrowth !== null && input.revenueGrowth > 0) tags.push('REVENUE_GROWTH_POSITIVE');
  if (input.profitGrowth !== null && input.profitGrowth > 0) tags.push('PROFIT_GROWTH_POSITIVE');
  if (input.epsGrowth !== null && input.epsGrowth > 0) tags.push('EPS_GROWTH_POSITIVE');
  if (input.marginTrend !== null && input.marginTrend >= 0) tags.push('MARGIN_STABLE_OR_EXPANDING');
  if (input.consistencyScore >= 70) tags.push('CONSISTENT_EARNINGS_PROGRESS');
  if (input.accelerationScore >= 70) tags.push('EARNINGS_ACCELERATION');
  if (input.deliveryInterest) tags.push('PRE_RESULT_DELIVERY_INTEREST');
  if (
    input.preResultPriceMove !== null &&
    input.preResultPriceMove >= input.config.preResultPriceMoveThresholdPercent
  )
    tags.push('PRE_RESULT_PRICE_INTEREST');
  if (input.priceReaction !== null && input.priceReaction >= 2) tags.push('POSITIVE_RESULT_REACTION');
  if (input.mixedResult) tags.push('MIXED_RESULT'); // tripped both winner and disappointment guardrails
  if (input.upcoming) tags.push('RESULT_WINDOW_ESTIMATED_FROM_PERSISTED_PERIODS');
  if (input.derivedRecentResult) tags.push('RECENT_RESULT_ESTIMATED_FROM_PERIOD_CADENCE'); // timed from period end + lag, not official
  if (input.resultDateSource === 'OFFICIAL_CALENDAR') tags.push('OFFICIAL_RESULT_DATE');
  if (input.resultDateSource === 'PERIOD_END_DATE_FALLBACK')
    tags.push('RESULT_DATE_FROM_PERIOD_END_FALLBACK');
  else if (input.resultDateSource === 'VALIDATED_AT_FALLBACK')
    tags.push('RESULT_DATE_FROM_VALIDATION_TIMESTAMP_FALLBACK');
  return [...new Set(tags)];
}

export function riskTags(input: {
  latest: EarningsFundamentalInput | null;
  quarterlyCount: number;
  annualCount: number;
  ttmCount: number;
  freshness: EarningsFreshness;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  marginTrend: number | null;
  consistencyScore: number;
  priceReaction: number | null;
  prices: EarningsPricePointInput[];
  estimatedResultDate: boolean;
  authoritativeResultDate: boolean;
}): string[] {
  const tags: string[] = [];
  if (!input.latest) tags.push('MISSING_EARNINGS_FUNDAMENTALS');
  if (input.estimatedResultDate) tags.push('ESTIMATED_RESULT_DATE');
  // A TTM series (US trailing-twelve-month) is genuine earnings data: it should
  // not be reported as both "missing quarterly" and "missing annual".  Only flag
  // the gap when there is no usable series of any kind for that cadence.
  if (input.quarterlyCount === 0 && input.ttmCount === 0) tags.push('MISSING_QUARTERLY_RESULTS');
  if (input.annualCount === 0 && input.ttmCount === 0) tags.push('MISSING_ANNUAL_RESULTS');
  if (input.freshness === 'STALE') tags.push('STALE_EARNINGS_DATA');
  if (input.freshness === 'PARTIAL') tags.push('PARTIAL_EARNINGS_FRESHNESS');
  if (
    [input.revenueGrowth, input.profitGrowth, input.epsGrowth].some(
      (value) => value !== null && value < 0,
    )
  )
    tags.push('NEGATIVE_GROWTH_PRESENT');
  if (input.marginTrend !== null && input.marginTrend < 0) tags.push('MARGIN_COMPRESSION');
  if (input.consistencyScore > 0 && input.consistencyScore < 50) tags.push('LOW_EARNINGS_CONSISTENCY');
  if (input.prices.length === 0) tags.push('MISSING_PRICE_REACTION_DATA');
  else if (!input.authoritativeResultDate) tags.push('PRICE_REACTION_REQUIRES_OFFICIAL_RESULT_DATE');
  else if (input.priceReaction === null) tags.push('INSUFFICIENT_RESULT_REACTION_WINDOW');
  return [...new Set(tags)];
}

// ── Category membership ───────────────────────────────────────────────────────

export function categories(input: {
  snapshotDate: Date;
  resultDate: Date | null;
  resultDateSource: EarningsResultDateSource;
  daysToResult: number | null;
  consistencyScore: number;
  accelerationScore: number;
  deliveryInterest: boolean;
  priceReaction: number | null;
  preResultPriceMove: number | null;
  freshness: EarningsFreshness;
  config: EarningsRegionConfig;
  // Pre-resolved, mutually-exclusive post-result classification (see classifyResult).
  winner: boolean;
  disappointment: boolean;
  // True when a QoQ-EPS trend is computable (≥3 EPS quarters) → Growth-tab population.
  growthEligible: boolean;
}): EarningsIntelligenceCategory[] {
  const result: EarningsIntelligenceCategory[] = [];
  const hasAuthoritativeResultDate = input.resultDateSource === 'OFFICIAL_CALENDAR';
  // A forward result date — official OR the Phase 3 honest cadence estimate — can
  // populate UPCOMING_RESULTS / PRE_RESULT_INTEREST so those tabs are not empty
  // year-round.  RESULT_REACTION_HISTORY stays gated on the official date only.
  const hasForwardResultDate =
    input.resultDateSource === 'OFFICIAL_CALENDAR' ||
    input.resultDateSource === 'ESTIMATED_FROM_CADENCE';
  const upcoming =
    input.daysToResult !== null &&
    input.daysToResult >= 0 &&
    input.daysToResult <= input.config.upcomingWindowDays &&
    hasForwardResultDate;
  if (upcoming) result.push('UPCOMING_RESULTS');
  if (
    upcoming &&
    (input.deliveryInterest ||
      (input.preResultPriceMove !== null &&
        input.preResultPriceMove >= input.config.preResultPriceMoveThresholdPercent))
  ) {
    result.push('PRE_RESULT_INTEREST');
  }
  // Growth tab: a broad population — any instrument with a computable QoQ-EPS trend,
  // independent of an upcoming date.  Ranked read-time by epsGrowthTrendScore.
  if (input.growthEligible) result.push('GROWTH');
  // Winner and disappointment are mutually exclusive (resolved upstream) so a
  // row never contradicts itself across the two tabs.
  if (input.winner) result.push('RESULT_WINNERS');
  if (input.disappointment) result.push('RESULT_DISAPPOINTMENTS');
  if (input.priceReaction !== null && hasAuthoritativeResultDate)
    result.push('RESULT_REACTION_HISTORY');
  if (
    input.freshness !== 'MISSING' &&
    (input.consistencyScore >= 70 ||
      input.accelerationScore >= 70 ||
      result.includes('PRE_RESULT_INTEREST') ||
      result.includes('RESULT_WINNERS'))
  ) {
    result.push('EARNINGS_WATCHLIST');
  }
  if (input.freshness !== 'MISSING' && result.length === 0) result.push('EARNINGS_WATCHLIST');
  return [...new Set(result)];
}

// ── Read-path grouping helpers ────────────────────────────────────────────────

/**
 * Date-provenance tier used to order UPCOMING_RESULTS: official forward dates
 * (2) rank above Phase 3 cadence estimates (1), which rank above rows with no
 * forward date (0).  Only rows with a non-null daysToResult can be "dated".
 */
export function upcomingDateTier(row: EarningsSnapshotDto): number {
  if (row.daysToResult === null) return 0;
  if (row.resultDateSource === 'OFFICIAL_CALENDAR') return 2;
  if (row.resultDateSource === 'ESTIMATED_FROM_CADENCE') return 1;
  return 0;
}

export function groupByCategory(
  rows: EarningsSnapshotDto[],
  limit: number,
): Record<EarningsIntelligenceCategory, EarningsSnapshotDto[]> {
  const grouped = emptyCategoryBuckets();
  for (const category of EARNINGS_INTELLIGENCE_CATEGORIES) {
    const categoryRows = rows.filter((row) => row.categories.includes(category));
    if (category === 'UPCOMING_RESULTS') {
      // Order by date-provenance tier, then soonest first within a tier:
      //   (2) official dates first (most reliable), soonest first;
      //   (1) Phase 3 ESTIMATED_FROM_CADENCE dates next, soonest first;
      //   (0) DATE_TBA / legacy estimated (no forward date) at the end;
      // consistencyScore desc breaks ties within each tier.
      grouped[category] = categoryRows
        .sort((left, right) => {
          const leftTier = upcomingDateTier(left);
          const rightTier = upcomingDateTier(right);
          if (leftTier !== rightTier) return rightTier - leftTier; // higher tier first
          if (leftTier > 0) {
            const daysDiff = (left.daysToResult as number) - (right.daysToResult as number);
            if (daysDiff !== 0) return daysDiff; // soonest first
          }
          return right.consistencyScore - left.consistencyScore; // tiebreak
        })
        .slice(0, limit);
    } else {
      grouped[category] = categoryRows.slice(0, limit);
    }
  }
  return grouped;
}

export function countCategories(
  rows: EarningsSnapshotDto[],
): Record<EarningsIntelligenceCategory, number> {
  const counts = emptyCategoryCounts();
  for (const row of rows) {
    for (const category of row.categories) counts[category] += 1;
  }
  return counts;
}
