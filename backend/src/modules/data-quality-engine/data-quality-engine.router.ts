import { Router } from 'express';
import { DataQualityEngineController } from './data-quality-engine.controller';

export function createDataQualityEngineRouter(controller = new DataQualityEngineController()) {
  const router = Router();
  router.get('/data-quality/summary', controller.summary);
  router.get('/data-quality/instruments', controller.instruments);
  router.get('/data-quality/signal-readiness', controller.signalReadiness);
  router.get('/data-quality/liquidity', controller.liquidity);
  router.get('/data-quality/instruments/:instrumentId', controller.instrument);
  router.post('/data-quality/evaluate', controller.evaluate);
  return router;
}

export const dataQualityEngineRouter = createDataQualityEngineRouter();
export default dataQualityEngineRouter;
