/**
 * H1 regression: after the v3→v4 modelVersion flip, a same-date row set carrying both a
 * legacy v3 row and a new v4 row for one instrument must collapse to ONE row (the active
 * v4 version) — never double-count in the fast read path / direction counts.
 */
import { dedupeTrustedRows } from '../../../src/modules/signal-generation-engine/signal-read-policy';

const row = (instrument_id: string, modelVersion: string, score: number) => ({ instrument_id, modelVersion, score });

describe('dedupeTrustedRows (H1)', () => {
  it('collapses v3+v4 rows for the same instrument to the active v4 row', () => {
    const out = dedupeTrustedRows([
      row('a', 'signal-engine-v3', 70),
      row('a', 'signal-engine-v4', 55),
      row('b', 'signal-engine-v4', 60),
    ], 'signal-engine-v4');
    expect(out).toHaveLength(2);
    expect(out.find((r) => r.instrument_id === 'a')?.modelVersion).toBe('signal-engine-v4');
    expect(out.find((r) => r.instrument_id === 'a')?.score).toBe(55); // v4 supersedes v3
  });

  it('is a no-op when instruments are already unique', () => {
    const rows = [row('a', 'signal-engine-v4', 60), row('b', 'signal-engine-v4', 40)];
    expect(dedupeTrustedRows(rows, 'signal-engine-v4')).toHaveLength(2);
  });

  it('preserves first-seen display order', () => {
    const out = dedupeTrustedRows([
      row('x', 'signal-engine-v4', 90),
      row('y', 'signal-engine-v4', 80),
      row('x', 'signal-engine-v3', 10),
    ], 'signal-engine-v4');
    expect(out.map((r) => r.instrument_id)).toEqual(['x', 'y']);
  });

  it('keeps a legacy row when no active-version row exists for that instrument', () => {
    const out = dedupeTrustedRows([row('a', 'signal-engine-v3', 70)], 'signal-engine-v4');
    expect(out).toHaveLength(1);
    expect(out[0].modelVersion).toBe('signal-engine-v3');
  });
});
