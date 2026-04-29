import { DataQualityEngineController } from './data-quality-engine.controller';
import { DataQualityEngineRepository } from './data-quality-engine.repository';
import { dataQualityEngineRouter } from './data-quality-engine.router';
import { DataQualityEngineService } from './data-quality-engine.service';

export const dataQualityEngineModule = {
  router: dataQualityEngineRouter,
  controller: DataQualityEngineController,
  service: DataQualityEngineService,
  repository: DataQualityEngineRepository,
};
