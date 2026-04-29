import express from 'express';
import { requireAuth } from '../auth-identity';
import { SignalCalibrationEngineController } from './signal-calibration-engine.controller';

export const createSignalCalibrationEngineRouter = (controller = new SignalCalibrationEngineController()) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/signals/calibration/health', controller.health);
  router.get('/signals/calibration/model', controller.model);
  router.get('/signals/calibration/top', controller.top);
  router.post('/signals/calibration/run', controller.run);
  router.get('/signals/calibration/compare/:instrumentId', controller.compare);
  router.get('/signals/calibration/:instrumentId', controller.latestForInstrument);

  return router;
};

export const signalCalibrationEngineRouter = createSignalCalibrationEngineRouter();

export default signalCalibrationEngineRouter;
