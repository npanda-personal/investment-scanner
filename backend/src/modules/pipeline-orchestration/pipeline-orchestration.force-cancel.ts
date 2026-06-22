import prisma from '../../db/prisma';
import type { PipelineCommandRequest, PipelineCommandResponse } from './pipeline-orchestration.types';

/**
 * Force-terminates all RUNNING/PENDING pipeline runs for the request scope and returns
 * a synthetic PipelineCommandResponse.  Bypasses the lease system — intended as an operator
 * escape hatch when a process crash leaves a run orphaned with no live lease-holder.
 * The reaper eventually sets them ABANDONED; this sets them CANCELLED to express intent.
 */
export async function executeForceCancelCommand(request: PipelineCommandRequest): Promise<PipelineCommandResponse> {
  const now = new Date();
  const activeRuns = await prisma.pipelineRun.findMany({
    where: { scopeRegion: request.region, scopeAssetType: request.assetType, status: { in: ['RUNNING', 'PENDING'] } },
    select: { id: true },
  });

  let cancelled = 0;
  if (activeRuns.length > 0) {
    const runIds = activeRuns.map((r: { id: string }) => r.id);
    await prisma.pipelineStageRun.updateMany({
      where: { pipelineRunId: { in: runIds }, status: { in: ['RUNNING', 'PENDING'] } },
      data: { status: 'CANCELLED', completedAt: now, leaseOwner: null, leaseExpiresAt: null, errors: ['cancelled by operator'] },
    });
    const result = await prisma.pipelineRun.updateMany({
      where: { id: { in: runIds } },
      data: { status: 'CANCELLED', completedAt: now, updatedAt: now },
    });
    cancelled = result.count;
  }

  const commandId = `${request.commandKey}:${request.region}:${request.assetType}:${request.idempotencyKey}`;
  const statusQuery = new URLSearchParams({ region: request.region, assetType: request.assetType, timeframe: request.timeframe, pipelineKey: request.pipelineKey, limit: '100' });
  return {
    commandId,
    commandKey: request.commandKey,
    stageKey: 'PIPELINE',
    status: 'COMPLETED',
    scope: { region: request.region, assetType: request.assetType, timeframe: request.timeframe, pipelineKey: request.pipelineKey },
    runMode: request.runMode,
    pipelineRunId: null,
    stageRunId: null,
    idempotencyKey: commandId,
    lease: { acquired: true, reason: 'ACQUIRED', leaseOwner: null, leaseExpiresAt: null },
    batch: { batchSize: request.batchSize, offset: request.offset, nextOffset: null, hasMore: false },
    counts: { totalCount: cancelled, processedCount: cancelled, succeededCount: cancelled, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0 },
    warnings: cancelled === 0 ? ['No active runs found to cancel for this scope'] : [],
    errors: [],
    statusUrl: `/api/v1/pipeline/status?${statusQuery.toString()}`,
    startedAt: null,
    completedAt: now.toISOString(),
  };
}
