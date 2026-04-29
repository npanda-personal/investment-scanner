import type { NotificationChannel, NotificationType, UpdateNotificationPreferencesRequest } from './notifications-delivery.types';

export const NOTIFICATION_CHANNELS: NotificationChannel[] = ['IN_APP', 'EMAIL_LOG', 'SMTP_EMAIL'];
export const NOTIFICATION_TYPES: NotificationType[] = ['TEST_EMAIL', 'ALERT_DIGEST', 'DAILY_DIGEST', 'WEEKLY_DIGEST'];

export function validatePreferences(input: UpdateNotificationPreferencesRequest): string[] {
  const errors: string[] = [];
  const booleanFields: (keyof UpdateNotificationPreferencesRequest)[] = [
    'emailNotificationsEnabled',
    'alertEmailsEnabled',
    'dailyDigestEnabled',
    'weeklyDigestEnabled',
  ];

  for (const field of booleanFields) {
    if (input[field] !== undefined && typeof input[field] !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }
  }

  for (const field of ['quietHoursStart', 'quietHoursEnd'] as const) {
    const value = input[field];
    if (value !== undefined && value !== null && !/^\d{2}:\d{2}$/.test(value)) {
      errors.push(`${field} must use HH:mm format`);
    }
  }

  return errors;
}

export function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}
