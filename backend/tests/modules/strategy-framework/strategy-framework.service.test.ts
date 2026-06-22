import { StrategyFrameworkRegistry, StrategyFrameworkService } from '../../../src/modules/strategy-framework';
import type { StrategyDefinition, StrategyPerformanceSummaryDto } from '../../../src/modules/strategy-framework';

describe('Strategy Framework service', () => {
  const registry = new StrategyFrameworkRegistry();
  const service = new StrategyFrameworkService(
    {} as any,
    registry,
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
      takeProfitPercent: 0.2,
    });

    expect(config.strategyCode).toBe('TREND_MOMENTUM');
    expect(config.mode).toBe('REGISTERED_STRATEGY');
    expect(config.excludeMissingQuality).toBe(true);
    expect(config.takeProfitPercent).toBeUndefined();
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

  it('seeds current registry definitions through the repository source generator flow', async () => {
    const repo = { upsertDefinitions: jest.fn().mockResolvedValue(undefined) };
    const seedService = new StrategyFrameworkService(
      repo as any,
      registry,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    await seedService.seedDefinitions();

    expect(repo.upsertDefinitions).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        code: 'TREND_MOMENTUM',
        version: registry.get('TREND_MOMENTUM')?.version,
        invalidationRules: expect.arrayContaining([
          expect.objectContaining({ code: 'SUPPORT_INVALIDATED' }),
        ]),
      }),
    ]));
    expect(repo.upsertDefinitions.mock.calls[0][0]).toHaveLength(registry.list().length);
  });

  it('uses persisted definitions first for runtime list, detail, and direct evaluation', async () => {
    const persistedTrend = clonedStrategy(registry, 'TREND_MOMENTUM', {
      name: 'Persisted Trend Momentum',
      version: '9.9.0',
      effectiveAt: '2026-06-01T00:00:00.000Z',
    });
    const repo = {
      listDefinitions: jest.fn().mockResolvedValue([persistedTrend]),
      latestPerformanceForStrategies: jest.fn().mockResolvedValue([]),
      performance: jest.fn().mockResolvedValue([]),
    };
    const persistedService = new StrategyFrameworkService(
      repo as any,
      registry,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    const rows = await persistedService.list({});
    const listedTrend = rows.find((row) => row.code === 'TREND_MOMENTUM');
    const detail = await persistedService.detail('TREND_MOMENTUM');
    const [evaluation] = await persistedService.evaluateContext({
      instrumentId: 'stock-1',
      symbol: 'AAA',
      latestPrice: 120,
      sma50: 100,
      sma200: 90,
      rawSignal: { score: 82, direction: 'BULLISH' } as any,
      dataQuality: {
        signalReadinessStatus: 'READY',
        coverageStatus: 'GOOD',
        liquidityStatus: 'LIQUID',
        eligibleForSignals: true,
      },
      marketGate: 'OPEN',
      marketRegime: 'RISK_ON',
      sectorLeadership: 'LEADING',
      sectorRelativeStrengthScore: 72,
      smartMoneyStatus: 'ACCUMULATION',
      smartMoneyScore: 80,
    }, 'TREND_MOMENTUM');

    expect(repo.listDefinitions).toHaveBeenCalled();
    expect(listedTrend).toMatchObject({
      name: 'Persisted Trend Momentum',
      version: '9.9.0',
      definitionSource: 'PERSISTED',
    });
    expect(detail).toMatchObject({
      name: 'Persisted Trend Momentum',
      version: '9.9.0',
      definitionSource: 'PERSISTED',
    });
    expect(evaluation.strategyVersion).toBe('9.9.0');
  });

  it('falls back to registry definitions when persistence has no strategy rows', async () => {
    const repo = {
      listDefinitions: jest.fn().mockResolvedValue([]),
      latestPerformanceForStrategies: jest.fn().mockResolvedValue([]),
    };
    const fallbackService = new StrategyFrameworkService(
      repo as any,
      registry,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    const rows = await fallbackService.list({});
    const trend = rows.find((row) => row.code === 'TREND_MOMENTUM');

    expect(rows).toHaveLength(registry.list().length);
    expect(trend).toMatchObject({
      version: registry.get('TREND_MOMENTUM')?.version,
      definitionSource: 'REGISTRY_FALLBACK',
    });
    expect(trend?.definitionDrift).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'MISSING_PERSISTED_DEFINITION' }),
    ]));
  });

  it('reports checksum drift when persisted definitions differ from registry snapshots', async () => {
    const persistedDefinitions = registry.list().map((strategy) => clonedStrategy(registry, strategy.code));
    persistedDefinitions[0] = { ...persistedDefinitions[0], checksum: 'stale-checksum' };
    const repo = {
      listDefinitions: jest.fn().mockResolvedValue(persistedDefinitions),
      health: jest.fn().mockResolvedValue({
        strategiesWithBacktestResults: 0,
        missingPerformanceCount: persistedDefinitions.length,
        activeDefinitionsCount: persistedDefinitions.filter((strategy) => strategy.status === 'ACTIVE').length,
      }),
    };
    const driftService = new StrategyFrameworkService(
      repo as any,
      registry,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    const health = await driftService.health();

    expect(health.definitionSource).toBe('PERSISTED');
    expect(health.definitionDriftStatus).toBe('DRIFT_DETECTED');
    expect(health.definitionDrift).toEqual(expect.arrayContaining([
      expect.objectContaining({
        strategyCode: persistedDefinitions[0].code,
        type: 'CHECKSUM_MISMATCH',
      }),
    ]));
  });

  it('marks good active entry summaries with sufficient sample as proven', () => {
    const strategy = registry.get('TREND_MOMENTUM')!;
    const row = service.proofRow(strategy, {
      strategyCode: strategy.code,
      strategyVersion: strategy.version,
      timeframe: '3Y',
      region: 'IN',
      assetType: 'STOCK',
      universeKey: 'ALL_ELIGIBLE',
      startingCapital: 100000,
      endingCapital: 125000,
      totalReturn: 0.25,
      cagr: 0.08,
      maxDrawdown: -0.12,
      volatility: 0.18,
      sharpe: 1.2,
      winRate: 0.56,
      profitFactor: 1.4,
      tradeCount: 75,
      averageHoldingDays: 22,
      exposurePercent: 0.45,
      benchmarkCagr: 0.05,
      excessCagr: 0.03,
      dataCoveragePercent: 0.95,
      ratingScore: 82,
      ratingGrade: 'GOOD',
      automationEligibility: 'WATCHLIST_ONLY',
      readinessLabel: 'WATCHLIST_CANDIDATE',
      ratingReasons: ['Positive excess CAGR with controlled drawdown.'],
      ratingWarnings: [],
      ratingCapsApplied: [],
      generatedAt: '2026-05-13T00:00:00.000Z',
    }, { timeframe: '3Y', region: 'IN', assetType: 'STOCK' });

    expect(row.status).toBe('PROVEN');
    expect(row.sample.sampleSufficiency).toBe('SUFFICIENT');
    expect(row.missingEvidenceReason).toBeNull();
  });

  it('keeps low sample or capped evidence limited instead of proven', () => {
    const strategy = registry.get('TREND_MOMENTUM')!;
    const row = service.proofRow(strategy, {
      strategyCode: strategy.code,
      strategyVersion: strategy.version,
      timeframe: '3Y',
      region: 'IN',
      assetType: 'STOCK',
      universeKey: 'ALL_ELIGIBLE',
      startingCapital: 100000,
      endingCapital: 112000,
      totalReturn: 0.12,
      cagr: 0.04,
      maxDrawdown: -0.2,
      volatility: 0.2,
      sharpe: 0.8,
      winRate: 0.52,
      profitFactor: 1.1,
      tradeCount: 35,
      averageHoldingDays: 18,
      exposurePercent: 0.35,
      benchmarkCagr: 0.05,
      excessCagr: -0.01,
      dataCoveragePercent: 0.76,
      ratingScore: 64,
      ratingGrade: 'GOOD',
      automationEligibility: 'WATCHLIST_ONLY',
      readinessLabel: 'WATCHLIST_CANDIDATE',
      ratingWarnings: ['Coverage cap applied.'],
      ratingCapsApplied: ['LOW_COVERAGE'],
      generatedAt: '2026-05-13T00:00:00.000Z',
    }, { timeframe: '3Y', region: 'IN', assetType: 'STOCK' });

    expect(row.status).toBe('LIMITED');
    expect(row.sample.sampleSufficiency).toBe('LOW_SAMPLE');
    expect(row.rating.capsApplied).toContain('LOW_COVERAGE');
  });

  it('separates missing, draft, and structurally blocked proof rows', () => {
    expect(service.proofRow(registry.get('BREAKOUT_CONFIRMATION')!, null, { timeframe: '3Y' }).status).toBe('MISSING');
    expect(service.proofRow(registry.get('QUALITY_TREND')!, null, { timeframe: '3Y' }).status).toBe('UNPROVEN');
    const blocked = service.proofRow(registry.get('LOW_QUALITY_DATA_REJECTION')!, null, { timeframe: '3Y' });
    expect(blocked.status).toBe('BLOCKED');
    expect(blocked.missingEvidenceReason).toContain('support rules');
  });

  it('does not surface stale persisted ranking proof for active strategy versions', async () => {
    const repo = {
      rankings: jest.fn().mockResolvedValue([
        strategyPerformanceSummary({ strategyCode: 'TREND_MOMENTUM', strategyVersion: '1.0.0', ratingScore: 95 }),
      ]),
    };
    const rankingService = new StrategyFrameworkService(
      repo as any,
      registry,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    const rows = await rankingService.rankings({ timeframe: '3Y', region: 'IN', assetType: 'STOCK' });
    const trendRow = rows.find((row) => row.strategyCode === 'TREND_MOMENTUM');

    expect(trendRow).toBeDefined();
    expect(trendRow?.strategyVersion).toBe(registry.get('TREND_MOMENTUM')?.version);
    expect(rows.every((row) => row.strategyVersion === registry.get(row.strategyCode)?.version)).toBe(true);
  });

  it('keeps minRating filters when adding current-version fallback ranking rows', async () => {
    const repo = {
      rankings: jest.fn().mockResolvedValue([
        strategyPerformanceSummary({ strategyCode: 'TREND_MOMENTUM', strategyVersion: '1.0.0', ratingScore: 95, ratingGrade: 'EXCELLENT' }),
      ]),
    };
    const rankingService = new StrategyFrameworkService(
      repo as any,
      registry,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    const rows = await rankingService.rankings({ timeframe: '3Y', region: 'IN', assetType: 'STOCK', minRating: 'GOOD' });

    expect(rows.every((row) => ['GOOD', 'EXCELLENT'].includes(row.ratingGrade))).toBe(true);
    expect(rows.some((row) => row.ratingGrade === 'UNPROVEN')).toBe(false);
  });

  it('filters performance and detail summaries to the current registry version', async () => {
    const repo = {
      performance: jest.fn().mockResolvedValue([
        strategyPerformanceSummary({ strategyVersion: '1.0.0', ratingScore: 95, ratingGrade: 'EXCELLENT' }),
        strategyPerformanceSummary({ strategyVersion: registry.get('TREND_MOMENTUM')!.version, ratingScore: 72, ratingGrade: 'GOOD' }),
      ]),
    };
    const proofService = new StrategyFrameworkService(
      repo as any,
      registry,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    const performance = await proofService.performance('TREND_MOMENTUM', { timeframe: '3Y', region: 'IN', assetType: 'STOCK' });
    const detail = await proofService.detail('TREND_MOMENTUM', { timeframe: '3Y', region: 'IN', assetType: 'STOCK' });

    expect(performance.map((row) => row.strategyVersion)).toEqual([registry.get('TREND_MOMENTUM')!.version]);
    expect(detail.latestPerformanceSummaries.map((row) => row.strategyVersion)).toEqual([registry.get('TREND_MOMENTUM')!.version]);
  });

  it('treats stale proof registry and proof detail rows as missing current-version proof', async () => {
    const repo = {
      latestPerformanceForStrategies: jest.fn().mockResolvedValue([
        strategyPerformanceSummary({ strategyCode: 'TREND_MOMENTUM', strategyVersion: '1.0.0', ratingScore: 95, ratingGrade: 'EXCELLENT' }),
      ]),
      performance: jest.fn().mockResolvedValue([
        strategyPerformanceSummary({ strategyCode: 'TREND_MOMENTUM', strategyVersion: '1.0.0', ratingScore: 95, ratingGrade: 'EXCELLENT' }),
      ]),
    };
    const proofService = new StrategyFrameworkService(
      repo as any,
      registry,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    const registryResponse = await proofService.proofRegistry({ timeframe: '3Y', region: 'IN', assetType: 'STOCK' });
    const registryRow = registryResponse.rows.find((row) => row.strategyCode === 'TREND_MOMENTUM');
    const proofDetail = await proofService.proofDetail('TREND_MOMENTUM', { timeframe: '3Y', region: 'IN', assetType: 'STOCK' });

    expect(registryRow).toMatchObject({
      strategyVersion: registry.get('TREND_MOMENTUM')!.version,
      status: 'MISSING',
      latestEvaluationDate: null,
    });
    expect(proofDetail).toMatchObject({
      strategyVersion: registry.get('TREND_MOMENTUM')!.version,
      status: 'MISSING',
      latestEvaluationDate: null,
    });
  });

  it('does not count WATCH decisions as matched entry proof', async () => {
    const watchService = new StrategyFrameworkService(
      {} as any,
      registry,
      {
        getInstrument: jest.fn(),
        listInstruments: jest.fn().mockResolvedValue({ instruments: [{ id: 'stock-1', symbol: 'AAA', region: 'IN', asset_type: 'STOCK' }] }),
        listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: servicePricesForWatchDecision() }),
      } as any,
      { latestForInstrument: jest.fn().mockResolvedValue({ score: 82, direction: 'BULLISH' }) } as any,
      { latestForInstrument: jest.fn().mockResolvedValue(null) } as any,
      { diagnostics: jest.fn().mockResolvedValue({ signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true }) } as any,
      { latestPersistedSummary: jest.fn().mockResolvedValue({ regime: { regime: 'RISK_ON' }, breadth: { percentAboveSma50: 0.7 }, topSectors: [], weakSectors: [] }) } as any,
      { stock: jest.fn().mockResolvedValue(null) } as any,
    );

    const result = await watchService.evaluate({ strategyCode: 'TREND_MOMENTUM', symbol: 'AAA', region: 'IN', assetType: 'STOCK' });

    expect(result.results[0].decision).not.toBe('ENTRY_CANDIDATE');
    expect(result.results[0].eligibleForSignalGeneration).toBe(false);
    expect(result.matchedStrategies).toHaveLength(0);
  });

  it('passes latest-first bars into direct Strategy Framework evaluation', async () => {
    const breakoutService = new StrategyFrameworkService(
      {} as any,
      registry,
      {
        getInstrument: jest.fn().mockResolvedValue({ id: 'stock-1', symbol: 'ABC', region: 'IN', asset_type: 'STOCK', sector: 'Technology' }),
        listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: strategyServiceBreakoutPrices() }),
      } as any,
      { latestForInstrument: jest.fn().mockResolvedValue({ score: 85, direction: 'BULLISH' }) } as any,
      { latestForInstrument: jest.fn().mockResolvedValue(null) } as any,
      { diagnostics: jest.fn().mockResolvedValue({ signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true }) } as any,
      { latestPersistedSummary: jest.fn().mockResolvedValue({ regime: { regime: 'RISK_ON' }, breadth: { percentAboveSma50: 0.7 }, topSectors: [{ sector: 'Technology', leadershipStatus: 'LEADING', relativeStrengthScore: 72 }], weakSectors: [] }) } as any,
      { latestPersistedStock: jest.fn().mockResolvedValue({ status: 'ACCUMULATION', smartMoneyScore: 78 }) } as any,
    );

    const result = await breakoutService.evaluate({ strategyCode: 'BREAKOUT_CONFIRMATION', instrumentId: 'stock-1', region: 'IN', assetType: 'STOCK' });
    expect(result.results[0]).toMatchObject({
      strategyCode: 'BREAKOUT_CONFIRMATION',
      decision: 'ENTRY_CANDIDATE',
    });
    expect(result.results[0].entryRulesPassed).toEqual(expect.arrayContaining(['BASE_DURATION_CONFIRMED', 'VOLATILITY_CONTRACTION', 'RESISTANCE_CLOSE', 'VOLUME_BREAKOUT']));
  });

  it('uses only persisted Smart Money evidence during direct Strategy Framework evaluation', async () => {
    const latestPersistedStock = jest.fn().mockResolvedValue({ status: 'ACCUMULATION', smartMoneyScore: 78, downstreamSafe: true });
    const stock = jest.fn().mockResolvedValue({ status: 'DISTRIBUTION', smartMoneyScore: 5, evidenceProvenance: 'ON_DEMAND_DERIVED', downstreamSafe: false });
    const directService = new StrategyFrameworkService(
      {} as any,
      registry,
      {
        getInstrument: jest.fn().mockResolvedValue({ id: 'stock-1', symbol: 'ABC', region: 'IN', asset_type: 'STOCK', sector: 'Technology' }),
        listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: servicePricesForWatchDecision() }),
      } as any,
      { latestForInstrument: jest.fn().mockResolvedValue({ score: 82, direction: 'BULLISH' }) } as any,
      { latestForInstrument: jest.fn().mockResolvedValue(null) } as any,
      { diagnostics: jest.fn().mockResolvedValue({ signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true }) } as any,
      { latestPersistedSummary: jest.fn().mockResolvedValue({ regime: { regime: 'RISK_ON' }, breadth: { percentAboveSma50: 0.7 }, topSectors: [{ sector: 'Technology', leadershipStatus: 'LEADING', relativeStrengthScore: 72 }], weakSectors: [] }) } as any,
      { latestPersistedStock, stock } as any,
    );

    const result = await directService.evaluate({ strategyCode: 'TREND_MOMENTUM', instrumentId: 'stock-1', region: 'IN', assetType: 'STOCK' });
    expect(latestPersistedStock).toHaveBeenCalledWith('stock-1', '3M');
    expect(stock).not.toHaveBeenCalled();
    expect(result.results[0]).toMatchObject({
      strategyCode: 'TREND_MOMENTUM',
      decision: 'ENTRY_CANDIDATE',
    });
    expect(result.results[0].entryRulesPassed).toContain('SMART_MONEY_ACCUMULATION');
  });
});

