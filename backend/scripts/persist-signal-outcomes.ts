/**
 * Persist signal forward-return outcomes for all signals (bounded loop over
 * recalculate). Idempotent — re-running refreshes values (e.g. after a
 * corporate-action re-adjustment changes adjustedClose).
 *
 * Run: npx ts-node --transpile-only scripts/persist-signal-outcomes.ts
 */
import { SignalQualityLabService } from '../src/modules/signal-quality-lab/signal-quality-lab.service';
import { SignalQualityLabRepository } from '../src/modules/signal-quality-lab/signal-quality-lab.repository';
import prisma from '../src/db/prisma';

async function main() {
  const service = new SignalQualityLabService(new SignalQualityLabRepository(prisma));
  const t0 = Date.now();
  let offset = 0, hasMore = true, upserted = 0, mature = 0, total = 0, batches = 0;

  while (hasMore) {
    const r: any = await service.recalculate({ batchSize: 100, offset, persistOutcomes: true });
    upserted += r.rowsUpserted ?? 0;
    mature += r.matureCount ?? 0;
    total = r.totalCount ?? total;
    offset = r.nextOffset ?? offset + (r.processedCount ?? 0);
    hasMore = !!r.hasMore;
    batches += 1;
    if (batches % 20 === 0 || !hasMore) {
      const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);
      console.log(`offset=${offset}/${total} upserted=${upserted} mature=${mature} rss=${rss}MB elapsed=${Math.round((Date.now() - t0) / 1000)}s`);
    }
  }
  console.log(`DONE: offset=${offset} rowsUpserted=${upserted} mature=${mature} elapsed=${Math.round((Date.now() - t0) / 1000)}s`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
