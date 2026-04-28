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
});
