/// <reference types="@types/jest" />
import fs from 'fs';
import os from 'os';
import path from 'path';
import { latestCompletedTradingDateForRegion, MarketDataFoundationService } from '../../../src/modules/market-data-foundation';

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

const resetCatalogSyncRuns = () => {
  (MarketDataFoundationService as any).catalogSyncRuns?.clear();
  (MarketDataFoundationService as any).activeCatalogSyncRuns?.clear();
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
      missing_metadata_fields: expect.arrayContaining(['sector', 'industry', 'marketCap', 'isin', 'listingDate']),
      metadata_completeness_score: 55,
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
        catalogSource: 'NSE_INDEX_SECURITIES',
        displayName: 'NSE Indices',
        urlConfigured: true,
        urlSource: 'DEFAULT',
        importModes: ['CONFIGURED_URL'],
      }),
      expect.objectContaining({
        catalogSource: 'BSE_INDEX_SECURITIES',
        displayName: 'BSE Indices',
        urlConfigured: true,
        urlSource: 'DEFAULT',
        importModes: ['CONFIGURED_URL'],
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

  it('ships default configured URLs for NSE equity, ETF, and index sources', () => {
    const originalEnv = { ...process.env };
    delete process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL;
    delete process.env.MARKET_DATA_CATALOG_NSE_ETF_URL;
    delete process.env.MARKET_DATA_CATALOG_NSE_INDICES_URL;
    delete process.env.MARKET_DATA_CATALOG_BSE_INDICES_URL;
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
      expect.objectContaining({
        catalogSource: 'NSE_INDEX_SECURITIES',
        urlConfigured: true,
        urlSource: 'DEFAULT',
        supportsConfiguredUrl: true,
        fileType: 'JSON',
      }),
      expect.objectContaining({
        catalogSource: 'BSE_INDEX_SECURITIES',
        urlConfigured: true,
        urlSource: 'DEFAULT',
        supportsConfiguredUrl: true,
        fileType: 'HTML',
      }),
    ]));

    process.env = originalEnv;
  });

  it('imports NSE all-indices JSON from configured URL as INDEX rows', async () => {
    const originalEnv = { ...process.env };
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdf-nse-index-'));
    const payload = JSON.stringify({
      data: [
        { index: 'NIFTY 50' },
        { index: 'NIFTY IT' },
        { index: 'NIFTY NEXT 50' },
      ],
    });
    const bytes = Buffer.from(payload);
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'inserted', stock: {} });
    (global.fetch as jest.Mock | undefined) = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => String(bytes.length) },
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
    process.env.MARKET_DATA_CATALOG_NSE_INDICES_URL = 'https://example.com/all-indices.json';
    process.env.MARKET_DATA_CATALOG_TEMP_DIR = tempDir;
    const service = new MarketDataFoundationService({ upsertCatalogInstrument } as any, {} as any);

    const result = await service.importCatalog({
      catalogSource: 'NSE_INDEX_SECURITIES',
      importMode: 'CONFIGURED_URL',
    });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: '^NSEI',
      providerSymbol: '^NSEI',
      sourceSymbol: 'NIFTY 50',
      assetType: 'INDEX',
      instrumentSegment: 'INDEX',
      catalogSource: 'NSE_INDEX_SECURITIES',
    }));
    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: '^CNXIT',
      providerSymbol: '^CNXIT',
      sourceSymbol: 'NIFTY IT',
    }));
    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'NSE_INDEX_NIFTY_NEXT_50',
      providerSymbol: null,
      sourceSymbol: 'NIFTY NEXT 50',
    }));
    expect(result).toMatchObject({
      sourceRows: 3,
      inserted: 3,
      downloaded: true,
      tempFileDeleted: true,
    });
    expect(fs.readdirSync(tempDir)).toHaveLength(0);
    process.env = originalEnv;
  });

  it('imports BSE index-watch HTML from configured URL as INDEX rows', async () => {
    const originalEnv = { ...process.env };
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdf-bse-index-'));
    const html = '<table><tr><td>BSE SENSEX</td><td>81000</td></tr><tr><td>BSE 100</td><td>27000</td></tr><tr><td>Current</td><td>1</td></tr></table>';
    const bytes = Buffer.from(html);
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'inserted', stock: {} });
    (global.fetch as jest.Mock | undefined) = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => String(bytes.length) },
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
    process.env.MARKET_DATA_CATALOG_BSE_INDICES_URL = 'https://example.com/bse-indices.html';
    process.env.MARKET_DATA_CATALOG_TEMP_DIR = tempDir;
    const service = new MarketDataFoundationService({ upsertCatalogInstrument } as any, {} as any);

    const result = await service.importCatalog({
      catalogSource: 'BSE_INDEX_SECURITIES',
      importMode: 'CONFIGURED_URL',
    });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: '^BSESN',
      providerSymbol: '^BSESN',
      sourceSymbol: 'BSE SENSEX',
      exchange: 'BSE_INDEX',
      assetType: 'INDEX',
      instrumentSegment: 'INDEX',
      catalogSource: 'BSE_INDEX_SECURITIES',
    }));
    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'BSE_INDEX_BSE_100',
      providerSymbol: null,
      sourceSymbol: 'BSE 100',
    }));
    expect(result).toMatchObject({
      sourceRows: 2,
      inserted: 2,
      downloaded: true,
      tempFileDeleted: true,
    });
    expect(fs.readdirSync(tempDir)).toHaveLength(0);
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
    expect(service.normalizeCatalogSymbol({ symbol: 'RELIANCE.NS', providerSymbol: 'RELIANCE.NL', exchange: 'NSE' })).toEqual({
      sourceSymbol: 'RELIANCE',
      providerSymbol: 'RELIANCE.NS',
      displaySymbol: 'RELIANCE',
    });
    expect(service.normalizeCatalogSymbol({ symbol: 'ABC', exchange: 'BSE' })).toEqual({
      sourceSymbol: 'ABC',
      providerSymbol: 'ABC.BO',
      displaySymbol: 'ABC',
    });
  });

  it('backfills known NSE F&O stock underlyings as eligible and corrects invalid provider suffixes', async () => {
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'updated', stock: {} });
    const repository = {
      listStocksForCatalogBackfill: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-1',
          symbol: 'RELIANCE.NS',
          providerSymbol: 'RELIANCE.NL',
          name: 'Reliance Industries Limited',
          region: 'IN',
          exchange: 'NSE',
          assetType: 'STOCK',
          derivativesEligible: false,
          source: 'database',
          dataStatus: 'PARTIAL',
          isActive: true,
        }],
      }),
      upsertCatalogInstrument,
    };
    const service = new MarketDataFoundationService(repository as any, { validateProviderSymbol: jest.fn() } as any);

    await service.backfillCatalogMetadata({ region: 'IN', batchSize: 25, validateProvider: false });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'RELIANCE.NS',
      sourceSymbol: 'RELIANCE',
      providerSymbol: 'RELIANCE.NS',
      displaySymbol: 'RELIANCE',
      derivativesEligible: true,
    }));
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
      updateProviderSupportStatus: jest.fn().mockResolvedValue({}),
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
    expect(repository.updateProviderSupportStatus).toHaveBeenCalledWith('ABB', 'SUPPORTED', null);
  });

  it('stores free official NSE EOD fallback rows when Yahoo returns no backfill data', async () => {
    const originalFallbackFlag = process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_ENABLED;
    const originalMaxDays = process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_MAX_DAYS_PER_SYMBOL;
    const originalFetch = global.fetch;
    process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_ENABLED = 'true';
    process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_MAX_DAYS_PER_SYMBOL = '1';
    const csv = [
      'SYMBOL,SERIES,DATE1,OPEN_PRICE,HIGH_PRICE,LOW_PRICE,CLOSE_PRICE,TTL_TRD_QNTY',
      'RELIANCE,EQ,13-May-2026,1430.00,1450.50,1420.25,1444.10,1234567',
    ].join('\n');
    const bytes = Buffer.from(csv);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: jest.fn().mockReturnValue(String(bytes.length)) },
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    } as any);
    const repository = {
      findStockBySymbol: jest.fn().mockResolvedValue({
        symbol: 'RELIANCE.NS',
        providerSymbol: 'RELIANCE.NS',
        sourceSymbol: 'RELIANCE',
        exchange: 'NSE',
        region: 'IN',
        assetType: 'STOCK',
        lastSuccessfulDataLoadTimestamp: null,
      }),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue(null),
      getSyncState: jest.fn().mockResolvedValue(null),
      updateStockLoadTimestampBySymbol: jest.fn().mockResolvedValue({}),
      updateProviderSupportStatus: jest.fn().mockResolvedValue({}),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
      fetchHistorical: jest.fn().mockResolvedValue([]),
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

    try {
      const result = await service.ingestSymbol(
        'RELIANCE.NS',
        new Date('2026-05-13T00:00:00.000Z'),
        new Date('2026-05-13T23:59:59.999Z'),
        false,
        { force: true, region: 'IN', assetType: 'STOCK', preserveProviderSupportOnZeroRows: true }
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://archives.nseindia.com/products/content/sec_bhavdata_full_13052026.csv',
        expect.any(Object)
      );
      expect(storeHistorical).toHaveBeenCalledWith([
        expect.objectContaining({
          symbol: 'RELIANCE.NS',
          source: 'NSE_SECURITY_BHAVDATA',
          close: 1444.1,
        }),
      ]);
      expect(repository.updateProviderSupportStatus).toHaveBeenCalledWith('RELIANCE.NS', 'SUPPORTED', null);
      expect(result).toMatchObject({
        rowsReceived: 1,
        rowsInserted: 1,
      });
    } finally {
      if (originalFallbackFlag === undefined) delete process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_ENABLED;
      else process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_ENABLED = originalFallbackFlag;
      if (originalMaxDays === undefined) delete process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_MAX_DAYS_PER_SYMBOL;
      else process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_MAX_DAYS_PER_SYMBOL = originalMaxDays;
      global.fetch = originalFetch;
    }
  });

  it('excludes provider-supported stocks from trusted review until required 15-year coverage exists', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          symbol: 'SPARSE.NS',
          providerSymbol: 'SPARSE.NS',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          sector: 'Tech',
          industry: 'Software',
          country: 'India',
          currency: 'INR',
          marketCap: 1000,
          isin: 'INE123A01010',
          ipoDate: new Date('2000-01-01T00:00:00.000Z'),
          region: 'IN',
          assetType: 'STOCK',
          exchange: 'NSE',
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['SPARSE.NS', {
          priceHistoryBars: 300,
          firstPriceDate: '2011-05-12',
          latestPriceDate: latestCompletedTradingDateForRegion('IN'),
          latestVolume: 100,
          latestAdjustedClose: 10,
          latestClose: 10,
          rollingWindowBars: 252,
          rollingWindowCoveragePercent: 100,
          maxPriceGapDays: 1,
          recentVolumeCoveragePercent: 100,
          adjustedCloseCoveragePercent: 100,
          usesAdjustedCloseFallback: false,
        }],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.trustedReviewUniverseHealth({ region: 'IN', assetType: 'STOCK' });

    expect(result.trustedCount).toBe(0);
    expect(result.excludedCounts.requiredHistoryIncomplete).toBe(1);
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('15 years of daily OHLCV'),
    ]));
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

  it('starts catalog sync runs quickly with hard caps and no immediate provider loop', async () => {
    resetCatalogSyncRuns();
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((() => 0) as any);
    const repository = {
      countActiveStockSyncTasks: jest.fn().mockResolvedValue(2916),
      listActiveStockSyncTasks: jest.fn(),
      upsertSyncState: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const ingestSpy = jest.spyOn(service, 'ingestSymbol');

    try {
      const result = await service.startCatalogSyncRun({
        region: 'IN',
        assetType: 'STOCK',
        batchSize: 500,
        workerCount: 10,
        workerConcurrency: 9,
        delayBetweenBatchesMs: 100,
        maxBatches: 500,
      });

      expect(result).toMatchObject({
        success: true,
        status: 'RUNNING',
        region: 'IN',
        assetType: 'STOCK',
        batchSize: 50,
        workerCount: 2,
        workerConcurrency: 3,
        delayBetweenBatchesMs: 1000,
        maxBatches: 100,
        totalCount: 2916,
        processedCount: 0,
      });
      expect(result.runId).toMatch(/^catalog-sync-/);
      expect(result.warningCount).toBeGreaterThanOrEqual(5);
      expect(repository.listActiveStockSyncTasks).not.toHaveBeenCalled();
      expect(ingestSpy).not.toHaveBeenCalled();
    } finally {
      timeoutSpy.mockRestore();
      resetCatalogSyncRuns();
    }
  });

  it('returns the active same-scope catalog sync run instead of starting overlap', async () => {
    resetCatalogSyncRuns();
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((() => 0) as any);
    const repository = {
      countActiveStockSyncTasks: jest.fn().mockResolvedValue(3),
      listActiveStockSyncTasks: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    try {
      const first = await service.startCatalogSyncRun({ region: 'IN', assetType: 'STOCK' });
      const second = await service.startCatalogSyncRun({ region: 'IN', assetType: 'STOCK' });

      expect(second).toMatchObject({
        runId: first.runId,
        status: 'RUNNING',
        alreadyRunning: true,
        message: 'A catalog sync is already running for IN/STOCK.',
      });
      expect(repository.countActiveStockSyncTasks).toHaveBeenCalledTimes(1);
    } finally {
      timeoutSpy.mockRestore();
      resetCatalogSyncRuns();
    }
  });

  it('processes only bounded catalog sync batches and reports partial progress/errors', async () => {
    resetCatalogSyncRuns();
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((() => 0) as any);
    const tasks = [
      { id: 'stock-1', symbol: 'AAA', providerSymbol: 'AAA', lastSuccessfulDataLoadTimestamp: null },
      { id: 'stock-2', symbol: 'BBB', providerSymbol: 'BBB', lastSuccessfulDataLoadTimestamp: null },
      { id: 'stock-3', symbol: 'CCC', providerSymbol: 'CCC', lastSuccessfulDataLoadTimestamp: null },
    ];
    const repository = {
      countActiveStockSyncTasks: jest.fn().mockResolvedValue(tasks.length),
      listActiveStockSyncTasks: jest.fn().mockImplementation((_options, take, excludeIds = []) =>
        Promise.resolve(tasks.filter((task) => !excludeIds.includes(task.id)).slice(0, take))
      ),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockImplementation((symbol: string) => {
      if (symbol === 'BBB') {
        return Promise.reject(new Error('provider timeout'));
      }
      return Promise.resolve({
        rowsReceived: 3,
        rowsInserted: 2,
        rowsUpdated: 1,
        rowsSkipped: 0,
        rowsNoOp: 0,
        warningCount: 0,
        warnings: [],
      });
    });

    try {
      const start = await service.startCatalogSyncRun({
        region: 'IN',
        assetType: 'STOCK',
        batchSize: 2,
        workerCount: 2,
        workerConcurrency: 3,
        delayBetweenBatchesMs: 1000,
        maxBatches: 1,
        force: true,
      });

      await (service as any).processCatalogSyncRun(start.runId);
      const status = service.getCatalogSyncRun(start.runId);

      expect(repository.listActiveStockSyncTasks).toHaveBeenCalledWith(
        { region: 'IN', assetType: 'STOCK' },
        2,
        []
      );
      expect(status).toMatchObject({
        status: 'PARTIAL',
        processedCount: 2,
        succeededCount: 1,
        failedCount: 1,
        batchesExecuted: 1,
        rowsReceived: 3,
        rowsInserted: 2,
        rowsUpdated: 1,
        hasMore: true,
      });
      expect(status?.recentErrors).toEqual([
        expect.objectContaining({ symbol: 'BBB', message: 'provider timeout' }),
      ]);
      expect(repository.upsertSyncState).toHaveBeenCalledWith(expect.objectContaining({
        region: 'IN',
        assetType: 'STOCK',
        scopeType: 'CATALOG',
        status: 'FAILED',
      }));
    } finally {
      timeoutSpy.mockRestore();
      resetCatalogSyncRuns();
    }
  });

  it('marks active catalog sync runs for cancellation without aborting the current batch', async () => {
    resetCatalogSyncRuns();
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((() => 0) as any);
    const service = new MarketDataFoundationService({
      countActiveStockSyncTasks: jest.fn().mockResolvedValue(2),
    } as any, {} as any);

    try {
      const start = await service.startCatalogSyncRun({ region: 'IN', assetType: 'STOCK' });
      const canceled = service.cancelCatalogSyncRun(start.runId);

      expect(canceled).toMatchObject({
        runId: start.runId,
        status: 'PARTIAL',
        cancelRequested: true,
        message: 'Cancellation requested. The current batch will finish before the run stops.',
      });
    } finally {
      timeoutSpy.mockRestore();
      resetCatalogSyncRuns();
    }
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

  const createCatchUpService = (latestStoredTradingDate: string | null) => {
    const repository = {
      findStockBySymbol: jest.fn().mockResolvedValue({
        symbol: 'RELIANCE.NS',
        providerSymbol: 'RELIANCE.NS',
        region: 'IN',
        assetType: 'STOCK',
        lastSuccessfulDataLoadTimestamp: new Date('2026-05-11T00:00:00.000Z'),
      }),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue(latestStoredTradingDate),
      getSyncState: jest.fn().mockResolvedValue(null),
      updateStockLoadTimestampBySymbol: jest.fn().mockResolvedValue({}),
      updateProviderSupportStatus: jest.fn().mockResolvedValue({}),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
      fetchHistorical: jest.fn().mockResolvedValue([
        { symbol: 'RELIANCE.NS', date: new Date('2026-05-12T00:00:00.000Z'), open: 1, high: 1, low: 1, close: 1, volume: 1 },
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
    return { repository, provider, service };
  };

  it('skips provider fetch before market open for 1D data when latest completed EOD is current', async () => {
    const repository = {
      findStockBySymbol: jest.fn().mockResolvedValue({ symbol: 'RELIANCE.NS', region: 'IN', assetType: 'STOCK', lastSuccessfulDataLoadTimestamp: null }),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue('2026-05-04'),
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

  it('fetches missing latest completed EOD before market open and caps the provider end date', async () => {
    const { provider, service } = createCatchUpService('2026-05-11');

    const result = await service.ingestSymbol('RELIANCE.NS', undefined, new Date('2026-05-13T03:00:00.000Z'));

    expect(provider.fetchHistorical).toHaveBeenCalledTimes(1);
    expect((provider.fetchHistorical as jest.Mock).mock.calls[0][2].toISOString()).toBe('2026-05-12T23:59:59.999Z');
    expect(result).toMatchObject({ rowsReceived: 1, rowsInserted: 1 });
  });

  it('fetches missing latest completed EOD during market hours without requesting the in-progress candle', async () => {
    const { provider, service } = createCatchUpService('2026-05-11');

    await service.ingestSymbol('RELIANCE.NS', undefined, new Date('2026-05-13T05:00:00.000Z'));

    expect(provider.fetchHistorical).toHaveBeenCalledTimes(1);
    expect((provider.fetchHistorical as jest.Mock).mock.calls[0][2].toISOString()).toBe('2026-05-12T23:59:59.999Z');
  });

  it('fetches missing latest completed EOD after close grace through the current completed trading day', async () => {
    const { provider, service } = createCatchUpService('2026-05-11');

    await service.ingestSymbol('RELIANCE.NS', undefined, new Date('2026-05-13T10:30:00.000Z'));

    expect(provider.fetchHistorical).toHaveBeenCalledTimes(1);
    expect((provider.fetchHistorical as jest.Mock).mock.calls[0][2].toISOString()).toBe('2026-05-13T23:59:59.999Z');
  });

  it('caps scheduled catch-up batches to the missing latest completed EOD before market open', async () => {
    const repository = {
      listActiveStockSyncTasks: jest.fn().mockResolvedValue([{ id: 'stock-1', symbol: 'RELIANCE.NS', lastSuccessfulDataLoadTimestamp: null }]),
      instrumentCount: jest.fn().mockResolvedValue(1),
      upsertSyncState: jest.fn().mockResolvedValue({}),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue('2026-05-11'),
      getSyncState: jest.fn().mockResolvedValue(null),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 1,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    await service.syncScheduledRegion('IN', {
      assetType: 'STOCK',
      now: new Date('2026-05-13T03:00:00.000Z'),
    });

    const ingestCall = (service.ingestSymbol as jest.Mock).mock.calls[0];
    expect((ingestCall[2] as Date).toISOString()).toBe('2026-05-12T23:59:59.999Z');
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
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue('2026-05-08'),
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

  it('runs bounded provider validation and updates supported rows', async () => {
    const repository = {
      listStocksForProviderValidation: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{ symbol: 'ABB.NS', providerSymbol: 'ABB.NS', isActive: true, isDelisted: false }],
      }),
      updateProviderSupportStatus: jest.fn().mockResolvedValue({}),
    };
    const provider = { validateProviderSymbol: jest.fn().mockResolvedValue({ supported: true }) };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.validateProviders({ region: 'IN', assetType: 'STOCK', batchSize: 1, offset: 0 });

    expect(repository.listStocksForProviderValidation).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 1,
      offset: 0,
    }));
    expect(repository.updateProviderSupportStatus).toHaveBeenCalledWith('ABB.NS', 'SUPPORTED', undefined);
    expect(result).toMatchObject({
      processedCount: 1,
      providerValidated: 1,
      providerSupported: 1,
      updated: 1,
    });
  });

  it('uses offset zero for mutating provider validation queues to avoid skipped rows', async () => {
    const repository = {
      listStocksForProviderValidation: jest.fn().mockResolvedValue({
        total: 75,
        stocks: Array.from({ length: 50 }).map((_, index) => ({ symbol: `ROW${index}.NS`, providerSymbol: `ROW${index}.NS`, isActive: true, isDelisted: false })),
      }),
      updateProviderSupportStatus: jest.fn().mockResolvedValue({}),
    };
    const provider = { validateProviderSymbol: jest.fn().mockResolvedValue({ supported: true }) };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.validateProviders({ region: 'IN', assetType: 'STOCK', batchSize: 50, offset: 50 });

    expect(repository.listStocksForProviderValidation).toHaveBeenCalledWith(expect.objectContaining({
      batchSize: 50,
      offset: 0,
    }));
    expect(result).toMatchObject({
      processedCount: 50,
      nextOffset: 0,
      hasMore: true,
    });
  });

  it('records provider validation errors as retryable VALIDATION_FAILED', async () => {
    const repository = {
      listStocksForProviderValidation: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{ symbol: 'ERR.NS', providerSymbol: 'ERR.NS', isActive: true, isDelisted: false }],
      }),
      updateProviderSupportStatus: jest.fn().mockResolvedValue({}),
    };
    const provider = { validateProviderSymbol: jest.fn().mockResolvedValue({ supported: false, failed: true, message: 'network error' }) };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.validateProviders({ region: 'IN', assetType: 'STOCK' });

    expect(repository.updateProviderSupportStatus).toHaveBeenCalledWith('ERR.NS', 'VALIDATION_FAILED', 'network error');
    expect(result).toMatchObject({
      failed: 1,
      validationFailed: 1,
    });
  });

  it('keeps Yahoo no-candle IN stock results visible as FREE_FALLBACK_REQUIRED', async () => {
    const nextRetry = new Date('2026-05-13T12:30:00.000Z');
    const repository = {
      listStocksForProviderValidation: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{ id: 'stock-free-fallback', symbol: 'NODATA.NS', providerSymbol: 'NODATA.NS', isActive: true, isDelisted: false, providerSupportStatus: 'UNKNOWN' }],
      }),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([['NODATA.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null }]])),
      updateProviderSupportStatus: jest.fn().mockResolvedValue({}),
      countRepairAttempts: jest.fn().mockResolvedValue(0),
      recordRepairAttempt: jest.fn().mockResolvedValue({ id: 'attempt-free-fallback' }),
      upsertRepairState: jest.fn().mockResolvedValue({}),
      countProviderValidationRepairStates: jest.fn().mockResolvedValue(0),
      nextProviderValidationRetryAt: jest.fn().mockResolvedValue(nextRetry),
    };
    const provider = {
      validateProviderSymbol: jest.fn().mockResolvedValue({
        supported: false,
        failed: true,
        classification: 'FREE_FALLBACK_REQUIRED',
        message: 'Yahoo returned no daily candles over the completed-EOD validation window.',
        candlesFound: 0,
        providerCallMs: 42,
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.validateProviders({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(repository.updateProviderSupportStatus).toHaveBeenCalledWith(
      'NODATA.NS',
      'VALIDATION_FAILED',
      expect.stringContaining('Yahoo returned no daily candles')
    );
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      repairType: 'PROVIDER_VALIDATION',
      status: 'FAILED_RETRYABLE',
      nextRetryAt: expect.any(Date),
      fieldsFilledJson: expect.objectContaining({
        classification: 'FREE_FALLBACK_REQUIRED',
        freeFallbackRequired: true,
        requiredHistoryStartDate: expect.any(String),
        latestCompletedEodDate: expect.any(String),
        storedHistoryStartDate: null,
        storedHistoryEndDate: null,
      }),
    }));
    expect(result).toMatchObject({
      validationFailed: 1,
      freeFallbackRequired: 1,
      providerRetryableFailures: 1,
      requiredHistoryCoverageStatus: 'FALLBACK_REQUIRED',
      latestCompletedEodDate: expect.any(String),
      requiredHistoryStartDate: expect.any(String),
      storedHistoryBars: 0,
    });
    expect(result.sampleResults?.[0]).toMatchObject({
      classification: 'FREE_FALLBACK_REQUIRED',
      status: 'VALIDATION_FAILED',
      requiredHistoryStartDate: expect.any(String),
      storedHistoryStartDate: null,
      storedHistoryEndDate: null,
    });
  });

  it('marks UNKNOWN provider rows supported from stored OHLCV without a provider call', async () => {
    const repository = {
      listStocksForProviderValidation: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{ id: 'stock-stored', symbol: 'STORED.NS', providerSymbol: 'STORED.NS', isActive: true, isDelisted: false, providerSupportStatus: 'UNKNOWN' }],
      }),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([[
        'STORED.NS',
        { priceHistoryBars: 3820, firstPriceDate: '2011-05-13', latestPriceDate: '2026-05-12' },
      ]])),
      markProviderSupportedFromStoredPrices: jest.fn().mockResolvedValue({ count: 1 }),
      recordRepairAttempt: jest.fn().mockResolvedValue({ id: 'attempt-stored' }),
      upsertRepairState: jest.fn().mockResolvedValue({}),
      countProviderValidationRepairStates: jest.fn().mockResolvedValue(0),
      nextProviderValidationRetryAt: jest.fn().mockResolvedValue(null),
    };
    const provider = { validateProviderSymbol: jest.fn() };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.validateProviders({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(provider.validateProviderSymbol).not.toHaveBeenCalled();
    expect(repository.markProviderSupportedFromStoredPrices).toHaveBeenCalledWith(['STORED.NS']);
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      repairType: 'PROVIDER_VALIDATION',
      status: 'RESOLVED',
      fieldsFilledJson: expect.objectContaining({
        classification: 'SUPPORTED_FROM_STORED_PRICES',
        storedHistoryStartDate: '2011-05-13',
        storedHistoryEndDate: '2026-05-12',
      }),
    }));
    expect(result).toMatchObject({
      processedCount: 1,
      providerSupported: 1,
      supportedFromStoredPrices: 1,
      providerCalls: 0,
      requiredHistoryCoverageStatus: 'NEEDS_BACKFILL',
      storedHistoryStartDate: '2011-05-13',
      storedHistoryEndDate: '2026-05-12',
    });
  });

  it('validates UNKNOWN provider rows by default instead of retry-failed rows', async () => {
    const repository = {
      listStocksForProviderValidation: jest.fn().mockResolvedValue({
        total: 0,
        stocks: [],
      }),
    };
    const provider = { validateProviderSymbol: jest.fn() };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    await service.validateProviders({ region: 'IN', assetType: 'STOCK', includeRetryFailed: true });

    expect(repository.listStocksForProviderValidation).toHaveBeenCalledWith(expect.objectContaining({
      providerValidationQueue: 'UNKNOWN_FIRST',
    }));
  });

  it('validates retry-failed provider rows only when explicitly requested', async () => {
    const repository = {
      listStocksForProviderValidation: jest.fn().mockResolvedValue({
        total: 0,
        stocks: [],
      }),
    };
    const provider = { validateProviderSymbol: jest.fn() };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.validateProviders({ region: 'IN', assetType: 'STOCK', providerValidationQueue: 'RETRY_FAILED' });

    expect(repository.listStocksForProviderValidation).toHaveBeenCalledWith(expect.objectContaining({
      providerValidationQueue: 'RETRY_FAILED',
    }));
    expect(result.providerValidationQueue).toBe('RETRY_FAILED');
  });

  it('records clean provider validation failures as UNSUPPORTED', async () => {
    const repository = {
      listStocksForProviderValidation: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{ symbol: 'BAD.NS', providerSymbol: 'BAD.NS', isActive: true, isDelisted: false }],
      }),
      updateProviderSupportStatus: jest.fn().mockResolvedValue({}),
    };
    const provider = { validateProviderSymbol: jest.fn().mockResolvedValue({ supported: false, message: 'no provider match' }) };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.validateProviders({ region: 'IN', assetType: 'STOCK' });

    expect(repository.updateProviderSupportStatus).toHaveBeenCalledWith('BAD.NS', 'UNSUPPORTED', 'no provider match');
    expect(result).toMatchObject({
      processedCount: 1,
      failed: 0,
      providerUnsupported: 1,
    });
  });

  it('enriches missing metadata from provider and manual NSE catalog fields', async () => {
    const updateCompanyMasterData = jest.fn().mockResolvedValue({});
    const repository = {
      listStocksForMetadataEnrichment: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-1',
          symbol: 'ABB.NS',
          providerSymbol: 'ABB.NS',
          sourceSymbol: 'ABB',
          name: 'ABB India',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          sector: null,
          industry: null,
          currency: 'INR',
          marketCap: null,
          assetType: 'STOCK',
          isDelisted: false,
          ipoDate: null,
          isin: null,
        }],
      }),
      updateCompanyMasterData,
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        companyName: 'ABB India Limited',
        exchange: 'NSE',
        country: 'India',
        sector: 'Industrials',
        industry: 'Electrical Equipment',
        currency: 'INR',
        marketCap: 1000,
        assetType: 'STOCK',
        isDelisted: false,
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.enrichMetadata({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'SYMBOL,NAME OF COMPANY,SERIES,ISIN,DATE OF LISTING\nABB,ABB India Limited,EQ,INE117A01022,1999-01-01\n',
      catalogSource: 'NSE_EQUITY_SECURITIES',
    });

    expect(updateCompanyMasterData).toHaveBeenCalledWith('stock-1', expect.objectContaining({
      sector: 'Industrials',
      industry: 'Electrical Equipment',
      marketCap: 1000,
      isin: 'INE117A01022',
      ipoDate: new Date('1999-01-01T00:00:00.000Z'),
    }));
    expect(result).toMatchObject({
      processedCount: 1,
      metadataEnriched: 1,
      updated: 1,
    });
    expect(result.fieldProvenance?.[0]).toMatchObject({
      sectorSource: 'yahoo',
      industrySource: 'yahoo',
      marketCapSource: 'yahoo',
      isinSource: 'NSE_EQUITY_SECURITIES',
    });
  });

  it('preserves existing metadata when provider enrichment returns null fields', async () => {
    const updateCompanyMasterData = jest.fn().mockResolvedValue({});
    const repository = {
      listStocksForMetadataEnrichment: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-2',
          symbol: 'KEEP.NS',
          providerSymbol: 'KEEP.NS',
          sourceSymbol: 'KEEP',
          name: 'Keep Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          sector: 'Financial Services',
          industry: 'Asset Management',
          currency: 'INR',
          marketCap: 5000,
          assetType: 'STOCK',
          isDelisted: false,
          ipoDate: null,
          isin: null,
        }],
      }),
      updateCompanyMasterData,
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        companyName: null,
        exchange: null,
        country: null,
        sector: null,
        industry: null,
        currency: null,
        marketCap: null,
        assetType: null,
        isDelisted: false,
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    await service.enrichMetadata({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'SYMBOL,NAME OF COMPANY,SERIES,ISIN,DATE OF LISTING\nKEEP,Keep Limited,EQ,INEKEEP01010,2000-01-03\n',
      catalogSource: 'NSE_EQUITY_SECURITIES',
    });

    expect(updateCompanyMasterData).toHaveBeenCalledWith('stock-2', expect.objectContaining({
      sector: 'Financial Services',
      industry: 'Asset Management',
      marketCap: 5000,
      country: 'India',
      currency: 'INR',
      isin: 'INEKEEP01010',
    }));
  });

  it('does not report metadata enrichment success when missing fields do not improve', async () => {
    const updateCompanyMasterData = jest.fn().mockResolvedValue({});
    const repository = {
      listStocksForMetadataEnrichment: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-3',
          symbol: 'NULL.NS',
          providerSymbol: 'NULL.NS',
          sourceSymbol: 'NULL',
          name: 'Null Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          sector: null,
          industry: null,
          currency: 'INR',
          marketCap: null,
          assetType: 'STOCK',
          isDelisted: false,
          ipoDate: null,
          isin: null,
          source: 'catalog',
        }],
      }),
      updateCompanyMasterData,
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        companyName: null,
        exchange: null,
        country: null,
        sector: null,
        industry: null,
        currency: null,
        marketCap: null,
        assetType: null,
        isDelisted: false,
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.enrichMetadata({ region: 'IN', assetType: 'STOCK', batchSize: 1, offset: 50 });

    expect(repository.listStocksForMetadataEnrichment).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
    expect(updateCompanyMasterData).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      updated: 0,
      skipped: 1,
      noOp: 1,
      manualRequired: 1,
      providerNotFound: 1,
      nextOffset: null,
      hasMore: false,
    });
  });

  it('treats provider MISSING master data as provider-not-found even when inferred fields exist', async () => {
    const updateCompanyMasterData = jest.fn().mockResolvedValue({});
    const repository = {
      listStocksForMetadataEnrichment: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-missing-provider',
          symbol: 'MISS.NS',
          providerSymbol: 'MISS.NS',
          sourceSymbol: 'MISS',
          name: 'Missing Provider Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          sector: null,
          industry: null,
          currency: 'INR',
          marketCap: null,
          assetType: 'STOCK',
          isDelisted: false,
          ipoDate: null,
          isin: null,
          source: 'catalog',
        }],
      }),
      updateCompanyMasterData,
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        companyName: null,
        exchange: 'NSE',
        country: 'India',
        sector: null,
        industry: null,
        currency: 'INR',
        marketCap: null,
        assetType: 'STOCK',
        isDelisted: null,
        dataStatus: 'MISSING',
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.enrichMetadata({ region: 'IN', assetType: 'STOCK' });

    expect(updateCompanyMasterData).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      updated: 0,
      noOp: 1,
      providerNotFound: 1,
      manualRequired: 1,
    });
  });

  it('provider business metadata repair drains past recent no-provider attempts instead of looping', async () => {
    const attempts: Array<{ stockId: string; status: string }> = [];
    const stocks = [
      {
        id: 'stock-no-provider',
        symbol: 'NOPE.NS',
        providerSymbol: 'NOPE.NS',
        name: 'No Provider',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        sector: null,
        industry: null,
        marketCap: null,
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
      },
      {
        id: 'stock-fills',
        symbol: 'FILL.NS',
        providerSymbol: 'FILL.NS',
        name: 'Fill Limited',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        sector: null,
        industry: null,
        marketCap: null,
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
      },
    ];
    const manualStateIds = new Set<string>();
    const repository = {
      listStocksForBusinessMetadataRepair: jest.fn(async ({ batchSize }: any) => {
        const available = stocks.filter((item) => !manualStateIds.has(item.id));
        return { total: available.length, stocks: available.slice(0, batchSize) };
      }),
      countStocksForBusinessMetadataRepair: jest.fn(async () => stocks.filter((item) => !manualStateIds.has(item.id)).length),
      countBusinessMetadataRepairStates: jest.fn(async ({ statuses }: any) => statuses.includes('MANUAL_REQUIRED') ? manualStateIds.size : 0),
      recordRepairAttempt: jest.fn(async (input: any) => {
        attempts.push({ stockId: input.stockId, status: input.status });
        return { id: `attempt-${attempts.length}` };
      }),
      upsertRepairState: jest.fn(async (input: any) => {
        if (input.status === 'MANUAL_REQUIRED') manualStateIds.add(input.stockId);
        if (input.status === 'RESOLVED') manualStateIds.delete(input.stockId);
      }),
      updateCompanyMasterData: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      fetchCompanyMasterData: jest.fn(async (symbol: string) => symbol === 'NOPE.NS'
        ? { dataStatus: 'MISSING', country: 'India', currency: 'INR' }
        : { sector: 'Industrials', industry: 'Electrical Equipment', marketCap: 1000, dataStatus: 'PARTIAL' }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const first = await service.repairProviderBusinessMetadata({ region: 'IN', assetType: 'STOCK', batchSize: 1 });
    const second = await service.repairProviderBusinessMetadata({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(first).toMatchObject({
      updated: 0,
      providerNotFound: 1,
      manualRequired: 1,
    });
    expect(second).toMatchObject({
      updated: 1,
      providerBusinessMetadataRepaired: 1,
      fieldsFilled: {
        sector: 1,
        industry: 1,
        marketCap: 1,
      },
    });
    expect(repository.updateCompanyMasterData).toHaveBeenCalledWith('stock-fills', expect.objectContaining({
      sector: 'Industrials',
      industry: 'Electrical Equipment',
      marketCap: 1000,
    }));
    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-no-provider',
      status: 'NO_PROVIDER_DATA',
      manualRequiredReason: expect.any(String),
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-no-provider',
      status: 'MANUAL_REQUIRED',
      repairType: 'PROVIDER_BUSINESS_METADATA',
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-fills',
      status: 'RESOLVED',
      repairType: 'PROVIDER_BUSINESS_METADATA',
    }));
    expect(provider.fetchCompanyMasterData).toHaveBeenCalledTimes(2);
  });

  it('provider business metadata no-op is not success and is marked manual-required', async () => {
    const repository = {
      listStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-noop',
          symbol: 'NOOP.NS',
          providerSymbol: 'NOOP.NS',
          name: 'Noop Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          currency: 'INR',
          sector: 'Industrials',
          industry: 'Electrical Equipment',
          marketCap: null,
          assetType: 'STOCK',
          isActive: true,
          isDelisted: false,
        }],
      }),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(0),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(1),
      recordRepairAttempt: jest.fn().mockResolvedValue({ id: 'attempt-noop' }),
      upsertRepairState: jest.fn().mockResolvedValue({}),
      updateCompanyMasterData: jest.fn(),
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        companyName: 'Noop Limited',
        sector: 'Industrials',
        industry: 'Electrical Equipment',
        dataStatus: 'PARTIAL',
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.repairProviderBusinessMetadata({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(repository.updateCompanyMasterData).not.toHaveBeenCalled();
    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-noop',
      status: 'NO_FIELDS_FILLED',
      manualRequiredReason: expect.any(String),
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-noop',
      status: 'MANUAL_REQUIRED',
      lastAttemptId: 'attempt-noop',
    }));
    expect(result).toMatchObject({
      updated: 0,
      noOp: 1,
      manualRequired: 1,
      remainingManualRequired: 1,
    });
  });

  it('provider partial business metadata fill is not resolved', async () => {
    const repository = {
      listStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-partial',
          symbol: 'PARTIAL.NS',
          providerSymbol: 'PARTIAL.NS',
          name: 'Partial Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          currency: 'INR',
          sector: null,
          industry: null,
          marketCap: null,
          assetType: 'STOCK',
          isActive: true,
          isDelisted: false,
        }],
      }),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(0),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(1),
      recordRepairAttempt: jest.fn().mockResolvedValue({ id: 'attempt-partial' }),
      upsertRepairState: jest.fn().mockResolvedValue({}),
      updateCompanyMasterData: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        sector: 'Industrials',
        dataStatus: 'PARTIAL',
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.repairProviderBusinessMetadata({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(repository.updateCompanyMasterData).toHaveBeenCalledWith('stock-partial', expect.objectContaining({
      sector: 'Industrials',
    }));
    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-partial',
      status: 'PARTIAL_SUCCESS',
      manualRequiredReason: expect.stringContaining('industry'),
    }));
    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      manualRequiredReason: expect.stringContaining('marketCap'),
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-partial',
      status: 'MANUAL_REQUIRED',
      manualRequiredReason: expect.stringContaining('industry'),
      resolvedAt: null,
    }));
    expect(result).toMatchObject({
      updated: 1,
      partialSuccess: 1,
      manualRequired: 1,
      fieldsFilled: { sector: 1 },
    });
    expect(result.warnings.join(' ')).toContain('industry');
    expect(result.warnings.join(' ')).toContain('marketCap');
  });

  it('provider full business metadata fill resolves current state', async () => {
    const repository = {
      listStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-full',
          symbol: 'FULL.NS',
          providerSymbol: 'FULL.NS',
          name: 'Full Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          currency: 'INR',
          sector: null,
          industry: null,
          marketCap: null,
          assetType: 'STOCK',
          isActive: true,
          isDelisted: false,
        }],
      }),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(0),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(0),
      recordRepairAttempt: jest.fn().mockResolvedValue({ id: 'attempt-full' }),
      upsertRepairState: jest.fn().mockResolvedValue({}),
      updateCompanyMasterData: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        sector: 'Industrials',
        industry: 'Electrical Equipment',
        marketCap: 1000,
        dataStatus: 'PARTIAL',
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    await service.repairProviderBusinessMetadata({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-full',
      status: 'SUCCESS',
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-full',
      status: 'RESOLVED',
      resolvedAt: expect.any(Date),
      nextRetryAt: null,
    }));
  });

  it('provider business metadata errors create retryable state with next retry time', async () => {
    const repository = {
      listStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-error',
          symbol: 'ERROR.NS',
          providerSymbol: 'ERROR.NS',
          name: 'Error Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          currency: 'INR',
          sector: null,
          industry: null,
          marketCap: null,
          assetType: 'STOCK',
          isActive: true,
          isDelisted: false,
        }],
      }),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(0),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(0),
      recordRepairAttempt: jest.fn().mockResolvedValue({ id: 'attempt-error' }),
      upsertRepairState: jest.fn().mockResolvedValue({}),
      updateCompanyMasterData: jest.fn(),
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockRejectedValue(new Error('Yahoo timeout')),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.repairProviderBusinessMetadata({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(repository.updateCompanyMasterData).not.toHaveBeenCalled();
    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-error',
      status: 'FAILED',
      error: 'Yahoo timeout',
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-error',
      status: 'FAILED_RETRYABLE',
      nextRetryAt: expect.any(Date),
      resolvedAt: null,
    }));
    expect(result).toMatchObject({ failed: 1 });
  });

  it('repairs catalog identity from configured catalog rows instead of relying on provider metadata', async () => {
    const repairCatalogIdentityForStock = jest.fn().mockResolvedValue({ action: 'updated', stock: {} });
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([{
        id: 'stock-catalog',
        symbol: 'ABB.NS',
        providerSymbol: 'ABB.NS',
        sourceSymbol: 'ABB',
        displaySymbol: 'ABB',
        name: 'ABB India Limited',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        sector: null,
        industry: null,
        currency: 'INR',
        marketCap: null,
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
        ipoDate: null,
        isin: null,
        catalogSource: null,
      }]),
      repairCatalogIdentityForStock,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.repairCatalogIdentity({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'SYMBOL,NAME OF COMPANY,SERIES,ISIN,DATE OF LISTING\nABB,ABB India Limited,EQ,INE117A01022,1999-01-01\n',
      catalogSource: 'NSE_EQUITY_SECURITIES',
      batchSize: 1,
      offset: 0,
    });

    expect(repairCatalogIdentityForStock).toHaveBeenCalledWith('stock-catalog', expect.objectContaining({
      symbol: 'ABB.NS',
      sourceSymbol: 'ABB',
      providerSymbol: 'ABB.NS',
      exchange: 'NSE',
      isin: 'INE117A01022',
      ipoDate: new Date('1999-01-01T00:00:00.000Z'),
      catalogSource: 'NSE_EQUITY_SECURITIES',
    }), expect.any(Object));
    expect(result).toMatchObject({
      processedCount: 1,
      updated: 1,
      catalogIdentityRepaired: 1,
      catalogRowsRead: 1,
      offset: 0,
      fieldsFilled: {
        isin: 1,
        ipoDate: 1,
        catalogSource: 1,
      },
    });
    expect(result.fieldProvenance?.[0]).toMatchObject({
      isinSource: 'NSE_EQUITY_SECURITIES',
      listingDateSource: 'NSE_EQUITY_SECURITIES',
    });
  });

  it('catalog identity repair chooses the exchange-specific matched stock id', async () => {
    const repairCatalogIdentityForStock = jest.fn().mockResolvedValue({ action: 'updated', stock: {} });
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          id: 'stock-nse',
          symbol: 'DUP.NS',
          providerSymbol: 'DUP.NS',
          sourceSymbol: 'DUP',
          displaySymbol: 'DUP',
          name: 'Duplicate Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          currency: 'INR',
          assetType: 'STOCK',
          isActive: true,
          isDelisted: false,
          ipoDate: null,
          isin: null,
        },
        {
          id: 'stock-bse',
          symbol: 'DUP.BO',
          providerSymbol: 'DUP.BO',
          sourceSymbol: 'DUP',
          displaySymbol: 'DUP',
          name: 'Duplicate Limited',
          region: 'IN',
          exchange: 'BSE',
          country: 'India',
          currency: 'INR',
          assetType: 'STOCK',
          isActive: true,
          isDelisted: false,
          ipoDate: null,
          isin: null,
        },
      ]),
      repairCatalogIdentityForStock,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.repairCatalogIdentity({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'SYMBOL,NAME OF COMPANY,SERIES,ISIN,DATE OF LISTING\nDUP,Duplicate Limited,EQ,INEDUP01010,2001-01-01\n',
      catalogSource: 'NSE_EQUITY_SECURITIES',
      batchSize: 1,
    });

    expect(repairCatalogIdentityForStock).toHaveBeenCalledWith('stock-nse', expect.objectContaining({
      symbol: 'DUP.NS',
      exchange: 'NSE',
      isin: 'INEDUP01010',
    }), expect.any(Object));
    expect(result.updated).toBe(1);
  });

  it('catalog identity repair pages over a stable catalog source list', async () => {
    const repairCatalogIdentityForStock = jest.fn().mockResolvedValue({ action: 'updated', stock: {} });
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([{
        id: 'stock-b',
        symbol: 'BBB.NS',
        providerSymbol: 'BBB.NS',
        sourceSymbol: 'BBB',
        displaySymbol: 'BBB',
        name: 'BBB Limited',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
        ipoDate: null,
        isin: null,
      }]),
      repairCatalogIdentityForStock,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.repairCatalogIdentity({
      region: 'IN',
      assetType: 'STOCK',
      csvText: [
        'SYMBOL,NAME OF COMPANY,SERIES,ISIN,DATE OF LISTING',
        'AAA,AAA Limited,EQ,INEAAA01010,1998-01-01',
        'BBB,BBB Limited,EQ,INEBBB01010,1999-01-01',
      ].join('\n'),
      catalogSource: 'NSE_EQUITY_SECURITIES',
      batchSize: 1,
      offset: 1,
    });

    expect(repairCatalogIdentityForStock).toHaveBeenCalledWith('stock-b', expect.objectContaining({ symbol: 'BBB.NS' }), expect.any(Object));
    expect(result).toMatchObject({
      processedCount: 1,
      totalCount: 2,
      offset: 1,
      nextOffset: null,
      matchedExistingRows: 1,
      updated: 1,
    });
  });

  it('catalog identity repair no-ops do not increment updated', async () => {
    const repairCatalogIdentityForStock = jest.fn();
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([{
        id: 'stock-full',
        symbol: 'FULL.NS',
        providerSymbol: 'FULL.NS',
        sourceSymbol: 'FULL',
        displaySymbol: 'FULL',
        name: 'Full Limited',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        assetType: 'STOCK',
        catalogSource: 'NSE_EQUITY_SECURITIES',
        isActive: true,
        isDelisted: false,
        ipoDate: new Date('1999-01-01T00:00:00.000Z'),
        isin: 'INEFULL01010',
      }]),
      repairCatalogIdentityForStock,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.repairCatalogIdentity({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'SYMBOL,NAME OF COMPANY,SERIES,ISIN,DATE OF LISTING\nFULL,Full Limited,EQ,INEFULL01010,1999-01-01\n',
      catalogSource: 'NSE_EQUITY_SECURITIES',
    });

    expect(repairCatalogIdentityForStock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      updated: 0,
      noOp: 1,
      skipped: 1,
    });
  });

  it('manual metadata import rejects null-equivalent sector and industry values', async () => {
    const updateCompanyMasterData = jest.fn();
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([{
        id: 'manual-1',
        symbol: 'MANUAL.NS',
        providerSymbol: 'MANUAL.NS',
        sourceSymbol: 'MANUAL',
        displaySymbol: 'MANUAL',
        name: 'Manual Limited',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
        sector: null,
        industry: null,
      }]),
      updateCompanyMasterData,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.importManualMetadata({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'symbol,sector,industry,marketCap\nMANUAL,Unknown,N/A,1000\n',
    });

    expect(updateCompanyMasterData).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
    expect(result.warnings[0]).toContain('rejected');
  });

  it('manual metadata import resolves current provider business repair state', async () => {
    const updateCompanyMasterData = jest.fn().mockResolvedValue({});
    const recordRepairAttempt = jest.fn().mockResolvedValue({ id: 'manual-attempt-1' });
    const upsertRepairState = jest.fn().mockResolvedValue({});
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([{
        id: 'manual-2',
        symbol: 'MANUAL2.NS',
        providerSymbol: 'MANUAL2.NS',
        sourceSymbol: 'MANUAL2',
        displaySymbol: 'MANUAL2',
        name: 'Manual Two Limited',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
        sector: null,
        industry: null,
        marketCap: null,
      }]),
      updateCompanyMasterData,
      recordRepairAttempt,
      upsertRepairState,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.importManualMetadata({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'symbol,sector,industry,marketCap\nMANUAL2,Industrials,Electrical Equipment,1000\n',
    });

    expect(updateCompanyMasterData).toHaveBeenCalledWith('manual-2', expect.objectContaining({
      sector: 'Industrials',
      industry: 'Electrical Equipment',
      marketCap: 1000,
    }));
    expect(recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'manual-2',
      repairType: 'MANUAL_METADATA_IMPORT',
      status: 'SUCCESS',
    }));
    expect(upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'manual-2',
      repairType: 'PROVIDER_BUSINESS_METADATA',
      status: 'RESOLVED',
      lastAttemptId: 'manual-attempt-1',
    }));
    expect(result).toMatchObject({
      updated: 1,
      fieldsFilled: {
        sector: 1,
        industry: 1,
        marketCap: 1,
      },
    });
  });

  it('manual metadata import rejects rows without positive marketCap', async () => {
    const updateCompanyMasterData = jest.fn().mockResolvedValue({});
    const recordRepairAttempt = jest.fn().mockResolvedValue({ id: 'manual-attempt-partial' });
    const upsertRepairState = jest.fn().mockResolvedValue({});
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([{
        id: 'manual-partial',
        symbol: 'MANUALP.NS',
        providerSymbol: 'MANUALP.NS',
        sourceSymbol: 'MANUALP',
        displaySymbol: 'MANUALP',
        name: 'Manual Partial Limited',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
        sector: null,
        industry: null,
        marketCap: null,
      }]),
      updateCompanyMasterData,
      recordRepairAttempt,
      upsertRepairState,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.importManualMetadata({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'symbol,sector,industry,marketCap\nMANUALP,Industrials,Electrical Equipment,0\n',
    });

    expect(updateCompanyMasterData).not.toHaveBeenCalled();
    expect(recordRepairAttempt).not.toHaveBeenCalled();
    expect(upsertRepairState).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      updated: 0,
      failed: 1,
      manualRequired: 1,
    });
    expect(result.warnings.join(' ')).toContain('positive numeric marketCap');
  });

  it('manual metadata template exports only unresolved business metadata rows', async () => {
    const service = new MarketDataFoundationService({
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          symbol: 'COMPLETE.NS',
          providerSupportStatus: 'SUPPORTED',
          providerSymbol: 'COMPLETE.NS',
          name: 'Complete Limited',
          exchange: 'NSE',
          isActive: true,
          isDelisted: false,
          sector: 'Industrials',
          industry: 'Electrical Equipment',
          marketCap: 1000,
        },
        {
          symbol: 'MISSING_SECTOR.NS',
          providerSupportStatus: 'SUPPORTED',
          providerSymbol: 'MISSING_SECTOR.NS',
          name: 'Missing Sector Limited',
          exchange: 'NSE',
          isActive: true,
          isDelisted: false,
          sector: null,
          industry: 'Electrical Equipment',
          marketCap: 1000,
        },
        {
          symbol: 'MISSING_MCAP.NS',
          providerSupportStatus: 'SUPPORTED',
          providerSymbol: 'MISSING_MCAP.NS',
          name: 'Missing Market Cap Limited',
          exchange: 'NSE',
          isActive: true,
          isDelisted: false,
          sector: 'Industrials',
          industry: 'Electrical Equipment',
          marketCap: null,
        },
      ]),
    } as any, {} as any);

    const result = await service.manualMetadataTemplate({ region: 'IN', assetType: 'STOCK' });

    expect(result.count).toBe(2);
    expect(result.rows.map((row) => row.symbol)).toEqual(['MISSING_SECTOR.NS', 'MISSING_MCAP.NS']);
    expect(result.rows[0].requiredFields).toContain('sector');
    expect(result.rows[1].requiredFields).toContain('marketCap');
    expect(result.csvText).toContain('symbol,providerSymbol,companyName,exchange,currentSector,currentIndustry,currentMarketCap,sector,industry,marketCap,requiredFields,suggestedSource,notes');
  });

  it('plans provider, price, metadata, and manual repair counts', async () => {
    const service = new MarketDataFoundationService({
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'UNKNOWN.NS', providerSupportStatus: 'UNKNOWN', isActive: true, isDelisted: false, sector: null, industry: null, marketCap: null, isin: null, ipoDate: null, providerSymbol: 'UNKNOWN.NS', country: 'India', currency: 'INR' },
        { symbol: 'FAILED.NS', providerSupportStatus: 'VALIDATION_FAILED', isActive: true, isDelisted: false, sector: 'Tech', industry: 'Software', marketCap: 1, isin: 'INE', ipoDate: new Date(), providerSymbol: 'FAILED.NS', sourceSymbol: 'FAILED', displaySymbol: 'FAILED', exchange: 'NSE', catalogSource: 'NSE_EQUITY_SECURITIES', country: 'India', currency: 'INR' },
        { symbol: 'PRICE.NS', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, sector: 'Tech', industry: 'Software', marketCap: 1, isin: 'INE2', ipoDate: new Date(), providerSymbol: 'PRICE.NS', sourceSymbol: 'PRICE', displaySymbol: 'PRICE', exchange: 'NSE', catalogSource: 'NSE_EQUITY_SECURITIES', country: 'India', currency: 'INR' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['UNKNOWN.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['FAILED.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['PRICE.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(1),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(0),
    } as any, {} as any);

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result).toMatchObject({
      providerValidationNeeded: 1,
      retryFailedValidations: 1,
      providerUnknownValidationNeeded: 1,
      providerRetryValidationNeeded: 1,
      providerValidationFailed: 1,
      catalogIdentityRepairNeeded: 1,
      priceBackfillNeeded: 1,
      businessMetadataRepairNeeded: 1,
      businessMetadataAutoRepairable: 1,
      businessMetadataManualRequired: 0,
      businessMetadataRetryBlocked: 0,
      businessMetadataRetryEligible: 0,
      businessMetadataRecentlyAttempted: 0,
      metadataEnrichmentNeeded: 1,
      manualMetadataRequired: 1,
      manualBusinessMetadataRequired: 0,
      missingIsin: 1,
      missingListingDate: 1,
      missingSector: 1,
      missingIndustry: 1,
      missingMarketCap: 1,
      manualSectorIndustryRequired: 1,
    });
    expect(result.universeSignoff.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PROVIDER_VALIDATION_RETRY_FAILED_REMAINING', nextAction: 'RETRY_FAILED_PROVIDERS', count: 1 }),
    ]));
  });

  it('normalizes trusted universe repair workbench lanes with bounded IN/STOCK actions', async () => {
    const service = new MarketDataFoundationService({} as any, {} as any);
    jest.spyOn(service, 'reviewReadinessSummary').mockResolvedValue({
      scope: { region: 'IN', assetType: 'STOCK' },
      generatedAt: '2026-05-13T00:00:00.000Z',
      reviewMode: 'NO_REVIEW',
      trustStatus: 'NOT_TRUSTWORTHY',
      userDecision: 'REPAIR_DATA',
      reviewUniverse: {
        catalogCount: 10,
        providerSupportedCount: 3,
        trustedCount: 1,
        targetTradingDate: '2026-05-12',
        requiredDataThroughDate: '2026-05-12',
        storedDataThroughDate: '2026-05-10',
      },
      readinessCounts: {
        priceReady: 1,
        contextReady: 1,
        reviewReady: 1,
        missingLatestPrice: 2,
        staleLatestPrice: 2,
        inadequateHistory: 1,
        missingRecentVolume: 1,
        providerUnknown: 4,
        providerValidationFailedRetryable: 1,
        unsupportedExcluded: 0,
      },
      blockers: [
        {
          category: 'PROVIDER_VALIDATION',
          severity: 'HARD_BLOCKER',
          affectedCount: 5,
          explanation: 'Provider support is not proven.',
          nextActionCode: 'VALIDATE_PROVIDERS',
          nextActionLabel: 'Validate unknown providers',
          boundedRequest: { region: 'IN', assetType: 'STOCK', batchSize: 50 },
        },
        {
          category: 'INSUFFICIENT_TRUSTED_UNIVERSE',
          severity: 'HARD_BLOCKER',
          affectedCount: 99,
          explanation: 'Below minimum trusted universe.',
          nextActionCode: 'REVIEW_REPAIR_PLAN',
          nextActionLabel: 'Review bounded repair plan',
          boundedRequest: { region: 'IN', assetType: 'STOCK', batchSize: 50 },
        },
      ],
      nextAction: {
        code: 'VALIDATE_PROVIDERS',
        label: 'Validate unknown providers',
        boundedRequest: { region: 'IN', assetType: 'STOCK', batchSize: 50 },
      },
      warnings: ['Today Review remains NO_REVIEW.'],
    });
    jest.spyOn(service, 'repairPlan').mockResolvedValue({
      scope: { region: 'IN', assetType: 'STOCK' },
      generatedAt: '2026-05-13T00:00:00.000Z',
      totalCatalogInstruments: 10,
      providerUnknownValidationNeeded: 4,
      providerRetryValidationNeeded: 1,
      providerUnsupportedExcluded: 0,
      providerValidationFailed: 1,
      providerValidationNeeded: 4,
      retryFailedValidations: 1,
      supportedCatalogIdentityRepairNeeded: 2,
      supportedBusinessMetadataRepairNeeded: 3,
      supportedPriceBackfillNeeded: 2,
      unsupportedExcluded: 0,
      catalogIdentityRepairNeeded: 2,
      priceBackfillNeeded: 2,
      businessMetadataRepairNeeded: 3,
      businessMetadataAutoRepairable: 1,
      businessMetadataManualRequired: 1,
      businessMetadataRetryBlocked: 1,
      businessMetadataRetryEligible: 1,
      businessMetadataRecentlyAttempted: 2,
      metadataEnrichmentNeeded: 3,
      manualMetadataRequired: 1,
      manualBusinessMetadataRequired: 1,
      missingIsin: 2,
      missingListingDate: 2,
      missingSector: 1,
      missingIndustry: 1,
      missingMarketCap: 1,
      manualSectorIndustryRequired: 1,
      topActions: [],
      warnings: ['Repair lanes available.'],
      universeSignoff: {
        status: 'FAIL',
        minReviewReadyRequired: 300,
        reviewReadyActual: 1,
        blockers: [],
        nextAction: 'VALIDATE_PROVIDERS',
        downstreamAllowed: false,
      },
    });
    jest.spyOn(service, 'latestRepairRun').mockResolvedValue({
      id: 'run-1',
      scope: { region: 'IN', assetType: 'STOCK' },
      status: 'PARTIAL',
      startedAt: '2026-05-13T01:00:00.000Z',
      completedAt: '2026-05-13T01:01:00.000Z',
      beforeHealth: null,
      afterHealth: null,
      beforeRepairPlan: null,
      afterRepairPlan: null,
      actions: [
        {
          action: 'VALIDATE_PROVIDERS',
          label: 'Validate unknown providers',
          estimatedTotal: 5,
          estimatedBatchCount: 1,
          batchesPlanned: 1,
          batchesExecuted: 1,
          dryRun: false,
          hasMore: false,
          anotherRunNeeded: false,
          totals: { processedCount: 5, updated: 4, skipped: 0, failed: 1, noOp: 0, manualRequired: 0 },
          summaries: [],
          warnings: ['One provider failed.'],
        },
      ],
      summary: {
        actionsRequested: ['VALIDATE_PROVIDERS'],
        batchesExecuted: 1,
        updated: 4,
        skipped: 0,
        failed: 1,
        noOp: 0,
        manualRequired: 0,
      },
      warnings: ['One provider failed.'],
      anotherRunNeeded: true,
      hardBlockersRemaining: [],
      expectedNextAction: 'CATALOG_IDENTITY_REPAIR',
      afterTrustStatus: 'NOT_TRUSTWORTHY',
      universeSignoff: null,
    });

    const result = await service.trustedUniverseRepairWorkbench({ region: 'US', assetType: 'ETF' });

    expect(result.scope).toEqual({ region: 'IN', assetType: 'STOCK' });
    expect(result.recommendedNextLane).toBe('PROVIDER_VALIDATION');
    expect(result.lanes.map((lane) => lane.code)).toEqual([
      'PROVIDER_VALIDATION',
      'PRICE_BACKFILL',
      'STALE_EOD',
      'CATALOG_IDENTITY',
      'PROVIDER_BUSINESS_METADATA',
      'MANUAL_METADATA_IMPORT',
      'INSUFFICIENT_TRUSTED_UNIVERSE',
    ]);
    expect(result.lanes[0]).toMatchObject({
      affectedCount: 5,
      eligibleNowCount: 5,
      retryableFailureCount: 1,
      boundedBatchSize: 50,
      lastRun: {
        id: 'run-1',
        status: 'PARTIAL',
        successCount: 4,
        failureCount: 1,
        skippedCount: 0,
        warningCount: 1,
      },
      nextAction: {
        enabled: true,
        actionCode: 'VALIDATE_PROVIDERS',
        endpoint: '/api/v1/market-data/provider/validate',
        request: { region: 'IN', assetType: 'STOCK', batchSize: 50, offset: 0, queueMode: 'UNKNOWN_FIRST' },
      },
    });
    expect(result.lanes.find((lane) => lane.code === 'MANUAL_METADATA_IMPORT')).toMatchObject({
      manualRequiredCount: 1,
      nextAction: {
        enabled: false,
        disabledReason: 'Requires explicit manual metadata CSV payload.',
      },
    });
    expect(result.lanes.find((lane) => lane.code === 'INSUFFICIENT_TRUSTED_UNIVERSE')).toMatchObject({
      affectedCount: 99,
      nextAction: { enabled: false },
    });
  });

  it('repair plan counts market-cap-only gaps in the manual business metadata path', async () => {
    const service = new MarketDataFoundationService({
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          symbol: 'MCAPONLY.NS',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          sector: 'Industrials',
          industry: 'Electrical Equipment',
          marketCap: null,
          isin: 'INE123A01010',
          ipoDate: new Date('2000-01-01T00:00:00.000Z'),
          providerSymbol: 'MCAPONLY.NS',
          sourceSymbol: 'MCAPONLY',
          displaySymbol: 'MCAPONLY',
          exchange: 'NSE',
          catalogSource: 'NSE_EQUITY_SECURITIES',
          country: 'India',
          currency: 'INR',
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['MCAPONLY.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(1),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(0),
    } as any, {} as any);

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });
    const manualImportAction = result.topActions.find((item) => item.action === 'MANUAL_METADATA_IMPORT');

    expect(result).toMatchObject({
      businessMetadataRepairNeeded: 1,
      manualBusinessMetadataRequired: 1,
      manualSectorIndustryRequired: 0,
      missingMarketCap: 1,
      missingSector: 0,
      missingIndustry: 0,
    });
    expect(manualImportAction).toMatchObject({ count: 1 });
    expect(result.warnings.join(' ')).toContain('manual business metadata');
    expect(result.warnings.join(' ')).toContain('market cap');
  });

  it('excludes unknown, retry-failed, and unsupported rows from supported metadata and price blockers', async () => {
    const service = new MarketDataFoundationService({
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'UNKNOWN.NS', providerSupportStatus: 'UNKNOWN', isActive: true, isDelisted: false, sector: null, industry: null, marketCap: null, isin: null, ipoDate: null, providerSymbol: 'UNKNOWN.NS', country: 'India', currency: 'INR' },
        { symbol: 'RETRY.NS', providerSupportStatus: 'VALIDATION_FAILED', isActive: true, isDelisted: false, sector: null, industry: null, marketCap: null, isin: null, ipoDate: null, providerSymbol: 'RETRY.NS', country: 'India', currency: 'INR' },
        { symbol: 'UNSUPPORTED.NS', providerSupportStatus: 'UNSUPPORTED', isActive: true, isDelisted: false, sector: null, industry: null, marketCap: null, isin: null, ipoDate: null, providerSymbol: 'UNSUPPORTED.NS', country: 'India', currency: 'INR' },
        { symbol: 'SUPPORTED.NS', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, sector: null, industry: null, marketCap: null, isin: null, ipoDate: null, providerSymbol: 'SUPPORTED.NS', country: 'India', currency: 'INR' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['UNKNOWN.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['RETRY.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['UNSUPPORTED.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['SUPPORTED.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(1),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(0),
    } as any, {} as any);

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result).toMatchObject({
      providerValidationNeeded: 1,
      retryFailedValidations: 1,
      providerUnsupportedExcluded: 1,
      supportedCatalogIdentityRepairNeeded: 1,
      supportedBusinessMetadataRepairNeeded: 1,
      supportedPriceBackfillNeeded: 1,
      manualBusinessMetadataRequired: 1,
    });
  });

  const reviewReadyStock = (overrides: any = {}) => ({
    symbol: 'READY.NS',
    providerSymbol: 'READY.NS',
    sourceSymbol: 'READY',
    displaySymbol: 'READY',
    name: 'Ready Limited',
    providerSupportStatus: 'SUPPORTED',
    isActive: true,
    isDelisted: false,
    sector: 'Industrials',
    industry: 'Electrical Equipment',
    marketCap: 1000,
    isin: 'INE123A01010',
    ipoDate: new Date('2000-01-01T00:00:00.000Z'),
    exchange: 'NSE',
    catalogSource: 'NSE_EQUITY_SECURITIES',
    country: 'India',
    currency: 'INR',
    region: 'IN',
    assetType: 'STOCK',
    ...overrides,
  });

  const reviewReadyPriceStats = (overrides: any = {}) => ({
    priceHistoryBars: 3820,
    firstPriceDate: '2011-05-12',
    latestPriceDate: latestCompletedTradingDateForRegion('IN'),
    latestVolume: 1000,
    latestAdjustedClose: 100,
    latestClose: 100,
    rollingWindowBars: 252,
    rollingWindowCoveragePercent: 100,
    maxPriceGapDays: 1,
    recentVolumeCoveragePercent: 100,
    adjustedCloseCoveragePercent: 100,
    usesAdjustedCloseFallback: false,
    ...overrides,
  });

  const planServiceForStock = (stockRow: any, priceStats: any) => new MarketDataFoundationService({
    listStocksForUniverseHealth: jest.fn().mockResolvedValue([stockRow]),
    priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([[stockRow.symbol, priceStats]])),
  } as any, {} as any);

  it('signoff fails with provider unknown remaining', async () => {
    const service = planServiceForStock(
      reviewReadyStock({ providerSupportStatus: 'UNKNOWN' }),
      reviewReadyPriceStats({ priceHistoryBars: 0, latestPriceDate: null, latestVolume: null })
    );

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result.universeSignoff).toMatchObject({
      status: 'FAIL',
      downstreamAllowed: false,
      nextAction: 'VALIDATE_PROVIDERS',
    });
    expect(result.universeSignoff.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PROVIDER_UNKNOWN_REMAINING', count: 1, required: 0 }),
    ]));
  });

  it('signoff fails with missing business metadata', async () => {
    const service = planServiceForStock(
      reviewReadyStock({ sector: null, industry: 'Electrical Equipment', marketCap: 1000 }),
      reviewReadyPriceStats()
    );

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result.manualBusinessMetadataRequired).toBe(1);
    expect(result.universeSignoff).toMatchObject({
      status: 'FAIL',
      downstreamAllowed: false,
      nextAction: 'PROVIDER_BUSINESS_METADATA_REPAIR',
    });
    expect(result.universeSignoff.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'BUSINESS_METADATA_AUTO_REPAIRABLE_REMAINING', count: 1 }),
      expect.objectContaining({ code: 'MANUAL_BUSINESS_METADATA_REQUIRED', count: 1 }),
    ]));
  });

  it('signoff fails with price backfill needed', async () => {
    const service = planServiceForStock(
      reviewReadyStock(),
      reviewReadyPriceStats({ priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null })
    );

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result.priceBackfillNeeded).toBe(1);
    expect(result.universeSignoff).toMatchObject({
      status: 'FAIL',
      downstreamAllowed: false,
      nextAction: 'BACKFILL_PRICES',
    });
    expect(result.universeSignoff.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PRICE_BACKFILL_REMAINING', count: 1 }),
    ]));
  });

  it('repair plan keeps 15-year history gaps in the backfill queue even when 252-bar readiness passes', async () => {
    const service = planServiceForStock(
      reviewReadyStock(),
      reviewReadyPriceStats({
        priceHistoryBars: 300,
        firstPriceDate: '2020-01-01',
        rollingWindowBars: 252,
        rollingWindowCoveragePercent: 100,
      })
    );

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result).toMatchObject({
      priceBackfillNeeded: 1,
      supportedPriceBackfillNeeded: 1,
      historyCoverageIncomplete: 1,
      historyCoverageListingDateMissing: 0,
    });
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('15-year/listing-date daily OHLCV window'),
    ]));
  });

  it('does not treat sparse 15-year boundary rows as complete required history coverage', async () => {
    const service = planServiceForStock(
      reviewReadyStock(),
      reviewReadyPriceStats({
        priceHistoryBars: 300,
        firstPriceDate: '2011-05-12',
        latestPriceDate: latestCompletedTradingDateForRegion('IN'),
        rollingWindowBars: 252,
        rollingWindowCoveragePercent: 100,
      })
    );

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result).toMatchObject({
      priceBackfillNeeded: 1,
      historyCoverageIncomplete: 1,
    });
  });

  it('signoff fails when review-ready count is below configured minimum', async () => {
    const service = planServiceForStock(reviewReadyStock(), reviewReadyPriceStats());

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result.universeSignoff).toMatchObject({
      status: 'FAIL',
      downstreamAllowed: false,
      reviewReadyActual: 1,
      minReviewReadyRequired: 300,
    });
    expect(result.universeSignoff.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'REVIEW_READY_BELOW_MINIMUM', count: 1, required: 300 }),
    ]));
  });

  it('signoff passes only when every threshold passes', async () => {
    const previousThreshold = process.env.MARKET_DATA_SIGNOFF_MIN_REVIEW_READY;
    process.env.MARKET_DATA_SIGNOFF_MIN_REVIEW_READY = '1';
    try {
      const service = planServiceForStock(reviewReadyStock(), reviewReadyPriceStats());

      const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

      expect(result.universeSignoff).toMatchObject({
        status: 'PASS',
        downstreamAllowed: true,
        reviewReadyActual: 1,
        minReviewReadyRequired: 1,
        blockers: [],
        nextAction: null,
      });
    } finally {
      if (previousThreshold === undefined) delete process.env.MARKET_DATA_SIGNOFF_MIN_REVIEW_READY;
      else process.env.MARKET_DATA_SIGNOFF_MIN_REVIEW_READY = previousThreshold;
    }
  });

  it('backfills prices in bounded batches for provider-supported price gaps', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'PRICE.NS', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, providerSymbol: 'PRICE.NS', sector: 'Tech', industry: 'Software', country: 'India', currency: 'INR' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['PRICE.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 252,
      rowsInserted: 252,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    const result = await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1, offset: 0 });

    const ingestCall = (service.ingestSymbol as jest.Mock).mock.calls[0];
    const deepStartDate = ingestCall[1] as Date;
    const cappedEndDate = ingestCall[2] as Date;
    const latestCompletedEod = latestCompletedTradingDateForRegion('IN');
    const expectedDeepStart = new Date(`${latestCompletedEod}T00:00:00.000Z`);
    expectedDeepStart.setUTCFullYear(expectedDeepStart.getUTCFullYear() - 15);
    expect(cappedEndDate.toISOString().slice(0, 10)).toBe(latestCompletedTradingDateForRegion('IN'));
    expect(deepStartDate.toISOString()).toBe(expectedDeepStart.toISOString());
    expect(service.ingestSymbol).toHaveBeenCalledWith('PRICE.NS', deepStartDate, cappedEndDate, false, expect.objectContaining({
      force: true,
      region: 'IN',
      assetType: 'STOCK',
      skipFreshnessGate: true,
      preserveProviderSupportOnZeroRows: true,
    }));
    expect(result).toMatchObject({
      processedCount: 1,
      updated: 1,
      priceRowsReceived: 252,
      priceRowsInserted: 252,
      deepReloaded: 1,
      incrementalCaughtUp: 0,
      latestCompletedEodDate: latestCompletedEod,
      targetEndDate: cappedEndDate.toISOString(),
      remainingCandidates: 1,
      hasMore: true,
      nextOffset: 0,
      stillUnder120: 1,
      stillUnder200: 1,
      stillUnder252: 1,
      historyCoverageIncomplete: 1,
      historyCoverageListingDateMissing: 1,
      requiredHistoryCoverageStatus: 'NEEDS_BACKFILL',
    });
    expect(result.sampleCoverageResults?.[0]).toMatchObject({
      symbol: 'PRICE.NS',
      listingDateMissing: true,
      storedHistoryStartDate: null,
      storedHistoryEndDate: null,
      requiredHistoryComplete: false,
      coverageStatus: 'NEEDS_BACKFILL',
    });
  });

  it('deep-backfills shallow supported rows without operator fullReload despite recent load timestamp', async () => {
    const latestCompletedEod = latestCompletedTradingDateForRegion('IN');
    const repository = {
      listStocksForUniverseHealth: jest.fn()
        .mockResolvedValueOnce([
          {
            symbol: 'SHALLOW.NS',
            providerSupportStatus: 'SUPPORTED',
            isActive: true,
            isDelisted: false,
            providerSymbol: 'SHALLOW.NS',
            lastSuccessfulDataLoadTimestamp: new Date('2026-05-11T00:00:00.000Z'),
            sector: 'Tech',
            industry: 'Software',
            country: 'India',
            currency: 'INR',
          },
        ])
        .mockResolvedValueOnce([]),
      priceReadinessStatsForSymbols: jest.fn()
        .mockResolvedValueOnce(new Map([
          ['SHALLOW.NS', { priceHistoryBars: 20, firstPriceDate: '2026-04-15', latestPriceDate: '2026-05-11', latestVolume: 100, latestAdjustedClose: null, latestClose: 10, rollingWindowBars: 20, recentVolumeCoveragePercent: 100 }],
        ]))
        .mockResolvedValueOnce(new Map()),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 300,
      rowsInserted: 280,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 20,
      warningCount: 0,
      warnings: [],
    });

    const result = await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1, fullReload: false });

    const ingestCall = (service.ingestSymbol as jest.Mock).mock.calls[0];
    const startDate = ingestCall[1] as Date;
    const expectedDeepStart = new Date(`${latestCompletedEod}T00:00:00.000Z`);
    expectedDeepStart.setUTCFullYear(expectedDeepStart.getUTCFullYear() - 15);
    expect(startDate.toISOString()).toBe(expectedDeepStart.toISOString());
    expect(ingestCall[3]).toBe(false);
    expect(result).toMatchObject({
      deepReloaded: 1,
      incrementalCaughtUp: 0,
      remainingCandidates: 0,
      stillUnder120: 0,
      stillUnder200: 0,
      stillUnder252: 0,
    });
  });

  it('uses listing date as the deep backfill start for companies listed less than 15 years', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn()
        .mockResolvedValueOnce([
          {
            symbol: 'YOUNG.NS',
            providerSupportStatus: 'SUPPORTED',
            isActive: true,
            isDelisted: false,
            providerSymbol: 'YOUNG.NS',
            ipoDate: new Date('2020-08-10T00:00:00.000Z'),
            sector: 'Tech',
            industry: 'Software',
            country: 'India',
            currency: 'INR',
          },
        ])
        .mockResolvedValueOnce([]),
      priceReadinessStatsForSymbols: jest.fn()
        .mockResolvedValueOnce(new Map([
          ['YOUNG.NS', { priceHistoryBars: 252, firstPriceDate: '2021-01-01', latestPriceDate: latestCompletedTradingDateForRegion('IN'), latestVolume: 100, latestAdjustedClose: 10, latestClose: 10, rollingWindowBars: 252, rollingWindowCoveragePercent: 100, recentVolumeCoveragePercent: 100 }],
        ]))
        .mockResolvedValueOnce(new Map()),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 10,
      rowsInserted: 10,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    const result = await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    const ingestCall = (service.ingestSymbol as jest.Mock).mock.calls[0];
    const startDate = ingestCall[1] as Date;
    expect(startDate.toISOString()).toBe('2020-08-10T00:00:00.000Z');
    expect(result).toMatchObject({
      deepReloaded: 1,
      historyCoverageIncomplete: 0,
      historyCoverageListingDateMissing: 0,
    });
    expect(result.sampleCoverageResults?.[0]).toMatchObject({
      symbol: 'YOUNG.NS',
      requiredHistoryStartDate: '2020-08-10',
      listingDate: '2020-08-10',
      storedHistoryStartDate: '2021-01-01',
      requiredHistoryComplete: false,
    });
  });

  it('keeps Yahoo zero-row price backfill results as free fallback required', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          symbol: 'EMPTY.NS',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          providerSymbol: 'EMPTY.NS',
          sector: 'Tech',
          industry: 'Software',
          country: 'India',
          currency: 'INR',
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['EMPTY.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 1,
      warnings: ['Provider returned zero usable historical price rows.'],
    });

    const result = await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(result).toMatchObject({
      zeroRowProviderReturns: 1,
      historyCoverageFallbackRequired: 1,
      requiredHistoryCoverageStatus: 'FALLBACK_REQUIRED',
      skipped: 1,
    });
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('approved free official/public exchange fallback is required'),
    ]));
    expect(result.sampleCoverageResults?.[0]).toMatchObject({
      symbol: 'EMPTY.NS',
      sourceFallbackReason: 'YAHOO_ZERO_ROWS',
    });
  });

  it('uses incremental catch-up for stale rows that already have complete required history coverage', async () => {
    const latestCompletedEod = latestCompletedTradingDateForRegion('IN')!;
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'STALE.NS', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, providerSymbol: 'STALE.NS', sector: 'Tech', industry: 'Software', country: 'India', currency: 'INR' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['STALE.NS', { priceHistoryBars: 3820, firstPriceDate: '2011-05-12', latestPriceDate: '2026-01-01', latestVolume: 100, latestAdjustedClose: 10, latestClose: 10, rollingWindowBars: 252, rollingWindowCoveragePercent: 100, recentVolumeCoveragePercent: 100 }],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 5,
      rowsInserted: 5,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    const result = await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    const ingestCall = (service.ingestSymbol as jest.Mock).mock.calls[0];
    const startDate = ingestCall[1] as Date;
    const expectedStart = new Date(`${latestCompletedEod}T00:00:00.000Z`);
    expectedStart.setUTCDate(expectedStart.getUTCDate() - 30);
    expect(startDate.toISOString()).toBe(expectedStart.toISOString());
    expect(result).toMatchObject({ deepReloaded: 0, incrementalCaughtUp: 1 });
  });

  it('forces deep repair for all selected candidates when fullReload is true', async () => {
    const latestCompletedEod = latestCompletedTradingDateForRegion('IN')!;
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'FORCE.NS', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, providerSymbol: 'FORCE.NS', sector: 'Tech', industry: 'Software', country: 'India', currency: 'INR' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['FORCE.NS', { priceHistoryBars: 300, latestPriceDate: '2026-01-01', latestVolume: 100, latestAdjustedClose: 10, latestClose: 10, rollingWindowBars: 252, rollingWindowCoveragePercent: 100, recentVolumeCoveragePercent: 100 }],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 0,
      rowsUpdated: 1,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1, fullReload: true });

    const ingestCall = (service.ingestSymbol as jest.Mock).mock.calls[0];
    const expectedDeepStart = new Date(`${latestCompletedEod}T00:00:00.000Z`);
    expectedDeepStart.setUTCFullYear(expectedDeepStart.getUTCFullYear() - 15);
    expect((ingestCall[1] as Date).toISOString()).toBe(expectedDeepStart.toISOString());
    expect(ingestCall[3]).toBe(true);
  });

  it('orders price backfill candidates by missing latest, shallow depth, stale latest, then symbol', async () => {
    const rows = [
      ['STALE.NS', 300, '2026-01-01'],
      ['U230.NS', 230, '2026-05-11'],
      ['MISSING.NS', 0, null],
      ['U180.NS', 180, '2026-05-11'],
      ['U119.NS', 119, '2026-05-11'],
    ] as const;
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue(rows.map(([symbol]) => ({
        symbol,
        providerSupportStatus: 'SUPPORTED',
        isActive: true,
        isDelisted: false,
        providerSymbol: symbol,
        sector: 'Tech',
        industry: 'Software',
        country: 'India',
        currency: 'INR',
      }))),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map(rows.map(([symbol, bars, latestPriceDate]) => [
        symbol,
        { priceHistoryBars: bars, latestPriceDate, latestVolume: 100, latestAdjustedClose: 10, latestClose: 10, rollingWindowBars: Math.min(bars, 252), rollingWindowCoveragePercent: Math.min(100, (bars / 252) * 100), recentVolumeCoveragePercent: 100 },
      ]))),
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

    await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 5 });

    expect((service.ingestSymbol as jest.Mock).mock.calls.map((call) => call[0])).toEqual([
      'MISSING.NS',
      'U119.NS',
      'U180.NS',
      'U230.NS',
      'STALE.NS',
    ]);
  });

  it('skips provider fetch and reports MARKET_CALENDAR_UNCERTAIN when no latest completed EOD is available', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'GLOBAL', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, providerSymbol: 'GLOBAL', sector: 'Tech', industry: 'Software', country: 'US', currency: 'USD' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['GLOBAL', { priceHistoryBars: 20, latestPriceDate: '2026-05-11', latestVolume: 100, latestAdjustedClose: null, latestClose: 10, rollingWindowBars: 20, recentVolumeCoveragePercent: 100 }],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const ingestSpy = jest.spyOn(service, 'ingestSymbol');

    const result = await service.backfillPrices({ region: 'GLOBAL', assetType: 'STOCK', batchSize: 1 });

    expect(ingestSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      processedCount: 0,
      latestCompletedEodDate: null,
      remainingCandidates: 1,
      stillUnder120: 1,
      stillUnder200: 1,
      stillUnder252: 1,
    });
    expect(result.warnings.join('\n')).toContain('MARKET_CALENDAR_UNCERTAIN');
  });

  it('reports zero-row provider returns without preserving them as successful repairs', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'EMPTY.NS', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, providerSymbol: 'EMPTY.NS', sector: 'Tech', industry: 'Software', country: 'India', currency: 'INR' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['EMPTY.NS', { priceHistoryBars: 20, latestPriceDate: '2026-05-11', latestVolume: 100, latestAdjustedClose: null, latestClose: 10, rollingWindowBars: 20, recentVolumeCoveragePercent: 100 }],
      ])),
      findStockBySymbol: jest.fn().mockResolvedValue({ symbol: 'EMPTY.NS', providerSymbol: 'EMPTY.NS', region: 'IN', assetType: 'STOCK', lastSuccessfulDataLoadTimestamp: new Date('2026-05-11T00:00:00.000Z') }),
      upsertSyncState: jest.fn().mockResolvedValue({}),
      updateProviderSupportStatus: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
      fetchHistorical: jest.fn().mockResolvedValue([]),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(repository.updateProviderSupportStatus).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      processedCount: 1,
      updated: 0,
      skipped: 1,
      zeroRowProviderReturns: 1,
      priceRowsReceived: 0,
      hasMore: true,
      nextOffset: 0,
    });
  });

  it('does not mark zero provider price rows as a successful sync', async () => {
    const repository = {
      findStockBySymbol: jest.fn().mockResolvedValue({ symbol: 'EMPTY.NS', providerSymbol: 'EMPTY.NS', region: 'IN', assetType: 'STOCK', lastSuccessfulDataLoadTimestamp: null }),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue(null),
      getSyncState: jest.fn().mockResolvedValue(null),
      updateStockLoadTimestampBySymbol: jest.fn().mockResolvedValue({}),
      updateProviderSupportStatus: jest.fn().mockResolvedValue({}),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
      fetchHistorical: jest.fn().mockResolvedValue([]),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.ingestSymbol('EMPTY.NS', new Date('2026-01-01T00:00:00.000Z'), new Date('2026-05-11T00:00:00.000Z'), false, { force: true });

    expect(repository.updateStockLoadTimestampBySymbol).not.toHaveBeenCalled();
    expect(repository.updateProviderSupportStatus).toHaveBeenCalledWith('EMPTY.NS', 'UNSUPPORTED', 'Provider returned zero usable historical price rows.');
    expect(repository.upsertSyncState).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILED' }));
    expect(result).toMatchObject({
      rowsReceived: 0,
      warningCount: 1,
      warnings: ['Provider returned zero usable historical price rows.'],
    });
  });
});

