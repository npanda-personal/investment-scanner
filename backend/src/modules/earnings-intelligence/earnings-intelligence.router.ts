import { Router } from 'express';
import { EarningsIntelligenceController } from './earnings-intelligence.controller';

export function createEarningsIntelligenceRouter(controller = new EarningsIntelligenceController()) {
  const router = Router();
  router.get('/market-intelligence/earnings', controller.latest);
  router.post('/market-intelligence/earnings/refresh', controller.refresh);
  return router;
}

export const earningsIntelligenceRouter = createEarningsIntelligenceRouter();
export default earningsIntelligenceRouter;

