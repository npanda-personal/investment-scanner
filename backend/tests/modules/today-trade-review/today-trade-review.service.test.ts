import { TodayTradeReviewService, type TodayReviewCandidateDto, type TodayReviewRepository, type TodayReviewRunDto, type TodayReviewRunStatus, type TodayReviewSourceSnapshot, type TodayReviewUpstreamServices } from '../../../src/modules/today-trade-review';
import type { DataQualityEvaluationDto } from '../../../src/modules/data-quality-engine';
import type { StrategyDecisionDto } from '../../../src/modules/strategy-decision-engine';
import type { TradePlanResultDto } from '../../../src/modules/trade-plan-risk-engine';

const fixedNow = new Date('2026-05-11T06:30:00.000Z');

class MemoryTodayReviewRepository implements TodayReviewRepository {
  runs = new Map<string, TodayReviewRunDto>();
  candidates = new Map<string, TodayReviewCandidateDto>();

  async markRunStarted(input: { runDate: Date; region: string; assetType: string; startedAt: Date; warnings: string[]; sourceSnapshot: TodayReviewSourceSnapshot | Record<string, unknown> }): Promise<TodayReviewRunDto> {
    const key = `${input.runDate.toISOString()}:${input.region}:${input.assetType}`;
    const existing = [...this.runs.values()].find((run) => `${run.runDate}:${run.region}:${run.assetType}` === key);
    const run: TodayReviewRunDto = {
      id: existing?.id || `run-${this.runs.size + 1}`,
      runDate: input.runDate.toISOString(),
      region: input.region,
      assetType: input.assetType,
      status: 'RUNNING',
      trustStatus: 'PARTIAL',
      dataThroughDate: null,
      startedAt: input.startedAt.toISOString(),
      finishedAt: null,
      warnings: input.warnings,
      candidateCounts: {},
      sourceSnapshot: input.sourceSnapshot,
      createdAt: existing?.createdAt || input.startedAt.toISOString(),
      updatedAt: input.startedAt.toISOString(),
      candidates: existing?.candidates || [],
    };
    this.runs.set(run.id, run);
    return run;
  }

  async completeRun(input: { runId: string; status: TodayReviewRunStatus; dataThroughDate: Date | null; finishedAt: Date; warnings: string[]; candidateCounts: Record<string, number>; sourceSnapshot: TodayReviewSourceSnapshot | Record<string, unknown>; candidates: TodayReviewCandidateDto[] }): Promise<TodayReviewRunDto> {
    const current = this.runs.get(input.runId)!;
    const candidates = input.candidates.map((candidate, index) => {
      const persisted = {
        ...candidate,
        id: `${input.runId}-candidate-${index + 1}`,
        runId: input.runId,
        createdAt: input.finishedAt.toISOString(),
        updatedAt: input.finishedAt.toISOString(),
      };
      this.candidates.set(persisted.id, persisted);
      return persisted;
    });
    const run: TodayReviewRunDto = {
      ...current,
      status: input.status,
      trustStatus: input.status === 'COMPLETED' ? 'OK' : input.status === 'FAILED' ? 'FAILED' : 'PARTIAL',
      dataThroughDate: input.dataThroughDate?.toISOString() || null,
      finishedAt: input.finishedAt.toISOString(),
      warnings: input.warnings,
      candidateCounts: input.candidateCounts,
      sourceSnapshot: input.sourceSnapshot,
      updatedAt: input.finishedAt.toISOString(),
      candidates,
    };
    this.runs.set(input.runId, run);
    return run;
  }

  async latest(region: string, assetType: string): Promise<TodayReviewRunDto | null> {
    return [...this.runs.values()].find((run) => run.region === region && run.assetType === assetType && ['COMPLETED', 'PARTIAL'].includes(run.status)) || null;
  }

  async getRun(id: string): Promise<TodayReviewRunDto | null> {
    return this.runs.get(id) || null;
  }

  async listRuns(): Promise<{ items: TodayReviewRunDto[]; total: number }> {
    const items = [...this.runs.values()];
    return { items, total: items.length };
  }

  async getCandidate(id: string): Promise<TodayReviewCandidateDto | null> {
    return this.candidates.get(id) || null;
  }
}

