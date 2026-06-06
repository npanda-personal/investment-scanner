/// <reference types="@types/jest" />
import { PipelineOrchestrationRepository } from '../../../src/modules/pipeline-orchestration';

const date = new Date('2026-05-22T00:00:00.000Z');
const now = new Date('2026-05-22T01:00:00.000Z');

const runRecord = {
  id: 'run-1',
  pipelineKey: 'market-intelligence',
  scopeRegion: 'IN',
  scopeAssetType: 'STOCK',
  timeframe: '1d',
  triggerType: 'scheduled',
  status: 'RUNNING',
  idempotencyKey: 'run-key',
  dataThroughDate: date,
  sourceFingerprint: 'nse:abc',
  changedInstrumentCount: 12,
  totalCount: 20,
  processedCount: 0,
  succeededCount: 0,
  partialCount: 0,
  failedCount: 0,
  skippedCount: 0,
  unchangedCount: 0,
  warnings: [],
  errors: [],
  metadata: { source: 'official-eod' },
  startedAt: now,
  completedAt: null,
  durationMs: null,
  createdAt: now,
  updatedAt: now,
};

const stageRecord = {
  id: 'stage-1',
  pipelineRunId: 'run-1',
  stageKey: 'DATA_QUALITY',
  stageOrder: 2,
  status: 'PENDING',
  idempotencyKey: 'stage-key',
  scopeRegion: 'IN',
  scopeAssetType: 'STOCK',
  timeframe: '1d',
  dataThroughDate: date,
  inputFingerprint: 'prices:abc',
  outputFingerprint: null,
  changedInstrumentCount: 12,
  batchSize: 100,
  offset: 0,
  nextOffset: null,
  hasMore: false,
  totalCount: 12,
  processedCount: 0,
  succeededCount: 0,
  partialCount: 0,
  failedCount: 0,
  skippedCount: 0,
  unchangedCount: 0,
  attemptCount: 0,
  cacheKey: 'dq:in:stock:2026-05-22',
  cacheStatus: 'MISS',
  cacheExpiresAt: null,
  leaseOwner: null,
  leaseExpiresAt: null,
  startedAt: null,
  completedAt: null,
  durationMs: null,
  warnings: [],
  errors: [],
  metadata: null,
  createdAt: now,
  updatedAt: now,
};

