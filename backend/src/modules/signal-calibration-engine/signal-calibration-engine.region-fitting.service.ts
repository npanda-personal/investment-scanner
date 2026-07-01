/**
 * signal-calibration-engine.region-fitting.service.ts
 *
 * Fits per-region/assetType signal calibration parameters from mature persisted
 * signal_outcomes data and produces a RegionCalibrationArtifact JSON object.
 *
 * Algorithm summary
 * -----------------
 * Direction cut-points (per cohort):
 *   Bullish cut — grid-search [52..72] (step 1), maximise Youden's J treating
 *     outcome > 0 as positive, predicted positive when score >= cut.
 *   Bearish cut — grid-search [28..48] (step 1), maximise Youden's J treating
 *     outcome < 0 as positive, predicted positive when score <= cut.
 *   Guard: each bucket (true-positive, false-positive, true-negative, false-negative)
 *     must have >= policy.samples.minGroup rows; else keep the global default for that
 *     side. Enforce bullish > bearish; else fall back to 60/40 for the cohort.
 *
 * Category weights (per cohort):
 *   Grid-search the {technical, momentum, fundamental} simplex at step 0.05,
 *   each dimension in [0.1, 0.8], sum exactly 1.0.
 *   For each candidate, reconstruct per-row displacement from persisted
 *   categoryScores + categoryHasEvidence (mirrors compositeV4 redistribution).
 *   Objective: Spearman rank correlation between reconstructed displacement and
 *   the row outcome (alphaPercent if present, else forwardReturnPercent).
 *   Adopt fitted weights only when they beat IN_EQUITY_WEIGHTS baseline by >= 0.02
 *   Spearman correlation; otherwise emit IN_EQUITY_WEIGHTS.
 *   Weights are rounded to 2 decimals and renormalised to sum exactly 1.0.
 *
 * Cohort coverage
 * ---------------
 *   Cohorts are keyed `${REGION}:${ASSETTYPE}` (uppercased) plus a `${REGION}:ALL`
 *   rollup. Cohorts with < policy.samples.minPersisted mature rows are OMITTED from
 *   the artifact entirely — the consumer falls back to global defaults.
 */

import type { SignalCalibrationEngineRepository, RawOutcomeRow } from './signal-calibration-engine.repository';
import { resolveCalibrationPolicy } from './signal-calibration-engine.config';
import { SIGNAL_ENGINE_MODEL_VERSION_V4 } from '../signal-generation-engine/signal-scoring.config';

// ── Constants ─────────────────────────────────────────────────────────────────

const IN_EQUITY_WEIGHTS = { technical: 0.4, momentum: 0.35, fundamental: 0.25 };

const BULLISH_CUT_RANGE = { min: 52, max: 72, step: 1 };
const BEARISH_CUT_RANGE = { min: 28, max: 48, step: 1 };

// ── Public types ──────────────────────────────────────────────────────────────

export interface CohortCalibration {
  directionThresholds: { bullish: number; bearish: number };
  weights: { technical: number; momentum: number; fundamental: number };
  samples: number;
  method: string;
}

export interface RegionCalibrationArtifact {
  generatedAt: string;
  modelVersion: string;
  horizon: string;
  cohorts: Record<string, CohortCalibration>;
}

export interface FitSummaryEntry {
  cohort: string;
  status: 'fitted' | 'skipped';
  samples: number;
  reason?: string;
}

export interface FitResult {
  artifact: RegionCalibrationArtifact;
  summary: FitSummaryEntry[];
}

// ── Pure fitting functions (exported for unit tests) ─────────────────────────

/**
 * Reconstruct per-row composite displacement from persisted categoryScores and
 * categoryHasEvidence, using the candidate base weights.
 *
 * Mirrors the redistribution in compositeV4 (signal-evidence.ts ~236-248):
 *   - zero weight for no-evidence categories
 *   - renormalise the rest
 *   - rawLean = Σ catScore · effWeight
 *   - displacement = rawLean − 0.5
 */
