/// <reference types="@types/jest" />
import { AlertsMonitoringController } from '../../../src/modules/alerts-monitoring/alerts-monitoring.controller';
import { AlertsMonitoringRepository } from '../../../src/modules/alerts-monitoring/alerts-monitoring.repository';
import { AlertsMonitoringService } from '../../../src/modules/alerts-monitoring/alerts-monitoring.service';

const createResponse = () => ({
  json: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
});

describe('alerts monitoring event ownership', () => {
  it('passes the authenticated user through event controller actions', async () => {
    const service = {
      evaluate: jest.fn().mockResolvedValue({ evaluated: 0, created: 0, skippedDuplicates: 0, errors: [], events: [], evaluatedAt: '2026-05-17T00:00:00.000Z' }),
      listEvents: jest.fn().mockResolvedValue([]),
      markRead: jest.fn().mockResolvedValue({ id: 'event-a' }),
      dismiss: jest.fn().mockResolvedValue({ id: 'event-a' }),
      markAllRead: jest.fn().mockResolvedValue({ updated: 1 }),
    };
    const controller = new AlertsMonitoringController(service as any);
    const req = { params: { id: 'event-a' }, user: { id: 'user-a' } };

    await controller.evaluate(req as any, createResponse() as any);
    await controller.listEvents(req as any, createResponse() as any);
    await controller.markRead(req as any, createResponse() as any);
    await controller.dismiss(req as any, createResponse() as any);
    await controller.markAllRead(req as any, createResponse() as any);
    await controller.summary(req as any, createResponse() as any);

    expect(service.evaluate).toHaveBeenCalledWith('user-a');
    expect(service.listEvents).toHaveBeenCalledWith('user-a');
    expect(service.markRead).toHaveBeenCalledWith('event-a', 'user-a');
    expect(service.dismiss).toHaveBeenCalledWith('event-a', 'user-a');
    expect(service.markAllRead).toHaveBeenCalledWith('user-a');
  });

  it('returns non-leaking not-found responses for cross-user event actions', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = {
      markRead: jest.fn().mockRejectedValue(new Error('Alert event not found')),
      dismiss: jest.fn().mockRejectedValue(new Error('Alert event not found')),
    };
    const controller = new AlertsMonitoringController(service as any);
    const req = { params: { id: 'event-b' }, user: { id: 'user-a' } };

    try {
      for (const handler of [controller.markRead, controller.dismiss]) {
        const res = createResponse();
        await handler(req as any, res as any);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Alert event not found' });
      }
    } finally {
      consoleError.mockRestore();
    }
  });

  it('scopes event repository reads and bulk updates through the parent alert rule owner', async () => {
    const db = {
      alertEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const repository = new AlertsMonitoringRepository(db as any);

    await repository.listEvents('user-a');
    await repository.markAllRead('user-a');

    expect(db.alertEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { alertRule: { is: { userId: 'user-a' } } },
    }));
    expect(db.alertEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { readAt: null, dismissedAt: null, alertRule: { is: { userId: 'user-a' } } },
    }));
  });

  it('fails closed before event mutation when the event is not owned by the current user', async () => {
    const db = {
      alertEvent: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    const repository = new AlertsMonitoringRepository(db as any);

    await expect(repository.markRead('event-b', 'user-a')).rejects.toThrow('Alert event not found');
    await expect(repository.dismiss('event-b', 'user-a')).rejects.toThrow('Alert event not found');

    expect(db.alertEvent.findFirst).toHaveBeenCalledWith({ where: { id: 'event-b', alertRule: { is: { userId: 'user-a' } } } });
    expect(db.alertEvent.update).not.toHaveBeenCalled();
  });

  it('evaluates only current-user enabled rules and preserves owner for portfolio/watchlist lookups', async () => {
    const rules = [
      { id: 'portfolio-rule', name: 'Portfolio rule', type: 'PORTFOLIO_HOLDING_DRAWDOWN', scope: 'PORTFOLIO', instrumentId: null, portfolioId: 'portfolio-a', watchlistId: null, condition: { threshold: -0.1 }, enabled: true, createdAt: '2026-05-17T00:00:00.000Z', updatedAt: '2026-05-17T00:00:00.000Z' },
      { id: 'watchlist-rule', name: 'Watchlist rule', type: 'WATCHLIST_PRICE_ABOVE', scope: 'WATCHLIST', instrumentId: null, portfolioId: null, watchlistId: 'watchlist-a', condition: { threshold: 100 }, enabled: true, createdAt: '2026-05-17T00:00:00.000Z', updatedAt: '2026-05-17T00:00:00.000Z' },
    ];
    const repository = {
      enabledRules: jest.fn().mockResolvedValue(rules),
      hasActiveDuplicate: jest.fn().mockResolvedValue(false),
      createEvent: jest.fn(async (rule, candidate) => ({ id: `${rule.id}-event`, alertRuleId: rule.id, ...candidate, triggeredAt: '2026-05-17T00:00:00.000Z', readAt: null, dismissedAt: null })),
    };
    const portfolioService = {
      summary: jest.fn().mockResolvedValue({
        holdings: [{ id: 'holding-a', instrumentId: 'stock-a', symbol: 'AAA', unrealizedPnLPercent: -0.2, signal: null }],
      }),
    };
    const watchlistService = {
      detail: jest.fn().mockResolvedValue({
        items: [{ id: 'item-a', instrumentId: 'stock-a', symbol: 'AAA', currentPrice: 120, latestSignal: null }],
      }),
    };
    const service = new AlertsMonitoringService(
      repository as any,
      {} as any,
      {} as any,
      portfolioService as any,
      watchlistService as any,
      { assertAllowed: jest.fn() } as any
    );

    const result = await service.evaluate('user-a');

    expect(repository.enabledRules).toHaveBeenCalledWith('user-a');
    expect(portfolioService.summary).toHaveBeenCalledWith('portfolio-a', 'user-a');
    expect(watchlistService.detail).toHaveBeenCalledWith('watchlist-a', 'recentlyAdded', 'user-a');
    expect(result.created).toBe(2);
  });
});
