/// <reference types="@types/jest" />
import { isJobDue } from '../../../src/modules/market-context-intelligence/eod-ingest.scheduler';

/**
 * Unit tests for the pure `isJobDue` gate that the EOD scheduler's tick uses to
 * decide whether a job fires. Covers the existing daily behaviour plus the new
 * `daysOfWeekUtc` weekly gate added for the SEC Form 4 / 13F refresh jobs.
 *
 * Reference UTC days used below:
 *   2026-06-14 = Sunday (UTC day 0)
 *   2026-06-15 = Monday (UTC day 1)
 *
 * NOTE: this file is intentionally named `eod-ingest-scheduler` (hyphen), not
 * `eod-ingest.scheduler`, to avoid a jest module-resolution collision with the
 * source file `eod-ingest.scheduler.ts` it imports.
 */

const noop = async () => undefined;

describe('isJobDue', () => {
  describe('daily job (no daysOfWeekUtc)', () => {
    const daily = { name: 'daily', utcHour: 22, utcMinute: 0, run: noop, lastFiredDate: null };

    it('fires once the scheduled UTC time is reached, on any weekday', () => {
      expect(isJobDue(daily, new Date('2026-06-15T22:00:00.000Z'))).toBe(true); // Monday, at time
      expect(isJobDue(daily, new Date('2026-06-14T23:30:00.000Z'))).toBe(true); // Sunday, after time
    });

    it('does not fire before the scheduled time', () => {
      expect(isJobDue(daily, new Date('2026-06-15T21:59:00.000Z'))).toBe(false);
    });

    it('does not fire twice on the same UTC date', () => {
      const fired = { ...daily, lastFiredDate: '2026-06-15' };
      expect(isJobDue(fired, new Date('2026-06-15T22:30:00.000Z'))).toBe(false);
    });
  });

  describe('weekly job (daysOfWeekUtc: [0] = Sunday)', () => {
    const weekly = { name: 'weekly', utcHour: 23, utcMinute: 0, daysOfWeekUtc: [0], run: noop, lastFiredDate: null };

    it('fires on the allowed day once the time is reached', () => {
      expect(isJobDue(weekly, new Date('2026-06-14T23:30:00.000Z'))).toBe(true); // Sunday, after time
    });

    it('does not fire on the allowed day before the scheduled time', () => {
      expect(isJobDue(weekly, new Date('2026-06-14T22:00:00.000Z'))).toBe(false); // Sunday, before time
    });

    it('does not fire on a non-allowed weekday even after the scheduled time', () => {
      expect(isJobDue(weekly, new Date('2026-06-15T23:30:00.000Z'))).toBe(false); // Monday
    });

    it('still respects the once-per-day guard on the allowed day', () => {
      const fired = { ...weekly, lastFiredDate: '2026-06-14' };
      expect(isJobDue(fired, new Date('2026-06-14T23:30:00.000Z'))).toBe(false);
    });
  });
});
