import express from 'express';
import { MarketContextIntelligenceController } from './market-context-intelligence.controller';

export const createMarketContextIntelligenceRouter = (
  controller = new MarketContextIntelligenceController()
) => {
  const router = express.Router();
  router.get('/market-context/summary', controller.summary);
  router.get('/market-context/persisted-summary', controller.persistedSummary);
  router.get('/market-context/persisted-breadth', controller.persistedBreadth);
  router.get('/market-context/capital-posture', controller.capitalPosture);
  router.get('/market-intelligence/market-pulse', controller.marketPulse);
  router.get('/market-intelligence/market-pulse/history', controller.marketPulseHistory);
  router.get('/market-intelligence/sectors', controller.sectorSnapshots);
  router.get('/market-context/regime', controller.regime);
  router.get('/market-context/sectors', controller.sectors);
  router.get('/market-context/breadth', controller.breadth);
  router.get('/market-context/countries', controller.countries);
  router.get('/market-context/macro', controller.macro);
  router.post('/market-context/run', controller.run);
  // CB-21: FII/DII Activity
  router.get('/market-context/fii-dii', controller.fiiDiiActivity);
  router.post('/market-context/fii-dii/ingest', controller.fiiDiiIngest);
  // CB-22: Bulk & Block Deals
  router.get('/market-context/bulk-block-deals', controller.bulkBlockDeals);
  router.post('/market-context/bulk-block-deals/ingest', controller.bulkBlockDealsIngest);
  return router;
};

export const createMarketIntelligenceContextReadRouter = (
  controller = new MarketContextIntelligenceController()
) => {
  const router = express.Router();
  router.get('/market-intelligence/market-pulse', controller.marketPulse);
  router.get('/market-intelligence/market-pulse/history', controller.marketPulseHistory);
  router.get('/market-intelligence/sectors', controller.sectorSnapshots);
  return router;
};

export const marketContextIntelligenceRouter = createMarketContextIntelligenceRouter();
export const marketIntelligenceContextReadRouter = createMarketIntelligenceContextReadRouter();
export default marketContextIntelligenceRouter;
