import { createHash } from 'crypto';
import { sendPipelineRunAlert } from '../notifications-delivery/pipeline-alert';
import { SnapshotAssemblerService } from '../snapshot-assembler';
import { DataQualityEngineService } from '../data-quality-engine';
import { EarningsIntelligenceService } from '../earnings-intelligence';
import { HistoricalContextSnapshotsService } from '../historical-context-snapshots';
import { MarketContextIntelligenceService, MarketPulseSnapshotService } from '../market-context-intelligence';
import { MarketDataFoundationService } from '../market-data-foundation/market-data-foundation.service';
import type { ScheduledRegionSyncSummary } from '../market-data-foundation/market-data-foundation.types';
import { ResearchHubService } from '../research-hub';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SignalCalibrationEngineService } from '../signal-calibration-engine';
import { SignalQualityLabService } from '../signal-quality-lab';
import { SignalPositionLedgerService } from '../signal-position-ledger';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import { StrategyDecisionEngineService } from '../strategy-decision-engine';
import { TodayTradeReviewService } from '../today-trade-review';
import { StockInterestSnapshotService } from '../market-intelligence';
import { WorkbenchRefreshService } from '../stock-research-workbench';
import { PipelineOrchestrationRepository } from './pipeline-orchestration.repository';
import { buildPipelineDagAdapters } from './pipeline-dag-registry';
import { buildCryptoPipelineDagAdapters } from './pipeline-dag-stages-crypto';
import { PipelineDagRunner } from './pipeline-dag-runner';
import { RepositoryDagPersistence } from './pipeline-dag-persistence';
import type { DagAlertSummary } from './pipeline-dag-runner';
import { triggerDemoPublishIfEnabled } from './demo-publish.trigger';
import type { DagRunResult } from './pipeline-dag.types';
import type {
  PipelineCommandAvailability,
  PipelineCommandCatalogItem,
  PipelineCommandCatalogQuery,
  PipelineCommandCatalogResponse,
  PipelineCommandExecutionContext,
  PipelineCommandKey,
  PipelineCommandRequest,
  PipelineCommandResponse,
  PipelineLatestStageQuery,
  MarketDataStageSnapshotRequest,
  PipelineRunCompleteInput,
  PipelineRunCreateInput,
  PipelineRunRecord,
  PipelineScopeInput,
  PipelineStageCompleteInput,
  PipelineStageCreateInput,
  PipelineStageLeaseInput,
  PipelineStageLeaseResult,
  PipelineStageProgressInput,
  PipelineStageRunRecord,
  PipelineStageStatus,
  PipelineStatusQuery,
  PipelineStatusRunDto,
  PipelineStatusSnapshot,
  PipelineStatusStageDto,
} from './pipeline-orchestration.types';
import { PIPELINE_COMMAND_KEYS } from './pipeline-orchestration.types';

const LEDGER_VERSION = 'pipeline-ledger-v1';
const ACTIVE_STATUSES = new Set(['PENDING', 'RUNNING']);
const TERMINAL_STATUSES = new Set(['COMPLETED', 'PARTIAL', 'FAILED', 'SKIPPED', 'BLOCKED', 'ABANDONED']);
const DEFAULT_LEASE_MS = 600_000;
const DEFAULT_ACTIVE_STALE_MS = DEFAULT_LEASE_MS * 2;
const PROCESS_LOCAL_ID = `${process.pid}-${Math.random().toString(16).slice(2, 10)}`;
const SCHEDULED_DOWNSTREAM_STAGE_KEYS = [
  'DATA_QUALITY',
  'RAW_SIGNALS',
  'SIGNAL_CALIBRATION',
  'EARNINGS_INTELLIGENCE_REFRESH',
  'MARKET_CONTEXT',
  'MARKET_CONTEXT_SNAPSHOT_REFRESH',
  'SMART_MONEY',
  'CONTEXT_SNAPSHOTS',
  'SIGNAL_QUALITY',
  'STRATEGY_DECISION',
  'RESEARCH_PROJECTION',
  'TODAY_REVIEW',
  'SIGNAL_POSITION_LEDGER',
  'SECTOR_INTELLIGENCE_REFRESH',
  'MARKET_PULSE_REFRESH',
  'STOCK_INTEREST_REFRESH',
  'WORKBENCH_REFRESH',
  'MARKET_SCAN_REFRESH',
];

type PipelineCommandPolicy = PipelineCommandCatalogItem & {
  stageOrder: number;
};

const PIPELINE_COMMAND_POLICIES: PipelineCommandPolicy[] = [
  commandPolicy('MARKET_DATA_INCREMENTAL_EOD_LOAD', 'MARKET_DATA', 1, 'Market Data', 'Incremental EOD data load', 'FORBIDDEN', 'Provider/live ingestion is forbidden from Pipeline Ops in this slice.'),
  commandPolicy('MARKET_DATA_PRICE_BACKFILL', 'MARKET_DATA', 1, 'Market Data', 'Price backfill', 'FORBIDDEN', 'Price backfill remains feature-owned until a separate gate approves command migration.'),
  commandPolicy('MARKET_DATA_CATALOG_SYNC', 'MARKET_DATA', 1, 'Market Data', 'Catalog sync', 'FORBIDDEN', 'Catalog sync remains feature-owned until a separate gate approves command migration.'),
  commandPolicy('DATA_QUALITY_EVALUATE_SCOPE', 'DATA_QUALITY', 2, 'Data Quality', 'Readiness evaluation', 'ENABLED', null),
  commandPolicy('RAW_SIGNALS_GENERATE_SCOPE', 'RAW_SIGNALS', 3, 'Signals', 'Raw signal generation', 'DEFERRED', 'Manual command is deferred; scheduler-only explicit-instrument automation is active.'),
  commandPolicy('SIGNAL_CALIBRATION_REFRESH_SCOPE', 'SIGNAL_CALIBRATION', 4, 'Signal Calibration', 'Calibration refresh', 'DEFERRED', 'Manual command is deferred; scheduler-only persisted-signal automation is active.'),
  commandPolicy('CONTEXT_SNAPSHOTS_GENERATE_SCOPE', 'CONTEXT_SNAPSHOTS', 5, 'Context Snapshots', 'Historical context snapshot generation', 'DEFERRED', 'Manual command is deferred; scheduler-only persisted-context automation is active.'),
  commandPolicy('MARKET_CONTEXT_REFRESH_REGION', 'MARKET_CONTEXT', 6, 'Market Context', 'Market context refresh', 'DEFERRED', 'Manual command is deferred; scheduler-only market-context automation is active.'),
  commandPolicy('MARKET_CONTEXT_SNAPSHOT_REFRESH', 'MARKET_CONTEXT_SNAPSHOT_REFRESH', 6, 'Market Context', 'Market Context regime snapshot persist', 'DEFERRED', 'Manual command deferred; scheduler-only regime snapshot automation is active.'),
  commandPolicy('MARKET_PULSE_REFRESH', 'MARKET_PULSE', 7, 'Market Context', 'Market Pulse snapshot refresh', 'ENABLED', null),
  commandPolicy('SECTOR_INTELLIGENCE_REFRESH', 'SECTOR_INTELLIGENCE_REFRESH', 7, 'Market Context', 'Sector intelligence snapshot refresh', 'ENABLED', null),
  commandPolicy('SIGNAL_QUALITY_DIAGNOSTICS_REFRESH', 'SIGNAL_QUALITY', 7, 'Signal Quality', 'Signal quality diagnostics refresh', 'DEFERRED', 'Manual command is deferred; scheduler-only diagnostics refresh is active.'),
  commandPolicy('SMART_MONEY_REFRESH_SCOPE', 'SMART_MONEY', 8, 'Smart Money', 'Smart money refresh', 'DEFERRED', 'Manual command is deferred; scheduler-only explicit-instrument automation is active.'),
  commandPolicy('STRATEGY_DECISION_EVALUATE_SCOPE', 'STRATEGY_DECISION', 9, 'Strategy', 'Strategy decision refresh', 'DEFERRED', 'Manual command is deferred; scheduler-only explicit-instrument evaluation is active.'),
  commandPolicy('BACKTEST_PROOF_REFRESH', 'BACKTEST_PROOF', 10, 'Backtests', 'Backtest proof refresh', 'FORBIDDEN', 'Backtesting proof execution is out of scope for this first command slice.'),
  commandPolicy('RESEARCH_PROJECTION_REFRESH', 'RESEARCH_PROJECTION', 11, 'Research', 'Research projection refresh', 'FORBIDDEN', 'Manual command remains forbidden; scheduler-only research projection automation is active.'),
  commandPolicy('TODAY_REVIEW_PUBLISH', 'TODAY_REVIEW', 12, 'Today Review', 'Today review publish', 'FORBIDDEN', 'Manual command remains forbidden; scheduler-only publication is active with compatibility generation disabled.'),
  commandPolicy('SIGNAL_POSITION_LEDGER_REFRESH', 'SIGNAL_POSITION_LEDGER', 13, 'Signal Position Ledger', 'Materialized ledger refresh', 'DEFERRED', 'Manual command remains module-owned; scheduler-only materialization is active.'),
  commandPolicy('EARNINGS_INTELLIGENCE_REFRESH', 'EARNINGS_INTELLIGENCE_REFRESH', 15, 'Earnings Intelligence', 'Earnings intelligence snapshot refresh', 'ENABLED', null),
  commandPolicy('STOCK_INTEREST_REFRESH', 'STOCK_INTEREST_REFRESH', 16, 'Market Intelligence', 'Stock Interest snapshot refresh', 'ENABLED', null),
  commandPolicy('MARKET_SCAN_REFRESH', 'MARKET_SCAN_REFRESH', 1, 'Market Data', 'Market scan snapshot refresh (movers / 52w / spikes)', 'ENABLED', null),
  commandPolicy(
    'PIPELINE_RUN_ALL',
    'MARKET_DATA',
    1,
    'Pipeline',
    'Run daily market pipeline',
    'ENABLED',
    null,
    ['full_latest_trading_date', 'incremental_changed_only', 'single_batch'],
    100
  ),
  commandPolicy('MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL', 'MARKET_DATA', 1, 'Market Data', 'Historical exchange candle backfill', 'ENABLED', null),
  commandPolicy('MARKET_DATA_MANUAL_VERIFIED_FUNDAMENTALS_IMPORT', 'MARKET_DATA', 1, 'Market Data', 'Manual verified fundamentals import', 'ENABLED', null),
  commandPolicy('PIPELINE_RETRY_FAILED_STAGE', 'PIPELINE', 16, 'Pipeline', 'Retry failed stage or run', 'ENABLED', null),
  commandPolicy('PIPELINE_DAG_RETRY', 'PIPELINE', 16, 'Pipeline', 'DAG retry â€” re-run failed stages via DAG runner', 'ENABLED', null, ['full_latest_trading_date', 'incremental_changed_only'], 100),
  commandPolicy('PIPELINE_DRAIN_ALL_BATCHES', 'PIPELINE', 16, 'Pipeline', 'Drain all batches', 'FORBIDDEN', 'First slice allows one batch per request only.'),
  commandPolicy('PIPELINE_CANCEL_ACTIVE', 'PIPELINE', 16, 'Pipeline', 'Cancel active run', 'FORBIDDEN', 'No background worker cancellation contract exists for this slice.'),
];

const PIPELINE_COMMAND_POLICY_MAP = new Map(PIPELINE_COMMAND_POLICIES.map((policy) => [policy.commandKey, policy]));

// ── Boot-time invariant: policy table must exactly match the canonical key inventory ──────────
// Any key in PIPELINE_COMMAND_KEYS without a policy entry, or any policy key not in the
// inventory, is a structural drift that would cause 400 errors at runtime.  Fail fast at
// module-load time so the mistake is caught immediately (in tests and at startup).
(function assertPolicyInventorySync() {
  const policyKeys = new Set(PIPELINE_COMMAND_POLICIES.map((p) => p.commandKey));
  const inventoryKeys = new Set<string>(PIPELINE_COMMAND_KEYS);

  const missingFromPolicies = PIPELINE_COMMAND_KEYS.filter((k) => !policyKeys.has(k));
  const missingFromInventory = PIPELINE_COMMAND_POLICIES.map((p) => p.commandKey).filter((k: string) => !inventoryKeys.has(k));

  const errors: string[] = [];
  if (missingFromPolicies.length > 0) {
    errors.push(`Keys in PIPELINE_COMMAND_KEYS but missing from PIPELINE_COMMAND_POLICIES: ${missingFromPolicies.join(', ')}`);
  }
  if (missingFromInventory.length > 0) {
    errors.push(`Policy keys missing from PIPELINE_COMMAND_KEYS inventory: ${missingFromInventory.join(', ')}`);
  }
  if (errors.length > 0) {
    throw new Error(`[PipelineOrchestration] Policy/inventory drift detected at module load:\n  ${errors.join('\n  ')}`);
  }
})();

export class PipelineCommandError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly payload?: PipelineCommandResponse
  ) {
    super(message);
  }
}

