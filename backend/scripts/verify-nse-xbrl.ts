/**
 * Verify the NSE XBRL fundamentals exporter against real filings for a few
 * known large-caps, so we can sanity-check the parsed revenue/netIncome/EPS
 * (and especially the SCALE) before any bulk ingest.
 *
 * Run: npx ts-node --transpile-only scripts/verify-nse-xbrl.ts
 */
import { NseXbrlFundamentalsCsvExporter } from '../src/modules/market-data-foundation/market-data-foundation.nse-xbrl-fundamentals-exporter';
import os from 'os';
import path from 'path';

async function main() {
  const symbols = ['RELIANCE', 'TCS', 'INFY'];
  const exporter = new NseXbrlFundamentalsCsvExporter();
  const result = await exporter.exportSymbols({
    symbols,
    outputDir: path.join(os.tmpdir(), 'verify-nse-xbrl'),
    maxQuarterlyPeriods: 2,
    maxAnnualPeriods: 1,
    validatedBy: 'VERIFY',
  });

  console.log('\n=== parsed rows (revenue/netIncome/eps should be ABSOLUTE INR) ===');
  for (const r of result.rows as any[]) {
    console.log(`${r.symbol} ${r.periodType} ${r.periodEndDate}: revenue=${r.revenue} netIncome=${r.netIncome} eps=${r.eps}`);
  }
  console.log('\n=== report ===');
  console.log(JSON.stringify({
    symbolCount: result.report?.symbolCount,
    rowsExported: result.report?.rowsExported,
    rowsSkipped: result.report?.rowsSkipped,
    missingFieldCounts: result.report?.missingFieldCounts,
    warnings: (result.report?.warnings || []).slice(0, 10),
  }, null, 2));
  console.log('\nSanity check (approx absolute INR, recent quarter): RELIANCE revenue ~2.3-2.5e12, TCS ~6.0-6.5e11, INFY ~3.8-4.2e11');
}

main().catch((e) => { console.error('VERIFY FAILED:', e?.message || e); process.exitCode = 1; });
