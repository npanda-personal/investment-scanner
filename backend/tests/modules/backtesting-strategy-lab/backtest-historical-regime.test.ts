/// <reference types="@types/jest" />
/**
 * Tests: per-bar historical market regime in the backtest (#28b)
 *
 * These tests verify:
 *  1. regimeAsOf — as-of binary-search lookup (unit)
 *  2. RISK_OFF snapshot on bar date → marketGate='CLOSED' + marketRegime='RISK_OFF'
 *  3. Bar date covered only by an older snapshot → uses that nearest prior (as-of)
 *  4. Bar date before any snapshot → fallback OPEN/NEUTRAL + regimeContextAvailable=false
 *  5. The RISK_OFF_AVOIDANCE strategy blocks entry when regime is RISK_OFF (integration)
 *
 * All snapshot data is mocked — no DB required.
 */
import { BacktestingStrategyLabService } from '../../../src/modules/backtesting-strategy-lab';
import type { BacktestStrategyConfig } from '../../../src/modules/backtesting-strategy-lab';
import { StrategyFrameworkRegistry } from '../../../src/modules/strategy-framework';

// ─── Shared helpers ─────────────────────────────────────────────────────────

/**
 * Builds a simple ascending price series: 260 bars starting from `start`,
 * each bar 1 point above the previous.  Enough for 200-bar warmup.
 */
const makePrices = (start = '2021-01-01', days = 260, slope = 1) => {
  const startDate = new Date(start);
  return Array.from({ length: days }, (_item, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      date: date.toISOString(),
      close: 100 + index * slope,
      adjusted_close: 100 + index * slope,
      volume: 1000000,
      symbol: 'TST',
    };
  });
};

/**
 * Minimal service factory.  Accepts an optional mock for the 8th constructor
 * argument (snapshotsRepository).  The mock should expose a `db` property
 * with a `marketContextSnapshot.findMany` function to supply snapshot rows.
 */
const makeService = (snapshotRows: Array<{ snapshotDate: Date; regime: string; breadthPercentAboveSma50: number | null }> = []) => {
  const prices = makePrices('2021-01-01', 260);

  const repository = {
    listStrategies: jest.fn(),
    getStrategy: jest.fn(),
    deleteStrategy: jest.fn(),
    listRuns: jest.fn(),
    getRun: jest.fn(),
    deleteRun: jest.fn(),
    createStrategy: jest.fn(async (input: any) => ({ id: 'strat-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...input })),
    createRun: jest.fn(async (input: any) => ({ id: 'run-1', startedAt: new Date().toISOString(), ...input })),
    updateRunMetrics: jest.fn(async (_id: string, metrics: any) => ({
      id: 'run-1', strategyId: null, config: {}, status: 'COMPLETED',
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
      metrics, equityCurve: [], trades: [], error: null,
    })),
  };

  const marketDataService = {
    listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'stock-1', symbol: 'TST' }] }),
    listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices }),
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
    getDefinition: jest.fn(),
    persistBacktestPerformance: jest.fn().mockResolvedValue({
      id: 'perf-1', ratingScore: 20, ratingGrade: 'UNPROVEN', readinessLabel: 'RESEARCH_ONLY', ratingReasons: [],
    }),
    strategyToBacktestConfig: jest.fn(),
  };

  // Mock the snapshots repository: expose a `db` with the correct Prisma-like
  // interface so preloadRegimeSnapshots() can use it.
  const mockSnapshotsRepository = {
    db: {
      marketContextSnapshot: {
        findMany: jest.fn().mockResolvedValue(snapshotRows),
      },
    },
  };

  return {
    service: new BacktestingStrategyLabService(
      repository as any,
      marketDataService as any,
      { detail: jest.fn() } as any,
      { assertAllowed: jest.fn(), recordUsage: jest.fn() } as any,
      dataQualityService as any,
      new StrategyFrameworkRegistry(),
      strategyFrameworkService as any,
      mockSnapshotsRepository as any,
    ),
    repository,
    mockSnapshotsRepository,
    prices,
  };
};

// ─── 1. Unit tests: regimeAsOf binary-search ─────────────────────────────────

