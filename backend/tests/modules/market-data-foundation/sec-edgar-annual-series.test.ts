/**
 * Pure-unit tests for `annualSeries` — the SEC EDGAR companyfacts annual extractor
 * that backfills US ANNUAL fundamentals (the YoY comparable the GROWTH setup needs).
 *
 * Locks the correctness filters: only genuine full-fiscal-year facts survive
 * (fp='FY' + 10-K/20-F/40-F form + ~365-day duration), restatements dedupe by
 * fiscal year-end preferring the latest `filed`, concept fallback picks the first
 * concept that yields annual data, and unparseable input yields [].
 */
import { annualSeries, type CompanyFacts, type XbrlFact } from '../../../src/modules/market-data-foundation/ingestion/us/market-data-foundation.sec-edgar-client';

/** Build a CompanyFacts with a single us-gaap concept/unit fact array. */
const facts = (concept: string, unit: string, points: XbrlFact[]): CompanyFacts => ({
  usGaap: { [concept]: { [unit]: points } },
  dei: {},
});

const fy = (start: string, end: string, val: number, extra: Partial<XbrlFact> = {}): XbrlFact => ({
  start,
  end,
  val,
  fp: 'FY',
  form: '10-K',
  filed: end,
  ...extra,
});

describe('annualSeries — annual fiscal-year extractor', () => {
  it('keeps full-year FY 10-K facts and sorts most-recent-first', () => {
    const f = facts('Revenues', 'USD', [
      fy('2023-01-01', '2023-12-31', 100),
      fy('2024-01-01', '2024-12-31', 130),
      fy('2025-01-01', '2025-12-31', 150),
    ]);
    const out = annualSeries(f, ['Revenues'], 'USD');
    expect(out.map((p) => p.end)).toEqual(['2025-12-31', '2024-12-31', '2023-12-31']);
    expect(out.map((p) => p.val)).toEqual([150, 130, 100]);
  });

  it('excludes year-to-date / quarterly facts (span far from 365 days)', () => {
    const f = facts('Revenues', 'USD', [
      fy('2024-10-01', '2024-12-31', 40), // ~92d quarter, fp mis-set to FY
      fy('2024-01-01', '2024-12-31', 130), // genuine full year
    ]);
    const out = annualSeries(f, ['Revenues'], 'USD');
    expect(out.map((p) => p.val)).toEqual([130]);
  });

  it('excludes non-annual forms (e.g. 10-Q) even with fp=FY and full-year span', () => {
    const f = facts('Revenues', 'USD', [
      fy('2024-01-01', '2024-12-31', 130, { form: '10-Q' }),
    ]);
    expect(annualSeries(f, ['Revenues'], 'USD')).toEqual([]);
  });

  it('dedupes restatements by fiscal year-end, keeping the latest filed value', () => {
    const f = facts('Revenues', 'USD', [
      fy('2024-01-01', '2024-12-31', 130, { filed: '2025-02-01' }), // original
      fy('2024-01-01', '2024-12-31', 128, { filed: '2026-02-01' }), // restated, later filed
    ]);
    const out = annualSeries(f, ['Revenues'], 'USD');
    expect(out).toHaveLength(1);
    expect(out[0].val).toBe(128);
  });

  it('falls back across concepts (first concept with annual data wins)', () => {
    const f: CompanyFacts = {
      usGaap: {
        // primary concept present but with no qualifying annual facts
        RevenueFromContractWithCustomerExcludingAssessedTax: { USD: [fy('2024-10-01', '2024-12-31', 40)] },
        Revenues: { USD: [fy('2024-01-01', '2024-12-31', 130)] },
      },
      dei: {},
    };
    const out = annualSeries(f, ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues'], 'USD');
    expect(out.map((p) => p.val)).toEqual([130]);
  });

  it('returns [] when no concept yields annual data', () => {
    const f = facts('Revenues', 'USD', [fy('2024-10-01', '2024-12-31', 40)]);
    expect(annualSeries(f, ['Revenues', 'SalesRevenueNet'], 'USD')).toEqual([]);
    expect(annualSeries({ usGaap: {}, dei: {} }, ['Revenues'], 'USD')).toEqual([]);
  });
});
