/// <reference types="@types/jest" />
import {
  deriveMacroStatus,
  computeCpiYoY,
  type MacroInputs,
} from '../../../src/modules/market-context-intelligence/market-context-intelligence.macro-derivation';

/**
 * Pure unit tests for the macro regime derivation. No network, no DB.
 *
 * Thresholds under test:
 *   HEADWIND signals:   DFF >= 5,  CPI >= 4,  curve < 0,    oil > 120
 *   SUPPORTIVE signals: DFF <= 4,  CPI <= 3,  curve >= 0.5, oil < 90
 *   HEADWIND if >=2 headwind; else SUPPORTIVE if >=2 supportive; else MIXED.
 *   UNKNOWN if fewer than 2 of the 5 inputs are available.
 */

const base: MacroInputs = {
  interestRateProxy: null,
  inflationProxy: null,
  usdStrengthProxy: null,
  commodityProxy: null,
  yieldCurve: null,
};

describe('deriveMacroStatus', () => {
  it('returns SUPPORTIVE when >=2 supportive signals (and <2 headwind)', () => {
    // DFF 3.5 (<=4 supportive), CPI 2.5 (<=3 supportive), curve +0.6 (>=0.5 supportive), oil 70 (<90 supportive)
    const out = deriveMacroStatus({ ...base, interestRateProxy: 3.5, inflationProxy: 2.5, yieldCurve: 0.6, commodityProxy: 70 });
    expect(out.macroStatus).toBe('SUPPORTIVE');
    expect(out.dataStatus).toBe('PARTIAL'); // 4 of 5 inputs present (USD null)
    expect(out.explanation).toMatch(/supportive/i);
    expect(out.explanation).toMatch(/not advice/i); // research-support disclaimer present
  });

  it('returns HEADWIND when >=2 headwind signals', () => {
    // DFF 5.5 (>=5 headwind), CPI 4.5 (>=4 headwind), curve -0.2 (inverted headwind)
    const out = deriveMacroStatus({ ...base, interestRateProxy: 5.5, inflationProxy: 4.5, yieldCurve: -0.2 });
    expect(out.macroStatus).toBe('HEADWIND');
    expect(out.explanation).toMatch(/headwind/i);
  });

  it('returns MIXED when neither side reaches 2 signals', () => {
    // DFF 5.5 (headwind), CPI 2.5 (supportive), oil 100 (neither), curve +0.2 (neither) -> 1 headwind, 1 supportive
    const out = deriveMacroStatus({ ...base, interestRateProxy: 5.5, inflationProxy: 2.5, commodityProxy: 100, yieldCurve: 0.2 });
    expect(out.macroStatus).toBe('MIXED');
  });

  it('returns UNKNOWN when fewer than 2 inputs are available', () => {
    const out1 = deriveMacroStatus({ ...base, interestRateProxy: 5.5 }); // only 1 input
    expect(out1.macroStatus).toBe('UNKNOWN');
    expect(out1.dataStatus).toBe('PARTIAL'); // 1 input present -> PARTIAL, not MISSING
    const out0 = deriveMacroStatus(base); // 0 inputs
    expect(out0.macroStatus).toBe('UNKNOWN');
    expect(out0.dataStatus).toBe('MISSING');
  });

  it('reports COMPLETE dataStatus only when all 5 inputs present', () => {
    const out = deriveMacroStatus({
      interestRateProxy: 3.5,
      inflationProxy: 2.5,
      usdStrengthProxy: 120.4,
      commodityProxy: 70,
      yieldCurve: 0.6,
    });
    expect(out.dataStatus).toBe('COMPLETE');
    expect(out.macroStatus).toBe('SUPPORTIVE');
  });

  it('counts an inverted yield curve and high oil as headwind signals', () => {
    // curve -0.3 (headwind) + oil 130 (>120 headwind) = 2 headwind => HEADWIND
    const out = deriveMacroStatus({ ...base, yieldCurve: -0.3, commodityProxy: 130 });
    expect(out.macroStatus).toBe('HEADWIND');
  });

  it('treats the 4-5 DFF / 3-4 CPI band edges deterministically', () => {
    // DFF exactly 4 -> supportive; CPI exactly 3 -> supportive => SUPPORTIVE
    expect(deriveMacroStatus({ ...base, interestRateProxy: 4, inflationProxy: 3 }).macroStatus).toBe('SUPPORTIVE');
    // DFF exactly 5 -> headwind; CPI exactly 4 -> headwind => HEADWIND
    expect(deriveMacroStatus({ ...base, interestRateProxy: 5, inflationProxy: 4 }).macroStatus).toBe('HEADWIND');
    // DFF 4.5 (between 4 and 5 -> neither), CPI 3.5 (between -> neither) with 2 inputs => MIXED
    expect(deriveMacroStatus({ ...base, interestRateProxy: 4.5, inflationProxy: 3.5 }).macroStatus).toBe('MIXED');
  });
});

describe('computeCpiYoY', () => {
  it('computes YoY % from latest vs ~12-month-prior monthly index levels', () => {
    // newest-first: index 0 = latest (310), index 12 = year ago (300) -> (310-300)/300*100 = 3.33%
    const monthly = [310, 309, 308, 307, 306, 305, 304, 303, 302, 301, 300.5, 300.2, 300, 299];
    expect(computeCpiYoY(monthly)).toBeCloseTo(3.33, 2);
  });

  it('returns null when fewer than 13 valid observations', () => {
    expect(computeCpiYoY([310, 309, 308])).toBeNull();
    expect(computeCpiYoY([])).toBeNull();
  });

  it('skips null observations and computes from the compacted (non-null) series', () => {
    // 14 entries, one null -> 13 non-null after filter:
    // [310, 308, 307, 306, 305, 304, 303, 302, 301, 300, 299, 298, 297].
    // latest=310, index-12 (year-ago)=297 -> (310-297)/297*100.
    const monthly = [310, null, 308, 307, 306, 305, 304, 303, 302, 301, 300, 299, 298, 297];
    expect(computeCpiYoY(monthly)).toBeCloseTo(((310 - 297) / 297) * 100, 2);
  });

  it('returns null when nulls leave fewer than 13 valid observations', () => {
    const monthly = [310, null, 308, 307, 306, 305, 304, 303, 302, 301, 300, 299, 298];
    expect(computeCpiYoY(monthly)).toBeNull();
  });

  it('returns null when the base value is non-positive', () => {
    const monthly = [310, 309, 308, 307, 306, 305, 304, 303, 302, 301, 300, 299, 0];
    expect(computeCpiYoY(monthly)).toBeNull();
  });
});
