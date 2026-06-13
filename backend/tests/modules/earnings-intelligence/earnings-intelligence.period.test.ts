/// <reference types="@types/jest" />
import {
  classifyPeriod,
  isAnnualPeriod,
  isQuarterlyPeriod,
  isTtmPeriod,
} from '../../../src/modules/earnings-intelligence/earnings-intelligence.period';

describe('classifyPeriod', () => {
  it('classifies the canonical ingestion values', () => {
    expect(classifyPeriod('QUARTERLY')).toBe('QUARTERLY');
    expect(classifyPeriod('ANNUAL')).toBe('ANNUAL');
    expect(classifyPeriod('TTM')).toBe('TTM');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(classifyPeriod('  quarterly ')).toBe('QUARTERLY');
    expect(classifyPeriod('annual')).toBe('ANNUAL');
    expect(classifyPeriod('ttm')).toBe('TTM');
  });

  it('B3: classifies "Q3 FY25" as QUARTERLY, not ANNUAL (the old substring bug)', () => {
    expect(classifyPeriod('Q3 FY25')).toBe('QUARTERLY');
    expect(classifyPeriod('Q1')).toBe('QUARTERLY');
    expect(classifyPeriod('Quarter ended September 30, 2024')).toBe('QUARTERLY');
  });

  it('classifies fiscal-year and trailing labels', () => {
    expect(classifyPeriod('FY24')).toBe('ANNUAL');
    expect(classifyPeriod('Year ended March 31, 2024')).toBe('ANNUAL');
    expect(classifyPeriod('Trailing Twelve Months')).toBe('TTM');
  });

  it('returns UNKNOWN for empty/unrecognised input', () => {
    expect(classifyPeriod('')).toBe('UNKNOWN');
    expect(classifyPeriod(null)).toBe('UNKNOWN');
    expect(classifyPeriod(undefined)).toBe('UNKNOWN');
    expect(classifyPeriod('dividend')).toBe('UNKNOWN');
  });

  it('exposes mutually-exclusive boolean helpers', () => {
    expect(isQuarterlyPeriod('QUARTERLY')).toBe(true);
    expect(isAnnualPeriod('QUARTERLY')).toBe(false);
    expect(isTtmPeriod('QUARTERLY')).toBe(false);
    expect(isAnnualPeriod('ANNUAL')).toBe(true);
    expect(isTtmPeriod('TTM')).toBe(true);
    // "Q3 FY25" must be quarterly-only despite containing "FY".
    expect(isQuarterlyPeriod('Q3 FY25')).toBe(true);
    expect(isAnnualPeriod('Q3 FY25')).toBe(false);
  });
});