export class PipelineOrchestrationService {
  constructor(
    private readonly repository = new PipelineOrchestrationRepository(),
    private readonly dataQualityService = new DataQualityEngineService(),
    private readonly signalGenerationService = new SignalGenerationEngineService(),
    private readonly signalCalibrationService = new SignalCalibrationEngineService(),
    private readonly marketContextService = new MarketContextIntelligenceService(),
    private readonly smartMoneyService = new SmartMoneyIntelligenceService(),
    private readonly historicalContextService = new HistoricalContextSnapshotsService(),
    private readonly signalQualityService = new SignalQualityLabService(),
    private readonly strategyDecisionService = new StrategyDecisionEngineService(),
    private readonly researchHubService = new ResearchHubService(),
    private readonly todayReviewService = new TodayTradeReviewService(),
    private readonly signalPositionLedgerService = new SignalPositionLedgerService(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly marketPulseService = new MarketPulseSnapshotService(),
    private readonly earningsIntelligenceService = new EarningsIntelligenceService(),
    private readonly stockInterestService = new StockInterestSnapshotService(),
    private readonly workbenchRefreshService = new WorkbenchRefreshService(),
    private readonly snapshotAssemblerService = new SnapshotAssemblerService()
  ) {}

  // ---------------------------------------------------------------------------
  // DAG runner â€” lazily built once per service instance so constructor
  // injection and test mocking both work without changes to callers.
  // ---------------------------------------------------------------------------
  private _dagRunner: PipelineDagRunner | null = null;

  private getDagRunner(): PipelineDagRunner {
    if (!this._dagRunner) {
      const persistence = new RepositoryDagPersistence(this.repository);
      const adapters = buildPipelineDagAdapters({
        dataQualityService: this.dataQualityService,
        signalGenerationService: this.signalGenerationService,
        signalCalibrationService: this.signalCalibrationService,
        earningsIntelligenceService: this.earningsIntelligenceService,
        marketContextService: this.marketContextService,
        smartMoneyService: this.smartMoneyService,
        historicalContextSnapshotsService: this.historicalContextService,
        signalQualityService: this.signalQualityService,
        strategyDecisionService: this.strategyDecisionService,
        researchHubService: this.researchHubService,
        todayReviewService: this.todayReviewService,
        signalPositionLedgerService: this.signalPositionLedgerService,
        marketDataService: this.marketDataService,
        marketPulseService: this.marketPulseService,
        stockInterestService: this.stockInterestService,
        workbenchRefreshService: this.workbenchRefreshService,
        snapshotAssemblerService: this.snapshotAssemblerService,
      });
      const alertFn = (summary: DagAlertSummary): void => {
        this.firePipelineRunAlert(
          summary.runStatus,
          summary.region,
          summary.assetType,
          summary.dataThroughDate,
          summary.durationMs,
          summary.stagesSummary,
          summary.firstError ?? null
        );
        // Post-pipeline: refresh + publish the GitHub Pages demo (opt-in, best-effort).
        triggerDemoPublishIfEnabled(summary);
      };
      this._dagRunner = new PipelineDagRunner(adapters, { persistence, alert: alertFn }, { maxConcurrency: 3 });
    }
    return this._dagRunner;
  }

  /**
   * Execute the daily pipeline via the DAG runner.
   *
   * Instrument scope:
   *  - When changedInstrumentIds is non-empty, it is used as the instrument scope.
   *  - Otherwise the full daily-refresh eligible set is resolved via
   *    marketDataService.listDailyRefreshEligibleInstrumentIds (same path as the
   *    legacy full_latest_trading_date mode).
   *
   * Alert: fired by the runner itself via the alert hook above â€” callers MUST NOT
   * also fire a legacy chain alert for the DAG path.
   */
  async executeDagPipeline(params: {
    tradingDate: string;
    region: string;
    assetType: string;
    timeframe: string;
    trigger: 'scheduled' | 'manual' | 'retry';
    changedInstrumentIds?: string[] | null;
    fromStage?: string;
    sourceFingerprint?: string;
  }): Promise<DagRunResult> {
    const runner = this.getDagRunner();

    // Resolve instrument scope.
    let instrumentScope: string[] | null = null;
    const provided = this.normalizeInstrumentIds(params.changedInstrumentIds);
    if (provided.length > 0) {
      instrumentScope = provided;
    } else {
      // Full daily refresh: resolve eligible set from market data service.
      const resolver = (this.marketDataService as any).listDailyRefreshEligibleInstrumentIds;
      if (typeof resolver === 'function') {
        let eligibilityError: string | null = null;
        try {
          const eligibility = await resolver.call(this.marketDataService, {
            region: params.region,
            assetType: params.assetType,
            dataThroughDate: params.tradingDate,
            limit: 10_000,
          });
          const resolved = this.normalizeInstrumentIds(eligibility?.instrumentIds);
          if (resolved.length > 0) {
            instrumentScope = resolved;
          } else {
            eligibilityError = 'eligible-universe resolver returned empty instrument list';
          }
        } catch (err) {
          eligibilityError = err instanceof Error ? err.message : String(err);
        }
        // FIX E2: null scope means every scoped stage silently skips â€” loud failure is
        // preferable so operators know something is wrong rather than seeing a phantom
        // COMPLETED run with zero work done.
        if (instrumentScope === null) {
          throw new PipelineCommandError(
            422,
            `[executeDagPipeline] Cannot resolve instrument scope for ${params.region}:${params.assetType}:${params.tradingDate}: ${eligibilityError ?? 'no eligible instruments'}`,
          );
        }
      }
      // If the resolver method does not exist (tests, legacy stub), proceed with null scope
      // so the runner falls back to its own universe logic (or skips scoped stages).
    }

    return runner.execute({
      tradingDate: params.tradingDate,
      region: params.region,
      assetType: params.assetType,
      timeframe: params.timeframe,
      trigger: params.trigger,
      instrumentScope,
      fromStage: params.fromStage,
      sourceFingerprint: params.sourceFingerprint,
    });
  }

  // ---------------------------------------------------------------------------
  // CRYPTO DAG runner — a SEPARATE adapter set (crypto universe, no equity
  // instrument-eligibility gating) executed through the SAME runner + persistence
  // so crypto stages are tracked in pipeline_runs / pipeline_stage_runs and appear
  // in /admin/pipeline-ops. Built lazily once per service instance.
  // ---------------------------------------------------------------------------
  private _cryptoDagRunner: PipelineDagRunner | null = null;

  private getCryptoDagRunner(): PipelineDagRunner {
    if (!this._cryptoDagRunner) {
      const persistence = new RepositoryDagPersistence(this.repository);
      const adapters = buildCryptoPipelineDagAdapters();
      const alertFn = (summary: DagAlertSummary): void => {
        this.firePipelineRunAlert(
          summary.runStatus,
          summary.region,
          summary.assetType,
          summary.dataThroughDate,
          summary.durationMs,
          summary.stagesSummary,
          summary.firstError ?? null
        );
      };
      this._cryptoDagRunner = new PipelineDagRunner(adapters, { persistence, alert: alertFn }, { maxConcurrency: 3 });
    }
    return this._cryptoDagRunner;
  }

  /**
   * Execute the daily CRYPTO pipeline via the DAG runner. Crypto stages operate on
   * the whole active crypto universe (no per-instrument scope), so instrumentScope
   * is always null — the equity eligibility resolver in executeDagPipeline does not
   * apply to crypto.
   */
  async executeCryptoDagPipeline(params: {
    tradingDate: string;
    trigger: 'scheduled' | 'manual' | 'retry';
    fromStage?: string;
    sourceFingerprint?: string;
  }): Promise<DagRunResult> {
    const runner = this.getCryptoDagRunner();
    return runner.execute({
      tradingDate: params.tradingDate,
      region: 'GLOBAL',
      assetType: 'CRYPTO',
      timeframe: '1d',
      trigger: params.trigger,
      instrumentScope: null,
      fromStage: params.fromStage,
      sourceFingerprint: params.sourceFingerprint,
    });
  }

  createRun(input: PipelineRunCreateInput): Promise<PipelineRunRecord> {
    const normalized = this.normalizeScope(input);
    return this.repository.upsertRun({
      ...input,
      ...normalized,
      idempotencyKey: input.idempotencyKey || this.runIdempotencyKey(input),
    });
  }

  completeRun(input: PipelineRunCompleteInput): Promise<PipelineRunRecord> {
    return this.repository.completeRun(input);
  }

  createStage(input: PipelineStageCreateInput): Promise<PipelineStageRunRecord> {
    const normalized = this.normalizeScope(input);
    return this.repository.upsertStage({
      ...input,
      ...normalized,
      idempotencyKey: input.idempotencyKey || this.stageIdempotencyKey(input),
    });
  }

  async leaseStage(input: PipelineStageLeaseInput): Promise<PipelineStageLeaseResult> {
    if (input.leaseMs <= 0) throw new Error('leaseMs must be positive');
    if (!input.leaseOwner.trim()) throw new Error('leaseOwner is required');
    return this.repository.acquireStageLease(input);
  }

  completeStage(input: PipelineStageCompleteInput): Promise<PipelineStageRunRecord> {
    return this.repository.completeStage(input);
  }

  recordStageProgress(input: PipelineStageProgressInput): Promise<PipelineStageRunRecord> {
    return this.repository.recordStageProgress(input);
  }

  latestStages(query: PipelineLatestStageQuery): Promise<PipelineStageRunRecord[]> {
    return this.repository.latestStages(query);
  }

  /**
   * Reap stale RUNNING and PENDING rows.  Marks RUNNING pipeline_stage_runs/pipeline_runs as
   * FAILED when their lease has expired or startedAt/updatedAt is older than staleThresholdMs.
   * Also marks PENDING stage_runs/pipeline_runs that never started (older than staleThresholdMs)
   * as FAILED so they don't accumulate indefinitely.
   * Safe to call concurrently and idempotently; only touches clearly-stale rows.
   */
  async reapStaleLeases(opts?: { staleThresholdMs?: number; now?: Date }): Promise<{ stageRowsReaped: number; runRowsReaped: number; reaped: Array<{ region: string; assetType: string; dataThroughDate: string | null; pipelineRunId: string }> }> {
    const staleThresholdMs = opts?.staleThresholdMs ?? this.reaperThresholdMs();
    const now = opts?.now ?? new Date();
    return this.repository.reapStaleLeases({ staleThresholdMs, now });
  }

  async status(query: PipelineStatusQuery, now = new Date()): Promise<PipelineStatusSnapshot> {
    const [activeRun, lastRun, stages] = await Promise.all([
      this.repository.findActiveRun(query),
      this.repository.findLastRun(query),
      this.repository.latestStages(query),
    ]);
    return {
      scope: {
        region: query.region,
        assetType: query.assetType,
        timeframe: query.timeframe,
        pipelineKey: query.pipelineKey,
      },
      generatedAt: now.toISOString(),
      activeRun: activeRun && !this.isStaleActiveRun(activeRun, now) ? this.toRunStatus(activeRun) : null,
      lastRun: lastRun ? this.toRunStatus(lastRun) : null,
      stages: this.groupStages(stages, now),
    };
  }

  commandCatalog(query: PipelineCommandCatalogQuery, now = new Date()): PipelineCommandCatalogResponse {
    return {
      scope: {
        region: query.region,
        assetType: query.assetType,
        timeframe: query.timeframe,
        pipelineKey: query.pipelineKey,
      },
      generatedAt: now.toISOString(),
      commands: PIPELINE_COMMAND_POLICIES.map((policy) => ({
        commandKey: policy.commandKey,
        stageKey: policy.stageKey,
        moduleName: policy.moduleName,
        operationName: policy.operationName,
        availability: policy.availability,
        disabledReason: policy.disabledReason,
        runModes: policy.runModes,
        defaultBatchSize: policy.defaultBatchSize,
        maxBatchSize: policy.maxBatchSize,
        providerAccess: policy.providerAccess,
        schedulerAccess: policy.schedulerAccess,
        downstreamFanout: policy.downstreamFanout,
      })),
    };
  }

  async executeCommand(
    request: PipelineCommandRequest,
    context: PipelineCommandExecutionContext,
    now = new Date()
  ): Promise<PipelineCommandResponse> {
    const policy = PIPELINE_COMMAND_POLICY_MAP.get(request.commandKey);
    if (!policy) throw new PipelineCommandError(400, 'Unsupported command key');

    if (policy.availability !== 'ENABLED') {
      throw new PipelineCommandError(
        422,
        policy.disabledReason || `${request.commandKey} is not executable in this slice`,
        this.blockedCommandResponse(request, policy, policy.disabledReason || `${request.commandKey} is not executable in this slice`)
      );
    }

    if (!request.idempotencyKey.trim()) {
      throw new PipelineCommandError(400, 'idempotencyKey is required for executable commands');
    }

    if (!policy.runModes.includes(request.runMode)) {
      throw new PipelineCommandError(400, `${request.commandKey} does not support runMode ${request.runMode}`);
    }

    if (request.commandKey === 'PIPELINE_RUN_ALL') {
      return this.executeDailyPipelineViaDag(request, context, policy, now);
    }

    if (request.commandKey === 'PIPELINE_DAG_RETRY') {
      return this.executeDagRetryCommand(request, context, policy, now);
    }

    if (request.commandKey === 'MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL') {
      return this.executeHistoricalExchangeBackfillCommand(request, context, policy, now);
    }

    if (request.commandKey === 'MARKET_DATA_MANUAL_VERIFIED_FUNDAMENTALS_IMPORT') {
      return this.executeManualVerifiedFundamentalsCommand(request, context, policy, now);
    }

    if (request.commandKey === 'MARKET_PULSE_REFRESH') {
      return this.executeMarketPulseRefreshCommand(request, context, policy, now);
    }

    if (request.commandKey === 'SECTOR_INTELLIGENCE_REFRESH') {
      return this.executeSectorIntelligenceRefreshCommand(request, context, policy, now);
    }

    if (request.commandKey === 'EARNINGS_INTELLIGENCE_REFRESH') {
      return this.executeEarningsIntelligenceRefreshCommand(request, context, policy, now);
    }

    if (request.commandKey === 'STOCK_INTEREST_REFRESH') {
      return this.executeStockInterestRefreshCommand(request, context, policy, now);
    }

    if (request.commandKey === 'MARKET_SCAN_REFRESH') {
      return this.executeMarketScanRefreshCommand(request, context, policy, now);
    }

    if (request.commandKey === 'PIPELINE_RETRY_FAILED_STAGE') {
      return this.executeRetryFailedStageCommand(request, context, policy, now);
    }

    const serverIdempotencyKey = this.commandIdempotencyKey(request);
    const stageIdempotencyKey = serverIdempotencyKey;
    const runIdempotencyKey = `${serverIdempotencyKey}:run`;
    const leaseOwner = `manual-command:${request.commandKey}:${PROCESS_LOCAL_ID}`;

    let stageLease = await this.leaseStage({
      idempotencyKey: stageIdempotencyKey,
      leaseOwner,
      leaseMs: DEFAULT_LEASE_MS,
      now,
      allowTerminalRetry: false,
    });

    if (stageLease.reason === 'STAGE_TERMINAL') {
      return this.duplicateTerminalResponse(request, policy, serverIdempotencyKey, stageLease);
    }

    if (stageLease.reason === 'LEASE_HELD') {
      throw new PipelineCommandError(409, 'Pipeline stage lease is currently held by another command', this.leaseHeldResponse(request, policy, serverIdempotencyKey, stageLease));
    }

    if (stageLease.reason === 'STAGE_NOT_FOUND') {
      const run = await this.createRun({
        pipelineKey: request.pipelineKey,
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        triggerType: 'manual',
        status: 'RUNNING',
        idempotencyKey: runIdempotencyKey,
        startedAt: now,
        metadata: {
          commandKey: request.commandKey,
          runMode: request.runMode,
          requestedByUserId: context.requestedByUserId,
          commandIdempotencyKey: serverIdempotencyKey,
          ...(request.reason ? { reason: request.reason } : {}),
        },
      });

      await this.createStage({
        pipelineRunId: run.id,
        stageKey: policy.stageKey,
        stageOrder: policy.stageOrder,
        status: 'PENDING',
        idempotencyKey: stageIdempotencyKey,
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        batchSize: request.batchSize,
        offset: request.offset,
        nextOffset: request.offset,
        hasMore: false,
        inputFingerprint: `${request.commandKey}:${request.region}:${request.assetType}:${request.timeframe}:${request.offset}:${request.batchSize}`,
        metadata: {
          commandKey: request.commandKey,
          runMode: request.runMode,
          requestedByUserId: context.requestedByUserId,
          commandIdempotencyKey: serverIdempotencyKey,
          ...(request.reason ? { reason: request.reason } : {}),
        },
      });

      stageLease = await this.leaseStage({
        idempotencyKey: stageIdempotencyKey,
        leaseOwner,
        leaseMs: DEFAULT_LEASE_MS,
        now,
        allowTerminalRetry: false,
      });

      if (!stageLease.acquired) {
        if (stageLease.reason === 'STAGE_TERMINAL') return this.duplicateTerminalResponse(request, policy, serverIdempotencyKey, stageLease);
        if (stageLease.reason === 'LEASE_HELD') {
          throw new PipelineCommandError(409, 'Pipeline stage lease is currently held by another command', this.leaseHeldResponse(request, policy, serverIdempotencyKey, stageLease));
        }
        throw new PipelineCommandError(500, `Unable to acquire stage lease after stage creation: ${stageLease.reason}`);
      }
    }

    if (!stageLease.acquired) {
      throw new PipelineCommandError(500, `Unable to acquire stage lease: ${stageLease.reason}`);
    }

    const leasedStage = stageLease.stage;
    if (!leasedStage) {
      throw new PipelineCommandError(500, 'Stage lease was acquired but stage record is missing');
    }
    if (this.isInFlightDuplicateStage(leasedStage, leaseOwner)) {
      throw new PipelineCommandError(
        409,
        'Pipeline stage is already running for this idempotency key',
        this.leaseHeldResponse(request, policy, serverIdempotencyKey, {
          acquired: false,
          reason: 'LEASE_HELD',
          stage: leasedStage,
        })
      );
    }

    try {
      const adapterResult = await this.dataQualityService.evaluate({
        region: request.region,
        assetType: request.assetType,
        batchSize: request.batchSize,
        offset: request.offset,
      });

      const status = this.mapDataQualityStatus(adapterResult.totalCount, adapterResult.failedCount);
      const warnings = this.toStringArray(adapterResult.warnings);
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - now.getTime());

      const completedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status,
        totalCount: adapterResult.totalCount,
        processedCount: adapterResult.processedCount,
        succeededCount: adapterResult.evaluatedCount,
        partialCount: 0,
        failedCount: adapterResult.failedCount,
        skippedCount: adapterResult.skippedCount,
        unchangedCount: 0,
        nextOffset: adapterResult.nextOffset,
        hasMore: adapterResult.hasMore,
        warnings,
        errors: [],
        completedAt,
        durationMs,
        metadata: {
          commandKey: request.commandKey,
          runMode: request.runMode,
          requestedByUserId: context.requestedByUserId,
          commandIdempotencyKey: serverIdempotencyKey,
          adapter: 'DataQualityEngineService.evaluate',
          ...(request.reason ? { reason: request.reason } : {}),
        },
      });

      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status,
        totalCount: adapterResult.totalCount,
        processedCount: adapterResult.processedCount,
        succeededCount: adapterResult.evaluatedCount,
        partialCount: 0,
        failedCount: adapterResult.failedCount,
        skippedCount: adapterResult.skippedCount,
        unchangedCount: 0,
        warnings,
        errors: [],
        completedAt,
        durationMs,
        metadata: {
          commandKey: request.commandKey,
          runMode: request.runMode,
          requestedByUserId: context.requestedByUserId,
          commandIdempotencyKey: serverIdempotencyKey,
          adapter: 'DataQualityEngineService.evaluate',
          ...(request.reason ? { reason: request.reason } : {}),
        },
      });

      return this.responseFromStage(request, policy, serverIdempotencyKey, completedStage, stageLease, status);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Data quality evaluation failed';
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - now.getTime());

      const failedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status: 'FAILED',
        totalCount: leasedStage.totalCount,
        processedCount: leasedStage.processedCount,
        succeededCount: leasedStage.succeededCount,
        partialCount: leasedStage.partialCount,
        failedCount: Math.max(1, leasedStage.failedCount),
        skippedCount: leasedStage.skippedCount,
        unchangedCount: leasedStage.unchangedCount,
        nextOffset: leasedStage.nextOffset,
        hasMore: leasedStage.hasMore,
        warnings: leasedStage.warnings,
        errors: [...leasedStage.errors, errorMessage],
        completedAt,
        durationMs,
        metadata: {
          commandKey: request.commandKey,
          runMode: request.runMode,
          requestedByUserId: context.requestedByUserId,
          commandIdempotencyKey: serverIdempotencyKey,
          adapter: 'DataQualityEngineService.evaluate',
          error: errorMessage,
          ...(request.reason ? { reason: request.reason } : {}),
        },
      });

      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status: 'FAILED',
        totalCount: failedStage.totalCount,
        processedCount: failedStage.processedCount,
        succeededCount: failedStage.succeededCount,
        partialCount: failedStage.partialCount,
        failedCount: failedStage.failedCount,
        skippedCount: failedStage.skippedCount,
        unchangedCount: failedStage.unchangedCount,
        warnings: failedStage.warnings,
        errors: failedStage.errors,
        completedAt,
        durationMs,
        metadata: {
          commandKey: request.commandKey,
          runMode: request.runMode,
          requestedByUserId: context.requestedByUserId,
          commandIdempotencyKey: serverIdempotencyKey,
          adapter: 'DataQualityEngineService.evaluate',
          error: errorMessage,
          ...(request.reason ? { reason: request.reason } : {}),
        },
      });

      return this.responseFromStage(request, policy, serverIdempotencyKey, failedStage, stageLease, 'FAILED');
    }
  }

  private async executeMarketPulseRefreshCommand(
    request: PipelineCommandRequest,
    context: PipelineCommandExecutionContext,
    policy: PipelineCommandPolicy,
    now: Date
  ): Promise<PipelineCommandResponse> {
    this.assertMarketIntelligence1d(request, 'MARKET_PULSE_REFRESH');

    const serverIdempotencyKey = this.commandIdempotencyKey(request);
    const stageIdempotencyKey = serverIdempotencyKey;
    const runIdempotencyKey = `${serverIdempotencyKey}:run`;
    const leaseOwner = `manual-command:${request.commandKey}:${PROCESS_LOCAL_ID}`;

    let stageLease = await this.leaseStage({
      idempotencyKey: stageIdempotencyKey,
      leaseOwner,
      leaseMs: DEFAULT_LEASE_MS,
      now,
      allowTerminalRetry: false,
    });

    if (stageLease.reason === 'STAGE_TERMINAL') {
      return this.duplicateTerminalResponse(request, policy, serverIdempotencyKey, stageLease);
    }
    if (stageLease.reason === 'LEASE_HELD') {
      throw new PipelineCommandError(409, 'Pipeline stage lease is currently held by another command', this.leaseHeldResponse(request, policy, serverIdempotencyKey, stageLease));
    }

    if (stageLease.reason === 'STAGE_NOT_FOUND') {
      const run = await this.createRun({
        pipelineKey: request.pipelineKey,
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        triggerType: 'manual',
        status: 'RUNNING',
        idempotencyKey: runIdempotencyKey,
        startedAt: now,
        metadata: {
          commandKey: request.commandKey,
          runMode: request.runMode,
          requestedByUserId: context.requestedByUserId,
          commandIdempotencyKey: serverIdempotencyKey,
          adapter: 'MarketPulseSnapshotService.refreshSnapshot',
          ...(request.reason ? { reason: request.reason } : {}),
        },
      });

      await this.createStage({
        pipelineRunId: run.id,
        stageKey: policy.stageKey,
        stageOrder: policy.stageOrder,
        status: 'PENDING',
        idempotencyKey: stageIdempotencyKey,
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        batchSize: request.batchSize,
        offset: request.offset,
        nextOffset: request.offset,
        hasMore: false,
        totalCount: 1,
        processedCount: 0,
        inputFingerprint: `${request.commandKey}:${request.region}:${request.assetType}:${request.timeframe}:${request.offset}:${request.batchSize}`,
        metadata: {
          commandKey: request.commandKey,
          runMode: request.runMode,
          requestedByUserId: context.requestedByUserId,
          commandIdempotencyKey: serverIdempotencyKey,
          adapter: 'MarketPulseSnapshotService.refreshSnapshot',
          ...(request.reason ? { reason: request.reason } : {}),
        },
      });

      stageLease = await this.leaseStage({
        idempotencyKey: stageIdempotencyKey,
        leaseOwner,
        leaseMs: DEFAULT_LEASE_MS,
        now,
        allowTerminalRetry: false,
      });

      if (stageLease.reason === 'STAGE_TERMINAL') return this.duplicateTerminalResponse(request, policy, serverIdempotencyKey, stageLease);
      if (stageLease.reason === 'LEASE_HELD') {
        throw new PipelineCommandError(409, 'Pipeline stage lease is currently held by another command', this.leaseHeldResponse(request, policy, serverIdempotencyKey, stageLease));
      }
    }

    if (!stageLease.acquired || !stageLease.stage) {
      throw new PipelineCommandError(500, `Unable to acquire Market Pulse stage lease: ${stageLease.reason}`);
    }

    const leasedStage = stageLease.stage;
    if (this.isInFlightDuplicateStage(leasedStage, leaseOwner)) {
      throw new PipelineCommandError(
        409,
        'Pipeline stage is already running for this idempotency key',
        this.leaseHeldResponse(request, policy, serverIdempotencyKey, {
          acquired: false,
          reason: 'LEASE_HELD',
          stage: leasedStage,
        })
      );
    }

    try {
      const snapshot = await this.marketPulseService.refreshSnapshot({
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        generatedAt: now,
        pipelineRunId: leasedStage.pipelineRunId,
      });
      const status = this.marketPulseStageStatus(snapshot.status);
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - now.getTime());
      const warnings = this.toStringArray(snapshot.warningsJson);
      const failedCount = status === 'FAILED' ? 1 : 0;
      const partialCount = status === 'PARTIAL' ? 1 : 0;
      const succeededCount = status === 'FAILED' ? 0 : 1;
      const metadata = {
        commandKey: request.commandKey,
        runMode: request.runMode,
        requestedByUserId: context.requestedByUserId,
        commandIdempotencyKey: serverIdempotencyKey,
        adapter: 'MarketPulseSnapshotService.refreshSnapshot',
        snapshotId: snapshot.id,
        snapshotStatus: snapshot.status,
        marketHealthScore: snapshot.marketHealthScore,
        marketHealthLabel: snapshot.marketHealthLabel,
        dataThroughDate: snapshot.dataThroughDate.toISOString(),
        ...(request.reason ? { reason: request.reason } : {}),
      };

      const completedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status,
        totalCount: 1,
        processedCount: 1,
        succeededCount,
        partialCount,
        failedCount,
        skippedCount: 0,
        unchangedCount: 0,
        nextOffset: null,
        hasMore: false,
        warnings,
        errors: [],
        completedAt,
        durationMs,
        metadata,
      });

      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status,
        totalCount: 1,
        processedCount: 1,
        succeededCount,
        partialCount,
        failedCount,
        skippedCount: 0,
        unchangedCount: 0,
        warnings,
        errors: [],
        completedAt,
        durationMs,
        metadata,
      });

      return this.responseFromStage(request, policy, serverIdempotencyKey, completedStage, stageLease, this.commandStatusFromStageStatus(status));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Market Pulse refresh failed';
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - now.getTime());
      const failedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status: 'FAILED',
        totalCount: Math.max(1, leasedStage.totalCount),
        processedCount: Math.max(1, leasedStage.processedCount),
        succeededCount: leasedStage.succeededCount,
        partialCount: leasedStage.partialCount,
        failedCount: Math.max(1, leasedStage.failedCount),
        skippedCount: leasedStage.skippedCount,
        unchangedCount: leasedStage.unchangedCount,
        nextOffset: null,
        hasMore: false,
        warnings: leasedStage.warnings,
        errors: [...leasedStage.errors, errorMessage],
        completedAt,
        durationMs,
        metadata: {
          commandKey: request.commandKey,
          runMode: request.runMode,
          requestedByUserId: context.requestedByUserId,
          commandIdempotencyKey: serverIdempotencyKey,
          adapter: 'MarketPulseSnapshotService.refreshSnapshot',
          error: errorMessage,
          ...(request.reason ? { reason: request.reason } : {}),
        },
      });

      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status: 'FAILED',
        totalCount: failedStage.totalCount,
        processedCount: failedStage.processedCount,
        succeededCount: failedStage.succeededCount,
        partialCount: failedStage.partialCount,
        failedCount: failedStage.failedCount,
        skippedCount: failedStage.skippedCount,
        unchangedCount: failedStage.unchangedCount,
        warnings: failedStage.warnings,
        errors: failedStage.errors,
        completedAt,
        durationMs,
        metadata: {
          commandKey: request.commandKey,
          runMode: request.runMode,
          requestedByUserId: context.requestedByUserId,
          commandIdempotencyKey: serverIdempotencyKey,
          adapter: 'MarketPulseSnapshotService.refreshSnapshot',
          error: errorMessage,
          ...(request.reason ? { reason: request.reason } : {}),
        },
      });

      return this.responseFromStage(request, policy, serverIdempotencyKey, failedStage, stageLease, 'FAILED');
    }
  }

  private async executeSectorIntelligenceRefreshCommand(
    request: PipelineCommandRequest,
    context: PipelineCommandExecutionContext,
    policy: PipelineCommandPolicy,
    now: Date
  ): Promise<PipelineCommandResponse> {
    this.assertMarketIntelligence1d(request, 'SECTOR_INTELLIGENCE_REFRESH');

    const serverIdempotencyKey = this.commandIdempotencyKey(request);
    const stageIdempotencyKey = serverIdempotencyKey;
    const runIdempotencyKey = `${serverIdempotencyKey}:run`;
    const leaseOwner = `manual-command:${request.commandKey}:${PROCESS_LOCAL_ID}`;

    let stageLease = await this.leaseStage({
      idempotencyKey: stageIdempotencyKey,
      leaseOwner,
      leaseMs: DEFAULT_LEASE_MS,
      now,
      allowTerminalRetry: false,
    });

    if (stageLease.reason === 'STAGE_TERMINAL') {
      return this.duplicateTerminalResponse(request, policy, serverIdempotencyKey, stageLease);
    }
    if (stageLease.reason === 'LEASE_HELD') {
      throw new PipelineCommandError(409, 'Pipeline stage lease is currently held by another command', this.leaseHeldResponse(request, policy, serverIdempotencyKey, stageLease));
    }

    if (stageLease.reason === 'STAGE_NOT_FOUND') {
      const metadata = {
        commandKey: request.commandKey,
        runMode: request.runMode,
        requestedByUserId: context.requestedByUserId,
        commandIdempotencyKey: serverIdempotencyKey,
        adapter: 'MarketContextIntelligenceService.refreshSectorSnapshots',
        ...(request.reason ? { reason: request.reason } : {}),
      };
      const run = await this.createRun({
        pipelineKey: request.pipelineKey,
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        triggerType: 'manual',
        status: 'RUNNING',
        idempotencyKey: runIdempotencyKey,
        startedAt: now,
        metadata,
      });

      await this.createStage({
        pipelineRunId: run.id,
        stageKey: policy.stageKey,
        stageOrder: policy.stageOrder,
        status: 'PENDING',
        idempotencyKey: stageIdempotencyKey,
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        batchSize: request.batchSize,
        offset: request.offset,
        nextOffset: request.offset,
        hasMore: false,
        totalCount: 1,
        processedCount: 0,
        inputFingerprint: `${request.commandKey}:${request.region}:${request.assetType}:${request.timeframe}:${request.offset}:${request.batchSize}`,
        metadata,
      });

      stageLease = await this.leaseStage({
        idempotencyKey: stageIdempotencyKey,
        leaseOwner,
        leaseMs: DEFAULT_LEASE_MS,
        now,
        allowTerminalRetry: false,
      });

      if (stageLease.reason === 'STAGE_TERMINAL') return this.duplicateTerminalResponse(request, policy, serverIdempotencyKey, stageLease);
      if (stageLease.reason === 'LEASE_HELD') {
        throw new PipelineCommandError(409, 'Pipeline stage lease is currently held by another command', this.leaseHeldResponse(request, policy, serverIdempotencyKey, stageLease));
      }
    }

    if (!stageLease.acquired || !stageLease.stage) {
      throw new PipelineCommandError(500, `Unable to acquire Sector Intelligence stage lease: ${stageLease.reason}`);
    }

    const leasedStage = stageLease.stage;
    if (this.isInFlightDuplicateStage(leasedStage, leaseOwner)) {
      throw new PipelineCommandError(
        409,
        'Pipeline stage is already running for this idempotency key',
        this.leaseHeldResponse(request, policy, serverIdempotencyKey, {
          acquired: false,
          reason: 'LEASE_HELD',
          stage: leasedStage,
        })
      );
    }

    try {
      const result = await this.marketContextService.refreshSectorSnapshots({
        region: request.region,
        assetType: request.assetType,
        dataThroughDate: this.commandDataThroughDate(request),
      });
      const status = this.pipelineStageStatusFromAdapterStatus(result.status);
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - now.getTime());
      const failedCount = status === 'FAILED' ? Math.max(1, result.errors.length) : 0;
      const metadata = {
        commandKey: request.commandKey,
        runMode: request.runMode,
        requestedByUserId: context.requestedByUserId,
        commandIdempotencyKey: serverIdempotencyKey,
        adapter: 'MarketContextIntelligenceService.refreshSectorSnapshots',
        snapshotDate: result.snapshotDate,
        dataThroughDate: result.dataThroughDate,
        savedCount: result.savedCount,
        sectorCount: result.sectors.length,
        ...(request.reason ? { reason: request.reason } : {}),
      };

      const completedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status,
        totalCount: result.totalCount,
        processedCount: result.processedCount,
        succeededCount: status === 'FAILED' ? 0 : result.savedCount,
        partialCount: status === 'PARTIAL' ? Math.max(1, result.skippedCount) : 0,
        failedCount,
        skippedCount: result.skippedCount,
        unchangedCount: 0,
        nextOffset: null,
        hasMore: false,
        warnings: result.warnings,
        errors: result.errors,
        completedAt,
        durationMs,
        metadata,
      });

      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status,
        totalCount: result.totalCount,
        processedCount: result.processedCount,
        succeededCount: status === 'FAILED' ? 0 : result.savedCount,
        partialCount: status === 'PARTIAL' ? Math.max(1, result.skippedCount) : 0,
        failedCount,
        skippedCount: result.skippedCount,
        unchangedCount: 0,
        warnings: result.warnings,
        errors: result.errors,
        completedAt,
        durationMs,
        metadata,
      });

      return this.responseFromStage(request, policy, serverIdempotencyKey, completedStage, stageLease, this.commandStatusFromStageStatus(status));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sector Intelligence refresh failed';
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - now.getTime());
      const failedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status: 'FAILED',
        totalCount: Math.max(1, leasedStage.totalCount),
        processedCount: leasedStage.processedCount,
        succeededCount: leasedStage.succeededCount,
        partialCount: leasedStage.partialCount,
        failedCount: Math.max(1, leasedStage.failedCount),
        skippedCount: leasedStage.skippedCount,
        unchangedCount: leasedStage.unchangedCount,
        nextOffset: null,
        hasMore: false,
        warnings: leasedStage.warnings,
        errors: [...leasedStage.errors, errorMessage],
        completedAt,
        durationMs,
        metadata: {
          commandKey: request.commandKey,
          runMode: request.runMode,
          requestedByUserId: context.requestedByUserId,
          commandIdempotencyKey: serverIdempotencyKey,
          adapter: 'MarketContextIntelligenceService.refreshSectorSnapshots',
          error: errorMessage,
          ...(request.reason ? { reason: request.reason } : {}),
        },
      });

      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status: 'FAILED',
        totalCount: failedStage.totalCount,
        processedCount: failedStage.processedCount,
        succeededCount: failedStage.succeededCount,
        partialCount: failedStage.partialCount,
        failedCount: failedStage.failedCount,
        skippedCount: failedStage.skippedCount,
        unchangedCount: failedStage.unchangedCount,
        warnings: failedStage.warnings,
        errors: failedStage.errors,
        completedAt,
        durationMs,
        metadata: failedStage.metadata,
      });

      return this.responseFromStage(request, policy, serverIdempotencyKey, failedStage, stageLease, 'FAILED');
    }
  }

  private async executeEarningsIntelligenceRefreshCommand(
    request: PipelineCommandRequest,
    context: PipelineCommandExecutionContext,
    policy: PipelineCommandPolicy,
    now: Date
  ): Promise<PipelineCommandResponse> {
    this.assertMarketIntelligence1d(request, 'EARNINGS_INTELLIGENCE_REFRESH');

    const serverIdempotencyKey = this.commandIdempotencyKey(request);
    const stageIdempotencyKey = serverIdempotencyKey;
    const runIdempotencyKey = `${serverIdempotencyKey}:run`;
    const leaseOwner = `manual-command:${request.commandKey}:${PROCESS_LOCAL_ID}`;

    let stageLease = await this.leaseStage({
      idempotencyKey: stageIdempotencyKey,
      leaseOwner,
      leaseMs: DEFAULT_LEASE_MS,
      now,
      allowTerminalRetry: false,
    });

    if (stageLease.reason === 'STAGE_TERMINAL') return this.duplicateTerminalResponse(request, policy, serverIdempotencyKey, stageLease);
    if (stageLease.reason === 'LEASE_HELD') {
      throw new PipelineCommandError(409, 'Pipeline stage lease is currently held by another command', this.leaseHeldResponse(request, policy, serverIdempotencyKey, stageLease));
    }

    if (stageLease.reason === 'STAGE_NOT_FOUND') {
      const run = await this.createRun({
        pipelineKey: request.pipelineKey,
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        triggerType: 'manual',
        status: 'RUNNING',
        idempotencyKey: runIdempotencyKey,
        startedAt: now,
        metadata: this.manualEarningsMetadata(request, context, serverIdempotencyKey),
      });

      await this.createStage({
        pipelineRunId: run.id,
        stageKey: policy.stageKey,
        stageOrder: policy.stageOrder,
        status: 'PENDING',
        idempotencyKey: stageIdempotencyKey,
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        batchSize: request.batchSize,
        offset: request.offset,
        nextOffset: request.offset,
        hasMore: false,
        inputFingerprint: `${request.commandKey}:${request.region}:${request.assetType}:${request.timeframe}:${request.offset}:${request.batchSize}`,
        metadata: this.manualEarningsMetadata(request, context, serverIdempotencyKey),
      });

      stageLease = await this.leaseStage({
        idempotencyKey: stageIdempotencyKey,
        leaseOwner,
        leaseMs: DEFAULT_LEASE_MS,
        now,
        allowTerminalRetry: false,
      });

      if (stageLease.reason === 'STAGE_TERMINAL') return this.duplicateTerminalResponse(request, policy, serverIdempotencyKey, stageLease);
      if (stageLease.reason === 'LEASE_HELD') {
        throw new PipelineCommandError(409, 'Pipeline stage lease is currently held by another command', this.leaseHeldResponse(request, policy, serverIdempotencyKey, stageLease));
      }
    }

    if (!stageLease.acquired || !stageLease.stage) {
      throw new PipelineCommandError(500, `Unable to acquire Earnings Intelligence stage lease: ${stageLease.reason}`);
    }

    const leasedStage = stageLease.stage;
    if (this.isInFlightDuplicateStage(leasedStage, leaseOwner)) {
      throw new PipelineCommandError(
        409,
        'Pipeline stage is already running for this idempotency key',
        this.leaseHeldResponse(request, policy, serverIdempotencyKey, {
          acquired: false,
          reason: 'LEASE_HELD',
          stage: leasedStage,
        })
      );
    }

    try {
      const result = await this.earningsIntelligenceService.refreshSnapshots({
        region: request.region,
        assetType: request.assetType,
        batchSize: request.batchSize,
        offset: request.offset,
        snapshotDate: this.parseOptionalDate(this.optionalStringParam(this.commandParams(request), 'snapshotDate')) || now,
        dataThroughDate: this.parseOptionalDate(this.optionalStringParam(this.commandParams(request), 'dataThroughDate')),
      });
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - now.getTime());
      const partialCount = result.status === 'PARTIAL'
        ? Math.max(1, result.failedCount + result.skippedCount + (result.hasMore ? 1 : 0))
        : 0;
      const metadata = {
        ...this.manualEarningsMetadata(request, context, serverIdempotencyKey),
        snapshotDate: result.snapshotDate,
        dataThroughDate: result.dataThroughDate,
        categories: result.categories,
      };

      const completedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status: result.status,
        totalCount: result.totalCount,
        processedCount: result.processedCount,
        succeededCount: result.succeededCount,
        partialCount,
        failedCount: result.failedCount,
        skippedCount: result.skippedCount,
        unchangedCount: result.unchangedCount,
        nextOffset: result.nextOffset,
        hasMore: result.hasMore,
        outputFingerprint: this.hashValues([
          stageIdempotencyKey,
          result.status,
          result.snapshotDate,
          String(result.totalCount),
          String(result.processedCount),
          String(result.succeededCount),
          String(result.failedCount),
          String(result.skippedCount),
        ]),
        warnings: result.warnings,
        errors: result.errors,
        completedAt,
        durationMs,
        metadata,
      });

      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status: result.status,
        totalCount: result.totalCount,
        processedCount: result.processedCount,
        succeededCount: result.succeededCount,
        partialCount,
        failedCount: result.failedCount,
        skippedCount: result.skippedCount,
        unchangedCount: result.unchangedCount,
        warnings: result.warnings,
        errors: result.errors,
        completedAt,
        durationMs,
        metadata,
      });

      return this.responseFromStage(request, policy, serverIdempotencyKey, completedStage, stageLease, this.commandStatusFromStageStatus(result.status));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Earnings Intelligence refresh failed';
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - now.getTime());
      const failedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status: 'FAILED',
        totalCount: Math.max(1, leasedStage.totalCount),
        processedCount: leasedStage.processedCount,
        succeededCount: leasedStage.succeededCount,
        partialCount: leasedStage.partialCount,
        failedCount: Math.max(1, leasedStage.failedCount),
        skippedCount: leasedStage.skippedCount,
        unchangedCount: leasedStage.unchangedCount,
        nextOffset: null,
        hasMore: false,
        warnings: leasedStage.warnings,
        errors: [...leasedStage.errors, errorMessage],
        completedAt,
        durationMs,
        metadata: {
          ...this.manualEarningsMetadata(request, context, serverIdempotencyKey),
          error: errorMessage,
        },
      });

      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status: 'FAILED',
        totalCount: failedStage.totalCount,
        processedCount: failedStage.processedCount,
        succeededCount: failedStage.succeededCount,
        partialCount: failedStage.partialCount,
        failedCount: failedStage.failedCount,
        skippedCount: failedStage.skippedCount,
        unchangedCount: failedStage.unchangedCount,
        warnings: failedStage.warnings,
        errors: failedStage.errors,
        completedAt,
        durationMs,
        metadata: {
          ...this.manualEarningsMetadata(request, context, serverIdempotencyKey),
          error: errorMessage,
        },
      });

      return this.responseFromStage(request, policy, serverIdempotencyKey, failedStage, stageLease, 'FAILED');
    }
  }

  private async executeStockInterestRefreshCommand(
    request: PipelineCommandRequest,
    context: PipelineCommandExecutionContext,
    policy: PipelineCommandPolicy,
    now: Date
  ): Promise<PipelineCommandResponse> {
    this.assertMarketIntelligence1d(request, 'STOCK_INTEREST_REFRESH');

    const serverIdempotencyKey = this.commandIdempotencyKey(request);
    const stageIdempotencyKey = serverIdempotencyKey;
    const runIdempotencyKey = `${serverIdempotencyKey}:run`;
    const leaseOwner = `manual-command:${request.commandKey}:${PROCESS_LOCAL_ID}`;

    let stageLease = await this.leaseStage({
      idempotencyKey: stageIdempotencyKey,
      leaseOwner,
      leaseMs: DEFAULT_LEASE_MS,
      now,
      allowTerminalRetry: false,
    });

    if (stageLease.reason === 'STAGE_TERMINAL') return this.duplicateTerminalResponse(request, policy, serverIdempotencyKey, stageLease);
    if (stageLease.reason === 'LEASE_HELD') {
      throw new PipelineCommandError(409, 'Pipeline stage lease is currently held by another command', this.leaseHeldResponse(request, policy, serverIdempotencyKey, stageLease));
    }

    if (stageLease.reason === 'STAGE_NOT_FOUND') {
      const run = await this.createRun({
        pipelineKey: request.pipelineKey,
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        triggerType: 'manual',
        status: 'RUNNING',
        idempotencyKey: runIdempotencyKey,
        startedAt: now,
        metadata: this.manualStockInterestMetadata(request, context, serverIdempotencyKey),
      });

      await this.createStage({
        pipelineRunId: run.id,
        stageKey: policy.stageKey,
        stageOrder: policy.stageOrder,
        status: 'PENDING',
        idempotencyKey: stageIdempotencyKey,
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        batchSize: request.batchSize,
        offset: request.offset,
        nextOffset: request.offset,
        hasMore: false,
        inputFingerprint: `${request.commandKey}:${request.region}:${request.assetType}:${request.timeframe}:${request.offset}:${request.batchSize}`,
        metadata: this.manualStockInterestMetadata(request, context, serverIdempotencyKey),
      });

      stageLease = await this.leaseStage({
        idempotencyKey: stageIdempotencyKey,
        leaseOwner,
        leaseMs: DEFAULT_LEASE_MS,
        now,
        allowTerminalRetry: false,
      });

      if (stageLease.reason === 'STAGE_TERMINAL') return this.duplicateTerminalResponse(request, policy, serverIdempotencyKey, stageLease);
      if (stageLease.reason === 'LEASE_HELD') {
        throw new PipelineCommandError(409, 'Pipeline stage lease is currently held by another command', this.leaseHeldResponse(request, policy, serverIdempotencyKey, stageLease));
      }
    }

    if (!stageLease.acquired || !stageLease.stage) {
      throw new PipelineCommandError(500, `Unable to acquire Stock Interest stage lease: ${stageLease.reason}`);
    }

    const leasedStage = stageLease.stage;
    if (this.isInFlightDuplicateStage(leasedStage, leaseOwner)) {
      throw new PipelineCommandError(
        409,
        'Pipeline stage is already running for this idempotency key',
        this.leaseHeldResponse(request, policy, serverIdempotencyKey, {
          acquired: false,
          reason: 'LEASE_HELD',
          stage: leasedStage,
        })
      );
    }

    try {
      const params = this.commandParams(request);
      const result = await this.stockInterestService.refreshSnapshots({
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        batchSize: request.batchSize,
        offset: request.offset,
        generatedAt: now,
        snapshotDate: this.parseOptionalDate(this.optionalStringParam(params, 'snapshotDate')) || undefined,
        dataThroughDate: this.parseOptionalDate(this.optionalStringParam(params, 'dataThroughDate')),
        pipelineRunId: leasedStage.pipelineRunId,
      });
      const status = this.pipelineStageStatusFromAdapterStatus(result.status);
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - now.getTime());
      const partialCount = status === 'PARTIAL'
        ? Math.max(1, result.failedCount + result.skippedCount + (result.hasMore ? 1 : 0))
        : 0;
      const metadata = {
        ...this.manualStockInterestMetadata(request, context, serverIdempotencyKey),
        snapshotDate: result.snapshotDate,
        dataThroughDate: result.dataThroughDate,
        generatedAt: result.generatedAt,
        categories: result.categories,
      };

      const completedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status,
        totalCount: result.totalCount,
        processedCount: result.processedCount,
        succeededCount: result.succeededCount,
        partialCount,
        failedCount: result.failedCount,
        skippedCount: result.skippedCount,
        unchangedCount: result.unchangedCount,
        nextOffset: result.nextOffset,
        hasMore: result.hasMore,
        outputFingerprint: this.hashValues([
          stageIdempotencyKey,
          status,
          result.snapshotDate,
          String(result.totalCount),
          String(result.processedCount),
          String(result.succeededCount),
          String(result.failedCount),
          String(result.skippedCount),
          String(result.unchangedCount),
        ]),
        warnings: result.warnings,
        errors: result.errors,
        completedAt,
        durationMs,
        metadata,
      });

      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status,
        totalCount: result.totalCount,
        processedCount: result.processedCount,
        succeededCount: result.succeededCount,
        partialCount,
        failedCount: result.failedCount,
        skippedCount: result.skippedCount,
        unchangedCount: result.unchangedCount,
        warnings: result.warnings,
        errors: result.errors,
        completedAt,
        durationMs,
        metadata,
      });

      return this.responseFromStage(request, policy, serverIdempotencyKey, completedStage, stageLease, this.commandStatusFromStageStatus(status));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Stock Interest refresh failed';
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - now.getTime());
      const failedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status: 'FAILED',
        totalCount: Math.max(1, leasedStage.totalCount),
        processedCount: leasedStage.processedCount,
        succeededCount: leasedStage.succeededCount,
        partialCount: leasedStage.partialCount,
        failedCount: Math.max(1, leasedStage.failedCount),
        skippedCount: leasedStage.skippedCount,
        unchangedCount: leasedStage.unchangedCount,
        nextOffset: null,
        hasMore: false,
        warnings: leasedStage.warnings,
        errors: [...leasedStage.errors, errorMessage],
        completedAt,
        durationMs,
        metadata: {
          ...this.manualStockInterestMetadata(request, context, serverIdempotencyKey),
          error: errorMessage,
        },
      });

      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status: 'FAILED',
        totalCount: failedStage.totalCount,
        processedCount: failedStage.processedCount,
        succeededCount: failedStage.succeededCount,
        partialCount: failedStage.partialCount,
        failedCount: failedStage.failedCount,
        skippedCount: failedStage.skippedCount,
        unchangedCount: failedStage.unchangedCount,
        warnings: failedStage.warnings,
        errors: failedStage.errors,
        completedAt,
        durationMs,
        metadata: {
          ...this.manualStockInterestMetadata(request, context, serverIdempotencyKey),
          error: errorMessage,
        },
      });

      return this.responseFromStage(request, policy, serverIdempotencyKey, failedStage, stageLease, 'FAILED');
    }
  }

  private async executeMarketScanRefreshCommand(
    request: PipelineCommandRequest,
    context: PipelineCommandExecutionContext,
    policy: PipelineCommandPolicy,
    now: Date
  ): Promise<PipelineCommandResponse> {
    const serverIdempotencyKey = this.commandIdempotencyKey(request);
    const stageIdempotencyKey = serverIdempotencyKey;
    const runIdempotencyKey = `${serverIdempotencyKey}:run`;
    const leaseOwner = `manual-command:${request.commandKey}:${PROCESS_LOCAL_ID}`;

    let stageLease = await this.leaseStage({
      idempotencyKey: stageIdempotencyKey,
      leaseOwner,
      leaseMs: DEFAULT_LEASE_MS,
      now,
      allowTerminalRetry: false,
    });

    if (stageLease.reason === 'STAGE_TERMINAL') {
      return this.duplicateTerminalResponse(request, policy, serverIdempotencyKey, stageLease);
    }
    if (stageLease.reason === 'LEASE_HELD') {
      throw new PipelineCommandError(409, 'Pipeline stage lease is currently held by another command', this.leaseHeldResponse(request, policy, serverIdempotencyKey, stageLease));
    }

    if (stageLease.reason === 'STAGE_NOT_FOUND') {
      const run = await this.createRun({
        pipelineKey: request.pipelineKey,
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        triggerType: 'manual',
        status: 'RUNNING',
        idempotencyKey: runIdempotencyKey,
        startedAt: now,
        metadata: { commandKey: request.commandKey, runMode: request.runMode, requestedByUserId: context.requestedByUserId, commandIdempotencyKey: serverIdempotencyKey },
      });
      await this.createStage({
        pipelineRunId: run.id,
        stageKey: policy.stageKey,
        stageOrder: policy.stageOrder,
        status: 'PENDING',
        idempotencyKey: stageIdempotencyKey,
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        batchSize: request.batchSize,
        offset: request.offset,
        nextOffset: request.offset,
        hasMore: false,
        inputFingerprint: `${request.commandKey}:${request.region}:${request.assetType}`,
        metadata: { commandKey: request.commandKey, runMode: request.runMode, requestedByUserId: context.requestedByUserId, commandIdempotencyKey: serverIdempotencyKey },
      });
      stageLease = await this.leaseStage({ idempotencyKey: stageIdempotencyKey, leaseOwner, leaseMs: DEFAULT_LEASE_MS, now, allowTerminalRetry: false });
      if (!stageLease.acquired) {
        if (stageLease.reason === 'STAGE_TERMINAL') return this.duplicateTerminalResponse(request, policy, serverIdempotencyKey, stageLease);
        throw new PipelineCommandError(500, `Unable to acquire stage lease after stage creation: ${stageLease.reason}`);
      }
    }
    if (!stageLease.acquired) throw new PipelineCommandError(500, `Unable to acquire stage lease: ${stageLease.reason}`);

    try {
      const result = await this.marketDataService.refreshMarketScanSnapshots({
        region: request.region,
        assetType: request.assetType,
        now,
      });
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - now.getTime());
      const status = result.errors.length > 0 ? 'PARTIAL' : 'COMPLETED';
      const completedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status,
        totalCount: result.totalInserted,
        processedCount: result.totalInserted,
        succeededCount: result.totalInserted,
        partialCount: 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        nextOffset: null,
        hasMore: false,
        warnings: [...result.warnings, ...result.errors],
        errors: [],
        completedAt,
        durationMs,
        metadata: { commandKey: request.commandKey, requestedByUserId: context.requestedByUserId, tradingDate: result.tradingDate, totalInserted: result.totalInserted, scanTypes: result.scanTypes },
      });
      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status,
        totalCount: result.totalInserted,
        processedCount: result.totalInserted,
        succeededCount: result.totalInserted,
        partialCount: 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        warnings: [...result.warnings, ...result.errors],
        errors: [],
        completedAt,
        durationMs,
        metadata: { commandKey: request.commandKey, tradingDate: result.tradingDate, totalInserted: result.totalInserted, scanTypes: result.scanTypes },
      });
      return this.responseFromStage(request, policy, serverIdempotencyKey, completedStage, stageLease, status === 'PARTIAL' ? 'PARTIAL' : 'COMPLETED');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Market scan refresh failed';
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - now.getTime());
      const leasedStage = stageLease.stage;
      const failedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status: 'FAILED',
        totalCount: leasedStage?.totalCount ?? 0,
        processedCount: leasedStage?.processedCount ?? 0,
        succeededCount: leasedStage?.succeededCount ?? 0,
        partialCount: 0,
        failedCount: 1,
        skippedCount: 0,
        unchangedCount: 0,
        nextOffset: null,
        hasMore: false,
        warnings: leasedStage?.warnings ?? [],
        errors: [...(leasedStage?.errors ?? []), errorMessage],
        completedAt,
        durationMs,
        metadata: { commandKey: request.commandKey, error: errorMessage },
      });
      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status: 'FAILED',
        totalCount: 0,
        processedCount: 0,
        succeededCount: 0,
        partialCount: 0,
        failedCount: 1,
        skippedCount: 0,
        unchangedCount: 0,
        warnings: [],
        errors: [errorMessage],
        completedAt,
        durationMs,
        metadata: { commandKey: request.commandKey, error: errorMessage },
      });
      return this.responseFromStage(request, policy, serverIdempotencyKey, failedStage, stageLease, 'FAILED');
    }
  }

  /**
   * PIPELINE_RUN_ALL â€” DAG execution path (Phase 2 live).
   *
   * Market-data sync runs first (same as legacy), then hands the downstream
   * pipeline over to executeDagPipeline instead of the legacy chain.
   * The DAG runner fires the alert internally; no second alert is fired here.
   */
  private async executeDailyPipelineViaDag(
    request: PipelineCommandRequest,
    context: PipelineCommandExecutionContext,
    policy: PipelineCommandPolicy,
    now: Date
  ): Promise<PipelineCommandResponse> {
    if (request.timeframe !== '1d' || request.pipelineKey !== 'market-intelligence') {
      throw new PipelineCommandError(400, 'PIPELINE_RUN_ALL supports only the market-intelligence 1d pipeline');
    }

    const commandIdempotencyKey = this.commandIdempotencyKey(request);
    if (typeof (this.repository as any).findActiveRun === 'function') {
      const activeRun = await this.repository.findActiveRun({
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        pipelineKey: request.pipelineKey,
      });
      // FIX E5: even when the run row is stale, a stage might still be actively
      // running (lease still valid).  Always check findBlockingActiveStageForScope
      // when there is any active run row â€” stale or not.
      if (activeRun) {
        const blockingStage = await this.findBlockingActiveStageForScope({
          region: request.region,
          assetType: request.assetType,
          timeframe: request.timeframe,
          pipelineKey: request.pipelineKey,
        }, now);
        if (blockingStage !== null) {
          throw new PipelineCommandError(
            409,
            'Pipeline run is already active for this scope',
            this.activeRunHeldResponse(request, policy, commandIdempotencyKey, activeRun, blockingStage)
          );
        }
      }
    }

    const commandRunId = `manual-daily-pipeline-${createHash('sha256').update(commandIdempotencyKey).digest('hex').slice(0, 16)}`;
    const batchSize = Math.max(1, Math.min(request.batchSize || 100, 250));
    const startedAt = now.toISOString();
    const marketDataLeaseOwner = `manual-command:${request.commandKey}:${PROCESS_LOCAL_ID}`;

    await this.recordMarketDataStageSnapshot({
      region: request.region,
      assetType: request.assetType,
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'manual',
      operation: 'INCREMENTAL_EOD_LOAD',
      runId: commandRunId,
      status: 'RUNNING',
      dataThroughDate: null,
      totalCount: 0,
      processedCount: 0,
      succeededCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      changedInstrumentIds: [],
      downstreamInstrumentIds: [],
      batchSize,
      nextOffset: 0,
      hasMore: false,
      startedAt,
      completedAt: null,
      leaseOwner: marketDataLeaseOwner,
      leaseMs: DEFAULT_LEASE_MS,
      warnings: [],
      errors: [],
      metadata: {
        commandKey: request.commandKey,
        commandIdempotencyKey,
        requestedByUserId: context.requestedByUserId,
        runMode: request.runMode,
        reason: request.reason || null,
        downstreamSnapshotBridgeSuppressed: true,
      },
    });

    try {
      const initialSummary = await this.marketDataService.syncScheduledRegion(request.region, {
        assetType: request.assetType,
        batchSize,
        now,
        syncDuringMarketHours: false,
        skipWeekends: true,
      });

      const fullDailyMode = this.isFullDailyPipelineRun(request);
      const summary = fullDailyMode
        ? await this.withFullDailyDownstreamEligibility(initialSummary)
        : this.incrementalChangedOnlyDownstreamSummary(initialSummary);

      const downstreamInstrumentIds = this.normalizeInstrumentIds(
        summary.downstreamInstrumentIds?.length ? summary.downstreamInstrumentIds : summary.changedInstrumentIds
      );
      const tradingDate = (summary.dataThroughDate || summary.tradingDate || '').slice(0, 10);
      const stageStatus = this.marketDataPipelineStageStatus(summary);
      const totalCount = this.marketDataPipelineTotalCount(summary);
      const providerSkippedCount = Math.max(0, Number(summary.providerFetchSkippedCount || summary.skippedBeforeFetchCount || 0));
      const processedCount = stageStatus === 'SKIPPED'
        ? Math.max(totalCount, providerSkippedCount)
        : Math.max(0, Number(summary.instrumentsProcessed || 0));
      const failedCount = Math.max(0, summary.errors?.length || 0);
      const skippedCount = stageStatus === 'SKIPPED' ? Math.max(totalCount, providerSkippedCount) : 0;
      const succeededCount = stageStatus === 'SKIPPED'
        ? 0
        : Math.max(0, processedCount - failedCount - skippedCount);

      // Run downstream via DAG runner when there is a valid tradingDate.
      // For full_latest_trading_date mode: pass even an empty changedInstrumentIds list â€”
      // executeDagPipeline will call listDailyRefreshEligibleInstrumentIds to resolve scope
      // and throws (FIX E2) when the resolver returns empty, so operators see the problem.
      let dagResult: DagRunResult | null = null;
      const dagWarnings: string[] = [];
      const dagErrors: string[] = [];
      if (tradingDate && (downstreamInstrumentIds.length > 0 || fullDailyMode)) {
        try {
          dagResult = await this.executeDagPipeline({
            tradingDate,
            region: request.region,
            assetType: request.assetType,
            timeframe: '1d',
            trigger: 'manual',
            changedInstrumentIds: downstreamInstrumentIds,
            sourceFingerprint: summary.sourceFingerprint ?? undefined,
          });
        } catch (dagErr) {
          const msg = dagErr instanceof Error ? dagErr.message : 'DAG pipeline failed';
          dagErrors.push(msg);
          console.error('[PIPELINE_RUN_ALL/DAG] downstream DAG pipeline failed:', msg);
        }
      } else if (!tradingDate) {
        dagWarnings.push('Full daily pipeline could not run downstream stages: no tradingDate from market-data sync.');
      }

      const dagRunStatus = dagResult?.runStatus ?? null;
      const terminalStageStatus = this.dagTerminalStatus(stageStatus, dagRunStatus, dagErrors);
      const completedAt = new Date();

      const completedStage = await this.recordMarketDataStageSnapshot({
        region: request.region,
        assetType: request.assetType,
        timeframe: '1d',
        pipelineKey: 'market-intelligence',
        triggerType: 'manual',
        operation: 'INCREMENTAL_EOD_LOAD',
        runId: commandRunId,
        status: terminalStageStatus,
        dataThroughDate: summary.dataThroughDate || summary.tradingDate || null,
        totalCount,
        processedCount,
        succeededCount,
        failedCount,
        skippedCount,
        unchangedCount: Math.max(0, Number(summary.rowsNoOp || 0)),
        changedInstrumentIds: summary.changedInstrumentIds || [],
        downstreamInstrumentIds: downstreamInstrumentIds.length
          ? downstreamInstrumentIds
          : summary.changedInstrumentIds || [],
        batchSize,
        nextOffset: null,
        hasMore: false,
        startedAt,
        completedAt: completedAt.toISOString(),
        warnings: [...(summary.warnings || []), ...dagWarnings],
        errors: [...(summary.errors || []), ...dagErrors],
        metadata: {
          commandKey: request.commandKey,
          commandIdempotencyKey,
          requestedByUserId: context.requestedByUserId,
          runMode: request.runMode,
          reason: request.reason || null,
          adapter: 'MarketDataFoundationService.syncScheduledRegion',
          sourceFingerprint: summary.sourceFingerprint || null,
          tradingDate: summary.tradingDate,
          dataThroughDate: summary.dataThroughDate || null,
          rowsReceived: summary.rowsReceived,
          rowsInserted: summary.rowsInserted,
          rowsUpdated: summary.rowsUpdated,
          rowsSkipped: summary.rowsSkipped,
          rowsNoOp: summary.rowsNoOp,
          officialEodBulk: summary.officialEodBulk ?? null,
          downstreamInstrumentCount: downstreamInstrumentIds.length,
          changedInstrumentCount: summary.changedInstrumentIds?.length || 0,
          dagRunStatus,
          dagErrors,
          downstreamSnapshotBridgeSuppressed: true,
        },
      });

      // Map DagRunResult â†’ PipelineCommandResponse contract.
      // The stage record returned by recordMarketDataStageSnapshot covers the
      // MARKET_DATA stage; counts are populated from there.
      return this.dagRunResultToCommandResponse(request, policy, commandIdempotencyKey, completedStage, dagResult, terminalStageStatus);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Daily pipeline command failed';
      const failedAt = new Date();
      const failedStage = await this.recordMarketDataStageSnapshot({
        region: request.region,
        assetType: request.assetType,
        timeframe: '1d',
        pipelineKey: 'market-intelligence',
        triggerType: 'manual',
        operation: 'INCREMENTAL_EOD_LOAD',
        runId: commandRunId,
        status: 'FAILED',
        dataThroughDate: null,
        totalCount: 1,
        processedCount: 0,
        succeededCount: 0,
        failedCount: 1,
        skippedCount: 0,
        unchangedCount: 0,
        changedInstrumentIds: [],
        downstreamInstrumentIds: [],
        batchSize,
        nextOffset: null,
        hasMore: false,
        startedAt,
        completedAt: failedAt.toISOString(),
        warnings: [],
        errors: [errorMessage],
        metadata: {
          commandKey: request.commandKey,
          commandIdempotencyKey,
          requestedByUserId: context.requestedByUserId,
          adapter: 'MarketDataFoundationService.syncScheduledRegion',
          error: errorMessage,
          downstreamSnapshotBridgeSuppressed: true,
        },
      });
      this.firePipelineRunAlert('FAILED', request.region, request.assetType, null, failedAt.getTime() - now.getTime(), [], errorMessage);
      return this.responseFromStage(
        request,
        policy,
        commandIdempotencyKey,
        failedStage,
        { acquired: true, reason: 'ACQUIRED', stage: failedStage },
        'FAILED'
      );
    }
  }

  /**
   * PIPELINE_DAG_RETRY â€” re-run failed/blocked stages via the DAG runner.
   * Resolves the failed instrument scope from the latest failed stage records
   * (failedInstrumentIds metadata written by Phase 0).
   */
  private async executeDagRetryCommand(
    request: PipelineCommandRequest,
    _context: PipelineCommandExecutionContext,
    policy: PipelineCommandPolicy,
    _now: Date
  ): Promise<PipelineCommandResponse> {
    if (request.timeframe !== '1d' || request.pipelineKey !== 'market-intelligence') {
      throw new PipelineCommandError(400, 'PIPELINE_DAG_RETRY supports only the market-intelligence 1d pipeline');
    }

    // Find the most-recent failed stage to extract tradingDate and failedInstrumentIds.
    const failedStages = await this.latestStages({
      region: request.region,
      assetType: request.assetType,
      timeframe: request.timeframe,
      pipelineKey: request.pipelineKey,
      stageKeys: SCHEDULED_DOWNSTREAM_STAGE_KEYS,
      limit: 50,
    });

    // SKIPPED is retryable: a stage that skipped due to a scope/contract bug is
    // terminal and would otherwise be served from cache forever; legitimately
    // empty stages re-run as no-ops.
    const failedOrBlocked = failedStages.filter(
      (s) => s.status === 'FAILED' || s.status === 'BLOCKED' || s.status === 'PARTIAL' || s.status === 'SKIPPED'
    );
    // FIX E3: defaulting to today when no stage rows carry a dataThroughDate is
    // silent wrong-date behaviour â€” throw 422 so the operator sees the problem.
    const resolvedDate = failedOrBlocked[0]?.dataThroughDate?.slice(0, 10)
      ?? failedStages[0]?.dataThroughDate?.slice(0, 10);
    if (!resolvedDate) {
      throw new PipelineCommandError(
        422,
        'PIPELINE_DAG_RETRY: no failed/blocked stage rows with a dataThroughDate were found â€” cannot determine which trading date to retry',
        this.blockedCommandResponse(request, policy, 'No failed stage rows with a dataThroughDate were found for this scope. Run PIPELINE_RUN_ALL first or check the scope parameters.')
      );
    }
    const tradingDate = resolvedDate;

    // Collect failed instrument ids across all failed stages.
    const failedIds: string[] = [];
    for (const stage of failedOrBlocked) {
      const meta = stage.metadata as Record<string, unknown> | null;
      const ids = meta?.failedInstrumentIds;
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (typeof id === 'string' && id.trim()) failedIds.push(id.trim());
        }
      }
    }
    const instrumentScope = failedIds.length > 0 ? this.normalizeInstrumentIds(failedIds) : null;

    // Determine a fromStage (the earliest failed stage in topo order).
    const fromStage = failedOrBlocked.length > 0
      ? failedOrBlocked.reduce((earliest, s) => (s.stageOrder < earliest.stageOrder ? s : earliest), failedOrBlocked[0]).stageKey
      : undefined;

    const dagResult = await this.executeDagPipeline({
      tradingDate,
      region: request.region,
      assetType: request.assetType,
      timeframe: request.timeframe,
      trigger: 'retry',
      changedInstrumentIds: instrumentScope,
      fromStage,
    });

    // Build a minimal synthetic PipelineCommandResponse from the DagRunResult.
    const status = this.commandStatusFromStageStatus(dagResult.runStatus as any);
    const totalSucceeded = Object.values(dagResult.stages).reduce((s, o) => s + o.succeededCount, 0);
    const totalFailed = Object.values(dagResult.stages).reduce((s, o) => s + o.failedCount, 0);
    const allErrors = Object.values(dagResult.stages).flatMap((o) => o.errors ?? []);

    return {
      commandId: this.commandIdempotencyKey(request),
      commandKey: request.commandKey,
      stageKey: 'PIPELINE',
      status,
      scope: {
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        pipelineKey: request.pipelineKey,
      },
      runMode: request.runMode,
      pipelineRunId: null,
      stageRunId: null,
      idempotencyKey: this.commandIdempotencyKey(request),
      lease: { acquired: true, reason: 'ACQUIRED', leaseOwner: null, leaseExpiresAt: null },
      batch: { batchSize: request.batchSize, offset: request.offset, nextOffset: null, hasMore: false },
      counts: {
        totalCount: totalSucceeded + totalFailed,
        processedCount: totalSucceeded + totalFailed,
        succeededCount: totalSucceeded,
        partialCount: 0,
        failedCount: totalFailed,
        skippedCount: 0,
        unchangedCount: 0,
      },
      warnings: [],
      errors: allErrors,
      statusUrl: this.statusUrl(request),
      startedAt: null,
      completedAt: new Date().toISOString(),
    };
  }

  /** Map a DagRunResult to the PipelineCommandResponse shape the controller expects. */
  private dagRunResultToCommandResponse(
    request: PipelineCommandRequest,
    policy: PipelineCommandPolicy,
    commandIdempotencyKey: string,
    marketDataStage: PipelineStageRunRecord,
    dagResult: DagRunResult | null,
    terminalStageStatus: PipelineStageStatus
  ): PipelineCommandResponse {
    const dagSucceeded = dagResult ? Object.values(dagResult.stages).reduce((s, o) => s + o.succeededCount, 0) : 0;
    const dagFailed = dagResult ? Object.values(dagResult.stages).reduce((s, o) => s + o.failedCount, 0) : 0;
    const dagErrors = dagResult ? Object.values(dagResult.stages).flatMap((o) => o.errors ?? []) : [];
    const stagesSummary: Array<{ stageKey: string; status: string; succeededCount: number; failedCount: number }> = dagResult
      ? Object.entries(dagResult.stages).map(([key, o]) => ({ stageKey: key, status: o.status, succeededCount: o.succeededCount, failedCount: o.failedCount }))
      : [];
    return {
      commandId: commandIdempotencyKey,
      commandKey: request.commandKey,
      stageKey: policy.stageKey,
      status: this.commandStatusFromStageStatus(terminalStageStatus),
      scope: {
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        pipelineKey: request.pipelineKey,
      },
      runMode: request.runMode,
      pipelineRunId: marketDataStage.pipelineRunId,
      stageRunId: marketDataStage.id,
      idempotencyKey: commandIdempotencyKey,
      lease: { acquired: true, reason: 'ACQUIRED', leaseOwner: marketDataStage.leaseOwner, leaseExpiresAt: marketDataStage.leaseExpiresAt },
      batch: {
        batchSize: marketDataStage.batchSize ?? request.batchSize,
        offset: marketDataStage.offset ?? request.offset,
        nextOffset: marketDataStage.nextOffset,
        hasMore: marketDataStage.hasMore,
      },
      counts: {
        totalCount: marketDataStage.totalCount + dagSucceeded + dagFailed,
        processedCount: marketDataStage.processedCount + dagSucceeded + dagFailed,
        succeededCount: marketDataStage.succeededCount + dagSucceeded,
        partialCount: marketDataStage.partialCount,
        failedCount: marketDataStage.failedCount + dagFailed,
        skippedCount: marketDataStage.skippedCount,
        unchangedCount: marketDataStage.unchangedCount,
      },
      warnings: [...marketDataStage.warnings, ...(stagesSummary.filter((s) => s.status === 'PARTIAL').map((s) => `${s.stageKey}: partial`))],
      errors: [...marketDataStage.errors, ...dagErrors],
      statusUrl: this.statusUrl(request),
      startedAt: marketDataStage.startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  /** Compute the overall terminal status for PIPELINE_RUN_ALL/DAG combining market-data and DAG run. */
  private dagTerminalStatus(
    marketDataStatus: PipelineStageStatus,
    dagRunStatus: 'COMPLETED' | 'PARTIAL' | 'FAILED' | null,
    dagErrors: string[]
  ): PipelineStageStatus {
    if (marketDataStatus === 'FAILED') return 'FAILED';
    if (dagErrors.length > 0 && !dagRunStatus) return 'PARTIAL';
    if (!dagRunStatus) return marketDataStatus;
    // FIX E1: FAILED means the DAG itself fully failed (no stages succeeded or all
    // failed) â€” map to FAILED, not PARTIAL.  PARTIAL means some stages failed but
    // others succeeded â€” keep PARTIAL.
    if (dagRunStatus === 'FAILED') return 'FAILED';
    if (dagRunStatus === 'PARTIAL') return 'PARTIAL';
    return marketDataStatus === 'SKIPPED' ? 'SKIPPED' : 'COMPLETED';
  }

  // FIX B: executeDailyPipelineCommand deleted â€” it was a dead legacy path no longer
  // called by executeCommand (which now routes to executeDailyPipelineViaDag) and had
  // zero production callers after Phase 2 switchover.  Tests that previously exercised
  // it now exercise PIPELINE_RUN_ALL via executeCommand instead.

  private manualEarningsMetadata(
    request: PipelineCommandRequest,
    context: PipelineCommandExecutionContext,
    commandIdempotencyKey: string
  ): Record<string, unknown> {
    return {
      commandKey: request.commandKey,
      runMode: request.runMode,
      requestedByUserId: context.requestedByUserId,
      commandIdempotencyKey,
      adapter: 'EarningsIntelligenceService.refreshSnapshots',
      ...(request.reason ? { reason: request.reason } : {}),
    };
  }

  private manualStockInterestMetadata(
    request: PipelineCommandRequest,
    context: PipelineCommandExecutionContext,
    commandIdempotencyKey: string
  ): Record<string, unknown> {
    return {
      commandKey: request.commandKey,
      runMode: request.runMode,
      requestedByUserId: context.requestedByUserId,
      commandIdempotencyKey,
      adapter: 'StockInterestSnapshotService.refreshSnapshots',
      ...(request.reason ? { reason: request.reason } : {}),
    };
  }

  private async executeHistoricalExchangeBackfillCommand(
    request: PipelineCommandRequest,
    context: PipelineCommandExecutionContext,
    policy: PipelineCommandPolicy,
    now: Date
  ): Promise<PipelineCommandResponse> {
    this.assertMarketIntelligence1d(request, 'MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL');
    const params = this.commandParams(request);
    const startDate = this.requiredStringParam(params, 'startDate');
    const endDate = this.requiredStringParam(params, 'endDate');
    const maxDates = this.optionalNumberParam(params, 'maxDates');
    const workerCount = this.optionalNumberParam(params, 'workerCount');
    const maxRetries = this.optionalNumberParam(params, 'maxRetries');
    const includeBseFill = this.optionalBooleanParam(params, 'includeBseFill') ?? false;
    const commandIdempotencyKey = this.commandIdempotencyKey(request);
    const commandRunId = this.marketDataCommandRunId('manual-historical-exchange-backfill', commandIdempotencyKey);
    const startedAt = now.toISOString();

    await this.recordMarketDataStageSnapshot({
      region: request.region,
      assetType: request.assetType,
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'backfill',
      operation: 'HISTORICAL_EXCHANGE_BACKFILL',
      runId: commandRunId,
      status: 'RUNNING',
      dataThroughDate: null,
      totalCount: 0,
      processedCount: 0,
      succeededCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      changedInstrumentIds: [],
      downstreamInstrumentIds: [],
      batchSize: request.batchSize,
      nextOffset: 0,
      hasMore: false,
      startedAt,
      completedAt: null,
      warnings: [],
      errors: [],
      metadata: {
        commandKey: request.commandKey,
        commandIdempotencyKey,
        requestedByUserId: context.requestedByUserId,
        runMode: request.runMode,
        params: { startDate, endDate, ...(maxDates ? { maxDates } : {}), ...(workerCount ? { workerCount } : {}), ...(maxRetries !== null ? { maxRetries } : {}), includeBseFill },
        ...(request.reason ? { reason: request.reason } : {}),
      },
    });

    try {
      const summary = await this.marketDataService.runExchangeHistoricalBackfill({
        region: request.region,
        assetType: request.assetType,
        startDate,
        endDate,
        ...(maxDates ? { maxDates } : {}),
        ...(workerCount ? { workerCount } : {}),
        ...(maxRetries !== null ? { maxRetries } : {}),
        includeBseFill,
      });
      const status = this.marketDataCommandStageStatus((summary as any).status);
      const completedAt = new Date();
      const dataThroughDate = this.historicalBackfillDataThroughDate(summary);
      const rowsRead = Math.max(0, Number((summary as any).rowsRead || 0));
      const rowsParsed = Math.max(0, Number((summary as any).rowsParsed || 0));
      const rowsInserted = Math.max(0, Number((summary as any).rowsInserted || 0));
      const rowsUpdated = Math.max(0, Number((summary as any).rowsUpdated || 0));
      const rowsNoOp = Math.max(0, Number((summary as any).rowsNoOp || 0));
      const rowSkippedCount = Math.max(0, Number((summary as any).rowsSkipped || 0));
      const totalDates = Math.max(0, Number((summary as any).totalDates || 0));
      const completedDates = Math.max(0, Number((summary as any).completed || 0));
      const skippedDates = Math.max(0, Number((summary as any).skipped || 0));
      const failedDates = Math.max(0, Number((summary as any).failed || 0));
      const notAvailableDates = Math.max(0, Number((summary as any).notAvailable || 0));
      const pendingDates = Math.max(0, Number((summary as any).pending || 0));
      const runningDates = Math.max(0, Number((summary as any).running || 0));
      const processedDates = completedDates + skippedDates + failedDates + notAvailableDates;
      const jobs = Array.isArray((summary as any).jobs) ? (summary as any).jobs : [];

      const completedStage = await this.recordMarketDataStageSnapshot({
        region: request.region,
        assetType: request.assetType,
        timeframe: '1d',
        pipelineKey: 'market-intelligence',
        triggerType: 'backfill',
        operation: 'HISTORICAL_EXCHANGE_BACKFILL',
        runId: commandRunId,
        status,
        dataThroughDate,
        totalCount: totalDates,
        processedCount: processedDates,
        succeededCount: completedDates,
        failedCount: failedDates,
        skippedCount: skippedDates + notAvailableDates,
        unchangedCount: rowsNoOp,
        changedInstrumentIds: [],
        downstreamInstrumentIds: [],
        batchSize: request.batchSize,
        nextOffset: pendingDates > 0 || runningDates > 0 ? request.offset : null,
        hasMore: pendingDates > 0 || runningDates > 0,
        startedAt,
        completedAt: completedAt.toISOString(),
        warnings: this.toStringArray((summary as any).warnings),
        errors: this.toStringArray((summary as any).errors),
        metadata: {
          commandKey: request.commandKey,
          commandIdempotencyKey,
          requestedByUserId: context.requestedByUserId,
          runMode: request.runMode,
          adapter: 'MarketDataFoundationService.runExchangeHistoricalBackfill',
          params: { startDate, endDate, ...(maxDates ? { maxDates } : {}), ...(workerCount ? { workerCount } : {}), ...(maxRetries !== null ? { maxRetries } : {}), includeBseFill },
          source: (summary as any).source,
          segment: (summary as any).segment,
          startDate: (summary as any).startDate,
          endDate: (summary as any).endDate,
          backfillRunId: (summary as any).runId,
          workerCount: Number((summary as any).workerCount || workerCount || 0),
          maxWorkers: Number((summary as any).maxWorkers || 5),
          maxRetries: Number((summary as any).maxRetries || maxRetries || 0),
          totalDates,
          completedDates,
          skippedDates,
          failedDates,
          notAvailableDates,
          pendingDates,
          runningDates,
          progressPercent: Number((summary as any).progressPercent || 0),
          currentWorkers: Number((summary as any).currentWorkers || 0),
          retryCount: Number((summary as any).retryCount || 0),
          rowsRead,
          rowsParsed,
          rowsInserted,
          rowsUpdated,
          rowsNoOp,
          rowsSkipped: rowSkippedCount,
          bseFills: Number((summary as any).bseFills || 0),
          jobs: jobs.slice(0, 100),
          ...(request.reason ? { reason: request.reason } : {}),
        },
      });

      return this.responseFromStage(
        request,
        policy,
        commandIdempotencyKey,
        completedStage,
        { acquired: true, reason: 'ACQUIRED', stage: completedStage },
        this.commandStatusFromStageStatus(status)
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Historical exchange backfill command failed';
      const failedAt = new Date();
      const failedStage = await this.recordMarketDataStageSnapshot({
        region: request.region,
        assetType: request.assetType,
        timeframe: '1d',
        pipelineKey: 'market-intelligence',
        triggerType: 'backfill',
        operation: 'HISTORICAL_EXCHANGE_BACKFILL',
        runId: commandRunId,
        status: 'FAILED',
        dataThroughDate: null,
        totalCount: 1,
        processedCount: 0,
        succeededCount: 0,
        failedCount: 1,
        skippedCount: 0,
        unchangedCount: 0,
        changedInstrumentIds: [],
        downstreamInstrumentIds: [],
        batchSize: request.batchSize,
        nextOffset: null,
        hasMore: false,
        startedAt,
        completedAt: failedAt.toISOString(),
        warnings: [],
        errors: [errorMessage],
        metadata: {
          commandKey: request.commandKey,
          commandIdempotencyKey,
          requestedByUserId: context.requestedByUserId,
          adapter: 'MarketDataFoundationService.runExchangeHistoricalBackfill',
          params: { startDate, endDate, ...(maxDates ? { maxDates } : {}), ...(workerCount ? { workerCount } : {}), ...(maxRetries !== null ? { maxRetries } : {}), includeBseFill },
          error: errorMessage,
          ...(request.reason ? { reason: request.reason } : {}),
        },
      });
      return this.responseFromStage(
        request,
        policy,
        commandIdempotencyKey,
        failedStage,
        { acquired: true, reason: 'ACQUIRED', stage: failedStage },
        'FAILED'
      );
    }
  }

  private async executeManualVerifiedFundamentalsCommand(
    request: PipelineCommandRequest,
    context: PipelineCommandExecutionContext,
    policy: PipelineCommandPolicy,
    now: Date
  ): Promise<PipelineCommandResponse> {
    this.assertMarketIntelligence1d(request, 'MARKET_DATA_MANUAL_VERIFIED_FUNDAMENTALS_IMPORT');
    const params = this.commandParams(request);
    const stockId = this.requiredStringParam(params, 'stockId');
    const periodType = this.requiredStringParam(params, 'periodType');
    const periodEndDate = this.requiredStringParam(params, 'periodEndDate');
    const commandIdempotencyKey = this.commandIdempotencyKey(request);
    const commandRunId = this.marketDataCommandRunId('manual-verified-fundamentals', commandIdempotencyKey);
    const startedAt = now.toISOString();
    const manualInput = {
      stockId,
      region: request.region,
      assetType: request.assetType,
      periodType,
      periodEndDate,
      revenue: this.optionalNumberParam(params, 'revenue') ?? null,
      eps: this.optionalNumberParam(params, 'eps') ?? null,
      netIncome: this.optionalNumberParam(params, 'netIncome') ?? null,
      peRatio: this.optionalNumberParam(params, 'peRatio') ?? null,
      marketCap: this.optionalNumberParam(params, 'marketCap') ?? null,
      sourceNote: this.optionalStringParam(params, 'sourceNote') ?? null,
      sourceUrl: this.optionalStringParam(params, 'sourceUrl') ?? null,
      validatedBy: this.optionalStringParam(params, 'validatedBy') ?? context.requestedByUserId,
      validatedAt: this.optionalStringParam(params, 'validatedAt') ?? null,
      currency: this.optionalStringParam(params, 'currency') ?? null,
    };

    await this.recordMarketDataStageSnapshot({
      region: request.region,
      assetType: request.assetType,
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: 'manual',
      operation: 'MANUAL_VERIFIED_FUNDAMENTALS_IMPORT',
      runId: commandRunId,
      status: 'RUNNING',
      dataThroughDate: periodEndDate,
      totalCount: 1,
      processedCount: 0,
      succeededCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      changedInstrumentIds: [],
      downstreamInstrumentIds: [],
      batchSize: 1,
      nextOffset: 0,
      hasMore: false,
      startedAt,
      completedAt: null,
      warnings: [],
      errors: [],
      metadata: {
        commandKey: request.commandKey,
        commandIdempotencyKey,
        requestedByUserId: context.requestedByUserId,
        runMode: request.runMode,
        params: manualInput,
        evidenceStatus: 'PENDING_VERIFICATION_WRITE',
        ...(request.reason ? { reason: request.reason } : {}),
      },
    });

    try {
      const result = await this.marketDataService.importManualVerifiedFundamental(manualInput);
      const completedAt = new Date();
      const completedStage = await this.recordMarketDataStageSnapshot({
        region: request.region,
        assetType: request.assetType,
        timeframe: '1d',
        pipelineKey: 'market-intelligence',
        triggerType: 'manual',
        operation: 'MANUAL_VERIFIED_FUNDAMENTALS_IMPORT',
        runId: commandRunId,
        status: 'COMPLETED',
        dataThroughDate: periodEndDate,
        totalCount: 1,
        processedCount: 1,
        succeededCount: 1,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        changedInstrumentIds: [],
        downstreamInstrumentIds: [],
        batchSize: 1,
        nextOffset: null,
        hasMore: false,
        startedAt,
        completedAt: completedAt.toISOString(),
        warnings: [],
        errors: [],
        metadata: {
          commandKey: request.commandKey,
          commandIdempotencyKey,
          requestedByUserId: context.requestedByUserId,
          runMode: request.runMode,
          adapter: 'MarketDataFoundationService.importManualVerifiedFundamental',
          params: manualInput,
          evidenceStatus: 'VERIFIED',
          id: (result as any).id || null,
          source: (result as any).source || 'MANUAL_VERIFIED',
          stockId: (result as any).stockId || stockId,
          symbol: (result as any).symbol || null,
          periodType: (result as any).periodType || periodType,
          periodEndDate: (result as any).periodEndDate || periodEndDate,
          validatedAt: (result as any).validatedAt || manualInput.validatedAt,
          ...(request.reason ? { reason: request.reason } : {}),
        },
      });
      return this.responseFromStage(
        request,
        policy,
        commandIdempotencyKey,
        completedStage,
        { acquired: true, reason: 'ACQUIRED', stage: completedStage },
        'COMPLETED'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Manual verified fundamentals import failed';
      const failedAt = new Date();
      const failedStage = await this.recordMarketDataStageSnapshot({
        region: request.region,
        assetType: request.assetType,
        timeframe: '1d',
        pipelineKey: 'market-intelligence',
        triggerType: 'manual',
        operation: 'MANUAL_VERIFIED_FUNDAMENTALS_IMPORT',
        runId: commandRunId,
        status: 'FAILED',
        dataThroughDate: periodEndDate,
        totalCount: 1,
        processedCount: 0,
        succeededCount: 0,
        failedCount: 1,
        skippedCount: 0,
        unchangedCount: 0,
        changedInstrumentIds: [],
        downstreamInstrumentIds: [],
        batchSize: 1,
        nextOffset: null,
        hasMore: false,
        startedAt,
        completedAt: failedAt.toISOString(),
        warnings: [],
        errors: [errorMessage],
        metadata: {
          commandKey: request.commandKey,
          commandIdempotencyKey,
          requestedByUserId: context.requestedByUserId,
          adapter: 'MarketDataFoundationService.importManualVerifiedFundamental',
          params: manualInput,
          evidenceStatus: 'FAILED',
          error: errorMessage,
          ...(request.reason ? { reason: request.reason } : {}),
        },
      });
      return this.responseFromStage(
        request,
        policy,
        commandIdempotencyKey,
        failedStage,
        { acquired: true, reason: 'ACQUIRED', stage: failedStage },
        'FAILED'
      );
    }
  }

  private async executeRetryFailedStageCommand(
    request: PipelineCommandRequest,
    context: PipelineCommandExecutionContext,
    policy: PipelineCommandPolicy,
    now: Date
  ): Promise<PipelineCommandResponse> {
    this.assertMarketIntelligence1d(request, 'PIPELINE_RETRY_FAILED_STAGE');
    const params = this.commandParams(request);
    let retryCommandKey = this.optionalStringParam(params, 'retryCommandKey') as PipelineCommandKey | null;
    let retryParams = this.optionalObjectParam(params, 'retryParams');
    let retryReason = request.reason || 'Manual retry from Pipeline Ops';

    if (!retryCommandKey) {
      const stages = typeof (this.repository as any).latestStages === 'function'
        ? await this.repository.latestStages({
          region: request.region,
          assetType: request.assetType,
          timeframe: request.timeframe,
          pipelineKey: request.pipelineKey,
          limit: 25,
        })
        : [];
      const failedStage = stages.find((stage: PipelineStageRunRecord) => String(stage.status).toUpperCase() === 'FAILED');
      retryCommandKey = this.commandKeyFromStageMetadata(failedStage?.metadata);
      retryParams = this.optionalObjectParam(failedStage?.metadata || {}, 'params') || retryParams;
      retryReason = request.reason || `Retry failed stage ${failedStage?.id || 'unknown'}`;
    }

    if (!retryCommandKey || retryCommandKey === 'PIPELINE_RETRY_FAILED_STAGE') {
      // FIX E4: DAG-written stage rows have no commandKey in metadata.  Delegate to
      // PIPELINE_DAG_RETRY rather than throwing 'no retryable command metadata', which
      // left DAG failures unrecoverable via this UI entry-point.
      return this.executeDagRetryCommand(
        { ...request, commandKey: 'PIPELINE_DAG_RETRY', runMode: request.runMode || 'full_latest_trading_date' },
        context,
        PIPELINE_COMMAND_POLICY_MAP.get('PIPELINE_DAG_RETRY')!,
        now,
      );
    }

    const targetPolicy = PIPELINE_COMMAND_POLICY_MAP.get(retryCommandKey);
    if (!targetPolicy || targetPolicy.availability !== 'ENABLED') {
      throw new PipelineCommandError(
        422,
        `${retryCommandKey} is not retryable from Pipeline Ops`,
        this.blockedCommandResponse(request, policy, `${retryCommandKey} is not retryable from Pipeline Ops`)
      );
    }

    return this.executeCommand({
      ...request,
      commandKey: retryCommandKey,
      idempotencyKey: `${request.idempotencyKey.trim()}:retry:${retryCommandKey}`,
      reason: retryReason,
      params: retryParams || undefined,
    }, context, now);
  }


  async runScheduledPipelineCatchUpFromMarketDataSummary(
    summary: ScheduledRegionSyncSummary,
    now = new Date(),
    options: { allowCompletedTerminal?: boolean } = {}
  ): Promise<unknown | null> {
    // FIX D: rerouted from the legacy runScheduledDataQualityStage chain to the DAG
    // runner (executeDagPipeline), matching the snapshot-bridge path in
    // runDownstreamDataQualityForMarketDataSnapshot.  Guards still run.
    const dataThroughDate = (summary.dataThroughDate || summary.tradingDate || '').slice(0, 10);
    const changedInstrumentIds = this.normalizeInstrumentIds(
      summary.downstreamInstrumentIds?.length ? summary.downstreamInstrumentIds : summary.changedInstrumentIds
    );
    if (!dataThroughDate || !summary.sourceFingerprint || changedInstrumentIds.length === 0) return null;
    if (await this.hasActiveScheduledDownstream(summary, dataThroughDate, now)) return null;
    if (!options.allowCompletedTerminal && await this.hasCompletedScheduledTerminal(summary, dataThroughDate)) return null;

    const sourceFingerprint = `${summary.sourceFingerprint}:catchup:${dataThroughDate}`;
    return this.executeDagPipeline({
      tradingDate: dataThroughDate,
      region: summary.region,
      assetType: summary.assetType,
      timeframe: '1d',
      trigger: 'scheduled',
      changedInstrumentIds,
      sourceFingerprint,
    }).catch((error) => {
      const message = error instanceof Error ? error.message : 'unknown error';
      console.error('[PipelineOrchestration] runScheduledPipelineCatchUpFromMarketDataSummary DAG failed', {
        region: summary.region,
        assetType: summary.assetType,
        dataThroughDate,
        error: message,
      });
      return { runStatus: 'FAILED', stages: {}, durationMs: 0, errors: [message] };
    });
  }

  async recordMarketDataStageSnapshot(
    request: MarketDataStageSnapshotRequest,
    now = new Date()
  ): Promise<PipelineStageRunRecord> {
    const normalizedScope = this.normalizeScope({
      region: request.region,
      assetType: request.assetType,
      timeframe: request.timeframe,
      dataThroughDate: this.parseOptionalDate(request.dataThroughDate),
    });
    const runId = request.runId.trim();
    if (!runId) throw new Error('runId is required for Market Data pipeline stage snapshots');

    const status = this.mapExternalPipelineStatus(request.status);
    const terminal = TERMINAL_STATUSES.has(status);
    const stageIdempotencyKey = [
      LEDGER_VERSION,
      'market-data',
      this.keyPart(request.operation),
      this.keyPart(normalizedScope.region),
      this.keyPart(normalizedScope.assetType),
      this.keyPart(normalizedScope.timeframe),
      this.keyPart(runId),
    ].join(':');
    const runIdempotencyKey = `${stageIdempotencyKey}:run`;
    const warnings = this.toStringArray(request.warnings);
    const errors = this.toStringArray(request.errors);
    const changedInstrumentIds = this.normalizeInstrumentIds(request.changedInstrumentIds);
    const downstreamInstrumentIds = this.normalizeInstrumentIds(request.downstreamInstrumentIds?.length ? request.downstreamInstrumentIds : request.changedInstrumentIds);
    const changedInstrumentCount = changedInstrumentIds.length;
    const startedAt = this.parseOptionalDate(request.startedAt) || now;
    const completedAt = this.parseOptionalDate(request.completedAt) || (terminal ? now : null);
    const succeededCount = request.succeededCount ?? Math.max(0, request.processedCount - request.failedCount - request.skippedCount);
    const unchangedCount = request.unchangedCount ?? 0;
    const leaseOwner = request.leaseOwner?.trim()
      || `market-data:${this.keyPart(request.operation)}:${PROCESS_LOCAL_ID}`;
    const leaseMs = this.normalizeLeaseMs(request.leaseMs);
    const metadata = {
      operation: request.operation,
      sourceRunId: runId,
      sourceModule: 'market-data-foundation',
      downstreamInstrumentCount: downstreamInstrumentIds.length,
      ...(request.metadata || {}),
    };

    const run = await this.createRun({
      pipelineKey: request.pipelineKey,
      triggerType: request.triggerType,
      status: terminal ? 'RUNNING' : status,
      region: normalizedScope.region,
      assetType: normalizedScope.assetType,
      timeframe: normalizedScope.timeframe,
      dataThroughDate: normalizedScope.dataThroughDate ?? null,
      sourceFingerprint: `market-data:${request.operation}:${runId}`,
      changedInstrumentCount,
      totalCount: request.totalCount,
      processedCount: request.processedCount,
      succeededCount,
      failedCount: request.failedCount,
      skippedCount: request.skippedCount,
      unchangedCount,
      warnings,
      errors,
      idempotencyKey: runIdempotencyKey,
      startedAt,
      metadata,
    });

    await this.createStage({
      pipelineRunId: run.id,
      stageKey: 'MARKET_DATA',
      stageOrder: 1,
      status: terminal ? 'RUNNING' : status,
      idempotencyKey: stageIdempotencyKey,
      region: normalizedScope.region,
      assetType: normalizedScope.assetType,
      timeframe: normalizedScope.timeframe,
      dataThroughDate: normalizedScope.dataThroughDate ?? null,
      inputFingerprint: `market-data:${request.operation}:${runId}`,
      changedInstrumentCount,
      batchSize: request.batchSize ?? null,
      offset: 0,
      nextOffset: request.nextOffset ?? null,
      hasMore: request.hasMore,
      totalCount: request.totalCount,
      processedCount: request.processedCount,
      succeededCount,
      failedCount: request.failedCount,
      skippedCount: request.skippedCount,
      unchangedCount,
      cacheStatus: 'BYPASS',
      warnings,
      errors,
      metadata,
    });

    if (!terminal) {
      return this.recordStageProgress({
        idempotencyKey: stageIdempotencyKey,
        status,
        totalCount: request.totalCount,
        processedCount: request.processedCount,
        succeededCount,
        failedCount: request.failedCount,
        skippedCount: request.skippedCount,
        unchangedCount,
        nextOffset: request.nextOffset ?? null,
        hasMore: request.hasMore,
        warnings,
        errors,
        metadata,
        now,
        startedAt,
        leaseOwner,
        leaseMs,
      });
    }

    const outputFingerprint = this.hashValues([
      stageIdempotencyKey,
      status,
      String(request.totalCount),
      String(request.processedCount),
      String(succeededCount),
      String(request.failedCount),
      String(request.skippedCount),
      String(unchangedCount),
    ]);
    const durationMs = completedAt ? Math.max(0, completedAt.getTime() - startedAt.getTime()) : null;
    const completedStage = await this.completeStage({
      idempotencyKey: stageIdempotencyKey,
      status,
      outputFingerprint,
      totalCount: request.totalCount,
      processedCount: request.processedCount,
      succeededCount,
      partialCount: status === 'PARTIAL' ? Math.max(1, request.failedCount) : 0,
      failedCount: request.failedCount,
      skippedCount: request.skippedCount,
      unchangedCount,
      nextOffset: request.nextOffset ?? null,
      hasMore: request.hasMore,
      cacheStatus: 'BYPASS',
      completedAt: completedAt ?? undefined,
      durationMs,
      warnings,
      errors,
      metadata,
    });
    const downstreamResult = await this.runDownstreamDataQualityForMarketDataSnapshot({
      request,
      normalizedScope,
      completedStage,
      outputFingerprint,
      changedInstrumentIds: downstreamInstrumentIds,
      normalizedBatchSize: this.normalizeScheduledBatchSize(request.batchSize ?? 25, downstreamInstrumentIds.length),
    });
    const runCompletedAt = downstreamResult ? new Date() : completedAt ?? new Date();
    const runDurationMs = Math.max(0, runCompletedAt.getTime() - startedAt.getTime());
    const runStatus = this.marketDataRunStatusAfterDownstream(status, downstreamResult);
    const downstreamErrors = this.scheduledChainErrors(downstreamResult);
    await this.completeRun({
      idempotencyKey: runIdempotencyKey,
      status: runStatus,
      totalCount: request.totalCount,
      processedCount: request.processedCount,
      succeededCount,
      partialCount: runStatus === 'PARTIAL' ? Math.max(1, completedStage.partialCount) : completedStage.partialCount,
      failedCount: runStatus === 'FAILED' ? Math.max(1, request.failedCount) : request.failedCount,
      skippedCount: request.skippedCount,
      unchangedCount,
      completedAt: runCompletedAt,
      durationMs: runDurationMs,
      warnings,
      errors: [...errors, ...downstreamErrors],
      metadata: {
        ...metadata,
        downstreamCompletionWaited: true,
        downstreamStatus: this.scheduledChainStatus(downstreamResult),
        marketDataStageCompletedAt: completedAt?.toISOString?.() ?? null,
      },
    });
    return completedStage;
  }

  runIdempotencyKey(input: PipelineRunCreateInput): string {
    const scope = this.normalizeScope(input);
    return [
      LEDGER_VERSION,
      'run',
      this.keyPart(input.pipelineKey),
      this.keyPart(scope.region),
      this.keyPart(scope.assetType),
      this.keyPart(scope.timeframe),
      this.dateKey(scope.dataThroughDate),
      this.keyPart(input.sourceFingerprint || 'no-source-fingerprint'),
    ].join(':');
  }

  stageIdempotencyKey(input: PipelineStageCreateInput): string {
    const scope = this.normalizeScope(input);
    return [
      LEDGER_VERSION,
      'stage',
      this.keyPart(input.stageKey),
      this.keyPart(scope.region),
      this.keyPart(scope.assetType),
      this.keyPart(scope.timeframe),
      this.dateKey(scope.dataThroughDate),
      this.keyPart(input.inputFingerprint || input.cacheKey || 'no-input-fingerprint'),
    ].join(':');
  }

  private normalizeScope(input: PipelineScopeInput): Required<Pick<PipelineScopeInput, 'region' | 'assetType' | 'timeframe'>> & Pick<PipelineScopeInput, 'dataThroughDate'> {
    const region = input.region.trim().toUpperCase();
    const assetType = input.assetType.trim().toUpperCase();
    if (!region) throw new Error('region is required');
    if (!assetType) throw new Error('assetType is required');
    return {
      region,
      assetType,
      timeframe: (input.timeframe || '1d').trim().toLowerCase(),
      dataThroughDate: input.dataThroughDate ?? null,
    };
  }

  private dateKey(value: Date | null | undefined): string {
    if (!value) return 'no-data-through-date';
    return value.toISOString().slice(0, 10);
  }

  private keyPart(value: string): string {
    return value.trim().replace(/\s+/g, '-').toLowerCase();
  }

  private groupStages(stages: PipelineStageRunRecord[], now = new Date()) {
    const groups = new Map<string, {
      stageKey: string;
      stageOrder: number;
      activeStage: PipelineStatusStageDto | null;
      lastStage: PipelineStatusStageDto | null;
      lastStageRecord: PipelineStageRunRecord | null;
    }>();
    for (const stage of stages) {
      const current = groups.get(stage.stageKey) || {
        stageKey: stage.stageKey,
        stageOrder: stage.stageOrder,
        activeStage: null,
        lastStage: null,
        lastStageRecord: null,
      };
      current.stageOrder = Math.min(current.stageOrder, stage.stageOrder);
      if (!current.activeStage && ACTIVE_STATUSES.has(stage.status) && !this.isStaleActiveStage(stage, now)) current.activeStage = this.toStageStatus(stage);
      // lastStage = the terminal run covering the FRESHEST data (latest dataThroughDate, then
      // latest startedAt) â€” NOT simply the most-recently-started run. Otherwise an out-of-order
      // or tiny/partial write (e.g. a 3-instrument integration-test seed for an old date, or a
      // backfill of an older date) started after the real daily run would shadow it and make the
      // pipeline-status card report a stale "data through" date.
      if (TERMINAL_STATUSES.has(stage.status) && (!current.lastStageRecord || this.terminalStageIsFresher(stage, current.lastStageRecord))) {
        current.lastStageRecord = stage;
        current.lastStage = this.toStageStatus(stage);
      }
      groups.set(stage.stageKey, current);
    }
    return [...groups.values()]
      .map(({ lastStageRecord, ...rest }) => rest)
      .sort((a, b) => a.stageOrder - b.stageOrder || a.stageKey.localeCompare(b.stageKey));
  }

  /**
   * A terminal stage is "fresher" than another if it covers a later data date
   * (dataThroughDate), breaking ties by the later start time. This makes the
   * pipeline-status "last run" reflect the run covering the most recent DATA, not
   * merely the most-recently-written record (which could be a backfill of an old
   * date or a tiny integration-test seed).
   */
  private terminalStageIsFresher(candidate: PipelineStageRunRecord, incumbent: PipelineStageRunRecord): boolean {
    const cThrough = this.parseDateMs(candidate.dataThroughDate);
    const iThrough = this.parseDateMs(incumbent.dataThroughDate);
    if (cThrough !== iThrough) return cThrough > iThrough;
    return this.parseDateMs(candidate.startedAt) > this.parseDateMs(incumbent.startedAt);
  }

  private parseDateMs(value: string | null | undefined): number {
    if (!value) return 0;
    const ms = Date.parse(String(value));
    return Number.isFinite(ms) ? ms : 0;
  }

  private isStaleActiveRun(run: PipelineRunRecord, now: Date): boolean {
    if (!ACTIVE_STATUSES.has(run.status)) return false;
    const updatedAt = Date.parse(run.updatedAt || run.startedAt);
    if (!Number.isFinite(updatedAt)) return true;
    return now.getTime() - updatedAt > this.staleThresholdMs(run);
  }

  private isStaleActiveStage(stage: PipelineStageRunRecord, now: Date): boolean {
    if (!ACTIVE_STATUSES.has(stage.status)) return false;
    const leaseExpiresAt = stage.leaseExpiresAt ? Date.parse(stage.leaseExpiresAt) : NaN;
    if (Number.isFinite(leaseExpiresAt)) return leaseExpiresAt <= now.getTime();
    const updatedAt = Date.parse(stage.updatedAt || stage.startedAt || stage.createdAt);
    if (!Number.isFinite(updatedAt)) return true;
    return now.getTime() - updatedAt > this.staleThresholdMs(stage);
  }

  private staleThresholdMs(record: Pick<PipelineRunRecord | PipelineStageRunRecord, 'processedCount' | 'succeededCount' | 'failedCount' | 'skippedCount' | 'unchangedCount'>): number {
    return this.hasNoProgressEvidence(record) ? DEFAULT_LEASE_MS : this.activeStaleMs();
  }

  private hasNoProgressEvidence(record: Pick<PipelineRunRecord | PipelineStageRunRecord, 'processedCount' | 'succeededCount' | 'failedCount' | 'skippedCount' | 'unchangedCount'>): boolean {
    return Math.max(
      Number(record.processedCount || 0),
      Number(record.succeededCount || 0),
      Number(record.failedCount || 0),
      Number(record.skippedCount || 0),
      Number(record.unchangedCount || 0)
    ) === 0;
  }

  private activeStaleMs(): number {
    const configured = Number(process.env.PIPELINE_ACTIVE_STALE_MS);
    if (Number.isFinite(configured) && configured >= 60_000) return Math.floor(configured);
    return DEFAULT_ACTIVE_STALE_MS;
  }

  private reaperThresholdMs(): number {
    const configured = Number(process.env.PIPELINE_REAPER_THRESHOLD_MS);
    if (Number.isFinite(configured) && configured >= 60_000) return Math.floor(configured);
    // Default: 2 Ã— lease duration (1200 s / 20 min).  Any RUNNING row untouched for this long is stale.
    return DEFAULT_ACTIVE_STALE_MS;
  }

  private normalizeLeaseMs(value: number | null | undefined): number {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
    return DEFAULT_LEASE_MS;
  }

  private async findBlockingActiveStageForScope(
    query: Required<Pick<PipelineLatestStageQuery, 'region' | 'assetType' | 'timeframe' | 'pipelineKey'>>,
    now: Date
  ): Promise<PipelineStageRunRecord | null | undefined> {
    if (typeof (this.repository as any).latestStages !== 'function') return undefined;
    const stages = await this.latestStages({
      ...query,
      limit: 100,
    });
    return stages.find((stage) => ACTIVE_STATUSES.has(stage.status) && !this.isStaleActiveStage(stage, now)) || null;
  }

  private async hasActiveScheduledDownstream(
    summary: ScheduledRegionSyncSummary,
    dataThroughDate: string,
    now: Date
  ): Promise<boolean> {
    if (typeof (this.repository as any).latestStages !== 'function') return false;
    const stages = await this.latestStages({
      region: summary.region,
      assetType: summary.assetType,
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      stageKeys: SCHEDULED_DOWNSTREAM_STAGE_KEYS,
      limit: 100,
    });
    return stages.some((stage) => (
      ACTIVE_STATUSES.has(stage.status)
      && !this.isStaleActiveStage(stage, now)
      && this.stageDataThroughDateKey(stage) === dataThroughDate
    ));
  }

  private async hasCompletedScheduledTerminal(
    summary: ScheduledRegionSyncSummary,
    dataThroughDate: string
  ): Promise<boolean> {
    if (typeof (this.repository as any).latestStages !== 'function') return false;
    const stages = await this.latestStages({
      region: summary.region,
      assetType: summary.assetType,
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      stageKeys: ['SIGNAL_POSITION_LEDGER'],
      limit: 20,
    });
    return stages.some((stage) => (
      (stage.status === 'COMPLETED' || stage.status === 'PARTIAL')
      && this.stageDataThroughDateKey(stage) === dataThroughDate
    ));
  }

  private stageDataThroughDateKey(stage: Pick<PipelineStageRunRecord, 'dataThroughDate'>): string | null {
    return stage.dataThroughDate ? stage.dataThroughDate.slice(0, 10) : null;
  }

  private toRunStatus(run: PipelineRunRecord): PipelineStatusRunDto {
    return {
      id: run.id,
      status: run.status,
      triggerType: run.triggerType,
      dataThroughDate: run.dataThroughDate,
      changedInstrumentCount: run.changedInstrumentCount,
      totalCount: run.totalCount,
      processedCount: run.processedCount,
      succeededCount: run.succeededCount,
      partialCount: run.partialCount,
      failedCount: run.failedCount,
      skippedCount: run.skippedCount,
      unchangedCount: run.unchangedCount,
      sourceFingerprint: run.sourceFingerprint,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      durationMs: run.durationMs,
      warnings: run.warnings,
      errors: run.errors,
      updatedAt: run.updatedAt,
    };
  }

  private toStageStatus(stage: PipelineStageRunRecord): PipelineStatusStageDto {
    return {
      id: stage.id,
      pipelineRunId: stage.pipelineRunId,
      stageKey: stage.stageKey,
      stageOrder: stage.stageOrder,
      status: stage.status,
      dataThroughDate: stage.dataThroughDate,
      changedInstrumentCount: stage.changedInstrumentCount,
      batchSize: stage.batchSize,
      offset: stage.offset,
      nextOffset: stage.nextOffset,
      hasMore: stage.hasMore,
      totalCount: stage.totalCount,
      processedCount: stage.processedCount,
      succeededCount: stage.succeededCount,
      partialCount: stage.partialCount,
      failedCount: stage.failedCount,
      skippedCount: stage.skippedCount,
      unchangedCount: stage.unchangedCount,
      attemptCount: stage.attemptCount,
      cacheKey: stage.cacheKey,
      cacheStatus: stage.cacheStatus,
      cacheExpiresAt: stage.cacheExpiresAt,
      inputFingerprint: stage.inputFingerprint,
      outputFingerprint: stage.outputFingerprint,
      leaseOwner: stage.leaseOwner,
      leaseExpiresAt: stage.leaseExpiresAt,
      startedAt: stage.startedAt,
      completedAt: stage.completedAt,
      durationMs: stage.durationMs,
      warnings: stage.warnings,
      errors: stage.errors,
      metadata: stage.metadata,
      updatedAt: stage.updatedAt,
    };
  }

  private commandIdempotencyKey(request: PipelineCommandRequest): string {
    return [
      LEDGER_VERSION,
      'manual-command',
      request.commandKey,
      request.region,
      request.assetType,
      request.timeframe,
      request.pipelineKey,
      String(request.offset),
      String(request.batchSize),
      request.idempotencyKey.trim(),
    ].join(':');
  }

  private assertMarketIntelligence1d(request: PipelineCommandRequest, commandKey: PipelineCommandKey) {
    if (request.timeframe !== '1d' || request.pipelineKey !== 'market-intelligence') {
      throw new PipelineCommandError(400, `${commandKey} supports only the market-intelligence 1d pipeline`);
    }
  }

  private commandParams(request: PipelineCommandRequest): Record<string, unknown> {
    return request.params && typeof request.params === 'object' && !Array.isArray(request.params)
      ? request.params
      : {};
  }

  private commandDataThroughDate(request: PipelineCommandRequest): string | null {
    return this.optionalStringParam(this.commandParams(request), 'dataThroughDate');
  }

  private pipelineStageStatusFromAdapterStatus(status: string): PipelineStageStatus {
    if (status === 'COMPLETED' || status === 'PARTIAL' || status === 'SKIPPED' || status === 'FAILED') return status;
    return 'FAILED';
  }

  private requiredStringParam(params: Record<string, unknown>, key: string): string {
    const value = this.optionalStringParam(params, key);
    if (!value) throw new PipelineCommandError(400, `${key} is required`);
    return value;
  }

  private optionalStringParam(params: Record<string, unknown>, key: string): string | null {
    const value = params[key];
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text ? text : null;
  }

  private optionalNumberParam(params: Record<string, unknown>, key: string): number | null {
    const value = params[key];
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new PipelineCommandError(400, `${key} must be a number`);
    return parsed;
  }

  private optionalBooleanParam(params: Record<string, unknown>, key: string): boolean | null {
    const value = params[key];
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
    throw new PipelineCommandError(400, `${key} must be a boolean`);
  }

  private optionalObjectParam(params: Record<string, unknown>, key: string): Record<string, unknown> | null {
    const value = params[key];
    if (!value) return null;
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new PipelineCommandError(400, `${key} must be an object`);
    }
    return value as Record<string, unknown>;
  }

  private marketDataCommandRunId(prefix: string, commandIdempotencyKey: string): string {
    return `${prefix}-${createHash('sha256').update(commandIdempotencyKey).digest('hex').slice(0, 16)}`;
  }

  private marketDataCommandStageStatus(value: unknown): PipelineStageStatus {
    const status = String(value || '').toUpperCase();
    if (status === 'PENDING' || status === 'RUNNING' || status === 'COMPLETED' || status === 'PARTIAL' || status === 'FAILED' || status === 'SKIPPED' || status === 'BLOCKED') {
      return status as PipelineStageStatus;
    }
    if (status === 'CANCELLED' || status === 'CANCELED') return 'SKIPPED';
    return 'FAILED';
  }

  private historicalBackfillDataThroughDate(summary: unknown): string | null {
    if (!summary || typeof summary !== 'object') return null;
    const jobs = Array.isArray((summary as any).jobs) ? (summary as any).jobs : [];
    const completedJobs = jobs
      .filter((job: any) => ['COMPLETED', 'SKIPPED_ALREADY_IMPORTED', 'NOT_AVAILABLE', 'FAILED'].includes(String(job?.status || '').toUpperCase()))
      .map((job: any) => String(job?.tradingDate || '').slice(0, 10))
      .filter(Boolean)
      .sort();
    if (completedJobs.length) return completedJobs[completedJobs.length - 1];
    const attemptedDates = Array.isArray((summary as any).attemptedDates) ? (summary as any).attemptedDates : [];
    const sortedAttempted = attemptedDates.map(String).filter(Boolean).sort();
    const lastAttempted = sortedAttempted.length ? sortedAttempted[sortedAttempted.length - 1] : null;
    if (lastAttempted) return lastAttempted;
    const skippedDates = Array.isArray((summary as any).skippedDates) ? (summary as any).skippedDates : [];
    const sortedSkipped = skippedDates.map(String).filter(Boolean).sort();
    return sortedSkipped.length ? sortedSkipped[sortedSkipped.length - 1] : null;
  }

  private commandKeyFromStageMetadata(metadata: Record<string, unknown> | null | undefined): PipelineCommandKey | null {
    const commandKey = String(metadata?.commandKey || '').trim().toUpperCase();
    if (!commandKey || !PIPELINE_COMMAND_POLICY_MAP.has(commandKey as PipelineCommandKey)) return null;
    return commandKey as PipelineCommandKey;
  }

  private blockedCommandResponse(request: PipelineCommandRequest, policy: PipelineCommandPolicy, reason: string): PipelineCommandResponse {
    return {
      commandId: `${request.commandKey}:${request.region}:${request.assetType}:${request.timeframe}:${request.pipelineKey}`,
      commandKey: request.commandKey,
      stageKey: policy.stageKey,
      status: 'BLOCKED',
      scope: {
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        pipelineKey: request.pipelineKey,
      },
      runMode: request.runMode,
      pipelineRunId: null,
      stageRunId: null,
      idempotencyKey: '',
      lease: {
        acquired: false,
        reason: 'NOT_ATTEMPTED',
        leaseOwner: null,
        leaseExpiresAt: null,
      },
      batch: {
        batchSize: request.batchSize,
        offset: request.offset,
        nextOffset: null,
        hasMore: false,
      },
      counts: {
        totalCount: 0,
        processedCount: 0,
        succeededCount: 0,
        partialCount: 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
      },
      warnings: [],
      errors: [reason],
      statusUrl: this.statusUrl(request),
      startedAt: null,
      completedAt: null,
    };
  }

  private activeRunHeldResponse(
    request: PipelineCommandRequest,
    policy: PipelineCommandPolicy,
    idempotencyKey: string,
    activeRun: PipelineRunRecord,
    activeStage?: PipelineStageRunRecord | null
  ): PipelineCommandResponse {
    const countSource = activeStage || activeRun;
    return {
      commandId: idempotencyKey,
      commandKey: request.commandKey,
      stageKey: policy.stageKey,
      status: 'LEASE_HELD',
      scope: {
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        pipelineKey: request.pipelineKey,
      },
      runMode: request.runMode,
      pipelineRunId: activeRun.id,
      stageRunId: activeStage?.id || null,
      idempotencyKey,
      lease: {
        acquired: false,
        reason: 'LEASE_HELD',
        leaseOwner: activeStage?.leaseOwner || null,
        leaseExpiresAt: activeStage?.leaseExpiresAt || null,
      },
      batch: {
        batchSize: activeStage?.batchSize ?? request.batchSize,
        offset: activeStage?.offset ?? request.offset,
        nextOffset: activeStage?.nextOffset ?? null,
        hasMore: activeStage?.hasMore ?? false,
      },
      counts: {
        totalCount: countSource.totalCount,
        processedCount: countSource.processedCount,
        succeededCount: countSource.succeededCount,
        partialCount: countSource.partialCount,
        failedCount: countSource.failedCount,
        skippedCount: countSource.skippedCount,
        unchangedCount: countSource.unchangedCount,
      },
      warnings: activeStage?.warnings ?? activeRun.warnings,
      errors: ['Pipeline run is already active for this scope.'],
      statusUrl: this.statusUrl(request),
      startedAt: activeStage?.startedAt ?? activeRun.startedAt,
      completedAt: activeStage?.completedAt ?? activeRun.completedAt,
    };
  }

  private duplicateTerminalResponse(
    request: PipelineCommandRequest,
    policy: PipelineCommandPolicy,
    idempotencyKey: string,
    leaseResult: PipelineStageLeaseResult
  ): PipelineCommandResponse {
    const stage = leaseResult.stage;
    return {
      commandId: idempotencyKey,
      commandKey: request.commandKey,
      stageKey: policy.stageKey,
      status: 'DUPLICATE_TERMINAL',
      scope: {
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        pipelineKey: request.pipelineKey,
      },
      runMode: request.runMode,
      pipelineRunId: stage?.pipelineRunId || null,
      stageRunId: stage?.id || null,
      idempotencyKey,
      lease: {
        acquired: false,
        reason: leaseResult.reason,
        leaseOwner: stage?.leaseOwner || null,
        leaseExpiresAt: stage?.leaseExpiresAt || null,
      },
      batch: {
        batchSize: stage?.batchSize ?? request.batchSize,
        offset: stage?.offset ?? request.offset,
        nextOffset: stage?.nextOffset ?? null,
        hasMore: stage?.hasMore ?? false,
      },
      counts: {
        totalCount: stage?.totalCount ?? 0,
        processedCount: stage?.processedCount ?? 0,
        succeededCount: stage?.succeededCount ?? 0,
        partialCount: stage?.partialCount ?? 0,
        failedCount: stage?.failedCount ?? 0,
        skippedCount: stage?.skippedCount ?? 0,
        unchangedCount: stage?.unchangedCount ?? 0,
      },
      warnings: stage?.warnings ?? [],
      errors: stage?.errors ?? [],
      statusUrl: this.statusUrl(request),
      startedAt: stage?.startedAt ?? null,
      completedAt: stage?.completedAt ?? null,
    };
  }

  private leaseHeldResponse(
    request: PipelineCommandRequest,
    policy: PipelineCommandPolicy,
    idempotencyKey: string,
    leaseResult: PipelineStageLeaseResult
  ): PipelineCommandResponse {
    const stage = leaseResult.stage;
    return {
      commandId: idempotencyKey,
      commandKey: request.commandKey,
      stageKey: policy.stageKey,
      status: 'LEASE_HELD',
      scope: {
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        pipelineKey: request.pipelineKey,
      },
      runMode: request.runMode,
      pipelineRunId: stage?.pipelineRunId || null,
      stageRunId: stage?.id || null,
      idempotencyKey,
      lease: {
        acquired: false,
        reason: leaseResult.reason,
        leaseOwner: stage?.leaseOwner || null,
        leaseExpiresAt: stage?.leaseExpiresAt || null,
      },
      batch: {
        batchSize: stage?.batchSize ?? request.batchSize,
        offset: stage?.offset ?? request.offset,
        nextOffset: stage?.nextOffset ?? null,
        hasMore: stage?.hasMore ?? false,
      },
      counts: {
        totalCount: stage?.totalCount ?? 0,
        processedCount: stage?.processedCount ?? 0,
        succeededCount: stage?.succeededCount ?? 0,
        partialCount: stage?.partialCount ?? 0,
        failedCount: stage?.failedCount ?? 0,
        skippedCount: stage?.skippedCount ?? 0,
        unchangedCount: stage?.unchangedCount ?? 0,
      },
      warnings: stage?.warnings ?? [],
      errors: stage?.errors ?? [],
      statusUrl: this.statusUrl(request),
      startedAt: stage?.startedAt ?? null,
      completedAt: stage?.completedAt ?? null,
    };
  }

  private responseFromStage(
    request: PipelineCommandRequest,
    policy: PipelineCommandPolicy,
    idempotencyKey: string,
    stage: PipelineStageRunRecord,
    leaseResult: PipelineStageLeaseResult,
    status: PipelineCommandResponse['status']
  ): PipelineCommandResponse {
    return {
      commandId: idempotencyKey,
      commandKey: request.commandKey,
      stageKey: policy.stageKey,
      status,
      scope: {
        region: request.region,
        assetType: request.assetType,
        timeframe: request.timeframe,
        pipelineKey: request.pipelineKey,
      },
      runMode: request.runMode,
      pipelineRunId: stage.pipelineRunId,
      stageRunId: stage.id,
      idempotencyKey,
      lease: {
        acquired: true,
        reason: leaseResult.reason,
        leaseOwner: stage.leaseOwner,
        leaseExpiresAt: stage.leaseExpiresAt,
      },
      batch: {
        batchSize: stage.batchSize ?? request.batchSize,
        offset: stage.offset ?? request.offset,
        nextOffset: stage.nextOffset,
        hasMore: stage.hasMore,
      },
      counts: {
        totalCount: stage.totalCount,
        processedCount: stage.processedCount,
        succeededCount: stage.succeededCount,
        partialCount: stage.partialCount,
        failedCount: stage.failedCount,
        skippedCount: stage.skippedCount,
        unchangedCount: stage.unchangedCount,
      },
      warnings: stage.warnings,
      errors: stage.errors,
      statusUrl: this.statusUrl(request),
      startedAt: stage.startedAt,
      completedAt: stage.completedAt,
    };
  }

  private marketDataPipelineStageStatus(summary: ScheduledRegionSyncSummary): PipelineStageStatus {
    const processedCount = Math.max(0, Number(summary.instrumentsProcessed || 0));
    const downstreamCount = Math.max(
      summary.downstreamInstrumentIds?.length || 0,
      summary.changedInstrumentIds?.length || 0
    );
    const errorCount = summary.errors?.length || 0;
    if (errorCount > 0) return processedCount > 0 || downstreamCount > 0 ? 'PARTIAL' : 'FAILED';
    if (processedCount === 0 && downstreamCount === 0) return 'SKIPPED';
    return 'COMPLETED';
  }

  private async withFullDailyDownstreamEligibility(summary: ScheduledRegionSyncSummary): Promise<ScheduledRegionSyncSummary> {
    const explicitDownstreamIds = this.normalizeInstrumentIds(
      summary.downstreamInstrumentIds?.length ? summary.downstreamInstrumentIds : summary.changedInstrumentIds
    );
    if (explicitDownstreamIds.length > 0) {
      return {
        ...summary,
        downstreamInstrumentIds: this.normalizeInstrumentIds(summary.downstreamInstrumentIds?.length ? summary.downstreamInstrumentIds : explicitDownstreamIds),
        downstreamEligibilitySource: summary.downstreamEligibilitySource || 'market_data_summary',
        dqStageEligible: summary.dqStageEligible ?? true,
      };
    }

    const dataThroughDate = summary.dataThroughDate || summary.tradingDate;
    if (!dataThroughDate || summary.errors?.length) return summary;
    const resolver = (this.marketDataService as any).listDailyRefreshEligibleInstrumentIds;
    if (typeof resolver !== 'function') return summary;

    try {
      const eligibility = await resolver.call(this.marketDataService, {
        region: summary.region,
        assetType: summary.assetType,
        dataThroughDate,
        limit: 10_000,
      });
      const resolvedIds = this.normalizeInstrumentIds(eligibility?.instrumentIds);
      if (resolvedIds.length === 0) return summary;

      return {
        ...summary,
        downstreamInstrumentIds: resolvedIds,
        downstreamEligibilitySource: eligibility?.source || 'daily_refresh_fallback',
        dqStageEligible: true,
        sourceFingerprint: summary.sourceFingerprint || `full-daily-eligibility:${this.hashValues([
          summary.region,
          summary.assetType,
          dataThroughDate,
          eligibility?.source || 'daily-refresh-fallback',
          ...resolvedIds,
        ])}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'daily refresh eligibility lookup failed';
      return {
        ...summary,
        warningCount: Math.max(0, Number(summary.warningCount || 0)) + 1,
        warnings: [...(summary.warnings || []), `Full daily downstream eligibility fallback failed: ${message}`].slice(0, 10),
      };
    }
  }

  private incrementalChangedOnlyDownstreamSummary(summary: ScheduledRegionSyncSummary): ScheduledRegionSyncSummary {
    const changedInstrumentIds = this.normalizeInstrumentIds(summary.changedInstrumentIds);
    return {
      ...summary,
      changedInstrumentIds,
      downstreamInstrumentIds: changedInstrumentIds,
      downstreamEligibilitySource: changedInstrumentIds.length > 0 ? 'changed_instruments' : null,
      dqStageEligible: changedInstrumentIds.length > 0 && (summary.dqStageEligible ?? true),
    };
  }

  private marketDataPipelineTotalCount(summary: ScheduledRegionSyncSummary): number {
    return Math.max(
      0,
      Number(summary.instrumentsProcessed || 0),
      summary.downstreamInstrumentIds?.length || 0,
      summary.changedInstrumentIds?.length || 0,
      Number(summary.providerFetchSkippedCount || 0),
      Number(summary.skippedBeforeFetchCount || 0)
    );
  }

  private commandStatusFromStageStatus(status: PipelineStageStatus): PipelineCommandResponse['status'] {
    if (status === 'PENDING' || status === 'RUNNING') return 'PARTIAL';
    if (status === 'ABANDONED') return 'FAILED';
    return status;
  }

  private marketPulseStageStatus(status: string): PipelineStageStatus {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'FRESH') return 'COMPLETED';
    if (normalized === 'PARTIAL' || normalized === 'STALE') return 'PARTIAL';
    return 'FAILED';
  }

  private marketDataRunStatusAfterDownstream(status: PipelineStageStatus, downstreamResult: unknown | null): PipelineStageStatus {
    if (!downstreamResult) return status;
    if (this.scheduledChainHasStatus(downstreamResult, 'FAILED')) return 'PARTIAL';
    if (this.scheduledChainHasStatus(downstreamResult, 'LEASE_HELD')) return 'PARTIAL';
    return status;
  }

  private isFullDailyPipelineRun(request: Pick<PipelineCommandRequest, 'commandKey' | 'runMode'>): boolean {
    return request.commandKey === 'PIPELINE_RUN_ALL' && request.runMode !== 'incremental_changed_only';
  }

  // dailyPipelineTerminalStatus deleted in FIX B â€” it was only used by
  // executeDailyPipelineCommand which was deleted as a dead legacy path.

  private scheduledChainStatus(result: unknown | null): string | null {
    if (!result || typeof result !== 'object') return null;
    const status = String((result as any).status || '');
    const child = this.scheduledChainChild(result);
    const childStatus = this.scheduledChainStatus(child);
    return childStatus ? `${status} -> ${childStatus}` : status || null;
  }

  private scheduledChainErrors(result: unknown | null): string[] {
    if (!result || typeof result !== 'object') return [];
    const stageKey = String((result as any).stageKey || 'UNKNOWN_STAGE');
    const errors = Array.isArray((result as any).errors)
      ? (result as any).errors.map((entry: unknown) => `${stageKey}: ${String(entry)}`)
      : [];
    return [...errors, ...this.scheduledChainErrors(this.scheduledChainChild(result))];
  }

  private scheduledChainHasStatus(result: unknown | null, status: string): boolean {
    if (!result || typeof result !== 'object') return false;
    if (String((result as any).status || '') === status) return true;
    return this.scheduledChainHasStatus(this.scheduledChainChild(result), status);
  }

  private scheduledChainChild(result: unknown): unknown | null {
    if (!result || typeof result !== 'object') return null;
    const value = result as any;
    return value.downstreamRawSignals || value.downstreamSignalCalibration || value.downstream || null;
  }

  private firePipelineRunAlert(
    runStatus: string,
    region: string,
    assetType: string,
    dataThroughDate: string | null,
    durationMs: number | null,
    stagesSummary: Array<{ stageKey: string; status: string; succeededCount: number; failedCount: number }>,
    firstError?: string | null
  ): void {
    sendPipelineRunAlert({ status: runStatus, region, assetType, dataThroughDate, durationMs, stagesSummary, firstError }).catch(() => {});
  }

  private hashValues(values: string[]): string {
    const payload = values.join('|');
    return createHash('sha256').update(payload).digest('hex').slice(0, 16);
  }

  private normalizeScheduledBatchSize(batchSize: number, changedInstrumentCount: number): number {
    const normalized = Math.max(1, Math.min(Math.floor(Number(batchSize) || 25), 100));
    return Math.max(1, Math.min(normalized, changedInstrumentCount));
  }

  private statusUrl(request: Pick<PipelineCommandRequest, 'region' | 'assetType' | 'timeframe' | 'pipelineKey'>): string {
    const query = new URLSearchParams({
      region: request.region,
      assetType: request.assetType,
      timeframe: request.timeframe,
      pipelineKey: request.pipelineKey,
      limit: '100',
    });
    return `/api/v1/pipeline/status?${query.toString()}`;
  }

  private normalizeInstrumentIds(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map((entry) => String(entry || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }

  /**
   * Scheduled handover â€” Phase 2 live path.
   *
   * Market-data foundation calls recordMarketDataStageSnapshot on every sync
   * completion; this method picks up the payload and hands it to executeDagPipeline.
   *
   * FIX A guard note: hasCompletedScheduledTerminal checks stageKey='SIGNAL_POSITION_LEDGER'
   * via latestStages (pipelineKey='market-intelligence').  The DAG runner writes its run row
   * under pipelineKey='market-intelligence' (overridden in RepositoryDagPersistence.upsertRun)
   * and writes stage rows with stageKey='SIGNAL_POSITION_LEDGER' verbatim, so latestStages
   * finds them and the guard is effective.  hasActiveScheduledDownstream similarly queries
   * pipelineKey='market-intelligence' and will find DAG stage rows correctly.
   */
  private async runDownstreamDataQualityForMarketDataSnapshot(input: {
    request: MarketDataStageSnapshotRequest;
    normalizedScope: { region: string; assetType: string; timeframe: string; dataThroughDate?: Date | null };
    completedStage: PipelineStageRunRecord;
    outputFingerprint: string;
    changedInstrumentIds: string[];
    normalizedBatchSize: number;
  }): Promise<unknown | null> {
    const { request, normalizedScope, completedStage, outputFingerprint, changedInstrumentIds } = input;
    if (!this.shouldRunDownstreamDataQualityForMarketDataSnapshot(request, changedInstrumentIds)) return null;

    const dataThroughDate = this.snapshotDataThroughDateKey(request.dataThroughDate, normalizedScope.dataThroughDate);
    if (!dataThroughDate) {
      console.warn('[PipelineOrchestration] Market Data snapshot skipped downstream DAG pipeline: missing dataThroughDate', {
        operation: request.operation,
        runId: request.runId,
        stageRunId: completedStage.id,
      });
      return null;
    }

    const sourceFingerprint = `${outputFingerprint || completedStage.outputFingerprint || `market-data:${request.operation}:${request.runId}`}:catchup:${dataThroughDate}`;

    return this.executeDagPipeline({
      tradingDate: dataThroughDate,
      region: normalizedScope.region,
      assetType: normalizedScope.assetType,
      timeframe: '1d',
      trigger: 'scheduled',
      changedInstrumentIds,
      sourceFingerprint,
    }).catch((error) => {
      const message = error instanceof Error ? error.message : 'unknown error';
      console.error('[PipelineOrchestration] downstream DAG pipeline failed after Market Data snapshot', {
        operation: request.operation,
        runId: request.runId,
        stageRunId: completedStage.id,
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        error: message,
      });
      return {
        runStatus: 'FAILED',
        stages: {},
        durationMs: 0,
        errors: [message],
      };
    });
  }

  private shouldRunDownstreamDataQualityForMarketDataSnapshot(
    request: MarketDataStageSnapshotRequest,
    changedInstrumentIds: string[]
  ): boolean {
    if ((request.metadata as any)?.downstreamAlreadyExecuted === true) return false;
    if ((request.metadata as any)?.downstreamSnapshotBridgeSuppressed === true) return false;
    if (changedInstrumentIds.length === 0) return false;
    if (request.operation === 'CATALOG_SYNC') return false;
    return request.status === 'COMPLETED' || request.status === 'PARTIAL';
  }

  private snapshotDataThroughDateKey(value: string | null | undefined, fallback: Date | null | undefined): string | null {
    const parsed = this.parseOptionalDate(value) || fallback || null;
    return parsed ? parsed.toISOString().slice(0, 10) : null;
  }

  private mapDataQualityStatus(totalCount: number, failedCount: number): 'COMPLETED' | 'PARTIAL' | 'SKIPPED' {
    if (totalCount === 0) return 'SKIPPED';
    if (failedCount > 0) return 'PARTIAL';
    return 'COMPLETED';
  }

  private toStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
  }

  private parseOptionalDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private mapExternalPipelineStatus(status: MarketDataStageSnapshotRequest['status']): PipelineStageStatus {
    if (status === 'CANCELED') return 'PARTIAL';
    if (status === 'PENDING') return 'PENDING';
    if (status === 'RUNNING') return 'RUNNING';
    if (status === 'COMPLETED') return 'COMPLETED';
    if (status === 'FAILED') return 'FAILED';
    if (status === 'SKIPPED') return 'SKIPPED';
    if (status === 'BLOCKED') return 'BLOCKED';
    return 'PARTIAL';
  }

  private isInFlightDuplicateStage(stage: PipelineStageRunRecord, leaseOwner: string): boolean {
    return (
      stage.status === 'RUNNING'
      && stage.completedAt === null
      && stage.leaseOwner === leaseOwner
      && stage.attemptCount > 1
    );
  }

}

function commandPolicy(
  commandKey: PipelineCommandKey,
  stageKey: string,
  stageOrder: number,
  moduleName: string,
  operationName: string,
  availability: PipelineCommandAvailability,
  disabledReason: string | null,
  runModes: PipelineCommandPolicy['runModes'] = ['single_batch'],
  defaultBatchSize = 25
): PipelineCommandPolicy {
  const providerAccess = availability === 'ENABLED'
    ? 'NONE'
    : commandKey.startsWith('MARKET_DATA_')
      ? 'FORBIDDEN'
      : 'NONE';
  return {
    commandKey,
    stageKey,
    stageOrder,
    moduleName,
    operationName,
    availability,
    disabledReason,
    runModes,
    defaultBatchSize,
    maxBatchSize: 100,
    providerAccess,
    schedulerAccess: availability === 'ENABLED' ? 'NONE' : 'FORBIDDEN',
    downstreamFanout: commandKey === 'PIPELINE_RUN_ALL'
      ? 'APPROVED'
      : availability === 'ENABLED' ? 'NONE' : 'FORBIDDEN',
  };
}
