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
};

describe('MarketDataFoundationService syncV1', () => {
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
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'US', exchange: 'NASDAQ' }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    jest.spyOn(service, 'ingestSymbol').mockResolvedValue(undefined);
    jest.spyOn(service, 'fetchCoreFundamentals').mockResolvedValue({
      symbol: 'AAPL',
      revenue: 100,
      earnings: 20,
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
      { symbol: 'AAPL', type: 'dividend', date: '2026-01-02T00:00:00.000Z', value: 0.25, source: 'yahoo' },
    ]);

    await expect(service.syncV1({ instrumentId: 'stock-1' })).resolves.toMatchObject({
      success: true,
      pricesStored: true,
      fundamentalsAvailable: true,
      corporateActionsAvailable: true,
      instrument: {
        id: 'stock-1',
        symbol: 'AAPL',
        exchange: 'NASDAQ',
        currency: 'USD',
        asset_type: 'EQUITY',
      },
    });
  });
});
