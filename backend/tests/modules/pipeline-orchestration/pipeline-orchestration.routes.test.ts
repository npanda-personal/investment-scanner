/// <reference types="@types/jest" />
import { createPipelineOrchestrationRouter } from '../../../src/modules/pipeline-orchestration';

describe('pipeline orchestration routes', () => {
  it('registers status and command endpoints', () => {
    const router = createPipelineOrchestrationRouter({
      status: jest.fn(),
      commandCatalog: jest.fn(),
      executeCommand: jest.fn(),
    } as any);
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toEqual([
      'GET /pipeline/status',
      'GET /pipeline/commands/catalog',
      'POST /pipeline/commands',
    ]);
  });
});
