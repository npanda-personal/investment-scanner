/// <reference types="@types/jest" />
import { PipelineOrchestrationService } from '../../../src/modules/pipeline-orchestration';

describe('PipelineOrchestrationService', () => {
  it('builds stable run and stage idempotency keys from scope, date, and fingerprints', () => {
    const repository = {
      upsertRun: jest.fn(),
      completeRun: jest.fn(),
      upsertStage: jest.fn(),
      acquireStageLease: jest.fn(),
      completeStage: jest.fn(),
      recordStageProgress: jest.fn(),
      latestStages: jest.fn(),
    };
    const service = new PipelineOrchestrationService(repository as any);
    const dataThroughDate = new Date('2026-05-22T15:30:00.000Z');

    const runKey = service.runIdempotencyKey({
      pipelineKey: 'market-intelligence',
      region: 'in',
      assetType: 'stock',
      timeframe: '1D',
      triggerType: 'scheduled',
      dataThroughDate,
      sourceFingerprint: 'nse:2026-05-22:abc',
    });
    const stageKey = service.stageIdempotencyKey({
      pipelineRunId: 'run-1',
      stageKey: 'DATA_QUALITY',
      stageOrder: 2,
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate,
      inputFingerprint: 'prices:2026-05-22:2672',
    });

    expect(runKey).toBe('pipeline-ledger-v1:run:market-intelligence:in:stock:1d:2026-05-22:nse:2026-05-22:abc');
    expect(stageKey).toBe('pipeline-ledger-v1:stage:data_quality:in:stock:1d:2026-05-22:prices:2026-05-22:2672');
  });

  it('normalizes scope before creating runs and stages', async () => {
    const repository = {
      upsertRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
      completeRun: jest.fn(),
      upsertStage: jest.fn().mockResolvedValue({ id: 'stage-1' }),
      acquireStageLease: jest.fn(),
      completeStage: jest.fn(),
      recordStageProgress: jest.fn(),
      latestStages: jest.fn(),
    };
    const service = new PipelineOrchestrationService(repository as any);

    await service.createRun({
      pipelineKey: 'market-intelligence',
      region: ' in ',
      assetType: ' stock ',
      triggerType: 'scheduled',
      sourceFingerprint: 'nse:latest',
    });
    await service.createStage({
      pipelineRunId: 'run-1',
      stageKey: 'MARKET_DATA',
      stageOrder: 1,
      region: ' in ',
      assetType: ' stock ',
      cacheKey: 'market-data:in:stock',
      cacheStatus: 'MISS',
    });

    expect(repository.upsertRun).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      idempotencyKey: expect.stringContaining(':in:stock:1d:'),
    }));
    expect(repository.upsertStage).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      cacheStatus: 'MISS',
      idempotencyKey: expect.stringContaining(':market_data:in:stock:1d:'),
    }));
  });

  it('rejects invalid leases before hitting persistence', async () => {
    const repository = {
      upsertRun: jest.fn(),
      completeRun: jest.fn(),
      upsertStage: jest.fn(),
      acquireStageLease: jest.fn(),
      completeStage: jest.fn(),
      recordStageProgress: jest.fn(),
      latestStages: jest.fn(),
    };
    const service = new PipelineOrchestrationService(repository as any);

    await expect(service.leaseStage({ idempotencyKey: 'stage-1', leaseOwner: 'worker-1', leaseMs: 0 })).rejects.toThrow('leaseMs must be positive');
    await expect(service.leaseStage({ idempotencyKey: 'stage-1', leaseOwner: ' ', leaseMs: 1000 })).rejects.toThrow('leaseOwner is required');
    expect(repository.acquireStageLease).not.toHaveBeenCalled();
  });
});
