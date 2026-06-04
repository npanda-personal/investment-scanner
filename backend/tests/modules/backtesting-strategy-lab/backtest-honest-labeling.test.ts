/// <reference types="@types/jest" />
/**
 * Tests for honest-labeling trust signals (#48):
 *
 *   1. PRICE_PROXY_CONTEXT warning — emitted when a proxy-gated strategy
 *      (e.g. SECTOR_LEADER_MOMENTUM, SMART_MONEY_ACCUMULATION) is under test,
 *      because sectorLeadership / smartMoneyStatus are price-proxy derived.
 *
 *   2. WARM_UP_DRAG warning — counts instrument-bars in warm-up (< 200 bars
 *      of history) and warns that short windows block entries.
 *
 *   3. LIQUIDITY_UNKNOWN note — counts instrument-bars where no volume data
 *      is available in DB (liquidityStatus=UNKNOWN blocks entries).
 *
 * These are additive realismWarnings — no existing warning should be removed
 * by these additions.
 */

import { BacktestingStrategyLabService } from '../../../src/modules/backtesting-strategy-lab';
import type { BacktestStrategyConfig } from '../../../src/modules/backtesting-strategy-lab';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a date-string array starting from `start` for `days` calendar days. */
const dateSeries = (start: string, days: number): string[] => {
  const result: string[] = [];
  const startDate = new Date(start);
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
};

/**
 * Generate price bars.
 * `withVolume`: when true bars have a numeric volume; when false volume is null
 * (simulates sparse/missing volume in DB).
 */
const makeBars = (count: number, startDate = '2019-01-01', withVolume = true) => {
  const dates = dateSeries(startDate, count);
  return dates.map((date, i) => ({
    date: new Date(date).toISOString(),
    close: 100 + i,
    adjusted_close: 100 + i,
    volume: withVolume ? 100000 + i * 10 : null,
    symbol: 'TST',
  }));
};

const BASE_CONFIG: BacktestStrategyConfig = {
  universe: { type: 'SYMBOLS', symbols: ['TST'] },
  entryRule: { type: 'PRICE_ABOVE_SMA50' },
  exitRule: { type: 'FIXED_HOLDING_PERIOD', holdingDays: 20 },
  startDate: '2019-01-01',
  endDate: '2021-12-31',
  initialCapital: 100000,
  positionSizeType: 'EQUAL_WEIGHT',
  maxPositions: 1,
  transactionCostPercent: 0.001,
};

function createService(overrides: {
  strategyRegistry?: any;
  bars?: any[];
} = {}) {
  const bars = overrides.bars ?? makeBars(800);
  return new BacktestingStrategyLabService(
    {
      listStrategies: jest.fn(),
      getStrategy: jest.fn(),
      deleteStrategy: jest.fn(),
      listRuns: jest.fn(),
      getRun: jest.fn(),
      deleteRun: jest.fn(),
      createStrategy: jest.fn(async (input: any) => ({
        id: 'strat-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...input,
      })),
      updateStrategy: jest.fn(),
      createRun: jest.fn(async (input: any) => ({ id: 'run-1', startedAt: new Date().toISOString(), ...input })),
      updateRunMetrics: jest.fn(),
    } as any,
    {
      listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'stock-1', symbol: 'TST' }] }),
      listPricesByInstrumentId: jest.fn(async () => ({ prices: bars })),
      listPrices: jest.fn().mockResolvedValue([]),
    } as any,
    { detail: jest.fn() } as any,
    { assertAllowed: jest.fn(), recordUsage: jest.fn() } as any,
    {
      filterEligibleInstruments: jest.fn().mockResolvedValue({
        eligibleInstrumentIds: ['stock-1'],
        excludedInstrumentIds: [],
        missingQualityEvaluationCount: 0,
        warnings: [],
        evaluationsByInstrumentId: {},
      }),
    } as any,
    overrides.strategyRegistry ?? { get: jest.fn().mockReturnValue(null) } as any,
    {
      persistBacktestPerformance: jest.fn().mockResolvedValue({
        id: 'perf-1', ratingScore: 20, ratingGrade: 'UNPROVEN', readinessLabel: 'RESEARCH_ONLY', ratingReasons: [],
      }),
      strategyToBacktestConfig: jest.fn(),
    } as any,
    // snapshotsRepository — returns empty (no regime data)
    { findByDateRange: jest.fn().mockResolvedValue([]) } as any,
  );
}

// ---------------------------------------------------------------------------
// 1. PRICE_PROXY_CONTEXT warning
// ---------------------------------------------------------------------------

