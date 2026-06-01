/// <reference types="@types/jest" />
import { apiModules } from '../../../src/api/routes';
import { createEarningsIntelligenceRouter, earningsIntelligenceRouter } from '../../../src/modules/earnings-intelligence';

describe('earnings intelligence routes', () => {
  it('registers the market intelligence earnings read endpoint', () => {
    const router = createEarningsIntelligenceRouter({ latest: jest.fn() } as any);
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toEqual(['GET /market-intelligence/earnings']);
  });

  it('mounts the endpoint under api v1', () => {
    expect(apiModules).toContainEqual({ path: '/api/v1', router: earningsIntelligenceRouter });
  });
});

