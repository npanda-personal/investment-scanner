/**
 * seed-us-earnings-yahoo.ts — populate the FORWARD next-earnings date for region=US
 * from the FREE keyless Yahoo `quoteSummary` endpoint (calendarEvents module) into
 * `Fundamental.officialResultDate`, so the Earnings page "Upcoming Results" lights up.
 *
 * Why Yahoo (not SEC) for this: SEC EDGAR company-facts (`seed-us-earnings.ts`)
 * supplies PAST 10-Q/10-K filing dates only; it has no forward earnings-call date.
 * Yahoo's `calendarEvents.earnings.earningsDate` is the free source for the next
 * (forward) date. Sources stay in-policy: Yahoo free, no API key, no paid entity.
 *
 * Runs the shared region-parameterized Yahoo fundamentals ingest for region='US'
 * with bounded concurrency + a throttle + a consecutive-failure circuit breaker, so
 * a full ~1,500-symbol pass never hammers Yahoo. Idempotent: upserts Fundamental and
 * overwrites officialResultDate with the latest Yahoo date. Never touches non-US rows.
 *
 * This script does NOT trigger a snapshot/earnings refresh — the owner runs that
 * separately after ingest (see footer log line).
 *
 * Run (from backend/):
 *   npx ts-node --transpile-only scripts/seed-us-earnings-yahoo.ts                       # all active US stocks (cap 1500)
 *   npx ts-node --transpile-only scripts/seed-us-earnings-yahoo.ts --limit=200 --concurrency=6
 *   npx ts-node --transpile-only scripts/seed-us-earnings-yahoo.ts --symbols=AAPL,MSFT,NVDA
 *
 * Does NOT start/stop servers and does NOT run prisma migrate.
 */
import prisma from '../src/db/prisma';
import { yahooFundamentalsService } from '../src/modules/market-data-foundation/ingestion/market-data-foundation.yahoo-fundamentals.service';

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : undefined;
}

async function main(): Promise<void> {
  const region = (arg('region') || 'US').toUpperCase();
  const limit = Number(arg('limit') || 1500);
  const concurrency = Number(arg('concurrency') || process.env.MARKET_DATA_US_FETCH_CONCURRENCY || 6);
  const symbolsArg = arg('symbols');
  const symbols = symbolsArg
    ? symbolsArg.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
    : undefined;

  console.log(
    `[seed-us-earnings-yahoo] region=${region} ${symbols ? `symbols=${symbols.join(',')}` : `all-active cap=${limit}`} concurrency=${concurrency}`,
  );

  const summary = await yahooFundamentalsService.ingestForSymbols({
    region,
    limit,
    symbols,
    concurrency,
    onSymbolComplete: (symbol, info) => {
      if (info.index % 100 === 0 || info.index === info.total) {
        console.log(`  progress ${info.index}/${info.total} (last: ${symbol})`);
      }
    },
  });

  console.log(
    `[seed-us-earnings-yahoo] summary: processed=${summary.processed} updated=${summary.updated} ` +
      `officialResultDateWritten=${summary.earningsDates} noData/errors=${summary.noData} aborted=${summary.aborted}`,
  );
  summary.warnings.slice(0, 10).forEach((w) => console.warn(`[seed-us-earnings-yahoo]   warn: ${w}`));
  console.log(
    '[seed-us-earnings-yahoo] Done. Next: refresh the US earnings snapshot — ' +
      'POST /earnings/refresh body {"region":"US","assetType":"STOCK"} (owner runs this).',
  );
}

main()
  .catch((error) => {
    console.error('[seed-us-earnings-yahoo] failed', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
