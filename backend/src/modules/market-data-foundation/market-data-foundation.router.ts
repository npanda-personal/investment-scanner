import express from 'express';
import { MarketDataFoundationController } from './market-data-foundation.controller';

export const createMarketDataFoundationRouter = (
  controller = new MarketDataFoundationController()
) => {
  const router = express.Router();

  router.use('/stocks', createMarketDataStocksRouter(controller));
  router.use('/data', createMarketDataDataRouter(controller));

  return router;
};

export const createMarketDataStocksRouter = (
  controller = new MarketDataFoundationController()
) => {
  const router = express.Router();

  router.get('/', controller.listStocks);
  router.get('/search', controller.searchAssets);
  router.get('/yahoo-search', controller.yahooSearch);
  router.get('/:id', controller.getStock);
  router.post('/', controller.createStock);
  router.patch('/:id', controller.updateStock);
  router.delete('/:id', controller.deleteStock);
  router.post('/:id/toggle-active', controller.toggleStockActive);
  router.post('/:id/sync', controller.syncStock);
  router.post('/sync-all', controller.syncAllStocks);

  return router;
};

export const createMarketDataDataRouter = (
  controller = new MarketDataFoundationController()
) => {
  const router = express.Router();

  router.get('/search', controller.searchMarketData);
  router.post('/ingest', controller.ingestSymbol);
  router.get('/prices/:symbol', controller.listPrices);
  router.get('/fundamentals/:symbol', controller.getFundamentals);
  router.get('/corporate-actions/:symbol', controller.getCorporateActions);

  return router;
};

export const createMarketDataV1Router = (
  controller = new MarketDataFoundationController()
) => {
  const router = express.Router();

  router.get('/market-data/scheduler/status', controller.schedulerStatus);
  router.get('/market-data/health', controller.health);
  router.get('/market-data/universe/health', controller.universeHealth);
  router.get('/market-data/review-readiness-summary', controller.reviewReadinessSummary);
  router.get('/market-data/review-universe', controller.trustedReviewUniverseHealth);
  router.get('/market-data/review-universe/instruments', controller.trustedReviewUniverseInstruments);
  router.get('/market-data/universe/repair-plan', controller.repairPlan);
  router.get('/market-data/universe/repair-runs/latest', controller.latestRepairRun);
  router.post('/market-data/universe/repair-run', controller.repairRun);
  router.get('/market-data/metadata/manual-template', controller.manualMetadataTemplate);
  router.post('/market-data/provider/validate', controller.validateProviders);
  router.post('/market-data/catalog/identity/repair', controller.repairCatalogIdentity);
  router.post('/market-data/catalog/identity-repair', controller.repairCatalogIdentity);
  router.post('/market-data/metadata/provider-business/repair', controller.repairProviderBusinessMetadata);
  router.post('/market-data/metadata/manual-import', controller.importManualMetadata);
  router.post('/market-data/metadata/enrich', controller.enrichMetadata);
  router.post('/market-data/prices/backfill', controller.backfillPrices);
  router.get('/market-data/catalog/sources', controller.listCatalogSources);
  router.post('/market-data/catalog/import', controller.importCatalog);
  router.post('/market-data/catalog/backfill-metadata', controller.backfillCatalogMetadata);
  router.get('/instruments', controller.listInstruments);
  router.post('/instruments', controller.createInstrument);
  router.get('/instruments/:id', controller.getInstrument);
  router.get('/prices/:instrumentId', controller.listInstrumentPrices);
  router.get('/prices/:instrumentId/latest', controller.getInstrumentLatestPrice);
  router.get('/fundamentals/:instrumentId', controller.getInstrumentFundamentals);
  router.get('/corporate-actions/:instrumentId', controller.getInstrumentCorporateActions);
  router.get('/fx-rates', controller.listFxRates);
  router.get('/fx-rates/:pair', controller.getFxRate);
  router.post('/fx-rates/sync', controller.syncFxRates);
  router.post('/ingestion/sync', controller.syncV1);

  return router;
};

export const marketDataStocksRouter = createMarketDataStocksRouter();
export const marketDataDataRouter = createMarketDataDataRouter();
export const marketDataV1Router = createMarketDataV1Router();

export default createMarketDataFoundationRouter();
