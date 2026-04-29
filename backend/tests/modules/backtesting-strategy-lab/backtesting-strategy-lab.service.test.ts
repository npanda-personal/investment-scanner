/// <reference types="@types/jest" />
import { BacktestingStrategyLabService } from '../../../src/modules/backtesting-strategy-lab';
import type { BacktestRunDto, BacktestStrategyConfig } from '../../../src/modules/backtesting-strategy-lab';

const makePrices = (symbol: string, start = '2024-01-01', days = 260, slope = 1) => {
  const startDate = new Date(start);
  return Array.from({ length: days }, (_item, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      date: date.toISOString(),
      close: 50 + index * slope,
      adjusted_close: 50 + index * slope,
      symbol,
    };
  });
};

const config: BacktestStrategyConfig = {
  universe: { type: 'SYMBOLS', symbols: ['AAA', 'BBB'] },
  entryRule: { type: 'PRICE_ABOVE_SMA50' },
  exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 10 },
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  initialCapital: 100000,
  positionSizeType: 'EQUAL_WEIGHT',
  maxPositions: 1,
  transactionCostPercent: 0.001,
};

const createService = (overrides: any = {}) => {
  const repository = {
    listStrategies: jest.fn(),
    getStrategy: jest.fn(),
    deleteStrategy: jest.fn(),
    listRuns: jest.fn(),
    getRun: jest.fn(),
    deleteRun: jest.fn(),
    createStrategy: jest.fn(async (input) => ({ id: 'strategy-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...input })),
    updateStrategy: jest.fn(),
    createRun: jest.fn(async (input): Promise<BacktestRunDto> => ({
      id: 'run-1',
      startedAt: new Date().toISOString(),
      ...input,
    })),
    ...overrides.repository,
  };
  const marketDataService = {
    listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'stock-1', symbol: 'AAA' }, { id: 'stock-2', symbol: 'BBB' }] }),
    listPricesByInstrumentId: jest.fn(async (instrumentId: string) => ({
      prices: makePrices(instrumentId === 'stock-1' ? 'AAA' : 'BBB', '2024-01-01', 260, instrumentId === 'stock-1' ? 1 : 0.5),
    })),
    ...overrides.marketDataService,
  };
  const watchlistService = { detail: jest.fn(), ...overrides.watchlistService };
  return {
    service: new BacktestingStrategyLabService(repository as any, marketDataService as any, watchlistService as any, { assertAllowed: jest.fn(), recordUsage: jest.fn() } as any),
    repository,
  };
};

describe('BacktestingStrategyLabService', () => {
  it('runs a simple simulation and persists run output', async () => {
    const { service, repository } = createService();

    const run = await service.run({ config });

    expect(repository.createRun).toHaveBeenCalled();
    expect(run.status).toBe('COMPLETED');
    expect(run.metrics?.numberOfTrades).toBeGreaterThan(0);
    expect(run.equityCurve.length).toBeGreaterThan(0);
    expect(run.trades[0]).toHaveProperty('netPnL');
  });

  it('applies transaction costs to trade net P&L', async () => {
    const { service } = createService();

    const run = await service.run({ config: { ...config, universe: { type: 'SYMBOLS', symbols: ['AAA'] }, transactionCostPercent: 0.01 } });

    expect(run.trades.some((trade) => trade.netPnL < trade.grossPnL)).toBe(true);
  });

  it('calculates max drawdown, CAGR, volatility, and Sharpe', () => {
    const { service } = createService();
    const metrics = service.metrics(100, [
      { date: '2024-01-01', equity: 100, cash: 100, investedValue: 0, drawdownPercent: 0 },
      { date: '2024-01-02', equity: 120, cash: 120, investedValue: 0, drawdownPercent: 0 },
      { date: '2024-01-03', equity: 90, cash: 90, investedValue: 0, drawdownPercent: -0.25 },
      { date: '2024-01-04', equity: 130, cash: 130, investedValue: 0, drawdownPercent: 0 },
    ], [], config);

    expect(metrics.maxDrawdown).toBe(-0.25);
    expect(metrics.cagr).not.toBeNull();
    expect(metrics.volatility).not.toBeNull();
    expect(metrics.sharpeRatio).not.toBeNull();
  });

  it('uses saved strategy config when running by strategy id', async () => {
    const { service, repository } = createService({
      repository: {
        getStrategy: jest.fn().mockResolvedValue({
          id: 'strategy-1',
          name: 'Saved',
          description: null,
          config,
          createdAt: '2026-04-28T00:00:00.000Z',
          updatedAt: '2026-04-28T00:00:00.000Z',
        }),
      },
    });

    await service.runStrategy('strategy-1');

    expect(repository.getStrategy).toHaveBeenCalledWith('strategy-1', 'default-user');
    expect(repository.createRun).toHaveBeenCalledWith(expect.objectContaining({ strategyId: 'strategy-1' }), 'default-user');
  });
});
