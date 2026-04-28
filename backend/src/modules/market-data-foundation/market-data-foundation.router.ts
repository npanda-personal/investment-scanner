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

export const marketDataStocksRouter = createMarketDataStocksRouter();
export const marketDataDataRouter = createMarketDataDataRouter();

export default createMarketDataFoundationRouter();
