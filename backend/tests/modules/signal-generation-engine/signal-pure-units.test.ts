/**
 * Isolated unit tests for the pure signal-generation layers (math, indicators,
 * scoring, scoring-config).  These import ONLY the dependency-free modules — no
 * service, no repository, no market-data-foundation — so they characterise the
 * extracted logic and run green independently of the rest of the module graph.
 */
import type { SignalPricePoint } from '../../../src/modules/signal-generation-engine/signal-generation-engine.types';
import { average, stddev, optionalNumber, clampInt, normalizeUtcDay } from '../../../src/modules/signal-generation-engine/signal-math';
import { sma, rsi, periodHigh, periodLow, returnAtOffset, obv } from '../../../src/modules/signal-generation-engine/signal-indicators';
import {
  categoryScore,
  compositeScore,
  directionForScore,
  evaluateTechnical,
  evaluateMomentum,
  buildDeliveryEvidence,
  explain,
} from '../../../src/modules/signal-generation-engine/signal-scoring';
import {
  resolveSignalScoringConfig,
  DEFAULT_SIGNAL_SCORING_CONFIG,
} from '../../../src/modules/signal-generation-engine/signal-scoring.config';
import {
  DIRECTION_BULLISH_THRESHOLD,
  DIRECTION_BEARISH_THRESHOLD,
} from '../../../src/shared/types/signal.types';
import { isTrustedReadSignal } from '../../../src/modules/signal-generation-engine/signal-read-policy';

// Build a newest-first synthetic price series with a constant per-bar drift.
function makeSeries(count: number, opts: { start?: number; driftPct?: number; volume?: number } = {}): SignalPricePoint[] {
  const start = opts.start ?? 100;
  const drift = opts.driftPct ?? 0;
  const volume = opts.volume ?? 1000;
  const asc: SignalPricePoint[] = [];
  let price = start;
  // oldest -> newest
  const base = new Date('2020-01-01T00:00:00.000Z').getTime();
  for (let i = 0; i < count; i++) {
    price = price * (1 + drift);
    asc.push({
      date: new Date(base + i * 86400000).toISOString(),
      open: price,
      high: price * 1.01,
      low: price * 0.99,
      close: price,
      adjusted_close: price,
      volume,
      adjusted_high: price * 1.01,
      adjusted_low: price * 0.99,
      adjusted_volume: volume,
    });
  }
  return asc.reverse(); // newest-first
}

describe('signal-math', () => {
  it('average / stddev handle empty + small inputs', () => {
    expect(average([])).toBeNull();
    expect(average([2, 4, 6])).toBe(4);
    expect(stddev([5])).toBeNull();
    expect(stddev([2, 4, 6])).toBeCloseTo(2, 5);
  });
  it('optionalNumber coerces or nulls', () => {
    expect(optionalNumber('3.5')).toBe(3.5);
    expect(optionalNumber('abc')).toBeNull();
    expect(optionalNumber(undefined)).toBeNull();
    // Number(null) === 0 (finite) — preserved verbatim from the original helper.
    expect(optionalNumber(null)).toBe(0);
  });
  it('clampInt floors + bounds with fallback', () => {
    expect(clampInt('7.9', 1, 1, 100)).toBe(7);
    expect(clampInt('999', 1, 1, 100)).toBe(100);
    expect(clampInt('x', 42, 1, 100)).toBe(42);
  });
  it('normalizeUtcDay zeroes the time-of-day', () => {
    const d = normalizeUtcDay(new Date('2024-03-04T13:45:12.000Z'));
    expect(d.toISOString()).toBe('2024-03-04T00:00:00.000Z');
  });
});

describe('signal-indicators', () => {
  it('sma needs at least `period` bars', () => {
    expect(sma(makeSeries(10), 50)).toBeNull();
    expect(sma(makeSeries(60, { driftPct: 0 }), 50)).toBeCloseTo(100, 5);
  });
  it('rsi is 100 on a pure uptrend and null with too little history', () => {
    expect(rsi(makeSeries(5), 14)).toBeNull();
    expect(rsi(makeSeries(200, { driftPct: 0.01 }), 14)).toBe(100);
  });
  it('periodHigh/Low use adjusted_close window', () => {
    const series = makeSeries(30, { driftPct: 0.01 });
    expect(periodHigh(series, 30)).toBe(series[0].adjusted_close);
    expect(periodLow(series, 30)).toBe(series[series.length - 1].adjusted_close);
  });
  it('returnAtOffset measures fractional return vs offset bar', () => {
    const series = makeSeries(30, { driftPct: 0 });
    expect(returnAtOffset(series, 10)).toBeCloseTo(0, 6);
  });
  it('obv accumulates by direction', () => {
    expect(obv([]).length).toBe(0);
    expect(obv(makeSeries(5, { driftPct: 0.01 })).length).toBe(5);
  });
});

