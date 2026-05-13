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
        source: 'nse_cm_udiff_bhavcopy',
      },
    ], () => ({ region: 'US', exchange: 'NASDAQ' }));

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls.map((call) => call[0].create.source)).toEqual(
      expect.arrayContaining(['yahoo', 'nse_cm_udiff_bhavcopy'])
    );
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

  it('updates source provenance when a fallback source confirms an existing candle', async () => {
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
            source: 'yahoo',
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
        source: 'nse_cm_udiff_bhavcopy',
      },
    ], () => ({ region: 'US', exchange: 'NASDAQ' }));

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0].update.source).toBe('nse_cm_udiff_bhavcopy');
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

  it('summarizes price readiness stats by symbol for universe classification', async () => {
    const latestTimestamp = new Date('2026-05-08T00:00:00.000Z');
    const qualityRows = Array.from({ length: 252 }).map((_, index) => ({
      timestamp: new Date(Date.UTC(2026, 4, 8 - index)),
      volume: BigInt(index < 250 ? 1000 : 0),
      adjustedClose: index < 251 ? '100' : null,
      close: '100',
    }));
    const prisma = {
      priceTick: {
        groupBy: jest.fn().mockResolvedValue([
          { symbol: 'READY.NS', _count: { _all: 252 }, _max: { timestamp: latestTimestamp } },
        ]),
        findMany: jest.fn()
          .mockResolvedValueOnce([
            { symbol: 'READY.NS', timestamp: latestTimestamp, volume: BigInt(1000), adjustedClose: '100', close: '100' },
          ])
          .mockResolvedValueOnce(qualityRows),
      },
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const result = await repository.priceReadinessStatsForSymbols(['READY.NS', 'CATALOG.NS']);

    expect(result.get('READY.NS')).toMatchObject({
      priceHistoryBars: 252,
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
});
