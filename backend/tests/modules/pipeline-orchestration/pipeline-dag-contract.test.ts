/// <reference types="@types/jest" />
/**
 * pipeline-dag-contract.test.ts
 *
 * FIX 5 contract test: verifies that instrumentScope flows end-to-end from
 * DagRunInput through to the underlying service stubs for scope-supporting
 * stages (DATA_QUALITY, RAW_SIGNALS) on a manual trigger run.
 *
 * Design:
 *  - Builds REAL adapters via buildPipelineDagAdapters with jest.fn() stubs
 *    for every service method the adapters call.
 *  - Runs the REAL PipelineDagRunner with an in-memory fake persistence.
 *  - Asserts that DATA_QUALITY and RAW_SIGNALS stubs were called with the
 *    scoped instrument ids ['i1', 'i2'].
 *  - Asserts no stage reports SKIPPED (FIX 1 would have caused SKIPPED on
 *    scheduled/manual triggers before the fix).
 *
 * This test WOULD HAVE FAILED before FIX 1 (instrumentScope was stripped for
 * non-retry triggers → adapters received null scope → returned SKIPPED).
 */

import { buildPipelineDagAdapters } from '../../../src/modules/pipeline-orchestration/pipeline-dag-registry';
import { PipelineDagRunner } from '../../../src/modules/pipeline-orchestration/pipeline-dag-runner';
import type {
  DagPersistence,
  RunRecord,
  TerminalStageRecord,
} from '../../../src/modules/pipeline-orchestration/pipeline-dag-runner';
import type { DagRunInput } from '../../../src/modules/pipeline-orchestration/pipeline-dag.types';

// ---------------------------------------------------------------------------
// Minimal in-memory fake persistence (mirrors pipeline-dag-runner.test.ts)
// ---------------------------------------------------------------------------

type ContractStageEntry = {
  stageKey: string;
  status: string;
  succeededCount: number;
  failedCount: number;
  totalCount?: number;
  processedCount?: number;
  skippedCount?: number;
  unchangedCount?: number;
  durationMs: number;
  errors: string[];
  metadata: Record<string, unknown> | null;
};

function makeFakePersistence(): DagPersistence & { stages: Map<string, ContractStageEntry> } {
  const runs = new Map<string, RunRecord>();
  const stages = new Map<string, ContractStageEntry>();

  return {
    stages,
    async upsertRun(params) {
      const existing = runs.get(params.idempotencyKey);
      if (existing) return existing;
      const r: RunRecord = { id: `run-${params.idempotencyKey.slice(0, 8)}`, status: params.status };
      runs.set(params.idempotencyKey, r);
      return r;
    },
    async completeRun(params) {
      const r = runs.get(params.idempotencyKey);
      if (r) r.status = params.status;
    },
    async findRunByKey(key) {
      return runs.get(key) ?? null;
    },
    async upsertStage(params) {
      if (!stages.has(params.idempotencyKey)) {
        stages.set(params.idempotencyKey, {
          stageKey: params.stageKey,
          status: params.status,
          succeededCount: 0,
          failedCount: 0,
          durationMs: 0,
          errors: [],
          metadata: null,
        });
      }
    },
    async acquireStage(params) {
      const s = stages.get(params.idempotencyKey);
      if (!s) return { acquired: false, reason: 'STAGE_NOT_FOUND' };
      const terminalStatuses = ['COMPLETED', 'PARTIAL', 'FAILED', 'SKIPPED', 'BLOCKED', 'ABANDONED'];
      if (terminalStatuses.includes(s.status)) return { acquired: false, reason: 'STAGE_TERMINAL' };
      s.status = 'RUNNING';
      return { acquired: true, reason: 'ACQUIRED' };
    },
    async extendLease() { /* no-op */ },
    async recordProgress() { /* no-op */ },
    async completeStage(params) {
      const s = stages.get(params.idempotencyKey);
      if (s) {
        s.status = params.status;
        s.succeededCount = params.succeededCount;
        s.failedCount = params.failedCount;
        s.totalCount = params.totalCount;
        s.processedCount = params.processedCount;
        s.skippedCount = params.skippedCount;
        s.unchangedCount = params.unchangedCount;
        s.durationMs = params.durationMs;
        s.errors = params.errors ?? [];
        s.metadata = params.metadata ?? null;
      }
    },
    async findTerminalStage(params): Promise<TerminalStageRecord | null> {
      if (params.idempotencyKey) {
        const entry = stages.get(params.idempotencyKey);
        if (!entry) return null;
        return { status: entry.status, succeededCount: entry.succeededCount, failedCount: entry.failedCount, durationMs: entry.durationMs, errors: entry.errors, metadata: entry.metadata };
      }
      for (const entry of stages.values()) {
        if (entry.stageKey === params.stageKey) {
          return { status: entry.status, succeededCount: entry.succeededCount, failedCount: entry.failedCount, durationMs: entry.durationMs, errors: entry.errors, metadata: entry.metadata };
        }
      }
      return null;
    },
    async resetStage() { /* no-op */ },
  };
}

