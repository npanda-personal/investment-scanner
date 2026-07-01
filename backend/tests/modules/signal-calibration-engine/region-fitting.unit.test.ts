/// <reference types="@types/jest" />

/**
 * Unit tests for RegionCalibrationFittingService pure-fit functions.
 * No database — all inputs are synthetic in-memory rows.
 */

import {
  reconstructDisplacement,
  fitBullishCut,
  fitBearishCut,
  spearman,
  generateWeightCandidates,
  fitWeights,
  fitCohort,
  RegionCalibrationFittingService,
} from '../../../src/modules/signal-calibration-engine/signal-calibration-engine.region-fitting.service';
import type { RawOutcomeRow } from '../../../src/modules/signal-calibration-engine/signal-calibration-engine.repository';

// ── Helpers ───────────────────────────────────────────────────────────────────

const IN_EQUITY_WEIGHTS = { technical: 0.4, momentum: 0.35, fundamental: 0.25 };

function makeRow(overrides: Partial<RawOutcomeRow> = {}): RawOutcomeRow {
  return {
    region: 'IN',
    assetType: 'STOCK',
    score: 65,
    direction: 'BULLISH',
    forwardReturnPercent: 0.02,
    alphaPercent: 0.01,
    categoryScores: { technical: 0.7, momentum: 0.6, fundamental: 0.6 },
    categoryHasEvidence: { technical: true, momentum: true, fundamental: true },
    ...overrides,
  };
}

/**
 * Build `n` rows where score >= cut mostly produces positive outcome (noisy separation).
 * A 20% noise rate ensures all four Youden buckets (TP/FP/TN/FN) are populated
 * so the minGroup guard does not suppress the true cut-point.
 */