const decision = (overrides: Partial<StrategyDecisionDto> = {}): StrategyDecisionDto => ({
  id: 'decision-1',
  instrumentId: 'stock-1',
  symbol: 'ALPHA.NS',
  strategy: 'TREND_MOMENTUM',
  decision: 'TRADE_CANDIDATE',
  action: 'CONSIDER_ENTRY',
  decisionScore: 84,
  confidence: 'HIGH',
  marketCondition: 'HEALTHY',
  marketGate: 'OPEN',
  reasons: ['Framework entry rule matched.'],
  blockers: [],
  warnings: [],
  dataGaps: [],
  modelVersion: 'strategy-decision-v1',
  generatedAt: fixedNow.toISOString(),
  strategyVersion: '1.0.0',
  frameworkBacked: true,
  strategyRating: { ratingScore: 82, ratingGrade: 'GOOD', readinessLabel: 'PAPER_TEST_CANDIDATE' },
  readinessLabel: 'PAPER_TEST_CANDIDATE',
  entryZone: {
    type: 'BREAKOUT',
    referencePrice: 100,
    preferredEntryMin: 99,
    preferredEntryMax: 101,
    rationale: 'Breakout review zone.',
  },
  ...overrides,
});

const dataQuality = (overrides: Partial<DataQualityEvaluationDto> = {}): DataQualityEvaluationDto => ({
  instrumentId: 'stock-1',
  symbol: 'ALPHA.NS',
  companyName: 'Alpha Ltd',
  sector: 'Financial Services',
  industry: 'Diversified Financials',
  country: 'India',
  currency: 'INR',
  coverageScore: 92,
  coverageStatus: 'GOOD',
  signalReadinessScore: 88,
  signalReadinessStatus: 'READY',
  liquidityScore: 84,
  liquidityStatus: 'LIQUID',
  eligibleForSignals: true,
  eligibleForBacktesting: true,
  eligibleForCalibration: true,
  dataGaps: [],
  warnings: [],
  readinessReasons: ['Ready.'],
  readinessBlockers: [],
  recommendedFixes: [],
  lastEvaluatedAt: fixedNow.toISOString(),
  researchUrl: '/research/stocks/stock-1',
  ...overrides,
});

const tradePlan = (overrides: Partial<TradePlanResultDto> = {}): TradePlanResultDto => ({
  id: 'plan-1',
  instrumentId: 'stock-1',
  symbol: 'ALPHA.NS',
  region: 'IN',
  assetType: 'STOCK',
  strategy: 'TREND_MOMENTUM',
  strategyVersion: '1.0.0',
  strategyDecisionId: 'decision-1',
  portfolioId: null,
  strategyRating: 'GOOD',
  readinessLabel: 'PAPER_TEST_CANDIDATE',
  planStatus: 'VALID',
  riskGrade: 'LOW',
  entryZone: { type: 'BREAKOUT', referencePrice: 100, preferredEntryMin: 99, preferredEntryMax: 101, quality: 'STRONG', rationale: 'Breakout review zone.' },
  stopLoss: { price: 95, percentBelowEntry: 5, method: 'RECENT_SWING_LOW', quality: 'STRONG', rationale: 'Below review floor.' },
  target: { price: 112, expectedReturnPercent: 12, method: 'REWARD_RISK_MULTIPLE', quality: 'ACCEPTABLE', rationale: 'Modeled reward range.' },
  rewardRiskRatio: 2.4,
  positionSizing: null,
  portfolioImpact: null,
  invalidationRules: ['Daily close below stop level.'],
  warnings: [],
  blockers: [],
  dataGaps: [],
  paperReadinessStatus: 'READY_FOR_PAPER_REVIEW',
  paperReadinessReasons: ['Trade plan status is VALID.'],
  paperReadinessBlockers: [],
  generatedAt: fixedNow.toISOString(),
  modelVersion: 'trade-plan-risk-v1',
  ...overrides,
});