// ---------------------------------------------------------------------------
// Minimal success-shape stubs for every service the adapters call
// ---------------------------------------------------------------------------

/** dataQualityService stub — records the instrumentIds it receives */
function makeDataQualityStub() {
  const evaluateScheduledStage = jest.fn().mockResolvedValue({
    processedCount: 2,
    totalCount: 2,
    evaluatedCount: 2,
    failedCount: 0,
    skippedCount: 0,
    warnings: [],
    errors: [],
    durationMs: 1,
  });
  return { evaluateScheduledStage };
}

/** signalGenerationService stub */
function makeSignalGenerationStub() {
  const run = jest.fn().mockResolvedValue({
    generated: 2,
    skipped: 0,
    errors: [],
    warnings: [],
    processedCount: 2,
    generatedCount: 2,
    updatedCount: 0,
    noOpCount: 0,
    skippedCount: 0,
    failedCount: 0,
    dataQuality: { excludedByDataQuality: 0, missingQualityEvaluationCount: 0 },
    generated_at: new Date().toISOString(),
  });
  return { run };
}

/** signalCalibrationService stub */
function makeSignalCalibrationStub() {
  return {
    run: jest.fn().mockResolvedValue({
      results: [{}],
      generated: 2,
      processedCount: 2,
      succeededCount: 2,
      failedCount: 0,
      skippedCount: 0,
      errors: [],
      warnings: [],
    }),
  };
}

/** earningsIntelligenceService stub */
function makeEarningsIntelligenceStub() {
  return {
    refreshSnapshots: jest.fn().mockResolvedValue({
      processedCount: 2,
      succeededCount: 2,
      failedCount: 0,
      skippedCount: 0,
      totalCount: 2,
      snapshotDate: '2026-06-11',
      dataThroughDate: '2026-06-11',
      categories: {},
      errors: [],
      warnings: [],
    }),
  };
}

/** marketContextService stub — called as run(region) and runAsOf(region, undefined) */
function makeMarketContextStub() {
  const successResp = {
    status: 'success',
    totalCount: 1,
    processedCount: 1,
    succeededCount: 1,
    failedCount: 0,
    skippedCount: 0,
  };
  return {
    run: jest.fn().mockResolvedValue(successResp),
    runAsOf: jest.fn().mockResolvedValue(successResp),
    refreshSectorSnapshots: jest.fn().mockResolvedValue({
      savedCount: 1,
      skippedCount: 0,
      errors: [],
      warnings: [],
      sectors: [{}],
      snapshotDate: '2026-06-11',
      dataThroughDate: '2026-06-11',
      status: 'COMPLETED',
    }),
  };
}

/** smartMoneyService stub — called as run(batchSize, { region, assetType, offset, instrumentIds }) */
function makeSmartMoneyStub() {
  return {
    run: jest.fn().mockResolvedValue({
      totalCount: 2,
      processedCount: 2,
      generatedCount: 2,
      failedCount: 0,
      skippedCount: 0,
      hasMore: false,
      nextOffset: null,
      byRange: {},
      errors: [],
      warnings: [],
    }),
  };
}

