import express from 'express';
import { requireAuth } from '../auth-identity';
import { NotificationsDeliveryController } from './notifications-delivery.controller';

export const createNotificationsDeliveryRouter = (
  controller = new NotificationsDeliveryController()
) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/notifications/preferences', controller.preferences);
  router.patch('/notifications/preferences', controller.updatePreferences);
  router.get('/notifications/events', controller.events);
  router.get('/notifications/provider-status', controller.providerStatus);
  router.post('/notifications/test-email', controller.testEmail);
  router.post('/notifications/send-alert-digest', controller.sendAlertDigest);
  router.post('/notifications/send-daily-digest', controller.sendDailyDigest);
  router.post('/notifications/send-weekly-digest', controller.sendWeeklyDigest);
  router.get('/notifications/telegram/status', controller.telegramStatus);
  router.get('/notifications/telegram/setup', controller.telegramSetup);
  router.post('/notifications/telegram/test', controller.testTelegram);

  return router;
};

export const notificationsDeliveryRouter = createNotificationsDeliveryRouter();

export default notificationsDeliveryRouter;
