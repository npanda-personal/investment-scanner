/**
 * W2(b) live validation: prove corporate-action back-adjustment on REAL data.
 *
 * RELIANCE had two real 1:1 bonuses (ex-dates 2017-09-07 and 2024-10-28) that
 * show up as ~-50% single-day RAW drops. We inject those as CorporateActions,
 * recompute adjustedClose via the real service path, and assert the ADJUSTED
 * return on each ex-date is continuous (~0%), not -50%. Then we clean up.
 *
 * Run: npx ts-node --transpile-only scripts/validate-adjusted-close.ts
 */
import prisma from '../src/db/prisma';
import { MarketDataFoundationService } from '../src/modules/market-data-foundation/market-data-foundation.service';

const SYMBOL = 'RELIANCE';
const BONUSES = ['2017-09-07', '2024-10-28']; // real 1:1 bonus ex-dates → ratio = newShares/oldShares = 2

async function loadRows() {
  return prisma.priceTick.findMany({
    where: { symbol: SYMBOL },
    orderBy: { timestamp: 'asc' },
    select: { timestamp: true, close: true, adjustedClose: true },
  });
}

function pct(x: number) { return (x * 100).toFixed(2) + '%'; }

async function dayReturns(dateStr: string, rows: Awaited<ReturnType<typeof loadRows>>) {
  const idx = rows.findIndex((r) => r.timestamp.toISOString().slice(0, 10) === dateStr);
  if (idx <= 0) return null;
  const prev = rows[idx - 1], cur = rows[idx];
  const raw = Number(cur.close) / Number(prev.close) - 1;
  const adj = cur.adjustedClose != null && prev.adjustedClose != null
    ? Number(cur.adjustedClose) / Number(prev.adjustedClose) - 1
    : null;
  return { raw, adj };
}

async function main() {
  const stock = await prisma.stock.findFirst({ where: { symbol: SYMBOL } });
  if (!stock) throw new Error(`${SYMBOL} not found`);
  const stockId = stock.id;
  let pass = true;

  console.log(`\n=== W2(b) validation: ${SYMBOL} (stockId=${stockId}) ===`);

  // BEFORE
  let rows = await loadRows();
  console.log('\n--- BEFORE adjustment (raw single-day returns on bonus ex-dates) ---');
  for (const d of BONUSES) {
    const r = await dayReturns(d, rows);
    console.log(`  ${d}: raw=${pct(r!.raw)}  adjusted=${r!.adj == null ? 'null' : pct(r!.adj)}`);
  }

  // Inject the two real 1:1 bonuses
  for (const d of BONUSES) {
    const naturalKey = `VALIDATION_TEMP|${stockId}|bonus|${d}`;
    await prisma.corporateAction.upsert({
      where: { naturalKey },
      update: {},
      create: {
        stockId,
        actionType: 'bonus',
        effectiveDate: new Date(`${d}T00:00:00.000Z`),
        splitRatio: 2,
        source: 'VALIDATION_TEMP',
        naturalKey,
      },
    });
  }
  console.log(`\nInjected ${BONUSES.length} bonus corporate actions (source=VALIDATION_TEMP, ratio=2).`);

  // RECOMPUTE via the real service path
  const service = new MarketDataFoundationService();
  const result = await service.recomputeAdjustedClosesForInstrument(stockId);
  console.log(`Recompute: bars=${result.bars} updated=${result.updated} warnings=${result.warnings.length}`);

  // AFTER
  rows = await loadRows();
  console.log('\n--- AFTER adjustment (adjusted return should be ~continuous, NOT -50%) ---');
  for (const d of BONUSES) {
    const r = await dayReturns(d, rows);
    const ok = r!.adj != null && Math.abs(r!.adj) < 0.15; // adjusted day move small, not -50%
    if (!ok) pass = false;
    console.log(`  ${d}: raw=${pct(r!.raw)}  adjusted=${r!.adj == null ? 'null' : pct(r!.adj)}  ${ok ? 'OK ✅' : 'FAIL ❌'}`);
  }

  // Oldest bar should be back-adjusted by 0.25 (two 1:1 bonuses after it)
  const oldest = rows[0];
  const factor = Number(oldest.adjustedClose) / Number(oldest.close);
  const factorOk = Math.abs(factor - 0.25) < 0.01;
  if (!factorOk) pass = false;
  console.log(`\nOldest bar adjustedClose/close = ${factor.toFixed(4)} (expected ~0.25)  ${factorOk ? 'OK ✅' : 'FAIL ❌'}`);

  console.log(`\n=== RESULT: ${pass ? 'PASS ✅ — adjustment removes the artificial bonus drop on real data' : 'FAIL ❌'} ===`);

  // CLEANUP — restore pre-validation state
  await prisma.corporateAction.deleteMany({ where: { stockId, source: 'VALIDATION_TEMP' } });
  await prisma.priceTick.updateMany({ where: { symbol: SYMBOL }, data: { adjustedClose: null } });
  console.log('Cleanup: removed temp corporate actions and reset RELIANCE adjustedClose to null.\n');

  process.exitCode = pass ? 0 : 1;
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
