/// <reference types="@types/jest" />
import {
  createMarketDataDataRouter,
  createMarketDataFoundationRouter,
  createMarketDataStocksRouter,
  createMarketDataV1Router,
} from '../../../src/modules/market-data-foundation';

const controller = {
  health: jest.fn(),
  universeHealth: jest.fn(),
  trustedReviewUniverseHealth: jest.fn(),
  trustedReviewUniverseInstruments: jest.fn(),
  repairPlan: jest.fn(),
  repairRun: jest.fn(),
  latestRepairRun: jest.fn(),
  manualMetadataTemplate: jest.fn(),
  validateProviders: jest.fn(),
  repairCatalogIdentity: jest.fn(),
  repairProviderBusinessMetadata: jest.fn(),
  importManualMetadata: jest.fn(),
  enrichMetadata: jest.fn(),
  backfillPrices: jest.fn(),
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
        'GET /market-data/review-universe',
        'GET /market-data/review-universe/instruments',
        'GET /market-data/universe/repair-plan',
        'GET /market-data/universe/repair-runs/latest',
        'POST /market-data/universe/repair-run',
        'GET /market-data/metadata/manual-template',
        'POST /market-data/provider/validate',
        'POST /market-data/catalog/identity/repair',
        'POST /market-data/catalog/identity-repair',
        'POST /market-data/metadata/provider-business/repair',
        'POST /market-data/metadata/manual-import',
        'POST /market-data/metadata/enrich',
        'POST /market-data/prices/backfill',
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
