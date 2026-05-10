import { StrategyFrameworkRegistry, StrategyFrameworkService } from '../../../src/modules/strategy-framework';

describe('Strategy Framework service', () => {
  const service = new StrategyFrameworkService(
    {} as any,
    new StrategyFrameworkRegistry(),
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
  );

  it('creates registered backtest config for active entry strategies', () => {
    const config = service.strategyToBacktestConfig({
      strategyCode: 'TREND_MOMENTUM',
      timeframe: '3Y',
      region: 'IN',
      assetType: 'STOCK',
    });

    expect(config.strategyCode).toBe('TREND_MOMENTUM');
    expect(config.mode).toBe('REGISTERED_STRATEGY');
  });

  it('rejects support rules as standalone registered backtests', () => {
    expect(() => service.strategyToBacktestConfig({
      strategyCode: 'LOW_QUALITY_DATA_REJECTION',
      timeframe: '3Y',
      region: 'IN',
      assetType: 'STOCK',
    })).toThrow('Registered backtests currently support active ENTRY strategies only');
  });

  it('rejects draft strategies as standalone registered backtests', () => {
    expect(() => service.strategyToBacktestConfig({
      strategyCode: 'QUALITY_TREND',
      timeframe: '3Y',
      region: 'IN',
      assetType: 'STOCK',
    })).toThrow('QUALITY_TREND is DRAFT');
  });
});
