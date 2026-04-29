import type { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type {
  NotificationChannel,
  NotificationEventDto,
  NotificationStatus,
  NotificationType,
  UpdateNotificationPreferencesRequest,
} from './notifications-delivery.types';

export class NotificationsDeliveryRepository {
  constructor(private readonly db = prisma) {}

  async getUser(userId: string) {
    return this.db.appUser.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true },
    });
  }

  async getOrCreatePreferences(userId: string) {
    return this.db.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updatePreferences(userId: string, input: UpdateNotificationPreferencesRequest) {
    await this.getOrCreatePreferences(userId);
    return this.db.notificationPreference.update({
      where: { userId },
      data: input,
    });
  }

  async listEvents(userId: string): Promise<NotificationEventDto[]> {
    const events = await this.db.notificationEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return events.map(this.toEventDto);
  }

  async createEvent(input: {
    userId: string;
    type: NotificationType;
    channel: NotificationChannel;
    title: string;
    message: string;
    payload: Record<string, unknown>;
    status: NotificationStatus;
    error?: string | null;
    sentAt?: Date | null;
  }): Promise<NotificationEventDto> {
    const event = await this.db.notificationEvent.create({
      data: {
        userId: input.userId,
        type: input.type,
        channel: input.channel,
        title: input.title,
        message: input.message,
        payload: input.payload as Prisma.InputJsonValue,
        status: input.status,
        error: input.error ?? null,
        sentAt: input.sentAt ?? null,
      },
    });
    return this.toEventDto(event);
  }

  toPreferenceDto(preferences: any) {
    return {
      id: preferences.id,
      userId: preferences.userId,
      emailNotificationsEnabled: preferences.emailNotificationsEnabled,
      alertEmailsEnabled: preferences.alertEmailsEnabled,
      dailyDigestEnabled: preferences.dailyDigestEnabled,
      weeklyDigestEnabled: preferences.weeklyDigestEnabled,
      quietHoursStart: preferences.quietHoursStart,
      quietHoursEnd: preferences.quietHoursEnd,
      createdAt: preferences.createdAt.toISOString(),
      updatedAt: preferences.updatedAt.toISOString(),
    };
  }

  private toEventDto(event: any): NotificationEventDto {
    return {
      id: event.id,
      userId: event.userId,
      type: event.type,
      channel: event.channel,
      title: event.title,
      message: event.message,
      payload: event.payload || {},
      status: event.status,
      error: event.error,
      createdAt: event.createdAt.toISOString(),
      sentAt: event.sentAt ? event.sentAt.toISOString() : null,
    };
  }
}
