/**
 * pipeline-dag-stages-core.ts
 *
 * PipelineStageAdapter implementations for the 8 core pipeline stages extracted
 * from PipelineOrchestrationService legacy runScheduled*Stage methods.
 *
 * Design rules:
 * - NO PipelineRun / PipelineStageRun record management
 * - NO lease handling or idempotency keys
 * - NO downstream-chain triggering
 * - Pure execution: resolve instruments → call service → map result to StageResult
 * - ctx.heartbeat() called once per processed batch (replaces recordStageProgress)
 * - Status SKIPPED when zero instruments; FAILED only on total stage-level throw
 */

import { DataQualityEngineService } from '../data-quality-engine';
import { EarningsIntelligenceService } from '../earnings-intelligence';
import { HistoricalContextSnapshotsService } from '../historical-context-snapshots';
import {
  MarketContextIntelligenceService,
} from '../market-context-intelligence';
import { SignalCalibrationEngineService } from '../signal-calibration-engine';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import type { PipelineStageAdapter, StageContext, StageResult } from './pipeline-dag.types';

// ---------------------------------------------------------------------------
// CoreStageServices — the subset of services needed by this file.
// Match property names / types from PipelineOrchestrationService constructor.
// ---------------------------------------------------------------------------
export interface CoreStageServices {
  dataQualityService: DataQualityEngineService;
  signalGenerationService: SignalGenerationEngineService;
  signalCalibrationService: SignalCalibrationEngineService;
  earningsIntelligenceService: EarningsIntelligenceService;
  marketContextService: MarketContextIntelligenceService;
  smartMoneyService: SmartMoneyIntelligenceService;
  historicalContextSnapshotsService: HistoricalContextSnapshotsService;
}

// ---------------------------------------------------------------------------
// Internal helpers (replicate legacy normalisation faithfully)
// ---------------------------------------------------------------------------

/** Cap to [1, 100], further capped to list length. Matches legacy normalizeScheduledBatchSize. */
function normaliseBatchSize(batchSize: number, listLength: number): number {
  const normalized = Math.max(1, Math.min(Math.floor(Number(batchSize) || 25), 100));
  return Math.max(1, Math.min(normalized, listLength));
}

/** Normalise an instrument-id list: dedup, trim, non-empty, sorted. */
function normaliseIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

// ---------------------------------------------------------------------------
// Status mappers (replicate legacy private methods exactly)
// ---------------------------------------------------------------------------

function mapDataQualityStatus(input: {
  totalCount: number;
  evaluatedCount: number;
  failedCount: number;
  skippedCount: number;
}): 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'SKIPPED' {
  if (input.totalCount === 0) return 'SKIPPED';
  if (input.failedCount > 0 && input.evaluatedCount === 0) return 'FAILED';
  if (input.failedCount > 0 || input.skippedCount > 0) return 'PARTIAL';
  return 'COMPLETED';
}

function mapRawSignalsStatus(input: {
  totalCount: number;
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
}): 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'SKIPPED' {
  if (input.totalCount === 0) return 'SKIPPED';
  if (input.failedCount > 0 && input.succeededCount === 0) return 'FAILED';
  if (input.succeededCount === 0 && input.skippedCount > 0) return 'SKIPPED';
  if (input.failedCount > 0 || input.skippedCount > 0) return 'PARTIAL';
  return 'COMPLETED';
}

function mapSignalCalibrationStatus(input: {
  totalCount: number;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
}): 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'SKIPPED' {
  if (input.totalCount === 0) return 'SKIPPED';
  if (input.failedCount > 0 && input.succeededCount === 0) return 'FAILED';
  if (input.processedCount < input.totalCount) return 'PARTIAL';
  if (input.succeededCount === 0 && (input.skippedCount > 0 || input.processedCount === 0))
    return 'SKIPPED';
  if (
    input.failedCount > 0 ||
    input.skippedCount > 0 ||
    input.processedCount < input.totalCount
  )
    return 'PARTIAL';
  return 'COMPLETED';
}

