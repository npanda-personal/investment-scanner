import { StrategyDecisionEngineService } from '../strategy-decision-engine';
import { MarketContextIntelligenceService } from '../market-context-intelligence';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import type { 
  ResearchOverview, 
  MarketReadiness, 
  ResearchPriorities, 
  ConfirmationSummary, 
  NextAction,
  ResearchWhatChanged
} from './research-hub.types';

export class ResearchHubService {
  constructor(
    private readonly strategyService = new StrategyDecisionEngineService(),
    private readonly contextService = new MarketContextIntelligenceService(),
    private readonly signalService = new SignalGenerationEngineService(),
    private readonly smartMoneyService = new SmartMoneyIntelligenceService()
  ) {}

  async overview(): Promise<ResearchOverview> {
    const dataGaps: string[] = [];

    // Aggregate data from all core research modules with individual error handling
    const [gate, context, strategyCandidates, strategyExits, signals, smartMoneyRes] = await Promise.all([
      this.strategyService.marketGate().catch(err => {
        console.error('Market gate error:', err);
        dataGaps.push('Market gate status unavailable');
        return null;
      }),
      this.contextService.summary().catch(err => {
        console.error('Market context error:', err);
        dataGaps.push('Market context intelligence unavailable');
        return null;
      }),
      this.strategyService.candidates({ limit: 10, offset: 0 }).catch(err => {
        console.error('Strategy candidates error:', err);
        dataGaps.push('Strategy candidates unavailable');
        return { results: [], total: 0 };
      }),
      this.strategyService.exits().catch(err => {
        console.error('Strategy exits error:', err);
        dataGaps.push('Strategy exit candidates unavailable');
        return [];
      }),
      this.signalService.topSignals({ limit: 50 }).catch(err => {
        console.error('Top signals error:', err);
        dataGaps.push('Signal generation engine data unavailable');
        return { signals: [], total: 0 };
      }),
      this.smartMoneyService.top({ limit: 50, range: '3M' }).catch(err => {
        console.error('Smart money error:', err);
        dataGaps.push('Smart money intelligence data unavailable');
        return { results: [], total: 0 };
      })
    ]);

    const smartMoney = smartMoneyRes.results || [];

    // 1. Market Readiness
    const marketReadiness: MarketReadiness = {
      marketGate: gate?.marketGate || 'UNKNOWN',
      marketCondition: gate?.marketCondition || 'UNKNOWN',
      headline: this.generateReadinessHeadline(gate),
      allowedActions: gate?.allowedActions || [],
      reasons: gate?.reasons || [],
      blockers: gate?.blockers || [],
      dataStatus: gate?.dataStatus || 'MISSING',
    };

    // 2. Research Priorities
    const priorities: ResearchPriorities = {
      tradeCandidates: (strategyCandidates.results || []).filter(c => c.decision === 'TRADE_CANDIDATE').slice(0, 5),
      watchCandidates: (strategyCandidates.results || []).filter(c => c.decision === 'WATCH').slice(0, 5),
      avoidCandidates: (strategyCandidates.results || []).filter(c => c.decision === 'AVOID').slice(0, 5),
      exitCandidates: (strategyExits || []).slice(0, 5),
    };

    // 3. Confirmation Summary
    const bullishSignals = signals.signals.filter(s => s.direction === 'BULLISH');
    const bearishSignals = signals.signals.filter(s => s.direction === 'BEARISH');
    
    // Cross-reference strategy candidates with smart money
    const topConfirmations: string[] = [];
    const topContradictions: string[] = [];
    
    priorities.tradeCandidates.slice(0, 3).forEach(cand => {
      const sm = smartMoney.find(s => s.instrumentId === cand.instrumentId);
      if (sm?.status === 'ACCUMULATION') {
        topConfirmations.push(`${cand.symbol}: Strategy and Smart Money both see accumulation.`);
      } else if (sm?.status === 'DISTRIBUTION') {
        topContradictions.push(`${cand.symbol}: Strategy candidate but Smart Money shows distribution.`);
      }
    });

    const confirmationSummary: ConfirmationSummary = {
      signalSummary: {
        topBullishCount: bullishSignals.length,
        topBearishCount: bearishSignals.length,
        reliabilityAvailable: signals.signals.some(s => s.confidence === 'HIGH'),
        notes: this.generateSignalNotes(bullishSignals.length, bearishSignals.length),
      },
      smartMoneySummary: {
        accumulationCount: smartMoney.filter(s => s.status === 'ACCUMULATION').length,
        distributionCount: smartMoney.filter(s => s.status === 'DISTRIBUTION').length,
        topConfirmations,
        topContradictions,
      },
      marketContextSummary: {
        leadingSectors: context?.topSectors?.map(s => s.sector) || [],
        weakSectors: context?.weakSectors?.map(s => s.sector) || [],
        breadthStatus: context?.breadth?.percentAboveSma50 != null 
          ? `${(context.breadth.percentAboveSma50 * 100).toFixed(0)}% above SMA50` 
          : 'Breadth unavailable',
        notes: context?.explanation?.slice(0, 2) || [],
      }
    };

    // 4. What Changed (Simulated for MVP until snapshots are tracked for deltas)
    const whatChanged: ResearchWhatChanged = {
      newTradeCandidates: priorities.tradeCandidates.slice(0, 2).map(c => c.symbol || ''),
      downgradedCandidates: [],
      marketGateChange: null,
      warnings: gate?.blockers?.length ? ['Market entry is restricted by active blockers.'] : [],
    };

    // 5. Next Actions
    const nextActions: NextAction[] = this.generateNextActions(marketReadiness, priorities, dataGaps);

    return {
      marketReadiness,
      researchPriorities: priorities,
      confirmationSummary,
      whatChanged,
      nextActions,
      generatedAt: new Date().toISOString(),
      dataGaps,
    };
  }

