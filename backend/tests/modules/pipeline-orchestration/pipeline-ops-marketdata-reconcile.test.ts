/// <reference types="@types/jest" />
import { PipelineOrchestrationService } from '../../../src/modules/pipeline-orchestration';

// Minimal MARKET_DATA stage-run record (matches PipelineStageRunRecord shape consumed by status()).
function mdStage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'stage', pipelineRunId: 'run', stageKey: 'MARKET_DATA', stageOrder: 1,
    status: 'COMPLETED', idempotencyKey: 'k', region: 'IN', assetType: 'STOCK', timeframe: '1d',
    dataThroughDate: null, inputFingerprint: null, outputFingerprint: null, changedInstrumentCount: 0,
    batchSize: 100, offset: 0, nextOffset: null, hasMore: false, totalCount: 0, processedCount: 0,
    succeededCount: 0, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0, attemptCount: 0,
    cacheKey: null, cacheStatus: 'BYPASS', cacheExpiresAt: null, leaseOwner: null, leaseExpiresAt: null,
    startedAt: '2026-06-11T00:00:00.000Z', completedAt: '2026-06-11T00:00:00.000Z', durationMs: null,
    warnings: [], errors: [], metadata: null, createdAt: '2026-06-11T00:00:00.000Z', updatedAt: '2026-06-11T00:00:00.000Z',
    ...overrides,
  };
}

function svc(stages: unknown[], stored: unknown) {
  const repository = {
    findActiveRun: jest.fn().mockResolvedValue(null),
    findLastRun: jest.fn().mockResolvedValue(null),
    latestStages: jest.fn().mockResolvedValue(stages),
  };
  const marketDataService = { latestStoredCandleInfo: jest.fn().mockResolvedValue(stored) };
  return new PipelineOrchestrationService(
    repository as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, marketDataService as any,
  );
}

const QUERY = { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence', limit: 25 };
const NOW = new Date('2026-06-15T12:00:00.000Z');

function marketDataGroup(snapshot: { stages: Array<{ stageKey: string }> }) {
  return snapshot.stages.find((s) => s.stageKey === 'MARKET_DATA') as any;
}

describe('pipeline-ops MARKET_DATA reconciliation + selection', () => {
  it('selects the genuine run (not a newer reaped ABANDONED) and reconciles data-through against the stored candle', async () => {
    const abandoned = mdStage({
      id: 'abandoned', status: 'ABANDONED', dataThroughDate: null,
      startedAt: '2026-06-14T19:58:00.000Z', completedAt: '2026-06-14T20:38:00.000Z',
      errors: ['reaped: stale lease / interrupted run'],
    });
    const partial = mdStage({
      id: 'partial', status: 'PARTIAL', dataThroughDate: '2026-06-11T00:00:00.000Z',
      startedAt: '2026-06-11T15:07:00.000Z', completedAt: '2026-06-11T16:12:00.000Z',
    });
    // ABANDONED started later than the PARTIAL, yet the genuine PARTIAL must win.
    const service = svc([abandoned, partial], { latestTradingDate: '2026-06-15', finalConfirmed: true });

    const snapshot = await service.status(QUERY as any, NOW);
    const md = marketDataGroup(snapshot);

    expect(md.lastStage.id).toBe('partial');
    expect(md.lastStage.status).toBe('PARTIAL');
    expect(md.lastStage.storedDataThroughDate).toBe('2026-06-15');
    expect(md.lastStage.storedDataFinalConfirmed).toBe(true);
    expect(md.lastStage.stageTrackingStale).toBe(true);
  });

  it('does not flag stale when the stage already covers the stored date', async () => {
    const current = mdStage({
      id: 'current', status: 'COMPLETED', dataThroughDate: '2026-06-15T00:00:00.000Z',
      startedAt: '2026-06-15T11:00:00.000Z', completedAt: '2026-06-15T11:05:00.000Z',
    });
    const service = svc([current], { latestTradingDate: '2026-06-15', finalConfirmed: true });

    const snapshot = await service.status(QUERY as any, NOW);
    const md = marketDataGroup(snapshot);

    expect(md.lastStage.storedDataThroughDate).toBe('2026-06-15');
    expect(md.lastStage.stageTrackingStale).toBe(false);
  });

  it('a future-dated startedAt cannot outrank a run that genuinely started now (clamp)', async () => {
    const nowStarted = mdStage({
      id: 'now-started', status: 'COMPLETED', dataThroughDate: '2026-06-15T00:00:00.000Z',
      startedAt: '2026-06-15T12:00:00.000Z', completedAt: '2026-06-15T12:01:00.000Z',
    });
    const futureZombie = mdStage({
      id: 'future-zombie', status: 'COMPLETED', dataThroughDate: '2026-06-15T00:00:00.000Z',
      startedAt: '2026-10-13T11:00:00.000Z', completedAt: '2026-06-02T12:00:00.000Z',
    });
    const service = svc([nowStarted, futureZombie], null);

    const snapshot = await service.status(QUERY as any, NOW);
    const md = marketDataGroup(snapshot);

    // Without the startedAt clamp, the Oct-2026 startedAt would win the dataThroughDate tie.
    expect(md.lastStage.id).toBe('now-started');
  });

  it('survives a market-data serving failure (no enrichment, status still returns)', async () => {
    const partial = mdStage({ id: 'partial', status: 'PARTIAL', dataThroughDate: '2026-06-11T00:00:00.000Z' });
    const repository = {
      findActiveRun: jest.fn().mockResolvedValue(null),
      findLastRun: jest.fn().mockResolvedValue(null),
      latestStages: jest.fn().mockResolvedValue([partial]),
    };
    const marketDataService = { latestStoredCandleInfo: jest.fn().mockRejectedValue(new Error('db down')) };
    const service = new PipelineOrchestrationService(
      repository as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, marketDataService as any,
    );

    const snapshot = await service.status(QUERY as any, NOW);
    const md = marketDataGroup(snapshot);

    expect(md.lastStage.id).toBe('partial');
    expect(md.lastStage.storedDataThroughDate).toBeUndefined();
  });
});
