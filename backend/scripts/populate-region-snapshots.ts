/**
 * Populate persisted-read snapshot tables for a region (US/EU/IN) from already-
 * persisted prices/signals/fundamentals — no external fetch. Makes the snapshot
 * screens (Market Scans, Stock Interest Radar, Market Pulse, Research, Workbench)
 * non-empty for the region.  Each stage is independent (try/catch) so one failure
 * doesn't block the rest.
 *
 * Usage: GEN_REGION=US npx ts-node --transpile-only scripts/populate-region-snapshots.ts
 */
import prisma from '../src/db/prisma';

async function run() {
  const region = (process.env.GEN_REGION || 'US').toUpperCase();
  const assetType = 'STOCK';
  const ok: string[] = [];
  const fail: string[] = [];
  const stage = async (name: string, fn: () => Promise<unknown>) => {
    try { const r = await fn(); ok.push(name); console.log(`[${name}] OK`, typeof r === 'object' ? JSON.stringify(r).slice(0, 160) : r); }
    catch (e) { fail.push(name); console.warn(`[${name}] FAILED: ${(e as Error).message}`); }
  };

  await stage('market-scan', async () => {
    const { MarketDataFoundationService } = await import('../src/modules/market-data-foundation/market-data-foundation.service');
    const svc: any = new MarketDataFoundationService();
    return svc.refreshMarketScanSnapshots({ region, assetType });
  });

  await stage('stock-interest', async () => {
    const { StockInterestSnapshotService } = await import('../src/modules/market-intelligence/stock-interest-snapshot.service');
    const svc: any = new StockInterestSnapshotService();
    return svc.refreshSnapshots({ region, assetType });
  });

  await stage('market-pulse', async () => {
    const { MarketPulseSnapshotService } = await import('../src/modules/market-context-intelligence/market-pulse-snapshot.service');
    const svc: any = new MarketPulseSnapshotService();
    return svc.refreshSnapshot({ region, assetType });
  });

  await stage('research-overview', async () => {
    const { ResearchHubService } = await import('../src/modules/research-hub/research-hub.service');
    const svc: any = new ResearchHubService();
    return svc.refreshOverview({ region, assetType });
  });

  await stage('workbench', async () => {
    const { WorkbenchRefreshService } = await import('../src/modules/stock-research-workbench');
    const svc: any = new WorkbenchRefreshService();
    return svc.refreshWorkbenchSnapshots({ region, assetType });
  });

  console.log(`[populate-${region}] DONE ok=[${ok.join(',')}] failed=[${fail.join(',')}]`);
  await prisma.$disconnect();
}

run().catch((e) => { console.error('populate failed:', e); process.exit(1); });
