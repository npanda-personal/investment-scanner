/**
 * Bulk-ingest NSE XBRL fundamentals for the whole active IN/STOCK universe.
 * Loops importNseXbrlFundamentalsForUniverse in chunks (uncovered-first, skips
 * already-stored periods) and logs coverage progress. Resumable: re-running
 * continues from remaining gaps.
 *
 * Run: npx ts-node --transpile-only scripts/ingest-fundamentals-universe.ts
 */
import { MarketDataFoundationService } from '../src/modules/market-data-foundation/market-data-foundation.service';
import prisma from '../src/db/prisma';

async function coverage(): Promise<{ withFund: number; total: number }> {
  const total = await prisma.stock.count({ where: { region: 'IN', assetType: 'STOCK', isActive: true, isDelisted: false } });
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT count(DISTINCT s.id)::int AS n FROM stocks s JOIN fundamentals f ON f."stockId"=s.id WHERE s.region='IN' AND s."assetType"='STOCK' AND s."isActive" AND NOT s."isDelisted"`,
  );
  return { withFund: Number(rows[0]?.n ?? 0), total };
}

async function main() {
  const service = new MarketDataFoundationService();
  const t0 = Date.now();
  const start = await coverage();
  console.log(`START coverage: ${start.withFund}/${start.total}`);

  let chunk = 0;
  let prevWith = start.withFund;
  let stagnant = 0;
  while (true) {
    chunk += 1;
    const res: any = await service.importNseXbrlFundamentalsForUniverse({
      region: 'IN', assetType: 'STOCK',
      symbolBatchSize: 20,
      maxSymbols: 200,
      maxQuarterlyPeriods: 4,
      maxAnnualPeriods: 2,
      delayBetweenBatchesMs: 1500,
    });
    const cov = await coverage();
    const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);
    console.log(`chunk ${chunk}: processed=${res.symbolsProcessed} rowsImported=${res.rowsImported} skippedExisting=${res.rowsSkippedExisting} errors=${(res.errors||[]).length} | coverage=${cov.withFund}/${cov.total} rss=${rss}MB elapsed=${Math.round((Date.now()-t0)/1000)}s`);
    if ((res.errors||[]).length) console.log('  sample errors:', (res.errors||[]).slice(0,3));
    // Stop when coverage stops improving across 2 consecutive chunks (gaps are unfetchable) or fully covered.
    if (cov.withFund >= cov.total) { console.log('FULL COVERAGE'); break; }
    if (cov.withFund <= prevWith) { stagnant += 1; } else { stagnant = 0; }
    if (stagnant >= 2) { console.log('NO FURTHER PROGRESS (remaining symbols have no fetchable XBRL)'); break; }
    prevWith = cov.withFund;
    if (chunk > 60) { console.log('chunk cap reached'); break; }
  }
  const end = await coverage();
  console.log(`DONE coverage: ${end.withFund}/${end.total} (+${end.withFund-start.withFund}) in ${Math.round((Date.now()-t0)/1000)}s`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