function clonedStrategy(
  registry: StrategyFrameworkRegistry,
  code: string,
  overrides: Partial<StrategyDefinition> = {}
): StrategyDefinition {
  const strategy = registry.get(code);
  if (!strategy) throw new Error(`Missing test strategy ${code}`);
  return {
    ...strategy,
    assetTypes: [...strategy.assetTypes],
    supportedRegions: [...strategy.supportedRegions],
    requiredInputs: [...strategy.requiredInputs],
    entryRules: strategy.entryRules.map((rule) => ({ ...rule })),
    exitRules: strategy.exitRules.map((rule) => ({ ...rule })),
    invalidationRules: strategy.invalidationRules.map((rule) => ({ ...rule })),
    noiseFilters: strategy.noiseFilters.map((rule) => ({ ...rule })),
    riskRules: strategy.riskRules.map((rule) => ({ ...rule })),
    marketGateRules: strategy.marketGateRules.map((rule) => ({ ...rule })),
    parameters: { ...strategy.parameters },
    strategyRating: strategy.strategyRating ? { ...strategy.strategyRating } : strategy.strategyRating,
    examples: {
      triggers: [...strategy.examples.triggers],
      blocks: [...strategy.examples.blocks],
    },
    ...overrides,
  };
}

function servicePricesForWatchDecision() {
  const start = new Date('2026-05-28T00:00:00.000Z');
  return Array.from({ length: 260 }, (_unused, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() - index);
    const jitter = index % 2 === 0 ? 0.4 : -0.2;
    const close = index < 20 ? 108 - index * 0.3 + jitter : index < 50 ? 102 - (index - 20) * 0.1 : index < 200 ? 85 : 75;
    return { date: date.toISOString(), close, adjusted_close: close, volume: 1000 };
  });
}

