/// <reference types="@types/jest" />
import { createStockResearchWorkbenchRouter } from '../../../src/modules/stock-research-workbench';

const controller = {
  overview: jest.fn(),
  performance: jest.fn(),
  peers: jest.fn(),
  relativeStrength: jest.fn(),
  workbench: jest.fn(),
} as any;

const routePaths = (router: any) =>
  router.stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);

describe('stock research workbench routes', () => {
  it('registers research endpoints', () => {
    expect(routePaths(createStockResearchWorkbenchRouter(controller))).toEqual(
      expect.arrayContaining([
        'GET /research/stocks/:instrumentId/overview',
        'GET /research/stocks/:instrumentId/performance',
        'GET /research/stocks/:instrumentId/peers',
        'GET /research/stocks/:instrumentId/relative-strength',
        'GET /research/stocks/:instrumentId/workbench',
      ])
    );
  });
});
