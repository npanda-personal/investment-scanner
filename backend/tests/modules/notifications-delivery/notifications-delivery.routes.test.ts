/// <reference types="@types/jest" />
import { createNotificationsDeliveryRouter } from '../../../src/modules/notifications-delivery';

describe('notifications delivery routes', () => {
  it('registers MVP endpoints', () => {
    const router = createNotificationsDeliveryRouter({
      preferences: jest.fn(),
      updatePreferences: jest.fn(),
      events: jest.fn(),
      providerStatus: jest.fn(),
      testEmail: jest.fn(),
      sendAlertDigest: jest.fn(),
      sendDailyDigest: jest.fn(),
      sendWeeklyDigest: jest.fn(),
    } as any);
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);
    expect(routes).toEqual([
      'GET /notifications/preferences',
      'PATCH /notifications/preferences',
      'GET /notifications/events',
      'GET /notifications/provider-status',
      'POST /notifications/test-email',
      'POST /notifications/send-alert-digest',
      'POST /notifications/send-daily-digest',
      'POST /notifications/send-weekly-digest',
    ]);
  });
});
