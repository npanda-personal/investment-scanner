/* Temporary QA inspection script — delete after the QA loop. */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const w = await p.snapshotWatermark.findMany({ orderBy: { assembledAt: 'desc' }, take: 3 });
  console.log('WATERMARKS:', JSON.stringify(w));
  const counts = await p.$queryRawUnsafe(
    'SELECT "snapshotVersion", count(*)::int AS n FROM daily_instrument_snapshot GROUP BY 1 ORDER BY 1'
  );
  console.log('VERSION COUNTS:', JSON.stringify(counts));
  for (const key of ['SIGNAL_CALIBRATION', 'STRATEGY_DECISION', 'SNAPSHOT_ASSEMBLER']) {
    const st = await p.pipelineStageRun.findFirst({ where: { stageKey: key }, orderBy: { startedAt: 'desc' } });
    console.log(`${key} status=${st.status} succeeded=${st.succeededCount} meta=`, JSON.stringify(st.metadata).slice(0, 500));
  }
  await p.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
