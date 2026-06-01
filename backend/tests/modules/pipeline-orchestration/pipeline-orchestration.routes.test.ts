/// <reference types="@types/jest" />
import { apiModules } from '../../../src/api/routes';
import { portfolioManagementRouter } from '../../../src/modules/portfolio-management';
import { createPipelineOrchestrationRouter } from '../../../src/modules/pipeline-orchestration';
import { pipelineOrchestrationRouter } from '../../../src/modules/pipeline-orchestration';

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

  it('mounts before catch-all authenticated routers in the api registry', () => {
    const pipelineIndex = apiModules.findIndex((module) => module.router === pipelineOrchestrationRouter);
    const firstCatchAllAuthIndex = apiModules.findIndex((module) => module.router === portfolioManagementRouter);

    expect(pipelineIndex).toBeGreaterThanOrEqual(0);
    expect(firstCatchAllAuthIndex).toBeGreaterThanOrEqual(0);
    expect(pipelineIndex).toBeLessThan(firstCatchAllAuthIndex);
  });
});
