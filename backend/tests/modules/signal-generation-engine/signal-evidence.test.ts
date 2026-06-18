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
import { signal, scoreInstrument, compositeScore, directionForScore } from '../../../src/modules/signal-generation-engine/signal-scoring';
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

  it('maps the Phase 1 YoY growth codes to an independent GROWTH family', () => {
    expect(familyForCode('REVENUE_GROWTH_YOY')).toBe('GROWTH');
    expect(familyForCode('REVENUE_DECLINE_YOY')).toBe('GROWTH');
    expect(familyForCode('EPS_GROWTH_YOY')).toBe('GROWTH');
    expect(familyForCode('EPS_DECLINE_YOY')).toBe('GROWTH');
    // GROWTH is distinct from PROFITABILITY/VALUATION so it adds genuine breadth.
    expect(familyForCode('POSITIVE_EPS')).toBe('PROFITABILITY');
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
    // Carry a constant momentum vote so both sides clear the breadth gate (>=2 categories);
    // otherwise the cap would collapse every single-category directional score to a constant
    // and the monotonicity assertion would pass trivially.
    const mom = (): CategoryEvaluationLike => cat(0.7, [['ONE_MONTH_MOMENTUM', 'MOMENTUM']]);
    for (let lean = 0.55; lean <= 0.99; lean += 0.05) {
      const oneFactor = compositeV4(cat(lean, [['PRICE_ABOVE_SMA50', 'TECHNICAL']]), mom(), empty(), V4_CONFIG).score;
      const twoFactor = compositeV4(
        cat(lean, [['PRICE_ABOVE_SMA50', 'TECHNICAL'], ['CONFIRMED_VOLUME_BREAKOUT', 'TECHNICAL']]),
        mom(), empty(), V4_CONFIG,
      ).score;
      expect(twoFactor).toBeGreaterThanOrEqual(oneFactor);
    }
  });
});

describe('compositeV4 — decorrelation (#3)', () => {
  it('diverse families produce stronger conviction than the same count of collinear signals', () => {
    // 3 collinear TREND signals vs 3 signals across 3 families, same category score.  A
    // constant momentum vote keeps both past the breadth gate so the score comparison reflects
    // family decorrelation rather than both being capped to the deadband edge.
    const mom = (): CategoryEvaluationLike => cat(0.7, [['ONE_MONTH_MOMENTUM', 'MOMENTUM']]);
    const collinear = compositeV4(
      cat(0.8, [['PRICE_ABOVE_SMA50', 'TECHNICAL'], ['SMA50_ABOVE_SMA200', 'TECHNICAL'], ['NEAR_52_WEEK_HIGH', 'TECHNICAL']]),
      mom(),
      empty(),
      V4_CONFIG,
    );
    const diverse = compositeV4(
      cat(0.8, [['PRICE_ABOVE_SMA50', 'TECHNICAL'], ['CONFIRMED_VOLUME_BREAKOUT', 'TECHNICAL'], ['RSI_RECOVERING', 'TECHNICAL']]),
      mom(),
      empty(),
      V4_CONFIG,
    );
    expect(diverse.components.alignedFamilies).toBeGreaterThan(collinear.components.alignedFamilies);
    expect(diverse.score).toBeGreaterThanOrEqual(collinear.score);
  });
});

