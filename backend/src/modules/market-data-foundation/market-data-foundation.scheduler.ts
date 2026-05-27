import { normalizeMarketRegion } from '../../shared/utils/market-scope';
import { MarketDataFoundationService } from './market-data-foundation.service';
import { latestCompletedTradingDateForRegion, shouldRunMarketDataSync } from './market-data-foundation.market-session';
import type {
  MarketDataSchedulerRegionStatus,
  MarketDataSchedulerStatus,
  ScheduledRegionSyncSummary,
} from './market-data-foundation.types';

type ScheduledDataQualityRunner = {
  runScheduledDataQualityStage(input: {
    region: string;
    assetType: string;
    timeframe: '1d';
    pipelineKey: 'market-intelligence';
    triggerType: 'scheduled';
    dataThroughDate: string;
    sourceFingerprint: string;
    changedInstrumentIds: string[];
    batchSize: number;
    schedulerRunStartedAt: string;
  }): Promise<unknown>;
  runScheduledPipelineCatchUpFromMarketDataSummary?(summary: ScheduledRegionSyncSummary, now?: Date): Promise<unknown>;
};

export interface MarketDataSchedulerConfig {
  enabled: boolean;
  intervalMinutes: number;
  regions: string[];
  assetType: string;
  batchSize: number;
  syncDuringMarketHours: boolean;
  postCloseSyncWindowMinutes: number;
  finalizationGraceMinutes: number;
  skipWeekends: boolean;
  runOnStartup?: boolean;
}

export class MarketDataFoundationScheduler {
  private timer: NodeJS.Timeout | null = null;
  private activeRun = false;
  private lastRunAt: Date | null = null;
  private nextSuggestedRunAt: string | null = null;

  constructor(
    private readonly service = new MarketDataFoundationService(),
    private readonly config = readMarketDataSchedulerConfig(),
    private readonly pipelineOrchestration?: ScheduledDataQualityRunner,
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
        let scheduledDataQuality: unknown = null;
        if (summary && this.shouldRunScheduledDataQuality(summary)) {
          try {
            const pipelineOrchestration = this.pipelineOrchestration || await this.createScheduledDataQualityRunner();
            scheduledDataQuality = await pipelineOrchestration.runScheduledDataQualityStage({
              region: summary.region,
              assetType: summary.assetType,
              timeframe: '1d',
              pipelineKey: 'market-intelligence',
              triggerType: 'scheduled',
              dataThroughDate: summary.dataThroughDate || summary.tradingDate,
              sourceFingerprint: summary.sourceFingerprint || 'scheduled-source:missing',
              changedInstrumentIds: summary.downstreamInstrumentIds?.length ? summary.downstreamInstrumentIds : summary.changedInstrumentIds || [],
              batchSize: Math.max(1, Math.min(this.config.batchSize, 100)),
              schedulerRunStartedAt: now.toISOString(),
            });
          } catch (error) {
            console.error('[MarketDataScheduler] scheduled Data Quality stage failed', {
              region: summary.region,
              assetType: summary.assetType,
              error: error instanceof Error ? error.message : 'unknown error',
            });
          }
        }
        results.push({ region, skipped: false, decision, summary, scheduledDataQuality, activePriceBackfillRunId: activePriceBackfill?.runId });
      }
      return results;
    } finally {
      this.activeRun = false;
    }
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
    const module = await import('../pipeline-orchestration/pipeline-orchestration.service');
    return new module.PipelineOrchestrationService();
  }

  private async runDownstreamCatchUp(summary: ScheduledRegionSyncSummary, now: Date): Promise<unknown> {
    if (!this.shouldRunScheduledDataQuality(summary)) return null;
    const pipelineOrchestration = this.pipelineOrchestration || await this.createScheduledDataQualityRunner();
    if (typeof pipelineOrchestration.runScheduledPipelineCatchUpFromMarketDataSummary === 'function') {
      return pipelineOrchestration.runScheduledPipelineCatchUpFromMarketDataSummary(summary, now);
    }
    return pipelineOrchestration.runScheduledDataQualityStage({
      region: summary.region,
      assetType: summary.assetType,
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'scheduled',
      dataThroughDate: summary.dataThroughDate || summary.tradingDate,
      sourceFingerprint: `${summary.sourceFingerprint}:catchup:${now.toISOString()}`,
      changedInstrumentIds: summary.downstreamInstrumentIds?.length ? summary.downstreamInstrumentIds : summary.changedInstrumentIds || [],
      batchSize: Math.max(1, Math.min(this.config.batchSize, 100)),
      schedulerRunStartedAt: now.toISOString(),
    });
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
    enabled: parseBoolean(env.MARKET_DATA_SCHEDULER_ENABLED, parseBoolean(env.ANGEL_ONE_ENABLE_MARKET_DATA, false)),
    intervalMinutes: Math.max(parseNumber(env.MARKET_DATA_SCHEDULER_INTERVAL_MINUTES, 1440), 1440),
    regions: rawRegions.length > 0 ? rawRegions : ['IN'],
    assetType: (env.MARKET_DATA_SCHEDULER_ASSET_TYPE || 'STOCK').trim().toUpperCase(),
    batchSize: parseNumber(env.MARKET_DATA_SCHEDULER_BATCH_SIZE, 25),
    syncDuringMarketHours: parseBoolean(env.MARKET_DATA_SCHEDULER_SYNC_DURING_MARKET_HOURS, false),
    postCloseSyncWindowMinutes: parseNumber(env.MARKET_DATA_SCHEDULER_POST_CLOSE_WINDOW_MINUTES, 120),
    finalizationGraceMinutes: parseNumber(env.MARKET_DATA_SCHEDULER_FINALIZATION_GRACE_MINUTES, 15),
    skipWeekends: parseBoolean(env.MARKET_DATA_SCHEDULER_SKIP_WEEKENDS, true),
    runOnStartup: parseBoolean(env.MARKET_DATA_SCHEDULER_RUN_ON_STARTUP, true),
  };
}

