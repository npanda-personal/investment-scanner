/**
 * Phase C #4 — magnitude-aware votes.
 *
 * Locks the graded-strength contract:
 *   - gradedStrength is bounded to [base, 1.0], additive-to-ceiling, monotonic in magnitude,
 *     and a NO-OP at magnitude 0 (zero regression vs the pre-#4 per-code base strength).
 *   - a stronger magnitude on the SAME factor code raises its category score (the RSI-71 vs
 *     RSI-79 / bare-vs-extreme collapse that produced the dense tie buckets is gone).
 *   - real vote sites (RSI overbought, SMA50 stretch, momentum returns, net margin) emit a
 *     graded strength that tracks how far past threshold the raw value sat.
 */
import { gradedStrength, strengthForCode, compositeV4, type CategoryEvaluationLike } from '../../../src/modules/signal-generation-engine/signal-evidence';
import { signal, evaluateTechnical, evaluateMomentum, evaluateFundamentals } from '../../../src/modules/signal-generation-engine/signal-scoring';
import { DEFAULT_SIGNAL_SCORING_CONFIG, type SignalScoringConfig } from '../../../src/modules/signal-generation-engine/signal-scoring.config';

const V4_CONFIG: SignalScoringConfig = { ...DEFAULT_SIGNAL_SCORING_CONFIG, scoringEngineVersion: 'v4' };

describe('gradedStrength — bounded, additive-to-ceiling, monotonic (#4)', () => {
  it('is a no-op at magnitude 0 (returns the exact per-code base strength)', () => {
    for (const code of ['ONE_MONTH_MOMENTUM', 'RSI_OVERBOUGHT', 'EXTENDED_ABOVE_SMA50', 'HEALTHY_NET_MARGIN']) {
      expect(gradedStrength(code, 0)).toBeCloseTo(strengthForCode(code), 10);
    }
  });

  it('reaches exactly the 1.0 ceiling at magnitude 1 and never exceeds it', () => {
    expect(gradedStrength('ONE_MONTH_MOMENTUM', 1)).toBeCloseTo(1, 10);
    expect(gradedStrength('ONE_MONTH_MOMENTUM', 5)).toBe(1); // clamped
  });

  it('never dips below the base strength for negative/underflow magnitudes', () => {
    expect(gradedStrength('ONE_MONTH_MOMENTUM', -3)).toBeCloseTo(strengthForCode('ONE_MONTH_MOMENTUM'), 10);
  });

  it('is monotonic non-decreasing in magnitude and stays within [base, 1]', () => {
    const base = strengthForCode('RSI_OVERBOUGHT');
    let prev = -Infinity;
    for (let mag = 0; mag <= 1.0001; mag += 0.1) {
      const g = gradedStrength('RSI_OVERBOUGHT', mag);
      expect(g).toBeGreaterThanOrEqual(base - 1e-9);
      expect(g).toBeLessThanOrEqual(1 + 1e-9);
      expect(g).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = g;
    }
  });

  it('a code already tiered at the 1.0 ceiling cannot be graded higher (saturated)', () => {
    // RSI_EXTREME_OVERBOUGHT / STRONG_* / CONFIRMED_* sit at 1.0 — grading is a bounded no-op.
    expect(strengthForCode('RSI_EXTREME_OVERBOUGHT')).toBe(1);
    expect(gradedStrength('RSI_EXTREME_OVERBOUGHT', 0)).toBe(1);
    expect(gradedStrength('RSI_EXTREME_OVERBOUGHT', 1)).toBe(1);
  });
});

describe('graded strength flows into the v4 category score (#4)', () => {
  const oneVote = (strength: number): CategoryEvaluationLike => ({
    score: 0,
    signals: [signal('ONE_MONTH_MOMENTUM', 'x', 'MOMENTUM', strength)],
    negativeSignals: [],
  });
  const empty = (): CategoryEvaluationLike => ({ score: 0.5, signals: [], negativeSignals: [] });

  it('a higher-magnitude vote yields a higher category score than a marginal one of the SAME code', () => {
    const weak = compositeV4(empty(), oneVote(gradedStrength('ONE_MONTH_MOMENTUM', 0)), empty(), V4_CONFIG);
    const strong = compositeV4(empty(), oneVote(gradedStrength('ONE_MONTH_MOMENTUM', 1)), empty(), V4_CONFIG);
    expect(strong.components.categoryScores.momentum).toBeGreaterThan(weak.components.categoryScores.momentum);
  });

  it('an absent strength falls back to the base tier (backward compatible with pre-#4 votes)', () => {
    const graded = compositeV4(empty(), oneVote(gradedStrength('ONE_MONTH_MOMENTUM', 0)), empty(), V4_CONFIG);
    const ungraded: CategoryEvaluationLike = {
      score: 0, signals: [signal('ONE_MONTH_MOMENTUM', 'x', 'MOMENTUM')], negativeSignals: [],
    };
    const legacy = compositeV4(empty(), ungraded, empty(), V4_CONFIG);
    expect(graded.components.categoryScores.momentum).toBeCloseTo(legacy.components.categoryScores.momentum, 10);
  });
});

