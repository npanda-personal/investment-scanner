import { PipelineOrchestrationRepository } from './pipeline-orchestration.repository';
import { pipelineOrchestrationRouter } from './pipeline-orchestration.router';
import { PipelineOrchestrationService } from './pipeline-orchestration.service';

const repository = new PipelineOrchestrationRepository();
const service = new PipelineOrchestrationService(repository);

export const pipelineOrchestrationModule = {
  name: 'pipeline-orchestration',
  router: pipelineOrchestrationRouter,
  service,
  repository,
};
