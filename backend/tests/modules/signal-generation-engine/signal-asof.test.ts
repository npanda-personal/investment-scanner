/**
 * SG-7: point-in-time (as-of) seam — fundamentals visibility + staleness, one tested unit.
 */
import { filterFundamentalsAsOf, isStaleAsOf } from '../../../src/modules/signal-generation-engine/signal-asof';

const day = (s: string) => new Date(s);

describe('filterFundamentalsAsOf', () => {
  const records = [
    { eps: 5, periodEndDate: day('2025-03-31') },                                  // future quarter — excluded
    { eps: 3, periodEndDate: day('2018-09-30') },                                  // public ~45d later
    { eps: 9, periodEndDate: day('2018-09-30'), officialResultDate: day('2018-10-05') }, // explicit announce date
    { eps: 1 },                                                                    // no dates — fail-closed
  ];

  it('excludes results not yet public at the as-of date (period-end + lag)', () => {
    const out = filterFundamentalsAsOf(records, day('2018-12-31'), 45);
    expect(out.some((r) => r.periodEndDate && new Date(r.periodEndDate).getFullYear() === 2025)).toBe(false);
    expect(out.some((r) => (r as any).eps === 3)).toBe(true); // 2018-09-30 + 45d <= 2018-12-31
    expect(out.some((r) => (r as any).eps === 1)).toBe(false); // no dates → excluded
  });

  it('prefers officialResultDate over the period-end+lag fallback', () => {
    // As-of just after the announce date but BEFORE period-end+lag would allow it.
    const out = filterFundamentalsAsOf(records, day('2018-10-06'), 45);
    expect(out.some((r) => (r as any).eps === 9)).toBe(true);  // officialResultDate 2018-10-05 <= as-of
    expect(out.some((r) => (r as any).eps === 3)).toBe(false); // period-end+45d (2018-11-14) > as-of
  });
});

describe('isStaleAsOf', () => {
  it('flags a bar older than 5 days relative to the as-of anchor', () => {
    expect(isStaleAsOf(day('2018-12-20'), day('2018-12-31'))).toBe(true);
    expect(isStaleAsOf(day('2018-12-30'), day('2018-12-31'))).toBe(false);
  });
  it('treats a null latest bar as stale (fail-closed)', () => {
    expect(isStaleAsOf(null, day('2018-12-31'))).toBe(true);
  });
});