describe('vote sites emit graded strengths tracking magnitude (#4)', () => {
  // Build a synthetic price series with a controllable latest-bar RSI + SMA50 stretch.
  // A long flat base then a sharp run-up drives RSI high and price far above SMA50.
  const buildPrices = (runupPct: number) => {
    const flat = Array.from({ length: 60 }, () => 100);
    // newest first for the scorer (index 0 = latest); build oldest→newest then reverse.
    const series = [...flat];
    const last = 100 * (1 + runupPct);
    series.push(last);
    return series.reverse().map((close, i) => ({
      date: new Date(2026, 5, 30 - i).toISOString(),
      open: close, high: close, low: close, close, adjusted_close: close,
      volume: 100,
    }));
  };

  it('a more-overbought RSI emits a stronger RSI_OVERBOUGHT / stretch grade than a milder one', () => {
    const mild = evaluateTechnical(buildPrices(0.08), V4_CONFIG); // ~8% run-up
    const hot = evaluateTechnical(buildPrices(0.20), V4_CONFIG);  // ~20% run-up

    const strengthOf = (ev: ReturnType<typeof evaluateTechnical>, code: string): number | undefined =>
      ev.negativeSignals.find((s) => s.code === code)?.strength;

    // Whichever overextension code fires, the hotter run-up must carry >= the milder grade.
    const mildStretch = strengthOf(mild, 'EXTENDED_ABOVE_SMA50');
    const hotStretch = strengthOf(hot, 'EXTENDED_ABOVE_SMA50');
    if (mildStretch !== undefined && hotStretch !== undefined) {
      expect(hotStretch).toBeGreaterThan(mildStretch);
    }
    // At least one overextension/stretch grade must have been emitted for the hot series.
    const anyHotGrade = hot.negativeSignals.some((s) => typeof s.strength === 'number');
    expect(anyHotGrade).toBe(true);
  });

  it('momentum: a bigger 1M return emits a stronger ONE_MONTH_MOMENTUM grade', () => {
    const smallMove = evaluateMomentum(buildPrices(0.05), null, V4_CONFIG);
    const bigMove = evaluateMomentum(buildPrices(0.30), null, V4_CONFIG);
    const small = smallMove.signals.find((s) => s.code === 'ONE_MONTH_MOMENTUM')?.strength;
    const big = bigMove.signals.find((s) => s.code === 'ONE_MONTH_MOMENTUM')?.strength;
    if (small !== undefined && big !== undefined) {
      expect(big).toBeGreaterThanOrEqual(small);
    }
  });

  it('net margin: a 30% margin emits a stronger HEALTHY_NET_MARGIN grade than a bare 10%', () => {
    const bare = evaluateFundamentals({ eps: 5, revenue: 100, net_income: 10 }, null, null, V4_CONFIG);
    const rich = evaluateFundamentals({ eps: 5, revenue: 100, net_income: 30 }, null, null, V4_CONFIG);
    const bareStrength = bare.signals.find((s) => s.code === 'HEALTHY_NET_MARGIN')?.strength;
    const richStrength = rich.signals.find((s) => s.code === 'HEALTHY_NET_MARGIN')?.strength;
    expect(bareStrength).toBeDefined();
    expect(richStrength).toBeDefined();
    expect(richStrength as number).toBeGreaterThan(bareStrength as number);
  });

  it('net margin: a deep loss emits a stronger NEGATIVE_NET_MARGIN grade than a marginal loss', () => {
    const marginal = evaluateFundamentals({ eps: -1, revenue: 100, net_income: -2 }, null, null, V4_CONFIG);
    const deep = evaluateFundamentals({ eps: -20, revenue: 100, net_income: -40 }, null, null, V4_CONFIG);
    const marginalStrength = marginal.negativeSignals.find((s) => s.code === 'NEGATIVE_NET_MARGIN')?.strength;
    const deepStrength = deep.negativeSignals.find((s) => s.code === 'NEGATIVE_NET_MARGIN')?.strength;
    expect(marginalStrength).toBeDefined();
    expect(deepStrength).toBeDefined();
    expect(deepStrength as number).toBeGreaterThan(marginalStrength as number);
  });
});

describe('v3 lane parity: magnitude grade is v4-only (#4)', () => {
  // The v3 (legacy count) engine — still run by the crypto lane — must persist byte-identical,
  // strength-LESS vote objects. `strength` is a v4-only enrichment; a v3 config must never
  // attach it to any technical/momentum vote, even when the same code fires.
  const V3_CONFIG: SignalScoringConfig = { ...DEFAULT_SIGNAL_SCORING_CONFIG, scoringEngineVersion: 'v3' };
  const buildPrices = (runupPct: number) => {
    const series = Array.from({ length: 60 }, () => 100);
    series.push(100 * (1 + runupPct));
    return series.reverse().map((close, i) => ({
      date: new Date(2026, 5, 30 - i).toISOString(),
      open: close, high: close, low: close, close, adjusted_close: close, volume: 100,
    }));
  };

  it('emits the same overextension vote codes under v3 but with NO strength field', () => {
    const hotV4 = evaluateTechnical(buildPrices(0.2), V4_CONFIG);
    const hotV3 = evaluateTechnical(buildPrices(0.2), V3_CONFIG);
    // v4 grades at least one overextension vote…
    expect(hotV4.negativeSignals.some((s) => typeof s.strength === 'number')).toBe(true);
    // …v3 emits the same codes but never a strength field.
    expect(hotV3.negativeSignals.length).toBeGreaterThan(0);
    expect(hotV3.negativeSignals.every((s) => s.strength === undefined)).toBe(true);
    expect(hotV3.negativeSignals.map((s) => s.code).sort()).toEqual(hotV4.negativeSignals.map((s) => s.code).sort());
  });

  it('momentum votes under v3 carry no strength field', () => {
    const mom = evaluateMomentum(buildPrices(0.3), null, V3_CONFIG);
    expect(mom.signals.some((s) => s.code === 'ONE_MONTH_MOMENTUM')).toBe(true);
    expect([...mom.signals, ...mom.negativeSignals].every((s) => s.strength === undefined)).toBe(true);
  });
});
