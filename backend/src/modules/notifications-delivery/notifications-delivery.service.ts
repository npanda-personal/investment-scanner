import { AlertsMonitoringService, type AlertEventDto } from '../alerts-monitoring';
import { AiInvestmentCopilotService, type CopilotSummaryResponse } from '../ai-investment-copilot';
import { NotificationsDeliveryRepository } from './notifications-delivery.repository';
import { createNotificationProvider } from './notifications-delivery.provider';
import { TelegramProvider, type TelegramStatus } from './telegram.provider';
import type {
  DeliveryRequest,
  NotificationEventDto,
  NotificationPreferenceDto,
  NotificationProvider,
  NotificationProviderStatus,
  UpdateNotificationPreferencesRequest,
} from './notifications-delivery.types';
import { validatePreferences } from './notifications-delivery.validation';

export class NotificationsDeliveryService {
  constructor(
    private readonly repository = new NotificationsDeliveryRepository(),
    private readonly provider: NotificationProvider = createNotificationProvider(),
    private readonly alertsService = new AlertsMonitoringService(),
    private readonly copilotService = new AiInvestmentCopilotService(),
    private readonly telegram = new TelegramProvider()
  ) {}

  async preferences(userId: string): Promise<NotificationPreferenceDto> {
    return this.repository.toPreferenceDto(await this.repository.getOrCreatePreferences(userId));
  }

  async updatePreferences(userId: string, input: UpdateNotificationPreferencesRequest): Promise<NotificationPreferenceDto> {
    const errors = validatePreferences(input);
    if (errors.length > 0) throw new Error(errors.join('; '));
    return this.repository.toPreferenceDto(await this.repository.updatePreferences(userId, input));
  }

  events(userId: string): Promise<NotificationEventDto[]> {
    return this.repository.listEvents(userId);
  }

  providerStatus(): NotificationProviderStatus {
    return this.provider.status();
  }

  telegramStatus(): TelegramStatus {
    return this.telegram.status();
  }

  async sendTestTelegram(): Promise<{ status: 'SENT' | 'FAILED'; messageId?: number; error?: string }> {
    if (!this.telegram.isConfigured()) {
      return { status: 'FAILED', error: this.telegram.status().message };
    }
    try {
      const result = await this.telegram.sendMessage(
        '<b>📊 Investment Scanner</b>\n\nTest notification — your Telegram alerts are working!'
      );
      return { status: 'SENT', messageId: result.messageId };
    } catch (error: any) {
      return { status: 'FAILED', error: error?.message };
    }
  }

  async discoverTelegramChatId(): Promise<{ chatId: string; username: string | null; firstName: string | null } | null> {
    return this.telegram.discoverChatId();
  }

  async sendTestEmail(userId: string): Promise<NotificationEventDto> {
    return this.deliver({
      userId,
      type: 'TEST_EMAIL',
      title: 'Investment Scanner test notification',
      message: 'This is a test notification from the local notifications delivery layer.',
      payload: { kind: 'test-email' },
      preferenceAllowed: true,
    });
  }

  async sendAlertDigest(userId: string): Promise<NotificationEventDto> {
    const preferences = await this.preferences(userId);
    const events = await this.safe(() => this.alertsService.listEvents(userId), [] as AlertEventDto[]);
    const unread = events.filter((event) => !event.readAt && !event.dismissedAt);
    const critical = unread.filter((event) => event.severity === 'CRITICAL');
    const warning = unread.filter((event) => event.severity === 'WARNING');
    const lines = [
      `Unread alerts: ${unread.length}`,
      `Critical alerts: ${critical.length}`,
      `Warning alerts: ${warning.length}`,
      ...unread.slice(0, 5).map((event) => `- ${event.severity}: ${event.title} - ${event.message}`),
    ];
    return this.deliver({
      userId,
      type: 'ALERT_DIGEST',
      title: `Alert digest: ${critical.length} critical, ${unread.length} unread`,
      message: lines.join('\n'),
      payload: {
        unreadCount: unread.length,
        criticalCount: critical.length,
        warningCount: warning.length,
        eventIds: unread.slice(0, 10).map((event) => event.id),
      },
      preferenceAllowed: preferences.emailNotificationsEnabled && preferences.alertEmailsEnabled,
    });
  }