const singletonScheduler = new MarketDataFoundationScheduler();

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
  if (env.NODE_ENV === 'test') return null;
  const angelEnabled = parseBoolean(env.ANGEL_ONE_ENABLE_MARKET_DATA, false);
  const startupEnabled = parseBoolean(env.MARKET_DATA_STARTUP_PRICE_BACKFILL_ENABLED, false);
  const providerStartupAllowed = parseBoolean(env.MARKET_DATA_ALLOW_STARTUP_PROVIDER_LOADS, false);
  if (startupEnabled && angelEnabled && !providerStartupAllowed) {
    console.warn('[MarketDataStartupBackfill] startup price backfill skipped because provider startup loads are not explicitly allowed');
    return null;
  }
  if (!startupEnabled || !angelEnabled) return null;

  const service = new MarketDataFoundationService();
  const result = await service.startPriceBackfillRun({
    region: env.MARKET_DATA_STARTUP_PRICE_BACKFILL_REGION || 'IN',
    assetType: env.MARKET_DATA_STARTUP_PRICE_BACKFILL_ASSET_TYPE || 'STOCK',
    batchSize: parseNumber(env.MARKET_DATA_STARTUP_PRICE_BACKFILL_BATCH_SIZE, 20),
    workerConcurrency: parseNumber(env.MARKET_DATA_STARTUP_PRICE_BACKFILL_WORKER_CONCURRENCY, 2),
    maxBatches: parseNumber(env.MARKET_DATA_STARTUP_PRICE_BACKFILL_MAX_BATCHES, 5),
    triggerType: 'startup',
    force: false,
    fullReload: false,
    policy: 'INCREMENTAL_LATEST_ONLY',
  });
  console.log('[MarketDataStartupBackfill] price backfill background run', {
    runId: result.runId,
    status: result.status,
    region: result.region,
    assetType: result.assetType,
    batchSize: result.batchSize,
    workerConcurrency: result.workerConcurrency,
    providerThrottleMs: result.providerThrottleMs,
    totalCount: result.totalCount,
    alreadyRunning: result.alreadyRunning === true,
  });
  return result;
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
