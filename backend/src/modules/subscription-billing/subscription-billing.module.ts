import { SubscriptionBillingController } from './subscription-billing.controller';
import { SubscriptionBillingProvider } from './subscription-billing.provider';
import { SubscriptionBillingRepository } from './subscription-billing.repository';
import { subscriptionBillingRouter } from './subscription-billing.router';
import { SubscriptionBillingService } from './subscription-billing.service';

export const subscriptionBillingModule = {
  name: 'subscription-billing',
  router: subscriptionBillingRouter,
  controller: SubscriptionBillingController,
  service: SubscriptionBillingService,
  repository: SubscriptionBillingRepository,
  provider: SubscriptionBillingProvider,
};
