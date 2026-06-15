/**
 * pipeline-dag-stages-crypto.ts
 *
 * The CRYPTO daily pipeline stage graph. Crypto is isolated from the equity DAG
 * (different universe, no instrument-eligibility gating, 24/7 cadence), so it runs
 * as its OWN adapter set through the SAME PipelineDagRunner + RepositoryDagPersistence
 * — which means every crypto stage is recorded in pipeline_runs / pipeline_stage_runs
 * and shows up in /admin/pipeline-ops exactly like the equity stages.
 *
 * Services are lazy-required inside run() (not statically imported) to avoid the
 * static upstream→downstream module cycle (pipeline-orchestration is downstream of
 * market-data-foundation / signal-generation-engine) — the same cycle-avoidance
 * pattern used by the scheduler crypto lane.
 *
 * STRICT: every datapoint a crypto screen reads is PRODUCED + PERSISTED here. The
 * frontend performs no computation; it reads the rows these stages write.
 */
import type { PipelineStageAdapter, StageContext, StageResult } from './pipeline-dag.types';

/** stageKey → dependsOn. Roots ([]) run as soon as the run starts. */
export const CRYPTO_DAG_EDGES: Readonly<Record<string, readonly string[]>> = {
  CRYPTO_UNIVERSE_INGEST: [],
  CRYPTO_PRICE_BACKFILL: ['CRYPTO_UNIVERSE_INGEST'],
  CRYPTO_FUNDAMENTALS: ['CRYPTO_UNIVERSE_INGEST'],
  CRYPTO_FUTURES: ['CRYPTO_UNIVERSE_INGEST'],
  CRYPTO_SIGNALS: ['CRYPTO_PRICE_BACKFILL'],
  CRYPTO_MARKET_SCANS: ['CRYPTO_PRICE_BACKFILL'],
  CRYPTO_MARKET_CONTEXT: ['CRYPTO_PRICE_BACKFILL'],
  CRYPTO_DAILY_METRICS: [
    'CRYPTO_SIGNALS',
    'CRYPTO_MARKET_SCANS',
    'CRYPTO_MARKET_CONTEXT',
    'CRYPTO_FUNDAMENTALS',
    'CRYPTO_FUTURES',
  ],
};

const STAGE_VERSION = 'crypto-dag-v1';

/** Build a COMPLETED/SKIPPED StageResult from a processed count + optional warnings. */
function ok(count: number, warnings: string[] = [], metadata: Record<string, unknown> = {}): StageResult {
  return {
    status: count > 0 ? 'COMPLETED' : 'SKIPPED',
    succeededCount: count,
    failedCount: 0,
    processedCount: count,
    totalCount: count,
    warnings: warnings.length ? warnings : undefined,
    metadata,
  };
}

function fail(err: unknown): StageResult {
  return {
    status: 'FAILED',
    succeededCount: 0,
    failedCount: 1,
    errors: [err instanceof Error ? err.message : String(err)],
  };
}

/** Wrap a stage body with uniform try/catch + heartbeat. */
function makeStage(
  key: string,
  dependsOn: string[],
  body: (ctx: StageContext) => Promise<StageResult>,
): PipelineStageAdapter {
  return {
    key,
    stageOrder: 1,
    stageVersion: STAGE_VERSION,
    dependsOn,
    supportsInstrumentScope: false,
    async run(ctx: StageContext): Promise<StageResult> {
      try {
        const result = await body(ctx);
        ctx.heartbeat();
        return result;
      } catch (err) {
        return fail(err);
      }
    },
  };
}