export function reconstructDisplacement(
  categoryScores: { technical: number; momentum: number; fundamental: number },
  categoryHasEvidence: { technical: boolean; momentum: boolean; fundamental: boolean },
  weights: { technical: number; momentum: number; fundamental: number },
): number {
  const wT = categoryHasEvidence.technical ? weights.technical : 0;
  const wM = categoryHasEvidence.momentum ? weights.momentum : 0;
  const wF = categoryHasEvidence.fundamental ? weights.fundamental : 0;
  const wSum = wT + wM + wF;
  if (wSum <= 0) return 0; // no evidence → exactly neutral
  const eff = { technical: wT / wSum, momentum: wM / wSum, fundamental: wF / wSum };
  const rawLean =
    categoryScores.technical * eff.technical +
    categoryScores.momentum * eff.momentum +
    categoryScores.fundamental * eff.fundamental;
  return rawLean - 0.5;
}

/**
 * Youden's J statistic for a binary classification:
 *   J = TPR − FPR = sensitivity + specificity − 1
 * predicted positive = (score condition), actual positive = (outcome condition).
 */
function youdenJ(
  rows: Array<{ score: number; outcome: number }>,
  isPredictedPositive: (score: number) => boolean,
  isActualPositive: (outcome: number) => boolean,
): { j: number; tp: number; fp: number; tn: number; fn: number } {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const row of rows) {
    const pp = isPredictedPositive(row.score);
    const ap = isActualPositive(row.outcome);
    if (pp && ap) tp++;
    else if (pp && !ap) fp++;
    else if (!pp && ap) fn++;
    else tn++;
  }
  const tpr = tp + fn > 0 ? tp / (tp + fn) : 0;
  const fpr = fp + tn > 0 ? fp / (fp + tn) : 0;
  return { j: tpr - fpr, tp, fp, tn, fn };
}

/**
 * Fit bullish direction cut-point for one cohort.
 * Returns the best cut in [min..max] (step 1) or null if minGroup guard fires.
 */
export function fitBullishCut(
  rows: Array<{ score: number; outcome: number }>,
  minGroup: number,
): number | null {
  let bestCut: number | null = null;
  let bestJ = -Infinity;

  for (let cut = BULLISH_CUT_RANGE.min; cut <= BULLISH_CUT_RANGE.max; cut += BULLISH_CUT_RANGE.step) {
    const { j, tp, fp, tn, fn } = youdenJ(
      rows,
      (s) => s >= cut,
      (o) => o > 0,
    );
    // minGroup guard: all four buckets must be non-trivially populated
    if (tp < minGroup || fp < minGroup || tn < minGroup || fn < minGroup) continue;
    if (j > bestJ) {
      bestJ = j;
      bestCut = cut;
    }
  }
  return bestCut;
}

/**
 * Fit bearish direction cut-point for one cohort.
 * Returns the best cut in [min..max] (step 1) or null if minGroup guard fires.
 */
export function fitBearishCut(
  rows: Array<{ score: number; outcome: number }>,
  minGroup: number,
): number | null {
  let bestCut: number | null = null;
  let bestJ = -Infinity;

  for (let cut = BEARISH_CUT_RANGE.min; cut <= BEARISH_CUT_RANGE.max; cut += BEARISH_CUT_RANGE.step) {
    const { j, tp, fp, tn, fn } = youdenJ(
      rows,
      (s) => s <= cut,
      (o) => o < 0,
    );
    if (tp < minGroup || fp < minGroup || tn < minGroup || fn < minGroup) continue;
    if (j > bestJ) {
      bestJ = j;
      bestCut = cut;
    }
  }
  return bestCut;
}

/**
 * Spearman rank correlation between xs and ys.
 * Returns NaN if < 2 rows or all ranks are identical.
 */
export function spearman(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2 || n !== ys.length) return NaN;

  function rankArray(arr: number[]): number[] {
    const indexed = arr.map((v, i) => ({ v, i }));
    indexed.sort((a, b) => a.v - b.v || a.i - b.i);
    const ranks = new Array<number>(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n && indexed[j].v === indexed[i].v) j++;
      const avgRank = (i + j - 1) / 2; // 0-based average
      for (let k = i; k < j; k++) ranks[indexed[k].i] = avgRank;
      i = j;
    }
    return ranks;
  }

  const rx = rankArray(xs);
  const ry = rankArray(ys);

  let sumD2 = 0;
  for (let k = 0; k < n; k++) {
    const d = rx[k] - ry[k];
    sumD2 += d * d;
  }
  // Spearman via d²: ρ = 1 − 6Σd²/(n(n²−1))
  return 1 - (6 * sumD2) / (n * (n * n - 1));
}