const services = (overrides: Partial<TodayReviewUpstreamServices> = {}): TodayReviewUpstreamServices => ({
  strategyDecisionService: {
    marketGate: jest.fn().mockResolvedValue({ marketGate: 'OPEN', marketCondition: 'HEALTHY' }),
    candidates: jest.fn().mockResolvedValue({ results: [decision()], total: 1 }),
    exits: jest.fn().mockResolvedValue([]),
  },
  tradePlanService: {
    latestForInstrument: jest.fn().mockResolvedValue(tradePlan()),
    generatePlan: jest.fn().mockResolvedValue(tradePlan()),
  },
  marketDataService: {
    latestStoredCandleInfo: jest.fn().mockResolvedValue({ latestTradingDate: '2026-05-10', finalConfirmed: true }),
  },
  dataQualityService: {
    getLatestEvaluationForInstrument: jest.fn().mockResolvedValue(dataQuality()),
    getEvaluationsForInstruments: jest.fn().mockResolvedValue([dataQuality()]),
  },
  marketContextService: {
    latestPersistedSummary: jest.fn().mockResolvedValue({
      regime: { regime: 'RISK_ON', score: 80, explanation: 'Risk-on.', updatedAt: fixedNow.toISOString(), dataStatus: 'COMPLETE' },
      topSectors: [{ sector: 'Financial Services', return1M: 0.03, return3M: 0.08, return6M: 0.1, relativeStrengthScore: 74, instrumentCount: 12, bullishSignalCount: 8, bearishSignalCount: 1, leadershipStatus: 'LEADING' }],
      weakSectors: [],
      breadth: { percentAboveSma50: 0.7, percentAboveSma200: 0.62, advanceDeclineRatio: 1.5, newHigh52WeekCount: 5, newLow52WeekCount: 1, bullishSignalCount: 20, bearishSignalCount: 5, instrumentCount: 80, dataStatus: 'COMPLETE' },
      countryStrength: [],
      macro: { interestRateProxy: null, inflationProxy: null, usdStrengthProxy: null, commodityProxy: null, macroStatus: 'UNKNOWN', dataStatus: 'MISSING', explanation: 'Missing.' },
      explanation: ['Risk-on context.'],
      updatedAt: fixedNow.toISOString(),
      dataStatus: 'COMPLETE',
    }),
  },
  signalService: {
    latestForInstrument: jest.fn().mockResolvedValue({ instrument_id: 'stock-1', symbol: 'ALPHA.NS', company_name: 'Alpha Ltd', sector: 'Financial Services', country: 'India', currentPrice: 100, previousClose: 99, dailyChange: 1, dailyChangePercent: 1, currency: 'INR', priceTimestamp: fixedNow.toISOString(), score: 77, direction: 'BULLISH', confidence: 'HIGH', triggered_signals: [], negative_signals: [], explanation: 'Supportive.', generated_at: fixedNow.toISOString(), source: 'test', data_status: 'COMPLETE' }),
    latestSignalUniverse: jest.fn().mockResolvedValue([]),
  },
  calibrationService: {
    latestPersistedForInstrument: jest.fn().mockResolvedValue({ signalResultId: 'signal-1', instrumentId: 'stock-1', symbol: 'ALPHA.NS', companyName: 'Alpha Ltd', sector: 'Financial Services', country: 'India', rawScore: 77, calibratedScore: 80, scoreDelta: 3, rawDirection: 'BULLISH', calibratedDirection: 'BULLISH', rawConfidence: 'HIGH', calibratedConfidence: 'HIGH', boosts: [], penalties: [], calibrationReasons: [], dataGaps: [], calibrationModelVersion: 'cal-v1', rawSignalModelVersion: 'sig-v1', generatedAt: fixedNow.toISOString(), dataStatus: 'COMPLETE', researchUrl: '/research/stocks/stock-1' }),
  },
  smartMoneyService: {
    latestPersistedStock: jest.fn().mockResolvedValue({ instrumentId: 'stock-1', symbol: 'ALPHA.NS', companyName: 'Alpha Ltd', sector: 'Financial Services', smartMoneyScore: 70, status: 'ACCUMULATION', confidence: 'MEDIUM', explanation: 'Accumulation support.', updatedAt: fixedNow.toISOString(), dataStatus: 'COMPLETE', source: 'test', range: '3M', latestClose: 100, latestVolume: 1000000, averageVolume20: 900000, dailyChangePercent: 1, signals: [], insiderOwnership: { insiderBuyCount: null, insiderSellCount: null, netInsiderActivity: null, institutionalOwnershipPercent: null, ownershipDataStatus: 'MISSING', source: 'test', explanation: 'Missing.' }, researchUrl: '/research/stocks/stock-1' }),
  },
  ...overrides,
});

