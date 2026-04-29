/// <reference types="@types/jest" />
import { SubscriptionBillingService } from '../../../src/modules/subscription-billing';

const date = new Date('2026-04-29T00:00:00.000Z');

const createService = (overrides: any = {}) => {
  const repository = {
    listPlans: jest.fn().mockResolvedValue([
      { id: 'free', code: 'FREE', name: 'Free', active: true },
      { id: 'pro', code: 'PRO', name: 'Pro', active: true },
      { id: 'admin', code: 'ADMIN', name: 'Admin', active: true },
    ]),
    getSubscription: jest.fn().mockResolvedValue({ userId: 'default-user', planCode: 'FREE', status: 'ACTIVE', startedAt: date, expiresAt: null, updatedAt: date }),
    changePlan: jest.fn(async (userId, planCode, status) => ({ userId, planCode, status, startedAt: date, expiresAt: null, updatedAt: date })),
    countPortfolios: jest.fn().mockResolvedValue(0),
    countWatchlists: jest.fn().mockResolvedValue(0),
    countAlerts: jest.fn().mockResolvedValue(0),
    getCounter: jest.fn().mockResolvedValue(null),
    incrementCounter: jest.fn(),
    ...overrides,
  };
  return { service: new SubscriptionBillingService(repository as any), repository };
};

describe('SubscriptionBillingService', () => {
  it('returns plans and current subscription', async () => {
    const { service } = createService();

    const me = await service.me();

    expect(me.subscription.planCode).toBe('FREE');
    expect(me.features.length).toBeGreaterThan(0);
  });

  it('enforces free plan limits', async () => {
    const { service } = createService({ countPortfolios: jest.fn().mockResolvedValue(1) });

    await expect(service.assertAllowed('CREATE_PORTFOLIO')).rejects.toThrow('Portfolios limit reached');
  });

  it('grants pro plan access when usage is below limit', async () => {
    const { service } = createService({
      getSubscription: jest.fn().mockResolvedValue({ userId: 'default-user', planCode: 'PRO', status: 'ACTIVE', startedAt: date, expiresAt: null, updatedAt: date }),
      countPortfolios: jest.fn().mockResolvedValue(5),
    });

    await expect(service.assertAllowed('CREATE_PORTFOLIO')).resolves.toBeUndefined();
  });

  it('increments metered usage counters', async () => {
    const { service, repository } = createService();

    await service.recordUsage('RUN_COPILOT_SUMMARY');

    expect(repository.incrementCounter).toHaveBeenCalledWith('default-user', 'COPILOT_SUMMARIES_DAY', 'DAY', expect.any(Date));
  });

  it('changes plan manually', async () => {
    const { service, repository } = createService();

    await service.changePlan({ planCode: 'PRO' });

    expect(repository.changePlan).toHaveBeenCalledWith('default-user', 'PRO', 'ACTIVE');
  });
});