/** historicalContextSnapshotsService stub — called as generate(date, batchSize, opts) */
function makeHistoricalContextSnapshotsStub() {
  const emptyBucket = { inserted: 1, updated: 0, skipped: 0 };
  return {
    generate: jest.fn().mockResolvedValue({
      snapshotDate: '2026-06-11',
      warnings: [],
      market: emptyBucket,
      sectors: emptyBucket,
      countries: emptyBucket,
      smartMoney: emptyBucket,
      dataQuality: emptyBucket,
    }),
  };
}

/** signalQualityService stub */
function makeSignalQualityStub() {
  return {
    recalculate: jest.fn().mockResolvedValue({
      totalCount: 2,
      processedCount: 2,
      evaluatedCount: 2,
      skippedCount: 0,
      failedCount: 0,
      warnings: [],
      selectedHorizon: '20D',
      evidenceUsability: 'AVAILABLE',
      matureSignalsInBatch: 2,
      notYetMatureInBatch: 0,
      missingPriceHistoryCount: 0,
      unevaluatedCount: 0,
      outcomesPersisted: true,
      message: 'ok',
      hasMore: false,
      nextOffset: null,
    }),
  };
}

/** strategyDecisionService stub */
function makeStrategyDecisionStub() {
  return {
    evaluate: jest.fn().mockResolvedValue({
      totalCount: 2,
      processedCount: 2,
      generatedCount: 2,
      failedCount: 0,
      skippedCount: 0,
      warnings: [],
      results: [{}, {}],
      hasMore: false,
      nextOffset: null,
    }),
  };
}

/** researchHubService stub */
function makeResearchHubStub() {
  return {
    refreshOverview: jest.fn().mockResolvedValue({
      generatedAt: new Date().toISOString(),
      dataGaps: [],
      marketReadiness: { marketGate: 'OPEN', marketCondition: 'NORMAL' },
      researchPriorities: { tradeCandidates: [], watchCandidates: [], avoidCandidates: [] },
    }),
  };
}

/** todayReviewService stub */
function makeTodayReviewStub() {
  return {
    run: jest.fn().mockResolvedValue({
      run: {
        id: 'r1',
        status: 'COMPLETED',
        trustStatus: 'TRUSTED',
        dataThroughDate: '2026-06-11',
        warnings: [],
        candidateCounts: {},
      },
    }),
  };
}

/** signalPositionLedgerService stub */
function makeSignalPositionLedgerStub() {
  return {
    refreshActiveRows: jest.fn().mockResolvedValue({
      succeededCount: 1,
      failedCount: 0,
      warnings: [],
      errors: [],
      runId: 'r1',
      materializedRowCount: 1,
      status: 'COMPLETED',
      updatedAt: new Date().toISOString(),
    }),
  };
}

/** marketPulseService stub */
function makeMarketPulseStub() {
  return {
    refreshSnapshot: jest.fn().mockResolvedValue({
      id: 'mp1',
      status: 'FRESH',
      marketHealthScore: 0.8,
      marketHealthLabel: 'HEALTHY',
      dataThroughDate: new Date('2026-06-11'),
      warningsJson: [],
    }),
  };
}

/** stockInterestService stub */
function makeStockInterestStub() {
  return {
    refreshSnapshots: jest.fn().mockResolvedValue({
      succeededCount: 1,
      failedCount: 0,
      processedCount: 1,
      warnings: [],
      errors: [],
      snapshotDate: '2026-06-11',
      dataThroughDate: '2026-06-11',
      status: 'COMPLETED',
      categories: {},
    }),
  };
}

/** workbenchRefreshService stub */
function makeWorkbenchRefreshStub() {
  return {
    refreshWorkbenchSnapshots: jest.fn().mockResolvedValue({
      succeededCount: 2,
      failedCount: 0,
      processedCount: 2,
      warnings: [],
      errors: [],
      computedAt: new Date().toISOString(),
    }),
  };
}

