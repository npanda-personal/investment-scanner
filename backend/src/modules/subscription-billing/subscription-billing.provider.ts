export class SubscriptionBillingProvider {
  readonly enabled = false;

  providerStatus() {
    return {
      enabled: false,
      provider: 'manual',
      message: 'External billing provider is disabled for MVP. Plans are changed manually through admin-ready APIs.',
    };
  }
}
