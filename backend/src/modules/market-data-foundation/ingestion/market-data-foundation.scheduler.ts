import { normalizeMarketRegion } from '../../../shared/utils/market-scope';
import { MarketDataFoundationService } from '../market-data-foundation.service';
import { latestCompletedTradingDateForRegion, shouldRunMarketDataSync } from './market-data-foundation.market-session';
import type {
  MarketDataSchedulerRegionStatus,
  MarketDataSchedulerStatus,
  ScheduledRegionSyncSummary,
} from '../market-data-foundation.types';

type ScheduledDataQualityRunner = {
  runScheduledPipelineCatchUpFromMarketDataSummary(summary: ScheduledRegionSyncSummary, now?: Date): Promise<unknown>;
};

export interface MarketDataSchedulerConfig {
  enabled: boolean;
  intervalMinutes: number;
  regions: string[];
  assetType: string;
  batchSize: number;
  syncDuringMarketHours: boolean;
  // Optional: when left undefined the region-specific base values from
  // market-session config take effect (NSE = 18:30 IST finalization / 20:30
  // post-close window). Only set these to FORCE a global override across every
  // scheduled region — which is rarely what you want once US/EU are scheduled.
  postCloseSyncWindowMinutes?: number;
  finalizationGraceMinutes?: number;
  skipWeekends: boolean;
  runOnStartup?: boolean;
}

export class MarketDataFoundationScheduler {
  private timer: NodeJS.Timeout | null = null;
  private activeRun = false;
  private lastRunAt: Date | null = null;
  private nextSuggestedRunAt: string | null = null;
  private lastCryptoLaneRunAt: Date | null = null;

  constructor(
    private readonly service = new MarketDataFoundationService(),
    private readonly config = readMarketDataSchedulerConfig(),
    private readonly pipelineOrchestration?: ScheduledDataQualityRunner,
    /**
     * Optional crypto 24/7 lane runner.  Injected (not hard-wired) so unit tests
     * of the equity scheduler never trigger crypto ingest/signal side effects.
     * Production wires `defaultCryptoLaneRunner` on the singleton below.
     */
    private readonly cryptoLaneRunner?: CryptoLaneRunner,
  ) {}

