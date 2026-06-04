/// <reference types="@types/jest" />
import {
  createMarketDataDataRouter,
  createMarketDataFoundationRouter,
  createMarketDataStocksRouter,
  createMarketDataV1Router,
  MarketDataFoundationController,
} from '../../../src/modules/market-data-foundation';

const controller = {
  health: jest.fn(),
  universeHealth: jest.fn(),
  stockMissingDataDiagnostics: jest.fn(),
  reviewReadinessSummary: jest.fn(),
  marketMovers: jest.fn(),
  marketMap: jest.fn(),
  trustedReviewUniverseHealth: jest.fn(),
  trustedReviewUniverseInstruments: jest.fn(),
  repairPlan: jest.fn(),
  repairWorkbench: jest.fn(),
  repairRun: jest.fn(),
  latestRepairRun: jest.fn(),
  providerCleanupReport: jest.fn(),
  executeProviderCleanup: jest.fn(),
  listSourceFileImports: jest.fn(),
  importNseCmUdiffDaily: jest.fn(),
  importBseCmBackupDaily: jest.fn(),
  importNseIndexEodDaily: jest.fn(),
  importNseFoUdiffDaily: jest.fn(),
  importNseDeliveryDaily: jest.fn(),
  refreshNseDeliveryDaily: jest.fn(),
  runNseDeliveryHistoricalBackfill: jest.fn(),
  runExchangeHistoricalBackfill: jest.fn(),
  startExchangeHistoricalBackfillRun: jest.fn(),
  getExchangeHistoricalBackfillRun: jest.fn(),
  resumeExchangeHistoricalBackfillRun: jest.fn(),
  retryFailedExchangeHistoricalBackfillRun: jest.fn(),
  cancelExchangeHistoricalBackfillRun: jest.fn(),
  manualMetadataTemplate: jest.fn(),
  validateProviders: jest.fn(),
  repairCatalogIdentity: jest.fn(),
  repairProviderBusinessMetadata: jest.fn(),
  repairPriceIdentity: jest.fn(),
  importManualMetadata: jest.fn(),
  importManualVerifiedFundamental: jest.fn(),
  importBulkManualVerifiedFundamentals: jest.fn(),
  importNseCorporateActions: jest.fn(),
  recomputeAdjustedClose: jest.fn(),
  nseXbrlBulkIngest: jest.fn(),
  enrichMetadata: jest.fn(),
  backfillPrices: jest.fn(),
  startPriceBackfillRun: jest.fn(),
  activePriceBackfillRun: jest.fn(),
  getPriceBackfillRun: jest.fn(),
  cancelPriceBackfillRun: jest.fn(),
  schedulerStatus: jest.fn(),
  listCatalogSources: jest.fn(),
  listInstruments: jest.fn(),
  createInstrument: jest.fn(),
  getInstrument: jest.fn(),
  listInstrumentPrices: jest.fn(),
  getInstrumentLatestPrice: jest.fn(),
  getInstrumentFundamentals: jest.fn(),
  getInstrumentCorporateActions: jest.fn(),
  listFxRates: jest.fn(),
  getFxRate: jest.fn(),
  syncFxRates: jest.fn(),
  syncV1: jest.fn(),
  importCatalog: jest.fn(),
  backfillCatalogMetadata: jest.fn(),
  listStocks: jest.fn(),
  searchAssets: jest.fn(),
  yahooSearch: jest.fn(),
  getStock: jest.fn(),
  createStock: jest.fn(),
  updateStock: jest.fn(),
  deleteStock: jest.fn(),
  toggleStockActive: jest.fn(),
  syncStock: jest.fn(),
  startStockCatalogSyncRun: jest.fn(),
  getStockCatalogSyncRun: jest.fn(),
  cancelStockCatalogSyncRun: jest.fn(),
  syncAllStocks: jest.fn(),
  searchMarketData: jest.fn(),
  ingestSymbol: jest.fn(),
  listPrices: jest.fn(),
  getFundamentals: jest.fn(),
  getCorporateActions: jest.fn(),
} as any;

const transientDbError = () => Object.assign(new Error('Server has closed the connection.'), {
  code: 'P1017',
  clientVersion: '6.0.0',
});

const routePaths = (router: any) =>
  router.stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);

