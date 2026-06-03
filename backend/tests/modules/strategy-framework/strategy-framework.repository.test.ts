import { StrategyFrameworkRepository } from '../../../src/modules/strategy-framework';
import type { StrategyDefinition, StrategyPerformanceSummaryDto } from '../../../src/modules/strategy-framework';

describe('Strategy Framework repository', () => {
  it('persists strategy definitions by strategyCode and strategyVersion with invalidation rules', async () => {
    const upsert = jest.fn(async ({ create }) => ({
      id: 'definition-1',
      ...create,
      createdAt: new Date('2026-06-02T00:00:00.000Z'),
      updatedAt: new Date('2026-06-02T00:00:00.000Z'),
    }));
    const repository = new StrategyFrameworkRepository({
      strategyDefinition: { upsert },
    } as any);

    await repository.upsertDefinitions([strategyDefinitionFixture({
      code: 'TREND_MOMENTUM',
      version: '1.2.0',
      invalidationRules: [ruleFixture('SUPPORT_INVALIDATED')],
    })]);

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        strategyCode_strategyVersion: {
          strategyCode: 'TREND_MOMENTUM',
          strategyVersion: '1.2.0',
        },
      },
      create: expect.objectContaining({
        strategyCode: 'TREND_MOMENTUM',
        strategyVersion: '1.2.0',
        invalidationRules: [expect.objectContaining({ code: 'SUPPORT_INVALIDATED' })],
        entryRules: expect.any(Array),
        exitRules: expect.any(Array),
        noiseFilters: expect.any(Array),
        readinessLabel: 'RESEARCH_ONLY',
        checksum: expect.any(String),
        effectiveAt: expect.any(Date),
      }),
      update: expect.objectContaining({
        strategyCode: 'TREND_MOMENTUM',
        strategyVersion: '1.2.0',
        invalidationRules: [expect.objectContaining({ code: 'SUPPORT_INVALIDATED' })],
        checksum: expect.any(String),
      }),
    }));
    expect(upsert.mock.calls[0][0].update.effectiveAt).toBeUndefined();
  });

  it('preserves version history when a newer registry version is seeded', async () => {
    const { db } = strategyDefinitionDb();
    const repository = new StrategyFrameworkRepository(db as any);

    await repository.upsertDefinitions([strategyDefinitionFixture({
      code: 'TREND_MOMENTUM',
      version: '1.0.0',
      invalidationRules: [ruleFixture('V1_INVALIDATION')],
    })]);
    await repository.upsertDefinitions([strategyDefinitionFixture({
      code: 'TREND_MOMENTUM',
      version: '2.0.0',
      invalidationRules: [ruleFixture('V2_INVALIDATION')],
    })]);

    const rows = await repository.listDefinitions({});
    const v1 = await repository.getDefinition('TREND_MOMENTUM', '1.0.0');
    const v2 = await repository.getDefinition('TREND_MOMENTUM', '2.0.0');

    expect(rows.map((row) => row.version).sort()).toEqual(['1.0.0', '2.0.0']);
    expect(v1?.invalidationRules.map((rule) => rule.code)).toEqual(['V1_INVALIDATION']);
    expect(v2?.invalidationRules.map((rule) => rule.code)).toEqual(['V2_INVALIDATION']);
  });

  it('returns persisted invalidation rules and revision metadata from repository reads', async () => {
    const { db } = strategyDefinitionDb();
    const repository = new StrategyFrameworkRepository(db as any);

    await repository.upsertDefinitions([strategyDefinitionFixture({
      code: 'BREAKOUT_CONFIRMATION',
      version: '1.2.0',
      invalidationRules: [ruleFixture('FAILED_BREAKOUT')],
      readinessLabel: 'WATCHLIST_CANDIDATE',
    })]);

    const row = await repository.getDefinition('BREAKOUT_CONFIRMATION', '1.2.0');

    expect(row).toMatchObject({
      code: 'BREAKOUT_CONFIRMATION',
      version: '1.2.0',
      readinessLabel: 'WATCHLIST_CANDIDATE',
    });
    expect(row?.invalidationRules).toEqual([expect.objectContaining({ code: 'FAILED_BREAKOUT' })]);
    expect(row?.checksum).toEqual(expect.any(String));
    expect(row?.effectiveAt).toEqual(expect.any(String));
  });

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

function ruleFixture(code: string) {
  return {
    code,
    label: `${code} label`,
    input: 'latestPrice/sma50',
    kind: 'BLOCKS' as const,
    threshold: true,
  };
}

function strategyDefinitionFixture(overrides: Partial<StrategyDefinition> = {}): StrategyDefinition {
  return {
    code: 'TREND_MOMENTUM',
    name: 'Trend Momentum',
    description: 'Fixture strategy.',
    category: 'ENTRY',
    style: 'MOMENTUM',
    timeframe: 'DAILY_SWING',
    assetTypes: ['STOCK'],
    supportedRegions: ['IN'],
    version: '1.0.0',
    status: 'ACTIVE',
    requiredInputs: ['latestPrice'],
    entryRules: [ruleFixture('ENTRY_RULE')],
    exitRules: [ruleFixture('EXIT_RULE')],
    invalidationRules: [ruleFixture('INVALIDATION_RULE')],
    noiseFilters: [ruleFixture('NOISE_FILTER')],
    riskRules: [ruleFixture('RISK_RULE')],
    marketGateRules: [ruleFixture('MARKET_GATE_RULE')],
    parameters: { minScore: 75 },
    explanationTemplate: 'Fixture explanation.',
    examples: { triggers: [], blocks: [] },
    ...overrides,
  };
}

function strategyDefinitionDb() {
  const rows: any[] = [];
  const now = new Date('2026-06-02T00:00:00.000Z');
  return {
    rows,
    db: {
      strategyDefinition: {
        upsert: jest.fn(async ({ where, create, update }) => {
          const key = where.strategyCode_strategyVersion;
          const existingIndex = rows.findIndex((row) => row.strategyCode === key.strategyCode && row.strategyVersion === key.strategyVersion);
          if (existingIndex >= 0) {
            rows[existingIndex] = { ...rows[existingIndex], ...update, updatedAt: now };
            return rows[existingIndex];
          }
          const row = {
            id: `definition-${rows.length + 1}`,
            ...create,
            createdAt: now,
            updatedAt: now,
          };
          rows.push(row);
          return row;
        }),
        findMany: jest.fn(async ({ where }) => rows.filter((row) => {
          if (where?.status && row.status !== where.status) return false;
          if (where?.category && row.category !== where.category) return false;
          if (where?.style && row.style !== where.style) return false;
          return true;
        })),
        findUnique: jest.fn(async ({ where }) => {
          const key = where.strategyCode_strategyVersion;
          return rows.find((row) => row.strategyCode === key.strategyCode && row.strategyVersion === key.strategyVersion) ?? null;
        }),
        findFirst: jest.fn(async ({ where }) => rows.filter((row) => row.strategyCode === where.strategyCode).at(-1) ?? null),
      },
    },
  };
}
