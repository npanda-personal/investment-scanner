import { SignalCalibrationEngineController } from './signal-calibration-engine.controller';
import { createSignalCalibrationEngineRouter } from './signal-calibration-engine.router';
import { SignalCalibrationEngineService } from './signal-calibration-engine.service';

const service = new SignalCalibrationEngineService();
const controller = new SignalCalibrationEngineController(service);

export const signalCalibrationEngineModule = {
  service,
  controller,
  router: createSignalCalibrationEngineRouter(controller),
};
