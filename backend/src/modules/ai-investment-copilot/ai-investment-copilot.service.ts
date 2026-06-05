import { StockResearchWorkbenchService } from '../stock-research-workbench';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import { MarketContextIntelligenceService } from '../market-context-intelligence';
import { PortfolioManagementService } from '../portfolio-management';
import { PortfolioIntelligenceService } from '../portfolio-intelligence';
import { WatchlistManagementService } from '../watchlist-management';
import { AlertsMonitoringService } from '../alerts-monitoring';
import { SubscriptionBillingService } from '../subscription-billing';
import type {
  CopilotDependencies,
  CopilotSummaryResponse,
} from './ai-investment-copilot.types';

const DISCLAIMER = 'For research support only, not financial advice.';

export class AiInvestmentCopilotService {
  /**
   * Lazily-resolved strategy-decision service instance.
   * Populated on first call when strategyDecisionService is not injected.
   * Cycle-safe: requires the specific service file, not the module index.
   */
  private defaultStrategyDecisionServiceInstance?: any;
  /**
   * Lazily-resolved trade-plan service instance.
   * Cycle-safe: requires the specific service file, not the module index.
   */
  private defaultTradePlanServiceInstance?: any;
  /**
   * Lazily-resolved today-review service instance.
   * Cycle-safe: requires the specific service file, not the module index.
   */
  private defaultTodayReviewServiceInstance?: any;

  constructor(
    private readonly dependencies: CopilotDependencies = {
      stockResearchService: new StockResearchWorkbenchService(),
      signalService: new SignalGenerationEngineService(),
      smartMoneyService: new SmartMoneyIntelligenceService(),
      marketContextService: new MarketContextIntelligenceService(),
      portfolioManagementService: new PortfolioManagementService(),
      portfolioIntelligenceService: new PortfolioIntelligenceService(),
      watchlistManagementService: new WatchlistManagementService(),
      alertsMonitoringService: new AlertsMonitoringService(),
      subscriptionService: new SubscriptionBillingService(),
    }
  ) {}

  /**
   * Lazy-require the strategy-decision-engine service (specific file, not index).
   * Returns null when explicitly disabled via injection of null.
   */
  private resolveStrategyDecisionService(): any | null {
    if (this.dependencies.strategyDecisionService === null) return null;
    if (this.dependencies.strategyDecisionService !== undefined) return this.dependencies.strategyDecisionService;
    if (this.defaultStrategyDecisionServiceInstance) return this.defaultStrategyDecisionServiceInstance;
    try {
      const { StrategyDecisionEngineService } = require('../strategy-decision-engine/strategy-decision-engine.service') as typeof import('../strategy-decision-engine/strategy-decision-engine.service');
      this.defaultStrategyDecisionServiceInstance = new StrategyDecisionEngineService();
    } catch {
      return null;
    }
    return this.defaultStrategyDecisionServiceInstance ?? null;
  }

  /**
   * Lazy-require the trade-plan-risk-engine service (specific file, not index).
   * Returns null when explicitly disabled via injection of null.
   */
  private resolveTradePlanService(): any | null {
    if (this.dependencies.tradePlanService === null) return null;
    if (this.dependencies.tradePlanService !== undefined) return this.dependencies.tradePlanService;
    if (this.defaultTradePlanServiceInstance) return this.defaultTradePlanServiceInstance;
    try {
      const { TradePlanRiskEngineService } = require('../trade-plan-risk-engine/trade-plan-risk-engine.service') as typeof import('../trade-plan-risk-engine/trade-plan-risk-engine.service');
      this.defaultTradePlanServiceInstance = new TradePlanRiskEngineService();
    } catch {
      return null;
    }
    return this.defaultTradePlanServiceInstance ?? null;
  }

  /**
   * Lazy-require the today-trade-review service (specific file, not index).
   * Returns null when explicitly disabled via injection of null.
   */
  private resolveTodayReviewService(): any | null {
    if (this.dependencies.todayReviewService === null) return null;
    if (this.dependencies.todayReviewService !== undefined) return this.dependencies.todayReviewService;
    if (this.defaultTodayReviewServiceInstance) return this.defaultTodayReviewServiceInstance;
    try {
      const { TodayTradeReviewService } = require('../today-trade-review/today-trade-review.service') as typeof import('../today-trade-review/today-trade-review.service');
      this.defaultTodayReviewServiceInstance = new TodayTradeReviewService();
    } catch {
      return null;
    }
    return this.defaultTodayReviewServiceInstance ?? null;
  }

