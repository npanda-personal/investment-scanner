import { TradePlanRiskEngineService } from '../../../src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service';
import { StrategyDecisionEngineService } from '../../../src/modules/strategy-decision-engine';
import { MarketDataFoundationService } from '../../../src/modules/market-data-foundation/market-data-foundation.service';
import { PortfolioManagementService } from '../../../src/modules/portfolio-management';
import { TradePlanRiskEngineRepository } from '../../../src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository';

// Mock dependencies
jest.mock('../../../src/modules/strategy-decision-engine');
jest.mock('../../../src/modules/market-data-foundation/market-data-foundation.service');
jest.mock('../../../src/modules/portfolio-management');
jest.mock('../../../src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository');

describe('TradePlanRiskEngineService', () => {
  let service: TradePlanRiskEngineService;
  
  let mockStrategyService: jest.Mocked<StrategyDecisionEngineService>;
  let mockMarketDataService: jest.Mocked<MarketDataFoundationService>;
  let mockPortfolioService: jest.Mocked<PortfolioManagementService>;
  let mockRepository: jest.Mocked<TradePlanRiskEngineRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStrategyService = new StrategyDecisionEngineService() as any;
    mockMarketDataService = new MarketDataFoundationService() as any;
    mockPortfolioService = new PortfolioManagementService() as any;
    mockRepository = new TradePlanRiskEngineRepository() as any;

    service = new TradePlanRiskEngineService();
    // Inject mocks
    (service as any).strategyDecisionService = mockStrategyService;
    (service as any).marketDataService = mockMarketDataService;
    (service as any).portfolioService = mockPortfolioService;
    (service as any).repository = mockRepository;

    mockRepository.upsert.mockImplementation(async (data: any) => data);
  });

  describe('getModelRules', () => {
    it('should return default model thresholds', () => {
      const rules = service.getModelRules();
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
      
      expect(plan.stopLoss?.price).toBe(90);
      expect(plan.stopLoss?.method).toBe('RECENT_SWING_LOW');
      
      // Target should be Entry + (Risk * 2) = 100 + (10 * 2) = 120
      expect(plan.target?.price).toBe(120);
      expect(plan.rewardRiskRatio).toBe(2.0); // (120 - 100) / 10 = 2
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
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices: [] } as any); // No history

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
      expect(plan.positionSizing?.suggestedQuantity).toBe(10);
      expect(plan.positionSizing?.maxRiskAmount).toBe(100);
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
      expect(generateSpy).toHaveBeenCalledTimes(2);
    });
  });
});
