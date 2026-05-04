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
  let signalService: jest.Mocked<SignalGenerationEngineService>;
  let strategyService: jest.Mocked<StrategyDecisionEngineService>;
  let smartMoneyService: jest.Mocked<SmartMoneyIntelligenceService>;
  let contextService: jest.Mocked<MarketContextIntelligenceService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Re-initialize mocks
    signalService = new SignalGenerationEngineService() as any;
    strategyService = new StrategyDecisionEngineService() as any;
    smartMoneyService = new SmartMoneyIntelligenceService() as any;
    contextService = new MarketContextIntelligenceService() as any;

    service = new ResearchHubService(
      signalService,
      strategyService,
      smartMoneyService,
      contextService
    );
  });

  describe('overview', () => {
    it('should aggregate data from all intelligence services', async () => {
      // Setup mock returns
      const mockGate = { marketGate: 'OPEN', reasons: ['Bullish'] };
      const mockRegime = { regime: 'BULL_VOLATILE', score: 80, explanation: 'Strong uptrend' };
      const mockSignals = { signals: [{ id: 1, symbol: 'AAPL', direction: 'BULLISH', score: 95 }] };
      const mockSmartMoney = [{ instrumentId: 'uuid1', symbol: 'MSFT', smartMoneyScore: 85 }];
      const mockCandidates = { results: [{ id: 'uuid2', symbol: 'GOOGL', action: 'BUY', strategy: 'MOMENTUM' }] };

      strategyService.marketGate.mockResolvedValue(mockGate as any);
      contextService.regime.mockResolvedValue(mockRegime as any);
      signalService.topSignals.mockResolvedValue(mockSignals as any);
      smartMoneyService.top.mockResolvedValue(mockSmartMoney as any);
      strategyService.candidates.mockResolvedValue(mockCandidates as any);

      // Execute
      const result = await service.overview();

      // Assertions
      expect(result).toBeDefined();
      expect(result.marketGate).toEqual(mockGate);
      expect(result.marketRegime).toEqual(mockRegime);
      expect(result.topSignals).toEqual(mockSignals.signals);
      expect(result.topSmartMoney).toEqual(mockSmartMoney);
      expect(result.topStrategyCandidates).toEqual(mockCandidates.results);
      expect(result.updatedAt).toBeDefined();

      // Verify that the services were called with correct parameters
      expect(strategyService.marketGate).toHaveBeenCalledTimes(1);
      expect(contextService.regime).toHaveBeenCalledTimes(1);
      expect(signalService.topSignals).toHaveBeenCalledWith({ limit: 5, offset: 0, sortBy: 'score', sortDirection: 'desc', direction: 'BULLISH' });
      expect(smartMoneyService.top).toHaveBeenCalledWith({ limit: 5, range: '3M' });
      expect(strategyService.candidates).toHaveBeenCalledWith({ limit: 5, offset: 0, decision: 'TRADE_CANDIDATE' });
    });
  });

  describe('health', () => {
    it('should return health status', async () => {
      const result = await service.health();
      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.module).toBe('research-hub');
      expect(result.timestamp).toBeDefined();
    });
  });
});
