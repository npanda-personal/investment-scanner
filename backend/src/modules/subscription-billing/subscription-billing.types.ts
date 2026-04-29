export type PlanCode = 'FREE' | 'PRO' | 'ADMIN';
export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'CANCELED' | 'EXPIRED';
export type UsageKey = 'PORTFOLIOS' | 'WATCHLISTS' | 'ALERTS' | 'BACKTEST_RUNS_MONTH' | 'COPILOT_SUMMARIES_DAY';
export type GatedFeature = 'CREATE_PORTFOLIO' | 'CREATE_WATCHLIST' | 'CREATE_ALERT' | 'RUN_BACKTEST' | 'RUN_COPILOT_SUMMARY';

export interface SubscriptionPlanDto {
  id: string;
  code: PlanCode;
  name: string;
  active: boolean;
}

export interface UserSubscriptionDto {
  userId: string;
  planCode: PlanCode;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string | null;
  updatedAt: string;
}

export interface FeatureLimitDto {
  feature: GatedFeature;
  usageKey: UsageKey;
  label: string;
  used: number;
  limit: number | null;
  allowed: boolean;
}

export interface SubscriptionMeDto {
  userId: string;
  subscription: UserSubscriptionDto;
  plan: SubscriptionPlanDto;
  features: FeatureLimitDto[];
}

export interface UsageDto {
  userId: string;
  counters: FeatureLimitDto[];
}

export interface ChangePlanRequest {
  userId?: string;
  planCode: PlanCode;
  status?: SubscriptionStatus;
}
