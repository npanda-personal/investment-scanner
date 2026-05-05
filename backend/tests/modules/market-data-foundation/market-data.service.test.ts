/// <reference types="@types/jest" />
import { MarketDataFoundationService } from '../../../src/modules/market-data-foundation';

const stock = {
  id: 'stock-1',
  symbol: 'AAPL',
  name: 'Apple Inc.',
  region: 'US',
  exchange: 'NASDAQ',
  isActive: true,
  lastSuccessfulDataLoadTimestamp: new Date('2026-01-01T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  country: 'US',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  currency: 'USD',
  marketCap: null,
  assetType: 'EQUITY',
  isDelisted: false,
  ipoDate: null,
  isin: null,
  source: 'database',
  dataStatus: 'COMPLETE',
};

describe('MarketDataFoundationService syncV1', () => {
  it('returns health metadata', async () => {
    const service = new MarketDataFoundationService({
      instrumentCount: jest.fn().mockResolvedValue(2),
      latestDataTimestamp: jest.fn().mockResolvedValue(new Date('2026-01-02T00:00:00.000Z')),
    } as any, {} as any);

    await expect(service.health()).resolves.toMatchObject({
      status: 'ok',
      instrumentCount: 2,
      latestDataTimestamp: '2026-01-02T00:00:00.000Z',
      data_status: 'COMPLETE',
    });
  });

  it('rejects sync requests without symbol or instrumentId', async () => {
    const service = new MarketDataFoundationService({} as any, {} as any);

    await expect(service.syncV1({})).resolves.toMatchObject({
      success: false,
      instrument: null,
      message: 'symbol or instrumentId is required',
    });
  });

  it('syncs an existing instrument and returns metadata flags', async () => {
    const repository = {
      findStockById: jest.fn().mockResolvedValue(stock),
      updateCompanyMasterData: jest.fn().mockResolvedValue(stock),
      upsertFundamentals: jest.fn().mockResolvedValue({}),
      upsertCorporateActions: jest.fn().mockResolvedValue([]),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'US', exchange: 'NASDAQ' }),
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        exchange: 'NASDAQ',
        country: 'US',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        currency: 'USD',
        marketCap: 100,
        assetType: 'EQUITY',
        isDelisted: false,
        ipoDate: null,
        source: 'yahoo',
        dataStatus: 'PARTIAL',
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 1,
      rowsUpdated: 0,
      rowsSkipped: 0,
      warningCount: 0,
      warnings: [],
    });
    jest.spyOn(service, 'fetchCoreFundamentals').mockResolvedValue({
      symbol: 'AAPL',
      revenue: 100,
      eps: 5,
      earnings: 20,
      dividendYield: 0.01,
      sharesOutstanding: 1000,
      marketCap: 100000,
      currency: 'USD',
      periodType: 'TTM',
      ratios: {
        trailingPe: 25,
        forwardPe: null,
        priceToBook: null,
        profitMargins: null,
        returnOnEquity: null,
        debtToEquity: null,
      },
      source: 'yahoo',
      asOf: '2026-01-02T00:00:00.000Z',
    });
    jest.spyOn(service, 'fetchCorporateActions').mockResolvedValue([
      { symbol: 'AAPL', type: 'dividend', date: '2026-01-02T00:00:00.000Z', value: 0.25, amount: 0.25, source: 'yahoo' },
    ]);

    await expect(service.syncV1({ instrumentId: 'stock-1' })).resolves.toMatchObject({
      success: true,
      pricesStored: true,
      fundamentalsAvailable: true,
      corporateActionsAvailable: true,
      syncSummary: {
        rowsReceived: 1,
        rowsInserted: 1,
      },
      instrument: {
        id: 'stock-1',
        symbol: 'AAPL',
        exchange: 'NASDAQ',
        currency: 'USD',
        asset_type: 'EQUITY',
      },
    });
  });

  it('returns FX rates from the repository', async () => {
    const service = new MarketDataFoundationService({
      listFxRates: jest.fn().mockResolvedValue([
        {
          pair: 'USD/EUR',
          baseCurrency: 'USD',
          quoteCurrency: 'EUR',
          rate: '0.92',
          rateTimestamp: new Date('2026-01-02T00:00:00.000Z'),
          source: 'yahoo',
          ingestionTimestamp: new Date('2026-01-02T00:00:00.000Z'),
          lastUpdatedTimestamp: new Date('2026-01-02T00:00:00.000Z'),
          dataStatus: 'COMPLETE',
        },
      ]),
    } as any, {} as any);

    await expect(service.listFxRates()).resolves.toMatchObject({
      data_status: 'COMPLETE',
      rates: [
        {
          pair: 'USD/EUR',
          rate: 0.92,
          source: 'yahoo',
        },
      ],
    });
  });

  it('marks scheduled post-close no-op runs as final confirmed', async () => {
    const repository = {
      listActiveStockSyncTasks: jest.fn().mockResolvedValue([{ id: 'stock-1', symbol: 'AAPL', lastSuccessfulDataLoadTimestamp: null }]),
      upsertSyncState: jest.fn().mockResolvedValue({}),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue('2026-05-05'),
      getSyncState: jest.fn().mockResolvedValue(null),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 1,
      warningCount: 0,
      warnings: [],
    });

    const summary = await service.syncScheduledRegion('IN', {
      assetType: 'STOCK',
      now: new Date('2026-05-05T10:30:00.000Z'),
    });

    expect(summary).toMatchObject({ rowsNoOp: 1, rowsInserted: 0, rowsUpdated: 0 });
    expect(repository.upsertSyncState).toHaveBeenLastCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      tradingDate: '2026-05-05',
      status: 'FINAL_CONFIRMED',
    }));
  });

  it('skips recently synced catalog before provider workers are started', async () => {
    const lastCheckedAt = new Date(Date.now() - 5 * 60_000).toISOString();
    const repository = {
      listActiveStockSyncTasks: jest.fn().mockResolvedValue([{ id: 'stock-1', symbol: 'AAPL', lastSuccessfulDataLoadTimestamp: null }]),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue(null),
      getSyncState: jest.fn().mockResolvedValue({
        status: 'SYNCED',
        lastCheckedAt,
      }),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.syncAll(1, 1, 0, { region: 'GLOBAL', assetType: 'STOCK' });

    expect(result).toMatchObject({
      success: true,
      noNewData: true,
      message: 'No new data to ingest. Catalog was synced recently.',
      providerFetchSkippedCount: 1,
      skippedReasonCounts: { RECENTLY_SYNCED: 1 },
    });
  });

  it('force instrument sync bypasses recent freshness gate and still allows no-op storage', async () => {
    const repository = {
      findStockBySymbol: jest.fn().mockResolvedValue({ symbol: 'AAPL', region: 'GLOBAL', assetType: 'STOCK', lastSuccessfulDataLoadTimestamp: new Date() }),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue(null),
      getSyncState: jest.fn().mockResolvedValue({
        status: 'SYNCED',
        lastCheckedAt: new Date().toISOString(),
      }),
      updateStockLoadTimestampBySymbol: jest.fn().mockResolvedValue({}),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'US', exchange: 'NASDAQ' }),
      fetchHistorical: jest.fn().mockResolvedValue([
        { symbol: 'AAPL', date: new Date('2026-05-05T00:00:00.000Z'), open: 1, high: 1, low: 1, close: 1, volume: 1 },
      ]),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);
    jest.spyOn(service, 'storeHistorical').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 1,
      warningCount: 0,
      warnings: [],
    });

    const result = await service.ingestSymbol('AAPL', new Date('2026-05-02T00:00:00.000Z'), new Date('2026-05-05T00:00:00.000Z'), false, { force: true });

    expect(provider.fetchHistorical).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ rowsNoOp: 1, rowsInserted: 0, rowsUpdated: 0 });
  });

  it('skips provider fetch before market open for 1D data', async () => {
    const repository = {
      findStockBySymbol: jest.fn().mockResolvedValue({ symbol: 'RELIANCE.NS', region: 'IN', assetType: 'STOCK', lastSuccessfulDataLoadTimestamp: null }),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue(null),
      getSyncState: jest.fn().mockResolvedValue(null),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
      fetchHistorical: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.ingestSymbol('RELIANCE.NS', undefined, new Date('2026-05-05T03:00:00.000Z'));

    expect(provider.fetchHistorical).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      noNewData: true,
      skippedReasonCounts: { BEFORE_MARKET_OPEN: 1 },
    });
  });

  it('skips provider fetch when final daily candle is confirmed', async () => {
    const repository = {
      findStockBySymbol: jest.fn().mockResolvedValue({ symbol: 'RELIANCE.NS', region: 'IN', assetType: 'STOCK', lastSuccessfulDataLoadTimestamp: null }),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue('2026-05-05'),
      getSyncState: jest.fn().mockResolvedValue({
        status: 'FINAL_CONFIRMED',
        lastCheckedAt: new Date('2026-05-05T10:30:00.000Z').toISOString(),
      }),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
      fetchHistorical: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.ingestSymbol('RELIANCE.NS', undefined, new Date('2026-05-05T11:00:00.000Z'));

    expect(provider.fetchHistorical).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      noNewData: true,
      skippedReasonCounts: { FINAL_CANDLE_CONFIRMED: 1 },
    });
  });

  it('skips provider fetch on weekends', async () => {
    const repository = {
      findStockBySymbol: jest.fn().mockResolvedValue({ symbol: 'RELIANCE.NS', region: 'IN', assetType: 'STOCK', lastSuccessfulDataLoadTimestamp: null }),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue(null),
      getSyncState: jest.fn().mockResolvedValue(null),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
      fetchHistorical: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.ingestSymbol('RELIANCE.NS', undefined, new Date('2026-05-09T06:00:00.000Z'));

    expect(provider.fetchHistorical).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      noNewData: true,
      skippedReasonCounts: { WEEKEND_OR_HOLIDAY: 1 },
    });
  });

  it('allows provider fetch in post-close finalization window when final candle is not confirmed', async () => {
    const repository = {
      findStockBySymbol: jest.fn().mockResolvedValue({ symbol: 'RELIANCE.NS', region: 'IN', assetType: 'STOCK', lastSuccessfulDataLoadTimestamp: null }),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue(null),
      getSyncState: jest.fn().mockResolvedValue(null),
      updateStockLoadTimestampBySymbol: jest.fn().mockResolvedValue({}),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
      fetchHistorical: jest.fn().mockResolvedValue([
        { symbol: 'RELIANCE.NS', date: new Date('2026-05-05T00:00:00.000Z'), open: 1, high: 1, low: 1, close: 1, volume: 1 },
      ]),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);
    jest.spyOn(service, 'storeHistorical').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 1,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    await service.ingestSymbol('RELIANCE.NS', undefined, new Date('2026-05-05T10:30:00.000Z'));

    expect(provider.fetchHistorical).toHaveBeenCalledTimes(1);
  });
});
