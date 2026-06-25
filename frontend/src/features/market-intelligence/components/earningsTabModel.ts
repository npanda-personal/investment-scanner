/**
 * Pure (no JSX) earnings tab model helpers: scoring, tab membership, ordering, and constants.
 * These are leaf-level — they import nothing from other extracted files in this module.
 */
import type { EarningsIntelligenceSnapshot } from '../types';

// ---------------------------------------------------------------------------
// Numeric helpers
// ---------------------------------------------------------------------------

export const num = (value: number | null | undefined, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

// Forward-date reliability tier (mirrors the backend upcoming bucket order):
// official board-meeting date > estimated-from-cadence > no/past date.
export function earningsUpcomingTier(row: EarningsIntelligenceSnapshot): number {
  if (row.daysToResult === null || row.daysToResult === undefined) return 0;
  if (row.resultDateSource === 'OFFICIAL_CALENDAR') return 2;
  if (row.resultDateSource === 'ESTIMATED_FROM_CADENCE') return 1;
  return 0;
}

// Map the categorical 50/200 SMA posture to a 0–100 constructiveness score so it
// can blend into the watchlist health score.  Null posture contributes nothing.
export function smaPostureScore(posture: string | null | undefined): number | null {
  switch (posture) {
    case 'ABOVE_50_200': return 100;
    case 'ABOVE_50_BELOW_200': return 70;
    case 'ABOVE_200': return 65;
    case 'ABOVE_50': return 60;
    case 'BELOW_50_ABOVE_200': return 40;
    case 'BELOW_200': return 30;
    case 'BELOW_50': return 25;
    case 'BELOW_50_200': return 0;
    default: return null;
  }
}

// RSI-14 mapped to a 0–100 "health band": healthiest in the constructive 50–65
// zone, tapering toward overbought (>70) and oversold (<40) extremes.
export function rsiHealthScore(rsi: number | null | undefined): number | null {
  if (typeof rsi !== 'number' || !Number.isFinite(rsi)) return null;
  const distanceFromIdeal = Math.abs(rsi - 57.5); // centre of the 50–65 band
  return Math.max(0, Math.round(100 - distanceFromIdeal * 2));
}

// Blended fundamentals+technicals health score (0–100) for the Earnings Watchlist
// ranking.  Averages only the components that are present, so it degrades
// gracefully where a component is null (e.g. US has no deliveryPercent, or a
// technicals warm-up window is unmet).  Returns null when nothing is available.
export function earningsHealthScore(row: EarningsIntelligenceSnapshot): number | null {
  const components: number[] = [];
  const push = (value: number | null | undefined) => {
    if (typeof value === 'number' && Number.isFinite(value)) components.push(value);
  };
  push(row.consistencyScore);
  push(row.accelerationScore);
  push(row.pricePosition52w);
  if (typeof row.adx14 === 'number' && Number.isFinite(row.adx14)) push(Math.min(100, row.adx14));
  push(smaPostureScore(row.smaPosture));
  push(rsiHealthScore(row.rsi14));
  if (components.length === 0) return null;
  return components.reduce((acc, value) => acc + value, 0) / components.length;
}

// Tab membership for the Earnings view.  Backend categories drive most tabs as-is;
// the Watchlist tab is re-scoped here to exactly the upcoming-results population
// (owner spec: "best health score … only for upcoming results"), decoupled from
// the backend EARNINGS_WATCHLIST heuristic.
export function earningsTabMembership(row: EarningsIntelligenceSnapshot): string[] {
  const categories = new Set(row.categories);
  categories.delete('EARNINGS_WATCHLIST');
  if (row.categories.includes('UPCOMING_RESULTS')) categories.add('EARNINGS_WATCHLIST');
  return [...categories];
}

// The FE flattens every backend category bucket into one list and the generic
// RadarPage filters that single list per tab — so without this, every tab
// inherits the same flatten order (UPCOMING-first) and the overlapping stocks
// lead all of them with identical rows.  This sorts each tab's already-filtered
// rows by that tab's OWN relevance so the tabs no longer lead the same way.
// Membership is unchanged — a stock can still appear under several tabs.
export function orderEarningsRowsForTab(
  rows: EarningsIntelligenceSnapshot[],
  tab: string,
): EarningsIntelligenceSnapshot[] {
  const sorted = [...rows];
  const FAR = Number.MAX_SAFE_INTEGER;
  switch (tab) {
    case 'UPCOMING_RESULTS':
      // Soonest, most-reliable forward date first.
      return sorted.sort((a, b) =>
        earningsUpcomingTier(b) - earningsUpcomingTier(a)
        || num(a.daysToResult, FAR) - num(b.daysToResult, FAR)
        || num(b.consistencyScore, 0) - num(a.consistencyScore, 0));
    case 'GROWTH':
      // Most consistently growing on top: recency-weighted QoQ-EPS trend score.
      // Rows without enough history (null score) sort last.
      return sorted.sort((a, b) =>
        num(b.epsGrowthTrendScore, -FAR) - num(a.epsGrowthTrendScore, -FAR)
        || num(b.consistencyScore, 0) - num(a.consistencyScore, 0));
    case 'RESULT_WINNERS':
      // Strongest sustained result first: avg of the last ≤4 QoQ profit-growth %s.
      return sorted.sort((a, b) =>
        num(b.avgProfitGrowthQoQ4q, -FAR) - num(a.avgProfitGrowthQoQ4q, -FAR)
        || num(b.profitGrowth, -FAR) - num(a.profitGrowth, -FAR));
    case 'RESULT_DISAPPOINTMENTS':
      // Weakest sustained result first: same avg-4-QoQ axis, ascending.
      return sorted.sort((a, b) =>
        num(a.avgProfitGrowthQoQ4q, FAR) - num(b.avgProfitGrowthQoQ4q, FAR)
        || num(a.profitGrowth, FAR) - num(b.profitGrowth, FAR));
    case 'RESULT_REACTION_HISTORY':
      // Most recent reported result first.
      return sorted.sort((a, b) => (b.resultDate ?? '').localeCompare(a.resultDate ?? ''));
    case 'EARNINGS_WATCHLIST':
      // Best blended health score (fundamentals + technicals) first; break ties
      // toward the soonest upcoming result.
      return sorted.sort((a, b) =>
        num(earningsHealthScore(b), -FAR) - num(earningsHealthScore(a), -FAR)
        || num(a.daysToResult, FAR) - num(b.daysToResult, FAR));
    default:
      return sorted;
  }
}

/** Count earnings rows with an upcoming result within 0–14 calendar days. */
export function countUpcomingEarnings(rows: EarningsIntelligenceSnapshot[]): number {
  return rows.filter((row) => {
    const d = row.daysToResult;
    return typeof d === 'number' && d >= 0 && d <= 14;
  }).length;
}

/** Per-category empty-state messages for the Earnings Intelligence screen. */
export const EARNINGS_EMPTY_MESSAGES: Record<string, string> = {
  UPCOMING_RESULTS:
    'No stocks have a result date within the next 90 days in stored data. ' +
    'This category populates when an official earnings calendar is available or when ' +
    'period-cadence estimates fall within 90 days. Data updates on the next scheduled refresh.',
  GROWTH:
    'No stocks have enough consecutive quarterly EPS history to compute a growth trend yet. ' +
    'The Growth tab ranks instruments by their recent QoQ-EPS trend; rows appear once at least ' +
    'three EPS-bearing quarters are available. Data updates on the next scheduled refresh.',
  RESULT_WINNERS:
    'No stocks showed strong post-result growth in the last 60 days in stored data. ' +
    'Winners are identified from revenue, profit, and EPS growth with at least 2 positive metrics.',
  RESULT_DISAPPOINTMENTS:
    'No stocks showed a significant earnings miss or price drop in the last 60 days in stored data.',
  RESULT_REACTION_HISTORY:
    'No stocks have a price-reaction history calculated yet. ' +
    'This category requires an official earnings date and ' +
    'at least one price bar 5 trading sessions after the result date.',
  EARNINGS_WATCHLIST:
    'No upcoming-result stocks are available to rank by health score yet. ' +
    'The watchlist ranks the upcoming-results population by a blended fundamentals + technicals ' +
    'health score; it populates once upcoming results are in stored data.',
};
