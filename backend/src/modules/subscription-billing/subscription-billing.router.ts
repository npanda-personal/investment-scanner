import express from 'express';
import { requireAuth } from '../auth-identity';
import { SubscriptionBillingController } from './subscription-billing.controller';

export const createSubscriptionBillingRouter = (
  controller = new SubscriptionBillingController()
) => {
  const router = express.Router();

  router.use(requireAuth);
  router.get('/subscription/me', controller.me);
  router.get('/subscription/plans', controller.plans);
  router.post('/subscription/change-plan', controller.changePlan);
  router.get('/subscription/usage', controller.usage);
  router.get('/subscription/features', controller.features);
  router.get('/subscription/provider', controller.providerStatus);
  router.patch('/subscription/users/:userId/plan', controller.adminChangePlan);

  return router;
};

export const subscriptionBillingRouter = createSubscriptionBillingRouter();
export default subscriptionBillingRouter;
