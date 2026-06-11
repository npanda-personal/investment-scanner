/**
 * pipeline-dag-stages-extended.ts
 *
 * Extended stage adapters for the 10 downstream stages of the daily
 * market-intelligence pipeline (SIGNAL_QUALITY → MARKET_SCAN_REFRESH).
 *
 * Each adapter:
 *  - Uses the EXACT stageKey string from SCHEDULED_DOWNSTREAM_STAGE_KEYS /
 *    PIPELINE_COMMAND_POLICIES in pipeline-orchestration.service.ts.
 *  - Uses the stageOrder from the legacy runScheduled*Stage definitions.
 *  - Uses stageVersion 'dag-v1' (runner-managed versioning).
 *  - Has dependsOn: [] — the DAG registry assigns edges after instantiation.
 *  - Marks supportsInstrumentScope: true on stages whose legacy implementation
 *    accepted changedInstrumentIds.
 *  - Pure execution only — NO run/stage record management, NO lease handling,
 *    NO chain triggering (all owned by PipelineDagRunner).
 *  - ctx.heartbeat() called between batches (where batching exists).
 *  - Per-instrument failures never throw; errors produce PARTIAL/FAILED result.
 *  - MARKET_SCAN_REFRESH errors produce FAILED/PARTIAL StageResult instead of
 *    being swallowed as in the legacy PIPELINE_RUN_ALL path.
 */

import { MarketContextIntelligenceService, MarketPulseSnapshotService } from '../market-context-intelligence';
import { MarketDataFoundationService } from '../market-data-foundation/market-data-foundation.service';
import { ResearchHubService } from '../research-hub';
import { SignalPositionLedgerService } from '../signal-position-ledger';
import { SignalQualityLabService } from '../signal-quality-lab';
import { StrategyDecisionEngineService } from '../strategy-decision-engine';
import { StockInterestSnapshotService } from '../market-intelligence';
import { TodayTradeReviewService } from '../today-trade-review';
import { WorkbenchRefreshService } from '../stock-research-workbench';
import type { PipelineStageAdapter, StageContext, StageResult } from './pipeline-dag.types';

// ---------------------------------------------------------------------------
// Service bundle injected at construction time
// ---------------------------------------------------------------------------

