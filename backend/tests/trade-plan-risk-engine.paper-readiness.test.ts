import { TradePlanRiskEngineService } from '../src/modules/trade-plan-risk-engine';
import type { TradePlanResultDto } from '../src/modules/trade-plan-risk-engine';

const basePlan = (overrides: Partial<TradePlanResultDto> = {}): TradePlanResultDto => ({
  id: 'plan-1',
  instrumentId: 'instrument-1',
  symbol: 'TEST',
  strategy: 'TREND_MOMENTUM',
  strategyVersion: '1.0.0',
  strategyDecisionId: 'decision-1',
  portfolioId: null,
  planStatus: 'VALID',
  riskGrade: 'LOW',
  entryZone: {
    type: 'CURRENT_PRICE',
    referencePrice: 100,
    preferredEntryMin: 99,
    preferredEntryMax: 101,
    quality: 'ACCEPTABLE',
    rationale: 'Entry zone for review.',
  },
  stopLoss: {
    price: 95,
    percentBelowEntry: 5,
    method: 'RECENT_SWING_LOW',
    quality: 'STRONG',
    rationale: 'Risk level below recent structure.',
  },
  target: {
    price: 110,
    expectedReturnPercent: 10,
    method: 'REWARD_RISK_MULTIPLE',
    quality: 'FALLBACK',
    rationale: 'Target is modeled at 2R by default.',
  },
  rewardRiskRatio: 2,
  positionSizing: {
    portfolioId: null,
    capitalBase: 10000,
    riskPercent: 1,
    maxRiskAmount: 100,
    suggestedQuantity: 20,
    estimatedPositionValue: 2000,
    positionValuePercent: 20,
    notes: [],
  },
  portfolioImpact: null,
  invalidationRules: ['Daily close below reviewed risk level.'],
  warnings: [],
  blockers: [],
  dataGaps: [],
  generatedAt: '2026-05-07T00:00:00.000Z',
  modelVersion: 'trade-plan-risk-v1',
  ...overrides,
});

const decisionProof = (overrides: Record<string, unknown> = {}) => ({
  frameworkBacked: true,
  strategyCode: 'TREND_MOMENTUM',
  strategyVersion: '1.0.0',
  strategyRatingGrade: 'GOOD',
  readinessLabel: 'PAPER_TEST_CANDIDATE',
  backtestSummaryAvailable: true,
  decision: 'TRADE_CANDIDATE',
  marketGate: 'OPEN',
  confidence: 'HIGH',
  reasons: ['Framework rules passed.'],
  blockers: [],
  dataGaps: [],
  ...overrides,
});

const qualityProof = (overrides: Record<string, unknown> = {}) => ({
  latestPricePresent: true,
  priceHistorySufficient: true,
  coverageStatus: 'GOOD',
  liquidityStatus: 'LIQUID',
  stalePriceWarningHandled: true,
  ...overrides,
});

const classify = (plan: TradePlanResultDto, proof = decisionProof(), quality = qualityProof()) =>
  new TradePlanRiskEngineService().classifyPaperReadiness({
    plan,
    decisionProof: proof,
    dataQualityProof: quality,
    scope: { region: 'IN', assetType: 'STOCK' },
  });

describe('TradePlanRiskEngineService paper readiness classification', () => {
  it('marks a valid plan with strong proof READY_FOR_PAPER_REVIEW', () => {
    expect(classify(basePlan()).paperReadinessStatus).toBe('READY_FOR_PAPER_REVIEW');
  });

  it('keeps an UNPROVEN strategy out of paper review readiness', () => {
    const result = classify(basePlan(), decisionProof({ strategyRatingGrade: 'UNPROVEN' }));
    expect(result.paperReadinessStatus).toBe('WATCH_ONLY');
    expect(result.paperReadinessBlockers).toContain('Strategy rating is UNPROVEN.');
  });

  it('blocks HIGH risk plans from paper review readiness', () => {
    expect(classify(basePlan({ riskGrade: 'HIGH' })).paperReadinessStatus).toBe('BLOCKED');
  });

  it('requires a backtest summary', () => {
    const result = classify(basePlan(), decisionProof({ backtestSummaryAvailable: false }));
    expect(result.paperReadinessStatus).toBe('INSUFFICIENT_DATA');
    expect(result.paperReadinessBlockers).toContain('Backtest summary is missing for the selected scope/timeframe.');
  });

  it('blocks candidates when the market gate is CLOSED', () => {
    expect(classify(basePlan(), decisionProof({ marketGate: 'CLOSED' })).paperReadinessStatus).toBe('BLOCKED');
  });

  it('requires reward/risk of at least 1.5', () => {
    const result = classify(basePlan({ rewardRiskRatio: 1.2 }));
    expect(result.paperReadinessStatus).toBe('BLOCKED');
    expect(result.paperReadinessBlockers).toContain('Reward/risk ratio is below 1.5.');
  });

  it('does not expose live-trading labels in the model', () => {
    const model = new TradePlanRiskEngineService().getModelRules();
    expect(JSON.stringify(model)).not.toContain('LIVE_TRADING');
    expect(JSON.stringify(model)).not.toContain('PAPER_TRADING_ELIGIBLE');
  });

  it('returns the default 2R target rationale in valid plan fixtures', () => {
    expect(basePlan().target?.method).toBe('REWARD_RISK_MULTIPLE');
    expect(basePlan().target?.rationale).toBe('Target is modeled at 2R by default.');
  });
});

describe('TradePlanRiskEngineService paperReadyOnly candidate filter', () => {
  it('delegates paperReadyOnly to persisted readiness filters', async () => {
    const service = new TradePlanRiskEngineService() as any;
    service.repository = {
      list: jest.fn().mockResolvedValue({
        results: [
          basePlan({ id: 'ready-plan', paperReadinessStatus: 'READY_FOR_PAPER_REVIEW' }),
        ],
        total: 1,
      }),
    };

    const result = await service.list({ paperReadyOnly: true, region: 'IN', assetType: 'STOCK', limit: 10, offset: 0 });

    expect(result.total).toBe(1);
    expect(result.results[0].id).toBe('ready-plan');
    expect(result.results[0].paperReadinessStatus).toBe('READY_FOR_PAPER_REVIEW');
    expect(service.repository.list).toHaveBeenCalledWith(expect.objectContaining({
      paperReadyOnly: true,
      region: 'IN',
      assetType: 'STOCK',
    }));
  });
});
