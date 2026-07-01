/// <reference types="@types/jest" />

/**
 * Unit tests for signal-region-calibration loader.
 *
 * We test via the exported pure functions (parseCalibrationArtifact,
 * resolveCohortFromArtifact) to avoid the fragile fs-mock+module-reload
 * pattern. The public API (fittedDirectionThresholds / fittedBaseWeights)
 * delegates to these helpers, so testing the helpers covers the full logic.
 *
 * The config-wiring test (resolveSignalScoringConfig falling back to 60/40 with
 * empty artifact) is also included — it tests the actual module as loaded,
 * which uses the shipped empty region-calibration.json file.
 */

import {
  parseCalibrationArtifact,
  resolveCohortFromArtifact,
  fittedDirectionThresholds,
  fittedBaseWeights,
  _getLoadedArtifact,
} from '../../../src/modules/signal-generation-engine/signal-region-calibration';
import { resolveSignalScoringConfig } from '../../../src/modules/signal-generation-engine/signal-scoring.config';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const VALID_COHORT_IN_STOCK = {
  directionThresholds: { bullish: 63, bearish: 38 },
  weights: { technical: 0.45, momentum: 0.35, fundamental: 0.20 },
  samples: 350,
  method: 'direction:bullish=63,bearish=38;spearman:corr=0.1234',
};

const VALID_COHORT_IN_ALL = {
  directionThresholds: { bullish: 62, bearish: 39 },
  weights: { technical: 0.40, momentum: 0.35, fundamental: 0.25 },
  samples: 500,
  method: 'direction:bullish=62,bearish=39;spearman:corr=0.0900',
};

function makeArtifactJson(cohorts: Record<string, unknown>): string {
  return JSON.stringify({
    generatedAt: '2026-07-01T00:00:00.000Z',
    modelVersion: 'signal-engine-v4.1',
    horizon: '20D',
    cohorts,
  });
}

// ── parseCalibrationArtifact ──────────────────────────────────────────────────

describe('parseCalibrationArtifact', () => {
  test('parses a valid artifact JSON', () => {
    const json = makeArtifactJson({ 'IN:STOCK': VALID_COHORT_IN_STOCK });
    const artifact = parseCalibrationArtifact(json);
    expect(artifact.cohorts['IN:STOCK']).toEqual(VALID_COHORT_IN_STOCK);
    expect(artifact.generatedAt).toBe('2026-07-01T00:00:00.000Z');
  });

  test('returns empty cohorts for invalid JSON', () => {
    const artifact = parseCalibrationArtifact('NOT_VALID_JSON');
    expect(artifact.cohorts).toEqual({});
  });

  test('returns empty cohorts when root is not an object', () => {
    const artifact = parseCalibrationArtifact('"just a string"');
    expect(artifact.cohorts).toEqual({});
  });

  test('returns empty cohorts when cohorts field is missing', () => {
    const artifact = parseCalibrationArtifact(JSON.stringify({ modelVersion: 'v4.1' }));
    expect(artifact.cohorts).toEqual({});
  });
});

// ── resolveCohortFromArtifact ─────────────────────────────────────────────────

