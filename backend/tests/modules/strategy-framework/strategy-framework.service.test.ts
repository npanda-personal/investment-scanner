import { StrategyFrameworkRegistry, StrategyFrameworkService } from '../../../src/modules/strategy-framework';

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
    });

    expect(config.strategyCode).toBe('TREND_MOMENTUM');
    expect(config.mode).toBe('REGISTERED_STRATEGY');
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
});
