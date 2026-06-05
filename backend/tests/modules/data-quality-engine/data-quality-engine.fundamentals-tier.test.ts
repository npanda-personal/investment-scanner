/// <reference types="@types/jest" />
import { DataQualityEngineService } from '../../../src/modules/data-quality-engine';
import type { FundamentalsCoverageTier } from '../../../src/modules/data-quality-engine/data-quality-engine.types';

const DAY_MS = 86_400_000;

const instrument = (overrides: Record<string, any> = {}) => ({
  id: 'in-stock-1',
  symbol: 'RELIANCE',
  company_name: 'Reliance Industries',
  sector: 'Energy',
  industry: 'Integrated Oil and Gas',
  country: 'IN',
  currency: 'INR',
  exchange: 'NSE',
  assetType: 'STOCK',
  required_history_status: 'COMPLETE',
  listing_date_status: 'PRESENT_OLDER_THAN_15Y_USED_15Y',
  ...overrides,
});

const prices = (count: number, volume: number | null = 1_500_000) =>
  Array.from({ length: count }).map((_, index) => ({
    date: new Date(Date.now() - index * DAY_MS).toISOString(),
    close: 2500 - index * 0.5,
    adjusted_close: 2500 - index * 0.5,
    volume,
  }));

/**
 * Build a fundamentals record array with distinct period_end_date values.
 * Each entry uses a quarterly date offset from a base date.
 */
const fundamentalsWithPeriods = (count: number) =>
  Array.from({ length: count }).map((_, index) => ({
    period_type: 'QUARTERLY',
    period_end_date: new Date(2024, 2 - index * 3, 31).toISOString(),
    eps: 10 + index,
    revenue: 1_000_000 + index * 50_000,
  }));

/**
 * Build a fundamentals record array where all records share the same period_end_date
 * (simulates duplicate rows from multiple sources for the same period).
 */
const fundamentalsDuplicatePeriod = (count: number) =>
  Array.from({ length: count }).map((_) => ({
    period_type: 'QUARTERLY',
    period_end_date: new Date(2024, 2, 31).toISOString(),
    eps: 10,
    revenue: 1_000_000,
  }));

describe('DataQualityEngineService — fundamentalsCoverageTierFor', () => {
  const service = new DataQualityEngineService();

  describe('tier boundaries', () => {
    it.each<[number, FundamentalsCoverageTier]>([
      [0, 'NONE'],
      [1, 'SHALLOW'],
      [2, 'SHALLOW'],
      [3, 'ADEQUATE'],
      [5, 'ADEQUATE'],
      [7, 'ADEQUATE'],
      [8, 'DEEP'],
      [9, 'DEEP'],
      [12, 'DEEP'],
    ])('classifies %d distinct periods as %s', (periodCount, expectedTier) => {
      const records = fundamentalsWithPeriods(periodCount);
      const result = service.fundamentalsCoverageTierFor(records);
      expect(result.tier).toBe(expectedTier);
      expect(result.periodCount).toBe(periodCount);
    });
  });

  it('returns NONE with periodCount 0 for empty fundamentals', () => {
    const result = service.fundamentalsCoverageTierFor([]);
    expect(result.tier).toBe('NONE');
    expect(result.periodCount).toBe(0);
  });

  it('de-duplicates records sharing the same period_end_date', () => {
    // 5 records but all same date → 1 distinct period → SHALLOW
    const records = fundamentalsDuplicatePeriod(5);
    const result = service.fundamentalsCoverageTierFor(records);
    expect(result.tier).toBe('SHALLOW');
    expect(result.periodCount).toBe(1);
  });

  it('accepts periodEndDate (camelCase) as well as period_end_date (snake_case)', () => {
    const records = [
      { periodEndDate: new Date(2024, 2, 31), eps: 10 },
      { periodEndDate: new Date(2023, 11, 31), eps: 9 },
      { periodEndDate: new Date(2023, 8, 30), eps: 8 },
    ];
    const result = service.fundamentalsCoverageTierFor(records);
    expect(result.tier).toBe('ADEQUATE');
    expect(result.periodCount).toBe(3);
  });

  it('handles records with null/undefined period_end_date gracefully', () => {
    // 2 valid + 3 nulls → 2 distinct periods → SHALLOW
    const records = [
      { period_end_date: new Date(2024, 2, 31).toISOString(), eps: 10 },
      { period_end_date: new Date(2023, 11, 31).toISOString(), eps: 9 },
      { period_end_date: null, eps: 8 },
      { period_end_date: undefined, eps: 7 },
      { eps: 6 }, // no date field at all
    ];
    const result = service.fundamentalsCoverageTierFor(records);
    expect(result.tier).toBe('SHALLOW');
    expect(result.periodCount).toBe(2);
  });
});

