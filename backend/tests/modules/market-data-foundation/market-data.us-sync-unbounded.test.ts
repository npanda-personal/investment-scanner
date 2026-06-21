/// <reference types="@types/jest" />

// Regression guard: the US free-provider sync path must fetch ALL active
// instruments without a batchSize cap. Previously, batchSize was passed to
// listActiveStockSyncTasks which applied a Prisma `take`, capping to 100.

const mockSyncDaily = jest.fn().mockResolvedValue({
  symbolsProcessed: 2,
  barsReceived: 10,
  barsInserted: 5,
  barsUpdated: 3,
  barsSkipped: 2,
  changedSymbols: ['AAPL'],
  warnings: [],
});

jest.mock(
  '../../../src/modules/market-data-foundation/ingestion/market-data-foundation.region-ingestion-registry',
  () => {
    const actual = jest.requireActual(
      '../../../src/modules/market-data-foundation/ingestion/market-data-foundation.region-ingestion-registry',
    );
    return {
      ...actual,
      resolveRegionAdapter: jest.fn().mockReturnValue({
        region: 'US',
        mechanism: 'test-free-provider',
        handles: () => true,
        syncDaily: mockSyncDaily,
      }),
    };
  },
);

import { MarketDataFoundationService } from '../../../src/modules/market-data-foundation';

describe('US free-provider sync — batch cap regression guard', () => {
  it('fetches ALL active instruments without a batchSize/take limit', async () => {
    const repository = {
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue('2026-06-20'),
      getSyncState: jest.fn().mockResolvedValue(null),
      upsertSyncState: jest.fn().mockResolvedValue({}),
      instrumentCount: jest.fn().mockResolvedValue(2),
      storeHistoricalBulk: jest.fn(),
      listActiveStockSyncTasks: jest.fn().mockResolvedValue([
        { id: 'aapl-id', symbol: 'AAPL', providerSymbol: 'AAPL', sourceSymbol: 'AAPL', displaySymbol: 'AAPL', exchange: 'NASDAQ' },
        { id: 'msft-id', symbol: 'MSFT', providerSymbol: 'MSFT', sourceSymbol: 'MSFT', displaySymbol: 'MSFT', exchange: 'NASDAQ' },
      ]),
    };
    const service = new MarketDataFoundationService(repository as any, {
      inferRegion: jest.fn().mockReturnValue({ region: 'US', exchange: 'NASDAQ' }),
    } as any);
    jest.spyOn(service, 'evaluateSyncFreshnessGate').mockResolvedValue({
      shouldSkip: false,
      reason: null,
    } as any);
    jest.spyOn(service as any, 'instrumentIdsForImportedSymbols').mockReturnValue(['aapl-id']);
    jest.spyOn(service as any, 'updateStockLoadTimestampsForSymbols').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'scheduledRegionSourceFingerprint').mockReturnValue('fp-test');

    await service.syncScheduledRegion('US', {
      assetType: 'STOCK',
      batchSize: 100,
      now: new Date('2026-06-21T22:00:00.000Z'),
      skipWeekends: false,
    });

    expect(repository.listActiveStockSyncTasks).toHaveBeenCalledWith({
      region: 'US',
      assetType: 'STOCK',
    });
    const call = repository.listActiveStockSyncTasks.mock.calls[0];
    expect(call).toHaveLength(1);
  });
});
