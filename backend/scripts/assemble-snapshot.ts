/**
 * assemble-snapshot.ts — run the snapshot assembler for one trading date and
 * print a summary of rows written and per-section provenance.
 *
 * Usage (from backend/):
 *   npx ts-node scripts/assemble-snapshot.ts
 *   npx ts-node scripts/assemble-snapshot.ts --date 2026-06-10
 *
 * Options:
 *   --date YYYY-MM-DD   Trading date to assemble. Defaults to the latest
 *                       instrument_eligibility tradingDate for the scope.
 *   --region IN         (default: IN)
 *   --assetType STOCK   (default: STOCK)
 */

import prisma from '../src/db/prisma';
import { SnapshotAssemblerService } from '../src/modules/snapshot-assembler';

// ── CLI / env config ─────────────────────────────────────────────────────────

const REGION = (process.env.REGION || 'IN').toUpperCase();
const ASSET_TYPE = (process.env.ASSET_TYPE || 'STOCK').toUpperCase();

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : undefined;
}

let TRADING_DATE: string | undefined = getArg('--date');

// ── Main ─────────────────────────────────────────────────────────────────────

async function resolveLatestTradingDate(): Promise<string> {
  const row = await prisma.instrumentEligibility.findFirst({
    orderBy: { tradingDate: 'desc' },
    select: { tradingDate: true },
  });
  if (!row) throw new Error('No instrument_eligibility rows found. Run the DATA_QUALITY stage first.');
  return row.tradingDate.toISOString().slice(0, 10);
}

async function main() {
  if (!TRADING_DATE) {
    console.log('No --date provided; resolving latest instrument_eligibility tradingDate...');
    TRADING_DATE = await resolveLatestTradingDate();
    console.log(`Using tradingDate=${TRADING_DATE}\n`);
  }

  console.log(`=== assemble-snapshot ===`);
  console.log(`tradingDate=${TRADING_DATE}  region=${REGION}  assetType=${ASSET_TYPE}\n`);

  const service = new SnapshotAssemblerService();

  const t0 = Date.now();
  const summary = await service.assemble({
    tradingDate: TRADING_DATE,
    region: REGION,
    assetType: ASSET_TYPE,
  });
  const durationMs = Date.now() - t0;

  // ── Print summary ─────────────────────────────────────────────────────────

  console.log('=== SUMMARY ===');
  console.log(`Rows written:       ${summary.rowCount}`);
  console.log(`Snapshot version:   ${summary.snapshotVersion}`);
  console.log(`Duration:           ${(durationMs / 1000).toFixed(1)}s`);

  if (summary.warnings.length > 0) {
    console.log(`\nWarnings (${summary.warnings.length}):`);
    for (const w of summary.warnings) {
      console.log(`  [WARN] ${w}`);
    }
  }

  console.log('\nProvenance breakdown (rows per section per status):');
  const sections = Object.keys(summary.provenanceCounts) as Array<keyof typeof summary.provenanceCounts>;
  const colW = Math.max(...sections.map((s) => s.length), 12);
  const header = `  ${'Section'.padEnd(colW)}  ${'OK'.padStart(6)}  ${'STALE'.padStart(6)}  ${'FAILED'.padStart(6)}  ${'N_A'.padStart(6)}`;
  console.log(header);
  console.log(`  ${'-'.repeat(colW + 32)}`);
  for (const section of sections) {
    const c = summary.provenanceCounts[section];
    const line = `  ${section.padEnd(colW)}  ${String(c.OK).padStart(6)}  ${String(c.STALE).padStart(6)}  ${String(c.FAILED).padStart(6)}  ${String(c.N_A).padStart(6)}`;
    console.log(line);
  }

  if (summary.rowCount === 0) {
    process.exitCode = 1;
    console.error('\n[ERROR] 0 rows assembled — check the warnings above.');
  }
}

main()
  .catch((err) => {
    console.error('[assemble-snapshot] Fatal:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
