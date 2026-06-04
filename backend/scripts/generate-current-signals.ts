/**
 * Generate a FULL current-date signal set for daily use (daily-workflow hardening).
 *
 * Only ~9 signals existed at the current as-of, leaving the daily dashboard/today-review
 * nearly empty of actionable names. This generates point-in-time signals as-of the latest
 * available trading date (avoids false-staleness vs wall-clock) across the eligible IN
 * mainboard universe, so the Signals dashboard + today-review reflect a real current set.
 *
 * Run: npx ts-node --transpile-only scripts/generate-current-signals.ts
 */
import prisma from '../src/db/prisma';
import { SignalGenerationEngineService } from '../src/modules/signal-generation-engine/signal-generation-engine.service';

async function main() {
  const t0 = Date.now();
  const svc = new SignalGenerationEngineService();

  const asOfRow = await prisma.$queryRawUnsafe<any[]>(
    `SELECT max(p.timestamp)::date AS d FROM price_ticks p
     JOIN stocks s ON s.symbol = p.symbol
     WHERE s.region='IN' AND s."assetType"='STOCK' AND s."catalogSource"='NSE_EQUITY_SECURITIES'`,
  );
  const asOfDate = asOfRow[0]?.d ? new Date(asOfRow[0].d).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  const cap = Number(process.env.GEN_CAP || 1000);
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT s.id FROM stocks s
     WHERE s.region='IN' AND s."assetType"='STOCK' AND s."isActive" AND NOT s."isDelisted"
       AND s."catalogSource"='NSE_EQUITY_SECURITIES'
       AND (SELECT count(*) FROM price_ticks p WHERE p.symbol=s.symbol) >= 250
     ORDER BY (SELECT count(*) FROM price_ticks p WHERE p.symbol=s.symbol) DESC
     LIMIT ${cap}`,
  );
  const ids = rows.map((r) => r.id);
  console.log(`generate-current: ${ids.length} eligible mainboard stocks, as-of ${asOfDate}`);

  const before = await prisma.signalResult.count({ where: { generatedDate: new Date(asOfDate) } as any }).catch(() => -1);
  await svc.run({
    instrumentIds: ids,
    asOfDate,
    region: 'IN',
    assetType: 'STOCK',
    useDataQualityFilter: true,
    researchContextMode: 'LIGHTWEIGHT',
    includeStrategyMatches: false,
  } as any);

  const dist = await prisma.$queryRawUnsafe<any[]>(
    `SELECT direction, count(*) FROM signal_results WHERE "generatedDate"::date = '${asOfDate}' GROUP BY direction ORDER BY 2 DESC`,
  );
  console.log(`as-of ${asOfDate} signal_results by direction:`, dist.map((d) => `${d.direction}=${d.count}`).join(' '));
  console.log(`(was ${before} before) DONE in ${Math.round((Date.now() - t0) / 1000)}s`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
