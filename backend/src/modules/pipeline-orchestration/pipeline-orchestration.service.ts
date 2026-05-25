import { DataQualityEngineService } from '../data-quality-engine';
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
  PipelineStatusQuery,
  PipelineStatusRunDto,
  PipelineStatusSnapshot,
  PipelineStatusStageDto,
} from './pipeline-orchestration.types';

const LEDGER_VERSION = 'pipeline-ledger-v1';
const ACTIVE_STATUSES = new Set(['PENDING', 'RUNNING']);
const TERMINAL_STATUSES = new Set(['COMPLETED', 'PARTIAL', 'FAILED', 'SKIPPED', 'BLOCKED']);
const DEFAULT_LEASE_MS = 600_000;
const PROCESS_LOCAL_ID = `${process.pid}-${Math.random().toString(16).slice(2, 10)}`;

type PipelineCommandPolicy = PipelineCommandCatalogItem & {
  stageOrder: number;
};

const PIPELINE_COMMAND_POLICIES: PipelineCommandPolicy[] = [
  commandPolicy('MARKET_DATA_INCREMENTAL_EOD_LOAD', 'MARKET_DATA', 1, 'Market Data', 'Incremental EOD data load', 'FORBIDDEN', 'Provider/live ingestion is forbidden from Pipeline Ops in this slice.'),
  commandPolicy('MARKET_DATA_PRICE_BACKFILL', 'MARKET_DATA', 1, 'Market Data', 'Price backfill', 'FORBIDDEN', 'Price backfill remains feature-owned until a separate gate approves command migration.'),
  commandPolicy('MARKET_DATA_CATALOG_SYNC', 'MARKET_DATA', 1, 'Market Data', 'Catalog sync', 'FORBIDDEN', 'Catalog sync remains feature-owned until a separate gate approves command migration.'),
  commandPolicy('DATA_QUALITY_EVALUATE_SCOPE', 'DATA_QUALITY', 2, 'Data Quality', 'Readiness evaluation', 'ENABLED', null),
  commandPolicy('RAW_SIGNALS_GENERATE_SCOPE', 'RAW_SIGNALS', 3, 'Signals', 'Raw signal generation', 'DEFERRED', 'Requires a separate adapter contract after Data Quality command safety is proven.'),
  commandPolicy('SIGNAL_CALIBRATION_REFRESH_SCOPE', 'SIGNAL_CALIBRATION', 4, 'Signal Calibration', 'Calibration refresh', 'DEFERRED', 'Requires adapter-specific QA and contract approval.'),
  commandPolicy('CONTEXT_SNAPSHOTS_GENERATE_SCOPE', 'CONTEXT_SNAPSHOTS', 5, 'Context Snapshots', 'Historical context snapshot generation', 'DEFERRED', 'Requires snapshot-date and source-freshness contract approval.'),
  commandPolicy('MARKET_CONTEXT_REFRESH_REGION', 'MARKET_CONTEXT', 6, 'Market Context', 'Market context refresh', 'DEFERRED', 'Requires region/scope count mapping contract approval.'),
  commandPolicy('SIGNAL_QUALITY_DIAGNOSTICS_REFRESH', 'SIGNAL_QUALITY', 7, 'Signal Quality', 'Signal quality diagnostics refresh', 'DEFERRED', 'Requires diagnostics-cost and historical-price bounds contract approval.'),
  commandPolicy('SMART_MONEY_REFRESH_SCOPE', 'SMART_MONEY', 8, 'Smart Money', 'Smart money refresh', 'DEFERRED', 'Requires adapter-specific local price bounds and count mapping contract.'),
  commandPolicy('STRATEGY_DECISION_EVALUATE_SCOPE', 'STRATEGY_DECISION', 9, 'Strategy', 'Strategy decision refresh', 'DEFERRED', 'Requires downstream gating contract approval.'),
  commandPolicy('BACKTEST_PROOF_REFRESH', 'BACKTEST_PROOF', 10, 'Backtests', 'Backtest proof refresh', 'FORBIDDEN', 'Backtesting proof execution is out of scope for this first command slice.'),
  commandPolicy('RESEARCH_PROJECTION_REFRESH', 'RESEARCH_PROJECTION', 11, 'Research', 'Research projection refresh', 'FORBIDDEN', 'No approved write command contract exists for research projection refresh.'),
  commandPolicy('TODAY_REVIEW_PUBLISH', 'TODAY_REVIEW', 12, 'Today Review', 'Today review publish', 'FORBIDDEN', 'Publication workflow requires a separate Product and architecture gate.'),
  commandPolicy('PIPELINE_RUN_ALL', 'PIPELINE', 13, 'Pipeline', 'Run all stages', 'FORBIDDEN', 'Broad pipeline fanout is out of scope.'),
  commandPolicy('PIPELINE_DRAIN_ALL_BATCHES', 'PIPELINE', 13, 'Pipeline', 'Drain all batches', 'FORBIDDEN', 'First slice allows one batch per request only.'),
  commandPolicy('PIPELINE_CANCEL_ACTIVE', 'PIPELINE', 13, 'Pipeline', 'Cancel active run', 'FORBIDDEN', 'No background worker cancellation contract exists for this slice.'),
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
    private readonly dataQualityService = new DataQualityEngineService()
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
      activeRun: activeRun ? this.toRunStatus(activeRun) : null,
      lastRun: lastRun ? this.toRunStatus(lastRun) : null,
      stages: this.groupStages(stages),
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

  private groupStages(stages: PipelineStageRunRecord[]) {
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
      if (!current.activeStage && ACTIVE_STATUSES.has(stage.status)) current.activeStage = this.toStageStatus(stage);
      if (!current.lastStage && TERMINAL_STATUSES.has(stage.status)) current.lastStage = this.toStageStatus(stage);
      groups.set(stage.stageKey, current);
    }
    return [...groups.values()].sort((a, b) => a.stageOrder - b.stageOrder || a.stageKey.localeCompare(b.stageKey));
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

  private mapDataQualityStatus(totalCount: number, failedCount: number): 'COMPLETED' | 'PARTIAL' | 'SKIPPED' {
    if (totalCount === 0) return 'SKIPPED';
    if (failedCount > 0) return 'PARTIAL';
    return 'COMPLETED';
  }

  private toStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
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