describe('compositeV4 — evidence-breadth gate (anti thin-evidence inflation)', () => {
  it('a lone single-category technical vote is capped to NEUTRAL (no longer surfaces as BULLISH)', () => {
    const technical = cat(0.7222, [['PRICE_ABOVE_SMA50', 'TECHNICAL']]); // one TREND family only
    const { score, components } = compositeV4(technical, empty(), empty(), V4_CONFIG);

    expect(components.evidencedCategories).toBe(1);
    expect(components.breadthDamped).toBe(true);
    expect(score).toBe(V4_CONFIG.directionThresholds.bullish - 1); // capped into the deadband
    expect(directionForScore(score, V4_CONFIG)).toBe('NEUTRAL');
  });

  it('a single category cannot bypass the gate by firing several families (the family-OR leak)', () => {
    // TREND + VOLUME + MEAN_REVERSION — 3 families, but still ONE analysis dimension.
    const technical = cat(0.85, [
      ['PRICE_ABOVE_SMA50', 'TECHNICAL'],         // TREND
      ['CONFIRMED_VOLUME_BREAKOUT', 'TECHNICAL'],  // VOLUME
      ['RSI_RECOVERING', 'TECHNICAL'],             // MEAN_REVERSION
    ]);
    const { score, components } = compositeV4(technical, empty(), empty(), V4_CONFIG);
    expect(components.alignedFamilies).toBeGreaterThanOrEqual(3);
    expect(components.evidencedCategories).toBe(1);
    expect(components.breadthDamped).toBe(true);
    expect(directionForScore(score, V4_CONFIG)).toBe('NEUTRAL');
  });

  it('even a heavily-loaded single category stays NEUTRAL (cap holds regardless of magnitude)', () => {
    const technical = cat(0.95, [
      ['PRICE_ABOVE_SMA50', 'TECHNICAL'],
      ['SMA50_ABOVE_SMA200', 'TECHNICAL'],
      ['CONFIRMED_VOLUME_BREAKOUT', 'TECHNICAL'],
      ['NEAR_52_WEEK_HIGH', 'TECHNICAL'],
    ]);
    const { score } = compositeV4(technical, empty(), empty(), V4_CONFIG);
    expect(score).toBeLessThan(V4_CONFIG.directionThresholds.bullish);
  });

  it('a legitimate two-category bullish setup clears the gate and stays BULLISH (regression)', () => {
    const technical = cat(0.85, [['PRICE_ABOVE_SMA50', 'TECHNICAL'], ['SMA50_ABOVE_SMA200', 'TECHNICAL']]);
    const momentum = cat(0.8, [['ONE_MONTH_MOMENTUM', 'MOMENTUM']]);
    const { score, components } = compositeV4(technical, momentum, empty(), V4_CONFIG);
    expect(components.evidencedCategories).toBe(2);
    expect(components.breadthDamped).toBe(false);
    expect(score).toBeGreaterThan(V4_CONFIG.directionThresholds.bullish);
  });

  it('is symmetric: a lone single-category bearish vote is capped out of BEARISH', () => {
    const technical = cat(0.2778, [], [['PRICE_BELOW_SMA50', 'TECHNICAL']]);
    const { score, components } = compositeV4(technical, empty(), empty(), V4_CONFIG);
    expect(components.breadthDamped).toBe(true);
    expect(score).toBe(V4_CONFIG.directionThresholds.bearish + 1);
    expect(directionForScore(score, V4_CONFIG)).toBe('NEUTRAL');
  });

  it('when the gate caps a directional score, effectiveDisplacement is reduced but keeps its sign', () => {
    const capped = compositeV4(cat(0.72, [['PRICE_ABOVE_SMA50', 'TECHNICAL']]), empty(), empty(), V4_CONFIG).components;
    expect(Math.abs(capped.effectiveDisplacement)).toBeLessThan(Math.abs(capped.displacement));
    expect(Math.sign(capped.effectiveDisplacement)).toBe(Math.sign(capped.displacement));
  });

  it('a single evidenced category that lands inside the deadband is not flagged as breadth-damped', () => {
    // One evidenced technical category whose bullish and bearish votes balance to a NEUTRAL
    // lean: it HAS evidence (evidencedCategories === 1) but is not directional, so there is
    // nothing to cap and the gate must NOT fire.
    const technical = cat(0.5, [['PRICE_ABOVE_SMA50', 'TECHNICAL']], [['RSI_OVERBOUGHT', 'TECHNICAL']]);
    const { score, components } = compositeV4(technical, empty(), empty(), V4_CONFIG);
    expect(components.evidencedCategories).toBe(1);
    expect(directionForScore(score, V4_CONFIG)).toBe('NEUTRAL');
    expect(components.breadthDamped).toBe(false);
  });

  it('a no-evidence instrument scores exactly 50 and is not flagged as breadth-damped', () => {
    const { score, components } = compositeV4(empty(), empty(), empty(), V4_CONFIG);
    expect(score).toBe(50);
    expect(components.evidencedCategories).toBe(0);
    expect(components.breadthDamped).toBe(false);
  });

  it('v3 compositeScore is untouched: the same single-vote instrument is already NEUTRAL (~54)', () => {
    // v3 dilutes via the two pinned-0.5 categories rather than capping; the gate is v4-only.
    const v3 = compositeScore(0.75, 0.5, 0.5, 1, 0, 0, 0, 0, 0, DEFAULT_SIGNAL_SCORING_CONFIG);
    expect(v3).toBe(54);
    expect(directionForScore(v3, DEFAULT_SIGNAL_SCORING_CONFIG)).toBe('NEUTRAL');
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

  // Phase 1 growth votes: multi-period fundamentals with strong YoY revenue + EPS growth.
  // Fixtures use the runtime snake_case shape from formatFundamentalsResponse
  // (period_type, period_end_date as ISO string) — NOT camelCase.
  const day = 24 * 60 * 60 * 1000;
  const periodEnd = (d: number) => new Date(Date.UTC(2026, 2, 31) - d * day).toISOString();
  const growthRecords = [
    { period_type: 'QUARTERLY', period_end_date: periodEnd(0), revenue: 140, eps: 14, net_income: 20 },
    { period_type: 'QUARTERLY', period_end_date: periodEnd(91), revenue: 120, eps: 12, net_income: 18 },
    { period_type: 'QUARTERLY', period_end_date: periodEnd(365), revenue: 100, eps: 10, net_income: 15 },
  ];
  const growthInput = {
    prices, relativeToPeers: 0.05,
    fundamental: { eps: 14, revenue: 140, net_income: 20, pe_ratio: 15 },
    fundamentalRecords: growthRecords,
    peerAveragePe: 20, peerAverageYield: null,
  };

  it('v4: strong YoY revenue+EPS growth fires the growth votes and adds a GROWTH family', () => {
    const out = scoreInstrument(growthInput, V4_CONFIG);
    const codes = out.triggeredSignals.map((s) => s.code);
    expect(codes).toEqual(expect.arrayContaining(['REVENUE_GROWTH_YOY', 'EPS_GROWTH_YOY']));
    const families = new Set(
      [...out.triggeredSignals, ...out.negativeSignals].map((s) => familyForCode(s.code)),
    );
    expect(families.has('GROWTH')).toBe(true);
  });

  it('v3: the SAME multi-period data produces NO growth votes (byte-identical to no-records)', () => {
    const withRecords = scoreInstrument(growthInput, DEFAULT_SIGNAL_SCORING_CONFIG);
    const codes = withRecords.triggeredSignals.map((s) => s.code);
    expect(codes).not.toContain('REVENUE_GROWTH_YOY');
    expect(codes).not.toContain('EPS_GROWTH_YOY');
    // Identical to scoring the same instrument with fundamentalRecords omitted entirely.
    const { fundamentalRecords, ...withoutRecords } = growthInput;
    const baseline = scoreInstrument(withoutRecords, DEFAULT_SIGNAL_SCORING_CONFIG);
    expect(withRecords.score).toBe(baseline.score);
    expect(withRecords.triggeredSignals.map((s) => s.code)).toEqual(baseline.triggeredSignals.map((s) => s.code));
    expect(withRecords.negativeSignals.map((s) => s.code)).toEqual(baseline.negativeSignals.map((s) => s.code));
  });
});
