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

function createInMemoryPipelineRepository() {
  const stages = new Map<string, any>();
  let runCounter = 0;
  let stageCounter = 0;

  const runRecord = (input: any, id = `run-${++runCounter}`) => ({
    id,
    pipelineKey: input.pipelineKey,
    region: input.region,
    assetType: input.assetType,
    timeframe: input.timeframe || '1d',
    triggerType: input.triggerType,
    status: input.status,
    idempotencyKey: input.idempotencyKey,
    dataThroughDate: input.dataThroughDate instanceof Date ? input.dataThroughDate.toISOString() : input.dataThroughDate ?? null,
    sourceFingerprint: input.sourceFingerprint ?? null,
    changedInstrumentCount: input.changedInstrumentCount ?? 0,
    totalCount: input.totalCount ?? 0,
    processedCount: input.processedCount ?? 0,
    succeededCount: input.succeededCount ?? 0,
    partialCount: input.partialCount ?? 0,
    failedCount: input.failedCount ?? 0,
    skippedCount: input.skippedCount ?? 0,
    unchangedCount: input.unchangedCount ?? 0,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
    metadata: input.metadata ?? null,
    startedAt: '2026-05-25T03:00:00.000Z',
    completedAt: input.completedAt instanceof Date ? input.completedAt.toISOString() : input.completedAt ?? null,
    durationMs: input.durationMs ?? null,
    createdAt: '2026-05-25T03:00:00.000Z',
    updatedAt: '2026-05-25T03:00:00.000Z',
  });

  const stageRecord = (input: any, existing: any = null) => ({
    id: existing?.id || `stage-${++stageCounter}`,
    pipelineRunId: input.pipelineRunId ?? existing?.pipelineRunId ?? `run-${stageCounter}`,
    stageKey: input.stageKey ?? existing?.stageKey,
    stageOrder: input.stageOrder ?? existing?.stageOrder ?? 1,
    status: input.status ?? existing?.status ?? 'PENDING',
    idempotencyKey: input.idempotencyKey ?? existing?.idempotencyKey,
    region: input.region ?? existing?.region ?? 'IN',
    assetType: input.assetType ?? existing?.assetType ?? 'STOCK',
    timeframe: input.timeframe ?? existing?.timeframe ?? '1d',
    dataThroughDate: input.dataThroughDate instanceof Date ? input.dataThroughDate.toISOString() : input.dataThroughDate ?? existing?.dataThroughDate ?? null,
    inputFingerprint: input.inputFingerprint ?? existing?.inputFingerprint ?? null,
    outputFingerprint: input.outputFingerprint ?? existing?.outputFingerprint ?? null,
    changedInstrumentCount: input.changedInstrumentCount ?? existing?.changedInstrumentCount ?? 0,
    batchSize: input.batchSize ?? existing?.batchSize ?? 25,
    offset: input.offset ?? existing?.offset ?? 0,
    nextOffset: input.nextOffset === undefined ? existing?.nextOffset ?? null : input.nextOffset,
    hasMore: input.hasMore ?? existing?.hasMore ?? false,
    totalCount: input.totalCount ?? existing?.totalCount ?? 0,
    processedCount: input.processedCount ?? existing?.processedCount ?? 0,
    succeededCount: input.succeededCount ?? existing?.succeededCount ?? 0,
    partialCount: input.partialCount ?? existing?.partialCount ?? 0,
    failedCount: input.failedCount ?? existing?.failedCount ?? 0,
    skippedCount: input.skippedCount ?? existing?.skippedCount ?? 0,
    unchangedCount: input.unchangedCount ?? existing?.unchangedCount ?? 0,
    attemptCount: existing?.attemptCount ?? 1,
    cacheKey: input.cacheKey ?? existing?.cacheKey ?? null,
    cacheStatus: input.cacheStatus ?? existing?.cacheStatus ?? 'BYPASS',
    cacheExpiresAt: input.cacheExpiresAt ?? existing?.cacheExpiresAt ?? null,
    leaseOwner: input.leaseOwner === undefined ? existing?.leaseOwner ?? null : input.leaseOwner,
    leaseExpiresAt: input.leaseMs ? '2026-05-25T03:10:00.000Z' : input.leaseExpiresAt === undefined ? existing?.leaseExpiresAt ?? null : input.leaseExpiresAt,
    startedAt: existing?.startedAt ?? '2026-05-25T03:00:00.000Z',
    completedAt: input.completedAt instanceof Date ? input.completedAt.toISOString() : input.completedAt ?? existing?.completedAt ?? null,
    durationMs: input.durationMs ?? existing?.durationMs ?? null,
    warnings: input.warnings ?? existing?.warnings ?? [],
    errors: input.errors ?? existing?.errors ?? [],
    metadata: input.metadata ?? existing?.metadata ?? null,
    createdAt: existing?.createdAt ?? '2026-05-25T03:00:00.000Z',
    updatedAt: '2026-05-25T03:00:00.000Z',
  });

  return {
    upsertRun: jest.fn(async (input: any) => runRecord(input)),
    completeRun: jest.fn(async (input: any) => runRecord(input, 'completed-run')),
    upsertStage: jest.fn(async (input: any) => {
      const stage = stageRecord(input);
      stages.set(stage.idempotencyKey, stage);
      return stage;
    }),
    acquireStageLease: jest.fn(async (input: any) => {
      const stage = stages.get(input.idempotencyKey);
      if (!stage) return { acquired: false, reason: 'STAGE_NOT_FOUND', stage: null };
      const leased = stageRecord({
        idempotencyKey: input.idempotencyKey,
        status: 'RUNNING',
        leaseOwner: input.leaseOwner,
        leaseMs: input.leaseMs,
      }, stage);
      stages.set(input.idempotencyKey, leased);
      return { acquired: true, reason: 'ACQUIRED', stage: leased };
    }),
    recordStageProgress: jest.fn(async (input: any) => {
      const current = stages.get(input.idempotencyKey);
      const stage = stageRecord(input, current);
      stages.set(input.idempotencyKey, stage);
      return stage;
    }),
    completeStage: jest.fn(async (input: any) => {
      const current = stages.get(input.idempotencyKey);
      const stage = stageRecord({ ...input, leaseOwner: null, leaseExpiresAt: null }, current);
      stages.set(input.idempotencyKey, stage);
      return stage;
    }),
    latestStages: jest.fn().mockResolvedValue([]),
  };
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
    const catchUp = jest.spyOn(service, 'runScheduledPipelineCatchUpFromMarketDataSummary')
      .mockResolvedValue({
        status: 'COMPLETED',
        pipelineRunId: 'run-dq',
        stageRunId: 'stage-dq',
        stageKey: 'DATA_QUALITY',
        scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
        triggerType: 'scheduled',
        dataThroughDate: '2026-05-25',
        inputFingerprint: 'dq-input',
        outputFingerprint: 'dq-output',
        batch: { totalInstrumentCount: 2, processedCount: 2, batchSize: 2, nextOffset: null, hasMore: false },
        counts: { totalCount: 2, processedCount: 2, succeededCount: 2, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0 },
        warnings: [],
        errors: [],
        startedAt: '2026-05-25T03:00:02.000Z',
        completedAt: '2026-05-25T03:00:03.000Z',
      } as any);

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
    expect(catchUp).toHaveBeenCalledWith(expect.objectContaining({
      dataThroughDate: '2026-05-25',
      downstreamInstrumentIds: ['stock-1', 'stock-2'],
      dqStageEligible: true,
    }), expect.any(Date), { allowCompletedTerminal: true });
    expect(result).toMatchObject({
      commandKey: 'PIPELINE_RUN_ALL',
      stageKey: 'MARKET_DATA',
      status: 'COMPLETED',
      counts: {
        totalCount: 2,
        processedCount: 2,
      },
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
    jest.spyOn(service, 'runScheduledPipelineCatchUpFromMarketDataSummary')
      .mockResolvedValue({
        status: 'COMPLETED',
        pipelineRunId: 'run-dq-retry',
        stageRunId: 'stage-dq-retry',
        stageKey: 'DATA_QUALITY',
        scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
        triggerType: 'scheduled',
        dataThroughDate: '2026-05-25',
        inputFingerprint: 'dq-input-retry',
        outputFingerprint: 'dq-output-retry',
        batch: { totalInstrumentCount: 1, processedCount: 1, batchSize: 1, nextOffset: null, hasMore: false },
        counts: { totalCount: 1, processedCount: 1, succeededCount: 1, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0 },
        warnings: [],
        errors: [],
        startedAt: '2026-05-25T03:05:01.000Z',
        completedAt: '2026-05-25T03:05:02.000Z',
      } as any);

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
    const catchUp = jest.spyOn(service, 'runScheduledPipelineCatchUpFromMarketDataSummary')
      .mockResolvedValue({
        status: 'COMPLETED',
        pipelineRunId: 'run-dq-no-op',
        stageRunId: 'stage-dq-no-op',
        stageKey: 'DATA_QUALITY',
        scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
        triggerType: 'scheduled',
        dataThroughDate: '2026-05-25',
        inputFingerprint: 'dq-input',
        outputFingerprint: 'dq-output',
        batch: { totalInstrumentCount: 2, processedCount: 2, batchSize: 2, nextOffset: null, hasMore: false },
        counts: { totalCount: 2, processedCount: 2, succeededCount: 2, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0 },
        warnings: [],
        errors: [],
        startedAt: '2026-05-25T03:00:02.000Z',
        completedAt: '2026-05-25T03:00:03.000Z',
      } as any);

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

    expect(catchUp).toHaveBeenCalledWith(expect.objectContaining({
      changedInstrumentIds: [],
      downstreamInstrumentIds: ['stock-1', 'stock-2'],
      dqStageEligible: true,
    }), expect.any(Date), { allowCompletedTerminal: true });
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
    const catchUp = jest.spyOn(service, 'runScheduledPipelineCatchUpFromMarketDataSummary')
      .mockResolvedValue({
        status: 'COMPLETED',
        pipelineRunId: 'run-dq-current',
        stageRunId: 'stage-dq-current',
        stageKey: 'DATA_QUALITY',
        scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
        triggerType: 'scheduled',
        dataThroughDate: '2026-05-27',
        inputFingerprint: 'dq-input-current',
        outputFingerprint: 'dq-output-current',
        batch: { totalInstrumentCount: 2, processedCount: 2, batchSize: 2, nextOffset: null, hasMore: false },
        counts: { totalCount: 2, processedCount: 2, succeededCount: 2, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0 },
        warnings: [],
        errors: [],
        startedAt: '2026-05-28T03:00:02.000Z',
        completedAt: '2026-05-28T03:00:03.000Z',
      } as any);

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
    expect(catchUp).toHaveBeenCalledWith(expect.objectContaining({
      changedInstrumentIds: [],
      downstreamInstrumentIds: ['stock-1', 'stock-2'],
      downstreamEligibilitySource: 'LATEST_PRICE',
      dqStageEligible: true,
    }), expect.any(Date), { allowCompletedTerminal: true });
    expect(recordSnapshot).toHaveBeenNthCalledWith(2, expect.objectContaining({
      status: 'COMPLETED',
      changedInstrumentIds: [],
      downstreamInstrumentIds: ['stock-1', 'stock-2'],
      warnings: [],
      metadata: expect.objectContaining({
        rowsInserted: 0,
        rowsUpdated: 0,
        downstreamInstrumentCount: 2,
        downstreamEligibilitySource: 'LATEST_PRICE',
        downstreamStatus: 'COMPLETED',
        downstreamAlreadyExecuted: true,
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
    const catchUp = jest.spyOn(service, 'runScheduledPipelineCatchUpFromMarketDataSummary')
      .mockResolvedValue({
        status: 'COMPLETED',
        pipelineRunId: 'run-dq-not-available',
        stageRunId: 'stage-dq-not-available',
        stageKey: 'DATA_QUALITY',
        scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
        triggerType: 'scheduled',
        dataThroughDate: '2026-05-26',
        inputFingerprint: 'dq-input-not-available',
        outputFingerprint: 'dq-output-not-available',
        batch: { totalInstrumentCount: 2, processedCount: 2, batchSize: 2, nextOffset: null, hasMore: false },
        counts: { totalCount: 2, processedCount: 2, succeededCount: 2, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0 },
        warnings: [],
        errors: [],
        startedAt: '2026-05-27T13:00:02.000Z',
        completedAt: '2026-05-27T13:00:03.000Z',
      } as any);

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
    expect(catchUp).toHaveBeenCalledWith(expect.objectContaining({
      dataThroughDate: '2026-05-26',
      downstreamInstrumentIds: ['stock-1', 'stock-2'],
      downstreamEligibilitySource: 'LATEST_PRICE',
      dqStageEligible: true,
    }), expect.any(Date), { allowCompletedTerminal: true });
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
        marketDataAvailabilityStatus: 'NOT_AVAILABLE',
        downstreamInstrumentCount: 2,
        downstreamEligibilitySource: 'LATEST_PRICE',
        downstreamStatus: 'COMPLETED',
        downstreamAlreadyExecuted: true,
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
    const catchUp = jest.spyOn(service, 'runScheduledPipelineCatchUpFromMarketDataSummary');

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
    expect(catchUp).not.toHaveBeenCalled();
    expect(recordSnapshot).toHaveBeenNthCalledWith(2, expect.objectContaining({
      status: 'SKIPPED',
      changedInstrumentIds: [],
      downstreamInstrumentIds: [],
      warnings: [],
      metadata: expect.objectContaining({
        downstreamInstrumentCount: 0,
        downstreamStatus: null,
        downstreamAlreadyExecuted: false,
      }),
    }));
    expect(result.status).toBe('SKIPPED');
  });

  it('marks the full daily pipeline partial when downstream catch-up fails', async () => {
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
    jest.spyOn(service, 'runScheduledPipelineCatchUpFromMarketDataSummary')
      .mockResolvedValue({
        status: 'FAILED',
        pipelineRunId: 'run-dq-failed',
        stageRunId: 'stage-dq-failed',
        stageKey: 'DATA_QUALITY',
        scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
        triggerType: 'scheduled',
        dataThroughDate: '2026-05-25',
        inputFingerprint: 'dq-input',
        outputFingerprint: null,
        batch: { totalInstrumentCount: 1, processedCount: 0, batchSize: 1, nextOffset: null, hasMore: false },
        counts: { totalCount: 1, processedCount: 0, succeededCount: 0, partialCount: 0, failedCount: 1, skippedCount: 0, unchangedCount: 0 },
        warnings: [],
        errors: ['DQ failed'],
        startedAt: '2026-05-25T03:00:02.000Z',
        completedAt: '2026-05-25T03:00:03.000Z',
      } as any);

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

    expect(recordSnapshot).toHaveBeenNthCalledWith(2, expect.objectContaining({
      status: 'PARTIAL',
      errors: ['DATA_QUALITY: DQ failed'],
      metadata: expect.objectContaining({
        downstreamStatus: 'FAILED',
        downstreamErrors: ['DATA_QUALITY: DQ failed'],
      }),
    }));
    expect(result.status).toBe('PARTIAL');
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
    jest.spyOn(service, 'runScheduledMarketContextStage').mockResolvedValue({
      status: 'COMPLETED',
      pipelineRunId: 'run-market-context-after-calibration',
      stageRunId: 'stage-market-context-after-calibration',
      stageKey: 'MARKET_CONTEXT',
      scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      inputFingerprint: 'market-context-input',
      outputFingerprint: 'market-context-output',
      batch: { totalInstrumentCount: 2, processedCount: 1, batchSize: 2, nextOffset: null, hasMore: false },
      counts: { totalCount: 1, processedCount: 1, succeededCount: 1, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0 },
      warnings: [],
      errors: [],
      startedAt: '2026-05-25T03:00:03.000Z',
      completedAt: '2026-05-25T03:00:04.000Z',
      downstream: null,
    });

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
    expect(response.downstreamRawSignals?.downstreamSignalCalibration?.downstream?.stageKey).toBe('EARNINGS_INTELLIGENCE_REFRESH');
    expect(response.batch.totalInstrumentCount).toBe(2);
    expect(response.counts.processedCount).toBe(2);
    expect(evaluateScheduledStage).toHaveBeenCalledWith(expect.objectContaining({
      instrumentIds: ['stock-1', 'stock-2'],
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 2,
      onProgress: expect.any(Function),
    }));
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
    expect(repository.recordStageProgress.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(repository.recordStageProgress.mock.calls.map(([input]) => input)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        status: 'RUNNING',
        totalCount: 2,
        processedCount: 2,
        succeededCount: 2,
      }),
    ]));
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

  it('persists scheduled Data Quality per-chunk progress and lease renewal', async () => {
    const repository = createInMemoryPipelineRepository();
    const changedInstrumentIds = Array.from({ length: 150 }, (_value, index) => `stock-${String(index + 1).padStart(3, '0')}`);
    const evaluateScheduledStage = jest.fn(async (request: any) => {
      await request.onProgress({
        totalCount: 150,
        processedCount: 100,
        evaluatedCount: 100,
        failedCount: 0,
        skippedCount: 0,
        warnings: [],
        errors: [],
        nextOffset: 100,
        hasMore: true,
        metadata: { chunkIndex: 1, totalChunks: 2, chunkStatus: 'COMPLETED' },
      });
      await request.onProgress({
        totalCount: 150,
        processedCount: 150,
        evaluatedCount: 100,
        failedCount: 50,
        skippedCount: 0,
        warnings: ['chunk 2/2 offset 100 failed for 50 instruments: Prisma oversized read simulation'],
        errors: ['chunk 2/2 offset 100 failed for 50 instruments: Prisma oversized read simulation'],
        nextOffset: null,
        hasMore: false,
        metadata: { chunkIndex: 2, totalChunks: 2, chunkStatus: 'FAILED' },
      });
      return {
        processedCount: 150,
        totalCount: 150,
        evaluatedCount: 100,
        failedCount: 50,
        skippedCount: 0,
        warnings: ['chunk 2/2 offset 100 failed for 50 instruments: Prisma oversized read simulation'],
        errors: ['chunk 2/2 offset 100 failed for 50 instruments: Prisma oversized read simulation'],
        durationMs: 100,
      };
    });
    const service = new PipelineOrchestrationService(repository as any, {
      evaluateScheduledStage,
      evaluate: jest.fn(),
    } as any);
    jest.spyOn(service, 'runScheduledRawSignalsStage').mockResolvedValue({
      status: 'SKIPPED',
      pipelineRunId: 'run-raw',
      stageRunId: 'stage-raw',
      stageKey: 'RAW_SIGNALS',
      scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      inputFingerprint: 'raw-input',
      outputFingerprint: 'raw-output',
      batch: { totalInstrumentCount: 150, processedCount: 0, batchSize: 100, nextOffset: null, hasMore: false },
      counts: { totalCount: 150, processedCount: 0, succeededCount: 0, partialCount: 0, failedCount: 0, skippedCount: 150, unchangedCount: 0 },
      warnings: ['Raw signals skipped in progress test.'],
      errors: [],
      startedAt: '2026-05-25T03:00:01.000Z',
      completedAt: '2026-05-25T03:00:02.000Z',
    } as any);

    const response = await service.runScheduledDataQualityStage({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      sourceFingerprint: 'md-source',
      changedInstrumentIds,
      batchSize: 100,
      schedulerRunStartedAt: '2026-05-25T03:00:00.000Z',
    }, new Date('2026-05-25T03:00:00.000Z'));

    const progressInputs = repository.recordStageProgress.mock.calls.map(([input]) => input);
    expect(response.status).toBe('PARTIAL');
    expect(evaluateScheduledStage).toHaveBeenCalledWith(expect.objectContaining({
      instrumentIds: changedInstrumentIds,
      batchSize: 100,
      onProgress: expect.any(Function),
    }));
    expect(progressInputs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        status: 'RUNNING',
        processedCount: 100,
        succeededCount: 100,
        failedCount: 0,
        skippedCount: 0,
        nextOffset: 100,
        hasMore: true,
        leaseMs: expect.any(Number),
        metadata: expect.objectContaining({ chunkIndex: 1, totalChunks: 2 }),
      }),
      expect.objectContaining({
        status: 'RUNNING',
        processedCount: 150,
        succeededCount: 100,
        failedCount: 50,
        skippedCount: 0,
        nextOffset: null,
        hasMore: false,
        errors: ['chunk 2/2 offset 100 failed for 50 instruments: Prisma oversized read simulation'],
        leaseMs: expect.any(Number),
        metadata: expect.objectContaining({ chunkIndex: 2, totalChunks: 2, chunkStatus: 'FAILED' }),
      }),
    ]));
    expect(repository.completeStage).toHaveBeenCalledWith(expect.objectContaining({
      status: 'PARTIAL',
      processedCount: 150,
      succeededCount: 100,
      failedCount: 50,
      skippedCount: 0,
      warnings: ['chunk 2/2 offset 100 failed for 50 instruments: Prisma oversized read simulation'],
      errors: ['chunk 2/2 offset 100 failed for 50 instruments: Prisma oversized read simulation'],
    }));
  });

  it('fans out raw signals when scheduled Data Quality is partial with successful readiness output', async () => {
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
    } as any, {} as any);
    const downstreamRawSignals = {
      status: 'SKIPPED',
      stageKey: 'RAW_SIGNALS',
      stageRunId: 'stage-raw',
      pipelineRunId: 'run-raw',
      scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      inputFingerprint: 'raw-input',
      outputFingerprint: 'raw-output',
      batch: { totalInstrumentCount: 2, processedCount: 2, batchSize: 2, nextOffset: null, hasMore: false },
      counts: { totalCount: 2, processedCount: 2, succeededCount: 0, partialCount: 0, failedCount: 0, skippedCount: 2, unchangedCount: 0 },
      warnings: ['No raw signals generated for DQ-ready subset.'],
      errors: [],
      startedAt: '2026-05-25T03:00:03.000Z',
      completedAt: '2026-05-25T03:00:04.000Z',
    };
    const rawSignalsFanout = jest.spyOn(service, 'runScheduledRawSignalsStage')
      .mockResolvedValue(downstreamRawSignals as any);

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
    expect(response.downstreamRawSignals).toBe(downstreamRawSignals);
    expect(rawSignalsFanout).toHaveBeenCalledWith(expect.objectContaining({
      sourceFingerprint: expect.any(String),
      changedInstrumentIds: ['stock-1', 'stock-2'],
      upstreamStageRunId: 'stage-dq-partial',
    }));
    expect(repository.upsertRun).toHaveBeenCalledTimes(1);
    expect(repository.upsertStage).toHaveBeenCalledTimes(1);
  });

  it('runs the scheduled daily chain from Data Quality through Signal Position Ledger for one trading date', async () => {
    const repository = createInMemoryPipelineRepository();
    const evaluateScheduledStage = jest.fn().mockResolvedValue({
      processedCount: 2,
      totalCount: 2,
      evaluatedCount: 2,
      failedCount: 0,
      skippedCount: 0,
      warnings: [],
    });
    const signalRun = jest.fn().mockResolvedValue({
      generated: 2,
      skipped: 0,
      errors: [],
      warnings: [],
      processedCount: 2,
      totalCount: 2,
      generatedCount: 2,
      updatedCount: 0,
      noOpCount: 0,
      skippedCount: 0,
      failedCount: 0,
      dataQuality: { excludedByDataQuality: 0, missingQualityEvaluationCount: 0 },
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
      calibratedCount: 2,
      passthroughCount: 0,
      skippedCount: 0,
      failedCount: 0,
      outOfScopeSkipped: 0,
      calibrationEvidence: { evidenceStatus: 'SUFFICIENT' },
      calibrationReadiness: { status: 'USABLE' },
    });
    const marketContext = {
      run: jest.fn().mockResolvedValue({ status: 'success' }),
      runAsOf: jest.fn().mockResolvedValue({ status: 'success' }),
      refreshSectorSnapshots: jest.fn().mockResolvedValue({
        totalCount: 2,
        processedCount: 2,
        savedCount: 2,
        skippedCount: 0,
        warnings: [],
        errors: [],
        snapshotDate: '2026-05-25T00:00:00.000Z',
        dataThroughDate: '2026-05-25T00:00:00.000Z',
        status: 'COMPLETED',
        sectors: [{ sector: 'IT' }, { sector: 'Energy' }],
      }),
    };
    const smartMoneyRun = jest.fn().mockResolvedValue({
      totalCount: 2,
      processedCount: 2,
      generatedCount: 2,
      failedCount: 0,
      skippedCount: 0,
      warnings: [],
      errors: [],
      byRange: {},
      hasMore: false,
      nextOffset: null,
    });
    const historicalGenerate = jest.fn().mockResolvedValue({
      market: { inserted: 1, updated: 0, skipped: 0 },
      sectors: { inserted: 1, updated: 0, skipped: 0 },
      countries: { inserted: 0, updated: 0, skipped: 0 },
      smartMoney: { inserted: 1, updated: 0, skipped: 0 },
      dataQuality: { inserted: 1, updated: 0, skipped: 0 },
      warnings: [],
      snapshotDate: '2026-05-25',
    });
    const signalQualityRecalculate = jest.fn().mockResolvedValue({
      totalCount: 2,
      processedCount: 2,
      skippedCount: 0,
      failedCount: 0,
      warnings: [],
      selectedHorizon: '20D',
      evidenceUsability: 'USABLE',
      matureSignalsInBatch: 2,
      notYetMatureInBatch: 0,
      evaluatedCount: 2,
      unevaluatedCount: 0,
      missingPriceHistoryCount: 0,
      outcomesPersisted: true,
      message: 'ok',
      hasMore: false,
      nextOffset: null,
    });
    const strategyEvaluate = jest.fn().mockResolvedValue({
      totalCount: 2,
      processedCount: 2,
      generatedCount: 2,
      failedCount: 0,
      skippedCount: 0,
      warnings: [],
      results: [{ id: 'decision-1' }, { id: 'decision-2' }],
      hasMore: false,
      nextOffset: null,
    });
    const researchRefresh = jest.fn().mockResolvedValue({
      generatedAt: '2026-05-25T03:00:00.000Z',
      dataGaps: [],
      marketReadiness: { marketGate: 'OPEN', marketCondition: 'RISK_ON' },
      researchPriorities: { tradeCandidates: [{ id: 'candidate-1' }], watchCandidates: [], avoidCandidates: [] },
    });
    const todayReviewRun = jest.fn().mockResolvedValue({
      run: {
        id: 'today-review-1',
        status: 'COMPLETED',
        trustStatus: 'READY',
        dataThroughDate: '2026-05-25',
        candidateCounts: { highlyTrusted: 2 },
        warnings: [],
      },
    });
    const ledgerRefresh = jest.fn().mockResolvedValue({
      runId: 'ledger-refresh-1',
      status: 'COMPLETED',
      totalCount: 2,
      processedCount: 2,
      succeededCount: 2,
      failedCount: 0,
      skippedCount: 0,
      warnings: [],
      errors: [],
      materializedRowCount: 2,
      updatedAt: '2026-05-25T03:00:00.000Z',
    });
    const earningsRefresh = jest.fn().mockResolvedValue({
      status: 'COMPLETED',
      snapshotDate: '2026-05-25T00:00:00.000Z',
      dataThroughDate: '2026-05-25T00:00:00.000Z',
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
      categories: {},
    });
    const marketPulseRefresh = jest.fn().mockResolvedValue({
      id: 'pulse-snap-1',
      status: 'FRESH',
      marketHealthScore: 75,
      marketHealthLabel: 'HEALTHY',
      warningsJson: [],
      dataThroughDate: new Date('2026-05-25T00:00:00.000Z'),
    });
    const stockInterestRefresh = jest.fn().mockResolvedValue({
      status: 'COMPLETED',
      scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d' },
      snapshotDate: '2026-05-25',
      dataThroughDate: '2026-05-25',
      generatedAt: '2026-05-25T03:00:00.000Z',
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
      categories: {},
    });
    const marketScanRefresh = jest.fn().mockResolvedValue({
      tradingDate: '2026-05-25',
      totalInserted: 6,
      scanTypes: ['movers-1d', 'movers-5d', 'movers-1m', '52w-high', '52w-low', 'volume-spike'],
      warnings: [],
      errors: [],
    });
    const service = new PipelineOrchestrationService(
      repository as any,
      { evaluateScheduledStage, evaluate: jest.fn() } as any,
      { run: signalRun } as any,
      { run: signalCalibrationRun } as any,
      marketContext as any,
      { run: smartMoneyRun } as any,
      { generate: historicalGenerate } as any,
      { recalculate: signalQualityRecalculate } as any,
      { evaluate: strategyEvaluate } as any,
      { refreshOverview: researchRefresh } as any,
      { run: todayReviewRun } as any,
      { refreshActiveRows: ledgerRefresh } as any,
      { refreshMarketScanSnapshots: marketScanRefresh } as any,
      { refreshSnapshot: marketPulseRefresh } as any,
      { refreshSnapshots: earningsRefresh } as any,
      { refreshSnapshots: stockInterestRefresh } as any,
      { refreshWorkbenchSnapshots: jest.fn().mockResolvedValue({ totalCount: 0, processedCount: 0, succeededCount: 0, failedCount: 0, skippedCount: 0, warnings: [], errors: [] }) } as any
    );

    const response = await service.runScheduledDataQualityStage({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      sourceFingerprint: 'exchange-file-fixture',
      changedInstrumentIds: ['stock-1', 'stock-2'],
      batchSize: 2,
      schedulerRunStartedAt: '2026-05-25T03:00:00.000Z',
    }, new Date('2026-05-25T03:00:00.000Z'));

    const raw = response.downstreamRawSignals;
    const calibration = raw?.downstreamSignalCalibration;
    const downstreamKeys: string[] = [];
    let node: any = calibration?.downstream;
    while (node) {
      downstreamKeys.push(node.stageKey);
      node = node.downstream;
    }

    expect(response.status).toBe('COMPLETED');
    expect(raw?.stageKey).toBe('RAW_SIGNALS');
    expect(calibration?.stageKey).toBe('SIGNAL_CALIBRATION');
    expect(downstreamKeys).toEqual([
      'EARNINGS_INTELLIGENCE_REFRESH',
      'MARKET_CONTEXT',
      'MARKET_CONTEXT_SNAPSHOT_REFRESH',
      'SMART_MONEY',
      'CONTEXT_SNAPSHOTS',
      'SIGNAL_QUALITY',
      'STRATEGY_DECISION',
      'RESEARCH_PROJECTION',
      'TODAY_REVIEW',
      'SIGNAL_POSITION_LEDGER',
      'SECTOR_INTELLIGENCE_REFRESH',
      'MARKET_PULSE_REFRESH',
      'STOCK_INTEREST_REFRESH',
      'WORKBENCH_REFRESH',
      'MARKET_SCAN_REFRESH',
    ]);
    expect(evaluateScheduledStage).toHaveBeenCalledTimes(1);
    expect(signalRun).toHaveBeenCalledTimes(1);
    expect(signalCalibrationRun).toHaveBeenCalledTimes(1);
    expect(strategyEvaluate).toHaveBeenCalledTimes(1);
    expect(todayReviewRun).toHaveBeenCalledTimes(1);
    expect(ledgerRefresh).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      limit: 2,
      offset: 0,
    }), { force: true, wait: true });
  });

  it('fans out calibration with explicit skipped evidence when scheduled Raw Signals is skipped', async () => {
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
    const service = new PipelineOrchestrationService(repository as any, {} as any, { run: signalRun } as any, {} as any);
    const downstreamCalibration = {
      status: 'SKIPPED',
      stageKey: 'SIGNAL_CALIBRATION',
      stageRunId: null,
      pipelineRunId: null,
      scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      inputFingerprint: 'scheduled-signal-calibration:empty-input',
      outputFingerprint: null,
      batch: { totalInstrumentCount: 2, processedCount: 0, batchSize: 2, nextOffset: null, hasMore: false },
      counts: { totalCount: 2, processedCount: 0, succeededCount: 0, partialCount: 0, failedCount: 0, skippedCount: 2, unchangedCount: 0 },
      warnings: ['Raw Signals produced no persisted output; calibration skipped explicitly.'],
      errors: [],
      startedAt: null,
      completedAt: null,
    };
    const calibrationFanout = jest.spyOn(service, 'runScheduledSignalCalibrationStage')
      .mockResolvedValue(downstreamCalibration as any);

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
    expect(response.downstreamSignalCalibration).toBe(downstreamCalibration);
    expect(calibrationFanout).toHaveBeenCalledWith(expect.objectContaining({
      sourceFingerprint: expect.any(String),
      changedInstrumentIds: ['stock-1', 'stock-2'],
      upstreamStageRunId: 'stage-raw-skipped',
    }));
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
      processedCount: 2,
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
    jest.spyOn(service, 'runScheduledMarketContextStage').mockResolvedValue({
      status: 'COMPLETED',
      pipelineRunId: 'run-market-context-after-calibration',
      stageRunId: 'stage-market-context-after-calibration',
      stageKey: 'MARKET_CONTEXT',
      scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      inputFingerprint: 'market-context-input',
      outputFingerprint: 'market-context-output',
      batch: { totalInstrumentCount: 2, processedCount: 1, batchSize: 2, nextOffset: null, hasMore: false },
      counts: { totalCount: 1, processedCount: 1, succeededCount: 1, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0 },
      warnings: [],
      errors: [],
      startedAt: '2026-05-25T03:00:03.000Z',
      completedAt: '2026-05-25T03:00:04.000Z',
      downstream: null,
    });

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
    expect(response.downstreamSignalCalibration?.counts.processedCount).toBe(2);
    expect(response.downstreamSignalCalibration?.downstream?.stageKey).toBe('EARNINGS_INTELLIGENCE_REFRESH');
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
    expect(repository.completeStage).toHaveBeenNthCalledWith(2, expect.objectContaining({
      processedCount: 2,
      skippedCount: 1,
      status: 'PARTIAL',
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
      { run: marketRun, runAsOf: jest.fn().mockResolvedValue({ status: 'success' }) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    const snapshotDownstream = {
      status: 'COMPLETED',
      pipelineRunId: 'run-mcs',
      stageRunId: 'stage-mcs',
      stageKey: 'MARKET_CONTEXT_SNAPSHOT_REFRESH',
      scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      inputFingerprint: 'mcs-input',
      outputFingerprint: 'mcs-output',
      batch: { totalInstrumentCount: 2, processedCount: 2, batchSize: 2, nextOffset: null, hasMore: false },
      counts: { totalCount: 1, processedCount: 1, succeededCount: 1, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0 },
      warnings: [],
      errors: [],
      startedAt: '2026-05-25T03:00:04.000Z',
      completedAt: '2026-05-25T03:00:05.000Z',
    } as any;
    const snapshotSpy = jest.spyOn(service, 'runScheduledMarketContextSnapshotStage').mockResolvedValue(snapshotDownstream);
    const smartMoneySpy = jest.spyOn(service, 'runScheduledSmartMoneyStage');

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
    expect(response.downstream?.stageKey).toBe('MARKET_CONTEXT_SNAPSHOT_REFRESH');
    expect(marketRun).toHaveBeenCalledWith('IN');
    expect(snapshotSpy).toHaveBeenCalledWith(expect.objectContaining({
      sourceFingerprint: 'market-context-output',
      changedInstrumentIds: ['stock-2', 'stock-1'],
      upstreamStageRunId: 'stage-market-context',
    }));
    // smartMoneySpy is not called directly from runScheduledMarketContextStage anymore
    expect(smartMoneySpy).not.toHaveBeenCalled();
    expect(repository.upsertStage).toHaveBeenCalledWith(expect.objectContaining({
      stageKey: 'MARKET_CONTEXT',
      stageOrder: 6,
    }));
  });

  it('drains all changed-instrument Smart Money batches and keeps record counts in metadata', async () => {
    let leasedStage: any;
    const repository = {
      upsertRun: jest.fn().mockResolvedValue({
        id: 'run-smart-money',
        pipelineKey: 'market-intelligence',
        region: 'IN',
        assetType: 'STOCK',
        timeframe: '1d',
        triggerType: 'scheduled',
        status: 'RUNNING',
        idempotencyKey: 'run-smart-money-key',
        dataThroughDate: '2026-05-25T00:00:00.000Z',
        sourceFingerprint: 'market-context-output',
        changedInstrumentCount: 3,
        totalCount: 3,
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
      }),
      completeRun: jest.fn().mockImplementation(async (input) => ({ ...leasedStage, ...input, status: input.status })),
      upsertStage: jest.fn().mockImplementation(async () => {
        leasedStage = {
          id: 'stage-smart-money',
          pipelineRunId: 'run-smart-money',
          stageKey: 'SMART_MONEY',
          stageOrder: 8,
          status: 'PENDING',
          idempotencyKey: 'stage-smart-money-key',
          region: 'IN',
          assetType: 'STOCK',
          timeframe: '1d',
          dataThroughDate: '2026-05-25T00:00:00.000Z',
          inputFingerprint: 'smart-money-input',
          outputFingerprint: null,
          changedInstrumentCount: 3,
          batchSize: 2,
          offset: 0,
          nextOffset: 0,
          hasMore: false,
          totalCount: 3,
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
          leaseOwner: 'scheduled-smart-money:test',
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
        return leasedStage;
      }),
      acquireStageLease: jest.fn()
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_NOT_FOUND', stage: null })
        .mockImplementation(async () => ({ acquired: true, reason: 'ACQUIRED', stage: { ...leasedStage, status: 'RUNNING' } })),
      completeStage: jest.fn().mockImplementation(async (input) => ({
        ...leasedStage,
        ...input,
        id: 'stage-smart-money',
        pipelineRunId: 'run-smart-money',
        stageKey: 'SMART_MONEY',
        stageOrder: 8,
      })),
      recordStageProgress: jest.fn().mockImplementation(async (input) => ({ ...leasedStage, ...input, status: input.status })),
      latestStages: jest.fn(),
    };
    const smartRun = jest.fn()
      .mockResolvedValueOnce({
        totalCount: 3,
        processedCount: 2,
        generatedCount: 6,
        failedCount: 0,
        skippedCount: 0,
        warnings: [],
        errors: [],
        byRange: { '1M': { generated: 2, skipped: 0 }, '3M': { generated: 2, skipped: 0 }, '6M': { generated: 2, skipped: 0 } },
        hasMore: true,
        nextOffset: 2,
      })
      .mockResolvedValueOnce({
        totalCount: 3,
        processedCount: 1,
        generatedCount: 3,
        failedCount: 0,
        skippedCount: 0,
        warnings: [],
        errors: [],
        byRange: { '1M': { generated: 1, skipped: 0 }, '3M': { generated: 1, skipped: 0 }, '6M': { generated: 1, skipped: 0 } },
        hasMore: false,
        nextOffset: null,
      });
    const service = new PipelineOrchestrationService(
      repository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { run: smartRun } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    jest.spyOn(service, 'runScheduledContextSnapshotsStage').mockResolvedValue(null as any);

    const response = await service.runScheduledSmartMoneyStage({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      sourceFingerprint: 'market-context-output',
      changedInstrumentIds: ['stock-1', 'stock-2', 'stock-3'],
      batchSize: 2,
      schedulerRunStartedAt: '2026-05-25T03:00:00.000Z',
      upstreamStageRunId: 'stage-market-context',
    }, new Date('2026-05-25T03:00:00.000Z'));

    expect(response.status).toBe('COMPLETED');
    expect(smartRun).toHaveBeenCalledTimes(2);
    expect(smartRun).toHaveBeenNthCalledWith(1, 2, expect.objectContaining({ offset: 0, instrumentIds: ['stock-1', 'stock-2', 'stock-3'] }));
    expect(smartRun).toHaveBeenNthCalledWith(2, 2, expect.objectContaining({ offset: 2, instrumentIds: ['stock-1', 'stock-2', 'stock-3'] }));
    expect(repository.completeStage).toHaveBeenCalledWith(expect.objectContaining({
      status: 'COMPLETED',
      totalCount: 3,
      processedCount: 3,
      succeededCount: 3,
      skippedCount: 0,
      metadata: expect.objectContaining({
        adapterPages: 2,
        generatedRecordCount: 9,
        skippedRecordCount: 0,
      }),
    }));
  });

  it('drains all changed-instrument Strategy Decision batches and records decision output separately', async () => {
    let leasedStage: any;
    const repository = {
      upsertRun: jest.fn().mockResolvedValue({
        id: 'run-strategy-decision',
        pipelineKey: 'market-intelligence',
        region: 'IN',
        assetType: 'STOCK',
        timeframe: '1d',
        triggerType: 'scheduled',
        status: 'RUNNING',
        idempotencyKey: 'run-strategy-decision-key',
        dataThroughDate: '2026-05-25T00:00:00.000Z',
        sourceFingerprint: 'signal-quality-output',
        changedInstrumentCount: 3,
        totalCount: 3,
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
      }),
      completeRun: jest.fn().mockImplementation(async (input) => ({ ...leasedStage, ...input, status: input.status })),
      upsertStage: jest.fn().mockImplementation(async () => {
        leasedStage = {
          id: 'stage-strategy-decision',
          pipelineRunId: 'run-strategy-decision',
          stageKey: 'STRATEGY_DECISION',
          stageOrder: 9,
          status: 'PENDING',
          idempotencyKey: 'stage-strategy-decision-key',
          region: 'IN',
          assetType: 'STOCK',
          timeframe: '1d',
          dataThroughDate: '2026-05-25T00:00:00.000Z',
          inputFingerprint: 'strategy-decision-input',
          outputFingerprint: null,
          changedInstrumentCount: 3,
          batchSize: 2,
          offset: 0,
          nextOffset: 0,
          hasMore: false,
          totalCount: 3,
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
          leaseOwner: 'scheduled-strategy-decision:test',
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
        return leasedStage;
      }),
      acquireStageLease: jest.fn()
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_NOT_FOUND', stage: null })
        .mockImplementation(async () => ({ acquired: true, reason: 'ACQUIRED', stage: { ...leasedStage, status: 'RUNNING' } })),
      completeStage: jest.fn().mockImplementation(async (input) => ({
        ...leasedStage,
        ...input,
        id: 'stage-strategy-decision',
        pipelineRunId: 'run-strategy-decision',
        stageKey: 'STRATEGY_DECISION',
        stageOrder: 9,
      })),
      recordStageProgress: jest.fn().mockImplementation(async (input) => ({ ...leasedStage, ...input, status: input.status })),
      latestStages: jest.fn(),
    };
    const evaluate = jest.fn()
      .mockResolvedValueOnce({
        totalCount: 3,
        processedCount: 2,
        generatedCount: 100,
        failedCount: 0,
        skippedCount: 0,
        warnings: [],
        results: new Array(100).fill(null).map((_, index) => ({ id: `decision-a-${index}` })),
        hasMore: true,
        nextOffset: 2,
      })
      .mockResolvedValueOnce({
        totalCount: 3,
        processedCount: 1,
        generatedCount: 50,
        failedCount: 0,
        skippedCount: 0,
        warnings: [],
        results: new Array(50).fill(null).map((_, index) => ({ id: `decision-b-${index}` })),
        hasMore: false,
        nextOffset: null,
      });
    const service = new PipelineOrchestrationService(
      repository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { evaluate } as any,
      {} as any,
      {} as any
    );
    jest.spyOn(service, 'runScheduledResearchProjectionStage').mockResolvedValue(null as any);

    const response = await service.runScheduledStrategyDecisionStage({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      dataThroughDate: '2026-05-25',
      sourceFingerprint: 'signal-quality-output',
      changedInstrumentIds: ['stock-1', 'stock-2', 'stock-3'],
      batchSize: 2,
      schedulerRunStartedAt: '2026-05-25T03:00:00.000Z',
      upstreamStageRunId: 'stage-signal-quality',
    }, new Date('2026-05-25T03:00:00.000Z'));

    expect(response.status).toBe('COMPLETED');
    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(evaluate).toHaveBeenNthCalledWith(1, expect.objectContaining({ offset: 0, batchSize: 2, instrumentIds: ['stock-1', 'stock-2', 'stock-3'] }));
    expect(evaluate).toHaveBeenNthCalledWith(2, expect.objectContaining({ offset: 2, batchSize: 2, instrumentIds: ['stock-1', 'stock-2', 'stock-3'] }));
    expect(repository.completeStage).toHaveBeenCalledWith(expect.objectContaining({
      status: 'COMPLETED',
      totalCount: 3,
      processedCount: 3,
      succeededCount: 3,
      metadata: expect.objectContaining({
        adapterPages: 2,
        persistedDecisionCount: 150,
        resultCount: 150,
      }),
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
