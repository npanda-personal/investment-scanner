/// <reference types="@types/jest" />
import { createSubscriptionBillingRouter } from '../../../src/modules/subscription-billing';

describe('subscription billing routes', () => {
  it('registers MVP endpoints', () => {
    const router = createSubscriptionBillingRouter({
      me: jest.fn(),
      plans: jest.fn(),
      changePlan: jest.fn(),
      usage: jest.fn(),
      features: jest.fn(),
      providerStatus: jest.fn(),
      adminChangePlan: jest.fn(),
    } as any);
    const routes = router.stack.filter((layer: any) => layer.route).map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toEqual([
      'GET /subscription/me',
      'GET /subscription/plans',
      'POST /subscription/change-plan',
      'GET /subscription/usage',
      'GET /subscription/features',
      'GET /subscription/provider',
      'PATCH /subscription/users/:userId/plan',
    ]);
  });
});
