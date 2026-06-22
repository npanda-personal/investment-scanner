/**
 * pipeline-dag-stages-cache-warm.ts
 *
 * PipelineStageAdapter for CACHE_WARM — runs AFTER SNAPSHOT_ASSEMBLER (the terminal
 * data stage) to pre-warm the Redis page-response cache for the run's (region, assetType).
 *
 * It calls the SAME persisted-read methods the FE controllers call and writes them under the
 * SAME keys (cache-keys.ts is the shared contract), so a warmed key and a read-through key can
 * never diverge. When caching is disabled it SKIPs immediately (zero overhead).
 *
 * stageOrder: 20  (terminal; nothing depends on it)
 * stageVersion: 'dag-v1'
 * supportsInstrumentScope: false  (cache is keyed by scope, not per-instrument)
 *
 * Failure policy: a cold cache is non-fatal (read-through covers it), so per-endpoint warm
 * failures degrade to PARTIAL with warnings — this stage never hard-FAILs the pipeline.
 */

import { normalizeMarketRegion } from '../../shared/utils/market-scope';
import { StockInterestSnapshotService, parseStockInterestScope } from '../market-intelligence';
import { MarketContextIntelligenceService, MarketPulseSnapshotService } from '../market-context-intelligence';
import { TodayTradeReviewService, parseTodayReviewQuery } from '../today-trade-review';
import { ConvictionReadsService } from '../market-data-foundation/analytics/market-data-foundation.serving.conviction-reads';
import { CacheService } from '../../cache/cache.service';
import {
  convictionKey,
  stockInterestKey,
  sectorRotationKey,
  todayReviewKey,
  marketContextSummaryKey,
  marketPulseKey,
  screenerKeyPrefix,
  marketMoversKeyPrefix,
  signalsTopKeyPrefix,
} from '../../cache/cache-keys';
import type { PipelineStageAdapter, StageContext, StageResult } from './pipeline-dag.types';

export interface CacheWarmStageServices {
  convictionService: ConvictionReadsService;
  stockInterestService: StockInterestSnapshotService;
  marketContextService: MarketContextIntelligenceService;
  marketPulseService: MarketPulseSnapshotService;
  todayReviewService: TodayTradeReviewService;
  cacheService: CacheService;
}

