import type {
  EmailMessage,
  NotificationProvider,
  NotificationProviderResult,
  NotificationProviderStatus,
} from './notifications-delivery.types';

const requiredSmtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];

export class LogEmailProvider implements NotificationProvider {
  status(): NotificationProviderStatus {
    const smtpConfigured = requiredSmtpKeys.every((key) => Boolean(process.env[key]));
    return {
      activeChannel: 'EMAIL_LOG',
      providerName: 'log-email-provider',
      smtpConfigured,
      smtpAvailable: false,
      message: smtpConfigured
        ? 'SMTP environment variables are present, but the MVP uses the local log provider until an SMTP transport is added.'
        : 'SMTP is not configured; notification email is delivered through the local log provider.',
    };
  }

  async sendEmail(message: EmailMessage): Promise<NotificationProviderResult> {
    const messageId = `log-${Date.now()}`;
    console.info('[notifications-delivery] email log delivery', {
      to: message.to,
      subject: message.subject,
      messageId,
      preview: message.body.slice(0, 240),
    });
    return {
      channel: 'EMAIL_LOG',
      status: 'SENT',
      providerName: 'log-email-provider',
      messageId,
    };
  }
}

export function createNotificationProvider(): NotificationProvider {
  return new LogEmailProvider();
}