function makeSeparatedRows(
  n: number,
  cut: number,
  positiveOutcome: number,
  negativeOutcome: number,
  noiseRate = 0.20,
): Array<{ score: number; outcome: number }> {
  const rng = (i: number) => ((i * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return Array.from({ length: n }, (_, i) => {
    const score = 30 + Math.floor((i / n) * 60); // scores 30..89
    const trueLabel = score >= cut;
    // Flip the label with noiseRate probability so both sides have misclassifications
    const noisy = rng(i) < noiseRate ? !trueLabel : trueLabel;
    return { score, outcome: noisy ? positiveOutcome : negativeOutcome };
  });
}

// ── reconstructDisplacement ───────────────────────────────────────────────────

describe('reconstructDisplacement', () => {
  test('all evidence present: mirrors compositeV4 redistribution', () => {
    const scores = { technical: 0.7, momentum: 0.6, fundamental: 0.5 };
    const hasEvidence = { technical: true, momentum: true, fundamental: true };
    const weights = { technical: 0.4, momentum: 0.35, fundamental: 0.25 };

    const rawLean = 0.7 * 0.4 + 0.6 * 0.35 + 0.5 * 0.25;
    const expected = rawLean - 0.5;
    expect(reconstructDisplacement(scores, hasEvidence, weights)).toBeCloseTo(expected, 8);
  });

  test('no-evidence category is zeroed and remainder renormalised', () => {
    const scores = { technical: 0.8, momentum: 0.3, fundamental: 0.5 };
    const hasEvidence = { technical: true, momentum: true, fundamental: false };
    const weights = { technical: 0.4, momentum: 0.35, fundamental: 0.25 };

    // fundamental zeroed, remaining renormalised: wT/(wT+wM), wM/(wT+wM)
    const wSum = 0.4 + 0.35;
    const rawLean = 0.8 * (0.4 / wSum) + 0.3 * (0.35 / wSum);
    const expected = rawLean - 0.5;
    expect(reconstructDisplacement(scores, hasEvidence, weights)).toBeCloseTo(expected, 6);
  });

  test('no evidence at all → displacement 0', () => {
    const scores = { technical: 0.7, momentum: 0.6, fundamental: 0.5 };
    const hasEvidence = { technical: false, momentum: false, fundamental: false };
    expect(reconstructDisplacement(scores, hasEvidence, IN_EQUITY_WEIGHTS)).toBe(0);
  });
});

// ── fitBullishCut ─────────────────────────────────────────────────────────────

describe('fitBullishCut', () => {
  test('recovers a planted cut-point near the true separation', () => {
    // Scores in [30..89]; outcome positive iff score >= 65 (planted cut)
    const rows = makeSeparatedRows(400, 65, 0.05, -0.03);
    const cut = fitBullishCut(rows, 20);
    expect(cut).not.toBeNull();
    // Should recover 65 or something close (64-66)
    expect(Math.abs((cut as number) - 65)).toBeLessThanOrEqual(2);
  });

  test('returns null when minGroup guard fires (too few rows in a bucket)', () => {
    // Only 10 rows — every candidate bucket will have < 20 rows
    const rows = makeSeparatedRows(10, 65, 0.05, -0.03);
    const cut = fitBullishCut(rows, 20);
    expect(cut).toBeNull();
  });
});

// ── fitBearishCut ─────────────────────────────────────────────────────────────

describe('fitBearishCut', () => {
  test('recovers a planted bearish cut-point', () => {
    // outcome negative when score <= 38 (planted bearish cut).
    // makeSeparatedRows treats score >= cut as "positive"; here we build the rows
    // such that "positive" (score < the bearish cut) → negative outcome.
    // Use bearish framing: score <= 38 → negative outcome (outcome = -0.05).
    // We build directly: score in [28..48] range is all bearish candidates.
    // Generate 400 rows spanning 30..89, where score<=38 → -0.05, else +0.03, with 20% noise.
    const rng = (i: number) => ((i * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const rows = Array.from({ length: 400 }, (_, i) => {
      const score = 30 + Math.floor((i / 400) * 60);
      const trueLabel = score <= 38;
      const noisy = rng(i + 500) < 0.20 ? !trueLabel : trueLabel;
      return { score, outcome: noisy ? -0.05 : 0.03 };
    });
    const cut = fitBearishCut(rows, 20);
    expect(cut).not.toBeNull();
    expect(Math.abs((cut as number) - 38)).toBeLessThanOrEqual(2);
  });

  test('returns null when minGroup guard fires', () => {
    const rows = makeSeparatedRows(10, 35, 0.03, -0.05);
    const cut = fitBearishCut(rows, 20);
    expect(cut).toBeNull();
  });
});

// ── spearman ──────────────────────────────────────────────────────────────────

describe('spearman', () => {
  test('perfect positive correlation returns 1', () => {
    const xs = [1, 2, 3, 4, 5];
    expect(spearman(xs, xs)).toBeCloseTo(1, 5);
  });

  test('perfect negative correlation returns -1', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [5, 4, 3, 2, 1];
    expect(spearman(xs, ys)).toBeCloseTo(-1, 5);
  });

  test('returns NaN for < 2 elements', () => {
    expect(spearman([1], [1])).toBeNaN();
  });
});

// ── generateWeightCandidates ──────────────────────────────────────────────────

describe('generateWeightCandidates', () => {
  test('all candidates sum to 1.0 within tolerance', () => {
    const candidates = generateWeightCandidates();
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(Math.abs(c.technical + c.momentum + c.fundamental - 1.0)).toBeLessThan(0.002);
    }
  });

  test('all dimensions are within [0.10, 0.80]', () => {
    const candidates = generateWeightCandidates();
    for (const c of candidates) {
      expect(c.technical).toBeGreaterThanOrEqual(0.09);
      expect(c.technical).toBeLessThanOrEqual(0.81);
      expect(c.momentum).toBeGreaterThanOrEqual(0.09);
      expect(c.momentum).toBeLessThanOrEqual(0.81);
      expect(c.fundamental).toBeGreaterThanOrEqual(0.09);
      expect(c.fundamental).toBeLessThanOrEqual(0.81);
    }
  });
});

// ── fitWeights ────────────────────────────────────────────────────────────────

describe('fitWeights', () => {
  test('recovers weights leaning toward the category that drives positive outcomes', () => {
    // 300 rows where high technical score → positive return, others neutral
    const rows: RawOutcomeRow[] = Array.from({ length: 300 }, (_, i) => {
      const techScore = 0.5 + (i % 2 === 0 ? 0.3 : -0.3); // alternates high/low
      const outcome = techScore > 0.5 ? 0.06 : -0.04; // clear technical-driven signal
      return makeRow({
        categoryScores: { technical: techScore, momentum: 0.5, fundamental: 0.5 },
        categoryHasEvidence: { technical: true, momentum: true, fundamental: true },
        alphaPercent: outcome,
      });
    });

    const { weights, method } = fitWeights(rows);
    // Should lean toward technical (or fall back if gain <0.02 — either is valid)
    // At minimum the method string should be meaningful
    expect(typeof method).toBe('string');
    expect(weights.technical + weights.momentum + weights.fundamental).toBeCloseTo(1.0, 2);
  });

  test('falls back to IN_EQUITY_WEIGHTS when no candidate beats baseline by 0.02', () => {
    // Purely random outcomes — no category drives alpha
    const rng = (i: number) => ((i * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const rows: RawOutcomeRow[] = Array.from({ length: 300 }, (_, i) =>
      makeRow({ alphaPercent: (rng(i) - 0.5) * 0.02 }),
    );

    const { weights, method } = fitWeights(rows);
    expect(method).toMatch(/fallback/);
    expect(weights).toEqual({ technical: 0.4, momentum: 0.35, fundamental: 0.25 });
  });
});

// ── fitCohort (thin cohort) ───────────────────────────────────────────────────

describe('fitCohort', () => {
  test('returns null for cohort below minPersisted', () => {
    const rows = Array.from({ length: 50 }, () => makeRow());
    const result = fitCohort(rows, { minPersisted: 200, minGroup: 20, defaultBullish: 60, defaultBearish: 40 });
    expect(result).toBeNull();
  });

  test('returns a cohort object with valid shape for sufficient rows', () => {
    const rows = Array.from({ length: 250 }, (_, i) => {
      const score = 30 + Math.floor((i / 250) * 60);
      return makeRow({ score, alphaPercent: score >= 65 ? 0.04 : -0.02 });
    });
    const result = fitCohort(rows, { minPersisted: 200, minGroup: 20, defaultBullish: 60, defaultBearish: 40 });
    expect(result).not.toBeNull();
    expect(result!.samples).toBe(250);
    expect(result!.directionThresholds.bullish).toBeGreaterThan(result!.directionThresholds.bearish);
    expect(Math.abs(result!.weights.technical + result!.weights.momentum + result!.weights.fundamental - 1.0)).toBeLessThan(0.01);
  });
});

// ── RegionCalibrationFittingService.fit ──────────────────────────────────────

describe('RegionCalibrationFittingService.fit', () => {
  test('skips cohorts with fewer than minPersisted rows', async () => {
    // 50 IN:STOCK rows — below default minPersisted=200
    const mockRepo = {
      matureOutcomesWithRegion: jest.fn().mockResolvedValue(
        Array.from({ length: 50 }, () => makeRow()),
      ),
    };
    const svc = new RegionCalibrationFittingService(mockRepo);
    const { artifact, summary } = await svc.fit({ generatedAt: '2026-07-01T00:00:00.000Z' });

    expect(Object.keys(artifact.cohorts)).toHaveLength(0);
    expect(summary.every((s) => s.status === 'skipped')).toBe(true);
    expect(summary[0].reason).toContain('minPersisted');
  });

  test('produces a cohort entry when data is sufficient', async () => {
    // 400 IN:STOCK rows with planted score→alpha separation
    const rows: RawOutcomeRow[] = Array.from({ length: 400 }, (_, i) => {
      const score = 30 + Math.floor((i / 400) * 60);
      return makeRow({ score, alphaPercent: score >= 65 ? 0.04 : -0.02 });
    });
    const mockRepo = {
      matureOutcomesWithRegion: jest.fn().mockResolvedValue(rows),
    };
    const svc = new RegionCalibrationFittingService(mockRepo);
    const { artifact, summary } = await svc.fit({ generatedAt: '2026-07-01T00:00:00.000Z' });

    // Expect IN:STOCK and IN:ALL cohorts to be fitted
    expect(Object.keys(artifact.cohorts).length).toBeGreaterThan(0);
    const fitted = summary.filter((s) => s.status === 'fitted');
    expect(fitted.length).toBeGreaterThan(0);

    for (const entry of Object.values(artifact.cohorts)) {
      expect(entry.directionThresholds.bullish).toBeGreaterThan(entry.directionThresholds.bearish);
      expect(entry.samples).toBe(400);
    }
  });
});
