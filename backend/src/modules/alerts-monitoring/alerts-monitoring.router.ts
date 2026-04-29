import express from 'express';
import { requireAuth } from '../auth-identity';
import { AlertsMonitoringController } from './alerts-monitoring.controller';

export const createAlertsMonitoringRouter = (
  controller = new AlertsMonitoringController()
) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/alerts/rules', controller.listRules);
  router.post('/alerts/rules', controller.createRule);
  router.get('/alerts/rules/:id', controller.getRule);
  router.patch('/alerts/rules/:id', controller.updateRule);
  router.delete('/alerts/rules/:id', controller.deleteRule);
  router.post('/alerts/evaluate', controller.evaluate);
  router.get('/alerts/events', controller.listEvents);
  router.patch('/alerts/events/:id/read', controller.markRead);
  router.patch('/alerts/events/:id/dismiss', controller.dismiss);
  router.post('/alerts/events/mark-all-read', controller.markAllRead);
  router.get('/alerts/summary', controller.summary);

  return router;
};

export const alertsMonitoringRouter = createAlertsMonitoringRouter();

export default alertsMonitoringRouter;
