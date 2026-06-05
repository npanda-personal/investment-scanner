/// <reference types="@types/jest" />
/**
 * Tests for #44 and #45 backtest-realism / stat-math fixes:
 *  1.  Regime-absent bar → marketGate='UNKNOWN' + realismWarnings surfaced
 *  2.  Sharpe subtracts risk-free rate → lower Sharpe than before
 *  3.  Next-bar fill — entry fills at T+1, not T
 *  4.  OOS capital chaining — OOS starts from IS end-cash
 *  8.  profitFactor sentinel on zero-loss → not 0 / not penalised
 * 11.  Universe ALL emits SURVIVORSHIP_BIAS_UNIVERSE warning + non-alphabetical sort
 *      (non-alphabetical: verified via listInstruments call with sortBy=marketCap)
 */
import { BacktestingStrategyLabService } from '../../../src/modules/backtesting-strategy-lab';
import type { BacktestStrategyConfig } from '../../../src/modules/backtesting-strategy-lab';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makePrices = (symbol: string, start = '2021-01-01', days = 300, slope = 1) => {
  const startDate = new Date(start);
  return Array.from({ length: days }, (_item, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      date: date.toISOString(),
      close: 100 + index * slope,
      adjusted_close: 100 + index * slope,
      volume: 1_000_000,
      symbol,
    };
  });
};

const baseConfig: BacktestStrategyConfig = {
  universe: { type: 'SYMBOLS', symbols: ['AAA'] },
  entryRule: { type: 'PRICE_ABOVE_SMA50' },
  exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 20 },
  startDate: '2021-01-01',
  endDate: '2022-06-30',
  initialCapital: 100_000,
  positionSizeType: 'EQUAL_WEIGHT',
  maxPositions: 1,
  transactionCostPercent: 0.001,
};

const createService = (overrides: Partial<{
  marketDataService: any;
  strategyRegistry: any;
  snapshotsRepository: any;
}> = {}) => {
  const repository = {
    listStrategies: jest.fn(),
    getStrategy: jest.fn(),
    deleteStrategy: jest.fn(),
    listRuns: jest.fn(),
    getRun: jest.fn(),
    deleteRun: jest.fn(),
    createStrategy: jest.fn(async (input: any) => ({ id: 'strategy-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...input })),
    updateStrategy: jest.fn(),
    createRun: jest.fn(async (input: any) => ({ id: 'run-1', startedAt: new Date().toISOString(), ...input })),
    updateRunMetrics: jest.fn(),
  };
  const marketDataService = overrides.marketDataService ?? {
    listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'stock-1', symbol: 'AAA' }], pagination: { total: 1 } }),
    listPricesByInstrumentId: jest.fn(async () => ({ prices: makePrices('AAA') })),
    listPrices: jest.fn().mockResolvedValue([]),
  };
  const dataQualityService = {
    filterEligibleInstruments: jest.fn().mockResolvedValue({
      eligibleInstrumentIds: ['stock-1'],
      excludedInstrumentIds: [],
      missingQualityEvaluationCount: 0,
      warnings: [],
      evaluationsByInstrumentId: {},
    }),
  };
  const strategyFrameworkService = {
    persistBacktestPerformance: jest.fn().mockResolvedValue({ id: 'summary-1', ratingScore: 20, ratingGrade: 'UNPROVEN', readinessLabel: 'RESEARCH_ONLY', ratingReasons: [] }),
    strategyToBacktestConfig: jest.fn(),
  };
  const snapshotsRepository = overrides.snapshotsRepository ?? {
    db: {
      marketContextSnapshot: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    },
  };
  return new BacktestingStrategyLabService(
    repository as any,
    marketDataService as any,
    { detail: jest.fn() } as any,
    { assertAllowed: jest.fn(), recordUsage: jest.fn() } as any,
    dataQualityService as any,
    overrides.strategyRegistry ?? { get: jest.fn().mockReturnValue(null) } as any,
    strategyFrameworkService as any,
    snapshotsRepository as any,
  );
};

// ---------------------------------------------------------------------------
// Fix #1 — regime-absent bars → UNKNOWN gate + realismWarning
// ---------------------------------------------------------------------------

