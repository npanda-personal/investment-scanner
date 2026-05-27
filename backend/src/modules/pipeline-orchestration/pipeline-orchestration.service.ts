import { createHash } from 'crypto';
import { DataQualityEngineService } from '../data-quality-engine';
import { HistoricalContextSnapshotsService } from '../historical-context-snapshots';
import { MarketContextIntelligenceService } from '../market-context-intelligence';
import { ResearchHubService } from '../research-hub';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SignalCalibrationEngineService } from '../signal-calibration-engine';
import { SignalQualityLabService } from '../signal-quality-lab';
import { SignalPositionLedgerService } from '../signal-position-ledger';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import { StrategyDecisionEngineService } from '../strategy-decision-engine';
import { TodayTradeReviewService } from '../today-trade-review';
import { PipelineOrchestrationRepository } from './pipeline-orchestration.repository';
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
  ScheduledDataQualityStageRequest,
  ScheduledDataQualityStageResponse,
  ScheduledRawSignalsStageRequest,
  ScheduledRawSignalsStageResponse,
  ScheduledSignalCalibrationStageRequest,
  ScheduledSignalCalibrationStageResponse,
  ScheduledPipelineStageRequest,
  ScheduledPipelineStageResponse,
} from './pipeline-orchestration.types';

const LEDGER_VERSION = 'pipeline-ledger-v1';
const ACTIVE_STATUSES = new Set(['PENDING', 'RUNNING']);
const TERMINAL_STATUSES = new Set(['COMPLETED', 'PARTIAL', 'FAILED', 'SKIPPED', 'BLOCKED']);
const DEFAULT_LEASE_MS = 600_000;
const DEFAULT_ACTIVE_STALE_MS = DEFAULT_LEASE_MS * 2;
const PROCESS_LOCAL_ID = `${process.pid}-${Math.random().toString(16).slice(2, 10)}`;
const DQ_SCHEDULED_STAGE_VERSION = 'scheduled-dq-v1';
const RAW_SIGNALS_SCHEDULED_STAGE_VERSION = 'scheduled-raw-signals-v1';
const SIGNAL_CALIBRATION_SCHEDULED_STAGE_VERSION = 'scheduled-signal-calibration-v1';
const MARKET_CONTEXT_SCHEDULED_STAGE_VERSION = 'scheduled-market-context-v2';
const SMART_MONEY_SCHEDULED_STAGE_VERSION = 'scheduled-smart-money-v2';
const CONTEXT_SNAPSHOTS_SCHEDULED_STAGE_VERSION = 'scheduled-context-snapshots-v2';
const SIGNAL_QUALITY_SCHEDULED_STAGE_VERSION = 'scheduled-signal-quality-v2';
const STRATEGY_DECISION_SCHEDULED_STAGE_VERSION = 'scheduled-strategy-decision-v2';
const RESEARCH_PROJECTION_SCHEDULED_STAGE_VERSION = 'scheduled-research-projection-v2';
const TODAY_REVIEW_SCHEDULED_STAGE_VERSION = 'scheduled-today-review-v2';
const SIGNAL_POSITION_LEDGER_SCHEDULED_STAGE_VERSION = 'scheduled-signal-position-ledger-v1';

type ScheduledAdapterResult = {
  totalCount: number;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
  unchangedCount?: number;
  warnings?: string[];
  errors?: string[];
  nextOffset?: number | null;
  hasMore?: boolean;
  metadata?: Record<string, unknown>;
};

type ScheduledStageDefinition = {
  stageKey: string;
  stageOrder: number;
  stageSlug: string;
  stageVersion: string;
  sourceStage: string;
  adapter: string;
};

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
  commandPolicy('SIGNAL_QUALITY_DIAGNOSTICS_REFRESH', 'SIGNAL_QUALITY', 7, 'Signal Quality', 'Signal quality diagnostics refresh', 'DEFERRED', 'Manual command is deferred; scheduler-only diagnostics refresh is active.'),
  commandPolicy('SMART_MONEY_REFRESH_SCOPE', 'SMART_MONEY', 8, 'Smart Money', 'Smart money refresh', 'DEFERRED', 'Manual command is deferred; scheduler-only explicit-instrument automation is active.'),
  commandPolicy('STRATEGY_DECISION_EVALUATE_SCOPE', 'STRATEGY_DECISION', 9, 'Strategy', 'Strategy decision refresh', 'DEFERRED', 'Manual command is deferred; scheduler-only explicit-instrument evaluation is active.'),
  commandPolicy('BACKTEST_PROOF_REFRESH', 'BACKTEST_PROOF', 10, 'Backtests', 'Backtest proof refresh', 'FORBIDDEN', 'Backtesting proof execution is out of scope for this first command slice.'),
  commandPolicy('RESEARCH_PROJECTION_REFRESH', 'RESEARCH_PROJECTION', 11, 'Research', 'Research projection refresh', 'FORBIDDEN', 'Manual command remains forbidden; scheduler-only research projection automation is active.'),
  commandPolicy('TODAY_REVIEW_PUBLISH', 'TODAY_REVIEW', 12, 'Today Review', 'Today review publish', 'FORBIDDEN', 'Manual command remains forbidden; scheduler-only publication is active with compatibility generation disabled.'),
  commandPolicy('SIGNAL_POSITION_LEDGER_REFRESH', 'SIGNAL_POSITION_LEDGER', 13, 'Signal Position Ledger', 'Materialized ledger refresh', 'DEFERRED', 'Manual command remains module-owned; scheduler-only materialization is active.'),
  commandPolicy('PIPELINE_RUN_ALL', 'PIPELINE', 14, 'Pipeline', 'Run all stages', 'FORBIDDEN', 'Broad pipeline fanout is out of scope.'),
  commandPolicy('PIPELINE_DRAIN_ALL_BATCHES', 'PIPELINE', 14, 'Pipeline', 'Drain all batches', 'FORBIDDEN', 'First slice allows one batch per request only.'),
  commandPolicy('PIPELINE_CANCEL_ACTIVE', 'PIPELINE', 14, 'Pipeline', 'Cancel active run', 'FORBIDDEN', 'No background worker cancellation contract exists for this slice.'),
];

