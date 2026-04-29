import { StockResearchWorkbenchService } from '../stock-research-workbench';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import { MarketContextIntelligenceService } from '../market-context-intelligence';
import { PortfolioManagementService } from '../portfolio-management';
import { PortfolioIntelligenceService } from '../portfolio-intelligence';
import { WatchlistManagementService } from '../watchlist-management';
import { AlertsMonitoringService } from '../alerts-monitoring';
import type {
  CopilotDependencies,
  CopilotSummaryResponse,
} from './ai-investment-copilot.types';

const DISCLAIMER = 'For research support only, not financial advice.';

export class AiInvestmentCopilotService {
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
    }
  ) {}

  async stockSummary(instrumentId: string): Promise<CopilotSummaryResponse> {
    const [research, signal, smartMoney, marketContext] = await Promise.all([
      this.safe(() => this.dependencies.stockResearchService.workbench(instrumentId, '1Y')),
      this.safe(() => this.dependencies.signalService.latestForInstrument(instrumentId)),
      this.safe(() => this.dependencies.smartMoneyService.stock(instrumentId)),
      this.safe(() => this.dependencies.marketContextService.summary()),
    ]);
    const overview = research?.overview ?? {};
    const performance = research?.performance ?? {};
    const fundamentals = research?.fundamentals?.latest ?? research?.fundamentals ?? null;
    const bullish = [
      signal?.direction === 'BULLISH' ? `Signal direction is bullish with score ${signal.score}.` : null,
      smartMoney?.status === 'ACCUMULATION' ? `Smart money status indicates accumulation with score ${smartMoney.smartMoneyScore}.` : null,
      typeof performance.return_1y === 'number' && performance.return_1y > 0 ? `One-year performance is positive at ${this.percent(performance.return_1y)}.` : null,
      fundamentals?.net_income && Number(fundamentals.net_income) > 0 ? 'Latest persisted fundamentals show positive net income.' : null,
    ].filter(Boolean) as string[];
    const bearish = [
      signal?.direction === 'BEARISH' ? `Signal direction is bearish with score ${signal.score}.` : null,
      smartMoney?.status === 'DISTRIBUTION' ? `Smart money status indicates distribution with score ${smartMoney.smartMoneyScore}.` : null,
      typeof performance.max_drawdown === 'number' && performance.max_drawdown < -0.2 ? `Historical drawdown is notable at ${this.percent(performance.max_drawdown)}.` : null,
    ].filter(Boolean) as string[];
    const gaps = [
      !research ? 'Stock research workbench data is unavailable.' : null,
      !signal ? 'Latest signal result is unavailable.' : null,
      !smartMoney ? 'Smart money summary is unavailable.' : null,
      smartMoney?.insiderOwnership?.ownershipDataStatus === 'MISSING' ? 'Insider and institutional ownership data is unavailable in the free MVP provider.' : null,
      marketContext?.macro?.dataStatus === 'MISSING' ? 'Macro provider data is not configured yet.' : null,
    ].filter(Boolean) as string[];

    return this.response({
      title: `${overview.symbol || 'Stock'} Copilot Summary`,
      summary: `${DISCLAIMER} ${overview.company_name || overview.symbol || 'This stock'} has ${signal ? `a ${signal.direction.toLowerCase()} signal` : 'no current signal'} and ${smartMoney ? `a smart money status of ${smartMoney.status.toLowerCase()}` : 'limited smart money context'}.`,
      keyTakeaways: [
        `Latest price context: ${overview.latest_price ?? 'not available'}.`,
        signal ? `Signal score is ${signal.score} with ${signal.confidence?.toLowerCase?.() || 'unknown'} confidence.` : 'Signal context is missing.',
        smartMoney ? `Smart money score is ${smartMoney.smartMoneyScore} and data status is ${smartMoney.dataStatus}.` : 'Smart money context is missing.',
        marketContext?.regime ? `Market regime is ${marketContext.regime.regime}.` : 'Market regime is unavailable.',
      ],
      bullishFactors: bullish,
      bearishFactors: bearish,
      riskFactors: [
        ...bearish,
        smartMoney?.dataStatus === 'PARTIAL' ? 'Smart money analysis is partial because ownership data is missing.' : null,
      ].filter(Boolean) as string[],
      dataGaps: gaps,
      suggestedNextReviews: [
        'Review the stock research page for price trend, fundamentals, and peer context.',
        'Compare signal reasons against smart money price-volume signals.',
        'Check whether missing fundamentals or ownership data changes the confidence level.',
      ],
      sourceModules: ['stock-research-workbench', 'signal-generation-engine', 'smart-money-intelligence', 'market-context-intelligence'],
      dataStatus: gaps.length > 0 ? 'PARTIAL' : 'COMPLETE',
    });
  }

  async portfolioSummary(portfolioId: string): Promise<CopilotSummaryResponse> {
    const [summary, intelligence] = await Promise.all([
      this.safe(() => this.dependencies.portfolioManagementService.summary(portfolioId)),
      this.safe(() => this.dependencies.portfolioIntelligenceService.intelligence(portfolioId)),
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

  async watchlistSummary(watchlistId: string): Promise<CopilotSummaryResponse> {
    const detail = await this.safe(() => this.dependencies.watchlistManagementService.detail(watchlistId, 'signalScoreDesc'));
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

  async marketBrief(): Promise<CopilotSummaryResponse> {
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

  async alertDigest(): Promise<CopilotSummaryResponse> {
    const events = await this.safe(() => this.dependencies.alertsMonitoringService.listEvents());
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

  private response(input: Omit<CopilotSummaryResponse, 'generatedAt'>): CopilotSummaryResponse {
    const cleaned: CopilotSummaryResponse = {
      ...input,
      summary: this.safeLanguage(input.summary),
      keyTakeaways: input.keyTakeaways.map((item) => this.safeLanguage(item)).filter(Boolean),
      bullishFactors: input.bullishFactors.map((item) => this.safeLanguage(item)).filter(Boolean),
      bearishFactors: input.bearishFactors.map((item) => this.safeLanguage(item)).filter(Boolean),
      riskFactors: input.riskFactors.map((item) => this.safeLanguage(item)).filter(Boolean),
      suggestedNextReviews: input.suggestedNextReviews.map((item) => this.safeLanguage(item)).filter(Boolean),
      generatedAt: new Date().toISOString(),
    };
    return cleaned;
  }

  private async safe<T>(fn: () => Promise<T> | T): Promise<T | null> {
    try {
      return await fn();
    } catch {
      return null;
    }
  }

  private percent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  private safeLanguage(value: string): string {
    return value
      .replace(/buy now/gi, 'review')
      .replace(/sell immediately/gi, 'review risk')
      .replace(/guaranteed/gi, 'not certain')
      .replace(/will definitely/gi, 'may');
  }
}
