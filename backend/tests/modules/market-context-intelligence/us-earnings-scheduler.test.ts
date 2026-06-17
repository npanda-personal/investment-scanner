/// <reference types="@types/jest" />
import { isUsEarningsRefreshDue } from '../../../src/modules/market-context-intelligence/us-earnings.scheduler';

/**
 * Unit tests for the pure `isUsEarningsRefreshDue` gate of the US forward-earnings
 * scheduler.
 *
 * Reference UTC days:
 *   2026-06-13 = Saturday (UTC day 6)
 *   2026-06-14 = Sunday   (UTC day 0)
 *   2026-06-15 = Monday   (UTC day 1)
 *
 * Scheduled time is 23:45 UTC, Sundays only (after the daily US price ~21:30 UTC
 * and US snapshot ~22:00+ UTC jobs).
 *
 * NOTE: test file is named with a hyphen (`us-earnings-scheduler`) to avoid a
 * jest resolution collision with the source `us-earnings.scheduler.ts`.
 */

describe('isUsEarningsRefreshDue', () => {
  it('fires on Sunday once 23:45 UTC is reached', () => {
    expect(isUsEarningsRefreshDue(new Date('2026-06-14T23:45:00.000Z'), null)).toBe(true); // Sun, at time
    expect(isUsEarningsRefreshDue(new Date('2026-06-14T23:59:00.000Z'), null)).toBe(true); // Sun, after time
  });

  it('does not fire before the scheduled time on Sunday', () => {
    expect(isUsEarningsRefreshDue(new Date('2026-06-14T23:44:00.000Z'), null)).toBe(false);
    expect(isUsEarningsRefreshDue(new Date('2026-06-14T22:00:00.000Z'), null)).toBe(false);
  });

  it('does not fire twice on the same UTC date', () => {
    expect(isUsEarningsRefreshDue(new Date('2026-06-14T23:50:00.000Z'), '2026-06-14')).toBe(false);
  });

  it('does not fire on non-Sundays even after the scheduled time', () => {
    expect(isUsEarningsRefreshDue(new Date('2026-06-13T23:50:00.000Z'), null)).toBe(false); // Sat
    expect(isUsEarningsRefreshDue(new Date('2026-06-15T23:50:00.000Z'), null)).toBe(false); // Mon
  });
});
