/// <reference types="@types/jest" />
import {
  passesConvictionBar,
  CONVICTION_MIN_SIGNAL_SCORE,
  CONVICTION_MIN_SMART_MONEY_SCORE,
  CONVICTION_RESULT_LIMIT,
  type ConvictionScoreInput,
} from '../../../src/modules/market-data-foundation/analytics/conviction-score';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A fully-qualifying candidate; override fields per case. */
function row(overrides: Partial<ConvictionScoreInput> = {}): ConvictionScoreInput {
  return { signalScore: 80, sm1m: 75, sm3m: 75, sm6m: 75, ...overrides };
}

// ---------------------------------------------------------------------------
// Fixed bar — these constants define the feature; guard against silent drift.
// ---------------------------------------------------------------------------

describe('conviction bar constants', () => {
  it('are the agreed fixed thresholds (signal ≥ 70, smart-money > 70, top 20)', () => {
    expect(CONVICTION_MIN_SIGNAL_SCORE).toBe(70);
    expect(CONVICTION_MIN_SMART_MONEY_SCORE).toBe(70);
    expect(CONVICTION_RESULT_LIMIT).toBe(20);
  });
});

describe('passesConvictionBar', () => {
  it('accepts a row that clears the bar in every dimension', () => {
    expect(passesConvictionBar(row())).toBe(true);
  });

  it('treats signal score as inclusive at 70 and smart-money as exclusive at 70', () => {
    // signal == 70 qualifies (>=); smart-money == 70 does NOT (must be strictly > 70)
    expect(passesConvictionBar(row({ signalScore: 70 }))).toBe(true);
    expect(passesConvictionBar(row({ sm3m: 70 }))).toBe(false);
    expect(passesConvictionBar(row({ sm3m: 70.01 }))).toBe(true);
  });

  it('rejects when the signal score is below 70', () => {
    expect(passesConvictionBar(row({ signalScore: 69.9 }))).toBe(false);
  });

  it('rejects when ANY single smart-money range fails the bar', () => {
    expect(passesConvictionBar(row({ sm1m: 70 }))).toBe(false);
    expect(passesConvictionBar(row({ sm1m: 65 }))).toBe(false);
    expect(passesConvictionBar(row({ sm3m: 50 }))).toBe(false);
    expect(passesConvictionBar(row({ sm6m: 0 }))).toBe(false);
  });

  it('rejects when any required score is missing (null)', () => {
    expect(passesConvictionBar(row({ signalScore: null }))).toBe(false);
    expect(passesConvictionBar(row({ sm1m: null }))).toBe(false);
    expect(passesConvictionBar(row({ sm6m: null }))).toBe(false);
  });
});