describe('DataQualityEngineService.evaluateInstrument — fundamentals tier in DTO', () => {
  const service = new DataQualityEngineService();
  const px = prices(260);
  const latestPx = px[0];
  const actions = [{ action_type: 'dividend' }];

  it('sets fundamentalsCoverageTier=NONE and fundamentalsPeriodCount=0 when no fundamentals', () => {
    const result = service.evaluateInstrument(instrument(), px, latestPx, [], actions, false);
    expect(result.fundamentalsCoverageTier).toBe('NONE');
    expect(result.fundamentalsPeriodCount).toBe(0);
    expect(result.dataGaps).toContain('Fundamentals are missing.');
  });

  it('sets SHALLOW tier for 1 fundamental record', () => {
    const result = service.evaluateInstrument(
      instrument(),
      px,
      latestPx,
      fundamentalsWithPeriods(1),
      actions,
      false
    );
    expect(result.fundamentalsCoverageTier).toBe('SHALLOW');
    expect(result.fundamentalsPeriodCount).toBe(1);
  });

  it('sets SHALLOW tier for 2 fundamental periods', () => {
    const result = service.evaluateInstrument(
      instrument(),
      px,
      latestPx,
      fundamentalsWithPeriods(2),
      actions,
      false
    );
    expect(result.fundamentalsCoverageTier).toBe('SHALLOW');
    expect(result.fundamentalsPeriodCount).toBe(2);
  });

  it('sets ADEQUATE tier for 5 fundamental periods (dominant real-world case)', () => {
    const result = service.evaluateInstrument(
      instrument(),
      px,
      latestPx,
      fundamentalsWithPeriods(5),
      actions,
      false
    );
    expect(result.fundamentalsCoverageTier).toBe('ADEQUATE');
    expect(result.fundamentalsPeriodCount).toBe(5);
  });

  it('sets DEEP tier for 9 fundamental periods', () => {
    const result = service.evaluateInstrument(
      instrument(),
      px,
      latestPx,
      fundamentalsWithPeriods(9),
      actions,
      true
    );
    expect(result.fundamentalsCoverageTier).toBe('DEEP');
    expect(result.fundamentalsPeriodCount).toBe(9);
  });

  it('does not let 1 manual row (5 duplicates, 1 distinct period) appear as ADEQUATE', () => {
    // The critical invariant from the task: "1 manual fundamentals row != 8 quarters"
    const result = service.evaluateInstrument(
      instrument(),
      px,
      latestPx,
      fundamentalsDuplicatePeriod(5), // 5 records, only 1 distinct period
      actions,
      false
    );
    expect(result.fundamentalsCoverageTier).toBe('SHALLOW');
    expect(result.fundamentalsPeriodCount).toBe(1);
  });

  it('includes both fundamentalsCoverageTier and fundamentalsPeriodCount in the DTO', () => {
    const result = service.evaluateInstrument(
      instrument(),
      px,
      latestPx,
      fundamentalsWithPeriods(8),
      actions,
      true
    );
    expect(result).toHaveProperty('fundamentalsCoverageTier');
    expect(result).toHaveProperty('fundamentalsPeriodCount');
    expect(result.fundamentalsCoverageTier).toBe('DEEP');
    expect(result.fundamentalsPeriodCount).toBe(8);
  });
});