const PIPELINE_COMMAND_POLICY_MAP = new Map(PIPELINE_COMMAND_POLICIES.map((policy) => [policy.commandKey, policy]));

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
    private readonly signalPositionLedgerService = new SignalPositionLedgerService()
  ) {}

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

  async runScheduledDataQualityStage(
    request: ScheduledDataQualityStageRequest,
    now = new Date()
  ): Promise<ScheduledDataQualityStageResponse> {
    const normalizedScope = this.normalizeScope({
      region: request.region,
      assetType: request.assetType,
      timeframe: request.timeframe,
    });
    const changedInstrumentIds = [...new Set(request.changedInstrumentIds.map((id) => String(id || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    const normalizedBatchSize = this.normalizeScheduledBatchSize(request.batchSize, changedInstrumentIds.length);
    if (changedInstrumentIds.length === 0) {
      return this.scheduledSkippedResponse(request, normalizedScope, normalizedBatchSize);
    }

    const changedInstrumentFingerprint = this.hashValues(changedInstrumentIds);
    const stageIdempotencyKey = this.scheduledDataQualityStageIdempotencyKey({
      region: normalizedScope.region,
      assetType: normalizedScope.assetType,
      timeframe: normalizedScope.timeframe,
      dataThroughDate: request.dataThroughDate,
      sourceFingerprint: request.sourceFingerprint,
      changedInstrumentFingerprint,
    });
    const runIdempotencyKey = `${stageIdempotencyKey}:run`;
    const inputFingerprint = [
      'scheduled-dq',
      request.dataThroughDate,
      request.sourceFingerprint,
      changedInstrumentFingerprint,
      DQ_SCHEDULED_STAGE_VERSION,
    ].join(':');
    const leaseOwner = `scheduled-dq:${PROCESS_LOCAL_ID}`;

    let stageLease = await this.leaseStage({
      idempotencyKey: stageIdempotencyKey,
      leaseOwner,
      leaseMs: DEFAULT_LEASE_MS,
      now,
      allowTerminalRetry: false,
    });

    if (stageLease.reason === 'STAGE_TERMINAL') {
      return this.scheduledResponseFromLease('DUPLICATE_TERMINAL', request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
    }
    if (stageLease.reason === 'LEASE_HELD') {
      return this.scheduledResponseFromLease('LEASE_HELD', request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
    }

    if (stageLease.reason === 'STAGE_NOT_FOUND') {
      const run = await this.createRun({
        pipelineKey: request.pipelineKey,
        triggerType: request.triggerType,
        status: 'RUNNING',
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        dataThroughDate: new Date(`${request.dataThroughDate}T00:00:00.000Z`),
        sourceFingerprint: request.sourceFingerprint,
        changedInstrumentCount: changedInstrumentIds.length,
        totalCount: changedInstrumentIds.length,
        processedCount: 0,
        succeededCount: 0,
        partialCount: 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        idempotencyKey: runIdempotencyKey,
        startedAt: now,
        metadata: {
          sourceStage: 'MARKET_DATA',
          dataThroughDate: request.dataThroughDate,
          sourceFingerprint: request.sourceFingerprint,
          changedInstrumentCount: changedInstrumentIds.length,
          changedInstrumentIdsSample: changedInstrumentIds.slice(0, 25),
          changedInstrumentFingerprint,
          dqStageVersion: DQ_SCHEDULED_STAGE_VERSION,
          schedulerRunStartedAt: request.schedulerRunStartedAt,
        },
      });

      await this.createStage({
        pipelineRunId: run.id,
        stageKey: 'DATA_QUALITY',
        stageOrder: 2,
        status: 'PENDING',
        idempotencyKey: stageIdempotencyKey,
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        dataThroughDate: new Date(`${request.dataThroughDate}T00:00:00.000Z`),
        inputFingerprint,
        changedInstrumentCount: changedInstrumentIds.length,
        batchSize: normalizedBatchSize,
        offset: 0,
        nextOffset: 0,
        hasMore: false,
        totalCount: changedInstrumentIds.length,
        processedCount: 0,
        succeededCount: 0,
        partialCount: 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        metadata: {
          sourceStage: 'MARKET_DATA',
          dataThroughDate: request.dataThroughDate,
          sourceFingerprint: request.sourceFingerprint,
          changedInstrumentCount: changedInstrumentIds.length,
          changedInstrumentFingerprint,
          dqStageVersion: DQ_SCHEDULED_STAGE_VERSION,
          schedulerRunStartedAt: request.schedulerRunStartedAt,
        },
      });

      stageLease = await this.leaseStage({
        idempotencyKey: stageIdempotencyKey,
        leaseOwner,
        leaseMs: DEFAULT_LEASE_MS,
        now,
        allowTerminalRetry: false,
      });
      if (stageLease.reason === 'STAGE_TERMINAL') {
        return this.scheduledResponseFromLease('DUPLICATE_TERMINAL', request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
      }
      if (stageLease.reason === 'LEASE_HELD') {
        return this.scheduledResponseFromLease('LEASE_HELD', request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
      }
    }

    if (!stageLease.acquired || !stageLease.stage) {
      return {
        status: 'FAILED',
        pipelineRunId: stageLease.stage?.pipelineRunId || null,
        stageRunId: stageLease.stage?.id || null,
        stageKey: 'DATA_QUALITY',
        scope: {
          region: normalizedScope.region,
          assetType: normalizedScope.assetType,
          timeframe: normalizedScope.timeframe,
          pipelineKey: request.pipelineKey,
        },
        triggerType: 'scheduled',
        dataThroughDate: request.dataThroughDate,
        inputFingerprint,
        outputFingerprint: null,
        batch: {
          totalInstrumentCount: changedInstrumentIds.length,
          processedCount: 0,
          batchSize: normalizedBatchSize,
          nextOffset: null,
          hasMore: false,
        },
        counts: {
          totalCount: changedInstrumentIds.length,
          processedCount: 0,
          succeededCount: 0,
          partialCount: 0,
          failedCount: 1,
          skippedCount: 0,
          unchangedCount: 0,
        },
        warnings: [],
        errors: [`Unable to acquire scheduled stage lease: ${stageLease.reason}`],
        startedAt: null,
        completedAt: null,
      };
    }

    const leasedStage = stageLease.stage;
    const startedAt = now;
    await this.recordStageProgress({
      idempotencyKey: stageIdempotencyKey,
      status: 'RUNNING',
      totalCount: changedInstrumentIds.length,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      nextOffset: 0,
      hasMore: false,
      metadata: {
        sourceStage: 'MARKET_DATA',
        dataThroughDate: request.dataThroughDate,
        sourceFingerprint: request.sourceFingerprint,
        changedInstrumentCount: changedInstrumentIds.length,
        changedInstrumentFingerprint,
        dqStageVersion: DQ_SCHEDULED_STAGE_VERSION,
        schedulerRunStartedAt: request.schedulerRunStartedAt,
        adapter: 'DataQualityEngineService.evaluateScheduledStage',
      },
      now: startedAt,
    });

    try {
      const adapterResult = await this.dataQualityService.evaluateScheduledStage({
        instrumentIds: changedInstrumentIds,
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        batchSize: normalizedBatchSize,
      });
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime());
      const totalCount = adapterResult.totalCount;
      const adapterProcessedCount = adapterResult.processedCount;
      const succeededCount = adapterResult.evaluatedCount;
      const failedCount = adapterResult.failedCount;
      const skippedCount = adapterResult.skippedCount;
      const completedCount = Math.min(totalCount, Math.max(adapterProcessedCount, succeededCount + failedCount + skippedCount));
      const status = this.mapScheduledDataQualityStatus({
        totalCount,
        evaluatedCount: succeededCount,
        failedCount,
        skippedCount,
      });
      const outputFingerprint = this.hashValues([
        stageIdempotencyKey,
        status,
        String(totalCount),
        String(completedCount),
        String(succeededCount),
        String(failedCount),
        String(skippedCount),
      ]);
      const metadata = {
        sourceStage: 'MARKET_DATA',
        dataThroughDate: request.dataThroughDate,
        sourceFingerprint: request.sourceFingerprint,
        changedInstrumentCount: changedInstrumentIds.length,
        changedInstrumentFingerprint,
        dqStageVersion: DQ_SCHEDULED_STAGE_VERSION,
        schedulerRunStartedAt: request.schedulerRunStartedAt,
        adapter: 'DataQualityEngineService.evaluateScheduledStage',
        adapterProcessedCount,
        completedCount,
      };

      const completedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status,
        totalCount,
        processedCount: completedCount,
        succeededCount,
        partialCount: status === 'PARTIAL' ? Math.max(1, failedCount + skippedCount) : 0,
        failedCount,
        skippedCount,
        unchangedCount: 0,
        nextOffset: null,
        hasMore: false,
        outputFingerprint,
        warnings: adapterResult.warnings,
        errors: [],
        completedAt,
        durationMs,
        metadata,
      });

      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status,
        totalCount,
        processedCount: completedCount,
        succeededCount,
        partialCount: completedStage.partialCount,
        failedCount,
        skippedCount,
        unchangedCount: 0,
        warnings: adapterResult.warnings,
        errors: [],
        completedAt,
        durationMs,
        metadata,
      });

      const response = this.scheduledResponseFromStage(status, request, normalizedScope, completedStage, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
      if (status === 'COMPLETED') {
        response.downstreamRawSignals = await this.runScheduledRawSignalsStage({
          region: normalizedScope.region,
          assetType: normalizedScope.assetType,
          timeframe: '1d',
          pipelineKey: request.pipelineKey,
          triggerType: 'scheduled',
          dataThroughDate: request.dataThroughDate,
          sourceFingerprint: outputFingerprint,
          changedInstrumentIds,
          batchSize: normalizedBatchSize,
          schedulerRunStartedAt: request.schedulerRunStartedAt,
          upstreamStageRunId: completedStage.id,
        }).catch((error) => {
          console.error('[PipelineOrchestration] scheduled Raw Signals stage failed after Data Quality', {
            region: normalizedScope.region,
            assetType: normalizedScope.assetType,
            dataThroughDate: request.dataThroughDate,
            error: error instanceof Error ? error.message : 'unknown error',
          });
          return null;
        });
      }
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Scheduled Data Quality stage failed';
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime());
      const failedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status: 'FAILED',
        totalCount: changedInstrumentIds.length,
        processedCount: leasedStage.processedCount,
        succeededCount: leasedStage.succeededCount,
        partialCount: leasedStage.partialCount,
        failedCount: Math.max(1, leasedStage.failedCount),
        skippedCount: leasedStage.skippedCount,
        unchangedCount: leasedStage.unchangedCount,
        nextOffset: null,
        hasMore: false,
        outputFingerprint: null,
        warnings: leasedStage.warnings,
        errors: [...leasedStage.errors, errorMessage],
        completedAt,
        durationMs,
        metadata: {
          sourceStage: 'MARKET_DATA',
          dataThroughDate: request.dataThroughDate,
          sourceFingerprint: request.sourceFingerprint,
          changedInstrumentCount: changedInstrumentIds.length,
          changedInstrumentFingerprint,
          dqStageVersion: DQ_SCHEDULED_STAGE_VERSION,
          schedulerRunStartedAt: request.schedulerRunStartedAt,
          adapter: 'DataQualityEngineService.evaluateScheduledStage',
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
          sourceStage: 'MARKET_DATA',
          dataThroughDate: request.dataThroughDate,
          sourceFingerprint: request.sourceFingerprint,
          changedInstrumentCount: changedInstrumentIds.length,
          changedInstrumentFingerprint,
          dqStageVersion: DQ_SCHEDULED_STAGE_VERSION,
          schedulerRunStartedAt: request.schedulerRunStartedAt,
          adapter: 'DataQualityEngineService.evaluateScheduledStage',
          error: errorMessage,
        },
      });
      return this.scheduledResponseFromStage('FAILED', request, normalizedScope, failedStage, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
    }
  }

  async runScheduledRawSignalsStage(
    request: ScheduledRawSignalsStageRequest,
    now = new Date()
  ): Promise<ScheduledRawSignalsStageResponse> {
    const normalizedScope = this.normalizeScope({
      region: request.region,
      assetType: request.assetType,
      timeframe: request.timeframe,
    });
    const changedInstrumentIds = [...new Set(request.changedInstrumentIds.map((id) => String(id || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    const normalizedBatchSize = this.normalizeScheduledBatchSize(request.batchSize, changedInstrumentIds.length);
    if (changedInstrumentIds.length === 0) {
      return this.scheduledRawSignalsSkippedResponse(request, normalizedScope, normalizedBatchSize);
    }

    const changedInstrumentFingerprint = this.hashValues(changedInstrumentIds);
    const stageIdempotencyKey = this.scheduledRawSignalsStageIdempotencyKey({
      region: normalizedScope.region,
      assetType: normalizedScope.assetType,
      timeframe: normalizedScope.timeframe,
      dataThroughDate: request.dataThroughDate,
      sourceFingerprint: request.sourceFingerprint,
      changedInstrumentFingerprint,
    });
    const runIdempotencyKey = `${stageIdempotencyKey}:run`;
    const inputFingerprint = [
      'scheduled-raw-signals',
      request.dataThroughDate,
      request.sourceFingerprint,
      changedInstrumentFingerprint,
      RAW_SIGNALS_SCHEDULED_STAGE_VERSION,
    ].join(':');
    const leaseOwner = `scheduled-raw-signals:${PROCESS_LOCAL_ID}`;

    let stageLease = await this.leaseStage({
      idempotencyKey: stageIdempotencyKey,
      leaseOwner,
      leaseMs: DEFAULT_LEASE_MS,
      now,
      allowTerminalRetry: false,
    });

    if (stageLease.reason === 'STAGE_TERMINAL') {
      return this.scheduledRawSignalsResponseFromLease('DUPLICATE_TERMINAL', request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
    }
    if (stageLease.reason === 'LEASE_HELD') {
      return this.scheduledRawSignalsResponseFromLease('LEASE_HELD', request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
    }

    if (stageLease.reason === 'STAGE_NOT_FOUND') {
      const run = await this.createRun({
        pipelineKey: request.pipelineKey,
        triggerType: request.triggerType,
        status: 'RUNNING',
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        dataThroughDate: new Date(`${request.dataThroughDate}T00:00:00.000Z`),
        sourceFingerprint: request.sourceFingerprint,
        changedInstrumentCount: changedInstrumentIds.length,
        totalCount: changedInstrumentIds.length,
        processedCount: 0,
        succeededCount: 0,
        partialCount: 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        idempotencyKey: runIdempotencyKey,
        startedAt: now,
        metadata: {
          sourceStage: 'DATA_QUALITY',
          upstreamStageRunId: request.upstreamStageRunId ?? null,
          dataThroughDate: request.dataThroughDate,
          sourceFingerprint: request.sourceFingerprint,
          changedInstrumentCount: changedInstrumentIds.length,
          changedInstrumentIdsSample: changedInstrumentIds.slice(0, 25),
          changedInstrumentFingerprint,
          rawSignalsStageVersion: RAW_SIGNALS_SCHEDULED_STAGE_VERSION,
          schedulerRunStartedAt: request.schedulerRunStartedAt,
        },
      });

      await this.createStage({
        pipelineRunId: run.id,
        stageKey: 'RAW_SIGNALS',
        stageOrder: 3,
        status: 'PENDING',
        idempotencyKey: stageIdempotencyKey,
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        dataThroughDate: new Date(`${request.dataThroughDate}T00:00:00.000Z`),
        inputFingerprint,
        changedInstrumentCount: changedInstrumentIds.length,
        batchSize: normalizedBatchSize,
        offset: 0,
        nextOffset: 0,
        hasMore: false,
        totalCount: changedInstrumentIds.length,
        processedCount: 0,
        succeededCount: 0,
        partialCount: 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        metadata: {
          sourceStage: 'DATA_QUALITY',
          upstreamStageRunId: request.upstreamStageRunId ?? null,
          dataThroughDate: request.dataThroughDate,
          sourceFingerprint: request.sourceFingerprint,
          changedInstrumentCount: changedInstrumentIds.length,
          changedInstrumentFingerprint,
          rawSignalsStageVersion: RAW_SIGNALS_SCHEDULED_STAGE_VERSION,
          schedulerRunStartedAt: request.schedulerRunStartedAt,
        },
      });

      stageLease = await this.leaseStage({
        idempotencyKey: stageIdempotencyKey,
        leaseOwner,
        leaseMs: DEFAULT_LEASE_MS,
        now,
        allowTerminalRetry: false,
      });
      if (stageLease.reason === 'STAGE_TERMINAL') {
        return this.scheduledRawSignalsResponseFromLease('DUPLICATE_TERMINAL', request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
      }
      if (stageLease.reason === 'LEASE_HELD') {
        return this.scheduledRawSignalsResponseFromLease('LEASE_HELD', request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
      }
    }

    if (!stageLease.acquired || !stageLease.stage) {
      return this.scheduledRawSignalsFailureResponse(request, normalizedScope, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length, `Unable to acquire scheduled Raw Signals stage lease: ${stageLease.reason}`);
    }

    const leasedStage = stageLease.stage;
    const startedAt = now;
    await this.recordStageProgress({
      idempotencyKey: stageIdempotencyKey,
      status: 'RUNNING',
      totalCount: changedInstrumentIds.length,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      nextOffset: 0,
      hasMore: false,
      metadata: {
        sourceStage: 'DATA_QUALITY',
        upstreamStageRunId: request.upstreamStageRunId ?? null,
        dataThroughDate: request.dataThroughDate,
        sourceFingerprint: request.sourceFingerprint,
        changedInstrumentCount: changedInstrumentIds.length,
        changedInstrumentFingerprint,
        rawSignalsStageVersion: RAW_SIGNALS_SCHEDULED_STAGE_VERSION,
        schedulerRunStartedAt: request.schedulerRunStartedAt,
        adapter: 'SignalGenerationEngineService.run',
      },
      now: startedAt,
    });

    try {
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
      for (let offset = 0; offset < changedInstrumentIds.length; offset += normalizedBatchSize) {
        const chunk = changedInstrumentIds.slice(offset, offset + normalizedBatchSize);
        const adapterResult = await this.signalGenerationService.run({
          instrumentIds: chunk,
          region: normalizedScope.region,
          assetType: normalizedScope.assetType,
          batchSize: normalizedBatchSize,
          offset: 0,
          requestedByUserId: 'system',
          useDataQualityFilter: true,
          missingQualityBehavior: 'SKIP',
          skipUnusable: true,
          includeLimited: false,
          providerThrottleMs: 0,
          researchContextMode: 'LIGHTWEIGHT',
        });
        generatedCount += adapterResult.generatedCount ?? adapterResult.generated ?? 0;
        updatedCount += adapterResult.updatedCount ?? 0;
        noOpCount += adapterResult.noOpCount ?? 0;
        failedCount += adapterResult.failedCount ?? adapterResult.errors.length;
        skippedCount += adapterResult.skippedCount ?? adapterResult.skipped ?? 0;
        adapterProcessedCount += adapterResult.processedCount ?? chunk.length;
        excludedByDataQuality += adapterResult.dataQuality?.excludedByDataQuality ?? 0;
        missingQualityEvaluationCount += adapterResult.dataQuality?.missingQualityEvaluationCount ?? 0;
        warnings.push(...adapterResult.warnings);
        errors.push(...adapterResult.errors);

        const nextOffset = offset + chunk.length;
        await this.recordStageProgress({
          idempotencyKey: stageIdempotencyKey,
          status: 'RUNNING',
          totalCount: changedInstrumentIds.length,
          processedCount: Math.min(changedInstrumentIds.length, adapterProcessedCount),
          succeededCount: generatedCount + updatedCount + noOpCount,
          partialCount: 0,
          failedCount,
          skippedCount,
          unchangedCount: noOpCount,
          nextOffset: nextOffset < changedInstrumentIds.length ? nextOffset : null,
          hasMore: nextOffset < changedInstrumentIds.length,
          metadata: {
            sourceStage: 'DATA_QUALITY',
            upstreamStageRunId: request.upstreamStageRunId ?? null,
            dataThroughDate: request.dataThroughDate,
            sourceFingerprint: request.sourceFingerprint,
            changedInstrumentCount: changedInstrumentIds.length,
            changedInstrumentFingerprint,
            rawSignalsStageVersion: RAW_SIGNALS_SCHEDULED_STAGE_VERSION,
            schedulerRunStartedAt: request.schedulerRunStartedAt,
            adapter: 'SignalGenerationEngineService.run',
            adapterProcessedCount,
            generatedCount,
            updatedCount,
            noOpCount,
            excludedByDataQuality,
            missingQualityEvaluationCount,
          },
          now: new Date(),
        });
      }
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime());
      const succeededCount = generatedCount + updatedCount + noOpCount;
      const totalCount = changedInstrumentIds.length;
      const completedCount = Math.min(totalCount, Math.max(adapterProcessedCount, succeededCount + failedCount + skippedCount));
      const status = this.mapScheduledRawSignalsStatus({
        totalCount,
        succeededCount,
        failedCount,
        skippedCount,
      });
      const outputFingerprint = this.hashValues([
        stageIdempotencyKey,
        status,
        String(totalCount),
        String(completedCount),
        String(succeededCount),
        String(failedCount),
        String(skippedCount),
        String(noOpCount),
      ]);
      const metadata = {
        sourceStage: 'DATA_QUALITY',
        upstreamStageRunId: request.upstreamStageRunId ?? null,
        dataThroughDate: request.dataThroughDate,
        sourceFingerprint: request.sourceFingerprint,
        changedInstrumentCount: changedInstrumentIds.length,
        changedInstrumentFingerprint,
        rawSignalsStageVersion: RAW_SIGNALS_SCHEDULED_STAGE_VERSION,
        schedulerRunStartedAt: request.schedulerRunStartedAt,
        adapter: 'SignalGenerationEngineService.run',
        adapterProcessedCount,
        completedCount,
        generatedCount,
        updatedCount,
        noOpCount,
        excludedByDataQuality,
        missingQualityEvaluationCount,
      };

      const completedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status,
        totalCount,
        processedCount: completedCount,
        succeededCount,
        partialCount: status === 'PARTIAL' ? Math.max(1, failedCount + skippedCount) : 0,
        failedCount,
        skippedCount,
        unchangedCount: noOpCount,
        nextOffset: null,
        hasMore: false,
        outputFingerprint,
        warnings,
        errors,
        completedAt,
        durationMs,
        metadata,
      });

      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status,
        totalCount,
        processedCount: completedCount,
        succeededCount,
        partialCount: completedStage.partialCount,
        failedCount,
        skippedCount,
        unchangedCount: noOpCount,
        warnings,
        errors,
        completedAt,
        durationMs,
        metadata,
      });

      const response = this.scheduledRawSignalsResponseFromStage(status, request, normalizedScope, completedStage, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
      if (status === 'COMPLETED' || (status === 'PARTIAL' && completedStage.succeededCount > 0)) {
        response.downstreamSignalCalibration = await this.runScheduledSignalCalibrationStage({
          region: normalizedScope.region,
          assetType: normalizedScope.assetType,
          timeframe: '1d',
          pipelineKey: request.pipelineKey,
          triggerType: 'scheduled',
          dataThroughDate: request.dataThroughDate,
          sourceFingerprint: outputFingerprint,
          changedInstrumentIds,
          batchSize: normalizedBatchSize,
          schedulerRunStartedAt: request.schedulerRunStartedAt,
          upstreamStageRunId: completedStage.id,
        }).catch((error) => {
          console.error('[PipelineOrchestration] scheduled Signal Calibration stage failed after Raw Signals', {
            region: normalizedScope.region,
            assetType: normalizedScope.assetType,
            dataThroughDate: request.dataThroughDate,
            error: error instanceof Error ? error.message : 'unknown error',
          });
          return null;
        });
      }
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Scheduled Raw Signals stage failed';
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime());
      const failedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status: 'FAILED',
        totalCount: changedInstrumentIds.length,
        processedCount: leasedStage.processedCount,
        succeededCount: leasedStage.succeededCount,
        partialCount: leasedStage.partialCount,
        failedCount: Math.max(1, leasedStage.failedCount),
        skippedCount: leasedStage.skippedCount,
        unchangedCount: leasedStage.unchangedCount,
        nextOffset: null,
        hasMore: false,
        outputFingerprint: null,
        warnings: leasedStage.warnings,
        errors: [...leasedStage.errors, errorMessage],
        completedAt,
        durationMs,
        metadata: {
          sourceStage: 'DATA_QUALITY',
          upstreamStageRunId: request.upstreamStageRunId ?? null,
          dataThroughDate: request.dataThroughDate,
          sourceFingerprint: request.sourceFingerprint,
          changedInstrumentCount: changedInstrumentIds.length,
          changedInstrumentFingerprint,
          rawSignalsStageVersion: RAW_SIGNALS_SCHEDULED_STAGE_VERSION,
          schedulerRunStartedAt: request.schedulerRunStartedAt,
          adapter: 'SignalGenerationEngineService.run',
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
          sourceStage: 'DATA_QUALITY',
          upstreamStageRunId: request.upstreamStageRunId ?? null,
          dataThroughDate: request.dataThroughDate,
          sourceFingerprint: request.sourceFingerprint,
          changedInstrumentCount: changedInstrumentIds.length,
          changedInstrumentFingerprint,
          rawSignalsStageVersion: RAW_SIGNALS_SCHEDULED_STAGE_VERSION,
          schedulerRunStartedAt: request.schedulerRunStartedAt,
          adapter: 'SignalGenerationEngineService.run',
          error: errorMessage,
        },
      });
      return this.scheduledRawSignalsResponseFromStage('FAILED', request, normalizedScope, failedStage, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
    }
  }

  async runScheduledSignalCalibrationStage(
    request: ScheduledSignalCalibrationStageRequest,
    now = new Date()
  ): Promise<ScheduledSignalCalibrationStageResponse> {
    const normalizedScope = this.normalizeScope({
      region: request.region,
      assetType: request.assetType,
      timeframe: request.timeframe,
    });
    const changedInstrumentIds = [...new Set(request.changedInstrumentIds.map((id) => String(id || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    const normalizedBatchSize = this.normalizeScheduledBatchSize(request.batchSize, changedInstrumentIds.length);
    if (changedInstrumentIds.length === 0) {
      return this.scheduledSignalCalibrationSkippedResponse(request, normalizedScope, normalizedBatchSize);
    }

    const changedInstrumentFingerprint = this.hashValues(changedInstrumentIds);
    const stageIdempotencyKey = this.scheduledSignalCalibrationStageIdempotencyKey({
      region: normalizedScope.region,
      assetType: normalizedScope.assetType,
      timeframe: normalizedScope.timeframe,
      dataThroughDate: request.dataThroughDate,
      sourceFingerprint: request.sourceFingerprint,
      changedInstrumentFingerprint,
    });
    const runIdempotencyKey = `${stageIdempotencyKey}:run`;
    const inputFingerprint = [
      'scheduled-signal-calibration',
      request.dataThroughDate,
      request.sourceFingerprint,
      changedInstrumentFingerprint,
      SIGNAL_CALIBRATION_SCHEDULED_STAGE_VERSION,
    ].join(':');
    const leaseOwner = `scheduled-signal-calibration:${PROCESS_LOCAL_ID}`;

    let stageLease = await this.leaseStage({
      idempotencyKey: stageIdempotencyKey,
      leaseOwner,
      leaseMs: DEFAULT_LEASE_MS,
      now,
      allowTerminalRetry: false,
    });

    if (stageLease.reason === 'STAGE_TERMINAL') {
      return this.scheduledSignalCalibrationResponseFromLease('DUPLICATE_TERMINAL', request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
    }
    if (stageLease.reason === 'LEASE_HELD') {
      return this.scheduledSignalCalibrationResponseFromLease('LEASE_HELD', request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
    }

    if (stageLease.reason === 'STAGE_NOT_FOUND') {
      const run = await this.createRun({
        pipelineKey: request.pipelineKey,
        triggerType: request.triggerType,
        status: 'RUNNING',
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        dataThroughDate: new Date(`${request.dataThroughDate}T00:00:00.000Z`),
        sourceFingerprint: request.sourceFingerprint,
        changedInstrumentCount: changedInstrumentIds.length,
        totalCount: changedInstrumentIds.length,
        processedCount: 0,
        succeededCount: 0,
        partialCount: 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        idempotencyKey: runIdempotencyKey,
        startedAt: now,
        metadata: {
          sourceStage: 'RAW_SIGNALS',
          upstreamStageRunId: request.upstreamStageRunId ?? null,
          dataThroughDate: request.dataThroughDate,
          sourceFingerprint: request.sourceFingerprint,
          changedInstrumentCount: changedInstrumentIds.length,
          changedInstrumentIdsSample: changedInstrumentIds.slice(0, 25),
          changedInstrumentFingerprint,
          signalCalibrationStageVersion: SIGNAL_CALIBRATION_SCHEDULED_STAGE_VERSION,
          schedulerRunStartedAt: request.schedulerRunStartedAt,
        },
      });

      await this.createStage({
        pipelineRunId: run.id,
        stageKey: 'SIGNAL_CALIBRATION',
        stageOrder: 4,
        status: 'PENDING',
        idempotencyKey: stageIdempotencyKey,
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        dataThroughDate: new Date(`${request.dataThroughDate}T00:00:00.000Z`),
        inputFingerprint,
        changedInstrumentCount: changedInstrumentIds.length,
        batchSize: normalizedBatchSize,
        offset: 0,
        nextOffset: 0,
        hasMore: false,
        totalCount: changedInstrumentIds.length,
        processedCount: 0,
        succeededCount: 0,
        partialCount: 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        metadata: {
          sourceStage: 'RAW_SIGNALS',
          upstreamStageRunId: request.upstreamStageRunId ?? null,
          dataThroughDate: request.dataThroughDate,
          sourceFingerprint: request.sourceFingerprint,
          changedInstrumentCount: changedInstrumentIds.length,
          changedInstrumentFingerprint,
          signalCalibrationStageVersion: SIGNAL_CALIBRATION_SCHEDULED_STAGE_VERSION,
          schedulerRunStartedAt: request.schedulerRunStartedAt,
        },
      });

      stageLease = await this.leaseStage({
        idempotencyKey: stageIdempotencyKey,
        leaseOwner,
        leaseMs: DEFAULT_LEASE_MS,
        now,
        allowTerminalRetry: false,
      });
      if (stageLease.reason === 'STAGE_TERMINAL') {
        return this.scheduledSignalCalibrationResponseFromLease('DUPLICATE_TERMINAL', request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
      }
      if (stageLease.reason === 'LEASE_HELD') {
        return this.scheduledSignalCalibrationResponseFromLease('LEASE_HELD', request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
      }
    }

    if (!stageLease.acquired || !stageLease.stage) {
      return this.scheduledSignalCalibrationFailureResponse(request, normalizedScope, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length, `Unable to acquire scheduled Signal Calibration stage lease: ${stageLease.reason}`);
    }

    const leasedStage = stageLease.stage;
    const startedAt = now;
    await this.recordStageProgress({
      idempotencyKey: stageIdempotencyKey,
      status: 'RUNNING',
      totalCount: changedInstrumentIds.length,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      nextOffset: 0,
      hasMore: false,
      metadata: {
        sourceStage: 'RAW_SIGNALS',
        upstreamStageRunId: request.upstreamStageRunId ?? null,
        dataThroughDate: request.dataThroughDate,
        sourceFingerprint: request.sourceFingerprint,
        changedInstrumentCount: changedInstrumentIds.length,
        changedInstrumentFingerprint,
        signalCalibrationStageVersion: SIGNAL_CALIBRATION_SCHEDULED_STAGE_VERSION,
        schedulerRunStartedAt: request.schedulerRunStartedAt,
        adapter: 'SignalCalibrationEngineService.run',
      },
      now: startedAt,
    });

    try {
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
      for (let offset = 0; offset < changedInstrumentIds.length; offset += normalizedBatchSize) {
        const chunk = changedInstrumentIds.slice(offset, offset + normalizedBatchSize);
        const adapterResult = await this.signalCalibrationService.run({
          instrumentIds: chunk,
          region: normalizedScope.region,
          assetType: normalizedScope.assetType,
          batchSize: normalizedBatchSize,
          offset: 0,
        });
        succeededCount += adapterResult.generated ?? adapterResult.results.length;
        failedCount += adapterResult.failedCount ?? adapterResult.errors.length;
        unchangedCount += adapterResult.passthroughCount ?? 0;
        adapterProcessedCount += adapterResult.processedCount ?? chunk.length;
        adapterSkippedCount += adapterResult.skippedCount ?? adapterResult.skipped ?? 0;
        outOfScopeSkipped += adapterResult.outOfScopeSkipped ?? 0;
        calibratedCount += adapterResult.calibratedCount ?? 0;
        passthroughCount += adapterResult.passthroughCount ?? 0;
        selectedHorizon = selectedHorizon || adapterResult.selectedHorizon || null;
        evidenceStatus = evidenceStatus || adapterResult.calibrationEvidence?.evidenceStatus || null;
        readinessStatus = readinessStatus || adapterResult.calibrationReadiness?.status || null;
        warnings.push(...adapterResult.warnings);
        errors.push(...adapterResult.errors);

        const nextOffset = offset + chunk.length;
        const runningSkippedCount = adapterSkippedCount + outOfScopeSkipped;
        await this.recordStageProgress({
          idempotencyKey: stageIdempotencyKey,
          status: 'RUNNING',
          totalCount: changedInstrumentIds.length,
          processedCount: Math.min(changedInstrumentIds.length, adapterProcessedCount),
          succeededCount,
          partialCount: 0,
          failedCount,
          skippedCount: runningSkippedCount,
          unchangedCount,
          nextOffset: nextOffset < changedInstrumentIds.length ? nextOffset : null,
          hasMore: nextOffset < changedInstrumentIds.length,
          metadata: {
            sourceStage: 'RAW_SIGNALS',
            upstreamStageRunId: request.upstreamStageRunId ?? null,
            dataThroughDate: request.dataThroughDate,
            sourceFingerprint: request.sourceFingerprint,
            changedInstrumentCount: changedInstrumentIds.length,
            changedInstrumentFingerprint,
            signalCalibrationStageVersion: SIGNAL_CALIBRATION_SCHEDULED_STAGE_VERSION,
            schedulerRunStartedAt: request.schedulerRunStartedAt,
            adapter: 'SignalCalibrationEngineService.run',
            adapterProcessedCount,
            calibratedCount,
            passthroughCount,
            selectedHorizon,
            evidenceStatus,
            readinessStatus,
          },
          now: new Date(),
        });
      }
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime());
      const totalCount = changedInstrumentIds.length;
      const missingInputSkipped = Math.max(0, totalCount - adapterProcessedCount - adapterSkippedCount);
      const skippedCount = adapterSkippedCount + outOfScopeSkipped + missingInputSkipped;
      const completedCount = Math.min(totalCount, Math.max(adapterProcessedCount, succeededCount + failedCount + skippedCount));
      const status = this.mapScheduledSignalCalibrationStatus({
        totalCount,
        processedCount: completedCount,
        succeededCount,
        failedCount,
        skippedCount,
      });
      const outputFingerprint = this.hashValues([
        stageIdempotencyKey,
        status,
        String(totalCount),
        String(completedCount),
        String(succeededCount),
        String(failedCount),
        String(skippedCount),
        String(unchangedCount),
      ]);
      const metadata = {
        sourceStage: 'RAW_SIGNALS',
        upstreamStageRunId: request.upstreamStageRunId ?? null,
        dataThroughDate: request.dataThroughDate,
        sourceFingerprint: request.sourceFingerprint,
        changedInstrumentCount: changedInstrumentIds.length,
        changedInstrumentFingerprint,
        signalCalibrationStageVersion: SIGNAL_CALIBRATION_SCHEDULED_STAGE_VERSION,
        schedulerRunStartedAt: request.schedulerRunStartedAt,
        adapter: 'SignalCalibrationEngineService.run',
        adapterProcessedCount,
        completedCount,
        missingInputSkipped,
        calibratedCount,
        passthroughCount,
        selectedHorizon,
        evidenceStatus,
        readinessStatus,
      };

      const completedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status,
        totalCount,
        processedCount: completedCount,
        succeededCount,
        partialCount: status === 'PARTIAL' ? Math.max(1, failedCount + skippedCount) : 0,
        failedCount,
        skippedCount,
        unchangedCount,
        nextOffset: null,
        hasMore: false,
        outputFingerprint,
        warnings,
        errors,
        completedAt,
        durationMs,
        metadata,
      });

      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status,
        totalCount,
        processedCount: completedCount,
        succeededCount,
        partialCount: completedStage.partialCount,
        failedCount,
        skippedCount,
        unchangedCount,
        warnings,
        errors,
        completedAt,
        durationMs,
        metadata,
      });

      const response = this.scheduledSignalCalibrationResponseFromStage(status, request, normalizedScope, completedStage, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
      if (status === 'COMPLETED' || (status === 'PARTIAL' && completedStage.succeededCount > 0)) {
        response.downstream = await this.runScheduledMarketContextStage({
          region: normalizedScope.region,
          assetType: normalizedScope.assetType,
          timeframe: '1d',
          pipelineKey: request.pipelineKey,
          triggerType: 'scheduled',
          dataThroughDate: request.dataThroughDate,
          sourceFingerprint: outputFingerprint,
          changedInstrumentIds,
          batchSize: normalizedBatchSize,
          schedulerRunStartedAt: request.schedulerRunStartedAt,
          upstreamStageRunId: completedStage.id,
        }).catch((error) => {
          console.error('[PipelineOrchestration] scheduled Market Context stage failed after Signal Calibration', {
            region: normalizedScope.region,
            assetType: normalizedScope.assetType,
            dataThroughDate: request.dataThroughDate,
            error: error instanceof Error ? error.message : 'unknown error',
          });
          return null;
        });
      }
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Scheduled Signal Calibration stage failed';
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime());
      const failedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status: 'FAILED',
        totalCount: changedInstrumentIds.length,
        processedCount: leasedStage.processedCount,
        succeededCount: leasedStage.succeededCount,
        partialCount: leasedStage.partialCount,
        failedCount: Math.max(1, leasedStage.failedCount),
        skippedCount: leasedStage.skippedCount,
        unchangedCount: leasedStage.unchangedCount,
        nextOffset: null,
        hasMore: false,
        outputFingerprint: null,
        warnings: leasedStage.warnings,
        errors: [...leasedStage.errors, errorMessage],
        completedAt,
        durationMs,
        metadata: {
          sourceStage: 'RAW_SIGNALS',
          upstreamStageRunId: request.upstreamStageRunId ?? null,
          dataThroughDate: request.dataThroughDate,
          sourceFingerprint: request.sourceFingerprint,
          changedInstrumentCount: changedInstrumentIds.length,
          changedInstrumentFingerprint,
          signalCalibrationStageVersion: SIGNAL_CALIBRATION_SCHEDULED_STAGE_VERSION,
          schedulerRunStartedAt: request.schedulerRunStartedAt,
          adapter: 'SignalCalibrationEngineService.run',
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
          sourceStage: 'RAW_SIGNALS',
          upstreamStageRunId: request.upstreamStageRunId ?? null,
          dataThroughDate: request.dataThroughDate,
          sourceFingerprint: request.sourceFingerprint,
          changedInstrumentCount: changedInstrumentIds.length,
          changedInstrumentFingerprint,
          signalCalibrationStageVersion: SIGNAL_CALIBRATION_SCHEDULED_STAGE_VERSION,
          schedulerRunStartedAt: request.schedulerRunStartedAt,
          adapter: 'SignalCalibrationEngineService.run',
          error: errorMessage,
        },
      });
      return this.scheduledSignalCalibrationResponseFromStage('FAILED', request, normalizedScope, failedStage, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
    }
  }

  async runScheduledMarketContextStage(request: ScheduledPipelineStageRequest, now = new Date()): Promise<ScheduledPipelineStageResponse> {
    const response = await this.runScheduledPipelineStage(request, {
      stageKey: 'MARKET_CONTEXT',
      stageOrder: 6,
      stageSlug: 'scheduled-market-context',
      stageVersion: MARKET_CONTEXT_SCHEDULED_STAGE_VERSION,
      sourceStage: 'SIGNAL_CALIBRATION',
      adapter: 'MarketContextIntelligenceService.run',
    }, async ({ normalizedScope }) => {
      const result = await this.marketContextService.run(normalizedScope.region);
      const succeeded = result?.status === 'success';
      return {
        totalCount: 1,
        processedCount: 1,
        succeededCount: succeeded ? 1 : 0,
        failedCount: succeeded ? 0 : 1,
        skippedCount: 0,
        unchangedCount: 0,
        errors: succeeded ? [] : ['Market Context refresh did not report success.'],
        metadata: { adapterStatus: result?.status ?? null },
      };
    }, now);

    if (response.status === 'COMPLETED') {
      response.downstream = await this.runScheduledSmartMoneyStage({
        ...request,
        sourceFingerprint: response.outputFingerprint || request.sourceFingerprint,
        upstreamStageRunId: response.stageRunId,
      }).catch((error) => this.logScheduledDownstreamFailure('Smart Money', response.stageKey, request, error));
    }
    return response;
  }

  async runScheduledSmartMoneyStage(request: ScheduledPipelineStageRequest, now = new Date()): Promise<ScheduledPipelineStageResponse> {
    const response = await this.runScheduledPipelineStage(request, {
      stageKey: 'SMART_MONEY',
      stageOrder: 8,
      stageSlug: 'scheduled-smart-money',
      stageVersion: SMART_MONEY_SCHEDULED_STAGE_VERSION,
      sourceStage: 'MARKET_CONTEXT',
      adapter: 'SmartMoneyIntelligenceService.run',
    }, async ({ normalizedScope, changedInstrumentIds, normalizedBatchSize }) => {
      const aggregate = {
        totalCount: changedInstrumentIds.length,
        processedCount: 0,
        generatedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        warnings: [] as string[],
        errors: [] as string[],
        byRange: {} as Record<string, { generated: number; skipped: number }>,
        pages: 0,
      };
      let offset = 0;
      while (offset < aggregate.totalCount) {
        const result = await this.smartMoneyService.run(normalizedBatchSize, {
          region: normalizedScope.region,
          assetType: normalizedScope.assetType,
          offset,
          instrumentIds: changedInstrumentIds,
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
        if (!result.hasMore || result.processedCount <= 0 || result.nextOffset === null || result.nextOffset === undefined) break;
        offset = result.nextOffset;
      }
      return {
        totalCount: aggregate.totalCount,
        processedCount: Math.min(aggregate.totalCount, aggregate.processedCount),
        succeededCount: Math.max(0, Math.min(aggregate.totalCount, aggregate.processedCount) - aggregate.failedCount),
        failedCount: aggregate.failedCount,
        skippedCount: 0,
        unchangedCount: 0,
        warnings: aggregate.warnings,
        errors: aggregate.errors,
        metadata: {
          adapterPages: aggregate.pages,
          byRange: aggregate.byRange,
          generatedRecordCount: aggregate.generatedCount,
          skippedRecordCount: aggregate.skippedCount,
        },
      };
    }, now);

    if (response.status === 'COMPLETED' || response.status === 'PARTIAL') {
      response.downstream = await this.runScheduledContextSnapshotsStage({
        ...request,
        sourceFingerprint: response.outputFingerprint || request.sourceFingerprint,
        upstreamStageRunId: response.stageRunId,
      }).catch((error) => this.logScheduledDownstreamFailure('Context Snapshots', response.stageKey, request, error));
    }
    return response;
  }

  async runScheduledContextSnapshotsStage(request: ScheduledPipelineStageRequest, now = new Date()): Promise<ScheduledPipelineStageResponse> {
    const response = await this.runScheduledPipelineStage(request, {
      stageKey: 'CONTEXT_SNAPSHOTS',
      stageOrder: 5,
      stageSlug: 'scheduled-context-snapshots',
      stageVersion: CONTEXT_SNAPSHOTS_SCHEDULED_STAGE_VERSION,
      sourceStage: 'SMART_MONEY',
      adapter: 'HistoricalContextSnapshotsService.generate',
    }, async ({ normalizedScope, changedInstrumentIds, normalizedBatchSize }) => {
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
      for (let offset = 0; offset < changedInstrumentIds.length; offset += normalizedBatchSize) {
        const chunkIds = changedInstrumentIds.slice(offset, offset + normalizedBatchSize);
        if (chunkIds.length === 0) break;
        const result = await this.historicalContextService.generate(
          new Date(`${request.dataThroughDate}T00:00:00.000Z`),
          chunkIds.length,
          {
            region: normalizedScope.region,
            assetType: normalizedScope.assetType,
            instrumentIds: chunkIds,
          }
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
      }
      const result = aggregate;
      const inserted = result.market.inserted + result.sectors.inserted + result.countries.inserted + result.smartMoney.inserted + result.dataQuality.inserted;
      const updated = result.market.updated + result.sectors.updated + result.countries.updated + result.smartMoney.updated + result.dataQuality.updated;
      const skipped = result.market.skipped + result.sectors.skipped + result.countries.skipped + result.smartMoney.skipped + result.dataQuality.skipped;
      return {
        totalCount: changedInstrumentIds.length,
        processedCount: Math.min(changedInstrumentIds.length, result.processedCount),
        succeededCount: Math.min(changedInstrumentIds.length, result.processedCount),
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: updated,
        warnings: result.warnings,
        errors: [],
        metadata: {
          adapterPages: result.pages,
          persistedRecordCount: inserted + updated,
          skippedRecordCount: skipped,
          snapshotDate: result.snapshotDate,
          market: result.market,
          sectors: result.sectors,
          countries: result.countries,
          smartMoney: result.smartMoney,
          dataQuality: result.dataQuality,
        },
      };
    }, now);

    if (response.status === 'COMPLETED' || response.status === 'PARTIAL') {
      response.downstream = await this.runScheduledSignalQualityStage({
        ...request,
        sourceFingerprint: response.outputFingerprint || request.sourceFingerprint,
        upstreamStageRunId: response.stageRunId,
      }).catch((error) => this.logScheduledDownstreamFailure('Signal Quality', response.stageKey, request, error));
    }
    return response;
  }

  async runScheduledSignalQualityStage(request: ScheduledPipelineStageRequest, now = new Date()): Promise<ScheduledPipelineStageResponse> {
    const response = await this.runScheduledPipelineStage(request, {
      stageKey: 'SIGNAL_QUALITY',
      stageOrder: 7,
      stageSlug: 'scheduled-signal-quality',
      stageVersion: SIGNAL_QUALITY_SCHEDULED_STAGE_VERSION,
      sourceStage: 'CONTEXT_SNAPSHOTS',
      adapter: 'SignalQualityLabService.recalculate',
    }, async ({ normalizedScope, changedInstrumentIds, normalizedBatchSize }) => {
      const aggregate = {
        totalCount: changedInstrumentIds.length,
        processedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        warnings: [] as string[],
        selectedHorizon: '20D',
        evidenceUsability: 'UNAVAILABLE' as string,
        matureSignalsInBatch: 0,
        notYetMatureInBatch: 0,
        evaluatedCount: 0,
        unevaluatedCount: 0,
        missingPriceHistoryCount: 0,
        outcomesPersisted: false,
        message: '',
        pages: 0,
      };
      let offset = 0;
      while (offset < aggregate.totalCount) {
        const result = await this.signalQualityService.recalculate({
          batchSize: normalizedBatchSize,
          offset,
          horizon: '20D',
          region: normalizedScope.region,
          assetType: normalizedScope.assetType,
          instrumentIds: changedInstrumentIds,
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
        if (!result.hasMore || result.processedCount <= 0 || result.nextOffset === null || result.nextOffset === undefined) break;
        offset = result.nextOffset;
      }
      return {
        totalCount: aggregate.totalCount,
        processedCount: Math.min(aggregate.totalCount, aggregate.processedCount),
        succeededCount: Math.max(0, Math.min(aggregate.totalCount, aggregate.processedCount) - aggregate.failedCount - aggregate.skippedCount),
        failedCount: aggregate.failedCount,
        skippedCount: aggregate.skippedCount,
        unchangedCount: 0,
        warnings: aggregate.warnings,
        errors: [],
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
    }, now);

    if (response.status === 'COMPLETED' || response.status === 'PARTIAL' || response.status === 'SKIPPED') {
      response.downstream = await this.runScheduledStrategyDecisionStage({
        ...request,
        sourceFingerprint: response.outputFingerprint || request.sourceFingerprint,
        upstreamStageRunId: response.stageRunId,
      }).catch((error) => this.logScheduledDownstreamFailure('Strategy Decision', response.stageKey, request, error));
    }
    return response;
  }

  async runScheduledStrategyDecisionStage(request: ScheduledPipelineStageRequest, now = new Date()): Promise<ScheduledPipelineStageResponse> {
    const response = await this.runScheduledPipelineStage(request, {
      stageKey: 'STRATEGY_DECISION',
      stageOrder: 9,
      stageSlug: 'scheduled-strategy-decision',
      stageVersion: STRATEGY_DECISION_SCHEDULED_STAGE_VERSION,
      sourceStage: 'SIGNAL_QUALITY',
      adapter: 'StrategyDecisionEngineService.evaluate',
    }, async ({ normalizedScope, changedInstrumentIds, normalizedBatchSize }) => {
      const aggregate = {
        totalCount: changedInstrumentIds.length,
        processedCount: 0,
        generatedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        warnings: [] as string[],
        resultsLength: 0,
        pages: 0,
      };
      let offset = 0;
      let hasMore = false;
      while (offset < aggregate.totalCount) {
        const result = await this.strategyDecisionService.evaluate({
          strategy: 'ALL',
          instrumentIds: changedInstrumentIds,
          region: normalizedScope.region,
          assetType: normalizedScope.assetType,
          batchSize: normalizedBatchSize,
          offset,
        });
        aggregate.totalCount = result.totalCount;
        aggregate.processedCount += result.processedCount;
        aggregate.generatedCount += result.generatedCount;
        aggregate.failedCount += result.failedCount;
        aggregate.skippedCount += result.skippedCount;
        aggregate.warnings.push(...(result.warnings || []));
        aggregate.resultsLength += result.results.length;
        aggregate.pages += 1;
        hasMore = result.hasMore;
        if (!result.hasMore || result.processedCount <= 0 || result.nextOffset === null || result.nextOffset === undefined) break;
        offset = result.nextOffset;
      }
      return {
        totalCount: aggregate.totalCount,
        processedCount: Math.min(aggregate.totalCount, aggregate.processedCount),
        succeededCount: Math.max(0, Math.min(aggregate.totalCount, aggregate.processedCount) - aggregate.failedCount - aggregate.skippedCount),
        failedCount: aggregate.failedCount,
        skippedCount: aggregate.skippedCount,
        unchangedCount: 0,
        warnings: aggregate.warnings,
        errors: [],
        metadata: {
          adapterPages: aggregate.pages,
          persistedDecisionCount: aggregate.generatedCount,
          resultCount: aggregate.resultsLength,
          hasMore,
        },
      };
    }, now);

    if (response.status === 'COMPLETED' || response.status === 'PARTIAL' || response.status === 'SKIPPED') {
      response.downstream = await this.runScheduledResearchProjectionStage({
        ...request,
        sourceFingerprint: response.outputFingerprint || request.sourceFingerprint,
        upstreamStageRunId: response.stageRunId,
      }).catch((error) => this.logScheduledDownstreamFailure('Research Projection', response.stageKey, request, error));
    }
    return response;
  }

  async runScheduledResearchProjectionStage(request: ScheduledPipelineStageRequest, now = new Date()): Promise<ScheduledPipelineStageResponse> {
    const response = await this.runScheduledPipelineStage(request, {
      stageKey: 'RESEARCH_PROJECTION',
      stageOrder: 11,
      stageSlug: 'scheduled-research-projection',
      stageVersion: RESEARCH_PROJECTION_SCHEDULED_STAGE_VERSION,
      sourceStage: 'STRATEGY_DECISION',
      adapter: 'ResearchHubService.overview',
    }, async ({ normalizedScope }) => {
      const result = await this.researchHubService.refreshOverview({
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
      });
      return {
        totalCount: 1,
        processedCount: 1,
        succeededCount: 1,
        failedCount: 0,
        skippedCount: result.dataGaps.length > 0 ? 1 : 0,
        unchangedCount: 0,
        warnings: result.dataGaps,
        errors: [],
        metadata: {
          generatedAt: result.generatedAt,
          marketGate: result.marketReadiness.marketGate,
          marketCondition: result.marketReadiness.marketCondition,
          reviewCandidates: result.researchPriorities.tradeCandidates.length,
          watchCandidates: result.researchPriorities.watchCandidates.length,
          avoidCandidates: result.researchPriorities.avoidCandidates.length,
        },
      };
    }, now);

    if (response.status === 'COMPLETED' || response.status === 'PARTIAL') {
      response.downstream = await this.runScheduledTodayReviewStage({
        ...request,
        sourceFingerprint: response.outputFingerprint || request.sourceFingerprint,
        upstreamStageRunId: response.stageRunId,
      }).catch((error) => this.logScheduledDownstreamFailure('Today Review', response.stageKey, request, error));
    }
    return response;
  }

  async runScheduledTodayReviewStage(request: ScheduledPipelineStageRequest, now = new Date()): Promise<ScheduledPipelineStageResponse> {
    const response = await this.runScheduledPipelineStage(request, {
      stageKey: 'TODAY_REVIEW',
      stageOrder: 12,
      stageSlug: 'scheduled-today-review',
      stageVersion: TODAY_REVIEW_SCHEDULED_STAGE_VERSION,
      sourceStage: 'RESEARCH_PROJECTION',
      adapter: 'TodayTradeReviewService.run',
    }, async ({ normalizedScope }) => {
      const result = await this.todayReviewService.run({
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        skipTradePlanGeneration: true,
      });
      const candidateCounts = result.run?.candidateCounts || {};
      const totalCandidates = Object.values(candidateCounts).reduce((sum, value) => sum + Number(value || 0), 0);
      return {
        totalCount: 1,
        processedCount: 1,
        succeededCount: result.run?.status === 'FAILED' ? 0 : 1,
        failedCount: result.run?.status === 'FAILED' ? 1 : 0,
        skippedCount: result.run?.status === 'PARTIAL' ? 1 : 0,
        unchangedCount: 0,
        warnings: result.run?.warnings || [],
        errors: result.run?.status === 'FAILED' ? result.run.warnings || ['Today Review publication failed.'] : [],
        metadata: {
          todayReviewRunId: result.run?.id || null,
          runStatus: result.run?.status || null,
          trustStatus: result.run?.trustStatus || null,
          dataThroughDate: result.run?.dataThroughDate || null,
          totalCandidates,
          candidateCounts,
        },
      };
    }, now);

    if (response.status === 'COMPLETED' || response.status === 'PARTIAL') {
      response.downstream = await this.runScheduledSignalPositionLedgerStage({
        ...request,
        sourceFingerprint: response.outputFingerprint || request.sourceFingerprint,
        upstreamStageRunId: response.stageRunId,
      }).catch((error) => this.logScheduledDownstreamFailure('Signal Position Ledger', response.stageKey, request, error));
    }
    return response;
  }

  async runScheduledSignalPositionLedgerStage(request: ScheduledPipelineStageRequest, now = new Date()): Promise<ScheduledPipelineStageResponse> {
    return this.runScheduledPipelineStage(request, {
      stageKey: 'SIGNAL_POSITION_LEDGER',
      stageOrder: 13,
      stageSlug: 'scheduled-signal-position-ledger',
      stageVersion: SIGNAL_POSITION_LEDGER_SCHEDULED_STAGE_VERSION,
      sourceStage: 'TODAY_REVIEW',
      adapter: 'SignalPositionLedgerService.refreshActiveRows',
    }, async ({ normalizedScope }) => {
      const progress = await this.signalPositionLedgerService.refreshActiveRows({
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        limit: 25,
        offset: 0,
      }, { force: true, wait: true });
      return {
        totalCount: progress.totalCount,
        processedCount: progress.processedCount,
        succeededCount: progress.succeededCount,
        failedCount: progress.failedCount,
        skippedCount: progress.skippedCount,
        unchangedCount: 0,
        warnings: progress.warnings,
        errors: progress.errors,
        metadata: {
          runId: progress.runId,
          materializedRowCount: progress.materializedRowCount,
          status: progress.status,
          updatedAt: progress.updatedAt,
        },
      };
    }, now);
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
    await this.completeRun({
      idempotencyKey: runIdempotencyKey,
      status,
      totalCount: request.totalCount,
      processedCount: request.processedCount,
      succeededCount,
      partialCount: completedStage.partialCount,
      failedCount: request.failedCount,
      skippedCount: request.skippedCount,
      unchangedCount,
      completedAt: completedAt ?? undefined,
      durationMs,
      warnings,
      errors,
      metadata,
    });
    await this.runDownstreamDataQualityForMarketDataSnapshot({
      request,
      normalizedScope,
      completedStage,
      outputFingerprint,
      changedInstrumentIds: downstreamInstrumentIds,
      normalizedBatchSize: this.normalizeScheduledBatchSize(request.batchSize ?? 25, downstreamInstrumentIds.length),
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
    }>();
    for (const stage of stages) {
      const current = groups.get(stage.stageKey) || {
        stageKey: stage.stageKey,
        stageOrder: stage.stageOrder,
        activeStage: null,
        lastStage: null,
      };
      current.stageOrder = Math.min(current.stageOrder, stage.stageOrder);
      if (!current.activeStage && ACTIVE_STATUSES.has(stage.status) && !this.isStaleActiveStage(stage, now)) current.activeStage = this.toStageStatus(stage);
      if (!current.lastStage && TERMINAL_STATUSES.has(stage.status)) current.lastStage = this.toStageStatus(stage);
      groups.set(stage.stageKey, current);
    }
    return [...groups.values()].sort((a, b) => a.stageOrder - b.stageOrder || a.stageKey.localeCompare(b.stageKey));
  }

  private isStaleActiveRun(run: PipelineRunRecord, now: Date): boolean {
    if (!ACTIVE_STATUSES.has(run.status)) return false;
    const updatedAt = Date.parse(run.updatedAt || run.startedAt);
    if (!Number.isFinite(updatedAt)) return true;
    return now.getTime() - updatedAt > this.activeStaleMs();
  }

  private isStaleActiveStage(stage: PipelineStageRunRecord, now: Date): boolean {
    if (!ACTIVE_STATUSES.has(stage.status)) return false;
    const leaseExpiresAt = stage.leaseExpiresAt ? Date.parse(stage.leaseExpiresAt) : NaN;
    if (Number.isFinite(leaseExpiresAt)) return leaseExpiresAt < now.getTime();
    const updatedAt = Date.parse(stage.updatedAt || stage.startedAt || stage.createdAt);
    if (!Number.isFinite(updatedAt)) return true;
    return now.getTime() - updatedAt > this.activeStaleMs();
  }

  private activeStaleMs(): number {
    const configured = Number(process.env.PIPELINE_ACTIVE_STALE_MS);
    if (Number.isFinite(configured) && configured >= 60_000) return Math.floor(configured);
    return DEFAULT_ACTIVE_STALE_MS;
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

  private async runDownstreamDataQualityForMarketDataSnapshot(input: {
    request: MarketDataStageSnapshotRequest;
    normalizedScope: { region: string; assetType: string; timeframe: string; dataThroughDate?: Date | null };
    completedStage: PipelineStageRunRecord;
    outputFingerprint: string;
    changedInstrumentIds: string[];
    normalizedBatchSize: number;
  }): Promise<void> {
    const { request, normalizedScope, completedStage, outputFingerprint, changedInstrumentIds, normalizedBatchSize } = input;
    if (!this.shouldRunDownstreamDataQualityForMarketDataSnapshot(request, changedInstrumentIds)) return;

    const dataThroughDate = this.snapshotDataThroughDateKey(request.dataThroughDate, normalizedScope.dataThroughDate);
    if (!dataThroughDate) {
      console.warn('[PipelineOrchestration] Market Data snapshot skipped downstream Data Quality: missing dataThroughDate', {
        operation: request.operation,
        runId: request.runId,
        stageRunId: completedStage.id,
      });
      return;
    }

    await this.runScheduledDataQualityStage({
      region: normalizedScope.region,
      assetType: normalizedScope.assetType,
      timeframe: '1d',
      pipelineKey: request.pipelineKey,
      triggerType: 'scheduled',
      dataThroughDate,
      sourceFingerprint: outputFingerprint || completedStage.outputFingerprint || `market-data:${request.operation}:${request.runId}`,
      changedInstrumentIds,
      batchSize: normalizedBatchSize,
      schedulerRunStartedAt: (this.parseOptionalDate(request.startedAt) || new Date()).toISOString(),
    }).catch((error) => {
      console.error('[PipelineOrchestration] downstream Data Quality stage failed after Market Data snapshot', {
        operation: request.operation,
        runId: request.runId,
        stageRunId: completedStage.id,
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        error: error instanceof Error ? error.message : 'unknown error',
      });
    });
  }

  private shouldRunDownstreamDataQualityForMarketDataSnapshot(
    request: MarketDataStageSnapshotRequest,
    changedInstrumentIds: string[]
  ): boolean {
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

  private async runScheduledPipelineStage(
    request: ScheduledPipelineStageRequest,
    definition: ScheduledStageDefinition,
    adapter: (context: {
      normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>;
      changedInstrumentIds: string[];
      normalizedBatchSize: number;
    }) => Promise<ScheduledAdapterResult>,
    now: Date
  ): Promise<ScheduledPipelineStageResponse> {
    const normalizedScope = this.normalizeScope({
      region: request.region,
      assetType: request.assetType,
      timeframe: request.timeframe,
    });
    const changedInstrumentIds = [...new Set(request.changedInstrumentIds.map((id) => String(id || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    const normalizedBatchSize = this.normalizeScheduledBatchSize(request.batchSize, changedInstrumentIds.length);
    if (changedInstrumentIds.length === 0) {
      return this.scheduledPipelineSkippedResponse(definition, request, normalizedScope, normalizedBatchSize);
    }

    const changedInstrumentFingerprint = this.hashValues(changedInstrumentIds);
    const stageIdempotencyKey = this.scheduledPipelineStageIdempotencyKey(definition, {
      region: normalizedScope.region,
      assetType: normalizedScope.assetType,
      timeframe: normalizedScope.timeframe,
      dataThroughDate: request.dataThroughDate,
      sourceFingerprint: request.sourceFingerprint,
      changedInstrumentFingerprint,
    });
    const runIdempotencyKey = `${stageIdempotencyKey}:run`;
    const inputFingerprint = [
      definition.stageSlug,
      request.dataThroughDate,
      request.sourceFingerprint,
      changedInstrumentFingerprint,
      definition.stageVersion,
    ].join(':');
    const leaseOwner = `${definition.stageSlug}:${PROCESS_LOCAL_ID}`;

    let stageLease = await this.leaseStage({
      idempotencyKey: stageIdempotencyKey,
      leaseOwner,
      leaseMs: DEFAULT_LEASE_MS,
      now,
      allowTerminalRetry: false,
    });

    if (stageLease.reason === 'STAGE_TERMINAL') {
      return this.scheduledPipelineResponseFromLease('DUPLICATE_TERMINAL', definition, request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
    }
    if (stageLease.reason === 'LEASE_HELD') {
      return this.scheduledPipelineResponseFromLease('LEASE_HELD', definition, request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
    }

    if (stageLease.reason === 'STAGE_NOT_FOUND') {
      const baseMetadata = this.scheduledPipelineMetadata(definition, request, changedInstrumentIds, changedInstrumentFingerprint);
      const run = await this.createRun({
        pipelineKey: request.pipelineKey,
        triggerType: request.triggerType,
        status: 'RUNNING',
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        dataThroughDate: new Date(`${request.dataThroughDate}T00:00:00.000Z`),
        sourceFingerprint: request.sourceFingerprint,
        changedInstrumentCount: changedInstrumentIds.length,
        totalCount: changedInstrumentIds.length,
        processedCount: 0,
        succeededCount: 0,
        partialCount: 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        idempotencyKey: runIdempotencyKey,
        startedAt: now,
        metadata: baseMetadata,
      });

      await this.createStage({
        pipelineRunId: run.id,
        stageKey: definition.stageKey,
        stageOrder: definition.stageOrder,
        status: 'PENDING',
        idempotencyKey: stageIdempotencyKey,
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        dataThroughDate: new Date(`${request.dataThroughDate}T00:00:00.000Z`),
        inputFingerprint,
        changedInstrumentCount: changedInstrumentIds.length,
        batchSize: normalizedBatchSize,
        offset: 0,
        nextOffset: 0,
        hasMore: false,
        totalCount: changedInstrumentIds.length,
        processedCount: 0,
        succeededCount: 0,
        partialCount: 0,
        failedCount: 0,
        skippedCount: 0,
        unchangedCount: 0,
        metadata: baseMetadata,
      });

      stageLease = await this.leaseStage({
        idempotencyKey: stageIdempotencyKey,
        leaseOwner,
        leaseMs: DEFAULT_LEASE_MS,
        now,
        allowTerminalRetry: false,
      });
      if (stageLease.reason === 'STAGE_TERMINAL') {
        return this.scheduledPipelineResponseFromLease('DUPLICATE_TERMINAL', definition, request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
      }
      if (stageLease.reason === 'LEASE_HELD') {
        return this.scheduledPipelineResponseFromLease('LEASE_HELD', definition, request, normalizedScope, stageLease, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
      }
    }

    if (!stageLease.acquired || !stageLease.stage) {
      return this.scheduledPipelineFailureResponse(definition, request, normalizedScope, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length, `Unable to acquire scheduled ${definition.stageKey} stage lease: ${stageLease.reason}`);
    }

    const leasedStage = stageLease.stage;
    const startedAt = now;
    const baseMetadata = {
      ...this.scheduledPipelineMetadata(definition, request, changedInstrumentIds, changedInstrumentFingerprint),
      adapter: definition.adapter,
    };
    await this.recordStageProgress({
      idempotencyKey: stageIdempotencyKey,
      status: 'RUNNING',
      totalCount: changedInstrumentIds.length,
      processedCount: 0,
      succeededCount: 0,
      partialCount: 0,
      failedCount: 0,
      skippedCount: 0,
      unchangedCount: 0,
      nextOffset: 0,
      hasMore: false,
      metadata: baseMetadata,
      now: startedAt,
    });

    try {
      const adapterResult = await adapter({ normalizedScope, changedInstrumentIds, normalizedBatchSize });
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime());
      const totalCount = adapterResult.totalCount;
      const adapterProcessedCount = adapterResult.processedCount;
      const succeededCount = adapterResult.succeededCount;
      const failedCount = adapterResult.failedCount;
      const skippedCount = adapterResult.skippedCount;
      const unchangedCount = adapterResult.unchangedCount ?? 0;
      const completedCount = Math.min(totalCount, Math.max(0, adapterProcessedCount));
      const hasMore = adapterResult.hasMore ?? completedCount < totalCount;
      const nextOffset = hasMore ? adapterResult.nextOffset ?? completedCount : null;
      const status = this.mapScheduledPipelineStatus({
        totalCount,
        processedCount: completedCount,
        succeededCount,
        failedCount,
        skippedCount,
      });
      const outputFingerprint = this.hashValues([
        stageIdempotencyKey,
        status,
        String(totalCount),
        String(completedCount),
        String(succeededCount),
        String(failedCount),
        String(skippedCount),
        String(unchangedCount),
      ]);
      const metadata = {
        ...baseMetadata,
        ...(adapterResult.metadata || {}),
        adapterProcessedCount,
        completedCount,
        hasMore,
        nextOffset,
      };
      const completedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status,
        totalCount,
        processedCount: completedCount,
        succeededCount,
        partialCount: status === 'PARTIAL' ? Math.max(1, failedCount + skippedCount) : 0,
        failedCount,
        skippedCount,
        unchangedCount,
        nextOffset,
        hasMore,
        outputFingerprint,
        warnings: adapterResult.warnings || [],
        errors: adapterResult.errors || [],
        completedAt,
        durationMs,
        metadata,
      });
      await this.completeRun({
        idempotencyKey: runIdempotencyKey,
        status,
        totalCount,
        processedCount: completedCount,
        succeededCount,
        partialCount: completedStage.partialCount,
        failedCount,
        skippedCount,
        unchangedCount,
        warnings: adapterResult.warnings || [],
        errors: adapterResult.errors || [],
        completedAt,
        durationMs,
        metadata,
      });
      return this.scheduledPipelineResponseFromStage(status, definition, request, normalizedScope, completedStage, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Scheduled ${definition.stageKey} stage failed`;
      const completedAt = new Date();
      const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime());
      const failedStage = await this.completeStage({
        idempotencyKey: stageIdempotencyKey,
        status: 'FAILED',
        totalCount: changedInstrumentIds.length,
        processedCount: leasedStage.processedCount,
        succeededCount: leasedStage.succeededCount,
        partialCount: leasedStage.partialCount,
        failedCount: Math.max(1, leasedStage.failedCount),
        skippedCount: leasedStage.skippedCount,
        unchangedCount: leasedStage.unchangedCount,
        nextOffset: null,
        hasMore: false,
        outputFingerprint: null,
        warnings: leasedStage.warnings,
        errors: [...leasedStage.errors, errorMessage],
        completedAt,
        durationMs,
        metadata: { ...baseMetadata, error: errorMessage },
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
        metadata: { ...baseMetadata, error: errorMessage },
      });
      return this.scheduledPipelineResponseFromStage('FAILED', definition, request, normalizedScope, failedStage, inputFingerprint, normalizedBatchSize, changedInstrumentIds.length);
    }
  }

  private scheduledPipelineMetadata(
    definition: ScheduledStageDefinition,
    request: ScheduledPipelineStageRequest,
    changedInstrumentIds: string[],
    changedInstrumentFingerprint: string
  ) {
    return {
      sourceStage: definition.sourceStage,
      upstreamStageRunId: request.upstreamStageRunId ?? null,
      dataThroughDate: request.dataThroughDate,
      sourceFingerprint: request.sourceFingerprint,
      changedInstrumentCount: changedInstrumentIds.length,
      changedInstrumentIdsSample: changedInstrumentIds.slice(0, 25),
      changedInstrumentFingerprint,
      stageVersion: definition.stageVersion,
      schedulerRunStartedAt: request.schedulerRunStartedAt,
    };
  }

  private logScheduledDownstreamFailure(stageName: string, sourceStage: string, request: ScheduledPipelineStageRequest, error: unknown): null {
    console.error(`[PipelineOrchestration] scheduled ${stageName} stage failed after ${sourceStage}`, {
      region: request.region,
      assetType: request.assetType,
      dataThroughDate: request.dataThroughDate,
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return null;
  }

  private scheduledDataQualityStageIdempotencyKey(input: {
    region: string;
    assetType: string;
    timeframe: string;
    dataThroughDate: string;
    sourceFingerprint: string;
    changedInstrumentFingerprint: string;
  }): string {
    return [
      LEDGER_VERSION,
      'scheduled-dq',
      this.keyPart(input.region),
      this.keyPart(input.assetType),
      this.keyPart(input.timeframe),
      this.keyPart(input.dataThroughDate),
      this.keyPart(input.sourceFingerprint),
      this.keyPart(input.changedInstrumentFingerprint),
      this.keyPart(DQ_SCHEDULED_STAGE_VERSION),
    ].join(':');
  }

  private scheduledRawSignalsStageIdempotencyKey(input: {
    region: string;
    assetType: string;
    timeframe: string;
    dataThroughDate: string;
    sourceFingerprint: string;
    changedInstrumentFingerprint: string;
  }): string {
    return [
      LEDGER_VERSION,
      'scheduled-raw-signals',
      this.keyPart(input.region),
      this.keyPart(input.assetType),
      this.keyPart(input.timeframe),
      this.keyPart(input.dataThroughDate),
      this.keyPart(input.sourceFingerprint),
      this.keyPart(input.changedInstrumentFingerprint),
      this.keyPart(RAW_SIGNALS_SCHEDULED_STAGE_VERSION),
    ].join(':');
  }

  private scheduledSignalCalibrationStageIdempotencyKey(input: {
    region: string;
    assetType: string;
    timeframe: string;
    dataThroughDate: string;
    sourceFingerprint: string;
    changedInstrumentFingerprint: string;
  }): string {
    return [
      LEDGER_VERSION,
      'scheduled-signal-calibration',
      this.keyPart(input.region),
      this.keyPart(input.assetType),
      this.keyPart(input.timeframe),
      this.keyPart(input.dataThroughDate),
      this.keyPart(input.sourceFingerprint),
      this.keyPart(input.changedInstrumentFingerprint),
      this.keyPart(SIGNAL_CALIBRATION_SCHEDULED_STAGE_VERSION),
    ].join(':');
  }

  private scheduledPipelineStageIdempotencyKey(
    definition: ScheduledStageDefinition,
    input: {
      region: string;
      assetType: string;
      timeframe: string;
      dataThroughDate: string;
      sourceFingerprint: string;
      changedInstrumentFingerprint: string;
    }
  ): string {
    return [
      LEDGER_VERSION,
      definition.stageSlug,
      this.keyPart(input.region),
      this.keyPart(input.assetType),
      this.keyPart(input.timeframe),
      this.keyPart(input.dataThroughDate),
      this.keyPart(input.sourceFingerprint),
      this.keyPart(input.changedInstrumentFingerprint),
      this.keyPart(definition.stageVersion),
    ].join(':');
  }

  private hashValues(values: string[]): string {
    const payload = values.join('|');
    return createHash('sha256').update(payload).digest('hex').slice(0, 16);
  }

  private normalizeScheduledBatchSize(batchSize: number, changedInstrumentCount: number): number {
    const normalized = Math.max(1, Math.min(Math.floor(Number(batchSize) || 25), 100));
    return Math.max(1, Math.min(normalized, changedInstrumentCount));
  }

  private mapScheduledDataQualityStatus(input: {
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

  private mapScheduledRawSignalsStatus(input: {
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

  private mapScheduledSignalCalibrationStatus(input: {
    totalCount: number;
    processedCount: number;
    succeededCount: number;
    failedCount: number;
    skippedCount: number;
  }): 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'SKIPPED' {
    if (input.totalCount === 0) return 'SKIPPED';
    if (input.failedCount > 0 && input.succeededCount === 0) return 'FAILED';
    if (input.processedCount < input.totalCount) return 'PARTIAL';
    if (input.succeededCount === 0 && (input.skippedCount > 0 || input.processedCount === 0)) return 'SKIPPED';
    if (input.failedCount > 0 || input.skippedCount > 0 || input.processedCount < input.totalCount) return 'PARTIAL';
    return 'COMPLETED';
  }

  private mapScheduledPipelineStatus(input: {
    totalCount: number;
    processedCount: number;
    succeededCount: number;
    failedCount: number;
    skippedCount: number;
  }): 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'SKIPPED' {
    if (input.totalCount === 0) return 'SKIPPED';
    if (input.failedCount > 0 && input.succeededCount === 0) return 'FAILED';
    if (input.succeededCount === 0 && (input.skippedCount > 0 || input.processedCount === 0)) return 'SKIPPED';
    if (input.failedCount > 0 || input.skippedCount > 0 || input.processedCount < input.totalCount) return 'PARTIAL';
    return 'COMPLETED';
  }

  private scheduledSkippedResponse(
    request: ScheduledDataQualityStageRequest,
    normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>,
    batchSize: number
  ): ScheduledDataQualityStageResponse {
    return {
      status: 'SKIPPED',
      pipelineRunId: null,
      stageRunId: null,
      stageKey: 'DATA_QUALITY',
      scope: {
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        pipelineKey: request.pipelineKey,
      },
      triggerType: 'scheduled',
      dataThroughDate: request.dataThroughDate,
      inputFingerprint: 'scheduled-dq:empty-changed-set',
      outputFingerprint: null,
      batch: {
        totalInstrumentCount: 0,
        processedCount: 0,
        batchSize,
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
      warnings: ['No changed instruments supplied for scheduled Data Quality stage.'],
      errors: [],
      startedAt: null,
      completedAt: null,
    };
  }

  private scheduledResponseFromLease(
    status: 'DUPLICATE_TERMINAL' | 'LEASE_HELD',
    request: ScheduledDataQualityStageRequest,
    normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>,
    leaseResult: PipelineStageLeaseResult,
    inputFingerprint: string,
    batchSize: number,
    changedInstrumentCount: number
  ): ScheduledDataQualityStageResponse {
    const stage = leaseResult.stage;
    return {
      status,
      pipelineRunId: stage?.pipelineRunId || null,
      stageRunId: stage?.id || null,
      stageKey: 'DATA_QUALITY',
      scope: {
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        pipelineKey: request.pipelineKey,
      },
      triggerType: 'scheduled',
      dataThroughDate: request.dataThroughDate,
      inputFingerprint: stage?.inputFingerprint || inputFingerprint,
      outputFingerprint: stage?.outputFingerprint || null,
      batch: {
        totalInstrumentCount: changedInstrumentCount,
        processedCount: stage?.processedCount || 0,
        batchSize: stage?.batchSize ?? batchSize,
        nextOffset: stage?.nextOffset ?? null,
        hasMore: stage?.hasMore ?? false,
      },
      counts: {
        totalCount: stage?.totalCount ?? changedInstrumentCount,
        processedCount: stage?.processedCount ?? 0,
        succeededCount: stage?.succeededCount ?? 0,
        partialCount: stage?.partialCount ?? 0,
        failedCount: stage?.failedCount ?? 0,
        skippedCount: stage?.skippedCount ?? 0,
        unchangedCount: stage?.unchangedCount ?? 0,
      },
      warnings: stage?.warnings ?? [],
      errors: stage?.errors ?? [],
      startedAt: stage?.startedAt ?? null,
      completedAt: stage?.completedAt ?? null,
    };
  }

  private scheduledResponseFromStage(
    status: ScheduledDataQualityStageResponse['status'],
    request: ScheduledDataQualityStageRequest,
    normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>,
    stage: PipelineStageRunRecord,
    inputFingerprint: string,
    batchSize: number,
    changedInstrumentCount: number
  ): ScheduledDataQualityStageResponse {
    return {
      status,
      pipelineRunId: stage.pipelineRunId,
      stageRunId: stage.id,
      stageKey: 'DATA_QUALITY',
      scope: {
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        pipelineKey: request.pipelineKey,
      },
      triggerType: 'scheduled',
      dataThroughDate: request.dataThroughDate,
      inputFingerprint: stage.inputFingerprint || inputFingerprint,
      outputFingerprint: stage.outputFingerprint || null,
      batch: {
        totalInstrumentCount: changedInstrumentCount,
        processedCount: stage.processedCount,
        batchSize: stage.batchSize ?? batchSize,
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
      startedAt: stage.startedAt,
      completedAt: stage.completedAt,
    };
  }

  private scheduledRawSignalsSkippedResponse(
    request: ScheduledRawSignalsStageRequest,
    normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>,
    batchSize: number
  ): ScheduledRawSignalsStageResponse {
    return {
      status: 'SKIPPED',
      pipelineRunId: null,
      stageRunId: null,
      stageKey: 'RAW_SIGNALS',
      scope: {
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        pipelineKey: request.pipelineKey,
      },
      triggerType: 'scheduled',
      dataThroughDate: request.dataThroughDate,
      inputFingerprint: 'scheduled-raw-signals:empty-changed-set',
      outputFingerprint: null,
      batch: {
        totalInstrumentCount: 0,
        processedCount: 0,
        batchSize,
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
      warnings: ['No changed instruments supplied for scheduled Raw Signals stage.'],
      errors: [],
      startedAt: null,
      completedAt: null,
    };
  }

  private scheduledRawSignalsFailureResponse(
    request: ScheduledRawSignalsStageRequest,
    normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>,
    inputFingerprint: string,
    batchSize: number,
    changedInstrumentCount: number,
    error: string
  ): ScheduledRawSignalsStageResponse {
    return {
      status: 'FAILED',
      pipelineRunId: null,
      stageRunId: null,
      stageKey: 'RAW_SIGNALS',
      scope: {
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        pipelineKey: request.pipelineKey,
      },
      triggerType: 'scheduled',
      dataThroughDate: request.dataThroughDate,
      inputFingerprint,
      outputFingerprint: null,
      batch: {
        totalInstrumentCount: changedInstrumentCount,
        processedCount: 0,
        batchSize,
        nextOffset: null,
        hasMore: false,
      },
      counts: {
        totalCount: changedInstrumentCount,
        processedCount: 0,
        succeededCount: 0,
        partialCount: 0,
        failedCount: 1,
        skippedCount: 0,
        unchangedCount: 0,
      },
      warnings: [],
      errors: [error],
      startedAt: null,
      completedAt: null,
    };
  }

  private scheduledRawSignalsResponseFromLease(
    status: 'DUPLICATE_TERMINAL' | 'LEASE_HELD',
    request: ScheduledRawSignalsStageRequest,
    normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>,
    leaseResult: PipelineStageLeaseResult,
    inputFingerprint: string,
    batchSize: number,
    changedInstrumentCount: number
  ): ScheduledRawSignalsStageResponse {
    const stage = leaseResult.stage;
    return {
      status,
      pipelineRunId: stage?.pipelineRunId || null,
      stageRunId: stage?.id || null,
      stageKey: 'RAW_SIGNALS',
      scope: {
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        pipelineKey: request.pipelineKey,
      },
      triggerType: 'scheduled',
      dataThroughDate: request.dataThroughDate,
      inputFingerprint: stage?.inputFingerprint || inputFingerprint,
      outputFingerprint: stage?.outputFingerprint || null,
      batch: {
        totalInstrumentCount: changedInstrumentCount,
        processedCount: stage?.processedCount || 0,
        batchSize: stage?.batchSize ?? batchSize,
        nextOffset: stage?.nextOffset ?? null,
        hasMore: stage?.hasMore ?? false,
      },
      counts: {
        totalCount: stage?.totalCount ?? changedInstrumentCount,
        processedCount: stage?.processedCount ?? 0,
        succeededCount: stage?.succeededCount ?? 0,
        partialCount: stage?.partialCount ?? 0,
        failedCount: stage?.failedCount ?? 0,
        skippedCount: stage?.skippedCount ?? 0,
        unchangedCount: stage?.unchangedCount ?? 0,
      },
      warnings: stage?.warnings ?? [],
      errors: stage?.errors ?? [],
      startedAt: stage?.startedAt ?? null,
      completedAt: stage?.completedAt ?? null,
    };
  }

  private scheduledRawSignalsResponseFromStage(
    status: ScheduledRawSignalsStageResponse['status'],
    request: ScheduledRawSignalsStageRequest,
    normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>,
    stage: PipelineStageRunRecord,
    inputFingerprint: string,
    batchSize: number,
    changedInstrumentCount: number
  ): ScheduledRawSignalsStageResponse {
    return {
      status,
      pipelineRunId: stage.pipelineRunId,
      stageRunId: stage.id,
      stageKey: 'RAW_SIGNALS',
      scope: {
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        pipelineKey: request.pipelineKey,
      },
      triggerType: 'scheduled',
      dataThroughDate: request.dataThroughDate,
      inputFingerprint: stage.inputFingerprint || inputFingerprint,
      outputFingerprint: stage.outputFingerprint || null,
      batch: {
        totalInstrumentCount: changedInstrumentCount,
        processedCount: stage.processedCount,
        batchSize: stage.batchSize ?? batchSize,
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
      startedAt: stage.startedAt,
      completedAt: stage.completedAt,
    };
  }

  private scheduledPipelineSkippedResponse(
    definition: ScheduledStageDefinition,
    request: ScheduledPipelineStageRequest,
    normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>,
    batchSize: number
  ): ScheduledPipelineStageResponse {
    return {
      status: 'SKIPPED',
      pipelineRunId: null,
      stageRunId: null,
      stageKey: definition.stageKey,
      scope: {
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        pipelineKey: request.pipelineKey,
      },
      triggerType: 'scheduled',
      dataThroughDate: request.dataThroughDate,
      inputFingerprint: `${definition.stageSlug}:empty-changed-set`,
      outputFingerprint: null,
      batch: {
        totalInstrumentCount: 0,
        processedCount: 0,
        batchSize,
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
      warnings: [`No changed instruments supplied for scheduled ${definition.stageKey} stage.`],
      errors: [],
      startedAt: null,
      completedAt: null,
    };
  }

  private scheduledPipelineFailureResponse(
    definition: ScheduledStageDefinition,
    request: ScheduledPipelineStageRequest,
    normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>,
    inputFingerprint: string,
    batchSize: number,
    changedInstrumentCount: number,
    error: string
  ): ScheduledPipelineStageResponse {
    return {
      status: 'FAILED',
      pipelineRunId: null,
      stageRunId: null,
      stageKey: definition.stageKey,
      scope: {
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        pipelineKey: request.pipelineKey,
      },
      triggerType: 'scheduled',
      dataThroughDate: request.dataThroughDate,
      inputFingerprint,
      outputFingerprint: null,
      batch: {
        totalInstrumentCount: changedInstrumentCount,
        processedCount: 0,
        batchSize,
        nextOffset: null,
        hasMore: false,
      },
      counts: {
        totalCount: changedInstrumentCount,
        processedCount: 0,
        succeededCount: 0,
        partialCount: 0,
        failedCount: 1,
        skippedCount: 0,
        unchangedCount: 0,
      },
      warnings: [],
      errors: [error],
      startedAt: null,
      completedAt: null,
    };
  }

  private scheduledPipelineResponseFromLease(
    status: 'DUPLICATE_TERMINAL' | 'LEASE_HELD',
    definition: ScheduledStageDefinition,
    request: ScheduledPipelineStageRequest,
    normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>,
    leaseResult: PipelineStageLeaseResult,
    inputFingerprint: string,
    batchSize: number,
    changedInstrumentCount: number
  ): ScheduledPipelineStageResponse {
    const stage = leaseResult.stage;
    return {
      status,
      pipelineRunId: stage?.pipelineRunId || null,
      stageRunId: stage?.id || null,
      stageKey: definition.stageKey,
      scope: {
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        pipelineKey: request.pipelineKey,
      },
      triggerType: 'scheduled',
      dataThroughDate: request.dataThroughDate,
      inputFingerprint: stage?.inputFingerprint || inputFingerprint,
      outputFingerprint: stage?.outputFingerprint || null,
      batch: {
        totalInstrumentCount: changedInstrumentCount,
        processedCount: stage?.processedCount || 0,
        batchSize: stage?.batchSize ?? batchSize,
        nextOffset: stage?.nextOffset ?? null,
        hasMore: stage?.hasMore ?? false,
      },
      counts: {
        totalCount: stage?.totalCount ?? changedInstrumentCount,
        processedCount: stage?.processedCount ?? 0,
        succeededCount: stage?.succeededCount ?? 0,
        partialCount: stage?.partialCount ?? 0,
        failedCount: stage?.failedCount ?? 0,
        skippedCount: stage?.skippedCount ?? 0,
        unchangedCount: stage?.unchangedCount ?? 0,
      },
      warnings: stage?.warnings ?? [],
      errors: stage?.errors ?? [],
      startedAt: stage?.startedAt ?? null,
      completedAt: stage?.completedAt ?? null,
    };
  }

  private scheduledPipelineResponseFromStage(
    status: ScheduledPipelineStageResponse['status'],
    definition: ScheduledStageDefinition,
    request: ScheduledPipelineStageRequest,
    normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>,
    stage: PipelineStageRunRecord,
    inputFingerprint: string,
    batchSize: number,
    changedInstrumentCount: number
  ): ScheduledPipelineStageResponse {
    return {
      status,
      pipelineRunId: stage.pipelineRunId,
      stageRunId: stage.id,
      stageKey: definition.stageKey,
      scope: {
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        pipelineKey: request.pipelineKey,
      },
      triggerType: 'scheduled',
      dataThroughDate: request.dataThroughDate,
      inputFingerprint: stage.inputFingerprint || inputFingerprint,
      outputFingerprint: stage.outputFingerprint || null,
      batch: {
        totalInstrumentCount: changedInstrumentCount,
        processedCount: stage.processedCount,
        batchSize: stage.batchSize ?? batchSize,
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
      startedAt: stage.startedAt,
      completedAt: stage.completedAt,
    };
  }

  private scheduledSignalCalibrationSkippedResponse(
    request: ScheduledSignalCalibrationStageRequest,
    normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>,
    batchSize: number
  ): ScheduledSignalCalibrationStageResponse {
    return {
      status: 'SKIPPED',
      pipelineRunId: null,
      stageRunId: null,
      stageKey: 'SIGNAL_CALIBRATION',
      scope: {
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        pipelineKey: request.pipelineKey,
      },
      triggerType: 'scheduled',
      dataThroughDate: request.dataThroughDate,
      inputFingerprint: 'scheduled-signal-calibration:empty-changed-set',
      outputFingerprint: null,
      batch: {
        totalInstrumentCount: 0,
        processedCount: 0,
        batchSize,
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
      warnings: ['No changed instruments supplied for scheduled Signal Calibration stage.'],
      errors: [],
      startedAt: null,
      completedAt: null,
    };
  }

  private scheduledSignalCalibrationFailureResponse(
    request: ScheduledSignalCalibrationStageRequest,
    normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>,
    inputFingerprint: string,
    batchSize: number,
    changedInstrumentCount: number,
    error: string
  ): ScheduledSignalCalibrationStageResponse {
    return {
      status: 'FAILED',
      pipelineRunId: null,
      stageRunId: null,
      stageKey: 'SIGNAL_CALIBRATION',
      scope: {
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        pipelineKey: request.pipelineKey,
      },
      triggerType: 'scheduled',
      dataThroughDate: request.dataThroughDate,
      inputFingerprint,
      outputFingerprint: null,
      batch: {
        totalInstrumentCount: changedInstrumentCount,
        processedCount: 0,
        batchSize,
        nextOffset: null,
        hasMore: false,
      },
      counts: {
        totalCount: changedInstrumentCount,
        processedCount: 0,
        succeededCount: 0,
        partialCount: 0,
        failedCount: 1,
        skippedCount: 0,
        unchangedCount: 0,
      },
      warnings: [],
      errors: [error],
      startedAt: null,
      completedAt: null,
    };
  }

  private scheduledSignalCalibrationResponseFromLease(
    status: 'DUPLICATE_TERMINAL' | 'LEASE_HELD',
    request: ScheduledSignalCalibrationStageRequest,
    normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>,
    leaseResult: PipelineStageLeaseResult,
    inputFingerprint: string,
    batchSize: number,
    changedInstrumentCount: number
  ): ScheduledSignalCalibrationStageResponse {
    const stage = leaseResult.stage;
    return {
      status,
      pipelineRunId: stage?.pipelineRunId || null,
      stageRunId: stage?.id || null,
      stageKey: 'SIGNAL_CALIBRATION',
      scope: {
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        pipelineKey: request.pipelineKey,
      },
      triggerType: 'scheduled',
      dataThroughDate: request.dataThroughDate,
      inputFingerprint: stage?.inputFingerprint || inputFingerprint,
      outputFingerprint: stage?.outputFingerprint || null,
      batch: {
        totalInstrumentCount: changedInstrumentCount,
        processedCount: stage?.processedCount || 0,
        batchSize: stage?.batchSize ?? batchSize,
        nextOffset: stage?.nextOffset ?? null,
        hasMore: stage?.hasMore ?? false,
      },
      counts: {
        totalCount: stage?.totalCount ?? changedInstrumentCount,
        processedCount: stage?.processedCount ?? 0,
        succeededCount: stage?.succeededCount ?? 0,
        partialCount: stage?.partialCount ?? 0,
        failedCount: stage?.failedCount ?? 0,
        skippedCount: stage?.skippedCount ?? 0,
        unchangedCount: stage?.unchangedCount ?? 0,
      },
      warnings: stage?.warnings ?? [],
      errors: stage?.errors ?? [],
      startedAt: stage?.startedAt ?? null,
      completedAt: stage?.completedAt ?? null,
    };
  }

  private scheduledSignalCalibrationResponseFromStage(
    status: ScheduledSignalCalibrationStageResponse['status'],
    request: ScheduledSignalCalibrationStageRequest,
    normalizedScope: ReturnType<PipelineOrchestrationService['normalizeScope']>,
    stage: PipelineStageRunRecord,
    inputFingerprint: string,
    batchSize: number,
    changedInstrumentCount: number
  ): ScheduledSignalCalibrationStageResponse {
    return {
      status,
      pipelineRunId: stage.pipelineRunId,
      stageRunId: stage.id,
      stageKey: 'SIGNAL_CALIBRATION',
      scope: {
        region: normalizedScope.region,
        assetType: normalizedScope.assetType,
        timeframe: normalizedScope.timeframe,
        pipelineKey: request.pipelineKey,
      },
      triggerType: 'scheduled',
      dataThroughDate: request.dataThroughDate,
      inputFingerprint: stage.inputFingerprint || inputFingerprint,
      outputFingerprint: stage.outputFingerprint || null,
      batch: {
        totalInstrumentCount: changedInstrumentCount,
        processedCount: stage.processedCount,
        batchSize: stage.batchSize ?? batchSize,
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
      startedAt: stage.startedAt,
      completedAt: stage.completedAt,
    };
  }
}

function commandPolicy(
  commandKey: PipelineCommandKey,
  stageKey: string,
  stageOrder: number,
  moduleName: string,
  operationName: string,
  availability: PipelineCommandAvailability,
  disabledReason: string | null
): PipelineCommandPolicy {
  const providerAccess = commandKey.startsWith('MARKET_DATA_') ? 'FORBIDDEN' : 'NONE';
  return {
    commandKey,
    stageKey,
    stageOrder,
    moduleName,
    operationName,
    availability,
    disabledReason,
    runModes: ['single_batch'],
    defaultBatchSize: 25,
    maxBatchSize: 100,
    providerAccess,
    schedulerAccess: availability === 'ENABLED' ? 'NONE' : 'FORBIDDEN',
    downstreamFanout: availability === 'ENABLED' ? 'NONE' : 'FORBIDDEN',
  };
}
