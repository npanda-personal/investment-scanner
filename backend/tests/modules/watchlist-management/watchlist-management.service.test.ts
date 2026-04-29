/// <reference types="@types/jest" />
import { WatchlistManagementService } from '../../../src/modules/watchlist-management';

const watchlist = {
  id: 'watchlist-1',
  name: 'Ideas',
  description: null,
  createdAt: '2026-04-28T00:00:00.000Z',
  updatedAt: '2026-04-28T00:00:00.000Z',
};

const item = (overrides: any = {}) => ({
  id: overrides.id || 'item-1',
  watchlistId: 'watchlist-1',
  instrumentId: overrides.instrumentId || 'stock-1',
  symbol: overrides.symbol || 'ABC',
  companyName: overrides.companyName || 'ABC Co',
  notes: overrides.notes ?? null,
  tags: overrides.tags || [],
  createdAt: overrides.createdAt || '2026-04-28T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-04-28T00:00:00.000Z',
});

const createService = (overrides: any = {}) => {
  const repository = {
    listWatchlists: jest.fn().mockResolvedValue([watchlist]),
    createWatchlist: jest.fn(async (input) => ({ ...watchlist, ...input })),
    getWatchlist: jest.fn().mockResolvedValue(watchlist),
    updateWatchlist: jest.fn(async (_id, input) => ({ ...watchlist, ...input })),
    deleteWatchlist: jest.fn(),
    listItems: jest.fn().mockResolvedValue([item()]),
    findItemByInstrument: jest.fn().mockResolvedValue(null),
    addItem: jest.fn(async (_watchlistId, input, instrument) => item({ instrumentId: input.instrumentId, symbol: instrument.symbol })),
    updateItem: jest.fn(async (_watchlistId, itemId, input) => ({ ...item({ id: itemId }), ...input })),
    removeItem: jest.fn(),
    ...overrides.repository,
  };
  const marketDataService = {
    getInstrument: jest.fn().mockResolvedValue({
      id: 'stock-1',
      symbol: 'ABC',
      company_name: 'ABC Co',
      sector: 'Technology',
      country: 'US',
      currency: 'USD',
    }),
    latestPriceByInstrumentId: jest.fn().mockResolvedValue({ latest: { adjusted_close: 105 } }),
    listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: [{ adjusted_close: 105 }, { adjusted_close: 100 }] }),
    ...overrides.marketDataService,
  };
  const signalService = {
    latestForInstrument: jest.fn().mockResolvedValue({
      score: 80,
      direction: 'BULLISH',
      confidence: 'HIGH',
      generated_at: '2026-04-28T00:00:00.000Z',
    }),
    ...overrides.signalService,
  };
  return {
    service: new WatchlistManagementService(repository as any, marketDataService as any, signalService as any, { assertAllowed: jest.fn() } as any),
    repository,
  };
};

describe('WatchlistManagementService', () => {
  it('returns enriched watchlist detail with price and signal', async () => {
    const { service } = createService();

    const detail = await service.detail('watchlist-1');

    expect(detail?.items[0]).toMatchObject({
      symbol: 'ABC',
      sector: 'Technology',
      currentPrice: 105,
      dailyChange: 5,
      dailyChangePercent: 0.05,
      latestSignal: { score: 80, direction: 'BULLISH' },
      researchUrl: '/research/stocks/stock-1',
    });
  });

  it('does not crash when price and signal are unavailable', async () => {
    const { service } = createService({
      marketDataService: {
        latestPriceByInstrumentId: jest.fn().mockRejectedValue(new Error('missing')),
        listPricesByInstrumentId: jest.fn().mockRejectedValue(new Error('missing')),
      },
      signalService: {
        latestForInstrument: jest.fn().mockRejectedValue(new Error('missing')),
      },
    });

    const detail = await service.detail('watchlist-1');

    expect(detail?.items[0]).toMatchObject({
      currentPrice: null,
      dailyChange: null,
      dailyChangePercent: null,
      latestSignal: null,
    });
  });

  it('prevents duplicate item per watchlist', async () => {
    const { service } = createService({
      repository: { findItemByInstrument: jest.fn().mockResolvedValue(item()) },
    });

    await expect(service.addItem('watchlist-1', { instrumentId: 'stock-1' })).rejects.toThrow('This stock already exists in this watchlist.');
  });

  it('delegates watchlist and item CRUD operations', async () => {
    const { service, repository } = createService();

    await service.createWatchlist({ name: 'New Ideas' });
    await service.updateWatchlist('watchlist-1', { name: 'Renamed' });
    await service.addItem('watchlist-1', { instrumentId: 'stock-2', notes: 'watch', tags: ['growth'] });
    await service.updateItem('watchlist-1', 'item-1', { notes: 'updated', tags: ['core'] });
    await service.removeItem('watchlist-1', 'item-1');
    await service.deleteWatchlist('watchlist-1');

    expect(repository.createWatchlist).toHaveBeenCalled();
    expect(repository.updateWatchlist).toHaveBeenCalled();
    expect(repository.addItem).toHaveBeenCalled();
    expect(repository.updateItem).toHaveBeenCalled();
    expect(repository.removeItem).toHaveBeenCalled();
    expect(repository.deleteWatchlist).toHaveBeenCalled();
  });

  it('sorts by signal score and daily change', () => {
    const { service } = createService();
    const items = [
      { ...item({ symbol: 'BBB' }), currentPrice: 10, dailyChange: -1, dailyChangePercent: -0.1, latestSignal: { score: 20 } } as any,
      { ...item({ symbol: 'AAA' }), currentPrice: 10, dailyChange: 2, dailyChangePercent: 0.2, latestSignal: { score: 90 } } as any,
    ];

    expect(service.sortItems(items, 'signalScoreDesc')[0].symbol).toBe('AAA');
    expect(service.sortItems(items, 'dailyChangeAsc')[0].symbol).toBe('BBB');
    expect(service.sortItems(items, 'symbolAsc')[0].symbol).toBe('AAA');
  });
});