describe('MarketDataFoundationService operational repair run', () => {
  const health = (overrides: any = {}) => {
    const { counts: countOverrides = {}, coverage: coverageOverrides = {}, topBlockers, ...rest } = overrides;
    return {
      scope: { region: 'IN', assetType: 'STOCK' },
      generatedAt: '2026-05-12T00:00:00.000Z',
      latestStoredEodDate: '2026-05-08',
      expectedLatestTradingDate: '2026-05-11',
      counts: {
      CATALOG_ONLY: 2,
      PROVIDER_SUPPORTED: 1,
      PRICE_READY: 0,
      CONTEXT_READY: 0,
      REVIEW_READY: 0,
      UNSUPPORTED: 0,
      STALE_OR_INCOMPLETE: 1,
      DELISTED_OR_INACTIVE: 0,
      totalCatalogInstruments: 3,
      activeInstruments: 3,
      inactiveOrDelistedInstruments: 0,
      providerSupported: 1,
      providerUnknown: 2,
      providerUnknownValidationNeeded: countOverrides.providerUnknownValidationNeeded ?? countOverrides.providerUnknown ?? 2,
      providerRetryValidationNeeded: countOverrides.providerRetryValidationNeeded ?? countOverrides.providerValidationFailed ?? 0,
      providerUnsupportedExcluded: countOverrides.providerUnsupportedExcluded ?? countOverrides.unsupportedExcluded ?? 0,
      providerValidationFailed: countOverrides.providerValidationFailed ?? countOverrides.providerRetryValidationNeeded ?? 0,
      unsupported: 0,
      unsupportedExcluded: countOverrides.unsupportedExcluded ?? countOverrides.providerUnsupportedExcluded ?? 0,
      supportedCatalogIdentityRepairNeeded: countOverrides.supportedCatalogIdentityRepairNeeded ?? 1,
      supportedBusinessMetadataRepairNeeded: countOverrides.supportedBusinessMetadataRepairNeeded ?? 1,
      supportedPriceBackfillNeeded: countOverrides.supportedPriceBackfillNeeded ?? 1,
      catalogOnly: 2,
      priceReady: 0,
      contextReady: 0,
      reviewReady: 0,
      staleOrIncomplete: 1,
      missingLatestPrice: 2,
      staleLatestPrice: 1,
      missingOrInadequatePriceHistory: 2,
      missingRecentVolume: 2,
      missingSector: 2,
      missingIndustry: 2,
      missingCountry: 0,
      missingCurrency: 0,
      missingMarketCap: 2,
      missingIsin: 2,
        missingListingDate: 2,
        ...countOverrides,
      },
      coverage: {
        priceCoveragePercentage: 0,
        metadataCoveragePercentage: 0,
        reviewReadyPercentage: 0,
        ...coverageOverrides,
      },
      topBlockers: topBlockers || [
        { code: 'PROVIDER_UNKNOWN', label: 'Provider support unknown', count: 2, severity: 'critical' },
      ],
      warnings: [],
      trustStatus: 'NOT_TRUSTWORTHY',
      trustReasons: ['Review-ready universe is empty under strict rules.'],
      universeSignoff: {
        status: 'FAIL',
        minReviewReadyRequired: 300,
        reviewReadyActual: 0,
        blockers: [
          { code: 'PROVIDER_UNKNOWN_REMAINING', severity: 'critical', count: 2, required: 0, nextAction: 'VALIDATE_PROVIDERS' },
        ],
        nextAction: 'VALIDATE_PROVIDERS',
        downstreamAllowed: false,
      },
      ...rest,
    };
  };

  const plan = (overrides: any = {}) => {
    const base = {
    scope: { region: 'IN', assetType: 'STOCK' },
    generatedAt: '2026-05-12T00:00:00.000Z',
    totalCatalogInstruments: 3,
    providerUnknownValidationNeeded: 2,
    providerRetryValidationNeeded: 0,
    providerUnsupportedExcluded: 0,
    providerValidationFailed: 0,
    providerValidationNeeded: 2,
    retryFailedValidations: 0,
    supportedCatalogIdentityRepairNeeded: 2,
    supportedBusinessMetadataRepairNeeded: 2,
    supportedPriceBackfillNeeded: 1,
    unsupportedExcluded: 0,
    catalogIdentityRepairNeeded: 2,
    priceBackfillNeeded: 1,
    businessMetadataRepairNeeded: 2,
    businessMetadataAutoRepairable: 2,
    businessMetadataManualRequired: 0,
    businessMetadataRetryBlocked: 0,
    businessMetadataRetryEligible: 0,
    businessMetadataRecentlyAttempted: 0,
    metadataEnrichmentNeeded: 2,
    manualMetadataRequired: 2,
    manualBusinessMetadataRequired: 2,
    missingIsin: 2,
    missingListingDate: 2,
    missingSector: 2,
    missingIndustry: 2,
    missingMarketCap: 2,
    manualSectorIndustryRequired: 2,
    topActions: [],
    warnings: [],
    universeSignoff: {
      status: 'FAIL',
      minReviewReadyRequired: 300,
      reviewReadyActual: 0,
      blockers: [
        { code: 'PROVIDER_UNKNOWN_REMAINING', severity: 'critical', count: 2, required: 0, nextAction: 'VALIDATE_PROVIDERS' },
      ],
      nextAction: 'VALIDATE_PROVIDERS',
      downstreamAllowed: false,
    },
    };
    const merged = { ...base, ...overrides };
    merged.providerUnknownValidationNeeded = overrides.providerUnknownValidationNeeded ?? overrides.providerValidationNeeded ?? merged.providerUnknownValidationNeeded;
    merged.providerRetryValidationNeeded = overrides.providerRetryValidationNeeded ?? overrides.retryFailedValidations ?? merged.providerRetryValidationNeeded;
    merged.supportedCatalogIdentityRepairNeeded = overrides.supportedCatalogIdentityRepairNeeded ?? overrides.catalogIdentityRepairNeeded ?? merged.supportedCatalogIdentityRepairNeeded;
    merged.supportedPriceBackfillNeeded = overrides.supportedPriceBackfillNeeded ?? overrides.priceBackfillNeeded ?? merged.supportedPriceBackfillNeeded;
    return merged;
  };

  const summary = (overrides: any = {}) => ({
    scope: { region: 'IN', assetType: 'STOCK' },
    processedCount: 1,
    totalCount: 1,
    batchSize: 50,
    offset: 0,
    nextOffset: null,
    hasMore: false,
    updated: 1,
    skipped: 0,
    failed: 0,
    warnings: [],
    durationMs: 1,
    ...overrides,
  });

  const catalogRow = (symbol: string, index = 1) => ({
    symbol: `${symbol}.NS`,
    name: `${symbol} Limited`,
    region: 'IN',
    exchange: 'NSE',
    assetType: 'STOCK',
    instrumentSegment: 'CASH',
    displaySymbol: symbol,
    sourceSymbol: symbol,
    providerSymbol: `${symbol}.NS`,
    catalogSource: 'NSE_EQUITY_SECURITIES',
    country: 'India',
    currency: 'INR',
    isin: `INE000A0${String(index).padStart(3, '0')}`,
    ipoDate: new Date('2020-01-01T00:00:00.000Z'),
  });

  const catalogStock = (symbol: string) => ({
    id: `stock-${symbol}`,
    symbol: `${symbol}.NS`,
    name: `${symbol} Limited`,
    region: 'IN',
    exchange: 'NSE',
    assetType: 'STOCK',
    displaySymbol: symbol,
    sourceSymbol: symbol,
    providerSymbol: `${symbol}.NS`,
    catalogSource: 'NSE_EQUITY_SECURITIES',
    isActive: true,
    isDelisted: false,
    isin: null,
    ipoDate: null,
  });

  const catalogSourceSnapshot = (fingerprint = 'catalog-same', rows: any[] = [catalogRow('ABB')]) => ({
    fingerprint,
    identity: {
      action: 'CATALOG_IDENTITY_REPAIR',
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
      rowCount: rows.length,
      contentSha256: `${fingerprint}-content`,
      rowsSha256: `${fingerprint}-rows`,
    },
    catalogSnapshot: {
      catalogSource: 'NSE_EQUITY_SECURITIES',
      rows,
      warnings: [],
      downloaded: true,
      sourceFingerprint: fingerprint,
      sourceIdentity: {
        action: 'CATALOG_IDENTITY_REPAIR',
        catalogSource: 'NSE_EQUITY_SECURITIES',
        importMode: 'CONFIGURED_URL',
        rowCount: rows.length,
        contentSha256: `${fingerprint}-content`,
        rowsSha256: `${fingerprint}-rows`,
      },
    },
  });

  it('dry-run reports planned actions without mutating or persisting', async () => {
    const repository = {
      createRepairRun: jest.fn(),
      updateRepairRun: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-drain-blocked'),
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan());
    const validateSpy = jest.spyOn(service, 'validateProviders');

    const result = await service.repairRun({ region: 'IN', assetType: 'STOCK', dryRun: true, batchSize: 50 });

    expect(repository.createRepairRun).not.toHaveBeenCalled();
    expect(validateSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dryRun: true,
      status: 'COMPLETED',
      expectedNextAction: 'VALIDATE_PROVIDERS',
      summary: { batchesExecuted: 0 },
    });
    expect(result.actions.map((action) => action.action)).toEqual([
      'VALIDATE_PROVIDERS',
      'CATALOG_IDENTITY_REPAIR',
      'PROVIDER_BUSINESS_METADATA_REPAIR',
      'BACKFILL_PRICES',
    ]);
    expect(result.actions[0]).toMatchObject({ estimatedTotal: 2, estimatedBatchCount: 1 });
  });

  it('executes repair actions in dependency order', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const calls: string[] = [];
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-order'),
    });
    jest.spyOn(service, 'universeHealth')
      .mockResolvedValueOnce(health())
      .mockResolvedValueOnce(health({ counts: { providerSupported: 2, providerUnknown: 1 } }));
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan())
      .mockResolvedValueOnce(plan({
        providerValidationNeeded: 0,
        catalogIdentityRepairNeeded: 0,
        businessMetadataAutoRepairable: 0,
        priceBackfillNeeded: 0,
      }));
    jest.spyOn(service, 'validateProviders').mockImplementation(async () => {
      calls.push('VALIDATE_PROVIDERS');
      return summary({ providerSupported: 1 });
    });
    jest.spyOn(service as any, 'repairCatalogIdentityFromRows').mockImplementation(async () => {
      calls.push('CATALOG_IDENTITY_REPAIR');
      return summary({ catalogIdentityRepaired: 1, sourceFingerprint: 'catalog-order' });
    });
    jest.spyOn(service, 'repairProviderBusinessMetadata').mockImplementation(async () => {
      calls.push('PROVIDER_BUSINESS_METADATA_REPAIR');
      return summary({ providerBusinessMetadataRepaired: 1 });
    });
    jest.spyOn(service, 'backfillPrices').mockImplementation(async () => {
      calls.push('BACKFILL_PRICES');
      return summary({ priceRowsReceived: 252 });
    });

    const result = await service.repairRun({ region: 'IN', assetType: 'STOCK', batchSize: 50 });

    expect(calls).toEqual([
      'VALIDATE_PROVIDERS',
      'CATALOG_IDENTITY_REPAIR',
      'PROVIDER_BUSINESS_METADATA_REPAIR',
      'BACKFILL_PRICES',
    ]);
    expect(result.status).toBe('PARTIAL');
    expect(repository.createRepairRun).toHaveBeenCalledWith(expect.objectContaining({
      status: 'RUNNING',
      beforeHealthJson: expect.objectContaining({ trustStatus: 'NOT_TRUSTWORTHY' }),
    }));
    expect(repository.updateRepairRun).toHaveBeenCalledWith('run-1', expect.objectContaining({
      status: 'PARTIAL',
      afterHealthJson: expect.objectContaining({ counts: expect.objectContaining({ providerSupported: 2 }) }),
    }));
  });

  it('drain mode executes actions in dependency order as queues clear', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-drain-order' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const calls: string[] = [];
    const passSignoff = {
      status: 'PASS',
      minReviewReadyRequired: 300,
      reviewReadyActual: 300,
      blockers: [],
      nextAction: null,
      downstreamAllowed: true,
    };
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-drain-order'),
    });
    jest.spyOn(service, 'universeHealth')
      .mockResolvedValueOnce(health())
      .mockResolvedValueOnce(health({ trustStatus: 'OK', counts: { providerUnknown: 0, reviewReady: 300 }, coverage: { reviewReadyPercentage: 10 } }));
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan())
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, manualBusinessMetadataRequired: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, catalogIdentityRepairNeeded: 0, manualBusinessMetadataRequired: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, manualBusinessMetadataRequired: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0, manualBusinessMetadataRequired: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0, manualBusinessMetadataRequired: 0, universeSignoff: passSignoff }));
    jest.spyOn(service, 'validateProviders').mockImplementation(async () => {
      calls.push('VALIDATE_PROVIDERS');
      return summary({ providerSupported: 1 });
    });
    jest.spyOn(service as any, 'repairCatalogIdentityFromRows').mockImplementation(async () => {
      calls.push('CATALOG_IDENTITY_REPAIR');
      return summary({ catalogIdentityRepaired: 1, sourceFingerprint: 'catalog-drain-order' });
    });
    jest.spyOn(service, 'repairProviderBusinessMetadata').mockImplementation(async () => {
      calls.push('PROVIDER_BUSINESS_METADATA_REPAIR');
      return summary({ providerBusinessMetadataRepaired: 1 });
    });
    jest.spyOn(service, 'backfillPrices').mockImplementation(async () => {
      calls.push('BACKFILL_PRICES');
      return summary({ priceRowsReceived: 252 });
    });

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      mode: 'DRAIN_UNTIL_BLOCKED',
      batchSize: 50,
      maxBatchesPerAction: 2,
    });

    expect(calls).toEqual([
      'VALIDATE_PROVIDERS',
      'CATALOG_IDENTITY_REPAIR',
      'PROVIDER_BUSINESS_METADATA_REPAIR',
      'BACKFILL_PRICES',
    ]);
    expect(result.status).toBe('COMPLETED');
    expect(result.anotherRunNeeded).toBe(false);
  });

  it('drain mode validates UNKNOWN provider rows before retry-failed rows', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-unknown-first' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const queues: string[] = [];
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-unknown-first'),
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 2, retryFailedValidations: 2, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 1, retryFailedValidations: 2, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 1, retryFailedValidations: 2, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }));
    jest.spyOn(service, 'validateProviders').mockImplementation(async (request: any) => {
      queues.push(request.providerValidationQueue);
      return summary({ totalCount: 2, hasMore: true, nextOffset: 0, providerValidated: 1 });
    });

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      mode: 'DRAIN_UNTIL_BLOCKED',
      batchSize: 1,
      maxBatchesPerAction: 1,
    });

    expect(queues).toEqual(['UNKNOWN_FIRST']);
    expect(result.status).toBe('PARTIAL');
    expect(result.expectedNextAction).toBe('VALIDATE_PROVIDERS');
    expect(result.warnings.join(' ')).toContain('Validate unknown providers still has more rows');
  });

  it('drain mode treats UNKNOWN rows moved to VALIDATION_FAILED as progress', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-unknown-failed' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const queues: string[] = [];
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-unknown-failed'),
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 1, retryFailedValidations: 0, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, retryFailedValidations: 1, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, retryFailedValidations: 1, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, retryFailedValidations: 1, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }));
    jest.spyOn(service, 'validateProviders').mockImplementation(async (request: any) => {
      queues.push(request.providerValidationQueue);
      return request.providerValidationQueue === 'UNKNOWN_FIRST'
        ? summary({ updated: 1, failed: 1, validationFailed: 1 })
        : summary({ updated: 0, failed: 1, validationFailed: 1 });
    });

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      mode: 'DRAIN_UNTIL_BLOCKED',
      batchSize: 50,
      maxBatchesPerAction: 1,
    });

    expect(queues).toEqual(['UNKNOWN_FIRST', 'RETRY_FAILED']);
    expect(result.status).toBe('PARTIAL_BLOCKED');
    expect(result.warnings.join(' ')).toContain('Retry failed provider validations did not reduce');
    expect(result.warnings.join(' ')).not.toContain('Validate unknown providers did not reduce');
  });

  it('drain mode reports retry/provider diagnosis when retry-failed queue does not reduce', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-retry-blocked' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-retry-blocked'),
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, retryFailedValidations: 2, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, retryFailedValidations: 2, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, retryFailedValidations: 2, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }));
    jest.spyOn(service, 'validateProviders').mockResolvedValue(summary({ updated: 0, failed: 1, validationFailed: 1 }));

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      mode: 'DRAIN_UNTIL_BLOCKED',
      batchSize: 50,
      maxBatchesPerAction: 1,
    });

    expect(result.status).toBe('PARTIAL_BLOCKED');
    expect(result.actions.find((action) => action.action === 'VALIDATE_PROVIDERS')?.batchesExecuted).toBe(0);
    expect(result.actions.find((action) => action.action === 'RETRY_FAILED_PROVIDERS')?.batchesExecuted).toBe(1);
    expect(result.warnings.join(' ')).toContain('Retry failed provider validations did not reduce; manual/provider diagnosis required.');
  });

  it('drain mode stops as PARTIAL_BLOCKED when a queue does not decrease', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-drain-blocked' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-drain-blocked'),
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 1, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 1, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 1, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }));
    jest.spyOn(service, 'validateProviders').mockResolvedValue(summary({ updated: 1, providerValidated: 1 }));
    const catalogSpy = jest.spyOn(service as any, 'repairCatalogIdentityFromRows');

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      mode: 'DRAIN_UNTIL_BLOCKED',
      actions: ['VALIDATE_PROVIDERS', 'CATALOG_IDENTITY_REPAIR'],
      batchSize: 50,
      maxBatchesPerAction: 1,
    });

    expect(result.status).toBe('PARTIAL_BLOCKED');
    expect(result.anotherRunNeeded).toBe(true);
    expect(result.warnings.join(' ')).toContain('Validate unknown providers did not reduce its queue');
    expect(catalogSpy).not.toHaveBeenCalled();
    expect(repository.updateRepairRun).toHaveBeenCalledWith('run-drain-blocked', expect.objectContaining({
      status: 'PARTIAL_BLOCKED',
    }));
  });

  it('drain mode reports PARTIAL_MANUAL_REQUIRED when only manual metadata remains', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-manual-required' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({});
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health({
      counts: { providerUnknown: 0, reviewReady: 7 },
      topBlockers: [{ code: 'MISSING_MARKET_CAP', label: 'Missing market cap', count: 2, severity: 'critical' }],
      universeSignoff: {
        status: 'FAIL',
        minReviewReadyRequired: 300,
        reviewReadyActual: 7,
        blockers: [
          { code: 'MANUAL_BUSINESS_METADATA_REQUIRED', severity: 'critical', count: 2, required: 0, nextAction: 'MANUAL_METADATA_IMPORT' },
        ],
        nextAction: 'MANUAL_METADATA_IMPORT',
        downstreamAllowed: false,
      },
    }));
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan({
      providerValidationNeeded: 0,
      retryFailedValidations: 0,
      catalogIdentityRepairNeeded: 0,
      businessMetadataAutoRepairable: 0,
      businessMetadataRetryEligible: 0,
      priceBackfillNeeded: 0,
      manualBusinessMetadataRequired: 2,
      universeSignoff: {
        status: 'FAIL',
        minReviewReadyRequired: 300,
        reviewReadyActual: 7,
        blockers: [
          { code: 'MANUAL_BUSINESS_METADATA_REQUIRED', severity: 'critical', count: 2, required: 0, nextAction: 'MANUAL_METADATA_IMPORT' },
        ],
        nextAction: 'MANUAL_METADATA_IMPORT',
        downstreamAllowed: false,
      },
    }));
    const validateSpy = jest.spyOn(service, 'validateProviders');

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      mode: 'DRAIN_UNTIL_BLOCKED',
      batchSize: 50,
      maxBatchesPerAction: 1,
    });

    expect(validateSpy).not.toHaveBeenCalled();
    expect(result.status).toBe('PARTIAL_MANUAL_REQUIRED');
    expect(result.anotherRunNeeded).toBe(true);
    expect(result.expectedNextAction).toBe('MANUAL_METADATA_IMPORT');
    expect(result.universeSignoff).toMatchObject({
      status: 'FAIL',
      downstreamAllowed: false,
      nextAction: 'MANUAL_METADATA_IMPORT',
    });
  });

  it('stops safely on action failure and persists PARTIAL snapshots', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-failure'),
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan());
    jest.spyOn(service, 'validateProviders').mockResolvedValue(summary());
    jest.spyOn(service as any, 'repairCatalogIdentityFromRows').mockRejectedValue(new Error('catalog source unavailable'));
    const metadataSpy = jest.spyOn(service, 'repairProviderBusinessMetadata');

    const result = await service.repairRun({ region: 'IN', assetType: 'STOCK', batchSize: 50 });

    expect(result.status).toBe('PARTIAL');
    expect(result.error).toBe('catalog source unavailable');
    expect(metadataSpy).not.toHaveBeenCalled();
    expect(repository.updateRepairRun).toHaveBeenCalledWith('run-1', expect.objectContaining({
      status: 'PARTIAL',
      error: 'catalog source unavailable',
    }));
  });

  it('honors max batches so shrinking queues cannot loop indefinitely', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan({ catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }));
    const validateSpy = jest.spyOn(service, 'validateProviders').mockResolvedValue(summary({
      processedCount: 1,
      totalCount: 10,
      hasMore: true,
      nextOffset: 0,
    }));

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 1,
      maxBatchesPerAction: 2,
      actions: ['VALIDATE_PROVIDERS'],
    });

    expect(validateSpy).toHaveBeenCalledTimes(2);
    expect(result.actions[0]).toMatchObject({
      batchesExecuted: 2,
      anotherRunNeeded: true,
    });
    expect(result.anotherRunNeeded).toBe(true);
    expect(result.status).toBe('PARTIAL');
    expect(repository.updateRepairRun).toHaveBeenCalledWith('run-1', expect.objectContaining({
      status: 'PARTIAL',
    }));
  });

  it('resumes stable source-list actions from the latest persisted next offset', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-2' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
      latestRepairRun: jest.fn().mockResolvedValue({
        summaryJson: {
          actions: [
            {
              action: 'CATALOG_IDENTITY_REPAIR',
              sourceFingerprint: 'catalog-same',
              summaries: [{ hasMore: true, nextOffset: 100 }],
            },
          ],
        },
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-same'),
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan({ providerValidationNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }));
    const catalogSpy = jest.spyOn(service as any, 'repairCatalogIdentityFromRows').mockResolvedValue(summary({
      offset: 100,
      processedCount: 50,
      totalCount: 200,
      hasMore: true,
      nextOffset: 150,
      sourceFingerprint: 'catalog-same',
    }));

    await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 50,
      maxBatchesPerAction: 1,
      actions: ['CATALOG_IDENTITY_REPAIR'],
    });

    expect(catalogSpy).toHaveBeenCalledWith(expect.objectContaining({ offset: 100 }), expect.objectContaining({ sourceFingerprint: 'catalog-same' }));
  });

  it('resets catalog source-list offset when configured URL content fingerprint changes', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-3' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
      latestRepairRun: jest.fn().mockResolvedValue({
        summaryJson: {
          actions: [
            {
              action: 'CATALOG_IDENTITY_REPAIR',
              sourceFingerprint: 'catalog-old',
              summaries: [{ hasMore: true, nextOffset: 100, sourceFingerprint: 'catalog-old' }],
            },
          ],
        },
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-new'),
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan({ providerValidationNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }));
    const catalogSpy = jest.spyOn(service as any, 'repairCatalogIdentityFromRows').mockResolvedValue(summary({
      offset: 0,
      processedCount: 50,
      totalCount: 200,
      hasMore: true,
      nextOffset: 50,
      sourceFingerprint: 'catalog-new',
    }));

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 50,
      maxBatchesPerAction: 1,
      actions: ['CATALOG_IDENTITY_REPAIR'],
      catalogSource: 'BSE_EQUITY_SECURITIES',
    });

    expect(catalogSpy).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }), expect.objectContaining({ sourceFingerprint: 'catalog-new' }));
    expect(result.actions[0].warnings.join(' ')).toContain('Source changed; restart from offset 0');
  });

  it('loads catalog source once per operational repair action and reuses the same fingerprint for all batches', async () => {
    const rows = [catalogRow('ABB', 1), catalogRow('ACC', 2), catalogRow('AARTIIND', 3), catalogRow('AXISBANK', 4)];
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-source-snapshot' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
      listStocksForUniverseHealth: jest.fn().mockResolvedValue(rows.map((row: any) => catalogStock(row.sourceSymbol))),
      repairCatalogIdentityForStock: jest.fn().mockResolvedValue({ action: 'updated' }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const loadSpy = jest.spyOn(service as any, 'loadCatalogIdentityRows').mockResolvedValue({
      rows,
      warnings: [],
      downloaded: true,
      sourceFingerprint: 'catalog-stable',
      sourceIdentity: {
        action: 'CATALOG_IDENTITY_REPAIR',
        catalogSource: 'NSE_EQUITY_SECURITIES',
        importMode: 'CONFIGURED_URL',
        rowCount: rows.length,
        contentSha256: 'stable-content',
        rowsSha256: 'stable-rows',
      },
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan({
        providerValidationNeeded: 0,
        catalogIdentityRepairNeeded: rows.length,
        businessMetadataAutoRepairable: 0,
        priceBackfillNeeded: 0,
      }))
      .mockResolvedValueOnce(plan({
        providerValidationNeeded: 0,
        catalogIdentityRepairNeeded: 1,
        businessMetadataAutoRepairable: 0,
        priceBackfillNeeded: 0,
      }));

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 1,
      maxBatchesPerAction: 3,
      actions: ['CATALOG_IDENTITY_REPAIR'],
    });

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(repository.repairCatalogIdentityForStock).toHaveBeenCalledTimes(3);
    expect(result.status).toBe('PARTIAL');
    expect(result.actions[0]).toMatchObject({
      sourceFingerprint: 'catalog-stable',
      batchesExecuted: 3,
      anotherRunNeeded: true,
    });
    expect(result.actions[0].summaries).toHaveLength(3);
    expect(result.actions[0].summaries.every((item) => item.sourceFingerprint === 'catalog-stable')).toBe(true);
    expect(repository.updateRepairRun).toHaveBeenCalledWith('run-source-snapshot', expect.objectContaining({
      status: 'PARTIAL',
      summaryJson: expect.objectContaining({
        actions: [
          expect.objectContaining({
            sourceFingerprint: 'catalog-stable',
            summaries: expect.arrayContaining([
              expect.objectContaining({ sourceFingerprint: 'catalog-stable' }),
            ]),
          }),
        ],
      }),
    }));
  });

  it('fails catalog repair runs before processing offsets when source snapshot loading fails', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-source-error' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
      latestRepairRun: jest.fn().mockResolvedValue({
        summaryJson: {
          actions: [
            {
              action: 'CATALOG_IDENTITY_REPAIR',
              sourceFingerprint: 'catalog-old',
              summaries: [{ hasMore: true, nextOffset: 100, sourceFingerprint: 'catalog-old' }],
            },
          ],
        },
      }),
      listStocksForUniverseHealth: jest.fn(),
      repairCatalogIdentityForStock: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service as any, 'loadCatalogIdentityRows').mockRejectedValue(new Error('configured catalog download failed'));
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan({
      providerValidationNeeded: 0,
      catalogIdentityRepairNeeded: 2,
      businessMetadataAutoRepairable: 0,
      priceBackfillNeeded: 0,
    }));

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 50,
      maxBatchesPerAction: 3,
      actions: ['CATALOG_IDENTITY_REPAIR'],
    });

    expect(result.status).toBe('PARTIAL');
    expect(result.error).toContain('Catalog identity repair source could not be loaded');
    expect(result.actions[0]).toMatchObject({
      batchesExecuted: 0,
      summaries: [],
      resumeOffset: 0,
    });
    expect(repository.listStocksForUniverseHealth).not.toHaveBeenCalled();
    expect(repository.repairCatalogIdentityForStock).not.toHaveBeenCalled();
    expect(repository.updateRepairRun).toHaveBeenCalledWith('run-source-error', expect.objectContaining({
      status: 'PARTIAL',
      error: expect.stringContaining('Catalog identity repair source could not be loaded'),
    }));
  });

  it('resumes manual CSV imports only when the CSV fingerprint matches', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-4' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
      latestRepairRun: jest.fn().mockResolvedValue({
        summaryJson: {
          actions: [
            {
              action: 'MANUAL_METADATA_IMPORT',
              sourceFingerprint: 'manual-same',
              summaries: [{ hasMore: true, nextOffset: 50, sourceFingerprint: 'manual-same' }],
            },
          ],
        },
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      MANUAL_METADATA_IMPORT: { fingerprint: 'manual-same', identity: { action: 'MANUAL_METADATA_IMPORT', importMode: 'MANUAL_CSV' } },
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan());
    const manualSpy = jest.spyOn(service, 'importManualMetadata').mockResolvedValue(summary({
      offset: 50,
      processedCount: 50,
      totalCount: 100,
      hasMore: false,
      nextOffset: null,
      sourceFingerprint: 'manual-same',
    }));

    await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      actions: ['MANUAL_METADATA_IMPORT'],
      csvText: 'symbol,sector,industry\nABB,Industrials,Equipment\n',
    });

    expect(manualSpy).toHaveBeenCalledWith(expect.objectContaining({ offset: 50 }));
  });

  it('restarts manual CSV import when the CSV fingerprint changes', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-5' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
      latestRepairRun: jest.fn().mockResolvedValue({
        summaryJson: {
          actions: [
            {
              action: 'MANUAL_METADATA_IMPORT',
              sourceFingerprint: 'manual-old',
              summaries: [{ hasMore: true, nextOffset: 50, sourceFingerprint: 'manual-old' }],
            },
          ],
        },
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      MANUAL_METADATA_IMPORT: { fingerprint: 'manual-new', identity: { action: 'MANUAL_METADATA_IMPORT', importMode: 'MANUAL_CSV' } },
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan());
    const manualSpy = jest.spyOn(service, 'importManualMetadata').mockResolvedValue(summary({
      offset: 0,
      processedCount: 50,
      totalCount: 100,
      hasMore: true,
      nextOffset: 50,
      sourceFingerprint: 'manual-new',
    }));

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      actions: ['MANUAL_METADATA_IMPORT'],
      csvText: 'symbol,sector,industry\nACC,Materials,Cement\n',
    });

    expect(manualSpy).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
    expect(result.actions[0].warnings.join(' ')).toContain('Source changed; restart from offset 0');
  });

  it('reports hard blockers and keeps strict review-ready logic visible', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'universeHealth')
      .mockResolvedValueOnce(health())
      .mockResolvedValueOnce(health({
        counts: { reviewReady: 0, providerUnknown: 1 },
        topBlockers: [
          { code: 'MISSING_MARKET_CAP', label: 'Missing market cap', count: 2, severity: 'critical' },
        ],
      }));
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan())
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 1, manualBusinessMetadataRequired: 2 }));
    jest.spyOn(service, 'validateProviders').mockResolvedValue(summary());

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      actions: ['VALIDATE_PROVIDERS'],
    });

    expect(result.afterHealth.counts.reviewReady).toBe(0);
    expect(result.hardBlockersRemaining).toEqual([
      expect.objectContaining({ code: 'MISSING_MARKET_CAP' }),
    ]);
    expect(result.warnings.join(' ')).toContain('Today Plan remains blocked');
  });

  it('latest repair run exposes operator follow-up fields', async () => {
    const repository = {
      latestRepairRun: jest.fn().mockResolvedValue({
        id: 'run-latest',
        region: 'IN',
        assetType: 'STOCK',
        status: 'PARTIAL',
        startedAt: new Date('2026-05-12T01:00:00.000Z'),
        completedAt: new Date('2026-05-12T01:01:00.000Z'),
        beforeHealthJson: null,
        afterHealthJson: { trustStatus: 'NOT_TRUSTWORTHY' },
        beforeRepairPlanJson: null,
        afterRepairPlanJson: null,
        summaryJson: {
          actions: [],
          summary: { updated: 0 },
          anotherRunNeeded: true,
          expectedNextAction: 'CATALOG_IDENTITY_REPAIR',
          hardBlockersRemaining: [{ code: 'MISSING_ISIN', count: 10, severity: 'critical' }],
          afterTrustStatus: 'NOT_TRUSTWORTHY',
        },
        warningsJson: ['Repair catalog identity: another bounded run is needed.'],
        error: null,
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.latestRepairRun({ region: 'IN', assetType: 'STOCK' });

    expect(result).toMatchObject({
      status: 'PARTIAL',
      anotherRunNeeded: true,
      expectedNextAction: 'CATALOG_IDENTITY_REPAIR',
      afterTrustStatus: 'NOT_TRUSTWORTHY',
      hardBlockersRemaining: [expect.objectContaining({ code: 'MISSING_ISIN' })],
    });
  });
});
