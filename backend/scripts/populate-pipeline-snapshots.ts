/**
 * One-time populate of the new persisted-read snapshot tables (P-3/P-5) from already-persisted
 * data — no external fetch. Mirrors what the scheduled pipeline stages do, run manually so the
 * new persisted-read screens aren't empty before the next daily run.
 *
 * Usage: npx ts-node scripts/populate-pipeline-snapshots.ts [marketScan|research|workbench|all]
 */
import prisma from '../src/db/prisma';

async function run() {
  const which = process.argv[2] || 'all';
  const region = 'IN';
  const assetType = 'STOCK';

  if (which === 'marketScan' || which === 'all') {
    const { MarketDataFoundationService } = await import('../src/modules/market-data-foundation/market-data-foundation.service');
    const svc = new MarketDataFoundationService();
    const res = await (svc as any).refreshMarketScanSnapshots({ region, assetType });
    console.log('[market-scan] ', JSON.stringify(res?.summary ?? res));
  }

  if (which === 'research' || which === 'all') {
    const { ResearchHubService } = await import('../src/modules/research-hub/research-hub.service');
    const svc = new ResearchHubService();
    const res = await (svc as any).refreshOverview({ region, assetType });
    console.log('[research-overview] refreshed:', !!res);
  }

  if (which === 'workbench' || which === 'all') {
    const { WorkbenchRefreshService } = await import('../src/modules/stock-research-workbench');
    const svc = new WorkbenchRefreshService();
    // default: active IN/STOCK universe, bounded concurrency inside the service
    const res = await (svc as any).refreshWorkbenchSnapshots({ region, assetType });
    console.log('[workbench] ', JSON.stringify({ totalCount: res?.totalCount, processedCount: res?.processedCount, succeededCount: res?.succeededCount, failedCount: res?.failedCount }));
  }

  const counts = await prisma.$queryRawUnsafe<any[]>(
    `SELECT 'workbench' AS t, count(*)::int AS n FROM workbench_snapshots
     UNION ALL SELECT 'market_scan', count(*)::int FROM market_scan_snapshots
     UNION ALL SELECT 'research_overview', count(*)::int FROM research_overview_snapshots`,
  );
  console.log('[counts]', JSON.stringify(counts));
  await prisma.$disconnect();
}

run().catch((e) => { console.error('populate failed:', e); process.exit(1); });
