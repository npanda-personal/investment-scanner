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
  importNseCmUdiffDaily: jest.fn(),
  importBseCmBackupDaily: jest.fn(),
  importNseIndexEodDaily: jest.fn(),
  runExchangeHistoricalBackfill: jest.fn(),
  manualMetadataTemplate: jest.fn(),
  validateProviders: jest.fn(),
  repairCatalogIdentity: jest.fn(),
  repairProviderBusinessMetadata: jest.fn(),
  repairPriceIdentity: jest.fn(),
  importManualMetadata: jest.fn(),
  importManualVerifiedFundamental: jest.fn(),
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
        'POST /market-data/exchange-files/nse-cm-udiff/import',
        'POST /market-data/exchange-files/bse-cm-backup/import',
        'POST /market-data/exchange-files/nse-index-eod/import',
        'POST /market-data/exchange-files/historical-backfill',
        'GET /market-data/metadata/manual-template',
        'POST /market-data/provider/validate',
        'POST /market-data/catalog/identity/repair',
        'POST /market-data/catalog/identity-repair',
        'POST /market-data/metadata/provider-business/repair',
        'POST /market-data/prices/identity-repair',
        'POST /market-data/metadata/manual-import',
        'POST /market-data/fundamentals/manual-verified-import',
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
  it('passes bounded historical backfill requests to the exchange backfill service path', async () => {
    const service = {
      runExchangeHistoricalBackfill: jest.fn().mockResolvedValue({
        status: 'PARTIAL',
        datesAttempted: 2,
        nextStartDate: '2026-05-28',
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
        includeBseFill: true,
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.runExchangeHistoricalBackfill(req as any, res as any);

    expect(service.runExchangeHistoricalBackfill).toHaveBeenCalledWith({
      region: 'IN',
      assetType: 'STOCK',
      startDate: '2026-05-26',
      endDate: '2026-05-29',
      maxDates: 2,
      includeBseFill: true,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'PARTIAL',
      nextStartDate: '2026-05-28',
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

  it('passes price backfill worker concurrency from request to service', async () => {
    const service = {
      backfillPrices: jest.fn().mockResolvedValue({ processedCount: 3 }),
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

    expect(service.backfillPrices).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 25,
      workerConcurrency: 3,
      fullReload: false,
      policy: 'INCREMENTAL_LATEST_ONLY',
    }));
    expect(res.json).toHaveBeenCalledWith({ processedCount: 3 });
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

  it('starts price backfill as a background run with bounded parameters', async () => {
    const service = {
      startPriceBackfillRun: jest.fn().mockResolvedValue({ runId: 'price-backfill-1', status: 'RUNNING' }),
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

    expect(service.startPriceBackfillRun).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 20,
      workerConcurrency: 2,
      maxBatches: 100,
      force: false,
      policy: 'INCREMENTAL_LATEST_ONLY',
    }));
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ runId: 'price-backfill-1', status: 'RUNNING' });
  });

  it('returns and cancels background price backfill runs', async () => {
    const service = {
      getPriceBackfillRun: jest.fn().mockReturnValue({ runId: 'price-backfill-1', status: 'RUNNING' }),
      cancelPriceBackfillRun: jest.fn().mockReturnValue({ runId: 'price-backfill-1', status: 'PARTIAL' }),
    };
    const controller = new MarketDataFoundationController(service as any);
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await controller.getPriceBackfillRun({ params: { runId: 'price-backfill-1' } } as any, res);
    await controller.cancelPriceBackfillRun({ params: { runId: 'price-backfill-1' } } as any, res);

    expect(service.getPriceBackfillRun).toHaveBeenCalledWith('price-backfill-1');
    expect(service.cancelPriceBackfillRun).toHaveBeenCalledWith('price-backfill-1');
    expect(res.json).toHaveBeenNthCalledWith(1, { runId: 'price-backfill-1', status: 'RUNNING' });
    expect(res.json).toHaveBeenNthCalledWith(2, { runId: 'price-backfill-1', status: 'PARTIAL' });
  });
});