  async stockSummary(instrumentId: string, userId = 'default-user'): Promise<CopilotSummaryResponse> {
    await this.guardCopilotUsage(userId);

    // -- Resolve optional pipeline services (lazy, cycle-safe) --
    const strategyDecisionSvc = this.resolveStrategyDecisionService();
    const tradePlanSvc = this.resolveTradePlanService();
    const todayReviewSvc = this.resolveTodayReviewService();

    const [research, signal, smartMoney, marketContext, strategyDecision, tradePlan, todayRun] = await Promise.all([
      this.safe(() => this.dependencies.stockResearchService.workbench(instrumentId, '1Y')),
      this.safe(() => this.dependencies.signalService.latestForInstrument(instrumentId)),
      this.safe(() => this.dependencies.smartMoneyService.stock(instrumentId)),
      this.safe(() => this.dependencies.marketContextService.summary()),
      strategyDecisionSvc
        ? this.safe(() => strategyDecisionSvc.latestForInstrument(instrumentId))
        : Promise.resolve(null),
      tradePlanSvc
        ? this.safe(() => tradePlanSvc.latestForInstrument(instrumentId))
        : Promise.resolve(null),
      todayReviewSvc
        ? this.safe(() => todayReviewSvc.latest())
        : Promise.resolve(null),
    ]);

    // -- Today-review: find this instrument in the latest run's candidates --
    const todayCandidate = (todayRun?.candidates ?? []).find(
      (c: any) => c.instrumentId === instrumentId || c.symbol === instrumentId
    ) ?? null;

    const overview = research?.overview ?? {};
    const performance = research?.performance ?? {};
    const fundamentals = research?.fundamentals?.latest ?? research?.fundamentals ?? null;

    // -- Strategy Decision explanation (restate persisted decision + reasons) --
    const strategyDecisionLines: string[] = [];
    const strategyDecisionBullish: string[] = [];
    const strategyDecisionBearish: string[] = [];
    if (strategyDecision) {
      const decision: string = strategyDecision.decision ?? 'UNKNOWN';
      const strategy: string = strategyDecision.strategy ?? 'UNKNOWN';
      const score: number = strategyDecision.decisionScore ?? 0;
      const confidence: string = strategyDecision.confidence ?? 'UNKNOWN';
      strategyDecisionLines.push(
        `Persisted strategy decision is ${decision} under ${strategy} strategy (score ${score}, confidence ${confidence.toLowerCase()}).`
      );
      const reasons: string[] = strategyDecision.reasons ?? [];
      if (reasons.length > 0) {
        strategyDecisionLines.push(`Decision rule(s) that fired: ${reasons.slice(0, 3).join(' ')}`);
      }
      const blockers: string[] = strategyDecision.blockers ?? [];
      if (blockers.length > 0) {
        strategyDecisionLines.push(`Active blocker(s): ${blockers.slice(0, 2).join(' ')}`);
      }
      if (['TRADE_CANDIDATE', 'WATCH'].includes(decision)) {
        strategyDecisionBullish.push(...strategyDecisionLines);
      } else if (['AVOID', 'EXIT_CANDIDATE', 'REDUCE_RISK'].includes(decision)) {
        strategyDecisionBearish.push(...strategyDecisionLines);
      }
    }

    // -- Trade Plan explanation (restate geometry from persisted plan) --
    const tradePlanLines: string[] = [];
    const tradePlanBullish: string[] = [];
    if (tradePlan) {
      const planStatus: string = tradePlan.planStatus ?? 'UNKNOWN';
      const riskGrade: string = tradePlan.riskGrade ?? 'UNDEFINED';
      const rr: number | null = typeof tradePlan.rewardRiskRatio === 'number' ? tradePlan.rewardRiskRatio : null;
      if (planStatus === 'VALID' || planStatus === 'WATCH') {
        const entryZone = tradePlan.entryZone;
        const stopLoss = tradePlan.stopLoss;
        const target = tradePlan.target;
        const entryLine = entryZone
          ? `Entry zone: ${entryZone.type} (${this.priceRange(entryZone.preferredEntryMin, entryZone.preferredEntryMax)}).`
          : 'Entry zone is not specified in the persisted plan.';
        const stopLine = stopLoss?.price
          ? `Invalidation/stop level: ${stopLoss.price.toFixed(2)} (${stopLoss.method}).`
          : 'No stop level on record.';
        const targetLine = target?.price
          ? `Target: ${target.price.toFixed(2)} (${target.method}).`
          : 'No target on record.';
        const rrLine = rr !== null ? `Reward:risk ratio on record: ${rr}.` : null;
        tradePlanLines.push(`Trade plan status is ${planStatus} with risk grade ${riskGrade}.`);
        tradePlanLines.push(entryLine);
        tradePlanLines.push(stopLine);
        tradePlanLines.push(targetLine);
        if (rrLine) tradePlanLines.push(rrLine);
        tradePlanBullish.push(...tradePlanLines);
      } else if (planStatus === 'BLOCKED' || planStatus === 'INSUFFICIENT_DATA') {
        const firstBlocker = (tradePlan.blockers ?? [])[0];
        tradePlanLines.push(
          `Persisted trade plan is ${planStatus}${firstBlocker ? ': ' + firstBlocker : '.'}`
        );
      } else {
        tradePlanLines.push(`Trade plan status is ${planStatus} with risk grade ${riskGrade}.`);
      }
    }

    // -- Today Review explanation (restate persisted classification) --
    const todayReviewLines: string[] = [];
    const todayReviewBullish: string[] = [];
    const todayReviewBearish: string[] = [];
    if (todayCandidate) {
      const state: string = todayCandidate.state ?? 'UNKNOWN';
      const direction: string = todayCandidate.direction ?? 'UNKNOWN';
      const grade: string = todayCandidate.grade ?? 'UNKNOWN';
      const score: number = todayCandidate.confidenceScore ?? 0;
      const reasonSummary: string = todayCandidate.reasonSummary ?? '';
      todayReviewLines.push(
        `This instrument appears in today's review with classification ${state} (direction ${direction}, grade ${grade}, score ${score}).`
      );
      if (reasonSummary) {
        todayReviewLines.push(`Today review reason: ${reasonSummary}`);
      }
      const watchReasons: string[] = todayCandidate.watchReasons ?? [];
      if (watchReasons.length > 0) {
        todayReviewLines.push(`Watch notes: ${watchReasons.slice(0, 2).join(' ')}`);
      }
      if (['LONG_REVIEW', 'WATCH_ONLY'].includes(state)) {
        todayReviewBullish.push(...todayReviewLines);
      } else if (['SHORT_REVIEW', 'EXIT_RISK_REVIEW', 'AVOID', 'BLOCKED'].includes(state)) {
        todayReviewBearish.push(...todayReviewLines);
      }
    }

    const bullish = [
      signal?.direction === 'BULLISH' ? `Signal direction is bullish with score ${signal.score}.` : null,
      smartMoney?.status === 'ACCUMULATION' ? `Smart money status indicates accumulation with score ${smartMoney.smartMoneyScore}.` : null,
      typeof performance.return_1y === 'number' && performance.return_1y > 0 ? `One-year performance is positive at ${this.percent(performance.return_1y)}.` : null,
      fundamentals?.net_income && Number(fundamentals.net_income) > 0 ? 'Latest persisted fundamentals show positive net income.' : null,
      ...strategyDecisionBullish,
      ...tradePlanBullish,
      ...todayReviewBullish,
    ].filter(Boolean) as string[];

    const bearish = [
      signal?.direction === 'BEARISH' ? `Signal direction is bearish with score ${signal.score}.` : null,
      smartMoney?.status === 'DISTRIBUTION' ? `Smart money status indicates distribution with score ${smartMoney.smartMoneyScore}.` : null,
      typeof performance.max_drawdown === 'number' && performance.max_drawdown < -0.2 ? `Historical drawdown is notable at ${this.percent(performance.max_drawdown)}.` : null,
      ...strategyDecisionBearish,
      ...todayReviewBearish,
    ].filter(Boolean) as string[];

    const gaps = [
      !research ? 'Stock research workbench data is unavailable.' : null,
      !signal ? 'Latest signal result is unavailable.' : null,
      !smartMoney ? 'Smart money summary is unavailable.' : null,
      smartMoney?.insiderOwnership?.ownershipDataStatus === 'MISSING' ? 'Insider and institutional ownership data is unavailable in the free MVP provider.' : null,
      marketContext?.macro?.dataStatus === 'MISSING' ? 'Macro provider data is not configured yet.' : null,
      !strategyDecision ? 'No current strategy decision on record.' : null,
      !tradePlan ? 'No current trade plan on record.' : null,
      !todayCandidate ? 'Instrument is not in the latest today-review candidate set.' : null,
    ].filter(Boolean) as string[];

    // -- Structured pipeline fields (optional on the response) --
    const pipelineExplanation = {
      strategyDecision: strategyDecision
        ? {
            decision: strategyDecision.decision ?? null,
            strategy: strategyDecision.strategy ?? null,
            score: strategyDecision.decisionScore ?? null,
            confidence: strategyDecision.confidence ?? null,
            reasons: (strategyDecision.reasons ?? []).slice(0, 5),
            blockers: (strategyDecision.blockers ?? []).slice(0, 3),
          }
        : null,
      tradePlan: tradePlan
        ? {
            planStatus: tradePlan.planStatus ?? null,
            riskGrade: tradePlan.riskGrade ?? null,
            entryMin: tradePlan.entryZone?.preferredEntryMin ?? null,
            entryMax: tradePlan.entryZone?.preferredEntryMax ?? null,
            stopPrice: tradePlan.stopLoss?.price ?? null,
            targetPrice: tradePlan.target?.price ?? null,
            rewardRiskRatio: tradePlan.rewardRiskRatio ?? null,
          }
        : null,
      todayReview: todayCandidate
        ? {
            state: todayCandidate.state ?? null,
            direction: todayCandidate.direction ?? null,
            grade: todayCandidate.grade ?? null,
            confidenceScore: todayCandidate.confidenceScore ?? null,
            reasonSummary: todayCandidate.reasonSummary ?? null,
          }
        : null,
    };

    const sourceModules: string[] = ['stock-research-workbench', 'signal-generation-engine', 'smart-money-intelligence', 'market-context-intelligence'];
    if (strategyDecision) sourceModules.push('strategy-decision-engine');
    if (tradePlan) sourceModules.push('trade-plan-risk-engine');
    if (todayCandidate) sourceModules.push('today-trade-review');

    // -- Cross-module conflict detection --
    const conflicts = this.detectConflicts({
      symbol: overview.symbol || instrumentId,
      signalDirection: signal?.direction ?? null,
      todayCandidateState: todayCandidate?.state ?? null,
      strategyDecisionAction: strategyDecision?.decision ?? null,
      marketRegime: marketContext?.regime?.regime ?? null,
    });

    return this.response({
      title: `${overview.symbol || 'Stock'} Copilot Summary`,
      summary: `${DISCLAIMER} ${overview.company_name || overview.symbol || 'This stock'} has ${signal ? `a ${signal.direction.toLowerCase()} signal` : 'no current signal'} and ${smartMoney ? `a smart money status of ${smartMoney.status.toLowerCase()}` : 'limited smart money context'}${strategyDecision ? `, with a persisted strategy decision of ${strategyDecision.decision}` : ''}.`,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      keyTakeaways: [
        `Latest price context: ${overview.latest_price ?? 'not available'}.`,
        signal ? `Signal score is ${signal.score} with ${signal.confidence?.toLowerCase?.() || 'unknown'} confidence.` : 'Signal context is missing.',
        smartMoney ? `Smart money score is ${smartMoney.smartMoneyScore} and data status is ${smartMoney.dataStatus}.` : 'Smart money context is missing.',
        marketContext?.regime ? `Market regime is ${marketContext.regime.regime}.` : 'Market regime is unavailable.',
        strategyDecision
          ? `Strategy decision is ${strategyDecision.decision} (score ${strategyDecision.decisionScore ?? 'n/a'}).`
          : 'No current strategy decision on record.',
        tradePlan && tradePlan.planStatus === 'VALID'
          ? `Trade plan is VALID with risk grade ${tradePlan.riskGrade} and R:R ${tradePlan.rewardRiskRatio ?? 'n/a'}.`
          : tradePlan
          ? `Trade plan is ${tradePlan.planStatus}.`
          : 'No current trade plan on record.',
        todayCandidate
          ? `In today's review as ${todayCandidate.state} (grade ${todayCandidate.grade}).`
          : 'Not in today\'s review candidate set.',
      ],
      bullishFactors: bullish,
      bearishFactors: bearish,
      riskFactors: [
        signal?.direction === 'BEARISH' ? `Signal direction is bearish (score ${signal.score}); review any existing position.` : null,
        typeof performance.max_drawdown === 'number' && performance.max_drawdown < -0.2 ? `Historical drawdown is notable at ${this.percent(performance.max_drawdown)}; position sizing deserves caution.` : null,
        ...strategyDecisionBearish.map((s) => `Risk flag: ${s}`),
        smartMoney?.dataStatus === 'PARTIAL' ? 'Smart money analysis is partial because ownership data is missing.' : null,
        tradePlan?.planStatus === 'BLOCKED' ? `Trade plan is BLOCKED: ${(tradePlan.blockers ?? [])[0] ?? 'see blockers.'}` : null,
        !strategyDecision ? 'No strategy decision on record; pipeline-level assessment is incomplete.' : null,
        !todayCandidate ? 'Instrument was not surfaced in today\'s review candidate set.' : null,
      ].filter(Boolean) as string[],
      dataGaps: gaps,
      suggestedNextReviews: [
        'Review the stock research page for price trend, fundamentals, and peer context.',
        'Compare signal reasons against smart money price-volume signals.',
        'Check whether missing fundamentals or ownership data changes the confidence level.',
        strategyDecision ? 'Review the strategy decision detail for the full rule breakdown.' : 'Run strategy evaluation to generate a strategy decision.',
        tradePlan && tradePlan.planStatus === 'VALID' ? 'Review the trade plan page for full entry/stop/target geometry.' : 'Run trade plan generation for this instrument.',
      ],
      sourceModules,
      dataStatus: gaps.length > 0 ? 'PARTIAL' : 'COMPLETE',
      pipelineExplanation,
    } as any);
  }