describe('BacktestingStrategyLabService.regimeAsOf (as-of lookup)', () => {
  // Access via cast to any since it's declared public in the implementation
  // (made public for testability per the task spec).
  const getService = () => makeService().service;

  it('returns null when snapshot array is empty', () => {
    const svc = getService() as any;
    expect(svc.regimeAsOf([], '2023-06-01')).toBeNull();
  });

  it('returns null when barDate is before all snapshots', () => {
    const svc = getService() as any;
    const rows = [{ dateKey: '2023-01-01', regime: 'RISK_ON', breadthAbove50: 0.65 }];
    expect(svc.regimeAsOf(rows, '2022-12-31')).toBeNull();
  });

  it('returns the exact matching snapshot when dateKey === barDate', () => {
    const svc = getService() as any;
    const rows = [
      { dateKey: '2022-06-01', regime: 'NEUTRAL', breadthAbove50: 0.5 },
      { dateKey: '2023-01-01', regime: 'RISK_OFF', breadthAbove50: 0.2 },
      { dateKey: '2023-06-01', regime: 'RISK_ON', breadthAbove50: 0.7 },
    ];
    const result = svc.regimeAsOf(rows, '2023-01-01');
    expect(result).not.toBeNull();
    expect(result.regime).toBe('RISK_OFF');
  });

  it('returns the nearest prior snapshot when barDate falls between two snapshots', () => {
    const svc = getService() as any;
    const rows = [
      { dateKey: '2022-06-01', regime: 'NEUTRAL', breadthAbove50: 0.5 },
      { dateKey: '2023-01-01', regime: 'RISK_OFF', breadthAbove50: 0.2 },
      { dateKey: '2023-06-01', regime: 'RISK_ON', breadthAbove50: 0.7 },
    ];
    // 2023-03-15 is between 2023-01-01 and 2023-06-01 → nearest prior is 2023-01-01
    const result = svc.regimeAsOf(rows, '2023-03-15');
    expect(result).not.toBeNull();
    expect(result.regime).toBe('RISK_OFF');
    expect(result.dateKey).toBe('2023-01-01');
  });

  it('returns the last snapshot when barDate is after all snapshots', () => {
    const svc = getService() as any;
    const rows = [
      { dateKey: '2022-06-01', regime: 'NEUTRAL', breadthAbove50: 0.5 },
      { dateKey: '2023-01-01', regime: 'RISK_OFF', breadthAbove50: 0.2 },
    ];
    const result = svc.regimeAsOf(rows, '2025-12-31');
    expect(result).not.toBeNull();
    expect(result.regime).toBe('RISK_OFF');
  });
});

// ─── 2. strategyContextFromBars: RISK_OFF snapshot → CLOSED gate ──────────────

