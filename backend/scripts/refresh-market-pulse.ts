/**
 * Regenerate the Market Pulse snapshot for IN/STOCK so the landing page reflects
 * current data + the headline-index curation fix (exclude leveraged/inverse/factor
 * slices from the index trend + health score).
 *
 * Run: npx ts-node --transpile-only scripts/refresh-market-pulse.ts
 */
import prisma from '../src/db/prisma';
import { MarketPulseSnapshotService } from '../src/modules/market-context-intelligence/market-pulse-snapshot.service';

async function main() {
  const svc = new MarketPulseSnapshotService();
  const rec = await svc.refreshSnapshot({ region: 'IN', assetType: 'STOCK' } as any);
  const top = (rec as any).topIndicesJson || (rec as any).topIndices || [];
  console.log('snapshotDate:', (rec as any).snapshotDate, '| status:', (rec as any).status, '| health:', (rec as any).marketHealthScore);
  console.log('topIndices:', top.map((r: any) => `${r.symbol}(${r.value})`).join(', '));
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
