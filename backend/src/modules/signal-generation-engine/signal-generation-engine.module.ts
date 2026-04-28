import { SignalGenerationEngineController } from './signal-generation-engine.controller';
import { SignalGenerationEngineRepository } from './signal-generation-engine.repository';
import { signalGenerationEngineRouter } from './signal-generation-engine.router';
import { SignalGenerationEngineService } from './signal-generation-engine.service';

export const signalGenerationEngineModule = {
  name: 'signal-generation-engine',
  router: signalGenerationEngineRouter,
  controller: SignalGenerationEngineController,
  service: SignalGenerationEngineService,
  repository: SignalGenerationEngineRepository,
};

