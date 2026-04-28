/// <reference types="@types/jest" />
import { AlertsMonitoringService } from '../../../src/modules/alerts-monitoring';

const rule = (overrides: any = {}) => ({
  id: overrides.id || 'rule-1',
  name: overrides.name || 'Rule',
  type: overrides.type || 'PRICE_ABOVE',
  scope: overrides.scope || 'STOCK',
  instrumentId: overrides.instrumentId ?? 'stock-1',
  portfolioId: overrides.portfolioId ?? null,
  watchlistId: overrides.watchlistId ?? null,
  condition: overrides.condition || { threshold: 100 },
  enabled: true,
  createdAt: '2026-04-28T00:00:00.000Z',
  updatedAt: '2026-04-28T00:00:00.000Z',
});

const createService = (rules: any[], overrides: any = {}) => {
  const events: any[] = [];
  const repository = {
    enabledRules: jest.fn().mockResolvedValue(rules),
    createRule: jest.fn(async (input) => ({ ...rule(input), id: 'new-rule' })),
    listRules: jest.fn().mockResolvedValue(rules),
    getRule: jest.fn().mockResolvedValue(rules[0] || null),
    updateRule: jest.fn(async (_id, input) => ({ ...rules[0], ...input })),
    deleteRule: jest.fn(),
    hasActiveDuplicate: jest.fn().mockResolvedValue(false),
    createEvent: jest.fn(async (alertRule, candidate) => {
      const event = { id: `event-${events.length + 1}`, alertRuleId: alertRule.id, ...candidate, triggeredAt: '2026-04-28T00:00:00.000Z', readAt: null, dismissedAt: null };
      events.push(event);
      return event;
    }),
    listEvents: jest.fn().mockResolvedValue(events),
    markRead: jest.fn(),
    dismiss: jest.fn(),
    markAllRead: jest.fn(),
    ...overrides.repository,
  };
  const marketDataService = {
    getInstrument: jest.fn().mockResolvedValue({ id: 'stock-1', symbol: 'ABC' }),
    latestPriceByInstrumentId: jest.fn().mockResolvedValue({ latest: { close: 105 } }),
    listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [{ close: 105 }, { close: 100 }] }),
    ...overrides.marketDataService,
  };
  const signalService = {
    latestForInstrument: jest.fn().mockResolvedValue({ score: 85, direction: 'BULLISH', symbol: 'ABC' }),
    ...overrides.signalService,
  };
  const portfolioService = {
    summary: jest.fn().mockResolvedValue({
      holdings: [
        { id: 'h1', instrumentId: 'stock-1', symbol: 'ABC', unrealizedPnLPercent: -0.2, signal: { score: 20, direction: 'BEARISH' } },
      ],
    }),
    ...overrides.portfolioService,
  };
  const watchlistService = {
    detail: jest.fn().mockResolvedValue({
      items: [
        { id: 'i1', instrumentId: 'stock-1', symbol: 'ABC', currentPrice: 120, latestSignal: { score: 90, direction: 'BULLISH' } },
      ],
    }),
    ...overrides.watchlistService,
  };
  return { service: new AlertsMonitoringService(repository as any, marketDataService as any, signalService as any, portfolioService as any, watchlistService as any), repository };
};

describe('AlertsMonitoringService', () => {
  it('evaluates price and signal alerts', async () => {
    const { service } = createService([
      rule({ type: 'PRICE_ABOVE', condition: { threshold: 100 } }),
      rule({ id: 'rule-2', type: 'SIGNAL_SCORE_ABOVE', condition: { threshold: 80 } }),
    ]);
    const result = await service.evaluate();
    expect(result.created).toBe(2);
    expect(result.events.map((event) => event.type)).toEqual(['PRICE_ABOVE', 'SIGNAL_SCORE_ABOVE']);
  });

  it('evaluates portfolio and watchlist alerts', async () => {
    const { service } = createService([
      rule({ type: 'PORTFOLIO_HOLDING_DRAWDOWN', scope: 'PORTFOLIO', instrumentId: null, portfolioId: 'p1', condition: { threshold: -0.15 } }),
      rule({ id: 'rule-2', type: 'WATCHLIST_SIGNAL_SCORE_ABOVE', scope: 'WATCHLIST', instrumentId: null, watchlistId: 'w1', condition: { threshold: 80 } }),
    ]);
    const result = await service.evaluate();
    expect(result.created).toBe(2);
    expect(result.events.map((event) => event.type)).toEqual(['PORTFOLIO_HOLDING_DRAWDOWN', 'WATCHLIST_SIGNAL_SCORE_ABOVE']);
  });

  it('suppresses duplicate active events', async () => {
    const { service } = createService([rule()], { repository: { hasActiveDuplicate: jest.fn().mockResolvedValue(true) } });
    const result = await service.evaluate();
    expect(result.created).toBe(0);
    expect(result.skippedDuplicates).toBe(1);
  });

  it('delegates read and dismiss actions', async () => {
    const { service, repository } = createService([]);
    await service.markRead('event-1');
    await service.dismiss('event-1');
    await service.markAllRead();
    expect(repository.markRead).toHaveBeenCalledWith('event-1');
    expect(repository.dismiss).toHaveBeenCalledWith('event-1');
    expect(repository.markAllRead).toHaveBeenCalled();
  });
});
