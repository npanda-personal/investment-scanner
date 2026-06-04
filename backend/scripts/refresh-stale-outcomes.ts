/**
 * Ops script: recompute all currently-stale SignalOutcome rows.
 *
 * A row is "stale" when dataComplete=false and windowEndDate is in the past —
 * meaning it should have a forward return by now but does not (either it was
 * never computed, or it was invalidated because adjustedClose prices were
 * re-derived after a corporate-action import).
 *
 * This script:
 *   1. Finds all instrumentIds that have at least one stale outcome.
 *   2. Re-runs the quality-lab recalculate({ persistOutcomes: true }) path for
 *      those instruments in bounded batches, reusing the existing forward-return
 *      math (never duplicates it).
 *   3. Reports totals.
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/refresh-stale-outcomes.ts
 *   npx ts-node --transpile-only scripts/refresh-stale-outcomes.ts --dry-run
 *
 * Options:
 *   --dry-run   Report how many stale instruments exist; do not write anything.
 *   --limit N   Cap the number of stale instrumentIds fetched (default 500).
 */
import { SignalQualityLabService } from '../src/modules/signal-quality-lab/signal-quality-lab.service';
import { SignalQualityLabRepository } from '../src/modules/signal-quality-lab/signal-quality-lab.repository';
import prisma from '../src/db/prisma';

const BATCH_SIZE = 50;

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    limit: (() => {
      const idx = args.indexOf('--limit');
      if (idx >= 0 && args[idx + 1]) {
        const n = parseInt(args[idx + 1], 10);
        return Number.isFinite(n) && n > 0 ? n : 500;
      }
      return 500;
    })(),
  };
}

async function main() {
  const { dryRun, limit } = parseArgs();
  const repo = new SignalQualityLabRepository(prisma);
  const service = new SignalQualityLabService(repo);

  console.log(`refresh-stale-outcomes: scanning for stale outcomes (limit=${limit}, dryRun=${dryRun})...`);

  const staleInstrumentIds = await repo.findStaleOutcomeInstrumentIds(limit);

  if (staleInstrumentIds.length === 0) {
    console.log('No stale outcomes found. Nothing to do.');
    return;
  }

  console.log(`Found ${staleInstrumentIds.length} instrument(s) with stale outcomes.`);

  if (dryRun) {
    console.log('--dry-run: exiting without writing.');
    return;
  }

  const t0 = Date.now();
  let totalUpserted = 0;
  let totalMature = 0;
  let totalImmature = 0;
  let batchesDone = 0;
  let errors = 0;

  // Process in fixed-size batches, reusing the quality-lab recalculate path.
  for (let i = 0; i < staleInstrumentIds.length; i += BATCH_SIZE) {
    const batch = staleInstrumentIds.slice(i, i + BATCH_SIZE);

    try {
      const r: any = await service.recalculate({
        batchSize: batch.length,
        offset: 0,
        instrumentIds: batch,
        persistOutcomes: true,
      });

      totalUpserted += r.rowsUpserted ?? 0;
      totalMature += r.matureCount ?? 0;
      totalImmature += r.immatureCount ?? 0;
    } catch (err) {
      errors++;
      if (errors <= 5) {
        console.error(`  Error on batch starting at index ${i}:`, (err as Error).message);
      }
    }

    batchesDone++;
    const processed = Math.min(i + BATCH_SIZE, staleInstrumentIds.length);
    if (batchesDone % 10 === 0 || processed >= staleInstrumentIds.length) {
      const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);
      console.log(
        `  instruments=${processed}/${staleInstrumentIds.length} ` +
        `upserted=${totalUpserted} mature=${totalMature} immature=${totalImmature} ` +
        `errors=${errors} rss=${rss}MB elapsed=${Math.round((Date.now() - t0) / 1000)}s`
      );
    }
  }

  console.log(
    `DONE: instruments=${staleInstrumentIds.length} rowsUpserted=${totalUpserted} ` +
    `mature=${totalMature} immature=${totalImmature} errors=${errors} ` +
    `elapsed=${Math.round((Date.now() - t0) / 1000)}s`
  );

  if (errors > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