describe('PRICE_PROXY_CONTEXT warning (honest-labeling #48)', () => {
  const PROXY_STRATEGIES = [
    'SECTOR_LEADER_MOMENTUM',
    'SMART_MONEY_ACCUMULATION',
    'TREND_MOMENTUM',
    'BREAKOUT_CONFIRMATION',
  ];

  for (const strategyCode of PROXY_STRATEGIES) {
    it(`emits PRICE_PROXY_CONTEXT warning for strategy ${strategyCode}`, async () => {
      // Strategy mock returns null (no entry) to keep the test fast.
      const strategyRegistry = {
        get: jest.fn().mockReturnValue(null),
      };

      const service = createService({ strategyRegistry });
      const result = await service.simulate({
        ...BASE_CONFIG,
        mode: 'REGISTERED_STRATEGY',
        strategyCode,
        // Keep the config shape consistent; we mock the registry to return null
        // so the evaluator falls back to the custom-rule path, but the
        // realismWarnings check uses config.strategyCode directly.
      });

      const warnings = result.metrics.realismWarnings ?? [];
      const hasProxyWarning = warnings.some((w) => w.includes('PRICE_PROXY_CONTEXT'));
      expect(hasProxyWarning).toBe(true);
    });
  }

  it('does NOT emit PRICE_PROXY_CONTEXT warning for a non-proxy strategy', async () => {
    const service = createService();
    // No strategyCode set → custom-rule path
    const result = await service.simulate({ ...BASE_CONFIG });

    const warnings = result.metrics.realismWarnings ?? [];
    expect(warnings.some((w) => w.includes('PRICE_PROXY_CONTEXT'))).toBe(false);
  });

  it('PRICE_PROXY_CONTEXT warning mentions sector and smart-money context', async () => {
    const service = createService({ strategyRegistry: { get: jest.fn().mockReturnValue(null) } });
    const result = await service.simulate({
      ...BASE_CONFIG,
      mode: 'REGISTERED_STRATEGY',
      strategyCode: 'SECTOR_LEADER_MOMENTUM',
    });

    const warning = (result.metrics.realismWarnings ?? []).find((w) => w.includes('PRICE_PROXY_CONTEXT'));
    expect(warning).toBeDefined();
    expect(warning).toContain('sectorLeadership');
    expect(warning).toContain('smartMoneyStatus');
    expect(warning).toContain('price proxies');
  });
});

// ---------------------------------------------------------------------------
// 2. WARM_UP_DRAG warning
// ---------------------------------------------------------------------------

