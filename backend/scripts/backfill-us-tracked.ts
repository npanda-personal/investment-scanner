/**
 * backfill-us-tracked.ts — bring the actively-tracked US universe (the ~1,500
 * curated names; whatever is Stock.isActive=true for region=US) current by pulling
 * the recent EOD window from Yahoo with bounded concurrency + circuit breaker.
 *
 * One-time catch-up after curation, and a safe manual "refresh tracked US" tool.
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/backfill-us-tracked.ts
 *   npx ts-node --transpile-only scripts/backfill-us-tracked.ts --lookback=15 --concurrency=6
 *
 * Idempotent (dedupes on symbol+timestamp). Never touches non-US rows. Does NOT
 * start/stop servers and does NOT run prisma migrate.
 */
import prisma from '../src/db/prisma';
import { UsEquityIngestionService } from '../src/modules/market-data-foundation/ingestion/us/market-data-foundation.us-equity-ingestion.service';

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : undefined;
}

async function main(): Promise<void> {
  const lookbackDays = Number(arg('lookback') || 15);
  const concurrency = Number(arg('concurrency') || process.env.MARKET_DATA_US_FETCH_CONCURRENCY || 6);
  console.log(`[backfill-us-tracked] lookbackDays=${lookbackDays} concurrency=${concurrency}`);
  const service = new UsEquityIngestionService();
  const summary = await service.backfillPrices({
    lookbackDays,
    concurrency,
    onSymbolComplete: (symbol, info) => {
      if (info.index % 200 === 0 || info.index === info.total) {
        console.log(`  progress ${info.index}/${info.total} (last: ${symbol})`);
      }
    },
  });
  console.log('[backfill-us-tracked] summary:', JSON.stringify({ ...summary, changedSymbols: summary.changedSymbols.length }, null, 2));
}

main()
  .catch((error) => {
    console.error('[backfill-us-tracked] failed', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