/**
 * Generate all weight candidates on the {technical, momentum, fundamental}
 * simplex with step 0.05, each dimension in [0.1, 0.8].
 */
export function generateWeightCandidates(): Array<{ technical: number; momentum: number; fundamental: number }> {
  const candidates: Array<{ technical: number; momentum: number; fundamental: number }> = [];
  const step = 0.05;
  const min = 0.10;
  const max = 0.80;
  const tol = 0.001; // floating-point sum tolerance

  // Enumerate t in [min..max], m in [min..max], f = 1 - t - m
  for (let ti = Math.round(min / step); ti <= Math.round(max / step); ti++) {
    const t = Math.round(ti * step * 100) / 100;
    for (let mi = Math.round(min / step); mi <= Math.round(max / step); mi++) {
      const m = Math.round(mi * step * 100) / 100;
      const f = Math.round((1 - t - m) * 100) / 100;
      if (f < min - tol || f > max + tol) continue;
      if (Math.abs(t + m + f - 1.0) > tol) continue;
      candidates.push({ technical: t, momentum: m, fundamental: f });
    }
  }
  return candidates;
}

/**
 * Fit base category weights for one cohort.
 * Returns the best weight candidate or IN_EQUITY_WEIGHTS if the gain is < 0.02.
 */
export function fitWeights(
  rows: RawOutcomeRow[],
): { weights: { technical: number; momentum: number; fundamental: number }; method: string } {
  // Outcome for each row: prefer alphaPercent, fallback to forwardReturnPercent
  const outcomes = rows.map((r) => r.alphaPercent ?? r.forwardReturnPercent ?? null).filter((v): v is number => v !== null);
  if (outcomes.length < rows.length * 0.5) {
    // Too many missing outcomes — fall back
    return { weights: IN_EQUITY_WEIGHTS, method: 'fallback:insufficient-outcomes' };
  }

  // Filter rows that have usable outcomes
  const usable = rows.filter((r) => (r.alphaPercent ?? r.forwardReturnPercent) !== null);
  const usableOutcomes = usable.map((r) => r.alphaPercent ?? r.forwardReturnPercent) as number[];

  // Baseline correlation with IN_EQUITY_WEIGHTS
  const baselineDisplacements = usable.map((r) =>
    reconstructDisplacement(r.categoryScores, r.categoryHasEvidence, IN_EQUITY_WEIGHTS),
  );
  const baselineCorr = spearman(baselineDisplacements, usableOutcomes);

  const candidates = generateWeightCandidates();
  let bestCorr = -Infinity;
  let bestWeights = IN_EQUITY_WEIGHTS;

  for (const candidate of candidates) {
    const displacements = usable.map((r) =>
      reconstructDisplacement(r.categoryScores, r.categoryHasEvidence, candidate),
    );
    const corr = spearman(displacements, usableOutcomes);
    if (isFinite(corr) && corr > bestCorr) {
      bestCorr = corr;
      bestWeights = candidate;
    }
  }

  // Overfitting guard: only adopt if beats baseline by >= 0.02
  const baselineCorrValid = isFinite(baselineCorr) ? baselineCorr : -Infinity;
  if (bestCorr - baselineCorrValid < 0.02) {
    return { weights: IN_EQUITY_WEIGHTS, method: 'fallback:no-gain-over-baseline' };
  }

  // Round to 2dp and renormalise to sum exactly 1.0
  const w = bestWeights;
  const t2 = Math.round(w.technical * 100) / 100;
  const m2 = Math.round(w.momentum * 100) / 100;
  const f2 = Math.round((1 - t2 - m2) * 100) / 100;
  const sum = t2 + m2 + f2;
  const finalWeights =
    Math.abs(sum - 1.0) < 0.001
      ? { technical: t2, momentum: m2, fundamental: f2 }
      : { technical: t2 / sum, momentum: m2 / sum, fundamental: f2 / sum };

  return { weights: finalWeights, method: `spearman:corr=${bestCorr.toFixed(4)}` };
}

/**
 * Pure fit function — accepts a pre-fetched array of rows plus policy parameters.
 * This is fully unit-testable with synthetic in-memory data (no DB required).
 */