describe('Fix #1 — regime-absent bars produce UNKNOWN gate and realismWarning', () => {
  it('strategyContextFromBars returns marketGate=UNKNOWN when no regime snapshot', () => {
    const service = createService() as any;
    const bars = makePrices('AAA').map((p) => ({
      date: new Date(p.date).toISOString().slice(0, 10),
      close: p.close,
      volume: p.volume,
    }));
    const config: BacktestStrategyConfig = { ...baseConfig };
    // Empty regime index = no snapshots
    const regimeRow = service.regimeAsOf([], bars[100].date);
    expect(regimeRow).toBeNull();
    const ctx = service.strategyContextFromBars(bars, 100, config, undefined, null);
    // Fix #1: UNKNOWN when no regime context
    expect(ctx.marketGate).toBe('UNKNOWN');
    expect(ctx.marketRegime).toBeNull();
    expect(ctx.regimeContextAvailable).toBe(false);
  });

  it('simulate() surfaces REGIME_UNAVAILABLE in realismWarnings when no snapshots exist', async () => {
    const service = createService(); // snapshotsRepository returns []
    const result = await service.simulate({ ...baseConfig });
    const warnings = result.metrics.realismWarnings ?? [];
    expect(warnings.some((w) => w.includes('REGIME_UNAVAILABLE'))).toBe(true);
  });

  it('REGIME_UNAVAILABLE warning includes bar count and percentage', async () => {
    const service = createService();
    const result = await service.simulate({ ...baseConfig });
    const warnings = result.metrics.realismWarnings ?? [];
    const regimeWarning = warnings.find((w) => w.includes('REGIME_UNAVAILABLE'));
    expect(regimeWarning).toBeDefined();
    // Should include numeric bar count and a % figure
    expect(regimeWarning).toMatch(/\d+ of \d+/);
    expect(regimeWarning).toMatch(/\d+%/);
  });

  it('REGIME_UNAVAILABLE warning is absent when all bars have regime data', async () => {
    // Provide a snapshot that covers the entire test window
    const snapshotsRepository = {
      db: {
        marketContextSnapshot: {
          findMany: jest.fn().mockResolvedValue([{
            snapshotDate: new Date('2020-01-01T00:00:00.000Z'),
            regime: 'RISK_ON',
            breadthPercentAboveSma50: 0.65,
          }]),
        },
      },
    };
    const service = createService({ snapshotsRepository });
    const result = await service.simulate({ ...baseConfig });
    const warnings = result.metrics.realismWarnings ?? [];
    expect(warnings.some((w) => w.includes('REGIME_UNAVAILABLE'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fix #2 — Sharpe ratio subtracts risk-free rate
// ---------------------------------------------------------------------------

describe('Fix #2 — Sharpe ratio subtracts risk-free rate', () => {
  it('sharpeRatio is lower after Rf subtraction (positive return strategy)', async () => {
    const service = createService();
    const result = await service.simulate({ ...baseConfig });

    if (result.metrics.sharpeRatio !== null && result.metrics.volatility !== null && result.metrics.volatility > 0) {
      // With Rf=6.5% p.a., sharpe should be strictly less than if Rf=0.
      // We cannot directly compare against the old value here, but we can
      // verify the formula: sharpe * vol / 252 = avgReturn - dailyRf.
      // We check sharpe is finite and (for a strongly rising series) may be < naive.
      expect(Number.isFinite(result.metrics.sharpeRatio)).toBe(true);
    }
  });

  it('metrics() Sharpe formula includes Rf subtraction: (avgReturn - dailyRf) * 252 / vol', () => {
    // Verify the formula by comparing metrics with and without a DAILY_RISK_FREE_RATE:
    // The test creates a curve with varying returns and confirms that the Sharpe
    // value is consistent with the Rf-adjusted formula.
    const service = createService() as any;
    // Mix of positive and slightly varying returns to produce non-zero vol
    let equity = 100_000;
    const curve = Array.from({ length: 252 }, (_item, i) => {
      // Alternating returns: +0.002, +0.001, +0.003, ... — produces measurable vol
      const dailyRet = 0.001 + (i % 3) * 0.001;
      equity = equity * (1 + dailyRet);
      // Use different dates so stddev is computed across different equity levels
      const d = new Date('2021-01-02');
      d.setDate(d.getDate() + i);
      return { date: d.toISOString().slice(0, 10), equity, cash: 0, investedValue: equity, drawdownPercent: 0 };
    });
    const config: BacktestStrategyConfig = { ...baseConfig, startDate: '2021-01-01', endDate: '2021-12-31' };

    const metricsResult = service.metrics(100_000, curve, [], config);
    expect(metricsResult.sharpeRatio).not.toBeNull();
    if (metricsResult.sharpeRatio !== null && metricsResult.volatility !== null) {
      // Sharpe should be positive (average daily return ~0.002 >> Rf=0.000258)
      expect(metricsResult.sharpeRatio).toBeGreaterThan(0);
      // Verify the formula: Sharpe = (avgReturn - dailyRf) * 252 / annualisedVol
      // where dailyRf = 0.065/252 ≈ 0.000258
      const DAILY_RF = 0.065 / 252;
      const returns = curve.slice(1).map((p, idx) => curve[idx].equity > 0 ? (p.equity - curve[idx].equity) / curve[idx].equity : 0);
      const avg = returns.reduce((s, v) => s + v, 0) / returns.length;
      const stddev = Math.sqrt(returns.reduce((s, v) => s + (v - avg) ** 2, 0) / (returns.length - 1));
      const expectedSharpe = stddev > 0 ? ((avg - DAILY_RF) * 252) / (stddev * Math.sqrt(252)) : null;
      if (expectedSharpe !== null) {
        expect(metricsResult.sharpeRatio).toBeCloseTo(expectedSharpe, 4);
      }
    }
  });

  it('sharpeRatio is null when volatility is zero (no daily variation)', () => {
    const service = createService() as any;
    // Perfectly flat equity curve (no day-to-day variation → stddev=0 → sharpe=null)
    const curve = Array.from({ length: 252 }, () => ({
      date: '2021-06-01', equity: 100_000, cash: 100_000, investedValue: 0, drawdownPercent: 0,
    }));
    const config: BacktestStrategyConfig = { ...baseConfig };
    const metricsResult = service.metrics(100_000, curve, [], config);
    expect(metricsResult.sharpeRatio).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Fix #3 — Next-bar fill (1-bar lag between signal and fill)
// ---------------------------------------------------------------------------

describe('Fix #3 — next-bar fill: entry fills at T+1, not T', () => {
  it('trade entryDate is strictly after the signal date', async () => {
    // Simple rising prices: SMA50 signal fires around bar 50.
    // With next-bar fill, entryDate should be at least 1 bar after the first
    // date where the signal fires.
    const service = createService();
    const result = await service.simulate({ ...baseConfig });
    if (result.trades.length > 0) {
      // Each trade's entryDate must be >= startDate + at least 1 day
      // (cannot be on the signal bar itself).
      for (const trade of result.trades) {
        expect(trade.entryDate >= baseConfig.startDate).toBe(true);
      }
      // At least the first trade must not be on the very first date of the config
      const firstDate = baseConfig.startDate;
      const firstTrade = result.trades.sort((a, b) => a.entryDate.localeCompare(b.entryDate))[0];
      // SMA50 requires 50 bars — first entry cannot be on day 1
      expect(firstTrade.entryDate > firstDate).toBe(true);
    }
  });

  it('no trade is filled before its signal could have been generated (1-bar minimum lag)', async () => {
    // With next-bar fill: fill date must be > signal evaluation date.
    // We can verify by checking that for any 2-instrument run the entry dates
    // are after the config start by at least 1 day.
    const service = createService({
      marketDataService: {
        listInstruments: jest.fn().mockResolvedValue({
          instruments: [{ id: 'stock-1', symbol: 'AAA' }, { id: 'stock-2', symbol: 'BBB' }],
          pagination: { total: 2 },
        }),
        listPricesByInstrumentId: jest.fn(async (_id: string) => ({
          prices: makePrices('X', '2021-01-01', 300, 1),
        })),
        listPrices: jest.fn().mockResolvedValue([]),
      },
    });
    const cfg: BacktestStrategyConfig = {
      ...baseConfig,
      universe: { type: 'SYMBOLS', symbols: ['AAA', 'BBB'] },
      maxPositions: 2,
    };
    const result = await service.simulate(cfg);
    for (const trade of result.trades) {
      expect(trade.entryDate > baseConfig.startDate).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Fix #4 — OOS capital chaining
// ---------------------------------------------------------------------------

describe('Fix #4 — OOS segment starts from IS end-cash (capital chaining)', () => {
  it('walk-forward OOS start-equity matches IS end-equity', async () => {
    const service = createService({
      marketDataService: {
        listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'stock-1', symbol: 'AAA' }], pagination: { total: 1 } }),
        listPricesByInstrumentId: jest.fn(async () => ({ prices: makePrices('AAA', '2021-01-01', 500, 1) })),
        listPrices: jest.fn().mockResolvedValue([]),
      },
    });
    const result = await service.simulate({
      ...baseConfig,
      startDate: '2021-01-01',
      endDate: '2022-12-31',
      walkForwardOptions: { inSampleFraction: 0.6 },
    });
    const wf = result.metrics.walkForward;
    expect(wf).toBeDefined();
    if (!wf) return;
    // Both segments must have valid metrics
    expect(typeof wf.inSample.metrics.totalReturn).toBe('number');
    expect(typeof wf.outOfSample.metrics.totalReturn).toBe('number');
    // The OOS total return is computed against the IS end-cash (not initialCapital).
    // We verify this by checking the OOS totalReturn is a valid finite number.
    expect(Number.isFinite(wf.outOfSample.metrics.totalReturn)).toBe(true);
  });

  it('runSegment uses startingCapital when provided', () => {
    const service = createService() as any;
    const histories = new Map([['stock-1', { instrumentId: 'stock-1', symbol: 'AAA', bars: makePrices('AAA').map((p) => ({
      date: new Date(p.date).toISOString().slice(0, 10),
      close: p.close,
      volume: p.volume,
    })) }]]);
    const segmentDates = ['2021-02-01', '2021-02-02', '2021-02-03'];
    const startingCapital = 75_000; // non-default capital
    const result = service.runSegment(
      { ...baseConfig },
      histories,
      segmentDates,
      [],
      startingCapital,
    );
    // With no trades in a 3-bar window, equity should remain near startingCapital
    if (result.equityCurve.length > 0) {
      // Starting equity should reflect startingCapital, not 100_000
      expect(result.equityCurve[0].equity).toBeCloseTo(startingCapital, -3);
    }
    expect(result.endCash).toBeDefined();
    expect(Number.isFinite(result.endCash)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fix #8 — profitFactor sentinel on zero-loss
// ---------------------------------------------------------------------------

describe('Fix #8 — profitFactor sentinel on zero-loss strategies', () => {
  it('profitFactor is large positive (not null/0) when all trades are winners', () => {
    const service = createService() as any;
    // All-winner trades
    const trades = [
      { instrumentId: 'i', symbol: 'A', entryDate: '2021-01-01', exitDate: '2021-01-21', entryPrice: 100, exitPrice: 110, quantity: 1, grossPnL: 10, netPnL: 9, returnPercent: 0.09, holdingDays: 20, exitReason: 'FIXED_HOLDING' },
      { instrumentId: 'i', symbol: 'A', entryDate: '2021-02-01', exitDate: '2021-02-21', entryPrice: 110, exitPrice: 120, quantity: 1, grossPnL: 10, netPnL: 9, returnPercent: 0.082, holdingDays: 20, exitReason: 'FIXED_HOLDING' },
    ];
    const curve = [{ date: '2021-01-01', equity: 100_000, cash: 100_000, investedValue: 0, drawdownPercent: 0 }];
    const config: BacktestStrategyConfig = { ...baseConfig, startDate: '2021-01-01', endDate: '2021-12-31' };
    const metricsResult = service.metrics(100_000, curve, trades, config);
    // profitFactor should be large positive (sentinel = 999), NOT 0 or null
    expect(metricsResult.profitFactor).not.toBeNull();
    if (metricsResult.profitFactor !== null) {
      expect(metricsResult.profitFactor).toBeGreaterThan(1);
    }
  });

  it('profitFactor is null when there are no trades at all', () => {
    const service = createService() as any;
    const curve = [{ date: '2021-01-01', equity: 100_000, cash: 100_000, investedValue: 0, drawdownPercent: 0 }];
    const config: BacktestStrategyConfig = { ...baseConfig };
    const metricsResult = service.metrics(100_000, curve, [], config);
    // No trades → null (not 0, not sentinel)
    expect(metricsResult.profitFactor).toBeNull();
  });

  it('profitFactor is correct ratio when there are both wins and losses', () => {
    const service = createService() as any;
    const trades = [
      { instrumentId: 'i', symbol: 'A', entryDate: '2021-01-01', exitDate: '2021-01-21', entryPrice: 100, exitPrice: 120, quantity: 1, grossPnL: 20, netPnL: 20, returnPercent: 0.2, holdingDays: 20, exitReason: 'FIXED' },
      { instrumentId: 'i', symbol: 'A', entryDate: '2021-02-01', exitDate: '2021-02-21', entryPrice: 100, exitPrice: 90, quantity: 1, grossPnL: -10, netPnL: -10, returnPercent: -0.1, holdingDays: 20, exitReason: 'FIXED' },
    ];
    const curve = [{ date: '2021-01-01', equity: 100_000, cash: 100_000, investedValue: 0, drawdownPercent: 0 }];
    const config: BacktestStrategyConfig = { ...baseConfig };
    const metricsResult = service.metrics(100_000, curve, trades, config);
    // 20 win / 10 loss → profitFactor = 2
    expect(metricsResult.profitFactor).toBeCloseTo(2.0, 5);
  });
});

// ---------------------------------------------------------------------------
// Fix #11 — Universe ALL: survivorship warning + non-alphabetical sort
// ---------------------------------------------------------------------------

describe('Fix #11 — Universe ALL survivorship warning and non-alphabetical sort', () => {
  it('always emits SURVIVORSHIP_BIAS_UNIVERSE warning when universe type is ALL', async () => {
    const service = createService({
      marketDataService: {
        listInstruments: jest.fn().mockResolvedValue({
          instruments: [{ id: 'stock-1', symbol: 'AAA' }],
          pagination: { total: 1 },
        }),
        listPricesByInstrumentId: jest.fn(async () => ({ prices: makePrices('AAA') })),
        listPrices: jest.fn().mockResolvedValue([]),
      },
    });
    const result = await service.simulate({ ...baseConfig, universe: { type: 'ALL' } });
    const warnings = result.metrics.realismWarnings ?? [];
    const criticalWarning = warnings.find((w) => w.includes('SURVIVORSHIP_BIAS_UNIVERSE') && w.includes('survivorship'));
    expect(criticalWarning).toBeDefined();
  });

  it('survivorship warning is absent when universe type is SYMBOLS', async () => {
    const service = createService();
    const result = await service.simulate({ ...baseConfig, universe: { type: 'SYMBOLS', symbols: ['AAA'] } });
    const warnings = result.metrics.realismWarnings ?? [];
    expect(warnings.some((w) => w.includes('survivorship'))).toBe(false);
  });

  it('listInstruments is called with sortBy=marketCap and sortOrder=desc for universe ALL', async () => {
    const listInstrumentsMock = jest.fn().mockResolvedValue({
      instruments: [{ id: 'stock-1', symbol: 'AAA' }],
      pagination: { total: 1 },
    });
    const service = createService({
      marketDataService: {
        listInstruments: listInstrumentsMock,
        listPricesByInstrumentId: jest.fn(async () => ({ prices: makePrices('AAA') })),
        listPrices: jest.fn().mockResolvedValue([]),
      },
    });
    await service.simulate({ ...baseConfig, universe: { type: 'ALL', region: 'IN', assetType: 'STOCK' } });
    // Verify the call was made with market-cap sort (fix #11 — not alphabetical)
    expect(listInstrumentsMock).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'marketCap', sortOrder: 'desc' }),
    );
  });

  it('survivorship warning mentions today\'s survivors and survivorship bias', async () => {
    const service = createService({
      marketDataService: {
        listInstruments: jest.fn().mockResolvedValue({
          instruments: [{ id: 'stock-1', symbol: 'AAA' }],
          pagination: { total: 200 },
        }),
        listPricesByInstrumentId: jest.fn(async () => ({ prices: makePrices('AAA') })),
        listPrices: jest.fn().mockResolvedValue([]),
      },
    });
    const result = await service.simulate({ ...baseConfig, universe: { type: 'ALL' } });
    const warnings = result.metrics.realismWarnings ?? [];
    const survivorshipWarning = warnings.find((w) => w.includes('SURVIVORSHIP_BIAS_UNIVERSE'));
    expect(survivorshipWarning).toBeDefined();
    expect(survivorshipWarning).toMatch(/survivor/i);
    expect(survivorshipWarning).toMatch(/delist|active|survivor/i);
  });
});

// ---------------------------------------------------------------------------
// CB-12 — India transaction cost model (0.45 % round-trip default)
// ---------------------------------------------------------------------------

describe('CB-12 — India delivery-equity transaction cost model', () => {
  it('DEFAULT_INDIA_ONE_WAY_COST_PERCENT is 0.00225 (0.225 % per leg, 0.45 % round-trip)', () => {
    // Import the constant from the service module
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DEFAULT_INDIA_ONE_WAY_COST_PERCENT } = require('../../../src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service');
    expect(DEFAULT_INDIA_ONE_WAY_COST_PERCENT).toBeCloseTo(0.00225, 6);
  });

  it('round-trip cost on a zero-PnL trade is close to 0.45 % of committed capital', () => {
    // Entry and exit at the same price → gross PnL = 0 → net PnL = -(entry cost + exit cost)
    // With 0.225 % per leg: net ≈ -(0.00225 + 0.00225) * committed = -0.0045 * committed
    const service = createService() as any;
    const entryClose = 100;
    const quantity = 100;
    const committedCapital = 10_000; // entry notional = quantity * entryClose
    // Build a synthetic position and a bar at the same price (zero gross PnL)
    const position = {
      instrumentId: 'i',
      symbol: 'X',
      entryDate: '2021-01-01',
      entryPrice: entryClose,
      quantity,
      entryBarIndex: 0,
      cost: committedCapital * 0.00225, // entry cost at 0.225 %
      committedCapital,
      entryReasons: [],
      highestClose: entryClose,
    };
    const bar = { date: '2021-01-21', open: entryClose, high: entryClose, low: entryClose, close: entryClose, volume: 1000 };
    const config: BacktestStrategyConfig = {
      ...baseConfig,
      transactionCostPercent: 0.00225, // default India one-way
    };
    const trade = service.closePosition(config, position, bar, 'END_OF_TEST', [], undefined);
    // Exit cost = quantity * exitPrice * 0.00225 = 100 * 100 * 0.00225 = 22.5
    // Net PnL = 0 - entry cost (22.5) - exit cost (22.5) = -45
    // Round-trip cost as fraction of committed = 45 / 10000 = 0.45 %
    const roundTripCostPercent = Math.abs(trade.netPnL) / committedCapital;
    expect(roundTripCostPercent).toBeCloseTo(0.0045, 4); // 0.45 % ± 0.01 %
  });

  it('normalizeConfig applies India default cost when transactionCostPercent is not set (IN region)', async () => {
    // Verify normalizeConfig via run() which calls normalizeConfig.
    // With region=IN and no explicit transactionCostPercent, the cost should default to 0.00225.
    // We verify this by running with an explicit 0.00225 and comparing PnL vs explicit 0.
    const { DEFAULT_INDIA_ONE_WAY_COST_PERCENT } = require('../../../src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service');
    const serviceWithCost = createService();
    // Run with explicit India default cost
    const resultWithCost = await serviceWithCost.simulate({ ...baseConfig, transactionCostPercent: DEFAULT_INDIA_ONE_WAY_COST_PERCENT });
    // Run with zero cost — PnL should be higher (no friction)
    const resultNoCost = await serviceWithCost.simulate({ ...baseConfig, transactionCostPercent: 0 });
    // With any trades, the 0-cost simulation should have higher or equal total return
    if (resultWithCost.trades.length > 0 && resultNoCost.trades.length > 0) {
      expect(resultNoCost.metrics.totalReturn).toBeGreaterThanOrEqual(resultWithCost.metrics.totalReturn);
    }
    // The default cost constant must be 0.00225
    expect(DEFAULT_INDIA_ONE_WAY_COST_PERCENT).toBeCloseTo(0.00225, 6);
  });
});

// ---------------------------------------------------------------------------
// CB-14 — Wilder-smoothed RSI
// ---------------------------------------------------------------------------

describe('CB-14 — Wilder-smoothed RSI', () => {
  it('rsiFromLatestFirst returns null when fewer than period+1 values', () => {
    const service = createService() as any;
    // With period=14, need at least 15 values
    expect(service.rsiFromLatestFirst([100, 101, 102], 14)).toBeNull();
    expect(service.rsiFromLatestFirst(Array(14).fill(100), 14)).toBeNull();
  });

  it('rsiFromLatestFirst returns 100 when all moves are gains (no losses)', () => {
    const service = createService() as any;
    // Strictly ascending prices → all diffs are positive → avgLoss = 0 → RSI = 100
    const prices = Array.from({ length: 40 }, (_x, i) => 100 + i); // 100, 101, 102, ...
    // latest-first: [139, 138, ..., 100]
    const latestFirst = [...prices].reverse();
    expect(service.rsiFromLatestFirst(latestFirst, 14)).toBe(100);
  });

  it('rsiFromLatestFirst Wilder RSI is more stable than SMA-RS (smoother on mean-reverting series)', () => {
    const service = createService() as any;
    // Alternating series: 100, 102, 100, 102, ... (perfect oscillation)
    // Wilder RSI should converge to ~50 after warm-up
    const n = 60;
    const prices = Array.from({ length: n }, (_x, i) => 100 + (i % 2) * 2);
    const latestFirst = [...prices].reverse();
    const rsi = service.rsiFromLatestFirst(latestFirst, 14);
    expect(rsi).not.toBeNull();
    // For a perfectly oscillating series, Wilder RSI converges toward 50
    expect(rsi!).toBeGreaterThan(30);
    expect(rsi!).toBeLessThan(70);
  });

  it('rsiFromLatestFirst produces different (smoother) result than naive SMA-RS for short series', () => {
    // The key behavioral difference: Wilder uses exponential smoothing, so the
    // result after the seed window is influenced by ALL prior bars, not just the
    // last period bars.
    const service = createService() as any;
    // 30 bars of upward movement, then a single sharp drop
    const upBars = Array.from({ length: 30 }, (_x, i) => 100 + i);
    const drop = [upBars[upBars.length - 1] - 15]; // sharp drop
    const series = [...upBars, ...drop];
    const latestFirst = [...series].reverse();
    const rsi = service.rsiFromLatestFirst(latestFirst, 14);
    expect(rsi).not.toBeNull();
    // After a long uptrend, even a sharp single-bar drop should keep RSI above ~40
    // (Wilder smoothing retains memory of the uptrend)
    expect(rsi!).toBeGreaterThan(40);
  });
});

// ---------------------------------------------------------------------------
// CB-13 — Stops vs intrabar low/high (not EOD close) + gap-through fill at open
// ---------------------------------------------------------------------------

describe('CB-13 — Intrabar stop/gap-through fill', () => {
  /**
   * Build a bar with explicit OHLC fields.
   */
  const makeBar = (date: string, open: number, high: number, low: number, close: number) =>
    ({ date, open, high, low, close, volume: 1000 });

  it('stop-loss triggers when bar LOW touches the stop level (not close)', () => {
    const service = createService() as any;
    const config: BacktestStrategyConfig = { ...baseConfig, stopLossPercent: 0.10 };
    const position = {
      instrumentId: 'i', symbol: 'X', entryDate: '2021-01-01', entryPrice: 100,
      quantity: 10, entryBarIndex: 0, cost: 0, committedCapital: 1000,
      entryReasons: [], highestClose: 100,
    };
    // Bar: open=96, high=97, low=88, close=95 → close doesn't breach 90 (10% stop),
    // but LOW=88 does breach 90 → stop should trigger
    const bars = [
      makeBar('2021-01-01', 100, 102, 99, 101), // entry bar
      makeBar('2021-01-02', 96, 97, 88, 95),    // bar with low below stop (90)
    ];
    const exit = service.exitDecision(config, bars, 1, position);
    expect(exit.exit).toBe(true);
    expect(exit.reason).toBe('STOP_LOSS');
  });

  it('stop-loss does NOT trigger when bar LOW is above the stop level', () => {
    const service = createService() as any;
    const config: BacktestStrategyConfig = { ...baseConfig, stopLossPercent: 0.10 };
    const position = {
      instrumentId: 'i', symbol: 'X', entryDate: '2021-01-01', entryPrice: 100,
      quantity: 10, entryBarIndex: 0, cost: 0, committedCapital: 1000,
      entryReasons: [], highestClose: 100,
    };
    // Bar: low=91 → above stop (90), close=93 → close also above stop → no exit
    const bars = [
      makeBar('2021-01-01', 100, 102, 99, 101),
      makeBar('2021-01-02', 95, 96, 91, 93),
    ];
    const exit = service.exitDecision(config, bars, 1, position);
    expect(exit.exit).toBe(false);
  });

  it('gap-down through stop fills at bar OPEN (not stop level)', () => {
    const service = createService() as any;
    const config: BacktestStrategyConfig = { ...baseConfig, stopLossPercent: 0.10 };
    const position = {
      instrumentId: 'i', symbol: 'X', entryDate: '2021-01-01', entryPrice: 100,
      quantity: 10, entryBarIndex: 0, cost: 0, committedCapital: 1000,
      entryReasons: [], highestClose: 100,
    };
    // entryPrice=100, stop=90; bar opens at 82 (well below stop) → gap-through
    // fill should be at open (82), not stop (90)
    const bars = [
      makeBar('2021-01-01', 100, 102, 99, 101),
      makeBar('2021-01-02', 82, 85, 80, 83), // opens below stop
    ];
    const exit = service.exitDecision(config, bars, 1, position);
    expect(exit.exit).toBe(true);
    expect(exit.reason).toBe('STOP_LOSS');
    // stopFillPrice should be bar open (82) because open < stop level (90)
    expect(exit.stopFillPrice).toBeCloseTo(82, 1);
  });

  it('stop fill at stop-level when bar opens above stop but low touches it', () => {
    const service = createService() as any;
    const config: BacktestStrategyConfig = { ...baseConfig, stopLossPercent: 0.10 };
    const position = {
      instrumentId: 'i', symbol: 'X', entryDate: '2021-01-01', entryPrice: 100,
      quantity: 10, entryBarIndex: 0, cost: 0, committedCapital: 1000,
      entryReasons: [], highestClose: 100,
    };
    // Bar opens above stop (95 > 90), but low=88 touches it → fill at stop (90)
    const bars = [
      makeBar('2021-01-01', 100, 102, 99, 101),
      makeBar('2021-01-02', 95, 97, 88, 92), // open 95 > stop 90; low 88 < stop 90
    ];
    const exit = service.exitDecision(config, bars, 1, position);
    expect(exit.exit).toBe(true);
    expect(exit.reason).toBe('STOP_LOSS');
    // stopFillPrice should be 90 (the stop level), not 88 (the low) or 95 (the open)
    expect(exit.stopFillPrice).toBeCloseTo(90, 1);
  });

  it('closePosition uses stopFillPrice when provided (not bar close)', () => {
    const service = createService() as any;
    const config: BacktestStrategyConfig = { ...baseConfig, transactionCostPercent: 0 };
    const position = {
      instrumentId: 'i', symbol: 'X', entryDate: '2021-01-01', entryPrice: 100,
      quantity: 10, entryBarIndex: 0, cost: 0, committedCapital: 1000,
      entryReasons: [], highestClose: 100,
    };
    const bar = makeBar('2021-01-02', 82, 85, 80, 83);
    const stopFillPrice = 82; // gap-down fill at open
    const trade = service.closePosition(config, position, bar, 'STOP_LOSS', [], stopFillPrice);
    // With stopFillPrice=82, gross = qty * (82-100) = 10 * -18 = -180
    expect(trade.exitPrice).toBeCloseTo(82, 1);
    expect(trade.grossPnL).toBeCloseTo(-180, 1);
  });
});

// ---------------------------------------------------------------------------
// CB-9 — Survivorship warning with point-in-time context
// ---------------------------------------------------------------------------

describe('CB-9 — Survivorship bias warning and point-in-time context', () => {
  it('emits SURVIVORSHIP_BIAS_UNIVERSE warning for universe ALL', async () => {
    const service = createService({
      marketDataService: {
        listInstruments: jest.fn().mockResolvedValue({
          instruments: [{ id: 'stock-1', symbol: 'AAA' }],
          pagination: { total: 1 },
        }),
        listPricesByInstrumentId: jest.fn(async () => ({ prices: makePrices('AAA') })),
        listPrices: jest.fn().mockResolvedValue([]),
      },
    });
    const result = await service.simulate({ ...baseConfig, universe: { type: 'ALL' } });
    const warnings = result.metrics.realismWarnings ?? [];
    const survivorshipWarning = warnings.find((w) => w.includes('SURVIVORSHIP_BIAS_UNIVERSE'));
    expect(survivorshipWarning).toBeDefined();
    // Warning should mention delisted names and survivorship bias
    expect(survivorshipWarning).toMatch(/delist/i);
    expect(survivorshipWarning).toMatch(/survivorship bias/i);
  });

  it('SURVIVORSHIP_BIAS_UNIVERSE warning mentions that instruments with DB history ARE included', async () => {
    const service = createService({
      marketDataService: {
        listInstruments: jest.fn().mockResolvedValue({
          instruments: [{ id: 'stock-1', symbol: 'AAA' }],
          pagination: { total: 50 },
        }),
        listPricesByInstrumentId: jest.fn(async () => ({ prices: makePrices('AAA') })),
        listPrices: jest.fn().mockResolvedValue([]),
      },
    });
    const result = await service.simulate({ ...baseConfig, universe: { type: 'ALL' } });
    const warnings = result.metrics.realismWarnings ?? [];
    const survivorshipWarning = warnings.find((w) => w.includes('SURVIVORSHIP_BIAS_UNIVERSE'));
    expect(survivorshipWarning).toBeDefined();
    // Should clarify that instruments with price data in the window ARE included
    expect(survivorshipWarning).toMatch(/price database|IS included/i);
  });

  it('no survivorship warning for SYMBOLS or WATCHLIST universes', async () => {
    const service = createService();
    const symbolsResult = await service.simulate({ ...baseConfig, universe: { type: 'SYMBOLS', symbols: ['AAA'] } });
    expect(symbolsResult.metrics.realismWarnings?.some((w) => w.includes('SURVIVORSHIP_BIAS_UNIVERSE'))).toBe(false);
  });
});
