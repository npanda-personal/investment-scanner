import { describe, it, expect } from 'vitest';
import { pivotPointsStandard } from './pivotPoints';
import type { OHLCVBar } from '../types';

const bar = (h: number, l: number, c: number): OHLCVBar => ({
  time: '2024-06-20', open: l + 1, high: h, low: l, close: c, volume: 1000,
});

describe('pivotPointsStandard', () => {
  it('returns null for empty bars', () => {
    expect(pivotPointsStandard([])).toBeNull();
  });

  it('uses the last bar for computation', () => {
    const bars = [bar(200, 180, 190), bar(110, 90, 100)];
    const result = pivotPointsStandard(bars)!;
    expect(result.pp).toBeCloseTo(100);
  });

  it('computes classic floor-trader pivots correctly', () => {
    const h = 150, l = 100, c = 130;
    const pp = (h + l + c) / 3;
    const result = pivotPointsStandard([bar(h, l, c)])!;

    expect(result.pp).toBeCloseTo(pp);
    expect(result.r1).toBeCloseTo(2 * pp - l);
    expect(result.r2).toBeCloseTo(pp + (h - l));
    expect(result.r3).toBeCloseTo(h + 2 * (pp - l));
    expect(result.s1).toBeCloseTo(2 * pp - h);
    expect(result.s2).toBeCloseTo(pp - (h - l));
    expect(result.s3).toBeCloseTo(l - 2 * (h - pp));
  });

  it('R levels > PP > S levels', () => {
    const result = pivotPointsStandard([bar(150, 100, 130)])!;
    expect(result.r3).toBeGreaterThan(result.r2);
    expect(result.r2).toBeGreaterThan(result.r1);
    expect(result.r1).toBeGreaterThan(result.pp);
    expect(result.pp).toBeGreaterThan(result.s1);
    expect(result.s1).toBeGreaterThan(result.s2);
    expect(result.s2).toBeGreaterThan(result.s3);
  });
});
