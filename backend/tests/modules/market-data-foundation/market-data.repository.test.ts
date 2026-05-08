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
        AND: expect.arrayContaining([
          expect.objectContaining({
            OR: expect.arrayContaining([
              { region: 'US' },
              expect.objectContaining({ country: expect.anything() }),
            ]),
          }),
          expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({ assetType: expect.objectContaining({ in: ['STOCK', 'EQUITY'] }) }),
                  { assetType: null },
                ]),
              }),
              expect.objectContaining({
                NOT: expect.not.arrayContaining([
                  expect.objectContaining({ assetType: expect.anything() }),
                ]),
              }),
            ]),
          }),
          expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ symbol: expect.anything() }),
              expect.objectContaining({ name: expect.anything() }),
            ]),
          }),
        ]),
        country: { contains: 'US', mode: 'insensitive' },
        exchange: { equals: 'NASDAQ', mode: 'insensitive' },
        sector: { contains: 'tech', mode: 'insensitive' },
        industry: { contains: 'software', mode: 'insensitive' },
      }),
    }));
    expect(prisma.stock.findMany.mock.calls[0][0].where.AND).toEqual(expect.arrayContaining([
      expect.objectContaining({ currency: { equals: 'USD', mode: 'insensitive' } }),
    ]));
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
    expect(upsert.mock.calls.map((call) => call[0].where.symbol_timestamp.timestamp)).toEqual(
      expect.arrayContaining([
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-01-02T00:00:00.000Z'),
      ])
    );
    expect(summary).toMatchObject({
      rowsReceived: 2,
      rowsInserted: 1,
      rowsUpdated: 1,
      rowsSkipped: 0,
    });
  });

  it('falls back to symbol sort for unknown sort fields', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocks({
      page: 1,
      pageSize: 10,
      sortBy: 'notAColumn' as any,
      sortOrder: 'desc',
    });

    expect(prisma.stock.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { symbol: 'desc' },
    }));
  });

  it('maps CASH segment filtering to cash stock, legacy equity, and null asset type rows', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocks({
      page: 1,
      pageSize: 10,
      region: 'IN',
      instrumentSegment: 'CASH',
    });

    expect(prisma.stock.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({ assetType: expect.objectContaining({ in: ['STOCK', 'EQUITY'] }) }),
                  { assetType: null },
                ]),
              }),
              expect.objectContaining({ NOT: expect.any(Array) }),
            ]),
          }),
        ]),
      }),
    }));
  });

  it('maps FUTURES segment filtering to explicit future rows and future-like symbols', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocks({
      page: 1,
      pageSize: 10,
      region: 'IN',
      instrumentSegment: 'FUTURES',
    });

    expect(prisma.stock.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ assetType: expect.objectContaining({ in: ['FUTURE', 'FUTURES'] }) }),
              { symbol: { contains: 'FUT', mode: 'insensitive' } },
              { name: { contains: 'future', mode: 'insensitive' } },
            ]),
          }),
        ]),
      }),
    }));
  });

  it('matches INR currency using stored currency or deterministic Indian fallbacks', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocks({
      page: 1,
      pageSize: 25,
      region: 'IN',
      assetType: 'STOCK',
      currency: 'INR',
    });

    const where = prisma.stock.findMany.mock.calls[0][0].where;
    expect(where.AND).toEqual(expect.arrayContaining([
      expect.objectContaining({
        OR: expect.arrayContaining([
          { currency: { equals: 'INR', mode: 'insensitive' } },
          expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { region: 'IN' },
                  { exchange: { in: ['NSE', 'BSE'], mode: 'insensitive' } },
                ]),
              }),
              expect.objectContaining({
                OR: expect.arrayContaining([{ currency: null }, { currency: '' }]),
              }),
            ]),
          }),
        ]),
      }),
    ]));
  });

  it('applies exact status filter and partial sector and industry filters to list and count queries', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocks({
      page: 1,
      pageSize: 25,
      sector: 'fin',
      industry: 'bank',
      dataStatus: 'partial',
    });

    const expectedWhere = expect.objectContaining({
      sector: { contains: 'fin', mode: 'insensitive' },
      industry: { contains: 'bank', mode: 'insensitive' },
      dataStatus: { equals: 'PARTIAL', mode: 'insensitive' },
    });
    expect(prisma.stock.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }));
    expect(prisma.stock.count).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }));
  });

  it('scopes local search by region and asset type', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.searchStocks('reliance', 10, { region: 'IN', assetType: 'STOCK' });

    expect(prisma.stock.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ OR: expect.arrayContaining([{ region: 'IN' }]) }),
              expect.objectContaining({
                AND: expect.arrayContaining([
                  expect.objectContaining({ OR: expect.arrayContaining([expect.objectContaining({ assetType: expect.objectContaining({ in: ['STOCK', 'EQUITY'] }) })]) }),
                  expect.objectContaining({ NOT: expect.any(Array) }),
                ]),
              }),
            ]),
          }),
          expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ symbol: expect.anything() }),
              expect.objectContaining({ name: expect.anything() }),
            ]),
          }),
        ]),
      }),
    }));
  });

  it('applies catalog source, provider support, and derivatives eligible filters', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocks({
      page: 1,
      pageSize: 25,
      region: 'IN',
      catalogSource: 'NSE_EQUITY_SECURITIES',
      providerSupportStatus: 'SUPPORTED',
      derivativesEligible: true,
    });

    expect(prisma.stock.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        catalogSource: { equals: 'NSE_EQUITY_SECURITIES', mode: 'insensitive' },
        providerSupportStatus: { equals: 'SUPPORTED', mode: 'insensitive' },
        AND: expect.arrayContaining([
          expect.objectContaining({
            OR: expect.arrayContaining([
              { derivativesEligible: true },
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({ symbol: expect.objectContaining({ in: expect.arrayContaining(['RELIANCE.NS']) }) }),
                ]),
              }),
            ]),
          }),
        ]),
      }),
    }));
    expect(prisma.stock.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        catalogSource: { equals: 'NSE_EQUITY_SECURITIES', mode: 'insensitive' },
        providerSupportStatus: { equals: 'SUPPORTED', mode: 'insensitive' },
        AND: expect.arrayContaining([
          expect.objectContaining({
            OR: expect.arrayContaining([
              { derivativesEligible: true },
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({ symbol: expect.objectContaining({ in: expect.arrayContaining(['RELIANCE.NS']) }) }),
                ]),
              }),
            ]),
          }),
        ]),
      }),
    }));
  });

  it('excludes unsupported provider symbols from OHLCV sync task selection', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listActiveStockSyncTasks({ region: 'IN', assetType: 'INDEX' }, 25);

    expect(prisma.stock.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 25,
      where: expect.objectContaining({
        isActive: true,
        OR: [
          { providerSupportStatus: null },
          { providerSupportStatus: { in: ['SUPPORTED', 'UNKNOWN'], mode: 'insensitive' } },
        ],
      }),
    }));
  });

  it('matches catalog upserts against existing provider-style and base symbols', async () => {
    const update = jest.fn().mockImplementation(({ data }) => Promise.resolve(data));
    const prisma = {
      stock: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'stock-1',
          symbol: 'ABB.NS',
          name: 'ABB India',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          currency: 'INR',
          assetType: 'STOCK',
          instrumentSegment: 'CASH',
          derivativesEligible: false,
          source: 'database',
          dataStatus: 'PARTIAL',
        }),
        update,
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const result = await repository.upsertCatalogInstrument({
      symbol: 'ABB.NS',
      sourceSymbol: 'ABB',
      providerSymbol: 'ABB.NS',
      displaySymbol: 'ABB',
      name: 'ABB India',
      region: 'IN',
      exchange: 'NSE',
      assetType: 'STOCK',
      instrumentSegment: 'CASH',
      derivativesEligible: true,
      catalogSource: 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
    });

    expect(prisma.stock.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          expect.objectContaining({ symbol: expect.objectContaining({ in: expect.arrayContaining(['ABB.NS', 'ABB']) }) }),
          { providerSymbol: { equals: 'ABB.NS', mode: 'insensitive' } },
          { sourceSymbol: { equals: 'ABB', mode: 'insensitive' } },
        ]),
      }),
    }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'stock-1' },
      data: expect.objectContaining({
        derivativesEligible: true,
        catalogSource: 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
      }),
    }));
    expect(result.action).toBe('updated');
  });

  it('falls back to exact NSE company name matching to backfill legacy rows', async () => {
    const update = jest.fn().mockImplementation(({ data }) => Promise.resolve(data));
    const prisma = {
      stock: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'stock-legacy',
          symbol: 'ABB',
          name: 'ABB India Limited',
          region: 'IN',
          exchange: 'NSE',
          country: null,
          currency: null,
          assetType: null,
          instrumentSegment: null,
          source: 'database',
          dataStatus: 'PARTIAL',
        }),
        update,
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const result = await repository.upsertCatalogInstrument({
      symbol: 'ABB.NS',
      sourceSymbol: 'ABB',
      providerSymbol: 'ABB.NS',
      displaySymbol: 'ABB',
      name: 'ABB India Limited',
      region: 'IN',
      exchange: 'NSE',
      country: 'India',
      currency: 'INR',
      assetType: 'STOCK',
      instrumentSegment: 'CASH',
      catalogSource: 'NSE_EQUITY_SECURITIES',
    });

    expect(prisma.stock.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          expect.objectContaining({
            AND: expect.arrayContaining([
              { name: { equals: 'ABB India Limited', mode: 'insensitive' } },
              { region: 'IN' },
              { OR: [{ exchange: { equals: 'NSE', mode: 'insensitive' } }, { exchange: null }] },
            ]),
          }),
        ]),
      }),
    }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'stock-legacy' },
      data: expect.objectContaining({
        providerSymbol: 'ABB.NS',
        sourceSymbol: 'ABB',
        displaySymbol: 'ABB',
        country: 'India',
        currency: 'INR',
        assetType: 'STOCK',
        instrumentSegment: 'CASH',
        catalogSource: 'NSE_EQUITY_SECURITIES',
      }),
    }));
    expect(result.action).toBe('updated');
  });

  it('does not rewrite identical daily candles', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const latestPriceUpsert = jest.fn().mockResolvedValue({});
    const prisma = {
      priceTick: {
        findMany: jest.fn().mockResolvedValue([
          {
            timestamp: new Date('2025-01-01T00:00:00.000Z'),
            open: 100,
            high: 110,
            low: 95,
            close: 105,
            adjustedClose: null,
            volume: BigInt(10),
          },
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
    ], () => ({ region: 'US', exchange: 'NASDAQ' }));

    expect(upsert).not.toHaveBeenCalled();
    expect(latestPriceUpsert).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({
      rowsReceived: 1,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsNoOp: 1,
    });
  });

  it('updates changed daily candle values', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const latestPriceUpsert = jest.fn().mockResolvedValue({});
    const prisma = {
      priceTick: {
        findMany: jest.fn().mockResolvedValue([
          {
            timestamp: new Date('2025-01-01T00:00:00.000Z'),
            open: 100,
            high: 110,
            low: 95,
            close: 104,
            adjustedClose: null,
            volume: BigInt(10),
          },
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
    ], () => ({ region: 'US', exchange: 'NASDAQ' }));

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0].update.close.toString()).toBe('105');
    expect(summary).toMatchObject({
      rowsReceived: 1,
      rowsInserted: 0,
      rowsUpdated: 1,
      rowsNoOp: 0,
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

  it('preserves existing non-null metadata when provider update has nulls', async () => {
    const update = jest.fn().mockImplementation(({ data }) => Promise.resolve(data));
    const prisma = {
      stock: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'stock-1',
          name: 'Reliance Industries',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          sector: 'Energy',
          industry: 'Oil & Gas',
          currency: 'INR',
          marketCap: '1000',
          assetType: 'STOCK',
          isDelisted: false,
          ipoDate: null,
          isin: 'INE002A01018',
        }),
        update,
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.updateCompanyMasterData('stock-1', {
      name: 'Reliance Industries Limited',
      country: null,
      sector: null,
      industry: null,
      currency: null,
      marketCap: null,
      assetType: null,
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'Reliance Industries Limited',
        country: 'India',
        sector: 'Energy',
        industry: 'Oil & Gas',
        currency: 'INR',
        assetType: 'STOCK',
      }),
    }));
  });
});
