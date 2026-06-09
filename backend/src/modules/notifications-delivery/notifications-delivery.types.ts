export type NotificationChannel = 'IN_APP' | 'EMAIL_LOG' | 'SMTP_EMAIL' | 'TELEGRAM';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
export type NotificationType = 'TEST_EMAIL' | 'ALERT_DIGEST' | 'DAILY_DIGEST' | 'WEEKLY_DIGEST';

export interface NotificationPreferenceDto {
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

export interface UpdateNotificationPreferencesRequest {
  emailNotificationsEnabled?: boolean;
  alertEmailsEnabled?: boolean;
  dailyDigestEnabled?: boolean;
  weeklyDigestEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export interface NotificationEventDto {
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

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  payload?: Record<string, unknown>;
}

export interface NotificationProviderResult {
  channel: NotificationChannel;
  status: 'SENT' | 'SKIPPED';
  providerName: string;
  messageId?: string;
  error?: string;
}

export interface NotificationProvider {
  status(): NotificationProviderStatus;
  sendEmail(message: EmailMessage): Promise<NotificationProviderResult>;
}

export interface DeliveryRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  preferenceAllowed: boolean;
}