  private generateReadinessHeadline(gate: any): string {
    if (!gate || gate.marketGate === 'UNKNOWN') return 'Market environment is currently unknown.';
    if (gate.marketGate === 'OPEN') return 'Environment is healthy: high-conviction setups allowed.';
    if (gate.marketGate === 'SELECTIVE') return 'Conditions are mixed: exercise high selectivity.';
    if (gate.marketGate === 'CLOSED') return 'Environment is defensive: focus on managing existing risk.';
    return 'Market conditions are being evaluated.';
  }

  private generateSignalNotes(bullish: number, bearish: number): string[] {
    const notes: string[] = [];
    if (bullish > bearish * 2) notes.push('Significant bullish signal dominance in the current universe.');
    else if (bearish > bullish * 2) notes.push('Significant bearish signal dominance; exercise caution.');
    else notes.push('Bullish and bearish signals are roughly balanced.');
    return notes;
  }

  private generateNextActions(readiness: MarketReadiness, priorities: ResearchPriorities, gaps: string[]): NextAction[] {
    const actions: NextAction[] = [];

    if (gaps.length > 0) {
      actions.push({
        label: 'Run Data Quality & Universe Sync',
        priority: 'HIGH',
        targetRoute: '/research/data-quality'
      });
    }

    if (readiness.marketGate === 'CLOSED') {
      actions.push({
        label: 'Review Defensive Exits',
        priority: 'HIGH',
        targetRoute: '/research/strategy'
      });
    } else if (priorities.tradeCandidates.length > 0) {
      actions.push({
        label: `Review ${priorities.tradeCandidates.length} Trade Candidates`,
        priority: 'HIGH',
        targetRoute: '/research/strategy'
      });
    } else {
      actions.push({
        label: 'Run Strategy Evaluation',
        priority: 'MEDIUM',
        targetRoute: '/research/strategy'
      });
    }

    if (priorities.watchCandidates.length > 0) {
      actions.push({
        label: 'Monitor Watchlist Candidates',
        priority: 'LOW',
        targetRoute: '/research/strategy'
      });
    }

    return actions;
  }

  async health() {
    return {
      status: 'ok',
      module: 'research-hub',
      timestamp: new Date().toISOString(),
    };
  }
}