  async sendDailyDigest(userId: string): Promise<NotificationEventDto> {
    const preferences = await this.preferences(userId);
    const [alertSummary, marketBrief] = await Promise.all([
      this.safe(() => this.copilotService.alertDigest(userId), null),
      this.safe(() => this.copilotService.marketBrief(userId), null),
    ]);
    return this.deliver({
      userId,
      type: 'DAILY_DIGEST',
      title: 'Daily market research digest',
      message: this.summaryMessage([
        ['Alerts', alertSummary],
        ['Market Brief', marketBrief],
      ]),
      payload: {
        alertSummary,
        marketBrief,
      },
      preferenceAllowed: preferences.emailNotificationsEnabled && preferences.dailyDigestEnabled,
    });
  }

  async sendWeeklyDigest(userId: string): Promise<NotificationEventDto> {
    const preferences = await this.preferences(userId);
    const [alertSummary, marketBrief] = await Promise.all([
      this.safe(() => this.copilotService.alertDigest(userId), null),
      this.safe(() => this.copilotService.marketBrief(userId), null),
    ]);
    return this.deliver({
      userId,
      type: 'WEEKLY_DIGEST',
      title: 'Weekly investment research digest',
      message: this.summaryMessage([
        ['Portfolio and alerts', alertSummary],
        ['Market context', marketBrief],
      ]),
      payload: {
        alertSummary,
        marketBrief,
        scope: 'weekly',
      },
      preferenceAllowed: preferences.emailNotificationsEnabled && preferences.weeklyDigestEnabled,
    });
  }

  private async deliver(input: DeliveryRequest): Promise<NotificationEventDto> {
    if (!input.preferenceAllowed) {
      return this.repository.createEvent({
        userId: input.userId,
        type: input.type,
        channel: 'IN_APP',
        title: input.title,
        message: input.message,
        payload: input.payload,
        status: 'SKIPPED',
        error: 'Notification preferences do not allow this email.',
      });
    }

    const user = await this.repository.getUser(input.userId);
    if (!user?.email) {
      return this.repository.createEvent({
        userId: input.userId,
        type: input.type,
        channel: 'EMAIL_LOG',
        title: input.title,
        message: input.message,
        payload: input.payload,
        status: 'FAILED',
        error: 'User email is required before email delivery.',
      });
    }

    try {
      const result = await this.provider.sendEmail({
        to: user.email,
        subject: input.title,
        body: input.message,
        payload: input.payload,
      });
      return this.repository.createEvent({
        userId: input.userId,
        type: input.type,
        channel: result.channel,
        title: input.title,
        message: input.message,
        payload: { ...input.payload, providerName: result.providerName, messageId: result.messageId || null },
        status: result.status,
        error: result.error || null,
        sentAt: result.status === 'SENT' ? new Date() : null,
      });
    } catch (error: any) {
      return this.repository.createEvent({
        userId: input.userId,
        type: input.type,
        channel: this.provider.status().activeChannel,
        title: input.title,
        message: input.message,
        payload: input.payload,
        status: 'FAILED',
        error: error?.message || 'Notification delivery failed',
      });
    } finally {
      this.fireTelegramSideChannel(input).catch(() => {});
    }
  }

  private async fireTelegramSideChannel(input: DeliveryRequest): Promise<void> {
    if (!this.telegram.isConfigured()) return;
    try {
      const result = await this.telegram.sendMessage(this.telegram.formatMessage(input.title, input.message));
      await this.repository.createEvent({
        userId: input.userId,
        type: input.type,
        channel: 'TELEGRAM',
        title: input.title,
        message: input.message,
        payload: { ...input.payload, messageId: result.messageId, chatId: String(result.chatId) },
        status: 'SENT',
        error: null,
        sentAt: new Date(),
      });
    } catch (error: any) {
      await this.repository.createEvent({
        userId: input.userId,
        type: input.type,
        channel: 'TELEGRAM',
        title: input.title,
        message: input.message,
        payload: input.payload,
        status: 'FAILED',
        error: error?.message || 'Telegram delivery failed',
        sentAt: null,
      });
    }
  }

  private summaryMessage(sections: [string, CopilotSummaryResponse | null][]): string {
    return sections.map(([label, summary]) => {
      if (!summary) return `${label}: data is unavailable.`;
      const takeaways = summary.keyTakeaways.slice(0, 3).map((item) => `- ${item}`).join('\n');
      return `${label}: ${summary.summary}\n${takeaways}`;
    }).join('\n\n');
  }

  private async safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }
}
