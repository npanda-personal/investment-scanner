import axios from 'axios';
import type { FeatureLimit, PlanCode, SubscriptionMe, SubscriptionPlan, UserSubscription } from '../types';

const API_BASE = '/api/v1/subscription';

export async function fetchSubscriptionMe(): Promise<SubscriptionMe> {
  const response = await axios.get<SubscriptionMe>(`${API_BASE}/me`);
  return response.data;
}

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const response = await axios.get<SubscriptionPlan[]>(`${API_BASE}/plans`);
  return response.data;
}

export async function fetchSubscriptionFeatures(): Promise<FeatureLimit[]> {
  const response = await axios.get<FeatureLimit[]>(`${API_BASE}/features`);
  return response.data;
}

export async function changeSubscriptionPlan(planCode: PlanCode): Promise<UserSubscription> {
  const response = await axios.post<UserSubscription>(`${API_BASE}/change-plan`, { planCode, status: 'ACTIVE' });
  return response.data;
}
