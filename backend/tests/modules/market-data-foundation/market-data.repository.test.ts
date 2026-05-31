/// <reference types="@types/jest" />
import { MarketDataFoundationRepository } from '../../../src/modules/market-data-foundation';

describe('MarketDataFoundationRepository', () => {
  it('upserts source file imports by source, segment, trading date, and file hash', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'import-1' });
    const prisma = {
      sourceFileImport: { upsert },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await (repository as any).upsertSourceFileImport({
      source: 'NSE',
      segment: 'CM',
      tradingDate: new Date('2026-05-27T00:00:00.000Z'),
      fileName: 'BhavCopy_NSE_CM_0_0_0_20260527_F_0000.csv.zip',
      fileUrl: 'https://archives.nseindia.com/test.zip',
      fileHash: 'sha256:test',
      fileSize: 1234,
      status: 'COMPLETED',
      rowsRaw: 2613,
      rowsAccepted: 2600,
      rowsRejected: 13,
      parserVersion: 'nse-cm-udiff-v1',
    });

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        source_segment_tradingDate_fileHash: {
          source: 'NSE',
          segment: 'CM',
          tradingDate: new Date('2026-05-27T00:00:00.000Z'),
          fileHash: 'sha256:test',
        },
      },
      create: expect.objectContaining({
        source: 'NSE',
        segment: 'CM',
        fileName: 'BhavCopy_NSE_CM_0_0_0_20260527_F_0000.csv.zip',
      }),
      update: expect.objectContaining({
        status: 'COMPLETED',
        rowsAccepted: 2600,
      }),
    }));
  });

  it('finds source file imports by source, segment, trading date, and file hash before duplicate processing', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'import-1', status: 'COMPLETED' });
    const prisma = {
      sourceFileImport: { findUnique },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const row = await (repository as any).findSourceFileImportByKey({
      source: 'NSE',
      segment: 'CM',
      tradingDate: new Date('2026-05-27T00:00:00.000Z'),
      fileHash: 'sha256:test',
    });

    expect(row).toMatchObject({ id: 'import-1', status: 'COMPLETED' });
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        source_segment_tradingDate_fileHash: {
          source: 'NSE',
          segment: 'CM',
          tradingDate: new Date('2026-05-27T00:00:00.000Z'),
          fileHash: 'sha256:test',
        },
      },
    });
  });

  it('stores exchange-file candles with source file provenance in bulk', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const upsert = jest.fn().mockResolvedValue({});
    const prisma = {
      priceTick: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany,
      },
      latestPrice: { upsert },
      $transaction: jest.fn(async (callback: any): Promise<any> => callback(prisma)),
    } as any;
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.storeHistoricalBulk(
      [{
        symbol: 'RELIANCE',
        date: new Date('2026-05-27T00:00:00.000Z'),
        open: 1400,
        high: 1420,
        low: 1390,
        close: 1410,
        volume: 1000,
        source: 'NSE_UDIFF_CM_BHAVCOPY',
      }],
      () => ({ region: 'IN', exchange: 'NSE' }),
      new Map(),
      { sourceFileImportId: 'import-1' }
    );

    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [
        expect.objectContaining({
          symbol: 'RELIANCE',
          source: 'NSE_UDIFF_CM_BHAVCOPY',
          sourceFileImportId: 'import-1',
        }),
      ],
    }));
  });

  it('loads exchange identities by explicit BSE exchange symbols or security codes', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'identity-1', exchange: 'BSE', exchangeSymbol: '500325', securityCode: '500325', stock: { id: 'stock-1', symbol: 'RELIANCE' } },
    ]);
    const prisma = {
      instrumentExchangeIdentity: { findMany },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const rows = await (repository as any).findExchangeIdentitiesForExchangeSymbols('BSE', ['500325', 'NO_MATCH']);

    expect(rows).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        exchange: 'BSE',
        OR: expect.arrayContaining([
          { exchangeSymbol: { in: ['500325', 'NO_MATCH'], mode: 'insensitive' } },
          { securityCode: { in: ['500325', 'NO_MATCH'], mode: 'insensitive' } },
          { securityId: { in: ['500325', 'NO_MATCH'], mode: 'insensitive' } },
        ]),
      }),
      include: expect.objectContaining({
        stock: expect.objectContaining({
          select: expect.objectContaining({ id: true, symbol: true }),
        }),
      }),
    }));
  });

  it('filters BSE backup candles when an NSE primary candle already exists for the stock/date', async () => {
    const prisma = {
      priceTick: {
        findMany: jest.fn().mockResolvedValue([
          { symbol: 'RELIANCE', timestamp: new Date('2026-05-27T00:00:00.000Z') },
        ]),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const result = await (repository as any).filterPricesMissingPrimaryExchangeCandles([
      { symbol: 'RELIANCE', date: new Date('2026-05-27T00:00:00.000Z'), open: 1, high: 2, low: 1, close: 2, source: 'BSE_UDIFF_CM_BHAVCOPY' },
      { symbol: 'TCS', date: new Date('2026-05-27T00:00:00.000Z'), open: 1, high: 2, low: 1, close: 2, source: 'BSE_UDIFF_CM_BHAVCOPY' },
    ], 'NSE');

    expect(result.map((price: any) => price.symbol)).toEqual(['TCS']);
    expect(prisma.priceTick.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        symbol: { in: ['RELIANCE', 'TCS'] },
        timestamp: { in: [new Date('2026-05-27T00:00:00.000Z')] },
      }),
    }));
  });

  it('loads index instruments by official source/display names for index EOD imports', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'idx-1', symbol: '^NSEI', sourceSymbol: 'NIFTY 50', displaySymbol: 'NIFTY 50', name: 'NIFTY 50' },
    ]);
    const prisma = {
      stock: { findMany },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const rows = await (repository as any).findIndexStocksBySourceSymbols(['NIFTY 50', 'NIFTY IT']);

    expect(rows).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        region: 'IN',
        assetType: 'INDEX',
        OR: expect.arrayContaining([
          { sourceSymbol: { in: ['NIFTY 50', 'NIFTY IT'], mode: 'insensitive' } },
          { displaySymbol: { in: ['NIFTY 50', 'NIFTY IT'], mode: 'insensitive' } },
          { name: { in: ['NIFTY 50', 'NIFTY IT'], mode: 'insensitive' } },
        ]),
      }),
    }));
  });

  it('counts provider-sourced market data rows before cleanup without deleting user-owned data', async () => {
    const prisma = {
      priceTick: { count: jest.fn().mockResolvedValue(2) },
      fundamental: { count: jest.fn().mockResolvedValue(1) },
      corporateAction: { count: jest.fn().mockResolvedValue(1) },
      fxRate: { count: jest.fn().mockResolvedValue(1) },
      marketDataRepairAttempt: { count: jest.fn().mockResolvedValue(3) },
      marketDataRepairState: { count: jest.fn().mockResolvedValue(4) },
      latestPrice: { count: jest.fn().mockResolvedValue(5) },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const report = await (repository as any).providerDataCleanupReport();

    expect(report).toMatchObject({
      dryRun: true,
      providerSources: expect.arrayContaining(['yahoo', 'yfinance', 'angel_one']),
      counts: {
        priceTicks: 2,
        fundamentals: 1,
        corporateActions: 1,
        fxRates: 1,
        repairAttempts: 3,
        repairStates: 4,
        latestPricesWithoutExchangeCandles: 5,
      },
    });
    expect(prisma.priceTick.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        source: expect.objectContaining({ in: expect.arrayContaining(['yahoo', 'angel_one']) }),
      }),
    }));
    expect((prisma as any).stock?.deleteMany).toBeUndefined();
  });

  it('executes provider cleanup and rebuilds latest prices only from exchange candles', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const count = jest.fn().mockResolvedValue(0);
    const latestRows = [
      { symbol: 'RELIANCE', region: 'IN', timestamp: new Date('2026-05-27T00:00:00.000Z'), close: 1430 },
    ];
    const executeRaw = jest.fn().mockResolvedValue(2);
    const prisma = {
      priceTick: { count, deleteMany },
      fundamental: { count, deleteMany },
      corporateAction: { count, deleteMany },
      fxRate: { count, deleteMany },
      marketDataRepairAttempt: { count, deleteMany },
      marketDataRepairState: { count, deleteMany },
      latestPrice: {
        count,
        deleteMany,
        upsert: jest.fn().mockResolvedValue({}),
      },
      $queryRaw: jest.fn().mockResolvedValueOnce([{ count: 0 }]).mockResolvedValueOnce(latestRows),
      $executeRaw: executeRaw,
      $transaction: jest.fn(async (callback: any): Promise<any> => callback(prisma)),
    } as any;
    const repository = new MarketDataFoundationRepository(prisma as any);

    const result = await (repository as any).executeProviderDataCleanup();

    expect(result.dryRun).toBe(false);
    expect(prisma.priceTick.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ source: expect.objectContaining({ in: expect.arrayContaining(['yahoo', 'angel_one']) }) }),
    }));
    expect(prisma.latestPrice.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { symbol: 'RELIANCE' },
      update: expect.objectContaining({
        region: 'IN',
        price: expect.anything(),
        timestamp: new Date('2026-05-27T00:00:00.000Z'),
      }),
    }));
    expect(executeRaw).toHaveBeenCalled();
  });

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
                  expect.objectContaining({ symbol: expect.anything() }),
                  expect.objectContaining({ name: expect.anything() }),
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

  it('stores historical prices with bulk insert/update summary and duplicate prevention', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const update = jest.fn().mockResolvedValue({});
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
        priceTick: { createMany, update },
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
        source: 'nse_cm_udiff_bhavcopy',
      },
    ], () => ({ region: 'US', exchange: 'NASDAQ' }));

    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0][0].skipDuplicates).toBe(true);
    expect(createMany.mock.calls[0][0].data).toHaveLength(1);
    expect(createMany.mock.calls[0][0].data[0].source).toBe('nse_cm_udiff_bhavcopy');
    expect(createMany.mock.calls[0][0].data[0].timestamp).toEqual(new Date('2025-01-02T00:00:00.000Z'));
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].where.symbol_timestamp.timestamp).toEqual(new Date('2025-01-01T00:00:00.000Z'));
    expect(update.mock.calls[0][0].data.source).toBe('yahoo');
    expect(summary).toMatchObject({
      rowsReceived: 2,
      rowsInserted: 1,
      rowsUpdated: 1,
      rowsSkipped: 0,
    });
  });

  it('stores multi-symbol official EOD rows in one bulk pass with per-symbol summaries', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const update = jest.fn().mockResolvedValue({});
    const latestPriceUpsert = jest.fn().mockResolvedValue({});
    const prisma = {
      priceTick: {
        findMany: jest.fn().mockResolvedValue([
          {
            symbol: 'TCS',
            timestamp: new Date('2026-05-18T00:00:00.000Z'),
            open: 200,
            high: 210,
            low: 190,
            close: 205,
            adjustedClose: null,
            volume: BigInt(1000),
            source: 'yahoo',
          },
        ]),
      },
      latestPrice: {
        upsert: latestPriceUpsert,
      },
      $transaction: jest.fn(async (callback: any): Promise<any> => callback({
        priceTick: { createMany, update },
        latestPrice: { upsert: latestPriceUpsert },
      })),
    } as any;
    const repository = new MarketDataFoundationRepository(prisma as any);

    const summary = await repository.storeHistoricalBulk([
      {
        symbol: 'RELIANCE',
        date: new Date('2026-05-18T00:00:00.000Z'),
        open: 100,
        high: 110,
        low: 95,
        close: 108,
        volume: 1000,
        source: 'NSE_SECURITY_BHAVDATA',
      },
      {
        symbol: 'TCS',
        date: new Date('2026-05-18T12:30:00.000Z'),
        open: 200,
        high: 220,
        low: 195,
        close: 218,
        volume: 2000,
        source: 'NSE_SECURITY_BHAVDATA',
      },
    ], () => ({ region: 'US', exchange: 'NASDAQ' }), new Map([
      ['RELIANCE', { region: 'IN', exchange: 'NSE' }],
      ['TCS', { region: 'IN', exchange: 'NSE' }],
    ]));

    expect(prisma.priceTick.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        symbol: { in: ['RELIANCE', 'TCS'] },
      }),
    }));
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0][0].data).toEqual([
      expect.objectContaining({
        symbol: 'RELIANCE',
        region: 'IN',
        exchange: 'NSE',
        timestamp: new Date('2026-05-18T00:00:00.000Z'),
        source: 'NSE_SECURITY_BHAVDATA',
      }),
    ]);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].where.symbol_timestamp).toEqual({
      symbol: 'TCS',
      timestamp: new Date('2026-05-18T00:00:00.000Z'),
    });
    expect(update.mock.calls[0][0].data).toEqual(expect.objectContaining({
      region: 'IN',
      exchange: 'NSE',
      source: 'NSE_SECURITY_BHAVDATA',
    }));
    expect(latestPriceUpsert).toHaveBeenCalledTimes(2);
    expect(summary).toMatchObject({
      rowsReceived: 2,
      rowsInserted: 1,
      rowsUpdated: 1,
      rowsNoOp: 0,
    });
    expect(summary.summaryBySymbol.get('RELIANCE')).toMatchObject({
      rowsReceived: 1,
      rowsInserted: 1,
      rowsUpdated: 0,
    });
    expect(summary.summaryBySymbol.get('TCS')).toMatchObject({
      rowsReceived: 1,
      rowsInserted: 0,
      rowsUpdated: 1,
    });
  });

  it('updates source provenance when a fallback source confirms an existing candle', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 0 });
    const update = jest.fn().mockResolvedValue({});
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
            source: 'yahoo',
          },
        ]),
      },
      latestPrice: {
        upsert: latestPriceUpsert,
      },
      $transaction: jest.fn(async (callback: any): Promise<any> => callback({
        priceTick: { createMany, update },
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
        source: 'nse_cm_udiff_bhavcopy',
      },
    ], () => ({ region: 'US', exchange: 'NASDAQ' }));

    expect(createMany).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].data.source).toBe('nse_cm_udiff_bhavcopy');
    expect(summary).toMatchObject({
      rowsReceived: 1,
      rowsInserted: 0,
      rowsUpdated: 1,
      rowsNoOp: 0,
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

  it('uses STOCK-compatible filters for universe health including legacy EQUITY and null stock rows', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocksForUniverseHealth({ region: 'IN', assetType: 'STOCK' });

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
            ]),
          }),
        ]),
      }),
      orderBy: { symbol: 'asc' },
    }));
  });

  it('does not exclude cash equities just because the symbol or name contains future-like text', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocksForUniverseHealth({ region: 'IN', assetType: 'STOCK' });

    const where = JSON.stringify(prisma.stock.findMany.mock.calls[0][0].where);
    expect(where).not.toContain('"contains":"FUT"');
    expect(where).not.toContain('"contains":"future"');
    expect(where).toContain('"assetType":{"in":["FUTURE","FUTURES"]');
    expect(where).toContain('"instrumentSegment":{"equals":"FUTURES"');
  });

  it('uses a set-based timestamp query for scoped latest data timestamp', async () => {
    const latestDate = new Date('2026-05-12T00:00:00.000Z');
    const prisma = {
      stock: {
        findMany: jest.fn(),
      },
      priceTick: {
        findFirst: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ timestamp: latestDate }]),
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const result = await repository.latestDataTimestamp({ region: 'IN', assetType: 'STOCK' });

    expect(result).toBe(latestDate);
    expect(prisma.stock.findMany).not.toHaveBeenCalled();
    expect(prisma.priceTick.findFirst).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const query = prisma.$queryRaw.mock.calls[0][0];
    expect(query.text).toContain('MAX(price_ticks.timestamp)');
    expect(query.text).toContain('INNER JOIN stocks ON stocks.symbol = price_ticks.symbol');
    expect(query.text).toContain('UPPER(stocks."assetType") IN');
    expect(query.text).toContain('stocks."assetType" IS NULL');
    expect(query.text).toContain('stocks."instrumentSegment"');
    expect(query.text).not.toContain('stocks.symbol ILIKE');
    expect(query.text).not.toContain('stocks.name ILIKE');
  });

  it('derives latest stored trading date from the set-based timestamp query', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn(),
      },
      priceTick: {
        findFirst: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ timestamp: new Date('2026-05-12T00:00:00.000Z') }]),
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await expect(repository.latestStoredTradingDateForRegion('IN', 'STOCK')).resolves.toBe('2026-05-12');
    expect(prisma.stock.findMany).not.toHaveBeenCalled();
    expect(prisma.priceTick.findFirst).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('selects active stale sync tasks by per-symbol latest stored candle', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id: 'stock-1',
          symbol: 'STALE.NS',
          exchange: 'NSE',
          providerSymbol: 'STALE.NS',
          sourceSymbol: 'STALE',
          displaySymbol: 'STALE',
          lastSuccessfulDataLoadTimestamp: new Date('2026-05-17T00:00:00.000Z'),
          latestStoredTimestamp: new Date('2026-05-16T00:00:00.000Z'),
        },
      ]),
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const result = await repository.listStaleActiveStockSyncTasks(
      { region: 'IN', assetType: 'STOCK' },
      '2026-05-18',
      25,
      ['done-stock']
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      symbol: 'STALE.NS',
      exchange: 'NSE',
      sourceSymbol: 'STALE',
      displaySymbol: 'STALE',
      latestStoredTimestamp: new Date('2026-05-16T00:00:00.000Z'),
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const query = prisma.$queryRaw.mock.calls[0][0];
    expect(query.text).toContain('MAX(price_ticks.timestamp)');
    expect(query.text).toContain('stocks."isActive" = TRUE');
    expect(query.text).toContain('stocks."providerSupportStatus"');
    expect(query.text).toContain('stocks.exchange');
    expect(query.text).toContain('"latestStoredTimestamp" IS NULL OR "latestStoredTimestamp" <');
    expect(query.text).toContain('stocks.id NOT IN');
    expect(query.text).toContain('LIMIT');
  });

  it('counts active stale sync tasks by per-symbol latest stored candle', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ count: 42 }]),
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await expect(repository.countStaleActiveStockSyncTasks({ region: 'IN', assetType: 'STOCK' }, '2026-05-18')).resolves.toBe(42);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const query = prisma.$queryRaw.mock.calls[0][0];
    expect(query.text).toContain('COUNT(*)::int AS count');
    expect(query.text).toContain('MAX(price_ticks.timestamp)');
    expect(query.text).toContain('"latestStoredTimestamp" IS NULL OR "latestStoredTimestamp" <');
  });

  it('groups repair states by stock id for trusted baseline classification', async () => {
    const prisma = {
      marketDataRepairState: {
        findMany: jest.fn().mockResolvedValue([
          { stockId: 'stock-1', repairType: 'PRICE_BACKFILL', status: 'MANUAL_REQUIRED' },
          { stockId: 'stock-1', repairType: 'PROVIDER_VALIDATION', status: 'RETRY_COOLDOWN' },
          { stockId: 'stock-2', repairType: 'CATALOG_IDENTITY', status: 'MANUAL_REQUIRED' },
        ]),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const result = await repository.listRepairStatesForStocks(['stock-1', 'stock-2'], {
      region: 'IN',
      assetType: 'STOCK',
      repairTypes: ['PRICE_BACKFILL', 'PROVIDER_VALIDATION', 'CATALOG_IDENTITY'],
    });

    expect(prisma.marketDataRepairState.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        stockId: { in: ['stock-1', 'stock-2'] },
        region: 'IN',
        assetType: 'STOCK',
      }),
    }));
    expect(result.get('stock-1')).toHaveLength(2);
    expect(result.get('stock-2')).toHaveLength(1);
  });

  it('summarizes price readiness stats by symbol for universe classification', async () => {
    const firstTimestamp = new Date('2025-09-01T00:00:00.000Z');
    const latestTimestamp = new Date('2026-05-08T00:00:00.000Z');
    const readinessRows = [{
      symbol: 'READY.NS',
      priceHistoryBars: 3800,
      firstTimestamp,
      latestTimestamp,
      latestVolume: BigInt(1000),
      latestAdjustedClose: '100',
      latestClose: '100',
      rollingWindowBars: 252,
      volumeRows: 250,
      adjustedCloseRows: 251,
      maxPriceGapDays: 1,
    }];
    const prisma = {
      priceTick: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue(readinessRows),
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const result = await repository.priceReadinessStatsForSymbols(['READY.NS', 'CATALOG.NS']);

    expect(result.get('READY.NS')).toMatchObject({
      priceHistoryBars: 3800,
      latestPriceDate: '2026-05-08',
      latestVolume: BigInt(1000),
      rollingWindowBars: 252,
      rollingWindowCoveragePercent: 100,
      recentVolumeCoveragePercent: 99.2,
      adjustedCloseCoveragePercent: 99.6,
      usesAdjustedCloseFallback: true,
    });
    expect(result.get('CATALOG.NS')).toMatchObject({
      priceHistoryBars: 0,
      latestPriceDate: null,
    });
    expect(prisma.priceTick.groupBy).not.toHaveBeenCalled();
    expect(prisma.priceTick.findMany).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const qualityQuery = prisma.$queryRaw.mock.calls[0][0];
    expect(qualityQuery.text).toContain('COUNT(*)::int AS "priceHistoryBars"');
    expect(qualityQuery.text).toContain('MIN(price_ticks.timestamp) AS "firstTimestamp"');
    expect(qualityQuery.text).toContain('ROW_NUMBER() OVER (ORDER BY sampled.timestamp DESC)');
    expect(qualityQuery.text).toContain('LAG(sampled.timestamp) OVER (ORDER BY sampled.timestamp DESC)');
    expect(qualityQuery.text).toContain('CROSS JOIN LATERAL');
    expect(qualityQuery.text).toContain('FROM price_ticks');
    expect(qualityQuery.text).toContain('LIMIT $3');
    expect(qualityQuery.text).toContain('ORDER BY input_symbols.symbol ASC');
    expect(qualityQuery.values).toEqual(['READY.NS', 'CATALOG.NS', 252]);
  });

  it('skips price readiness queries when no usable symbols are provided', async () => {
    const prisma = {
      priceTick: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const result = await repository.priceReadinessStatsForSymbols(['', null as any, undefined as any]);

    expect(result.size).toBe(0);
    expect(prisma.priceTick.groupBy).not.toHaveBeenCalled();
    expect(prisma.priceTick.findMany).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
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
              expect.objectContaining({
                NOT: expect.arrayContaining([
                  expect.objectContaining({ assetType: expect.objectContaining({ in: ['FUTURE', 'FUTURES'] }) }),
                  expect.objectContaining({ instrumentSegment: expect.objectContaining({ equals: 'FUTURES' }) }),
                ]),
              }),
            ]),
          }),
        ]),
      }),
    }));
  });

  it('maps FUTURES segment filtering to explicit futures rows only', async () => {
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
              { instrumentSegment: { equals: 'FUTURES', mode: 'insensitive' } },
            ]),
          }),
        ]),
      }),
    }));
    const futuresFilter = JSON.stringify(prisma.stock.findMany.mock.calls[0][0].where);
    expect(futuresFilter).not.toContain('"contains":"FUT"');
    expect(futuresFilter).not.toContain('"contains":"future"');
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
      select: expect.objectContaining({
        exchange: true,
        sourceSymbol: true,
        displaySymbol: true,
      }),
      where: expect.objectContaining({
        isActive: true,
        OR: [
          { providerSupportStatus: null },
          { providerSupportStatus: { in: ['SUPPORTED', 'UNKNOWN'], mode: 'insensitive' } },
        ],
      }),
    }));
  });

  it('selects only UNKNOWN provider rows for the default validation queue', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocksForProviderValidation({
      region: 'IN',
      assetType: 'STOCK',
      offset: 0,
      batchSize: 25,
      providerValidationQueue: 'UNKNOWN_FIRST',
    });

    const whereJson = JSON.stringify(prisma.stock.findMany.mock.calls[0][0].where);
    expect(whereJson).toContain('UNKNOWN');
    expect(whereJson).not.toContain('VALIDATION_FAILED');
  });

  it('selects only VALIDATION_FAILED provider rows for the retry queue', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocksForProviderValidation({
      region: 'IN',
      assetType: 'STOCK',
      offset: 0,
      batchSize: 25,
      providerValidationQueue: 'RETRY_FAILED',
    });

    const whereJson = JSON.stringify(prisma.stock.findMany.mock.calls[0][0].where);
    expect(whereJson).toContain('VALIDATION_FAILED');
    expect(whereJson).not.toContain('UNKNOWN');
    expect(whereJson).toContain('PROVIDER_VALIDATION');
    expect(whereJson).toContain('MANUAL_REQUIRED');
    expect(whereJson).toContain('nextRetryAt');
  });

  it('can force retry-failed provider rows past cooldown while still excluding manual-required rows', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocksForProviderValidation({
      region: 'IN',
      assetType: 'STOCK',
      offset: 50,
      batchSize: 25,
      providerValidationQueue: 'RETRY_FAILED',
      force: true,
    });

    const call = prisma.stock.findMany.mock.calls[0][0];
    const whereJson = JSON.stringify(call.where);
    expect(call.skip).toBe(0);
    expect(whereJson).toContain('VALIDATION_FAILED');
    expect(whereJson).toContain('MANUAL_REQUIRED');
    expect(whereJson).not.toContain('lte');
  });

  it('orders legacy combined provider validation as UNKNOWN rows before retry-failed rows', async () => {
    const prisma = {
      stock: {
        count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(1),
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ symbol: 'ZZZ.NS', providerSupportStatus: 'UNKNOWN' }])
          .mockResolvedValueOnce([{ symbol: 'AAA.NS', providerSupportStatus: 'VALIDATION_FAILED' }]),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const result = await repository.listStocksForProviderValidation({
      region: 'IN',
      assetType: 'STOCK',
      offset: 0,
      batchSize: 2,
      includeRetryFailed: true,
    });

    expect(result.stocks.map((stock: any) => stock.providerSupportStatus)).toEqual(['UNKNOWN', 'VALIDATION_FAILED']);
  });

  it('filters catalog metadata backfill by selected catalog source', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocksForCatalogBackfill({
      region: 'IN',
      assetType: 'ETF',
      catalogSource: 'NSE_ETF_SECURITIES',
      offset: 0,
      batchSize: 25,
    });

    const whereJson = JSON.stringify(prisma.stock.findMany.mock.calls[0][0].where);
    expect(whereJson).toContain('NSE_ETF_SECURITIES');
    expect(whereJson).toContain('catalogSource');
    expect(prisma.stock.count).toHaveBeenCalledWith(expect.objectContaining({
      where: prisma.stock.findMany.mock.calls[0][0].where,
    }));
  });

  it('selects provider business metadata repair rows without identity-only gaps', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocksForBusinessMetadataRepair({
      region: 'IN',
      assetType: 'STOCK',
      offset: 0,
      batchSize: 25,
    });

    const whereJson = JSON.stringify(prisma.stock.findMany.mock.calls[0][0].where);
    expect(whereJson).toContain('sector');
    expect(whereJson).toContain('industry');
    expect(whereJson).toContain('marketCap');
    expect(whereJson).not.toContain('isin');
    expect(whereJson).not.toContain('ipoDate');
    expect(whereJson).toContain('marketDataRepairStates');
    expect(whereJson).not.toContain('attemptedAt');
  });

  it('counts current manual-required business metadata states as distinct stocks, not attempts', async () => {
    const prisma = {
      marketDataRepairState: {
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const count = await repository.countBusinessMetadataRepairStates({
      region: 'IN',
      assetType: 'STOCK',
      statuses: ['MANUAL_REQUIRED'],
    });

    expect(count).toBe(1);
    expect(prisma.marketDataRepairState.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        repairType: 'PROVIDER_BUSINESS_METADATA',
        AND: expect.arrayContaining([{ status: { in: ['MANUAL_REQUIRED'] } }]),
      }),
    }));
  });

  it('allows explicit retry of manual-required business metadata state without a 24-hour cutoff', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocksForBusinessMetadataRepair({
      region: 'IN',
      assetType: 'STOCK',
      offset: 0,
      batchSize: 25,
      includeManualRequired: true,
    });

    const whereJson = JSON.stringify(prisma.stock.findMany.mock.calls[0][0].where);
    expect(whereJson).not.toContain('MANUAL_REQUIRED');
    expect(whereJson).not.toContain('RESOLVED');
    expect(whereJson).not.toContain('attemptedAt');
  });

  it('excludes future retryable business metadata failures from the auto queue', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocksForBusinessMetadataRepair({
      region: 'IN',
      assetType: 'STOCK',
      offset: 0,
      batchSize: 25,
    });

    const whereJson = JSON.stringify(prisma.stock.findMany.mock.calls[0][0].where);
    expect(whereJson).toContain('FAILED_RETRYABLE');
    expect(whereJson).toContain('nextRetryAt');
    expect(whereJson).toContain('"nextRetryAt":{"gt"');
    expect(whereJson).not.toContain('"nextRetryAt":{"lte"');
  });

  it('allows forced provider business metadata repair to include manual and retry states', async () => {
    const prisma = {
      stock: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.listStocksForBusinessMetadataRepair({
      region: 'IN',
      assetType: 'STOCK',
      offset: 0,
      batchSize: 25,
      includeManualRequired: true,
      includeRetryable: true,
    });

    const whereJson = JSON.stringify(prisma.stock.findMany.mock.calls[0][0].where);
    expect(whereJson).not.toContain('MANUAL_REQUIRED');
    expect(whereJson).not.toContain('FAILED_RETRYABLE');
    expect(whereJson).not.toContain('RETRY_COOLDOWN');
  });

  it('counts retry-blocked and retry-eligible business metadata states separately', async () => {
    const prisma = {
      marketDataRepairState: {
        count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(3),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);
    const now = new Date('2026-05-12T00:00:00.000Z');

    const blocked = await repository.countBusinessMetadataRepairStates({
      region: 'IN',
      assetType: 'STOCK',
      statuses: ['FAILED_RETRYABLE'],
      retryTiming: 'blocked',
      now,
    });
    const eligible = await repository.countBusinessMetadataRepairStates({
      region: 'IN',
      assetType: 'STOCK',
      statuses: ['FAILED_RETRYABLE'],
      retryTiming: 'eligible',
      now,
    });

    expect(blocked).toBe(2);
    expect(eligible).toBe(3);
    const blockedWhere = JSON.stringify(prisma.marketDataRepairState.count.mock.calls[0][0].where);
    const eligibleWhere = JSON.stringify(prisma.marketDataRepairState.count.mock.calls[1][0].where);
    expect(blockedWhere).toContain('gt');
    expect(eligibleWhere).toContain('lte');
    expect(eligibleWhere).toContain('nextRetryAt');
  });

  it('lists only blocked price-backfill repair states for automatic candidate exclusion', async () => {
    const prisma = {
      marketDataRepairState: {
        findMany: jest.fn().mockResolvedValue([
          { stockId: 'stock-manual' },
          { stockId: 'stock-cooldown' },
          { stockId: 'stock-failed-future' },
        ]),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);
    const now = new Date('2026-05-12T00:00:00.000Z');

    const ids = await repository.listBlockedPriceBackfillStockIds({
      region: 'IN',
      assetType: 'STOCK',
      now,
    });

    expect(ids).toEqual(['stock-manual', 'stock-cooldown', 'stock-failed-future']);
    expect(prisma.marketDataRepairState.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        repairType: 'PRICE_BACKFILL',
        OR: expect.arrayContaining([
          { status: 'MANUAL_REQUIRED' },
          { status: 'RETRY_COOLDOWN' },
          { status: 'FAILED_RETRYABLE', nextRetryAt: { gt: now } },
        ]),
      }),
      select: { stockId: true },
    }));
    const whereJson = JSON.stringify(prisma.marketDataRepairState.findMany.mock.calls[0][0].where);
    expect(whereJson).toContain('SUPPORTED');
    expect(whereJson).toContain('isActive');
    expect(whereJson).toContain('isDelisted');
    expect(whereJson).not.toContain('lte');
  });

  it('lists only manual-required price-backfill blockers when retryable rows are explicitly included', async () => {
    const prisma = {
      marketDataRepairState: {
        findMany: jest.fn().mockResolvedValue([
          { stockId: 'stock-manual' },
        ]),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);
    const now = new Date('2026-05-12T00:00:00.000Z');

    const ids = await repository.listBlockedPriceBackfillStockIds({
      region: 'IN',
      assetType: 'STOCK',
      now,
      includeRetryable: true,
    });

    expect(ids).toEqual(['stock-manual']);
    expect(prisma.marketDataRepairState.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        repairType: 'PRICE_BACKFILL',
        OR: [{ status: 'MANUAL_REQUIRED' }],
      }),
      select: { stockId: true },
    }));
    const whereJson = JSON.stringify(prisma.marketDataRepairState.findMany.mock.calls[0][0].where);
    expect(whereJson).not.toContain('RETRY_COOLDOWN');
    expect(whereJson).not.toContain('FAILED_RETRYABLE');
  });

  it('repairs catalog identity only for the provided stock id', async () => {
    const update = jest.fn().mockImplementation(({ data }) => Promise.resolve(data));
    const prisma = {
      stock: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'stock-intended',
          symbol: 'DUP.NS',
          name: 'Duplicate Limited',
          region: 'IN',
          exchange: 'NSE',
          country: null,
          currency: null,
          assetType: null,
          instrumentSegment: null,
          displaySymbol: null,
          providerSymbol: null,
          sourceSymbol: null,
          catalogSource: null,
          isin: null,
          ipoDate: null,
          source: 'database',
          dataStatus: 'PARTIAL',
        }),
        update,
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const result = await repository.repairCatalogIdentityForStock('stock-intended', {
      symbol: 'DUP.NS',
      sourceSymbol: 'DUP',
      providerSymbol: 'DUP.NS',
      displaySymbol: 'DUP',
      name: 'Duplicate Limited',
      region: 'IN',
      exchange: 'NSE',
      country: 'India',
      currency: 'INR',
      assetType: 'STOCK',
      instrumentSegment: 'CASH',
      catalogSource: 'NSE_EQUITY_SECURITIES',
      isin: 'INEDUP01010',
      ipoDate: new Date('2001-01-01T00:00:00.000Z'),
    });

    expect(prisma.stock.findUnique).toHaveBeenCalledWith({ where: { id: 'stock-intended' } });
    expect('findFirst' in prisma.stock).toBe(false);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'stock-intended' },
      data: expect.objectContaining({
        providerSymbol: 'DUP.NS',
        sourceSymbol: 'DUP',
        isin: 'INEDUP01010',
        ipoDate: new Date('2001-01-01T00:00:00.000Z'),
      }),
    }));
    expect(result.action).toBe('updated');
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
      isin: 'INE117A01022',
      ipoDate: new Date('1999-01-01T00:00:00.000Z'),
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
        isin: 'INE117A01022',
        ipoDate: new Date('1999-01-01T00:00:00.000Z'),
      }),
    }));
    expect(result.action).toBe('updated');
  });

  it('does not rewrite identical daily candles', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 0 });
    const update = jest.fn().mockResolvedValue({});
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
        priceTick: { createMany, update },
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

    expect(createMany).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(latestPriceUpsert).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({
      rowsReceived: 1,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsNoOp: 1,
    });
  });

  it('updates changed daily candle values', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 0 });
    const update = jest.fn().mockResolvedValue({});
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
        priceTick: { createMany, update },
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

    expect(createMany).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].data.close.toString()).toBe('105');
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
    expect(prisma.corporateAction.upsert.mock.calls[0][0].where.naturalKey).toBe('stock-1|dividend|2026-01-02|yahoo|0.25|null');
    expect(prisma.fxRate.upsert).toHaveBeenCalledTimes(1);
  });

  it('deduplicates corporate actions by normalized natural key before upsert', async () => {
    const prisma = {
      corporateAction: { upsert: jest.fn().mockResolvedValue({ id: 'action-1' }) },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.upsertCorporateActions('stock-1', [
      { symbol: 'AAPL', type: 'dividend', date: '2026-01-02T18:15:00.000Z', value: 0.25, amount: 0.25, source: 'yahoo' },
      { symbol: 'AAPL', type: 'dividend', date: '2026-01-02T02:00:00.000Z', value: 0.25, amount: 0.25, currency: 'USD', source: 'yahoo' },
      { symbol: 'AAPL', type: 'dividend', date: '2026-01-02T02:00:00.000Z', value: 0.30, amount: 0.30, currency: 'USD', source: 'yahoo' },
      { symbol: 'AAPL', type: 'split', date: '2026-01-02T02:00:00.000Z', value: '2:1', splitRatio: 2, source: 'yahoo' },
    ]);

    expect(prisma.corporateAction.upsert).toHaveBeenCalledTimes(3);
    expect(prisma.corporateAction.upsert.mock.calls.map((call: any[]) => call[0].where.naturalKey)).toEqual([
      'stock-1|dividend|2026-01-02|yahoo|0.25|null',
      'stock-1|dividend|2026-01-02|yahoo|0.3|null',
      'stock-1|split|2026-01-02|yahoo|null|2',
    ]);
    expect(prisma.corporateAction.upsert.mock.calls[0][0].update.amount.toString()).toBe('0.25');
    expect(prisma.corporateAction.upsert.mock.calls[1][0].update.amount.toString()).toBe('0.3');
  });

  it('deduplicates existing corporate-action rows by normalized date and amount on read', async () => {
    const prisma = {
      corporateAction: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'old-dividend',
            stockId: 'stock-1',
            actionType: 'dividend',
            effectiveDate: new Date('2026-04-27T03:45:00.000Z'),
            amount: 6,
            splitRatio: null,
            source: 'yahoo',
            lastUpdatedTimestamp: new Date('2026-04-28T00:00:00.000Z'),
          },
          {
            id: 'normalized-dividend',
            stockId: 'stock-1',
            actionType: 'dividend',
            effectiveDate: new Date('2026-04-27T00:00:00.000Z'),
            amount: 6,
            splitRatio: null,
            source: 'yahoo',
            lastUpdatedTimestamp: new Date('2026-05-07T00:00:00.000Z'),
          },
          {
            id: 'split',
            stockId: 'stock-1',
            actionType: 'split',
            effectiveDate: new Date('2023-03-02T03:45:00.000Z'),
            amount: null,
            splitRatio: 2,
            source: 'yahoo',
            lastUpdatedTimestamp: new Date('2026-04-28T00:00:00.000Z'),
          },
        ]),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const actions = await repository.listCorporateActions('stock-1');

    expect(actions.map((action: any) => action.id)).toEqual(['normalized-dividend', 'split']);
  });

  it('cleans up existing duplicate corporate-action rows idempotently', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = {
      corporateAction: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'old-dividend',
            stockId: 'stock-1',
            actionType: 'dividend',
            effectiveDate: new Date('2026-04-27T03:45:00.000Z'),
            amount: 6,
            splitRatio: null,
            source: 'yahoo',
            ingestionTimestamp: new Date('2026-04-28T00:00:00.000Z'),
          },
          {
            id: 'normalized-dividend',
            stockId: 'stock-1',
            actionType: 'dividend',
            effectiveDate: new Date('2026-04-27T00:00:00.000Z'),
            amount: 6,
            splitRatio: null,
            source: 'yahoo',
            ingestionTimestamp: new Date('2026-05-03T00:00:00.000Z'),
          },
          {
            id: 'old-split',
            stockId: 'stock-1',
            actionType: 'split',
            effectiveDate: new Date('2023-03-02T03:45:00.000Z'),
            amount: null,
            splitRatio: 2,
            source: 'yahoo',
            ingestionTimestamp: new Date('2026-04-28T00:00:00.000Z'),
          },
          {
            id: 'normalized-split',
            stockId: 'stock-1',
            actionType: 'split',
            effectiveDate: new Date('2023-03-02T00:00:00.000Z'),
            amount: null,
            splitRatio: 2,
            source: 'yahoo',
            ingestionTimestamp: new Date('2026-05-03T00:00:00.000Z'),
          },
        ]),
        deleteMany,
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const summary = await repository.dedupeCorporateActions('stock-1');

    expect(summary).toEqual({ deletedCount: 2, remainingCount: 2 });
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['old-dividend', 'old-split'] } } });
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

  it('keeps market mover returns on a consistent price source family', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    await repository.marketMoversForRange(30, {
      region: 'IN',
      assetType: 'STOCK',
      limit: 5,
      minHistoryBars: 20,
      recentBars: 20,
      latestDateStart: new Date('2026-05-27T00:00:00.000Z'),
      latestDateEnd: new Date('2026-05-28T00:00:00.000Z'),
    });

    const queryArg = prisma.$queryRaw.mock.calls[0][0];
    const queryText = String((queryArg as any).sql || (queryArg as any).text || JSON.stringify(queryArg));
    expect(queryText).toContain('source_family');
    expect(queryText).toContain('latest_prices.source_family = base_prices.source_family');
    expect(queryText).toContain('latest_prices.timestamp >=');
    expect(queryText).toContain('latest_prices.timestamp <');
  });
});