describe('TodayTradeReviewService', () => {
  it('creates an idempotent logical run per date and scope', async () => {
    const repository = new MemoryTodayReviewRepository();
    const service = new TodayTradeReviewService(repository, services(), () => fixedNow);

    const first = await service.run({ region: 'IN', assetType: 'STOCK' });
    const second = await service.run({ region: 'IN', assetType: 'STOCK' });

    expect(first.run?.id).toBe(second.run?.id);
    expect(repository.runs.size).toBe(1);
    expect(second.run?.candidateCounts.LONG_REVIEW).toBe(1);
  });

  it('does not promote raw signals without Strategy Decision candidates', async () => {
    const service = new TodayTradeReviewService(new MemoryTodayReviewRepository(), services({
      strategyDecisionService: {
        marketGate: jest.fn().mockResolvedValue({ marketGate: 'OPEN' }),
        candidates: jest.fn().mockResolvedValue({ results: [], total: 0 }),
        exits: jest.fn().mockResolvedValue([]),
      },
      signalService: {
        latestForInstrument: jest.fn().mockResolvedValue(null),
        latestSignalUniverse: jest.fn().mockResolvedValue([{ direction: 'BULLISH' } as any]),
      },
    }), () => fixedNow);

    const result = await service.run();

    expect(result.run?.candidates).toHaveLength(0);
    expect(result.groups.longReview).toHaveLength(0);
    expect(result.run?.sourceSnapshot).toEqual(expect.objectContaining({
      rawSignalUniverse: expect.objectContaining({ supportOnly: true, sampleCount: 1 }),
    }));
  });

  it('forces hard trade-plan blockers to BLOCKED with a zero confidence score', async () => {
    const blockedPlan = tradePlan({
      planStatus: 'BLOCKED',
      riskGrade: 'HIGH',
      blockers: ['Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.'],
      paperReadinessStatus: 'BLOCKED',
      paperReadinessReasons: [],
      paperReadinessBlockers: ['Trade plan has active blockers.'],
    });
    const service = new TodayTradeReviewService(new MemoryTodayReviewRepository(), services({
      tradePlanService: {
        latestForInstrument: jest.fn().mockResolvedValue(blockedPlan),
        generatePlan: jest.fn(),
      },
    }), () => fixedNow);

    const result = await service.run();
    const candidate = result.groups.blocked[0];

    expect(candidate.state).toBe('BLOCKED');
    expect(candidate.grade).toBe('D');
    expect(candidate.confidenceScore).toBe(0);
    expect(candidate.blockers).toContain(blockedPlan.blockers[0]);
    expect(candidate.reasonSummary).toContain('Blocked');
  });

  it('blocks new long review candidates when the market gate is CLOSED', async () => {
    const service = new TodayTradeReviewService(new MemoryTodayReviewRepository(), services({
      strategyDecisionService: {
        marketGate: jest.fn().mockResolvedValue({ marketGate: 'CLOSED' }),
        candidates: jest.fn().mockResolvedValue({ results: [decision({ marketGate: 'CLOSED' })], total: 1 }),
        exits: jest.fn().mockResolvedValue([]),
      },
    }), () => fixedNow);

    const result = await service.run();

    expect(result.groups.blocked[0].blockers).toContain('Market gate is CLOSED for new long review candidates.');
    expect(result.groups.longReview).toHaveLength(0);
  });

  it('maps missing proof to UNPROVEN instead of A or B', async () => {
    const service = new TodayTradeReviewService(new MemoryTodayReviewRepository(), services({
      strategyDecisionService: {
        marketGate: jest.fn().mockResolvedValue({ marketGate: 'OPEN' }),
        candidates: jest.fn().mockResolvedValue({ results: [decision({ frameworkBacked: false, strategyRating: { ratingScore: 0, ratingGrade: 'UNPROVEN' } })], total: 1 }),
        exits: jest.fn().mockResolvedValue([]),
      },
    }), () => fixedNow);

    const result = await service.run();

    expect(result.groups.unproven[0]).toEqual(expect.objectContaining({
      state: 'UNPROVEN',
      grade: 'UNPROVEN',
    }));
    expect(result.groups.longReview).toHaveLength(0);
  });

  it('maps missing data quality to INSUFFICIENT_DATA and clears promotion', async () => {
    const service = new TodayTradeReviewService(new MemoryTodayReviewRepository(), services({
      dataQualityService: {
        getLatestEvaluationForInstrument: jest.fn().mockResolvedValue(null),
        getEvaluationsForInstruments: jest.fn().mockResolvedValue([]),
      },
    }), () => fixedNow);

    const result = await service.run();

    expect(result.groups.insufficientData[0]).toEqual(expect.objectContaining({
      state: 'INSUFFICIENT_DATA',
      grade: 'UNPROVEN',
    }));
    expect(result.groups.longReview).toHaveLength(0);
  });

  it('returns grouped candidates from the persisted latest run', async () => {
    const repository = new MemoryTodayReviewRepository();
    const service = new TodayTradeReviewService(repository, services(), () => fixedNow);
    await service.run();

    const latest = await service.latest({ region: 'IN', assetType: 'STOCK' });

    expect(latest.scope).toEqual({ region: 'IN', assetType: 'STOCK' });
    expect(latest.groups.longReview).toHaveLength(1);
    expect(latest.run?.status).toBe('COMPLETED');
  });
});
