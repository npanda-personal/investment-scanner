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
});
