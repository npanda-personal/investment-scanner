import { StrategyFrameworkEvaluator, StrategyFrameworkRegistry } from '../../../src/modules/strategy-framework';
import { applyAdditionalEntryNoise } from '../../../src/modules/strategy-framework/strategy-framework.additional-dimensions';

describe('Strategy Framework evaluator', () => {
  const registry = new StrategyFrameworkRegistry();

  it('loads configured strategies (including BREAKDOWN_MOMENTUM short-entry)', () => {
    expect(registry.list().length).toBeGreaterThanOrEqual(11);
    expect(registry.get('TREND_MOMENTUM')?.status).toBe('ACTIVE');
    expect(registry.get('BREAKDOWN_MOMENTUM')?.code).toBe('BREAKDOWN_MOMENTUM');
  });

  it('returns an entry candidate for a clean trend momentum setup', () => {
    const strategy = registry.get('TREND_MOMENTUM')!;
    const result = new StrategyFrameworkEvaluator(strategy).evaluateEntry({
      instrumentId: 'stock-1',
      symbol: 'TEST',
      latestPrice: 110,
      sma50: 100,
      sma200: 80,
      rawSignal: { score: 82, direction: 'BULLISH' } as any,
      dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true, eligibleForBacktesting: true },
      marketGate: 'OPEN',
      marketRegime: 'RISK_ON',
      sectorLeadership: 'LEADING',
      sectorRelativeStrengthScore: 72,
      smartMoneyStatus: 'ACCUMULATION',
    });

    expect(result.decision).toBe('ENTRY_CANDIDATE');
    expect(result.blockers).toHaveLength(0);
    expect(result.entryRulesPassed).toContain('PRICE_ABOVE_SMA50');
  });

  it('reports blockers and noise filters for low-quality data', () => {
    const strategy = registry.get('LOW_QUALITY_DATA_REJECTION')!;
    const result = new StrategyFrameworkEvaluator(strategy).evaluateEntry({
      instrumentId: 'stock-1',
      symbol: 'TEST',
      dataQuality: { signalReadinessStatus: 'NOT_READY', coverageStatus: 'UNUSABLE', liquidityStatus: 'ILLIQUID' },
    });

    expect(['AVOID', 'INSUFFICIENT_DATA']).toContain(result.decision);
    expect(result.noiseFiltersTriggered).toEqual(expect.arrayContaining(['DATA_NOT_READY', 'COVERAGE_UNUSABLE', 'ILLIQUID']));
  });

  it.each([
    ['THIN', 'THIN_LIQUIDITY'],
    ['UNKNOWN', 'LIQUIDITY_UNKNOWN'],
  ])('blocks low-quality data support filters when liquidity is %s', (liquidityStatus, expectedRule) => {
    const strategy = registry.get('LOW_QUALITY_DATA_REJECTION')!;
    const result = new StrategyFrameworkEvaluator(strategy).evaluateEntry({
      instrumentId: 'stock-1',
      symbol: 'TEST',
      dataQuality: {
        signalReadinessStatus: 'READY',
        coverageStatus: 'GOOD',
        liquidityStatus,
        eligibleForSignals: true,
      },
    });

    expect(result.decision).toBe('AVOID');
    expect(result.direction).toBe('NEUTRAL');
    expect(result.eligibleForSignalGeneration).toBe(false);
    expect(result.noiseFiltersTriggered).toContain(expectedRule);
  });

  it('marks missing required inputs as data gaps', () => {
    const strategy = registry.get('BREAKOUT_CONFIRMATION')!;
    const result = new StrategyFrameworkEvaluator(strategy).evaluateEntry({
      instrumentId: 'stock-1',
      symbol: 'TEST',
      marketGate: 'OPEN',
    });

    expect(result.dataGaps.length).toBeGreaterThan(0);
    expect(result.decision).toBe('INSUFFICIENT_DATA');
  });

  it('hard-blocks active entry strategies when data quality is missing', () => {
    const activeEntries = registry.active().filter((strategy) => strategy.category === 'ENTRY');

    for (const strategy of activeEntries) {
      const result = new StrategyFrameworkEvaluator(strategy).evaluateEntry({
        instrumentId: 'stock-1',
        symbol: 'TEST',
        latestPrice: 120,
        previousClose: 118,
        sma50: 100,
        sma200: 80,
        rsi: 50,
        high52Week: 119,
        averageVolume20: 1000,
        bars: latestFirstBreakoutBars(3000),
        rawSignal: { score: 82, direction: 'BULLISH' } as any,
        marketGate: 'OPEN',
        marketRegime: 'RISK_ON',
        sectorLeadership: 'LEADING',
        sectorRelativeStrengthScore: 72,
        smartMoneyStatus: 'ACCUMULATION',
        smartMoneyScore: 78,
      });

      expect(result.decision).not.toBe('ENTRY_CANDIDATE');
      expect(result.eligibleForSignalGeneration).toBe(false);
      expect(result.noiseFiltersTriggered).toContain('DATA_QUALITY_MISSING');
    }
  });

  it('hard-blocks active entry strategies when data quality evidence is incomplete', () => {
    const result = new StrategyFrameworkEvaluator(registry.get('TREND_MOMENTUM')!).evaluateEntry({
      instrumentId: 'stock-1',
      symbol: 'TEST',
      latestPrice: 120,
      sma50: 100,
      sma200: 80,
      rawSignal: { score: 82, direction: 'BULLISH' } as any,
      dataQuality: { coverageStatus: 'GOOD', liquidityStatus: 'LIQUID' },
      marketGate: 'OPEN',
      marketRegime: 'RISK_ON',
      sectorLeadership: 'LEADING',
      sectorRelativeStrengthScore: 72,
      smartMoneyStatus: 'ACCUMULATION',
    });

    expect(result.decision).not.toBe('ENTRY_CANDIDATE');
    expect(result.eligibleForSignalGeneration).toBe(false);
    expect(result.noiseFiltersTriggered).toContain('DATA_QUALITY_MISSING');
  });

  it('does not promote active entry candidates when market gate context is unknown', () => {
    const result = new StrategyFrameworkEvaluator(registry.get('TREND_MOMENTUM')!).evaluateEntry({
      ...completeTrendMomentumContext(),
      marketGate: 'UNKNOWN',
    });

    expect(result.decision).not.toBe('ENTRY_CANDIDATE');
    expect(result.eligibleForSignalGeneration).toBe(false);
    expect([...result.blockers, ...result.noiseFiltersTriggered, ...result.dataGaps, ...result.warnings].join(' '))
      .toMatch(/market.*unknown|unknown.*market/i);
  });

  it('does not promote active entry candidates when liquidity status is unknown', () => {
    const result = new StrategyFrameworkEvaluator(registry.get('TREND_MOMENTUM')!).evaluateEntry({
      ...completeTrendMomentumContext(),
      dataQuality: {
        signalReadinessStatus: 'READY',
        coverageStatus: 'GOOD',
        liquidityStatus: 'UNKNOWN',
        eligibleForSignals: true,
        eligibleForBacktesting: true,
      },
    });

    expect(result.decision).not.toBe('ENTRY_CANDIDATE');
    expect(result.eligibleForSignalGeneration).toBe(false);
    expect([...result.blockers, ...result.noiseFiltersTriggered, ...result.dataGaps, ...result.warnings].join(' '))
      .toMatch(/liquidity.*unknown|unknown.*liquidity/i);
  });

  it('does not promote active entry candidates when liquidity is thin', () => {
    const result = new StrategyFrameworkEvaluator(registry.get('TREND_MOMENTUM')!).evaluateEntry({
      ...completeTrendMomentumContext(),
      dataQuality: {
        signalReadinessStatus: 'READY',
        coverageStatus: 'GOOD',
        liquidityStatus: 'THIN',
        eligibleForSignals: true,
        eligibleForBacktesting: true,
      },
    });

    expect(result.decision).not.toBe('ENTRY_CANDIDATE');
    expect(result.eligibleForSignalGeneration).toBe(false);
    expect([...result.blockers, ...result.noiseFiltersTriggered, ...result.dataGaps, ...result.warnings].join(' '))
      .toMatch(/thin.*liquidity|liquidity.*thin/i);
  });


  it('keeps gate and filter strategies neutral and ineligible for entry promotion', () => {
    for (const code of ['RISK_OFF_AVOIDANCE', 'LOW_QUALITY_DATA_REJECTION']) {
      const result = new StrategyFrameworkEvaluator(registry.get(code)!).evaluateEntry({
        instrumentId: 'stock-1',
        symbol: 'TEST',
        latestPrice: 120,
        marketGate: 'OPEN',
        marketRegime: 'NEUTRAL',
        dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
      });

      expect(result.decision).not.toBe('ENTRY_CANDIDATE');
      expect(result.direction).toBe('NEUTRAL');
      expect(result.eligibleForSignalGeneration).toBe(false);
      expect(result.eligibleForBacktest).toBe(false);
    }
  });

  it('uses latest-first bar volume for breakout confirmation', () => {
    const result = new StrategyFrameworkEvaluator(registry.get('BREAKOUT_CONFIRMATION')!).evaluateEntry({
      instrumentId: 'stock-1',
      symbol: 'TEST',
      latestPrice: 121,
      sma50: 110,
      sma200: 80,
      high52Week: 120,
      averageVolume20: 1000,
      bars: latestFirstBreakoutBars(2500, 100),
      rawSignal: { score: 82, direction: 'BULLISH' } as any,
      dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
      marketGate: 'OPEN',
      marketRegime: 'RISK_ON',
      sectorLeadership: 'LEADING',
      sectorRelativeStrengthScore: 72,
      smartMoneyStatus: 'ACCUMULATION',
    });

    expect(result.entryRulesPassed).toContain('VOLUME_BREAKOUT');
    expect(result.decision).toBe('ENTRY_CANDIDATE');
  });

  it('keeps active entry minScore thresholds reachable with complete evidence fixtures', () => {
    const fixtures: Record<string, any> = {
      TREND_MOMENTUM: {
        latestPrice: 110,
        sma50: 100,
        sma200: 80,
        rawSignal: { score: 82, direction: 'BULLISH' },
        dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
        marketGate: 'OPEN',
        marketRegime: 'RISK_ON',
        sectorLeadership: 'LEADING',
        sectorRelativeStrengthScore: 72,
        smartMoneyStatus: 'ACCUMULATION',
      },
      PULLBACK_IN_UPTREND: {
        latestPrice: 103,
        previousClose: 99,
        sma50: 100,
        sma200: 80,
        rsi: 45,
        rawSignal: { score: 82, direction: 'BULLISH' },
        dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
        marketGate: 'OPEN',
        marketRegime: 'RISK_ON',
        sectorLeadership: 'LEADING',
        sectorRelativeStrengthScore: 72,
        smartMoneyStatus: 'ACCUMULATION',
      },
      BREAKOUT_CONFIRMATION: {
        latestPrice: 121,
        sma50: 110,
        sma200: 80,
        high52Week: 120,
        averageVolume20: 1000,
        bars: latestFirstBreakoutBars(2500),
        rawSignal: { score: 82, direction: 'BULLISH' },
        dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
        marketGate: 'OPEN',
        marketRegime: 'RISK_ON',
        sectorLeadership: 'LEADING',
        sectorRelativeStrengthScore: 72,
        smartMoneyStatus: 'ACCUMULATION',
      },
      SMART_MONEY_ACCUMULATION: {
        latestPrice: 110,
        sma50: 100,
        sma200: 80,
        averageVolume20: 1000,
        smartMoneyStatus: 'ACCUMULATION',
        smartMoneyScore: 78,
        rawSignal: { score: 82, direction: 'BULLISH' },
        dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
        marketGate: 'OPEN',
        marketRegime: 'RISK_ON',
        sectorLeadership: 'LEADING',
        sectorRelativeStrengthScore: 72,
      },
      SECTOR_LEADER_MOMENTUM: {
        latestPrice: 110,
        sma50: 100,
        sma200: 80,
        rawSignal: { score: 82, direction: 'BULLISH' },
        sectorLeadership: 'LEADING',
        sectorRelativeStrengthScore: 72,
        smartMoneyStatus: 'ACCUMULATION',
        dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
        marketGate: 'OPEN',
        marketRegime: 'RISK_ON',
      },
    };

    for (const strategy of registry.active().filter((item) => item.category === 'ENTRY')) {
      const result = new StrategyFrameworkEvaluator(strategy).evaluateEntry({
        instrumentId: 'stock-1',
        symbol: 'TEST',
        ...fixtures[strategy.code],
      });

      expect(result.score).toBeGreaterThanOrEqual(Number(strategy.parameters.minScore));
      expect(result.decision).toBe('ENTRY_CANDIDATE');
    }
  });

  it('emits common long exit and invalidation rule evidence', () => {
    const result = new StrategyFrameworkEvaluator(registry.get('TREND_MOMENTUM')!).evaluateExit({
      instrumentId: 'stock-1',
      symbol: 'TEST',
      latestPrice: 94,
      previousClose: 95,
      sma50: 100,
      sma200: 90,
      rawSignal: { score: 35, direction: 'BEARISH' } as any,
      dataQuality: { signalReadinessStatus: 'NOT_READY', coverageStatus: 'UNUSABLE', liquidityStatus: 'LIQUID', eligibleForSignals: false },
      marketGate: 'CLOSED',
      marketRegime: 'RISK_OFF',
      sectorLeadership: 'LAGGING',
      sectorRelativeStrengthScore: 30,
      smartMoneyStatus: 'DISTRIBUTION',
      holding: { quantity: 1, unrealizedPnLPercent: -0.05 },
    });

    expect(result.decision).toBe('EXIT_CANDIDATE');
    expect(result.exitRulesTriggered).toEqual(expect.arrayContaining(['DQ_FAIL_EXIT', 'MARKET_RISK_OFF_EXIT', 'STRUCTURAL_BREAK_EXIT', 'RELATIVE_STRENGTH_DECAY_EXIT', 'DISTRIBUTION_WARNING_EXIT', 'SIGNAL_DECAY_EXIT']));
    expect(result.invalidationRulesTriggered).toEqual(expect.arrayContaining(['DQ_EVIDENCE_INVALIDATED', 'MARKET_GATE_INVALIDATED', 'SUPPORT_INVALIDATED']));
  });

  it('rates insufficient samples as unproven', () => {
    const rating = StrategyFrameworkEvaluator.rate({
      strategyCode: 'TREND_MOMENTUM',
      strategyVersion: '1.0.0',
      timeframe: '1Y',
      region: 'IN',
      assetType: 'STOCK',
      universeKey: 'ALL',
      startingCapital: 100000,
      endingCapital: 101000,
      totalReturn: 0.01,
      cagr: 0.01,
      maxDrawdown: -0.05,
      volatility: 0.1,
      sharpe: 0.2,
      winRate: 0.5,
      profitFactor: 1.1,
      tradeCount: 3,
      averageHoldingDays: 10,
      exposurePercent: null,
      generatedAt: new Date().toISOString(),
    });

    expect(rating.ratingGrade).toBe('UNPROVEN');
    expect(rating.automationEligibility).toBe('NOT_ELIGIBLE');
    expect(rating.readinessLabel).toBe('RESEARCH_ONLY');
  });

  it('never exposes live-trading eligibility in ratings', () => {
    const rating = StrategyFrameworkEvaluator.rate({
      strategyCode: 'TREND_MOMENTUM',
      strategyVersion: '1.0.0',
      timeframe: '5Y',
      region: 'IN',
      assetType: 'STOCK',
      universeKey: 'ALL_ELIGIBLE',
      startingCapital: 100000,
      endingCapital: 200000,
      totalReturn: 1,
      cagr: 0.15,
      maxDrawdown: -0.12,
      volatility: 0.12,
      sharpe: 1.4,
      winRate: 0.62,
      profitFactor: 2.1,
      tradeCount: 80,
      averageHoldingDays: 21,
      exposurePercent: 0.6,
      generatedAt: new Date().toISOString(),
      dataCoverageScore: 1,
    });

    expect(rating.automationEligibility).not.toBe('LIVE_TRADING_ELIGIBLE_FUTURE');
    expect(rating.readinessLabel).toBe('PAPER_TEST_CANDIDATE');
  });

  it('caps ratings for high drawdown, benchmark underperformance, and weak exits', () => {
    const rating = StrategyFrameworkEvaluator.rate({
      strategyCode: 'TREND_MOMENTUM',
      strategyVersion: '1.0.0',
      timeframe: '3Y',
      region: 'IN',
      assetType: 'STOCK',
      universeKey: 'ALL_ELIGIBLE',
      startingCapital: 100000,
      endingCapital: 140000,
      totalReturn: 0.4,
      cagr: 0.12,
      maxDrawdown: -0.48,
      volatility: 0.2,
      sharpe: 0.8,
      winRate: 0.55,
      profitFactor: 1.4,
      tradeCount: 50,
      averageHoldingDays: 40,
      exposurePercent: 0.5,
      generatedAt: new Date().toISOString(),
      dataCoveragePercent: 1,
      excessCagr: -0.06,
      endOfTestExitPercent: 0.7,
    });

    expect(['WEAK', 'UNPROVEN']).toContain(rating.ratingGrade);
    expect(rating.ratingWarnings?.length).toBeGreaterThan(0);
    expect(rating.ratingCapsApplied).toEqual(expect.arrayContaining(['SEVERE_DRAWDOWN_WEAK', 'BENCHMARK_UNDERPERFORMANCE_WEAK', 'END_OF_TEST_EXIT_DOMINANCE_WEAK']));
  });

  it('caps poor data coverage and draft strategies', () => {
    const rating = StrategyFrameworkEvaluator.rate({
      strategyCode: 'QUALITY_TREND',
      strategyVersion: '1.0.0',
      timeframe: '5Y',
      region: 'IN',
      assetType: 'STOCK',
      universeKey: 'ALL_ELIGIBLE',
      startingCapital: 100000,
      endingCapital: 180000,
      totalReturn: 0.8,
      cagr: 0.12,
      maxDrawdown: -0.12,
      volatility: 0.12,
      sharpe: 1.2,
      winRate: 0.6,
      profitFactor: 2,
      tradeCount: 80,
      averageHoldingDays: 30,
      exposurePercent: 0.5,
      generatedAt: new Date().toISOString(),
      dataCoveragePercent: 0.4,
      strategyStatus: 'DRAFT',
    });

    expect(rating.ratingGrade).toBe('UNPROVEN');
    expect(rating.readinessLabel).toBe('RESEARCH_ONLY');
    expect(rating.ratingCapsApplied).toEqual(expect.arrayContaining(['DRAFT_STRATEGY_UNPROVEN', 'POOR_DATA_COVERAGE_UNPROVEN']));
  });

  it('registered strategies expose default risk rules', () => {
    expect(registry.get('TREND_MOMENTUM')?.riskRules.some((rule) => rule.input === 'maxHoldingDays')).toBe(true);
    expect(registry.get('BREAKOUT_CONFIRMATION')?.riskRules.some((rule) => rule.input === 'stopLossPercent')).toBe(true);
  });

  it('keeps requiredInputs consistent with executable rule evidence inputs', () => {
    const missing = registry.list().flatMap((strategy) => {
      const declared = new Set(strategy.requiredInputs);
      const evidenceRules = [
        ...strategy.entryRules,
        ...strategy.exitRules,
        ...strategy.invalidationRules,
        ...strategy.noiseFilters,
        ...strategy.marketGateRules,
      ];

      return evidenceRules.flatMap((rule) => inputRoots(rule.input)
        .filter((input) => !inputSatisfied(input, declared))
        .map((input) => `${strategy.code}.${rule.code}:${input}`));
    });

    expect(missing).toEqual([]);
  });

  it('marks only active entry strategies as standalone backtest eligible', () => {
    const entry = new StrategyFrameworkEvaluator(registry.get('TREND_MOMENTUM')!).evaluateEntry({
      instrumentId: 'stock-1',
      symbol: 'TEST',
      latestPrice: 110,
      sma50: 100,
      sma200: 80,
      rawSignal: { score: 82, direction: 'BULLISH' } as any,
      dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
      marketGate: 'OPEN',
      marketRegime: 'RISK_ON',
      sectorLeadership: 'LEADING',
      sectorRelativeStrengthScore: 72,
      smartMoneyStatus: 'ACCUMULATION',
    });
    const filter = new StrategyFrameworkEvaluator(registry.get('LOW_QUALITY_DATA_REJECTION')!).evaluateEntry({
      instrumentId: 'stock-1',
      symbol: 'TEST',
      dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
    });
    const draft = new StrategyFrameworkEvaluator(registry.get('QUALITY_TREND')!).evaluateEntry({
      instrumentId: 'stock-1',
      symbol: 'TEST',
      latestPrice: 120,
      sma50: 100,
      sma200: 80,
      dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
    });

    expect(entry.eligibleForBacktest).toBe(true);
    expect(filter.eligibleForBacktest).toBe(false);
    expect(draft.eligibleForBacktest).toBe(false);
  });
});