describe('WARM_UP_DRAG warning (honest-labeling #48)', () => {
  it('emits WARM_UP_DRAG when bars < 200 are encountered', async () => {
    // Provide only 250 bars — the first ~199 will be in warm-up.
    const shortBars = makeBars(250, '2020-01-01');
    const service = createService({ bars: shortBars });

    const result = await service.simulate({
      ...BASE_CONFIG,
      startDate: '2020-01-01',
      endDate: '2021-06-30',
    });

    const warnings = result.metrics.realismWarnings ?? [];
    const warmUpWarning = warnings.find((w) => w.includes('WARM_UP_DRAG'));
    expect(warmUpWarning).toBeDefined();
    // The count should be positive
    const match = warmUpWarning!.match(/(\d+) instrument-bar/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThan(0);
  });

  it('WARM_UP_DRAG warning includes the 200-bar threshold', async () => {
    const shortBars = makeBars(250, '2020-01-01');
    const service = createService({ bars: shortBars });

    const result = await service.simulate({
      ...BASE_CONFIG,
      startDate: '2020-01-01',
      endDate: '2021-06-30',
    });

    const warning = (result.metrics.realismWarnings ?? []).find((w) => w.includes('WARM_UP_DRAG'));
    expect(warning).toContain('200');
  });

  it('warm-up count is bounded by the number of bars < 200 in the instrument history', async () => {
    // 300 bars: the first 199 are in warm-up, the remaining 101 are past warm-up.
    // The warm-up count in the warning should reflect roughly those 199 bars.
    const bars300 = makeBars(300, '2020-01-01');
    const service = createService({ bars: bars300 });

    const result = await service.simulate({
      ...BASE_CONFIG,
      startDate: '2020-01-01',
      endDate: '2021-06-30',
    });

    const warnings = result.metrics.realismWarnings ?? [];
    const warmUpWarning = warnings.find((w) => w.includes('WARM_UP_DRAG'));
    expect(warmUpWarning).toBeDefined();
    // Extract count from warning — must be less than total bar count
    const match = warmUpWarning!.match(/(\d+) instrument-bar/);
    expect(match).not.toBeNull();
    const count = Number(match![1]);
    // Must be at most 199 (bars 0-198 are < 200 closes)
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(199);
  });
});

// ---------------------------------------------------------------------------
// 3. LIQUIDITY_UNKNOWN note
// ---------------------------------------------------------------------------

describe('LIQUIDITY_UNKNOWN warning (honest-labeling #48)', () => {
  it('emits LIQUIDITY_UNKNOWN when bars have null volume', async () => {
    // All bars have null volume → liquidityStatus=UNKNOWN for every bar.
    const noVolumeBars = makeBars(400, '2019-01-01', false /* withVolume = false */);
    const service = createService({ bars: noVolumeBars });

    const result = await service.simulate({
      ...BASE_CONFIG,
      startDate: '2019-01-01',
      endDate: '2020-12-31',
    });

    const warnings = result.metrics.realismWarnings ?? [];
    const liquidityWarning = warnings.find((w) => w.includes('LIQUIDITY_UNKNOWN'));
    expect(liquidityWarning).toBeDefined();
    const match = liquidityWarning!.match(/(\d+) instrument-bar/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThan(0);
  });

  it('LIQUIDITY_UNKNOWN warning mentions sparse volume data', async () => {
    const noVolumeBars = makeBars(400, '2019-01-01', false);
    const service = createService({ bars: noVolumeBars });

    const result = await service.simulate({
      ...BASE_CONFIG,
      startDate: '2019-01-01',
      endDate: '2020-12-31',
    });

    const warning = (result.metrics.realismWarnings ?? []).find((w) => w.includes('LIQUIDITY_UNKNOWN'));
    expect(warning).toBeDefined();
    expect(warning).toContain('sparse volume data');
    expect(warning).toContain('liquidityStatus=UNKNOWN');
  });

  it('does NOT emit LIQUIDITY_UNKNOWN when bars all have volume data', async () => {
    // Default bars (makeBars with withVolume=true) have numeric volume on all bars.
    // With barIndex > 0 guard, only genuine null-volume prior bars trigger the count.
    const withVolumeBars = makeBars(800, '2019-01-01', true);
    const service = createService({ bars: withVolumeBars });

    const result = await service.simulate({ ...BASE_CONFIG });

    const warnings = result.metrics.realismWarnings ?? [];
    expect(warnings.some((w) => w.includes('LIQUIDITY_UNKNOWN'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Multiple warnings co-exist (additive)
// ---------------------------------------------------------------------------

describe('Honest-labeling warnings are additive', () => {
  it('all three new warnings can co-exist on the same backtest result', async () => {
    // Short bars + no volume + proxy-dependent strategy → all three warnings.
    const shortNoVolumeBars = makeBars(250, '2020-01-01', false);
    const service = createService({
      bars: shortNoVolumeBars,
      strategyRegistry: { get: jest.fn().mockReturnValue(null) },
    });

    const result = await service.simulate({
      ...BASE_CONFIG,
      startDate: '2020-01-01',
      endDate: '2021-06-30',
      mode: 'REGISTERED_STRATEGY',
      strategyCode: 'SECTOR_LEADER_MOMENTUM',
    });

    const warnings = result.metrics.realismWarnings ?? [];
    expect(warnings.some((w) => w.includes('PRICE_PROXY_CONTEXT'))).toBe(true);
    expect(warnings.some((w) => w.includes('WARM_UP_DRAG'))).toBe(true);
    expect(warnings.some((w) => w.includes('LIQUIDITY_UNKNOWN'))).toBe(true);
  });

  it('existing warnings are still present alongside new ones', async () => {
    // ALL universe type triggers survivorship-bias warning.
    const service = new BacktestingStrategyLabService(
      {
        listStrategies: jest.fn(), getStrategy: jest.fn(), deleteStrategy: jest.fn(),
        listRuns: jest.fn(), getRun: jest.fn(), deleteRun: jest.fn(),
        createStrategy: jest.fn(async (input: any) => ({ id: 's1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...input })),
        updateStrategy: jest.fn(),
        createRun: jest.fn(async (input: any) => ({ id: 'run-1', startedAt: new Date().toISOString(), ...input })),
        updateRunMetrics: jest.fn(),
      } as any,
      {
        listInstruments: jest.fn().mockResolvedValue({
          instruments: [{ id: 'stock-1', symbol: 'TST' }],
          pagination: { total: 200 },
        }),
        listPricesByInstrumentId: jest.fn(async () => ({ prices: makeBars(800) })),
        listPrices: jest.fn().mockResolvedValue([]),
      } as any,
      { detail: jest.fn() } as any,
      { assertAllowed: jest.fn(), recordUsage: jest.fn() } as any,
      {
        filterEligibleInstruments: jest.fn().mockResolvedValue({
          eligibleInstrumentIds: ['stock-1'], excludedInstrumentIds: [],
          missingQualityEvaluationCount: 0, warnings: [], evaluationsByInstrumentId: {},
        }),
      } as any,
      { get: jest.fn().mockReturnValue(null) } as any,
      {
        persistBacktestPerformance: jest.fn().mockResolvedValue({ id: 'p1', ratingScore: 20, ratingGrade: 'UNPROVEN', readinessLabel: 'RESEARCH_ONLY', ratingReasons: [] }),
        strategyToBacktestConfig: jest.fn(),
      } as any,
      { findByDateRange: jest.fn().mockResolvedValue([]) } as any,
    );

    const result = await service.simulate({
      ...BASE_CONFIG,
      mode: 'REGISTERED_STRATEGY',
      strategyCode: 'SECTOR_LEADER_MOMENTUM',
      universe: { type: 'ALL', region: 'IN', assetType: 'STOCK' },
    });

    const warnings = result.metrics.realismWarnings ?? [];
    // Survivorship-bias warning (existing, from #45)
    expect(warnings.some((w) => w.includes('survivorship bias'))).toBe(true);
    // New price-proxy warning
    expect(warnings.some((w) => w.includes('PRICE_PROXY_CONTEXT'))).toBe(true);
  });
});
