/// <reference types="@types/jest" />
import { createSignalGenerationEngineRouter } from '../../../src/modules/signal-generation-engine';

describe('signal generation routes', () => {
  it('registers MVP signal endpoints', () => {
    const controller = {
      health: jest.fn(),
      top: jest.fn(),
      latestForInstrument: jest.fn(),
      latestRun: jest.fn(),
      run: jest.fn(),
      screener: jest.fn(),
    };
    const router = createSignalGenerationEngineRouter(controller as any);
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toEqual([
      'GET /signals/health',
      'GET /signals/runs/latest',
      'GET /signals/top',
      'GET /signals/screener',
      'GET /signals/:instrumentId',
      'POST /signals/run',
    ]);
  });
});
