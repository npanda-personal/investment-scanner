#!/usr/bin/env ts-node
/**
 * Seed market_scan_snapshots table by running refreshMarketScanSnapshots.
 * Usage: npx ts-node --transpile-only scripts/seed-market-scan-snapshots.ts [--region US] [--asset-type STOCK]
 */
import { MarketDataFoundationService } from '../src/modules/market-data-foundation/market-data-foundation.service';

function parseArgs(argv: string[]) {
  const args = { region: 'IN', assetType: 'STOCK' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--region') args.region = String(argv[++i] || args.region).toUpperCase();
    else if (argv[i] === '--asset-type') args.assetType = String(argv[++i] || args.assetType).toUpperCase();
  }
  return args;
}

async function main() {
  const { region, assetType } = parseArgs(process.argv.slice(2));
  const svc = new MarketDataFoundationService();
  console.log(`[seed] running refreshMarketScanSnapshots for ${region}/${assetType} ...`);
  const result = await svc.refreshMarketScanSnapshots({ region, assetType });
  console.log('[seed] result:', JSON.stringify(result, null, 2));

  if (result.totalInserted > 0) {
    console.log('\n[verify] reading back /market-data/movers (1D) from snapshot...');
    const movers = await svc.marketMovers({ region, assetType, range: '1D', limit: 3 });
    const r1D = movers.ranges.find((r) => r.range === '1D');
    console.log('[verify] 1D gainers count:', r1D?.gainers.length ?? 0);
    if (r1D && r1D.gainers.length > 0) {
      console.log('[verify] top gainer:', r1D.gainers[0]);
    }

    console.log('\n[verify] reading back /market-data/scans/52w-high from snapshot...');
    const scan52wHigh = await svc.marketScan52w({ region, assetType, scanType: '52w-high', limit: 3 });
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
