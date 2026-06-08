/**
 * Generate a current-date signal set for US equities (region='US').
 *
 * US analog of generate-current-signals.ts: picks the US mainboard universe with
 * enough price history (≥120 bars) and runs the region-scoped signal engine
 * as-of the latest available US trading date, so Signals / Screener / Market
 * Scans reflect a real US signal set.
 *
 * Run: npx ts-node --transpile-only scripts/generate-us-signals.ts
 */
import prisma from '../src/db/prisma';
import { SignalGenerationEngineService } from '../src/modules/signal-generation-engine/signal-generation-engine.service';

async function main() {
  const t0 = Date.now();
  const svc = new SignalGenerationEngineService();
  const region = (process.env.GEN_REGION || 'US').toUpperCase();

  const asOfRow = await prisma.$queryRawUnsafe<any[]>(
    `SELECT max(p.timestamp)::date AS d FROM price_ticks p
     JOIN stocks s ON s.symbol = p.symbol
     WHERE s.region='${region}' AND s."assetType"='STOCK'`,
  );
  const asOfDate = asOfRow[0]?.d ? new Date(asOfRow[0].d).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  const cap = Number(process.env.GEN_CAP || 1000);
  const minBars = Number(process.env.GEN_MIN_BARS || 120);
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT s.id FROM stocks s
     WHERE s.region='${region}' AND s."assetType"='STOCK' AND s."isActive" AND NOT s."isDelisted"
       AND (SELECT count(*) FROM price_ticks p WHERE p.symbol=s.symbol) >= ${minBars}
     ORDER BY (SELECT count(*) FROM price_ticks p WHERE p.symbol=s.symbol) DESC
     LIMIT ${cap}`,
  );
  const ids = rows.map((r) => r.id);
  console.log(`generate-${region}: ${ids.length} eligible US stocks (>=${minBars} bars), as-of ${asOfDate}`);
  if (ids.length === 0) { console.log('No eligible US stocks — seed prices first.'); return; }

  await svc.run({
    instrumentIds: ids,
    asOfDate,
    region,
    assetType: 'STOCK',
    useDataQualityFilter: process.env.GEN_NO_DQ ? false : true,
    researchContextMode: 'LIGHTWEIGHT',
    includeStrategyMatches: false,
  } as any);

  const dist = await prisma.$queryRawUnsafe<any[]>(
    `SELECT sr.direction, count(*) FROM signal_results sr
     JOIN stocks s ON s.id = sr."instrumentId"
     WHERE sr."generatedDate"::date = '${asOfDate}' AND s.region='${region}' GROUP BY sr.direction ORDER BY 2 DESC`,
  );
  console.log(`as-of ${asOfDate} ${region} signal_results by direction:`, dist.map((d) => `${d.direction}=${d.count}`).join(' ') || '(none)');
  console.log(`DONE in ${Math.round((Date.now() - t0) / 1000)}s`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
