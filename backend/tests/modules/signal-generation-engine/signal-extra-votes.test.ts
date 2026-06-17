/**
 * #5: MACD signal-line cross + Bollinger %B band-touch confirmation votes.
 */
import { extraTechnicalVotes } from '../../../src/modules/signal-generation-engine/signal-extra-votes';
import { familyForCode, strengthForCode } from '../../../src/modules/signal-generation-engine/signal-evidence';
import type { SignalPricePoint } from '../../../src/modules/signal-generation-engine/signal-generation-engine.types';

/** Build a newest-first price window from a chronological (oldest-first) close series. */
const windowFromChrono = (chronoCloses: number[]): SignalPricePoint[] =>
  chronoCloses
    .map((c, i) => ({
      date: new Date(2026, 0, 1 + i).toISOString(),
      open: c, high: c + 1, low: c - 1, close: c, adjusted_close: c, volume: 1000,
    }))
    .reverse() as SignalPricePoint[];

const codesOf = (items: { code: string }[]) => items.map((s) => s.code);

describe('signal-extra-votes — family & strength registration', () => {
  it('maps MACD cross to MOMENTUM and Bollinger touches to mean-reversion / overextension', () => {
    expect(familyForCode('MACD_BULLISH_CROSS')).toBe('MOMENTUM');
    expect(familyForCode('MACD_BEARISH_CROSS')).toBe('MOMENTUM');
    expect(familyForCode('BOLLINGER_OVERSOLD')).toBe('MEAN_REVERSION');
    expect(familyForCode('BOLLINGER_OVERBOUGHT')).toBe('OVEREXTENSION');
  });
  it('grades a confirmed MACD cross above the default strength', () => {
    expect(strengthForCode('MACD_BULLISH_CROSS')).toBe(0.9);
    expect(strengthForCode('MACD_BEARISH_CROSS')).toBe(0.9);
    expect(strengthForCode('BOLLINGER_OVERSOLD')).toBe(0.8); // default
  });
});

describe('extraTechnicalVotes — Bollinger %B band touches', () => {
  it('flags an oversold band touch (latest far below the band)', () => {
    const prices = windowFromChrono([...Array(19).fill(100), 90]); // 20 bars, MACD null (needs 35)
    const { signals, negativeSignals } = extraTechnicalVotes(prices);
    expect(codesOf(signals)).toContain('BOLLINGER_OVERSOLD');
    expect(codesOf(negativeSignals)).not.toContain('BOLLINGER_OVERBOUGHT');
    expect(codesOf(signals)).not.toContain('MACD_BULLISH_CROSS'); // insufficient bars for MACD
  });
  it('flags an overbought band touch (latest far above the band)', () => {
    const prices = windowFromChrono([...Array(19).fill(100), 110]);
    const { negativeSignals } = extraTechnicalVotes(prices);
    expect(codesOf(negativeSignals)).toContain('BOLLINGER_OVERBOUGHT');
  });
});

describe('extraTechnicalVotes — guards & MACD cross', () => {
  it('returns no votes when history is insufficient for either indicator', () => {
    const prices = windowFromChrono([100, 101, 102, 103, 104, 105, 106, 107, 108, 109]); // 10 bars
    const { signals, negativeSignals } = extraTechnicalVotes(prices);
    expect(signals).toHaveLength(0);
    expect(negativeSignals).toHaveLength(0);
  });
  it('flags a bullish MACD cross when a steady decline reverses on the latest bar', () => {
    // 39 bars declining 100→62 (histogram negative through "yesterday"), then a sharp up
    // bar only on the final session → MACD crosses above its signal line THIS bar.
    const decline = Array.from({ length: 39 }, (_, i) => 100 - i);
    const { signals } = extraTechnicalVotes(windowFromChrono([...decline, 80]));
    expect(codesOf(signals)).toContain('MACD_BULLISH_CROSS');
  });
  it('flags a bearish MACD cross when a steady rise reverses on the latest bar', () => {
    const rise = Array.from({ length: 39 }, (_, i) => 62 + i); // 62→100
    const { negativeSignals } = extraTechnicalVotes(windowFromChrono([...rise, 80]));
    expect(codesOf(negativeSignals)).toContain('MACD_BEARISH_CROSS');
  });
  it('does NOT fire on a persistent trend (no fresh cross — histogram already same sign)', () => {
    const steadyUp = Array.from({ length: 45 }, (_, i) => 60 + i); // histogram positive throughout
    const { signals, negativeSignals } = extraTechnicalVotes(windowFromChrono(steadyUp));
    expect(codesOf(signals)).not.toContain('MACD_BULLISH_CROSS');
    expect(codesOf(negativeSignals)).not.toContain('MACD_BEARISH_CROSS');
  });
});
