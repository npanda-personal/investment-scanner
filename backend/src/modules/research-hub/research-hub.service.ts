import { SignalGenerationEngineService } from '../signal-generation-engine';
import { StrategyDecisionEngineService } from '../strategy-decision-engine';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import { MarketContextIntelligenceService } from '../market-context-intelligence';

export class ResearchHubService {
  constructor(
    private readonly signalService = new SignalGenerationEngineService(),
    private readonly strategyService = new StrategyDecisionEngineService(),
    private readonly smartMoneyService = new SmartMoneyIntelligenceService(),
    private readonly contextService = new MarketContextIntelligenceService()
  ) {}

  async overview() {
    // We aggregate data from all core research modules to provide a single "pulse" of the market.
    const [gate, regime, topSignals, topSmartMoney, topStrategy] = await Promise.all([
      this.strategyService.marketGate(),
      this.contextService.regime(),
      // Top 5 BULLISH signals by score
      this.signalService.topSignals({ limit: 5, offset: 0, sortBy: 'score', sortDirection: 'desc', direction: 'BULLISH' }),
      // Top 5 ACCUMULATION candidates
      this.smartMoneyService.top({ limit: 5, range: '3M' }),
      // Top 5 TRADE_CANDIDATE strategy decisions
      this.strategyService.candidates({ limit: 5, offset: 0, decision: 'TRADE_CANDIDATE' })
    ]);

    return {
      marketGate: gate,
      marketRegime: regime,
      topSignals: topSignals.signals,
      topSmartMoney: topSmartMoney,
      topStrategyCandidates: topStrategy.results,
      updatedAt: new Date().toISOString(),
    };
  }

  async health() {
    return {
      status: 'ok',
      module: 'research-hub',
      timestamp: new Date().toISOString(),
    };
  }
}
