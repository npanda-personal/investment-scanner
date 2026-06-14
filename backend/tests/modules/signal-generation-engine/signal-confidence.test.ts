/**
 * SG-6 conviction-confidence tests.
 * Confidence must reflect conviction (displacement), not just data sufficiency.
 */
import { resolveConfidence } from '../../../src/modules/signal-generation-engine/signal-confidence';

describe('resolveConfidence', () => {
  const full = { priceBars: 260, hasFundamental: true, signalCount: 8, isStale: false };

  it('v3 path (no displacement) reproduces legacy data-sufficiency tiers', () => {
    expect(resolveConfidence({ ...full }).confidence).toBe('HIGH');
    expect(resolveConfidence({ priceBars: 60, hasFundamental: false, signalCount: 3, isStale: false }).confidence).toBe('MEDIUM');
    expect(resolveConfidence({ priceBars: 20, hasFundamental: false, signalCount: 1, isStale: false }).confidence).toBe('LOW');
  });

  it('v4: data-complete but LOW conviction is NOT HIGH (the 51-score-with-lots-of-data bug)', () => {
    const out = resolveConfidence({ ...full, displacement: 0.01 });
    expect(out.confidence).not.toBe('HIGH');
    expect(out.dataComplete).toBe(true); // data is complete, but conviction is not — surfaced separately
  });

  it('v4: data-complete AND high conviction is HIGH', () => {
    expect(resolveConfidence({ ...full, displacement: 0.3 }).confidence).toBe('HIGH');
  });

  it('v4: high conviction but stale data cannot be HIGH', () => {
    expect(resolveConfidence({ ...full, isStale: true, displacement: 0.3 }).confidence).toBe('LOW');
  });

  it('reports dataComplete independently of confidence', () => {
    const thin = resolveConfidence({ priceBars: 60, hasFundamental: false, signalCount: 4, isStale: false, displacement: 0.3 });
    expect(thin.dataComplete).toBe(false);
    expect(thin.confidence).toBe('MEDIUM'); // conviction + medium data
  });
});
