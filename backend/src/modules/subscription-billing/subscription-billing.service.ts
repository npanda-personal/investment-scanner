import { SubscriptionBillingRepository } from './subscription-billing.repository';
import type {
  ChangePlanRequest,
  FeatureLimitDto,
  GatedFeature,
  PlanCode,
  SubscriptionMeDto,
  SubscriptionPlanDto,
  UserSubscriptionDto,
  UsageDto,
  UsageKey,
} from './subscription-billing.types';
import { DEFAULT_USER_ID, validateChangePlan } from './subscription-billing.validation';

const LIMITS: Record<PlanCode, Record<UsageKey, number | null>> = {
  FREE: {
    PORTFOLIOS: 1,
    WATCHLISTS: 1,
    ALERTS: 5,
    BACKTEST_RUNS_MONTH: 5,
    COPILOT_SUMMARIES_DAY: 10,
  },
  PRO: {
    PORTFOLIOS: 25,
    WATCHLISTS: 25,
    ALERTS: 100,
    BACKTEST_RUNS_MONTH: 100,
    COPILOT_SUMMARIES_DAY: 100,
  },
  ADMIN: {
    PORTFOLIOS: null,
    WATCHLISTS: null,
    ALERTS: null,
    BACKTEST_RUNS_MONTH: null,
    COPILOT_SUMMARIES_DAY: null,
  },
};

const FEATURE_MAP: Record<GatedFeature, { key: UsageKey; label: string; period: 'COUNT' | 'DAY' | 'MONTH' }> = {
  CREATE_PORTFOLIO: { key: 'PORTFOLIOS', label: 'Portfolios', period: 'COUNT' },
  CREATE_WATCHLIST: { key: 'WATCHLISTS', label: 'Watchlists', period: 'COUNT' },
  CREATE_ALERT: { key: 'ALERTS', label: 'Alerts', period: 'COUNT' },
  RUN_BACKTEST: { key: 'BACKTEST_RUNS_MONTH', label: 'Backtest runs this month', period: 'MONTH' },
  RUN_COPILOT_SUMMARY: { key: 'COPILOT_SUMMARIES_DAY', label: 'Copilot summaries today', period: 'DAY' },
};

export class SubscriptionBillingService {
  constructor(private readonly repository = new SubscriptionBillingRepository()) {}

  async plans(): Promise<SubscriptionPlanDto[]> {
    return (await this.repository.listPlans()).map((plan: any) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      active: plan.active,
    }));
  }

  async me(userId = DEFAULT_USER_ID): Promise<SubscriptionMeDto> {
    const [plans, subscription, features] = await Promise.all([
      this.plans(),
      this.subscription(userId),
      this.features(userId),
    ]);
    return {
      userId,
      subscription,
      plan: plans.find((plan) => plan.code === subscription.planCode) || plans[0],
      features,
    };
  }

  async subscription(userId = DEFAULT_USER_ID): Promise<UserSubscriptionDto> {
    const sub = await this.repository.getSubscription(userId);
    if (!sub) throw new Error('Subscription not found');
    return {
      userId: sub.userId,
      planCode: sub.planCode as PlanCode,
      status: sub.status as any,
      startedAt: sub.startedAt.toISOString(),
      expiresAt: sub.expiresAt ? sub.expiresAt.toISOString() : null,
      updatedAt: sub.updatedAt.toISOString(),
    };
  }

  async changePlan(input: ChangePlanRequest, defaultUserId = DEFAULT_USER_ID): Promise<UserSubscriptionDto> {
    this.throwIfErrors(validateChangePlan(input));
    const sub = await this.repository.changePlan(input.userId || defaultUserId, input.planCode, input.status || 'ACTIVE');
    return {
      userId: sub.userId,
      planCode: sub.planCode as PlanCode,
      status: sub.status as any,
      startedAt: sub.startedAt.toISOString(),
      expiresAt: sub.expiresAt ? sub.expiresAt.toISOString() : null,
      updatedAt: sub.updatedAt.toISOString(),
    };
  }

  async usage(userId = DEFAULT_USER_ID): Promise<UsageDto> {
    return { userId, counters: await this.features(userId) };
  }

  async features(userId = DEFAULT_USER_ID): Promise<FeatureLimitDto[]> {
    const subscription = await this.subscription(userId);
    return Promise.all((Object.keys(FEATURE_MAP) as GatedFeature[]).map((feature) => this.featureUsage(feature, subscription.planCode, userId)));
  }

  async assertAllowed(feature: GatedFeature, userId = DEFAULT_USER_ID): Promise<void> {
    // Personal-validation phase: subscription limits are pure friction for the
    // single owner-operator. When SUBSCRIPTION_LIMITS_DISABLED=true (set in the
    // dev .env, NOT in tests), all gated features are allowed. Tests leave it
    // unset so limit enforcement is still verified.
    if (process.env.SUBSCRIPTION_LIMITS_DISABLED === 'true' && process.env.NODE_ENV !== 'test') return;
    const subscription = await this.subscription(userId);
    const usage = await this.featureUsage(feature, subscription.planCode, userId);
    if (!usage.allowed) {
      throw new Error(`${usage.label} limit reached for ${subscription.planCode}. Upgrade from the billing page to continue.`);
    }
  }

  async recordUsage(feature: GatedFeature, userId = DEFAULT_USER_ID): Promise<void> {
    const config = FEATURE_MAP[feature];
    if (config.period === 'COUNT') return;
    await this.repository.incrementCounter(userId, config.key, config.period, this.periodStart(config.period));
  }

  private async featureUsage(feature: GatedFeature, planCode: PlanCode, userId: string): Promise<FeatureLimitDto> {
    const config = FEATURE_MAP[feature];
    const limit = LIMITS[planCode][config.key];
    const used = await this.used(config.key, config.period, userId);
    return {
      feature,
      usageKey: config.key,
      label: config.label,
      used,
      limit,
      allowed: limit === null || used < limit,
    };
  }

  private async used(key: UsageKey, period: 'COUNT' | 'DAY' | 'MONTH', userId: string): Promise<number> {
    if (key === 'PORTFOLIOS') return this.repository.countPortfolios(userId);
    if (key === 'WATCHLISTS') return this.repository.countWatchlists(userId);
    if (key === 'ALERTS') return this.repository.countAlerts(userId);
    const counter = await this.repository.getCounter(userId, key, this.periodStart(period));
    return counter?.count || 0;
  }

  private periodStart(period: 'DAY' | 'MONTH' | 'COUNT'): Date {
    const now = new Date();
    if (period === 'MONTH') return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private throwIfErrors(errors: string[]) {
    if (errors.length > 0) throw new Error(errors.join('; '));
  }
}
