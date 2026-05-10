/// <reference types="@types/jest" />
import { BacktestingStrategyLabService } from '../../../src/modules/backtesting-strategy-lab';
import type { BacktestRunDto, BacktestStrategyConfig } from '../../../src/modules/backtesting-strategy-lab';
import { StrategyFrameworkRegistry } from '../../../src/modules/strategy-framework';

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

const makePatternPrices = (symbol: string, closes: number[], start = '2024-01-01') => {
  const startDate = new Date(start);
  return closes.map((close, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return { date: date.toISOString(), close, adjusted_close: close, symbol };
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
    updateRunMetrics: jest.fn(async (_id, metrics): Promise<BacktestRunDto> => ({
      id: 'run-1',
      strategyId: null,
      config,
      status: 'COMPLETED',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      metrics,
      equityCurve: [],
      trades: [],
      error: null,
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
  const dataQualityService = {
    filterEligibleInstruments: jest.fn().mockResolvedValue({
      eligibleInstrumentIds: ['stock-1', 'stock-2'],
      excludedInstrumentIds: [],
      missingQualityEvaluationCount: 0,
      warnings: [],
      evaluationsByInstrumentId: {},
    }),
    ...overrides.dataQualityService,
  };
  const strategyFrameworkService = {
    getDefinition: jest.fn().mockReturnValue({ code: 'TREND_MOMENTUM', name: 'Trend Momentum', version: '1.0.0' }),
    persistBacktestPerformance: jest.fn().mockResolvedValue({
      id: 'summary-1',
      ratingScore: 20,
      ratingGrade: 'UNPROVEN',
      readinessLabel: 'RESEARCH_ONLY',
      ratingReasons: ['Too few trades.'],
    }),
    strategyToBacktestConfig: jest.fn(),
    ...overrides.strategyFrameworkService,
  };
  return {
    service: new BacktestingStrategyLabService(repository as any, marketDataService as any, watchlistService as any, { assertAllowed: jest.fn(), recordUsage: jest.fn() } as any, dataQualityService as any, new StrategyFrameworkRegistry(), strategyFrameworkService as any),
    repository,
    dataQualityService,
    strategyFrameworkService,
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

  it('applies transaction costs on entry and exit', async () => {
    const { service } = createService();

    const run = await service.run({ config: { ...config, universe: { type: 'SYMBOLS', symbols: ['AAA'] }, transactionCostPercent: 0.01 } });
    const trade = run.trades[0];
    const expectedExitCost = trade.quantity * trade.exitPrice * 0.01;

    expect(trade.netPnL).toBeCloseTo(trade.grossPnL - 1000 - expectedExitCost, 1);
  });

  it('worsens entry and exit prices with slippage', async () => {
    const { service } = createService();

    const run = await service.run({ config: { ...config, universe: { type: 'SYMBOLS', symbols: ['AAA'] }, transactionCostPercent: 0, slippagePercent: 0.01 } });
    const trade = run.trades[0];

    expect(trade.entryPrice).toBeGreaterThan(99);
    expect(trade.exitPrice).toBeLessThan(110);
    expect(trade.exitPrice).toBeCloseTo(107.91, 1);
  });

  it('records stop loss exits', async () => {
    const closes = [...Array.from({ length: 70 }, (_item, index) => 50 + index), 90, 88, 86];
    const { service } = createService({ marketDataService: { listPricesByInstrumentId: jest.fn(async () => ({ prices: makePatternPrices('AAA', closes) })) } });

    const run = await service.run({ config: { ...config, universe: { type: 'SYMBOLS', symbols: ['AAA'] }, exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 500 }, stopLossPercent: 0.05 } });

    expect(run.trades.some((trade) => trade.exitReason === 'STOP_LOSS')).toBe(true);
    expect(run.metrics?.exitDiagnostics?.stopLossExitCount).toBeGreaterThan(0);
  });

  it('records trailing stop exits', async () => {
    const closes = [...Array.from({ length: 80 }, (_item, index) => 50 + index), 120, 112, 108];
    const { service } = createService({ marketDataService: { listPricesByInstrumentId: jest.fn(async () => ({ prices: makePatternPrices('AAA', closes) })) } });

    const run = await service.run({ config: { ...config, universe: { type: 'SYMBOLS', symbols: ['AAA'] }, exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 500 }, trailingStopPercent: 0.08 } });

    expect(run.trades.some((trade) => trade.exitReason === 'TRAILING_STOP')).toBe(true);
  });

  it('records take profit and max holding period exits', async () => {
    const { service } = createService();

    const takeProfitRun = await service.run({ config: { ...config, universe: { type: 'SYMBOLS', symbols: ['AAA'] }, exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 500 }, takeProfitPercent: 0.05 } });
    const maxHoldRun = await service.run({ config: { ...config, universe: { type: 'SYMBOLS', symbols: ['AAA'] }, exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 500 }, maxHoldingDays: 5 } });

    expect(takeProfitRun.trades.some((trade) => trade.exitReason === 'TAKE_PROFIT')).toBe(true);
    expect(maxHoldRun.trades.some((trade) => trade.exitReason === 'MAX_HOLDING_PERIOD')).toBe(true);
  });

  it('counts end-of-test exits and returns benchmark gaps without failing', async () => {
    const { service } = createService({
      marketDataService: {
        listPricesByInstrumentId: jest.fn(async () => ({ prices: [] })),
      },
    });

    const run = await service.run({ config: { ...config, universe: { type: 'SYMBOLS', symbols: ['AAA'] } } });

    expect(run.status).toBe('COMPLETED');
    expect(run.metrics?.benchmarkComparison?.benchmarkDataStatus).toBe('UNAVAILABLE');
    expect(run.metrics?.benchmarkComparison?.dataGap).toContain('Benchmark unavailable');
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

  it('filters backtest universe by data quality when enabled and returns metadata', async () => {
    const { service, dataQualityService } = createService({
      dataQualityService: {
        filterEligibleInstruments: jest.fn().mockResolvedValue({
          eligibleInstrumentIds: ['stock-1'],
          excludedInstrumentIds: ['stock-2'],
          missingQualityEvaluationCount: 0,
          warnings: [],
          evaluationsByInstrumentId: {},
        }),
      },
    });

    const run = await service.run({ config: { ...config, useDataQualityFilter: true, minSignalReadinessScore: 70 } });

    expect(dataQualityService.filterEligibleInstruments).toHaveBeenCalled();
    expect(run.metrics?.dataQualityMetadata).toMatchObject({
      universeBeforeDataQualityFilter: 2,
      universeAfterDataQualityFilter: 1,
      excludedForDataQuality: 1,
    });
  });

  it('resolves symbol universes with region and asset type and prefers exact source/provider matches', async () => {
    const listInstruments = jest.fn().mockResolvedValue({
      instruments: [
        { id: 'stock-1', symbol: 'RCOM.NS', sourceSymbol: 'RCOM', providerSymbol: 'RCOM.NS' },
        { id: 'stock-2', symbol: 'RELIANCE.NS', sourceSymbol: 'RELIANCE', providerSymbol: 'RELIANCE.NS' },
      ],
    });
    const listPricesByInstrumentId = jest.fn(async (instrumentId: string) => ({ prices: makePrices(instrumentId === 'stock-2' ? 'RELIANCE.NS' : 'RCOM.NS') }));
    const { service } = createService({ marketDataService: { listInstruments, listPricesByInstrumentId } });

    const run = await service.run({
      config: {
        ...config,
        region: 'IN',
        assetType: 'STOCK',
        universe: { type: 'SYMBOLS', symbols: ['RELIANCE'] },
      },
    });

    expect(listInstruments).toHaveBeenCalledWith(expect.objectContaining({ search: 'RELIANCE', region: 'IN', assetType: 'STOCK' }));
    expect(listPricesByInstrumentId).toHaveBeenCalledWith('stock-2', 5000, expect.any(Date), expect.any(Date));
    expect(run.trades.every((trade) => trade.instrumentId === 'stock-2')).toBe(true);
  });

  it('applies default market scope to custom ALL universe resolution and exposes bounded-universe metadata', async () => {
    const listInstruments = jest.fn().mockResolvedValue({
      instruments: [{ id: 'stock-1', symbol: 'AAA' }],
      pagination: { total: 250 },
    });
    const { service } = createService({ marketDataService: { listInstruments } });

    const run = await service.run({ config: { ...config, universe: { type: 'ALL' } } });

    expect(listInstruments).toHaveBeenCalledWith(expect.objectContaining({ region: 'IN', assetType: 'STOCK', pageSize: 50 }));
    expect(run.config.region).toBe('IN');
    expect(run.config.assetType).toBe('STOCK');
    expect(run.metrics?.dataCoverage?.universeCapped).toBe(true);
    expect(run.metrics?.dataCoverage?.universeTotalAvailable).toBe(250);
    expect(run.metrics?.dataCoverage?.warnings.join(' ')).toContain('Universe ALL was capped');
  });

  it('filters saved runs by explicit region and asset type scope', async () => {
    const scopedRun = {
      id: 'run-in',
      strategyId: null,
      config: { ...config, region: 'IN', assetType: 'STOCK' },
      status: 'COMPLETED',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      metrics: null,
      equityCurve: [],
      trades: [],
      error: null,
    };
    const legacyUnknownRun = {
      ...scopedRun,
      id: 'run-legacy',
      config,
      trades: [{ symbol: 'ABN.AS' }],
    };
    const usRun = {
      ...scopedRun,
      id: 'run-us',
      config: { ...config, region: 'US', assetType: 'STOCK' },
    };
    const { service } = createService({
      repository: {
        listRuns: jest.fn().mockResolvedValue([legacyUnknownRun, usRun, scopedRun]),
      },
    });

    const runs = await service.listRuns('default-user', { region: 'IN', assetType: 'STOCK', limit: 100, offset: 0 });

    expect(runs.map((run) => run.id)).toEqual(['run-in']);
  });

  it('runs registered strategy configs and syncs Strategy Framework performance', async () => {
    const { service, repository, strategyFrameworkService } = createService();

    const run = await service.run({
      config: {
        ...config,
        mode: 'REGISTERED_STRATEGY',
        strategyCode: 'TREND_MOMENTUM',
        strategyVersion: '1.0.0',
        timeframe: '1Y',
        region: 'IN',
        assetType: 'STOCK',
        useDataQualityFilter: true,
      },
    });

    expect(run.status).toBe('COMPLETED');
    expect(strategyFrameworkService.persistBacktestPerformance).toHaveBeenCalledWith(expect.objectContaining({
      strategyCode: 'TREND_MOMENTUM',
      timeframe: '1Y',
      universeKey: 'SYMBOLS:AAA,BBB',
    }));
    expect(repository.updateRunMetrics).toHaveBeenCalled();
  });

  it('rejects non-entry Strategy Framework definitions as registered backtests', async () => {
    const { service, repository, strategyFrameworkService } = createService();

    await expect(service.run({
      config: {
        ...config,
        mode: 'REGISTERED_STRATEGY',
        strategyCode: 'RISK_OFF_AVOIDANCE',
        timeframe: '1Y',
      },
    })).rejects.toThrow('Registered backtests currently support active ENTRY strategies only');

    expect(repository.createRun).not.toHaveBeenCalled();
    expect(strategyFrameworkService.persistBacktestPerformance).not.toHaveBeenCalled();
  });

  it('rejects draft Strategy Framework definitions as registered backtests', async () => {
    const { service } = createService();

    await expect(service.run({
      config: {
        ...config,
        mode: 'REGISTERED_STRATEGY',
        strategyCode: 'QUALITY_TREND',
        timeframe: '1Y',
      },
    })).rejects.toThrow('is not active');
  });

  it('returns insufficient history honestly for registered timeframes', async () => {
    const { service } = createService({
      marketDataService: {
        listPricesByInstrumentId: jest.fn(async () => ({ prices: makePrices('AAA', '2024-01-01', 20, 1) })),
      },
    });

    const run = await service.run({
      config: {
        ...config,
        mode: 'REGISTERED_STRATEGY',
        strategyCode: 'TREND_MOMENTUM',
        timeframe: '1Y',
        useDataQualityFilter: true,
      },
    });

    expect(run.metrics?.availabilityStatus).toBe('INSUFFICIENT_HISTORY');
    expect(run.metrics?.dataCoverage?.insufficientHistoryCount).toBeGreaterThan(0);
  });
});