function strategyPerformanceSummary(overrides: Partial<StrategyPerformanceSummaryDto> = {}): StrategyPerformanceSummaryDto {
  return {
    strategyCode: 'TREND_MOMENTUM',
    strategyVersion: '1.2.0',
    timeframe: '3Y',
    region: 'IN',
    assetType: 'STOCK',
    universeKey: 'ALL_ELIGIBLE',
    startingCapital: 100000,
    endingCapital: 125000,
    totalReturn: 0.25,
    cagr: 0.08,
    maxDrawdown: -0.12,
    volatility: 0.18,
    sharpe: 1.2,
    winRate: 0.56,
    profitFactor: 1.4,
    tradeCount: 75,
    averageHoldingDays: 22,
    exposurePercent: 0.45,
    benchmarkCagr: 0.05,
    excessCagr: 0.03,
    dataCoveragePercent: 0.95,
    ratingScore: 82,
    ratingGrade: 'GOOD',
    automationEligibility: 'WATCHLIST_ONLY',
    readinessLabel: 'WATCHLIST_CANDIDATE',
    ratingReasons: ['Positive excess CAGR with controlled drawdown.'],
    ratingWarnings: [],
    ratingCapsApplied: [],
    generatedAt: '2026-05-13T00:00:00.000Z',
    ...overrides,
  };
}

