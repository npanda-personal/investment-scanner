import { MarketDataFoundationService } from '../market-data-foundation';
import { PortfolioManagementService } from '../portfolio-management';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SubscriptionBillingService } from '../subscription-billing';
import { WatchlistManagementService } from '../watchlist-management';
import { AlertsMonitoringRepository } from './alerts-monitoring.repository';
import type {
  AlertEvaluationCandidate,
  AlertEvaluationResult,
  AlertRuleDto,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
} from './alerts-monitoring.types';
import { validateAlertRuleInput } from './alerts-monitoring.validation';

export class AlertsMonitoringService {
  constructor(
    private readonly repository = new AlertsMonitoringRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly signalService = new SignalGenerationEngineService(),
    private readonly portfolioService = new PortfolioManagementService(),
    private readonly watchlistService = new WatchlistManagementService(),
    private readonly subscriptionService = new SubscriptionBillingService()
  ) {}

  listRules() { return this.repository.listRules(); }
  getRule(id: string) { return this.repository.getRule(id); }
  listEvents() { return this.repository.listEvents(); }
  markRead(id: string) { return this.repository.markRead(id); }
  dismiss(id: string) { return this.repository.dismiss(id); }
  markAllRead() { return this.repository.markAllRead(); }

  async createRule(input: CreateAlertRuleRequest) {
    this.throwIfErrors(validateAlertRuleInput(input));
    await this.subscriptionService.assertAllowed('CREATE_ALERT');
    return this.repository.createRule(input);
  }

  async updateRule(id: string, input: UpdateAlertRuleRequest) {
    const existing = await this.repository.getRule(id);
    if (!existing) throw new Error('Alert rule not found');
    const merged = { ...existing, ...input, condition: input.condition ?? existing.condition };
    this.throwIfErrors(validateAlertRuleInput(merged, false));
    return this.repository.updateRule(id, input);
  }

  deleteRule(id: string) { return this.repository.deleteRule(id); }

  async evaluate(): Promise<AlertEvaluationResult> {
    const rules = await this.repository.enabledRules();
    const events = [];
    const errors: string[] = [];
    let skippedDuplicates = 0;
    for (const rule of rules) {
      try {
        const candidates = await this.evaluateRule(rule);
        for (const candidate of candidates) {
          const duplicate = await this.repository.hasActiveDuplicate(rule.id, candidate.metadata);
          if (duplicate) {
            skippedDuplicates += 1;
            continue;
          }
          events.push(await this.repository.createEvent(rule, candidate));
        }
      } catch (error: any) {
        errors.push(`${rule.id}: ${error.message || 'evaluation failed'}`);
      }
    }
    return {
      evaluated: rules.length,
      created: events.length,
      skippedDuplicates,
      errors,
      events,
      evaluatedAt: new Date().toISOString(),
    };
  }

  async evaluateRule(rule: AlertRuleDto): Promise<AlertEvaluationCandidate[]> {
    if (rule.scope === 'STOCK') return this.evaluateStockRule(rule);
    if (rule.scope === 'PORTFOLIO') return this.evaluatePortfolioRule(rule);
    if (rule.scope === 'WATCHLIST') return this.evaluateWatchlistRule(rule);
    return [];
  }

  private async evaluateStockRule(rule: AlertRuleDto): Promise<AlertEvaluationCandidate[]> {
    if (!rule.instrumentId) return [];
    const [instrument, latest, prices, signal] = await Promise.all([
      this.marketDataService.getInstrument(rule.instrumentId).catch(() => null),
      this.marketDataService.latestPriceByInstrumentId(rule.instrumentId).catch(() => null),
      this.marketDataService.listPricesByInstrumentId(rule.instrumentId, 2).catch(() => null),
      this.signalService.latestForInstrument(rule.instrumentId).catch(() => null),
    ]);
    const symbol = instrument?.symbol || signal?.symbol || rule.instrumentId;
    const currentPrice = this.number(latest?.latest?.adjusted_close ?? latest?.latest?.close);
    const previousClose = this.number(prices?.prices?.[1]?.adjusted_close ?? prices?.prices?.[1]?.close);
    const dailyMove = currentPrice !== null && previousClose && previousClose > 0 ? (currentPrice - previousClose) / previousClose : null;
    const threshold = Number(rule.condition.threshold);

    if (rule.type === 'PRICE_ABOVE' && currentPrice !== null && currentPrice > threshold) return [this.event(rule, 'INFO', `${symbol} price is above ${threshold}`, `Current price is ${currentPrice}.`, { currentPrice, threshold })];
    if (rule.type === 'PRICE_BELOW' && currentPrice !== null && currentPrice < threshold) return [this.event(rule, 'WARNING', `${symbol} price is below ${threshold}`, `Current price is ${currentPrice}.`, { currentPrice, threshold })];
    if (rule.type === 'DAILY_MOVE_ABOVE' && dailyMove !== null && dailyMove > threshold) return [this.event(rule, 'INFO', `${symbol} daily move is above threshold`, `Daily move is ${(dailyMove * 100).toFixed(1)}%.`, { dailyMove, threshold })];
    if (rule.type === 'DAILY_MOVE_BELOW' && dailyMove !== null && dailyMove < threshold) return [this.event(rule, 'WARNING', `${symbol} daily move is below threshold`, `Daily move is ${(dailyMove * 100).toFixed(1)}%.`, { dailyMove, threshold })];
    if (rule.type === 'SIGNAL_SCORE_ABOVE' && signal && signal.score > threshold) return [this.event(rule, 'INFO', `${symbol} signal score is above ${threshold}`, `Signal score is ${signal.score}.`, { score: signal.score, threshold, direction: signal.direction })];
    if (rule.type === 'SIGNAL_DIRECTION_CHANGED' && signal && signal.direction !== rule.condition.direction) return [this.event(rule, 'WARNING', `${symbol} signal direction changed`, `Signal direction is now ${signal.direction}.`, { direction: signal.direction, previousDirection: rule.condition.direction || null })];
    return [];
  }

