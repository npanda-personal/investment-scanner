import { StrategyDecisionEngineService } from '../strategy-decision-engine';
import { MarketContextIntelligenceService } from '../market-context-intelligence';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import { StrategyFrameworkService } from '../strategy-framework';
import type { StrategyDecisionDto, StrategyQuery } from '../strategy-decision-engine';
import type { 
  ResearchOverview, 
  MarketReadiness, 
  ResearchPriorities, 
  ConfirmationSummary, 
  NextAction,
  ResearchWhatChanged,
  ResearchPriorityCandidate,
  ResearchBacktestSummary,
  StrategyProofSummary,
  ResearchActionability,
  ActionabilityDimension,
  ActionabilityStatus
} from './research-hub.types';

export class ResearchHubService {
  constructor(
    private readonly strategyService = new StrategyDecisionEngineService(),
    private readonly contextService = new MarketContextIntelligenceService(),
    private readonly signalService = new SignalGenerationEngineService(),
    private readonly smartMoneyService = new SmartMoneyIntelligenceService(),
    private readonly strategyFrameworkService = new StrategyFrameworkService()
  ) {}

  async overview(query: { region?: string; assetType?: string } = {}): Promise<ResearchOverview> {
    const dataGaps: string[] = [];
    const region = query.region || 'IN';
    const assetType = query.assetType || 'STOCK';

    // Aggregate data from all core research modules with individual error handling
    const [gate, context, strategyCandidates, strategyExits, signalDiagnostics, smartMoneyRes] = await Promise.all([
      this.strategyService.marketGate(region).catch(err => {
        console.error('Market gate error:', err);
        dataGaps.push('Market gate status unavailable');
        return null;
      }),
      this.latestPersistedMarketContext(region).catch(err => {
        console.error('Market context error:', err);
        dataGaps.push('Market context intelligence unavailable');
        return null;
      }),
      this.fetchStrategyDecisionProofPool({ region, assetType }).catch(err => {
        console.error('Strategy candidates error:', err);
        dataGaps.push('Strategy candidates unavailable');
        return [];
      }),
      this.strategyService.exits(undefined, region, assetType).catch(err => {
        console.error('Strategy exits error:', err);
        dataGaps.push('Strategy exit candidates unavailable');
        return [];
      }),
      this.signalService.funnelDiagnostics({ region, assetType }).catch(err => {
        console.error('Top signals error:', err);
        dataGaps.push('Signal generation engine data unavailable');
        return { total: 0, bullish: 0, bearish: 0, neutral: 0, byDirection: {} };
      }),
      this.smartMoneyService.top({ limit: 25, range: '3M', region, assetType }).catch(err => {
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
      allowedActions: [],
      reasons: gate?.reasons || [],
      blockers: gate?.blockers || [],
      dataStatus: gate?.dataStatus || 'MISSING',
    };

    const enriched = await this.enrichCandidates(strategyCandidates, region, assetType, dataGaps);
    const enrichedExits = await this.enrichCandidates(strategyExits || [], region, assetType, dataGaps, true);

    // 2. Research Priorities
    const priorities = this.bucketPriorities(enriched, enrichedExits, marketReadiness);
    const strategyProofSummary = this.buildStrategyProofSummary([...priorities.tradeCandidates, ...priorities.watchCandidates, ...priorities.avoidCandidates], marketReadiness);

    // 3. Confirmation Summary
    const signalDirectionCounts = (signalDiagnostics.byDirection || {}) as Record<string, number>;
    const bullishSignalCount = Number(signalDiagnostics.bullish || signalDirectionCounts.BULLISH || 0);
    const bearishSignalCount = Number(signalDiagnostics.bearish || signalDirectionCounts.BEARISH || 0);
    const totalSignalCount = Number(signalDiagnostics.total || bullishSignalCount + bearishSignalCount + Number(signalDiagnostics.neutral || signalDirectionCounts.NEUTRAL || 0));
    
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
        topBullishCount: bullishSignalCount,
        topBearishCount: bearishSignalCount,
        reliabilityAvailable: totalSignalCount > 0,
        notes: this.generateSignalNotes(bullishSignalCount, bearishSignalCount),
      },
      smartMoneySummary: {
        accumulationCount: smartMoney.filter(s => s.status === 'ACCUMULATION').length,
        distributionCount: smartMoney.filter(s => s.status === 'DISTRIBUTION').length,
        topConfirmations,
        topContradictions,
      },
      marketContextSummary: {
        leadingSectors: (context?.topSectors || []).map((s: any) => s.sector),
        weakSectors: (context?.weakSectors || []).map((s: any) => s.sector),
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
    const nextActions: NextAction[] = this.generateNextActions(marketReadiness, priorities, dataGaps, strategyProofSummary);
    const actionability = this.buildActionability(marketReadiness, priorities, strategyProofSummary, confirmationSummary, dataGaps, nextActions);

    return {
      actionability,
      marketReadiness,
      researchPriorities: priorities,
      strategyProofSummary,
      confirmationSummary,
      whatChanged,
      nextActions,
      generatedAt: new Date().toISOString(),
      dataGaps,
    };
  }

  private buildActionability(
    readiness: MarketReadiness,
    priorities: ResearchPriorities,
    proof: StrategyProofSummary,
    confirmation: ConfirmationSummary,
    dataGaps: string[],
    nextActions: NextAction[]
  ): ResearchActionability {
    const reviewCandidateCount = priorities.tradeCandidates.length;
    const signalCount = confirmation.signalSummary.topBullishCount + confirmation.signalSummary.topBearishCount;
    const dimensions = {
      marketEnvironment: this.marketEnvironmentDimension(readiness),
      dataReadiness: this.dataReadinessDimension(readiness, dataGaps),
      signalEvidence: this.unstableDimension(
        signalCount > 0 ? 'LIMITED' : 'INSUFFICIENT_DATA',
        'Signal Evidence',
        'signal-quality-lab',
        signalCount,
        signalCount > 0
          ? 'Raw signal counts are available, but Signal Quality evidence maturity is not yet wired into Research Hub actionability.'
          : 'Signal Quality evidence maturity is not yet available for this overview.'
      ),
      calibrationReadiness: this.unstableDimension(
        'INSUFFICIENT_DATA',
        'Calibration Readiness',
        'signal-calibration-engine',
        undefined,
        'Calibration readiness is not yet wired into Research Hub actionability.'
      ),
      strategyProof: this.strategyProofDimension(proof, reviewCandidateCount),
      todayReviewReadiness: this.unstableDimension(
        'INSUFFICIENT_DATA',
        'Today Review Readiness',
        'today-trade-review',
        undefined,
        'Today Review readiness is not yet a stable Research Hub input.'
      ),
      tradePlanReadiness: this.unstableDimension(
        'INSUFFICIENT_DATA',
        'Trade Plan Readiness',
        'trade-plan-risk-engine',
        undefined,
        'Trade Plan paper-readiness is not yet a stable Research Hub input.'
      ),
    };
    const allDimensions = Object.values(dimensions);
    const blockers = allDimensions
      .filter((dimension) => dimension.blocking)
      .map((dimension) => ({
        sourceModule: dimension.sourceModule,
        category: dimension.status,
        count: dimension.count,
        message: dimension.message,
      }));
    const overallStatus = this.reduceActionability(allDimensions);
    const nextBestAction = nextActions[0]
      ? { ...nextActions[0], sourceModule: nextActions[0].targetRoute.includes('data-quality') ? 'data-quality-engine' : 'strategy-decision-engine' }
      : null;

    return {
      overallStatus,
      canReviewActionableSetups: false,
      headline: this.actionabilityHeadline(overallStatus),
      researchSupportOnly: true,
      dimensions,
      nextBestAction,
      blockers,
    };
  }

  private marketEnvironmentDimension(readiness: MarketReadiness): ActionabilityDimension {
    if (readiness.marketGate === 'CLOSED') {
      return {
        status: 'BLOCKED',
        label: 'Market Environment',
        sourceModule: 'strategy-decision-engine',
        blocking: true,
        message: 'Market gate is closed for new long review candidates.',
      };
    }
    if (readiness.marketGate === 'OPEN') {
      return {
        status: 'READY',
        label: 'Market Environment',
        sourceModule: 'strategy-decision-engine',
        blocking: false,
        message: 'Market environment is open, but this does not prove actionable setup readiness.',
      };
    }
    if (readiness.marketGate === 'SELECTIVE') {
      return {
        status: 'LIMITED',
        label: 'Market Environment',
        sourceModule: 'strategy-decision-engine',
        blocking: false,
        message: 'Market environment is selective; review quality gates before promoting candidates.',
      };
    }
    return {
      status: 'INSUFFICIENT_DATA',
      label: 'Market Environment',
      sourceModule: 'strategy-decision-engine',
      blocking: true,
      message: 'Market environment is unavailable.',
    };
  }

  private dataReadinessDimension(readiness: MarketReadiness, dataGaps: string[]): ActionabilityDimension {
    if (readiness.dataStatus === 'MISSING') {
      return {
        status: 'INSUFFICIENT_DATA',
        label: 'Data Readiness',
        sourceModule: 'research-hub',
        blocking: true,
        count: dataGaps.length,
        message: dataGaps.length > 0 ? 'One or more upstream research inputs are unavailable.' : 'Market data readiness is missing.',
      };
    }
    if (dataGaps.length > 0 || readiness.dataStatus === 'PARTIAL') {
      return {
        status: 'LIMITED',
        label: 'Data Readiness',
        sourceModule: 'research-hub',
        blocking: false,
        count: dataGaps.length,
        message: 'Research Hub is operating with partial upstream data.',
      };
    }
    return {
      status: 'LIMITED',
      label: 'Data Readiness',
      sourceModule: 'research-hub',
      blocking: false,
      count: dataGaps.length,
      message: 'Research Hub has no local data gaps, but trusted review-universe readiness is not yet wired.',
    };
  }

  private strategyProofDimension(proof: StrategyProofSummary, reviewCandidateCount: number): ActionabilityDimension {
    if (proof.provenCandidateCount > 0 && reviewCandidateCount > 0) {
      return {
        status: 'LIMITED',
        label: 'Strategy Proof',
        sourceModule: 'strategy-decision-engine',
        blocking: false,
        count: proof.provenCandidateCount,
        message: 'Framework-backed review candidates exist, but downstream review and plan readiness are not yet proven here.',
      };
    }
    if (proof.missingBacktestCount > 0 || proof.unprovenCandidateCount > 0) {
      return {
        status: 'UNPROVEN',
        label: 'Strategy Proof',
        sourceModule: 'strategy-decision-engine',
        blocking: true,
        count: proof.unprovenCandidateCount + proof.missingBacktestCount,
        message: 'Strategy proof is missing or unproven for review candidates.',
      };
    }
    return {
      status: 'INSUFFICIENT_DATA',
      label: 'Strategy Proof',
      sourceModule: 'strategy-decision-engine',
      blocking: true,
      count: 0,
      message: 'No framework-backed strategy proof is available for review candidates.',
    };
  }

  private unstableDimension(
    status: Exclude<ActionabilityStatus, 'READY'>,
    label: string,
    sourceModule: string,
    count: number | undefined,
    message: string
  ): ActionabilityDimension {
    return {
      status,
      label,
      sourceModule,
      blocking: status === 'BLOCKED' || status === 'UNPROVEN' || status === 'INSUFFICIENT_DATA',
      count,
      message,
    };
  }

  private reduceActionability(dimensions: ActionabilityDimension[]): ActionabilityStatus {
    if (dimensions.some((dimension) => dimension.status === 'BLOCKED')) return 'BLOCKED';
    if (dimensions.some((dimension) => dimension.status === 'INSUFFICIENT_DATA')) return 'INSUFFICIENT_DATA';
    if (dimensions.some((dimension) => dimension.status === 'UNPROVEN')) return 'UNPROVEN';
    if (dimensions.some((dimension) => dimension.status === 'LIMITED')) return 'LIMITED';
    return 'READY';
  }

  private actionabilityHeadline(status: ActionabilityStatus): string {
    if (status === 'BLOCKED') return 'Actionable setup review is blocked; use repair or diagnostic workflows first.';
    if (status === 'UNPROVEN') return 'Actionable setup review is not proven yet; review strategy evidence first.';
    if (status === 'LIMITED') return 'Actionable setup review is limited; verify upstream evidence before promotion.';
    if (status === 'READY') return 'Actionable setup review is ready for research review.';
    return 'Actionable setup review is not confirmed because required readiness evidence is unavailable.';
  }

  private generateReadinessHeadline(gate: any): string {
    if (!gate || gate.marketGate === 'UNKNOWN') return 'Market environment is currently unknown.';
    if (gate.marketGate === 'OPEN') return 'Market environment is open; confirm actionability evidence before reviewing setup readiness.';
    if (gate.marketGate === 'SELECTIVE') return 'Market environment is selective; review diagnostics and evidence before promoting candidates.';
    if (gate.marketGate === 'CLOSED') return 'No new long review candidates are available. Review exits and watchlist only.';
    return 'Market conditions are being evaluated.';
  }

  private generateSignalNotes(bullish: number, bearish: number): string[] {
    const notes: string[] = [];
    if (bullish > bearish * 2) notes.push('Significant bullish signal dominance in the current universe.');
    else if (bearish > bullish * 2) notes.push('Significant bearish signal dominance; exercise caution.');
    else notes.push('Bullish and bearish signals are roughly balanced.');
    return notes;
  }

  private async latestPersistedMarketContext(region: string): Promise<any | null> {
    const service = this.contextService as any;
    if (typeof service.latestPersistedSummary === 'function') {
      return service.latestPersistedSummary(region);
    }
    return service.summary({ region });
  }

  private async fetchStrategyDecisionProofPool(query: StrategyQuery): Promise<StrategyDecisionDto[]> {
    const decisions: StrategyQuery['decision'][] = ['TRADE_CANDIDATE', 'WATCH', 'WAIT', 'AVOID'];
    const responses = await Promise.all(decisions.map((decision) => this.strategyService.candidates({ ...query, decision, limit: 25, offset: 0 }).catch(() => ({ results: [] }))));
    const seen = new Set<string>();
    return responses.flatMap((response) => response.results || []).filter((candidate) => {
      const key = candidate.id || `${candidate.instrumentId}-${candidate.strategy}-${candidate.decision}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async enrichCandidates(candidates: StrategyDecisionDto[], region: string, assetType: string, dataGaps: string[], isExit = false): Promise<ResearchPriorityCandidate[]> {
    const uniqueStrategies = [...new Set(candidates.map((candidate) => candidate.strategy).filter(Boolean))];
    const performanceByStrategy = new Map<string, ResearchBacktestSummary | null>();
    await Promise.all(uniqueStrategies.map(async (strategy) => {
      const summaries = await this.strategyFrameworkService.performance(strategy, { region, assetType }).catch(() => {
        dataGaps.push(`Strategy performance summary unavailable for ${strategy}`);
        return [];
      });
      performanceByStrategy.set(strategy, this.toBacktestSummary(summaries[0]));
    }));

    return candidates.slice(0, 50).map((input) => {
      const candidate = {
        ...input,
        reasons: input.reasons || [],
        blockers: input.blockers || [],
        warnings: input.warnings || [],
        dataGaps: input.dataGaps || [],
      };
      const backtestSummary = performanceByStrategy.get(candidate.strategy) ?? null;
      const readinessLabel = this.safeReadiness(candidate.readinessLabel || candidate.strategyRating?.readinessLabel || backtestSummary?.ratingGrade);
      const proofWarnings: string[] = [];
      if (!candidate.frameworkBacked) proofWarnings.push('Strategy Framework-backed decision is missing.');
      if (!backtestSummary) proofWarnings.push('No backtest summary available for this strategy/timeframe/region.');
      if (candidate.dataGaps.length > 0) proofWarnings.push(`${candidate.dataGaps.length} data gap(s) need review.`);
      if (candidate.blockers.length > 0) proofWarnings.push(`${candidate.blockers.length} blocker(s) active.`);

      return {
        ...candidate,
        strategyCode: candidate.strategy,
        readinessLabel,
        backtestSummary,
        proofWarnings,
        primaryNextAction: this.primaryNextAction(candidate, backtestSummary, isExit),
        targetRoute: `/strategy?instrumentId=${candidate.instrumentId || ''}`,
        strategyRoute: `/strategies?strategyCode=${candidate.strategy}`,
        backtestRoute: candidate.strategy ? `/backtests?mode=registered&strategyCode=${candidate.strategy}&timeframe=${backtestSummary?.timeframe || '3Y'}&region=${region}&assetType=${assetType}` : null,
        stockRoute: candidate.instrumentId ? `/stocks/${candidate.instrumentId}` : null,
      };
    });
  }

  private bucketPriorities(candidates: ResearchPriorityCandidate[], exits: ResearchPriorityCandidate[], readiness: MarketReadiness): ResearchPriorities {
    const sorted = [...candidates].sort((a, b) => this.priorityScore(b, readiness) - this.priorityScore(a, readiness));
    const tradeCandidates = readiness.marketGate === 'CLOSED'
      ? []
      : sorted.filter((candidate) => this.isTradeCandidate(candidate, readiness)).slice(0, 5);
    const usedTrade = new Set(tradeCandidates.map((candidate) => candidate.id || `${candidate.instrumentId}-${candidate.strategy}`));
    const watchCandidates = sorted
      .filter((candidate) => !usedTrade.has(candidate.id || `${candidate.instrumentId}-${candidate.strategy}`))
      .filter((candidate) => this.isWatchCandidate(candidate, readiness))
      .slice(0, 5);
    const usedWatch = new Set(watchCandidates.map((candidate) => candidate.id || `${candidate.instrumentId}-${candidate.strategy}`));
    const avoidCandidates = sorted
      .filter((candidate) => !usedTrade.has(candidate.id || `${candidate.instrumentId}-${candidate.strategy}`) && !usedWatch.has(candidate.id || `${candidate.instrumentId}-${candidate.strategy}`))
      .filter((candidate) => candidate.decision === 'AVOID' || candidate.blockers.length > 0 || readiness.marketGate === 'CLOSED' || candidate.readinessLabel === 'NOT_AUTOMATION_READY')
      .slice(0, 5);

    return {
      tradeCandidates,
      watchCandidates,
      avoidCandidates,
      exitCandidates: exits.sort((a, b) => b.decisionScore - a.decisionScore).slice(0, 5),
    };
  }

  private isTradeCandidate(candidate: ResearchPriorityCandidate, readiness: MarketReadiness) {
    return Boolean(candidate.frameworkBacked)
      && candidate.decision === 'TRADE_CANDIDATE'
      && candidate.action === 'CONSIDER_ENTRY'
      && readiness.marketGate !== 'CLOSED'
      && candidate.marketGate !== 'CLOSED'
      && candidate.blockers.length === 0
      && candidate.confidence !== 'LOW'
      && candidate.dataGaps.length <= 1
      && Boolean(candidate.backtestSummary)
      && !['WEAK', 'UNPROVEN'].includes(candidate.backtestSummary?.ratingGrade || '')
      && candidate.readinessLabel !== 'NOT_AUTOMATION_READY';
  }

  private isWatchCandidate(candidate: ResearchPriorityCandidate, readiness: MarketReadiness) {
    if (candidate.decision === 'WATCH' || candidate.decision === 'WAIT') return true;
    if (!candidate.frameworkBacked || !candidate.backtestSummary) return true;
    if (readiness.marketGate === 'SELECTIVE' || readiness.marketGate === 'UNKNOWN') return true;
    return candidate.dataGaps.length > 0 || candidate.readinessLabel === 'RESEARCH_ONLY' || candidate.backtestSummary.ratingGrade === 'UNPROVEN';
  }

  private priorityScore(candidate: ResearchPriorityCandidate, readiness: MarketReadiness) {
    const marketScore = readiness.marketGate === 'OPEN' && candidate.marketGate === 'OPEN' ? 100 : candidate.marketGate === 'SELECTIVE' ? 70 : candidate.marketGate === 'UNKNOWN' ? 25 : 0;
    return marketScore
      + this.ratingRank(candidate.backtestSummary?.ratingGrade || candidate.strategyRating?.ratingGrade) * 20
      + this.readinessRank(candidate.readinessLabel) * 10
      + candidate.decisionScore
      + (candidate.confidence === 'HIGH' ? 15 : candidate.confidence === 'MEDIUM' ? 8 : 0)
      - candidate.blockers.length * 40
      - candidate.dataGaps.length * 10
      - candidate.warnings.length * 5
      + (candidate.reasons.some((reason) => reason.toLowerCase().includes('smart-money') || reason.toLowerCase().includes('accumulation')) ? 8 : 0)
      + (candidate.reasons.some((reason) => reason.toLowerCase().includes('sector') || reason.toLowerCase().includes('market')) ? 5 : 0);
  }

  private buildStrategyProofSummary(candidates: ResearchPriorityCandidate[], readiness: MarketReadiness): StrategyProofSummary {
    const grouped = new Map<string, ResearchPriorityCandidate[]>();
    for (const candidate of candidates.filter((item) => item.frameworkBacked)) {
      grouped.set(candidate.strategy, [...(grouped.get(candidate.strategy) || []), candidate]);
    }
    const strategiesProducingCandidates = [...grouped.entries()].map(([strategy, items]) => {
      const best = [...items].sort((a, b) => this.priorityScore(b, readiness) - this.priorityScore(a, readiness))[0];
      return {
        strategy,
        strategyVersion: best.strategyVersion,
        candidateCount: items.length,
        bestRating: best.backtestSummary?.ratingGrade || best.strategyRating?.ratingGrade || 'UNPROVEN',
        readinessLabel: this.safeReadiness(best.readinessLabel),
        topCandidateSymbol: best.symbol,
      };
    }).slice(0, 5);
    const missingBacktestCount = candidates.filter((candidate) => candidate.frameworkBacked && !candidate.backtestSummary).length;
    return {
      strategiesProducingCandidates,
      provenCandidateCount: candidates.filter((candidate) => ['EXCELLENT', 'GOOD', 'AVERAGE'].includes(candidate.backtestSummary?.ratingGrade || '')).length,
      unprovenCandidateCount: candidates.filter((candidate) => !candidate.backtestSummary || ['UNPROVEN', 'WEAK'].includes(candidate.backtestSummary.ratingGrade)).length,
      blockedByMarketGateCount: candidates.filter((candidate) => candidate.marketGate === 'CLOSED' || readiness.marketGate === 'CLOSED').length,
      missingBacktestCount,
      notes: missingBacktestCount > 0 ? ['Some framework-backed review candidates need backtest summaries before promotion.'] : [],
    };
  }

  private generateNextActions(readiness: MarketReadiness, priorities: ResearchPriorities, gaps: string[], proof: StrategyProofSummary): NextAction[] {
    const actions: NextAction[] = [];

    if (gaps.length > 0) {
      actions.push({
        label: 'Run Data Quality & Universe Sync',
        priority: 'HIGH',
        targetRoute: '/data-quality'
      });
    }

    if (readiness.marketGate === 'CLOSED') {
      actions.push({
        label: priorities.exitCandidates.length > 0 ? `New long review candidates restricted; review ${priorities.exitCandidates.length} exit candidates` : 'New long review candidates restricted; review watchlist only',
        priority: 'HIGH',
        targetRoute: '/strategy'
      });
    } else if (priorities.tradeCandidates.length > 0) {
      actions.push({
        label: `Review ${priorities.tradeCandidates.length} framework-backed review candidates`,
        priority: 'HIGH',
        targetRoute: '/strategy'
      });
    } else {
      actions.push({
        label: 'Run Strategy Evaluation',
        priority: 'MEDIUM',
        targetRoute: '/strategy'
      });
    }

    if (proof.missingBacktestCount > 0) {
      actions.push({
        label: 'Generate missing strategy performance summaries',
        priority: 'MEDIUM',
        targetRoute: '/strategies'
      });
    }

    if (priorities.watchCandidates.length > 0) {
      actions.push({
        label: 'Monitor Watchlist Review Candidates',
        priority: 'LOW',
        targetRoute: '/strategy'
      });
    }

    return actions;
  }

  private toBacktestSummary(summary: any): ResearchBacktestSummary | null {
    if (!summary) return null;
    return {
      timeframe: summary.timeframe,
      cagr: summary.cagr ?? null,
      maxDrawdown: summary.maxDrawdown ?? null,
      sharpe: summary.sharpe ?? null,
      winRate: summary.winRate ?? null,
      profitFactor: summary.profitFactor ?? null,
      tradeCount: summary.tradeCount ?? 0,
      ratingGrade: summary.ratingGrade || 'UNPROVEN',
      availabilityStatus: summary.tradeCount > 0 ? 'AVAILABLE' : 'INSUFFICIENT_HISTORY',
      generatedAt: summary.generatedAt,
    };
  }

  private primaryNextAction(candidate: StrategyDecisionDto, backtestSummary: ResearchBacktestSummary | null, isExit: boolean) {
    if (isExit) return 'Review risk level in Strategy Decision';
    if (candidate.blockers.length > 0) return 'Review blockers before action';
    if (!backtestSummary) return `Run backtest for ${candidate.strategy}`;
    if (candidate.decision === 'TRADE_CANDIDATE') return 'Review Strategy Decision proof';
    if (candidate.decision === 'WATCH' || candidate.decision === 'WAIT') return 'Wait for confirmation';
    return 'Review data gaps and warnings';
  }

  private ratingRank(value?: string | null) {
    return { EXCELLENT: 5, GOOD: 4, AVERAGE: 3, UNPROVEN: 2, WEAK: 1 }[String(value || 'UNPROVEN')] ?? 0;
  }

  private readinessRank(value?: string | null) {
    return { PAPER_TEST_CANDIDATE: 4, WATCHLIST_CANDIDATE: 3, RESEARCH_ONLY: 2, NOT_AUTOMATION_READY: 1 }[this.safeReadiness(value)] ?? 0;
  }

  private safeReadiness(value?: string | null) {
    if (value === 'PAPER_TEST_CANDIDATE' || value === 'WATCHLIST_CANDIDATE' || value === 'NOT_AUTOMATION_READY') return value;
    return 'RESEARCH_ONLY';
  }

  async health() {
    return {
      status: 'ok',
      module: 'research-hub',
      timestamp: new Date().toISOString(),
    };
  }
}
