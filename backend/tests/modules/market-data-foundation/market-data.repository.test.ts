/// <reference types="@types/jest" />
import { MarketDataFoundationRepository } from '../../../src/modules/market-data-foundation';

describe('MarketDataFoundationRepository', () => {
  it('lists stocks with pagination, sorting, and market segmentation filters', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocks({
      page: 2,
      pageSize: 25,
      sortBy: 'marketCap',
      sortOrder: 'desc',
      region: 'US',
      country: 'US',
      exchange: 'NASDAQ',
      assetType: 'EQUITY',
      currency: 'USD',
      sector: 'tech',
      industry: 'software',
      search: 'apple',
    });

    expect(prisma.stock.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 25,
      take: 25,
      orderBy: { marketCap: 'desc' },
      where: expect.objectContaining({
        region: 'US',
        country: { contains: 'US', mode: 'insensitive' },
        exchange: { contains: 'NASDAQ', mode: 'insensitive' },
        assetType: { contains: 'EQUITY', mode: 'insensitive' },
        currency: { contains: 'USD', mode: 'insensitive' },
        sector: { contains: 'tech', mode: 'insensitive' },
        industry: { contains: 'software', mode: 'insensitive' },
        OR: expect.any(Array),
      }),
    }));
  });

  it('stores historical prices with upsert summary and duplicate prevention', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const latestPriceUpsert = jest.fn().mockResolvedValue({});
    const prisma = {
      priceTick: {
        findMany: jest.fn().mockResolvedValue([
          { timestamp: new Date('2025-01-01T00:00:00.000Z') },
        ]),
      },
      latestPrice: {
        upsert: latestPriceUpsert,
      },
      $transaction: jest.fn(async (callback: any): Promise<any> => callback({
        priceTick: { upsert },
        latestPrice: { upsert: latestPriceUpsert },
      })),
    } as any;
    const repository = new MarketDataFoundationRepository(prisma as any);

    const summary = await repository.storeHistorical([
      {
        symbol: 'AAPL',
        date: new Date('2025-01-01T15:30:00.000Z'),
        open: 100,
        high: 110,
        low: 95,
        close: 105,
        volume: 10,
      },
      {
        symbol: 'AAPL',
        date: new Date('2025-01-02T00:00:00.000Z'),
        open: 106,
        high: 112,
        low: 101,
        close: 108,
        volume: 20,
      },
    ], () => ({ region: 'US', exchange: 'NASDAQ' }));

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0][0].where.symbol_timestamp.timestamp).toEqual(new Date('2025-01-01T00:00:00.000Z'));
    expect(summary).toMatchObject({
      rowsReceived: 2,
      rowsInserted: 1,
      rowsUpdated: 1,
      rowsSkipped: 0,
    });
  });

  it('upserts fundamentals, corporate actions, and FX rates', async () => {
    const prisma = {
      fundamental: { upsert: jest.fn().mockResolvedValue({ id: 'fundamental-1' }) },
      corporateAction: { upsert: jest.fn().mockResolvedValue({ id: 'action-1' }) },
      fxRate: { upsert: jest.fn().mockResolvedValue({ id: 'fx-1' }) },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.upsertFundamentals('stock-1', {
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

    expect(prisma.fundamental.upsert.mock.calls[0][0].where.stockId_periodType_source).toEqual({
      stockId: 'stock-1',
      periodType: 'TTM',
      source: 'yahoo',
    });
    expect(prisma.fundamental.upsert.mock.calls[0][0].update.periodEndDate).toEqual(
      new Date('2026-01-02T00:00:00.000Z')
    );

    await repository.upsertCorporateActions('stock-1', [
      { symbol: 'AAPL', type: 'dividend', date: '2026-01-02T18:15:00.000Z', value: 0.25, amount: 0.25, source: 'yahoo' },
    ]);

    await repository.upsertFxRate({
      pair: 'USD/EUR',
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      rate: 0.92,
      rateTimestamp: new Date('2026-01-02T00:00:00.000Z'),
      source: 'yahoo',
    });

    expect(prisma.fundamental.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.corporateAction.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.corporateAction.upsert.mock.calls[0][0].where.stockId_actionType_effectiveDate_source.effectiveDate).toEqual(
      new Date('2026-01-02T00:00:00.000Z')
    );
    expect(prisma.fxRate.upsert).toHaveBeenCalledTimes(1);
  });
});