  private async evaluatePortfolioRule(rule: AlertRuleDto): Promise<AlertEvaluationCandidate[]> {
    if (!rule.portfolioId) return [];
    const summary = await this.portfolioService.summary(rule.portfolioId);
    if (!summary) return [];
    const threshold = Number(rule.condition.threshold);
    const events: AlertEvaluationCandidate[] = [];
    for (const holding of summary.holdings) {
      if (rule.type === 'PORTFOLIO_HOLDING_DRAWDOWN' && holding.unrealizedPnLPercent !== null && holding.unrealizedPnLPercent < threshold) {
        events.push(this.event(rule, 'CRITICAL', `${holding.symbol} drawdown needs review`, `Unrealized P&L is ${(holding.unrealizedPnLPercent * 100).toFixed(1)}%.`, { holdingId: holding.id, instrumentId: holding.instrumentId, symbol: holding.symbol, unrealizedPnLPercent: holding.unrealizedPnLPercent }, holding.instrumentId));
      }
      if (rule.type === 'PORTFOLIO_BEARISH_SIGNAL' && holding.signal?.direction === 'BEARISH') {
        events.push(this.event(rule, 'WARNING', `${holding.symbol} has bearish portfolio signal`, `Owned holding has a bearish signal score of ${holding.signal.score}.`, { holdingId: holding.id, instrumentId: holding.instrumentId, symbol: holding.symbol, direction: holding.signal.direction, score: holding.signal.score }, holding.instrumentId));
      }
    }
    return events;
  }

  private async evaluateWatchlistRule(rule: AlertRuleDto): Promise<AlertEvaluationCandidate[]> {
    if (!rule.watchlistId) return [];
    const detail = await this.watchlistService.detail(rule.watchlistId);
    if (!detail) return [];
    const threshold = Number(rule.condition.threshold);
    const events: AlertEvaluationCandidate[] = [];
    for (const item of detail.items) {
      if (rule.type === 'WATCHLIST_SIGNAL_SCORE_ABOVE' && item.latestSignal && item.latestSignal.score > threshold) {
        events.push(this.event(rule, 'INFO', `${item.symbol} watchlist signal score is high`, `Signal score is ${item.latestSignal.score}.`, { itemId: item.id, instrumentId: item.instrumentId, symbol: item.symbol, score: item.latestSignal.score, threshold }, item.instrumentId));
      }
      if (rule.type === 'WATCHLIST_PRICE_ABOVE' && item.currentPrice !== null && item.currentPrice > threshold) {
        events.push(this.event(rule, 'INFO', `${item.symbol} watchlist price is above ${threshold}`, `Current price is ${item.currentPrice}.`, { itemId: item.id, instrumentId: item.instrumentId, symbol: item.symbol, currentPrice: item.currentPrice, threshold }, item.instrumentId));
      }
      if (rule.type === 'WATCHLIST_PRICE_BELOW' && item.currentPrice !== null && item.currentPrice < threshold) {
        events.push(this.event(rule, 'WARNING', `${item.symbol} watchlist price is below ${threshold}`, `Current price is ${item.currentPrice}.`, { itemId: item.id, instrumentId: item.instrumentId, symbol: item.symbol, currentPrice: item.currentPrice, threshold }, item.instrumentId));
      }
    }
    return events;
  }

  private event(rule: AlertRuleDto, severity: AlertEvaluationCandidate['severity'], title: string, message: string, metadata: Record<string, unknown>, instrumentId = rule.instrumentId): AlertEvaluationCandidate {
    return { type: rule.type, severity, title, message, instrumentId, portfolioId: rule.portfolioId, watchlistId: rule.watchlistId, metadata };
  }

  private number(value: unknown): number | null {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private throwIfErrors(errors: string[]) {
    if (errors.length > 0) throw new Error(errors.join('; '));
  }
}
