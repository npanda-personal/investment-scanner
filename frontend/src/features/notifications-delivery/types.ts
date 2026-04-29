export type NotificationChannel = 'IN_APP' | 'EMAIL_LOG' | 'SMTP_EMAIL';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
export type NotificationType = 'TEST_EMAIL' | 'ALERT_DIGEST' | 'DAILY_DIGEST' | 'WEEKLY_DIGEST';

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailNotificationsEnabled: boolean;
  alertEmailsEnabled: boolean;
  dailyDigestEnabled: boolean;
  weeklyDigestEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationEvent {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  error: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface NotificationProviderStatus {
  activeChannel: NotificationChannel;
  providerName: string;
  smtpConfigured: boolean;
  smtpAvailable: boolean;
  message: string;
}