export interface ExtendedStageServices {
  signalQualityService: SignalQualityLabService;
  strategyDecisionService: StrategyDecisionEngineService;
  researchHubService: ResearchHubService;
  todayReviewService: TodayTradeReviewService;
  signalPositionLedgerService: SignalPositionLedgerService;
  marketContextService: MarketContextIntelligenceService;
  marketPulseService: MarketPulseSnapshotService;
  stockInterestService: StockInterestSnapshotService;
  workbenchRefreshService: WorkbenchRefreshService;
  marketDataService: MarketDataFoundationService;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_BATCH_SIZE = 100;

// ---------------------------------------------------------------------------
// 1. SIGNAL_QUALITY  (stageOrder 7)
// ---------------------------------------------------------------------------

function makeSignalQualityAdapter(svc: SignalQualityLabService): PipelineStageAdapter {
  return {
    key: 'SIGNAL_QUALITY',
    stageOrder: 7,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: true,
    async run(ctx: StageContext): Promise<StageResult> {
      const instrumentIds = ctx.instrumentScope && ctx.instrumentScope.length > 0
        ? [...ctx.instrumentScope]
        : [];
      if (instrumentIds.length === 0) {
        return { status: 'SKIPPED', succeededCount: 0, failedCount: 0 };
      }

      const batchSize = DEFAULT_BATCH_SIZE;
      const aggregate = {
        totalCount: instrumentIds.length,
        processedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        warnings: [] as string[],
        pages: 0,
        selectedHorizon: '20D',
        evidenceUsability: 'UNAVAILABLE' as string,
        matureSignalsInBatch: 0,
        notYetMatureInBatch: 0,
        evaluatedCount: 0,
        unevaluatedCount: 0,
        missingPriceHistoryCount: 0,
        outcomesPersisted: false,
        message: '',
      };

      let offset = 0;
      while (offset < aggregate.totalCount) {
        const result = await svc.recalculate({
          batchSize,
          offset,
          horizon: '20D',
          region: ctx.region,
          assetType: ctx.assetType,
          instrumentIds,
          persistOutcomes: true,
        });
        aggregate.totalCount = result.totalCount;
        aggregate.processedCount += result.processedCount;
        aggregate.skippedCount += result.skippedCount;
        aggregate.failedCount += result.failedCount;
        aggregate.warnings.push(...result.warnings);
        aggregate.selectedHorizon = result.selectedHorizon;
        aggregate.evidenceUsability = result.evidenceUsability;
        aggregate.matureSignalsInBatch += result.matureSignalsInBatch;
        aggregate.notYetMatureInBatch += result.notYetMatureInBatch;
        aggregate.evaluatedCount += result.evaluatedCount;
        aggregate.unevaluatedCount += result.unevaluatedCount;
        aggregate.missingPriceHistoryCount += result.missingPriceHistoryCount;
        aggregate.outcomesPersisted = aggregate.outcomesPersisted || result.outcomesPersisted;
        aggregate.message = result.message;
        aggregate.pages += 1;
        ctx.heartbeat();
        if (!result.hasMore || result.processedCount <= 0 || result.nextOffset == null) break;
        offset = result.nextOffset;
      }

      const processed = Math.min(aggregate.totalCount, aggregate.processedCount);
      const succeededCount = Math.max(0, processed - aggregate.failedCount - aggregate.skippedCount);
      const status: StageResult['status'] = aggregate.failedCount > 0
        ? (succeededCount > 0 ? 'PARTIAL' : 'FAILED')
        : (processed === 0 ? 'SKIPPED' : 'COMPLETED');

      return {
        status,
        succeededCount,
        failedCount: aggregate.failedCount,
        warnings: aggregate.warnings.length > 0 ? aggregate.warnings : undefined,
        metadata: {
          adapterPages: aggregate.pages,
          selectedHorizon: aggregate.selectedHorizon,
          evidenceUsability: aggregate.evidenceUsability,
          matureSignalsInBatch: aggregate.matureSignalsInBatch,
          notYetMatureInBatch: aggregate.notYetMatureInBatch,
          evaluatedCount: aggregate.evaluatedCount,
          unevaluatedCount: aggregate.unevaluatedCount,
          missingPriceHistoryCount: aggregate.missingPriceHistoryCount,
          outcomesPersisted: aggregate.outcomesPersisted,
          message: aggregate.message,
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// 2. STRATEGY_DECISION  (stageOrder 9)
// ---------------------------------------------------------------------------

function makeStrategyDecisionAdapter(svc: StrategyDecisionEngineService): PipelineStageAdapter {
  return {
    key: 'STRATEGY_DECISION',
    stageOrder: 9,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: true,
    async run(ctx: StageContext): Promise<StageResult> {
      const instrumentIds = ctx.instrumentScope && ctx.instrumentScope.length > 0
        ? [...ctx.instrumentScope]
        : [];
      if (instrumentIds.length === 0) {
        return { status: 'SKIPPED', succeededCount: 0, failedCount: 0 };
      }

      const batchSize = DEFAULT_BATCH_SIZE;
      const aggregate = {
        totalCount: instrumentIds.length,
        processedCount: 0,
        generatedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        warnings: [] as string[],
        resultsLength: 0,
        hasMore: false,
        pages: 0,
      };

      let offset = 0;
      while (offset < aggregate.totalCount) {
        const result = await svc.evaluate({
          strategy: 'ALL',
          instrumentIds,
          region: ctx.region,
          assetType: ctx.assetType,
          batchSize,
          offset,
        });
        aggregate.totalCount = result.totalCount;
        aggregate.processedCount += result.processedCount;
        aggregate.generatedCount += result.generatedCount;
        aggregate.failedCount += result.failedCount;
        aggregate.skippedCount += result.skippedCount;
        aggregate.warnings.push(...(result.warnings || []));
        aggregate.resultsLength += result.results.length;
        aggregate.hasMore = result.hasMore;
        aggregate.pages += 1;
        ctx.heartbeat();
        if (!result.hasMore || result.processedCount <= 0 || result.nextOffset == null) break;
        offset = result.nextOffset;
      }

      const processed = Math.min(aggregate.totalCount, aggregate.processedCount);
      const succeededCount = Math.max(0, processed - aggregate.failedCount - aggregate.skippedCount);
      const status: StageResult['status'] = aggregate.failedCount > 0
        ? (succeededCount > 0 ? 'PARTIAL' : 'FAILED')
        : (processed === 0 ? 'SKIPPED' : 'COMPLETED');

      return {
        status,
        succeededCount,
        failedCount: aggregate.failedCount,
        warnings: aggregate.warnings.length > 0 ? aggregate.warnings : undefined,
        metadata: {
          adapterPages: aggregate.pages,
          persistedDecisionCount: aggregate.generatedCount,
          resultCount: aggregate.resultsLength,
          hasMore: aggregate.hasMore,
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// 3. RESEARCH_PROJECTION  (stageOrder 11)
// ---------------------------------------------------------------------------

function makeResearchProjectionAdapter(svc: ResearchHubService): PipelineStageAdapter {
  return {
    key: 'RESEARCH_PROJECTION',
    stageOrder: 11,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: false,
    async run(ctx: StageContext): Promise<StageResult> {
      const result = await svc.refreshOverview({
        region: ctx.region,
        assetType: ctx.assetType,
      });
      return {
        status: 'COMPLETED',
        succeededCount: 1,
        failedCount: 0,
        warnings: result.dataGaps.length > 0 ? result.dataGaps : undefined,
        metadata: {
          generatedAt: result.generatedAt,
          marketGate: result.marketReadiness.marketGate,
          marketCondition: result.marketReadiness.marketCondition,
          reviewCandidates: result.researchPriorities.tradeCandidates.length,
          watchCandidates: result.researchPriorities.watchCandidates.length,
          avoidCandidates: result.researchPriorities.avoidCandidates.length,
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// 4. TODAY_REVIEW  (stageOrder 12)
// ---------------------------------------------------------------------------

function makeTodayReviewAdapter(svc: TodayTradeReviewService): PipelineStageAdapter {
  return {
    key: 'TODAY_REVIEW',
    stageOrder: 12,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: false,
    async run(ctx: StageContext): Promise<StageResult> {
      const result = await svc.run({
        region: ctx.region,
        assetType: ctx.assetType,
        skipTradePlanGeneration: true,
      });
      const runStatus = result.run?.status;
      const candidateCounts = result.run?.candidateCounts || {};
      const totalCandidates = Object.values(candidateCounts)
        .reduce((sum, value) => sum + Number(value || 0), 0);
      const failed = runStatus === 'FAILED';
      return {
        status: failed ? 'FAILED' : 'COMPLETED',
        succeededCount: failed ? 0 : 1,
        failedCount: failed ? 1 : 0,
        warnings: result.run?.warnings?.length ? result.run.warnings : undefined,
        errors: failed ? (result.run?.warnings?.length ? result.run.warnings : ['Today Review publication failed.']) : undefined,
        metadata: {
          todayReviewRunId: result.run?.id ?? null,
          runStatus: result.run?.status ?? null,
          trustStatus: result.run?.trustStatus ?? null,
          dataThroughDate: result.run?.dataThroughDate ?? null,
          totalCandidates,
          candidateCounts,
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// 5. SIGNAL_POSITION_LEDGER  (stageOrder 13)
// ---------------------------------------------------------------------------

function makeSignalPositionLedgerAdapter(svc: SignalPositionLedgerService): PipelineStageAdapter {
  return {
    key: 'SIGNAL_POSITION_LEDGER',
    stageOrder: 13,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: false,
    async run(ctx: StageContext): Promise<StageResult> {
      const progress = await svc.refreshActiveRows({
        region: ctx.region,
        assetType: ctx.assetType,
        limit: DEFAULT_BATCH_SIZE,
        offset: 0,
      }, { force: true, wait: true });
      ctx.heartbeat();

      const failed = progress.failedCount > 0 && progress.succeededCount === 0;
      const partial = progress.failedCount > 0 && progress.succeededCount > 0;
      const status: StageResult['status'] = failed ? 'FAILED' : partial ? 'PARTIAL' : 'COMPLETED';

      return {
        status,
        succeededCount: progress.succeededCount,
        failedCount: progress.failedCount,
        warnings: progress.warnings?.length ? progress.warnings : undefined,
        errors: progress.errors?.length ? progress.errors : undefined,
        metadata: {
          runId: progress.runId,
          materializedRowCount: progress.materializedRowCount,
          status: progress.status,
          updatedAt: progress.updatedAt,
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// 6. SECTOR_INTELLIGENCE_REFRESH  (stageOrder 14)
// ---------------------------------------------------------------------------

function makeSectorIntelligenceAdapter(
  svc: MarketContextIntelligenceService,
): PipelineStageAdapter {
  return {
    key: 'SECTOR_INTELLIGENCE_REFRESH',
    stageOrder: 14,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: false,
    async run(ctx: StageContext): Promise<StageResult> {
      const result = await svc.refreshSectorSnapshots({
        region: ctx.region,
        assetType: ctx.assetType,
        dataThroughDate: ctx.tradingDate,
      });
      ctx.heartbeat();

      const succeededCount = result.savedCount;
      const failedCount = result.errors.length;
      const status: StageResult['status'] = failedCount > 0
        ? (succeededCount > 0 ? 'PARTIAL' : 'FAILED')
        : (succeededCount === 0 && result.skippedCount > 0 ? 'SKIPPED' : 'COMPLETED');

      return {
        status,
        succeededCount,
        failedCount,
        warnings: result.warnings?.length ? result.warnings : undefined,
        errors: result.errors?.length ? result.errors : undefined,
        metadata: {
          snapshotDate: result.snapshotDate,
          dataThroughDate: result.dataThroughDate,
          savedCount: result.savedCount,
          sectorCount: result.sectors.length,
          status: result.status,
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// 7. MARKET_PULSE_REFRESH  (stageOrder 15)
// ---------------------------------------------------------------------------

function makeMarketPulseAdapter(svc: MarketPulseSnapshotService): PipelineStageAdapter {
  return {
    key: 'MARKET_PULSE_REFRESH',
    stageOrder: 15,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: false,
    async run(ctx: StageContext): Promise<StageResult> {
      const snapshot = await svc.refreshSnapshot({
        region: ctx.region,
        assetType: ctx.assetType,
        timeframe: ctx.timeframe,
      });
      ctx.heartbeat();

      // Non-FRESH status is a data-quality signal (warnings), NOT a stage failure.
      const isFresh = snapshot.status === 'FRESH';
      const snapshotWarnings: string[] = Array.isArray(snapshot.warningsJson)
        ? (snapshot.warningsJson as string[])
        : [];
      const warnings = isFresh
        ? snapshotWarnings
        : [...snapshotWarnings, `Market Pulse snapshot status is ${snapshot.status} (underlying market data not fully fresh).`];

      return {
        status: 'COMPLETED',
        succeededCount: 1,
        failedCount: 0,
        warnings: warnings.length > 0 ? warnings : undefined,
        metadata: {
          snapshotId: snapshot.id,
          snapshotStatus: snapshot.status,
          marketHealthScore: snapshot.marketHealthScore,
          marketHealthLabel: snapshot.marketHealthLabel,
          dataThroughDate: snapshot.dataThroughDate?.toISOString() ?? null,
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// 8. STOCK_INTEREST_REFRESH  (stageOrder 16)
// ---------------------------------------------------------------------------

function makeStockInterestAdapter(svc: StockInterestSnapshotService): PipelineStageAdapter {
  return {
    key: 'STOCK_INTEREST_REFRESH',
    stageOrder: 16,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: false,
    async run(ctx: StageContext): Promise<StageResult> {
      const result = await svc.refreshSnapshots({
        region: ctx.region,
        assetType: ctx.assetType,
        timeframe: ctx.timeframe,
        batchSize: DEFAULT_BATCH_SIZE,
        dataThroughDate: new Date(`${ctx.tradingDate}T00:00:00.000Z`),
      });
      ctx.heartbeat();

      const succeededCount = result.succeededCount;
      const failedCount = result.failedCount;
      const status: StageResult['status'] = failedCount > 0
        ? (succeededCount > 0 ? 'PARTIAL' : 'FAILED')
        : (result.processedCount === 0 ? 'SKIPPED' : 'COMPLETED');

      return {
        status,
        succeededCount,
        failedCount,
        warnings: result.warnings?.length ? result.warnings : undefined,
        errors: result.errors?.length ? result.errors : undefined,
        metadata: {
          snapshotDate: result.snapshotDate,
          dataThroughDate: result.dataThroughDate,
          status: result.status,
          categories: result.categories,
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// 9. WORKBENCH_REFRESH  (stageOrder 17)
// ---------------------------------------------------------------------------

function makeWorkbenchRefreshAdapter(svc: WorkbenchRefreshService): PipelineStageAdapter {
  return {
    key: 'WORKBENCH_REFRESH',
    stageOrder: 17,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: true,
    async run(ctx: StageContext): Promise<StageResult> {
      // FIX 4: WorkbenchRefreshService.resolveInstrumentIds treats an empty/absent
      // instrumentIds list as "refresh all active instruments" (falls through to the
      // DB lookup branch — see workbench-refresh.service.ts resolveInstrumentIds).
      // When scope is null/undefined that full-universe refresh is intentional.
      // When scope is explicitly empty ([] — zero-instrument scoped run) we should
      // skip rather than accidentally trigger a full-universe refresh.
      const scopeProvided = ctx.instrumentScope != null;
      const instrumentIds =
        ctx.instrumentScope && ctx.instrumentScope.length > 0
          ? [...ctx.instrumentScope]
          : null; // null → resolveInstrumentIds falls back to full active set (desired for non-scoped)

      if (scopeProvided && instrumentIds === null) {
        // Explicitly scoped to zero instruments — nothing to do.
        return { status: 'SKIPPED', succeededCount: 0, failedCount: 0 };
      }

      const result = await svc.refreshWorkbenchSnapshots({
        // null instrumentIds → service resolves the full active set (its "all" convention)
        instrumentIds: instrumentIds ?? undefined,
        region: ctx.region,
        assetType: ctx.assetType,
        batchSize: DEFAULT_BATCH_SIZE,
      });
      ctx.heartbeat();

      const succeededCount = result.succeededCount;
      const failedCount = result.failedCount;
      const status: StageResult['status'] = failedCount > 0
        ? (succeededCount > 0 ? 'PARTIAL' : 'FAILED')
        : (result.processedCount === 0 ? 'SKIPPED' : 'COMPLETED');

      return {
        status,
        succeededCount,
        failedCount,
        warnings: result.warnings?.length ? result.warnings : undefined,
        errors: result.errors?.length ? result.errors : undefined,
        metadata: {
          computedAt: result.computedAt,
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// 10. MARKET_SCAN_REFRESH  (stageOrder 18, terminal)
// Legacy PIPELINE_RUN_ALL swallowed errors — here we produce a FAILED/PARTIAL
// StageResult so the runner can surface failures instead of silently dropping.
// ---------------------------------------------------------------------------

function makeMarketScanRefreshAdapter(svc: MarketDataFoundationService): PipelineStageAdapter {
  return {
    key: 'MARKET_SCAN_REFRESH',
    stageOrder: 18,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: false,
    async run(ctx: StageContext): Promise<StageResult> {
      let result: {
        tradingDate: string;
        totalInserted: number;
        scanTypes: string[];
        warnings: string[];
        errors: string[];
      };

      try {
        result = await svc.refreshMarketScanSnapshots({
          region: ctx.region,
          assetType: ctx.assetType,
          now: new Date(),
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        return {
          status: 'FAILED',
          succeededCount: 0,
          failedCount: 1,
          errors: [errMsg],
        };
      }

      ctx.heartbeat();

      const failedCount = result.errors.length;
      const succeededCount = result.totalInserted;
      const status: StageResult['status'] = failedCount > 0
        ? (succeededCount > 0 ? 'PARTIAL' : 'FAILED')
        : (succeededCount === 0 ? 'SKIPPED' : 'COMPLETED');

      return {
        status,
        succeededCount,
        failedCount,
        warnings: result.warnings?.length ? result.warnings : undefined,
        errors: result.errors?.length ? result.errors : undefined,
        metadata: {
          tradingDate: result.tradingDate,
          totalInserted: result.totalInserted,
          scanTypes: result.scanTypes,
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Factory — returns all 10 adapters
// ---------------------------------------------------------------------------

export function createExtendedStageAdapters(
  services: ExtendedStageServices,
): PipelineStageAdapter[] {
  return [
    makeSignalQualityAdapter(services.signalQualityService),
    makeStrategyDecisionAdapter(services.strategyDecisionService),
    makeResearchProjectionAdapter(services.researchHubService),
    makeTodayReviewAdapter(services.todayReviewService),
    makeSignalPositionLedgerAdapter(services.signalPositionLedgerService),
    makeSectorIntelligenceAdapter(services.marketContextService),
    makeMarketPulseAdapter(services.marketPulseService),
    makeStockInterestAdapter(services.stockInterestService),
    makeWorkbenchRefreshAdapter(services.workbenchRefreshService),
    makeMarketScanRefreshAdapter(services.marketDataService),
  ];
}
