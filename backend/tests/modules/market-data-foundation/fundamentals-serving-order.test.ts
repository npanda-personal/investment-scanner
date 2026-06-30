/**
 * Regression guard for `orderFundamentalsForServing` — the deterministic serving
 * order that keeps the live TTM snapshot at `records[0]` on an equal periodEndDate.
 *
 * WHY: US SEC ingestion now persists a standalone QUARTERLY (10-Q) row whose
 * period-end equals the TTM snapshot's derived period-end (and a 10-K ties the
 * newest ANNUAL row the same way). The DB returns `periodEndDate DESC` only, so
 * before this guard `records[0]` was non-deterministic on that tie — which would
 * silently drop the signal engine's PE self-history votes (they read `records[0]`
 * expecting the TTM row's live peRatio). This locks: live TTM leads on a tie,
 * primary periodEndDate-DESC order is otherwise untouched, and true ties keep
 * their incoming (query) order.
 */
import { orderFundamentalsForServing } from '../../../src/modules/market-data-foundation/analytics/market-data-foundation.serving.fundamentals-reads';

const rec = (periodType: string, periodEndDate: string, extra: Record<string, unknown> = {}) => ({
  periodType,
  periodEndDate: new Date(periodEndDate),
  ...extra,
});

describe('orderFundamentalsForServing — live-snapshot-first tiebreak', () => {
  it('leads with the TTM snapshot when a QUARTERLY row shares its period-end (the B1 case)', () => {
    // DB order is periodEndDate DESC; the QUARTERLY row arrives first on the tie.
    const out = orderFundamentalsForServing([
      rec('QUARTERLY', '2025-09-30', { tag: 'q' }),
      rec('TTM', '2025-09-30', { tag: 'ttm' }),
      rec('ANNUAL', '2024-12-31', { tag: 'a' }),
    ]);
    expect(out.map((r: any) => r.tag)).toEqual(['ttm', 'q', 'a']);
  });

  it('leads with the TTM snapshot when the newest ANNUAL row ties it (the 10-K case)', () => {
    const out = orderFundamentalsForServing([
      rec('ANNUAL', '2025-12-31', { tag: 'a-new' }),
      rec('TTM', '2025-12-31', { tag: 'ttm' }),
      rec('ANNUAL', '2024-12-31', { tag: 'a-old' }),
    ]);
    expect(out.map((r: any) => r.tag)).toEqual(['ttm', 'a-new', 'a-old']);
  });

  it('preserves periodEndDate-DESC order for distinct dates regardless of type', () => {
    const out = orderFundamentalsForServing([
      rec('ANNUAL', '2024-12-31', { tag: 'a' }),
      rec('TTM', '2025-09-30', { tag: 'ttm' }),
      rec('QUARTERLY', '2025-06-30', { tag: 'q' }),
    ]);
    // TTM is genuinely newest here, so it leads on date alone; older fiscal rows follow.
    expect(out.map((r: any) => r.tag)).toEqual(['ttm', 'q', 'a']);
  });

  it('is stable for true ties (two fiscal rows on the same date keep incoming order)', () => {
    const out = orderFundamentalsForServing([
      rec('QUARTERLY', '2025-03-31', { tag: 'first' }),
      rec('ANNUAL', '2025-03-31', { tag: 'second' }),
    ]);
    expect(out.map((r: any) => r.tag)).toEqual(['first', 'second']);
  });

  it('case-insensitive on periodType and tolerant of empty input', () => {
    expect(orderFundamentalsForServing([])).toEqual([]);
    const out = orderFundamentalsForServing([
      rec('quarterly', '2025-09-30', { tag: 'q' }),
      rec('ttm', '2025-09-30', { tag: 'ttm' }),
    ]);
    expect(out.map((r: any) => r.tag)).toEqual(['ttm', 'q']);
  });
});
