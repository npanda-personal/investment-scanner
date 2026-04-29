import axios from 'axios';
import type { NotificationEvent, NotificationPreferences, NotificationProviderStatus } from '../types';

const API_BASE = '/api/v1/notifications';

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await axios.get<NotificationPreferences>(`${API_BASE}/preferences`);
  return response.data;
}

export async function updateNotificationPreferences(input: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  const response = await axios.patch<NotificationPreferences>(`${API_BASE}/preferences`, input);
  return response.data;
}

export async function fetchNotificationEvents(): Promise<NotificationEvent[]> {
  const response = await axios.get<{ events: NotificationEvent[] }>(`${API_BASE}/events`);
  return response.data.events;
}

export async function fetchNotificationProviderStatus(): Promise<NotificationProviderStatus> {
  const response = await axios.get<NotificationProviderStatus>(`${API_BASE}/provider-status`);
  return response.data;
}

export async function sendTestEmail(): Promise<NotificationEvent> {
  const response = await axios.post<NotificationEvent>(`${API_BASE}/test-email`);
  return response.data;
}

export async function sendAlertDigest(): Promise<NotificationEvent> {
  const response = await axios.post<NotificationEvent>(`${API_BASE}/send-alert-digest`);
  return response.data;
}

export async function sendDailyDigest(): Promise<NotificationEvent> {
  const response = await axios.post<NotificationEvent>(`${API_BASE}/send-daily-digest`);
  return response.data;
}

export async function sendWeeklyDigest(): Promise<NotificationEvent> {
  const response = await axios.post<NotificationEvent>(`${API_BASE}/send-weekly-digest`);
  return response.data;
}
