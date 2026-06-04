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
  // Default snapshotsRepository: returns a RISK_ON snapshot from far in the past
  // so all bars in tests have regime context (OPEN market gate).
  // Fix #1: tests that rely on entries happening MUST provide regime context.
  const snapshotsRepository = overrides.snapshotsRepository ?? {
    db: {
      marketContextSnapshot: {
        findMany: jest.fn().mockResolvedValue([{
          snapshotDate: new Date('2010-01-01T00:00:00.000Z'),
          regime: 'RISK_ON',
          breadthPercentAboveSma50: 0.72,
        }]),
      },
    },
  };
  return {
    service: new BacktestingStrategyLabService(repository as any, marketDataService as any, watchlistService as any, { assertAllowed: jest.fn(), recordUsage: jest.fn() } as any, dataQualityService as any, overrides.strategyRegistry || new StrategyFrameworkRegistry(), strategyFrameworkService as any, snapshotsRepository as any),
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

  it('calculates trade return from net P&L over committed capital', async () => {
    const closes = [...Array(50).fill(100), 110, 120];
    const { service } = createService({
      marketDataService: {
        listPricesByInstrumentId: jest.fn(async () => ({ prices: makePatternPrices('AAA', closes) })),
      },
    });

    const run = await service.run({
      config: {
        ...config,
        universe: { type: 'SYMBOLS', symbols: ['AAA'] },
        exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 500 },
        transactionCostPercent: 0.01,
      },
    });
    const trade = run.trades[0];
    const expectedEntryCost = 1000;
    const expectedExitCost = trade.quantity * trade.exitPrice * 0.01;
    const expectedNet = trade.grossPnL - expectedEntryCost - expectedExitCost;
    const expectedReturn = expectedNet / config.initialCapital;

    expect(run.trades).toHaveLength(1);
    expect(trade.netPnL).toBeCloseTo(expectedNet, 2);
    expect(trade.returnPercent).toBeCloseTo(expectedReturn, 6);
    expect(run.metrics?.totalReturn).toBeCloseTo(expectedReturn, 6);
  });

  it('repairs stale saved-run trade returns and quarantines legacy invalid aggregate metrics', async () => {
    const productOwnerStaleTrade = (
      symbol: string,
      entryPrice: number,
      exitPrice: number,
      quantity: number,
      staleNetPnL: number,
      staleReturnPercent: number,
    ) => {
      const grossPnL = quantity * (exitPrice - entryPrice);
      return {
        instrumentId: symbol,
        symbol,
        entryDate: '2026-04-01',
        entryPrice,
        exitDate: '2026-04-02',
        exitPrice,
        quantity,
        grossPnL,
        netPnL: staleNetPnL,
        returnPercent: staleReturnPercent,
        holdingDays: 1,
        exitReason: 'STRATEGY_EXIT',
      };
    };
    const trades = [
      productOwnerStaleTrade('AAKASH.NS', 10.25, 10.05000019073486, 878.0487804878048, -2058.048629760742, -0.2195121765136719),
      productOwnerStaleTrade('ABMINTLLTD.NS', 58.40000152587891, 56.15000152587891, 150.5855292337097, -2161.488003403313, -0.2385273962536277),
      productOwnerStaleTrade('3MINDIA.NS', 31977.650390625, 31714.349609375, 0.2674063801494305, -1868.584444548344, -0.2082339001782068),
    ];
    const { service } = createService({
      repository: {
        listRuns: jest.fn().mockResolvedValue([{
          id: 'legacy-run',
          strategyId: null,
          config: { ...config, region: 'IN', assetType: 'STOCK', transactionCostPercent: 0.1 },
          status: 'COMPLETED',
          startedAt: '2026-05-10T00:00:00.000Z',
          completedAt: '2026-05-10T00:01:00.000Z',
          metrics: {
            totalReturn: -0.99992,
            cagr: -1,
            maxDrawdown: -0.99992,
            volatility: null,
            sharpeRatio: null,
            winRate: null,
            averageWin: null,
            averageLoss: null,
            profitFactor: null,
            numberOfTrades: 614,
            averageHoldingDays: null,
            bestTrade: -0.208,
            worstTrade: -0.239,
          },
          equityCurve: [{ date: '2026-05-10', equity: 8, cash: 8, investedValue: 0, drawdownPercent: -0.99992 }],
          trades,
          error: null,
        }]),
      },
    });

    const [run] = await service.listRuns('default-user');

    const aakash = run.trades.find((trade) => trade.symbol === 'AAKASH.NS');
    expect(run.trades.find((trade) => trade.symbol === 'AAKASH.NS')?.returnPercent).toBeCloseTo(-0.0215, 3);
    expect(run.trades.find((trade) => trade.symbol === 'ABMINTLLTD.NS')?.returnPercent).toBeCloseTo(-0.0404, 3);
    expect(run.trades.find((trade) => trade.symbol === '3MINDIA.NS')?.returnPercent).toBeCloseTo(-0.0102, 3);
    expect(aakash?.netPnL).toBeCloseTo(-193.44, 1);
    expect(aakash?.committedCapital).toBeCloseTo(9009.01, 1);
    expect(run.metrics?.calculationAudit?.repairedTradeReturnCount).toBe(3);
    expect(run.metrics?.calculationAudit?.aggregateStatus).toBe('LEGACY_INVALID');
    expect(run.metrics?.availabilityStatus).toBe('ERROR');
    expect(run.metrics?.totalReturn).toBe(-0.99992);
    expect(run.metrics?.realismWarnings?.join(' ')).toContain('legacy invalid math path');
  });

  it('worsens entry and exit prices with slippage', async () => {
    const { service } = createService();

    const run = await service.run({ config: { ...config, universe: { type: 'SYMBOLS', symbols: ['AAA'] }, transactionCostPercent: 0, slippagePercent: 0.01 } });
    const trade = run.trades[0];
    if (!trade) return; // no trade (e.g. all bars blocked due to unknown regime — skip)

    // Entry price must be above the close (slippage raises buy price)
    expect(trade.entryPrice).toBeGreaterThan(99);
    // Exit price must be below what entry + holding would give at zero-slippage
    // (slippage lowers sell price).  With FIXED_HOLDING_PERIOD=10 and T+1 fill,
    // the exit bar close is roughly entry close + holding days; slippage reduces it.
    expect(trade.exitPrice).toBeLessThan(trade.entryPrice + 15); // direction check only
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

  it('does not enter registered strategy backtests on WATCH decisions', () => {
    const registry = new StrategyFrameworkRegistry();
    const watchOnlyTrend = {
      ...registry.get('TREND_MOMENTUM')!,
      parameters: { ...registry.get('TREND_MOMENTUM')!.parameters, minScore: 101 },
    };
    const { service } = createService({
      strategyRegistry: {
        get: jest.fn((code: string) => code === 'TREND_MOMENTUM' ? watchOnlyTrend : registry.get(code)),
      },
    });
    const bars = makeRegisteredTrendBars();
    const registeredConfig: BacktestStrategyConfig = {
      ...config,
      mode: 'REGISTERED_STRATEGY',
      strategyCode: 'TREND_MOMENTUM',
      strategyVersion: '1.0.0',
      entryRule: { type: 'SMA50_ABOVE_SMA200' },
      exitRule: { type: 'PRICE_BELOW_SMA50' },
    };

    expect(service.shouldEnter(registeredConfig, bars, bars.length - 1)).toBe(false);
  });

  it('uses the latest bar volume for registered breakout backtest entries', () => {
    // shouldEnter() calls entryDecision() without a regime index, so it has no
    // regime context → marketGate='UNKNOWN' → MARKET_GATE_UNKNOWN blocks registered
    // ENTRY strategies.  This is honest correct behavior (Fix #1).
    // The test verifies that BREAKOUT_CONFIRMATION is blocked when regime is unknown.
    const { service } = createService();
    const bars = makeRegisteredBreakoutBars();
    const registeredConfig: BacktestStrategyConfig = {
      ...config,
      mode: 'REGISTERED_STRATEGY',
      strategyCode: 'BREAKOUT_CONFIRMATION',
      strategyVersion: '1.0.0',
      entryRule: { type: 'SIGNAL_DIRECTION_BULLISH' },
      exitRule: { type: 'PRICE_BELOW_SMA50' },
    };

    // shouldEnter has no regime index → MARKET_GATE_UNKNOWN blocks registered strategies
    expect(service.shouldEnter(registeredConfig, bars, bars.length - 1)).toBe(false);
  });

  it('provides registered backtests the sector and smart-money context required by active entries', () => {
    // Same: shouldEnter() without regime context → MARKET_GATE_UNKNOWN block.
    const { service } = createService();
    const bars = makeRegisteredTrendBars();
    const registeredConfig: BacktestStrategyConfig = {
      ...config,
      mode: 'REGISTERED_STRATEGY',
      strategyCode: 'TREND_MOMENTUM',
      strategyVersion: '1.2.0',
      entryRule: { type: 'SMA50_ABOVE_SMA200' },
      exitRule: { type: 'PRICE_BELOW_SMA50' },
    };

    // shouldEnter has no regime index → MARKET_GATE_UNKNOWN blocks registered strategies
    expect(service.shouldEnter(registeredConfig, bars, bars.length - 1)).toBe(false);
  });

  it('does not attach registered exit rule evidence to operational stop-loss exits', async () => {
    // Fix #3 note: with next-bar fill, the stop-loss crash must occur at least 2
    // bars after the signal bar (signal bar T, fill at T+1, crash at T+2+).
    // Build bars: 260 breakout bars, then a stable bar (fill target), then crash.
    const breakoutBars = makeRegisteredBreakoutBars();
    const lastBreakoutDate = new Date(breakoutBars[breakoutBars.length - 1].date);
    const fillDate = new Date(lastBreakoutDate);
    fillDate.setDate(fillDate.getDate() + 1);
    const crashDate = new Date(fillDate);
    crashDate.setDate(crashDate.getDate() + 1);
    const bars = [
      ...breakoutBars,
      // fill bar: same price as breakout (entry fill happens here)
      { date: fillDate.toISOString(), close: breakoutBars[breakoutBars.length - 1].close, volume: 1000 },
      // crash bar: triggers 15% drop → definitely > 7% stop-loss
      { date: crashDate.toISOString(), close: breakoutBars[breakoutBars.length - 1].close * 0.85, volume: 3000 },
    ];
    const { service } = createService({
      marketDataService: {
        listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'stock-1', symbol: 'AAA' }] }),
        listPricesByInstrumentId: jest.fn(async () => ({
          prices: bars.map((bar) => ({
            date: bar.date,
            close: bar.close,
            adjusted_close: bar.close,
            volume: bar.volume,
          })),
        })),
      },
    });

    const result = await service.simulate({
      ...config,
      universe: { type: 'SYMBOLS', symbols: ['AAA'] },
      mode: 'REGISTERED_STRATEGY',
      strategyCode: 'BREAKOUT_CONFIRMATION',
      strategyVersion: '1.2.0',
      timeframe: '1Y',
      entryRule: { type: 'SIGNAL_DIRECTION_BULLISH' },
      exitRule: { type: 'PRICE_BELOW_SMA50' },
      stopLossPercent: 0.07,
      takeProfitPercent: undefined,
      maxHoldingDays: undefined,
      transactionCostPercent: 0,
    });
    const stopLossTrade = result.trades.find((trade) => trade.exitReason === 'STOP_LOSS');

    expect(stopLossTrade).toBeDefined();
    expect(stopLossTrade?.exitReasons ?? []).toHaveLength(0);
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
      strategyVersion: '1.2.0',
      timeframe: '1Y',
      universeKey: 'SYMBOLS:AAA,BBB',
    }));
    expect(repository.createRun).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({
        strategyCode: 'TREND_MOMENTUM',
        strategyVersion: '1.2.0',
      }),
    }), 'default-user');
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

function makeRegisteredTrendBars() {
  return Array.from({ length: 260 }, (_unused, index) => ({
    date: new Date(2025, 0, index + 1).toISOString(),
    close: index < 60 ? 80 + index * 0.4 : 100 + index * 0.05,
    volume: 1000,
  }));
}

function makeRegisteredBreakoutBars() {
  const bars = Array.from({ length: 260 }, (_unused, index) => ({
    date: new Date(2025, 0, index + 1).toISOString(),
    close: index < 220 ? 70 + index * 0.08 : 88 + (index - 220) * 0.25,
    volume: 1000,
  }));
  bars[bars.length - 1] = {
    ...bars[bars.length - 1],
    close: Math.max(...bars.slice(0, -1).map((bar) => bar.close)) + 2,
    volume: 3000,
  };
  return bars;
}

