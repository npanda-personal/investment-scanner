/// <reference types="@types/jest" />
import { createMarketIntelligenceRouter } from '../../../src/modules/market-intelligence';

const routePaths = (router: any) =>
  router.stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

describe('market intelligence routes', () => {
  it('registers the Stock Interest persisted read endpoint only', () => {
    const router = createMarketIntelligenceRouter({
      stockInterest: jest.fn(),
    } as any);

    expect(router.stack.filter((layer: any) => !layer.route)).toHaveLength(0);
    expect(routePaths(router)).toEqual([
      'GET /market-intelligence/stock-interest',
    ]);
  });
});