export function buildCryptoPipelineDagAdapters(): PipelineStageAdapter[] {
  const adapters: PipelineStageAdapter[] = [
    makeStage('CRYPTO_UNIVERSE_INGEST', [...CRYPTO_DAG_EDGES.CRYPTO_UNIVERSE_INGEST], async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { cryptoIngestionService } = require('../market-data-foundation/ingestion/crypto/market-data-foundation.crypto-ingestion.service');
      const s = await cryptoIngestionService.ingestUniverse({ limit: 500 });
      return ok(s.assetsReceived, s.warnings, { inserted: s.assetsInserted, updated: s.assetsUpdated });
    }),

    makeStage('CRYPTO_PRICE_BACKFILL', [...CRYPTO_DAG_EDGES.CRYPTO_PRICE_BACKFILL], async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { cryptoIngestionService } = require('../market-data-foundation/ingestion/crypto/market-data-foundation.crypto-ingestion.service');
      const s = await cryptoIngestionService.backfillPrices({ incremental: true, minLookbackDays: 2 });
      const warnings = s.aborted ? [...s.warnings, 'circuit-breaker aborted backfill'] : s.warnings;
      return ok(s.symbolsProcessed, warnings, { inserted: s.barsInserted, updated: s.barsUpdated, failed: s.symbolsFailed });
    }),

    makeStage('CRYPTO_FUNDAMENTALS', [...CRYPTO_DAG_EDGES.CRYPTO_FUNDAMENTALS], async (ctx) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { cryptoMetricsService } = require('../market-data-foundation/ingestion/crypto/market-data-foundation.crypto-metrics.service');
      const s = await cryptoMetricsService.ingestFundamentals({ asOf: new Date(ctx.tradingDate) });
      return ok(s.count, s.warnings);
    }),

    makeStage('CRYPTO_FUTURES', [...CRYPTO_DAG_EDGES.CRYPTO_FUTURES], async (ctx) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { cryptoMetricsService } = require('../market-data-foundation/ingestion/crypto/market-data-foundation.crypto-metrics.service');
      const s = await cryptoMetricsService.ingestFutures({ asOf: new Date(ctx.tradingDate) });
      return ok(s.count, s.warnings);
    }),

    makeStage('CRYPTO_SIGNALS', [...CRYPTO_DAG_EDGES.CRYPTO_SIGNALS], async (ctx) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { cryptoSignalGenerationService } = require('../signal-generation-engine/signal-generation-engine.crypto-service');
      const s = await cryptoSignalGenerationService.generateAll({ asOf: new Date(ctx.tradingDate) });
      // processedCount reflects work done even on an idempotent re-run (generatedCount
      // is 0 when signals already exist for the date — that's a no-op, not a skip).
      const count = (s?.processedCount ?? s?.generatedCount ?? 0) as number;
      return ok(count, [], { generated: s?.generatedCount, processed: s?.processedCount });
    }),

    makeStage('CRYPTO_MARKET_SCANS', [...CRYPTO_DAG_EDGES.CRYPTO_MARKET_SCANS], async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { marketDataFoundationCryptoRepository } = require('../market-data-foundation/ingestion/crypto/market-data-foundation.crypto-repository');
      const s = await marketDataFoundationCryptoRepository.refreshMarketScans();
      const count = Object.values(s ?? {}).reduce((a: number, b) => a + (typeof b === 'number' ? b : 0), 0);
      return ok(count, [], s as Record<string, unknown>);
    }),

    makeStage('CRYPTO_MARKET_CONTEXT', [...CRYPTO_DAG_EDGES.CRYPTO_MARKET_CONTEXT], async (ctx) => {
      const asOf = new Date(ctx.tradingDate);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { MarketContextIntelligenceService } = require('../market-context-intelligence/market-context-intelligence.service');
      await new MarketContextIntelligenceService().runCryptoContextAsOf(asOf);
      // Persist Fear & Greed onto the just-written region=CRYPTO snapshot (date-agnostic:
      // patch the latest CRYPTO row so it stays correct regardless of date normalization).
      let fgNote = 'fear&greed unavailable';
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { cryptoMetricsService } = require('../market-data-foundation/ingestion/crypto/market-data-foundation.crypto-metrics.service');
        const fg = await cryptoMetricsService.getLatestFearGreed();
        if (fg && fg.index != null) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const prisma = require('../../db/prisma').default;
          const latest = await prisma.marketContextSnapshot.findFirst({
            where: { region: 'CRYPTO' },
            orderBy: { snapshotDate: 'desc' },
            select: { id: true },
          });
          if (latest) {
            await prisma.marketContextSnapshot.update({
              where: { id: latest.id },
              data: { fearGreedIndex: fg.index, fearGreedLabel: fg.label },
            });
            fgNote = `fear&greed ${fg.index} (${fg.label})`;
          }
        }
      } catch {
        // Non-fatal: regime/breadth already persisted; F&G is a bonus gauge.
      }
      return ok(1, [], { fearGreed: fgNote });
    }),

    makeStage('CRYPTO_DAILY_METRICS', [...CRYPTO_DAG_EDGES.CRYPTO_DAILY_METRICS], async (ctx) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { cryptoMetricsService } = require('../market-data-foundation/ingestion/crypto/market-data-foundation.crypto-metrics.service');
      const s = await cryptoMetricsService.deriveAndPersist({ asOf: new Date(ctx.tradingDate) });
      return ok(s.rowsPersisted, s.warnings, { assetsProcessed: s.assetsProcessed });
    }),
  ];

  // Sanity: adapter set and edge map must agree (mirrors buildPipelineDagAdapters).
  const adapterKeys = new Set(adapters.map((a) => a.key));
  for (const key of Object.keys(CRYPTO_DAG_EDGES)) {
    if (!adapterKeys.has(key)) throw new Error(`CryptoDagRegistry: missing adapter "${key}"`);
  }
  return adapters;
}
