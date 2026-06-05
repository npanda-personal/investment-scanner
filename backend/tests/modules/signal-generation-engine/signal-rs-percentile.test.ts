/// <reference types="@types/jest" />
/**
 * NR-6: relative-strength percentile ranking (withRsPercentiles).
 * Pure in-memory ranking of the served signal set by composite score — no DB.
 */
import { SignalGenerationEngineService } from '../../../src/modules/signal-generation-engine/signal-generation-engine.service';
import type { SignalResultDto } from '../../../src/modules/signal-generation-engine/signal-generation-engine.types';

const sig = (score: number, symbol: string): SignalResultDto =>
  ({ symbol, instrument_id: symbol, score } as unknown as SignalResultDto);

// Access the private method without constructing the full dependency graph.
const rank = (signals: SignalResultDto[]): SignalResultDto[] =>
  (SignalGenerationEngineService.prototype as any).withRsPercentiles.call(
    SignalGenerationEngineService.prototype,
    signals,
  );

describe('NR-6 RS percentile ranking', () => {
  it('maps weakest score → 0 and strongest → 100', () => {
    const out = rank([sig(10, 'LOW'), sig(50, 'MID'), sig(90, 'HIGH')]);
    const by = Object.fromEntries(out.map((s) => [s.symbol, s.rsPercentile]));
    expect(by.LOW).toBe(0);
    expect(by.HIGH).toBe(100);
    expect(by.MID).toBeGreaterThan(0);
    expect(by.MID).toBeLessThan(100);
  });

  it('a 2-signal universe yields extremes 0 and 100', () => {
    const out = rank([sig(30, 'A'), sig(70, 'B')]);
    const by = Object.fromEntries(out.map((s) => [s.symbol, s.rsPercentile]));
    expect(by.A).toBe(0);
    expect(by.B).toBe(100);
  });

  it('a single signal gets null (no meaningful ranking)', () => {
    const out = rank([sig(80, 'ONLY')]);
    expect(out[0].rsPercentile).toBeNull();
    expect(out[0].relativeReturn).toBeNull();
  });

  it('tied scores share the lower-bound rank', () => {
    const out = rank([sig(50, 'A'), sig(50, 'B'), sig(90, 'C')]);
    const by = Object.fromEntries(out.map((s) => [s.symbol, s.rsPercentile]));
    expect(by.A).toBe(by.B); // ties identical
    expect(by.A).toBe(0); // both at the lowest score → rank 0
    expect(by.C).toBe(100);
  });

  it('relativeReturn = (score-50)/50', () => {
    const out = rank([sig(0, 'A'), sig(50, 'B'), sig(100, 'C')]);
    const by = Object.fromEntries(out.map((s) => [s.symbol, s.relativeReturn]));
    expect(by.A).toBeCloseTo(-1);
    expect(by.B).toBeCloseTo(0);
    expect(by.C).toBeCloseTo(1);
  });
});
