import { PipelineOrchestrationRepository } from './pipeline-orchestration.repository';
import { PipelineOrchestrationService } from './pipeline-orchestration.service';

const repository = new PipelineOrchestrationRepository();
const service = new PipelineOrchestrationService(repository);

export const pipelineOrchestrationModule = {
  name: 'pipeline-orchestration',
  service,
  repository,
};
