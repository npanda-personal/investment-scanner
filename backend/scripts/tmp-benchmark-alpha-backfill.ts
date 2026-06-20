/* TEMP one-off: backfill benchmarkReturnPercent/alphaPercent on signal_outcomes
 * via the shipped CB-8 recalculate path. Idempotent (upsert by signalResultId+horizon).
 * Hardened: per-batch timeout + skip so one hung batch can't park the whole run.
 * Deleted after use. */
import { SignalQualityLabService } from '../src/modules/signal-quality-lab/signal-quality-lab.service';
import prisma from '../src/db/prisma';

const BATCH = 100;
const BATCH_TIMEOUT_MS = 150_000;
// Resume IN from 18600 (0–18500 completed in prior run, 90k rows upserted).
const START_OFFSET: Record<string, number> = { IN: 18600, US: 0, EU: 0 };

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${ms}ms @ ${label}`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

async function backfillRegion(svc: SignalQualityLabService, region: string) {
  let offset = START_OFFSET[region] ?? 0;
  let total = Number.POSITIVE_INFINITY; // learned from the first successful batch
  let batches = 0;
  let processed = 0;
  let rows = 0;
  const skipped: number[] = [];
  while (offset < total) {
    try {
      const res: any = await withTimeout(
        svc.recalculate({ persistOutcomes: true, region, batchSize: BATCH, offset } as any),
        BATCH_TIMEOUT_MS,
        `${region}@${offset}`,
      );
      if (Number.isFinite(res.totalCount)) total = res.totalCount;
      processed += res.signalsProcessed ?? 0;
      rows += res.rowsUpserted ?? 0;
      batches += 1;
      if (batches % 20 === 0) {
        console.log(`[${region}] batch ${batches} offset=${offset} processed=${processed} rowsUpserted=${rows} total=${total}`);
      }
      offset = res.nextOffset != null ? res.nextOffset : offset + BATCH;
      if (!res.hasMore) break;
    } catch (err) {
      console.log(`[${region}] SKIP offset=${offset}: ${(err as Error).message}`);
      skipped.push(offset);
      offset += BATCH;
      if (!Number.isFinite(total) && skipped.length >= 50) {
        console.log(`[${region}] ABORT: 50 skips before any total was learned`);
        break;
      }
    }
  }
  console.log(`[${region}] DONE batches=${batches} processed=${processed} rowsUpserted=${rows} skipped=[${skipped.join(',')}]`);
}

(async () => {
  try {
    const svc = new SignalQualityLabService();
    for (const region of ['IN', 'US', 'EU']) {
      console.log(`=== backfilling ${region} (from offset ${START_OFFSET[region] ?? 0}) ===`);
      await backfillRegion(svc, region);
    }
    console.log('ALL DONE');
  } catch (err) {
    console.error('BACKFILL FAILED:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