  async portfolioSummary(portfolioId: string, userId = 'default-user'): Promise<CopilotSummaryResponse> {
    await this.guardCopilotUsage(userId);
    const [summary, intelligence] = await Promise.all([
      this.safe(() => this.dependencies.portfolioManagementService.summary(portfolioId, userId)),
      this.safe(() => this.dependencies.portfolioIntelligenceService.intelligence(portfolioId, userId)),
    ]);
    const redFlags = intelligence?.redFlags ?? [];
    const holdings = summary?.holdings ?? [];
    const strong = intelligence?.groupedSummary?.strongHoldings ?? [];
    const weak = intelligence?.groupedSummary?.weakHoldings ?? [];
    const gaps = [
      !summary ? 'Portfolio summary is unavailable.' : null,
      !intelligence ? 'Portfolio intelligence is unavailable.' : null,
      summary?.dataStatus === 'PARTIAL' ? 'Some holdings have missing or stale price data.' : null,
    ].filter(Boolean) as string[];

    return this.response({
      title: 'Portfolio Copilot Summary',
      summary: `${DISCLAIMER} Portfolio health is ${intelligence?.healthScore ?? 'not available'} with status ${intelligence?.status ?? 'unknown'}.`,
      keyTakeaways: [
        `Portfolio has ${summary?.numberOfHoldings ?? holdings.length ?? 0} holdings.`,
        `Total value is ${summary?.totalValue ?? 'not available'}.`,
        `Red flags detected: ${redFlags.length}.`,
        intelligence?.signalOverlay ? `Signal overlay has ${intelligence.signalOverlay.bullishCount} bullish and ${intelligence.signalOverlay.bearishCount} bearish holdings.` : 'Signal overlay is unavailable.',
      ],
      bullishFactors: strong.slice(0, 5).map((item: any) => `${item.symbol || item.companyName} appears strong: ${(item.reasons || []).join(' ')}`),
      bearishFactors: weak.slice(0, 5).map((item: any) => `${item.symbol || item.companyName} appears weak: ${(item.reasons || []).join(' ')}`),
      riskFactors: redFlags.slice(0, 5).map((flag: any) => `${flag.severity}: ${flag.title}`),
      dataGaps: gaps,
      suggestedNextReviews: [
        'Review high-severity red flags first.',
        'Compare weak holdings against current signal direction and unrealized P&L.',
        'Check concentration by holding, sector, and country before making changes.',
      ],
      sourceModules: ['portfolio-management', 'portfolio-intelligence', 'signal-generation-engine'],
      dataStatus: gaps.length > 0 ? 'PARTIAL' : 'COMPLETE',
    });
  }

