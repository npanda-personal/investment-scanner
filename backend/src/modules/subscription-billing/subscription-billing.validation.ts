import type { ChangePlanRequest, PlanCode, SubscriptionStatus } from './subscription-billing.types';

export const PLAN_CODES: PlanCode[] = ['FREE', 'PRO', 'ADMIN'];
export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['ACTIVE', 'TRIAL', 'CANCELED', 'EXPIRED'];
export const DEFAULT_USER_ID = 'default-user';

export function getUserId(value?: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_USER_ID;
}

export function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || '';
}

export function validateChangePlan(input: ChangePlanRequest): string[] {
  const errors: string[] = [];
  if (!PLAN_CODES.includes(input.planCode)) errors.push('planCode is invalid');
  if (input.status !== undefined && !SUBSCRIPTION_STATUSES.includes(input.status)) errors.push('status is invalid');
  return errors;
}

export function requireAdmin(headers: Record<string, unknown>): void {
  const configured = process.env.ADMIN_API_KEY;
  if (!configured) throw new Error('Admin API key is not configured');
  const provided = headers['x-admin-key'];
  if (provided !== configured) throw new Error('Admin access required');
}
