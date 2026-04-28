import express from 'express';
import { SignalGenerationEngineController } from './signal-generation-engine.controller';

export const createSignalGenerationEngineRouter = (
  controller = new SignalGenerationEngineController()
) => {
  const router = express.Router();

  router.get('/signals/health', controller.health);
  router.get('/signals/top', controller.top);
  router.get('/signals/screener', controller.screener);
  router.get('/signals/:instrumentId', controller.latestForInstrument);
  router.post('/signals/run', controller.run);

  return router;
};

export const signalGenerationEngineRouter = createSignalGenerationEngineRouter();

export default signalGenerationEngineRouter;

