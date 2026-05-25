import { Router } from 'express';
import { PipelineOrchestrationController } from './pipeline-orchestration.controller';

export function createPipelineOrchestrationRouter(controller = new PipelineOrchestrationController()) {
  const router = Router();
  router.get('/pipeline/status', controller.status);
  return router;
}

export const pipelineOrchestrationRouter = createPipelineOrchestrationRouter();
export default pipelineOrchestrationRouter;
