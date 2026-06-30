/// <reference types="@types/jest" />
import {
  filterScaleAnomalies,
  isScaleAnomalyFundamental,
  scaleAnomalyRowCount,
} from '../../../src/modules/data-quality-engine';

// A confirmed scale-error row that MUST be suppressed (stored netIncome
// -34,634,800,000 against a company whose true scale is ~tens of millions).
const SUPPRESSED = {
  region: 'IN',
  symbol: 'TNTELE',
  periodType: 'QUARTERLY',
  periodEndDate: new Date(Date.UTC(2025, 11, 31)),
};

// Real values a statistical rule wrongly flagged — these must NEVER be suppressed.
const REAL_IMPAIRMENT = {
  region: 'IN',
  symbol: 'ARSHIYA',
  periodType: 'QUARTERLY',
  periodEndDate: new Date(Date.UTC(2024, 2, 31)),
};
const REAL_GAIN = {
  region: 'IN',
  symbol: 'MOTOGENFIN',
  periodType: 'QUARTERLY',
  periodEndDate: new Date(Date.UTC(2026, 2, 31)),
};

describe('fundamentals scale-anomaly suppression', () => {
  it('suppresses a confirmed out-of-scale netIncome row', () => {
    expect(isScaleAnomalyFundamental(SUPPRESSED)).toBe(true);
  });

  it('does NOT suppress real large values (impairment / exceptional gain)', () => {
    // These are statistically indistinguishable from scale errors but verified real;
    // the curated list must keep them so genuine financials are never dropped.
    expect(isScaleAnomalyFundamental(REAL_IMPAIRMENT)).toBe(false);
    expect(isScaleAnomalyFundamental(REAL_GAIN)).toBe(false);
  });

  it('matches case-insensitively on region / symbol / periodType', () => {
    expect(
      isScaleAnomalyFundamental({
        region: 'in',
        symbol: 'tntele',
        periodType: 'quarterly',
        periodEndDate: new Date(Date.UTC(2025, 11, 31)),
      })
    ).toBe(true);
  });

  it('matches on the UTC calendar day regardless of intraday time component', () => {
    expect(
      isScaleAnomalyFundamental({
        ...SUPPRESSED,
        periodEndDate: new Date(Date.UTC(2025, 11, 31, 9, 30, 0)),
      })
    ).toBe(true);
  });

  it('does not suppress a non-listed period of an otherwise-affected symbol', () => {
    expect(
      isScaleAnomalyFundamental({
        region: 'IN',
        symbol: 'TNTELE',
        periodType: 'QUARTERLY',
        periodEndDate: new Date(Date.UTC(2025, 8, 30)),
      })
    ).toBe(false);
  });

  it('filterScaleAnomalies drops suppressed rows and keeps the rest', () => {
    const rows = [
      { periodType: 'QUARTERLY', periodEndDate: new Date(Date.UTC(2025, 11, 31)), tag: 'bad' },
      { periodType: 'QUARTERLY', periodEndDate: new Date(Date.UTC(2025, 8, 30)), tag: 'good' },
    ];
    const kept = filterScaleAnomalies('IN', 'TNTELE', rows);
    expect(kept.map((r) => r.tag)).toEqual(['good']);
  });

  it('filterScaleAnomalies is a no-op for an unaffected symbol', () => {
    const rows = [
      { periodType: 'QUARTERLY', periodEndDate: new Date(Date.UTC(2024, 2, 31)), tag: 'a' },
      { periodType: 'ANNUAL', periodEndDate: new Date(Date.UTC(2024, 2, 31)), tag: 'b' },
    ];
    expect(filterScaleAnomalies('IN', 'ARSHIYA', rows)).toHaveLength(2);
  });

  it('the curated list is non-empty', () => {
    expect(scaleAnomalyRowCount()).toBeGreaterThan(0);
  });
});
