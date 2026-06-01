/// <reference types="@types/jest" />
import { PipelineOrchestrationService } from '../../../src/modules/pipeline-orchestration';

const stageRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'stage-sector',
  pipelineRunId: 'run-sector',
  stageKey: 'SECTOR_INTELLIGENCE_REFRESH',
  stageOrder: 7,
  status: 'RUNNING',
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
  nextOffset: 0,
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
  leaseOwner: 'manual-command:SECTOR_INTELLIGENCE_REFRESH:test',
  leaseExpiresAt: '2026-06-01T08:10:00.000Z',
  startedAt: '2026-06-01T08:00:00.000Z',
  completedAt: null,
  durationMs: null,
  warnings: [],
  errors: [],
  metadata: null,
  createdAt: '2026-06-01T08:00:00.000Z',
  updatedAt: '2026-06-01T08:00:00.000Z',
  ...overrides,
});

describe('Sector Intelligence pipeline stage', () => {
  it('executes the manual sector refresh command and records a terminal stage', async () => {
    const leasedStage = stageRecord();
    const repository = {
      upsertRun: jest.fn().mockResolvedValue({
        id: 'run-sector',
        pipelineKey: 'market-intelligence',
        region: 'IN',
        assetType: 'STOCK',
        timeframe: '1d',
      }),
      completeRun: jest.fn().mockResolvedValue({}),
      upsertStage: jest.fn().mockResolvedValue(leasedStage),
      acquireStageLease: jest.fn()
        .mockResolvedValueOnce({ acquired: false, reason: 'STAGE_NOT_FOUND', stage: null })
        .mockResolvedValueOnce({ acquired: true, reason: 'ACQUIRED', stage: leasedStage }),
      completeStage: jest.fn().mockImplementation(async (input) => stageRecord({
        ...input,
        completedAt: '2026-06-01T08:00:02.000Z',
      })),
      recordStageProgress: jest.fn(),
      latestStages: jest.fn(),
    };
    const marketContextService = {
      refreshSectorSnapshots: jest.fn().mockResolvedValue({
        status: 'COMPLETED',
        scope: { region: 'IN', assetType: 'STOCK' },
        snapshotDate: '2026-06-01',
        dataThroughDate: '2026-05-29',
        totalCount: 2,
        processedCount: 2,
        savedCount: 2,
        skippedCount: 0,
        warnings: [],
        errors: [],
        sectors: [{ sector: 'IT' }, { sector: 'Bank' }],
      }),
    };
    const service = new PipelineOrchestrationService(
      repository as any,
      {} as any,
      {} as any,
      {} as any,
      marketContextService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    const result = await service.executeCommand({
      commandKey: 'SECTOR_INTELLIGENCE_REFRESH',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 25,
      offset: 0,
      idempotencyKey: 'sector-refresh-1',
      params: { dataThroughDate: '2026-05-29' },
      force: false,
    }, { requestedByUserId: 'local-manual-operator' }, new Date('2026-06-01T08:00:00.000Z'));

    expect(marketContextService.refreshSectorSnapshots).toHaveBeenCalledWith({
      region: 'IN',
      assetType: 'STOCK',
      dataThroughDate: '2026-05-29',
    });
    expect(repository.upsertStage).toHaveBeenCalledWith(expect.objectContaining({
      stageKey: 'SECTOR_INTELLIGENCE_REFRESH',
      stageOrder: 7,
    }));
    expect(repository.completeStage).toHaveBeenCalledWith(expect.objectContaining({
      status: 'COMPLETED',
      totalCount: 2,
      processedCount: 2,
      succeededCount: 2,
      skippedCount: 0,
      metadata: expect.objectContaining({
        adapter: 'MarketContextIntelligenceService.refreshSectorSnapshots',
        savedCount: 2,
        sectorCount: 2,
      }),
    }));
    expect(result).toMatchObject({
      commandKey: 'SECTOR_INTELLIGENCE_REFRESH',
      stageKey: 'SECTOR_INTELLIGENCE_REFRESH',
      status: 'COMPLETED',
      counts: {
        totalCount: 2,
        processedCount: 2,
        succeededCount: 2,
      },
    });
  });
});
