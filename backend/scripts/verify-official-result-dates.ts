/**
 * Quick verification script: show sample Fundamental rows with officialResultDate set.
 * Run: npx ts-node --transpile-only scripts/verify-official-result-dates.ts
 */
import prisma from '../src/db/prisma';

async function main() {
  const total = await (prisma as any).fundamental.count({ where: { officialResultDate: { not: null } } });
  const grand = await (prisma as any).fundamental.count();
  console.log(`\nDB coverage: ${total}/${grand} Fundamental rows have officialResultDate\n`);

  // Get sample joined with stock so we can see region
  const rows = await (prisma as any).fundamental.findMany({
    where: { officialResultDate: { not: null } },
    select: {
      id: true,
      stockId: true,
      periodEndDate: true,
      periodType: true,
      officialResultDate: true,
      stock: { select: { symbol: true, region: true } },
    },
    take: 200,
    orderBy: { officialResultDate: 'asc' },
  });

  const inRows = rows.filter((r: any) => r.stock?.region === 'IN');
  console.log(`IN-region rows with officialResultDate: ${inRows.length} (of first 200 fetched)`);
  console.log('\nSample IN rows (earliest officialResultDate first):');
  for (const r of inRows.slice(0, 15)) {
    console.log(
      `  ${String(r.stock.symbol).padEnd(16)} ${r.periodType.padEnd(12)} periodEnd=${r.periodEndDate.toISOString().slice(0, 10)}  officialResultDate=${r.officialResultDate.toISOString().slice(0, 10)}`
    );
  }
}

main()
  .catch((err) => { console.error('Fatal:', err); process.exitCode = 1; })
  .finally(() => (prisma as any).$disconnect());
