/// <reference types="@types/jest" />
import { PipelineCommandError, PipelineOrchestrationService } from '../../../src/modules/pipeline-orchestration';

function marketDataStageRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'stage-market-data',
    pipelineRunId: 'run-market-data',
    stageKey: 'MARKET_DATA',
    stageOrder: 1,
    status: 'COMPLETED',
    idempotencyKey: 'stage-key',
    region: 'IN',
    assetType: 'STOCK',
    timeframe: '1d',
    dataThroughDate: '2026-05-25T00:00:00.000Z',
    inputFingerprint: 'market-data:manual',
    outputFingerprint: 'market-data-output',
    changedInstrumentCount: 1,
    batchSize: 25,
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
    cacheStatus: 'BYPASS',
    cacheExpiresAt: null,
    leaseOwner: null,
    leaseExpiresAt: null,
    startedAt: '2026-05-25T03:00:00.000Z',
    completedAt: '2026-05-25T03:00:02.000Z',
    durationMs: 2000,
    warnings: [],
    errors: [],
    metadata: null,
    createdAt: '2026-05-25T03:00:00.000Z',
    updatedAt: '2026-05-25T03:00:02.000Z',
    ...overrides,
  };
}

function serviceWithMarketData(repository: Record<string, unknown>, marketDataService: Record<string, unknown>) {
  return new PipelineOrchestrationService(
    repository as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    marketDataService as any
  );
}


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

  it('hides stale active run and stage rows from status snapshots', async () => {
    const staleRun = {
      id: 'run-stale',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'scheduled',
      status: 'RUNNING',
      idempotencyKey: 'run-stale-key',
      dataThroughDate: null,
      sourceFingerprint: null,
      changedInstrumentCount: 0,
      totalCount: 100,
      processedCount: 20,
      succeededCount: 20,
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
      updatedAt: '2026-05-25T01:00:00.000Z',
    };
    const repository = {
      findActiveRun: jest.fn().mockResolvedValue(staleRun),
      findLastRun: jest.fn().mockResolvedValue(null),
      latestStages: jest.fn().mockResolvedValue([{
        id: 'stage-stale',
        pipelineRunId: 'run-stale',
        stageKey: 'MARKET_DATA',
        stageOrder: 1,
        status: 'RUNNING',
        idempotencyKey: 'stage-stale-key',
        region: 'IN',
        assetType: 'STOCK',
        timeframe: '1d',
        dataThroughDate: null,
        inputFingerprint: null,
        outputFingerprint: null,
        changedInstrumentCount: 0,
        batchSize: 25,
        offset: 0,
        nextOffset: 20,
        hasMore: true,
        totalCount: 100,
        processedCount: 20,
        succeededCount: 20,
        partialCount: 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        attemptCount: 1,
        cacheKey: null,
        cacheStatus: 'BYPASS',
        cacheExpiresAt: null,
        leaseOwner: 'dead-worker',
        leaseExpiresAt: '2026-05-25T01:10:00.000Z',
        startedAt: '2026-05-25T01:00:00.000Z',
        completedAt: null,
        durationMs: null,
        warnings: [],
        errors: [],
        metadata: null,
        createdAt: '2026-05-25T01:00:00.000Z',
        updatedAt: '2026-05-25T01:00:00.000Z',
      }]),
    };
    const service = new PipelineOrchestrationService(repository as any);

    const snapshot = await service.status({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      limit: 25,
    }, new Date('2026-05-25T01:30:00.000Z'));

    expect(snapshot.activeRun).toBeNull();
    expect(snapshot.stages[0]).toMatchObject({
      stageKey: 'MARKET_DATA',
      activeStage: null,
      lastStage: null,
    });
  });

  it('does not report abandoned zero-progress MARKET_DATA rows as active after lease duration', async () => {
    const abandonedRun = {
      id: 'run-abandoned-market-data',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'manual',
      status: 'RUNNING',
      idempotencyKey: 'run-abandoned-key',
      dataThroughDate: null,
      sourceFingerprint: 'market-data:INCREMENTAL_EOD_LOAD:abandoned',
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
    const repository = {
      findActiveRun: jest.fn().mockResolvedValue(abandonedRun),
      findLastRun: jest.fn().mockResolvedValue(null),
      latestStages: jest.fn().mockResolvedValue([{
        id: 'stage-abandoned-market-data',
        pipelineRunId: 'run-abandoned-market-data',
        stageKey: 'MARKET_DATA',
        stageOrder: 1,
        status: 'RUNNING',
        idempotencyKey: 'stage-abandoned-key',
        region: 'IN',
        assetType: 'STOCK',
        timeframe: '1d',
        dataThroughDate: null,
        inputFingerprint: 'market-data:INCREMENTAL_EOD_LOAD:abandoned',
        outputFingerprint: null,
        changedInstrumentCount: 0,
        batchSize: 100,
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
        cacheStatus: 'BYPASS',
        cacheExpiresAt: null,
        leaseOwner: null,
        leaseExpiresAt: null,
        startedAt: null,
        completedAt: null,
        durationMs: null,
        warnings: [],
        errors: [],
        metadata: null,
        createdAt: '2026-05-25T03:00:00.000Z',
        updatedAt: '2026-05-25T03:00:00.000Z',
      }]),
    };
    const service = new PipelineOrchestrationService(repository as any);

    const snapshot = await service.status({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      limit: 25,
    }, new Date('2026-05-25T03:10:01.000Z'));

    expect(snapshot.activeRun).toBeNull();
    expect(snapshot.stages[0]).toMatchObject({
      stageKey: 'MARKET_DATA',
      activeStage: null,
      lastStage: null,
    });
  });

  it('returns a command catalog with exchange reset workflow commands enabled', () => {
    const service = new PipelineOrchestrationService({} as any, {} as any);
    const catalog = service.commandCatalog({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
    }, new Date('2026-05-25T02:00:00.000Z'));

    const enabled = catalog.commands.filter((item) => item.availability === 'ENABLED');
    expect(enabled.map((item) => item.commandKey)).toEqual([
      'DATA_QUALITY_EVALUATE_SCOPE',
      'MARKET_PULSE_REFRESH',
      'SECTOR_INTELLIGENCE_REFRESH',
      'EARNINGS_INTELLIGENCE_REFRESH',
      'STOCK_INTEREST_REFRESH',
      'MARKET_SCAN_REFRESH',
      'PIPELINE_RUN_ALL',
      'MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL',
      'MARKET_DATA_MANUAL_VERIFIED_FUNDAMENTALS_IMPORT',
      'PIPELINE_RETRY_FAILED_STAGE',
      'PIPELINE_DAG_RETRY',
    ]);
    expect(catalog.commands.find((item) => item.commandKey === 'PIPELINE_RUN_ALL')).toMatchObject({
      availability: 'ENABLED',
      stageKey: 'MARKET_DATA',
      providerAccess: 'NONE',
      runModes: ['full_latest_trading_date', 'incremental_changed_only', 'single_batch'],
      defaultBatchSize: 100,
    });
    expect(catalog.commands.find((item) => item.commandKey === 'MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL')).toMatchObject({
      availability: 'ENABLED',
      stageKey: 'MARKET_DATA',
      providerAccess: 'NONE',
    });
    expect(catalog.commands.find((item) => item.commandKey === 'MARKET_PULSE_REFRESH')).toMatchObject({
      availability: 'ENABLED',
      stageKey: 'MARKET_PULSE',
      providerAccess: 'NONE',
    });
    expect(catalog.commands.find((item) => item.commandKey === 'SECTOR_INTELLIGENCE_REFRESH')).toMatchObject({
      availability: 'ENABLED',
      stageKey: 'SECTOR_INTELLIGENCE_REFRESH',
      providerAccess: 'NONE',
    });
    expect(catalog.commands.find((item) => item.commandKey === 'EARNINGS_INTELLIGENCE_REFRESH')).toMatchObject({
      availability: 'ENABLED',
      stageKey: 'EARNINGS_INTELLIGENCE_REFRESH',
      providerAccess: 'NONE',
    });
    expect(catalog.commands.find((item) => item.commandKey === 'STOCK_INTEREST_REFRESH')).toMatchObject({
      availability: 'ENABLED',
      stageKey: 'STOCK_INTEREST_REFRESH',
      providerAccess: 'NONE',
    });
    expect(catalog.commands.find((item) => item.commandKey === 'MARKET_DATA_PRICE_BACKFILL')).toMatchObject({
      availability: 'FORBIDDEN',
      providerAccess: 'FORBIDDEN',
    });
    expect(catalog.generatedAt).toBe('2026-05-25T02:00:00.000Z');
  });

  it('executes MARKET_PULSE_REFRESH by creating a Market Pulse stage snapshot from persisted data', async () => {
    const run = {
      id: 'run-market-pulse',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'manual',
      status: 'RUNNING',
      idempotencyKey: 'market-pulse-run-key',
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
      startedAt: '2026-06-01T06:00:00.000Z',
      completedAt: null,
      durationMs: null,
      createdAt: '2026-06-01T06:00:00.000Z',
      updatedAt: '2026-06-01T06:00:00.000Z',
    };
    const stage = marketDataStageRecord({
      id: 'stage-market-pulse',
      pipelineRunId: 'run-market-pulse',
      stageKey: 'MARKET_PULSE',
      stageOrder: 7,
      status: 'RUNNING',
      batchSize: 25,
      totalCount: 1,
      processedCount: 0,
      succeededCount: 0,
      leaseOwner: 'manual-command:MARKET_PULSE_REFRESH:test',
      leaseExpiresAt: '2026-06-01T06:10:00.000Z',
      startedAt: '2026-06-01T06:00:00.000Z',
      completedAt: null,
    });
    const repository = {
      findActiveRun: jest.fn().mockResolvedValue(null),
      acquireStageLease: jest.fn()
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_NOT_FOUND', stage: null })
        .mockResolvedValueOnce({ acquired: true, reason: 'ACQUIRED', stage }),
      upsertRun: jest.fn().mockResolvedValue(run),
      upsertStage: jest.fn().mockResolvedValue(stage),
      completeStage: jest.fn(async (input) => ({
        ...stage,
        status: input.status,
        totalCount: input.totalCount,
        processedCount: input.processedCount,
        succeededCount: input.succeededCount,
        partialCount: input.partialCount,
        failedCount: input.failedCount,
        skippedCount: input.skippedCount,
        unchangedCount: input.unchangedCount,
        nextOffset: input.nextOffset,
        hasMore: input.hasMore,
        warnings: input.warnings,
        errors: input.errors,
        completedAt: input.completedAt.toISOString(),
        durationMs: input.durationMs,
        leaseOwner: null,
        leaseExpiresAt: null,
      })),
      completeRun: jest.fn().mockResolvedValue({ ...run, status: 'COMPLETED' }),
    };
    const marketPulseService = {
      refreshSnapshot: jest.fn().mockResolvedValue({
        id: 'pulse-1',
        status: 'FRESH',
        dataThroughDate: new Date('2026-05-29T00:00:00.000Z'),
        marketHealthScore: 82,
        marketHealthLabel: 'HEALTHY',
        warningsJson: [],
        sourceSummaryJson: { status: 'FRESH' },
      }),
    };
    const service = new PipelineOrchestrationService(
      repository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      marketPulseService as any
    );

    const result = await service.executeCommand({
      commandKey: 'MARKET_PULSE_REFRESH',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 25,
      offset: 0,
      idempotencyKey: 'market-pulse-1',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' }, new Date('2026-06-01T06:00:00.000Z'));

    expect(marketPulseService.refreshSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineRunId: 'run-market-pulse',
    }));
    expect(repository.completeStage).toHaveBeenCalledWith(expect.objectContaining({
      status: 'COMPLETED',
      totalCount: 1,
      processedCount: 1,
      succeededCount: 1,
      failedCount: 0,
    }));
    expect(result).toMatchObject({
      commandKey: 'MARKET_PULSE_REFRESH',
      stageKey: 'MARKET_PULSE',
      status: 'COMPLETED',
      pipelineRunId: 'run-market-pulse',
      stageRunId: 'stage-market-pulse',
    });
  });

  it('executes EARNINGS_INTELLIGENCE_REFRESH by materializing persisted earnings snapshots', async () => {
    const run = {
      id: 'run-earnings',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'manual',
      status: 'RUNNING',
      idempotencyKey: 'earnings-run-key',
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
      startedAt: '2026-06-01T06:00:00.000Z',
      completedAt: null,
      durationMs: null,
      createdAt: '2026-06-01T06:00:00.000Z',
      updatedAt: '2026-06-01T06:00:00.000Z',
    };
    const stage = marketDataStageRecord({
      id: 'stage-earnings',
      pipelineRunId: 'run-earnings',
      stageKey: 'EARNINGS_INTELLIGENCE_REFRESH',
      stageOrder: 15,
      status: 'RUNNING',
      batchSize: 25,
      totalCount: 2,
      processedCount: 0,
      succeededCount: 0,
      leaseOwner: 'manual-command:EARNINGS_INTELLIGENCE_REFRESH:test',
      leaseExpiresAt: '2026-06-01T06:10:00.000Z',
      startedAt: '2026-06-01T06:00:00.000Z',
      completedAt: null,
    });
    const repository = {
      acquireStageLease: jest.fn()
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_NOT_FOUND', stage: null })
        .mockResolvedValueOnce({ acquired: true, reason: 'ACQUIRED', stage }),
      upsertRun: jest.fn().mockResolvedValue(run),
      upsertStage: jest.fn().mockResolvedValue(stage),
      completeStage: jest.fn(async (input) => ({
        ...stage,
        status: input.status,
        totalCount: input.totalCount,
        processedCount: input.processedCount,
        succeededCount: input.succeededCount,
        partialCount: input.partialCount,
        failedCount: input.failedCount,
        skippedCount: input.skippedCount,
        unchangedCount: input.unchangedCount,
        nextOffset: input.nextOffset,
        hasMore: input.hasMore,
        warnings: input.warnings,
        errors: input.errors,
        metadata: input.metadata,
        completedAt: input.completedAt.toISOString(),
        durationMs: input.durationMs,
        leaseOwner: null,
        leaseExpiresAt: null,
      })),
      completeRun: jest.fn().mockResolvedValue({ ...run, status: 'COMPLETED' }),
    };
    const earningsService = {
      refreshSnapshots: jest.fn().mockResolvedValue({
        status: 'COMPLETED',
        snapshotDate: '2026-06-01T00:00:00.000Z',
        dataThroughDate: '2026-05-31T00:00:00.000Z',
        region: 'IN',
        assetType: 'STOCK',
        totalCount: 2,
        processedCount: 2,
        succeededCount: 2,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        nextOffset: null,
        hasMore: false,
        warnings: [],
        errors: [],
        categories: {
          UPCOMING_RESULTS: 1,
          PRE_RESULT_INTEREST: 1,
          RESULT_WINNERS: 1,
          RESULT_DISAPPOINTMENTS: 0,
          RESULT_REACTION_HISTORY: 1,
          EARNINGS_WATCHLIST: 2,
        },
      }),
    };
    const service = new PipelineOrchestrationService(
      repository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      earningsService as any
    );

    const result = await service.executeCommand({
      commandKey: 'EARNINGS_INTELLIGENCE_REFRESH',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 25,
      offset: 0,
      idempotencyKey: 'earnings-1',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' }, new Date('2026-06-01T06:00:00.000Z'));

    expect(earningsService.refreshSnapshots).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 25,
      offset: 0,
    }));
    expect(repository.completeStage).toHaveBeenCalledWith(expect.objectContaining({
      status: 'COMPLETED',
      totalCount: 2,
      processedCount: 2,
      succeededCount: 2,
      failedCount: 0,
      metadata: expect.objectContaining({
        adapter: 'EarningsIntelligenceService.refreshSnapshots',
        categories: expect.objectContaining({ EARNINGS_WATCHLIST: 2 }),
      }),
    }));
    expect(result).toMatchObject({
      commandKey: 'EARNINGS_INTELLIGENCE_REFRESH',
      stageKey: 'EARNINGS_INTELLIGENCE_REFRESH',
      status: 'COMPLETED',
      pipelineRunId: 'run-earnings',
      stageRunId: 'stage-earnings',
    });
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
      commandKey: 'MARKET_DATA_PRICE_BACKFILL',
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

  it('executes the daily pipeline command by syncing market data and recording a downstream-eligible snapshot', async () => {
    const repository = {
      findActiveRun: jest.fn().mockResolvedValue(null),
    };
    const marketDataService = {
      syncScheduledRegion: jest.fn().mockResolvedValue({
        region: 'IN',
        assetType: 'STOCK',
        tradingDate: '2026-05-25',
        dataThroughDate: '2026-05-25',
        sourceFingerprint: 'scheduled-region:abc123',
        instrumentsProcessed: 2,
        rowsReceived: 2,
        rowsInserted: 1,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 1,
        changedInstrumentIds: ['stock-1'],
        downstreamInstrumentIds: ['stock-1', 'stock-2'],
        changedInstrumentCount: 1,
        dqStageEligible: true,
        warningCount: 0,
        warnings: [],
        errors: [],
      }),
    };
    const service = new PipelineOrchestrationService(
      repository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      marketDataService as any
    );
    const completedStage = {
      id: 'stage-market-data',
      pipelineRunId: 'run-market-data',
      stageKey: 'MARKET_DATA',
      stageOrder: 1,
      status: 'COMPLETED',
      idempotencyKey: 'stage-key',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
      inputFingerprint: 'market-data:INCREMENTAL_EOD_LOAD:manual-daily-pipeline',
      outputFingerprint: 'market-data-output',
      changedInstrumentCount: 1,
      batchSize: 100,
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
      cacheStatus: 'BYPASS',
      cacheExpiresAt: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: '2026-05-25T03:00:02.000Z',
      durationMs: 2000,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-05-25T03:00:00.000Z',
      updatedAt: '2026-05-25T03:00:02.000Z',
    };
    const recordSnapshot = jest.spyOn(service, 'recordMarketDataStageSnapshot')
      .mockResolvedValueOnce({ ...completedStage, status: 'RUNNING', completedAt: null } as any)
      .mockResolvedValueOnce(completedStage as any);
    const dagRun = jest.spyOn(service, 'executeDagPipeline')
      .mockResolvedValue({ runStatus: 'COMPLETED', stages: {}, durationMs: 100 });

    const result = await service.executeCommand({
      commandKey: 'PIPELINE_RUN_ALL',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'full_latest_trading_date',
      batchSize: 100,
      offset: 0,
      idempotencyKey: 'manual-daily-1',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' }, new Date('2026-05-25T03:00:00.000Z'));

    expect(marketDataService.syncScheduledRegion).toHaveBeenCalledWith('IN', expect.objectContaining({
      assetType: 'STOCK',
      batchSize: 100,
      syncDuringMarketHours: false,
      skipWeekends: true,
    }));
    expect(recordSnapshot).toHaveBeenNthCalledWith(1, expect.objectContaining({
      operation: 'INCREMENTAL_EOD_LOAD',
      status: 'RUNNING',
      triggerType: 'manual',
    }));
    expect(recordSnapshot).toHaveBeenNthCalledWith(2, expect.objectContaining({
      operation: 'INCREMENTAL_EOD_LOAD',
      status: 'COMPLETED',
      changedInstrumentIds: ['stock-1'],
      downstreamInstrumentIds: ['stock-1', 'stock-2'],
    }));
    expect(dagRun).toHaveBeenCalledWith(expect.objectContaining({
      tradingDate: '2026-05-25',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      trigger: 'manual',
      changedInstrumentIds: ['stock-1', 'stock-2'],
    }));
    expect(result).toMatchObject({
      commandKey: 'PIPELINE_RUN_ALL',
      stageKey: 'MARKET_DATA',
      status: 'COMPLETED',
    });
  });

  it('returns a live lease response for PIPELINE_RUN_ALL while MARKET_DATA is still active', async () => {
    const activeRun = {
      id: 'run-active-market-data',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'manual',
      status: 'RUNNING',
      idempotencyKey: 'active-run-key',
      dataThroughDate: null,
      sourceFingerprint: 'market-data:INCREMENTAL_EOD_LOAD:active',
      changedInstrumentCount: 0,
      totalCount: 100,
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
    const activeStage = marketDataStageRecord({
      id: 'stage-active-market-data',
      pipelineRunId: 'run-active-market-data',
      status: 'RUNNING',
      totalCount: 100,
      processedCount: 0,
      succeededCount: 0,
      leaseOwner: 'manual-command:PIPELINE_RUN_ALL:worker-a',
      leaseExpiresAt: '2026-05-25T03:10:00.000Z',
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: null,
      updatedAt: '2026-05-25T03:00:00.000Z',
    });
    const repository = {
      findActiveRun: jest.fn().mockResolvedValue(activeRun),
      latestStages: jest.fn().mockResolvedValue([activeStage]),
    };
    const marketDataService = {
      syncScheduledRegion: jest.fn(),
    };
    const service = serviceWithMarketData(repository, marketDataService);

    await expect(service.executeCommand({
      commandKey: 'PIPELINE_RUN_ALL',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'full_latest_trading_date',
      batchSize: 100,
      offset: 0,
      idempotencyKey: 'manual-daily-active-lease',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' }, new Date('2026-05-25T03:05:00.000Z'))).rejects.toMatchObject({
      statusCode: 409,
      payload: expect.objectContaining({
        status: 'LEASE_HELD',
        pipelineRunId: 'run-active-market-data',
        stageRunId: 'stage-active-market-data',
        lease: expect.objectContaining({
          acquired: false,
          reason: 'LEASE_HELD',
          leaseOwner: 'manual-command:PIPELINE_RUN_ALL:worker-a',
          leaseExpiresAt: '2026-05-25T03:10:00.000Z',
        }),
        counts: expect.objectContaining({
          totalCount: 100,
          processedCount: 0,
        }),
      }),
    });
    expect(marketDataService.syncScheduledRegion).not.toHaveBeenCalled();
  });

  it('retries PIPELINE_RUN_ALL after an abandoned MARKET_DATA lease expires', async () => {
    const activeRun = {
      id: 'run-stale-market-data',
      pipelineKey: 'market-intelligence',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      triggerType: 'manual',
      status: 'RUNNING',
      idempotencyKey: 'stale-run-key',
      dataThroughDate: null,
      sourceFingerprint: 'market-data:INCREMENTAL_EOD_LOAD:stale',
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
    const staleStage = marketDataStageRecord({
      id: 'stage-stale-market-data',
      pipelineRunId: 'run-stale-market-data',
      status: 'RUNNING',
      totalCount: 0,
      processedCount: 0,
      succeededCount: 0,
      leaseOwner: 'manual-command:PIPELINE_RUN_ALL:dead-worker',
      leaseExpiresAt: '2026-05-25T03:04:59.000Z',
      startedAt: '2026-05-25T03:00:00.000Z',
      completedAt: null,
      updatedAt: '2026-05-25T03:00:00.000Z',
    });
    const repository = {
      findActiveRun: jest.fn().mockResolvedValue(activeRun),
      latestStages: jest.fn().mockResolvedValue([staleStage]),
    };
    const marketDataService = {
      syncScheduledRegion: jest.fn().mockResolvedValue({
        region: 'IN',
        assetType: 'STOCK',
        tradingDate: '2026-05-25',
        dataThroughDate: '2026-05-25',
        sourceFingerprint: 'scheduled-region:retry',
        instrumentsProcessed: 1,
        rowsReceived: 1,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 1,
        changedInstrumentIds: [],
        downstreamInstrumentIds: ['stock-1'],
        changedInstrumentCount: 0,
        dqStageEligible: true,
        warningCount: 0,
        warnings: [],
        errors: [],
      }),
    };
    const service = serviceWithMarketData(repository, marketDataService);
    const completedStage = marketDataStageRecord({
      totalCount: 1,
      processedCount: 1,
      succeededCount: 1,
      unchangedCount: 1,
      changedInstrumentCount: 0,
    });
    const recordSnapshot = jest.spyOn(service, 'recordMarketDataStageSnapshot')
      .mockResolvedValueOnce({ ...completedStage, status: 'RUNNING', completedAt: null } as any)
      .mockResolvedValueOnce(completedStage as any);
    jest.spyOn(service, 'executeDagPipeline')
      .mockResolvedValue({ runStatus: 'COMPLETED', stages: {}, durationMs: 100 });

    const result = await service.executeCommand({
      commandKey: 'PIPELINE_RUN_ALL',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'full_latest_trading_date',
      batchSize: 100,
      offset: 0,
      idempotencyKey: 'manual-daily-retry-after-stale',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' }, new Date('2026-05-25T03:05:00.000Z'));

    expect(marketDataService.syncScheduledRegion).toHaveBeenCalled();
    expect(recordSnapshot).toHaveBeenNthCalledWith(1, expect.objectContaining({
      status: 'RUNNING',
      leaseOwner: expect.stringContaining('manual-command:PIPELINE_RUN_ALL:'),
      leaseMs: expect.any(Number),
    }));
    expect(result).toMatchObject({
      commandKey: 'PIPELINE_RUN_ALL',
      status: 'COMPLETED',
    });
  });

  it('runs full daily downstream catch-up when market data has only no-op exchange rows', async () => {
    const repository = {
      findActiveRun: jest.fn().mockResolvedValue(null),
    };
    const marketDataService = {
      syncScheduledRegion: jest.fn().mockResolvedValue({
        region: 'IN',
        assetType: 'STOCK',
        tradingDate: '2026-05-25',
        dataThroughDate: '2026-05-25',
        sourceFingerprint: 'scheduled-region:no-op',
        instrumentsProcessed: 2,
        rowsReceived: 2,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 2,
        changedInstrumentIds: [],
        downstreamInstrumentIds: ['stock-1', 'stock-2'],
        changedInstrumentCount: 0,
        dqStageEligible: true,
        warningCount: 0,
        warnings: [],
        errors: [],
      }),
    };
    const service = serviceWithMarketData(repository, marketDataService);
    const completedStage = marketDataStageRecord({
      totalCount: 2,
      processedCount: 2,
      succeededCount: 2,
      changedInstrumentCount: 0,
      unchangedCount: 2,
    });
    const recordSnapshot = jest.spyOn(service, 'recordMarketDataStageSnapshot')
      .mockResolvedValueOnce({ ...completedStage, status: 'RUNNING', completedAt: null } as any)
      .mockResolvedValueOnce(completedStage as any);
    const dagRun = jest.spyOn(service, 'executeDagPipeline')
      .mockResolvedValue({ runStatus: 'COMPLETED', stages: {}, durationMs: 100 });

    const result = await service.executeCommand({
      commandKey: 'PIPELINE_RUN_ALL',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'full_latest_trading_date',
      batchSize: 100,
      offset: 0,
      idempotencyKey: 'manual-daily-no-op',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' }, new Date('2026-05-25T03:00:00.000Z'));

    expect(dagRun).toHaveBeenCalledWith(expect.objectContaining({
      tradingDate: '2026-05-25',
      region: 'IN',
      assetType: 'STOCK',
      changedInstrumentIds: ['stock-1', 'stock-2'],
      trigger: 'manual',
    }));
    expect(recordSnapshot).toHaveBeenNthCalledWith(2, expect.objectContaining({
      status: 'COMPLETED',
      changedInstrumentIds: [],
      downstreamInstrumentIds: ['stock-1', 'stock-2'],
    }));
    expect(result.status).toBe('COMPLETED');
  });

  it('resolves full daily downstream eligibility from latest persisted prices when market data is current with no changed rows', async () => {
    const repository = {
      findActiveRun: jest.fn().mockResolvedValue(null),
    };
    const marketDataService = {
      syncScheduledRegion: jest.fn().mockResolvedValue({
        region: 'IN',
        assetType: 'STOCK',
        tradingDate: '2026-05-28',
        dataThroughDate: '2026-05-27',
        sourceFingerprint: 'scheduled-region:current-no-change',
        instrumentsProcessed: 0,
        rowsReceived: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        changedInstrumentIds: [],
        downstreamInstrumentIds: [],
        changedInstrumentCount: 0,
        dqStageEligible: false,
        warningCount: 0,
        warnings: [],
        errors: [],
      }),
      listDailyRefreshEligibleInstrumentIds: jest.fn().mockResolvedValue({
        region: 'IN',
        assetType: 'STOCK',
        dataThroughDate: '2026-05-27',
        source: 'LATEST_PRICE',
        instrumentIds: ['stock-1', 'stock-2'],
        instrumentCount: 2,
      }),
    };
    const service = serviceWithMarketData(repository, marketDataService);
    const completedStage = marketDataStageRecord({
      status: 'COMPLETED',
      totalCount: 2,
      processedCount: 0,
      succeededCount: 0,
      changedInstrumentCount: 0,
      unchangedCount: 0,
      metadata: {
        downstreamInstrumentCount: 2,
        downstreamEligibilitySource: 'LATEST_PRICE',
      },
    });
    const recordSnapshot = jest.spyOn(service, 'recordMarketDataStageSnapshot')
      .mockResolvedValueOnce({ ...completedStage, status: 'RUNNING', completedAt: null } as any)
      .mockResolvedValueOnce(completedStage as any);
    const dagRun = jest.spyOn(service, 'executeDagPipeline')
      .mockResolvedValue({ runStatus: 'COMPLETED', stages: {}, durationMs: 100 });

    const result = await service.executeCommand({
      commandKey: 'PIPELINE_RUN_ALL',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'full_latest_trading_date',
      batchSize: 100,
      offset: 0,
      idempotencyKey: 'manual-daily-current-no-change',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' }, new Date('2026-05-28T03:00:00.000Z'));

    expect(marketDataService.listDailyRefreshEligibleInstrumentIds).toHaveBeenCalledWith({
      region: 'IN',
      assetType: 'STOCK',
      dataThroughDate: '2026-05-27',
      limit: 10000,
    });
    expect(dagRun).toHaveBeenCalledWith(expect.objectContaining({
      tradingDate: '2026-05-27',
      changedInstrumentIds: ['stock-1', 'stock-2'],
      trigger: 'manual',
    }));
    expect(recordSnapshot).toHaveBeenNthCalledWith(2, expect.objectContaining({
      status: 'COMPLETED',
      changedInstrumentIds: [],
      downstreamInstrumentIds: ['stock-1', 'stock-2'],
      warnings: [],
      metadata: expect.objectContaining({
        rowsInserted: 0,
        rowsUpdated: 0,
        downstreamInstrumentCount: 2,
        downstreamSnapshotBridgeSuppressed: true,
      }),
    }));
    expect(result.status).toBe('COMPLETED');
  });

  it('runs full daily downstream catch-up from latest valid dataThroughDate when expected NSE file is not available', async () => {
    const repository = {
      findActiveRun: jest.fn().mockResolvedValue(null),
    };
    const marketDataService = {
      syncScheduledRegion: jest.fn().mockResolvedValue({
        region: 'IN',
        assetType: 'STOCK',
        tradingDate: '2026-05-27',
        dataThroughDate: '2026-05-26',
        sourceFingerprint: 'scheduled-region:not-available-fallback',
        instrumentsProcessed: 0,
        rowsReceived: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        changedInstrumentIds: [],
        downstreamInstrumentIds: [],
        changedInstrumentCount: 0,
        dqStageEligible: false,
        warningCount: 2,
        warnings: [
          'NSE CM UDiFF file is not available yet (HTTP 404).',
          'NSE EOD file for 2026-05-27 is not available yet; using latest stored dataThroughDate 2026-05-26 for downstream refresh.',
        ],
        errors: [],
        officialEodBulk: {
          enabled: true,
          attempted: true,
          sourceName: 'NSE_UDIFF_CM_BHAVCOPY',
          sourceUrl: 'https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_20260527_F_0000.csv.zip',
          sourceFileName: 'BhavCopy_NSE_CM_0_0_0_20260527_F_0000.csv.zip',
          targetTradingDate: '2026-05-27',
          sourceFingerprint: null,
          rowsRead: 0,
          rowsParsed: 0,
          matchedInstruments: 0,
          rowsInserted: 0,
          rowsUpdated: 0,
          rowsNoOp: 0,
          fallbackReason: 'OFFICIAL_EOD_NOT_AVAILABLE',
          warnings: ['NSE CM UDiFF file is not available yet (HTTP 404).'],
        },
      }),
      listDailyRefreshEligibleInstrumentIds: jest.fn().mockResolvedValue({
        region: 'IN',
        assetType: 'STOCK',
        dataThroughDate: '2026-05-26',
        source: 'LATEST_PRICE',
        instrumentIds: ['stock-1', 'stock-2'],
        instrumentCount: 2,
      }),
    };
    const service = serviceWithMarketData(repository, marketDataService);
    const completedStage = marketDataStageRecord({
      status: 'COMPLETED',
      totalCount: 2,
      processedCount: 0,
      succeededCount: 0,
      changedInstrumentCount: 0,
      warnings: [
        'NSE CM UDiFF file is not available yet (HTTP 404).',
        'NSE EOD file for 2026-05-27 is not available yet; using latest stored dataThroughDate 2026-05-26 for downstream refresh.',
      ],
      metadata: {
        marketDataAvailabilityStatus: 'NOT_AVAILABLE',
        downstreamInstrumentCount: 2,
        downstreamEligibilitySource: 'LATEST_PRICE',
      },
    });
    const recordSnapshot = jest.spyOn(service, 'recordMarketDataStageSnapshot')
      .mockResolvedValueOnce({ ...completedStage, status: 'RUNNING', completedAt: null, warnings: [] } as any)
      .mockResolvedValueOnce(completedStage as any);
    const dagRun = jest.spyOn(service, 'executeDagPipeline')
      .mockResolvedValue({ runStatus: 'COMPLETED', stages: {}, durationMs: 100 });

    const result = await service.executeCommand({
      commandKey: 'PIPELINE_RUN_ALL',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'full_latest_trading_date',
      batchSize: 100,
      offset: 0,
      idempotencyKey: 'manual-daily-current-file-not-available',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' }, new Date('2026-05-27T13:00:00.000Z'));

    expect(marketDataService.listDailyRefreshEligibleInstrumentIds).toHaveBeenCalledWith({
      region: 'IN',
      assetType: 'STOCK',
      dataThroughDate: '2026-05-26',
      limit: 10000,
    });
    expect(dagRun).toHaveBeenCalledWith(expect.objectContaining({
      tradingDate: '2026-05-26',
      changedInstrumentIds: ['stock-1', 'stock-2'],
      trigger: 'manual',
    }));
    expect(recordSnapshot).toHaveBeenNthCalledWith(2, expect.objectContaining({
      status: 'COMPLETED',
      dataThroughDate: '2026-05-26',
      warnings: expect.arrayContaining([
        expect.stringContaining('not available yet'),
        expect.stringContaining('using latest stored dataThroughDate 2026-05-26'),
      ]),
      errors: [],
      metadata: expect.objectContaining({
        officialEodBulk: expect.objectContaining({
          fallbackReason: 'OFFICIAL_EOD_NOT_AVAILABLE',
          targetTradingDate: '2026-05-27',
        }),
        downstreamInstrumentCount: 2,
        downstreamSnapshotBridgeSuppressed: true,
      }),
    }));
    expect(result.status).toBe('COMPLETED');
  });

  it('keeps incremental no-change pipeline runs changed-only without daily eligibility fallback', async () => {
    const repository = {
      findActiveRun: jest.fn().mockResolvedValue(null),
    };
    const marketDataService = {
      syncScheduledRegion: jest.fn().mockResolvedValue({
        region: 'IN',
        assetType: 'STOCK',
        tradingDate: '2026-05-28',
        dataThroughDate: '2026-05-27',
        sourceFingerprint: 'scheduled-region:incremental-no-change',
        instrumentsProcessed: 0,
        rowsReceived: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        changedInstrumentIds: [],
        downstreamInstrumentIds: ['stock-1', 'stock-2'],
        downstreamEligibilitySource: 'exchange_file_summary',
        changedInstrumentCount: 0,
        dqStageEligible: false,
        warningCount: 0,
        warnings: [],
        errors: [],
      }),
      latestStoredCandleInfo: jest.fn().mockResolvedValue({
        syncState: {
          lastSummary: {
            region: 'IN',
            assetType: 'STOCK',
            tradingDate: '2026-05-28',
            dataThroughDate: '2026-05-27',
            sourceFingerprint: 'prior-full-daily-summary',
            changedInstrumentIds: [],
            downstreamInstrumentIds: ['stock-1', 'stock-2'],
            dqStageEligible: true,
            instrumentsProcessed: 2,
            rowsReceived: 2,
            rowsInserted: 0,
            rowsUpdated: 0,
            rowsSkipped: 0,
            rowsNoOp: 2,
            warningCount: 0,
            warnings: [],
            errors: [],
          },
        },
      }),
      listDailyRefreshEligibleInstrumentIds: jest.fn(),
    };
    const service = serviceWithMarketData(repository, marketDataService);
    const skippedStage = marketDataStageRecord({
      status: 'SKIPPED',
      totalCount: 0,
      processedCount: 0,
      succeededCount: 0,
      changedInstrumentCount: 0,
    });
    const recordSnapshot = jest.spyOn(service, 'recordMarketDataStageSnapshot')
      .mockResolvedValueOnce({ ...skippedStage, status: 'RUNNING', completedAt: null } as any)
      .mockResolvedValueOnce(skippedStage as any);
    const dagRun = jest.spyOn(service, 'executeDagPipeline');

    const result = await service.executeCommand({
      commandKey: 'PIPELINE_RUN_ALL',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'incremental_changed_only',
      batchSize: 100,
      offset: 0,
      idempotencyKey: 'manual-daily-incremental-no-change',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' }, new Date('2026-05-28T03:00:00.000Z'));

    expect(marketDataService.listDailyRefreshEligibleInstrumentIds).not.toHaveBeenCalled();
    expect(marketDataService.latestStoredCandleInfo).not.toHaveBeenCalled();
    expect(dagRun).not.toHaveBeenCalled();
    expect(recordSnapshot).toHaveBeenNthCalledWith(2, expect.objectContaining({
      status: 'SKIPPED',
      changedInstrumentIds: [],
      downstreamInstrumentIds: [],
      warnings: [],
      metadata: expect.objectContaining({
        downstreamInstrumentCount: 0,
        dagRunStatus: null,
        dagErrors: [],
      }),
    }));
    expect(result.status).toBe('SKIPPED');
  });

  it('marks the full daily pipeline FAILED when the DAG fully fails (FIX E1: FAILED not PARTIAL)', async () => {
    const repository = {
      findActiveRun: jest.fn().mockResolvedValue(null),
    };
    const marketDataService = {
      syncScheduledRegion: jest.fn().mockResolvedValue({
        region: 'IN',
        assetType: 'STOCK',
        tradingDate: '2026-05-25',
        dataThroughDate: '2026-05-25',
        sourceFingerprint: 'scheduled-region:downstream-fail',
        instrumentsProcessed: 1,
        rowsReceived: 1,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 1,
        changedInstrumentIds: [],
        downstreamInstrumentIds: ['stock-1'],
        changedInstrumentCount: 0,
        dqStageEligible: true,
        warningCount: 0,
        warnings: [],
        errors: [],
      }),
    };
    const service = serviceWithMarketData(repository, marketDataService);
    const partialStage = marketDataStageRecord({
      status: 'PARTIAL',
      totalCount: 1,
      processedCount: 1,
      succeededCount: 1,
      changedInstrumentCount: 0,
      unchangedCount: 1,
      errors: ['DATA_QUALITY: DQ failed'],
    });
    const recordSnapshot = jest.spyOn(service, 'recordMarketDataStageSnapshot')
      .mockResolvedValueOnce({ ...partialStage, status: 'RUNNING', completedAt: null, errors: [] } as any)
      .mockResolvedValueOnce(partialStage as any);
    jest.spyOn(service, 'executeDagPipeline')
      .mockResolvedValue({
        runStatus: 'FAILED',
        stages: {
          DATA_QUALITY: { status: 'FAILED', succeededCount: 0, failedCount: 1, durationMs: 50, cached: false, errors: ['DQ failed'] },
        },
        durationMs: 50,
      });

    const result = await service.executeCommand({
      commandKey: 'PIPELINE_RUN_ALL',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'full_latest_trading_date',
      batchSize: 100,
      offset: 0,
      idempotencyKey: 'manual-daily-downstream-failed',
      force: false,
    }, { requestedByUserId: 'local-manual-operator' }, new Date('2026-05-25T03:00:00.000Z'));

    // FIX E1: DAG runStatus='FAILED' → overall status='FAILED' (not 'PARTIAL').
    // PARTIAL is reserved for mixed-outcome runs (some stages succeeded, some failed).
    expect(recordSnapshot).toHaveBeenNthCalledWith(2, expect.objectContaining({
      status: 'FAILED',
      metadata: expect.objectContaining({
        dagRunStatus: 'FAILED',
      }),
    }));
    expect(result.status).toBe('FAILED');
  });

  it('FIX E2: executeDagPipeline throws PipelineCommandError when eligible-universe resolver returns empty', async () => {
    // E2: when changedInstrumentIds is empty and the resolver returns empty,
    // executeDagPipeline must throw (loud failure) rather than proceeding with null scope
    // (null scope = every scoped stage skips silently — confirmed live bug).
    const marketDataService = {
      listDailyRefreshEligibleInstrumentIds: jest.fn().mockResolvedValue({ instrumentIds: [] }),
    };
    const service = new PipelineOrchestrationService(
      {} as any, // repository — unused for this test
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, {} as any,
      marketDataService as any, // marketDataService with empty eligibility resolver
    );
    // Inject a mock runner — we should never reach it
    const mockRunner = { execute: jest.fn() };
    (service as any)._dagRunner = mockRunner;

    await expect(service.executeDagPipeline({
      tradingDate: '2026-05-25',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      trigger: 'manual',
      changedInstrumentIds: [], // empty — must trigger resolver
    })).rejects.toThrow(/Cannot resolve instrument scope/);

    expect(mockRunner.execute).not.toHaveBeenCalled();
  });

  it('FIX A: hasCompletedScheduledTerminal guard fires when SIGNAL_POSITION_LEDGER stage exists under market-intelligence pipelineKey', async () => {
    // Simulate: latestStages returns a COMPLETED SIGNAL_POSITION_LEDGER row from a prior DAG run
    // that wrote pipelineKey='market-intelligence' (after FIX A).
    // hasCompletedScheduledTerminal should return true and runScheduledPipelineCatchUpFromMarketDataSummary should return null.
    const repository = {
      latestStages: jest.fn().mockImplementation(async (query: any) => {
        if (query.stageKeys?.includes('SIGNAL_POSITION_LEDGER')) {
          return [{
            id: 'stage-spl-dag',
            pipelineRunId: 'run-dag-1',
            stageKey: 'SIGNAL_POSITION_LEDGER',
            stageOrder: 13,
            status: 'COMPLETED',
            idempotencyKey: 'dag-spl-idem',
            region: 'IN',
            assetType: 'STOCK',
            timeframe: '1d',
            dataThroughDate: '2026-06-01T00:00:00.000Z',
            changedInstrumentCount: 3,
            batchSize: 3, offset: 0, nextOffset: null, hasMore: false,
            totalCount: 3, processedCount: 3, succeededCount: 3,
            partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0,
            attemptCount: 1, cacheKey: null, cacheStatus: 'BYPASS', cacheExpiresAt: null,
            inputFingerprint: null, outputFingerprint: null,
            leaseOwner: null, leaseExpiresAt: null,
            startedAt: '2026-06-01T04:00:00.000Z', completedAt: '2026-06-01T04:01:00.000Z',
            durationMs: 60000, warnings: [], errors: [], metadata: null,
            createdAt: '2026-06-01T04:00:00.000Z', updatedAt: '2026-06-01T04:01:00.000Z',
          }];
        }
        return [];
      }),
    };
    const service = new PipelineOrchestrationService(repository as any);
    const dagSpy = jest.spyOn(service, 'executeDagPipeline');

    const result = await service.runScheduledPipelineCatchUpFromMarketDataSummary({
      region: 'IN',
      assetType: 'STOCK',
      tradingDate: '2026-06-01',
      dataThroughDate: '2026-06-01',
      sourceFingerprint: 'nse:market-data:fingerprint',
      changedInstrumentIds: ['stock-1', 'stock-2', 'stock-3'],
      downstreamInstrumentIds: ['stock-1', 'stock-2', 'stock-3'],
      dqStageEligible: true,
      instrumentsProcessed: 3,
      rowsReceived: 3, rowsInserted: 3, rowsUpdated: 0, rowsSkipped: 0, rowsNoOp: 0,
      changedInstrumentCount: 3, warningCount: 0, warnings: [], errors: [],
    }, new Date('2026-06-01T05:00:00.000Z'));

    // Guard fires: prior SIGNAL_POSITION_LEDGER stage exists → no re-fire
    expect(result).toBeNull();
    expect(dagSpy).not.toHaveBeenCalled();
  });

  it('executes historical exchange backfill through Pipeline Ops with resume evidence', async () => {
    const repository = {
      findActiveRun: jest.fn().mockResolvedValue(null),
    };
    const marketDataService = {
      runExchangeHistoricalBackfill: jest.fn().mockResolvedValue({
        runId: 'backfill-run-1',
        status: 'RUNNING',
        source: 'NSE',
        segment: 'CM',
        region: 'IN',
        assetType: 'STOCK',
        startDate: '2026-05-20',
        endDate: '2026-05-22',
        maxDates: 2,
        workerCount: 3,
        maxWorkers: 5,
        maxRetries: 2,
        totalDates: 2,
        pending: 1,
        running: 1,
        completed: 0,
        skipped: 1,
        failed: 0,
        notAvailable: 0,
        retryCount: 0,
        currentWorkers: 1,
        rowsRead: 20,
        rowsParsed: 18,
        rowsInserted: 5,
        rowsUpdated: 2,
        rowsNoOp: 3,
        rowsSkipped: 8,
        bseFills: 1,
        progressPercent: 50,
        estimatedRemainingMs: 12000,
        warnings: ['2026-05-20 already completed in SourceFileImport.'],
        errors: [],
        jobs: [
          {
            id: 'job-2026-05-20',
            tradingDate: '2026-05-20',
            dateRange: '2026-05-20',
            status: 'SKIPPED_ALREADY_IMPORTED',
            source: 'NSE',
            rowsImported: 0,
            rowsInserted: 0,
            rowsUpdated: 0,
            rowsNoOp: 0,
            rowsSkipped: 1,
            bseFills: 0,
            error: null,
            retryCount: 0,
            startedAt: null,
            completedAt: '2026-05-25T03:00:00.000Z',
            sourceFileImportId: null,
          },
          {
            id: 'job-2026-05-21',
            tradingDate: '2026-05-21',
            dateRange: '2026-05-21',
            status: 'RUNNING',
            source: 'NSE+BSE',
            rowsImported: 10,
            rowsInserted: 5,
            rowsUpdated: 2,
            rowsNoOp: 3,
            rowsSkipped: 8,
            bseFills: 1,
            error: null,
            retryCount: 0,
            startedAt: '2026-05-25T03:00:01.000Z',
            completedAt: null,
            sourceFileImportId: 'source-1',
          },
        ],
      }),
    };
    const service = serviceWithMarketData(repository, marketDataService);
    const recordSnapshot = jest.spyOn(service, 'recordMarketDataStageSnapshot')
      .mockResolvedValueOnce(marketDataStageRecord({ status: 'RUNNING', completedAt: null }) as any)
      .mockResolvedValueOnce(marketDataStageRecord({
        status: 'PARTIAL',
        dataThroughDate: '2026-05-21T00:00:00.000Z',
        totalCount: 2,
        processedCount: 1,
        succeededCount: 1,
        skippedCount: 9,
        hasMore: true,
        nextOffset: 0,
      }) as any);

    const result = await service.executeCommand({
      commandKey: 'MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 25,
      offset: 0,
      idempotencyKey: 'hist-1',
      params: {
        startDate: '2026-05-20',
        endDate: '2026-05-22',
        maxDates: 2,
        workerCount: 3,
        maxRetries: 2,
        includeBseFill: true,
      },
      force: false,
    } as any, { requestedByUserId: 'local-manual-operator' }, new Date('2026-05-25T03:00:00.000Z'));

    expect(marketDataService.runExchangeHistoricalBackfill).toHaveBeenCalledWith({
      region: 'IN',
      assetType: 'STOCK',
      startDate: '2026-05-20',
      endDate: '2026-05-22',
      maxDates: 2,
      workerCount: 3,
      maxRetries: 2,
      includeBseFill: true,
    });
    expect(recordSnapshot).toHaveBeenNthCalledWith(1, expect.objectContaining({
      operation: 'HISTORICAL_EXCHANGE_BACKFILL',
      status: 'RUNNING',
      triggerType: 'backfill',
    }));
    expect(recordSnapshot).toHaveBeenNthCalledWith(2, expect.objectContaining({
      operation: 'HISTORICAL_EXCHANGE_BACKFILL',
      status: 'RUNNING',
      dataThroughDate: '2026-05-20',
      totalCount: 2,
      processedCount: 1,
      succeededCount: 0,
      skippedCount: 1,
      hasMore: true,
      metadata: expect.objectContaining({
        commandKey: 'MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL',
        backfillRunId: 'backfill-run-1',
        workerCount: 3,
        currentWorkers: 1,
        progressPercent: 50,
        rowsRead: 20,
        rowsInserted: 5,
        rowsSkipped: 8,
        bseFills: 1,
      }),
    }));
    expect(result).toMatchObject({
      commandKey: 'MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL',
      stageKey: 'MARKET_DATA',
      status: 'PARTIAL',
    });
  });

  it('executes manual verified fundamentals import through Pipeline Ops and records verified evidence', async () => {
    const marketDataService = {
      importManualVerifiedFundamental: jest.fn().mockResolvedValue({
        status: 'IMPORTED',
        stockId: 'stock-1',
        symbol: 'TCS',
        source: 'MANUAL_VERIFIED',
        periodType: 'ANNUAL',
        periodEndDate: '2026-03-31T00:00:00.000Z',
        validatedAt: '2026-05-25T03:00:00.000Z',
        id: 'fundamental-1',
      }),
    };
    const service = serviceWithMarketData({}, marketDataService);
    const recordSnapshot = jest.spyOn(service, 'recordMarketDataStageSnapshot')
      .mockResolvedValueOnce(marketDataStageRecord({ status: 'RUNNING', completedAt: null }) as any)
      .mockResolvedValueOnce(marketDataStageRecord({ status: 'COMPLETED', totalCount: 1, processedCount: 1 }) as any);

    const result = await service.executeCommand({
      commandKey: 'MARKET_DATA_MANUAL_VERIFIED_FUNDAMENTALS_IMPORT',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 25,
      offset: 0,
      idempotencyKey: 'fund-1',
      params: {
        stockId: 'stock-1',
        periodType: 'ANNUAL',
        periodEndDate: '2026-03-31',
        marketCap: 1000000,
        sourceNote: 'NSE/BSE official filing',
        validatedBy: 'operator',
      },
      force: false,
    } as any, { requestedByUserId: 'local-manual-operator' }, new Date('2026-05-25T03:00:00.000Z'));

    expect(marketDataService.importManualVerifiedFundamental).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-1',
      region: 'IN',
      assetType: 'STOCK',
      periodType: 'ANNUAL',
      periodEndDate: '2026-03-31',
      sourceNote: 'NSE/BSE official filing',
      validatedBy: 'operator',
    }));
    expect(recordSnapshot).toHaveBeenNthCalledWith(2, expect.objectContaining({
      operation: 'MANUAL_VERIFIED_FUNDAMENTALS_IMPORT',
      status: 'COMPLETED',
      totalCount: 1,
      processedCount: 1,
      succeededCount: 1,
      metadata: expect.objectContaining({
        commandKey: 'MARKET_DATA_MANUAL_VERIFIED_FUNDAMENTALS_IMPORT',
        source: 'MANUAL_VERIFIED',
        stockId: 'stock-1',
        symbol: 'TCS',
        evidenceStatus: 'VERIFIED',
      }),
    }));
    expect(result).toMatchObject({
      commandKey: 'MARKET_DATA_MANUAL_VERIFIED_FUNDAMENTALS_IMPORT',
      status: 'COMPLETED',
    });
  });

  it('retries the latest failed Pipeline Ops stage by reusing its command metadata', async () => {
    const repository = {
      latestStages: jest.fn().mockResolvedValue([
        marketDataStageRecord({
          id: 'stage-failed-hist',
          status: 'FAILED',
          errors: ['download failed'],
          metadata: {
            commandKey: 'MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL',
            params: {
              startDate: '2026-05-22',
              endDate: '2026-05-22',
              maxDates: 1,
            },
          },
        }),
      ]),
    };
    const marketDataService = {
      runExchangeHistoricalBackfill: jest.fn().mockResolvedValue({
        runId: 'backfill-retry-run',
        status: 'COMPLETED',
        source: 'NSE',
        segment: 'CM',
        region: 'IN',
        assetType: 'STOCK',
        startDate: '2026-05-22',
        endDate: '2026-05-22',
        maxDates: 1,
        workerCount: 3,
        maxWorkers: 5,
        maxRetries: 2,
        totalDates: 1,
        pending: 0,
        running: 0,
        completed: 1,
        skipped: 0,
        failed: 0,
        notAvailable: 0,
        retryCount: 0,
        currentWorkers: 0,
        rowsRead: 3,
        rowsParsed: 3,
        rowsInserted: 1,
        rowsUpdated: 0,
        rowsNoOp: 2,
        rowsSkipped: 0,
        bseFills: 0,
        progressPercent: 100,
        estimatedRemainingMs: null,
        warnings: [],
        errors: [],
        jobs: [
          {
            id: 'job-2026-05-22',
            tradingDate: '2026-05-22',
            dateRange: '2026-05-22',
            status: 'COMPLETED',
            source: 'NSE',
            rowsImported: 3,
            rowsInserted: 1,
            rowsUpdated: 0,
            rowsNoOp: 2,
            rowsSkipped: 0,
            bseFills: 0,
            error: null,
            retryCount: 0,
            startedAt: '2026-05-25T03:10:00.000Z',
            completedAt: '2026-05-25T03:10:01.000Z',
            sourceFileImportId: 'source-2026-05-22',
          },
        ],
      }),
    };
    const service = serviceWithMarketData(repository, marketDataService);
    jest.spyOn(service, 'recordMarketDataStageSnapshot')
      .mockResolvedValueOnce(marketDataStageRecord({ status: 'RUNNING', completedAt: null }) as any)
      .mockResolvedValueOnce(marketDataStageRecord({ status: 'COMPLETED', totalCount: 1, processedCount: 1 }) as any);

    const result = await service.executeCommand({
      commandKey: 'PIPELINE_RETRY_FAILED_STAGE',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 25,
      offset: 0,
      idempotencyKey: 'retry-1',
      force: false,
    } as any, { requestedByUserId: 'local-manual-operator' }, new Date('2026-05-25T03:10:00.000Z'));

    expect(repository.latestStages).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      limit: 25,
    }));
    expect(marketDataService.runExchangeHistoricalBackfill).toHaveBeenCalledWith(expect.objectContaining({
      startDate: '2026-05-22',
      endDate: '2026-05-22',
      maxDates: 1,
    }));
    expect(result).toMatchObject({
      commandKey: 'MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL',
      status: 'COMPLETED',
    });
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
      startedAt: new Date('2026-05-25T03:00:00.000Z'),
      leaseOwner: expect.stringContaining('market-data:price_backfill:'),
      leaseMs: expect.any(Number),
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
    const dagRun = jest
      .spyOn(service, 'executeDagPipeline')
      .mockResolvedValue({ runStatus: 'COMPLETED', stages: {}, durationMs: 100 });

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
    expect(dagRun).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      tradingDate: '2026-05-25',
      trigger: 'scheduled',
      changedInstrumentIds: expect.arrayContaining(['stock-1', 'stock-2']),
    }));
  });
});
