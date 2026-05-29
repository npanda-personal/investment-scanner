import express from 'express';
import { MarketContextIntelligenceController } from './market-context-intelligence.controller';

export const createMarketContextIntelligenceRouter = (
  controller = new MarketContextIntelligenceController()
) => {
  const router = express.Router();
  router.get('/market-context/summary', controller.summary);
  router.get('/market-context/persisted-summary', controller.persistedSummary);
  router.get('/market-context/regime', controller.regime);
  router.get('/market-context/sectors', controller.sectors);
  router.get('/market-context/breadth', controller.breadth);
  router.get('/market-context/countries', controller.countries);
  router.get('/market-context/macro', controller.macro);
  router.post('/market-context/run', controller.run);
  return router;
};

export const marketContextIntelligenceRouter = createMarketContextIntelligenceRouter();
export default marketContextIntelligenceRouter;
