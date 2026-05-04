/// <reference types="@types/jest" />
import { StrategyDecisionEngineService } from '../../../src/modules/strategy-decision-engine';

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
        instrument: { id: '1', symbol: 'ABC' },
        prices: [100, 95, 90],
        latestPrice: 100,
        sma50: 90,
        sma200: 80,
        rsi: 55,
        calibrated: { calibratedScore: 85 },
        smartMoney: { status: 'ACCUMULATION' },
        quality: { eligibleForSignals: true },
        gate: { marketGate: 'OPEN' },
      };
      const result = (service as any).evaluateTrendMomentum(ctx);
      expect(result.decision).toBe('TRADE_CANDIDATE');
      expect(result.action).toBe('CONSIDER_ENTRY');
    });

    it('should return AVOID if price is below SMA50', () => {
      const ctx = {
        instrument: { id: 'test', symbol: 'TEST' },
        prices: new Array(200).fill(100),
        latestPrice: 85,
        sma50: 90,
        sma200: 80,
        gate: { marketGate: 'OPEN' },
        quality: { eligibleForSignals: true },
      };
      const result = (service as any).evaluateTrendMomentum(ctx);
      expect(result.decision).toBe('AVOID');
      expect(result.blockers).toContain('Price is below SMA50 support.');
    });

    it('should return AVOID if market gate is CLOSED', () => {
      const ctx = {
        instrument: { id: 'test', symbol: 'TEST' },
        prices: new Array(200).fill(100),
        latestPrice: 110,
        sma50: 100,
        sma200: 90,
        gate: { marketGate: 'CLOSED' },
        quality: { eligibleForSignals: true },
      };
      const result = (service as any).evaluateTrendMomentum(ctx);
      expect(result.decision).toBe('AVOID');
      expect(result.blockers).toContain('Market gate is CLOSED; no new long trades.');
    });

    it('should include score breakdown and cap confidence if data gaps exist', () => {
      const ctx = {
        instrument: { id: 'test', symbol: 'TEST' },
        prices: new Array(200).fill(100),
        latestPrice: 110,
        sma50: 100,
        sma200: 90,
        gate: { marketGate: 'OPEN' },
        quality: { eligibleForSignals: true },
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
