import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Count BEFORE
  const stageBefore = await prisma.pipelineStageRun.count({ where: { status: 'PENDING' } });
  const runBefore = await prisma.pipelineRun.count({ where: { status: 'PENDING' } });
  console.log(`BEFORE: PENDING stage_runs=${stageBefore}, PENDING pipeline_runs=${runBefore}`);

  // Back up a sample so we can verify
  const sample = await prisma.pipelineStageRun.findMany({
    where: { status: 'PENDING' },
    select: { id: true, idempotencyKey: true, stageKey: true, createdAt: true, updatedAt: true },
    take: 5,
    orderBy: { createdAt: 'asc' },
  });
  console.log('Oldest 5 PENDING stage_runs (sample):', JSON.stringify(sample, null, 2));

  // Reap all stale PENDING stage_runs (older than 20 min = DEFAULT_ACTIVE_STALE_MS)
  const cutoff = new Date(Date.now() - 1_200_000); // 20 min
  const reaperError = 'reaped: stale-pending cleanup (one-time bulk)';
  const completedAt = new Date();

  const pendingStageResult = await prisma.pipelineStageRun.updateMany({
    where: {
      status: 'PENDING',
      updatedAt: { lt: cutoff },
      createdAt: { lt: cutoff },
    },
    data: {
      status: 'FAILED',
      completedAt,
      errors: [reaperError],
    },
  });
  console.log(`Reaped ${pendingStageResult.count} stale PENDING stage_runs`);

  // Reap parent pipeline_runs that are PENDING or RUNNING but have no active child stages left
  const candidateRuns = await prisma.pipelineRun.findMany({
    where: {
      status: { in: ['RUNNING', 'PENDING'] },
      updatedAt: { lt: cutoff },
    },
    select: { id: true },
  });

  let runRowsReaped = 0;
  if (candidateRuns.length > 0) {
    const candidateIds = candidateRuns.map((r) => r.id);
    const stillActiveStages = await prisma.pipelineStageRun.findMany({
      where: {
        pipelineRunId: { in: candidateIds },
        status: { in: ['RUNNING', 'PENDING'] },
      },
      select: { pipelineRunId: true },
    });
    const activeRunIds = new Set(stillActiveStages.map((s) => s.pipelineRunId));
    const idsToReap = candidateIds.filter((id) => !activeRunIds.has(id));
    if (idsToReap.length > 0) {
      const runResult = await prisma.pipelineRun.updateMany({
        where: { id: { in: idsToReap }, status: { in: ['RUNNING', 'PENDING'] } },
        data: { status: 'FAILED', completedAt, errors: [reaperError] },
      });
      runRowsReaped = runResult.count;
    }
  }
  console.log(`Reaped ${runRowsReaped} stale PENDING/RUNNING pipeline_runs`);

  // Count AFTER
  const stageAfter = await prisma.pipelineStageRun.count({ where: { status: 'PENDING' } });
  const runAfter = await prisma.pipelineRun.count({ where: { status: 'PENDING' } });
  console.log(`AFTER: PENDING stage_runs=${stageAfter}, PENDING pipeline_runs=${runAfter}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
