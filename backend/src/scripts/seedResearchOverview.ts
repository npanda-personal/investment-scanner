/**
 * One-off seed script: runs refreshOverview() so that research_overview_snapshots
 * is populated, then calls overview() to confirm the GET reads the persisted row
 * without invoking any heavy build methods.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/seedResearchOverview.ts
 */
import { ResearchHubService } from '../modules/research-hub/research-hub.service';
import prisma from '../db/prisma';

async function main() {
  console.log('[seed] Running refreshOverview to populate research_overview_snapshots...');
  const service = new ResearchHubService();
  const refreshed = await service.refreshOverview({ region: 'IN', assetType: 'STOCK' });

  console.log('[seed] refreshOverview complete.');
  console.log(`  generatedAt   : ${refreshed.generatedAt}`);
  console.log(`  marketGate    : ${refreshed.marketReadiness.marketGate}`);
  console.log(`  overallStatus : ${refreshed.actionability.overallStatus}`);
  console.log(`  dataGaps      : ${refreshed.dataGaps.length}`);
  console.log(`  tradeCandidates: ${refreshed.researchPriorities.tradeCandidates.length}`);

  // Verify the row was persisted
  const row = await (prisma as any).researchOverviewSnapshot.findUnique({
    where: { region_assetType: { region: 'IN', assetType: 'STOCK' } },
    select: { id: true, marketGate: true, overallStatus: true, computedAt: true },
  });
  if (!row) {
    throw new Error('FAIL: no row found in research_overview_snapshots after refresh');
  }
  console.log('\n[seed] Persisted row found in research_overview_snapshots:');
  console.log(`  id           : ${row.id}`);
  console.log(`  marketGate   : ${row.marketGate}`);
  console.log(`  overallStatus: ${row.overallStatus}`);
  console.log(`  computedAt   : ${row.computedAt}`);

  // Now verify that overview() (GET path) returns the persisted row without recomputing.
  // We instrument the service to detect whether buildOverview is called.
  console.log('\n[seed] Calling overview() (GET path, live=false) — must NOT fan out to services...');
  const serviceForRead = new ResearchHubService();
  // Patch buildOverview to throw if called — proves GET path skips it
  (serviceForRead as any).buildOverview = async () => {
    throw new Error('FAIL: buildOverview was called on the GET path — persisted-read contract violated');
  };
  const read = await serviceForRead.overview({ region: 'IN', assetType: 'STOCK', live: false });

  if (!read.generatedAt) {
    throw new Error('FAIL: overview() returned empty/invalid response');
  }
  console.log('[seed] overview() returned persisted snapshot AS-IS:');
  console.log(`  generatedAt   : ${read.generatedAt}`);
  console.log(`  marketGate    : ${read.marketReadiness.marketGate}`);
  console.log(`  overallStatus : ${read.actionability.overallStatus}`);
  console.log('\n[seed] PASS — GET reads the snapshot row; buildOverview was NOT called.');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('[seed] ERROR:', err);
  process.exit(1);
});