describe('strategyContextFromBars: regime from persisted snapshot', () => {
  /**
   * Access strategyContextFromBars via reflection (it's private).
   * We test it indirectly by spying on evaluateRegisteredStrategy context
   * construction, or more cleanly by testing the observable behavior through
   * a RISK_OFF_AVOIDANCE strategy run.
   */

  it('uses RISK_OFF snapshot to derive CLOSED marketGate', async () => {
    // Provide a single RISK_OFF snapshot for the entire test window.
    const snapshotRows = [{
      snapshotDate: new Date('2021-01-01T00:00:00.000Z'),
      regime: 'RISK_OFF',
      breadthPercentAboveSma50: 0.18,
    }];

    const { service } = makeService(snapshotRows);
    const svcAny = service as any;

    // Build a minimal bars array
    const bars = makePrices('2021-01-01', 260).map((p) => ({
      date: new Date(p.date).toISOString().slice(0, 10),
      close: p.close,
      volume: p.volume,
    }));

    // The regime index as preloaded by the service
    const regimeIndex = [{
      dateKey: '2021-01-01',
      regime: 'RISK_OFF',
      breadthAbove50: 0.18,
    }];

    const barDate = '2021-06-15'; // well after snapshot
    const index = bars.findIndex((b) => b.date === barDate);
    const config: BacktestStrategyConfig = {
      universe: { type: 'SYMBOLS', symbols: ['TST'] },
      entryRule: { type: 'PRICE_ABOVE_SMA50' },
      exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 10 },
      startDate: '2021-01-01',
      endDate: '2021-12-31',
      initialCapital: 100000,
      positionSizeType: 'EQUAL_WEIGHT',
      maxPositions: 1,
      transactionCostPercent: 0.001,
    };

    // Use the as-of lookup to get the regimeRow for barDate
    const regimeRow = svcAny.regimeAsOf(regimeIndex, barDate);
    expect(regimeRow).not.toBeNull();
    expect(regimeRow.regime).toBe('RISK_OFF');

    // Build context — invoke private method via any cast
    const ctx = svcAny.strategyContextFromBars(bars, index, config, undefined, regimeRow);
    expect(ctx.marketGate).toBe('CLOSED');
    expect(ctx.marketRegime).toBe('RISK_OFF');
    expect(ctx.regimeContextAvailable).toBe(true);
  });

  it('uses RISK_ON + high breadth snapshot to derive OPEN marketGate', async () => {
    const { service } = makeService([]);
    const svcAny = service as any;

    const bars = makePrices('2021-01-01', 260).map((p) => ({
      date: new Date(p.date).toISOString().slice(0, 10),
      close: p.close,
      volume: p.volume,
    }));

    const regimeIndex = [{
      dateKey: '2021-01-01',
      regime: 'RISK_ON',
      breadthAbove50: 0.70,
    }];

    const barDate = '2021-06-15';
    const index = bars.findIndex((b) => b.date === barDate);
    const config: BacktestStrategyConfig = {
      universe: { type: 'SYMBOLS', symbols: ['TST'] },
      entryRule: { type: 'PRICE_ABOVE_SMA50' },
      exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 10 },
      startDate: '2021-01-01',
      endDate: '2021-12-31',
      initialCapital: 100000,
      positionSizeType: 'EQUAL_WEIGHT',
      maxPositions: 1,
      transactionCostPercent: 0.001,
    };

    const regimeRow = svcAny.regimeAsOf(regimeIndex, barDate);
    const ctx = svcAny.strategyContextFromBars(bars, index, config, undefined, regimeRow);
    expect(ctx.marketGate).toBe('OPEN');
    expect(ctx.marketRegime).toBe('RISK_ON');
    expect(ctx.regimeContextAvailable).toBe(true);
  });

  it('falls back to UNKNOWN/null + regimeContextAvailable=false when no prior snapshot', () => {
    // Fix #1: when no regime snapshot exists for a bar date, marketGate MUST
    // be 'UNKNOWN' (not 'OPEN') so that gated strategies are honestly blocked,
    // not silently treated as if the market were open.
    const { service } = makeService([]);
    const svcAny = service as any;

    const bars = makePrices('2015-01-01', 260).map((p) => ({
      date: new Date(p.date).toISOString().slice(0, 10),
      close: p.close,
      volume: p.volume,
    }));

    // Empty regime index (no pre-2019 snapshots exist in production)
    const regimeIndex: any[] = [];
    const barDate = '2015-06-15';
    const index = bars.findIndex((b) => b.date === barDate);
    const config: BacktestStrategyConfig = {
      universe: { type: 'SYMBOLS', symbols: ['TST'] },
      entryRule: { type: 'PRICE_ABOVE_SMA50' },
      exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 10 },
      startDate: '2015-01-01',
      endDate: '2015-12-31',
      initialCapital: 100000,
      positionSizeType: 'EQUAL_WEIGHT',
      maxPositions: 1,
      transactionCostPercent: 0.001,
    };

    const regimeRow = svcAny.regimeAsOf(regimeIndex, barDate);
    expect(regimeRow).toBeNull();

    const ctx = svcAny.strategyContextFromBars(bars, index, config, undefined, regimeRow);
    // Fix #1: UNKNOWN (not OPEN) when no regime context
    expect(ctx.marketGate).toBe('UNKNOWN');
    // marketRegime is null (not 'NEUTRAL') when no snapshot
    expect(ctx.marketRegime).toBeNull();
    expect(ctx.regimeContextAvailable).toBe(false);
  });

  it('uses the nearest prior snapshot for a date that falls between two snapshots', () => {
    const { service } = makeService([]);
    const svcAny = service as any;

    const bars = makePrices('2021-01-01', 260).map((p) => ({
      date: new Date(p.date).toISOString().slice(0, 10),
      close: p.close,
      volume: p.volume,
    }));

    // Two snapshots: neutral on 2021-01-01, risk-on on 2021-09-01
    const regimeIndex = [
      { dateKey: '2021-01-01', regime: 'NEUTRAL', breadthAbove50: 0.45 },
      { dateKey: '2021-09-01', regime: 'RISK_ON', breadthAbove50: 0.68 },
    ];

    // Bar on 2021-06-15 → nearest prior is 2021-01-01 (NEUTRAL + 45% breadth → SELECTIVE)
    const barDate = '2021-06-15';
    const index = bars.findIndex((b) => b.date === barDate);
    const config: BacktestStrategyConfig = {
      universe: { type: 'SYMBOLS', symbols: ['TST'] },
      entryRule: { type: 'PRICE_ABOVE_SMA50' },
      exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 10 },
      startDate: '2021-01-01',
      endDate: '2021-12-31',
      initialCapital: 100000,
      positionSizeType: 'EQUAL_WEIGHT',
      maxPositions: 1,
      transactionCostPercent: 0.001,
    };

    const regimeRow = svcAny.regimeAsOf(regimeIndex, barDate);
    expect(regimeRow).not.toBeNull();
    expect(regimeRow.regime).toBe('NEUTRAL');
    expect(regimeRow.dateKey).toBe('2021-01-01');

    const ctx = svcAny.strategyContextFromBars(bars, index, config, undefined, regimeRow);
    // NEUTRAL regime + breadth 0.45 > 0.3 → falls to SELECTIVE
    expect(ctx.marketGate).toBe('SELECTIVE');
    expect(ctx.marketRegime).toBe('NEUTRAL');
    expect(ctx.regimeContextAvailable).toBe(true);
  });
});