  async watchlistSummary(watchlistId: string, userId = 'default-user'): Promise<CopilotSummaryResponse> {
    await this.guardCopilotUsage(userId);
    const detail = await this.safe(() => this.dependencies.watchlistManagementService.detail(watchlistId, 'signalScoreDesc', userId));
    const items = detail?.items ?? [];
    const strongest = [...items].sort((a: any, b: any) => (b.latestSignal?.score ?? -1) - (a.latestSignal?.score ?? -1)).slice(0, 5);
    const weakest = [...items].sort((a: any, b: any) => (a.latestSignal?.score ?? 101) - (b.latestSignal?.score ?? 101)).slice(0, 5);
    const gaps = [
      !detail ? 'Watchlist detail is unavailable.' : null,
      items.some((item: any) => !item.latestSignal) ? 'Some watchlist items have no latest signal.' : null,
      items.some((item: any) => item.currentPrice === null) ? 'Some watchlist items have no latest price.' : null,
    ].filter(Boolean) as string[];

    return this.response({
      title: `${detail?.watchlist?.name || 'Watchlist'} Copilot Summary`,
      summary: `${DISCLAIMER} This watchlist has ${items.length} tracked ideas, with ${strongest.filter((item: any) => (item.latestSignal?.score ?? 0) >= 70).length} high-scoring names to research.`,
      keyTakeaways: [
        `Items tracked: ${items.length}.`,
        strongest[0] ? `Highest current signal score: ${strongest[0].symbol} at ${strongest[0].latestSignal?.score ?? 'missing'}.` : 'No scored ideas are available.',
      ],
      bullishFactors: strongest.filter((item: any) => (item.latestSignal?.score ?? 0) >= 60).map((item: any) => `${item.symbol} has signal score ${item.latestSignal?.score}.`),
      bearishFactors: weakest.filter((item: any) => (item.latestSignal?.score ?? 100) < 40).map((item: any) => `${item.symbol} has low signal score ${item.latestSignal?.score}.`),
      riskFactors: weakest.slice(0, 3).map((item: any) => `${item.symbol} deserves review because signal or price context is weaker than peers in this watchlist.`),
      dataGaps: gaps,
      suggestedNextReviews: strongest.slice(0, 5).map((item: any) => `Open research for ${item.symbol} and compare signal reasons with price trend.`),
      sourceModules: ['watchlist-management', 'signal-generation-engine'],
      dataStatus: gaps.length > 0 ? 'PARTIAL' : 'COMPLETE',
    });
  }

