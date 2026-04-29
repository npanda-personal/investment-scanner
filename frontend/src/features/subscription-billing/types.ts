export type PlanCode = 'FREE' | 'PRO' | 'ADMIN';
export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'CANCELED' | 'EXPIRED';

export interface SubscriptionPlan {
  id: string;
  code: PlanCode;
  name: string;
  active: boolean;
}

export interface UserSubscription {
  userId: string;
  planCode: PlanCode;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string | null;
  updatedAt: string;
}

export interface FeatureLimit {
  feature: string;
  usageKey: string;
  label: string;
  used: number;
  limit: number | null;
  allowed: boolean;
}

export interface SubscriptionMe {
  userId: string;
  subscription: UserSubscription;
  plan: SubscriptionPlan;
  features: FeatureLimit[];
}
