/**
 * SG-2 v4 evidence-model tests.
 *
 * Locks the invariants the v3 composite violated:
 *   - monotonicity (more same-direction evidence never lowers the score)
 *   - data-availability invariance (a no-evidence category does not drag toward 50)
 *   - decorrelation (collinear signals count as fewer independent families)
 * plus v3-parity for the version-agnostic `scoreInstrument` orchestrator.
 */
import { compositeV4, familyForCode, type CategoryEvaluationLike } from '../../../src/modules/signal-generation-engine/signal-evidence';
import { signal, scoreInstrument, compositeScore } from '../../../src/modules/signal-generation-engine/signal-scoring';
import { DEFAULT_SIGNAL_SCORING_CONFIG, type SignalScoringConfig } from '../../../src/modules/signal-generation-engine/signal-scoring.config';

const V4_CONFIG: SignalScoringConfig = { ...DEFAULT_SIGNAL_SCORING_CONFIG, scoringEngineVersion: 'v4' };

const cat = (score: number, pos: Array<[string, any]>, neg: Array<[string, any]> = []): CategoryEvaluationLike => ({
  score,
  signals: pos.map(([code, c]) => signal(code, code, c)),
  negativeSignals: neg.map(([code, c]) => signal(code, code, c)),
});

const empty = (): CategoryEvaluationLike => ({ score: 0.5, signals: [], negativeSignals: [] });

describe('compositeV4 — family mapping', () => {
  it('maps collinear trend signals to one family and diverse signals to many', () => {
    expect(familyForCode('PRICE_ABOVE_SMA50')).toBe('TREND');
    expect(familyForCode('SMA50_ABOVE_SMA200')).toBe('TREND');
    expect(familyForCode('ONE_MONTH_MOMENTUM')).toBe('MOMENTUM');
    expect(familyForCode('ONE_MONTH_MOMENTUM_NEGATIVE')).toBe('MOMENTUM');
    expect(familyForCode('CONFIRMED_VOLUME_BREAKOUT')).toBe('VOLUME');
    expect(familyForCode('SOMETHING_UNKNOWN')).toBe('OTHER');
  });
});

describe('compositeV4 — data-availability invariance (#2)', () => {
  it('a strong technical+momentum setup is NOT dragged toward 50 by an empty fundamentals category', () => {
    const technical = cat(0.85, [['PRICE_ABOVE_SMA50', 'TECHNICAL'], ['SMA50_ABOVE_SMA200', 'TECHNICAL']]);
    const momentum = cat(0.8, [['ONE_MONTH_MOMENTUM', 'MOMENTUM'], ['OUTPERFORMING_PEERS', 'MOMENTUM']]);
    const { score, components } = compositeV4(technical, momentum, empty(), V4_CONFIG);

    expect(components.categoryHasEvidence.fundamental).toBe(false);
    expect(components.effectiveWeights.fundamental).toBe(0); // weight dropped, not pinned at 0.5
    expect(components.effectiveWeights.technical + components.effectiveWeights.momentum).toBeCloseTo(1, 6);
    expect(score).toBeGreaterThan(60); // genuinely bullish, not muted toward NEUTRAL
  });

  it('returns exactly 50 only when there is no evidence anywhere', () => {
    const { score } = compositeV4(empty(), empty(), empty(), V4_CONFIG);
    expect(score).toBe(50);
  });
});

