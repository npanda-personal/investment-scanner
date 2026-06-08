/**
 * run-market-context.ts — regenerate + persist the market-context regime/breadth
 * snapshot for a region. Trader reads (regime/breadth/summary) are persisted-read, so
 * after a code or data change (e.g. region-aware benchmark, ^GSPC seed) the persisted
 * snapshot must be re-run for the change to surface.
 *
 * Run: GEN_REGION=US npx ts-node --transpile-only scripts/run-market-context.ts
 */
import prisma from '../src/db/prisma';
import { MarketContextIntelligenceService } from '../src/modules/market-context-intelligence/market-context-intelligence.service';

async function main() {
  const region = (process.env.GEN_REGION || 'US').toUpperCase();
  const svc = new MarketContextIntelligenceService();
  console.log(`run-market-context: region=${region} …`);
  const result = await svc.runAsOf(region);
  console.log(`DONE region=${region}`, JSON.stringify(result));
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
