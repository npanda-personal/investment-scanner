/// <reference types="@types/jest" />
import { createHistoricalContextSnapshotsRouter } from '../../../src/modules/historical-context-snapshots';

describe('historical context snapshots routes', () => {
  it('registers MVP endpoints', () => {
    const router = createHistoricalContextSnapshotsRouter({
      generate: jest.fn(),
      summary: jest.fn(),
      market: jest.fn(),
      sectors: jest.fn(),
      countries: jest.fn(),
      smartMoney: jest.fn(),
      coverage: jest.fn(),
      lookup: jest.fn(),
    } as any);
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);
    expect(routes).toEqual([
      'POST /context-snapshots/generate',
      'GET /context-snapshots/summary',
      'GET /context-snapshots/market',
      'GET /context-snapshots/sectors',
      'GET /context-snapshots/countries',
      'GET /context-snapshots/smart-money',
      'GET /context-snapshots/coverage',
      'GET /context-snapshots/lookup',
    ]);
  });
});
