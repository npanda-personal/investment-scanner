/// <reference types="@types/jest" />
/**
 * pipeline-dag-switchover.test.ts
 *
 * Phase 2 switchover verification:
 *
 *  (a) executeDagPipeline builds the DAG registry + executes via PipelineDagRunner
 *      when given a mocked runner (verifies the method wires adapters + persistence).
 *
 *  (b) PIPELINE_RUN_ALL executeCommand routes to the DAG path
 *      (spy on executeDagPipeline; does NOT call legacy runScheduledPipelineCatchUpFromMarketDataSummary).
 *
 *  (c) Scheduled handover: recordMarketDataStageSnapshot → runDownstreamDataQualityForMarketDataSnapshot
 *      → executeDagPipeline with the summary's changedInstrumentIds and trigger='scheduled'.
 */

import { PipelineOrchestrationService } from '../../../src/modules/pipeline-orchestration/pipeline-orchestration.service';
import type { DagRunResult } from '../../../src/modules/pipeline-orchestration/pipeline-dag.types';

// ---------------------------------------------------------------------------
// Minimal repository stub shared across tests
// ---------------------------------------------------------------------------

function makeRepository(overrides: Record<string, jest.Mock> = {}): any {
  return {
    findActiveRun: jest.fn().mockResolvedValue(null),
    upsertRun: jest.fn().mockResolvedValue({
      id: 'run-switchover-1',
      pipelineKey: 'market-intelligence',
      status: 'RUNNING',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      idempotencyKey: 'run-switchover-idem',
      startedAt: '2026-06-01T03:00:00.000Z',
      completedAt: null,
      updatedAt: '2026-06-01T03:00:00.000Z',
      durationMs: null,
      metadata: null,
    }),
    completeRun: jest.fn().mockResolvedValue(null),
    upsertStage: jest.fn().mockResolvedValue({
      id: 'stage-switchover-1',
      pipelineRunId: 'run-switchover-1',
      stageKey: 'MARKET_DATA',
      stageOrder: 1,
      status: 'RUNNING',
      idempotencyKey: 'stage-switchover-idem',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: '2026-06-01T00:00:00.000Z',
      inputFingerprint: null,
      outputFingerprint: null,
      changedInstrumentCount: 0,
      batchSize: 100,
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
      cacheStatus: 'BYPASS',
      cacheExpiresAt: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      startedAt: '2026-06-01T03:00:00.000Z',
      completedAt: null,
      durationMs: null,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-06-01T03:00:00.000Z',
      updatedAt: '2026-06-01T03:00:00.000Z',
    }),
    acquireStageLease: jest.fn().mockResolvedValue({ acquired: true, reason: 'ACQUIRED' }),
    completeStage: jest.fn().mockImplementation(async (params: any) => ({
      ...params,
      id: 'stage-switchover-1',
      pipelineRunId: 'run-switchover-1',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      dataThroughDate: '2026-06-01T00:00:00.000Z',
      changedInstrumentCount: 0,
      batchSize: 100,
      offset: 0,
      nextOffset: null,
      hasMore: false,
      totalCount: 1,
      processedCount: 1,
      partialCount: 0,
      attemptCount: 1,
      cacheKey: null,
      cacheStatus: 'BYPASS',
      cacheExpiresAt: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      warnings: [],
      errors: [],
      metadata: null,
      createdAt: '2026-06-01T03:00:00.000Z',
      updatedAt: '2026-06-01T03:00:00.000Z',
    })),
    recordStageProgress: jest.fn().mockResolvedValue(null),
    latestStages: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Minimal marketDataService stub
// ---------------------------------------------------------------------------

function makeMarketDataService(overrides: Record<string, jest.Mock> = {}): any {
  return {
    syncScheduledRegion: jest.fn().mockResolvedValue({
      region: 'IN',
      assetType: 'STOCK',
      tradingDate: '2026-06-01',
      dataThroughDate: '2026-06-01',
      sourceFingerprint: 'switchover-test:fingerprint',
      instrumentsProcessed: 2,
      rowsReceived: 2,
      rowsInserted: 0,
      rowsUpdated: 2,
      rowsSkipped: 0,
      rowsNoOp: 0,
      changedInstrumentIds: ['instrument-a', 'instrument-b'],
      downstreamInstrumentIds: ['instrument-a', 'instrument-b'],
      changedInstrumentCount: 2,
      dqStageEligible: true,
      warningCount: 0,
      warnings: [],
      errors: [],
    }),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// (a) executeDagPipeline wires registry and executes via runner
// ---------------------------------------------------------------------------

describe('PipelineOrchestrationService.executeDagPipeline', () => {
  it('calls executeDagPipeline with correct params and returns DagRunResult', async () => {
    const service = new PipelineOrchestrationService(makeRepository() as any);

    // Mock the internal DAG runner so we don't need real DB or adapters.
    const fakeResult: DagRunResult = {
      runStatus: 'COMPLETED',
      stages: {
        DATA_QUALITY: { status: 'COMPLETED', succeededCount: 3, failedCount: 0, durationMs: 10, cached: false },
        RAW_SIGNALS: { status: 'COMPLETED', succeededCount: 3, failedCount: 0, durationMs: 15, cached: false },
      },
      durationMs: 25,
    };
    const mockRunner = { execute: jest.fn().mockResolvedValue(fakeResult) };
    (service as any)._dagRunner = mockRunner;

    const result = await service.executeDagPipeline({
      tradingDate: '2026-06-01',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      trigger: 'manual',
      changedInstrumentIds: ['instrument-a', 'instrument-b'],
    });

    expect(mockRunner.execute).toHaveBeenCalledWith(expect.objectContaining({
      tradingDate: '2026-06-01',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      trigger: 'manual',
      instrumentScope: expect.arrayContaining(['instrument-a', 'instrument-b']),
    }));
    expect(result.runStatus).toBe('COMPLETED');
    expect(result.stages.DATA_QUALITY?.succeededCount).toBe(3);
  });

  it('passes null instrumentScope when changedInstrumentIds is empty and no fallback', async () => {
    // marketDataService has no listDailyRefreshEligibleInstrumentIds — scope stays null.
    const service = new PipelineOrchestrationService(
      makeRepository() as any,
      {} as any, // dataQualityService
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, {} as any,
      {} as any, // marketDataService — no listDailyRefreshEligibleInstrumentIds
    );
    const fakeResult: DagRunResult = { runStatus: 'COMPLETED', stages: {}, durationMs: 5 };
    const mockRunner = { execute: jest.fn().mockResolvedValue(fakeResult) };
    (service as any)._dagRunner = mockRunner;

    await service.executeDagPipeline({
      tradingDate: '2026-06-01',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      trigger: 'scheduled',
      changedInstrumentIds: [],
    });

    expect(mockRunner.execute).toHaveBeenCalledWith(expect.objectContaining({
      instrumentScope: null,
    }));
  });

  it('passes fromStage when provided', async () => {
    const service = new PipelineOrchestrationService(makeRepository() as any);
    const fakeResult: DagRunResult = { runStatus: 'PARTIAL', stages: {}, durationMs: 8 };
    const mockRunner = { execute: jest.fn().mockResolvedValue(fakeResult) };
    (service as any)._dagRunner = mockRunner;

    await service.executeDagPipeline({
      tradingDate: '2026-06-01',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      trigger: 'retry',
      fromStage: 'RAW_SIGNALS',
    });

    expect(mockRunner.execute).toHaveBeenCalledWith(expect.objectContaining({
      fromStage: 'RAW_SIGNALS',
      trigger: 'retry',
    }));
  });
});

// ---------------------------------------------------------------------------
// (b) PIPELINE_RUN_ALL routes to DAG path
// ---------------------------------------------------------------------------

describe('PIPELINE_RUN_ALL routes to DAG path', () => {
  it('calls executeDagPipeline (not legacy catchUp) for PIPELINE_RUN_ALL command', async () => {
    const repository = makeRepository();
    const marketDataService = makeMarketDataService();
    const service = new PipelineOrchestrationService(
      repository as any,
      {} as any, // dataQualityService — not needed for this test
      {} as any, // signalGenerationService
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      marketDataService as any,
    );

    const dagSpy = jest.spyOn(service, 'executeDagPipeline')
      .mockResolvedValue({ runStatus: 'COMPLETED', stages: {}, durationMs: 100 });
    const legacySpy = jest.spyOn(service, 'runScheduledPipelineCatchUpFromMarketDataSummary');

    const recordSnapshotSpy = jest.spyOn(service, 'recordMarketDataStageSnapshot')
      .mockResolvedValueOnce({ id: 'stage-1', pipelineRunId: 'run-1', stageKey: 'MARKET_DATA', status: 'RUNNING', region: 'IN', assetType: 'STOCK', timeframe: '1d', idempotencyKey: 'k1', dataThroughDate: null, inputFingerprint: null, outputFingerprint: null, changedInstrumentCount: 0, batchSize: 100, offset: 0, nextOffset: 0, hasMore: false, totalCount: 0, processedCount: 0, succeededCount: 0, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0, attemptCount: 1, cacheKey: null, cacheStatus: 'BYPASS', cacheExpiresAt: null, leaseOwner: 'manual-command:PIPELINE_RUN_ALL:x', leaseExpiresAt: null, startedAt: '2026-06-01T03:00:00.000Z', completedAt: null, durationMs: null, warnings: [], errors: [], metadata: null, createdAt: '2026-06-01T03:00:00.000Z', updatedAt: '2026-06-01T03:00:00.000Z' } as any)
      .mockResolvedValueOnce({ id: 'stage-1', pipelineRunId: 'run-1', stageKey: 'MARKET_DATA', status: 'COMPLETED', region: 'IN', assetType: 'STOCK', timeframe: '1d', idempotencyKey: 'k1', dataThroughDate: '2026-06-01T00:00:00.000Z', inputFingerprint: null, outputFingerprint: null, changedInstrumentCount: 2, batchSize: 100, offset: 0, nextOffset: null, hasMore: false, totalCount: 2, processedCount: 2, succeededCount: 2, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0, attemptCount: 1, cacheKey: null, cacheStatus: 'BYPASS', cacheExpiresAt: null, leaseOwner: null, leaseExpiresAt: null, startedAt: '2026-06-01T03:00:00.000Z', completedAt: '2026-06-01T03:01:00.000Z', durationMs: 60000, warnings: [], errors: [], metadata: null, createdAt: '2026-06-01T03:00:00.000Z', updatedAt: '2026-06-01T03:01:00.000Z' } as any);

    void recordSnapshotSpy; // used only to suppress real calls

    const result = await service.executeCommand({
      commandKey: 'PIPELINE_RUN_ALL',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'full_latest_trading_date',
      batchSize: 100,
      offset: 0,
      idempotencyKey: 'switchover-test-b',
      force: false,
    }, { requestedByUserId: 'switchover-test-user' }, new Date('2026-06-01T03:00:00.000Z'));

    expect(dagSpy).toHaveBeenCalledWith(expect.objectContaining({
      tradingDate: '2026-06-01',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      trigger: 'manual',
    }));
    expect(legacySpy).not.toHaveBeenCalled();
    expect(result.status).toBe('COMPLETED');
  });
});

// ---------------------------------------------------------------------------
// (c) Scheduled handover: recordMarketDataStageSnapshot → executeDagPipeline
// ---------------------------------------------------------------------------

describe('Scheduled handover: recordMarketDataStageSnapshot triggers executeDagPipeline', () => {
  it('calls executeDagPipeline with changedInstrumentIds and trigger=scheduled after PRICE_BACKFILL snapshot', async () => {
    const repository = makeRepository();
    const service = new PipelineOrchestrationService(repository as any, {} as any);

    const dagSpy = jest.spyOn(service, 'executeDagPipeline')
      .mockResolvedValue({ runStatus: 'COMPLETED', stages: {}, durationMs: 50 });

    await service.recordMarketDataStageSnapshot({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      operation: 'PRICE_BACKFILL',
      runId: 'switchover-price-backfill-1',
      status: 'COMPLETED',
      dataThroughDate: '2026-06-01T00:00:00.000Z',
      totalCount: 3,
      processedCount: 3,
      succeededCount: 3,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      changedInstrumentIds: ['instrument-x', 'instrument-y', 'instrument-z'],
      batchSize: 3,
      nextOffset: null,
      hasMore: false,
      startedAt: '2026-06-01T03:00:00.000Z',
      completedAt: '2026-06-01T03:01:00.000Z',
      warnings: [],
      errors: [],
      metadata: {},
    });

    expect(dagSpy).toHaveBeenCalledTimes(1);
    expect(dagSpy).toHaveBeenCalledWith(expect.objectContaining({
      tradingDate: '2026-06-01',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      trigger: 'scheduled',
      changedInstrumentIds: expect.arrayContaining(['instrument-x', 'instrument-y', 'instrument-z']),
    }));
  });

  it('does NOT call executeDagPipeline when changedInstrumentIds is empty', async () => {
    const repository = makeRepository();
    const service = new PipelineOrchestrationService(repository as any, {} as any);

    const dagSpy = jest.spyOn(service, 'executeDagPipeline');

    await service.recordMarketDataStageSnapshot({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      operation: 'PRICE_BACKFILL',
      runId: 'switchover-no-change',
      status: 'COMPLETED',
      dataThroughDate: '2026-06-01T00:00:00.000Z',
      totalCount: 3,
      processedCount: 3,
      succeededCount: 3,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 3,
      changedInstrumentIds: [],
      batchSize: 3,
      nextOffset: null,
      hasMore: false,
      startedAt: '2026-06-01T03:00:00.000Z',
      completedAt: '2026-06-01T03:01:00.000Z',
      warnings: [],
      errors: [],
      metadata: {},
    });

    expect(dagSpy).not.toHaveBeenCalled();
  });

  it('does NOT call executeDagPipeline when downstreamSnapshotBridgeSuppressed is true', async () => {
    const repository = makeRepository();
    const service = new PipelineOrchestrationService(repository as any, {} as any);

    const dagSpy = jest.spyOn(service, 'executeDagPipeline');

    await service.recordMarketDataStageSnapshot({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'manual',
      operation: 'INCREMENTAL_EOD_LOAD',
      runId: 'switchover-suppressed',
      status: 'COMPLETED',
      dataThroughDate: '2026-06-01T00:00:00.000Z',
      totalCount: 2,
      processedCount: 2,
      succeededCount: 2,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      changedInstrumentIds: ['instrument-x', 'instrument-y'],
      batchSize: 2,
      nextOffset: null,
      hasMore: false,
      startedAt: '2026-06-01T03:00:00.000Z',
      completedAt: '2026-06-01T03:01:00.000Z',
      warnings: [],
      errors: [],
      // The PIPELINE_RUN_ALL manual path sets this flag to suppress the scheduled handover
      // since executeDagPipeline is already called directly from executeDailyPipelineViaDag.
      metadata: { downstreamSnapshotBridgeSuppressed: true },
    });

    expect(dagSpy).not.toHaveBeenCalled();
  });
});
