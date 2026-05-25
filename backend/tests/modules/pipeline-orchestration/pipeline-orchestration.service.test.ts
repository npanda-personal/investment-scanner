/// <reference types="@types/jest" />
import { PipelineCommandError, PipelineOrchestrationService } from '../../../src/modules/pipeline-orchestration';

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

  it('returns active and terminal status snapshots grouped by stage', async () => {
    const activeRun = {
      id: 'run-active',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'scheduled',
      status: 'RUNNING',
      idempotencyKey: 'run-active-key',
      dataThroughDate: '2026-05-22T00:00:00.000Z',
      sourceFingerprint: 'nse:active',
      changedInstrumentCount: 5,
      totalCount: 10,
      processedCount: 4,
      succeededCount: 4,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      warnings: [],
      errors: [],
      metadata: null,
      startedAt: '2026-05-25T01:00:00.000Z',
      completedAt: null,
      durationMs: null,
      createdAt: '2026-05-25T01:00:00.000Z',
      updatedAt: '2026-05-25T01:02:00.000Z',
    };
    const terminalRun = { ...activeRun, id: 'run-last', status: 'PARTIAL', completedAt: '2026-05-24T01:05:00.000Z', durationMs: 300000 };
    const repository = {
      upsertRun: jest.fn(),
      completeRun: jest.fn(),
      upsertStage: jest.fn(),
      acquireStageLease: jest.fn(),
      completeStage: jest.fn(),
      recordStageProgress: jest.fn(),
      findActiveRun: jest.fn().mockResolvedValue(activeRun),
      findLastRun: jest.fn().mockResolvedValue(terminalRun),
      latestStages: jest.fn().mockResolvedValue([
        {
          id: 'stage-active',
          pipelineRunId: 'run-active',
          stageKey: 'DATA_QUALITY',
          stageOrder: 2,
          status: 'RUNNING',
          idempotencyKey: 'stage-active-key',
          region: 'IN',
          assetType: 'STOCK',
          timeframe: '1d',
          dataThroughDate: '2026-05-22T00:00:00.000Z',
          inputFingerprint: 'prices:active',
          outputFingerprint: null,
          changedInstrumentCount: 5,
          batchSize: 100,
          offset: 0,
          nextOffset: 50,
          hasMore: true,
          totalCount: 100,
          processedCount: 50,
          succeededCount: 48,
          partialCount: 1,
          failedCount: 1,
          skippedCount: 0,
          unchangedCount: 0,
          attemptCount: 1,
          cacheKey: 'dq:active',
          cacheStatus: 'MISS',
          cacheExpiresAt: null,
          leaseOwner: 'worker-1',
          leaseExpiresAt: '2026-05-25T01:10:00.000Z',
          startedAt: '2026-05-25T01:00:00.000Z',
          completedAt: null,
          durationMs: null,
          warnings: [],
          errors: [],
          metadata: null,
          createdAt: '2026-05-25T01:00:00.000Z',
          updatedAt: '2026-05-25T01:02:00.000Z',
        },
        {
          id: 'stage-last',
          pipelineRunId: 'run-last',
          stageKey: 'DATA_QUALITY',
          stageOrder: 2,
          status: 'PARTIAL',
          idempotencyKey: 'stage-last-key',
          region: 'IN',
          assetType: 'STOCK',
          timeframe: '1d',
          dataThroughDate: '2026-05-21T00:00:00.000Z',
          inputFingerprint: 'prices:last',
          outputFingerprint: 'dq:last',
          changedInstrumentCount: 10,
          batchSize: 100,
          offset: 0,
          nextOffset: null,
          hasMore: false,
          totalCount: 100,
          processedCount: 100,
          succeededCount: 95,
          partialCount: 3,
          failedCount: 2,
          skippedCount: 0,
          unchangedCount: 0,
          attemptCount: 1,
          cacheKey: 'dq:last',
          cacheStatus: 'STALE',
          cacheExpiresAt: null,
          leaseOwner: null,
          leaseExpiresAt: null,
          startedAt: '2026-05-24T01:00:00.000Z',
          completedAt: '2026-05-24T01:05:00.000Z',
          durationMs: 300000,
          warnings: ['partial evidence'],
          errors: ['two failed'],
          metadata: null,
          createdAt: '2026-05-24T01:00:00.000Z',
          updatedAt: '2026-05-24T01:05:00.000Z',
        },
      ]),
    };
    const service = new PipelineOrchestrationService(repository as any);

    const snapshot = await service.status({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      limit: 25,
    }, new Date('2026-05-25T01:03:00.000Z'));

    expect(snapshot).toMatchObject({
      scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
      generatedAt: '2026-05-25T01:03:00.000Z',
      activeRun: { id: 'run-active', status: 'RUNNING', processedCount: 4 },
      lastRun: { id: 'run-last', status: 'PARTIAL', durationMs: 300000 },
      stages: [{
        stageKey: 'DATA_QUALITY',
        stageOrder: 2,
        activeStage: { id: 'stage-active', status: 'RUNNING', processedCount: 50, nextOffset: 50, hasMore: true },
        lastStage: { id: 'stage-last', status: 'PARTIAL', failedCount: 2, cacheStatus: 'STALE' },
      }],
    });
  });

  it('returns a command catalog with only DATA_QUALITY_EVALUATE_SCOPE enabled', () => {
    const service = new PipelineOrchestrationService({} as any, {} as any);
    const catalog = service.commandCatalog({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
    }, new Date('2026-05-25T02:00:00.000Z'));

    const enabled = catalog.commands.filter((item) => item.availability === 'ENABLED');
    expect(enabled.map((item) => item.commandKey)).toEqual(['DATA_QUALITY_EVALUATE_SCOPE']);
    expect(catalog.commands.find((item) => item.commandKey === 'PIPELINE_RUN_ALL')).toMatchObject({
      availability: 'FORBIDDEN',
      disabledReason: expect.any(String),
    });
    expect(catalog.generatedAt).toBe('2026-05-25T02:00:00.000Z');
  });

  it('rejects blocked command execution with 422 without creating ledger rows', async () => {
    const repository = {
      upsertRun: jest.fn(),
      completeRun: jest.fn(),
      upsertStage: jest.fn(),
      acquireStageLease: jest.fn(),
      completeStage: jest.fn(),
      recordStageProgress: jest.fn(),
      latestStages: jest.fn(),
    };
    const service = new PipelineOrchestrationService(repository as any, { evaluate: jest.fn() } as any);

    await expect(service.executeCommand({
      commandKey: 'PIPELINE_RUN_ALL',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 25,
      offset: 0,
      idempotencyKey: '',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' })).rejects.toMatchObject({
      statusCode: 422,
      payload: expect.objectContaining({ status: 'BLOCKED' }),
    });

    expect(repository.upsertRun).not.toHaveBeenCalled();
    expect(repository.upsertStage).not.toHaveBeenCalled();
  });

  it('rejects enabled command without idempotencyKey', async () => {
    const service = new PipelineOrchestrationService({} as any, { evaluate: jest.fn() } as any);
    await expect(service.executeCommand({
      commandKey: 'DATA_QUALITY_EVALUATE_SCOPE',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 25,
      offset: 0,
      idempotencyKey: ' ',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('executes one data quality batch, records completion, and avoids duplicate adapter calls', async () => {
    const createdRun = {
      id: 'run-1',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'manual',
      status: 'RUNNING',
      idempotencyKey: 'run-key',
      dataThroughDate: null,
      sourceFingerprint: null,
      changedInstrumentCount: 0,
      totalCount: 0,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      warnings: [],
      errors: [],
      metadata: null,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: null,
      durationMs: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:00:00.000Z',
    };
    const completedStage = {
      id: 'stage-1',
      pipelineRunId: 'run-1',
      stageKey: 'DATA_QUALITY',
      stageOrder: 2,
      status: 'COMPLETED',
      idempotencyKey: 'stage-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: null,
      inputFingerprint: 'input',
      outputFingerprint: null,
      changedInstrumentCount: 0,
      batchSize: 25,
      offset: 0,
      nextOffset: 25,
      hasMore: true,
      totalCount: 100,
      processedCount: 25,
      succeededCount: 25,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'UNKNOWN',
      cacheExpiresAt: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      startedAt: '2026-05-25T03:00:01.000Z',
      completedAt: '2026-05-25T03:00:04.000Z',
      durationMs: 3000,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:00:04.000Z',
    };
    const terminalStage = { ...completedStage, status: 'COMPLETED' };

    const repository = {
      upsertRun: jest.fn().mockResolvedValue(createdRun),
      completeRun: jest.fn().mockResolvedValue({ ...createdRun, status: 'COMPLETED', completedAt: '2026-05-25T03:00:04.000Z' }),
      upsertStage: jest.fn().mockResolvedValue({ ...completedStage, status: 'PENDING' }),
      acquireStageLease: jest
        .fn()
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_NOT_FOUND', stage: null })
        .mockResolvedValueOnce({
          acquired: true,
          reason: 'ACQUIRED',
          stage: { ...completedStage, status: 'RUNNING', leaseOwner: 'manual-command:DATA_QUALITY_EVALUATE_SCOPE:test', leaseExpiresAt: '2026-05-25T03:10:00.000Z', completedAt: null },
        })
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_TERMINAL', stage: terminalStage }),
      completeStage: jest.fn().mockResolvedValue(completedStage),
      recordStageProgress: jest.fn(),
      latestStages: jest.fn(),
    };
    const evaluate = jest.fn().mockResolvedValue({
      totalCount: 100,
      processedCount: 25,
      evaluatedCount: 25,
      failedCount: 0,
      skippedCount: 0,
      nextOffset: 25,
      hasMore: true,
      warnings: [],
    });
    const service = new PipelineOrchestrationService(repository as any, { evaluate } as any);

    const payload = {
      commandKey: 'DATA_QUALITY_EVALUATE_SCOPE' as const,
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch' as const,
      batchSize: 25,
      offset: 0,
      idempotencyKey: 'manual-1',
      force: false as const,
    };

    const first = await service.executeCommand(payload, { requestedByUserId: 'local-manual-operator' }, new Date('2026-05-25T03:00:00.000Z'));
    const second = await service.executeCommand(payload, { requestedByUserId: 'local-manual-operator' }, new Date('2026-05-25T03:01:00.000Z'));

    expect(first.status).toBe('COMPLETED');
    expect(first.counts.processedCount).toBe(25);
    expect(first.lease.reason).toBe('ACQUIRED');
    expect(second.status).toBe('DUPLICATE_TERMINAL');
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(repository.completeStage).toHaveBeenCalledWith(expect.objectContaining({
      status: 'COMPLETED',
      idempotencyKey: expect.stringContaining('pipeline-ledger-v1:manual-command:DATA_QUALITY_EVALUATE_SCOPE'),
    }));
  });

  it('returns 409 with LEASE_HELD when an active lease already exists', async () => {
    const stage = {
      id: 'stage-lease',
      pipelineRunId: 'run-1',
      stageKey: 'DATA_QUALITY',
      stageOrder: 2,
      status: 'RUNNING',
      idempotencyKey: 'stage-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: null,
      inputFingerprint: null,
      outputFingerprint: null,
      changedInstrumentCount: 0,
      batchSize: 25,
      offset: 0,
      nextOffset: 0,
      hasMore: false,
      totalCount: 0,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'UNKNOWN',
      cacheExpiresAt: null,
      leaseOwner: 'other-worker',
      leaseExpiresAt: '2026-05-25T03:20:00.000Z',
      startedAt: '2026-05-25T03:10:00.000Z',
      completedAt: null,
      durationMs: null,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:10:00.000Z',
      updatedAt: '2026-05-25T03:10:00.000Z',
    };
    const repository = {
      upsertRun: jest.fn(),
      completeRun: jest.fn(),
      upsertStage: jest.fn(),
      acquireStageLease: jest.fn().mockResolvedValue({ acquired: false, reason: 'LEASE_HELD', stage }),
      completeStage: jest.fn(),
      recordStageProgress: jest.fn(),
      latestStages: jest.fn(),
    };
    const service = new PipelineOrchestrationService(repository as any, { evaluate: jest.fn() } as any);

    await expect(service.executeCommand({
      commandKey: 'DATA_QUALITY_EVALUATE_SCOPE',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 25,
      offset: 0,
      idempotencyKey: 'manual-2',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' })).rejects.toBeInstanceOf(PipelineCommandError);

    await expect(service.executeCommand({
      commandKey: 'DATA_QUALITY_EVALUATE_SCOPE',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 25,
      offset: 0,
      idempotencyKey: 'manual-2',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' })).rejects.toMatchObject({
      statusCode: 409,
      payload: expect.objectContaining({ status: 'LEASE_HELD' }),
    });
  });

  it('returns 409 and does not execute adapter when same idempotency stage is already RUNNING for same lease owner family', async () => {
    const runningStage = {
      id: 'stage-running-same-owner',
      pipelineRunId: 'run-1',
      stageKey: 'DATA_QUALITY',
      stageOrder: 2,
      status: 'RUNNING',
      idempotencyKey: 'stage-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: null,
      inputFingerprint: null,
      outputFingerprint: null,
      changedInstrumentCount: 0,
      batchSize: 25,
      offset: 0,
      nextOffset: 0,
      hasMore: false,
      totalCount: 100,
      processedCount: 10,
      succeededCount: 10,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      attemptCount: 2,
      cacheKey: null,
      cacheStatus: 'UNKNOWN',
      cacheExpiresAt: null,
      leaseOwner: 'manual-command:DATA_QUALITY_EVALUATE_SCOPE:test',
      leaseExpiresAt: '2026-05-25T03:25:00.000Z',
      startedAt: '2026-05-25T03:10:00.000Z',
      completedAt: null,
      durationMs: null,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:10:00.000Z',
      updatedAt: '2026-05-25T03:10:00.000Z',
    };
    const repository = {
      upsertRun: jest.fn(),
      completeRun: jest.fn(),
      upsertStage: jest.fn(),
      acquireStageLease: jest.fn().mockImplementation((input: { leaseOwner: string }) => {
        return Promise.resolve({
          acquired: true,
          reason: 'ACQUIRED',
          stage: {
            ...runningStage,
            leaseOwner: input.leaseOwner,
          },
        });
      }),
      completeStage: jest.fn(),
      recordStageProgress: jest.fn(),
      latestStages: jest.fn(),
    };
    const evaluate = jest.fn().mockResolvedValue({
      totalCount: 100,
      processedCount: 25,
      evaluatedCount: 25,
      failedCount: 0,
      skippedCount: 0,
      nextOffset: 25,
      hasMore: true,
      warnings: [],
    });
    const service = new PipelineOrchestrationService(repository as any, { evaluate } as any);

    await expect(service.executeCommand({
      commandKey: 'DATA_QUALITY_EVALUATE_SCOPE',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 25,
      offset: 0,
      idempotencyKey: 'manual-running-dup',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' })).rejects.toMatchObject({
      statusCode: 409,
      payload: expect.objectContaining({ status: 'LEASE_HELD' }),
    });

    expect(evaluate).not.toHaveBeenCalled();
    expect(repository.completeStage).not.toHaveBeenCalled();
    expect(repository.completeRun).not.toHaveBeenCalled();
  });

  it('records FAILED terminal status and clears lease when adapter throws', async () => {
    const runningStage = {
      id: 'stage-err',
      pipelineRunId: 'run-err',
      stageKey: 'DATA_QUALITY',
      stageOrder: 2,
      status: 'RUNNING',
      idempotencyKey: 'stage-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: null,
      inputFingerprint: null,
      outputFingerprint: null,
      changedInstrumentCount: 0,
      batchSize: 25,
      offset: 0,
      nextOffset: null,
      hasMore: false,
      totalCount: 0,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'UNKNOWN',
      cacheExpiresAt: null,
      leaseOwner: 'manual-command:DATA_QUALITY_EVALUATE_SCOPE:test',
      leaseExpiresAt: '2026-05-25T03:40:00.000Z',
      startedAt: '2026-05-25T03:30:00.000Z',
      completedAt: null,
      durationMs: null,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:30:00.000Z',
      updatedAt: '2026-05-25T03:30:00.000Z',
    };
    const failedStage = {
      ...runningStage,
      status: 'FAILED',
      leaseOwner: null,
      leaseExpiresAt: null,
      completedAt: '2026-05-25T03:30:05.000Z',
      failedCount: 1,
      errors: ['dq failed'],
    };
    const repository = {
      upsertRun: jest.fn().mockResolvedValue({
        id: 'run-err',
        pipelineKey: 'market-intelligence',
        region: 'IN',
        assetType: 'STOCK',
        timeframe: '1d',
        triggerType: 'manual',
        status: 'RUNNING',
        idempotencyKey: 'run-id',
        dataThroughDate: null,
        sourceFingerprint: null,
        changedInstrumentCount: 0,
        totalCount: 0,
        processedCount: 0,
        succeededCount: 0,
        partialCount: 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        warnings: [],
        errors: [],
        metadata: null,
        startedAt: '2026-05-25T03:30:00.000Z',
        completedAt: null,
        durationMs: null,
        createdAt: '2026-05-25T03:30:00.000Z',
        updatedAt: '2026-05-25T03:30:00.000Z',
      }),
      completeRun: jest.fn().mockResolvedValue({}),
      upsertStage: jest.fn().mockResolvedValue({ ...runningStage, status: 'PENDING' }),
      acquireStageLease: jest
        .fn()
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_NOT_FOUND', stage: null })
        .mockResolvedValueOnce({ acquired: true, reason: 'ACQUIRED', stage: runningStage }),
      completeStage: jest.fn().mockResolvedValue(failedStage),
      recordStageProgress: jest.fn(),
      latestStages: jest.fn(),
    };
    const evaluate = jest.fn().mockRejectedValue(new Error('dq failed'));
    const service = new PipelineOrchestrationService(repository as any, { evaluate } as any);

    const result = await service.executeCommand({
      commandKey: 'DATA_QUALITY_EVALUATE_SCOPE',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 25,
      offset: 0,
      idempotencyKey: 'manual-err',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' }, new Date('2026-05-25T03:30:00.000Z'));

    expect(result.status).toBe('FAILED');
    expect(result.errors).toContain('dq failed');
    expect(repository.completeStage).toHaveBeenCalledWith(expect.objectContaining({
      status: 'FAILED',
      errors: expect.arrayContaining(['dq failed']),
    }));
  });

  it('runs scheduled data quality stage with ledger row creation, lease acquisition, and terminal counts', async () => {
    const run = {
      id: 'run-scheduled-1',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'scheduled',
      status: 'RUNNING',
      idempotencyKey: 'run-key',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      sourceFingerprint: 'md-source',
      changedInstrumentCount: 2,
      totalCount: 2,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      warnings: [],
      errors: [],
      metadata: null,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: null,
      durationMs: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:00:00.000Z',
    };
    const leasedStage = {
      id: 'stage-scheduled-1',
      pipelineRunId: 'run-scheduled-1',
      stageKey: 'DATA_QUALITY',
      stageOrder: 2,
      status: 'RUNNING',
      idempotencyKey: 'stage-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      inputFingerprint: 'input',
      outputFingerprint: null,
      changedInstrumentCount: 2,
      batchSize: 2,
      offset: 0,
      nextOffset: 0,
      hasMore: false,
      totalCount: 2,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'UNKNOWN',
      cacheExpiresAt: null,
      leaseOwner: 'scheduled-dq:test',
      leaseExpiresAt: '2026-05-25T03:10:00.000Z',
      startedAt: '2026-05-25T03:00:01.000Z',
      completedAt: null,
      durationMs: null,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:00:01.000Z',
    };
    const completedStage = {
      ...leasedStage,
      status: 'COMPLETED',
      processedCount: 2,
      succeededCount: 2,
      nextOffset: null,
      completedAt: '2026-05-25T03:00:03.000Z',
      durationMs: 2000,
      leaseOwner: null,
      leaseExpiresAt: null,
      outputFingerprint: 'output',
    };
    const rawRun = {
      ...run,
      id: 'run-raw-signals',
      status: 'RUNNING',
      idempotencyKey: 'run-raw-key',
      sourceFingerprint: 'output',
    };
    const rawLeasedStage = {
      ...leasedStage,
      id: 'stage-raw-signals',
      pipelineRunId: 'run-raw-signals',
      stageKey: 'RAW_SIGNALS',
      stageOrder: 3,
      idempotencyKey: 'stage-raw-key',
      inputFingerprint: 'raw-input',
      leaseOwner: 'scheduled-raw-signals:test',
    };
    const completedRawStage = {
      ...rawLeasedStage,
      status: 'COMPLETED',
      processedCount: 2,
      succeededCount: 2,
      unchangedCount: 1,
      nextOffset: null,
      completedAt: '2026-05-25T03:00:04.000Z',
      durationMs: 1000,
      leaseOwner: null,
      leaseExpiresAt: null,
      outputFingerprint: 'raw-output',
    };
    const calibrationRun = {
      ...rawRun,
      id: 'run-calibration',
      status: 'RUNNING',
      idempotencyKey: 'run-calibration-key',
    };
    const calibrationLeasedStage = {
      ...rawLeasedStage,
      id: 'stage-calibration',
      pipelineRunId: 'run-calibration',
      stageKey: 'SIGNAL_CALIBRATION',
      stageOrder: 4,
      idempotencyKey: 'stage-calibration-key',
      inputFingerprint: 'calibration-input',
      leaseOwner: 'scheduled-signal-calibration:test',
    };
    const completedCalibrationStage = {
      ...calibrationLeasedStage,
      status: 'COMPLETED',
      processedCount: 2,
      succeededCount: 2,
      unchangedCount: 1,
      nextOffset: null,
      completedAt: '2026-05-25T03:00:05.000Z',
      durationMs: 1000,
      leaseOwner: null,
      leaseExpiresAt: null,
      outputFingerprint: 'calibration-output',
    };
    const repository = {
      upsertRun: jest.fn()
        .mockResolvedValueOnce(run)
        .mockResolvedValueOnce(rawRun)
        .mockResolvedValueOnce(calibrationRun),
      completeRun: jest.fn()
        .mockResolvedValueOnce({ ...run, status: 'COMPLETED' })
        .mockResolvedValueOnce({ ...rawRun, status: 'COMPLETED' })
        .mockResolvedValueOnce({ ...calibrationRun, status: 'COMPLETED' }),
      upsertStage: jest.fn()
        .mockResolvedValueOnce({ ...leasedStage, status: 'PENDING' })
        .mockResolvedValueOnce({ ...rawLeasedStage, status: 'PENDING' })
        .mockResolvedValueOnce({ ...calibrationLeasedStage, status: 'PENDING' }),
      acquireStageLease: jest.fn()
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_NOT_FOUND', stage: null })
        .mockResolvedValueOnce({ acquired: true, reason: 'ACQUIRED', stage: leasedStage })
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_NOT_FOUND', stage: null })
        .mockResolvedValueOnce({ acquired: true, reason: 'ACQUIRED', stage: rawLeasedStage })
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_NOT_FOUND', stage: null })
        .mockResolvedValueOnce({ acquired: true, reason: 'ACQUIRED', stage: calibrationLeasedStage }),
      completeStage: jest.fn()
        .mockResolvedValueOnce(completedStage)
        .mockResolvedValueOnce(completedRawStage)
        .mockResolvedValueOnce(completedCalibrationStage),
      recordStageProgress: jest.fn()
        .mockResolvedValueOnce(leasedStage)
        .mockResolvedValueOnce(rawLeasedStage)
        .mockResolvedValueOnce(calibrationLeasedStage),
      latestStages: jest.fn(),
    };
    const evaluateScheduledStage = jest.fn().mockResolvedValue({
      processedCount: 2,
      totalCount: 2,
      evaluatedCount: 2,
      failedCount: 0,
      skippedCount: 0,
      warnings: [],
      durationMs: 100,
    });
    const signalRun = jest.fn().mockResolvedValue({
      generated: 1,
      skipped: 0,
      errors: [],
      warnings: [],
      processedCount: 2,
      totalCount: 2,
      generatedCount: 1,
      updatedCount: 0,
      noOpCount: 1,
      skippedCount: 0,
      failedCount: 0,
      dataQuality: {
        excludedByDataQuality: 0,
        missingQualityEvaluationCount: 0,
      },
    });
    const signalCalibrationRun = jest.fn().mockResolvedValue({
      generated: 2,
      skipped: 0,
      errors: [],
      warnings: [],
      results: [{ instrumentId: 'stock-1' }, { instrumentId: 'stock-2' }],
      processedCount: 2,
      totalCount: 2,
      batchSize: 2,
      offset: 0,
      nextOffset: null,
      hasMore: false,
      selectedHorizon: '20D',
      calibratedCount: 1,
      passthroughCount: 1,
      skippedCount: 0,
      failedCount: 0,
      outOfScopeSkipped: 0,
      calibrationEvidence: { evidenceStatus: 'SUFFICIENT' },
      calibrationReadiness: { status: 'USABLE' },
    });
    const service = new PipelineOrchestrationService(repository as any, {
      evaluateScheduledStage,
      evaluate: jest.fn(),
    } as any, { run: signalRun } as any, { run: signalCalibrationRun } as any);

    const response = await service.runScheduledDataQualityStage({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      sourceFingerprint: 'md-source',
      changedInstrumentIds: ['stock-2', 'stock-1'],
      batchSize: 25,
      schedulerRunStartedAt: '2026-05-25T03:00:00.000Z',
    }, new Date('2026-05-25T03:00:00.000Z'));

    expect(response.status).toBe('COMPLETED');
    expect(response.stageKey).toBe('DATA_QUALITY');
    expect(response.downstreamRawSignals?.status).toBe('COMPLETED');
    expect(response.downstreamRawSignals?.stageKey).toBe('RAW_SIGNALS');
    expect(response.downstreamRawSignals?.downstreamSignalCalibration?.status).toBe('COMPLETED');
    expect(response.downstreamRawSignals?.downstreamSignalCalibration?.stageKey).toBe('SIGNAL_CALIBRATION');
    expect(response.batch.totalInstrumentCount).toBe(2);
    expect(response.counts.processedCount).toBe(2);
    expect(evaluateScheduledStage).toHaveBeenCalledWith({
      instrumentIds: ['stock-1', 'stock-2'],
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 2,
    });
    expect(signalRun).toHaveBeenCalledWith(expect.objectContaining({
      instrumentIds: ['stock-1', 'stock-2'],
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 2,
      offset: 0,
      requestedByUserId: 'system',
      useDataQualityFilter: true,
      missingQualityBehavior: 'SKIP',
      skipUnusable: true,
      includeLimited: false,
      researchContextMode: 'LIGHTWEIGHT',
      providerThrottleMs: 0,
    }));
    expect(signalCalibrationRun).toHaveBeenCalledWith(expect.objectContaining({
      instrumentIds: ['stock-1', 'stock-2'],
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 2,
      offset: 0,
    }));
    expect(repository.upsertRun).toHaveBeenCalledTimes(3);
    expect(repository.upsertStage).toHaveBeenCalledTimes(3);
    expect(repository.upsertStage).toHaveBeenNthCalledWith(3, expect.objectContaining({
      stageKey: 'SIGNAL_CALIBRATION',
      stageOrder: 4,
    }));
    expect(repository.recordStageProgress).toHaveBeenCalledTimes(3);
    expect(repository.completeStage).toHaveBeenCalledWith(expect.objectContaining({
      status: 'COMPLETED',
      processedCount: 2,
      succeededCount: 2,
    }));
    expect(repository.completeRun).toHaveBeenCalledWith(expect.objectContaining({
      status: 'COMPLETED',
      processedCount: 2,
      succeededCount: 2,
    }));
  });

  it('does not fan out raw signals when scheduled Data Quality is partial', async () => {
    const run = {
      id: 'run-dq-partial',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'scheduled',
      status: 'RUNNING',
      idempotencyKey: 'run-dq-partial-key',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      sourceFingerprint: 'md-source',
      changedInstrumentCount: 2,
      totalCount: 2,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      warnings: [],
      errors: [],
      metadata: null,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: null,
      durationMs: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:00:00.000Z',
    };
    const leasedStage = {
      id: 'stage-dq-partial',
      pipelineRunId: 'run-dq-partial',
      stageKey: 'DATA_QUALITY',
      stageOrder: 2,
      status: 'RUNNING',
      idempotencyKey: 'stage-dq-partial-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      inputFingerprint: 'input',
      outputFingerprint: null,
      changedInstrumentCount: 2,
      batchSize: 2,
      offset: 0,
      nextOffset: 0,
      hasMore: false,
      totalCount: 2,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'UNKNOWN',
      cacheExpiresAt: null,
      leaseOwner: 'scheduled-dq:test',
      leaseExpiresAt: '2026-05-25T03:10:00.000Z',
      startedAt: '2026-05-25T03:00:01.000Z',
      completedAt: null,
      durationMs: null,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:00:01.000Z',
    };
    const completedStage = {
      ...leasedStage,
      status: 'PARTIAL',
      processedCount: 2,
      succeededCount: 1,
      partialCount: 1,
      skippedCount: 1,
      nextOffset: null,
      completedAt: '2026-05-25T03:00:03.000Z',
      durationMs: 2000,
      leaseOwner: null,
      leaseExpiresAt: null,
      outputFingerprint: 'dq-partial-output',
    };
    const repository = {
      upsertRun: jest.fn().mockResolvedValue(run),
      completeRun: jest.fn().mockResolvedValue({ ...run, status: 'PARTIAL' }),
      upsertStage: jest.fn().mockResolvedValue({ ...leasedStage, status: 'PENDING' }),
      acquireStageLease: jest.fn()
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_NOT_FOUND', stage: null })
        .mockResolvedValueOnce({ acquired: true, reason: 'ACQUIRED', stage: leasedStage }),
      completeStage: jest.fn().mockResolvedValue(completedStage),
      recordStageProgress: jest.fn().mockResolvedValue(leasedStage),
      latestStages: jest.fn(),
    };
    const signalRun = jest.fn();
    const service = new PipelineOrchestrationService(repository as any, {
      evaluateScheduledStage: jest.fn().mockResolvedValue({
        processedCount: 2,
        totalCount: 2,
        evaluatedCount: 1,
        failedCount: 0,
        skippedCount: 1,
        warnings: ['stock-2 skipped'],
        durationMs: 100,
      }),
      evaluate: jest.fn(),
    } as any, { run: signalRun } as any);

    const response = await service.runScheduledDataQualityStage({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      sourceFingerprint: 'md-source',
      changedInstrumentIds: ['stock-1', 'stock-2'],
      batchSize: 25,
      schedulerRunStartedAt: '2026-05-25T03:00:00.000Z',
    }, new Date('2026-05-25T03:00:00.000Z'));

    expect(response.status).toBe('PARTIAL');
    expect(response.downstreamRawSignals).toBeUndefined();
    expect(signalRun).not.toHaveBeenCalled();
    expect(repository.upsertRun).toHaveBeenCalledTimes(1);
    expect(repository.upsertStage).toHaveBeenCalledTimes(1);
  });

  it('does not fan out calibration when scheduled Raw Signals is skipped', async () => {
    const rawRun = {
      id: 'run-raw-skipped',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'scheduled',
      status: 'RUNNING',
      idempotencyKey: 'run-raw-skipped-key',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      sourceFingerprint: 'dq-output',
      changedInstrumentCount: 2,
      totalCount: 2,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      warnings: [],
      errors: [],
      metadata: null,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: null,
      durationMs: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:00:00.000Z',
    };
    const rawStage = {
      id: 'stage-raw-skipped',
      pipelineRunId: 'run-raw-skipped',
      stageKey: 'RAW_SIGNALS',
      stageOrder: 3,
      status: 'RUNNING',
      idempotencyKey: 'stage-raw-skipped-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      inputFingerprint: 'raw-input',
      outputFingerprint: null,
      changedInstrumentCount: 2,
      batchSize: 2,
      offset: 0,
      nextOffset: 0,
      hasMore: false,
      totalCount: 2,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'UNKNOWN',
      cacheExpiresAt: null,
      leaseOwner: 'scheduled-raw-signals:test',
      leaseExpiresAt: '2026-05-25T03:10:00.000Z',
      startedAt: '2026-05-25T03:00:01.000Z',
      completedAt: null,
      durationMs: null,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:00:01.000Z',
    };
    const completedRawStage = {
      ...rawStage,
      status: 'SKIPPED',
      processedCount: 2,
      skippedCount: 2,
      nextOffset: null,
      completedAt: '2026-05-25T03:00:02.000Z',
      durationMs: 1000,
      leaseOwner: null,
      leaseExpiresAt: null,
      outputFingerprint: 'raw-skipped-output',
      warnings: ['No DQ-ready instruments.'],
    };
    const repository = {
      upsertRun: jest.fn().mockResolvedValue(rawRun),
      completeRun: jest.fn().mockResolvedValue({ ...rawRun, status: 'SKIPPED' }),
      upsertStage: jest.fn().mockResolvedValue({ ...rawStage, status: 'PENDING' }),
      acquireStageLease: jest.fn()
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_NOT_FOUND', stage: null })
        .mockResolvedValueOnce({ acquired: true, reason: 'ACQUIRED', stage: rawStage }),
      completeStage: jest.fn().mockResolvedValue(completedRawStage),
      recordStageProgress: jest.fn().mockResolvedValue(rawStage),
      latestStages: jest.fn(),
    };
    const signalRun = jest.fn().mockResolvedValue({
      generated: 0,
      skipped: 2,
      errors: [],
      warnings: ['No DQ-ready instruments.'],
      processedCount: 2,
      totalCount: 2,
      generatedCount: 0,
      updatedCount: 0,
      noOpCount: 0,
      skippedCount: 2,
      failedCount: 0,
      dataQuality: {
        excludedByDataQuality: 2,
        missingQualityEvaluationCount: 0,
      },
    });
    const calibrationRun = jest.fn();
    const service = new PipelineOrchestrationService(repository as any, {} as any, { run: signalRun } as any, { run: calibrationRun } as any);

    const response = await service.runScheduledRawSignalsStage({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      sourceFingerprint: 'dq-output',
      changedInstrumentIds: ['stock-1', 'stock-2'],
      batchSize: 25,
      schedulerRunStartedAt: '2026-05-25T03:00:00.000Z',
      upstreamStageRunId: 'stage-dq',
    }, new Date('2026-05-25T03:00:00.000Z'));

    expect(response.status).toBe('SKIPPED');
    expect(response.downstreamSignalCalibration).toBeUndefined();
    expect(calibrationRun).not.toHaveBeenCalled();
  });

  it('fans out calibration when scheduled Raw Signals is partial with successful persisted output', async () => {
    const rawRun = {
      id: 'run-raw-partial',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'scheduled',
      status: 'RUNNING',
      idempotencyKey: 'run-raw-partial-key',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      sourceFingerprint: 'dq-output',
      changedInstrumentCount: 2,
      totalCount: 2,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      warnings: [],
      errors: [],
      metadata: null,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: null,
      durationMs: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:00:00.000Z',
    };
    const rawStage = {
      id: 'stage-raw-partial',
      pipelineRunId: 'run-raw-partial',
      stageKey: 'RAW_SIGNALS',
      stageOrder: 3,
      status: 'RUNNING',
      idempotencyKey: 'stage-raw-partial-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      inputFingerprint: 'raw-input',
      outputFingerprint: null,
      changedInstrumentCount: 2,
      batchSize: 2,
      offset: 0,
      nextOffset: 0,
      hasMore: false,
      totalCount: 2,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'UNKNOWN',
      cacheExpiresAt: null,
      leaseOwner: 'scheduled-raw-signals:test',
      leaseExpiresAt: '2026-05-25T03:10:00.000Z',
      startedAt: '2026-05-25T03:00:01.000Z',
      completedAt: null,
      durationMs: null,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:00:01.000Z',
    };
    const calibrationRun = {
      ...rawRun,
      id: 'run-calibration-after-partial',
      idempotencyKey: 'run-calibration-after-partial-key',
    };
    const calibrationStage = {
      ...rawStage,
      id: 'stage-calibration-after-partial',
      pipelineRunId: 'run-calibration-after-partial',
      stageKey: 'SIGNAL_CALIBRATION',
      stageOrder: 4,
      idempotencyKey: 'stage-calibration-after-partial-key',
      leaseOwner: 'scheduled-signal-calibration:test',
    };
    const completedRawStage = {
      ...rawStage,
      status: 'PARTIAL',
      processedCount: 2,
      succeededCount: 1,
      partialCount: 1,
      skippedCount: 1,
      nextOffset: null,
      completedAt: '2026-05-25T03:00:02.000Z',
      durationMs: 1000,
      leaseOwner: null,
      leaseExpiresAt: null,
      outputFingerprint: 'raw-partial-output',
      warnings: ['stock-2 skipped by data quality.'],
    };
    const completedCalibrationStage = {
      ...calibrationStage,
      status: 'PARTIAL',
      processedCount: 1,
      succeededCount: 1,
      partialCount: 1,
      skippedCount: 1,
      nextOffset: null,
      completedAt: '2026-05-25T03:00:03.000Z',
      durationMs: 1000,
      leaseOwner: null,
      leaseExpiresAt: null,
      outputFingerprint: 'calibration-partial-output',
      warnings: [],
    };
    const repository = {
      upsertRun: jest.fn()
        .mockResolvedValueOnce(rawRun)
        .mockResolvedValueOnce(calibrationRun),
      completeRun: jest.fn()
        .mockResolvedValueOnce({ ...rawRun, status: 'PARTIAL' })
        .mockResolvedValueOnce({ ...calibrationRun, status: 'PARTIAL' }),
      upsertStage: jest.fn()
        .mockResolvedValueOnce({ ...rawStage, status: 'PENDING' })
        .mockResolvedValueOnce({ ...calibrationStage, status: 'PENDING' }),
      acquireStageLease: jest.fn()
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_NOT_FOUND', stage: null })
        .mockResolvedValueOnce({ acquired: true, reason: 'ACQUIRED', stage: rawStage })
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_NOT_FOUND', stage: null })
        .mockResolvedValueOnce({ acquired: true, reason: 'ACQUIRED', stage: calibrationStage }),
      completeStage: jest.fn()
        .mockResolvedValueOnce(completedRawStage)
        .mockResolvedValueOnce(completedCalibrationStage),
      recordStageProgress: jest.fn()
        .mockResolvedValueOnce(rawStage)
        .mockResolvedValueOnce(calibrationStage),
      latestStages: jest.fn(),
    };
    const signalRun = jest.fn().mockResolvedValue({
      generated: 1,
      skipped: 1,
      errors: [],
      warnings: ['stock-2 skipped by data quality.'],
      processedCount: 2,
      totalCount: 2,
      generatedCount: 1,
      updatedCount: 0,
      noOpCount: 0,
      skippedCount: 1,
      failedCount: 0,
      dataQuality: {
        excludedByDataQuality: 1,
        missingQualityEvaluationCount: 0,
      },
    });
    const calibrationAdapterRun = jest.fn().mockResolvedValue({
      generated: 1,
      skipped: 0,
      errors: [],
      warnings: [],
      results: [{ instrumentId: 'stock-1' }],
      processedCount: 1,
      totalCount: 2,
      batchSize: 2,
      offset: 0,
      nextOffset: null,
      hasMore: false,
      selectedHorizon: '20D',
      calibratedCount: 1,
      passthroughCount: 0,
      skippedCount: 0,
      failedCount: 0,
      outOfScopeSkipped: 0,
      calibrationEvidence: { evidenceStatus: 'SUFFICIENT' },
      calibrationReadiness: { status: 'USABLE' },
    });
    const service = new PipelineOrchestrationService(repository as any, {} as any, { run: signalRun } as any, { run: calibrationAdapterRun } as any);

    const response = await service.runScheduledRawSignalsStage({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      sourceFingerprint: 'dq-output',
      changedInstrumentIds: ['stock-1', 'stock-2'],
      batchSize: 25,
      schedulerRunStartedAt: '2026-05-25T03:00:00.000Z',
      upstreamStageRunId: 'stage-dq',
    }, new Date('2026-05-25T03:00:00.000Z'));

    expect(response.status).toBe('PARTIAL');
    expect(response.downstreamSignalCalibration?.stageKey).toBe('SIGNAL_CALIBRATION');
    expect(response.downstreamSignalCalibration?.status).toBe('PARTIAL');
    expect(calibrationAdapterRun).toHaveBeenCalledWith(expect.objectContaining({
      instrumentIds: ['stock-1', 'stock-2'],
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 2,
      offset: 0,
    }));
    expect(repository.upsertRun).toHaveBeenCalledTimes(2);
    expect(repository.upsertStage).toHaveBeenNthCalledWith(2, expect.objectContaining({
      stageKey: 'SIGNAL_CALIBRATION',
      stageOrder: 4,
    }));
  });

  it('returns skipped scheduled Signal Calibration without ledger mutation for an empty changed set', async () => {
    const repository = {
      upsertRun: jest.fn(),
      completeRun: jest.fn(),
      upsertStage: jest.fn(),
      acquireStageLease: jest.fn(),
      completeStage: jest.fn(),
      recordStageProgress: jest.fn(),
      latestStages: jest.fn(),
    };
    const calibrationRun = jest.fn();
    const service = new PipelineOrchestrationService(repository as any, {} as any, {} as any, { run: calibrationRun } as any);

    const response = await service.runScheduledSignalCalibrationStage({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      sourceFingerprint: 'raw-output',
      changedInstrumentIds: [],
      batchSize: 25,
      schedulerRunStartedAt: '2026-05-25T03:00:00.000Z',
      upstreamStageRunId: 'stage-raw',
    });

    expect(response.status).toBe('SKIPPED');
    expect(response.stageKey).toBe('SIGNAL_CALIBRATION');
    expect(repository.upsertRun).not.toHaveBeenCalled();
    expect(repository.upsertStage).not.toHaveBeenCalled();
    expect(repository.acquireStageLease).not.toHaveBeenCalled();
    expect(calibrationRun).not.toHaveBeenCalled();
  });

  it('returns scheduled Signal Calibration duplicate terminal without adapter execution', async () => {
    const terminalStage = {
      id: 'stage-calibration-terminal',
      pipelineRunId: 'run-calibration-terminal',
      stageKey: 'SIGNAL_CALIBRATION',
      stageOrder: 4,
      status: 'COMPLETED',
      idempotencyKey: 'stage-calibration-terminal-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      inputFingerprint: 'calibration-input',
      outputFingerprint: 'calibration-output',
      changedInstrumentCount: 2,
      batchSize: 2,
      offset: 0,
      nextOffset: null,
      hasMore: false,
      totalCount: 2,
      processedCount: 2,
      succeededCount: 2,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 1,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'UNKNOWN',
      cacheExpiresAt: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: '2026-05-25T03:00:04.000Z',
      durationMs: 1000,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:00:04.000Z',
    };
    const repository = {
      upsertRun: jest.fn(),
      completeRun: jest.fn(),
      upsertStage: jest.fn(),
      acquireStageLease: jest.fn().mockResolvedValue({
        acquired: false,
        reason: 'STAGE_TERMINAL',
        stage: terminalStage,
      }),
      completeStage: jest.fn(),
      recordStageProgress: jest.fn(),
      latestStages: jest.fn(),
    };
    const calibrationRun = jest.fn();
    const service = new PipelineOrchestrationService(repository as any, {} as any, {} as any, { run: calibrationRun } as any);

    const response = await service.runScheduledSignalCalibrationStage({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      sourceFingerprint: 'raw-output',
      changedInstrumentIds: ['stock-1', 'stock-2'],
      batchSize: 25,
      schedulerRunStartedAt: '2026-05-25T03:00:00.000Z',
      upstreamStageRunId: 'stage-raw',
    }, new Date('2026-05-25T03:00:00.000Z'));

    expect(response.status).toBe('DUPLICATE_TERMINAL');
    expect(response.stageRunId).toBe('stage-calibration-terminal');
    expect(repository.upsertRun).not.toHaveBeenCalled();
    expect(repository.upsertStage).not.toHaveBeenCalled();
    expect(calibrationRun).not.toHaveBeenCalled();
  });

  it('runs scheduled Market Context stage and fans out to Smart Money', async () => {
    const run = {
      id: 'run-market-context',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'scheduled',
      status: 'RUNNING',
      idempotencyKey: 'run-market-context-key',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      sourceFingerprint: 'calibration-output',
      changedInstrumentCount: 2,
      totalCount: 2,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      warnings: [],
      errors: [],
      metadata: null,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: null,
      durationMs: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:00:00.000Z',
    };
    const leasedStage = {
      id: 'stage-market-context',
      pipelineRunId: 'run-market-context',
      stageKey: 'MARKET_CONTEXT',
      stageOrder: 6,
      status: 'RUNNING',
      idempotencyKey: 'stage-market-context-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      inputFingerprint: 'market-context-input',
      outputFingerprint: null,
      changedInstrumentCount: 2,
      batchSize: 2,
      offset: 0,
      nextOffset: 0,
      hasMore: false,
      totalCount: 2,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'UNKNOWN',
      cacheExpiresAt: null,
      leaseOwner: 'scheduled-market-context:test',
      leaseExpiresAt: '2026-05-25T03:10:00.000Z',
      startedAt: '2026-05-25T03:00:01.000Z',
      completedAt: null,
      durationMs: null,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:00:01.000Z',
    };
    const completedStage = {
      ...leasedStage,
      status: 'COMPLETED',
      totalCount: 1,
      processedCount: 1,
      succeededCount: 1,
      nextOffset: null,
      completedAt: '2026-05-25T03:00:04.000Z',
      durationMs: 1000,
      leaseOwner: null,
      leaseExpiresAt: null,
      outputFingerprint: 'market-context-output',
    };
    const repository = {
      upsertRun: jest.fn().mockResolvedValue(run),
      completeRun: jest.fn().mockResolvedValue({ ...run, status: 'COMPLETED' }),
      upsertStage: jest.fn().mockResolvedValue({ ...leasedStage, status: 'PENDING' }),
      acquireStageLease: jest.fn()
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_NOT_FOUND', stage: null })
        .mockResolvedValueOnce({ acquired: true, reason: 'ACQUIRED', stage: leasedStage }),
      completeStage: jest.fn().mockResolvedValue(completedStage),
      recordStageProgress: jest.fn().mockResolvedValue(leasedStage),
      latestStages: jest.fn(),
    };
    const marketRun = jest.fn().mockResolvedValue({ status: 'success' });
    const service = new PipelineOrchestrationService(
      repository as any,
      {} as any,
      {} as any,
      {} as any,
      { run: marketRun } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    const downstream = {
      status: 'COMPLETED',
      pipelineRunId: 'run-smart-money',
      stageRunId: 'stage-smart-money',
      stageKey: 'SMART_MONEY',
      scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      inputFingerprint: 'smart-money-input',
      outputFingerprint: 'smart-money-output',
      batch: { totalInstrumentCount: 2, processedCount: 2, batchSize: 2, nextOffset: null, hasMore: false },
      counts: { totalCount: 2, processedCount: 2, succeededCount: 2, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0 },
      warnings: [],
      errors: [],
      startedAt: '2026-05-25T03:00:04.000Z',
      completedAt: '2026-05-25T03:00:05.000Z',
    } as any;
    const smartMoneySpy = jest.spyOn(service, 'runScheduledSmartMoneyStage').mockResolvedValue(downstream);

    const response = await service.runScheduledMarketContextStage({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      sourceFingerprint: 'calibration-output',
      changedInstrumentIds: ['stock-2', 'stock-1'],
      batchSize: 25,
      schedulerRunStartedAt: '2026-05-25T03:00:00.000Z',
      upstreamStageRunId: 'stage-calibration',
    }, new Date('2026-05-25T03:00:00.000Z'));

    expect(response.status).toBe('COMPLETED');
    expect(response.stageKey).toBe('MARKET_CONTEXT');
    expect(response.downstream?.stageKey).toBe('SMART_MONEY');
    expect(marketRun).toHaveBeenCalledWith('IN');
    expect(smartMoneySpy).toHaveBeenCalledWith(expect.objectContaining({
      sourceFingerprint: 'market-context-output',
      changedInstrumentIds: ['stock-2', 'stock-1'],
      upstreamStageRunId: 'stage-market-context',
    }));
    expect(repository.upsertStage).toHaveBeenCalledWith(expect.objectContaining({
      stageKey: 'MARKET_CONTEXT',
      stageOrder: 6,
    }));
  });

  it('returns scheduled duplicate terminal without executing adapter', async () => {
    const terminalStage = {
      id: 'stage-terminal',
      pipelineRunId: 'run-terminal',
      stageKey: 'DATA_QUALITY',
      stageOrder: 2,
      status: 'COMPLETED',
      idempotencyKey: 'stage-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      inputFingerprint: 'input',
      outputFingerprint: 'output',
      changedInstrumentCount: 1,
      batchSize: 1,
      offset: 0,
      nextOffset: null,
      hasMore: false,
      totalCount: 1,
      processedCount: 1,
      succeededCount: 1,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'UNKNOWN',
      cacheExpiresAt: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      startedAt: '2026-05-25T03:00:01.000Z',
      completedAt: '2026-05-25T03:00:03.000Z',
      durationMs: 2000,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:00:03.000Z',
    };
    const repository = {
      upsertRun: jest.fn(),
      completeRun: jest.fn(),
      upsertStage: jest.fn(),
      acquireStageLease: jest.fn().mockResolvedValue({ acquired: false, reason: 'STAGE_TERMINAL', stage: terminalStage }),
      completeStage: jest.fn(),
      recordStageProgress: jest.fn(),
      latestStages: jest.fn(),
    };
    const evaluateScheduledStage = jest.fn();
    const service = new PipelineOrchestrationService(repository as any, { evaluateScheduledStage } as any);

    const response = await service.runScheduledDataQualityStage({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      sourceFingerprint: 'md-source',
      changedInstrumentIds: ['stock-1'],
      batchSize: 25,
      schedulerRunStartedAt: '2026-05-25T03:00:00.000Z',
    });

    expect(response.status).toBe('DUPLICATE_TERMINAL');
    expect(evaluateScheduledStage).not.toHaveBeenCalled();
    expect(repository.upsertRun).not.toHaveBeenCalled();
    expect(repository.upsertStage).not.toHaveBeenCalled();
  });

  it('returns scheduled lease-held result without executing adapter', async () => {
    const leasedStage = {
      id: 'stage-lease-held',
      pipelineRunId: 'run-lease',
      stageKey: 'DATA_QUALITY',
      stageOrder: 2,
      status: 'RUNNING',
      idempotencyKey: 'stage-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      inputFingerprint: 'input',
      outputFingerprint: null,
      changedInstrumentCount: 1,
      batchSize: 1,
      offset: 0,
      nextOffset: null,
      hasMore: false,
      totalCount: 1,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'UNKNOWN',
      cacheExpiresAt: null,
      leaseOwner: 'other-worker',
      leaseExpiresAt: '2026-05-25T03:20:00.000Z',
      startedAt: '2026-05-25T03:10:00.000Z',
      completedAt: null,
      durationMs: null,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:10:00.000Z',
      updatedAt: '2026-05-25T03:10:00.000Z',
    };
    const repository = {
      upsertRun: jest.fn(),
      completeRun: jest.fn(),
      upsertStage: jest.fn(),
      acquireStageLease: jest.fn().mockResolvedValue({ acquired: false, reason: 'LEASE_HELD', stage: leasedStage }),
      completeStage: jest.fn(),
      recordStageProgress: jest.fn(),
      latestStages: jest.fn(),
    };
    const evaluateScheduledStage = jest.fn();
    const service = new PipelineOrchestrationService(repository as any, { evaluateScheduledStage } as any);

    const response = await service.runScheduledDataQualityStage({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      sourceFingerprint: 'md-source',
      changedInstrumentIds: ['stock-1'],
      batchSize: 25,
      schedulerRunStartedAt: '2026-05-25T03:00:00.000Z',
    });

    expect(response.status).toBe('LEASE_HELD');
    expect(evaluateScheduledStage).not.toHaveBeenCalled();
    expect(repository.upsertRun).not.toHaveBeenCalled();
  });

  it('records Market Data price-backfill progress as a MARKET_DATA stage snapshot', async () => {
    const run = {
      id: 'run-md-1',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'backfill',
      status: 'RUNNING',
      idempotencyKey: 'run-md-key',
      dataThroughDate: null,
      sourceFingerprint: 'market-data:PRICE_BACKFILL:price-backfill-1',
      changedInstrumentCount: 0,
      totalCount: 100,
      processedCount: 20,
      succeededCount: 18,
      partialCount: 0,
      failedCount: 1,
      skippedCount: 1,
      unchangedCount: 2,
      warnings: [],
      errors: [],
      metadata: null,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: null,
      durationMs: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:01:00.000Z',
    };
    const stage = {
      id: 'stage-md-1',
      pipelineRunId: 'run-md-1',
      stageKey: 'MARKET_DATA',
      stageOrder: 1,
      status: 'RUNNING',
      idempotencyKey: 'stage-md-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: null,
      inputFingerprint: 'market-data:PRICE_BACKFILL:price-backfill-1',
      outputFingerprint: null,
      changedInstrumentCount: 20,
      batchSize: 20,
      offset: 0,
      nextOffset: 0,
      hasMore: true,
      totalCount: 100,
      processedCount: 20,
      succeededCount: 18,
      partialCount: 0,
      failedCount: 1,
      skippedCount: 1,
      unchangedCount: 2,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'BYPASS',
      cacheExpiresAt: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: null,
      durationMs: null,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:01:00.000Z',
    };
    const repository = {
      upsertRun: jest.fn().mockResolvedValue(run),
      completeRun: jest.fn(),
      upsertStage: jest.fn().mockResolvedValue(stage),
      acquireStageLease: jest.fn(),
      completeStage: jest.fn(),
      recordStageProgress: jest.fn().mockResolvedValue(stage),
      latestStages: jest.fn(),
    };
    const service = new PipelineOrchestrationService(repository as any, {} as any);

    const result = await service.recordMarketDataStageSnapshot({
      region: 'in',
      assetType: 'stock',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'backfill',
      operation: 'PRICE_BACKFILL',
      runId: 'price-backfill-1',
      status: 'RUNNING',
      totalCount: 100,
      processedCount: 20,
      succeededCount: 18,
      failedCount: 1,
      skippedCount: 1,
      unchangedCount: 2,
      batchSize: 20,
      nextOffset: 0,
      hasMore: true,
      startedAt: '2026-05-25T03:00:00.000Z',
      warnings: [],
      errors: [],
      metadata: { message: 'Processing batch 1.' },
    }, new Date('2026-05-25T03:01:00.000Z'));

    expect(result.stageKey).toBe('MARKET_DATA');
    expect(repository.upsertRun).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      triggerType: 'backfill',
      status: 'RUNNING',
      totalCount: 100,
      processedCount: 20,
    }));
    expect(repository.upsertStage).toHaveBeenCalledWith(expect.objectContaining({
      stageKey: 'MARKET_DATA',
      stageOrder: 1,
      status: 'RUNNING',
      cacheStatus: 'BYPASS',
      idempotencyKey: expect.stringContaining('pipeline-ledger-v1:market-data:price_backfill:in:stock:1d:price-backfill-1'),
    }));
    expect(repository.recordStageProgress).toHaveBeenCalledWith(expect.objectContaining({
      status: 'RUNNING',
      processedCount: 20,
      hasMore: true,
    }));
    expect(repository.completeStage).not.toHaveBeenCalled();
    expect(repository.completeRun).not.toHaveBeenCalled();
  });

  it('records terminal Market Data price-backfill snapshots and completes the stage/run', async () => {
    const run = {
      id: 'run-md-terminal',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'backfill',
      status: 'RUNNING',
      idempotencyKey: 'run-md-key',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      sourceFingerprint: 'market-data:PRICE_BACKFILL:price-backfill-2',
      changedInstrumentCount: 0,
      totalCount: 20,
      processedCount: 20,
      succeededCount: 20,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 5,
      warnings: [],
      errors: [],
      metadata: null,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: null,
      durationMs: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:01:00.000Z',
    };
    const completedStage = {
      id: 'stage-md-terminal',
      pipelineRunId: 'run-md-terminal',
      stageKey: 'MARKET_DATA',
      stageOrder: 1,
      status: 'COMPLETED',
      idempotencyKey: 'stage-md-terminal-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      inputFingerprint: 'market-data:PRICE_BACKFILL:price-backfill-2',
      outputFingerprint: 'output',
      changedInstrumentCount: 20,
      batchSize: 20,
      offset: 0,
      nextOffset: null,
      hasMore: false,
      totalCount: 20,
      processedCount: 20,
      succeededCount: 20,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 5,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'BYPASS',
      cacheExpiresAt: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: '2026-05-25T03:05:00.000Z',
      durationMs: 300000,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:05:00.000Z',
    };
    const repository = {
      upsertRun: jest.fn().mockResolvedValue(run),
      completeRun: jest.fn().mockResolvedValue({ ...run, status: 'COMPLETED' }),
      upsertStage: jest.fn().mockResolvedValue({ ...completedStage, status: 'RUNNING' }),
      acquireStageLease: jest.fn(),
      completeStage: jest.fn().mockResolvedValue(completedStage),
      recordStageProgress: jest.fn(),
      latestStages: jest.fn(),
    };
    const service = new PipelineOrchestrationService(repository as any, {} as any);

    const result = await service.recordMarketDataStageSnapshot({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'backfill',
      operation: 'PRICE_BACKFILL',
      runId: 'price-backfill-2',
      status: 'COMPLETED',
      dataThroughDate: '2026-05-25',
      totalCount: 20,
      processedCount: 20,
      succeededCount: 20,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 5,
      batchSize: 20,
      nextOffset: null,
      hasMore: false,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: '2026-05-25T03:05:00.000Z',
      warnings: [],
      errors: [],
      metadata: { message: 'Price backfill completed.' },
    });

    expect(result.status).toBe('COMPLETED');
    expect(repository.recordStageProgress).not.toHaveBeenCalled();
    expect(repository.completeStage).toHaveBeenCalledWith(expect.objectContaining({
      status: 'COMPLETED',
      processedCount: 20,
      cacheStatus: 'BYPASS',
      durationMs: 300000,
    }));
    expect(repository.completeRun).toHaveBeenCalledWith(expect.objectContaining({
      status: 'COMPLETED',
      processedCount: 20,
      durationMs: 300000,
    }));
  });

  it('fans out terminal Market Data price-backfill snapshots into scheduled Data Quality for changed instruments', async () => {
    const run = {
      id: 'run-md-terminal',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'startup',
      status: 'RUNNING',
      idempotencyKey: 'run-md-key',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      sourceFingerprint: 'market-data:PRICE_BACKFILL:price-backfill-3',
      changedInstrumentCount: 0,
      totalCount: 20,
      processedCount: 20,
      succeededCount: 20,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 5,
      warnings: [],
      errors: [],
      metadata: null,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: null,
      durationMs: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:01:00.000Z',
    };
    const completedStage = {
      id: 'stage-md-terminal',
      pipelineRunId: 'run-md-terminal',
      stageKey: 'MARKET_DATA',
      stageOrder: 1,
      status: 'COMPLETED',
      idempotencyKey: 'stage-md-terminal-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      inputFingerprint: 'market-data:PRICE_BACKFILL:price-backfill-3',
      outputFingerprint: 'market-data-output',
      changedInstrumentCount: 2,
      batchSize: 20,
      offset: 0,
      nextOffset: null,
      hasMore: false,
      totalCount: 20,
      processedCount: 20,
      succeededCount: 20,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 5,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'BYPASS',
      cacheExpiresAt: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: '2026-05-25T03:05:00.000Z',
      durationMs: 300000,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:05:00.000Z',
    };
    const repository = {
      upsertRun: jest.fn().mockResolvedValue(run),
      completeRun: jest.fn().mockResolvedValue({ ...run, status: 'COMPLETED' }),
      upsertStage: jest.fn().mockResolvedValue({ ...completedStage, status: 'RUNNING' }),
      acquireStageLease: jest.fn(),
      completeStage: jest.fn().mockResolvedValue(completedStage),
      recordStageProgress: jest.fn(),
      latestStages: jest.fn(),
    };
    const service = new PipelineOrchestrationService(repository as any, {} as any);
    const runScheduledDataQualityStage = jest
      .spyOn(service, 'runScheduledDataQualityStage')
      .mockResolvedValue({ status: 'COMPLETED' } as any);

    await service.recordMarketDataStageSnapshot({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'startup',
      operation: 'PRICE_BACKFILL',
      runId: 'price-backfill-3',
      status: 'COMPLETED',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      totalCount: 20,
      processedCount: 20,
      succeededCount: 20,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 5,
      changedInstrumentIds: ['stock-2', 'stock-1', 'stock-1'],
      batchSize: 20,
      nextOffset: null,
      hasMore: false,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: '2026-05-25T03:05:00.000Z',
      warnings: [],
      errors: [],
      metadata: { message: 'Price backfill completed.' },
    });

    expect(repository.upsertRun).toHaveBeenCalledWith(expect.objectContaining({
      changedInstrumentCount: 2,
    }));
    expect(repository.upsertStage).toHaveBeenCalledWith(expect.objectContaining({
      changedInstrumentCount: 2,
    }));
    expect(runScheduledDataQualityStage).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      changedInstrumentIds: ['stock-1', 'stock-2'],
      batchSize: 2,
      schedulerRunStartedAt: '2026-05-25T03:00:00.000Z',
    }));
  });
});