  async marketBrief(userId = 'default-user'): Promise<CopilotSummaryResponse> {
    await this.guardCopilotUsage(userId);
    const [context, smartSectors] = await Promise.all([
      this.safe(() => this.dependencies.marketContextService.summary()),
      this.safe(() => this.dependencies.smartMoneyService.sectors('3M')),
    ]);
    const leading = context?.topSectors ?? [];
    const weak = context?.weakSectors ?? [];
    const gaps = [
      !context ? 'Market context summary is unavailable.' : null,
      context?.macro?.dataStatus === 'MISSING' ? 'Macro proxy data is not configured yet.' : null,
      !smartSectors ? 'Smart money sector context is unavailable.' : null,
    ].filter(Boolean) as string[];

    return this.response({
      title: 'Market Brief',
      summary: `${DISCLAIMER} Market regime is ${context?.regime?.regime ?? 'unknown'} with breadth and sector context from available instruments.`,
      keyTakeaways: [
        context?.regime?.explanation ?? 'Regime explanation is unavailable.',
        context?.breadth?.percentAboveSma50 !== null && context?.breadth?.percentAboveSma50 !== undefined ? `Breadth above SMA50 is ${this.percent(context.breadth.percentAboveSma50)}.` : 'Breadth is unavailable.',
        context?.macro ? `Macro status is ${context.macro.macroStatus}.` : 'Macro status is unavailable.',
      ],
      bullishFactors: leading.slice(0, 3).map((sector: any) => `${sector.sector} is a leading sector with relative strength score ${sector.relativeStrengthScore}.`),
      bearishFactors: weak.slice(0, 3).map((sector: any) => `${sector.sector} is lagging and deserves caution in related stock reviews.`),
      riskFactors: [
        context?.breadth?.advanceDeclineRatio !== null && context?.breadth?.advanceDeclineRatio < 0 ? 'Advance/decline breadth is negative.' : null,
        context?.macro?.dataStatus === 'MISSING' ? 'Macro data is missing, so broad context is incomplete.' : null,
      ].filter(Boolean) as string[],
      dataGaps: gaps,
      suggestedNextReviews: [
        'Review leading and weak sectors before evaluating new stock ideas.',
        'Compare individual stock signals against the current market regime.',
        'Treat macro commentary as limited until a provider is configured.',
      ],
      sourceModules: ['market-context-intelligence', 'smart-money-intelligence'],
      dataStatus: gaps.length > 0 ? 'PARTIAL' : 'COMPLETE',
    });
  }

