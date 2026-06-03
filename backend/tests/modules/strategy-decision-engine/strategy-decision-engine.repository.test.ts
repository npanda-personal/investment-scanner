/// <reference types="@types/jest" />
import { StrategyDecisionEngineRepository } from '../../../src/modules/strategy-decision-engine/strategy-decision-engine.repository';
import type { StrategyDecisionDto } from '../../../src/modules/strategy-decision-engine/strategy-decision-engine.types';

const makeDecision = (): StrategyDecisionDto => ({
  instrumentId: 'stock-1',
  symbol: 'ABC.NS',
  exchange: 'NSE',
  strategy: 'TREND_MOMENTUM',
  strategyName: 'Trend Momentum',
  decision: 'WATCH',
  action: 'WAIT_FOR_CONFIRMATION',
  decisionScore: 70,
  scoreBreakdown: {
    marketContext: 0,
    signalStrength: 21,
    trendTechnical: 25,
    dataQuality: 15,
    sectorSmartMoney: 0,
    total: 70,
    frameworkScore: 70,
  },
  confidence: 'LOW',
  marketCondition: 'UNKNOWN',
  marketGate: 'UNKNOWN',
  entryZone: {
    type: 'BREAKOUT',
    referencePrice: 100,
    preferredEntryMin: 98,
    preferredEntryMax: 103,
    rationale: 'Enter on strength above SMA50 support.',
  },
  riskPlan: {
    stopLoss: '95.00',
    targetPrice: null,
    targetPriceCompatibilityNote: 'Deprecated compatibility field. No projected price is produced; Strategy Decision uses rule-based exit and invalidation review.',
    rewardRiskRatio: null,
    riskReviewLevel: 'MEDIUM',
    rationale: 'Risk review uses rule evidence and market context.',
    reasonSummary: 'Candidate review is based on rule evidence.',
    invalidationRules: ['Market gate closes.'],
    exitRules: ['Exit condition met: momentum evidence weakened.'],
  },
  reasons: ['Price is above SMA50.'],
  blockers: [],
  warnings: [],
  dataGaps: ['Market context is missing or unknown.'],
  strategyVersion: '1.0.0',
  frameworkBacked: true,
  frameworkDecision: 'WATCH',
  frameworkAction: 'WAIT_FOR_CONFIRMATION',
  entryRulesPassed: ['PRICE_ABOVE_SMA50'],
  exitRulesTriggered: [],
  invalidationRulesTriggered: ['SUPPORT_INVALIDATED'],
  noiseFiltersTriggered: [],
  readinessLabel: null,
  strategyDefinitionSource: 'PERSISTED',
  strategyDefinitionDrift: [{
    type: 'CHECKSUM_MISMATCH',
    severity: 'WARN',
    strategyCode: 'TREND_MOMENTUM',
    persistedVersion: '1.0.0',
    registryVersion: '1.2.0',
    message: 'Persisted strategy checksum differs from registry snapshot.',
  }],
  modelVersion: 'strategy-decision-v1',
  generatedAt: '2026-05-06T18:53:36.829Z',
});

