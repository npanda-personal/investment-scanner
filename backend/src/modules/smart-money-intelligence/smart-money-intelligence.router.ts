import express from 'express';
import { heavyDataRouteLimiter } from '../../shared/middleware';
import { SmartMoneyIntelligenceController } from './smart-money-intelligence.controller';

export const createSmartMoneyIntelligenceRouter = (
  controller = new SmartMoneyIntelligenceController()
) => {
  const router = express.Router();

  router.get('/smart-money/health', controller.health);
  router.post('/smart-money/run', controller.run);
  router.get('/smart-money/sectors', heavyDataRouteLimiter, controller.sectors);
  router.get('/smart-money/top', controller.top);
  router.get('/smart-money/distribution', controller.distribution);
  router.get('/smart-money/stocks/:instrumentId', controller.stock);
  router.get('/smart-money/fno-ban', controller.fnoBanList);
  router.post('/smart-money/fno-ban/ingest', controller.fnoBanIngest);

  return router;
};

export const smartMoneyIntelligenceRouter = createSmartMoneyIntelligenceRouter();
export default smartMoneyIntelligenceRouter;
