/// <reference types="@types/jest" />
import { StrategyDecisionEngineService } from '../../../src/modules/strategy-decision-engine';
import { StrategyFrameworkRegistry } from '../../../src/modules/strategy-framework';

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
      expect(result.blockers).toContain('Market gate is CLOSED; no new long trades.');
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
    });
    });

  describe('Strategy Framework migration', () => {
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
        stock: jest.fn().mockResolvedValue({ status: 'ACCUMULATION', smartMoneyScore: 75 }),
        ...overrides.smartMoney,
      };
      const frameworkService = {
        performance: jest.fn().mockResolvedValue([{
          ratingScore: 66,
          ratingGrade: 'GOOD',
          readinessLabel: 'PAPER_TEST_CANDIDATE',
        }]),
      };
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
        new StrategyFrameworkRegistry(),
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
      expect(result?.strategyVersion).toBe('1.0.0');
      expect(result?.strategy).toBe('TREND_MOMENTUM');
      expect(result?.action).toBeDefined();
      expect(result?.decisionScore).toBeGreaterThan(0);
      expect(result?.entryRulesPassed?.length).toBeGreaterThan(0);
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
        smartMoney: { stock: jest.fn().mockResolvedValue({ status: 'DISTRIBUTION', smartMoneyScore: 20 }) },
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
        context: { summary: jest.fn().mockRejectedValue(new Error('no context')) },
        quality: { diagnostics: jest.fn().mockResolvedValue(null) },
        smartMoney: { stock: jest.fn().mockResolvedValue(null) },
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
      };
      const prices = makePrices();
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
        listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices }),
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
        latestSignalUniverse: jest.fn().mockResolvedValue([
          { instrument_id: 'stock-1', symbol: 'AAA.NS', score: 86, direction: 'BULLISH', confidence: 'HIGH', triggered_signals: [], negative_signals: [], generated_at: new Date().toISOString(), source: 'test', data_status: 'COMPLETE' },
          { instrument_id: 'stock-2', symbol: 'BBB.NS', score: 80, direction: 'BULLISH', confidence: 'HIGH', triggered_signals: [], negative_signals: [], generated_at: new Date().toISOString(), source: 'test', data_status: 'COMPLETE' },
        ]),
        latestSignalUniverseCount: jest.fn().mockResolvedValue(2),
        latestForInstrument: jest.fn(),
        topSignals: jest.fn(),
      };
      const calibration = {
        latestForInstrument: jest.fn().mockResolvedValue({ calibratedScore: 88, calibratedDirection: 'BULLISH', calibratedConfidence: 'HIGH' }),
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
      };
      const smartMoney = {
        stock: jest.fn().mockResolvedValue({ status: 'ACCUMULATION', smartMoneyScore: 75 }),
      };
      const frameworkService = {
        performance: jest.fn().mockResolvedValue([{ ratingScore: 66, ratingGrade: 'GOOD', readinessLabel: 'PAPER_TEST_CANDIDATE' }]),
      };
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
        new StrategyFrameworkRegistry(),
        frameworkService as any
      );

      const result = await svc.evaluate({ strategy: 'ALL', batchSize: 2, offset: 0, region: 'IN', assetType: 'STOCK' });

      expect(result.failedCount).toBe(0);
      expect(result.processedCount).toBe(2);
      expect(result.generatedCount).toBe(4);
      expect(signal.topSignals).not.toHaveBeenCalled();
      expect(signal.latestForInstrument).not.toHaveBeenCalled();
      expect(marketData.getInstrument).toHaveBeenCalledTimes(2);
      expect(marketData.listPricesByInstrumentId).toHaveBeenCalledTimes(2);
      expect(quality.diagnostics).toHaveBeenCalledTimes(2);
      expect(smartMoney.stock).toHaveBeenCalledTimes(2);
      expect(repository.create).toHaveBeenCalledTimes(4);
      expect(frameworkService.performance).toHaveBeenCalledTimes(2);
    });
  });
