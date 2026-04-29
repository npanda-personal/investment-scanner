/// <reference types="@types/jest" />
import { LogEmailProvider, NotificationsDeliveryService } from '../../../src/modules/notifications-delivery';

const now = new Date('2026-04-29T10:00:00.000Z');

const preference = {
  id: 'pref-1',
  userId: 'user-1',
  emailNotificationsEnabled: true,
  alertEmailsEnabled: true,
  dailyDigestEnabled: true,
  weeklyDigestEnabled: true,
  quietHoursStart: null,
  quietHoursEnd: null,
  createdAt: now,
  updatedAt: now,
};

function repository(overrides: Record<string, any> = {}) {
  return {
    getUser: jest.fn().mockResolvedValue({ id: 'user-1', email: 'user@example.com', displayName: 'User' }),
    getOrCreatePreferences: jest.fn().mockResolvedValue(preference),
    updatePreferences: jest.fn().mockResolvedValue({ ...preference, dailyDigestEnabled: false }),
    listEvents: jest.fn().mockResolvedValue([]),
    createEvent: jest.fn(async (input: any) => ({
      id: 'notification-1',
      userId: input.userId,
      type: input.type,
      channel: input.channel,
      title: input.title,
      message: input.message,
      payload: input.payload,
      status: input.status,
      error: input.error ?? null,
      createdAt: now.toISOString(),
      sentAt: input.sentAt ? input.sentAt.toISOString() : null,
    })),
    toPreferenceDto: jest.fn((row: any) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    ...overrides,
  };
}

const alerts = {
  listEvents: jest.fn().mockResolvedValue([
    {
      id: 'alert-1',
      alertRuleId: 'rule-1',
      type: 'PRICE_BELOW',
      severity: 'CRITICAL',
      title: 'AAPL price below threshold',
      message: 'Current price is below threshold.',
      instrumentId: 'stock-1',
      portfolioId: null,
      watchlistId: null,
      metadata: {},
      triggeredAt: now.toISOString(),
      readAt: null,
      dismissedAt: null,
    },
  ]),
};

const copilot = {
  alertDigest: jest.fn().mockResolvedValue({
    title: 'Alert Digest',
    summary: 'For research support only, not financial advice. One alert needs review.',
    keyTakeaways: ['Unread alerts: 1'],
    bullishFactors: [],
    bearishFactors: [],
    riskFactors: ['CRITICAL: AAPL price below threshold'],
    dataGaps: [],
    suggestedNextReviews: [],
    sourceModules: ['alerts-monitoring'],
    generatedAt: now.toISOString(),
    dataStatus: 'COMPLETE',
  }),
  marketBrief: jest.fn().mockResolvedValue({
    title: 'Market Brief',
    summary: 'For research support only, not financial advice. Market is neutral.',
    keyTakeaways: ['Regime is NEUTRAL'],
    bullishFactors: [],
    bearishFactors: [],
    riskFactors: [],
    dataGaps: [],
    suggestedNextReviews: [],
    sourceModules: ['market-context-intelligence'],
    generatedAt: now.toISOString(),
    dataStatus: 'COMPLETE',
  }),
};

describe('notifications delivery service', () => {
  it('gets and updates preferences', async () => {
    const repo = repository();
    const service = new NotificationsDeliveryService(repo as any, new LogEmailProvider(), alerts as any, copilot as any);
    expect(await service.preferences('user-1')).toMatchObject({ userId: 'user-1', emailNotificationsEnabled: true });
    expect(await service.updatePreferences('user-1', { dailyDigestEnabled: false })).toMatchObject({ dailyDigestEnabled: false });
  });

  it('log email provider sends without a paid dependency', async () => {
    const provider = new LogEmailProvider();
    const result = await provider.sendEmail({ to: 'user@example.com', subject: 'Test', body: 'Hello' });
    expect(result).toMatchObject({ channel: 'EMAIL_LOG', status: 'SENT', providerName: 'log-email-provider' });
  });

  it('records delivery status for test email', async () => {
    const repo = repository();
    const service = new NotificationsDeliveryService(repo as any, new LogEmailProvider(), alerts as any, copilot as any);
    const event = await service.sendTestEmail('user-1');
    expect(event.status).toBe('SENT');
    expect(repo.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'TEST_EMAIL', channel: 'EMAIL_LOG' }));
  });

  it('generates alert digest from unread critical alerts', async () => {
    const repo = repository();
    const service = new NotificationsDeliveryService(repo as any, new LogEmailProvider(), alerts as any, copilot as any);
    const event = await service.sendAlertDigest('user-1');
    expect(event.title).toContain('1 critical');
    expect(event.payload).toMatchObject({ unreadCount: 1, criticalCount: 1 });
  });

  it('generates daily and weekly digests through deterministic summaries', async () => {
    const repo = repository();
    const service = new NotificationsDeliveryService(repo as any, new LogEmailProvider(), alerts as any, copilot as any);
    await expect(service.sendDailyDigest('user-1')).resolves.toMatchObject({ type: 'DAILY_DIGEST', status: 'SENT' });
    await expect(service.sendWeeklyDigest('user-1')).resolves.toMatchObject({ type: 'WEEKLY_DIGEST', status: 'SENT' });
  });

  it('skips delivery when preferences disable the requested digest', async () => {
    const repo = repository({
      getOrCreatePreferences: jest.fn().mockResolvedValue({ ...preference, alertEmailsEnabled: false }),
    });
    const service = new NotificationsDeliveryService(repo as any, new LogEmailProvider(), alerts as any, copilot as any);
    await expect(service.sendAlertDigest('user-1')).resolves.toMatchObject({ status: 'SKIPPED', channel: 'IN_APP' });
  });

  it('records failed delivery when user email is unavailable', async () => {
    const repo = repository({ getUser: jest.fn().mockResolvedValue({ id: 'user-1', email: null }) });
    const service = new NotificationsDeliveryService(repo as any, new LogEmailProvider(), alerts as any, copilot as any);
    await expect(service.sendTestEmail('user-1')).resolves.toMatchObject({ status: 'FAILED' });
  });

  it('falls back gracefully when SMTP is missing', () => {
    const status = new LogEmailProvider().status();
    expect(status.activeChannel).toBe('EMAIL_LOG');
    expect(status.smtpAvailable).toBe(false);
  });
});
