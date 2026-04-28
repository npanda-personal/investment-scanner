/// <reference types="@types/jest" />
import { createBacktestingStrategyLabRouter } from '../../../src/modules/backtesting-strategy-lab';

describe('backtesting strategy lab routes', () => {
  it('registers MVP endpoints', () => {
    const router = createBacktestingStrategyLabRouter({
      listStrategies: jest.fn(),
      createStrategy: jest.fn(),
      getStrategy: jest.fn(),
      updateStrategy: jest.fn(),
      deleteStrategy: jest.fn(),
      runStrategy: jest.fn(),
      run: jest.fn(),
      listRuns: jest.fn(),
      getRun: jest.fn(),
      deleteRun: jest.fn(),
    } as any);
    const routes = router.stack.filter((layer: any) => layer.route).map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toEqual([
      'GET /backtests/strategies',
      'POST /backtests/strategies',
      'GET /backtests/strategies/:id',
      'PATCH /backtests/strategies/:id',
      'DELETE /backtests/strategies/:id',
      'POST /backtests/strategies/:id/run',
      'POST /backtests/run',
      'GET /backtests/runs',
      'GET /backtests/runs/:id',
      'DELETE /backtests/runs/:id',
    ]);
  });
});
