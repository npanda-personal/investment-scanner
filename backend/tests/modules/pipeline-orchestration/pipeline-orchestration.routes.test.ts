/// <reference types="@types/jest" />
import { createPipelineOrchestrationRouter } from '../../../src/modules/pipeline-orchestration';

describe('pipeline orchestration routes', () => {
  it('registers the read-only status endpoint', () => {
    const router = createPipelineOrchestrationRouter({ status: jest.fn() } as any);
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toEqual(['GET /pipeline/status']);
  });
});