// ─── CP-constants consistency: StrategyFrameworkService.marketGate ───────────
//
// These tests verify that breadth values in the previously-divergent band
// (between old 0.6/0.3 and the CP constants 0.40/0.25) now produce the correct
// gate. Capital Posture is the single source of truth for these thresholds.

describe('StrategyFrameworkService.marketGate: CP-constant thresholds (divergent-band)', () => {
  const svc = new StrategyFrameworkService(
    {} as any, new StrategyFrameworkRegistry(),
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  ) as any;

  it('RISK_ON + breadth 0.42 → OPEN (old threshold 0.60 would have returned SELECTIVE)', () => {
    expect(svc.marketGate('RISK_ON', 0.42)).toBe('OPEN');
  });

  it('RISK_ON + breadth 0.40 (exact threshold) → OPEN', () => {
    expect(svc.marketGate('RISK_ON', 0.40)).toBe('OPEN');
  });

  it('RISK_ON + breadth 0.39 (just below BREADTH_WEAK_THRESHOLD) → SELECTIVE', () => {
    expect(svc.marketGate('RISK_ON', 0.39)).toBe('SELECTIVE');
  });

  it('RISK_ON + breadth 0.28 → SELECTIVE (old threshold 0.30 would have returned CLOSED)', () => {
    // 0.28 >= BREADTH_VERY_WEAK_THRESHOLD (0.25), so not CLOSED — SELECTIVE
    expect(svc.marketGate('RISK_ON', 0.28)).toBe('SELECTIVE');
  });

  it('RISK_OFF + any breadth → CLOSED', () => {
    expect(svc.marketGate('RISK_OFF', 0.50)).toBe('CLOSED');
  });

  it('breadth 0.24 (below BREADTH_VERY_WEAK_THRESHOLD 0.25) → CLOSED regardless of regime', () => {
    expect(svc.marketGate('RISK_ON', 0.24)).toBe('CLOSED');
    expect(svc.marketGate('NEUTRAL', 0.24)).toBe('CLOSED');
  });

  it('null regime → UNKNOWN', () => {
    expect(svc.marketGate(null, 0.50)).toBe('UNKNOWN');
  });
});

function strategyServiceBreakoutPrices() {
  const latestDate = new Date('2026-04-28T00:00:00.000Z');
  return Array.from({ length: 260 }, (_unused, index) => {
    const date = new Date(latestDate);
    date.setDate(latestDate.getDate() - index);
    const close = index === 0
      ? 121
      : index < 11
        ? 112 + index * 0.2
        : index < 21
          ? 107 + (index - 11) * 0.5
          : 110;
    return { date: date.toISOString(), close, adjusted_close: close, volume: index === 0 ? 4000 : 1000 };
  });
}
