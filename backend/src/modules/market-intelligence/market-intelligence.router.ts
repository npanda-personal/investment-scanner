import { Router } from 'express';
import { MarketIntelligenceController } from './market-intelligence.controller';

export function createMarketIntelligenceRouter(controller = new MarketIntelligenceController()) {
  const router = Router();
  router.get('/market-intelligence/stock-interest', controller.stockInterest);
  router.get('/market-intelligence/sector-constituents', controller.sectorConstituents);
  router.get('/market-intelligence/sector-rotation', controller.sectorRotation);
  router.get('/market-intelligence/event-feed', controller.eventFeed);
  router.get('/market-intelligence/instrument-context/:instrumentId', controller.instrumentContext);
  router.get('/market-intelligence/index-constituents', controller.indexConstituents);
  return router;
}

export const marketIntelligenceRouter = createMarketIntelligenceRouter();
export default marketIntelligenceRouter;
