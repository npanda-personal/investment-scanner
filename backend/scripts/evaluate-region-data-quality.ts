/**
 * evaluate-region-data-quality.ts — run + persist Data Quality evaluations for a
 * region's stocks (default EU), so signal generation's trusted-read DQ filter
 * (filterEligibleInstruments) can mark them eligible/READY.
 *
 * Without persisted DQ evaluations the signal engine's DQ filter SKIPs every
 * instrument (missingQualityBehavior='SKIP') → no trusted signals are served.
 *
 * Run: GEN_REGION=EU npx ts-node --transpile-only scripts/evaluate-region-data-quality.ts
 */
import prisma from '../src/db/prisma';
import { DataQualityEngineService } from '../src/modules/data-quality-engine/data-quality-engine.service';

async function main() {
  const region = (process.env.GEN_REGION || 'EU').toUpperCase();
  const assetType = (process.env.GEN_ASSET || 'STOCK').toUpperCase();
  const batchSize = Number(process.env.DQ_BATCH || 100);
  const svc = new DataQualityEngineService();

  let offset = 0;
  let processed = 0, evaluated = 0, failed = 0, totalCount = 0;
  // Paginate the region until there's no more.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const r = await svc.evaluate({ region, assetType, batchSize, offset });
    totalCount = r.totalCount;
    processed += r.processedCount;
    evaluated += r.evaluatedCount;
    failed += r.failedCount;
    console.log(`[dq-${region}] offset=${offset} processed=${r.processedCount} evaluated=${r.evaluatedCount} failed=${r.failedCount} (total ${processed}/${totalCount})`);
    if (r.nextOffset == null || !r.hasMore) break;
    offset = r.nextOffset;
  }
  console.log(`[dq-${region}] DONE processed=${processed} evaluated=${evaluated} failed=${failed} totalCount=${totalCount}`);
}

main().catch((e) => { console.error('[dq] Fatal:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
