/**
 * Refresh SignalCalibrationResult across the (regenerated) corpus (#50).
 * The clean regenerate (#49) rebuilt signals/outcomes under corrected logic, so the
 * prior calibration rows are stale. This loops the calibration engine over the full
 * signal universe (batched via the response's hasMore/nextOffset) and persists fresh
 * calibrated scores, so the Signals dashboard / workbench (#30) surface correct data.
 *
 * Run: npx ts-node --transpile-only scripts/calibrate-all.ts
 */
import prisma from '../src/db/prisma';
import { SignalCalibrationEngineService } from '../src/modules/signal-calibration-engine/signal-calibration-engine.service';

async function main() {
  const t0 = Date.now();
  const svc = new SignalCalibrationEngineService();
  const horizon = (process.env.CALIB_HORIZON as any) || '20D';
  const batchSize = Number(process.env.CALIB_BATCH || 100);
  let offset = 0;
  let more = true;
  let persisted = 0;
  let batches = 0;
  let total = 0;
  while (more) {
    const r: any = await svc.run({ batchSize, offset, region: 'IN', assetType: 'STOCK', horizon } as any);
    persisted += r.results?.length ?? 0;
    total = r.totalCount ?? total;
    offset = r.nextOffset ?? offset + (r.processedCount ?? 0);
    more = !!r.hasMore;
    batches += 1;
    if (batches % 5 === 0 || !more) {
      console.log(`batch ${batches} offset=${offset}/${total} persisted=${persisted} ${Math.round((Date.now() - t0) / 1000)}s`);
    }
    if (batches > 600) { console.warn('safety stop at 600 batches'); break; }
  }
  const rows = await prisma.signalCalibrationResult.count().catch(() => -1);
  console.log(`DONE: persisted ${persisted} calibrations across ${batches} batches; SignalCalibrationResult rows now=${rows}; ${Math.round((Date.now() - t0) / 1000)}s`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
