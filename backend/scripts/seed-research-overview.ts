/**
 * One-off seed: populate research_overview_snapshots via refreshOverview(), then
 * confirm that overview() (GET path, live=false) reads the persisted row AS-IS
 * without invoking any heavy compute methods.
 *
 * Run: npx ts-node scripts/seed-research-overview.ts
 */
import prisma from '../src/db/prisma';
import { ResearchHubService } from '../src/modules/research-hub/research-hub.service';

async function main() {
  console.log('[seed] Running refreshOverview to populate research_overview_snapshots...');
  const service = new ResearchHubService();
  const refreshed = await service.refreshOverview({ region: 'IN', assetType: 'STOCK' });

  console.log('[seed] refreshOverview complete.');
  console.log(`  generatedAt    : ${refreshed.generatedAt}`);
  console.log(`  marketGate     : ${refreshed.marketReadiness.marketGate}`);
  console.log(`  overallStatus  : ${refreshed.actionability.overallStatus}`);
  console.log(`  dataGaps       : ${refreshed.dataGaps.length}`);
  console.log(`  tradeCandidates: ${refreshed.researchPriorities.tradeCandidates.length}`);

  // Verify the row was persisted in research_overview_snapshots
  const row = await (prisma as any).researchOverviewSnapshot.findUnique({
    where: { region_assetType: { region: 'IN', assetType: 'STOCK' } },
    select: { id: true, marketGate: true, overallStatus: true, computedAt: true, dataGaps: true },
  });
  if (!row) {
    throw new Error('FAIL: no row found in research_overview_snapshots after refreshOverview');
  }
  console.log('\n[seed] Persisted row confirmed in research_overview_snapshots:');
  console.log(`  id            : ${row.id}`);
  console.log(`  marketGate    : ${row.marketGate}`);
  console.log(`  overallStatus : ${row.overallStatus}`);
  console.log(`  computedAt    : ${row.computedAt}`);
  console.log(`  dataGaps count: ${row.dataGaps.length}`);

  // Verify overview() (GET path) reads the snapshot WITHOUT recomputing.
  // Patch buildOverview to throw if called — proves heavy methods are not invoked.
  console.log('\n[seed] Calling overview() (live=false) — verifying buildOverview is NOT called...');
  const readService = new ResearchHubService();
  (readService as any).buildOverview = async () => {
    throw new Error('FAIL: buildOverview was called on the persisted-read GET path — contract violated');
  };
  const read = await readService.overview({ region: 'IN', assetType: 'STOCK', live: false });

  if (!read || !read.generatedAt) {
    throw new Error('FAIL: overview() returned empty/invalid response');
  }
  if (read.generatedAt !== refreshed.generatedAt) {
    throw new Error(`FAIL: overview() generatedAt (${read.generatedAt}) != refreshed generatedAt (${refreshed.generatedAt}) — not reading the persisted snapshot`);
  }

  console.log('[seed] overview() returned persisted snapshot AS-IS (no recompute):');
  console.log(`  generatedAt   : ${read.generatedAt}`);
  console.log(`  marketGate    : ${read.marketReadiness.marketGate}`);
  console.log(`  overallStatus : ${read.actionability.overallStatus}`);
  console.log('\n[seed] PASS — GET reads the snapshot; buildOverview was NOT called.');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('[seed] ERROR:', err.message || err);
  process.exit(1);
});