  start(options: { runStartup?: boolean } = {}) {
    if (!this.config.enabled || this.timer) return;
    const intervalMs = Math.max(1, this.config.intervalMinutes) * 60_000;
    this.timer = setInterval(() => {
      this.runOnce().catch((error) => {
        console.error('[MarketDataScheduler] scheduled run failed', error);
      });
    }, intervalMs);
    console.log('[MarketDataScheduler] started', this.publicConfig());
    const runStartup = options.runStartup ?? this.config.runOnStartup;
    if (runStartup) {
      setTimeout(() => {
        this.runOnce(new Date(), { triggerType: 'startup' }).catch((error) => {
          console.error('[MarketDataScheduler] startup run failed', error);
        });
      }, 0);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(now = new Date(), options: { triggerType?: 'scheduled' | 'startup' } = {}) {
    if (this.activeRun) {
      console.log('[MarketDataScheduler] skipping overlapping run');
      return [];
    }

    this.activeRun = true;
    this.lastRunAt = now;
    try {
      const results = [];
      const schedulerTriggerType = options.triggerType || 'scheduled';

      // The stock lane only syncs the CM segment; INDEX/SECTOR_INDEX/VIX and
      // DELIVERY have no other automated trigger, so catch them up here every
      // tick. Idempotent: already-ingested trading dates are skipped.
      if (this.config.assetType === 'STOCK' && this.config.regions.includes('IN')) {
        try {
          const catchUp = await this.service.runNseIndexAndDeliveryCatchUp();
          if (catchUp.index.length || catchUp.delivery.length) {
            console.log('[MarketDataScheduler] NSE index/delivery catch-up ran', catchUp);
          }
        } catch (error) {
          console.error('[MarketDataScheduler] NSE index/delivery catch-up failed', {
            error: error instanceof Error ? error.message : 'unknown error',
          });
        }
      }

      for (const region of this.config.regions) {
        const latest = await this.service.latestStoredCandleInfo(region, this.config.assetType, now);
        const activePriceBackfill = this.service.activePriceBackfillRun({
          region,
          assetType: this.config.assetType,
        });
        const decision = shouldRunMarketDataSync(region, now, {
          latestTradingDate: latest.latestTradingDate,
          finalConfirmed: latest.finalConfirmed,
        }, this.sessionOptions());
        const latestCompletedTradingDate = latestCompletedTradingDateForRegion(region, now);
        const missingLatestCompleted = Boolean(
          latestCompletedTradingDate
            && (!latest.latestTradingDate || latest.latestTradingDate < latestCompletedTradingDate)
        );
        const marketDataRunIncomplete = latest.syncState?.status === 'PENDING';
        this.nextSuggestedRunAt = decision.nextSuggestedRunAt ?? this.nextSuggestedRunAt;

        console.log('[MarketDataScheduler] region decision', {
          region,
          assetType: this.config.assetType,
          shouldRun: decision.shouldRun || missingLatestCompleted || marketDataRunIncomplete,
          reasonCode: decision.reasonCode,
          tradingDate: decision.todayTradingDate,
          missingLatestCompleted,
          marketDataRunIncomplete,
          latestCompletedTradingDate,
          latestStoredTradingDate: latest.latestTradingDate,
          activePriceBackfillRunId: activePriceBackfill?.runId,
          triggerType: schedulerTriggerType,
        });

        if (!decision.shouldRun && !missingLatestCompleted && !marketDataRunIncomplete) {
          let scheduledDataQuality: unknown = null;
          const priorSummary = this.toScheduledRegionSyncSummary(latest.syncState?.lastSummary);
          if (priorSummary) {
            scheduledDataQuality = await this.runDownstreamCatchUp(priorSummary, now).catch((error) => {
              console.error('[MarketDataScheduler] downstream catch-up failed for current market data', {
                region,
                assetType: this.config.assetType,
                error: error instanceof Error ? error.message : 'unknown error',
              });
              return null;
            });
          }
          results.push({ region, skipped: true, decision, scheduledDataQuality, activePriceBackfillRunId: activePriceBackfill?.runId });
          continue;
        }
        if (activePriceBackfill) {
          console.log('[MarketDataScheduler] running incremental latest-candle sync while price backfill continues in background', {
            region,
            assetType: this.config.assetType,
            priceBackfillRunId: activePriceBackfill.runId,
          });
        }

        const summary = await this.service.syncScheduledRegion(region, {
          assetType: this.config.assetType,
          batchSize: this.config.batchSize,
          now,
          ...this.sessionOptions(),
        });
        // FIX D: reroute from the legacy runScheduledDataQualityStage chain to the DAG
        // via runDownstreamCatchUp — which calls runScheduledPipelineCatchUpFromMarketDataSummary
        // (now DAG-backed) or falls back to the direct executeDagPipeline shape.
        let scheduledDataQuality: unknown = null;
        if (summary && this.shouldRunScheduledDataQuality(summary)) {
          scheduledDataQuality = await this.runDownstreamCatchUp(summary, now).catch((error) => {
            console.error('[MarketDataScheduler] scheduled DAG pipeline failed', {
              region: summary.region,
              assetType: summary.assetType,
              error: error instanceof Error ? error.message : 'unknown error',
            });
            return null;
          });
        }
        results.push({ region, skipped: false, decision, summary, scheduledDataQuality, activePriceBackfillRunId: activePriceBackfill?.runId });
      }

      // ── Crypto lane (GLOBAL:CRYPTO, 24/7) ─────────────────────────────────────
      // Isolated from the equity region loop: crypto data lives in crypto_* tables
      // and uses a dedicated lean path (incremental OHLCV ingest → crypto signals).
      const cryptoResult = await this.runCryptoLane(now).catch((error) => {
        console.error('[MarketDataScheduler] crypto lane failed', error);
        return null;
      });
      if (cryptoResult) results.push(cryptoResult);

      return results;
    } finally {
      this.activeRun = false;
    }
  }

  private cryptoLaneEnabled(): boolean {
    const explicit = process.env.MARKET_DATA_CRYPTO_LANE_ENABLED;
    if (explicit !== undefined) return String(explicit).toLowerCase() !== 'false';
    // Default ON when the crypto provider is enabled.
    return String(process.env.MARKET_DATA_CRYPTO_PROVIDER_ENABLED ?? 'true').toLowerCase() !== 'false';
  }

  /**
   * Crypto 24/7 lane — delegates to the injected runner (off unless wired, so the
   * equity scheduler unit tests never trigger crypto side effects).  Best-effort.
   */
  private async runCryptoLane(now: Date): Promise<CryptoLaneResult | null> {
    if (!this.cryptoLaneEnabled() || !this.cryptoLaneRunner) return null;
    // The equity EOD gate now polls every ~15 min (so it reliably catches the
    // post-close window). The crypto lane is heavier — incremental OHLCV ingest
    // + signals + market scans + crypto context — and the free providers
    // throttle, so cap it to at most once per MARKET_DATA_CRYPTO_LANE_INTERVAL
    // (default 60 min) independently of the faster equity poll cadence.
    const minIntervalMinutes = Math.max(parseNumber(process.env.MARKET_DATA_CRYPTO_LANE_INTERVAL_MINUTES, 60), 1);
    if (this.lastCryptoLaneRunAt && now.getTime() - this.lastCryptoLaneRunAt.getTime() < minIntervalMinutes * 60_000) {
      return null;
    }
    this.lastCryptoLaneRunAt = now;
    return this.cryptoLaneRunner(now);
  }

  async status(now = new Date()): Promise<MarketDataSchedulerStatus> {
    const regionStatuses: MarketDataSchedulerRegionStatus[] = [];
    let earliestNext: string | null = null;

    for (const region of this.config.regions) {
      const latest = await this.service.latestStoredCandleInfo(region, this.config.assetType, now);
      const decision = shouldRunMarketDataSync(region, now, {
        latestTradingDate: latest.latestTradingDate,
        finalConfirmed: latest.finalConfirmed,
      }, this.sessionOptions());
      const syncState = latest.syncState;
      const latestCompletedTradingDate = latestCompletedTradingDateForRegion(region, now);
      const latestStoredTradingDate = latest.latestTradingDate ?? null;
      const todayCandleStored = Boolean(decision.todayTradingDate && latestStoredTradingDate === decision.todayTradingDate);
      const latestCompletedCandleStored = Boolean(latestCompletedTradingDate && latestStoredTradingDate === latestCompletedTradingDate);
      const latestStoredCandleIsCurrent = Boolean(
        latestStoredTradingDate
          && latestCompletedTradingDate
          && latestStoredTradingDate >= latestCompletedTradingDate
      );
      if (decision.nextSuggestedRunAt && (!earliestNext || decision.nextSuggestedRunAt < earliestNext)) {
        earliestNext = decision.nextSuggestedRunAt;
      }
      regionStatuses.push({
        region,
        assetType: this.config.assetType,
        sessionState: decision.sessionState,
        shouldRunNow: decision.shouldRun,
        reason: decision.reason,
        todayTradingDate: decision.todayTradingDate,
        latestCompletedTradingDate,
        latestStoredTradingDate,
        todayCandleStored,
        latestCompletedCandleStored,
        latestStoredCandleIsCurrent,
        candleSyncStatus: this.candleSyncStatus({
          sessionKnown: latestCompletedTradingDate !== null,
          finalConfirmed: latest.finalConfirmed,
          todayCandleStored,
          latestStoredTradingDate,
          latestCompletedTradingDate,
          latestCompletedCandleStored,
        }),
        finalConfirmed: latest.finalConfirmed,
        nextSuggestedRunAt: decision.nextSuggestedRunAt,
        lastSummary: syncState?.lastSummary,
      });
    }

    this.nextSuggestedRunAt = earliestNext ?? this.nextSuggestedRunAt;
    return {
      enabled: this.config.enabled,
      intervalMinutes: this.config.intervalMinutes,
      regions: this.config.regions,
      assetType: this.config.assetType,
      activeRun: this.activeRun,
      lastRunAt: this.lastRunAt?.toISOString() ?? null,
      nextSuggestedRunAt: this.nextSuggestedRunAt,
      regionStatuses,
    };
  }

  configuredForStartupRun(): boolean {
    return this.config.enabled && this.config.runOnStartup !== false;
  }

  private sessionOptions() {
    return {
      syncDuringMarketHours: this.config.syncDuringMarketHours,
      postCloseSyncWindowMinutes: this.config.postCloseSyncWindowMinutes,
      finalizationGraceMinutes: this.config.finalizationGraceMinutes,
      skipWeekends: this.config.skipWeekends,
    };
  }

  private publicConfig() {
    return {
      enabled: this.config.enabled,
      intervalMinutes: this.config.intervalMinutes,
      regions: this.config.regions,
      assetType: this.config.assetType,
      batchSize: this.config.batchSize,
      syncDuringMarketHours: this.config.syncDuringMarketHours,
      runOnStartup: this.config.runOnStartup,
    };
  }

  private candleSyncStatus(input: {
    sessionKnown: boolean;
    finalConfirmed: boolean;
    todayCandleStored: boolean;
    latestStoredTradingDate: string | null;
    latestCompletedTradingDate: string | null;
    latestCompletedCandleStored: boolean;
  }): MarketDataSchedulerRegionStatus['candleSyncStatus'] {
    if (!input.sessionKnown) return 'UNKNOWN_SESSION';
    if (!input.latestStoredTradingDate) return 'NO_STORED_CANDLES';
    if (input.todayCandleStored && !input.finalConfirmed) return 'TODAY_STORED_PENDING_FINAL_CONFIRMATION';
    if (input.latestCompletedCandleStored) return 'CURRENT';
    return 'MISSING_LATEST_COMPLETED';
  }

  private shouldRunScheduledDataQuality(summary: ScheduledRegionSyncSummary) {
    if (!summary.dqStageEligible) return false;
    const downstreamIds = summary.downstreamInstrumentIds?.length ? summary.downstreamInstrumentIds : summary.changedInstrumentIds || [];
    if (downstreamIds.length === 0) return false;
    if (!summary.sourceFingerprint || !summary.dataThroughDate) return false;
    return true;
  }

  private async createScheduledDataQualityRunner(): Promise<ScheduledDataQualityRunner> {
    const module = await import('../../pipeline-orchestration/pipeline-orchestration.service');
    return new module.PipelineOrchestrationService();
  }

  private async runDownstreamCatchUp(summary: ScheduledRegionSyncSummary, now: Date): Promise<unknown> {
    if (!this.shouldRunScheduledDataQuality(summary)) return null;
    const pipelineOrchestration = this.pipelineOrchestration || await this.createScheduledDataQualityRunner();
    return pipelineOrchestration.runScheduledPipelineCatchUpFromMarketDataSummary(summary, now);
  }

  private toScheduledRegionSyncSummary(value: unknown): ScheduledRegionSyncSummary | null {
    if (!value || typeof value !== 'object') return null;
    const summary = value as Partial<ScheduledRegionSyncSummary>;
    if (!summary.region || !summary.assetType || !summary.tradingDate) return null;
    return summary as ScheduledRegionSyncSummary;
  }
}

export function readMarketDataSchedulerConfig(env = process.env): MarketDataSchedulerConfig {
  const rawRegions = (env.MARKET_DATA_SCHEDULER_REGIONS || 'IN')
    .split(',')
    .map((region) => normalizeMarketRegion(region.trim()))
    .filter((region) => Boolean(region && region !== 'GLOBAL'))
    .map((region) => String(region));

  return {
    enabled: parseBoolean(env.MARKET_DATA_SCHEDULER_ENABLED, false),
    // Short poll cadence (default 15 min). The market-session gate decides when
    // a tick actually fetches — so polling frequently lets the scheduler hit the
    // post-close EOD window regardless of when the server booted, while staying
    // idempotent (FINAL_CONFIRMED / RECENTLY_SYNCED skips bound provider load).
    intervalMinutes: Math.max(parseNumber(env.MARKET_DATA_SCHEDULER_INTERVAL_MINUTES, 15), 1),
    regions: rawRegions.length > 0 ? rawRegions : ['IN'],
    assetType: (env.MARKET_DATA_SCHEDULER_ASSET_TYPE || 'STOCK').trim().toUpperCase(),
    batchSize: parseNumber(env.MARKET_DATA_SCHEDULER_BATCH_SIZE, 25),
    syncDuringMarketHours: parseBoolean(env.MARKET_DATA_SCHEDULER_SYNC_DURING_MARKET_HOURS, false),
    // Left undefined unless explicitly set, so each region uses its own base
    // market-session window/grace (see DEFAULT_MARKET_SESSION_CONFIGS).
    postCloseSyncWindowMinutes: parseOptionalNumber(env.MARKET_DATA_SCHEDULER_POST_CLOSE_WINDOW_MINUTES),
    finalizationGraceMinutes: parseOptionalNumber(env.MARKET_DATA_SCHEDULER_FINALIZATION_GRACE_MINUTES),
    skipWeekends: parseBoolean(env.MARKET_DATA_SCHEDULER_SKIP_WEEKENDS, true),
    runOnStartup: parseBoolean(env.MARKET_DATA_SCHEDULER_RUN_ON_STARTUP, true),
  };
}

export interface CryptoLaneResult {
  lane: 'CRYPTO';
  ingest: unknown;
  signals: unknown;
}

export type CryptoLaneRunner = (now: Date) => Promise<CryptoLaneResult | null>;

/**
 * Tracks the last UTC day the crypto universe was refreshed so the 24/7 lane
 * re-fetches the Binance-tradable catalog at most once per day (cheap: one
 * CoinPaprika call) rather than on every 15-minute tick.  Resets on process
 * restart (so a fresh boot also refreshes).
 */
let lastCryptoUniverseRefreshUtcDay: string | null = null;

/**
 * Production crypto lane runner: incremental OHLCV ingest for active crypto assets,
 * then a crypto signal refresh.  The two services are lazy-required to avoid a
 * STATIC upstream→downstream module cycle (market-data-foundation is upstream of
 * signal-generation-engine) — the lazy-require cycle-avoidance pattern used
 * elsewhere in the repo.
 */
export const defaultCryptoLaneRunner: CryptoLaneRunner = async (now: Date) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { cryptoIngestionService } = require('./crypto/market-data-foundation.crypto-ingestion.service');
  // Refresh the Binance-tradable universe at most once per UTC day so coins newly
  // listed on Binance are added to crypto_assets (incremental backfill then gives
  // them a full history on the next tick). Cheap: a single CoinPaprika /tickers call.
  const utcDay = now.toISOString().slice(0, 10);
  if (lastCryptoUniverseRefreshUtcDay !== utcDay) {
    try {
      await cryptoIngestionService.ingestUniverse({ limit: 500 });
      lastCryptoUniverseRefreshUtcDay = utcDay;
    } catch (error) {
      console.error('[CryptoLane] universe refresh failed', error);
    }
  }
  // Incremental per-symbol ingest (resumes from the latest stored candle); a small
  // lookback floor handles 24/7 boundary/overlap. Free-API friendly; provider throttles internally.
  const ingest = await cryptoIngestionService.backfillPrices({ incremental: true, minLookbackDays: 2 });
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { cryptoSignalGenerationService } = require('../../signal-generation-engine/signal-generation-engine.crypto-service');
  const signals = await cryptoSignalGenerationService.generateAll({ asOf: now });
  // Refresh crypto market scans (52w high/low, volume spike, movers, market-map) from fresh prices+signals.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { marketDataFoundationCryptoRepository } = require('./crypto/market-data-foundation.crypto-repository');
  await marketDataFoundationCryptoRepository.refreshMarketScans();
  // Crypto-native market context (breadth + regime + BTC dominance), persisted under region='CRYPTO'.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MarketContextIntelligenceService } = require('../../market-context-intelligence/market-context-intelligence.service');
  await new MarketContextIntelligenceService().runCryptoContextAsOf(now).catch((error: unknown) => {
    console.error('[CryptoLane] crypto market-context refresh failed', error);
  });
  return { lane: 'CRYPTO' as const, ingest, signals };
};

const singletonScheduler = new MarketDataFoundationScheduler(
  undefined,
  undefined,
  undefined,
  defaultCryptoLaneRunner,
);

export function startMarketDataFoundationScheduler(options: { runStartup?: boolean } = {}) {
  singletonScheduler.start(options);
  return singletonScheduler;
}

export async function startMarketDataStartupLoads(env = process.env) {
  const scheduler = startMarketDataFoundationScheduler({ runStartup: false });
  if (env.NODE_ENV !== 'test' && scheduler.configuredForStartupRun()) {
    await scheduler.runOnce(new Date(), { triggerType: 'startup' }).catch((error) => {
      console.error('[MarketDataScheduler] startup run failed', error);
      return [];
    });
  }
  return startMarketDataStartupPriceBackfill(env);
}

export async function startMarketDataStartupPriceBackfill(env = process.env) {
  const regions = (env.MARKET_DATA_SCHEDULER_REGIONS || 'IN')
    .split(',')
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);
  console.log(
    `[MarketDataStartupBackfill] startup price backfill is a no-op stub (regions configured: ${regions.join(', ')}).`,
    'Run seed-us-indices.ts / seed-us-universe.ts manually for initial price history.',
  );
  return null;
}

export function getMarketDataFoundationScheduler() {
  return singletonScheduler;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function parseNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
