/// <reference types="@types/jest" />
import { StrategyDecisionEngineRepository } from '../../../src/modules/strategy-decision-engine/strategy-decision-engine.repository';
import type { StrategyDecisionDto } from '../../../src/modules/strategy-decision-engine/strategy-decision-engine.types';

const makeDecision = (): StrategyDecisionDto => ({
  instrumentId: 'stock-1',
  symbol: 'ABC.NS',
  exchange: 'NSE',
  strategy: 'TREND_MOMENTUM',
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
    targetPrice: '115.00',
    rewardRiskRatio: 3.5,
    rationale: 'Framework-backed risk plan.',
    invalidationRules: ['Market gate closes.'],
    exitRules: ['Target price achieved.'],
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
  noiseFiltersTriggered: [],
  readinessLabel: null,
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
    expect(result.entryZone?.type).toBe('BREAKOUT');
    expect(result.scoreBreakdown?.total).toBe(70);
  });
});
