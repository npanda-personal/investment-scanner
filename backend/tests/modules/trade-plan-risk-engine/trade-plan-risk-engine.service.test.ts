import { TradePlanRiskEngineService } from '../../../src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service';
import { StrategyDecisionEngineService } from '../../../src/modules/strategy-decision-engine';
import { MarketDataFoundationService } from '../../../src/modules/market-data-foundation/market-data-foundation.service';
import { PortfolioManagementService } from '../../../src/modules/portfolio-management';
import { TradePlanRiskEngineRepository } from '../../../src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository';
import { SignalGenerationEngineService } from '../../../src/modules/signal-generation-engine';

// Mock dependencies
jest.mock('../../../src/modules/strategy-decision-engine');
jest.mock('../../../src/modules/market-data-foundation/market-data-foundation.service');
jest.mock('../../../src/modules/portfolio-management');
jest.mock('../../../src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository');
jest.mock('../../../src/modules/signal-generation-engine');

describe('TradePlanRiskEngineService', () => {
  let service: TradePlanRiskEngineService;
  
  let mockStrategyService: jest.Mocked<StrategyDecisionEngineService>;
  let mockMarketDataService: jest.Mocked<MarketDataFoundationService>;
  let mockPortfolioService: jest.Mocked<PortfolioManagementService>;
  let mockRepository: jest.Mocked<TradePlanRiskEngineRepository>;
  let mockSignalService: jest.Mocked<SignalGenerationEngineService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStrategyService = new StrategyDecisionEngineService() as any;
    mockMarketDataService = new MarketDataFoundationService() as any;
    mockPortfolioService = new PortfolioManagementService() as any;
    mockRepository = new TradePlanRiskEngineRepository() as any;
    mockSignalService = new SignalGenerationEngineService() as any;

    service = new TradePlanRiskEngineService();
    // Inject mocks
    (service as any).strategyDecisionService = mockStrategyService;
    (service as any).marketDataService = mockMarketDataService;
    (service as any).portfolioService = mockPortfolioService;
    (service as any).repository = mockRepository;
    (service as any).signalService = mockSignalService;
    (service as any).dataQualityService = {
      diagnostics: jest.fn().mockResolvedValue({
        coverageStatus: 'GOOD',
        signalReadinessStatus: 'READY',
        liquidityStatus: 'LIQUID',
        coverageScore: 95,
        signalReadinessScore: 90,
        liquidityScore: 80,
        eligibleForSignals: true,
        warnings: [],
        readinessBlockers: [],
        dataGaps: [],
        lastEvaluatedAt: '2026-05-07T00:00:00.000Z',
      }),
      getLatestEvaluationForInstrument: jest.fn(),
    };
    (service as any).strategyFrameworkService = {
      performance: jest.fn().mockResolvedValue([{
        timeframe: '3Y',
        cagr: 0.12,
        maxDrawdown: -0.15,
        sharpe: 1.1,
        winRate: 0.58,
        profitFactor: 1.4,
        tradeCount: 42,
        ratingGrade: 'GOOD',
        readinessLabel: 'PAPER_TEST_CANDIDATE',
        generatedAt: '2026-05-07T00:00:00.000Z',
      }]),
    };
    mockMarketDataService.getInstrument.mockResolvedValue({
      id: 'INST-1',
      symbol: 'TEST',
      currency: 'INR',
      exchange: 'NSE',
    } as any);
    (mockMarketDataService as any).latestStoredCandleInfo.mockResolvedValue({
      latestCompletedTradingDate: '2026-05-06T00:00:00.000Z',
      latestStoredTradingDate: '2026-05-06T00:00:00.000Z',
    });

    mockRepository.upsert.mockImplementation(async (data: any) => data);
  });

  describe('getModelRules', () => {
    it('should return default model thresholds', () => {
      const rules = service.getModelRules();
      expect(rules.defaultCapitalBase).toBe(100000);
      expect(rules.defaultRiskPercent).toBe(1);
      expect(rules.defaultRewardRiskTarget).toBe(2);
      expect(rules.maxSinglePositionExposurePercent).toBe(10);
    });
  });

  describe('generatePlan', () => {
    const defaultDecision = {
      id: 'dec-1',
      instrumentId: 'INST-1',
      symbol: 'TEST',
      strategy: 'TREND_MOMENTUM',
      decision: 'TRADE_CANDIDATE',
      marketGateStatus: 'OPEN',
      strategyRating: 'EXCELLENT',
    };

    const defaultPriceResult = {
      latest: { close: 100 },
    };

    const defaultPricesDto = {
      prices: Array(60).fill(null).map((_, i) => ({ close: 95 + (i * 0.1), low: 90 + (i * 0.1) }))
    };

    it('generates a plan from a strategy decision', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(defaultDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue(defaultPriceResult as any);
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue(defaultPricesDto as any);

      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST' });
      
      expect(plan.blockers).toEqual([]);
      expect(plan.planStatus).toBe('VALID');
      expect(plan.strategy).toBe('TREND_MOMENTUM');
      expect(plan.entryZone?.referencePrice).toBe(100);
      expect(plan.stopLoss).toBeDefined();
      expect(plan.target).toBeDefined();
      expect(plan.rewardRiskRatio).toBeGreaterThan(0);
      expect(mockRepository.upsert).toHaveBeenCalled();
    });

    it('blocks plan if missing latest price', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(defaultDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue(null as any); // Missing price

      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST' });
      
      expect(plan.planStatus).toBe('INSUFFICIENT_DATA');
      expect(plan.blockers).toContain('Missing latest price.');
    });

    it('calculates reward/risk ratio and targets from 2R', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(defaultDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({ latest: { close: 100 } } as any);
      
      // Setup prices so swing low is exactly 90. Entry is 100. Risk is 10.
      const prices = Array(60).fill({ close: 100, low: 100 });
      prices[0] = { close: 100, low: 90 }; // recent swing low
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices } as any);

      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST' });
      
      expect(plan.stopLoss?.price).toBe(89.1);
      expect(plan.stopLoss?.method).toBe('RECENT_SWING_LOW');
      
      expect(plan.target?.price).toBeCloseTo(121.8, 2);
      expect(plan.rewardRiskRatio).toBe(2.0);
      expect(plan.target?.rationale).toBe('Target is modeled at 2R by default.');
    });

    it('blocks plan if reward/risk < 1', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(defaultDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({ latest: { close: 100 } } as any);
      
      // Risk is 10. If we override targetRewardRisk to 0.5, R/R will be < 1.
      const prices = Array(60).fill({ close: 100, low: 100 });
      prices[0] = { close: 100, low: 90 };
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices } as any);

      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST', targetRewardRisk: 0.5 });
      
      expect(plan.planStatus).toBe('BLOCKED');
      expect(plan.blockers).toContain('Reward/Risk ratio is below 1.0. Plan blocked.');
    });

    it('calculates stop loss from SMA50 if recent swing low is too far', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(defaultDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({ latest: { close: 100 } } as any);
      
      // Swing low is 50 (50% drop, ignored). SMA50 is 95.
      const prices = Array(60).fill({ close: 95, low: 50 });
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices } as any);

      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST' });
      
      expect(plan.stopLoss?.method).toBe('SMA50');
      expect(plan.stopLoss?.price).toBeCloseTo(95 * 0.99, 1);
    });

    it('uses fixed fallback stop loss if no other structure exists', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(defaultDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({ latest: { close: 100 } } as any);
      const prices = Array(10).fill({ close: 100, low: 100, high: 100 });
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices } as any);

      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST' });
      
      expect(plan.stopLoss?.method).toBe('FIXED_PERCENT');
      expect(plan.stopLoss?.price).toBe(95); // 5% fallback default
    });

    it('calculates position size from risk percent and capital base', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(defaultDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({ latest: { close: 100 } } as any);
      
      // Risk is 10 per share.
      const prices = Array(60).fill({ close: 100, low: 100 });
      prices[0] = { close: 100, low: 90 };
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices } as any);

      // Capital = 10000. Risk% = 1%. Max Risk = $100.
      // Qty = 100 / 10 = 10 shares.
      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST', capitalBase: 10000, riskPercent: 1 });
      
      expect(plan.positionSizing).toBeDefined();
      expect(plan.positionSizing?.suggestedQuantity).toBe(9);
      expect(plan.positionSizing?.maxRiskAmount).toBe(100);
    });

    it('uses the default planning capital base for batch-style generation without portfolio input', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue({
        ...defaultDecision,
        action: 'CONSIDER_ENTRY',
        decisionScore: 91,
        confidence: 'HIGH',
        marketGateStatus: 'OPEN',
        marketCondition: 'HEALTHY',
        frameworkBacked: true,
        strategyVersion: undefined,
        strategyRating: { ratingGrade: 'GOOD', readinessLabel: 'PAPER_TEST_CANDIDATE' },
        readinessLabel: 'PAPER_TEST_CANDIDATE',
        reasons: ['Framework-backed trend proof passed.'],
        blockers: [],
        warnings: [],
        dataGaps: [],
        generatedAt: '2026-05-07T01:00:00.000Z',
      } as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({
        symbol: 'TEST',
        latest: { close: 100, date: '2026-05-06T00:00:00.000Z', source: 'database', data_status: 'COMPLETE' },
        source: 'database',
        data_status: 'COMPLETE',
      } as any);
      const prices = Array(60).fill(null).map((_, i) => ({
        close: 100,
        low: i === 0 ? 90 : 95,
        high: 105,
        date: `2026-04-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
      }));
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ symbol: 'TEST', data_status: 'COMPLETE', prices } as any);

      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST', region: 'IN', assetType: 'STOCK', backtestTimeframe: '3Y' });

      expect(plan.positionSizing?.capitalBase).toBe(100000);
      expect(plan.positionSizing?.suggestedQuantity).toBeGreaterThan(0);
      expect(plan.positionSizing?.notes).toContain('Sizing uses the default planning capital base because no portfolio or capital base was supplied.');
      expect(plan.dataGaps).not.toContain('capital_base_for_sizing');
      expect(plan.strategyProofSnapshot?.strategyVersion).toBe('1.0.0');
      expect(plan.paperReadinessBlockers).not.toContain('Position sizing is missing.');
      expect(plan.paperReadinessBlockers).not.toContain('Strategy version is missing.');
      expect(plan.paperReadinessStatus).toBe('READY_FOR_PAPER_REVIEW');
    });

    it('persists scope and proof snapshots on generated plans', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue({
        ...defaultDecision,
        action: 'CONSIDER_ENTRY',
        decisionScore: 91,
        confidence: 'HIGH',
        marketGate: 'OPEN',
        marketCondition: 'HEALTHY',
        frameworkBacked: true,
        strategyVersion: '1.2.0',
        strategyRating: { ratingGrade: 'GOOD', readinessLabel: 'PAPER_TEST_CANDIDATE' },
        readinessLabel: 'PAPER_TEST_CANDIDATE',
        reasons: ['Framework proof passed.'],
        blockers: [],
        warnings: [],
        dataGaps: [],
        generatedAt: '2026-05-07T01:00:00.000Z',
      } as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({
        symbol: 'TEST',
        latest: { close: 100, date: '2026-05-06T00:00:00.000Z', source: 'database', data_status: 'COMPLETE' },
        source: 'database',
        data_status: 'COMPLETE',
      } as any);
      const prices = Array(60).fill(null).map((_, i) => ({ close: 100, low: 90 + i * 0.1, high: 101, date: `2026-04-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z` }));
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ symbol: 'TEST', data_status: 'COMPLETE', prices } as any);

      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST', region: 'IN', assetType: 'STOCK', backtestTimeframe: '3Y' });

      expect(plan.region).toBe('IN');
      expect(plan.assetType).toBe('STOCK');
      expect(plan.backtestTimeframe).toBe('3Y');
      expect(plan.strategyRating).toBe('GOOD');
      expect(plan.strategyProofSnapshot?.proofStatus).toBe('AVAILABLE');
      expect(plan.strategyDecisionSnapshot?.decision).toBe('TRADE_CANDIDATE');
      expect(plan.marketDataSnapshot?.latestPriceTimestamp).toBe('2026-05-06T00:00:00.000Z');
      expect(plan.dataQualitySnapshot?.coverageStatus).toBe('GOOD');
      expect(plan.paperReadinessStatus).toBeDefined();
      expect(plan.snapshotVersion).toBe('trade-plan-proof-snapshot-v1');
      expect(mockRepository.upsert).toHaveBeenCalledWith(expect.objectContaining({
        region: 'IN',
        assetType: 'STOCK',
        strategyProofSnapshot: expect.any(Object),
        strategyDecisionSnapshot: expect.any(Object),
        marketDataSnapshot: expect.any(Object),
        dataQualitySnapshot: expect.any(Object),
        paperReadinessStatus: expect.any(String),
      }));
    });

    it('persists requested proof timeframe even when no backtest summary exists yet', async () => {
      (service as any).strategyFrameworkService.performance.mockResolvedValue([]);
      mockStrategyService.latestForInstrument.mockResolvedValue({
        ...defaultDecision,
        action: 'CONSIDER_ENTRY',
        decisionScore: 91,
        confidence: 'HIGH',
        marketGate: 'OPEN',
        marketCondition: 'HEALTHY',
        frameworkBacked: true,
        strategyVersion: '1.2.0',
        strategyRating: { ratingGrade: 'GOOD', readinessLabel: 'PAPER_TEST_CANDIDATE' },
        readinessLabel: 'PAPER_TEST_CANDIDATE',
        reasons: ['Framework proof passed.'],
        blockers: [],
        warnings: [],
        dataGaps: [],
        generatedAt: '2026-05-07T01:00:00.000Z',
      } as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({
        symbol: 'TEST',
        latest: { close: 100, date: '2026-05-06T00:00:00.000Z', source: 'database', data_status: 'COMPLETE' },
        source: 'database',
        data_status: 'COMPLETE',
      } as any);
      const prices = Array(60).fill(null).map((_, i) => ({ close: 100, low: 90 + i * 0.1, high: 101, date: `2026-04-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z` }));
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ symbol: 'TEST', data_status: 'COMPLETE', prices } as any);

      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST', region: 'IN', assetType: 'STOCK', backtestTimeframe: '3Y' });

      expect(plan.backtestTimeframe).toBe('3Y');
      expect(plan.strategyProofSnapshot?.backtestTimeframe).toBe('3Y');
      expect(plan.strategyProofSnapshot?.proofStatus).toBe('MISSING');
      expect(plan.paperReadinessBlockers).toContain('Backtest summary is missing for the selected scope/timeframe.');
      expect(plan.paperReadinessStatus).toBe('INSUFFICIENT_DATA');
    });

    it('adds a warning for portfolio concentration', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(defaultDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({ latest: { close: 100 } } as any);
      const prices = Array(60).fill({ close: 100, low: 100 });
      prices[0] = { close: 100, low: 90 };
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices } as any);

      // Make portfolio very small, so the trade consumes a massive percent
      mockPortfolioService.getPortfolioDetail.mockResolvedValue({
        totalValue: 500, // 500 total
        holdings: [],
      } as any);

      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST', portfolioId: 'PORT-1', riskPercent: 5 });
      
      // Risking 5% of 500 = $25 risk. Per share risk = $10. Qty = 2. Value = $200.
      // 200/500 = 40% concentration (exceeds default 10% limit).
      expect(plan.positionSizing?.positionValuePercent).toBe(40);
      expect(plan.warnings).toContain('Portfolio concentration warning.');
      expect(plan.portfolioImpact?.warnings[0]).toMatch(/Position size exceeds max single position exposure/);
    });

    it('blocks plan when market is CLOSED for long strategies', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue({
        ...defaultDecision,
        marketGateStatus: 'CLOSED'
      } as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue(defaultPriceResult as any);
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue(defaultPricesDto as any);

      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST' });
      
      expect(plan.planStatus).toBe('BLOCKED');
      expect(plan.blockers).toContain('Market gate is CLOSED for long entries.');
    });

    it('sets status to WATCH if price is extended above SMA50', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(defaultDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({ latest: { close: 150 } } as any); // Much higher than SMA50 (~98)
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue(defaultPricesDto as any);

      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST' });
      
      expect(plan.planStatus).toBe('WATCH');
      expect(plan.warnings).toContain('Price is extended beyond preferred entry zone (far above SMA50).');
    });

    it('sets risk grade to HIGH when strategy is unproven', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue({
        ...defaultDecision,
        frameworkBacked: false,
        strategyRating: 'UNPROVEN'
      } as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue(defaultPriceResult as any);
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue(defaultPricesDto as any);

      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST' });
      
      expect(plan.riskGrade).toBe('HIGH');
      expect(plan.warnings).toContain('Strategy is not framework-backed (unproven).');
    });

    it('adds target realism warning if target requires unrealistic move relative to volatility', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(defaultDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue(defaultPriceResult as any);
      
      // Setup low volatility: tight price ranges
      const lowVolPrices = Array(60).fill(null).map(() => ({ close: 100, high: 100.1, low: 99.9 }));
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices: lowVolPrices } as any);

      // Force target far away (e.g. 10R)
      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST', targetRewardRisk: 10 });
      
      expect(plan.warnings).toContain('Target requires an unrealistic move relative to recent volatility.');
      expect(plan.target?.quality).toBe('WEAK');
    });

    it('returns UNDEFINED risk grade when data is insufficient', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(defaultDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue(null as any); // Missing latest price

      const plan = await service.generatePlan({ instrumentId: 'INST-1', symbol: 'TEST' });
      
      expect(plan.riskGrade).toBe('UNDEFINED');
      expect(plan.planStatus).toBe('INSUFFICIENT_DATA');
    });
  });

  describe('batchGenerate', () => {
    it('returns progress metadata and calls generate for each candidate', async () => {
      mockStrategyService.candidates.mockResolvedValue({
        results: [
          { id: 'dec-1', instrumentId: 'INST-1', symbol: 'TEST1' },
          { id: 'dec-2', instrumentId: 'INST-2', symbol: 'TEST2' },
        ],
        total: 2,
        nextOffset: 2,
      } as any);

      const generateSpy = jest.spyOn(service, 'generatePlan').mockResolvedValue({} as any);

      const res = await service.batchGenerate({ batchSize: 25, offset: 0, region: 'IN' });
      
      expect(res.count).toBe(2);
      expect(res.plans.length).toBe(2);
      expect(res.candidateCount).toBe(2);
      expect(res.processedCount).toBe(2);
      expect(res.totalCount).toBe(2);
      expect(res.hasMore).toBe(false);
      expect(res.failures).toEqual([]);
      expect(generateSpy).toHaveBeenCalledTimes(2);
      expect(mockStrategyService.candidates).toHaveBeenCalledWith(expect.objectContaining({
        limit: 25,
        offset: 0,
        region: 'IN',
        assetType: undefined,
        decision: 'TRADE_CANDIDATE',
      }));
    });

    it('returns failure details when a candidate cannot be generated', async () => {
      mockStrategyService.candidates.mockResolvedValue({
        results: [
          { id: 'dec-1', instrumentId: 'INST-1', symbol: 'TEST1' },
          { id: 'dec-2', instrumentId: 'INST-2', symbol: 'TEST2' },
        ],
        total: 50,
      } as any);

      jest.spyOn(service, 'generatePlan')
        .mockResolvedValueOnce({ symbol: 'TEST1' } as any)
        .mockRejectedValueOnce(new Error('Scoped upsert failed'));

      const res = await service.batchGenerate({ batchSize: 25, offset: 0, region: 'IN' });

      expect(res.generatedCount).toBe(1);
      expect(res.failedCount).toBe(1);
      expect(res.nextOffset).toBe(25);
      expect(res.hasMore).toBe(true);
      expect(res.failures).toEqual([
        {
          strategyDecisionId: 'dec-2',
          instrumentId: 'INST-2',
          symbol: 'TEST2',
          reason: 'Scoped upsert failed',
        },
      ]);
    });

    it('returns candidate discovery and paper readiness diagnostics', async () => {
      mockStrategyService.candidates.mockResolvedValue({
        results: [
          { id: 'dec-1', instrumentId: 'INST-1', symbol: 'TEST1' },
        ],
        total: 1,
      } as any);

      jest.spyOn(service, 'generatePlan').mockResolvedValue({
        symbol: 'TEST1',
        paperReadinessStatus: 'WATCH_ONLY',
        paperReadinessBlockers: ['Strategy rating is WEAK.', 'Risk grade is HIGH; LOW or MEDIUM is required.'],
        strategyRating: 'WEAK',
        riskGrade: 'HIGH',
        planStatus: 'WATCH',
      } as any);

      const res = await service.batchGenerate({ batchSize: 25, offset: 0, region: 'IN', assetType: 'STOCK', backtestTimeframe: '10Y' });

      expect(res.rawCandidateCount).toBe(1);
      expect(res.eligibleCandidateCount).toBe(1);
      expect(res.paperReadinessSummary?.WATCH_ONLY).toBe(1);
      expect(res.topBlockers).toEqual(expect.arrayContaining([
        { reason: 'WEAK strategy rating', count: 1 },
        { reason: 'risk grade HIGH', count: 1 },
      ]));
      expect(res.backtestTimeframe).toBe('10Y');
    });
  });

  describe('funnelDiagnostics', () => {
    it('explains signals, decisions, generated plans, paper blockers, and scope', async () => {
      mockSignalService.funnelDiagnostics.mockResolvedValue({
        total: 3,
        bullish: 2,
        bearish: 1,
        neutral: 0,
        byDirection: { BULLISH: 2, BEARISH: 1 },
      } as any);
      mockStrategyService.funnelDiagnostics.mockResolvedValue({
        results: [
          { id: 'dec-1', instrumentId: 'INST-1', symbol: 'TEST1', strategy: 'TREND_MOMENTUM', decision: 'TRADE_CANDIDATE', frameworkBacked: true },
          { id: 'dec-2', instrumentId: 'INST-2', symbol: 'TEST2', strategy: 'TREND_MOMENTUM', decision: 'WATCH', frameworkBacked: true },
          { id: 'dec-3', instrumentId: 'INST-3', symbol: 'TEST3', strategy: 'DEFENSIVE_EXIT', decision: 'EXIT_CANDIDATE', frameworkBacked: false },
        ],
        total: 3,
      } as any);
      mockStrategyService.candidates.mockResolvedValue({
        results: [{ id: 'dec-1', instrumentId: 'INST-1', symbol: 'TEST1', strategy: 'TREND_MOMENTUM', decision: 'TRADE_CANDIDATE', frameworkBacked: true }],
        total: 1,
      } as any);
      (mockRepository as any).funnelPlans.mockResolvedValue([
        {
          strategy: 'TREND_MOMENTUM',
          planStatus: 'WATCH',
          riskGrade: 'HIGH',
          paperReadinessStatus: 'WATCH_ONLY',
          paperReadinessBlockers: ['Strategy rating is WEAK.', 'Risk grade is HIGH; LOW or MEDIUM is required.'],
          paperReadinessReasons: [],
          strategyRating: 'WEAK',
          backtestTimeframe: '10Y',
          backtestSummary: { timeframe: '10Y' },
          dataQualitySnapshot: { status: 'AVAILABLE', liquidityStatus: 'UNKNOWN' },
        },
      ]);

      const result = await service.funnelDiagnostics({ region: 'IN', assetType: 'STOCK' });

      expect(mockSignalService.funnelDiagnostics).toHaveBeenCalledWith(expect.objectContaining({ region: 'IN', assetType: 'STOCK' }));
      expect(mockStrategyService.funnelDiagnostics).toHaveBeenCalledWith(expect.objectContaining({ region: 'IN', assetType: 'STOCK' }));
      expect(mockStrategyService.candidates).toHaveBeenCalledWith(expect.objectContaining({ region: 'IN', assetType: 'STOCK', decision: 'TRADE_CANDIDATE', limit: 1, offset: 0 }));
      expect(result.rawSignals.bullish).toBe(2);
      expect(result.strategyDecisions.tradeCandidates).toBe(1);
      expect(result.strategyMatches.totalWithMatch).toBe(3);
      expect(result.strategyDecisions.frameworkBacked).toBe(3);
      expect(result.strategyDecisions.notFrameworkBacked).toBe(0);
      expect(result.tradePlanCandidateDiscovery.eligibleForPlanGeneration).toBe(1);
      expect(result.tradePlanCandidateDiscovery.skipReasonCounts).toEqual(expect.objectContaining({
        'WATCH decisions are not batch-generated unless explicitly allowed.': 1,
        'Exit or risk-reduction decisions are excluded from long entry plans.': 1,
      }));
      expect(result.generatedPlans.total).toBe(1);
      expect(result.paperReadiness.watchOnly).toBe(1);
      expect(result.paperReadiness.blockerCounts).toEqual(expect.arrayContaining([
        { reason: 'WEAK strategy rating', count: 1 },
        { reason: 'risk grade HIGH', count: 1 },
        { reason: 'using 10Y proof timeframe', count: 1 },
      ]));
      expect(result.proof.byBacktestTimeframe).toEqual([{ reason: '10Y', count: 1 }]);
      expect(result.dataQuality.unknownLiquidityCount).toBe(1);
      expect(result.recommendations).toContain('Current plans use 10Y proof. Consider regenerating with 3Y or 5Y if 10Y history is insufficient.');
    });

    it('reports exact trade candidate totals instead of bounded diagnostics sample counts', async () => {
      mockSignalService.funnelDiagnostics.mockResolvedValue({
        total: 100,
        bullish: 20,
        bearish: 5,
        neutral: 75,
        byDirection: { BULLISH: 20, BEARISH: 5, NEUTRAL: 75 },
      } as any);
      mockStrategyService.funnelDiagnostics.mockResolvedValue({
        results: [
          { id: 'dec-1', instrumentId: 'INST-1', symbol: 'TEST1', strategy: 'TREND_MOMENTUM', decision: 'TRADE_CANDIDATE', frameworkBacked: true },
          { id: 'dec-2', instrumentId: 'INST-2', symbol: 'TEST2', strategy: 'TREND_MOMENTUM', decision: 'WATCH', frameworkBacked: true },
        ],
        total: 5000,
      } as any);
      mockStrategyService.candidates.mockResolvedValue({
        results: [{ id: 'dec-1', instrumentId: 'INST-1', symbol: 'TEST1', strategy: 'TREND_MOMENTUM', decision: 'TRADE_CANDIDATE', frameworkBacked: true }],
        total: 87,
      } as any);
      (mockRepository as any).funnelPlans.mockResolvedValue([]);

      const result = await service.funnelDiagnostics({ region: 'IN', assetType: 'STOCK' });

      expect(result.strategyDecisions.tradeCandidates).toBe(87);
      expect(result.tradePlanCandidateDiscovery.eligibleForPlanGeneration).toBe(87);
    });

    it('reports non-framework-backed decisions only when legacy diagnostics are explicitly included', async () => {
      mockSignalService.funnelDiagnostics.mockResolvedValue({
        total: 4,
        bullish: 4,
        bearish: 0,
        neutral: 0,
        byDirection: { BULLISH: 4 },
      } as any);
      mockStrategyService.funnelDiagnostics.mockResolvedValue({
        results: [
          { id: 'dec-1', instrumentId: 'INST-1', symbol: 'TEST1', strategy: 'TREND_MOMENTUM', decision: 'TRADE_CANDIDATE', frameworkBacked: true },
          { id: 'dec-2', instrumentId: 'INST-2', symbol: 'TEST2', strategy: 'LEGACY_STRATEGY', decision: 'TRADE_CANDIDATE', frameworkBacked: false },
        ],
        total: 4,
      } as any);
      mockStrategyService.candidates.mockResolvedValue({ results: [], total: 0 } as any);
      (mockRepository as any).funnelPlans.mockResolvedValue([]);

      const result = await service.funnelDiagnostics({ region: 'IN', assetType: 'STOCK', includeLegacy: true } as any);

      expect(mockStrategyService.funnelDiagnostics).toHaveBeenCalledWith(expect.objectContaining({ includeLegacy: true }));
      expect(result.strategyDecisions.frameworkBacked).toBe(1);
      expect(result.strategyDecisions.notFrameworkBacked).toBe(3);
      expect(result.strategyMatches.totalWithMatch).toBe(1);
    });
  });
});
