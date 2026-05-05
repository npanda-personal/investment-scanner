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
});
