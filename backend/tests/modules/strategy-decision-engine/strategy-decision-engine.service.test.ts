/// <reference types="@types/jest" />
import { StrategyDecisionEngineService } from '../../../src/modules/strategy-decision-engine';
import { StrategyFrameworkRegistry, StrategyFrameworkService } from '../../../src/modules/strategy-framework';
import type { StrategyDefinition } from '../../../src/modules/strategy-framework';
import {
  BREADTH_WEAK_THRESHOLD,
  BREADTH_VERY_WEAK_THRESHOLD,
} from '../../../src/modules/market-context-intelligence/capital-posture.types';

const makePrices = (days = 260, start = '2025-01-01', first = 50, slope = 1) => {
  const startDate = new Date(start);
  return Array.from({ length: days }, (_item, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const close = first + index * slope;
    return { date: date.toISOString(), close, adjusted_close: close, volume: 100000 + index };
  });
};

describe('StrategyDecisionEngineService', () => {
  let service: StrategyDecisionEngineService;
  let mockContext: any;
  let mockSignal: any;
  let mockCalibration: any;
  let mockQuality: any;
  let mockSmartMoney: any;

  beforeEach(() => {
    mockContext = {
      summary: jest.fn().mockResolvedValue({ dataStatus: 'COMPLETE' }),
      regime: jest.fn().mockResolvedValue({ regime: 'RISK_ON', score: 80 }),
      breadth: jest.fn().mockResolvedValue({ percentAboveSma50: 0.7 }),
    };
    mockSignal = {
      latestForInstrument: jest.fn().mockResolvedValue({ score: 75, direction: 'BULLISH' }),
      topSignals: jest.fn().mockResolvedValue({ signals: [] }),
    };
    mockCalibration = {
      latestForInstrument: jest.fn().mockResolvedValue({ calibratedScore: 82 }),
    };
    mockQuality = {
      diagnostics: jest.fn().mockResolvedValue({ eligibleForSignals: true }),
    };
    mockSmartMoney = {
      stock: jest.fn().mockResolvedValue({ status: 'ACCUMULATION' }),
    };

    service = new StrategyDecisionEngineService(
      {} as any, // repository
      {} as any, // marketData
      mockContext as any,
      mockSignal as any,
      mockCalibration as any,
      mockQuality as any,
      mockSmartMoney as any,
      {} as any, // portfolio
      {} as any  // watchlist
    );
  });

  describe('marketGate', () => {
    it('produces OPEN/HEALTHY when Risk-On and breadth is strong', async () => {
      const gate = await service.marketGate();
      expect(gate.marketGate).toBe('OPEN');
      expect(gate.marketCondition).toBe('HEALTHY');
      expect(gate.allowedActions).toContain('NEW_LONG_TRADES_ALLOWED');
    });

    it('produces CLOSED/BAD when Risk-Off', async () => {
      mockContext.regime.mockResolvedValue({ regime: 'RISK_OFF', score: 20 });
      const gate = await service.marketGate();
      expect(gate.marketGate).toBe('CLOSED');
      expect(gate.marketCondition).toBe('BAD');
    });

    it('produces SELECTIVE when mixed', async () => {
      mockContext.regime.mockResolvedValue({ regime: 'NEUTRAL', score: 50 });
      mockContext.breadth.mockResolvedValue({ percentAboveSma50: 0.5 });
      const gate = await service.marketGate();
      expect(gate.marketGate).toBe('SELECTIVE');
    });

    // ── Capital Posture threshold alignment ─────────────────────────────────
    // These tests verify that marketGate uses the SAME threshold constants as
    // Capital Posture (capital-posture.types.ts) so both modules classify
    // identically when thresholds are tuned.

    it('uses Capital Posture BREADTH_WEAK_THRESHOLD as the OPEN boundary (not a hardcoded 0.60)', () => {
      // A breadth value AT the Capital Posture OPEN threshold must produce OPEN for RISK_ON.
      const summaryBase = { dataStatus: 'COMPLETE' };
      const regimeOn    = { regime: 'RISK_ON', score: 80 };

      // Exactly at threshold → OPEN
      const atThreshold = (service as any).marketGateFromSummary(
        summaryBase,
        regimeOn,
        { percentAboveSma50: BREADTH_WEAK_THRESHOLD },
      );
      expect(atThreshold.marketGate).toBe('OPEN');

      // Just below the Capital Posture threshold → SELECTIVE (not OPEN)
      const justBelow = (service as any).marketGateFromSummary(
        summaryBase,
        regimeOn,
        { percentAboveSma50: BREADTH_WEAK_THRESHOLD - 0.01 },
      );
      expect(justBelow.marketGate).toBe('SELECTIVE');
    });

    it('uses Capital Posture BREADTH_VERY_WEAK_THRESHOLD as the CLOSED boundary (not a hardcoded 0.30)', () => {
      const summaryBase  = { dataStatus: 'COMPLETE' };
      const regimeNeutral = { regime: 'NEUTRAL', score: 50 };

      // Just below BREADTH_VERY_WEAK_THRESHOLD with neutral regime → CLOSED
      const justBelow = (service as any).marketGateFromSummary(
        summaryBase,
        regimeNeutral,
        { percentAboveSma50: BREADTH_VERY_WEAK_THRESHOLD - 0.01 },
      );
      expect(justBelow.marketGate).toBe('CLOSED');

      // Exactly at BREADTH_VERY_WEAK_THRESHOLD → SELECTIVE (not CLOSED)
      const atThreshold = (service as any).marketGateFromSummary(
        summaryBase,
        regimeNeutral,
        { percentAboveSma50: BREADTH_VERY_WEAK_THRESHOLD },
      );
      expect(atThreshold.marketGate).toBe('SELECTIVE');
    });

    it('classifies a breadth value between old 0.60 and CP BREADTH_WEAK_THRESHOLD consistently with Capital Posture', () => {
      // Old hardcoded threshold was 0.60.  Capital Posture BREADTH_WEAK_THRESHOLD is 0.40.
      // A breadth of 0.50 (between old 0.60 and CP 0.40) used to be SELECTIVE under the old
      // code but would now also be SELECTIVE (RISK_ON but breadth below OPEN threshold).
      // The key assertion is that the exact same threshold constant drives both modules.
      const midBreadth = (BREADTH_WEAK_THRESHOLD + 0.60) / 2; // e.g. 0.50
      const gate = (service as any).marketGateFromSummary(
        { dataStatus: 'COMPLETE' },
        { regime: 'RISK_ON', score: 80 },
        { percentAboveSma50: midBreadth },
      );
      // midBreadth (0.50) >= BREADTH_WEAK_THRESHOLD (0.40) → OPEN
      // This confirms the threshold is CP's 0.40, not the old 0.60
      expect(gate.marketGate).toBe('OPEN');
    });

    it('output contract (gate values and allowedActions) is unchanged from equivalent inputs', () => {
      // OPEN gate still produces the same allowed-action set
      const openGate = (service as any).marketGateFromSummary(
        { dataStatus: 'COMPLETE' },
        { regime: 'RISK_ON', score: 80 },
        { percentAboveSma50: 0.70 },
      );
      expect(openGate.marketGate).toBe('OPEN');
      expect(openGate.marketCondition).toBe('HEALTHY');
      expect(openGate.allowedActions).toEqual(expect.arrayContaining(['NEW_LONG_TRADES_ALLOWED', 'ONLY_HIGH_QUALITY_SETUPS']));

      // CLOSED gate still produces manage-only
      const closedGate = (service as any).marketGateFromSummary(
        { dataStatus: 'COMPLETE' },
        { regime: 'RISK_OFF', score: 20 },
        { percentAboveSma50: 0.10 },
      );
      expect(closedGate.marketGate).toBe('CLOSED');
      expect(closedGate.marketCondition).toBe('BAD');
      expect(closedGate.allowedActions).toEqual(['MANAGE_EXISTING_POSITIONS_ONLY']);

      // SELECTIVE gate still produces the correct set
      const selectiveGate = (service as any).marketGateFromSummary(
        { dataStatus: 'COMPLETE' },
        { regime: 'NEUTRAL', score: 50 },
        { percentAboveSma50: 0.35 },
      );
      expect(selectiveGate.marketGate).toBe('SELECTIVE');
      expect(selectiveGate.marketCondition).toBe('MIXED');
      expect(selectiveGate.allowedActions).toEqual(expect.arrayContaining(['ONLY_HIGH_QUALITY_SETUPS', 'MANAGE_EXISTING_POSITIONS_ONLY']));
    });
  });

  describe('latestForInstrument', () => {
    it('is read-only and does not evaluate or persist missing decisions during page reads', async () => {
      const repository = {
        latestForInstrument: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      };
      const svc = new StrategyDecisionEngineService(
        repository as any,
        {} as any,
        mockContext as any,
        mockSignal as any,
        mockCalibration as any,
        mockQuality as any,
        mockSmartMoney as any,
        {} as any,
        {} as any
      );
      const evaluateSpy = jest.spyOn(svc, 'evaluateInstrumentStrategy');

      await expect(svc.latestForInstrument('stock-1', 'TREND_MOMENTUM', 'IN')).resolves.toBeNull();

      expect(repository.latestForInstrument).toHaveBeenCalledWith('stock-1', 'TREND_MOMENTUM');
      expect(evaluateSpy).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('evaluateTrendMomentum', () => {
    it('returns TRADE_CANDIDATE when all rules align', () => {
      const ctx = {
        instrument: { id: '1', symbol: 'ABC', sector: 'Tech' },
        prices: [100, 95, 90],
        latestPrice: 100,
        sma50: 90,
        sma200: 80,
        rsi: 55,
        calibrated: { calibratedScore: 85 },
        smartMoney: { status: 'ACCUMULATION' },
        quality: { eligibleForSignals: true },
        gate: { marketGate: 'OPEN' },
        sectors: [{ sector: 'Tech', relativeStrengthScore: 70 }],
      };
      const result = (service as any).evaluateTrendMomentum(ctx);
      expect(result.decision).toBe('TRADE_CANDIDATE');
      expect(result.action).toBe('CONSIDER_ENTRY');
    });

    it('uses rule-based risk review instead of arbitrary target semantics', () => {
      const ctx = {
        instrument: { id: '1', symbol: 'ABC', sector: 'Tech' },
        prices: new Array(220).fill(100),
        latestPrice: 100,
        sma50: 90,
        sma200: 80,
        rsi: 55,
        calibrated: { calibratedScore: 85 },
        smartMoney: { status: 'ACCUMULATION' },
        quality: { eligibleForSignals: true },
        gate: { marketGate: 'OPEN' },
        sectors: [{ sector: 'Tech', relativeStrengthScore: 70 }],
      };
      const result = (service as any).evaluateTrendMomentum(ctx);
      const riskPlan = result.riskPlan;
      const userFacingRiskText = [
        riskPlan?.targetPriceCompatibilityNote,
        riskPlan?.rationale,
        riskPlan?.reasonSummary,
        ...(riskPlan?.exitRules || []),
        ...(riskPlan?.invalidationRules || []),
      ].join(' ');

      expect(riskPlan?.targetPrice).toBeNull();
      expect(riskPlan?.rewardRiskRatio).toBeNull();
      expect(riskPlan?.riskReviewLevel).toBe('LOW');
      expect(userFacingRiskText).toContain('rule-based');
      expect(userFacingRiskText).toContain('Exit condition met: momentum evidence weakened.');
      expect(userFacingRiskText).not.toContain('115.00');
      expect(userFacingRiskText).not.toContain('Target price achieved.');
      expect(userFacingRiskText).not.toContain('15%');
      expect(userFacingRiskText.toLowerCase()).not.toContain('profit target');
      expect(userFacingRiskText.toLowerCase()).not.toContain('buy target');
      expect(userFacingRiskText.toLowerCase()).not.toContain('sell target');
      expect(userFacingRiskText.toLowerCase()).not.toContain('guaranteed');
      expect(userFacingRiskText.toLowerCase()).not.toContain('expected return');
      expect(userFacingRiskText.toLowerCase()).not.toContain('must buy');
      expect(userFacingRiskText.toLowerCase()).not.toContain('must sell');
    });

    it('should return AVOID if price is below SMA50', () => {
      const ctx = {
        instrument: { id: 'test', symbol: 'TEST', sector: 'Tech' },
        prices: new Array(200).fill(100),
        latestPrice: 85,
        sma50: 90,
        sma200: 80,
        gate: { marketGate: 'OPEN' },
        quality: { eligibleForSignals: true },
        sectors: [],
      };
      const result = (service as any).evaluateTrendMomentum(ctx);
      expect(result.decision).toBe('AVOID');
      expect(result.blockers).toContain('Price is below SMA50 support.');
    });

    it('should return AVOID if market gate is CLOSED', () => {
      const ctx = {
        instrument: { id: 'test', symbol: 'TEST', sector: 'Tech' },
        prices: new Array(200).fill(100),
        latestPrice: 110,
        sma50: 100,
        sma200: 90,
        gate: { marketGate: 'CLOSED' },
        quality: { eligibleForSignals: true },
        sectors: [{ sector: 'Tech', relativeStrengthScore: 60 }],
      };
      const result = (service as any).evaluateTrendMomentum(ctx);
      expect(result.decision).toBe('AVOID');
      expect(result.blockers).toContain('Market gate is CLOSED; no new long candidates.');
    });

    it('should include score breakdown and cap confidence if data gaps exist', () => {
      const ctx = {
        instrument: { id: 'test', symbol: 'TEST', sector: 'Tech' },
        prices: new Array(200).fill(100),
        latestPrice: 110,
        sma50: 100,
        sma200: 90,
        gate: { marketGate: 'OPEN' },
        quality: { eligibleForSignals: true },
        sectors: [{ sector: 'Tech', relativeStrengthScore: 60 }],
        // missing calibrated, rawSignal, smartMoney
      };
      const result = (service as any).evaluateTrendMomentum(ctx);
      expect(result.scoreBreakdown).toBeDefined();
      expect(result.scoreBreakdown.total).toBeLessThan(100);
      expect(result.dataGaps.length).toBeGreaterThan(0);
      expect(result.confidence).toBe('MEDIUM'); // Capped because of data gaps
    });
    });

    describe('evaluatePullback', () => {
    it('should identify a pullback candidate near SMA50', () => {
      const ctx = {
        instrument: { id: 'test', symbol: 'TEST' },
        prices: new Array(200).fill(100),
        latestPrice: 102, // 2% above SMA50
        sma50: 100,
        sma200: 80,
        rsi: 45,
        gate: { marketGate: 'OPEN' },
        quality: { eligibleForSignals: true },
      };
      const result = (service as any).evaluatePullback(ctx);
      expect(result.decision).toBe('TRADE_CANDIDATE');
      expect(result.reasons).toContain('Price is near SMA50 support.');
    });
    });

    describe('evaluateDefensiveExit', () => {
    it('should suggest exit if trend breaks and signal is bearish', () => {
      const ctx = {
        instrument: { id: 'test', symbol: 'TEST' },
        prices: new Array(200).fill(100),
        latestPrice: 95,
        sma50: 100,
        rawSignal: { direction: 'BEARISH' },
        gate: { marketGate: 'CLOSED' },
        smartMoney: { status: 'DISTRIBUTION' },
      };
      const result = (service as any).evaluateDefensiveExit(ctx);
      expect(result.decision).toBe('EXIT_CANDIDATE');
      expect(result.action).toBe('REVIEW_EXIT');
    });

    // ── Portfolio-risk sub-score: real data, not phantom constant ───────────

    it('portfolioRisk score increases with deeper unrealised loss', () => {
      // allocationPercent: 0.08 → allocScore 1 (> 5% but ≤ 10%)
      const makeCtx = (unrealizedPnLPercent: number, allocationPercent = 0.08) => ({
        instrument: { id: 'test', symbol: 'TEST' },
        prices: new Array(200).fill(100),
        latestPrice: 100,
        sma50: 90,
        rawSignal: { direction: 'NEUTRAL' },
        gate: { marketGate: 'OPEN' },
        holding: { unrealizedPnLPercent, allocationPercent },
      });

      const flatResult    = (service as any).evaluateDefensiveExit(makeCtx(0.02));   // +2% → pnlScore 0
      const mildLoss      = (service as any).evaluateDefensiveExit(makeCtx(-0.04));  // -4% → pnlScore 2
      const modLoss       = (service as any).evaluateDefensiveExit(makeCtx(-0.12));  // -12% → pnlScore 7
      const deepLoss      = (service as any).evaluateDefensiveExit(makeCtx(-0.25));  // -25% → pnlScore 10

      // alloc 8% → allocScore 1 in all cases
      expect(flatResult.scoreBreakdown.portfolioRisk).toBe(1);    // pnlScore 0 + allocScore 1
      expect(mildLoss.scoreBreakdown.portfolioRisk).toBe(3);      // pnlScore 2 + allocScore 1
      expect(modLoss.scoreBreakdown.portfolioRisk).toBe(8);       // pnlScore 7 + allocScore 1
      expect(deepLoss.scoreBreakdown.portfolioRisk).toBe(11);     // pnlScore 10 + allocScore 1
      // Deeper loss must produce a strictly higher portfolio-risk contribution
      expect(deepLoss.scoreBreakdown.portfolioRisk).toBeGreaterThan(modLoss.scoreBreakdown.portfolioRisk);
      expect(modLoss.scoreBreakdown.portfolioRisk).toBeGreaterThan(mildLoss.scoreBreakdown.portfolioRisk);
    });

    it('portfolioRisk score increases with larger allocation (concentration risk)', () => {
      const makeCtx = (allocationPercent: number) => ({
        instrument: { id: 'test', symbol: 'TEST' },
        prices: new Array(200).fill(100),
        latestPrice: 100,
        sma50: 90,
        rawSignal: { direction: 'NEUTRAL' },
        gate: { marketGate: 'OPEN' },
        holding: { unrealizedPnLPercent: 0, allocationPercent },
      });

      const small    = (service as any).evaluateDefensiveExit(makeCtx(0.03));  // ≤5% → allocScore 0
      const medium   = (service as any).evaluateDefensiveExit(makeCtx(0.08));  // 5–10% → allocScore 1
      const large    = (service as any).evaluateDefensiveExit(makeCtx(0.12));  // 10–15% → allocScore 3
      const oversized = (service as any).evaluateDefensiveExit(makeCtx(0.20)); // >15% → allocScore 5

      expect(small.scoreBreakdown.portfolioRisk).toBe(0);
      expect(medium.scoreBreakdown.portfolioRisk).toBe(1);
      expect(large.scoreBreakdown.portfolioRisk).toBe(3);
      expect(oversized.scoreBreakdown.portfolioRisk).toBe(5);
    });

    it('zeroes portfolioRisk (not phantom 5) when no holding is present', () => {
      const ctx = {
        instrument: { id: 'test', symbol: 'TEST' },
        prices: new Array(200).fill(100),
        latestPrice: 95,
        sma50: 100,
        rawSignal: { direction: 'BEARISH' },
        gate: { marketGate: 'CLOSED' },
        smartMoney: { status: 'DISTRIBUTION' },
        holding: null,
      };
      const result = (service as any).evaluateDefensiveExit(ctx);
      expect(result.scoreBreakdown.portfolioRisk).toBe(0);
      // Data-gap should be documented, not silently zeroed
      expect(result.dataGaps.join(' ')).toContain('portfolio-risk');
    });

    it('zeroes portfolioRisk when holding fields are missing/non-finite', () => {
      const ctx = {
        instrument: { id: 'test', symbol: 'TEST' },
        prices: new Array(200).fill(100),
        latestPrice: 95,
        sma50: 100,
        rawSignal: { direction: 'BEARISH' },
        gate: { marketGate: 'CLOSED' },
        holding: { unrealizedPnLPercent: null, allocationPercent: undefined },
      };
      const result = (service as any).evaluateDefensiveExit(ctx);
      expect(result.scoreBreakdown.portfolioRisk).toBe(0);
      expect(result.dataGaps.join(' ')).toContain('portfolio-risk');
    });

    it('decision thresholds (EXIT_CANDIDATE/REDUCE_RISK/WATCH) are preserved with real portfolio data', () => {
      // A heavily losing, oversized holding with bearish signal + CLOSED gate + DISTRIBUTION
      // should still reach EXIT_CANDIDATE via the score threshold (>= 75)
      const ctx = {
        instrument: { id: 'test', symbol: 'TEST' },
        prices: new Array(200).fill(100),
        latestPrice: 90,
        sma50: 100,
        rawSignal: { direction: 'BEARISH' },
        gate: { marketGate: 'CLOSED' },
        smartMoney: { status: 'DISTRIBUTION' },
        holding: { unrealizedPnLPercent: -0.25, allocationPercent: 0.20 },
      };
      const result = (service as any).evaluateDefensiveExit(ctx);
      // Score: bearish(30) + trendBreak(25) + closed(20) + portfolioRisk(15) + distribution(10) = 100
      expect(result.decision).toBe('EXIT_CANDIDATE');
      expect(result.scoreBreakdown.portfolioRisk).toBe(15); // max: pnlScore(10) + allocScore(5)
    });
    });
    });

  describe('Strategy Framework migration', () => {
    const registry = new StrategyFrameworkRegistry();

    const clonedStrategy = (
      code: string,
      overrides: Partial<StrategyDefinition> = {}
    ): StrategyDefinition => {
      const strategy = registry.get(code);
      if (!strategy) throw new Error(`Missing registry fixture ${code}`);
      return {
        ...strategy,
        entryRules: strategy.entryRules.map((rule) => ({ ...rule })),
        exitRules: strategy.exitRules.map((rule) => ({ ...rule })),
        invalidationRules: strategy.invalidationRules.map((rule) => ({ ...rule })),
        noiseFilters: strategy.noiseFilters.map((rule) => ({ ...rule })),
        riskRules: strategy.riskRules.map((rule) => ({ ...rule })),
        marketGateRules: strategy.marketGateRules.map((rule) => ({ ...rule })),
        parameters: { ...strategy.parameters },
        strategyRating: strategy.strategyRating ? { ...strategy.strategyRating } : strategy.strategyRating,
        examples: {
          triggers: [...strategy.examples.triggers],
          blocks: [...strategy.examples.blocks],
        },
        ...overrides,
      };
    };

    const createStrategyFrameworkService = (options: {
      definitions?: StrategyDefinition[];
      performanceRows?: any[];
    } = {}) => {
      const repo = {
        listDefinitions: jest.fn().mockResolvedValue(options.definitions ?? []),
        latestPerformanceForStrategies: jest.fn().mockResolvedValue([]),
        performance: jest.fn().mockResolvedValue(options.performanceRows ?? [{
          ratingScore: 66,
          ratingGrade: 'GOOD',
          readinessLabel: 'PAPER_TEST_CANDIDATE',
        }]),
      };
      return {
        service: new StrategyFrameworkService(repo as any, registry, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any),
        repo,
      };
    };

    const createFrameworkBackedService = (overrides: any = {}) => {
      const marketData = {
        getInstrument: jest.fn().mockResolvedValue({
          id: 'stock-1',
          symbol: 'ABC',
          sector: 'Tech',
          country: 'IN',
          exchange: 'NSE',
          currency: 'INR',
          asset_type: 'STOCK',
        }),
        listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: makePrices() }),
        listInstruments: jest.fn().mockResolvedValue({ instruments: [] }),
        ...overrides.marketData,
      };
      const context = {
        latestPersistedSummary: jest.fn().mockResolvedValue({
          dataStatus: 'COMPLETE',
          topSectors: [{ sector: 'Tech', leadershipStatus: 'LEADING', relativeStrengthScore: 70 }],
          weakSectors: [],
          regime: { regime: 'RISK_ON' },
          breadth: { percentAboveSma50: 0.7 },
        }),
        summary: jest.fn().mockResolvedValue({
          dataStatus: 'COMPLETE',
          topSectors: [{ sector: 'Tech', leadershipStatus: 'LEADING', relativeStrengthScore: 70 }],
          weakSectors: [],
          regime: { regime: 'RISK_ON' },
        }),
        regime: jest.fn().mockResolvedValue({ regime: 'RISK_ON', score: 80 }),
        breadth: jest.fn().mockResolvedValue({ percentAboveSma50: 0.7 }),
        ...overrides.context,
      };
      const signal = {
        latestForInstrument: jest.fn().mockResolvedValue({ score: 86, direction: 'BULLISH' }),
        topSignals: jest.fn().mockResolvedValue({ signals: [] }),
        ...overrides.signal,
      };
      const calibration = {
        latestForInstrument: jest.fn().mockResolvedValue({ calibratedScore: 88, calibratedDirection: 'BULLISH', calibratedConfidence: 'HIGH' }),
        ...overrides.calibration,
      };
      const quality = {
        diagnostics: jest.fn().mockResolvedValue({
          eligibleForSignals: true,
          eligibleForBacktesting: true,
          signalReadinessStatus: 'READY',
          coverageStatus: 'GOOD',
          liquidityStatus: 'LIQUID',
          signalReadinessScore: 90,
        }),
        ...overrides.quality,
      };
      const smartMoney = {
        latestPersistedStock: jest.fn().mockResolvedValue({ status: 'ACCUMULATION', smartMoneyScore: 75 }),
        stock: jest.fn().mockResolvedValue({ status: 'ACCUMULATION', smartMoneyScore: 75 }),
        ...overrides.smartMoney,
      };
      const frameworkService = overrides.frameworkService ?? createStrategyFrameworkService().service;
      return new StrategyDecisionEngineService(
        {} as any,
        marketData as any,
        context as any,
        signal as any,
        calibration as any,
        quality as any,
        smartMoney as any,
        { getPortfolioDetail: jest.fn().mockResolvedValue(null) } as any,
        {} as any,
        frameworkService as any
      );
    };

    it('uses Strategy Framework evaluator for TREND_MOMENTUM and preserves old fields', async () => {
      const svc = createFrameworkBackedService();
      const result = await svc.evaluateInstrumentStrategy('stock-1', 'TREND_MOMENTUM', {
        marketCondition: 'HEALTHY',
        marketGate: 'OPEN',
        allowedActions: ['NEW_LONG_TRADES_ALLOWED'],
        marketScore: 80,
        reasons: [],
        blockers: [],
        dataStatus: 'COMPLETE',
        updatedAt: new Date().toISOString(),
      });

      expect(result?.frameworkBacked).toBe(true);
      expect(result?.strategyVersion).toBe(new StrategyFrameworkRegistry().get('TREND_MOMENTUM')?.version);
      expect(result?.strategy).toBe('TREND_MOMENTUM');
      expect(result?.action).toBeDefined();
      expect(result?.decisionScore).toBeGreaterThan(0);
      expect(result?.entryRulesPassed?.length).toBeGreaterThan(0);
      expect(result?.riskPlan?.targetPrice).toBeNull();
      expect(result?.riskPlan?.exitRules).not.toContain('Target price achieved.');
      expect(result?.riskPlan?.rationale).toContain('rule-based');
    });

    it('uses persisted-first Strategy Framework definition metadata when available', async () => {
      const persistedTrend = clonedStrategy('TREND_MOMENTUM', {
        name: 'Persisted Trend Momentum',
        version: '9.9.0',
        readinessLabel: 'WATCHLIST_CANDIDATE',
        strategyRating: {
          ratingScore: 72,
          ratingGrade: 'GOOD',
          readinessLabel: 'WATCHLIST_CANDIDATE',
        },
        effectiveAt: '2026-06-01T00:00:00.000Z',
      });
      const { service: frameworkService } = createStrategyFrameworkService({
        definitions: [persistedTrend],
        performanceRows: [],
      });
      const svc = createFrameworkBackedService({ frameworkService });

      const result = await svc.evaluateInstrumentStrategy('stock-1', 'TREND_MOMENTUM', {
        marketCondition: 'HEALTHY',
        marketGate: 'OPEN',
        allowedActions: ['NEW_LONG_TRADES_ALLOWED'],
        marketScore: 80,
        reasons: [],
        blockers: [],
        dataStatus: 'COMPLETE',
        updatedAt: new Date().toISOString(),
      });

      expect(result).toMatchObject({
        frameworkBacked: true,
        strategy: 'TREND_MOMENTUM',
        strategyName: 'Persisted Trend Momentum',
        strategyVersion: '9.9.0',
        readinessLabel: 'WATCHLIST_CANDIDATE',
        strategyDefinitionSource: 'PERSISTED',
        strategyRating: {
          ratingScore: 72,
          ratingGrade: 'GOOD',
          readinessLabel: 'WATCHLIST_CANDIDATE',
        },
      });
      expect(result?.strategyDefinitionDrift).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'PERSISTED_VERSION_DIFFERS_FROM_REGISTRY',
          persistedVersion: '9.9.0',
          registryVersion: registry.get('TREND_MOMENTUM')?.version,
        }),
      ]));
    });

    it('falls back to registry definitions through Strategy Framework provider diagnostics', async () => {
      const { service: frameworkService } = createStrategyFrameworkService({ definitions: [] });
      const svc = createFrameworkBackedService({ frameworkService });

      const result = await svc.evaluateInstrumentStrategy('stock-1', 'TREND_MOMENTUM', {
        marketCondition: 'HEALTHY',
        marketGate: 'OPEN',
        allowedActions: ['NEW_LONG_TRADES_ALLOWED'],
        marketScore: 80,
        reasons: [],
        blockers: [],
        dataStatus: 'COMPLETE',
        updatedAt: new Date().toISOString(),
      });

      expect(result).toMatchObject({
        frameworkBacked: true,
        strategy: 'TREND_MOMENTUM',
        strategyName: registry.get('TREND_MOMENTUM')?.name,
        strategyVersion: registry.get('TREND_MOMENTUM')?.version,
        strategyDefinitionSource: 'REGISTRY_FALLBACK',
      });
      expect(result?.strategyDefinitionDrift).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'MISSING_PERSISTED_DEFINITION',
          registryVersion: registry.get('TREND_MOMENTUM')?.version,
        }),
      ]));
    });

    it('uses Strategy Framework evaluator for PULLBACK_IN_UPTREND', async () => {
      const svc = createFrameworkBackedService({
        marketData: { listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: makePrices(260, '2025-01-01', 90, 0.04) }) },
        signal: { latestForInstrument: jest.fn().mockResolvedValue({ score: 70, direction: 'NEUTRAL' }) },
      });
      const result = await svc.evaluateInstrumentStrategy('stock-1', 'PULLBACK_IN_UPTREND', {
        marketCondition: 'HEALTHY',
        marketGate: 'OPEN',
        allowedActions: ['NEW_LONG_TRADES_ALLOWED'],
        marketScore: 80,
        reasons: [],
        blockers: [],
        dataStatus: 'COMPLETE',
        updatedAt: new Date().toISOString(),
      });

      expect(result?.frameworkBacked).toBe(true);
      expect(result?.strategy).toBe('PULLBACK_IN_UPTREND');
      expect(result?.frameworkDecision).toBeDefined();
    });

    it('uses Strategy Framework evaluator for DEFENSIVE_EXIT', async () => {
      const svc = createFrameworkBackedService({
        signal: { latestForInstrument: jest.fn().mockResolvedValue({ score: 25, direction: 'BEARISH' }) },
        calibration: { latestForInstrument: jest.fn().mockResolvedValue({ calibratedScore: 25, calibratedDirection: 'BEARISH', calibratedConfidence: 'HIGH' }) },
        smartMoney: { latestPersistedStock: jest.fn().mockResolvedValue({ status: 'DISTRIBUTION', smartMoneyScore: 20 }) },
      });
      const result = await svc.evaluateInstrumentStrategy('stock-1', 'DEFENSIVE_EXIT', {
        marketCondition: 'BAD',
        marketGate: 'CLOSED',
        allowedActions: ['MANAGE_EXISTING_POSITIONS_ONLY'],
        marketScore: 20,
        reasons: [],
        blockers: [],
        dataStatus: 'COMPLETE',
        updatedAt: new Date().toISOString(),
      });

      expect(result?.frameworkBacked).toBe(true);
      expect(result?.strategy).toBe('DEFENSIVE_EXIT');
      expect(['EXIT_CANDIDATE', 'REDUCE_RISK', 'HOLD', 'WATCH']).toContain(result?.decision);
    });

    it('preserves Strategy Framework invalidation evidence on adapted decision DTOs', async () => {
      const svc = createFrameworkBackedService({
        signal: { latestForInstrument: jest.fn().mockResolvedValue({ score: 25, direction: 'BEARISH' }) },
        calibration: { latestForInstrument: jest.fn().mockResolvedValue({ calibratedScore: 25, calibratedDirection: 'BEARISH', calibratedConfidence: 'HIGH' }) },
        quality: {
          diagnostics: jest.fn().mockResolvedValue({
            eligibleForSignals: false,
            eligibleForBacktesting: false,
            signalReadinessStatus: 'NOT_READY',
            coverageStatus: 'UNUSABLE',
            liquidityStatus: 'LIQUID',
          }),
        },
        smartMoney: { latestPersistedStock: jest.fn().mockResolvedValue({ status: 'DISTRIBUTION', smartMoneyScore: 20 }) },
      });
      const result = await svc.evaluateInstrumentStrategy('stock-1', 'DEFENSIVE_EXIT', {
        marketCondition: 'BAD',
        marketGate: 'CLOSED',
        allowedActions: ['MANAGE_EXISTING_POSITIONS_ONLY'],
        marketScore: 20,
        reasons: [],
        blockers: [],
        dataStatus: 'COMPLETE',
        updatedAt: new Date().toISOString(),
      });

      expect(result?.frameworkBacked).toBe(true);
      expect((result as any)?.invalidationRulesTriggered).toEqual(expect.arrayContaining([
        'DQ_EVIDENCE_INVALIDATED',
        'MARKET_GATE_INVALIDATED',
        'DISTRIBUTION_EXIT',
      ]));
    });

    it('uses Strategy Framework evaluator for additional active review strategies', async () => {
      const svc = createFrameworkBackedService();
      const result = await svc.evaluateInstrumentStrategy('stock-1', 'SMART_MONEY_ACCUMULATION', {
        marketCondition: 'HEALTHY',
        marketGate: 'OPEN',
        allowedActions: ['NEW_LONG_TRADES_ALLOWED'],
        marketScore: 80,
        reasons: [],
        blockers: [],
        dataStatus: 'COMPLETE',
        updatedAt: new Date().toISOString(),
      });

      expect(result?.frameworkBacked).toBe(true);
      expect(result?.strategy).toBe('SMART_MONEY_ACCUMULATION');
      expect(result?.entryRulesPassed).toEqual(expect.arrayContaining(['ACCUMULATION']));
      expect(result?.decisionScore).toBeGreaterThan(0);
    });

    it('exposes active entry and exit registry strategies in the decision model', async () => {
      const svc = createFrameworkBackedService();
      const model = await svc.model();
      const evaluatableCodes = model.strategies
        .filter((strategy: any) => strategy.evaluationSupported)
        .map((strategy: any) => strategy.code);

      expect(evaluatableCodes).toEqual(expect.arrayContaining([
        'TREND_MOMENTUM',
        'PULLBACK_IN_UPTREND',
        'BREAKOUT_CONFIRMATION',
        'SMART_MONEY_ACCUMULATION',
        'SECTOR_LEADER_MOMENTUM',
        'DEFENSIVE_EXIT',
      ]));
      expect(evaluatableCodes).not.toContain('RISK_OFF_AVOIDANCE');
      expect(evaluatableCodes).not.toContain('LOW_QUALITY_DATA_REJECTION');
      expect(evaluatableCodes).not.toContain('QUALITY_TREND');
    });

    it('uses persisted-first Strategy Framework definitions in the decision model', async () => {
      const persistedTrend = clonedStrategy('TREND_MOMENTUM', {
        name: 'Persisted Trend Momentum',
        version: '9.9.0',
        effectiveAt: '2026-06-01T00:00:00.000Z',
      });
      const { service: frameworkService } = createStrategyFrameworkService({ definitions: [persistedTrend] });
      const svc = createFrameworkBackedService({ frameworkService });

      const model = await svc.model();
      const trend = model.strategies.find((strategy: any) => strategy.code === 'TREND_MOMENTUM');

      expect(trend).toMatchObject({
        code: 'TREND_MOMENTUM',
        name: 'Persisted Trend Momentum',
        version: '9.9.0',
        evaluationSupported: true,
        strategyDefinitionSource: 'PERSISTED',
      });
      expect(trend!.strategyDefinitionDrift).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'PERSISTED_VERSION_DIFFERS_FROM_REGISTRY' }),
      ]));
    });

    it('blocks new long candidates when market gate is CLOSED', async () => {
      const svc = createFrameworkBackedService();
      const result = await svc.evaluateInstrumentStrategy('stock-1', 'TREND_MOMENTUM', {
        marketCondition: 'BAD',
        marketGate: 'CLOSED',
        allowedActions: ['MANAGE_EXISTING_POSITIONS_ONLY'],
        marketScore: 20,
        reasons: [],
        blockers: [],
        dataStatus: 'COMPLETE',
        updatedAt: new Date().toISOString(),
      });

      expect(result?.decision).not.toBe('TRADE_CANDIDATE');
      expect(result?.blockers.join(' ')).toContain('Market gate');
    });

    it('adds a warning for SELECTIVE market gate', async () => {
      const svc = createFrameworkBackedService();
      const result = await svc.evaluateInstrumentStrategy('stock-1', 'TREND_MOMENTUM', {
        marketCondition: 'MIXED',
        marketGate: 'SELECTIVE',
        allowedActions: ['ONLY_HIGH_QUALITY_SETUPS'],
        marketScore: 50,
        reasons: [],
        blockers: [],
        dataStatus: 'COMPLETE',
        updatedAt: new Date().toISOString(),
      });

      expect(result?.warnings.join(' ')).toContain('Market is selective');
    });

    it('treats UNKNOWN market gate as a data gap and avoids strong candidates', async () => {
      const svc = createFrameworkBackedService();
      const result = await svc.evaluateInstrumentStrategy('stock-1', 'TREND_MOMENTUM', {
        marketCondition: 'UNKNOWN',
        marketGate: 'UNKNOWN',
        allowedActions: ['MANAGE_EXISTING_POSITIONS_ONLY'],
        marketScore: 0,
        reasons: [],
        blockers: [],
        dataStatus: 'MISSING',
        updatedAt: new Date().toISOString(),
      });

      expect(result?.decision).not.toBe('TRADE_CANDIDATE');
      expect(result?.dataGaps.join(' ')).toContain('Market gate is unknown');
    });

    it('does not throw when optional context is missing', async () => {
      const svc = createFrameworkBackedService({
        context: {
          latestPersistedSummary: jest.fn().mockRejectedValue(new Error('no context')),
          summary: jest.fn().mockRejectedValue(new Error('no context')),
        },
        quality: { diagnostics: jest.fn().mockResolvedValue(null) },
        smartMoney: {
          latestPersistedStock: jest.fn().mockResolvedValue(null),
          stock: jest.fn().mockResolvedValue(null),
        },
        signal: { latestForInstrument: jest.fn().mockResolvedValue(null) },
      });

      await expect(svc.evaluateInstrumentStrategy('stock-1', 'TREND_MOMENTUM', {
        marketCondition: 'UNKNOWN',
        marketGate: 'UNKNOWN',
        allowedActions: ['MANAGE_EXISTING_POSITIONS_ONLY'],
        marketScore: 0,
        reasons: [],
        blockers: [],
        dataStatus: 'MISSING',
        updatedAt: new Date().toISOString(),
      })).resolves.toEqual(expect.objectContaining({
        frameworkBacked: true,
        dataGaps: expect.arrayContaining([
          'Raw signal is missing.',
          'Data quality evaluation is missing.',
          'Smart-money context is missing.',
        ]),
      }));
    });

    it('evaluates ALL with one context build per instrument and raw signal universe reuse', async () => {
      const repository = {
        create: jest.fn(async (decision) => ({ ...decision, id: `${decision.instrumentId}-${decision.strategy}` })),
        replaceMany: jest.fn(async (decisions: any[]) => decisions.map((decision, index) => ({ ...decision, id: `bulk-${index + 1}` }))),
      };
      const prices = makePrices();
      const signalRows = [
        { instrument_id: 'stock-1', symbol: 'AAA.NS', score: 86, direction: 'BULLISH', confidence: 'HIGH', triggered_signals: [], negative_signals: [], generated_at: new Date().toISOString(), source: 'test', data_status: 'COMPLETE' },
        { instrument_id: 'stock-2', symbol: 'BBB.NS', score: 80, direction: 'BULLISH', confidence: 'HIGH', triggered_signals: [], negative_signals: [], generated_at: new Date().toISOString(), source: 'test', data_status: 'COMPLETE' },
      ];
      const instruments = signalRows.map((signal) => ({
        id: signal.instrument_id,
        symbol: signal.symbol,
        sector: 'Tech',
        country: 'IN',
        exchange: 'NSE',
        currency: 'INR',
        asset_type: 'STOCK',
      }));
      const marketData = {
        getInstrument: jest.fn(async (instrumentId: string) => ({
          id: instrumentId,
          symbol: `${instrumentId}.NS`,
          sector: 'Tech',
          country: 'IN',
          exchange: 'NSE',
          currency: 'INR',
          asset_type: 'STOCK',
        })),
        getInstrumentsByIds: jest.fn().mockResolvedValue(instruments),
        listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices }),
        listRecentPriceWindowsByInstrumentIds: jest.fn().mockResolvedValue(new Map(signalRows.map((signal) => [signal.instrument_id, prices]))),
      };
      const context = {
        summary: jest.fn().mockResolvedValue({
          dataStatus: 'COMPLETE',
          topSectors: [{ sector: 'Tech', leadershipStatus: 'LEADING', relativeStrengthScore: 70 }],
          weakSectors: [],
          regime: { regime: 'RISK_ON' },
        }),
        regime: jest.fn().mockResolvedValue({ regime: 'RISK_ON', score: 80 }),
        breadth: jest.fn().mockResolvedValue({ percentAboveSma50: 0.7 }),
      };
      const signal = {
        latestSignalUniverse: jest.fn().mockResolvedValue(signalRows),
        latestSignalUniverseCount: jest.fn().mockResolvedValue(2),
        latestForInstrument: jest.fn(),
        topSignals: jest.fn(),
      };
      const calibration = {
        latestForInstrument: jest.fn().mockResolvedValue({ calibratedScore: 88, calibratedDirection: 'BULLISH', calibratedConfidence: 'HIGH' }),
        latestPersistedForInstruments: jest.fn().mockResolvedValue(signalRows.map((signal) => ({
          instrumentId: signal.instrument_id,
          calibratedScore: 88,
          calibratedDirection: 'BULLISH',
          calibratedConfidence: 'HIGH',
        }))),
      };
      const quality = {
        diagnostics: jest.fn().mockResolvedValue({
          eligibleForSignals: true,
          eligibleForBacktesting: true,
          signalReadinessStatus: 'READY',
          coverageStatus: 'GOOD',
          liquidityStatus: 'LIQUID',
          signalReadinessScore: 90,
        }),
        getEvaluationsForInstruments: jest.fn().mockResolvedValue(signalRows.map((signal) => ({
          instrumentId: signal.instrument_id,
          eligibleForSignals: true,
          eligibleForBacktesting: true,
          signalReadinessStatus: 'READY',
          coverageStatus: 'GOOD',
          liquidityStatus: 'LIQUID',
          signalReadinessScore: 90,
        }))),
      };
      const smartMoney = {
        stock: jest.fn().mockResolvedValue({ status: 'ACCUMULATION', smartMoneyScore: 75 }),
        latestPersistedStocks: jest.fn().mockResolvedValue(signalRows.map((signal) => ({
          instrumentId: signal.instrument_id,
          status: 'ACCUMULATION',
          smartMoneyScore: 75,
        }))),
      };
      const { service: frameworkService, repo: frameworkRepo } = createStrategyFrameworkService();
      const svc = new StrategyDecisionEngineService(
        repository as any,
        marketData as any,
        context as any,
        signal as any,
        calibration as any,
        quality as any,
        smartMoney as any,
        {} as any,
        {} as any,
        frameworkService as any
      );

      const reviewStrategyCount = new StrategyFrameworkRegistry()
        .active()
        .filter((strategy) => ['ENTRY', 'EXIT'].includes(strategy.category))
        .length;
      const result = await svc.evaluate({ strategy: 'ALL', batchSize: 2, offset: 0, region: 'IN', assetType: 'STOCK' });

      expect(result.failedCount).toBe(0);
      expect(result.processedCount).toBe(2);
      expect(result.generatedCount).toBe(2 * reviewStrategyCount);
      expect(signal.topSignals).not.toHaveBeenCalled();
      expect(signal.latestForInstrument).not.toHaveBeenCalled();
      expect(marketData.getInstrumentsByIds).toHaveBeenCalledWith(['stock-1', 'stock-2']);
      expect(marketData.listRecentPriceWindowsByInstrumentIds).toHaveBeenCalledWith(['stock-1', 'stock-2'], 500, { region: 'IN', assetType: 'STOCK' });
      expect(marketData.getInstrument).not.toHaveBeenCalled();
      expect(marketData.listPricesByInstrumentId).not.toHaveBeenCalled();
      expect(calibration.latestPersistedForInstruments).toHaveBeenCalledWith(['stock-1', 'stock-2']);
      expect(quality.getEvaluationsForInstruments).toHaveBeenCalledWith(['stock-1', 'stock-2']);
      expect(quality.diagnostics).not.toHaveBeenCalled();
      expect(smartMoney.latestPersistedStocks).toHaveBeenCalledWith(['stock-1', 'stock-2'], '3M');
      expect(smartMoney.stock).not.toHaveBeenCalled();
      expect(repository.replaceMany).toHaveBeenCalledTimes(1);
      expect(repository.replaceMany).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ instrumentId: 'stock-1', strategyDefinitionSource: 'REGISTRY_FALLBACK' }),
        expect.objectContaining({ instrumentId: 'stock-2', strategyDefinitionDrift: expect.arrayContaining([expect.objectContaining({ type: 'MISSING_PERSISTED_DEFINITION' })]) }),
      ]));
      expect(repository.create).not.toHaveBeenCalled();
      expect(frameworkRepo.performance).toHaveBeenCalledTimes(reviewStrategyCount);
    });

    it('processes evaluate batches with bounded worker concurrency and shared batch context', async () => {
      const repository = {
        create: jest.fn(async (decision) => ({ ...decision, id: `${decision.instrumentId}-${decision.strategy}` })),
        replaceMany: jest.fn(async (decisions: any[]) => decisions.map((decision, index) => ({ ...decision, id: `bulk-${index + 1}` }))),
      };
      const signalRows = [
        { instrument_id: 'stock-1', symbol: 'AAA.NS', score: 86, direction: 'BULLISH', confidence: 'HIGH', triggered_signals: [], negative_signals: [], generated_at: new Date().toISOString(), source: 'test', data_status: 'COMPLETE' },
        { instrument_id: 'stock-2', symbol: 'BBB.NS', score: 84, direction: 'BULLISH', confidence: 'HIGH', triggered_signals: [], negative_signals: [], generated_at: new Date().toISOString(), source: 'test', data_status: 'COMPLETE' },
        { instrument_id: 'stock-3', symbol: 'CCC.NS', score: 82, direction: 'BULLISH', confidence: 'HIGH', triggered_signals: [], negative_signals: [], generated_at: new Date().toISOString(), source: 'test', data_status: 'COMPLETE' },
        { instrument_id: 'stock-4', symbol: 'DDD.NS', score: 80, direction: 'BULLISH', confidence: 'HIGH', triggered_signals: [], negative_signals: [], generated_at: new Date().toISOString(), source: 'test', data_status: 'COMPLETE' },
      ];
      const instruments = signalRows.map((signal) => ({
        id: signal.instrument_id,
        symbol: signal.symbol,
        sector: 'Tech',
        country: 'IN',
        exchange: 'NSE',
        currency: 'INR',
        asset_type: 'STOCK',
      }));
      const priceWindows = new Map(signalRows.map((signal) => [signal.instrument_id, makePrices()]));
      const marketData = {
        getInstrument: jest.fn(async (instrumentId: string) => ({
          id: instrumentId,
          symbol: `${instrumentId}.NS`,
          sector: 'Tech',
          country: 'IN',
          exchange: 'NSE',
          currency: 'INR',
          asset_type: 'STOCK',
        })),
        getInstrumentsByIds: jest.fn().mockResolvedValue(instruments),
        listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: makePrices() }),
        listRecentPriceWindowsByInstrumentIds: jest.fn().mockResolvedValue(priceWindows),
      };
      const context = {
        latestPersistedSummary: jest.fn().mockResolvedValue({
          dataStatus: 'COMPLETE',
          topSectors: [{ sector: 'Tech', leadershipStatus: 'LEADING', relativeStrengthScore: 70 }],
          weakSectors: [],
          regime: { regime: 'RISK_ON', score: 80 },
          breadth: { percentAboveSma50: 0.7 },
        }),
        summary: jest.fn(),
        regime: jest.fn(),
        breadth: jest.fn(),
      };
      const signal = {
        latestSignalUniverse: jest.fn().mockResolvedValue(signalRows),
        latestSignalUniverseCount: jest.fn().mockResolvedValue(4),
        latestForInstrument: jest.fn(),
      };
      const calibration = {
        latestPersistedForInstrument: jest.fn().mockResolvedValue({ calibratedScore: 88, calibratedDirection: 'BULLISH', calibratedConfidence: 'HIGH' }),
        latestPersistedForInstruments: jest.fn().mockResolvedValue(signalRows.map((signal) => ({
          instrumentId: signal.instrument_id,
          calibratedScore: 88,
          calibratedDirection: 'BULLISH',
          calibratedConfidence: 'HIGH',
        }))),
      };
      const quality = {
        getLatestEvaluationForInstrument: jest.fn().mockResolvedValue({
          eligibleForSignals: true,
          eligibleForBacktesting: true,
          signalReadinessStatus: 'READY',
          coverageStatus: 'GOOD',
          liquidityStatus: 'LIQUID',
          signalReadinessScore: 90,
        }),
        getEvaluationsForInstruments: jest.fn().mockResolvedValue(signalRows.map((signal) => ({
          instrumentId: signal.instrument_id,
          eligibleForSignals: true,
          eligibleForBacktesting: true,
          signalReadinessStatus: 'READY',
          coverageStatus: 'GOOD',
          liquidityStatus: 'LIQUID',
          signalReadinessScore: 90,
        }))),
      };
      const smartMoney = {
        latestPersistedStock: jest.fn().mockResolvedValue({ status: 'ACCUMULATION', smartMoneyScore: 75 }),
        latestPersistedStocks: jest.fn().mockResolvedValue(signalRows.map((signal) => ({
          instrumentId: signal.instrument_id,
          status: 'ACCUMULATION',
          smartMoneyScore: 75,
        }))),
      };
      const portfolio = {
        getPortfolioDetail: jest.fn().mockResolvedValue({ holdings: [] }),
      };
      const { service: frameworkService } = createStrategyFrameworkService();
      const svc = new StrategyDecisionEngineService(
        repository as any,
        marketData as any,
        context as any,
        signal as any,
        calibration as any,
        quality as any,
        smartMoney as any,
        portfolio as any,
        {} as any,
        frameworkService as any
      );

      const result = await svc.evaluate({
        strategy: 'TREND_MOMENTUM',
        batchSize: 4,
        offset: 0,
        region: 'IN',
        assetType: 'STOCK',
        workerConcurrency: 2,
      });

      expect(result.processedCount).toBe(4);
      expect(result.failedCount).toBe(0);
      expect(result.generatedCount).toBe(4);
      expect(marketData.getInstrumentsByIds).toHaveBeenCalledWith(['stock-1', 'stock-2', 'stock-3', 'stock-4']);
      expect(marketData.listRecentPriceWindowsByInstrumentIds).toHaveBeenCalledWith(['stock-1', 'stock-2', 'stock-3', 'stock-4'], 500, { region: 'IN', assetType: 'STOCK' });
      expect(marketData.getInstrument).not.toHaveBeenCalled();
      expect(marketData.listPricesByInstrumentId).not.toHaveBeenCalled();
      expect(context.latestPersistedSummary).toHaveBeenCalledTimes(1);
      expect(context.summary).not.toHaveBeenCalled();
      expect(context.regime).not.toHaveBeenCalled();
      expect(context.breadth).not.toHaveBeenCalled();
      expect(portfolio.getPortfolioDetail).not.toHaveBeenCalled();
      expect(signal.latestForInstrument).not.toHaveBeenCalled();
      expect(calibration.latestPersistedForInstruments).toHaveBeenCalledWith(['stock-1', 'stock-2', 'stock-3', 'stock-4']);
      expect(calibration.latestPersistedForInstrument).not.toHaveBeenCalled();
      expect(quality.getEvaluationsForInstruments).toHaveBeenCalledWith(['stock-1', 'stock-2', 'stock-3', 'stock-4']);
      expect(quality.getLatestEvaluationForInstrument).not.toHaveBeenCalled();
      expect(smartMoney.latestPersistedStocks).toHaveBeenCalledWith(['stock-1', 'stock-2', 'stock-3', 'stock-4'], '3M');
      expect(smartMoney.latestPersistedStock).not.toHaveBeenCalled();
      expect(repository.replaceMany).toHaveBeenCalledTimes(1);
      expect(repository.replaceMany).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ instrumentId: 'stock-1', strategy: 'TREND_MOMENTUM' }),
        expect.objectContaining({ instrumentId: 'stock-4', strategy: 'TREND_MOMENTUM' }),
      ]));
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('resolves symbol evaluation through scoped instrument search and provider/display aliases', async () => {
      const marketData = {
        listInstruments: jest.fn().mockResolvedValue({
          instruments: [
            { id: 'stock-1', symbol: 'RELIANCE.NS', display_symbol: 'RELIANCE', provider_symbol: 'RELIANCE.NS', source_symbol: 'RELIANCE' },
          ],
        }),
      };
      const svc = new StrategyDecisionEngineService(
        {} as any,
        marketData as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );

      const result = await (svc as any).resolveEvaluationUniverse(
        { strategy: 'TREND_MOMENTUM', symbol: 'RELIANCE', region: 'IN', assetType: 'STOCK' },
        100,
        0
      );

      expect(marketData.listInstruments).toHaveBeenCalledWith(expect.objectContaining({
        search: 'RELIANCE',
        pageSize: 5,
        region: 'IN',
        assetType: 'STOCK',
      }));
      expect(result.instrumentIds).toEqual(['stock-1']);
      expect(result.totalCount).toBe(1);
    });
  });
