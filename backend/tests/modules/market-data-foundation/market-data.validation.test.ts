/// <reference types="@types/jest" />
import {
  partitionHistoricalPrices,
  validateHistoricalPrice,
  validateRequiredString,
} from '../../../src/modules/market-data-foundation/validation/market-data.validation';

describe('market data validation', () => {
  it('accepts a complete historical price row', () => {
    const errors = validateHistoricalPrice({
      symbol: 'AAPL',
      date: new Date('2025-01-01'),
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      volume: 1000,
    });

    expect(errors).toEqual([]);
  });

  it('reports missing and malformed historical price fields', () => {
    const errors = validateHistoricalPrice({
      symbol: '',
      date: new Date('invalid'),
      open: Number.NaN,
      high: 90,
      low: 100,
      close: 95,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'symbol is required',
        'date must be a valid Date',
        'open must be a finite number',
        'low cannot be greater than high',
      ])
    );
  });

  it('partitions valid and invalid historical price rows', () => {
    const result = partitionHistoricalPrices([
      {
        symbol: 'AAPL',
        date: new Date('2025-01-01'),
        open: 100,
        high: 110,
        low: 95,
        close: 105,
      },
      {
        symbol: 'MSFT',
        date: new Date('2025-01-01'),
        open: 100,
        high: Number.NaN,
        low: 95,
        close: 105,
      },
    ]);

    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(1);
  });

  it('validates required string inputs', () => {
    expect(validateRequiredString('AAPL', 'symbol')).toBeNull();
    expect(validateRequiredString('', 'symbol')).toBe('symbol is required');
  });
});
