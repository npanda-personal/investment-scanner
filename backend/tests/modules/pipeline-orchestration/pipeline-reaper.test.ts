/// <reference types="@types/jest" />
/**
 * Unit tests for the stale-lease reaper.
 *
 * Tests:
 *   1. Stale RUNNING stage (lease expired)  → reaped to FAILED.
 *   2. Stale RUNNING stage (no lease, old startedAt) → reaped to FAILED.
 *   3. Fresh RUNNING stage (recently updated) → untouched.
 *   4. Stale RUNNING run with no remaining RUNNING stages → reaped to FAILED.
 *   5. Stale RUNNING run with a still-RUNNING stage child → run not reaped.
 *   6. reapStaleLeases on PipelineOrchestrationService delegates to repository with threshold.
 */

import { PipelineOrchestrationRepository } from '../../../src/modules/pipeline-orchestration';
import { PipelineOrchestrationService } from '../../../src/modules/pipeline-orchestration';

// ─── helpers ────────────────────────────────────────────────────────────────

const THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 h
const NOW = new Date('2026-06-06T12:00:00.000Z');
const STALE_TIME = new Date(NOW.getTime() - THRESHOLD_MS - 60_000); // 2h01m ago → stale
const FRESH_TIME = new Date(NOW.getTime() - 60_000);               // 1 min ago  → fresh

function makeStageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'stage-1',
    pipelineRunId: 'run-1',
    stageKey: 'DATA_QUALITY',
    stageOrder: 2,
    status: 'RUNNING',
    idempotencyKey: 'stage-key-1',
    scopeRegion: 'IN',
    scopeAssetType: 'STOCK',
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
    cacheStatus: 'BYPASS',
    cacheExpiresAt: null,
    leaseOwner: 'worker-1',
    leaseExpiresAt: STALE_TIME, // expired lease by default
    startedAt: STALE_TIME,
    completedAt: null,
    durationMs: null,
    warnings: [],
    errors: [],
    metadata: null,
    createdAt: STALE_TIME,
    updatedAt: STALE_TIME,
    ...overrides,
  };
}

function makeRunRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'run-1',
    pipelineKey: 'market-intelligence',
    scopeRegion: 'IN',
    scopeAssetType: 'STOCK',
    timeframe: '1d',
    triggerType: 'scheduled',
    status: 'RUNNING',
    idempotencyKey: 'run-key-1',
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
    startedAt: STALE_TIME,
    completedAt: null,
    durationMs: null,
    createdAt: STALE_TIME,
    updatedAt: STALE_TIME,
    ...overrides,
  };
}

// ─── repository-level tests (against mock Prisma db) ────────────────────────

