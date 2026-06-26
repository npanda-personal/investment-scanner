import express from 'express';
import { heavyDataRouteLimiter } from '../../shared/middleware';
import { SignalGenerationEngineController } from './signal-generation-engine.controller';

export const createSignalGenerationEngineRouter = (
  controller = new SignalGenerationEngineController()
) => {
  const router = express.Router();

  router.get('/signals/health', controller.health);
  router.get('/signals/runs/latest', controller.latestRun);
  router.get('/signals/top', controller.top);
  router.get('/signals/screener', controller.screener);
  // Lifecycle endpoints — register BEFORE /:instrumentId to avoid route shadowing
  router.get('/signals/exit-candidates', controller.exitCandidates);
  router.get('/signals/lifecycle', controller.lifecycle);
  router.get('/signals/:instrumentId', heavyDataRouteLimiter, controller.latestForInstrument);
  router.post('/signals/run', controller.run);

  return router;
};

export const signalGenerationEngineRouter = createSignalGenerationEngineRouter();

export default signalGenerationEngineRouter;
