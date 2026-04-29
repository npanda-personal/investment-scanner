/// <reference types="@types/jest" />
import { createSmartMoneyIntelligenceRouter } from '../../../src/modules/smart-money-intelligence';

describe('smart money intelligence routes', () => {
  it('registers MVP endpoints', () => {
    const router = createSmartMoneyIntelligenceRouter({
      health: jest.fn(),
      sectors: jest.fn(),
      top: jest.fn(),
      distribution: jest.fn(),
      stock: jest.fn(),
    } as any);
    const routes = router.stack.filter((layer: any) => layer.route).map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toEqual([
      'GET /smart-money/health',
      'GET /smart-money/sectors',
      'GET /smart-money/top',
      'GET /smart-money/distribution',
      'GET /smart-money/stocks/:instrumentId',
    ]);
  });
});
