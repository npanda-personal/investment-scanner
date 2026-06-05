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

  // Spike rejection is now DEFAULT ON at 50%. Raw bhavcopy rows with >50% day-over-day
  // moves are rejected/flagged to prevent decimal-error ticks from poisoning the
  // adjustedClose recompute. Corporate-action adjusted series are handled by the
  // back-adjustment pipeline, not by raw price ingestion, so this guard does not apply
  // to adjusted prices produced downstream.
  it('rejects >50% raw moves by default (default spike guard ON) and passes with guard disabled', () => {
    const rows = [
      {
        symbol: 'FCSSOFT.NS',
        date: new Date('2025-01-01'),
        open: 100,
        high: 110,
        low: 95,
        close: 100,
      },
      {
        // 120% move vs prior close — exceeds default 50% threshold
        symbol: 'FCSSOFT.NS',
        date: new Date('2025-01-02'),
        open: 210,
        high: 230,
        low: 200,
        close: 220,
      },
      {
        // 78% drop vs last valid close (100) — also exceeds 50% threshold
        symbol: 'FCSSOFT.NS',
        date: new Date('2025-01-03'),
        open: 50,
        high: 55,
        low: 45,
        close: 48,
      },
    ];

    // Default (no env): spike guard is ON at 50%; rows 2 and 3 are rejected/flagged.
    const defaultResult = partitionHistoricalPrices(rows);
    expect(defaultResult.valid).toHaveLength(1);
    expect(defaultResult.valid[0].close).toBe(100);
    expect(defaultResult.invalid).toHaveLength(2);
    expect(defaultResult.invalid.flatMap((r) => r.errors)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/abnormal price spike/),
        expect.stringMatching(/abnormal price spike/),
      ])
    );

    // Explicit threshold of 0 disables the guard — all rows pass.
    const disabledResult = partitionHistoricalPrices(rows, 0);
    expect(disabledResult.valid).toHaveLength(3);
    expect(disabledResult.invalid).toHaveLength(0);
  });

  it('passes normal intra-day and moderate moves under the default 50% spike guard', () => {
    // Normal moves well within NSE/BSE circuit limits pass without flagging.
    const result = partitionHistoricalPrices([
      {
        symbol: 'RELIANCE.NS',
        date: new Date('2025-01-01'),
        open: 2900,
        high: 2950,
        low: 2880,
        close: 2920,
      },
      {
        // ~6.8% move — above a 5% circuit but well below 50%; must pass.
        symbol: 'RELIANCE.NS',
        date: new Date('2025-01-02'),
        open: 3110,
        high: 3130,
        low: 3090,
        close: 3120,
      },
      {
        // 49% move — just under the 50% default threshold; must pass.
        symbol: 'RELIANCE.NS',
        date: new Date('2025-01-03'),
        open: 4640,
        high: 4660,
        low: 4620,
        close: 4648,
      },
    ]);

    expect(result.valid).toHaveLength(3);
    expect(result.invalid).toHaveLength(0);
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
