import type { OHLCVBar } from '../types';

export interface PivotLevels {
  pp: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

/**
 * Classic pivot point formula (Standard / Floor-trader pivots).
 * Uses the last bar as the reference session (the most recent complete EOD
 * session in our persisted data). Returns null if there are fewer than 1 bar.
 */
export function pivotPointsStandard(bars: OHLCVBar[]): PivotLevels | null {
  if (bars.length < 1) return null;
  const { high: h, low: l, close: c } = bars[bars.length - 1];
  const pp = (h + l + c) / 3;
  return {
    pp,
    r1: 2 * pp - l,
    r2: pp + (h - l),
    r3: h + 2 * (pp - l),
    s1: 2 * pp - h,
    s2: pp - (h - l),
    s3: l - 2 * (h - pp),
  };
}
