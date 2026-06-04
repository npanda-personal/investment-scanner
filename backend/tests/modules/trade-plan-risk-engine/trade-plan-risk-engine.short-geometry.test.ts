/**
 * Short trade-plan geometry tests.
 *
 * Covers:
 * - Correct short geometry: stop ABOVE entry, target BELOW entry, R:R, position size
 * - F&O gate: cash-only instrument → no short plan (AVOID/BLOCKED note)
 * - Long plans are unchanged
 * - Research-support language — no buy/sell wording in messages
 */

import { TradePlanRiskEngineService } from '../../../src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service';
import { StrategyDecisionEngineService } from '../../../src/modules/strategy-decision-engine';
import { MarketDataFoundationService } from '../../../src/modules/market-data-foundation/market-data-foundation.service';
import { PortfolioManagementService } from '../../../src/modules/portfolio-management';
import { TradePlanRiskEngineRepository } from '../../../src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository';
import { SignalGenerationEngineService } from '../../../src/modules/signal-generation-engine';
import { tradePlanGeometryMessages } from '../../../src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry';

jest.mock('../../../src/modules/strategy-decision-engine');
jest.mock('../../../src/modules/market-data-foundation/market-data-foundation.service');
jest.mock('../../../src/modules/portfolio-management');
jest.mock('../../../src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository');
jest.mock('../../../src/modules/signal-generation-engine');

function makePrices(count: number, close = 100, swingHighOverride?: number, swingLowOverride?: number) {
  return Array.from({ length: count }, (_, i) => ({
    close,
    high: i === 0 && swingHighOverride != null ? swingHighOverride : close * 1.02,
    low: i === 0 && swingLowOverride != null ? swingLowOverride : close * 0.98,
    date: `2026-05-${String(Math.max(1, 6 - i)).padStart(2, '0')}T00:00:00.000Z`,
  }));
}