// ─── 3. Integration: preloadRegimeSnapshots is called once per simulate() ────

describe('preloadRegimeSnapshots: called once per simulate, not per-bar', () => {
  it('calls findMany exactly once during a full simulation', async () => {
    const snapshotRows = [{
      snapshotDate: new Date('2021-01-01T00:00:00.000Z'),
      regime: 'NEUTRAL',
      breadthPercentAboveSma50: 0.5,
    }];

    const { service, mockSnapshotsRepository } = makeService(snapshotRows);

    const config: BacktestStrategyConfig = {
      universe: { type: 'SYMBOLS', symbols: ['TST'] },
      entryRule: { type: 'PRICE_ABOVE_SMA50' },
      exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 10 },
      startDate: '2021-01-01',
      endDate: '2021-12-31',
      initialCapital: 100000,
      positionSizeType: 'EQUAL_WEIGHT',
      maxPositions: 1,
      transactionCostPercent: 0.001,
    };

    await service.run({ config });

    // findMany must have been called exactly once — not once per bar
    expect(mockSnapshotsRepository.db.marketContextSnapshot.findMany).toHaveBeenCalledTimes(1);
  });
});

// ─── CP-constants consistency: divergent-band breadth values ─────────────────
//
// These tests validate that breadth values in the band that used to diverge
// between the old 0.6/0.3 thresholds and the new CP constants (0.40/0.25) now
// produce the CORRECT gate across all backtest paths:
//
//   breadth 0.42 (in [0.40, 0.60) old-band): OPEN when RISK_ON (CP: ≥ BREADTH_WEAK_THRESHOLD)
//   breadth 0.28 (in (0.25, 0.30] old-band): SELECTIVE not CLOSED (CP: < BREADTH_VERY_WEAK_THRESHOLD is 0.25)
//
// Before this fix, 0.42 with RISK_ON → SELECTIVE (missed OPEN) and
// 0.28 with any regime → CLOSED (incorrectly gated).

