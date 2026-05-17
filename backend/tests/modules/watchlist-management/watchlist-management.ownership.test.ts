/// <reference types="@types/jest" />
import { WatchlistManagementController } from '../../../src/modules/watchlist-management/watchlist-management.controller';
import { WatchlistManagementService } from '../../../src/modules/watchlist-management/watchlist-management.service';

const watchlist = {
  id: 'watchlist-user-a',
  name: 'User A Watchlist',
  description: null,
  createdAt: '2026-05-17T00:00:00.000Z',
  updatedAt: '2026-05-17T00:00:00.000Z',
};

const itemInput = {
  notes: 'review after close',
  tags: ['review'],
};

const invalidItemInput = {
  tags: 'not-an-array',
};

const invalidAddItemInput = {
  instrumentId: '',
  tags: 'not-an-array',
};

const createService = () => {
  const repository = {
    getWatchlist: jest.fn(async (watchlistId: string, userId: string) => {
      if (watchlistId === 'watchlist-user-a' && userId === 'user-a') return watchlist;
      return null;
    }),
    updateWatchlist: jest.fn(async (_watchlistId, input) => ({ ...watchlist, ...input })),
    deleteWatchlist: jest.fn().mockResolvedValue(undefined),
    listItems: jest.fn().mockResolvedValue([{ id: 'item-user-a', watchlistId: 'watchlist-user-a', instrumentId: 'stock-1' }]),
    findItemByInstrument: jest.fn().mockResolvedValue(null),
    addItem: jest.fn(async (watchlistId, input) => ({
      id: 'item-user-a',
      watchlistId,
      instrumentId: input.instrumentId,
      symbol: 'ABC',
      companyName: 'ABC Co',
      notes: input.notes ?? null,
      tags: input.tags ?? [],
      createdAt: '2026-05-17T00:00:00.000Z',
      updatedAt: '2026-05-17T00:00:00.000Z',
    })),
    updateItem: jest.fn(async (watchlistId, itemId, input) => ({
      id: itemId,
      watchlistId,
      instrumentId: 'stock-1',
      symbol: 'ABC',
      companyName: 'ABC Co',
      tags: [],
      ...input,
      createdAt: '2026-05-17T00:00:00.000Z',
      updatedAt: '2026-05-17T00:00:00.000Z',
    })),
    removeItem: jest.fn().mockResolvedValue(undefined),
  };
  const marketDataService = {
    getInstrument: jest.fn().mockResolvedValue({ id: 'stock-1', symbol: 'ABC' }),
    latestPriceByInstrumentId: jest.fn().mockResolvedValue({ latest: null }),
    listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [] }),
  };
  const service = new WatchlistManagementService(
    repository as any,
    marketDataService as any,
    { latestForInstrument: jest.fn().mockResolvedValue(null) } as any,
    { assertAllowed: jest.fn() } as any
  );
  return { service, repository, marketDataService };
};

const createResponse = () => {
  const res = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res;
};

