/**
 * Recompute adjustedClose for stocks that have corporate actions.
 *   npx ts-node --transpile-only scripts/recompute-adjusted-closes.ts            # all CA stocks
 *   npx ts-node --transpile-only scripts/recompute-adjusted-closes.ts RELIANCE   # one symbol
 */
import prisma from '../src/db/prisma';
import { MarketDataFoundationService } from '../src/modules/market-data-foundation/market-data-foundation.service';

async function main() {
  const onlySymbol = process.argv[2];
  const service = new MarketDataFoundationService();

  let stockIds: string[];
  if (onlySymbol) {
    const s = await prisma.stock.findFirst({ where: { symbol: onlySymbol } });
    if (!s) throw new Error(`${onlySymbol} not found`);
    stockIds = [s.id];
  } else {
    const rows = await prisma.corporateAction.findMany({ distinct: ['stockId'], select: { stockId: true } });
    stockIds = rows.map((r) => r.stockId);
  }
  console.log(`recomputing adjustedClose for ${stockIds.length} stock(s)...`);

  const t0 = Date.now();
  let done = 0, totalUpdated = 0, errors = 0;
  for (const id of stockIds) {
    try {
      const r = await service.recomputeAdjustedClosesForInstrument(id);
      totalUpdated += r.updated;
    } catch (e) {
      errors++;
      if (errors <= 5) console.error('err', id, (e as Error).message);
    }
    done++;
    if (done % 100 === 0 || done === stockIds.length) {
      const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);
      console.log(`  ${done}/${stockIds.length} updated=${totalUpdated} errors=${errors} rss=${rss}MB elapsed=${Math.round((Date.now() - t0) / 1000)}s`);
    }
  }
  console.log(`DONE: ${done} stocks, ${totalUpdated} bars updated, ${errors} errors, ${Math.round((Date.now() - t0) / 1000)}s`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
