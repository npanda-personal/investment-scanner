/// <reference types="@types/jest" />
import { createMarketContextIntelligenceRouter } from '../../../src/modules/market-context-intelligence';

describe('market context routes', () => {
  it('registers MVP endpoints', () => {
    const router = createMarketContextIntelligenceRouter({
      summary: jest.fn(),
      regime: jest.fn(),
      sectors: jest.fn(),
      breadth: jest.fn(),
      countries: jest.fn(),
      macro: jest.fn(),
      run: jest.fn(),
    } as any);
    const routes = router.stack.filter((layer: any) => layer.route).map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toEqual([
      'GET /market-context/summary',
      'GET /market-context/regime',
      'GET /market-context/sectors',
      'GET /market-context/breadth',
      'GET /market-context/countries',
      'GET /market-context/macro',
      'POST /market-context/run',
    ]);
  });
});
