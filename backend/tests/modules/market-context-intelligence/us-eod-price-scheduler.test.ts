/// <reference types="@types/jest" />
import { isUsEodPriceDue } from '../../../src/modules/market-context-intelligence/us-eod-price.scheduler';

/**
 * Unit tests for the pure `isUsEodPriceDue` gate of the US EOD price scheduler.
 *
 * Reference UTC days:
 *   2026-06-12 = Friday   (UTC day 5)
 *   2026-06-13 = Saturday (UTC day 6)
 *   2026-06-14 = Sunday   (UTC day 0)
 *   2026-06-15 = Monday   (UTC day 1)
 *
 * Scheduled time is 21:30 UTC, weekdays only (Mon–Fri).
 *
 * NOTE: test file is named with a hyphen (`us-eod-price-scheduler`) to avoid a
 * jest resolution collision with the source `us-eod-price.scheduler.ts`.
 */

describe('isUsEodPriceDue', () => {
  it('fires on a weekday once 21:30 UTC is reached', () => {
    expect(isUsEodPriceDue(new Date('2026-06-15T21:30:00.000Z'), null)).toBe(true); // Mon, at time
    expect(isUsEodPriceDue(new Date('2026-06-12T22:00:00.000Z'), null)).toBe(true); // Fri, after time
  });

  it('does not fire before the scheduled time', () => {
    expect(isUsEodPriceDue(new Date('2026-06-15T21:29:00.000Z'), null)).toBe(false);
  });

  it('does not fire twice on the same UTC date', () => {
    expect(isUsEodPriceDue(new Date('2026-06-15T22:30:00.000Z'), '2026-06-15')).toBe(false);
  });

  it('does not fire on weekends even after the scheduled time', () => {
    expect(isUsEodPriceDue(new Date('2026-06-13T23:00:00.000Z'), null)).toBe(false); // Sat
    expect(isUsEodPriceDue(new Date('2026-06-14T23:00:00.000Z'), null)).toBe(false); // Sun
  });
});
