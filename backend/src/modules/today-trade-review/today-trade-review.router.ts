import { Router } from 'express';
import { requireAuth } from '../auth-identity';
import { TodayTradeReviewController } from './today-trade-review.controller';

export function createTodayTradeReviewRouter(controller = new TodayTradeReviewController()) {
  const router = Router();
  router.get('/today-review/latest', requireAuth, controller.latest);
  router.get('/today-review/runs', requireAuth, controller.runs);
  router.get('/today-review/runs/:id', requireAuth, controller.runById);
  router.get('/today-review/candidates/:id', requireAuth, controller.candidate);
  router.post('/today-review/run', requireAuth, controller.run);
  return router;
}

export const todayTradeReviewRouter = createTodayTradeReviewRouter();
export default todayTradeReviewRouter;
