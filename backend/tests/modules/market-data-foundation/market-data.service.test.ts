/// <reference types="@types/jest" />
import fs from 'fs';
import os from 'os';
import path from 'path';
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
        asset_type: 'STOCK',
        instrument_segment: 'CASH',
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

  it('returns normalized classification and metadata completeness diagnostics', async () => {
    const service = new MarketDataFoundationService({
      listStocks: jest.fn().mockResolvedValue({
        stocks: [
          {
            ...stock,
            symbol: 'RELIANCE.NS',
            name: 'Reliance Industries',
            region: 'IN',
            exchange: 'NSE',
            country: null,
            currency: null,
            sector: null,
            industry: null,
            marketCap: null,
            assetType: 'EQUITY',
          },
          {
            ...stock,
            id: 'index-1',
            symbol: '^NSEI',
            name: 'NIFTY 50',
            assetType: 'INDEX',
          },
          {
            ...stock,
            id: 'future-1',
            symbol: 'NIFTY26MAYFUT',
            name: 'Nifty Future',
            assetType: 'EQUITY',
          },
          {
            ...stock,
            id: 'etf-1',
            symbol: 'NIFTYBEES.NS',
            name: 'Nifty Bees',
            assetType: 'ETF',
          },
        ],
        pagination: { page: 1, pageSize: 25, total: 4, totalPages: 1 },
      }),
    } as any, {} as any);

    const result = await service.listInstruments({ page: 1, pageSize: 25, region: 'IN', assetType: 'STOCK' });

    expect(result.instruments[0]).toMatchObject({
      asset_type: 'STOCK',
      instrument_segment: 'CASH',
      country: 'India',
      currency: 'INR',
      missing_metadata_fields: expect.arrayContaining(['sector', 'industry', 'marketCap']),
      metadata_completeness_score: 67,
    });
    expect(result.instruments.map((item) => [item.asset_type, item.instrument_segment])).toEqual([
      ['STOCK', 'CASH'],
      ['INDEX', 'INDEX'],
      ['FUTURE', 'FUTURES'],
      ['ETF', 'ETF'],
    ]);
  });

  it('imports NSE equity securities as STOCK/CASH with Yahoo provider symbols', async () => {
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'inserted', stock: {} });
    const service = new MarketDataFoundationService({
      upsertCatalogInstrument,
    } as any, {} as any);

    const result = await service.importCatalog({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      csvText: 'SYMBOL,NAME OF COMPANY,SERIES\nRELIANCE,Reliance Industries Limited,EQ\n',
    });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'RELIANCE.NS',
      sourceSymbol: 'RELIANCE',
      providerSymbol: 'RELIANCE.NS',
      displaySymbol: 'RELIANCE',
      exchange: 'NSE',
      country: 'India',
      region: 'IN',
      currency: 'INR',
      assetType: 'STOCK',
      instrumentSegment: 'CASH',
      catalogSource: 'NSE_EQUITY_SECURITIES',
      providerSupportStatus: 'UNKNOWN',
    }));
    expect(result).toMatchObject({
      sourceRows: 1,
      inserted: 1,
      updated: 0,
      noOp: 0,
      invalid: 0,
    });
  });

  it('imports NSE ETF rows with ETF-specific name headers', async () => {
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'inserted', stock: {} });
    const service = new MarketDataFoundationService({
      upsertCatalogInstrument,
    } as any, {} as any);

    const result = await service.importCatalog({
      catalogSource: 'NSE_ETF_SECURITIES',
      csvText: 'SYMBOL,NAME OF THE ETF\nNIFTYBEES,Nippon India ETF Nifty 50 BeES\n',
    });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'NIFTYBEES.NS',
      providerSymbol: 'NIFTYBEES.NS',
      sourceSymbol: 'NIFTYBEES',
      name: 'Nippon India ETF Nifty 50 BeES',
      assetType: 'ETF',
      instrumentSegment: 'ETF',
      catalogSource: 'NSE_ETF_SECURITIES',
    }));
    expect(result).toMatchObject({
      sourceRows: 1,
      inserted: 1,
      invalid: 0,
    });
  });

  it('imports NSE ETF rows with compact NSE archive headers', async () => {
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'inserted', stock: {} });
    const service = new MarketDataFoundationService({
      upsertCatalogInstrument,
    } as any, {} as any);

    const result = await service.importCatalog({
      catalogSource: 'NSE_ETF_SECURITIES',
      csvText: 'Symbol,Underlying,SecurityName,DateofListing,MarketLot,ISINNumber,FaceValue\nNIFTYBEES,Nifty50,NIPINDETFNIFTYBEES,08-Jan-02,1,INF204KB14I2,1\n',
    });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'NIFTYBEES.NS',
      providerSymbol: 'NIFTYBEES.NS',
      sourceSymbol: 'NIFTYBEES',
      name: 'NIPINDETFNIFTYBEES',
      assetType: 'ETF',
      instrumentSegment: 'ETF',
      catalogSource: 'NSE_ETF_SECURITIES',
      isin: 'INF204KB14I2',
      ipoDate: expect.any(Date),
    }));
    expect(result).toMatchObject({
      sourceRows: 1,
      inserted: 1,
      invalid: 0,
    });
  });

  it('imports configured URL CSV, reports download metadata, and deletes the temp file', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdf-catalog-'));
    const originalEnv = { ...process.env };
    const csv = 'SYMBOL,NAME OF COMPANY,SERIES\nABB,ABB India,EQ\n';
    const bytes = Buffer.from(csv);
    (global.fetch as jest.Mock | undefined) = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (name: string) => name.toLowerCase() === 'content-length' ? String(bytes.length) : null },
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
    process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL = 'https://example.com/nse.csv';
    process.env.MARKET_DATA_CATALOG_TEMP_DIR = tempDir;
    process.env.MARKET_DATA_CATALOG_MAX_DOWNLOAD_MB = '1';
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'inserted', stock: {} });
    const service = new MarketDataFoundationService({ upsertCatalogInstrument } as any, {} as any);

    const result = await service.importCatalog({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
      batchSize: 100,
    });

    expect(global.fetch).toHaveBeenCalledWith('https://example.com/nse.csv', expect.any(Object));
    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'ABB.NS' }));
    expect(result).toMatchObject({
      importMode: 'CONFIGURED_URL',
      downloaded: true,
      fileSizeBytes: Buffer.byteLength(csv),
      tempFileDeleted: true,
      inserted: 1,
      processedCount: 1,
      totalCount: 1,
      hasMore: false,
    });
    expect(fs.readdirSync(tempDir)).toHaveLength(0);
    process.env = originalEnv;
  });

  it('deletes downloaded temp file when parser validation fails', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdf-catalog-bad-'));
    const originalEnv = { ...process.env };
    const csv = 'BAD,HEADER\nx,y\n';
    const bytes = Buffer.from(csv);
    (global.fetch as jest.Mock | undefined) = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => String(bytes.length) },
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
    process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL = 'https://example.com/bad.csv';
    process.env.MARKET_DATA_CATALOG_TEMP_DIR = tempDir;
    const service = new MarketDataFoundationService({ upsertCatalogInstrument: jest.fn() } as any, {} as any);

    await expect(service.importCatalog({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
    })).rejects.toThrow('CSV format did not match expected NSE_EQUITY_SECURITIES columns');

    expect(fs.readdirSync(tempDir)).toHaveLength(0);
    process.env = originalEnv;
  });

  it('rejects unsafe configured catalog URLs and returns setup hints for sources without URLs', async () => {
    const originalEnv = { ...process.env };
    const service = new MarketDataFoundationService({} as any, {} as any);

    await expect(service.importCatalog({
      catalogSource: 'BSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
    })).rejects.toThrow('Set MARKET_DATA_CATALOG_BSE_EQUITY_URL');

    process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL = 'http://example.com/nse.csv';
    await expect(service.importCatalog({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
    })).rejects.toThrow('must use https');

    process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL = 'https://localhost/nse.csv';
    await expect(service.importCatalog({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
    })).rejects.toThrow('host is not allowed');

    process.env = originalEnv;
  });

  it('rejects oversized configured catalog downloads', async () => {
    const originalEnv = { ...process.env };
    (global.fetch as jest.Mock | undefined) = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => String(2 * 1024 * 1024) },
      arrayBuffer: async () => Buffer.from('').buffer,
    });
    process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL = 'https://example.com/large.csv';
    process.env.MARKET_DATA_CATALOG_MAX_DOWNLOAD_MB = '1';
    const service = new MarketDataFoundationService({} as any, {} as any);

    await expect(service.importCatalog({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
    })).rejects.toThrow('exceeds max size');

    process.env = originalEnv;
  });

  it('returns a clear error when configured catalog download times out', async () => {
    const originalEnv = { ...process.env };
    const timeoutError = new Error('aborted');
    timeoutError.name = 'AbortError';
    (global.fetch as jest.Mock | undefined) = jest.fn().mockRejectedValue(timeoutError);
    process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL = 'https://example.com/slow.csv';
    const service = new MarketDataFoundationService({} as any, {} as any);

    await expect(service.importCatalog({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
    })).rejects.toThrow('Download timed out for catalog source NSE_EQUITY_SECURITIES');

    process.env = originalEnv;
  });

  it('lists configured catalog sources without exposing raw URLs', () => {
    const originalEnv = { ...process.env };
    process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL = 'https://example.com/nse.csv';
    const service = new MarketDataFoundationService({} as any, {} as any);

    expect(service.listCatalogSources().sources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        catalogSource: 'NSE_EQUITY_SECURITIES',
        displayName: 'NSE Equity Securities',
        urlConfigured: true,
        urlSource: 'ENV',
        importModes: ['CONFIGURED_URL', 'MANUAL_CSV'],
      }),
      expect.objectContaining({
        catalogSource: 'NSE_ETF_SECURITIES',
        displayName: 'NSE ETF Securities',
        urlConfigured: true,
        urlSource: 'DEFAULT',
        importModes: ['CONFIGURED_URL', 'MANUAL_CSV'],
      }),
      expect.objectContaining({
        catalogSource: 'NSE_INDEX_SEED',
        displayName: 'NSE/BSE Index Seed',
        urlConfigured: false,
        urlSource: 'INTERNAL_SEED',
        supportsInternalSeed: true,
        importModes: ['INTERNAL_SEED'],
      }),
    ]));
    expect(JSON.stringify(service.listCatalogSources())).not.toContain('https://example.com/nse.csv');
    process.env = originalEnv;
  });

  it('ships default configured URLs for NSE equity and ETF sources', () => {
    const originalEnv = { ...process.env };
    delete process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL;
    delete process.env.MARKET_DATA_CATALOG_NSE_ETF_URL;
    const service = new MarketDataFoundationService({} as any, {} as any);

    expect(service.listCatalogSources().sources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        catalogSource: 'NSE_EQUITY_SECURITIES',
        urlConfigured: true,
        urlSource: 'DEFAULT',
        supportsConfiguredUrl: true,
      }),
      expect.objectContaining({
        catalogSource: 'NSE_ETF_SECURITIES',
        urlConfigured: true,
        urlSource: 'DEFAULT',
        supportsConfiguredUrl: true,
      }),
    ]));

    process.env = originalEnv;
  });

  it('normalizes NSE and BSE catalog symbols into source and provider symbols', () => {
    const service = new MarketDataFoundationService({} as any, {} as any);

    expect(service.normalizeCatalogSymbol({ symbol: 'ABB', exchange: 'NSE' })).toEqual({
      sourceSymbol: 'ABB',
      providerSymbol: 'ABB.NS',
      displaySymbol: 'ABB',
    });
    expect(service.normalizeCatalogSymbol({ symbol: 'ABB.NS', exchange: 'NSE' })).toEqual({
      sourceSymbol: 'ABB',
      providerSymbol: 'ABB.NS',
      displaySymbol: 'ABB',
    });
    expect(service.normalizeCatalogSymbol({ symbol: 'ABC', exchange: 'BSE' })).toEqual({
      sourceSymbol: 'ABC',
      providerSymbol: 'ABC.BO',
      displaySymbol: 'ABC',
    });
  });

  it('backfills old NSE rows to STOCK/CASH India metadata without provider validation', async () => {
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'updated', stock: {} });
    const repository = {
      listStocksForCatalogBackfill: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-1',
          symbol: 'ABB.NS',
          name: 'ABB India',
          region: 'IN',
          exchange: null,
          country: null,
          currency: null,
          sector: 'Industrials',
          industry: 'Electrical Equipment',
          marketCap: '1000',
          assetType: 'EQUITY',
          source: 'database',
          dataStatus: 'PARTIAL',
          isActive: true,
        }],
      }),
      upsertCatalogInstrument,
    };
    const provider = { validateProviderSymbol: jest.fn() };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.backfillCatalogMetadata({ region: 'IN', batchSize: 25, validateProvider: false });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'ABB.NS',
      sourceSymbol: 'ABB',
      providerSymbol: 'ABB.NS',
      displaySymbol: 'ABB',
      assetType: 'STOCK',
      instrumentSegment: 'CASH',
      region: 'IN',
      country: 'India',
      currency: 'INR',
      exchange: 'NSE',
      catalogSource: 'LEGACY_DATABASE',
      providerSupportStatus: 'UNKNOWN',
    }));
    expect(provider.validateProviderSymbol).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      processedCount: 1,
      totalCount: 1,
      updated: 1,
      noOp: 0,
      hasMore: false,
    });
  });

  it('backfills provider validation status when requested', async () => {
    const repository = {
      listStocksForCatalogBackfill: jest.fn().mockResolvedValue({
        total: 2,
        stocks: [
          { symbol: 'ABB.NS', name: 'ABB India', region: 'IN', exchange: 'NSE', assetType: 'STOCK', source: 'database', isActive: true },
          { symbol: 'BAD.NS', name: 'Bad Symbol', region: 'IN', exchange: 'NSE', assetType: 'STOCK', source: 'database', isActive: true },
        ],
      }),
      upsertCatalogInstrument: jest.fn().mockResolvedValue({ action: 'noOp', stock: {} }),
      updateProviderSupportStatus: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      validateProviderSymbol: jest.fn()
        .mockResolvedValueOnce({ supported: true })
        .mockResolvedValueOnce({ supported: false, message: 'not found' }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.backfillCatalogMetadata({ region: 'IN', batchSize: 1, validateProvider: true });

    expect(repository.updateProviderSupportStatus).toHaveBeenCalledWith('ABB.NS', 'SUPPORTED', undefined);
    expect(repository.updateProviderSupportStatus).toHaveBeenCalledWith('BAD.NS', 'UNSUPPORTED', 'not found');
    expect(result).toMatchObject({
      processedCount: 2,
      validated: 2,
      providerUnsupported: 1,
      batchSize: 1,
      nextOffset: 1,
      hasMore: true,
    });
  });

  it('marks F&O underlyings as derivatives eligible without creating fake FUTURE rows', async () => {
    const rows: any[] = [];
    const upsertCatalogInstrument = jest.fn().mockImplementation((row) => {
      rows.push(row);
      return Promise.resolve({ action: row.assetType === 'INDEX' ? 'inserted' : 'updated', stock: {} });
    });
    const service = new MarketDataFoundationService({
      upsertCatalogInstrument,
    } as any, {} as any);

    const result = await service.importCatalog({
      catalogSource: 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
      csvText: 'SYMBOL\nRELIANCE\nNIFTY 50\n',
    });

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        symbol: 'RELIANCE.NS',
        assetType: 'STOCK',
        instrumentSegment: 'CASH',
        derivativesEligible: true,
      }),
      expect.objectContaining({
        symbol: '^NSEI',
        assetType: 'INDEX',
        instrumentSegment: 'INDEX',
        derivativesEligible: true,
      }),
    ]));
    expect(rows.some((row) => row.assetType === 'FUTURE' || row.instrumentSegment === 'FUTURES')).toBe(false);
    expect(result).toMatchObject({
      underlyingsRead: 2,
      stockUnderlyingsMatched: 1,
      newInstrumentsCreated: 1,
    });
  });

  it('imports F&O underlyings from configured URL without creating FUTURE rows', async () => {
    const originalEnv = { ...process.env };
    const csv = 'SYMBOL\nABB\n';
    const rows: any[] = [];
    const bytes = Buffer.from(csv);
    (global.fetch as jest.Mock | undefined) = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => String(bytes.length) },
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
    process.env.MARKET_DATA_CATALOG_NSE_FO_UNDERLYINGS_URL = 'https://example.com/fo.csv';
    const service = new MarketDataFoundationService({
      upsertCatalogInstrument: jest.fn().mockImplementation((row) => {
        rows.push(row);
        return Promise.resolve({ action: 'updated', stock: {} });
      }),
    } as any, {} as any);

    await service.importCatalog({
      catalogSource: 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
      importMode: 'CONFIGURED_URL',
    });

    expect(rows).toEqual([
      expect.objectContaining({
        symbol: 'ABB.NS',
        assetType: 'STOCK',
        instrumentSegment: 'CASH',
        derivativesEligible: true,
      }),
    ]);
    expect(rows.some((row) => row.assetType === 'FUTURE' || row.instrumentSegment === 'FUTURES')).toBe(false);
    process.env = originalEnv;
  });

  it('uses providerSymbol for OHLCV fetch while storing ticks under the canonical stored symbol', async () => {
    const repository = {
      findStockBySymbol: jest.fn().mockResolvedValue({
        symbol: 'ABB',
        providerSymbol: 'ABB.NS',
        region: 'IN',
        assetType: 'STOCK',
        lastSuccessfulDataLoadTimestamp: null,
      }),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue(null),
      getSyncState: jest.fn().mockResolvedValue(null),
      updateStockLoadTimestampBySymbol: jest.fn().mockResolvedValue({}),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
      fetchHistorical: jest.fn().mockResolvedValue([
        { symbol: 'ABB.NS', date: new Date('2026-05-05T00:00:00.000Z'), open: 1, high: 1, low: 1, close: 1, volume: 1 },
      ]),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);
    const storeHistorical = jest.spyOn(service, 'storeHistorical').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 1,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    await service.ingestSymbol('ABB', new Date('2026-05-01T00:00:00.000Z'), new Date('2026-05-05T10:30:00.000Z'), false, { force: true });

    expect(provider.fetchHistorical).toHaveBeenCalledWith('ABB.NS', expect.any(Date), expect.any(Date));
    expect(storeHistorical).toHaveBeenCalledWith([
      expect.objectContaining({ symbol: 'ABB' }),
    ]);
  });

  it('imports index seed rows and records provider validation status', async () => {
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'inserted', stock: {} });
    const updateProviderSupportStatus = jest.fn().mockResolvedValue({});
    const provider = {
      validateProviderSymbol: jest.fn()
        .mockResolvedValueOnce({ supported: true })
        .mockResolvedValueOnce({ supported: false, message: 'not found' })
        .mockResolvedValueOnce({ supported: true }),
    };
    const service = new MarketDataFoundationService({
      upsertCatalogInstrument,
      updateProviderSupportStatus,
    } as any, provider as any);

    const result = await service.importCatalog({
      catalogSource: 'NSE_INDEX_SEED',
      validateProvider: true,
      batchSize: 3,
    });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: '^NSEI',
      assetType: 'INDEX',
      instrumentSegment: 'INDEX',
      catalogSource: 'NSE_INDEX_SEED',
    }));
    expect(updateProviderSupportStatus).toHaveBeenCalledWith('^NSEBANK', 'UNSUPPORTED', 'not found');
    expect(result).toMatchObject({
      sourceRows: 3,
      inserted: 3,
      providerValidated: 3,
      providerUnsupported: 1,
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
