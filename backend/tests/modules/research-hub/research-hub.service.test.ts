import { ResearchHubService } from '../../../src/modules/research-hub/research-hub.service';
import { SignalGenerationEngineService } from '../../../src/modules/signal-generation-engine';
import { StrategyDecisionEngineService } from '../../../src/modules/strategy-decision-engine';
import { SmartMoneyIntelligenceService } from '../../../src/modules/smart-money-intelligence';
import { MarketContextIntelligenceService } from '../../../src/modules/market-context-intelligence';
import { StrategyFrameworkService } from '../../../src/modules/strategy-framework';

// Mock dependencies
jest.mock('../../../src/modules/signal-generation-engine');
jest.mock('../../../src/modules/strategy-decision-engine');
jest.mock('../../../src/modules/smart-money-intelligence');
jest.mock('../../../src/modules/market-context-intelligence');
jest.mock('../../../src/modules/strategy-framework');

describe('ResearchHubService', () => {
  let service: ResearchHubService;
  let strategyService: jest.Mocked<StrategyDecisionEngineService>;
  let contextService: jest.Mocked<MarketContextIntelligenceService>;
  let signalService: jest.Mocked<SignalGenerationEngineService>;
  let smartMoneyService: jest.Mocked<SmartMoneyIntelligenceService>;
  let strategyFrameworkService: jest.Mocked<StrategyFrameworkService>;

  beforeEach(() => {
    jest.clearAllMocks();

    strategyService = new StrategyDecisionEngineService() as any;
    contextService = new MarketContextIntelligenceService() as any;
    signalService = new SignalGenerationEngineService() as any;
    smartMoneyService = new SmartMoneyIntelligenceService() as any;
    strategyFrameworkService = new StrategyFrameworkService() as any;
    (signalService.funnelDiagnostics as jest.Mock).mockResolvedValue({
      total: 0,
      bullish: 0,
      bearish: 0,
      neutral: 0,
      byDirection: {},
    } as any);
    (contextService.latestPersistedSummary as jest.Mock).mockResolvedValue({
      topSectors: [],
      weakSectors: [],
      breadth: {},
      explanation: [],
    } as any);

    service = new ResearchHubService(
      strategyService,
      contextService,
      signalService,
      smartMoneyService,
      strategyFrameworkService
    );
  });

  describe('overview', () => {
    it('uses materialized overview snapshots by default instead of live fan-out on page reads', async () => {
      const cachedOverview = {
        actionability: { overallStatus: 'INSUFFICIENT_DATA', canReviewActionableSetups: false, headline: 'Cached', researchSupportOnly: true, dimensions: {}, nextBestAction: null, blockers: [] },
        marketReadiness: { marketGate: 'UNKNOWN', marketCondition: 'UNKNOWN', headline: 'Cached snapshot', allowedActions: [], reasons: [], blockers: [], dataStatus: 'MISSING' },
        researchPriorities: { tradeCandidates: [], watchCandidates: [], avoidCandidates: [], exitCandidates: [] },
        strategyProofSummary: { strategiesProducingCandidates: [], provenCandidateCount: 0, unprovenCandidateCount: 0, blockedByMarketGateCount: 0, missingBacktestCount: 0, notes: [] },
        confirmationSummary: {
          signalSummary: { topBullishCount: 0, topBearishCount: 0, reliabilityAvailable: false, notes: [] },
          smartMoneySummary: { accumulationCount: 0, distributionCount: 0, topConfirmations: [], topContradictions: [] },
          marketContextSummary: { leadingSectors: [], weakSectors: [], breadthStatus: 'Breadth unavailable', notes: [] },
        },
        whatChanged: { newTradeCandidates: [], downgradedCandidates: [], marketGateChange: null, warnings: [] },
        nextActions: [],
        generatedAt: '2026-05-27T00:00:00.000Z',
        dataGaps: [],
      } as any;
      const db = {
        pipelineRun: {
          findFirst: jest.fn().mockResolvedValue({ metadata: { version: 'research-overview-v1', overview: cachedOverview } }),
        },
      };
      const cachedService = new ResearchHubService(
        strategyService,
        contextService,
        signalService,
        smartMoneyService,
        strategyFrameworkService,
        db as any
      );

      const result = await cachedService.overview();

      expect(result).toBe(cachedOverview);
      expect(db.pipelineRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          pipelineKey: 'research-hub-overview',
          scopeRegion: 'IN',
          scopeAssetType: 'STOCK',
        }),
      }));
      expect(strategyService.marketGate).not.toHaveBeenCalled();
      expect(strategyService.candidates).not.toHaveBeenCalled();
      expect(signalService.funnelDiagnostics).not.toHaveBeenCalled();
      expect(smartMoneyService.top).not.toHaveBeenCalled();
    });

    it('should aggregate data and return a decision-oriented response', async () => {
      // Setup mock returns
      strategyService.marketGate.mockResolvedValue({ 
        marketGate: 'OPEN', 
        marketCondition: 'HEALTHY', 
        reasons: ['Strong trend'], 
        blockers: [], 
        allowedActions: ['NEW_LONG_TRADES_ALLOWED'] 
      } as any);
      
      contextService.latestPersistedSummary.mockResolvedValue({
        regime: { regime: 'RISK_ON', score: 75, explanation: 'Uptrend' },
        topSectors: [{ sector: 'Tech', relativeStrengthScore: 80 }],
        weakSectors: [{ sector: 'Energy', relativeStrengthScore: 30 }],
        breadth: { percentAboveSma50: 0.7 },
        explanation: ['Market is strong']
      } as any);

      strategyService.candidates.mockResolvedValue({
        results: [
          { instrumentId: '1', symbol: 'AAPL', strategy: 'TREND_MOMENTUM', strategyVersion: '1.0.0', frameworkBacked: true, decision: 'TRADE_CANDIDATE', action: 'CONSIDER_ENTRY', decisionScore: 85, confidence: 'HIGH', marketGate: 'OPEN', marketCondition: 'HEALTHY', reasons: ['Breakout'], blockers: [], warnings: [], dataGaps: [], modelVersion: 'strategy-decision-v1', generatedAt: new Date().toISOString() },
          { instrumentId: '2', symbol: 'MSFT', strategy: 'TREND_MOMENTUM', strategyVersion: '1.0.0', frameworkBacked: true, decision: 'WATCH', action: 'WAIT_FOR_CONFIRMATION', decisionScore: 65, confidence: 'MEDIUM', marketGate: 'OPEN', marketCondition: 'HEALTHY', reasons: ['Consolidating'], blockers: [], warnings: [], dataGaps: [], modelVersion: 'strategy-decision-v1', generatedAt: new Date().toISOString() }
        ]
      } as any);

      strategyService.exits.mockResolvedValue([
        { instrumentId: '3', symbol: 'TSLA', strategy: 'DEFENSIVE_EXIT', frameworkBacked: true, decision: 'EXIT_CANDIDATE', action: 'REVIEW_EXIT', decisionScore: 80, confidence: 'HIGH', marketGate: 'CLOSED', marketCondition: 'BAD', reasons: ['Trend break'], blockers: [], warnings: [], dataGaps: [], modelVersion: 'strategy-decision-v1', generatedAt: new Date().toISOString() }
      ] as any);

      strategyFrameworkService.performance.mockResolvedValue([{
        strategyCode: 'TREND_MOMENTUM',
        strategyVersion: '1.0.0',
        timeframe: '3Y',
        region: 'IN',
        assetType: 'STOCK',
        universeKey: 'ALL_ELIGIBLE',
        startingCapital: 100000,
        endingCapital: 130000,
        totalReturn: 0.3,
        cagr: 0.09,
        maxDrawdown: -0.12,
        volatility: 0.2,
        sharpe: 0.9,
        winRate: 0.56,
        profitFactor: 1.4,
        tradeCount: 35,
        averageHoldingDays: 20,
        exposurePercent: null,
        ratingScore: 70,
        ratingGrade: 'GOOD',
        automationEligibility: 'PAPER_TRADING_ELIGIBLE',
        readinessLabel: 'PAPER_TEST_CANDIDATE',
        generatedAt: new Date().toISOString(),
      } as any]);

      signalService.funnelDiagnostics.mockResolvedValue({
        total: 2,
        bullish: 1,
        bearish: 1,
        neutral: 0,
        byDirection: { BULLISH: 1, BEARISH: 1, NEUTRAL: 0 },
      } as any);

      smartMoneyService.top.mockResolvedValue({
        results: [
          { instrumentId: '1', symbol: 'AAPL', status: 'ACCUMULATION' }
        ],
        total: 1
      } as any);

      const result = await service.overview({ live: true });

      // Assertions
      expect(contextService.latestPersistedSummary).toHaveBeenCalledWith('IN');
      expect(contextService.summary).not.toHaveBeenCalled();
      expect(signalService.funnelDiagnostics).toHaveBeenCalledWith({ region: 'IN', assetType: 'STOCK' });
      expect(signalService.topSignals).not.toHaveBeenCalled();
      expect(strategyService.exits).toHaveBeenCalledWith(undefined, 'IN', 'STOCK');
      expect(smartMoneyService.top).toHaveBeenCalledWith(expect.objectContaining({ region: 'IN', assetType: 'STOCK' }));
      expect(strategyService.candidates).toHaveBeenCalledWith(expect.objectContaining({ region: 'IN', assetType: 'STOCK', decision: 'TRADE_CANDIDATE' }));
      expect(strategyFrameworkService.performance).toHaveBeenCalledWith('TREND_MOMENTUM', { region: 'IN', assetType: 'STOCK' });
      expect(result.marketReadiness.marketGate).toBe('OPEN');
      expect(result.marketReadiness.headline).toBe('Market environment is open; confirm actionability evidence before reviewing setup readiness.');
      expect(result.marketReadiness.allowedActions).toEqual([]);
      
      expect(result.researchPriorities.tradeCandidates).toHaveLength(1);
      expect(result.researchPriorities.tradeCandidates[0].symbol).toBe('AAPL');
      expect(result.researchPriorities.tradeCandidates[0].frameworkBacked).toBe(true);
      expect(result.researchPriorities.tradeCandidates[0].backtestSummary?.ratingGrade).toBe('GOOD');
      expect(result.researchPriorities.exitCandidates).toHaveLength(1);
      expect(result.strategyProofSummary.provenCandidateCount).toBeGreaterThan(0);
      
      expect(result.confirmationSummary.signalSummary.topBullishCount).toBe(1);
      expect(result.confirmationSummary.smartMoneySummary.topConfirmations).toHaveLength(1);
      expect(result.confirmationSummary.smartMoneySummary.topConfirmations[0]).toContain('AAPL');
      
      expect(result.nextActions).toBeDefined();
      expect(result.nextActions.length).toBeGreaterThan(0);
      expect(result.generatedAt).toBeDefined();
      expect(result.actionability.dimensions.marketEnvironment.status).toBe('READY');
      expect(result.actionability.dimensions.todayReviewReadiness.status).toBe('INSUFFICIENT_DATA');
      expect(result.actionability.dimensions.tradePlanReadiness.status).toBe('INSUFFICIENT_DATA');
      expect(result.actionability.overallStatus).toBe('INSUFFICIENT_DATA');
      expect(result.actionability.canReviewActionableSetups).toBe(false);
      expect(JSON.stringify(result)).not.toContain('setups allowed');
      expect(JSON.stringify(result)).not.toContain('NEW_LONG_TRADES_ALLOWED');
    });

    it('should handle partial failures gracefully', async () => {
      strategyService.marketGate.mockRejectedValue(new Error('Network error'));
      contextService.summary.mockResolvedValue({} as any);
      strategyService.candidates.mockResolvedValue({ results: [] } as any);
      strategyService.exits.mockResolvedValue([] as any);
      signalService.funnelDiagnostics.mockResolvedValue({ total: 0, bullish: 0, bearish: 0, neutral: 0, byDirection: {} } as any);
      smartMoneyService.top.mockResolvedValue([] as any);
      strategyFrameworkService.performance.mockResolvedValue([]);

      const result = await service.overview({ live: true });

      expect(result.marketReadiness.marketGate).toBe('UNKNOWN');
      expect(result.dataGaps).toContain('Market gate status unavailable');
      expect(result.nextActions.some(a => a.label.includes('Data Quality'))).toBe(true);
      expect(result.actionability.overallStatus).toBe('INSUFFICIENT_DATA');
      expect(result.actionability.canReviewActionableSetups).toBe(false);
      expect(result.actionability.dimensions.marketEnvironment.status).toBe('INSUFFICIENT_DATA');
    });

    it('does not promote raw bullish signals without framework-backed strategy decisions', async () => {
      strategyService.marketGate.mockResolvedValue({ marketGate: 'OPEN', marketCondition: 'HEALTHY', reasons: [], blockers: [], allowedActions: ['NEW_LONG_TRADES_ALLOWED'], dataStatus: 'COMPLETE' } as any);
      contextService.summary.mockResolvedValue({ topSectors: [], weakSectors: [], breadth: {}, explanation: [] } as any);
      strategyService.candidates.mockResolvedValue({ results: [] } as any);
      strategyService.exits.mockResolvedValue([] as any);
      signalService.funnelDiagnostics.mockResolvedValue({ total: 1, bullish: 1, bearish: 0, neutral: 0, byDirection: { BULLISH: 1, BEARISH: 0, NEUTRAL: 0 } } as any);
      smartMoneyService.top.mockResolvedValue({ results: [], total: 0 } as any);
      strategyFrameworkService.performance.mockResolvedValue([]);

      const result = await service.overview({ live: true });

      expect(result.confirmationSummary.signalSummary.topBullishCount).toBe(1);
      expect(result.researchPriorities.tradeCandidates).toHaveLength(0);
      expect(result.nextActions.some((action) => action.label === 'Run Strategy Evaluation' && action.targetRoute === '/strategy')).toBe(true);
    });

    it('moves strong framework decisions without backtest summaries to watch', async () => {
      strategyService.marketGate.mockResolvedValue({ marketGate: 'OPEN', marketCondition: 'HEALTHY', reasons: [], blockers: [], allowedActions: ['NEW_LONG_TRADES_ALLOWED'], dataStatus: 'COMPLETE' } as any);
      contextService.summary.mockResolvedValue({ topSectors: [], weakSectors: [], breadth: {}, explanation: [] } as any);
      strategyService.candidates.mockResolvedValue({ results: [
        { instrumentId: '1', symbol: 'AAPL', strategy: 'TREND_MOMENTUM', strategyVersion: '1.0.0', frameworkBacked: true, decision: 'TRADE_CANDIDATE', action: 'CONSIDER_ENTRY', decisionScore: 90, confidence: 'HIGH', marketGate: 'OPEN', marketCondition: 'HEALTHY', reasons: ['Strong setup'], blockers: [], warnings: [], dataGaps: [], modelVersion: 'strategy-decision-v1', generatedAt: new Date().toISOString() }
      ] } as any);
      strategyService.exits.mockResolvedValue([] as any);
      signalService.funnelDiagnostics.mockResolvedValue({ total: 0, bullish: 0, bearish: 0, neutral: 0, byDirection: {} } as any);
      smartMoneyService.top.mockResolvedValue({ results: [], total: 0 } as any);
      strategyFrameworkService.performance.mockResolvedValue([]);

      const result = await service.overview({ live: true });

      expect(result.researchPriorities.tradeCandidates).toHaveLength(0);
      expect(result.researchPriorities.watchCandidates[0].proofWarnings).toContain('No backtest summary available for this strategy/timeframe/region.');
      expect(result.strategyProofSummary.missingBacktestCount).toBe(1);
    });

    it('keeps low-confidence framework candidates out of review candidates', async () => {
      strategyService.marketGate.mockResolvedValue({ marketGate: 'OPEN', marketCondition: 'HEALTHY', reasons: [], blockers: [], allowedActions: ['NEW_LONG_TRADES_ALLOWED'], dataStatus: 'COMPLETE' } as any);
      contextService.summary.mockResolvedValue({ topSectors: [], weakSectors: [], breadth: {}, explanation: [] } as any);
      strategyService.candidates.mockResolvedValue({ results: [
        { instrumentId: '1', symbol: 'AAPL', strategy: 'TREND_MOMENTUM', frameworkBacked: true, decision: 'TRADE_CANDIDATE', action: 'CONSIDER_ENTRY', decisionScore: 95, confidence: 'LOW', marketGate: 'OPEN', marketCondition: 'HEALTHY', reasons: ['Setup exists but weak confidence'], blockers: [], warnings: [], dataGaps: [], modelVersion: 'strategy-decision-v1', generatedAt: new Date().toISOString() }
      ] } as any);
      strategyService.exits.mockResolvedValue([]);
      signalService.funnelDiagnostics.mockResolvedValue({ total: 0, bullish: 0, bearish: 0, neutral: 0, byDirection: {} } as any);
      smartMoneyService.top.mockResolvedValue({ results: [], total: 0 } as any);
      strategyFrameworkService.performance.mockResolvedValue([{ timeframe: '3Y', cagr: 0.1, maxDrawdown: -0.1, sharpe: 1, winRate: 0.6, profitFactor: 1.5, tradeCount: 30, ratingGrade: 'GOOD', generatedAt: new Date().toISOString() }] as any);

      const result = await service.overview({ live: true });

      expect(result.researchPriorities.tradeCandidates).toHaveLength(0);
      expect(result.researchPriorities.watchCandidates.length + result.researchPriorities.avoidCandidates.length).toBeGreaterThan(0);
    });

    it('returns no new long review candidates when market gate is CLOSED', async () => {
      strategyService.marketGate.mockResolvedValue({ marketGate: 'CLOSED', marketCondition: 'BAD', reasons: [], blockers: ['Market blocked'], allowedActions: ['MANAGE_EXISTING_POSITIONS_ONLY'], dataStatus: 'COMPLETE' } as any);
      contextService.summary.mockResolvedValue({ topSectors: [], weakSectors: [], breadth: {}, explanation: [] } as any);
      strategyService.candidates.mockResolvedValue({ results: [
        { instrumentId: '1', symbol: 'AAPL', strategy: 'TREND_MOMENTUM', frameworkBacked: true, decision: 'TRADE_CANDIDATE', action: 'CONSIDER_ENTRY', decisionScore: 95, confidence: 'HIGH', marketGate: 'CLOSED', marketCondition: 'BAD', reasons: ['Strong setup'], blockers: [], warnings: [], dataGaps: [], modelVersion: 'strategy-decision-v1', generatedAt: new Date().toISOString() }
      ] } as any);
      strategyService.exits.mockResolvedValue([]);
      signalService.funnelDiagnostics.mockResolvedValue({ total: 0, bullish: 0, bearish: 0, neutral: 0, byDirection: {} } as any);
      smartMoneyService.top.mockResolvedValue({ results: [], total: 0 } as any);
      strategyFrameworkService.performance.mockResolvedValue([{ timeframe: '3Y', cagr: 0.1, maxDrawdown: -0.1, sharpe: 1, winRate: 0.6, profitFactor: 1.5, tradeCount: 30, ratingGrade: 'GOOD', generatedAt: new Date().toISOString() }] as any);

      const result = await service.overview({ live: true });

      expect(result.marketReadiness.headline).toContain('No new long review candidates');
      expect(result.researchPriorities.tradeCandidates).toHaveLength(0);
      expect(result.strategyProofSummary.blockedByMarketGateCount).toBeGreaterThan(0);
      expect(result.actionability.overallStatus).toBe('BLOCKED');
      expect(result.actionability.canReviewActionableSetups).toBe(false);
      expect(result.actionability.blockers.some((blocker) => blocker.sourceModule === 'strategy-decision-engine' && blocker.category === 'BLOCKED')).toBe(true);
    });

    it('does not expose live-trading readiness labels', async () => {
      strategyService.marketGate.mockResolvedValue({ marketGate: 'OPEN', marketCondition: 'HEALTHY', reasons: [], blockers: [], allowedActions: ['NEW_LONG_TRADES_ALLOWED'], dataStatus: 'COMPLETE' } as any);
      contextService.summary.mockResolvedValue({ topSectors: [], weakSectors: [], breadth: {}, explanation: [] } as any);
      strategyService.candidates.mockResolvedValue({ results: [
        { instrumentId: '1', symbol: 'AAPL', strategy: 'TREND_MOMENTUM', strategyVersion: '1.0.0', frameworkBacked: true, decision: 'TRADE_CANDIDATE', action: 'CONSIDER_ENTRY', decisionScore: 90, confidence: 'HIGH', marketGate: 'OPEN', marketCondition: 'HEALTHY', readinessLabel: 'LIVE_TRADING_ELIGIBLE_FUTURE', reasons: [], blockers: [], warnings: [], dataGaps: [], modelVersion: 'strategy-decision-v1', generatedAt: new Date().toISOString() }
      ] } as any);
      strategyService.exits.mockResolvedValue([]);
      signalService.funnelDiagnostics.mockResolvedValue({ total: 0, bullish: 0, bearish: 0, neutral: 0, byDirection: {} } as any);
      smartMoneyService.top.mockResolvedValue({ results: [], total: 0 } as any);
      strategyFrameworkService.performance.mockResolvedValue([{ timeframe: '3Y', cagr: 0.1, maxDrawdown: -0.1, sharpe: 1, winRate: 0.6, profitFactor: 1.5, tradeCount: 30, ratingGrade: 'GOOD', generatedAt: new Date().toISOString() }] as any);

      const result = await service.overview({ live: true });

      expect(JSON.stringify(result)).not.toContain('LIVE_TRADING_ELIGIBLE_FUTURE');
      expect(result.researchPriorities.tradeCandidates[0].readinessLabel).toBe('RESEARCH_ONLY');
    });

    it('does not mark actionability ready when market is healthy but readiness evidence is unavailable', async () => {
      strategyService.marketGate.mockResolvedValue({ marketGate: 'OPEN', marketCondition: 'HEALTHY', reasons: [], blockers: [], allowedActions: ['NEW_LONG_TRADES_ALLOWED'], dataStatus: 'COMPLETE' } as any);
      contextService.summary.mockResolvedValue({ topSectors: [], weakSectors: [], breadth: {}, explanation: [] } as any);
      strategyService.candidates.mockResolvedValue({ results: [
        { instrumentId: '1', symbol: 'AAPL', strategy: 'TREND_MOMENTUM', frameworkBacked: true, decision: 'TRADE_CANDIDATE', action: 'CONSIDER_ENTRY', decisionScore: 95, confidence: 'HIGH', marketGate: 'OPEN', marketCondition: 'HEALTHY', reasons: ['Strong setup'], blockers: [], warnings: [], dataGaps: [], modelVersion: 'strategy-decision-v1', generatedAt: new Date().toISOString() }
      ] } as any);
      strategyService.exits.mockResolvedValue([]);
      signalService.funnelDiagnostics.mockResolvedValue({ total: 3, bullish: 3, bearish: 0, neutral: 0, byDirection: { BULLISH: 3, BEARISH: 0, NEUTRAL: 0 } } as any);
      smartMoneyService.top.mockResolvedValue({ results: [], total: 0 } as any);
      strategyFrameworkService.performance.mockResolvedValue([{ timeframe: '3Y', cagr: 0.1, maxDrawdown: -0.1, sharpe: 1, winRate: 0.6, profitFactor: 1.5, tradeCount: 30, ratingGrade: 'GOOD', generatedAt: new Date().toISOString() }] as any);

      const result = await service.overview({ live: true });

      expect(result.actionability.dimensions.marketEnvironment.status).toBe('READY');
      expect(result.actionability.dimensions.signalEvidence.status).toBe('LIMITED');
      expect(result.actionability.dimensions.strategyProof.status).toBe('LIMITED');
      expect(result.actionability.dimensions.todayReviewReadiness.status).toBe('INSUFFICIENT_DATA');
      expect(result.actionability.dimensions.tradePlanReadiness.status).toBe('INSUFFICIENT_DATA');
      expect(result.actionability.overallStatus).toBe('INSUFFICIENT_DATA');
      expect(result.actionability.canReviewActionableSetups).toBe(false);
      expect(JSON.stringify(result.actionability).toLowerCase()).not.toMatch(/\b(buy|sell|execute|order placement|live trading)\b/);
      expect(JSON.stringify(result)).not.toContain('setups allowed');
      expect(JSON.stringify(result)).not.toContain('NEW_LONG_TRADES_ALLOWED');
      expect(result.marketReadiness.allowedActions).toEqual([]);
    });
  });
});
