import prisma from '../../db/prisma';
import type { PlanCode, SubscriptionStatus, UsageKey } from './subscription-billing.types';
import { DEFAULT_USER_ID } from './subscription-billing.validation';

export class SubscriptionBillingRepository {
  constructor(private readonly db = prisma) {}

  async ensureDefaults(userId = DEFAULT_USER_ID) {
    await this.db.appUser.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, displayName: 'Local User' },
    });
    await Promise.all([
      this.upsertPlan('FREE', 'Free'),
      this.upsertPlan('PRO', 'Pro'),
      this.upsertPlan('ADMIN', 'Admin'),
    ]);
    await this.db.userSubscription.upsert({
      where: { userId },
      update: {},
      create: { userId, planCode: 'FREE', status: 'ACTIVE' },
    });
  }

  async upsertPlan(code: PlanCode, name: string) {
    return this.db.subscriptionPlan.upsert({
      where: { code },
      update: { name, active: true },
      create: { code, name, active: true },
    });
  }

  async listPlans() {
    await this.ensureDefaults();
    return this.db.subscriptionPlan.findMany({ orderBy: { code: 'asc' } });
  }

  async getSubscription(userId = DEFAULT_USER_ID) {
    await this.ensureDefaults(userId);
    return this.db.userSubscription.findUnique({ where: { userId } });
  }

  async changePlan(userId: string, planCode: PlanCode, status: SubscriptionStatus = 'ACTIVE') {
    await this.ensureDefaults(userId);
    return this.db.userSubscription.upsert({
      where: { userId },
      update: { planCode, status, startedAt: new Date(), expiresAt: null },
      create: { userId, planCode, status },
    });
  }

  countPortfolios(userId = DEFAULT_USER_ID) {
    return this.db.portfolio.count({ where: { OR: [{ userId }, { userId: null }] } });
  }

  countWatchlists(userId = DEFAULT_USER_ID) {
    return this.db.watchlist.count({ where: { OR: [{ userId }, { userId: null }] } });
  }

  countAlerts(userId = DEFAULT_USER_ID) {
    return this.db.alertRule.count({ where: { OR: [{ userId }, { userId: null }] } });
  }

  async getCounter(userId: string, key: UsageKey, periodStart: Date) {
    return this.db.usageCounter.findUnique({
      where: { userId_key_periodStart: { userId, key, periodStart } },
    });
  }

  async incrementCounter(userId: string, key: UsageKey, period: string, periodStart: Date, amount = 1) {
    await this.ensureDefaults(userId);
    return this.db.usageCounter.upsert({
      where: { userId_key_periodStart: { userId, key, periodStart } },
      update: { count: { increment: amount }, period },
      create: { userId, key, period, periodStart, count: amount },
    });
  }
}
