import { Router } from 'express';
import { heavyDataRouteLimiter } from '../../shared/middleware';
import { EarningsIntelligenceController } from './earnings-intelligence.controller';

export function createEarningsIntelligenceRouter(controller = new EarningsIntelligenceController()) {
  const router = Router();
  router.get('/market-intelligence/earnings', heavyDataRouteLimiter, controller.latest);
  router.post('/market-intelligence/earnings/ingest-board-meetings', controller.ingestBoardMeetings);
  router.post('/market-intelligence/earnings/refresh', controller.refresh);
  return router;
}

export const earningsIntelligenceRouter = createEarningsIntelligenceRouter();
export default earningsIntelligenceRouter;

