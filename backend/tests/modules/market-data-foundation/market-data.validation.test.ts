/// <reference types="@types/jest" />
import {
  partitionHistoricalPrices,
  validateHistoricalPrice,
  validateInstrumentInput,
  validateRequiredString,
} from '../../../src/modules/market-data-foundation';

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

  it('reports negative prices, invalid volume, and open/close outside range', () => {
    const errors = validateHistoricalPrice({
      symbol: 'AAPL',
      date: new Date('2025-01-01'),
      open: 120,
      high: 110,
      low: 95,
      close: -1,
      volume: -10,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'close must be greater than 0',
        'volume cannot be negative',
        'open must be within low/high range',
        'close must be within low/high range',
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

  it('partitions duplicate bars and abnormal price spikes as warnings/skips', () => {
    const result = partitionHistoricalPrices([
      {
        symbol: 'AAPL',
        date: new Date('2025-01-01'),
        open: 100,
        high: 110,
        low: 95,
        close: 100,
      },
      {
        symbol: 'AAPL',
        date: new Date('2025-01-01'),
        open: 100,
        high: 110,
        low: 95,
        close: 100,
      },
      {
        symbol: 'AAPL',
        date: new Date('2025-01-02'),
        open: 200,
        high: 210,
        low: 190,
        close: 205,
      },
    ], 0.5);

    expect(result.valid).toHaveLength(1);
    expect(result.invalid.flatMap((row) => row.errors)).toEqual(
      expect.arrayContaining([
        'duplicate price bar in batch',
        'abnormal price spike exceeds threshold 0.5',
      ])
    );
  });

  it('validates required string inputs', () => {
    expect(validateRequiredString('AAPL', 'symbol')).toBeNull();
    expect(validateRequiredString('', 'symbol')).toBe('symbol is required');
  });

  it('validates required instrument inputs', () => {
    expect(validateInstrumentInput({
      symbol: 'AAPL',
      company_name: 'Apple Inc.',
      exchange: 'NASDAQ',
      currency: 'USD',
      asset_type: 'EQUITY',
    })).toEqual([]);

    expect(validateInstrumentInput({})).toEqual(
      expect.arrayContaining([
        'symbol is required',
        'exchange is required',
        'currency is required',
        'asset_type is required',
        'company_name is required',
      ])
    );
  });
});
