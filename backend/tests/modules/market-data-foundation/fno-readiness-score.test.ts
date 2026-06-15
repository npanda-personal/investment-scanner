/// <reference types="@types/jest" />
/**
 * F&O Readiness Score — composite scoring unit tests.
 *
 * Asserts the direction-aware blend ranks confirmed long candidates above
 * contradicted ones, that the F&O-ban gate demotes, and that absent inputs
 * degrade to a neutral midpoint rather than unfairly zeroing a stock.
 */
import {
  computeFnoReadiness,
  FNO_BAN_PENALTY_FACTOR,
  type FnoReadinessInput,
} from '../../../src/modules/market-data-foundation/analytics/fno-readiness-score';

const base: FnoReadinessInput = {
  signalScore: 80,
  rsPercentile: 80,
  range52wPositionPct: 80,
  deliveryPct: 60,
  buildupLabel: 'LONG_BUILDUP',
  pcrOi: 0.9,
  inFnoBan: false,
};

describe('computeFnoReadiness', () => {
  it('scores in 0–100 and grades a strong, confirmed long candidate as A', () => {
    const r = computeFnoReadiness(base);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.grade).toBe('A');
  });

  it('ranks LONG_BUILDUP above SHORT_BUILDUP, all else equal', () => {
    const longBuildup = computeFnoReadiness({ ...base, buildupLabel: 'LONG_BUILDUP' });
    const shortBuildup = computeFnoReadiness({ ...base, buildupLabel: 'SHORT_BUILDUP' });
    expect(longBuildup.score).toBeGreaterThan(shortBuildup.score);
    expect(longBuildup.components.derivativesPositioning)
      .toBeGreaterThan(shortBuildup.components.derivativesPositioning);
  });

  it('halves the readiness of an F&O-banned stock', () => {
    const clean = computeFnoReadiness(base);
    const banned = computeFnoReadiness({ ...base, inFnoBan: true });
    expect(banned.score).toBe(Math.round(clean.score * FNO_BAN_PENALTY_FACTOR));
    expect(banned.score).toBeLessThan(clean.score);
  });

  it('trims derivatives positioning when PCR is at an extreme', () => {
    const normal = computeFnoReadiness({ ...base, pcrOi: 0.9 });
    const extreme = computeFnoReadiness({ ...base, pcrOi: 2.0 });
    expect(extreme.components.derivativesPositioning)
      .toBeLessThan(normal.components.derivativesPositioning);
  });

  it('degrades absent inputs to a neutral midpoint, not zero', () => {
    const r = computeFnoReadiness({
      signalScore: null,
      rsPercentile: null,
      range52wPositionPct: null,
      deliveryPct: null,
      buildupLabel: null,
      pcrOi: null,
      inFnoBan: false,
    });
    // All-neutral inputs → ~50, grade B (neither penalized to 0 nor inflated to A).
    expect(r.score).toBe(50);
    expect(r.grade).toBe('B');
    expect(r.components.derivativesPositioning).toBe(50);
  });

  it('rewards a higher base signal score monotonically', () => {
    const weak = computeFnoReadiness({ ...base, signalScore: 30 });
    const strong = computeFnoReadiness({ ...base, signalScore: 95 });
    expect(strong.score).toBeGreaterThan(weak.score);
  });
});