describe('compositeV4 — monotonicity (#7)', () => {
  it('adding a same-direction factor never lowers the score', () => {
    const base = compositeV4(
      cat(0.7, [['PRICE_ABOVE_SMA50', 'TECHNICAL']]),
      cat(0.6, [['ONE_MONTH_MOMENTUM', 'MOMENTUM']]),
      empty(),
      V4_CONFIG,
    ).score;
    const more = compositeV4(
      cat(0.75, [['PRICE_ABOVE_SMA50', 'TECHNICAL'], ['NEAR_52_WEEK_HIGH', 'TECHNICAL']]),
      cat(0.6, [['ONE_MONTH_MOMENTUM', 'MOMENTUM']]),
      empty(),
      V4_CONFIG,
    ).score;
    expect(more).toBeGreaterThanOrEqual(base);
  });

  it('adding a bullish factor that NEWLY grants a previously-empty category evidence does not lower the score', () => {
    // The weight-shift edge case: fundamentals goes from no-evidence (weight dropped)
    // to evidenced (weight reintroduced).  Even though rawLean can dilute, the new
    // aligned family + agreement must keep the score from dropping.
    const before = compositeV4(
      cat(0.9, [['PRICE_ABOVE_SMA50', 'TECHNICAL'], ['SMA50_ABOVE_SMA200', 'TECHNICAL']]),
      cat(0.85, [['ONE_MONTH_MOMENTUM', 'MOMENTUM']]),
      empty(),
      V4_CONFIG,
    ).score;
    const after = compositeV4(
      cat(0.9, [['PRICE_ABOVE_SMA50', 'TECHNICAL'], ['SMA50_ABOVE_SMA200', 'TECHNICAL']]),
      cat(0.85, [['ONE_MONTH_MOMENTUM', 'MOMENTUM']]),
      cat(0.72, [['POSITIVE_EPS', 'FUNDAMENTAL']]), // newly evidenced, bullish
      V4_CONFIG,
    ).score;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('property sweep: adding one bullish technical factor never lowers the score across leans', () => {
    for (let lean = 0.55; lean <= 0.99; lean += 0.05) {
      const oneFactor = compositeV4(cat(lean, [['PRICE_ABOVE_SMA50', 'TECHNICAL']]), empty(), empty(), V4_CONFIG).score;
      const twoFactor = compositeV4(
        cat(lean, [['PRICE_ABOVE_SMA50', 'TECHNICAL'], ['CONFIRMED_VOLUME_BREAKOUT', 'TECHNICAL']]),
        empty(), empty(), V4_CONFIG,
      ).score;
      expect(twoFactor).toBeGreaterThanOrEqual(oneFactor);
    }
  });
});

describe('compositeV4 — decorrelation (#3)', () => {
  it('diverse families produce stronger conviction than the same count of collinear signals', () => {
    // 3 collinear TREND signals vs 3 signals across 3 families, same category score.
    const collinear = compositeV4(
      cat(0.8, [['PRICE_ABOVE_SMA50', 'TECHNICAL'], ['SMA50_ABOVE_SMA200', 'TECHNICAL'], ['NEAR_52_WEEK_HIGH', 'TECHNICAL']]),
      empty(),
      empty(),
      V4_CONFIG,
    );
    const diverse = compositeV4(
      cat(0.8, [['PRICE_ABOVE_SMA50', 'TECHNICAL'], ['CONFIRMED_VOLUME_BREAKOUT', 'TECHNICAL'], ['RSI_RECOVERING', 'TECHNICAL']]),
      empty(),
      empty(),
      V4_CONFIG,
    );
    expect(diverse.components.alignedFamilies).toBeGreaterThan(collinear.components.alignedFamilies);
    expect(diverse.score).toBeGreaterThanOrEqual(collinear.score);
  });
});

describe('scoreInstrument — version routing & v3 parity', () => {
  const prices = Array.from({ length: 260 }, (_, i) => ({
    date: new Date(2026, 3, 28 - i).toISOString(),
    open: 200 - i * 0.2, high: 201 - i * 0.2, low: 199 - i * 0.2,
    close: 200 - i * 0.2, adjusted_close: 200 - i * 0.2,
    volume: i === 0 ? 1000 : 100,
  }));
  const input = { prices, relativeToPeers: 0.05, fundamental: { eps: 10, pe_ratio: 15 }, peerAveragePe: 20, peerAverageYield: null };

  it('v3 config reproduces the legacy compositeScore exactly and carries no v4 components', () => {
    const out = scoreInstrument(input, DEFAULT_SIGNAL_SCORING_CONFIG);
    expect(out.engineVersion).toBe('v3');
    expect(out.components).toBeNull();
    // Re-derive the v3 composite from the same category scores and assert identical.
    const expected = compositeScore(
      out.technicalScore, out.momentumScore, out.fundamentalScore,
      out.triggeredSignals.filter((s) => s.category === 'TECHNICAL').length,
      out.negativeSignals.filter((s) => s.category === 'TECHNICAL').length,
      out.triggeredSignals.filter((s) => s.category === 'MOMENTUM').length,
      out.negativeSignals.filter((s) => s.category === 'MOMENTUM').length,
      out.triggeredSignals.filter((s) => s.category === 'FUNDAMENTAL').length,
      out.negativeSignals.filter((s) => s.category === 'FUNDAMENTAL').length,
      DEFAULT_SIGNAL_SCORING_CONFIG,
    );
    expect(out.score).toBe(expected);
  });

  it('v4 config routes through the evidence model and attaches components', () => {
    const out = scoreInstrument(input, V4_CONFIG);
    expect(out.engineVersion).toBe('v4');
    expect(out.components).not.toBeNull();
    expect(out.components?.engineVersion).toBe('v4');
    expect(out.score).toBeGreaterThanOrEqual(0);
    expect(out.score).toBeLessThanOrEqual(100);
  });
});
