/**
 * Seed workbench snapshots for a handful of real instruments.
 * Usage: ts-node scripts/seed-workbench-snapshots.ts
 */
import prisma from '../src/db/prisma';
import { WorkbenchRefreshService } from '../src/modules/stock-research-workbench';

async function main() {
  // Look up instrument IDs for RELIANCE, TCS, BANDHANBNK
  const symbols = ['RELIANCE', 'TCS', 'BANDHANBNK'];
  const stocks = await prisma.stock.findMany({
    where: { symbol: { in: symbols } },
    select: { id: true, symbol: true },
  });

  if (stocks.length === 0) {
    console.log('No stocks found for symbols:', symbols);
    console.log('Falling back: seeding first 3 active IN stocks...');
    const fallbacks = await prisma.stock.findMany({
      where: { region: 'IN', isActive: true, isDelisted: false },
      select: { id: true, symbol: true },
      orderBy: { symbol: 'asc' },
      take: 3,
    });
    stocks.push(...fallbacks);
  }

  console.log('Seeding workbench snapshots for:', stocks.map((s) => s.symbol).join(', '));

  const svc = new WorkbenchRefreshService();
  const result = await svc.refreshWorkbenchSnapshots({
    instrumentIds: stocks.map((s) => s.id),
  });

  console.log('Seed result:', JSON.stringify(result, null, 2));

  // Verify GET reads snapshot
  const { WorkbenchSnapshotRepository } = await import('../src/modules/stock-research-workbench/workbench-snapshot.repository');
  const repo = new WorkbenchSnapshotRepository();

  for (const stock of stocks) {
    const snapshot = await repo.findByInstrumentId(stock.id);
    if (snapshot) {
      const payload = snapshot.payloadJson as any;
      console.log(`\nGET verification for ${stock.symbol}:`);
      console.log(`  snapshot.computedAt = ${snapshot.computedAt.toISOString()}`);
      console.log(`  payload.overview.symbol = ${(payload.overview as any)?.symbol ?? '(missing)'}`);
      console.log(`  payload.performance.return_1y = ${(payload.performance as any)?.return_1y ?? null}`);
      console.log(`  payload.peers count = ${Array.isArray(payload.peers) ? payload.peers.length : '?'}`);
    } else {
      console.log(`\nWARN: no snapshot found for ${stock.symbol} (compute may have failed)`);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
