/**
 * pipeline-dag-persistence.ts
 *
 * RepositoryDagPersistence — wires the DagPersistence interface (consumed by
 * PipelineDagRunner) onto PipelineOrchestrationRepository.  All field mappings
 * follow the comment block at the top of pipeline-dag-runner.ts.
 *
 * Key mapping decisions:
 *  - dataThroughDate:  runner passes an ISO-date string; repository expects
 *    Date | null (PipelineScopeInput).  We parse with
 *    `new Date(`${tradingDate}T00:00:00.000Z`)` matching the pattern used
 *    throughout pipeline-orchestration.service.ts.
 *
 *  - acquireStage:  acquireStageLease returns PipelineStageLeaseResult whose
 *    `reason` is one of 'ACQUIRED' | 'STAGE_NOT_FOUND' | 'LEASE_HELD' |
 *    'STAGE_TERMINAL'.  The runner checks `reason === 'STAGE_TERMINAL'`
 *    verbatim, so we pass the reason through unchanged.
 *
 *  - findRunByKey:  the runner needs only { id, status }. The repository does
 *    not expose a findByIdempotencyKey shorthand, but it exposes `this.db`
 *    (the Prisma client) as a public readonly property.  We use that directly.
 *
 *  - findTerminalStage:  latestStages() returns all recent stage runs for a
 *    scope.  We filter to the single most-recent terminal row whose stageKey
 *    and dataThroughDate match (same date string after ISO-slice).
 *
 *  - resetStage:  issues a raw Prisma updateMany via repository.db matching on
 *    idempotencyKey, writing status='PENDING' and clearing lease fields.
 */

import prisma from '../../db/prisma';
import type { DagPersistence, RunRecord, TerminalStageRecord } from './pipeline-dag-runner';
import { PipelineOrchestrationRepository } from './pipeline-orchestration.repository';

const TERMINAL_STAGE_STATUSES = new Set([
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'SKIPPED',
  'BLOCKED',
  'ABANDONED',
]);

function parseTradingDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`);
}

export class RepositoryDagPersistence implements DagPersistence {
  constructor(private readonly repository = new PipelineOrchestrationRepository()) {}

  async upsertRun(params: {
    idempotencyKey: string;
    pipelineKey: string;
    triggerType: string;
    region: string;
    assetType: string;
    timeframe: string;
    dataThroughDate: string;
    sourceFingerprint?: string | null;
    status: string;
  }): Promise<RunRecord> {
    // FIX A: The runner hardcodes pipelineKey='dag-runner' in its execute() call,
    // but guards hasCompletedScheduledTerminal / hasActiveScheduledDownstream and
    // findActiveRun all query pipelineKey='market-intelligence'.  Override here so
    // DAG run rows land under the same pipelineKey as every other pipeline row and
    // the guards can find them.
    const record = await this.repository.upsertRun({
      idempotencyKey: params.idempotencyKey,
      pipelineKey: 'market-intelligence',
      triggerType: params.triggerType,
      region: params.region,
      assetType: params.assetType,
      timeframe: params.timeframe,
      dataThroughDate: parseTradingDate(params.dataThroughDate),
      sourceFingerprint: params.sourceFingerprint ?? null,
      status: params.status as any,
    });
    return { id: record.id, status: record.status };
  }

  async completeRun(params: {
    idempotencyKey: string;
    status: string;
    durationMs: number;
    succeededCount: number;
    failedCount: number;
    metadata?: Record<string, unknown> | null;
    errors?: string[];
  }): Promise<void> {
    await this.repository.completeRun({
      idempotencyKey: params.idempotencyKey,
      status: params.status as any,
      durationMs: params.durationMs,
      succeededCount: params.succeededCount,
      failedCount: params.failedCount,
      metadata: params.metadata ?? null,
      errors: params.errors,
    });
  }

  async findRunByKey(idempotencyKey: string): Promise<RunRecord | null> {
    const row = await prisma.pipelineRun.findUnique({
      where: { idempotencyKey },
      select: { id: true, status: true },
    });
    if (!row) return null;
    return { id: row.id, status: row.status };
  }

  async upsertStage(params: {
    idempotencyKey: string;
    pipelineRunId: string;
    stageKey: string;
    stageOrder: number;
    region: string;
    assetType: string;
    timeframe: string;
    dataThroughDate: string;
    status: string;
  }): Promise<void> {
    await this.repository.upsertStage({
      idempotencyKey: params.idempotencyKey,
      pipelineRunId: params.pipelineRunId,
      stageKey: params.stageKey,
      stageOrder: params.stageOrder,
      region: params.region,
      assetType: params.assetType,
      timeframe: params.timeframe,
      dataThroughDate: parseTradingDate(params.dataThroughDate),
      status: params.status as any,
    });
  }

  async acquireStage(params: {
    idempotencyKey: string;
    leaseOwner: string;
    leaseMs: number;
  }): Promise<{ acquired: boolean; reason: string }> {
    const result = await this.repository.acquireStageLease({
      idempotencyKey: params.idempotencyKey,
      leaseOwner: params.leaseOwner,
      leaseMs: params.leaseMs,
      allowTerminalRetry: false,
    });
    // Pass reason through verbatim — the runner checks 'STAGE_TERMINAL' exactly.
    return { acquired: result.acquired, reason: result.reason };
  }

  async extendLease(idempotencyKey: string, leaseMs: number): Promise<void> {
    await this.repository.extendStageLease(idempotencyKey, leaseMs);
  }

  async completeStage(params: {
    idempotencyKey: string;
    status: string;
    succeededCount: number;
    failedCount: number;
    durationMs: number;
    errors?: string[];
    warnings?: string[];
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.repository.completeStage({
      idempotencyKey: params.idempotencyKey,
      status: params.status as any,
      succeededCount: params.succeededCount,
      failedCount: params.failedCount,
      durationMs: params.durationMs,
      errors: params.errors,
      warnings: params.warnings,
      metadata: params.metadata ?? null,
    });
  }

  async findTerminalStage(params: {
    stageKey: string;
    region: string;
    assetType: string;
    timeframe: string;
    tradingDate: string;
    idempotencyKey?: string;
  }): Promise<TerminalStageRecord | null> {
    // When an idempotencyKey is provided, look up the stage row directly first.
    // This is the path used by the DAG runner for exact-match stage lookups.
    if (params.idempotencyKey) {
      const direct = await prisma.pipelineStageRun.findFirst({
        where: { idempotencyKey: params.idempotencyKey },
        select: {
          status: true,
          succeededCount: true,
          failedCount: true,
          durationMs: true,
          errors: true,
          metadata: true,
        },
      });
      if (direct && TERMINAL_STAGE_STATUSES.has(direct.status)) {
        return {
          status: direct.status,
          succeededCount: direct.succeededCount,
          failedCount: direct.failedCount,
          durationMs: direct.durationMs ?? null,
          errors: (direct.errors as string[] | null) ?? [],
          metadata: (direct.metadata as Record<string, unknown> | null) ?? null,
        };
      }
      // Fall through to latestStages path if not found by idempotencyKey.
    }

    const rows = await this.repository.latestStages({
      region: params.region,
      assetType: params.assetType,
      timeframe: params.timeframe,
      stageKeys: [params.stageKey],
      limit: 20,
    });

    // Find the most-recent terminal row whose dataThroughDate matches tradingDate.
    for (const row of rows) {
      if (!TERMINAL_STAGE_STATUSES.has(row.status)) continue;
      // dataThroughDate on the record is an ISO string or null (toStageRecord converts it).
      if (!row.dataThroughDate) continue;
      const rowDate = row.dataThroughDate.slice(0, 10);
      if (rowDate !== params.tradingDate) continue;
      return {
        status: row.status,
        succeededCount: row.succeededCount,
        failedCount: row.failedCount,
        durationMs: row.durationMs ?? null,
        errors: row.errors ?? [],
        metadata: row.metadata ?? null,
      };
    }
    return null;
  }

  async resetStage(idempotencyKey: string): Promise<void> {
    await prisma.pipelineStageRun.updateMany({
      where: { idempotencyKey },
      data: {
        status: 'PENDING',
        leaseOwner: null,
        leaseExpiresAt: null,
        completedAt: null,
      },
    });
  }
}
