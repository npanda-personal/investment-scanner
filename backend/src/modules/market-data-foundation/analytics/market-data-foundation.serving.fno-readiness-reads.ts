// F&O readiness read-composition (Phase: F&O Readiness).
//
// Pure, read-time derivation over the screener's repo rows: RS-percentile (within
// the returned set), the F&O readiness composite + grade + component breakdown,
// the minRsPercentile filter, and the Top-F&O ranking (sort by readiness, slice to
// the requested size). Extracted from ScanReadsService.screener so that serving
// module stays under the 500-line cap. No I/O — operates only on the rows handed in.

import { computeFnoReadiness } from './fno-readiness-score';

interface ReadinessRankOptions {
  minRsPercentile?: number;
  onlyDerivativesEligible?: boolean;
  limit?: number;
}

interface ReadinessRankContext {
  currency: string;
  region: string;
}

/**
 * Attach rsPercentile + F&O readiness to each row, apply the minRsPercentile
 * filter, and — for the Top-F&O view — rank by readiness and slice to the top N.
 * Non-F&O calls keep the repo's signal-score order untouched.
 */
export function rankScreenerRowsByReadiness(
  rows: Array<Record<string, any>>,
  options: ReadinessRankOptions,
  ctx: ReadinessRankContext,
): Array<Record<string, any>> {
  const finalLimit = Math.max(1, Math.min(options.limit ?? 50, 500));

  // RS percentile is relative within the returned set (for the Top-F&O view that is
  // the F&O-eligible pool, which is the correct denominator for an F&O ranking).
  const scores = rows.map((r) => r.signalScore ?? 0);
  const sortedScores = [...scores].sort((a, b) => a - b);
  const n = scores.length;

  const withRs = rows.map((r) => {
    let rsPercentile: number | null = null;
    if (n >= 2) {
      const score = r.signalScore ?? 0;
      let lo = 0, hi = sortedScores.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (sortedScores[mid] < score) lo = mid + 1; else hi = mid;
      }
      rsPercentile = Math.round((lo / (n - 1)) * 100);
    }
    const readiness = computeFnoReadiness({
      signalScore: r.signalScore ?? null,
      rsPercentile,
      range52wPositionPct: r.range52wPositionPct ?? null,
      deliveryPct: r.deliveryPct ?? null,
      buildupLabel: r.buildupLabel ?? null,
      pcrOi: r.pcrOi ?? null,
      inFnoBan: Boolean(r.inFnoBan),
    });
    return {
      ...r,
      rsPercentile,
      fnoReadinessScore: readiness.score,
      fnoGrade: readiness.grade,
      fnoComponents: readiness.components,
      currency: ctx.currency,
      region: ctx.region,
    };
  });

  const filtered = options.minRsPercentile != null
    ? withRs.filter((r) => r.rsPercentile != null && r.rsPercentile >= options.minRsPercentile!)
    : withRs;

  // F&O view: rank by readiness composite, then take the top N (the repo ordered by
  // raw signal score, which is only one of the readiness inputs).
  return options.onlyDerivativesEligible
    ? [...filtered]
        .sort((a, b) => (b.fnoReadinessScore ?? -1) - (a.fnoReadinessScore ?? -1))
        .slice(0, finalLimit)
    : filtered;
}
