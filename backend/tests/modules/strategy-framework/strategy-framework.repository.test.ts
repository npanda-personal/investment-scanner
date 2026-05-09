import { StrategyFrameworkRepository } from '../../../src/modules/strategy-framework';
import type { StrategyPerformanceSummaryDto } from '../../../src/modules/strategy-framework';

describe('Strategy Framework repository', () => {
  it('persists and returns strategy performance diagnostics used by rankings UI', async () => {
    const now = new Date('2026-05-09T09:00:00.000Z');
    const upsert = jest.fn(async ({ create }) => ({
      id: 'summary-1',
      ...create,
      generatedAt: create.generatedAt,
      createdAt: now,
      updatedAt: now,
    }));
    const repository = new StrategyFrameworkRepository({
      strategyPerformanceSummary: { upsert },
    } as any);

    const summary: StrategyPerformanceSummaryDto = {
      strategyCode: 'TREND_MOMENTUM',
      strategyVersion: '1.0.0',
      timeframe: '3Y',
      region: 'IN',
      assetType: 'STOCK',
      universeKey: 'ALL_ELIGIBLE',
      startingCapital: 100000,
      endingCapital: 112000,
      totalReturn: 0.12,
      cagr: 0.038,
      maxDrawdown: -0.18,
      volatility: 0.2,
      sharpe: 0.8,
      winRate: 0.55,
      profitFactor: 1.4,
      tradeCount: 42,
      averageHoldingDays: 18,
      exposurePercent: 0.65,
      benchmarkTotalReturn: 0.2,
      benchmarkCagr: 0.063,
      excessReturn: -0.08,
      excessCagr: -0.025,
      endOfTestExitPercent: 0.45,
      dataCoveragePercent: 0.91,
      ratingScore: 45,
      ratingGrade: 'WEAK',
      automationEligibility: 'WATCHLIST_ONLY',
      readinessLabel: 'WATCHLIST_CANDIDATE',
      ratingReasons: ['Strategy underperformed benchmark.'],
      ratingWarnings: ['Benchmark underperformance capped confidence.'],
      ratingCapsApplied: ['BENCHMARK_UNDERPERFORMANCE_WEAK'],
      backtestRunId: 'run-1',
      generatedAt: now.toISOString(),
    };

    const result = await repository.upsertPerformance(summary);

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        benchmarkTotalReturn: 0.2,
        benchmarkCagr: 0.063,
        excessReturn: -0.08,
        excessCagr: -0.025,
        endOfTestExitPercent: 0.45,
        dataCoveragePercent: 0.91,
        ratingWarnings: ['Benchmark underperformance capped confidence.'],
        ratingCapsApplied: ['BENCHMARK_UNDERPERFORMANCE_WEAK'],
      }),
      update: expect.objectContaining({
        ratingWarnings: ['Benchmark underperformance capped confidence.'],
        ratingCapsApplied: ['BENCHMARK_UNDERPERFORMANCE_WEAK'],
      }),
    }));
    expect(result.excessCagr).toBe(-0.025);
    expect(result.ratingWarnings).toEqual(['Benchmark underperformance capped confidence.']);
    expect(result.ratingCapsApplied).toEqual(['BENCHMARK_UNDERPERFORMANCE_WEAK']);
  });
});
