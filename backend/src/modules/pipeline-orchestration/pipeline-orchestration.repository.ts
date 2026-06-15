import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type {
  PipelineLatestStageQuery,
  PipelineRunCompleteInput,
  PipelineRunCreateInput,
  PipelineRunRecord,
  PipelineStageCompleteInput,
  PipelineStageCreateInput,
  PipelineStageLeaseInput,
  PipelineStageLeaseResult,
  PipelineStageProgressInput,
  PipelineStageRunRecord,
} from './pipeline-orchestration.types';

const TERMINAL_STAGE_STATUSES = ['COMPLETED', 'PARTIAL', 'FAILED', 'SKIPPED', 'BLOCKED', 'ABANDONED'];
const ACTIVE_STATUSES = ['PENDING', 'RUNNING'];
// Only genuine runs (real work completed) — excludes ABANDONED (reaped/interrupted), SKIPPED, and
// BLOCKED so that a stale-lease reaped run never becomes the headline "last run" on the Pipeline
// Ops header.
const MEANINGFUL_RUN_STATUSES = ['COMPLETED', 'PARTIAL', 'FAILED']; // exclude ABANDONED/reaped so an interrupted run never headlines

export class PipelineOrchestrationRepository {
  constructor(private readonly db = prisma) {}

  async upsertRun(input: PipelineRunCreateInput & { idempotencyKey: string }): Promise<PipelineRunRecord> {
    const saved = await this.db.pipelineRun.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      create: {
        pipelineKey: input.pipelineKey,
        scopeRegion: input.region,
        scopeAssetType: input.assetType,
        timeframe: input.timeframe || '1d',
        triggerType: input.triggerType,
        status: input.status || 'RUNNING',
        idempotencyKey: input.idempotencyKey,
        dataThroughDate: input.dataThroughDate ?? null,
        sourceFingerprint: input.sourceFingerprint ?? null,
        changedInstrumentCount: input.changedInstrumentCount ?? 0,
        totalCount: input.totalCount ?? 0,
        processedCount: input.processedCount ?? 0,
        succeededCount: input.succeededCount ?? 0,
        partialCount: input.partialCount ?? 0,
        failedCount: input.failedCount ?? 0,
        skippedCount: input.skippedCount ?? 0,
        unchangedCount: input.unchangedCount ?? 0,
        warnings: this.jsonArray(input.warnings),
        errors: this.jsonArray(input.errors),
        metadata: this.optionalJson(input.metadata),
        startedAt: input.startedAt && input.startedAt > new Date() ? new Date() : (input.startedAt ?? new Date()),
      },
      update: {
        triggerType: input.triggerType,
        status: input.status || 'RUNNING',
        dataThroughDate: input.dataThroughDate ?? null,
        sourceFingerprint: input.sourceFingerprint ?? null,
        changedInstrumentCount: input.changedInstrumentCount ?? 0,
        totalCount: input.totalCount ?? 0,
        processedCount: input.processedCount ?? 0,
        succeededCount: input.succeededCount ?? 0,
        partialCount: input.partialCount ?? 0,
        failedCount: input.failedCount ?? 0,
        skippedCount: input.skippedCount ?? 0,
        unchangedCount: input.unchangedCount ?? 0,
        warnings: this.jsonArray(input.warnings),
        errors: this.jsonArray(input.errors),
        metadata: this.optionalJson(input.metadata),
        completedAt: null,
        durationMs: null,
      },
    });
    return this.toRunRecord(saved);
  }

  async completeRun(input: PipelineRunCompleteInput): Promise<PipelineRunRecord> {
    const saved = await this.db.pipelineRun.update({
      where: { idempotencyKey: input.idempotencyKey },
      data: {
        status: input.status,
        changedInstrumentCount: input.changedInstrumentCount ?? undefined,
        totalCount: input.totalCount ?? undefined,
        processedCount: input.processedCount ?? undefined,
        succeededCount: input.succeededCount ?? undefined,
        partialCount: input.partialCount ?? undefined,
        failedCount: input.failedCount ?? undefined,
        skippedCount: input.skippedCount ?? undefined,
        unchangedCount: input.unchangedCount ?? undefined,
        warnings: input.warnings === undefined ? undefined : this.jsonArray(input.warnings),
        errors: input.errors === undefined ? undefined : this.jsonArray(input.errors),
        metadata: input.metadata === undefined ? undefined : this.optionalJson(input.metadata),
        completedAt: input.completedAt ?? new Date(),
        durationMs: input.durationMs === undefined ? undefined : input.durationMs,
      },
    });
    return this.toRunRecord(saved);
  }

  async upsertStage(input: PipelineStageCreateInput & { idempotencyKey: string }): Promise<PipelineStageRunRecord> {
    const saved = await this.db.pipelineStageRun.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      create: {
        pipelineRunId: input.pipelineRunId,
        stageKey: input.stageKey,
        stageOrder: input.stageOrder,
        status: input.status || 'PENDING',
        idempotencyKey: input.idempotencyKey,
        scopeRegion: input.region,
        scopeAssetType: input.assetType,
        timeframe: input.timeframe || '1d',
        dataThroughDate: input.dataThroughDate ?? null,
        inputFingerprint: input.inputFingerprint ?? null,
        outputFingerprint: input.outputFingerprint ?? null,
        changedInstrumentCount: input.changedInstrumentCount ?? 0,
        batchSize: input.batchSize ?? null,
        offset: input.offset ?? null,
        nextOffset: input.nextOffset ?? null,
        hasMore: input.hasMore ?? false,
        totalCount: input.totalCount ?? 0,
        processedCount: input.processedCount ?? 0,
        succeededCount: input.succeededCount ?? 0,
        partialCount: input.partialCount ?? 0,
        failedCount: input.failedCount ?? 0,
        skippedCount: input.skippedCount ?? 0,
        unchangedCount: input.unchangedCount ?? 0,
        cacheKey: input.cacheKey ?? null,
        cacheStatus: input.cacheStatus || 'UNKNOWN',
        cacheExpiresAt: input.cacheExpiresAt ?? null,
        warnings: this.jsonArray(input.warnings),
        errors: this.jsonArray(input.errors),
        metadata: this.optionalJson(input.metadata),
      },
      update: {
        stageOrder: input.stageOrder,
        status: input.status || 'PENDING',
        dataThroughDate: input.dataThroughDate ?? null,
        inputFingerprint: input.inputFingerprint ?? null,
        outputFingerprint: input.outputFingerprint ?? null,
        changedInstrumentCount: input.changedInstrumentCount ?? 0,
        batchSize: input.batchSize ?? null,
        offset: input.offset ?? null,
        nextOffset: input.nextOffset ?? null,
        hasMore: input.hasMore ?? false,
        totalCount: input.totalCount ?? 0,
        processedCount: input.processedCount ?? 0,
        succeededCount: input.succeededCount ?? 0,
        partialCount: input.partialCount ?? 0,
        failedCount: input.failedCount ?? 0,
        skippedCount: input.skippedCount ?? 0,
        unchangedCount: input.unchangedCount ?? 0,
        cacheKey: input.cacheKey ?? null,
        cacheStatus: input.cacheStatus || 'UNKNOWN',
        cacheExpiresAt: input.cacheExpiresAt ?? null,
        warnings: this.jsonArray(input.warnings),
        errors: this.jsonArray(input.errors),
        metadata: this.optionalJson(input.metadata),
        completedAt: null,
      },
    });
    return this.toStageRecord(saved);
  }

  async acquireStageLease(input: PipelineStageLeaseInput): Promise<PipelineStageLeaseResult> {
    const now = input.now ?? new Date();
    const stage = await this.db.pipelineStageRun.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (!stage) return { acquired: false, reason: 'STAGE_NOT_FOUND', stage: null };
    if (TERMINAL_STAGE_STATUSES.includes(stage.status) && !input.allowTerminalRetry) {
      return { acquired: false, reason: 'STAGE_TERMINAL', stage: this.toStageRecord(stage) };
    }

    const leaseExpiresAt = new Date(now.getTime() + input.leaseMs);
    const result = await this.db.pipelineStageRun.updateMany({
      where: {
        id: stage.id,
        ...(input.allowTerminalRetry ? {} : { status: { notIn: TERMINAL_STAGE_STATUSES } }),
        OR: [
          { leaseExpiresAt: null },
          { leaseExpiresAt: { lt: now } },
          { leaseOwner: input.leaseOwner },
        ],
      },
      data: {
        status: 'RUNNING',
        leaseOwner: input.leaseOwner,
        leaseExpiresAt,
        attemptCount: { increment: 1 },
        startedAt: stage.startedAt && stage.startedAt > now ? now : (stage.startedAt ?? now),
        completedAt: null,
      },
    });
    const updated = await this.db.pipelineStageRun.findUnique({ where: { id: stage.id } });
    if (result.count === 0) return { acquired: false, reason: 'LEASE_HELD', stage: updated ? this.toStageRecord(updated) : null };
    return { acquired: true, reason: 'ACQUIRED', stage: updated ? this.toStageRecord(updated) : null };
  }

  async completeStage(input: PipelineStageCompleteInput): Promise<PipelineStageRunRecord> {
    const saved = await this.db.pipelineStageRun.update({
      where: { idempotencyKey: input.idempotencyKey },
      data: {
        status: input.status,
        outputFingerprint: input.outputFingerprint === undefined ? undefined : input.outputFingerprint,
        changedInstrumentCount: input.changedInstrumentCount ?? undefined,
        nextOffset: input.nextOffset === undefined ? undefined : input.nextOffset,
        hasMore: input.hasMore ?? undefined,
        totalCount: input.totalCount ?? undefined,
        processedCount: input.processedCount ?? undefined,
        succeededCount: input.succeededCount ?? undefined,
        partialCount: input.partialCount ?? undefined,
        failedCount: input.failedCount ?? undefined,
        skippedCount: input.skippedCount ?? undefined,
        unchangedCount: input.unchangedCount ?? undefined,
        cacheStatus: input.cacheStatus ?? undefined,
        cacheExpiresAt: input.cacheExpiresAt === undefined ? undefined : input.cacheExpiresAt,
        completedAt: input.completedAt ?? new Date(),
        durationMs: input.durationMs === undefined ? undefined : input.durationMs,
        warnings: input.warnings === undefined ? undefined : this.jsonArray(input.warnings),
        errors: input.errors === undefined ? undefined : this.jsonArray(input.errors),
        metadata: input.metadata === undefined ? undefined : this.optionalJson(input.metadata),
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });
    return this.toStageRecord(saved);
  }

  async recordStageProgress(input: PipelineStageProgressInput): Promise<PipelineStageRunRecord> {
    const now = input.now ?? new Date();
    const saved = await this.db.pipelineStageRun.update({
      where: { idempotencyKey: input.idempotencyKey },
      data: {
        status: input.status ?? 'RUNNING',
        changedInstrumentCount: input.changedInstrumentCount ?? undefined,
        totalCount: input.totalCount ?? undefined,
        processedCount: input.processedCount ?? undefined,
        succeededCount: input.succeededCount ?? undefined,
        partialCount: input.partialCount ?? undefined,
        failedCount: input.failedCount ?? undefined,
        skippedCount: input.skippedCount ?? undefined,
        unchangedCount: input.unchangedCount ?? undefined,
        nextOffset: input.nextOffset === undefined ? undefined : input.nextOffset,
        hasMore: input.hasMore ?? undefined,
        warnings: input.warnings === undefined ? undefined : this.jsonArray(input.warnings),
        errors: input.errors === undefined ? undefined : this.jsonArray(input.errors),
        metadata: input.metadata === undefined ? undefined : this.optionalJson(input.metadata),
        leaseOwner: input.leaseOwner === undefined ? undefined : input.leaseOwner,
        leaseExpiresAt: input.leaseMs ? new Date(now.getTime() + input.leaseMs) : undefined,
        startedAt: input.startedAt === undefined ? undefined : input.startedAt,
      },
    });
    return this.toStageRecord(saved);
  }

  async latestStages(query: PipelineLatestStageQuery): Promise<PipelineStageRunRecord[]> {
    const rows = await this.db.pipelineStageRun.findMany({
      where: {
        scopeRegion: query.region,
        scopeAssetType: query.assetType,
        timeframe: query.timeframe,
        pipelineRun: query.pipelineKey ? { pipelineKey: query.pipelineKey } : undefined,
        stageKey: query.stageKeys?.length ? { in: query.stageKeys } : undefined,
      },
      // Order by updatedAt (always set) first so rows with a null startedAt (which sort
      // NULLS-FIRST under `startedAt desc` in Postgres) cannot crowd out genuine recent runs.
      orderBy: [{ updatedAt: 'desc' }, { startedAt: 'desc' }],
      // Fetch a generous window so the freshest run for EACH stage is in scope even when there
      // is recent churn (FAILED retries, integration-test seeds). groupStages() then selects,
      // per stage, the terminal run covering the latest dataThroughDate.
      take: query.limit ?? 300,
    });
    return rows.map((row: unknown) => this.toStageRecord(row));
  }

  /**
   * Reaps RUNNING and stale-PENDING pipeline_stage_runs/pipeline_runs.
   *
   * RUNNING: marks stage_runs as FAILED when their lease has expired OR
   *   startedAt/updatedAt is older than staleThresholdMs.
   * PENDING: marks stage_runs as FAILED when they are still PENDING
   *   (never started) and updatedAt/createdAt is older than staleThresholdMs.
   *   Also reaps the parent pipeline_run when all its stage children are gone.
   *
   * Only touches clearly-stale rows; never touches a row updated within the last
   * staleThresholdMs milliseconds.  Safe to call concurrently: uses updateMany
   * with precise WHERE guards.  Returns counts of reaped rows.
   */
  async extendStageLease(idempotencyKey: string, leaseMs: number, now = new Date()): Promise<void> {
    const leaseExpiresAt = new Date(now.getTime() + leaseMs);
    await this.db.pipelineStageRun.updateMany({
      where: { idempotencyKey, status: 'RUNNING' },
      data: { leaseExpiresAt, updatedAt: now },
    });
  }

  async reapStaleLeases(opts: {
    staleThresholdMs: number;
    now?: Date;
    errorMessage?: string;
  }): Promise<{ stageRowsReaped: number; runRowsReaped: number; reaped: Array<{ region: string; assetType: string; dataThroughDate: string | null; pipelineRunId: string }> }> {
    const now = opts.now ?? new Date();
    const cutoff = new Date(now.getTime() - opts.staleThresholdMs);
    const reaperError = opts.errorMessage ?? 'reaped: stale lease / interrupted run';
    const completedAt = now;

    // 1. Reap stale RUNNING stage runs: lease has expired (leaseExpiresAt < now)
    //    OR leaseExpiresAt is null AND startedAt < cutoff
    //    AND updatedAt < cutoff (safety: don't touch anything recently touched)
    const runningStageResult = await this.db.pipelineStageRun.updateMany({
      where: {
        status: 'RUNNING',
        updatedAt: { lt: cutoff },
        OR: [
          { leaseExpiresAt: { lt: now } },
          { leaseExpiresAt: null, startedAt: { lt: cutoff } },
        ],
      },
      data: {
        status: 'ABANDONED',
        completedAt,
        leaseOwner: null,
        leaseExpiresAt: null,
        errors: [reaperError],
      },
    });

    // 2. Reap stale PENDING stage runs: never started, older than staleThresholdMs.
    const pendingStageResult = await this.db.pipelineStageRun.updateMany({
      where: {
        status: 'PENDING',
        updatedAt: { lt: cutoff },
        createdAt: { lt: cutoff },
      },
      data: {
        status: 'ABANDONED',
        completedAt,
        errors: [reaperError],
      },
    });

    const stageRowsReaped = runningStageResult.count + pendingStageResult.count;

    // 3. Reap stale pipeline runs: RUNNING or PENDING rows where updatedAt < cutoff AND there
    //    are no longer any child stage rows still RUNNING or PENDING (those were just reaped or
    //    were already gone).  We do this as a two-step query to avoid N+1; Prisma's updateMany
    //    doesn't support subquery existence checks, so we fetch candidate IDs first then update.
    const candidateRuns = await this.db.pipelineRun.findMany({
      where: {
        status: { in: ['RUNNING', 'PENDING'] },
        updatedAt: { lt: cutoff },
      },
      select: { id: true, scopeRegion: true, scopeAssetType: true, dataThroughDate: true },
    });

    let runRowsReaped = 0;
    const reaped: Array<{ region: string; assetType: string; dataThroughDate: string | null; pipelineRunId: string }> = [];
    if (candidateRuns.length > 0) {
      const candidateIds = candidateRuns.map((r: { id: string }) => r.id);
      // Find runs that still have at least one RUNNING or PENDING stage child (not yet reaped)
      const stillActiveStages = await this.db.pipelineStageRun.findMany({
        where: {
          pipelineRunId: { in: candidateIds },
          status: { in: ['RUNNING', 'PENDING'] },
        },
        select: { pipelineRunId: true },
      });
      const activeRunIds = new Set(stillActiveStages.map((s: { pipelineRunId: string }) => s.pipelineRunId));
      const idsToReap = candidateIds.filter((id: string) => !activeRunIds.has(id));
      if (idsToReap.length > 0) {
        const runResult = await this.db.pipelineRun.updateMany({
          where: {
            id: { in: idsToReap },
            status: { in: ['RUNNING', 'PENDING'] },
          },
          data: {
            status: 'ABANDONED',
            completedAt,
            errors: [reaperError],
          },
        });
        runRowsReaped = runResult.count;
        const reaperCandidateMap = new Map(candidateRuns.map((r: { id: string; scopeRegion: string; scopeAssetType: string; dataThroughDate: Date | null }) => [r.id, r]));
        for (const id of idsToReap) {
          const r = reaperCandidateMap.get(id);
          if (r) {
            reaped.push({
              region: r.scopeRegion,
              assetType: r.scopeAssetType,
              dataThroughDate: r.dataThroughDate ? (r.dataThroughDate as Date).toISOString().slice(0, 10) : null,
              pipelineRunId: id,
            });
          }
        }
      }
    }

    return { stageRowsReaped, runRowsReaped, reaped };
  }

  async findActiveRun(query: Required<Pick<PipelineLatestStageQuery, 'region' | 'assetType' | 'timeframe' | 'pipelineKey'>>): Promise<PipelineRunRecord | null> {
    const row = await this.db.pipelineRun.findFirst({
      where: {
        pipelineKey: query.pipelineKey,
        scopeRegion: query.region,
        scopeAssetType: query.assetType,
        timeframe: query.timeframe,
        status: { in: ACTIVE_STATUSES },
      },
      orderBy: [{ startedAt: 'desc' }, { updatedAt: 'desc' }],
    });
    return row ? this.toRunRecord(row) : null;
  }

  async findLastRun(query: Required<Pick<PipelineLatestStageQuery, 'region' | 'assetType' | 'timeframe' | 'pipelineKey'>>): Promise<PipelineRunRecord | null> {
    const row = await this.db.pipelineRun.findFirst({
      where: {
        pipelineKey: query.pipelineKey,
        scopeRegion: query.region,
        scopeAssetType: query.assetType,
        timeframe: query.timeframe,
        // Exclude ABANDONED (reaped/interrupted) and SKIPPED/BLOCKED so only genuine runs
        // with real data work headline the Pipeline Ops header.
        status: { in: MEANINGFUL_RUN_STATUSES },
      },
      // "Last run" = most-recently EXECUTED run. Order by completedAt (system-set finish time)
      // FIRST — the reliable execution-recency signal. startedAt is NOT trustworthy here: a
      // recording path can stamp it with a (sometimes future) target trading date, and one
      // future-dated startedAt would otherwise headline forever, masking every real run.
      // completedAt -> startedAt -> dataThroughDate keeps it robust to that corruption.
      orderBy: [{ completedAt: { sort: 'desc', nulls: 'last' } }, { startedAt: 'desc' }, { dataThroughDate: { sort: 'desc', nulls: 'last' } }],
    });
    return row ? this.toRunRecord(row) : null;
  }

  private toRunRecord(record: any): PipelineRunRecord {
    return {
      id: record.id,
      pipelineKey: record.pipelineKey,
      region: record.scopeRegion,
      assetType: record.scopeAssetType,
      timeframe: record.timeframe,
      triggerType: record.triggerType,
      status: record.status,
      idempotencyKey: record.idempotencyKey,
      dataThroughDate: this.iso(record.dataThroughDate),
      sourceFingerprint: record.sourceFingerprint ?? null,
      changedInstrumentCount: record.changedInstrumentCount,
      totalCount: record.totalCount,
      processedCount: record.processedCount,
      succeededCount: record.succeededCount,
      partialCount: record.partialCount,
      failedCount: record.failedCount,
      skippedCount: record.skippedCount,
      unchangedCount: record.unchangedCount,
      warnings: this.stringArray(record.warnings),
      errors: this.stringArray(record.errors),
      metadata: this.jsonObject(record.metadata),
      startedAt: record.startedAt.toISOString(),
      completedAt: this.iso(record.completedAt),
      durationMs: record.durationMs ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toStageRecord(record: any): PipelineStageRunRecord {
    return {
      id: record.id,
      pipelineRunId: record.pipelineRunId,
      stageKey: record.stageKey,
      stageOrder: record.stageOrder,
      status: record.status,
      idempotencyKey: record.idempotencyKey,
      region: record.scopeRegion,
      assetType: record.scopeAssetType,
      timeframe: record.timeframe,
      dataThroughDate: this.iso(record.dataThroughDate),
      inputFingerprint: record.inputFingerprint ?? null,
      outputFingerprint: record.outputFingerprint ?? null,
      changedInstrumentCount: record.changedInstrumentCount,
      batchSize: record.batchSize ?? null,
      offset: record.offset ?? null,
      nextOffset: record.nextOffset ?? null,
      hasMore: Boolean(record.hasMore),
      totalCount: record.totalCount,
      processedCount: record.processedCount,
      succeededCount: record.succeededCount,
      partialCount: record.partialCount,
      failedCount: record.failedCount,
      skippedCount: record.skippedCount,
      unchangedCount: record.unchangedCount,
      attemptCount: record.attemptCount,
      cacheKey: record.cacheKey ?? null,
      cacheStatus: record.cacheStatus,
      cacheExpiresAt: this.iso(record.cacheExpiresAt),
      leaseOwner: record.leaseOwner ?? null,
      leaseExpiresAt: this.iso(record.leaseExpiresAt),
      startedAt: this.iso(record.startedAt),
      completedAt: this.iso(record.completedAt),
      durationMs: record.durationMs ?? null,
      warnings: this.stringArray(record.warnings),
      errors: this.stringArray(record.errors),
      metadata: this.jsonObject(record.metadata),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private optionalJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return value === null || value === undefined ? Prisma.JsonNull : value as Prisma.InputJsonValue;
  }

  private jsonArray(value: unknown): Prisma.InputJsonValue {
    return Array.isArray(value) ? value as Prisma.InputJsonValue : [];
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : [];
  }

  private jsonObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  }

  private iso(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }
}
