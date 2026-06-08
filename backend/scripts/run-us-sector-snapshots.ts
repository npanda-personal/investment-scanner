/**
 * run-us-sector-snapshots.ts — refresh US sector-rotation (sector-intelligence) snapshots.
 *
 * Reads the 11 seeded SPDR sector ETFs (XLK, XLF, XLV, XLE, XLY, XLP, XLI, XLB, XLRE, XLU, XLC)
 * already present in the DB as assetType='ETF', region='US', and produces US sector_snapshots rows.
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/run-us-sector-snapshots.ts
 *
 * Override region via GEN_REGION env var (default: US):
 *   GEN_REGION=US npx ts-node --transpile-only scripts/run-us-sector-snapshots.ts
 */
import prisma from '../src/db/prisma';
import { MarketContextIntelligenceService } from '../src/modules/market-context-intelligence/market-context-intelligence.service';

const REGION = (process.env.GEN_REGION || 'US').trim().toUpperCase();

async function main() {
  console.log(`[run-us-sector-snapshots] Refreshing sector snapshots for region=${REGION} assetType=STOCK ...`);
  const svc = new MarketContextIntelligenceService();
  const result = await svc.refreshSectorSnapshots({ region: REGION, assetType: 'STOCK' });
  console.log(`[run-us-sector-snapshots] status=${result.status} saved=${result.savedCount} skipped=${result.skippedCount} total=${result.totalCount}`);
  if (result.sectors.length > 0) {
    console.log('[run-us-sector-snapshots] sectors:');
    for (const s of result.sectors) {
      console.log(`  ${s.sector.padEnd(30)} score=${s.sectorScore.toString().padStart(3)} class=${s.classification} 1W=${s.return1W?.toFixed(2) ?? 'N/A'} 1M=${s.return1M?.toFixed(2) ?? 'N/A'} 3M=${s.return3M?.toFixed(2) ?? 'N/A'}`);
    }
  }
  if (result.warnings.length > 0) {
    console.warn('[run-us-sector-snapshots] warnings:', result.warnings);
  }
  if (result.errors.length > 0) {
    console.error('[run-us-sector-snapshots] errors:', result.errors);
  }
  console.log('[run-us-sector-snapshots] Done.');
}

main()
  .catch((e) => { console.error('[run-us-sector-snapshots] Fatal:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
