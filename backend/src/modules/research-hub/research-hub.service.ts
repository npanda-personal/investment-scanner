import { StrategyDecisionEngineService } from '../strategy-decision-engine';
import { MarketContextIntelligenceService } from '../market-context-intelligence';

export class ResearchHubService {
  constructor(
    private readonly strategyService = new StrategyDecisionEngineService(),
    private readonly contextService = new MarketContextIntelligenceService()
  ) {}

  async overview() {
    // We aggregate data from all core research modules to provide a single "pulse" of the market.
    const [gate, contextSummary, topStrategy, topExits] = await Promise.all([
      this.strategyService.marketGate().catch(err => {
        console.error('Market gate fetch error:', err);
        return { marketGate: 'UNKNOWN', reasons: ['Error fetching market gate'], blockers: [], allowedActions: [], marketCondition: 'UNKNOWN', marketScore: 0, dataStatus: 'ERROR', updatedAt: new Date().toISOString() };
      }),
      this.contextService.summary().catch(err => {
        console.error('Market context summary error:', err);
        return null;
      }),
      // Top 5 TRADE_CANDIDATE strategy decisions
      this.strategyService.candidates({ limit: 5, offset: 0, decision: 'TRADE_CANDIDATE' }).catch(err => {
        console.error('Strategy candidates fetch error:', err);
        return { results: [] };
      }),
      // Top 5 DEFENSIVE_EXIT decisions
      this.strategyService.exits().catch(err => {
        console.error('Strategy exits fetch error:', err);
        return [];
      })
    ]);

    const regime = contextSummary?.regime || {
      regime: 'NEUTRAL',
      score: 50,
      explanation: 'Market regime is currently being evaluated or encountered an error.',
      updatedAt: new Date().toISOString(),
      dataStatus: 'MISSING'
    };

    const breadth = contextSummary?.breadth || {
      percentAboveSma50: null,
      percentAboveSma200: null,
      advanceDeclineRatio: null,
      newHigh52WeekCount: 0,
      newLow52WeekCount: 0,
      bullishSignalCount: 0,
      bearishSignalCount: 0,
      instrumentCount: 0,
      dataStatus: 'MISSING'
    };

    return {
      marketGate: gate,
      marketRegime: regime,
      topSectors: contextSummary?.topSectors || [],
      weakSectors: contextSummary?.weakSectors || [],
      breadth: breadth,
      topStrategyCandidates: topStrategy?.results || [],
      topExits: (topExits || []).slice(0, 5),
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