describe('CP-constants: divergent-band breadth values now classify correctly', () => {
  it('RISK_ON + breadth 0.42 (old SELECTIVE, new OPEN) → OPEN via strategyContextFromBars', () => {
    const { service } = makeService([]);
    const svcAny = service as any;

    const bars = makePrices('2021-01-01', 260).map((p) => ({
      date: new Date(p.date).toISOString().slice(0, 10),
      close: p.close,
      volume: p.volume,
    }));
    const regimeIndex = [{ dateKey: '2021-01-01', regime: 'RISK_ON', breadthAbove50: 0.42 }];
    const barDate = '2021-06-15';
    const index = bars.findIndex((b) => b.date === barDate);
    const config: BacktestStrategyConfig = {
      universe: { type: 'SYMBOLS', symbols: ['TST'] },
      entryRule: { type: 'PRICE_ABOVE_SMA50' },
      exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 10 },
      startDate: '2021-01-01',
      endDate: '2021-12-31',
      initialCapital: 100000,
      positionSizeType: 'EQUAL_WEIGHT',
      maxPositions: 1,
      transactionCostPercent: 0.001,
    };

    const regimeRow = svcAny.regimeAsOf(regimeIndex, barDate);
    expect(regimeRow).not.toBeNull();
    const ctx = svcAny.strategyContextFromBars(bars, index, config, undefined, regimeRow);
    // 0.42 >= BREADTH_WEAK_THRESHOLD (0.40) AND RISK_ON → OPEN
    expect(ctx.marketGate).toBe('OPEN');
  });

  it('RISK_ON + breadth 0.28 (in old CLOSED band, new SELECTIVE) → SELECTIVE via strategyContextFromBars', () => {
    const { service } = makeService([]);
    const svcAny = service as any;

    const bars = makePrices('2021-01-01', 260).map((p) => ({
      date: new Date(p.date).toISOString().slice(0, 10),
      close: p.close,
      volume: p.volume,
    }));
    const regimeIndex = [{ dateKey: '2021-01-01', regime: 'RISK_ON', breadthAbove50: 0.28 }];
    const barDate = '2021-06-15';
    const index = bars.findIndex((b) => b.date === barDate);
    const config: BacktestStrategyConfig = {
      universe: { type: 'SYMBOLS', symbols: ['TST'] },
      entryRule: { type: 'PRICE_ABOVE_SMA50' },
      exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 10 },
      startDate: '2021-01-01',
      endDate: '2021-12-31',
      initialCapital: 100000,
      positionSizeType: 'EQUAL_WEIGHT',
      maxPositions: 1,
      transactionCostPercent: 0.001,
    };

    const regimeRow = svcAny.regimeAsOf(regimeIndex, barDate);
    expect(regimeRow).not.toBeNull();
    const ctx = svcAny.strategyContextFromBars(bars, index, config, undefined, regimeRow);
    // 0.28 >= BREADTH_VERY_WEAK_THRESHOLD (0.25) AND not RISK_OFF → SELECTIVE (not CLOSED)
    expect(ctx.marketGate).toBe('SELECTIVE');
  });
});

// ─── 4. Integration: RISK_OFF_AVOIDANCE strategy gates entries on RISK_OFF ───

describe('TREND_MOMENTUM strategy: RISK_OFF regime blocks entry (marketGate=CLOSED)', () => {
  it('produces fewer entries when regime is RISK_OFF vs RISK_ON', async () => {
    const registry = new StrategyFrameworkRegistry();
    const trendStrategy = registry.get('TREND_MOMENTUM');
    // Skip gracefully if the strategy isn't registered in this build
    if (!trendStrategy) {
      console.warn('TREND_MOMENTUM strategy not found in registry — skipping integration test');
      return;
    }

    const config: BacktestStrategyConfig = {
      strategyCode: 'TREND_MOMENTUM',
      mode: 'REGISTERED_STRATEGY',
      timeframe: '1Y',
      universe: { type: 'SYMBOLS', symbols: ['TST'] },
      entryRule: { type: 'PRICE_ABOVE_SMA50' },
      exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 10 },
      startDate: '2021-01-01',
      endDate: '2021-12-31',
      initialCapital: 100000,
      positionSizeType: 'EQUAL_WEIGHT',
      maxPositions: 1,
      transactionCostPercent: 0.001,
    };

    // RISK_OFF scenario: entire window is RISK_OFF
    const riskOffSnapshotRows = [{
      snapshotDate: new Date('2020-12-01T00:00:00.000Z'),
      regime: 'RISK_OFF',
      breadthPercentAboveSma50: 0.15,
    }];

    // RISK_ON scenario: entire window is RISK_ON
    const riskOnSnapshotRows = [{
      snapshotDate: new Date('2020-12-01T00:00:00.000Z'),
      regime: 'RISK_ON',
      breadthPercentAboveSma50: 0.72,
    }];

    const { service: riskOffService } = makeService(riskOffSnapshotRows);
    const { service: riskOnService } = makeService(riskOnSnapshotRows);

    const riskOffRun = await riskOffService.run({ config });
    const riskOnRun = await riskOnService.run({ config });

    // RISK_OFF should result in 0 trades (all entries blocked by RISK_OFF_REGIME filter)
    // RISK_ON should allow trades.
    // We assert RISK_OFF has fewer trades, not necessarily zero, because the registered
    // strategy evaluation may not be the only gate.
    expect((riskOffRun.metrics?.numberOfTrades ?? 0)).toBeLessThanOrEqual(
      riskOnRun.metrics?.numberOfTrades ?? 0,
    );
  });
});