describe('signal-scoring composite math', () => {
  it('categoryScore Laplace smoothing (default alpha=1)', () => {
    expect(categoryScore(0, 0)).toBe(0.5);
    expect(categoryScore(1, 0)).toBeCloseTo(0.75, 6);
    expect(categoryScore(5, 0)).toBeCloseTo(0.9166667, 6);
    expect(categoryScore(0, 5)).toBeCloseTo(0.0833333, 6);
  });
  it('compositeScore is 50 with no evidence', () => {
    expect(compositeScore(0.5, 0.5, 0.5)).toBe(50);
  });
  it('compositeScore stays within [0,100] and rises with aligned bullish evidence', () => {
    const strong = compositeScore(0.917, 0.917, 0.917, 6, 0, 5, 0, 4, 0);
    expect(strong).toBeGreaterThan(DIRECTION_BULLISH_THRESHOLD);
    expect(strong).toBeLessThanOrEqual(100);
    const weak = compositeScore(0.083, 0.083, 0.083, 0, 6, 0, 5, 0, 4);
    expect(weak).toBeLessThan(DIRECTION_BEARISH_THRESHOLD);
    expect(weak).toBeGreaterThanOrEqual(0);
  });
  it('directionForScore honours shared cut-points', () => {
    expect(directionForScore(DIRECTION_BULLISH_THRESHOLD)).toBe('BULLISH');
    expect(directionForScore(DIRECTION_BEARISH_THRESHOLD)).toBe('BEARISH');
    expect(directionForScore(50)).toBe('NEUTRAL');
  });
  it('buildDeliveryEvidence buckets, null when absent or moderate', () => {
    expect(buildDeliveryEvidence(null)).toBeNull();
    expect(buildDeliveryEvidence(30)).toBeNull();
    expect(buildDeliveryEvidence(62)).toMatch(/high conviction/);
    expect(buildDeliveryEvidence(45)).toMatch(/above-average/);
    expect(buildDeliveryEvidence(10)).toMatch(/intraday churn/);
  });
  it('explain summarises the dominant side', () => {
    const out = explain('BULLISH', [{ code: 'A', label: 'price is above SMA50', category: 'TECHNICAL' }], []);
    expect(out).toMatch(/^Bullish because/);
  });
});

describe('signal-scoring category evaluation (uptrend characterisation)', () => {
  const uptrend = makeSeries(260, { driftPct: 0.01 });
  it('evaluateTechnical surfaces trend-following signals on a clean uptrend', () => {
    const result = evaluateTechnical(uptrend);
    const codes = result.signals.map((s) => s.code);
    // A clean, strong uptrend trades above SMA50 and is overbought (guard demotion present too).
    expect(result.score).toBeGreaterThan(0);
    expect(codes.length + result.negativeSignals.length).toBeGreaterThan(0);
  });
  it('evaluateMomentum votes bullish on sustained positive returns', () => {
    const result = evaluateMomentum(uptrend, 0.05);
    const codes = [...result.signals].map((s) => s.code);
    expect(codes.some((c) => c.includes('MOMENTUM') || c === 'SIX_MONTH_ACCELERATION' || c === 'OUTPERFORMING_PEERS')).toBe(true);
  });
});

describe('signal-read-policy (shared trusted predicate)', () => {
  const ready = { auditStatus: 'CURRENT' as const, dataQualityEligibility: { filterApplied: true, eligible: true, signalReadinessStatus: 'READY' } };
  it('accepts a fully-trusted CURRENT + READY signal', () => {
    expect(isTrustedReadSignal(ready)).toBe(true);
  });
  it('rejects legacy, ineligible, not-ready, or filter-skipped signals', () => {
    expect(isTrustedReadSignal({ ...ready, auditStatus: 'LEGACY_MISSING' })).toBe(false);
    expect(isTrustedReadSignal({ ...ready, dataQualityEligibility: { filterApplied: true, eligible: false, signalReadinessStatus: 'READY' } })).toBe(false);
    expect(isTrustedReadSignal({ ...ready, dataQualityEligibility: { filterApplied: true, eligible: true, signalReadinessStatus: 'NOT_READY' } })).toBe(false);
    expect(isTrustedReadSignal({ ...ready, dataQualityEligibility: { filterApplied: false, eligible: true, signalReadinessStatus: 'READY' } })).toBe(false);
    expect(isTrustedReadSignal({ auditStatus: 'CURRENT', dataQualityEligibility: null })).toBe(false);
  });
});

describe('signal-scoring.config (configurability)', () => {
  it('IN-equity config is byte-identical to the legacy constants', () => {
    const cfg = resolveSignalScoringConfig({ region: 'IN', assetType: 'STOCK' });
    expect(cfg.weights).toEqual({ technical: 0.4, momentum: 0.35, fundamental: 0.25 });
    expect(cfg.fundamentalPublicLagDays).toBe(45);
    expect(cfg.hasDelivery).toBe(true);
    expect(cfg.hasFundamentals).toBe(true);
    expect(cfg.regimeGateShortsEnabled).toBe(true);
    expect(DEFAULT_SIGNAL_SCORING_CONFIG.weights).toEqual(cfg.weights);
  });
  it('US-equity disables NSE delivery + uses the US filing lag', () => {
    const cfg = resolveSignalScoringConfig({ region: 'US', assetType: 'STOCK' });
    expect(cfg.hasDelivery).toBe(false);
    expect(cfg.fundamentalPublicLagDays).toBe(40);
    expect(cfg.hasFundamentals).toBe(true);
    // weights unchanged for equities (fundamentals retained)
    expect(cfg.weights.fundamental).toBeGreaterThan(0);
  });
  it('crypto redistributes the unused fundamental weight (B2 fix)', () => {
    const cfg = resolveSignalScoringConfig({ assetType: 'CRYPTO' });
    expect(cfg.hasFundamentals).toBe(false);
    expect(cfg.hasDelivery).toBe(false);
    expect(cfg.weights.fundamental).toBe(0);
    expect(cfg.weights.technical + cfg.weights.momentum).toBeCloseTo(1, 6);
    // a maxed crypto setup must out-score the same setup under the fundamental-diluted weights
    const cryptoScore = compositeScore(0.917, 0.917, 0.5, 6, 0, 5, 0, 0, 0, cfg);
    const dilutedScore = compositeScore(0.917, 0.917, 0.5, 6, 0, 5, 0, 0, 0, DEFAULT_SIGNAL_SCORING_CONFIG);
    expect(cryptoScore).toBeGreaterThan(dilutedScore);
  });
});
