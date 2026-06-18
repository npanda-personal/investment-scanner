/**
 * SG-7: point-in-time (as-of) seam — fundamentals visibility + staleness, one tested unit.
 */
import { filterFundamentalsAsOf, isStaleAsOf } from '../../../src/modules/signal-generation-engine/signal-asof';

// Runtime records from formatFundamentalsResponse use snake_case + ISO strings.
const day = (s: string) => new Date(s);
const iso = (s: string) => new Date(s).toISOString();

describe('filterFundamentalsAsOf', () => {
  const records = [
    { eps: 5, period_end_date: iso('2025-03-31') },                                          // future quarter — excluded
    { eps: 3, period_end_date: iso('2018-09-30') },                                          // public ~45d later
    { eps: 9, period_end_date: iso('2018-09-30'), official_result_date: iso('2018-10-05') }, // explicit announce date
    { eps: 1 },                                                                               // no dates — fail-closed
  ];

  it('excludes results not yet public at the as-of date (period-end + lag)', () => {
    const out = filterFundamentalsAsOf(records, day('2018-12-31'), 45);
    expect(out.some((r) => r.period_end_date && new Date(r.period_end_date).getFullYear() === 2025)).toBe(false);
    expect(out.some((r) => (r as any).eps === 3)).toBe(true); // 2018-09-30 + 45d <= 2018-12-31
    expect(out.some((r) => (r as any).eps === 1)).toBe(false); // no dates → excluded
  });

  it('prefers official_result_date over the period-end+lag fallback', () => {
    // As-of just after the announce date but BEFORE period-end+lag would allow it.
    const out = filterFundamentalsAsOf(records, day('2018-10-06'), 45);
    expect(out.some((r) => (r as any).eps === 9)).toBe(true);  // official_result_date 2018-10-05 <= as-of
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
