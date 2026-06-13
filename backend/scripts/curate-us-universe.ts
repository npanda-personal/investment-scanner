/**
 * curate-us-universe.ts — pick the actively-TRACKED US universe (~1,500 most-liquid
 * names + pinned indices/sector ETFs) and deactivate the rest, so stale, illiquid,
 * out-of-scope instruments stop flowing to ingestion and downstream analysis
 * (signals/strategies/scans/SEC). Tracked set is recorded in instrument_coverage;
 * enforcement is derived onto Stock.isActive (reversible, non-destructive).
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/curate-us-universe.ts
 *   npx ts-node --transpile-only scripts/curate-us-universe.ts --count=2000 --lookback=120
 *   npx ts-node --transpile-only scripts/curate-us-universe.ts --region=US
 *
 * Idempotent: a re-run fully re-ranks. Never touches non-US rows. Does NOT
 * start/stop servers and does NOT run prisma migrate.
 */
import prisma from '../src/db/prisma';
import { UniverseCurationService } from '../src/modules/market-data-foundation/market-data-foundation.universe-curation.service';

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : undefined;
}

async function main(): Promise<void> {
  const region = (arg('region') || 'US').toUpperCase();
  const count = Number(arg('count') || process.env.CURATION_TRACKED_COUNT || 1500);
  const lookback = Number(arg('lookback') || 90);
  console.log(`[curate] region=${region} targetTrackedCount=${count} lookbackBars=${lookback}`);
  const service = new UniverseCurationService();
  const summary = await service.curateRegion(region, { targetTrackedCount: count, lookbackBars: lookback });
  console.log('[curate] summary:', JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error('[curate] failed', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
