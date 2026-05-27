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
      expect(result?.riskPlan?.targetPrice).toBeNull();
      expect(result?.riskPlan?.exitRules).not.toContain('Target price achieved.');
      expect(result?.riskPlan?.rationale).toContain('rule-based');
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
        expect.objectContaining({ instrumentId: 'stock-1' }),
        expect.objectContaining({ instrumentId: 'stock-2' }),
      ]));
      expect(repository.create).not.toHaveBeenCalled();
      expect(frameworkService.performance).toHaveBeenCalledTimes(reviewStrategyCount);
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
        portfolio as any,
        {} as any,
        new StrategyFrameworkRegistry(),
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
        {} as any,
        new StrategyFrameworkRegistry(),
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