  async alertDigest(userId = 'default-user'): Promise<CopilotSummaryResponse> {
    await this.guardCopilotUsage(userId);
    const events = await this.safe(() => this.dependencies.alertsMonitoringService.listEvents(userId));
    const items = events ?? [];
    const unread = items.filter((event: any) => !event.readAt && !event.dismissedAt);
    const critical = unread.filter((event: any) => event.severity === 'CRITICAL');
    const warning = unread.filter((event: any) => event.severity === 'WARNING');
    const gaps = !events ? ['Alert events are unavailable.'] : [];

    return this.response({
      title: 'Alert Digest',
      summary: `${DISCLAIMER} There are ${unread.length} unread alert events, including ${critical.length} critical items.`,
      keyTakeaways: [
        `Unread alerts: ${unread.length}.`,
        `Critical alerts: ${critical.length}.`,
        `Warning alerts: ${warning.length}.`,
      ],
      bullishFactors: unread.filter((event: any) => String(event.type).includes('ABOVE')).slice(0, 3).map((event: any) => `${event.title}: ${event.message}`),
      bearishFactors: unread.filter((event: any) => String(event.type).includes('BELOW') || String(event.type).includes('DRAWDOWN') || String(event.type).includes('BEARISH')).slice(0, 3).map((event: any) => `${event.title}: ${event.message}`),
      riskFactors: critical.slice(0, 5).map((event: any) => `${event.severity}: ${event.title}`),
      dataGaps: gaps,
      suggestedNextReviews: [
        'Review critical unread alerts first.',
        'Dismiss stale alerts after confirming they no longer need attention.',
        'Compare alert context with the related stock, portfolio, or watchlist page.',
      ],
      sourceModules: ['alerts-monitoring'],
      dataStatus: gaps.length > 0 ? 'PARTIAL' : 'COMPLETE',
    });
  }

