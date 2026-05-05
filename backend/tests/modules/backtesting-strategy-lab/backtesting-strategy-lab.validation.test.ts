/// <reference types="@types/jest" />
import { validateConfig, validateStrategyInput } from '../../../src/modules/backtesting-strategy-lab';
import type { BacktestStrategyConfig } from '../../../src/modules/backtesting-strategy-lab';

const config: BacktestStrategyConfig = {
  universe: { type: 'SYMBOLS', symbols: ['AAA'] },
  entryRule: { type: 'PRICE_ABOVE_SMA50' },
  exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 20 },
  startDate: '2024-01-01',
  endDate: '2025-01-01',
  initialCapital: 100000,
  positionSizeType: 'EQUAL_WEIGHT',
  maxPositions: 5,
  transactionCostPercent: 0.001,
};

describe('backtesting strategy validation', () => {
  it('accepts a valid strategy config', () => {
    expect(validateConfig(config)).toEqual([]);
  });

  it('requires bounded date, capital, rules, and universe inputs', () => {
    const errors = validateConfig({
      ...config,
      universe: { type: 'SYMBOLS', symbols: [] },
      startDate: '2025-01-01',
      endDate: '2024-01-01',
      initialCapital: 0,
      maxPositions: 0,
      transactionCostPercent: -1,
    });

    expect(errors).toEqual(expect.arrayContaining([
      'start date must be before end date',
      'symbol universe requires at least one symbol',
      'initial capital must be greater than 0',
      'max positions must be 1-100',
      'transaction cost must be 0-10%',
    ]));
  });

  it('requires strategy name and score rule thresholds', () => {
    const errors = validateStrategyInput({
      name: '',
      config: {
        ...config,
        entryRule: { type: 'SIGNAL_SCORE_ABOVE' },
        exitRule: { type: 'SIGNAL_SCORE_BELOW' },
      },
    });

    expect(errors).toEqual(expect.arrayContaining([
      'strategy name is required',
      'entry signal threshold is required',
      'exit signal threshold is required',
    ]));
  });

  it('accepts registered Strategy Framework configs with supported timeframes', () => {
    expect(validateConfig({
      ...config,
      mode: 'REGISTERED_STRATEGY',
      strategyCode: 'TREND_MOMENTUM',
      timeframe: '15Y',
      region: 'IN',
      assetType: 'STOCK',
    })).toEqual([]);
  });

  it('rejects registered configs without strategy code or valid timeframe', () => {
    const errors = validateConfig({
      ...config,
      mode: 'REGISTERED_STRATEGY',
      timeframe: '2Y' as any,
    });

    expect(errors).toEqual(expect.arrayContaining([
      'registered strategy code is required',
      'registered strategy timeframe is required',
    ]));
  });
});
