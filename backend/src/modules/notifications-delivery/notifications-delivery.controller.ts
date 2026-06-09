import type { Request, Response } from 'express';
import { NotificationsDeliveryService } from './notifications-delivery.service';

const currentUserId = (req: Request) => (req as any).user?.id || 'default-user';

export class NotificationsDeliveryController {
  constructor(private readonly service = new NotificationsDeliveryService()) {}

  preferences = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.preferences(currentUserId(req)));
    } catch (error) {
      return this.error(res, error, 'Failed to load notification preferences');
    }
  };

  updatePreferences = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.updatePreferences(currentUserId(req), req.body));
    } catch (error) {
      return this.error(res, error, 'Failed to update notification preferences', 400);
    }
  };

  events = async (req: Request, res: Response) => {
    try {
      return res.json({ events: await this.service.events(currentUserId(req)) });
    } catch (error) {
      return this.error(res, error, 'Failed to list notification events');
    }
  };

  providerStatus = async (_req: Request, res: Response) => {
    try {
      return res.json(this.service.providerStatus());
    } catch (error) {
      return this.error(res, error, 'Failed to load notification provider status');
    }
  };

  testEmail = async (req: Request, res: Response) => {
    try {
      return res.status(201).json(await this.service.sendTestEmail(currentUserId(req)));
    } catch (error) {
      return this.error(res, error, 'Failed to send test notification', 400);
    }
  };

  sendAlertDigest = async (req: Request, res: Response) => {
    try {
      return res.status(201).json(await this.service.sendAlertDigest(currentUserId(req)));
    } catch (error) {
      return this.error(res, error, 'Failed to send alert digest', 400);
    }
  };

  sendDailyDigest = async (req: Request, res: Response) => {
    try {
      return res.status(201).json(await this.service.sendDailyDigest(currentUserId(req)));
    } catch (error) {
      return this.error(res, error, 'Failed to send daily digest', 400);
    }
  };

  sendWeeklyDigest = async (req: Request, res: Response) => {
    try {
      return res.status(201).json(await this.service.sendWeeklyDigest(currentUserId(req)));
    } catch (error) {
      return this.error(res, error, 'Failed to send weekly digest', 400);
    }
  };

  telegramStatus = async (_req: Request, res: Response) => {
    try {
      return res.json(this.service.telegramStatus());
    } catch (error) {
      return this.error(res, error, 'Failed to load Telegram status');
    }
  };

  testTelegram = async (_req: Request, res: Response) => {
    try {
      const result = await this.service.sendTestTelegram();
      return res.status(result.status === 'SENT' ? 200 : 400).json(result);
    } catch (error) {
      return this.error(res, error, 'Failed to send Telegram test message', 400);
    }
  };

  telegramSetup = async (_req: Request, res: Response) => {
    try {
      const discovered = await this.service.discoverTelegramChatId();
      if (!discovered) {
        return res.status(404).json({
          error: 'No messages found. Send /start to your bot first, then call this endpoint again.',
        });
      }
      return res.json({
        ...discovered,
        hint: `Set TELEGRAM_CHAT_ID=${discovered.chatId} in your backend/.env file, then restart the server.`,
      });
    } catch (error) {
      return this.error(res, error, 'Failed to discover Telegram chat ID', 400);
    }
  };

  private error(res: Response, error: unknown, fallback: string, status = 500) {
    const message = error instanceof Error ? error.message : fallback;
    console.error(fallback, error);
    return res.status(status).json({ error: message });
  }
}