/** marketDataService stub */
function makeMarketDataStub() {
  return {
    refreshMarketScanSnapshots: jest.fn().mockResolvedValue({
      tradingDate: '2026-06-11',
      totalInserted: 1,
      scanTypes: ['scan1'],
      warnings: [],
      errors: [],
    }),
  };
}

/** snapshotAssemblerService stub */
function makeSnapshotAssemblerStub() {
  return {
    assemble: jest.fn().mockResolvedValue({
      rowCount: 2,
      snapshotVersion: 'v1',
      provenanceCounts: {},
      warnings: [],
    }),
  };
}

// ---------------------------------------------------------------------------
// Contract test
// ---------------------------------------------------------------------------

describe('pipeline-dag-contract — FIX 1 scope end-to-end', () => {
  const SCOPE = ['i1', 'i2'];

  const INPUT: DagRunInput = {
    tradingDate: '2026-06-11',
    region: 'IN',
    assetType: 'STOCK',
    timeframe: '1d',
    trigger: 'manual',
    instrumentScope: SCOPE,
  };

  let dataQualityStub: ReturnType<typeof makeDataQualityStub>;
  let snapshotAssemblerStub: ReturnType<typeof makeSnapshotAssemblerStub>;

  beforeEach(() => {
    dataQualityStub = makeDataQualityStub();
    snapshotAssemblerStub = makeSnapshotAssemblerStub();
  });

  it('(a) DATA_QUALITY stub receives the scoped instrument ids on a manual run', async () => {
    const persistence = makeFakePersistence();
    const services = {
      dataQualityService: dataQualityStub as any,
      signalGenerationService: makeSignalGenerationStub() as any,
      signalCalibrationService: makeSignalCalibrationStub() as any,
      earningsIntelligenceService: makeEarningsIntelligenceStub() as any,
      marketContextService: makeMarketContextStub() as any,
      smartMoneyService: makeSmartMoneyStub() as any,
      historicalContextSnapshotsService: makeHistoricalContextSnapshotsStub() as any,
      signalQualityService: makeSignalQualityStub() as any,
      strategyDecisionService: makeStrategyDecisionStub() as any,
      researchHubService: makeResearchHubStub() as any,
      todayReviewService: makeTodayReviewStub() as any,
      signalPositionLedgerService: makeSignalPositionLedgerStub() as any,
      marketPulseService: makeMarketPulseStub() as any,
      stockInterestService: makeStockInterestStub() as any,
      workbenchRefreshService: makeWorkbenchRefreshStub() as any,
      marketDataService: makeMarketDataStub() as any,
      snapshotAssemblerService: snapshotAssemblerStub as any,
    };

    const adapters = buildPipelineDagAdapters(services);
    const runner = new PipelineDagRunner(adapters, { persistence });
    await runner.execute(INPUT);

    // DATA_QUALITY must have been called with the two scoped ids
    expect(dataQualityStub.evaluateScheduledStage).toHaveBeenCalled();
    const callArg = dataQualityStub.evaluateScheduledStage.mock.calls[0][0];
    expect(callArg.instrumentIds).toEqual(expect.arrayContaining(['i1', 'i2']));
    expect(callArg.instrumentIds).toHaveLength(2);

    // DATA_QUALITY stage row in persistence must end with totalCount=2 / processedCount=2
    // (the 2-instrument scope produces evaluatedCount=2 from the stub)
    const dataQualityStageEntry = [...persistence.stages.values()].find(
      (s) => s.stageKey === 'DATA_QUALITY',
    );
    expect(dataQualityStageEntry).toBeDefined();
    expect(dataQualityStageEntry!.totalCount).toBe(2);
    expect(dataQualityStageEntry!.processedCount).toBe(2);
  });

  it('(b) RAW_SIGNALS stub receives the scoped instrument ids on a manual run', async () => {
    const rawSignalsStub = makeSignalGenerationStub();
    const services = {
      dataQualityService: makeDataQualityStub() as any,
      signalGenerationService: rawSignalsStub as any,
      signalCalibrationService: makeSignalCalibrationStub() as any,
      earningsIntelligenceService: makeEarningsIntelligenceStub() as any,
      marketContextService: makeMarketContextStub() as any,
      smartMoneyService: makeSmartMoneyStub() as any,
      historicalContextSnapshotsService: makeHistoricalContextSnapshotsStub() as any,
      signalQualityService: makeSignalQualityStub() as any,
      strategyDecisionService: makeStrategyDecisionStub() as any,
      researchHubService: makeResearchHubStub() as any,
      todayReviewService: makeTodayReviewStub() as any,
      signalPositionLedgerService: makeSignalPositionLedgerStub() as any,
      marketPulseService: makeMarketPulseStub() as any,
      stockInterestService: makeStockInterestStub() as any,
      workbenchRefreshService: makeWorkbenchRefreshStub() as any,
      marketDataService: makeMarketDataStub() as any,
      snapshotAssemblerService: makeSnapshotAssemblerStub() as any,
    };

    const adapters = buildPipelineDagAdapters(services);
    const runner = new PipelineDagRunner(adapters, { persistence: makeFakePersistence() });
    await runner.execute(INPUT);

    // RAW_SIGNALS calls signalGenerationService.run in a chunk loop;
    // every chunk must contain only scoped ids.
    expect(rawSignalsStub.run).toHaveBeenCalled();
    for (const call of rawSignalsStub.run.mock.calls) {
      const ids: string[] = call[0].instrumentIds;
      for (const id of ids) {
        expect(SCOPE).toContain(id);
      }
    }
  });

  it('(c) no stage reports SKIPPED when instrumentScope is provided (FIX 1 regression guard)', async () => {
    const services = {
      dataQualityService: makeDataQualityStub() as any,
      signalGenerationService: makeSignalGenerationStub() as any,
      signalCalibrationService: makeSignalCalibrationStub() as any,
      earningsIntelligenceService: makeEarningsIntelligenceStub() as any,
      marketContextService: makeMarketContextStub() as any,
      smartMoneyService: makeSmartMoneyStub() as any,
      historicalContextSnapshotsService: makeHistoricalContextSnapshotsStub() as any,
      signalQualityService: makeSignalQualityStub() as any,
      strategyDecisionService: makeStrategyDecisionStub() as any,
      researchHubService: makeResearchHubStub() as any,
      todayReviewService: makeTodayReviewStub() as any,
      signalPositionLedgerService: makeSignalPositionLedgerStub() as any,
      marketPulseService: makeMarketPulseStub() as any,
      stockInterestService: makeStockInterestStub() as any,
      workbenchRefreshService: makeWorkbenchRefreshStub() as any,
      marketDataService: makeMarketDataStub() as any,
      snapshotAssemblerService: snapshotAssemblerStub as any,
    };

    const adapters = buildPipelineDagAdapters(services);
    const runner = new PipelineDagRunner(adapters, { persistence: makeFakePersistence() });
    const result = await runner.execute(INPUT);

    // Scope-supporting stages (DATA_QUALITY, RAW_SIGNALS, SIGNAL_CALIBRATION,
    // EARNINGS_INTELLIGENCE_REFRESH, SIGNAL_QUALITY, STRATEGY_DECISION,
    // WORKBENCH_REFRESH, SNAPSHOT_ASSEMBLER) must NOT be SKIPPED.
    // Non-scope stages always produce their own results regardless.
    const scopeSupportingKeys = [
      'DATA_QUALITY',
      'RAW_SIGNALS',
      'SIGNAL_CALIBRATION',
      'EARNINGS_INTELLIGENCE_REFRESH',
      'SIGNAL_QUALITY',
      'STRATEGY_DECISION',
      'WORKBENCH_REFRESH',
      'SNAPSHOT_ASSEMBLER',
    ];
    for (const key of scopeSupportingKeys) {
      const stage = result.stages[key];
      expect(stage).toBeDefined();
      expect(stage.status).not.toBe('SKIPPED');
    }
  });
});