export function createCacheWarmAdapter(services: CacheWarmStageServices): PipelineStageAdapter {
  const { cacheService } = services;

  return {
    key: 'CACHE_WARM',
    stageOrder: 20,
    stageVersion: 'dag-v1',
    dependsOn: [], // filled in by buildPipelineDagAdapters from PIPELINE_DAG_EDGES
    supportsInstrumentScope: false,

    async run(ctx: StageContext): Promise<StageResult> {
      if (!cacheService.isEnabled()) {
        return {
          status: 'SKIPPED',
          warnings: ['page-response cache disabled (CACHE_ENABLED is not "true")'],
        };
      }

      const { region, assetType } = ctx;

      // Invalidate all filter combinations for read-through endpoints — controllers re-warm on next request.
      const screenerDeleted = await cacheService.deleteByPrefix(screenerKeyPrefix);
      ctx.log(`[cache] invalidated ${screenerDeleted} screener cache keys`);
      const moversDeleted = await cacheService.deleteByPrefix(marketMoversKeyPrefix);
      ctx.log(`[cache] invalidated ${moversDeleted} movers cache keys`);
      const signalsTopDeleted = await cacheService.deleteByPrefix(signalsTopKeyPrefix);
      ctx.log(`[cache] invalidated ${signalsTopDeleted} signals-top cache keys`);

      // Each task mirrors EXACTLY what the matching controller passes to its service + key-builder,
      // so the warmed key equals the key the FE will look up. Reusing parseStockInterestScope /
      // parseTodayReviewQuery (the controllers' own validators) keeps that guarantee airtight.
      const tasks: Array<{ name: string; warm: () => Promise<void> }> = [
        {
          name: 'conviction',
          warm: async () => {
            const opts = {
              region: normalizeMarketRegion(region),
              assetType: assetType?.trim().toUpperCase() || undefined,
              onlyFnoEligible: false,
            };
            const cvResult = await services.convictionService.conviction(opts);
            if (cvResult && cvResult.count > 0) {
              await cacheService.setJson(convictionKey(opts), cvResult);
            } else {
              await cacheService.delete(convictionKey(opts));
            }
          },
        },
        {
          name: 'conviction-fno',
          warm: async () => {
            const opts = {
              region: normalizeMarketRegion(region),
              assetType: assetType?.trim().toUpperCase() || undefined,
              onlyFnoEligible: true,
            };
            const cvResult = await services.convictionService.conviction(opts);
            if (cvResult && cvResult.count > 0) {
              await cacheService.setJson(convictionKey(opts), cvResult);
            } else {
              await cacheService.delete(convictionKey(opts));
            }
          },
        },
        {
          name: 'stock-interest',
          warm: async () => {
            const scope = parseStockInterestScope({ region, assetType });
            const siSnap = await services.stockInterestService.latestSnapshot(scope);
            if (siSnap && siSnap.availability !== 'EMPTY') {
              await cacheService.setJson(stockInterestKey(scope), siSnap);
            } else {
              await cacheService.delete(stockInterestKey(scope));
            }
          },
        },
        {
          name: 'sector-rotation',
          warm: async () => {
            const scope = { region: (region || 'IN').toUpperCase(), assetType: (assetType || 'STOCK').toUpperCase() };
            const srSnap = await services.marketContextService.latestSectorIntelligenceSnapshot(scope);
            if (srSnap && srSnap.status !== 'missing' && (srSnap.sectors?.length ?? 0) > 0) {
              await cacheService.setJson(sectorRotationKey(scope), srSnap);
            } else {
              await cacheService.delete(sectorRotationKey(scope));
            }
          },
        },
        {
          name: 'today-review',
          warm: async () => {
            const query = parseTodayReviewQuery({ region, assetType });
            const trSnap = await services.todayReviewService.latest(query);
            if (trSnap && trSnap.run !== null) {
              await cacheService.setJson(todayReviewKey(query), trSnap);
            } else {
              await cacheService.delete(todayReviewKey(query));
            }
          },
        },
        {
          name: 'today-review-lite',
          warm: async () => {
            const query = { ...parseTodayReviewQuery({ region, assetType }), enrich: false as const };
            const trSnap = await services.todayReviewService.latest(query);
            if (trSnap && trSnap.run !== null) {
              await cacheService.setJson(todayReviewKey(query), trSnap);
            } else {
              await cacheService.delete(todayReviewKey(query));
            }
          },
        },
        {
          name: 'market-context-summary',
          warm: async () => {
            // Mirror controller.contextRegion: a CRYPTO scope reads the 'CRYPTO' partition,
            // otherwise region || 'GLOBAL'.
            const contextRegion = assetType?.trim().toUpperCase() === 'CRYPTO' ? 'CRYPTO' : (region || 'GLOBAL').toUpperCase();
            const summary = await services.marketContextService.latestPersistedSummary(contextRegion);
            if (summary && (summary as any).regime != null) {
              await cacheService.setJson(marketContextSummaryKey(contextRegion), summary);
            } else {
              await cacheService.delete(marketContextSummaryKey(contextRegion));
            }
          },
        },
        {
          name: 'market-pulse',
          warm: async () => {
            const scope = {
              region: (region || 'IN').toUpperCase(),
              assetType: (assetType || 'STOCK').toUpperCase(),
              timeframe: (ctx.timeframe || '1d').toLowerCase(),
            };
            const mpSnap = await services.marketPulseService.latestSnapshot(scope);
            if (mpSnap && mpSnap.availability !== 'EMPTY') {
              await cacheService.setJson(marketPulseKey(scope), mpSnap);
            } else {
              await cacheService.delete(marketPulseKey(scope));
            }
          },
        },
      ];

      const warnings: string[] = [];
      let succeeded = 0;
      let failed = 0;

      for (const task of tasks) {
        try {
          await task.warm();
          succeeded += 1;
          ctx.log(`[cache] warmed ${task.name} for ${region}/${assetType}`);
        } catch (error) {
          failed += 1;
          warnings.push(`${task.name}: ${(error as Error)?.message ?? 'warm failed'}`);
        }
        ctx.heartbeat();
      }

      return {
        status: failed === 0 ? 'COMPLETED' : 'PARTIAL',
        succeededCount: succeeded,
        failedCount: failed,
        processedCount: tasks.length,
        totalCount: tasks.length,
        warnings: warnings.length > 0 ? warnings : undefined,
        metadata: { warmedEndpoints: succeeded, totalEndpoints: tasks.length },
      };
    },
  };
}
