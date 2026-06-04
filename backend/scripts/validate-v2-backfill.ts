/**
 * Validate signal-engine-v2: generate point-in-time signals for a sample of
 * liquid mainboard stocks across historical as-of dates (outcomes can mature),
 * persist outcomes, and measure whether the score now predicts forward returns
 * (monotonic) — vs v1's inverted/anti-predictive result.
 *
 * Run: npx ts-node --transpile-only scripts/validate-v2-backfill.ts
 */
import prisma from '../src/db/prisma';
import { SignalGenerationEngineService } from '../src/modules/signal-generation-engine/signal-generation-engine.service';
import { SignalQualityLabService } from '../src/modules/signal-quality-lab/signal-quality-lab.service';
import { SignalQualityLabRepository } from '../src/modules/signal-quality-lab/signal-quality-lab.repository';

// as-of dates with >= ~60 trading days of forward data before 2026-06-03 (so 60D matures)
const AS_OF = ['2024-06-03', '2024-09-02', '2024-12-02', '2025-03-03', '2025-06-02', '2025-09-01', '2025-12-01', '2026-01-02'];

async function sampleIds(): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT s.id FROM stocks s
     WHERE s.region='IN' AND s."assetType"='STOCK' AND s."isActive" AND NOT s."isDelisted"
       AND s."catalogSource"='NSE_EQUITY_SECURITIES'
       AND (SELECT count(*) FROM price_ticks p WHERE p.symbol=s.symbol) >= 300
     ORDER BY (SELECT count(*) FROM price_ticks p WHERE p.symbol=s.symbol) DESC
     LIMIT 400`,
  );
  return rows.map((r) => r.id);
}

async function main() {
  const t0 = Date.now();
  const svc = new SignalGenerationEngineService();
  const ids = await sampleIds();
  console.log(`sample: ${ids.length} mainboard stocks; ${AS_OF.length} as-of dates`);

  for (const d of AS_OF) {
    try {
      await svc.run({ instrumentIds: ids, asOfDate: d, region: 'IN', assetType: 'STOCK', useDataQualityFilter: false, researchContextMode: 'LIGHTWEIGHT', includeStrategyMatches: false } as any);
    } catch (e) { console.error(`run ${d} error:`, (e as Error).message); }
    const c = await prisma.signalResult.count();
    console.log(`as-of ${d}: total signal_results now=${c} (elapsed ${Math.round((Date.now() - t0) / 1000)}s)`);
  }

  // persist outcomes for the freshly generated v2 signals
  const qsvc = new SignalQualityLabService(new SignalQualityLabRepository(prisma) as any);
  let off = 0, more = true, up = 0;
  while (more) {
    const rr: any = await qsvc.recalculate({ batchSize: 100, offset: off, persistOutcomes: true } as any);
    up += rr.rowsUpserted ?? 0; off = rr.nextOffset ?? off + (rr.processedCount ?? 0); more = !!rr.hasMore;
  }
  console.log(`outcomes upserted: ${up}`);

  const m = await prisma.$queryRawUnsafe<any[]>(
    `WITH x AS (SELECT horizon, score, "forwardReturnPercent" r,
       CASE WHEN score<40 THEN '0-39' WHEN score<60 THEN '40-59' WHEN score<70 THEN '60-69' WHEN score<80 THEN '70-79' ELSE '80-100' END b
       FROM signal_outcomes WHERE "dataComplete" AND horizon IN ('5D','10D') AND direction='BULLISH')
     SELECT horizon, b AS bucket, count(*) n,
       round((100.0*count(*) FILTER (WHERE r>0)/count(*))::numeric,1) win_pct,
       round((avg(r)*100)::numeric,2) avg_fwd_pct
     FROM x GROUP BY horizon, b ORDER BY horizon, b`,
  );
  console.log('\n=== v2 BULLISH score-bucket vs forward return (expect MONOTONIC: higher bucket -> higher win/return) ===');
  for (const row of m) console.log(`${row.horizon} ${row.bucket}: n=${row.n} win=${row.win_pct}% avgFwd=${row.avg_fwd_pct}%`);

  const bear = await prisma.$queryRawUnsafe<any[]>(
    `SELECT count(*) n, round((100.0*count(*) FILTER (WHERE "forwardReturnPercent"<0)/count(*))::numeric,1) short_win_pct
     FROM signal_outcomes WHERE "dataComplete" AND horizon='5D' AND direction='BEARISH'`,
  );
  console.log('\n=== v2 BEARISH 5D ==='); console.log(bear[0]);
  console.log(`\nDONE in ${Math.round((Date.now() - t0) / 1000)}s`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
