/// <reference types="@types/jest" />
import { createTodayTradeReviewRouter } from '../../../src/modules/today-trade-review';

const routePaths = (router: any) =>
  router.stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

describe('today trade review routes', () => {
  it('registers auth-scoped Today Review endpoints without a root catch-all middleware', () => {
    const router = createTodayTradeReviewRouter({
      latest: jest.fn(),
      runs: jest.fn(),
      runById: jest.fn(),
      candidate: jest.fn(),
      run: jest.fn(),
    } as any);

    expect(router.stack.filter((layer: any) => !layer.route)).toHaveLength(0);
    expect(routePaths(router)).toEqual([
      'GET /today-review/latest',
      'GET /today-review/runs',
      'GET /today-review/runs/:id',
      'GET /today-review/candidates/:id',
      'POST /today-review/run',
    ]);
  });
});
