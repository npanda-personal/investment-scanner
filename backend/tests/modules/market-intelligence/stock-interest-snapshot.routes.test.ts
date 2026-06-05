/// <reference types="@types/jest" />
import { createMarketIntelligenceRouter } from '../../../src/modules/market-intelligence';

const routePaths = (router: any) =>
  router.stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

describe('market intelligence routes', () => {
  it('registers the persisted read endpoints (stock-interest + sector-constituents)', () => {
    const router = createMarketIntelligenceRouter({
      stockInterest: jest.fn(),
      sectorConstituents: jest.fn(),
    } as any);

    expect(router.stack.filter((layer: any) => !layer.route)).toHaveLength(0);
    expect(routePaths(router)).toEqual([
      'GET /market-intelligence/stock-interest',
      'GET /market-intelligence/sector-constituents',
    ]);
  });
});
