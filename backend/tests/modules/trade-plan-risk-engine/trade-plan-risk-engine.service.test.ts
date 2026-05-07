import { TradePlanRiskService } from '../../../src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service';
import prisma from '../../../src/db/prisma';
import { PortfolioManagementService } from '../../../src/modules/portfolio-management/portfolio-management.service';

jest.mock('../../../src/db/prisma', () => ({
  __esModule: true,
  default: {
    strategyDecisionResult: { findUnique: jest.fn(), findMany: jest.fn() },
    priceTick: { findMany: jest.fn() },
    stock: { findUnique: jest.fn() },
    tradePlanResult: { upsert: jest.fn(), findFirst: jest.fn(), count: jest.fn(), findMany: jest.fn() }
  }
}));

jest.mock('../../../src/modules/portfolio-management/portfolio-management.service');

describe('TradePlanRiskService', () => {
  let service: TradePlanRiskService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TradePlanRiskService();
  });

  describe('generatePlan', () => {
    it('generates a valid plan with correct reward/risk and position sizing', async () => {
      (prisma.strategyDecisionResult.findUnique as jest.Mock).mockResolvedValue({
        id: 'dec-1',
        instrumentId: 'inst-1',
        symbol: 'RELIANCE',
        strategy: 'TREND_MOMENTUM',
        strategyVersion: '1.0.0',
        decision: 'TRADE_CANDIDATE',
        marketGate: 'OPEN',
      });

      // Mock 20 days of prices for ATR / SMA calculations
      const prices = Array.from({ length: 50 }, (_, i) => ({
        close: 100 + i, // latest price will be 149
        high: 102 + i,
        low: 98 + i,
      })).reverse(); // latest first

      (prisma.priceTick.findMany as jest.Mock).mockResolvedValue(prices);
      (prisma.stock.findUnique as jest.Mock).mockResolvedValue({
        id: 'inst-1',
        sector: 'Energy'
      });

      (prisma.tradePlanResult.upsert as jest.Mock).mockImplementation(async (args) => {
        return args.create;
      });

      const request = {
        instrumentId: 'inst-1',
        symbol: 'RELIANCE',
        strategyDecisionId: 'dec-1',
        capitalBase: 10000,
        riskPercent: 1,
        targetRewardRisk: 2
      };

      const plan = await service.generatePlan(request);

      expect(plan.planStatus).toBe('VALID');
      expect(plan.instrumentId).toBe('inst-1');
      expect(plan.symbol).toBe('RELIANCE');
      expect(plan.strategy).toBe('TREND_MOMENTUM');
      
      // latest price is 149, sma50 is approx 124.5.
      // So stop method could be SMA50 or ATR.
      // Depending on the exact logic, it will calculate a stop and target.
      expect(plan.entryZone.type).toBe('CURRENT_PRICE');
      expect(plan.target.method).toBe('REWARD_RISK_MULTIPLE');
      expect(plan.rewardRiskRatio).toBeGreaterThanOrEqual(1.9); // Target uses 2x
      
      // max risk amount = 1% of 10000 = 100
      expect(plan.positionSizing?.maxRiskAmount).toBe(100);
      expect(plan.positionSizing?.capitalBase).toBe(10000);
    });

    it('blocks plan if market gate is CLOSED', async () => {
      (prisma.strategyDecisionResult.findUnique as jest.Mock).mockResolvedValue({
        id: 'dec-1',
        instrumentId: 'inst-1',
        symbol: 'RELIANCE',
        strategy: 'TREND_MOMENTUM',
        strategyVersion: '1.0.0',
        decision: 'TRADE_CANDIDATE',
        marketGate: 'CLOSED',
      });

      (prisma.priceTick.findMany as jest.Mock).mockResolvedValue([{ close: 100 }]);
      (prisma.stock.findUnique as jest.Mock).mockResolvedValue({ sector: 'Energy' });
      (prisma.tradePlanResult.upsert as jest.Mock).mockImplementation(async (args) => args.create);

      const plan = await service.generatePlan({
        instrumentId: 'inst-1',
        symbol: 'RELIANCE',
        strategyDecisionId: 'dec-1',
      });

      expect(plan.planStatus).toBe('BLOCKED');
      expect(plan.blockers).toContain('Market gate is CLOSED for new entries.');
    });

    it('blocks plan if missing price history', async () => {
      (prisma.strategyDecisionResult.findUnique as jest.Mock).mockResolvedValue({
        id: 'dec-1',
        instrumentId: 'inst-1',
        symbol: 'RELIANCE',
        strategy: 'TREND_MOMENTUM',
        decision: 'TRADE_CANDIDATE',
        marketGate: 'OPEN',
      });

      (prisma.priceTick.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.stock.findUnique as jest.Mock).mockResolvedValue({ sector: 'Energy' });
      (prisma.tradePlanResult.upsert as jest.Mock).mockImplementation(async (args) => args.create);

      const plan = await service.generatePlan({
        instrumentId: 'inst-1',
        symbol: 'RELIANCE',
        strategyDecisionId: 'dec-1',
      });

      expect(plan.planStatus).toBe('BLOCKED');
      expect(plan.blockers).toContain('Missing latest price');
      expect(plan.dataGaps).toContain('PRICE');
    });

    it('adds portfolio warnings if sector exposure is exceeded', async () => {
       (prisma.strategyDecisionResult.findUnique as jest.Mock).mockResolvedValue({
        id: 'dec-1',
        instrumentId: 'inst-1',
        symbol: 'RELIANCE',
        strategy: 'TREND_MOMENTUM',
        decision: 'TRADE_CANDIDATE',
        marketGate: 'OPEN',
      });

      // Price = 100. Let's make stop loss = 90. Risk = 10 per share.
      const prices = Array.from({ length: 50 }, (_, i) => ({ close: 50 + i, high: 52+i, low: 48+i })).reverse();
      (prisma.priceTick.findMany as jest.Mock).mockResolvedValue(prices);
      (prisma.stock.findUnique as jest.Mock).mockResolvedValue({ sector: 'Energy' });
      
      const mockPmService = PortfolioManagementService as jest.MockedClass<typeof PortfolioManagementService>;
      mockPmService.prototype.summary = jest.fn().mockResolvedValue({
        totalValue: 100000,
        holdings: [
           { symbol: 'ONGC', sector: 'Energy', marketValue: 30000 } // already 30%
        ]
      });

      (prisma.tradePlanResult.upsert as jest.Mock).mockImplementation(async (args) => args.create);

      const plan = await service.generatePlan({
        instrumentId: 'inst-1',
        symbol: 'RELIANCE',
        strategyDecisionId: 'dec-1',
        portfolioId: 'port-1',
        riskPercent: 1
      });

      expect(plan.portfolioImpact?.warnings.length).toBeGreaterThan(0);
      expect(plan.warnings.some(w => w.includes('Sector exposure would exceed 30%'))).toBe(true);
    });
  });
});
