/// <reference types="@types/jest" />
import { isFredDue } from '../../../src/modules/market-context-intelligence/market-context-intelligence.fred.scheduler';

/**
 * Unit tests for the pure `isFredDue` gate of the FRED macro scheduler.
 *
 * Scheduled time is 08:00 UTC, EVERY calendar day (FRED macro is not market-
 * session bound). Once-per-UTC-day guard via lastFiredDate.
 *
 * NOTE: hyphenated test filename to avoid a jest resolution collision with the
 * source `market-context-intelligence.fred.scheduler.ts`.
 */

describe('isFredDue', () => {
  it('fires once 08:00 UTC is reached and it has not fired today', () => {
    expect(isFredDue(new Date('2026-06-18T08:00:00.000Z'), null)).toBe(true);
    expect(isFredDue(new Date('2026-06-18T12:30:00.000Z'), null)).toBe(true);
  });

  it('does not fire before 08:00 UTC', () => {
    expect(isFredDue(new Date('2026-06-18T07:59:00.000Z'), null)).toBe(false);
    expect(isFredDue(new Date('2026-06-18T00:05:00.000Z'), null)).toBe(false);
  });

  it('does not fire twice on the same UTC date', () => {
    expect(isFredDue(new Date('2026-06-18T09:00:00.000Z'), '2026-06-18')).toBe(false);
  });

  it('fires on weekends too (macro is not session-bound)', () => {
    expect(isFredDue(new Date('2026-06-13T08:30:00.000Z'), null)).toBe(true); // Saturday
    expect(isFredDue(new Date('2026-06-14T08:30:00.000Z'), null)).toBe(true); // Sunday
  });

  it('fires again on the next UTC day after a prior fire', () => {
    expect(isFredDue(new Date('2026-06-19T08:00:00.000Z'), '2026-06-18')).toBe(true);
  });
});
