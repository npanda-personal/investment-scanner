/// <reference types="@types/jest" />
/**
 * Tests for the MARKET_CONTEXT_SNAPSHOT_REFRESH scheduled stage.
 *
 * Phase 4b: The runScheduledMarketContextSnapshotStage method was deleted as part
 * of the legacy-chain removal. The stage is now executed exclusively via the DAG
 * runner (executeDagPipeline / PipelineDagRunner). End-to-end behavior is covered
 * by pipeline-dag-runner.test.ts and pipeline-dag-contract.test.ts.
 *
 * This file retains the one structural check that doesn't require the legacy method.
 */
import { PipelineOrchestrationService } from '../../../src/modules/pipeline-orchestration';

describe('MARKET_CONTEXT_SNAPSHOT_REFRESH pipeline stage', () => {
  it('MARKET_CONTEXT_SNAPSHOT_REFRESH is registered in SCHEDULED_DOWNSTREAM_STAGE_KEYS', () => {
    // The constant is private but its effect is observable: hasActiveScheduledDownstream
    // queries with stageKeys including this key. We verify via the public guards that
    // the service correctly recognises an active MARKET_CONTEXT_SNAPSHOT_REFRESH stage
    // as a blocking downstream (used in runScheduledPipelineCatchUpFromMarketDataSummary).
    const svc = new PipelineOrchestrationService(
      {
        latestStages: jest.fn().mockResolvedValue([
          {
            id: 'stage-mcs',
            stageKey: 'MARKET_CONTEXT_SNAPSHOT_REFRESH',
            status: 'RUNNING',
            pipelineKey: 'market-intelligence',
            region: 'IN',
            assetType: 'STOCK',
            timeframe: '1d',
            dataThroughDate: '2026-06-04T00:00:00.000Z',
            leaseExpiresAt: new Date(Date.now() + 600_000).toISOString(),
            completedAt: null,
            attemptCount: 1,
            processedCount: 1,
          },
        ]),
      } as any,
      {} as any,
    );

    // If MARKET_CONTEXT_SNAPSHOT_REFRESH is in SCHEDULED_DOWNSTREAM_STAGE_KEYS,
    // then runScheduledPipelineCatchUpFromMarketDataSummary will short-circuit (return null)
    // when an active stage of that key exists for the same trading date.
    return expect(
      svc.runScheduledPipelineCatchUpFromMarketDataSummary({
        region: 'IN',
        assetType: 'STOCK',
        tradingDate: '2026-06-04',
        dataThroughDate: '2026-06-04',
        sourceFingerprint: 'fp-test',
        changedInstrumentIds: ['stock-1'],
        downstreamInstrumentIds: ['stock-1'],
        dqStageEligible: true,
        instrumentsProcessed: 1,
        rowsReceived: 1,
        rowsInserted: 0,
        rowsUpdated: 1,
        rowsSkipped: 0,
        rowsNoOp: 0,
        warningCount: 0,
        warnings: [],
        errors: [],
      }, new Date('2026-06-05T08:00:00.000Z'))
    ).resolves.toBeNull();
  });
});
