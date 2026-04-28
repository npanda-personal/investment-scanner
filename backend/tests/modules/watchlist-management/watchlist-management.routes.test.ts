/// <reference types="@types/jest" />
import { createWatchlistManagementRouter } from '../../../src/modules/watchlist-management';

describe('watchlist management routes', () => {
  it('registers MVP endpoints', () => {
    const router = createWatchlistManagementRouter({
      listWatchlists: jest.fn(),
      createWatchlist: jest.fn(),
      getWatchlist: jest.fn(),
      updateWatchlist: jest.fn(),
      deleteWatchlist: jest.fn(),
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
    } as any);
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toEqual([
      'GET /watchlists',
      'POST /watchlists',
      'GET /watchlists/:id',
      'PATCH /watchlists/:id',
      'DELETE /watchlists/:id',
      'POST /watchlists/:id/items',
      'PATCH /watchlists/:id/items/:itemId',
      'DELETE /watchlists/:id/items/:itemId',
    ]);
  });
});
