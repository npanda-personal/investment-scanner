/**
 * seed-us-short-volume.ts — backfill the US daily short-volume landing table
 * (us_short_volume) from FINRA's free Reg SHO daily short-sale-volume files.
 *
 * One light file fetch per trading day (CNMSshvol<YYYYMMDD>.txt, ~500KB, all US
 * symbols) — NO per-symbol calls. Restricted to the tracked US universe
 * (region='US', isActive). Idempotent (upsert on symbol+trading_date).
 *
 * Metric honesty: this is the DAILY SHORT-SALE VOLUME SHARE
 * (short_volume / total_volume) — a short-pressure proxy, NOT short interest.
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/seed-us-short-volume.ts
 *   npx ts-node --transpile-only scripts/seed-us-short-volume.ts --lookback=10
 *   npx ts-node --transpile-only scripts/seed-us-short-volume.ts --dates=2026-06-16,2026-06-17
 *
 * Does NOT start/stop servers, does NOT run prisma migrate, and does NOT
 * trigger snapshot refresh (this surfaces as a live persisted DB read on the
 * stock page, not snapshot-baked).
 */
import prisma from '../src/db/prisma';
import { FinraShortVolumeService } from '../src/modules/market-data-foundation/ingestion/us/market-data-foundation.finra-short-volume.service';

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : undefined;
}

async function main(): Promise<void> {
  const datesArg = arg('dates');
  const dates = datesArg
    ? datesArg
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean)
    : undefined;
  const lookbackDays = Number(arg('lookback') || 10);

  if (dates && dates.length > 0) {
    console.log(`[seed-us-short-volume] explicit dates=${dates.join(',')}`);
  } else {
    console.log(`[seed-us-short-volume] lookbackDays=${lookbackDays} (last N trading days)`);
  }

  const service = new FinraShortVolumeService();
  const summary = await service.ingest(dates && dates.length > 0 ? { dates } : { lookbackDays });

  console.log('[seed-us-short-volume] summary:', JSON.stringify(summary, null, 2));
  if (summary.warnings.length > 0) {
    console.log(`[seed-us-short-volume] ${summary.warnings.length} warning(s) above.`);
  }
}

main()
  .catch((error) => {
    console.error('[seed-us-short-volume] failed', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