  private sanitizePipelineExplanation(pe: any): any {
    if (!pe) return pe;
    const sanitizeStrings = (obj: any): any => {
      if (typeof obj === 'string') return this.safeLanguage(obj);
      if (Array.isArray(obj)) return obj.map(sanitizeStrings);
      if (obj !== null && typeof obj === 'object') {
        const out: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
          out[key] = sanitizeStrings(obj[key]);
        }
        return out;
      }
      return obj;
    };
    return sanitizeStrings(pe);
  }

  /**
   * CB-27: deterministic cross-module conflict detection. Flags genuine directional
   * contradictions among the signal, today-review state, strategy decision, and market
   * regime for the same instrument. Research-support only — surfaces contradictions to
   * reconcile, never an instruction.
   */
  private detectConflicts(input: {
    symbol: string;
    signalDirection: string | null;
    todayCandidateState: string | null;
    strategyDecisionAction: string | null;
    marketRegime: string | null;
  }): string[] {
    const conflicts: string[] = [];
    const sym = input.symbol || 'This stock';
    const dir = (input.signalDirection || '').toUpperCase();
    const state = (input.todayCandidateState || '').toUpperCase();
    const action = (input.strategyDecisionAction || '').toUpperCase();
    const regime = (input.marketRegime || '').toUpperCase();
    const readable = (code: string | null) => (code || '').replace(/_/g, ' ').toLowerCase().trim();

    const longLean = dir === 'BULLISH' || state.includes('LONG');
    const exitDecision = action.includes('EXIT') || action === 'AVOID' || action === 'DEFENSIVE_EXIT';

    if (longLean && exitDecision) {
      conflicts.push(`${sym}: a long/bullish read (${readable(input.signalDirection) || readable(input.todayCandidateState) || 'signal'}) contradicts the strategy decision "${readable(input.strategyDecisionAction)}" — reconcile before acting.`);
    }
    if (dir === 'BEARISH' && state.includes('LONG')) {
      conflicts.push(`${sym}: the signal is bearish but it appears as a long review candidate — directional contradiction.`);
    }
    if (longLean && regime === 'RISK_OFF') {
      conflicts.push(`${sym}: a long/bullish read sits against a RISK_OFF market regime — exposure caution warranted.`);
    }
    return conflicts;
  }

  private response(input: Omit<CopilotSummaryResponse, 'generatedAt'>): CopilotSummaryResponse {
    const base: CopilotSummaryResponse = {
      ...input,
      summary: this.safeLanguage(input.summary),
      keyTakeaways: input.keyTakeaways.map((item) => this.safeLanguage(item)).filter(Boolean),
      bullishFactors: input.bullishFactors.map((item) => this.safeLanguage(item)).filter(Boolean),
      bearishFactors: input.bearishFactors.map((item) => this.safeLanguage(item)).filter(Boolean),
      riskFactors: input.riskFactors.map((item) => this.safeLanguage(item)).filter(Boolean),
      suggestedNextReviews: input.suggestedNextReviews.map((item) => this.safeLanguage(item)).filter(Boolean),
      generatedAt: new Date().toISOString(),
    };
    // pipelineExplanation is an extension field not in the base CopilotSummaryResponse type.
    // Sanitize its string leaves when present, passing through via any-cast.
    const inputAny = input as any;
    if (inputAny.pipelineExplanation !== undefined) {
      (base as any).pipelineExplanation = this.sanitizePipelineExplanation(inputAny.pipelineExplanation);
    }
    return base;
  }

  private async safe<T>(fn: () => Promise<T> | T): Promise<T | null> {
    try {
      return await fn();
    } catch {
      return null;
    }
  }

  private async guardCopilotUsage(userId: string) {
    // During personal-validation phase the usage gate is bypassed so the owner
    // can run unlimited research summaries without hitting the FREE-plan cap.
    // Set COPILOT_USAGE_UNLIMITED=false (or unset) to restore standard gating.
    const unlimited = process.env.COPILOT_USAGE_UNLIMITED !== 'false';
    const service = this.dependencies.subscriptionService;
    if (!service) return;
    if (!unlimited) {
      await service.assertAllowed('RUN_COPILOT_SUMMARY', userId);
    }
    await service.recordUsage('RUN_COPILOT_SUMMARY', userId);
  }

  private percent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  private priceRange(min: number | null | undefined, max: number | null | undefined): string {
    if (min === null || min === undefined || max === null || max === undefined) return 'range not available';
    return `${Number(min).toFixed(2)} – ${Number(max).toFixed(2)}`;
  }

  private safeLanguage(value: string): string {
    return value
      // Original narrow phrases
      .replace(/buy now/gi, 'review')
      .replace(/sell immediately/gi, 'review risk')
      .replace(/guaranteed/gi, 'not certain')
      .replace(/will definitely/gi, 'may')
      // Broader buy/sell variants
      .replace(/\bbuy\b/gi, 'consider reviewing')
      .replace(/\bsell\b/gi, 'consider reviewing for exit risk')
      // Enter/exit trade action verbs → neutral research phrasing
      .replace(/\benter the trade\b/gi, 'review the setup')
      .replace(/\benter a trade\b/gi, 'review a setup')
      .replace(/\benter this trade\b/gi, 'review this setup')
      .replace(/\benter position\b/gi, 'review for a potential position')
      .replace(/\benter at\b/gi, 'zone of interest at')
      .replace(/\bexit the trade\b/gi, 'review for risk reduction')
      .replace(/\bexit a trade\b/gi, 'review for risk reduction')
      .replace(/\bexit this trade\b/gi, 'review this for risk reduction')
      .replace(/\bexit position\b/gi, 'review position for risk reduction')
      .replace(/\bexit at\b/gi, 'risk-reduction level at')
      // Generic enter/exit as action verbs (not part of compound noun like "entry")
      .replace(/\benter\b(?! zone| band| channel| level| point| range| area)/gi, 'review')
      .replace(/\bexit\b(?! zone| band| channel| level| point| range| area| risk| candidate)/gi, 'review for exit risk');
  }
}
