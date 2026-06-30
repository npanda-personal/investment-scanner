import { describe, it, expect } from 'vitest';
import { isLowBaseGrowth, LOW_BASE_GROWTH_THRESHOLD_PCT } from './earningsTabModel';

describe('isLowBaseGrowth', () => {
  it('flags the near-zero / loss prior-base blow-ups seen on the Growth tab', () => {
    // Real values from /earnings-intelligence: prior quarter was ~breakeven or a loss.
    expect(isLowBaseGrowth(68652)).toBe(true);  // PPAP profit QoQ
    expect(isLowBaseGrowth(64300)).toBe(true);  // PPAP eps QoQ
    expect(isLowBaseGrowth(1802.8)).toBe(true); // EVEREADY profit QoQ
    expect(isLowBaseGrowth(-9034.8)).toBe(true); // sign-agnostic: magnitude is what matters
  });

  it('does not flag ordinary operating moves', () => {
    expect(isLowBaseGrowth(25.7)).toBe(false);  // PPAP rev QoQ
    expect(isLowBaseGrowth(-88)).toBe(false);   // ADVENTHTL profit QoQ — a real, meaningful drop
    expect(isLowBaseGrowth(49.9)).toBe(false);  // SANSTAR profit QoQ
    expect(isLowBaseGrowth(0)).toBe(false);
  });

  it('treats the threshold as inclusive and rejects non-finite / missing values', () => {
    expect(isLowBaseGrowth(LOW_BASE_GROWTH_THRESHOLD_PCT)).toBe(true);
    expect(isLowBaseGrowth(LOW_BASE_GROWTH_THRESHOLD_PCT - 0.01)).toBe(false);
    expect(isLowBaseGrowth(null)).toBe(false);
    expect(isLowBaseGrowth(undefined)).toBe(false);
    expect(isLowBaseGrowth(NaN)).toBe(false);
    expect(isLowBaseGrowth(Infinity)).toBe(false);
  });
});
