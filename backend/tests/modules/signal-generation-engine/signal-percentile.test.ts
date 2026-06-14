/**
 * SG-3b: RS percentile must rank against the cohort UNIVERSE distribution, not the page,
 * so a stock's percentile is stable across different page sizes/filters.
 */
import { attachRsPercentiles } from '../../../src/modules/signal-generation-engine/signal-percentile';

const sig = (id: string, score: number): any => ({ instrument_id: id, score });

describe('attachRsPercentiles (SG-3b)', () => {
  it('ranks served signals within the universe distribution (stable across page sizes)', () => {
    const universe = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    // A single served signal scoring 50 sits mid-universe regardless of page composition.
    const page1 = attachRsPercentiles([sig('a', 50)], universe);
    const page2 = attachRsPercentiles([sig('a', 50), sig('b', 95)], universe);
    expect(page1[0].rsPercentile).toBe(page2[0].rsPercentile); // page-independent
    expect(page1[0].rsPercentile).toBeGreaterThan(30);
    expect(page1[0].rsPercentile).toBeLessThan(60);
  });

  it('top-of-universe score gets ~100, bottom ~0', () => {
    const universe = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const out = attachRsPercentiles([sig('hi', 100), sig('lo', 10)], universe);
    expect(out.find((s) => s.instrument_id === 'hi')?.rsPercentile).toBe(100);
    expect(out.find((s) => s.instrument_id === 'lo')?.rsPercentile).toBe(0);
  });

  it('falls back to served-set ranking when the universe read is empty/too small', () => {
    const out = attachRsPercentiles([sig('a', 30), sig('b', 70)], []);
    expect(out.find((s) => s.instrument_id === 'b')?.rsPercentile).toBe(100);
    expect(out.find((s) => s.instrument_id === 'a')?.rsPercentile).toBe(0);
  });

  it('nulls percentile when neither universe nor served set has >= 2 scores', () => {
    expect(attachRsPercentiles([sig('a', 50)], [])[0].rsPercentile).toBeNull();
  });
});
