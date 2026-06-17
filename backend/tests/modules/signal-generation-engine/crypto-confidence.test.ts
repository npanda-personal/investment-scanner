/**
 * #3: crypto (v3) confidence must reflect CONVICTION, not just data sufficiency.
 * A coin-flip score (~50) with ample bars/signals must not read HIGH.
 */
import { cryptoConfidenceFor } from '../../../src/modules/signal-generation-engine/signal-generation-engine.crypto-service';

describe('cryptoConfidenceFor — conviction gate (SG-6 parity for the v3 crypto lane)', () => {
  it('a coin-flip score does NOT read HIGH even with ample bars and signals', () => {
    // 520 bars, 8 signals, but score 52 (NEUTRAL band) → conviction 2 < 10.
    expect(cryptoConfidenceFor(520, 8, 52)).toBe('LOW');
  });

  it('a NEUTRAL-band score caps at LOW regardless of data depth', () => {
    expect(cryptoConfidenceFor(520, 8, 50)).toBe('LOW');
    expect(cryptoConfidenceFor(520, 8, 54)).toBe('LOW'); // conviction 4 < 5 (MEDIUM bar)
  });

  it('a genuinely directional score with full data reads HIGH', () => {
    expect(cryptoConfidenceFor(520, 8, 72)).toBe('HIGH'); // conviction 22 >= 10
    expect(cryptoConfidenceFor(520, 8, 28)).toBe('HIGH'); // symmetric (bearish lean)
  });

  it('a half-step lean with moderate data reads MEDIUM, not HIGH', () => {
    expect(cryptoConfidenceFor(120, 2, 56)).toBe('MEDIUM'); // conviction 6 >= 5 but bars<200
    expect(cryptoConfidenceFor(520, 8, 56)).toBe('MEDIUM'); // conviction 6 < 10 → not HIGH
  });

  it('thin data caps at LOW even with strong conviction', () => {
    expect(cryptoConfidenceFor(40, 1, 80)).toBe('LOW'); // bars 40 < 60
  });

  it('conviction is symmetric around 50', () => {
    expect(cryptoConfidenceFor(520, 8, 60)).toBe('HIGH'); // |60-50|=10
    expect(cryptoConfidenceFor(520, 8, 40)).toBe('HIGH'); // |40-50|=10
    expect(cryptoConfidenceFor(520, 8, 45)).toBe('MEDIUM'); // |45-50|=5
  });
});
