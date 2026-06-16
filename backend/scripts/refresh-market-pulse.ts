/**
 * Regenerate the Market Pulse snapshot for a region/assetType so the landing page
 * reflects current data + the headline-index curation fix (exclude leveraged/inverse/
 * factor slices from the index trend + health score).
 *
 * Run: npx ts-node --transpile-only scripts/refresh-market-pulse.ts [--region US] [--asset-type STOCK]
 */
import prisma from '../src/db/prisma';
import { MarketPulseSnapshotService } from '../src/modules/market-context-intelligence/market-pulse-snapshot.service';

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
  const svc = new MarketPulseSnapshotService();
  const rec = await svc.refreshSnapshot({ region, assetType } as any);
  const top = (rec as any).topIndicesJson || (rec as any).topIndices || [];
  const vix = (rec as any).vixSummaryJson || (rec as any).vixSummary || null;
  console.log(`region: ${region}/${assetType} | snapshotDate:`, (rec as any).snapshotDate, '| status:', (rec as any).status, '| health:', (rec as any).marketHealthScore);
  console.log('topIndices:', top.map((r: any) => `${r.symbol}(${r.value})`).join(', '));
  console.log('vix:', vix ? `${vix.latest} posture=${vix.posture} 5d=${vix.low5d}-${vix.high5d}` : 'none');
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
