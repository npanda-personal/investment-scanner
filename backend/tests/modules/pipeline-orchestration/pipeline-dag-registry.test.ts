import { PIPELINE_DAG_EDGES } from '../../../src/modules/pipeline-orchestration/pipeline-dag-registry';
import { PipelineDagRunner } from '../../../src/modules/pipeline-orchestration/pipeline-dag-runner';
import type { PipelineStageAdapter } from '../../../src/modules/pipeline-orchestration/pipeline-dag.types';

function fakeAdaptersFromEdges(): PipelineStageAdapter[] {
  return Object.entries(PIPELINE_DAG_EDGES).map(([key, deps], idx) => ({
    key,
    stageOrder: idx + 1,
    stageVersion: 'dag-v1',
    dependsOn: [...deps],
    run: async () => ({ status: 'COMPLETED' as const, succeededCount: 1, failedCount: 0 }),
  }));
}

const stubPersistence = {
  upsertRun: async () => ({ id: 'run-1', status: 'RUNNING' }),
  completeRun: async () => undefined,
  findRunByKey: async () => null,
  upsertStage: async () => undefined,
  acquireStage: async () => ({ acquired: true, reason: 'ACQUIRED' }),
  extendLease: async () => undefined,
  completeStage: async () => undefined,
  findTerminalStage: async () => null,
  resetStage: async () => undefined,
};

describe('pipeline DAG registry graph', () => {
  it('edge map is acyclic with no unknown dependencies (runner constructor accepts it)', () => {
    expect(
      () => new PipelineDagRunner(fakeAdaptersFromEdges(), { persistence: stubPersistence }),
    ).not.toThrow();
  });

  it('every dependency references a declared stage', () => {
    const keys = new Set(Object.keys(PIPELINE_DAG_EDGES));
    for (const [key, deps] of Object.entries(PIPELINE_DAG_EDGES)) {
      for (const dep of deps) {
        expect(keys.has(dep)).toBe(true);
        expect(dep).not.toBe(key);
      }
    }
  });

  it('preserves the load-bearing conservative edges (Q1 + smart-money race + verdict reads)', () => {
    expect(PIPELINE_DAG_EDGES.MARKET_CONTEXT).toContain('SIGNAL_CALIBRATION');
    expect(PIPELINE_DAG_EDGES.SMART_MONEY).toContain('RAW_SIGNALS');
    expect(PIPELINE_DAG_EDGES.RAW_SIGNALS).toContain('DATA_QUALITY');
    expect(PIPELINE_DAG_EDGES.WORKBENCH_REFRESH).toContain('SIGNAL_QUALITY');
    expect(PIPELINE_DAG_EDGES.CONTEXT_SNAPSHOTS).toContain('MARKET_CONTEXT_SNAPSHOT_REFRESH');
  });

  it('full-graph execution completes every stage exactly once', async () => {
    const invoked: string[] = [];
    const adapters = fakeAdaptersFromEdges().map((a) => ({
      ...a,
      run: async () => {
        invoked.push(a.key);
        return { status: 'COMPLETED' as const, succeededCount: 1, failedCount: 0 };
      },
    }));
    const runner = new PipelineDagRunner(adapters, { persistence: stubPersistence });
    const result = await runner.execute({
      tradingDate: '2026-06-11',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      trigger: 'manual',
    });
    expect(result.runStatus).toBe('COMPLETED');
    expect(invoked.sort()).toEqual(Object.keys(PIPELINE_DAG_EDGES).sort());
  });
});