describe('TradePlanRiskEngineService — short geometry', () => {
  let service: TradePlanRiskEngineService;
  let mockStrategyService: jest.Mocked<StrategyDecisionEngineService>;
  let mockMarketDataService: jest.Mocked<MarketDataFoundationService>;
  let mockRepository: jest.Mocked<TradePlanRiskEngineRepository>;

  const shortDecision = {
    id: 'dec-short-1',
    instrumentId: 'INST-FOO',
    symbol: 'FOOLTD',
    strategy: 'BREAKDOWN_MOMENTUM',
    decision: 'TRADE_CANDIDATE',
    direction: 'BEARISH',
    derivativesEligible: true,
    marketGateStatus: 'OPEN',
    strategyRating: 'GOOD',
    frameworkBacked: true,
    readinessLabel: 'PAPER_TEST_CANDIDATE',
    confidence: 'HIGH',
    reasons: ['Price below SMA50/SMA200 with bearish signal.'],
    blockers: [],
    warnings: [],
    dataGaps: [],
    generatedAt: '2026-06-04T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockStrategyService = new StrategyDecisionEngineService() as any;
    mockMarketDataService = new MarketDataFoundationService() as any;
    mockRepository = new TradePlanRiskEngineRepository() as any;

    service = new TradePlanRiskEngineService();
    (service as any).strategyDecisionService = mockStrategyService;
    (service as any).marketDataService = mockMarketDataService;
    (service as any).portfolioService = new PortfolioManagementService() as any;
    (service as any).repository = mockRepository;
    (service as any).signalService = new SignalGenerationEngineService() as any;
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
        lastEvaluatedAt: '2026-06-04T00:00:00.000Z',
      }),
      getLatestEvaluationForInstrument: jest.fn(),
    };
    (service as any).strategyFrameworkService = {
      performance: jest.fn().mockResolvedValue([{
        timeframe: '3Y',
        cagr: 0.10,
        maxDrawdown: -0.18,
        sharpe: 0.9,
        winRate: 0.52,
        profitFactor: 1.3,
        tradeCount: 35,
        ratingGrade: 'GOOD',
        readinessLabel: 'PAPER_TEST_CANDIDATE',
        generatedAt: '2026-06-04T00:00:00.000Z',
      }]),
    };
    mockMarketDataService.getInstrument.mockResolvedValue({
      id: 'INST-FOO',
      symbol: 'FOOLTD',
      currency: 'INR',
      exchange: 'NSE',
    } as any);
    (mockMarketDataService as any).latestStoredCandleInfo.mockResolvedValue({
      latestCompletedTradingDate: '2026-06-03T00:00:00.000Z',
      latestStoredTradingDate: '2026-06-03T00:00:00.000Z',
    });
    mockRepository.upsert.mockImplementation(async (data: any) => data);
  });

  describe('short plan for F&O-eligible instrument', () => {
    it('generates stop ABOVE entry and target BELOW entry', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(shortDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({ latest: { close: 100 } } as any);
      // swingHigh of 110 → stop slightly above at 111.1
      const prices = makePrices(60, 100, 110);
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices } as any);

      const plan = await service.generatePlan({
        instrumentId: 'INST-FOO',
        symbol: 'FOOLTD',
        derivativesEligible: true,
      });

      expect(plan.direction).toBe('SHORT');
      expect(plan.stopLoss).toBeDefined();
      expect(plan.target).toBeDefined();
      // stop must be above entry
      expect(plan.stopLoss!.price).toBeGreaterThan(plan.entryZone!.preferredEntryMax);
      // target (cover level) must be below entry
      expect(plan.target!.price).toBeLessThan(plan.entryZone!.preferredEntryMin);
      // R:R > 0
      expect(plan.rewardRiskRatio).toBeGreaterThan(0);
    });

    it('computes correct R:R ratio for a short plan', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(shortDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({ latest: { close: 100 } } as any);
      // Force swing high to 110 so risk = 110*1.01 - 100 ≈ 11.1, reward at 2R = 22.2 → cover ≈ 77.8
      const prices = makePrices(60, 100, 110);
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices } as any);

      const plan = await service.generatePlan({
        instrumentId: 'INST-FOO',
        symbol: 'FOOLTD',
        derivativesEligible: true,
        targetRewardRisk: 2,
      });

      expect(plan.rewardRiskRatio).toBeCloseTo(2.0, 1);
      // cover target must be below entry
      expect(plan.target!.price).toBeLessThan(100);
    });

    it('computes correct position size from risk for a short plan', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(shortDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({ latest: { close: 100 } } as any);
      // Swing high at 110 → stop at 111.1. Risk per share = 111.1 - 100 = 11.1
      const prices = makePrices(60, 100, 110);
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices } as any);

      const plan = await service.generatePlan({
        instrumentId: 'INST-FOO',
        symbol: 'FOOLTD',
        capitalBase: 10000,
        riskPercent: 1,
        derivativesEligible: true,
      });

      // maxRiskAmt = 100; risk per share ≈ 11.1 → qty = floor(100/11.1) = 9
      expect(plan.positionSizing).toBeDefined();
      expect(plan.positionSizing!.suggestedQuantity).toBeGreaterThanOrEqual(1);
      expect(plan.positionSizing!.maxRiskAmount).toBe(100);
    });

    it('uses RECENT_SWING_HIGH method when a valid swing high exists', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(shortDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({ latest: { close: 100 } } as any);
      const prices = makePrices(60, 100, 115);
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices } as any);

      const plan = await service.generatePlan({
        instrumentId: 'INST-FOO',
        symbol: 'FOOLTD',
        derivativesEligible: true,
      });

      expect(plan.stopLoss!.method).toBe('RECENT_SWING_HIGH');
      expect(plan.stopLoss!.price).toBeCloseTo(115 * 1.01, 1);
    });

    it('does not use buy/sell language in any plan fields', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue(shortDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({ latest: { close: 100 } } as any);
      const prices = makePrices(60, 100, 110);
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices } as any);

      const plan = await service.generatePlan({
        instrumentId: 'INST-FOO',
        symbol: 'FOOLTD',
        derivativesEligible: true,
      });

      const allText = [
        ...(plan.blockers || []),
        ...(plan.warnings || []),
        ...(plan.invalidationRules || []),
        plan.stopLoss?.rationale || '',
        plan.target?.rationale || '',
      ].join(' ').toLowerCase();

      expect(allText).not.toContain('buy');
      expect(allText).not.toContain('sell short');
    });
  });

  describe('short plan blocked for cash-only (non-F&O) instruments', () => {
    it('returns BLOCKED with AVOID note when derivativesEligible is false', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue({
        ...shortDecision,
        derivativesEligible: false,
      } as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({ latest: { close: 100 } } as any);
      const prices = makePrices(60, 100, 110);
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices } as any);

      const plan = await service.generatePlan({
        instrumentId: 'INST-FOO',
        symbol: 'FOOLTD',
        derivativesEligible: false,
      });

      expect(plan.planStatus).toBe('BLOCKED');
      expect(plan.blockers).toContain(tradePlanGeometryMessages.CASH_ONLY_SHORT_NOT_ELIGIBLE);
    });

    it('returns BLOCKED when derivativesEligible is omitted and decision sets it false', async () => {
      mockStrategyService.latestForInstrument.mockResolvedValue({
        ...shortDecision,
        derivativesEligible: false,
      } as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({ latest: { close: 100 } } as any);
      const prices = makePrices(60, 100, 110);
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices } as any);

      // No explicit derivativesEligible in request — falls back to decision.derivativesEligible
      const plan = await service.generatePlan({ instrumentId: 'INST-FOO', symbol: 'FOOLTD' });

      expect(plan.planStatus).toBe('BLOCKED');
      expect(plan.blockers.join(' ')).toContain('derivatives-eligible');
    });
  });

  describe('long plans remain unchanged', () => {
    it('generates a valid LONG plan for a TREND_MOMENTUM decision', async () => {
      const longDecision = {
        id: 'dec-long-1',
        instrumentId: 'INST-BAR',
        symbol: 'BARLTD',
        strategy: 'TREND_MOMENTUM',
        decision: 'TRADE_CANDIDATE',
        direction: 'BULLISH',
        marketGateStatus: 'OPEN',
        strategyRating: 'GOOD',
        frameworkBacked: true,
        readinessLabel: 'PAPER_TEST_CANDIDATE',
        confidence: 'HIGH',
        reasons: ['Bullish trend confirmed.'],
        blockers: [],
        warnings: [],
        dataGaps: [],
        generatedAt: '2026-06-04T00:00:00.000Z',
      };
      mockStrategyService.latestForInstrument.mockResolvedValue(longDecision as any);
      mockMarketDataService.latestPriceByInstrumentId.mockResolvedValue({ latest: { close: 100 } } as any);
      const prices = makePrices(60, 100, 105, 90);
      mockMarketDataService.listPricesByInstrumentId.mockResolvedValue({ prices } as any);

      const plan = await service.generatePlan({ instrumentId: 'INST-BAR', symbol: 'BARLTD' });

      expect(plan.direction).toBe('LONG');
      // Long plan: stop below entry, target above entry
      expect(plan.stopLoss!.price).toBeLessThan(plan.entryZone!.preferredEntryMin);
      expect(plan.target!.price).toBeGreaterThan(plan.entryZone!.preferredEntryMax);
      expect(plan.rewardRiskRatio).toBeGreaterThan(0);
    });
  });
});
