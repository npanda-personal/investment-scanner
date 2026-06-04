/// <reference types="@types/jest" />
import { createTradeJournalRouter } from '../../../src/modules/trade-journal';

describe('trade-journal routes', () => {
  it('registers all expected endpoints in the correct order (post-mortem before :id)', () => {
    const router = createTradeJournalRouter({
      create: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      postMortem: jest.fn(),
    } as any);

    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toEqual([
      'GET /trade-journal/post-mortem',
      'POST /trade-journal',
      'GET /trade-journal',
      'GET /trade-journal/:id',
      'PATCH /trade-journal/:id',
      'DELETE /trade-journal/:id',
    ]);
  });

  it('post-mortem route is registered before /:id so it is not shadowed', () => {
    const router = createTradeJournalRouter({
      create: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      postMortem: jest.fn(),
    } as any);

    const routePaths = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => layer.route.path);

    const postMortemIdx = routePaths.indexOf('/trade-journal/post-mortem');
    const idIdx = routePaths.indexOf('/trade-journal/:id');
    expect(postMortemIdx).toBeGreaterThanOrEqual(0);
    expect(idIdx).toBeGreaterThan(postMortemIdx);
  });
});
