import express from 'express';
import { StrategyDecisionEngineController } from './strategy-decision-engine.controller';

export const createStrategyDecisionEngineRouter = (
  controller = new StrategyDecisionEngineController()
) => {
  const router = express.Router();

  router.get('/market-gate', controller.marketGate);
  router.post('/evaluate', controller.evaluate);
  router.get('/candidates', controller.candidates);
  router.get('/exits', controller.exits);
  router.get('/watchlist/:watchlistId', controller.watchlist);
  router.get('/portfolio/:portfolioId', controller.portfolio);
  router.get('/model', controller.model);
  router.get('/history/:instrumentId', controller.history);
  router.get('/:instrumentId', controller.latestForInstrument);
  router.get('/health', controller.health);

  return router;
};

export const strategyDecisionEngineRouter = createStrategyDecisionEngineRouter();
export default strategyDecisionEngineRouter;