/** Generic status mapper used by market-context / earnings / smart-money / context-snapshots. */
function mapPipelineStatus(input: {
  totalCount: number;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
}): 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'SKIPPED' {
  if (input.totalCount === 0) return 'SKIPPED';
  if (input.failedCount > 0 && input.succeededCount === 0) return 'FAILED';
  if (input.succeededCount === 0 && (input.skippedCount > 0 || input.processedCount === 0))
    return 'SKIPPED';
  if (
    input.failedCount > 0 ||
    input.skippedCount > 0 ||
    input.processedCount < input.totalCount
  )
    return 'PARTIAL';
  return 'COMPLETED';
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCoreStageAdapters(services: CoreStageServices): PipelineStageAdapter[] {
  const {
    dataQualityService,
    signalGenerationService,
    signalCalibrationService,
    earningsIntelligenceService,
    marketContextService,
    smartMoneyService,
    historicalContextSnapshotsService,
  } = services;

  // -------------------------------------------------------------------------
  // 1. DATA_QUALITY
  //    Legacy: runScheduledDataQualityStage (~line 2372)
  //    Service call: dataQualityService.evaluateScheduledStage
  //    stageOrder: 2  (from createStage call at line 2457)
  // -------------------------------------------------------------------------
  const dataQualityAdapter: PipelineStageAdapter = {
    key: 'DATA_QUALITY',
    stageOrder: 2,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: true,
    async run(ctx: StageContext): Promise<StageResult> {
      const instrumentIds = normaliseIds(ctx.instrumentScope ?? []);
      const batchSize = normaliseBatchSize(25, instrumentIds.length);

      // SKIPPED when no instruments — matches legacy empty-changed-set path
      if (instrumentIds.length === 0) {
        return { status: 'SKIPPED', succeededCount: 0, failedCount: 0, metadata: { adapter: 'DataQualityEngineService.evaluateScheduledStage' } };
      }

      // dataQualityService.evaluateScheduledStage handles batching internally via onProgress.
      // Call once with the full list + batchSize — identical to legacy call at line 2588.
      let progressProcessed = 0;
      const adapterResult = await dataQualityService.evaluateScheduledStage({
        instrumentIds,
        region: ctx.region,
        assetType: ctx.assetType,
        batchSize,
        onProgress: async (batchResult?: { processedCount?: number; succeededCount?: number; failedCount?: number }) => {
          progressProcessed += batchResult?.processedCount ?? batchSize;
          ctx.progress({
            processed: Math.min(progressProcessed, instrumentIds.length),
            total: instrumentIds.length,
            succeeded: batchResult?.succeededCount,
            failed: batchResult?.failedCount,
          });
        },
      });

      const totalCount = adapterResult.totalCount;
      const evaluatedCount = adapterResult.evaluatedCount;
      const failedCount = adapterResult.failedCount;
      const skippedCount = adapterResult.skippedCount;
      const processedCount = adapterResult.processedCount ?? (evaluatedCount + failedCount + skippedCount);

      const status = mapDataQualityStatus({ totalCount, evaluatedCount, failedCount, skippedCount });

      return {
        status,
        succeededCount: evaluatedCount,
        failedCount,
        processedCount,
        totalCount,
        skippedCount,
        errors: adapterResult.errors || [],
        warnings: adapterResult.warnings || [],
        metadata: {
          adapter: 'DataQualityEngineService.evaluateScheduledStage',
          totalCount,
          evaluatedCount,
          skippedCount,
          adapterProcessedCount: adapterResult.processedCount,
        },
      };
    },
  };

  // -------------------------------------------------------------------------
  // 2. RAW_SIGNALS
  //    Legacy: runScheduledRawSignalsStage (~line 2811)
  //    Service call: signalGenerationService.run (per-batch, manual loop)
  //    stageOrder: 3  (from createStage call at line 2896)
  // -------------------------------------------------------------------------
  const rawSignalsAdapter: PipelineStageAdapter = {
    key: 'RAW_SIGNALS',
    stageOrder: 3,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: true,
    async run(ctx: StageContext): Promise<StageResult> {
      const instrumentIds = normaliseIds(ctx.instrumentScope ?? []);
      const batchSize = normaliseBatchSize(25, instrumentIds.length);

      if (instrumentIds.length === 0) {
        return { status: 'SKIPPED', succeededCount: 0, failedCount: 0, metadata: { adapter: 'SignalGenerationEngineService.run' } };
      }

      const warnings: string[] = [];
      const errors: string[] = [];
      let generatedCount = 0;
      let updatedCount = 0;
      let noOpCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      let adapterProcessedCount = 0;
      let excludedByDataQuality = 0;
      let missingQualityEvaluationCount = 0;
      const failedInstrumentIds: string[] = [];

      // Manual chunk loop — exact replica of legacy lines 2989-3051
      for (let offset = 0; offset < instrumentIds.length; offset += batchSize) {
        const chunk = instrumentIds.slice(offset, offset + batchSize);
        const adapterResult = await signalGenerationService.run({
          instrumentIds: chunk,
          region: ctx.region,
          assetType: ctx.assetType,
          batchSize,
          offset: 0,
          requestedByUserId: 'system',
          useDataQualityFilter: true,
          missingQualityBehavior: 'WARN_AND_PROCESS',
          skipUnusable: true,
          includeLimited: false,
          providerThrottleMs: 0,
          researchContextMode: 'LIGHTWEIGHT',
        });
        const chunkFailedCount = adapterResult.failedCount ?? adapterResult.errors.length;
        generatedCount += adapterResult.generatedCount ?? adapterResult.generated ?? 0;
        updatedCount += adapterResult.updatedCount ?? 0;
        noOpCount += adapterResult.noOpCount ?? 0;
        failedCount += chunkFailedCount;
        skippedCount += adapterResult.skippedCount ?? adapterResult.skipped ?? 0;
        adapterProcessedCount += adapterResult.processedCount ?? chunk.length;
        excludedByDataQuality += adapterResult.dataQuality?.excludedByDataQuality ?? 0;
        missingQualityEvaluationCount +=
          adapterResult.dataQuality?.missingQualityEvaluationCount ?? 0;
        warnings.push(...adapterResult.warnings);
        errors.push(...adapterResult.errors);
        if (chunkFailedCount > 0 && failedInstrumentIds.length < 500) {
          failedInstrumentIds.push(...chunk.slice(0, chunkFailedCount));
        }
        ctx.progress({
          processed: Math.min(adapterProcessedCount, instrumentIds.length),
          total: instrumentIds.length,
          succeeded: generatedCount + updatedCount + noOpCount,
          failed: failedCount,
        });
      }

      const succeededCount = generatedCount + updatedCount + noOpCount;
      const totalCount = instrumentIds.length;
      const status = mapRawSignalsStatus({ totalCount, succeededCount, failedCount, skippedCount });
      const cappedFailedIds = failedInstrumentIds.slice(0, 500);

      return {
        status,
        succeededCount,
        failedCount,
        processedCount: adapterProcessedCount,
        totalCount,
        skippedCount,
        failedInstrumentIds: cappedFailedIds,
        errors,
        warnings,
        metadata: {
          adapter: 'SignalGenerationEngineService.run',
          adapterProcessedCount,
          generatedCount,
          updatedCount,
          noOpCount,
          excludedByDataQuality,
          missingQualityEvaluationCount,
          ...(failedCount > 0
            ? {
                failedInstrumentIds: cappedFailedIds,
                failedInstrumentIdsTruncated: failedInstrumentIds.length > 500,
              }
            : {}),
        },
      };
    },
  };

  // -------------------------------------------------------------------------
  // 3. SIGNAL_CALIBRATION
  //    Legacy: runScheduledSignalCalibrationStage (~line 3223)
  //    Service call: signalCalibrationService.run (per-batch, manual loop)
  //    stageOrder: 4  (from createStage call at line 3308)
  // -------------------------------------------------------------------------
  const signalCalibrationAdapter: PipelineStageAdapter = {
    key: 'SIGNAL_CALIBRATION',
    stageOrder: 4,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: true,
    async run(ctx: StageContext): Promise<StageResult> {
      const instrumentIds = normaliseIds(ctx.instrumentScope ?? []);
      const batchSize = normaliseBatchSize(25, instrumentIds.length);

      if (instrumentIds.length === 0) {
        return { status: 'SKIPPED', succeededCount: 0, failedCount: 0, metadata: { adapter: 'SignalCalibrationEngineService.run' } };
      }

      const warnings: string[] = [];
      const errors: string[] = [];
      let succeededCount = 0;
      let failedCount = 0;
      let unchangedCount = 0;
      let adapterProcessedCount = 0;
      let adapterSkippedCount = 0;
      let outOfScopeSkipped = 0;
      let calibratedCount = 0;
      let passthroughCount = 0;
      let selectedHorizon: string | null = null;
      let evidenceStatus: string | null = null;
      let readinessStatus: string | null = null;
      const failedInstrumentIds: string[] = [];

      // Manual chunk loop — exact replica of legacy lines 3404-3463
      for (let offset = 0; offset < instrumentIds.length; offset += batchSize) {
        const chunk = instrumentIds.slice(offset, offset + batchSize);
        const adapterResult = await signalCalibrationService.run({
          instrumentIds: chunk,
          region: ctx.region,
          assetType: ctx.assetType,
          batchSize,
          offset: 0,
        });
        const chunkCalibFailedCount = adapterResult.failedCount ?? adapterResult.errors.length;
        succeededCount += adapterResult.generated ?? adapterResult.results.length;
        failedCount += chunkCalibFailedCount;
        unchangedCount += adapterResult.passthroughCount ?? 0;
        adapterProcessedCount += adapterResult.processedCount ?? chunk.length;
        adapterSkippedCount += adapterResult.skippedCount ?? adapterResult.skipped ?? 0;
        outOfScopeSkipped += adapterResult.outOfScopeSkipped ?? 0;
        calibratedCount += adapterResult.calibratedCount ?? 0;
        passthroughCount += adapterResult.passthroughCount ?? 0;
        selectedHorizon = selectedHorizon || adapterResult.selectedHorizon || null;
        evidenceStatus =
          evidenceStatus || adapterResult.calibrationEvidence?.evidenceStatus || null;
        readinessStatus =
          readinessStatus || adapterResult.calibrationReadiness?.status || null;
        warnings.push(...adapterResult.warnings);
        errors.push(...adapterResult.errors);
        if (chunkCalibFailedCount > 0 && failedInstrumentIds.length < 500) {
          failedInstrumentIds.push(...chunk.slice(0, chunkCalibFailedCount));
        }
        ctx.progress({
          processed: Math.min(adapterProcessedCount, instrumentIds.length),
          total: instrumentIds.length,
          succeeded: succeededCount,
          failed: failedCount,
        });
      }

      const totalCount = instrumentIds.length;
      const missingInputSkipped = Math.max(0, totalCount - adapterProcessedCount - adapterSkippedCount);
      const skippedCount = adapterSkippedCount + outOfScopeSkipped + missingInputSkipped;
      const completedCount = Math.min(
        totalCount,
        Math.max(adapterProcessedCount, succeededCount + failedCount + skippedCount),
      );
      const status = mapSignalCalibrationStatus({
        totalCount,
        processedCount: completedCount,
        succeededCount,
        failedCount,
        skippedCount,
      });
      const cappedCalibFailedIds = failedInstrumentIds.slice(0, 500);

      return {
        status,
        succeededCount,
        failedCount,
        processedCount: completedCount,
        totalCount,
        skippedCount,
        unchangedCount: unchangedCount,
        failedInstrumentIds: cappedCalibFailedIds,
        errors,
        warnings,
        metadata: {
          adapter: 'SignalCalibrationEngineService.run',
          adapterProcessedCount,
          completedCount,
          missingInputSkipped,
          calibratedCount,
          passthroughCount,
          selectedHorizon,
          evidenceStatus,
          readinessStatus,
          ...(failedCount > 0
            ? {
                failedInstrumentIds: cappedCalibFailedIds,
                failedInstrumentIdsTruncated: failedInstrumentIds.length > 500,
              }
            : {}),
        },
      };
    },
  };

  // -------------------------------------------------------------------------
  // 4. EARNINGS_INTELLIGENCE_REFRESH
  //    Legacy: runScheduledEarningsIntelligenceStage (~line 4456)
  //    Service call: earningsIntelligenceService.refreshSnapshots (per-batch loop)
  //    stageOrder: 5  (from createStage at line 4459 → stageOrder: 5 in definition)
  // -------------------------------------------------------------------------
  const earningsIntelligenceAdapter: PipelineStageAdapter = {
    key: 'EARNINGS_INTELLIGENCE_REFRESH',
    stageOrder: 5,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: true,
    async run(ctx: StageContext): Promise<StageResult> {
      const instrumentIds = normaliseIds(ctx.instrumentScope ?? []);
      const batchSize = normaliseBatchSize(25, instrumentIds.length);

      if (instrumentIds.length === 0) {
        return { status: 'SKIPPED', succeededCount: 0, failedCount: 0, metadata: { adapter: 'EarningsIntelligenceService.refreshSnapshots' } };
      }

      let processedCount = 0;
      let succeededCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      let unchangedCount = 0;
      const warnings: string[] = [];
      const errors: string[] = [];
      const categories: Record<string, number> = {};
      let snapshotDate: string | null = null;
      let dataThroughDate: string | null = null;
      let pages = 0;
      const failedInstrumentIds: string[] = [];

      // Manual chunk loop — exact replica of legacy lines 4480-4528
      for (let offset = 0; offset < instrumentIds.length; offset += batchSize) {
        const chunk = instrumentIds.slice(offset, offset + batchSize);
        if (chunk.length === 0) break;
        const result = await earningsIntelligenceService.refreshSnapshots({
          region: ctx.region,
          assetType: ctx.assetType,
          batchSize,
          offset: 0,
          instrumentIds: chunk,
          snapshotDate: new Date(`${ctx.tradingDate}T00:00:00.000Z`),
          dataThroughDate: new Date(`${ctx.tradingDate}T00:00:00.000Z`),
        });
        processedCount += result.processedCount;
        succeededCount += result.succeededCount;
        failedCount += result.failedCount;
        skippedCount += result.skippedCount;
        unchangedCount += result.unchangedCount;
        warnings.push(...result.warnings);
        errors.push(...result.errors);
        snapshotDate = snapshotDate || result.snapshotDate;
        dataThroughDate = dataThroughDate || result.dataThroughDate;
        pages += 1;
        for (const [category, count] of Object.entries(result.categories || {})) {
          categories[category] = (categories[category] || 0) + Number(count || 0);
        }
        if (result.failedCount > 0 && failedInstrumentIds.length < 500) {
          failedInstrumentIds.push(...chunk.slice(0, result.failedCount));
        }
        ctx.progress({
          processed: Math.min(processedCount, instrumentIds.length),
          total: instrumentIds.length,
          succeeded: succeededCount,
          failed: failedCount,
        });
      }

      const totalCount = instrumentIds.length;
      const clampedProcessedCount = Math.min(totalCount, processedCount);
      const status = mapPipelineStatus({
        totalCount,
        processedCount: clampedProcessedCount,
        succeededCount,
        failedCount,
        skippedCount,
      });
      const cappedEarningsFailedIds = failedInstrumentIds.slice(0, 500);

      return {
        status,
        succeededCount,
        failedCount,
        processedCount: clampedProcessedCount,
        totalCount,
        skippedCount,
        unchangedCount,
        failedInstrumentIds: cappedEarningsFailedIds,
        errors,
        warnings,
        metadata: {
          adapter: 'EarningsIntelligenceService.refreshSnapshots',
          snapshotDate,
          dataThroughDate,
          categories,
          adapterPages: pages,
          unchangedCount,
          ...(failedCount > 0
            ? {
                failedInstrumentIds: cappedEarningsFailedIds,
                failedInstrumentIdsTruncated: failedInstrumentIds.length > 500,
              }
            : {}),
        },
      };
    },
  };

  // -------------------------------------------------------------------------
  // 5. MARKET_CONTEXT
  //    Legacy: runScheduledMarketContextStage (~line 3638) via runScheduledPipelineStage
  //    Service call: marketContextService.run(region)  — single call, no instrument loop
  //    stageOrder: 6  (from definition at line 3641)
  //    supportsInstrumentScope: false — the legacy adapter does NOT iterate over instruments;
  //    it calls run(region) once regardless of changedInstrumentIds.
  // -------------------------------------------------------------------------
  const marketContextAdapter: PipelineStageAdapter = {
    key: 'MARKET_CONTEXT',
    stageOrder: 6,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: false,
    async run(ctx: StageContext): Promise<StageResult> {
      const result = await marketContextService.run(ctx.region);
      const succeeded = result?.status === 'success';
      ctx.heartbeat();
      const status = mapPipelineStatus({
        totalCount: 1,
        processedCount: 1,
        succeededCount: succeeded ? 1 : 0,
        failedCount: succeeded ? 0 : 1,
        skippedCount: 0,
      });
      return {
        status,
        succeededCount: succeeded ? 1 : 0,
        failedCount: succeeded ? 0 : 1,
        processedCount: 1,
        totalCount: 1,
        errors: succeeded ? [] : ['Market Context refresh did not report success.'],
        metadata: {
          adapter: 'MarketContextIntelligenceService.run',
          adapterStatus: result?.status ?? null,
        },
      };
    },
  };

  // -------------------------------------------------------------------------
  // 6. MARKET_CONTEXT_SNAPSHOT_REFRESH
  //    Legacy: runScheduledMarketContextSnapshotStage (~line 3671) via runScheduledPipelineStage
  //    Service call: marketContextService.runAsOf(region, undefined)
  //    stageOrder: 6  (from definition at line 3674)
  // -------------------------------------------------------------------------
  const marketContextSnapshotAdapter: PipelineStageAdapter = {
    key: 'MARKET_CONTEXT_SNAPSHOT_REFRESH',
    stageOrder: 6,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: false,
    async run(ctx: StageContext): Promise<StageResult> {
      // runAsOf with no asOf → uses today as snapshotDate (same as run())
      const result = await marketContextService.runAsOf(ctx.region, undefined);
      const succeeded = result?.status === 'success';
      ctx.heartbeat();
      const status = mapPipelineStatus({
        totalCount: 1,
        processedCount: 1,
        succeededCount: succeeded ? 1 : 0,
        failedCount: succeeded ? 0 : 1,
        skippedCount: 0,
      });
      return {
        status,
        succeededCount: succeeded ? 1 : 0,
        failedCount: succeeded ? 0 : 1,
        processedCount: 1,
        totalCount: 1,
        errors: succeeded ? [] : ['Market Context Snapshot persist did not report success.'],
        metadata: {
          adapter: 'MarketContextIntelligenceService.runAsOf',
          adapterStatus: result?.status ?? null,
        },
      };
    },
  };

  // -------------------------------------------------------------------------
  // 7. SMART_MONEY
  //    Legacy: runScheduledSmartMoneyStage (~line 3706) via runScheduledPipelineStage
  //    Service call: smartMoneyService.run(batchSize, { region, assetType, offset, instrumentIds })
  //    stageOrder: 8  (from definition at line 3709)
  //    Pagination loop: legacy uses offset-based hasMore/nextOffset from service response.
  // -------------------------------------------------------------------------
  const smartMoneyAdapter: PipelineStageAdapter = {
    key: 'SMART_MONEY',
    stageOrder: 8,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: true,
    async run(ctx: StageContext): Promise<StageResult> {
      const instrumentIds = normaliseIds(ctx.instrumentScope ?? []);
      const batchSize = normaliseBatchSize(25, instrumentIds.length);

      if (instrumentIds.length === 0) {
        return { status: 'SKIPPED', succeededCount: 0, failedCount: 0, metadata: { adapter: 'SmartMoneyIntelligenceService.run' } };
      }

      const aggregate = {
        totalCount: instrumentIds.length,
        processedCount: 0,
        generatedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        warnings: [] as string[],
        errors: [] as string[],
        byRange: {} as Record<string, { generated: number; skipped: number }>,
        pages: 0,
      };

      // Offset-based pagination loop — exact replica of legacy lines 3726-3769
      let offset = 0;
      while (offset < aggregate.totalCount) {
        const result = await smartMoneyService.run(batchSize, {
          region: ctx.region,
          assetType: ctx.assetType,
          offset,
          instrumentIds,
        });
        aggregate.totalCount = result.totalCount;
        aggregate.processedCount += result.processedCount;
        aggregate.generatedCount += result.generatedCount;
        aggregate.failedCount += result.failedCount;
        aggregate.skippedCount += result.skippedCount;
        aggregate.warnings.push(...(result.warnings || []));
        aggregate.errors.push(...(result.errors || []));
        for (const [range, counts] of Object.entries(result.byRange || {})) {
          const current = aggregate.byRange[range] || { generated: 0, skipped: 0 };
          aggregate.byRange[range] = {
            generated: current.generated + Number(counts.generated || 0),
            skipped: current.skipped + Number(counts.skipped || 0),
          };
        }
        aggregate.pages += 1;
        ctx.progress({
          processed: Math.min(aggregate.processedCount, aggregate.totalCount),
          total: aggregate.totalCount,
          succeeded: aggregate.generatedCount,
          failed: aggregate.failedCount,
        });
        if (
          !result.hasMore ||
          result.processedCount <= 0 ||
          result.nextOffset === null ||
          result.nextOffset === undefined
        )
          break;
        offset = result.nextOffset;
      }

      const totalCount = aggregate.totalCount;
      const processedCount = Math.min(totalCount, aggregate.processedCount);
      const succeededCount = Math.max(0, processedCount - aggregate.failedCount);
      const status = mapPipelineStatus({
        totalCount,
        processedCount,
        succeededCount,
        failedCount: aggregate.failedCount,
        skippedCount: 0,
      });

      return {
        status,
        succeededCount,
        failedCount: aggregate.failedCount,
        processedCount,
        totalCount,
        errors: aggregate.errors,
        warnings: aggregate.warnings,
        metadata: {
          adapter: 'SmartMoneyIntelligenceService.run',
          adapterPages: aggregate.pages,
          byRange: aggregate.byRange,
          generatedRecordCount: aggregate.generatedCount,
          skippedRecordCount: aggregate.skippedCount,
        },
      };
    },
  };

  // -------------------------------------------------------------------------
  // 8. CONTEXT_SNAPSHOTS
  //    Legacy: runScheduledContextSnapshotsStage (~line 3799) via runScheduledPipelineStage
  //    Service call: historicalContextSnapshotsService.generate(date, batchSize, { region, assetType, instrumentIds })
  //    stageOrder: 5  (from definition at line 3803)
  //    Manual chunk loop over instrumentIds.
  // -------------------------------------------------------------------------
  const contextSnapshotsAdapter: PipelineStageAdapter = {
    key: 'CONTEXT_SNAPSHOTS',
    stageOrder: 5,
    stageVersion: 'dag-v1',
    dependsOn: [],
    supportsInstrumentScope: true,
    async run(ctx: StageContext): Promise<StageResult> {
      const instrumentIds = normaliseIds(ctx.instrumentScope ?? []);
      const batchSize = normaliseBatchSize(25, instrumentIds.length);

      if (instrumentIds.length === 0) {
        return { status: 'SKIPPED', succeededCount: 0, failedCount: 0, metadata: { adapter: 'HistoricalContextSnapshotsService.generate' } };
      }

      const aggregate = {
        market: { inserted: 0, updated: 0, skipped: 0 },
        sectors: { inserted: 0, updated: 0, skipped: 0 },
        countries: { inserted: 0, updated: 0, skipped: 0 },
        smartMoney: { inserted: 0, updated: 0, skipped: 0 },
        dataQuality: { inserted: 0, updated: 0, skipped: 0 },
        warnings: [] as string[],
        pages: 0,
        processedCount: 0,
        snapshotDate: null as string | null,
      };

      // Manual chunk loop — exact replica of legacy lines 3819-3867
      for (let offset = 0; offset < instrumentIds.length; offset += batchSize) {
        const chunkIds = instrumentIds.slice(offset, offset + batchSize);
        if (chunkIds.length === 0) break;
        const result = await historicalContextSnapshotsService.generate(
          new Date(`${ctx.tradingDate}T00:00:00.000Z`),
          chunkIds.length,
          {
            region: ctx.region,
            assetType: ctx.assetType,
            instrumentIds: chunkIds,
          },
        );
        for (const key of ['market', 'sectors', 'countries', 'smartMoney', 'dataQuality'] as const) {
          aggregate[key].inserted += result[key].inserted;
          aggregate[key].updated += result[key].updated;
          aggregate[key].skipped += result[key].skipped;
        }
        aggregate.warnings.push(...result.warnings);
        aggregate.snapshotDate = result.snapshotDate;
        aggregate.pages += 1;
        aggregate.processedCount += chunkIds.length;
        ctx.progress({
          processed: Math.min(aggregate.processedCount, instrumentIds.length),
          total: instrumentIds.length,
          succeeded: aggregate.processedCount,
          failed: 0,
        });
      }

      const inserted =
        aggregate.market.inserted +
        aggregate.sectors.inserted +
        aggregate.countries.inserted +
        aggregate.smartMoney.inserted +
        aggregate.dataQuality.inserted;
      const updated =
        aggregate.market.updated +
        aggregate.sectors.updated +
        aggregate.countries.updated +
        aggregate.smartMoney.updated +
        aggregate.dataQuality.updated;
      const skipped =
        aggregate.market.skipped +
        aggregate.sectors.skipped +
        aggregate.countries.skipped +
        aggregate.smartMoney.skipped +
        aggregate.dataQuality.skipped;

      const totalCount = instrumentIds.length;
      const processedCount = Math.min(totalCount, aggregate.processedCount);
      const succeededCount = processedCount; // legacy: succeededCount = processedCount (no per-instrument failures)
      const status = mapPipelineStatus({
        totalCount,
        processedCount,
        succeededCount,
        failedCount: 0,
        skippedCount: 0,
      });

      return {
        status,
        succeededCount,
        failedCount: 0,
        processedCount,
        totalCount,
        warnings: aggregate.warnings,
        metadata: {
          adapter: 'HistoricalContextSnapshotsService.generate',
          adapterPages: aggregate.pages,
          persistedRecordCount: inserted + updated,
          skippedRecordCount: skipped,
          snapshotDate: aggregate.snapshotDate,
          market: aggregate.market,
          sectors: aggregate.sectors,
          countries: aggregate.countries,
          smartMoney: aggregate.smartMoney,
          dataQuality: aggregate.dataQuality,
        },
      };
    },
  };

  return [
    dataQualityAdapter,
    rawSignalsAdapter,
    signalCalibrationAdapter,
    earningsIntelligenceAdapter,
    marketContextAdapter,
    marketContextSnapshotAdapter,
    smartMoneyAdapter,
    contextSnapshotsAdapter,
  ];
}
