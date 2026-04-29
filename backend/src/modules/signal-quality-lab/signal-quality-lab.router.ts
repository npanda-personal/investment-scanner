import express from 'express';
import { requireAuth } from '../auth-identity';
import { SignalQualityLabController } from './signal-quality-lab.controller';

export const createSignalQualityLabRouter = (controller = new SignalQualityLabController()) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/signals/quality/summary', controller.summary);
  router.get('/signals/quality/by-type', controller.byType);
  router.get('/signals/quality/by-sector', controller.bySector);
  router.get('/signals/quality/by-score', controller.byScoreBucket);
  router.get('/signals/quality/by-regime', controller.byRegime);
  router.get('/signals/quality/noisy', controller.noisy);
  router.get('/signals/:instrumentId/history', controller.history);
  router.get('/signals/:instrumentId/outcomes', controller.outcomes);
  router.post('/signals/quality/recalculate', controller.recalculate);

  return router;
};

export const signalQualityLabRouter = createSignalQualityLabRouter();

export default signalQualityLabRouter;
