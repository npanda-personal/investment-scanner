/**
 * signal-percentile.ts
 *
 * SG-3b: relative-strength percentile ranked against the COHORT UNIVERSE distribution
 * (region/asset-scoped latest trusted scores), not just the served page.  Previously the
 * percentile was computed over whatever page the query returned, so the same stock could
 * read 90th on one query and 40th on another depending on limit/filters.
 *
 * Pure: takes the served signals + the universe score distribution and returns enriched
 * copies.  Falls back to ranking within the served set when the universe is too small to
 * be meaningful (preserves the prior behaviour for tiny universes).  No I/O here — the
 * caller fetches the (already region-isolated) universe scores.
 */
import type { SignalResultDto } from './signal-generation-engine.types';

const scoreOf = (s: SignalResultDto): number => (typeof s.score === 'number' ? s.score : 0);

/** First index where sorted[i] >= score (ties share the lowest rank). */
function lowerBoundRank(sorted: number[], score: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < score) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function attachRsPercentiles(signals: SignalResultDto[], universeScores: number[]): SignalResultDto[] {
  // Rank against the cohort universe whenever it has a meaningful distribution (>= 2
  // scores). A served-page score ranks correctly within the cohort distribution even if
  // that exact score isn't in the universe sample (binary search handles it). Only fall
  // back to served-set ranking when the universe read was empty/degenerate.
  const usable = universeScores.filter((v) => typeof v === 'number' && Number.isFinite(v));
  const pool = usable.length >= 2 ? usable : signals.map(scoreOf);
  if (pool.length < 2) {
    return signals.map((s) => ({ ...s, rsPercentile: null, relativeReturn: null }));
  }
  const sorted = pool.slice().sort((a, b) => a - b);
  return signals.map((s) => {
    const score = scoreOf(s);
    const rank = lowerBoundRank(sorted, score);
    const rsPercentile = Math.min(100, Math.max(0, Math.round((rank / (sorted.length - 1)) * 100)));
    return { ...s, rsPercentile, relativeReturn: (score - 50) / 50 };
  });
}