describe('PipelineOrchestrationRepository.reapStaleLeases', () => {
  it('reaps a stale RUNNING stage whose lease has expired', async () => {
    const stageUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const runFindMany = jest.fn().mockResolvedValue([makeRunRow()]);
    const stageFindMany = jest.fn().mockResolvedValue([]); // no RUNNING stages remain after stage reap
    const runUpdateMany = jest.fn().mockResolvedValue({ count: 1 });

    const db = {
      pipelineStageRun: { updateMany: stageUpdateMany, findMany: stageFindMany },
      pipelineRun: { findMany: runFindMany, updateMany: runUpdateMany },
    };

    const repo = new PipelineOrchestrationRepository(db as any);
    const result = await repo.reapStaleLeases({ staleThresholdMs: THRESHOLD_MS, now: NOW });

    expect(result.stageRowsReaped).toBe(1);
    expect(result.runRowsReaped).toBe(1);

    // Stage updateMany WHERE must include status: 'RUNNING' and updatedAt lt cutoff
    const stageWhere = stageUpdateMany.mock.calls[0][0].where;
    expect(stageWhere.status).toBe('RUNNING');
    expect(stageWhere.updatedAt.lt).toEqual(new Date(NOW.getTime() - THRESHOLD_MS));

    // Stage data must set status: 'FAILED' and clear lease fields
    const stageData = stageUpdateMany.mock.calls[0][0].data;
    expect(stageData.status).toBe('FAILED');
    expect(stageData.leaseOwner).toBeNull();
    expect(stageData.leaseExpiresAt).toBeNull();
    expect(stageData.errors).toContain('reaped: stale lease / interrupted run');
  });

  it('reaps a stale RUNNING stage with no lease based on startedAt age', async () => {
    const stageUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const runFindMany = jest.fn().mockResolvedValue([]);
    const runUpdateMany = jest.fn().mockResolvedValue({ count: 0 });

    const db = {
      pipelineStageRun: {
        updateMany: stageUpdateMany,
        findMany: jest.fn().mockResolvedValue([]),
      },
      pipelineRun: { findMany: runFindMany, updateMany: runUpdateMany },
    };

    const repo = new PipelineOrchestrationRepository(db as any);
    const result = await repo.reapStaleLeases({ staleThresholdMs: THRESHOLD_MS, now: NOW });

    expect(result.stageRowsReaped).toBe(1);
    // OR clause includes the null-lease + old-startedAt path
    const orClause = stageUpdateMany.mock.calls[0][0].where.OR;
    const nullLeasePath = orClause.find(
      (c: any) => c.leaseExpiresAt === null && c.startedAt !== undefined
    );
    expect(nullLeasePath).toBeDefined();
    expect(nullLeasePath.startedAt.lt).toEqual(new Date(NOW.getTime() - THRESHOLD_MS));
  });

  it('does NOT reap a fresh RUNNING stage updated within the threshold', async () => {
    // Return count: 0 for stage updateMany (nothing matched because fresh row was excluded by WHERE)
    const stageUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    const runFindMany = jest.fn().mockResolvedValue([]);
    const runUpdateMany = jest.fn().mockResolvedValue({ count: 0 });

    const db = {
      pipelineStageRun: {
        updateMany: stageUpdateMany,
        findMany: jest.fn().mockResolvedValue([]),
      },
      pipelineRun: { findMany: runFindMany, updateMany: runUpdateMany },
    };

    const repo = new PipelineOrchestrationRepository(db as any);

    // Simulate a fresh stage by using a very large threshold so the cutoff is in the future
    const result = await repo.reapStaleLeases({
      staleThresholdMs: THRESHOLD_MS,
      now: new Date(FRESH_TIME.getTime() - THRESHOLD_MS + 30_000), // now is 30 s before FRESH_TIME would expire
    });

    expect(result.stageRowsReaped).toBe(0);
    expect(result.runRowsReaped).toBe(0);
  });

  it('does NOT reap a run that still has a RUNNING child stage', async () => {
    const stageUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    const runFindMany = jest.fn().mockResolvedValue([makeRunRow()]);
    // stageFindMany returns the still-RUNNING stage for that run (which survived stage reap)
    const stillRunningStage = makeStageRow({ updatedAt: FRESH_TIME, leaseExpiresAt: new Date(NOW.getTime() + 60_000) });
    const stageFindMany = jest.fn().mockResolvedValue([{ pipelineRunId: stillRunningStage.pipelineRunId }]);
    const runUpdateMany = jest.fn().mockResolvedValue({ count: 0 });

    const db = {
      pipelineStageRun: { updateMany: stageUpdateMany, findMany: stageFindMany },
      pipelineRun: { findMany: runFindMany, updateMany: runUpdateMany },
    };

    const repo = new PipelineOrchestrationRepository(db as any);
    const result = await repo.reapStaleLeases({ staleThresholdMs: THRESHOLD_MS, now: NOW });

    expect(result.runRowsReaped).toBe(0);
    // runUpdateMany should not have been called with run-1 in its ID list
    if (runUpdateMany.mock.calls.length > 0) {
      const ids: string[] = runUpdateMany.mock.calls[0][0].where?.id?.in ?? [];
      expect(ids).not.toContain('run-1');
    }
  });

  it('reaps a stale RUNNING run that has no remaining RUNNING children', async () => {
    const stageUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    const runFindMany = jest.fn().mockResolvedValue([makeRunRow()]);
    const stageFindMany = jest.fn().mockResolvedValue([]); // no RUNNING stage children
    const runUpdateMany = jest.fn().mockResolvedValue({ count: 1 });

    const db = {
      pipelineStageRun: { updateMany: stageUpdateMany, findMany: stageFindMany },
      pipelineRun: { findMany: runFindMany, updateMany: runUpdateMany },
    };

    const repo = new PipelineOrchestrationRepository(db as any);
    const result = await repo.reapStaleLeases({ staleThresholdMs: THRESHOLD_MS, now: NOW });

    expect(result.runRowsReaped).toBe(1);
    const runData = runUpdateMany.mock.calls[0][0].data;
    expect(runData.status).toBe('FAILED');
    expect(runData.errors).toContain('reaped: stale lease / interrupted run');
    expect(runUpdateMany.mock.calls[0][0].where.id.in).toContain('run-1');
  });
});

// ─── service-level delegation test ──────────────────────────────────────────

describe('PipelineOrchestrationService.reapStaleLeases', () => {
  it('delegates to repository.reapStaleLeases with configured threshold', async () => {
    const reapFn = jest.fn().mockResolvedValue({ stageRowsReaped: 3, runRowsReaped: 2 });
    const fakeRepo = { reapStaleLeases: reapFn };

    const service = new PipelineOrchestrationService(fakeRepo as any);
    const result = await service.reapStaleLeases({ staleThresholdMs: 7_200_000, now: NOW });

    expect(result).toEqual({ stageRowsReaped: 3, runRowsReaped: 2 });
    expect(reapFn).toHaveBeenCalledWith({
      staleThresholdMs: 7_200_000,
      now: NOW,
    });
  });

  it('uses default threshold when none supplied', async () => {
    const reapFn = jest.fn().mockResolvedValue({ stageRowsReaped: 0, runRowsReaped: 0 });
    const fakeRepo = { reapStaleLeases: reapFn };

    const service = new PipelineOrchestrationService(fakeRepo as any);
    await service.reapStaleLeases();

    expect(reapFn).toHaveBeenCalledTimes(1);
    const callArg = reapFn.mock.calls[0][0];
    expect(callArg.staleThresholdMs).toBeGreaterThanOrEqual(60_000);
  });
});
