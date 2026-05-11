import { Router } from 'express';
import { requireAuth } from '../auth-identity';
import { TodayTradeReviewController } from './today-trade-review.controller';

export function createTodayTradeReviewRouter(controller = new TodayTradeReviewController()) {
  const router = Router();
  router.use(requireAuth);
  router.get('/today-review/latest', controller.latest);
  router.get('/today-review/runs', controller.runs);
  router.get('/today-review/runs/:id', controller.runById);
  router.get('/today-review/candidates/:id', controller.candidate);
  router.post('/today-review/run', controller.run);
  return router;
}

export const todayTradeReviewRouter = createTodayTradeReviewRouter();
export default todayTradeReviewRouter;