describe('watchlist management child-resource ownership', () => {
  it('updates watchlist items only after resolving the parent watchlist for the current user', async () => {
    const { service, repository } = createService();

    await expect(service.updateItem('watchlist-user-a', 'item-user-a', itemInput, 'user-a')).resolves.toMatchObject({
      id: 'item-user-a',
      watchlistId: 'watchlist-user-a',
    });

    expect(repository.getWatchlist).toHaveBeenCalledWith('watchlist-user-a', 'user-a');
    expect(repository.updateItem).toHaveBeenCalledWith('watchlist-user-a', 'item-user-a', itemInput);
    expect(repository.getWatchlist.mock.invocationCallOrder[0]).toBeLessThan(repository.updateItem.mock.invocationCallOrder[0]);
  });

  it('does not read or mutate an item when the watchlist belongs to another user', async () => {
    const { service, repository } = createService();

    await expect(service.updateItem('watchlist-user-a', 'item-user-a', itemInput, 'user-b')).rejects.toThrow('Watchlist not found');
    await expect(service.removeItem('watchlist-user-a', 'item-user-a', 'user-b')).rejects.toThrow('Watchlist not found');

    expect(repository.getWatchlist).toHaveBeenCalledWith('watchlist-user-a', 'user-b');
    expect(repository.updateItem).not.toHaveBeenCalled();
    expect(repository.removeItem).not.toHaveBeenCalled();
  });

  it('proves watchlist ownership before validating child create and update input', async () => {
    const { service, repository, marketDataService } = createService();

    await expect(service.addItem('watchlist-user-a', invalidAddItemInput as any, 'user-b')).rejects.toThrow('Watchlist not found');
    await expect(service.updateItem('watchlist-user-a', 'item-user-a', invalidItemInput as any, 'user-b')).rejects.toThrow('Watchlist not found');

    expect(repository.getWatchlist).toHaveBeenCalledWith('watchlist-user-a', 'user-b');
    expect(repository.findItemByInstrument).not.toHaveBeenCalled();
    expect(repository.addItem).not.toHaveBeenCalled();
    expect(repository.updateItem).not.toHaveBeenCalled();
    expect(marketDataService.getInstrument).not.toHaveBeenCalled();
  });

  it('proves watchlist ownership before validating watchlist updates', async () => {
    const { service, repository } = createService();

    await expect(service.updateWatchlist('watchlist-user-a', { name: '' }, 'user-b')).rejects.toThrow('Watchlist not found');

    expect(repository.getWatchlist).toHaveBeenCalledWith('watchlist-user-a', 'user-b');
    expect(repository.updateWatchlist).not.toHaveBeenCalled();
  });

  it('does not list items when the watchlist belongs to another user', async () => {
    const { service, repository } = createService();

    await expect(service.detail('watchlist-user-a', 'recentlyAdded', 'user-b')).resolves.toBeNull();

    expect(repository.getWatchlist).toHaveBeenCalledWith('watchlist-user-a', 'user-b');
    expect(repository.listItems).not.toHaveBeenCalled();
  });

  it('allows owned-user item removal after parent ownership is proven', async () => {
    const { service, repository } = createService();

    await expect(service.removeItem('watchlist-user-a', 'item-user-a', 'user-a')).resolves.toBeUndefined();

    expect(repository.getWatchlist).toHaveBeenCalledWith('watchlist-user-a', 'user-a');
    expect(repository.removeItem).toHaveBeenCalledWith('watchlist-user-a', 'item-user-a');
  });

  it('propagates the authenticated user through item controller methods', async () => {
    const service = {
      updateItem: jest.fn().mockResolvedValue({ id: 'item-user-a' }),
      removeItem: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new WatchlistManagementController(service as any);
    const req = {
      params: { id: 'watchlist-user-a', itemId: 'item-user-a' },
      body: itemInput,
      user: { id: 'user-a' },
    };

    await controller.updateItem(req as any, createResponse() as any);
    await controller.removeItem(req as any, createResponse() as any);

    expect(service.updateItem).toHaveBeenCalledWith('watchlist-user-a', 'item-user-a', itemInput, 'user-a');
    expect(service.removeItem).toHaveBeenCalledWith('watchlist-user-a', 'item-user-a', 'user-a');
  });

  it('returns non-leaking 404 responses for controller ownership misses', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = {
      updateWatchlist: jest.fn().mockRejectedValue(new Error('Watchlist not found')),
      deleteWatchlist: jest.fn().mockRejectedValue(new Error('Watchlist not found')),
      addItem: jest.fn().mockRejectedValue(new Error('Watchlist not found')),
      updateItem: jest.fn().mockRejectedValue(new Error('Watchlist not found')),
      removeItem: jest.fn().mockRejectedValue(new Error('Watchlist not found')),
    };
    const controller = new WatchlistManagementController(service as any);
    const req = {
      params: { id: 'watchlist-user-a', itemId: 'item-user-a' },
      body: invalidAddItemInput,
      user: { id: 'user-b' },
    };

    try {
      for (const handler of [
        controller.updateWatchlist,
        controller.deleteWatchlist,
        controller.addItem,
        controller.updateItem,
        controller.removeItem,
      ]) {
        const res = createResponse();
        await handler(req as any, res as any);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Watchlist not found' });
      }
    } finally {
      consoleError.mockRestore();
    }
  });
});
