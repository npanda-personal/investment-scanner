/**
 * Pure-unit tests for `quarterlySeries` — the SEC EDGAR companyfacts standalone-
 * quarter extractor that backfills US QUARTERLY fundamentals (the same-quarter
 * YoY comparable the signal engine's GROWTH / margin-trend votes prefer).
 *
 * Locks the correctness filters: only genuine standalone-quarter facts survive
 * (fp ∈ {Q1..Q4} + 10-Q form + ~quarter-length 80..100-day duration), the
 * duration guard discards a 10-Q's year-to-date cumulative facts (Q2 ≈ 180d,
 * Q3 ≈ 270d), full-year (fp='FY'/10-K) facts are excluded, restatements dedupe
 * by quarter-end preferring the latest `filed`, facts MERGE across all listed
 * concepts (primary concept wins a shared quarter-end), and empty input → [].
 */
import { quarterlySeries, type CompanyFacts, type XbrlFact } from '../../../src/modules/market-data-foundation/ingestion/us/market-data-foundation.sec-edgar-client';

/** Build a CompanyFacts with a single us-gaap concept/unit fact array. */
const facts = (concept: string, unit: string, points: XbrlFact[]): CompanyFacts => ({
  usGaap: { [concept]: { [unit]: points } },
  dei: {},
});

/** A standalone-quarter 10-Q fact (defaults: fp='Q2', form='10-Q', filed=end). */
const q = (start: string, end: string, val: number, extra: Partial<XbrlFact> = {}): XbrlFact => ({
  start,
  end,
  val,
  fp: 'Q2',
  form: '10-Q',
  filed: end,
  ...extra,
});

describe('quarterlySeries — standalone fiscal-quarter extractor', () => {
  it('keeps ~quarter-length 10-Q facts and sorts most-recent-first', () => {
    const f = facts('Revenues', 'USD', [
      q('2024-04-01', '2024-06-30', 40, { fp: 'Q2' }),
      q('2024-07-01', '2024-09-30', 45, { fp: 'Q3' }),
      q('2024-01-01', '2024-03-31', 38, { fp: 'Q1' }),
    ]);
    const out = quarterlySeries(f, ['Revenues'], 'USD');
    expect(out.map((p) => p.end)).toEqual(['2024-09-30', '2024-06-30', '2024-03-31']);
    expect(out.map((p) => p.val)).toEqual([45, 40, 38]);
  });

  it('excludes year-to-date cumulative facts (span ~180/270 days) — the load-bearing guard', () => {
    const f = facts('Revenues', 'USD', [
      q('2024-04-01', '2024-06-30', 40), // standalone Q2 (~91d) — kept
      q('2024-01-01', '2024-06-30', 78, { fp: 'Q2' }), // H1 YTD (~181d) — same end, excluded by span
    ]);
    const out = quarterlySeries(f, ['Revenues'], 'USD');
    expect(out).toHaveLength(1);
    expect(out[0].val).toBe(40);
  });

  it('excludes full-year facts (fp=FY / 10-K) even on a qualifying concept', () => {
    const f = facts('Revenues', 'USD', [
      q('2024-01-01', '2024-12-31', 150, { fp: 'FY', form: '10-K' }),
    ]);
    expect(quarterlySeries(f, ['Revenues'], 'USD')).toEqual([]);
  });

  it('excludes non-10-Q forms even with a Qx fp and quarter-length span', () => {
    const f = facts('Revenues', 'USD', [
      q('2024-04-01', '2024-06-30', 40, { form: '8-K' }),
    ]);
    expect(quarterlySeries(f, ['Revenues'], 'USD')).toEqual([]);
  });

  it('dedupes restatements by quarter-end, keeping the latest filed value', () => {
    const f = facts('Revenues', 'USD', [
      q('2024-04-01', '2024-06-30', 40, { filed: '2024-08-01' }), // original
      q('2024-04-01', '2024-06-30', 39, { filed: '2025-08-01' }), // restated, later filed
    ]);
    const out = quarterlySeries(f, ['Revenues'], 'USD');
    expect(out).toHaveLength(1);
    expect(out[0].val).toBe(39);
  });

  it('MERGES facts across tags into a continuous series (mid-history tag switch)', () => {
    const f: CompanyFacts = {
      usGaap: {
        RevenueFromContractWithCustomerExcludingAssessedTax: {
          USD: [
            q('2025-01-01', '2025-03-31', 90, { fp: 'Q1' }),
            q('2025-04-01', '2025-06-30', 95, { fp: 'Q2' }),
          ],
        },
        Revenues: {
          USD: [
            q('2024-01-01', '2024-03-31', 80, { fp: 'Q1' }),
            q('2024-04-01', '2024-06-30', 85, { fp: 'Q2' }),
          ],
        },
      },
      dei: {},
    };
    const out = quarterlySeries(
      f,
      ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'],
      'USD',
    );
    expect(out.map((p) => p.end)).toEqual(['2025-06-30', '2025-03-31', '2024-06-30', '2024-03-31']);
    expect(out.map((p) => p.val)).toEqual([95, 90, 85, 80]);
  });

  it('prefers the earlier-listed (primary) concept on a shared quarter-end', () => {
    const f: CompanyFacts = {
      usGaap: {
        RevenueFromContractWithCustomerExcludingAssessedTax: { USD: [q('2024-04-01', '2024-06-30', 600, { filed: '2024-08-01' })] },
        Revenues: { USD: [q('2024-04-01', '2024-06-30', 595, { filed: '2026-09-01' })] }, // later filed, lower priority
      },
      dei: {},
    };
    const out = quarterlySeries(
      f,
      ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues'],
      'USD',
    );
    expect(out).toHaveLength(1);
    expect(out[0].val).toBe(600);
  });

  it('locks the 80..100-day span edges: keeps a 14-week (~97d) quarter, drops a sub-80d stub and a >100d span', () => {
    const f = facts('Revenues', 'USD', [
      q('2023-01-01', '2023-04-08', 50, { fp: 'Q1' }), // 97 days (14-week quarter) — kept
      q('2023-04-01', '2023-06-19', 60, { fp: 'Q2' }), // 79 days (fiscal-transition stub) — dropped
      q('2023-07-01', '2023-10-10', 70, { fp: 'Q3' }), // 101 days — dropped
    ]);
    const out = quarterlySeries(f, ['Revenues'], 'USD');
    expect(out.map((p) => p.end)).toEqual(['2023-04-08']);
    expect(out.map((p) => p.val)).toEqual([50]);
  });

  it('drops a standalone-quarter fact whose `start` is missing (span indeterminate)', () => {
    const f: CompanyFacts = {
      usGaap: {
        Revenues: { USD: [{ end: '2024-06-30', val: 40, fp: 'Q2', form: '10-Q', filed: '2024-08-01' } as XbrlFact] },
      },
      dei: {},
    };
    expect(quarterlySeries(f, ['Revenues'], 'USD')).toEqual([]);
  });

  it('returns [] when no concept yields standalone-quarter data', () => {
    const f = facts('Revenues', 'USD', [q('2024-01-01', '2024-12-31', 150, { fp: 'FY', form: '10-K' })]);
    expect(quarterlySeries(f, ['Revenues', 'SalesRevenueNet'], 'USD')).toEqual([]);
    expect(quarterlySeries({ usGaap: {}, dei: {} }, ['Revenues'], 'USD')).toEqual([]);
  });
});
