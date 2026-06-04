/**
 * One parallel worker of the fundamentals ingest. Processes a disjoint partition
 * of the still-uncovered MAINBOARD symbols (so multiple workers don't overlap).
 *   npx ts-node --transpile-only scripts/ingest-fundamentals-partition.ts <index> <total>
 * e.g. run 3 workers: index 0/3, 1/3, 2/3.
 */
import prisma from '../src/db/prisma';
import { MarketDataFoundationService } from '../src/modules/market-data-foundation/market-data-foundation.service';
import { NseXbrlFundamentalsCsvExporter } from '../src/modules/market-data-foundation/market-data-foundation.nse-xbrl-fundamentals-exporter';
import os from 'os';
import path from 'path';

async function main() {
  const index = Number(process.argv[2] ?? 0);
  const total = Number(process.argv[3] ?? 1);
  const service = new MarketDataFoundationService();
  const exporter = new NseXbrlFundamentalsCsvExporter();

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT s.symbol, row_number() OVER (ORDER BY s.symbol) AS rn
     FROM stocks s
     WHERE s.region='IN' AND s."assetType"='STOCK' AND s."isActive" AND NOT s."isDelisted"
       AND s."catalogSource"='NSE_EQUITY_SECURITIES'
       AND NOT EXISTS (SELECT 1 FROM fundamentals f WHERE f."stockId"=s.id)`,
  );
  const mine = rows.filter((r) => Number(r.rn) % total === index).map((r) => r.symbol);
  console.log(`[w${index}/${total}] uncovered mainboard in partition: ${mine.length}`);

  const t0 = Date.now();
  const batchSize = 15;
  let imported = 0, batches = 0, errors = 0;
  for (let i = 0; i < mine.length; i += batchSize) {
    const batch = mine.slice(i, i + batchSize);
    batches += 1;
    try {
      const ex = await exporter.exportSymbols({
        symbols: batch,
        outputDir: path.join(os.tmpdir(), `nse-xbrl-w${index}`),
        maxQuarterlyPeriods: 4, maxAnnualPeriods: 2, validatedBy: 'NSE_XBRL_AUTO',
      });
      if (ex.csvText && ex.rows.length) {
        const r: any = await service.importBulkManualVerifiedFundamentals({ csvText: ex.csvText, region: 'IN', assetType: 'STOCK', fileName: `w${index}-b${batches}.csv` });
        imported += r.rowsImported ?? 0;
      }
    } catch (e) { errors += 1; if (errors <= 3) console.error(`[w${index}] batch err:`, (e as Error).message); }
    if (batches % 10 === 0) console.log(`[w${index}] batch ${batches}/${Math.ceil(mine.length / batchSize)} imported=${imported} errors=${errors} ${Math.round((Date.now() - t0) / 1000)}s`);
  }
  console.log(`[w${index}] DONE: processed ${mine.length} symbols, imported ${imported} rows, ${errors} errors, ${Math.round((Date.now() - t0) / 1000)}s`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
