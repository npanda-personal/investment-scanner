import { PipelineOrchestrationRepository } from './pipeline-orchestration.repository';
import type {
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

export class PipelineOrchestrationService {
  constructor(private readonly repository = new PipelineOrchestrationRepository()) {}

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
}
