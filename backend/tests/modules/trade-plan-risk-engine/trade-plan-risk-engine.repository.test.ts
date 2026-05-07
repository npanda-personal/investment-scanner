import { TradePlanRiskEngineRepository } from '../../../src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository';
import type { TradePlanResultDto } from '../../../src/modules/trade-plan-risk-engine';

const record = (overrides: Record<string, any> = {}) => ({
  id: 'plan-1',
  instrumentId: 'INST-1',
  strategyDecisionId: 'DEC-1',
  portfolioId: null,
  portfolioKey: 'NO_PORTFOLIO',
  symbol: 'TEST',
  region: 'IN',
  assetType: 'STOCK',
  strategy: 'TREND_MOMENTUM',
  strategyVersion: '1.0.0',
  strategyRating: 'GOOD',
  readinessLabel: 'PAPER_TEST_CANDIDATE',
  backtestTimeframe: '3Y',
  backtestSummary: { timeframe: '3Y', ratingGrade: 'GOOD' },
  strategyProofSnapshot: { proofStatus: 'AVAILABLE' },
  strategyDecisionSnapshot: { decision: 'TRADE_CANDIDATE' },
  latestPrice: 100,
  latestPriceTimestamp: new Date('2026-05-06T00:00:00.000Z'),
  marketDataSnapshot: { latestPrice: 100 },
  dataQualitySnapshot: { coverageStatus: 'GOOD' },
  paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
  paperReadinessReasons: ['Ready'],
  paperReadinessBlockers: [],
  proofGeneratedAt: new Date('2026-05-07T00:00:00.000Z'),
  snapshotVersion: 'trade-plan-proof-snapshot-v1',
  planStatus: 'VALID',
  riskGrade: 'LOW',
  entryZone: null,
  stopLoss: null,
  target: null,
  rewardRiskRatio: 2,
  positionSizing: null,
  portfolioImpact: null,
  invalidationRules: [],
  warnings: [],
  blockers: [],
  dataGaps: [],
  modelVersion: 'trade-plan-risk-v1',
  generatedAt: new Date('2026-05-07T01:00:00.000Z'),
  generatedDate: new Date('2026-05-07T00:00:00.000Z'),
  ...overrides,
});

const dto = (overrides: Partial<TradePlanResultDto> = {}): TradePlanResultDto => ({
  instrumentId: 'INST-1',
  symbol: 'TEST',
  region: 'IN',
  assetType: 'STOCK',
  strategy: 'TREND_MOMENTUM',
  strategyVersion: '1.0.0',
  strategyDecisionId: 'DEC-1',
  portfolioId: null,
  strategyRating: 'GOOD',
  readinessLabel: 'PAPER_TEST_CANDIDATE',
  backtestTimeframe: '3Y',
  backtestSummary: { timeframe: '3Y', cagr: 0.1, maxDrawdown: -0.1, sharpe: 1, winRate: 0.6, profitFactor: 1.4, tradeCount: 30, ratingGrade: 'GOOD', availabilityStatus: 'AVAILABLE', generatedAt: '2026-05-07T00:00:00.000Z' },
  strategyProofSnapshot: { strategyCode: 'TREND_MOMENTUM', strategyVersion: '1.0.0', strategyRating: 'GOOD', readinessLabel: 'PAPER_TEST_CANDIDATE', frameworkBacked: true, backtestTimeframe: '3Y', backtestSummary: null, proofStatus: 'AVAILABLE', proofWarnings: [] },
  strategyDecisionSnapshot: { strategyDecisionId: 'DEC-1', decision: 'TRADE_CANDIDATE', action: 'CONSIDER_ENTRY', decisionScore: 90, confidence: 'HIGH', marketGate: 'OPEN', marketCondition: 'HEALTHY', frameworkBacked: true, reasons: [], blockers: [], warnings: [], dataGaps: [], generatedAt: '2026-05-07T00:00:00.000Z' },
  latestPrice: 100,
  latestPriceTimestamp: '2026-05-06T00:00:00.000Z',
  marketDataSnapshot: { instrumentId: 'INST-1', symbol: 'TEST', latestPrice: 100, latestPriceTimestamp: '2026-05-06T00:00:00.000Z', latestCompletedTradingDate: '2026-05-06T00:00:00.000Z', latestStoredTradingDate: '2026-05-06T00:00:00.000Z', currency: 'INR', exchange: 'NSE', region: 'IN', assetType: 'STOCK', dataStatus: 'COMPLETE' },
  dataQualitySnapshot: { status: 'AVAILABLE', coverageStatus: 'GOOD', signalReadinessStatus: 'READY', liquidityStatus: 'LIQUID', coverageScore: 90, signalReadinessScore: 90, liquidityScore: 80, eligibleForSignals: true, warnings: [], blockers: [], generatedAt: '2026-05-07T00:00:00.000Z' },
  paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
  paperReadinessReasons: ['Ready'],
  paperReadinessBlockers: [],
  proofGeneratedAt: '2026-05-07T00:00:00.000Z',
  snapshotVersion: 'trade-plan-proof-snapshot-v1',
  planStatus: 'VALID',
  riskGrade: 'LOW',
  entryZone: null,
  stopLoss: null,
  target: null,
  rewardRiskRatio: 2,
  positionSizing: null,
  portfolioImpact: null,
  invalidationRules: [],
  warnings: [],
  blockers: [],
  dataGaps: [],
  generatedAt: '2026-05-07T01:00:00.000Z',
  modelVersion: 'trade-plan-risk-v1',
  ...overrides,
});

