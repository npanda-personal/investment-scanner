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
  router.post('/sync-runs', controller.startStockCatalogSyncRun);
  router.get('/sync-runs/:runId', controller.getStockCatalogSyncRun);
  router.post('/sync-runs/:runId/cancel', controller.cancelStockCatalogSyncRun);
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
  router.get('/market-data/stocks/missing-data-diagnostics', controller.stockMissingDataDiagnostics);
  router.get('/market-data/review-readiness-summary', controller.reviewReadinessSummary);
  router.get('/market-data/movers', controller.marketMovers);
  router.get('/market-data/market-map', controller.marketMap);
  router.get('/market-data/scans/52w-high', controller.marketScan52wHigh);
  router.get('/market-data/scans/52w-low', controller.marketScan52wLow);
  router.get('/market-data/scans/delivery-spike', controller.marketScanDeliverySpike);
  router.get('/market-data/scans/volume-spike', controller.marketScanVolumeSpike);
  router.get('/market-data/review-universe', controller.trustedReviewUniverseHealth);
  router.get('/market-data/review-universe/instruments', controller.trustedReviewUniverseInstruments);
  router.get('/market-data/universe/repair-plan', controller.repairPlan);
  router.get('/market-data/universe/repair-workbench', controller.repairWorkbench);
  router.get('/market-data/universe/repair-runs/latest', controller.latestRepairRun);
  router.post('/market-data/universe/repair-run', controller.repairRun);
  router.get('/market-data/provider-cleanup/report', controller.providerCleanupReport);
  router.post('/market-data/provider-cleanup/execute', controller.executeProviderCleanup);
  router.get('/market-data/source-file-imports', controller.listSourceFileImports);
  router.post('/market-data/exchange-files/nse-cm-udiff/import', controller.importNseCmUdiffDaily);
  router.post('/market-data/exchange-files/bse-cm-backup/import', controller.importBseCmBackupDaily);
  router.post('/market-data/exchange-files/nse-index-eod/import', controller.importNseIndexEodDaily);
  router.post('/market-data/exchange-files/nse-fo-udiff/import', controller.importNseFoUdiffDaily);
  router.post('/market-data/exchange-files/nse-delivery/import', controller.importNseDeliveryDaily);
  router.post('/market-data/exchange-files/nse-corporate-actions/import', controller.importNseCorporateActions);
  router.post('/market-data/adjusted-close/recompute', controller.recomputeAdjustedClose);
  router.post('/market-data/exchange-files/nse-delivery/refresh', controller.refreshNseDeliveryDaily);
  router.post('/market-data/exchange-files/nse-delivery/backfill', controller.runNseDeliveryHistoricalBackfill);
  router.post('/market-data/exchange-files/historical-backfill', controller.runExchangeHistoricalBackfill);
  router.post('/market-data/exchange-files/historical-backfill/runs', controller.startExchangeHistoricalBackfillRun);
  router.get('/market-data/exchange-files/historical-backfill/runs/:runId', controller.getExchangeHistoricalBackfillRun);
  router.post('/market-data/exchange-files/historical-backfill/runs/:runId/resume', controller.resumeExchangeHistoricalBackfillRun);
  router.post('/market-data/exchange-files/historical-backfill/runs/:runId/retry-failed', controller.retryFailedExchangeHistoricalBackfillRun);
  router.post('/market-data/exchange-files/historical-backfill/runs/:runId/cancel', controller.cancelExchangeHistoricalBackfillRun);
  router.get('/market-data/metadata/manual-template', controller.manualMetadataTemplate);
  router.post('/market-data/provider/validate', controller.validateProviders);
  router.post('/market-data/catalog/identity/repair', controller.repairCatalogIdentity);
  router.post('/market-data/catalog/identity-repair', controller.repairCatalogIdentity);
  router.post('/market-data/metadata/provider-business/repair', controller.repairProviderBusinessMetadata);
  router.post('/market-data/prices/identity-repair', controller.repairPriceIdentity);
  router.post('/market-data/metadata/manual-import', controller.importManualMetadata);
  router.post('/market-data/fundamentals/manual-verified-import', controller.importManualVerifiedFundamental);
  router.post('/market-data/fundamentals/manual-verified-bulk-import', controller.importBulkManualVerifiedFundamentals);
  router.post('/market-data/fundamentals/nse-xbrl-bulk-ingest', controller.nseXbrlBulkIngest);
  router.post('/market-data/metadata/enrich', controller.enrichMetadata);
  router.post('/market-data/prices/backfill', controller.backfillPrices);
  router.post('/market-data/prices/backfill-runs', controller.startPriceBackfillRun);
  router.get('/market-data/prices/backfill-active-run', controller.activePriceBackfillRun);
  router.get('/market-data/prices/backfill-runs/active', controller.activePriceBackfillRun);
  router.get('/market-data/prices/backfill-runs/:runId', controller.getPriceBackfillRun);
  router.post('/market-data/prices/backfill-runs/:runId/cancel', controller.cancelPriceBackfillRun);
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
