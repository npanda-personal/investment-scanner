import express from 'express';
import { requireAuth } from '../auth-identity';
import { StrategyFrameworkController } from './strategy-framework.controller';

export const createStrategyFrameworkRouter = (
  controller = new StrategyFrameworkController()
) => {
  const router = express.Router();

  router.get('/strategies/health', controller.health);
  router.get('/strategies/model', controller.model);
  router.get('/strategies/rankings', controller.rankings);
  router.get('/strategies', controller.list);
  router.post('/strategies/evaluate', controller.evaluate);
  router.post('/strategies/seed', requireAuth, controller.seed);
  router.get('/strategies/:code', controller.detail);
  router.get('/strategies/:code/performance', controller.performance);
  router.post('/strategies/:code/backtest', requireAuth, controller.backtest);

  return router;
};

export const strategyFrameworkRouter = createStrategyFrameworkRouter();
export default strategyFrameworkRouter;
