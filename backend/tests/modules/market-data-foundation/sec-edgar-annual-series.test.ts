/**
 * Pure-unit tests for `annualSeries` — the SEC EDGAR companyfacts annual extractor
 * that backfills US ANNUAL fundamentals (the YoY comparable the GROWTH setup needs).
 *
 * Locks the correctness filters: only genuine full-fiscal-year facts survive
 * (fp='FY' + 10-K/20-F/40-F form + ~365-day duration), restatements dedupe by
 * fiscal year-end preferring the latest `filed`, facts MERGE across all listed
 * concepts (tag-switching names get a continuous series; primary concept wins a
 * shared year-end), and unparseable input yields [].
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

  it('falls back across concepts when the primary has no qualifying annual facts', () => {
    const f: CompanyFacts = {
      usGaap: {
        // primary concept present but only a sub-year (quarter) fact — excluded
        RevenueFromContractWithCustomerExcludingAssessedTax: { USD: [fy('2024-10-01', '2024-12-31', 40)] },
        Revenues: { USD: [fy('2024-01-01', '2024-12-31', 130)] },
      },
      dei: {},
    };
    const out = annualSeries(f, ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues'], 'USD');
    expect(out.map((p) => p.val)).toEqual([130]);
  });

  it('MERGES facts across tags into a continuous series (mid-history tag switch)', () => {
    // Real-world shape (e.g. NVDA): older fiscal years tagged under `Revenues`,
    // newer years under `RevenueFromContractWithCustomerExcludingAssessedTax`.
    // First-concept-wins would gap one half; the merge must yield all 4 years.
    const f: CompanyFacts = {
      usGaap: {
        RevenueFromContractWithCustomerExcludingAssessedTax: {
          USD: [
            fy('2024-01-01', '2024-12-31', 600),
            fy('2025-01-01', '2025-12-31', 900),
          ],
        },
        Revenues: {
          USD: [
            fy('2022-01-01', '2022-12-31', 270),
            fy('2023-01-01', '2023-12-31', 270),
          ],
        },
      },
      dei: {},
    };
    const out = annualSeries(
      f,
      ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'],
      'USD',
    );
    expect(out.map((p) => p.end)).toEqual(['2025-12-31', '2024-12-31', '2023-12-31', '2022-12-31']);
    expect(out.map((p) => p.val)).toEqual([900, 600, 270, 270]);
  });

  it('prefers the earlier-listed (primary) concept on a shared year-end', () => {
    // Transition year double-tagged under both tags — the primary tag wins.
    const f: CompanyFacts = {
      usGaap: {
        RevenueFromContractWithCustomerExcludingAssessedTax: { USD: [fy('2024-01-01', '2024-12-31', 600)] },
        Revenues: { USD: [fy('2024-01-01', '2024-12-31', 595)] },
      },
      dei: {},
    };
    const out = annualSeries(
      f,
      ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues'],
      'USD',
    );
    expect(out).toHaveLength(1);
    expect(out[0].val).toBe(600);
  });

  it('primary concept wins a shared year-end even when the fallback was filed later', () => {
    // The `prev.rank < rank` guard must short-circuit BEFORE the `filed` tie-break:
    // a later-filed fallback tag must NOT override the primary tag's value.
    const f: CompanyFacts = {
      usGaap: {
        RevenueFromContractWithCustomerExcludingAssessedTax: { USD: [fy('2024-01-01', '2024-12-31', 600, { filed: '2025-02-01' })] },
        Revenues: { USD: [fy('2024-01-01', '2024-12-31', 595, { filed: '2026-09-01' })] }, // later filed, lower priority
      },
      dei: {},
    };
    const out = annualSeries(
      f,
      ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues'],
      'USD',
    );
    expect(out).toHaveLength(1);
    expect(out[0].val).toBe(600);
  });

  it('returns [] when no concept yields annual data', () => {
    const f = facts('Revenues', 'USD', [fy('2024-10-01', '2024-12-31', 40)]);
    expect(annualSeries(f, ['Revenues', 'SalesRevenueNet'], 'USD')).toEqual([]);
    expect(annualSeries({ usGaap: {}, dei: {} }, ['Revenues'], 'USD')).toEqual([]);
  });
});