describe('resolveCohortFromArtifact', () => {
  test('returns fitted directionThresholds for a present REGION:ASSETTYPE cohort', () => {
    const artifact = parseCalibrationArtifact(makeArtifactJson({ 'IN:STOCK': VALID_COHORT_IN_STOCK }));
    const result = resolveCohortFromArtifact(artifact, 'IN', 'STOCK');
    expect(result).not.toBeNull();
    expect(result!.directionThresholds).toEqual({ bullish: 63, bearish: 38 });
  });

  test('returns fitted weights for a present cohort', () => {
    const artifact = parseCalibrationArtifact(makeArtifactJson({ 'IN:STOCK': VALID_COHORT_IN_STOCK }));
    const result = resolveCohortFromArtifact(artifact, 'IN', 'STOCK');
    expect(result!.weights).toEqual({ technical: 0.45, momentum: 0.35, fundamental: 0.20 });
  });

  test('falls back to REGION:ALL when specific cohort is absent', () => {
    const artifact = parseCalibrationArtifact(makeArtifactJson({ 'IN:ALL': VALID_COHORT_IN_ALL }));
    const result = resolveCohortFromArtifact(artifact, 'IN', 'STOCK');
    expect(result).not.toBeNull();
    expect(result!.directionThresholds).toEqual({ bullish: 62, bearish: 39 });
  });

  test('returns null when neither REGION:ASSETTYPE nor REGION:ALL is present', () => {
    const artifact = parseCalibrationArtifact(makeArtifactJson({ 'US:STOCK': VALID_COHORT_IN_STOCK }));
    const result = resolveCohortFromArtifact(artifact, 'IN', 'STOCK');
    expect(result).toBeNull();
  });

  test('returns null for malformed cohort: bullish <= bearish', () => {
    const badCohort = {
      directionThresholds: { bullish: 40, bearish: 60 }, // inverted
      weights: { technical: 0.4, momentum: 0.35, fundamental: 0.25 },
      samples: 300,
      method: 'test',
    };
    const artifact = parseCalibrationArtifact(makeArtifactJson({ 'IN:STOCK': badCohort }));
    expect(resolveCohortFromArtifact(artifact, 'IN', 'STOCK')).toBeNull();
  });

  test('returns null for malformed cohort: weights do not sum to 1', () => {
    const badCohort = {
      directionThresholds: { bullish: 63, bearish: 38 },
      weights: { technical: 0.5, momentum: 0.5, fundamental: 0.5 }, // sum = 1.5
      samples: 300,
      method: 'test',
    };
    const artifact = parseCalibrationArtifact(makeArtifactJson({ 'IN:STOCK': badCohort }));
    expect(resolveCohortFromArtifact(artifact, 'IN', 'STOCK')).toBeNull();
  });

  test('returns null for malformed cohort: non-finite weight', () => {
    const badCohort = {
      directionThresholds: { bullish: 63, bearish: 38 },
      weights: { technical: NaN, momentum: 0.35, fundamental: 0.25 },
      samples: 300,
      method: 'test',
    };
    const artifact = parseCalibrationArtifact(makeArtifactJson({ 'IN:STOCK': badCohort }));
    expect(resolveCohortFromArtifact(artifact, 'IN', 'STOCK')).toBeNull();
  });

  test('REGION:ALL rollup is used only when specific key absent', () => {
    const artifact = parseCalibrationArtifact(makeArtifactJson({
      'IN:STOCK': VALID_COHORT_IN_STOCK,
      'IN:ALL': VALID_COHORT_IN_ALL,
    }));
    // Specific key IN:STOCK should win over IN:ALL
    const result = resolveCohortFromArtifact(artifact, 'IN', 'STOCK');
    expect(result!.directionThresholds).toEqual({ bullish: 63, bearish: 38 });
  });

  test('key matching is case-insensitive (uppercases the args)', () => {
    const artifact = parseCalibrationArtifact(makeArtifactJson({ 'IN:STOCK': VALID_COHORT_IN_STOCK }));
    const result = resolveCohortFromArtifact(artifact, 'in', 'stock');
    expect(result).not.toBeNull();
    expect(result!.directionThresholds).toEqual({ bullish: 63, bearish: 38 });
  });
});

// ── Public API (module-level singleton, uses the shipped empty artifact) ──────

describe('fittedDirectionThresholds and fittedBaseWeights (live module)', () => {
  test('returns null for null/empty region', () => {
    expect(fittedDirectionThresholds(null, 'STOCK')).toBeNull();
    expect(fittedDirectionThresholds(undefined, 'STOCK')).toBeNull();
    expect(fittedDirectionThresholds('', 'STOCK')).toBeNull();
  });

  test('returns null for any region when the shipped artifact has empty cohorts', () => {
    // The shipped region-calibration.json has cohorts:{}, so all lookups fall back to null
    const artifact = _getLoadedArtifact();
    expect(Object.keys(artifact.cohorts)).toHaveLength(0);
    expect(fittedDirectionThresholds('IN', 'STOCK')).toBeNull();
    expect(fittedBaseWeights('IN', 'STOCK')).toBeNull();
  });
});

// ── Config wiring test ────────────────────────────────────────────────────────

describe('signal-scoring.config wiring with empty artifact', () => {
  test('empty artifact → resolveSignalScoringConfig returns global defaults for IN:STOCK', () => {
    // The shipped region-calibration.json has cohorts:{}, so fittedDirectionThresholds/fittedBaseWeights
    // both return null, and the config falls back to the global 60/40 + IN_EQUITY_WEIGHTS.
    const config = resolveSignalScoringConfig({ region: 'IN', assetType: 'STOCK' });
    expect(config.directionThresholds).toEqual({ bullish: 60, bearish: 40 });
    expect(config.weights).toEqual({ technical: 0.4, momentum: 0.35, fundamental: 0.25 });
  });
});
