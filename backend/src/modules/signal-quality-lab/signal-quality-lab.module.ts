import { SignalQualityLabController } from './signal-quality-lab.controller';
import { createSignalQualityLabRouter } from './signal-quality-lab.router';
import { SignalQualityLabService } from './signal-quality-lab.service';

const service = new SignalQualityLabService();
const controller = new SignalQualityLabController(service);

export const signalQualityLabModule = {
  service,
  controller,
  router: createSignalQualityLabRouter(controller),
};
