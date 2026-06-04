/**
 * Bounded, regime-spanning TRACK-RECORD backfill (task #14, reframed).
 *
 * Purpose (post-pivot): the signal score is a research-WORTHINESS ranking, not a
 * return forecast. This backfill seeds an HONEST historical track record into
 * signal_outcomes (read by the Scorecard API) across multiple market regimes —
 * NOT to validate a prediction claim. Bounded for cost-appropriateness:
 *   - universe: eligible mainboard (NSE_EQUITY_SECURITIES) with >= MIN_BARS history, capped.
 *   - grid: quarterly as-of dates over the data-rich, corporate-action-covered period.
 *   - point-in-time: each run slices prices/fundamentals/DQ as-of the date (no look-ahead).
 *   - regime gate: historical as-of dates have no persisted market-context snapshot, so
 *     shorts are NOT regime-gated here (correct — no fabrication); the track record shows
 *     ungated short performance honestly.
 *
 * Run: npx ts-node --transpile-only scripts/backfill-track-record.ts
 */
import prisma from '../src/db/prisma';
import { SignalGenerationEngineService } from '../src/modules/signal-generation-engine/signal-generation-engine.service';
import { SignalQualityLabService } from '../src/modules/signal-quality-lab/signal-quality-lab.service';
import { SignalQualityLabRepository } from '../src/modules/signal-quality-lab/signal-quality-lab.repository';

const MIN_BARS = 300;        // need enough history for indicators + a stable as-of slice
const UNIVERSE_CAP = 800;    // cost-appropriate bound
// Quarterly as-of dates, 2019Q1 .. 2025Q3 (60D forward matures within data-through ~2026-06).
const AS_OF: string[] = [];
for (let y = 2019; y <= 2025; y++) {
  for (const md of ['03-01', '06-01', '09-01', '12-01']) {
    if (y === 2025 && md === '12-01') continue; // keep last date <= 2025-09 so 60D matures
    AS_OF.push(`${y}-${md}`);
  }
}

async function universe(): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT s.id FROM stocks s
     WHERE s.region='IN' AND s."assetType"='STOCK' AND s."isActive" AND NOT s."isDelisted"
       AND s."catalogSource"='NSE_EQUITY_SECURITIES'
       AND (SELECT count(*) FROM price_ticks p WHERE p.symbol=s.symbol) >= ${MIN_BARS}
     ORDER BY (SELECT count(*) FROM price_ticks p WHERE p.symbol=s.symbol) DESC
     LIMIT ${UNIVERSE_CAP}`,
  );
  return rows.map((r) => r.id);
}

async function main() {
  const t0 = Date.now();
  const svc = new SignalGenerationEngineService();
  const ids = await universe();
  console.log(`track-record backfill: ${ids.length} eligible mainboard stocks x ${AS_OF.length} quarterly as-of dates`);

  for (const d of AS_OF) {
    try {
      await svc.run({ instrumentIds: ids, asOfDate: d, region: 'IN', assetType: 'STOCK', useDataQualityFilter: false, researchContextMode: 'LIGHTWEIGHT', includeStrategyMatches: false } as any);
    } catch (e) {
      console.error(`run ${d} error:`, (e as Error).message);
    }
    const c = await prisma.signalResult.count();
    console.log(`as-of ${d}: total signal_results now=${c} (elapsed ${Math.round((Date.now() - t0) / 1000)}s)`);
  }

  // Persist outcomes for the freshly generated signals.
  const qsvc = new SignalQualityLabService(new SignalQualityLabRepository(prisma) as any);
  let off = 0, more = true, up = 0;
  while (more) {
    const rr: any = await qsvc.recalculate({ batchSize: 100, offset: off, persistOutcomes: true } as any);
    up += rr.rowsUpserted ?? 0; off = rr.nextOffset ?? off + (rr.processedCount ?? 0); more = !!rr.hasMore;
  }
  console.log(`outcomes upserted: ${up}`);

  // Honest by-horizon, by-direction track record (NOT a monotonicity claim).
  const m = await prisma.$queryRawUnsafe<any[]>(
    `SELECT horizon, direction, count(*) n,
       round((100.0*count(*) FILTER (WHERE "forwardReturnPercent">0)/count(*))::numeric,1) win_pct,
       round((avg("forwardReturnPercent")*100)::numeric,2) avg_fwd_pct
     FROM signal_outcomes WHERE "dataComplete" AND horizon IN ('5D','10D','20D','60D')
     GROUP BY horizon, direction
     ORDER BY direction, CASE horizon WHEN '5D' THEN 1 WHEN '10D' THEN 2 WHEN '20D' THEN 3 ELSE 4 END`,
  );
  console.log('\n=== HONEST track record (win% and avg forward return by horizon x direction) ===');
  for (const row of m) console.log(`${row.direction} ${row.horizon}: n=${row.n} win=${row.win_pct}% avgFwd=${row.avg_fwd_pct}%`);
  console.log(`\nDONE in ${Math.round((Date.now() - t0) / 1000)}s`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