describe('TradePlanRiskEngineRepository snapshot persistence', () => {
  it('upserts same-day plans by instrument, strategy, model, scope, and portfolio key', async () => {
    const repository = new TradePlanRiskEngineRepository() as any;
    const upsert = jest.fn().mockResolvedValue(record());
    repository.db = { tradePlanResult: { upsert } };

    await repository.upsert(dto());

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        instrumentId_strategy_modelVersion_generatedDate_region_assetType_portfolioKey: expect.objectContaining({
          instrumentId: 'INST-1',
          strategy: 'TREND_MOMENTUM',
          modelVersion: 'trade-plan-risk-v1',
          region: 'IN',
          assetType: 'STOCK',
          portfolioKey: 'NO_PORTFOLIO',
        }),
      },
      create: expect.objectContaining({
        region: 'IN',
        assetType: 'STOCK',
        strategyProofSnapshot: expect.any(Object),
        strategyDecisionSnapshot: expect.any(Object),
        marketDataSnapshot: expect.any(Object),
        dataQualitySnapshot: expect.any(Object),
        paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
      }),
      update: expect.objectContaining({
        strategyProofSnapshot: expect.any(Object),
        paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
      }),
    }));
  });

  it('filters candidates by persisted scope and proof fields', async () => {
    const repository = new TradePlanRiskEngineRepository() as any;
    const count = jest.fn().mockResolvedValue(1);
    const findMany = jest.fn().mockResolvedValue([record()]);
    repository.db = { tradePlanResult: { count, findMany } };

    const result = await repository.list({
      region: 'IN',
      assetType: 'STOCK',
      paperReadyOnly: true,
      paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
      backtestTimeframe: '3Y',
      strategyRating: 'GOOD',
      readinessLabel: 'PAPER_TEST_CANDIDATE',
      sortBy: 'paperReadinessStatus',
    });

    expect(count).toHaveBeenCalledWith({ where: expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
      backtestTimeframe: '3Y',
      strategyRating: 'GOOD',
      readinessLabel: 'PAPER_TEST_CANDIDATE',
    }) });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { paperReadinessStatus: 'desc' },
    }));
    expect(result.results[0]).toEqual(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      strategyProofSnapshot: { proofStatus: 'AVAILABLE' },
      paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
    }));
  });
});
