/**
 * daily-change.test.ts
 *
 * Unit tests for the shared day-over-day adjacency guard used by the trader-facing
 * "daily change" surfaces (smart-money, today-review, stock-interest, alerts).
 */

import {
  MAX_ADJACENT_SESSION_GAP_DAYS,
  areAdjacentSessions,
  dailyChangeFractionBetweenSessions,
} from '../../../src/shared/utils/daily-change';

describe('areAdjacentSessions', () => {
  it('accepts consecutive trading days', () => {
    expect(areAdjacentSessions('2026-06-15', '2026-06-16')).toBe(true);
  });

  it('accepts a Friday→Monday weekend gap', () => {
    expect(areAdjacentSessions('2026-06-12', '2026-06-15')).toBe(true);
  });

  it('rejects a gap wider than the session budget', () => {
    expect(areAdjacentSessions('2025-05-30', '2026-06-16')).toBe(false);
    expect(areAdjacentSessions('2026-06-01', '2026-06-16')).toBe(false); // 15 days
  });

  it('treats the gap budget as inclusive at the boundary (7 passes, 8 fails)', () => {
    expect(areAdjacentSessions('2026-06-09', '2026-06-16')).toBe(true); // exactly 7 days
    expect(areAdjacentSessions('2026-06-08', '2026-06-16')).toBe(false); // 8 days
  });

  it('rejects a zero or reversed gap (latest not after previous)', () => {
    expect(areAdjacentSessions('2026-06-16', '2026-06-16')).toBe(false);
    expect(areAdjacentSessions('2026-06-16', '2026-06-15')).toBe(false);
  });

  it('rejects missing/unparseable dates', () => {
    expect(areAdjacentSessions(null, '2026-06-16')).toBe(false);
    expect(areAdjacentSessions('2026-06-15', undefined)).toBe(false);
    expect(areAdjacentSessions('not-a-date', '2026-06-16')).toBe(false);
  });

  it('accepts Date and epoch-millis inputs, not just strings', () => {
    expect(areAdjacentSessions(new Date('2026-06-15'), new Date('2026-06-16'))).toBe(true);
    expect(areAdjacentSessions(Date.parse('2026-06-15'), Date.parse('2026-06-16'))).toBe(true);
  });
});

describe('dailyChangeFractionBetweenSessions', () => {
  it('returns the fraction for adjacent sessions', () => {
    expect(dailyChangeFractionBetweenSessions(120, '2026-06-15', 125, '2026-06-16')).toBeCloseTo(
      (125 - 120) / 120,
      6,
    );
  });

  it('returns null across a data gap (the bogus-daily-move case)', () => {
    // The exact TCS shape: a year-old prior close paired with a fresh bar.
    expect(dailyChangeFractionBetweenSessions(190, '2025-05-30', 122, '2026-06-16')).toBeNull();
  });

  it('returns null when the prior close is missing or non-positive', () => {
    expect(dailyChangeFractionBetweenSessions(0, '2026-06-15', 125, '2026-06-16')).toBeNull();
    expect(dailyChangeFractionBetweenSessions(null, '2026-06-15', 125, '2026-06-16')).toBeNull();
  });

  it('returns null when the latest close is non-finite or missing', () => {
    expect(dailyChangeFractionBetweenSessions(120, '2026-06-15', NaN, '2026-06-16')).toBeNull();
    expect(dailyChangeFractionBetweenSessions(120, '2026-06-15', undefined, '2026-06-16')).toBeNull();
  });

  it('exposes a 7-day default session budget', () => {
    expect(MAX_ADJACENT_SESSION_GAP_DAYS).toBe(7);
  });
});
