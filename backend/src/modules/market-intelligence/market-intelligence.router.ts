import { Router } from 'express';
import { MarketIntelligenceController } from './market-intelligence.controller';

export function createMarketIntelligenceRouter(controller = new MarketIntelligenceController()) {
  const router = Router();
  router.get('/market-intelligence/stock-interest', controller.stockInterest);
  router.get('/market-intelligence/sector-constituents', controller.sectorConstituents);
  return router;
}

export const marketIntelligenceRouter = createMarketIntelligenceRouter();
export default marketIntelligenceRouter;