describe('market data routers', () => {
  it('registers canonical v1 routes including FX endpoints', () => {
    expect(routePaths(createMarketDataV1Router(controller))).toEqual(
      expect.arrayContaining([
        'GET /market-data/health',
        'GET /market-data/universe/health',
        'GET /market-data/stocks/missing-data-diagnostics',
        'GET /market-data/review-readiness-summary',
        'GET /market-data/movers',
        'GET /market-data/market-map',
        'GET /market-data/review-universe',
        'GET /market-data/review-universe/instruments',
        'GET /market-data/universe/repair-plan',
        'GET /market-data/universe/repair-workbench',
        'GET /market-data/universe/repair-runs/latest',
        'POST /market-data/universe/repair-run',
        'GET /market-data/provider-cleanup/report',
        'POST /market-data/provider-cleanup/execute',
        'GET /market-data/source-file-imports',
        'POST /market-data/exchange-files/nse-cm-udiff/import',
        'POST /market-data/exchange-files/bse-cm-backup/import',
        'POST /market-data/exchange-files/nse-index-eod/import',
        'POST /market-data/exchange-files/nse-fo-udiff/import',
        'POST /market-data/exchange-files/nse-delivery/import',
        'POST /market-data/exchange-files/nse-delivery/refresh',
        'POST /market-data/exchange-files/nse-delivery/backfill',
        'POST /market-data/exchange-files/historical-backfill',
        'POST /market-data/exchange-files/historical-backfill/runs',
        'GET /market-data/exchange-files/historical-backfill/runs/:runId',
        'POST /market-data/exchange-files/historical-backfill/runs/:runId/resume',
        'POST /market-data/exchange-files/historical-backfill/runs/:runId/retry-failed',
        'POST /market-data/exchange-files/historical-backfill/runs/:runId/cancel',
        'GET /market-data/metadata/manual-template',
        'POST /market-data/provider/validate',
        'POST /market-data/catalog/identity/repair',
        'POST /market-data/catalog/identity-repair',
        'POST /market-data/metadata/provider-business/repair',
        'POST /market-data/prices/identity-repair',
        'POST /market-data/metadata/manual-import',
        'POST /market-data/fundamentals/manual-verified-import',
        'POST /market-data/fundamentals/manual-verified-bulk-import',
        'POST /market-data/metadata/enrich',
        'POST /market-data/prices/backfill',
        'POST /market-data/prices/backfill-runs',
        'GET /market-data/prices/backfill-active-run',
        'GET /market-data/prices/backfill-runs/active',
        'GET /market-data/prices/backfill-runs/:runId',
        'POST /market-data/prices/backfill-runs/:runId/cancel',
        'GET /market-data/scheduler/status',
        'GET /market-data/catalog/sources',
        'GET /instruments',
        'POST /instruments',
        'GET /instruments/:id',
        'GET /prices/:instrumentId',
        'GET /prices/:instrumentId/latest',
        'GET /fundamentals/:instrumentId',
        'GET /corporate-actions/:instrumentId',
        'GET /fx-rates',
        'GET /fx-rates/:pair',
        'POST /fx-rates/sync',
        'POST /ingestion/sync',
        'POST /market-data/catalog/import',
        'POST /market-data/catalog/backfill-metadata',
      ])
    );
  });

  it('keeps compatibility stock and data routers', () => {
    expect(routePaths(createMarketDataStocksRouter(controller))).toEqual(
      expect.arrayContaining([
        'GET /',
        'GET /search',
        'GET /yahoo-search',
        'POST /',
        'POST /:id/sync',
        'POST /sync-runs',
        'GET /sync-runs/:runId',
        'POST /sync-runs/:runId/cancel',
      ])
    );

    expect(routePaths(createMarketDataDataRouter(controller))).toEqual(
      expect.arrayContaining([
        'GET /search',
        'POST /ingest',
        'GET /prices/:symbol',
        'GET /fundamentals/:symbol',
        'GET /corporate-actions/:symbol',
      ])
    );

    expect(createMarketDataFoundationRouter(controller).stack.length).toBeGreaterThan(0);
  });
});

