import axios from 'axios';
import type { AlertEvaluationResult, AlertEvent, AlertRule, CreateAlertRuleInput } from '../types';

const API_BASE = '/api/v1/alerts';

export async function fetchAlertRules(): Promise<AlertRule[]> {
  const response = await axios.get<{ rules: AlertRule[] }>(`${API_BASE}/rules`);
  return response.data.rules;
}
export async function createAlertRule(input: CreateAlertRuleInput): Promise<AlertRule> {
  const response = await axios.post<AlertRule>(`${API_BASE}/rules`, input);
  return response.data;
}
export async function updateAlertRule(id: string, input: Partial<CreateAlertRuleInput>): Promise<AlertRule> {
  const response = await axios.patch<AlertRule>(`${API_BASE}/rules/${id}`, input);
  return response.data;
}
export async function deleteAlertRule(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/rules/${id}`);
}
export async function evaluateAlerts(): Promise<AlertEvaluationResult> {
  const response = await axios.post<AlertEvaluationResult>(`${API_BASE}/evaluate`);
  return response.data;
}
export async function fetchAlertEvents(): Promise<AlertEvent[]> {
  const response = await axios.get<{ events: AlertEvent[] }>(`${API_BASE}/events`);
  return response.data.events;
}
export async function markAlertRead(id: string): Promise<AlertEvent> {
  const response = await axios.patch<AlertEvent>(`${API_BASE}/events/${id}/read`);
  return response.data;
}
export async function dismissAlert(id: string): Promise<AlertEvent> {
  const response = await axios.patch<AlertEvent>(`${API_BASE}/events/${id}/dismiss`);
  return response.data;
}
export async function markAllAlertsRead(): Promise<{ updated: number }> {
  const response = await axios.post<{ updated: number }>(`${API_BASE}/events/mark-all-read`);
  return response.data;
}
