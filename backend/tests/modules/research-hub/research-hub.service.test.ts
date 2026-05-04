import { ResearchHubService } from '../../../src/modules/research-hub/research-hub.service';
import { SignalGenerationEngineService } from '../../../src/modules/signal-generation-engine';
import { StrategyDecisionEngineService } from '../../../src/modules/strategy-decision-engine';
import { SmartMoneyIntelligenceService } from '../../../src/modules/smart-money-intelligence';
import { MarketContextIntelligenceService } from '../../../src/modules/market-context-intelligence';

// Mock dependencies
jest.mock('../../../src/modules/signal-generation-engine');
jest.mock('../../../src/modules/strategy-decision-engine');
jest.mock('../../../src/modules/smart-money-intelligence');
jest.mock('../../../src/modules/market-context-intelligence');

describe('ResearchHubService', () => {
  let service: ResearchHubService;
  let strategyService: jest.Mocked<StrategyDecisionEngineService>;
  let contextService: jest.Mocked<MarketContextIntelligenceService>;
  let signalService: jest.Mocked<SignalGenerationEngineService>;
  let smartMoneyService: jest.Mocked<SmartMoneyIntelligenceService>;

  beforeEach(() => {
    jest.clearAllMocks();

    strategyService = new StrategyDecisionEngineService() as any;
    contextService = new MarketContextIntelligenceService() as any;
    signalService = new SignalGenerationEngineService() as any;
    smartMoneyService = new SmartMoneyIntelligenceService() as any;

    service = new ResearchHubService(
      strategyService,
      contextService,
      signalService,
      smartMoneyService
    );
  });

  describe('overview', () => {
    it('should aggregate data and return a decision-oriented response', async () => {
      // Setup mock returns
      strategyService.marketGate.mockResolvedValue({ 
        marketGate: 'OPEN', 
        marketCondition: 'HEALTHY', 
        reasons: ['Strong trend'], 
        blockers: [], 
        allowedActions: ['NEW_LONG_TRADES_ALLOWED'] 
      } as any);
      
      contextService.summary.mockResolvedValue({
        regime: { regime: 'RISK_ON', score: 75, explanation: 'Uptrend' },
        topSectors: [{ sector: 'Tech', relativeStrengthScore: 80 }],
        weakSectors: [{ sector: 'Energy', relativeStrengthScore: 30 }],
        breadth: { percentAboveSma50: 0.7 },
        explanation: ['Market is strong']
      } as any);

      strategyService.candidates.mockResolvedValue({
        results: [
          { instrumentId: '1', symbol: 'AAPL', decision: 'TRADE_CANDIDATE', decisionScore: 85, reasons: ['Breakout'] },
          { instrumentId: '2', symbol: 'MSFT', decision: 'WATCH', decisionScore: 65, reasons: ['Consolidating'] }
        ]
      } as any);

      strategyService.exits.mockResolvedValue([
        { instrumentId: '3', symbol: 'TSLA', decision: 'EXIT_CANDIDATE', reasons: ['Trend break'] }
      ] as any);

      signalService.topSignals.mockResolvedValue({
        signals: [
          { instrument_id: '1', symbol: 'AAPL', direction: 'BULLISH', confidence: 'HIGH' },
          { instrument_id: '4', symbol: 'GOOGL', direction: 'BEARISH', confidence: 'MEDIUM' }
        ]
      } as any);

      smartMoneyService.top.mockResolvedValue({
        results: [
          { instrumentId: '1', symbol: 'AAPL', status: 'ACCUMULATION' }
        ],
        total: 1
      } as any);

      const result = await service.overview();

      // Assertions
      expect(result.marketReadiness.marketGate).toBe('OPEN');
      expect(result.marketReadiness.headline).toContain('Environment is healthy');
      
      expect(result.researchPriorities.tradeCandidates).toHaveLength(1);
      expect(result.researchPriorities.tradeCandidates[0].symbol).toBe('AAPL');
      expect(result.researchPriorities.exitCandidates).toHaveLength(1);
      
      expect(result.confirmationSummary.signalSummary.topBullishCount).toBe(1);
      expect(result.confirmationSummary.smartMoneySummary.topConfirmations).toHaveLength(1);
      expect(result.confirmationSummary.smartMoneySummary.topConfirmations[0]).toContain('AAPL');
      
      expect(result.nextActions).toBeDefined();
      expect(result.nextActions.length).toBeGreaterThan(0);
      expect(result.generatedAt).toBeDefined();
    });

    it('should handle partial failures gracefully', async () => {
      strategyService.marketGate.mockRejectedValue(new Error('Network error'));
      contextService.summary.mockResolvedValue({} as any);
      strategyService.candidates.mockResolvedValue({ results: [] } as any);
      strategyService.exits.mockResolvedValue([] as any);
      signalService.topSignals.mockResolvedValue({ signals: [] } as any);
      smartMoneyService.top.mockResolvedValue([] as any);

      const result = await service.overview();

      expect(result.marketReadiness.marketGate).toBe('UNKNOWN');
      expect(result.dataGaps).toContain('Market gate status unavailable');
      expect(result.nextActions.some(a => a.label.includes('Data Quality'))).toBe(true);
    });
  });
});