describe('PipelineOrchestrationRepository', () => {
  it('upserts pipeline runs with scope, counters, warnings, and metadata', async () => {
    const db = {
      pipelineRun: {
        upsert: jest.fn().mockResolvedValue(runRecord),
      },
    };
    const repository = new PipelineOrchestrationRepository(db as any);

    const saved = await repository.upsertRun({
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'scheduled',
      status: 'RUNNING',
      idempotencyKey: 'run-key',
      dataThroughDate: date,
      sourceFingerprint: 'nse:abc',
      changedInstrumentCount: 12,
      totalCount: 20,
      partialCount: 0,
      warnings: ['fallback unavailable'],
      metadata: { source: 'official-eod' },
    });

    expect(db.pipelineRun.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { idempotencyKey: 'run-key' },
      create: expect.objectContaining({
        scopeRegion: 'IN',
        scopeAssetType: 'STOCK',
        dataThroughDate: date,
        sourceFingerprint: 'nse:abc',
        changedInstrumentCount: 12,
        warnings: ['fallback unavailable'],
      }),
      update: expect.objectContaining({
        dataThroughDate: date,
      }),
    }));
    expect(saved).toMatchObject({
      id: 'run-1',
      region: 'IN',
      assetType: 'STOCK',
      status: 'RUNNING',
      dataThroughDate: '2026-05-22T00:00:00.000Z',
    });
  });

  it('upserts stages with bounded batch and cache metadata', async () => {
    const db = {
      pipelineStageRun: {
        upsert: jest.fn().mockResolvedValue(stageRecord),
      },
    };
    const repository = new PipelineOrchestrationRepository(db as any);

    const saved = await repository.upsertStage({
      pipelineRunId: 'run-1',
      stageKey: 'DATA_QUALITY',
      stageOrder: 2,
      region: 'IN',
      assetType: 'STOCK',
      idempotencyKey: 'stage-key',
      dataThroughDate: date,
      inputFingerprint: 'prices:abc',
      changedInstrumentCount: 12,
      batchSize: 100,
      offset: 0,
      totalCount: 12,
      cacheKey: 'dq:in:stock:2026-05-22',
      cacheStatus: 'MISS',
    });

    expect(db.pipelineStageRun.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { idempotencyKey: 'stage-key' },
      create: expect.objectContaining({
        pipelineRunId: 'run-1',
        stageKey: 'DATA_QUALITY',
        dataThroughDate: date,
        batchSize: 100,
        cacheKey: 'dq:in:stock:2026-05-22',
        cacheStatus: 'MISS',
      }),
      update: expect.objectContaining({
        dataThroughDate: date,
      }),
    }));
    expect(saved).toMatchObject({
      stageKey: 'DATA_QUALITY',
      batchSize: 100,
      cacheStatus: 'MISS',
      changedInstrumentCount: 12,
    });
  });

  it('acquires a stage lease only when no active lease blocks the stage', async () => {
    const runningStage = {
      ...stageRecord,
      status: 'RUNNING',
      leaseOwner: 'worker-1',
      leaseExpiresAt: new Date('2026-05-22T01:05:00.000Z'),
      startedAt: now,
      attemptCount: 1,
    };
    const db = {
      pipelineStageRun: {
        findUnique: jest.fn()
          .mockResolvedValueOnce(stageRecord)
          .mockResolvedValueOnce(runningStage),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new PipelineOrchestrationRepository(db as any);

    const result = await repository.acquireStageLease({
      idempotencyKey: 'stage-key',
      leaseOwner: 'worker-1',
      leaseMs: 300000,
      now,
    });

    expect(db.pipelineStageRun.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'stage-1',
        status: { notIn: ['COMPLETED', 'PARTIAL', 'FAILED', 'SKIPPED', 'BLOCKED', 'ABANDONED'] },
      }),
      data: expect.objectContaining({
        status: 'RUNNING',
        leaseOwner: 'worker-1',
        attemptCount: { increment: 1 },
      }),
    }));
    expect(result).toMatchObject({
      acquired: true,
      reason: 'ACQUIRED',
      stage: { status: 'RUNNING', leaseOwner: 'worker-1', attemptCount: 1 },
    });
  });

  it('does not lease terminal stages by default', async () => {
    const completedStage = { ...stageRecord, status: 'COMPLETED', completedAt: now };
    const db = {
      pipelineStageRun: {
        findUnique: jest.fn().mockResolvedValue(completedStage),
        updateMany: jest.fn(),
      },
    };
    const repository = new PipelineOrchestrationRepository(db as any);

    const result = await repository.acquireStageLease({
      idempotencyKey: 'stage-key',
      leaseOwner: 'worker-1',
      leaseMs: 300000,
      now,
    });

    expect(db.pipelineStageRun.updateMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({ acquired: false, reason: 'STAGE_TERMINAL' });
  });

  it('completes stages and clears lease fields', async () => {
    const completedStage = {
      ...stageRecord,
      status: 'PARTIAL',
      outputFingerprint: 'dq:abc',
      processedCount: 11,
      partialCount: 2,
      failedCount: 1,
      cacheStatus: 'STALE',
      completedAt: now,
      durationMs: 1234,
    };
    const db = {
      pipelineStageRun: {
        update: jest.fn().mockResolvedValue(completedStage),
      },
    };
    const repository = new PipelineOrchestrationRepository(db as any);

    await repository.completeStage({
      idempotencyKey: 'stage-key',
      status: 'PARTIAL',
      outputFingerprint: 'dq:abc',
      processedCount: 11,
      partialCount: 2,
      failedCount: 1,
      cacheStatus: 'STALE',
      durationMs: 1234,
      errors: ['one evaluation failed'],
    });

    expect(db.pipelineStageRun.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { idempotencyKey: 'stage-key' },
      data: expect.objectContaining({
        status: 'PARTIAL',
        partialCount: 2,
        leaseOwner: null,
        leaseExpiresAt: null,
        errors: ['one evaluation failed'],
      }),
    }));
  });

  it('records mid-run progress for navigation-resilient progress displays', async () => {
    const progressStage = {
      ...stageRecord,
      status: 'RUNNING',
      processedCount: 50,
      succeededCount: 45,
      partialCount: 3,
      failedCount: 2,
      nextOffset: 50,
      hasMore: true,
      leaseOwner: 'worker-1',
      leaseExpiresAt: new Date('2026-05-22T01:05:00.000Z'),
    };
    const db = {
      pipelineStageRun: {
        update: jest.fn().mockResolvedValue(progressStage),
      },
    };
    const repository = new PipelineOrchestrationRepository(db as any);

    const saved = await repository.recordStageProgress({
      idempotencyKey: 'stage-key',
      status: 'RUNNING',
      processedCount: 50,
      succeededCount: 45,
      partialCount: 3,
      failedCount: 2,
      nextOffset: 50,
      hasMore: true,
      leaseOwner: 'worker-1',
      leaseMs: 300000,
      startedAt: new Date('2026-05-22T01:00:00.000Z'),
      now,
    });

    expect(db.pipelineStageRun.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { idempotencyKey: 'stage-key' },
      data: expect.objectContaining({
        status: 'RUNNING',
        processedCount: 50,
        partialCount: 3,
        nextOffset: 50,
        hasMore: true,
        leaseOwner: 'worker-1',
        leaseExpiresAt: new Date('2026-05-22T01:05:00.000Z'),
        startedAt: new Date('2026-05-22T01:00:00.000Z'),
      }),
    }));
    expect(saved).toMatchObject({
      status: 'RUNNING',
      processedCount: 50,
      partialCount: 3,
      hasMore: true,
      leaseOwner: 'worker-1',
    });
  });

  it('uses bounded read-only queries for pipeline status', async () => {
    const db = {
      pipelineRun: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(runRecord)
          .mockResolvedValueOnce({ ...runRecord, status: 'COMPLETED', completedAt: now }),
      },
      pipelineStageRun: {
        findMany: jest.fn().mockResolvedValue([stageRecord]),
      },
    };
    const repository = new PipelineOrchestrationRepository(db as any);
    const query = { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence', limit: 25 };

    await repository.findActiveRun(query);
    await repository.findLastRun(query);
    await repository.latestStages(query);

    expect(db.pipelineRun.findFirst).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({
        pipelineKey: 'market-intelligence',
        scopeRegion: 'IN',
        scopeAssetType: 'STOCK',
        status: { in: ['PENDING', 'RUNNING'] },
      }),
    }));
    expect(db.pipelineRun.findFirst).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({
        status: { in: ['COMPLETED', 'PARTIAL', 'FAILED'] },
      }),
    }));
    expect(db.pipelineStageRun.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        pipelineRun: { pipelineKey: 'market-intelligence' },
        scopeRegion: 'IN',
        scopeAssetType: 'STOCK',
      }),
      take: 25,
    }));
  });
});
