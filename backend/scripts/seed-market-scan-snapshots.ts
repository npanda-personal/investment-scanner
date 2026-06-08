#!/usr/bin/env ts-node
/**
 * Seed market_scan_snapshots table by running refreshMarketScanSnapshots.
 * Usage: npx ts-node --transpile-only scripts/seed-market-scan-snapshots.ts
 */
import { MarketDataFoundationService } from '../src/modules/market-data-foundation/market-data-foundation.service';

async function main() {
  const svc = new MarketDataFoundationService();
  console.log('[seed] running refreshMarketScanSnapshots for IN/STOCK ...');
  const result = await svc.refreshMarketScanSnapshots({ region: 'IN', assetType: 'STOCK' });
  console.log('[seed] result:', JSON.stringify(result, null, 2));

  if (result.totalInserted > 0) {
    console.log('\n[verify] reading back /market-data/movers (1D) from snapshot...');
    const movers = await svc.marketMovers({ region: 'IN', assetType: 'STOCK', range: '1D', limit: 3 });
    const r1D = movers.ranges.find((r) => r.range === '1D');
    console.log('[verify] 1D gainers count:', r1D?.gainers.length ?? 0);
    if (r1D && r1D.gainers.length > 0) {
      console.log('[verify] top gainer:', r1D.gainers[0]);
    }

    console.log('\n[verify] reading back /market-data/scans/52w-high from snapshot...');
    const scan52wHigh = await svc.marketScan52w({ region: 'IN', assetType: 'STOCK', scanType: '52w-high', limit: 3 });
    console.log('[verify] 52w-high results count:', scan52wHigh.results.length);
    if (scan52wHigh.results.length > 0) {
      console.log('[verify] first 52w-high result:', scan52wHigh.results[0]);
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('[seed] FATAL:', e);
  process.exit(1);
});