describe('StrategyDecisionEngineRepository', () => {
  it('upserts framework-backed decisions with Prisma-compatible create data', async () => {
    const generatedAt = new Date('2026-05-06T18:53:36.829Z');
    const upsert = jest.fn().mockResolvedValue({
      id: 'decision-1',
      ...makeDecision(),
      entryZone: JSON.stringify(makeDecision().entryZone),
      generatedAt,
    });
    const repository = new StrategyDecisionEngineRepository({
      strategyDecisionResult: { upsert },
    } as any);

    const result = await repository.create(makeDecision());
    const call = upsert.mock.calls[0][0];

    expect(call.where.instrumentId_strategy_modelVersion_generatedDate).toEqual({
      instrumentId: 'stock-1',
      strategy: 'TREND_MOMENTUM',
      modelVersion: 'strategy-decision-v1',
      generatedDate: new Date('2026-05-06T00:00:00.000Z'),
    });
    expect(call.create.stock).toEqual({ connect: { id: 'stock-1' } });
    expect(call.create).not.toHaveProperty('instrumentId');
    expect(call.create.scoreBreakdown).toEqual(expect.objectContaining({ total: 70, frameworkScore: 70 }));
    expect(call.create.entryZone).toBe(JSON.stringify(makeDecision().entryZone));
    expect(call.create.strategyName).toBe('Trend Momentum');
    expect(call.create.strategyDefinitionSource).toBe('PERSISTED');
    expect(call.create.strategyDefinitionDrift).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'CHECKSUM_MISMATCH' }),
    ]));
    expect(call.update.strategyDefinitionSource).toBe('PERSISTED');
    expect(call.create.invalidationRulesTriggered).toEqual(['SUPPORT_INVALIDATED']);
    expect(call.update.invalidationRulesTriggered).toEqual(['SUPPORT_INVALIDATED']);
    expect(result.entryZone?.type).toBe('BREAKOUT');
    expect(result.scoreBreakdown?.total).toBe(70);
    expect(result.invalidationRulesTriggered).toEqual(['SUPPORT_INVALIDATED']);
    expect(result.strategyDefinitionSource).toBe('PERSISTED');
    expect(result.strategyDefinitionDrift).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'CHECKSUM_MISMATCH' }),
    ]));
  });

  it('persists top-level invalidation rules in bulk replacement rows', async () => {
    const transaction = jest.fn().mockResolvedValue([]);
    const deleteMany = jest.fn((input) => ({ operation: 'deleteMany', input }));
    const createMany = jest.fn((input) => ({ operation: 'createMany', input }));
    const repository = new StrategyDecisionEngineRepository({
      $transaction: transaction,
      strategyDecisionResult: { deleteMany, createMany },
    } as any);

    await repository.replaceMany([makeDecision()]);
    const createManyCall = createMany.mock.calls[0][0];

    expect(createManyCall.data[0].invalidationRulesTriggered).toEqual(['SUPPORT_INVALIDATED']);
    expect(createManyCall.data[0].strategyName).toBe('Trend Momentum');
    expect(createManyCall.data[0].strategyDefinitionSource).toBe('PERSISTED');
    expect(createManyCall.data[0].strategyDefinitionDrift).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'CHECKSUM_MISMATCH' }),
    ]));
    expect(transaction).toHaveBeenCalledWith([
      expect.objectContaining({ operation: 'deleteMany' }),
      expect.objectContaining({ operation: 'createMany' }),
    ]);
  });

  it('uses safe sort fallback and includes legacy EQUITY rows for STOCK scope', async () => {
    const generatedAt = new Date('2026-05-06T18:53:36.829Z');
    const count = jest.fn().mockResolvedValue(1);
    const findFirst = jest.fn().mockResolvedValue({ generatedDate: new Date('2026-05-06T00:00:00.000Z') });
    const findMany = jest.fn().mockResolvedValue([{
      id: 'decision-1',
      ...makeDecision(),
      entryZone: JSON.stringify(makeDecision().entryZone),
      generatedAt,
    }]);
    const repository = new StrategyDecisionEngineRepository({
      strategyDecisionResult: { count, findFirst, findMany },
    } as any);

    const result = await repository.candidates({
      region: 'IN',
      assetType: 'STOCK',
      sortBy: 'notAColumn',
      sortDirection: 'asc',
    });
    const countCall = count.mock.calls[0][0];
    const findCall = findMany.mock.calls[0][0];

    expect(result.total).toBe(1);
    expect(findFirst.mock.calls[0][0].where.frameworkBacked).toBe(true);
    expect(findCall.orderBy).toEqual({ generatedAt: 'desc' });
    expect(findCall.where.frameworkBacked).toBe(true);
    expect(findCall.where.generatedDate).toEqual(new Date('2026-05-06T00:00:00.000Z'));
    expect(countCall.where.stock.AND).toEqual(expect.arrayContaining([
      expect.objectContaining({ assetType: { in: ['STOCK', 'EQUITY'] } }),
    ]));
  });

  it('only includes legacy decisions when explicitly requested', async () => {
    const count = jest.fn().mockResolvedValue(1);
    const findFirst = jest.fn().mockResolvedValue({ generatedDate: new Date('2026-05-06T00:00:00.000Z') });
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new StrategyDecisionEngineRepository({
      strategyDecisionResult: { count, findFirst, findMany },
    } as any);

    await repository.candidates({
      region: 'IN',
      assetType: 'STOCK',
      includeLegacy: true,
    });
    const findCall = findMany.mock.calls[0][0];

    expect(findCall.where.frameworkBacked).toBeUndefined();
    expect(findCall.where.generatedDate).toEqual(new Date('2026-05-06T00:00:00.000Z'));
  });

  it('applies candidate quality filters for framework-backed readiness validation', async () => {
    const generatedAt = new Date('2026-05-06T18:53:36.829Z');
    const count = jest.fn().mockResolvedValue(1);
    const findFirst = jest.fn().mockResolvedValue({ generatedDate: new Date('2026-05-06T00:00:00.000Z') });
    const findMany = jest.fn().mockResolvedValue([{
      id: 'decision-1',
      ...makeDecision(),
      decision: 'TRADE_CANDIDATE',
      readinessLabel: 'PAPER_TEST_CANDIDATE',
      strategyRating: {
        ratingScore: 78,
        ratingGrade: 'GOOD',
        readinessLabel: 'PAPER_TEST_CANDIDATE',
      },
      entryZone: JSON.stringify(makeDecision().entryZone),
      generatedAt,
    }]);
    const repository = new StrategyDecisionEngineRepository({
      strategyDecisionResult: { count, findFirst, findMany },
    } as any);

    await repository.candidates({
      region: 'IN',
      assetType: 'STOCK',
      decision: 'TRADE_CANDIDATE',
      frameworkBacked: true,
      strategyRatingGrades: ['GOOD', 'EXCELLENT'],
      readinessLabels: ['PAPER_TEST_CANDIDATE', 'WATCHLIST_CANDIDATE'],
      sortBy: 'readinessLabel',
      sortDirection: 'asc',
    });
    const findCall = findMany.mock.calls[0][0];

    expect(findCall.where.decision).toBe('TRADE_CANDIDATE');
    expect(findCall.where.frameworkBacked).toBe(true);
    expect(findCall.where.readinessLabel).toEqual({ in: ['PAPER_TEST_CANDIDATE', 'WATCHLIST_CANDIDATE'] });
    expect(findCall.where.OR).toEqual([
      { strategyRating: { path: ['ratingGrade'], equals: 'GOOD' } },
      { strategyRating: { path: ['ratingGrade'], equals: 'EXCELLENT' } },
    ]);
    expect(findCall.orderBy).toEqual({ readinessLabel: 'asc' });
  });

  it('applies asset scope to exit-risk decisions', async () => {
    const generatedAt = new Date('2026-05-06T18:53:36.829Z');
    const findMany = jest.fn().mockResolvedValue([{
      id: 'decision-1',
      ...makeDecision(),
      strategy: 'DEFENSIVE_EXIT',
      decision: 'REDUCE_RISK',
      entryZone: null,
      generatedAt,
    }]);
    const repository = new StrategyDecisionEngineRepository({
      strategyDecisionResult: { findMany },
    } as any);

    await repository.exits(undefined, 'IN', 'STOCK');
    const findCall = findMany.mock.calls[0][0];

    expect(findCall.where.stock.AND).toEqual(expect.arrayContaining([
      expect.objectContaining({ assetType: { in: ['STOCK', 'EQUITY'] } }),
    ]));
    expect(findCall.where.strategy).toBe('DEFENSIVE_EXIT');
    expect(findCall.where.decision).toEqual({ in: ['EXIT_CANDIDATE', 'REDUCE_RISK'] });
  });

  it('returns full funnel total separately from the bounded diagnostics sample', async () => {
    const generatedAt = new Date('2026-05-06T18:53:36.829Z');
    const count = jest.fn().mockResolvedValue(3200);
    const findFirst = jest.fn().mockResolvedValue({ generatedDate: new Date('2026-05-06T00:00:00.000Z') });
    const findMany = jest.fn().mockResolvedValue([{
      id: 'decision-1',
      ...makeDecision(),
      decision: 'TRADE_CANDIDATE',
      entryZone: JSON.stringify(makeDecision().entryZone),
      generatedAt,
    }]);
    const repository = new StrategyDecisionEngineRepository({
      strategyDecisionResult: { count, findFirst, findMany },
    } as any);

    const result = await repository.funnelDiagnostics({ region: 'IN', assetType: 'STOCK' });
    const findCall = findMany.mock.calls[0][0];

    expect(result.total).toBe(3200);
    expect(result.results).toHaveLength(1);
    expect(findCall.take).toBe(5000);
    expect(findCall.where.frameworkBacked).toBe(true);
    expect(findCall.where.generatedDate).toEqual(new Date('2026-05-06T00:00:00.000Z'));
    expect(findCall.where.stock.AND).toEqual(expect.arrayContaining([
      expect.objectContaining({ assetType: { in: ['STOCK', 'EQUITY'] } }),
    ]));
  });

  it('allows legacy rows in funnel diagnostics only when explicitly requested', async () => {
    const count = jest.fn().mockResolvedValue(1);
    const findFirst = jest.fn().mockResolvedValue({ generatedDate: new Date('2026-05-06T00:00:00.000Z') });
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new StrategyDecisionEngineRepository({
      strategyDecisionResult: { count, findFirst, findMany },
    } as any);

    await repository.funnelDiagnostics({ region: 'IN', assetType: 'STOCK', includeLegacy: true });
    const findCall = findMany.mock.calls[0][0];

    expect(findCall.where.frameworkBacked).toBeUndefined();
  });
});
