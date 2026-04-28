import express from 'express';
import { BacktestingStrategyLabController } from './backtesting-strategy-lab.controller';

export const createBacktestingStrategyLabRouter = (
  controller = new BacktestingStrategyLabController()
) => {
  const router = express.Router();

  router.get('/backtests/strategies', controller.listStrategies);
  router.post('/backtests/strategies', controller.createStrategy);
  router.get('/backtests/strategies/:id', controller.getStrategy);
  router.patch('/backtests/strategies/:id', controller.updateStrategy);
  router.delete('/backtests/strategies/:id', controller.deleteStrategy);
  router.post('/backtests/strategies/:id/run', controller.runStrategy);

  router.post('/backtests/run', controller.run);
  router.get('/backtests/runs', controller.listRuns);
  router.get('/backtests/runs/:id', controller.getRun);
  router.delete('/backtests/runs/:id', controller.deleteRun);

  return router;
};

export const backtestingStrategyLabRouter = createBacktestingStrategyLabRouter();
export default backtestingStrategyLabRouter;