export function fitCohort(
  rows: RawOutcomeRow[],
  opts: { minPersisted: number; minGroup: number; defaultBullish: number; defaultBearish: number },
): CohortCalibration | null {
  if (rows.length < opts.minPersisted) return null;

  // Build outcome array for direction fitting (use alpha when present)
  const outcomeRows = rows
    .map((r) => ({ score: r.score, outcome: r.alphaPercent ?? r.forwardReturnPercent ?? null }))
    .filter((r): r is { score: number; outcome: number } => r.outcome !== null);

  // Fit direction cut-points
  const bullishCut = fitBullishCut(outcomeRows, opts.minGroup);
  const bearishCut = fitBearishCut(outcomeRows, opts.minGroup);

  const finalBullish = bullishCut ?? opts.defaultBullish;
  const finalBearish = bearishCut ?? opts.defaultBearish;
  const directionOk = finalBullish > finalBearish;

  const directionThresholds = directionOk
    ? { bullish: finalBullish, bearish: finalBearish }
    : { bullish: opts.defaultBullish, bearish: opts.defaultBearish };

  const dirMethod = !directionOk
    ? 'direction:fallback:bullish<=bearish'
    : bullishCut === null && bearishCut === null
    ? 'direction:fallback:minGroup'
    : bullishCut === null
    ? `direction:bearish=${bearishCut},bullish=fallback`
    : bearishCut === null
    ? `direction:bullish=${bullishCut},bearish=fallback`
    : `direction:bullish=${bullishCut},bearish=${bearishCut}`;

  // Fit weights
  const { weights, method: weightsMethod } = fitWeights(rows);

  return {
    directionThresholds,
    weights,
    samples: rows.length,
    method: `${dirMethod};${weightsMethod}`,
  };
}

// ── Service class ─────────────────────────────────────────────────────────────

export class RegionCalibrationFittingService {
  constructor(private readonly repository: Pick<SignalCalibrationEngineRepository, 'matureOutcomesWithRegion'>) {}

  /**
   * Fetch outcomes, group by cohort, fit each cohort, and return the artifact.
   * `generatedAt` is passed in by the caller so the pure fit logic is unit-testable.
   */
  async fit(opts: {
    generatedAt: string;
    modelVersion?: string;
    horizon?: string;
  }): Promise<FitResult> {
    const modelVersion = opts.modelVersion ?? SIGNAL_ENGINE_MODEL_VERSION_V4;
    const horizon = opts.horizon ?? '20D';

    const policy = resolveCalibrationPolicy({});
    const minPersisted = policy.samples.minPersisted;
    const minGroup = policy.samples.minGroup;

    // Fetch all mature outcomes with region context
    const allRows = await this.repository.matureOutcomesWithRegion({ modelVersion, horizon });

    // Group into cohorts: REGION:ASSETTYPE and REGION:ALL rollups
    const cohortMap = new Map<string, RawOutcomeRow[]>();

    for (const row of allRows) {
      const r = row.region.toUpperCase();
      const a = (row.assetType ?? 'UNKNOWN').toUpperCase();

      // Specific cohort
      const specificKey = `${r}:${a}`;
      if (!cohortMap.has(specificKey)) cohortMap.set(specificKey, []);
      cohortMap.get(specificKey)!.push(row);

      // Region rollup
      const rollupKey = `${r}:ALL`;
      if (!cohortMap.has(rollupKey)) cohortMap.set(rollupKey, []);
      cohortMap.get(rollupKey)!.push(row);
    }

    const cohorts: Record<string, CohortCalibration> = {};
    const summary: FitSummaryEntry[] = [];

    for (const [key, rows] of cohortMap.entries()) {
      if (rows.length < minPersisted) {
        summary.push({ cohort: key, status: 'skipped', samples: rows.length, reason: `below minPersisted=${minPersisted}` });
        continue;
      }

      const result = fitCohort(rows, {
        minPersisted,
        minGroup,
        defaultBullish: 60,
        defaultBearish: 40,
      });

      if (result === null) {
        summary.push({ cohort: key, status: 'skipped', samples: rows.length, reason: 'fitCohort returned null' });
        continue;
      }

      cohorts[key] = result;
      summary.push({ cohort: key, status: 'fitted', samples: rows.length });
    }

    const artifact: RegionCalibrationArtifact = {
      generatedAt: opts.generatedAt,
      modelVersion,
      horizon,
      cohorts,
    };

    return { artifact, summary };
  }
}