describe('market data exchange-file controller', () => {
  it('passes NSE delivery files to the delivery import service path', async () => {
    const service = {
      importNseDeliveryDaily: jest.fn().mockResolvedValue({
        status: 'COMPLETED',
        source: 'NSE',
        segment: 'DELIVERY',
      }),
    };
    const controller = new MarketDataFoundationController(service as any);
    const req = {
      query: {},
      body: {
        tradingDate: '2026-05-27',
        csvText: 'SYMBOL,DELIV_QTY\nRELIANCE,650\n',
        fileName: 'delivery.csv',
        fileUrl: 'local-delivery.csv',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.importNseDeliveryDaily(req as any, res as any);

    expect(service.importNseDeliveryDaily).toHaveBeenCalledWith({
      tradingDate: '2026-05-27',
      csvText: 'SYMBOL,DELIV_QTY\nRELIANCE,650\n',
      fileName: 'delivery.csv',
      fileUrl: 'local-delivery.csv',
      force: false,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('passes NSE delivery daily refresh requests to the service path', async () => {
    const service = {
      refreshNseDeliveryDaily: jest.fn().mockResolvedValue({
        status: 'COMPLETED',
        source: 'NSE',
        segment: 'DELIVERY',
      }),
    };
    const controller = new MarketDataFoundationController(service as any);
    const req = {
      query: {},
      body: {
        tradingDate: '2026-05-27',
        force: true,
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.refreshNseDeliveryDaily(req as any, res as any);

    expect(service.refreshNseDeliveryDaily).toHaveBeenCalledWith({
      tradingDate: '2026-05-27',
      force: true,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('passes NSE delivery historical backfill controls to the service path', async () => {
    const service = {
      runNseDeliveryHistoricalBackfill: jest.fn().mockResolvedValue({
        status: 'COMPLETED',
        source: 'NSE',
        segment: 'DELIVERY',
      }),
    };
    const controller = new MarketDataFoundationController(service as any);
    const req = {
      query: {},
      body: {
        startDate: '2026-04-01',
        endDate: '2026-05-27',
        sessions: 90,
        batchSize: 25,
        offset: 25,
        force: false,
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.runNseDeliveryHistoricalBackfill(req as any, res as any);

    expect(service.runNseDeliveryHistoricalBackfill).toHaveBeenCalledWith({
      region: undefined,
      assetType: undefined,
      startDate: '2026-04-01',
      endDate: '2026-05-27',
      sessions: 90,
      batchSize: 25,
      offset: 25,
      force: false,
      downloadDelayMs: undefined,
      jitterMs: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('passes NSE F&O UDiFF file imports to the enrichment service path', async () => {
    const service = {
      importNseFoUdiffDaily: jest.fn().mockResolvedValue({
        status: 'COMPLETED',
        source: 'NSE',
        segment: 'FO',
      }),
    };
    const controller = new MarketDataFoundationController(service as any);
    const req = {
      query: {},
      body: {
        tradingDate: '2026-05-27',
        csvText: 'SYMBOL\nRELIANCE\n',
        fileName: 'fo.csv',
        fileUrl: 'local-fo.csv',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.importNseFoUdiffDaily(req as any, res as any);

    expect(service.importNseFoUdiffDaily).toHaveBeenCalledWith({
      tradingDate: '2026-05-27',
      csvText: 'SYMBOL\nRELIANCE\n',
      fileName: 'fo.csv',
      fileUrl: 'local-fo.csv',
      force: false,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('uses official NSE all-index import when only an index trading date is supplied', async () => {
    const service = {
      importNseIndexOfficialDaily: jest.fn().mockResolvedValue({
        status: 'COMPLETED',
        source: 'NSE',
        segment: 'INDEX',
      }),
      importNseIndexEodDaily: jest.fn(),
    };
    const controller = new MarketDataFoundationController(service as any);
    const req = {
      query: {},
      body: {
        tradingDate: '2026-05-27',
        force: true,
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.importNseIndexEodDaily(req as any, res as any);

    expect(service.importNseIndexOfficialDaily).toHaveBeenCalledWith({
      tradingDate: '2026-05-27',
      force: true,
    });
    expect(service.importNseIndexEodDaily).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('routes legacy historical backfill requests to the worker-backed run path', async () => {
    const service = {
      startExchangeHistoricalBackfillRun: jest.fn().mockResolvedValue({
        runId: 'run-1',
        status: 'RUNNING',
        totalDates: 2,
        pending: 2,
        workerCount: 3,
      }),
    };
    const controller = new MarketDataFoundationController(service as any);
    const req = {
      query: {},
      body: {
        region: 'IN',
        assetType: 'STOCK',
        startDate: '2026-05-26',
        endDate: '2026-05-29',
        maxDates: 2,
        workerCount: 3,
        maxRetries: 4,
        includeBseFill: true,
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.runExchangeHistoricalBackfill(req as any, res as any);

    expect(service.startExchangeHistoricalBackfillRun).toHaveBeenCalledWith({
      region: 'IN',
      assetType: 'STOCK',
      startDate: '2026-05-26',
      endDate: '2026-05-29',
      maxDates: 2,
      workerCount: 3,
      maxRetries: 4,
      includeBseFill: true,
    });
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'run-1',
      status: 'RUNNING',
      workerCount: 3,
    }));
  });

  it('exposes start, status, resume, retry, and cancel for historical backfill runs', async () => {
    const response = { runId: 'run-hist-1', status: 'RUNNING' };
    const service = {
      startExchangeHistoricalBackfillRun: jest.fn().mockResolvedValue(response),
      getExchangeHistoricalBackfillRun: jest.fn().mockResolvedValue(response),
      resumeExchangeHistoricalBackfillRun: jest.fn().mockResolvedValue(response),
      retryFailedExchangeHistoricalBackfillRun: jest.fn().mockResolvedValue(response),
      cancelExchangeHistoricalBackfillRun: jest.fn().mockResolvedValue({ ...response, status: 'CANCELLED' }),
    };
    const controller = new MarketDataFoundationController(service as any);
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.startExchangeHistoricalBackfillRun({
      query: {},
      body: {
        startDate: '2026-05-26',
        endDate: '2026-05-29',
        workerCount: 4,
        maxRetries: 3,
        includeBseFill: true,
      },
    } as any, res as any);
    await controller.getExchangeHistoricalBackfillRun({ params: { runId: 'run-hist-1' } } as any, res as any);
    await controller.resumeExchangeHistoricalBackfillRun({ params: { runId: 'run-hist-1' } } as any, res as any);
    await controller.retryFailedExchangeHistoricalBackfillRun({
      params: { runId: 'run-hist-1' },
      body: { maxRetries: 3 },
    } as any, res as any);
    await controller.cancelExchangeHistoricalBackfillRun({ params: { runId: 'run-hist-1' } } as any, res as any);

    expect(service.startExchangeHistoricalBackfillRun).toHaveBeenCalledWith(expect.objectContaining({
      startDate: '2026-05-26',
      endDate: '2026-05-29',
      workerCount: 4,
      maxRetries: 3,
      includeBseFill: true,
    }));
    expect(service.getExchangeHistoricalBackfillRun).toHaveBeenCalledWith('run-hist-1');
    expect(service.resumeExchangeHistoricalBackfillRun).toHaveBeenCalledWith('run-hist-1');
    expect(service.retryFailedExchangeHistoricalBackfillRun).toHaveBeenCalledWith('run-hist-1', { maxRetries: 3 });
    expect(service.cancelExchangeHistoricalBackfillRun).toHaveBeenCalledWith('run-hist-1');
    expect(res.status).toHaveBeenNthCalledWith(1, 202);
    expect(res.status).toHaveBeenNthCalledWith(2, 202);
    expect(res.status).toHaveBeenNthCalledWith(3, 202);
  });

  it('returns 503 for transient database outages while reading historical backfill status', async () => {
    const service = {
      getExchangeHistoricalBackfillRun: jest.fn().mockRejectedValue(transientDbError()),
    };
    const controller = new MarketDataFoundationController(service as any);
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.getExchangeHistoricalBackfillRun({ params: { runId: 'run-hist-1' } } as any, res as any);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'DATABASE_UNAVAILABLE',
    }));
  });
});

describe('market data controller', () => {
  it('passes repair-run worker concurrency from request to service', async () => {
    const service = {
      repairRun: jest.fn().mockResolvedValue({ status: 'COMPLETED' }),
    };
    const controller = new MarketDataFoundationController(service as any);
    const req = {
      query: {
        region: 'IN',
        assetType: 'STOCK',
        workerConcurrency: '6',
      },
      body: {
        batchSize: 50,
        dryRun: true,
        actions: ['PROVIDER_BUSINESS_METADATA_REPAIR'],
      },
      originalUrl: '/api/v1/market-data/universe/repair-run',
    } as any;
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await controller.repairRun(req, res);

    expect(service.repairRun).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 50,
      workerConcurrency: 6,
      dryRun: true,
      actions: ['PROVIDER_BUSINESS_METADATA_REPAIR'],
    }));
    expect(res.json).toHaveBeenCalledWith({ status: 'COMPLETED' });
  });

  it('blocks legacy provider price backfill requests with NSE/BSE-only guidance', async () => {
    const service = {
      backfillPrices: jest.fn(),
    };
    const controller = new MarketDataFoundationController(service as any);
    const req = {
      query: {
        region: 'IN',
        assetType: 'STOCK',
        workerConcurrency: '3',
      },
      body: {
        batchSize: 25,
        fullReload: false,
        policy: 'INCREMENTAL_LATEST_ONLY',
      },
      originalUrl: '/api/v1/market-data/prices/backfill',
    } as any;
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await controller.backfillPrices(req, res);

    expect(service.backfillPrices).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
    }));
  });

  it('blocks legacy provider fundamentals and corporate-action symbol endpoints with 410 guidance', async () => {
    const service = {
      fetchCoreFundamentals: jest.fn(),
      fetchCorporateActions: jest.fn(),
    };
    const controller = new MarketDataFoundationController(service as any);
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await controller.getFundamentals({ params: { symbol: 'RELIANCE' }, originalUrl: '/api/v1/market-data/data/fundamentals/RELIANCE' } as any, res);
    await controller.getCorporateActions({ params: { symbol: 'RELIANCE' }, originalUrl: '/api/v1/market-data/data/corporate-actions/RELIANCE' } as any, res);

    expect(service.fetchCoreFundamentals).not.toHaveBeenCalled();
    expect(service.fetchCorporateActions).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenNthCalledWith(1, 410);
    expect(res.status).toHaveBeenNthCalledWith(2, 410);
    expect(res.json).toHaveBeenNthCalledWith(1, expect.objectContaining({
      code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
    }));
    expect(res.json).toHaveBeenNthCalledWith(2, expect.objectContaining({
      code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
    }));
  });

  it('blocks legacy provider catalog sync run endpoints with 410 guidance', async () => {
    const service = {
      startCatalogSyncRun: jest.fn(),
      getCatalogSyncRun: jest.fn(),
      cancelCatalogSyncRun: jest.fn(),
    };
    const controller = new MarketDataFoundationController(service as any);
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await controller.startStockCatalogSyncRun({ body: { region: 'IN', assetType: 'STOCK' }, originalUrl: '/api/market-data-foundation/stocks/sync-runs' } as any, res);
    await controller.getStockCatalogSyncRun({ params: { runId: 'catalog-sync-1' }, originalUrl: '/api/market-data-foundation/stocks/sync-runs/catalog-sync-1' } as any, res);
    await controller.cancelStockCatalogSyncRun({ params: { runId: 'catalog-sync-1' }, originalUrl: '/api/market-data-foundation/stocks/sync-runs/catalog-sync-1/cancel' } as any, res);

    expect(service.startCatalogSyncRun).not.toHaveBeenCalled();
    expect(service.getCatalogSyncRun).not.toHaveBeenCalled();
    expect(service.cancelCatalogSyncRun).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenNthCalledWith(1, 410);
    expect(res.status).toHaveBeenNthCalledWith(2, 410);
    expect(res.status).toHaveBeenNthCalledWith(3, 410);
    expect(res.json).toHaveBeenNthCalledWith(1, expect.objectContaining({
      code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
    }));
    expect(res.json).toHaveBeenNthCalledWith(2, expect.objectContaining({
      code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
    }));
    expect(res.json).toHaveBeenNthCalledWith(3, expect.objectContaining({
      code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
    }));
  });

  it('passes market-map read params to service without mutation semantics', async () => {
    const service = {
      marketMap: jest.fn().mockResolvedValue({
        status: 'ready',
        scope: { region: 'IN', assetType: 'STOCK' },
        range: '1D',
        materialized: false,
        tiles: [],
        groups: [],
      }),
    };
    const controller = new MarketDataFoundationController(service as any);
    const req = {
      query: {
        region: 'IN',
        assetType: 'STOCK',
        range: '1W',
        limit: '60',
      },
      originalUrl: '/api/v1/market-data/market-map',
    } as any;
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await (controller as any).marketMap(req, res);

    expect(service.marketMap).toHaveBeenCalledWith({
      region: 'IN',
      assetType: 'STOCK',
      range: '1W',
      limit: 60,
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      materialized: false,
      range: '1D',
    }));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks legacy provider price backfill background runs', async () => {
    const service = {
      startPriceBackfillRun: jest.fn(),
    };
    const controller = new MarketDataFoundationController(service as any);
    const req = {
      query: {
        region: 'IN',
        assetType: 'STOCK',
      },
      body: {
        batchSize: 20,
        workerConcurrency: 2,
        maxBatches: 100,
        force: false,
        policy: 'INCREMENTAL_LATEST_ONLY',
      },
      originalUrl: '/api/v1/market-data/prices/backfill-runs',
    } as any;
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await controller.startPriceBackfillRun(req, res);

    expect(service.startPriceBackfillRun).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
    }));
  });

  it('blocks legacy provider price backfill status and cancel endpoints', async () => {
    const service = {
      getPriceBackfillRun: jest.fn(),
      cancelPriceBackfillRun: jest.fn(),
    };
    const controller = new MarketDataFoundationController(service as any);
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await controller.getPriceBackfillRun({ params: { runId: 'price-backfill-1' } } as any, res);
    await controller.cancelPriceBackfillRun({ params: { runId: 'price-backfill-1' } } as any, res);

    expect(service.getPriceBackfillRun).not.toHaveBeenCalled();
    expect(service.cancelPriceBackfillRun).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenNthCalledWith(1, 410);
    expect(res.status).toHaveBeenNthCalledWith(2, 410);
  });

  it('lists source-file import evidence through the Market Data Foundation service', async () => {
    const service = {
      listSourceFileImports: jest.fn().mockResolvedValue({ count: 1, imports: [{ id: 'import-1' }] }),
    };
    const controller = new MarketDataFoundationController(service as any);
    const req = {
      query: {
        source: 'NSE',
        segment: 'CM',
        status: 'COMPLETED',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
        limit: '10',
        sortBy: 'importedAt',
        sortDirection: 'desc',
      },
    } as any;
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await controller.listSourceFileImports(req, res);

    expect(service.listSourceFileImports).toHaveBeenCalledWith({
      source: 'NSE',
      segment: 'CM',
      status: 'COMPLETED',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      limit: 10,
      sortBy: 'importedAt',
      sortDirection: 'desc',
    });
    expect(res.json).toHaveBeenCalledWith({ count: 1, imports: [{ id: 'import-1' }] });
  });

  it('imports bulk manual verified fundamentals through the Market Data Foundation service', async () => {
    const service = {
      importBulkManualVerifiedFundamentals: jest.fn().mockResolvedValue({
        status: 'COMPLETED',
        rowsImported: 2,
      }),
    };
    const controller = new MarketDataFoundationController(service as any);
    const req = {
      body: {
        fileName: 'review-universe-fundamentals.csv',
        csvText: 'symbol,period_type,period_end_date,revenue,net_income,eps,source,validated_by,validated_at\nRELIANCE,ANNUAL,2026-03-31,100,20,12,MANUAL_VERIFIED,Nrusingha,2026-06-01T10:00:00.000Z',
        region: 'IN',
        assetType: 'STOCK',
      },
    } as any;
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await controller.importBulkManualVerifiedFundamentals(req, res);

    expect(service.importBulkManualVerifiedFundamentals).toHaveBeenCalledWith({
      fileName: 'review-universe-fundamentals.csv',
      csvText: req.body.csvText,
      region: 'IN',
      assetType: 'STOCK',
      sourceUrl: undefined,
      evidenceDate: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ status: 'COMPLETED', rowsImported: 2 });
  });

  it('returns 503 when source-file evidence cannot be read during database recovery', async () => {
    const service = {
      listSourceFileImports: jest.fn().mockRejectedValue(transientDbError()),
    };
    const controller = new MarketDataFoundationController(service as any);
    const req = { query: { limit: '10' } } as any;
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await controller.listSourceFileImports(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'DATABASE_UNAVAILABLE',
    }));
  });
});