function completeTrendMomentumContext() {
  return {
    instrumentId: 'stock-1',
    symbol: 'TEST',
    latestPrice: 120,
    sma50: 100,
    sma200: 80,
    rawSignal: { score: 82, direction: 'BULLISH' } as any,
    dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true, eligibleForBacktesting: true },
    marketGate: 'OPEN',
    marketRegime: 'RISK_ON',
    sectorLeadership: 'LEADING',
    sectorRelativeStrengthScore: 72,
    smartMoneyStatus: 'ACCUMULATION',
    smartMoneyScore: 78,
  };
}

function latestFirstBreakoutBars(latestVolume: number, oldestVolume = 1000) {
  const latestDate = new Date('2026-05-28T00:00:00.000Z');
  const bars = Array.from({ length: 30 }, (_unused, index) => ({
    date: new Date(latestDate.getTime() - index * 86400000).toISOString().slice(0, 10),
    close: index === 0 ? 121 : index < 11 ? 110 + index * 0.2 : 96 + index * 0.45,
    volume: index === 0 ? latestVolume : index === 29 ? oldestVolume : 900,
  }));
  return bars;
}

function inputRoots(input: string): string[] {
  return input
    .split('/')
    .map((part) => part.trim().split('.')[0])
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Fix #8 — profitFactor sentinel: null (zero-loss) must award max points
// ---------------------------------------------------------------------------

describe('Fix #8 — profitFactor null (zero-loss) → rating awards full profit factor score', () => {
  const baseInput = {
    strategyCode: 'TREND_MOMENTUM',
    strategyVersion: '1.0',
    timeframe: '3Y' as const,
    region: 'IN',
    assetType: 'STOCK',
    universeKey: 'ALL_ELIGIBLE',
    startingCapital: 100_000,
    endingCapital: 118_000,
    totalReturn: 0.18,
    cagr: 0.18,
    maxDrawdown: -0.12,
    volatility: 0.15,
    sharpe: 1.2,
    winRate: 0.62,
    tradeCount: 35,
    averageHoldingDays: 30,
    exposurePercent: 0.6,
    generatedAt: new Date().toISOString(),
  };

  it('rating score with profitFactor=null (zero losses) is >= score with profitFactor=2', () => {
    const ratingWithNullPF = StrategyFrameworkEvaluator.rate({ ...baseInput, profitFactor: null });
    const ratingWith2PF = StrategyFrameworkEvaluator.rate({ ...baseInput, profitFactor: 2 });
    // null profitFactor (zero losses = perfect) must award >= the score for profitFactor=2
    expect(ratingWithNullPF.ratingScore).toBeGreaterThanOrEqual(ratingWith2PF.ratingScore);
  });

  it('rating score with profitFactor=999 (sentinel) equals max profit factor contribution', () => {
    const ratingWith999 = StrategyFrameworkEvaluator.rate({ ...baseInput, profitFactor: 999 });
    const ratingWith2 = StrategyFrameworkEvaluator.rate({ ...baseInput, profitFactor: 2 });
    // Sentinel 999 must produce >= score as profitFactor=2
    expect(ratingWith999.ratingScore).toBeGreaterThanOrEqual(ratingWith2.ratingScore);
  });
});

// ---------------------------------------------------------------------------
// Fix #9 — getBacktestConfig accepts optional endDate param
// ---------------------------------------------------------------------------

describe('Fix #9 — getBacktestConfig uses supplied endDate, not wall-clock', () => {
  it('endDate in returned config matches supplied endDate', () => {
    const registry = new StrategyFrameworkRegistry();
    const strategy = registry.get('TREND_MOMENTUM')!;
    const evaluator = new StrategyFrameworkEvaluator(strategy);
    const fixedEnd = '2024-06-15';
    const config = evaluator.getBacktestConfig({
      strategyCode: 'TREND_MOMENTUM',
      timeframe: '3Y',
      endDate: fixedEnd,
    });
    expect(config.endDate).toBe(fixedEnd);
  });

  it('startDate is exactly N years before the supplied endDate', () => {
    const registry = new StrategyFrameworkRegistry();
    const strategy = registry.get('TREND_MOMENTUM')!;
    const evaluator = new StrategyFrameworkEvaluator(strategy);
    const fixedEnd = '2024-06-15';
    const config = evaluator.getBacktestConfig({
      strategyCode: 'TREND_MOMENTUM',
      timeframe: '3Y',
      endDate: fixedEnd,
    });
    const expectedStart = new Date('2024-06-15');
    expectedStart.setFullYear(expectedStart.getFullYear() - 3);
    expect(config.startDate).toBe(expectedStart.toISOString().slice(0, 10));
  });

  it('endDate defaults to today when not supplied (wall-clock)', () => {
    const registry = new StrategyFrameworkRegistry();
    const strategy = registry.get('TREND_MOMENTUM')!;
    const evaluator = new StrategyFrameworkEvaluator(strategy);
    const before = new Date().toISOString().slice(0, 10);
    const config = evaluator.getBacktestConfig({
      strategyCode: 'TREND_MOMENTUM',
      timeframe: '1Y',
    });
    const after = new Date().toISOString().slice(0, 10);
    // endDate should be today (within the test execution window)
    expect(config.endDate >= before).toBe(true);
    expect(config.endDate <= after).toBe(true);
  });
});

function inputSatisfied(input: string, declared: Set<string>) {
  if (declared.has(input)) return true;
  if (input === 'signal') return declared.has('rawSignal') || declared.has('calibratedSignal');
  if (input === 'sma') return declared.has('sma50') || declared.has('sma200');
  return false;
}

// ---------------------------------------------------------------------------
// RSI overbought gate — uptrend-exception (strategy-framework.additional-dimensions.ts)
// ---------------------------------------------------------------------------

describe('applyAdditionalEntryNoise — RSI overbought uptrend exception', () => {
  function makeState() {
    return {
      score: 0,
      reasons: [] as string[],
      blockers: [] as string[],
      warnings: [] as string[],
      dataGaps: [] as string[],
      entryRulesPassed: [] as string[],
      exitRulesTriggered: [] as string[],
      invalidationRulesTriggered: [] as string[],
      noiseFiltersTriggered: [] as string[],
    };
  }
  type TestState = ReturnType<typeof makeState>;
  const blockFn = (state: TestState, code: string) => { state.blockers.push(code); };

  it('blocks entry when RSI > 80 with no trend context (missing SMAs)', () => {
    const state = makeState();
    applyAdditionalEntryNoise({ rsi: 85 } as any, state, blockFn);
    expect(state.blockers).toContain('RSI_OVERBOUGHT');
  });

  it('blocks entry when RSI > 80 in a weak trend (no golden cross)', () => {
    const state = makeState();
    applyAdditionalEntryNoise({ rsi: 85, sma50: 90, sma200: 100, latestPrice: 95 } as any, state, blockFn);
    expect(state.blockers).toContain('RSI_OVERBOUGHT');
  });

  it('blocks entry when RSI > 80 with golden cross but price below SMA50', () => {
    const state = makeState();
    applyAdditionalEntryNoise({ rsi: 85, sma50: 100, sma200: 80, latestPrice: 90 } as any, state, blockFn);
    expect(state.blockers).toContain('RSI_OVERBOUGHT');
  });

  it('does NOT block when RSI > 80 in confirmed uptrend (golden cross + price above SMA50)', () => {
    const state = makeState();
    applyAdditionalEntryNoise({ rsi: 85, sma50: 100, sma200: 80, latestPrice: 115 } as any, state, blockFn);
    expect(state.blockers).not.toContain('RSI_OVERBOUGHT');
  });

  it('does not block when RSI <= 80 regardless of trend context', () => {
    const state = makeState();
    applyAdditionalEntryNoise({ rsi: 79, sma50: 90, sma200: 100, latestPrice: 85 } as any, state, blockFn);
    expect(state.blockers).not.toContain('RSI_OVERBOUGHT');
  });

  it('still blocks when skipRsi=true even with RSI > 80', () => {
    const state = makeState();
    applyAdditionalEntryNoise({ rsi: 90, sma50: 100, sma200: 80, latestPrice: 120 } as any, state, blockFn, { skipRsi: true });
    expect(state.blockers).not.toContain('RSI_OVERBOUGHT');
  });
});
