import { StrategyFrameworkEvaluator, StrategyFrameworkRegistry } from '../../../src/modules/strategy-framework';

describe('Strategy Framework evaluator', () => {
  const registry = new StrategyFrameworkRegistry();

  it('loads ten configured strategies', () => {
    expect(registry.list()).toHaveLength(10);
    expect(registry.get('TREND_MOMENTUM')?.status).toBe('ACTIVE');
  });

  it('returns an entry candidate for a clean trend momentum setup', () => {
    const strategy = registry.get('TREND_MOMENTUM')!;
    const result = new StrategyFrameworkEvaluator(strategy).evaluateEntry({
      instrumentId: 'stock-1',
      symbol: 'TEST',
      latestPrice: 120,
      sma50: 100,
      sma200: 80,
      rawSignal: { score: 82, direction: 'BULLISH' } as any,
      dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true, eligibleForBacktesting: true },
      marketGate: 'OPEN',
      sectorLeadership: 'LEADING',
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
      sectorLeadership: 'LEADING',
      sectorRelativeStrengthScore: 72,
      smartMoneyStatus: 'ACCUMULATION',
    });

    expect(result.decision).not.toBe('ENTRY_CANDIDATE');
    expect(result.eligibleForSignalGeneration).toBe(false);
    expect(result.noiseFiltersTriggered).toContain('DATA_QUALITY_MISSING');
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
      high52Week: 120,
      averageVolume20: 1000,
      bars: latestFirstBreakoutBars(2500, 100),
      rawSignal: { score: 82, direction: 'BULLISH' } as any,
      dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
      marketGate: 'OPEN',
    });

    expect(result.entryRulesPassed).toContain('VOLUME_BREAKOUT');
    expect(result.decision).toBe('ENTRY_CANDIDATE');
  });

  it('keeps active entry minScore thresholds reachable with complete evidence fixtures', () => {
    const fixtures: Record<string, any> = {
      TREND_MOMENTUM: {
        latestPrice: 120,
        sma50: 100,
        sma200: 80,
        rawSignal: { score: 82, direction: 'BULLISH' },
        dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
        marketGate: 'OPEN',
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
        dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
        marketGate: 'OPEN',
      },
      BREAKOUT_CONFIRMATION: {
        latestPrice: 121,
        sma50: 110,
        high52Week: 120,
        averageVolume20: 1000,
        bars: latestFirstBreakoutBars(2500),
        rawSignal: { score: 82, direction: 'BULLISH' },
        dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
        marketGate: 'OPEN',
      },
      SMART_MONEY_ACCUMULATION: {
        latestPrice: 120,
        sma50: 100,
        averageVolume20: 1000,
        smartMoneyStatus: 'ACCUMULATION',
        smartMoneyScore: 78,
        dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
        marketGate: 'OPEN',
      },
      SECTOR_LEADER_MOMENTUM: {
        latestPrice: 120,
        sma50: 100,
        sma200: 80,
        rawSignal: { score: 82, direction: 'BULLISH' },
        sectorLeadership: 'LEADING',
        sectorRelativeStrengthScore: 72,
        dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
        marketGate: 'OPEN',
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

  it('marks only active entry strategies as standalone backtest eligible', () => {
    const entry = new StrategyFrameworkEvaluator(registry.get('TREND_MOMENTUM')!).evaluateEntry({
      instrumentId: 'stock-1',
      symbol: 'TEST',
      latestPrice: 120,
      sma50: 100,
      sma200: 80,
      rawSignal: { score: 82, direction: 'BULLISH' } as any,
      dataQuality: { signalReadinessStatus: 'READY', coverageStatus: 'GOOD', liquidityStatus: 'LIQUID', eligibleForSignals: true },
      marketGate: 'OPEN',
      sectorLeadership: 'LEADING',
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

function latestFirstBreakoutBars(latestVolume: number, oldestVolume = 1000) {
  const latestDate = new Date('2026-05-28T00:00:00.000Z');
  const bars = Array.from({ length: 30 }, (_unused, index) => ({
    date: new Date(latestDate.getTime() - index * 86400000).toISOString().slice(0, 10),
    close: index === 0 ? 121 : index < 11 ? 110 + index * 0.2 : 96 + index * 0.45,
    volume: index === 0 ? latestVolume : index === 29 ? oldestVolume : 900,
  }));
  return bars;
}
