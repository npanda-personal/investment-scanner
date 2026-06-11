import prisma from '../src/db/prisma';

async function main() {
  const segments = ['CM', 'INDEX', 'SECTOR_INDEX', 'DELIVERY'];

  console.log('=== Source File Import Freshness Check ===\n');

  for (const segment of segments) {
    const latest = await prisma.sourceFileImport.findFirst({
      where: {
        segment: segment as any,
        status: 'COMPLETED',
      },
      orderBy: { tradingDate: 'desc' },
      select: { tradingDate: true, importedAt: true, segment: true, status: true, rowsAccepted: true, rowsRaw: true },
    });

    if (latest) {
      const td = latest.tradingDate instanceof Date
        ? latest.tradingDate.toISOString().split('T')[0]
        : String(latest.tradingDate);
      const ia = latest.importedAt instanceof Date
        ? latest.importedAt.toISOString()
        : String(latest.importedAt);
      console.log(`${segment}: latest completed tradingDate = ${td}, importedAt = ${ia}, rowsAccepted = ${latest.rowsAccepted}, rowsRaw = ${latest.rowsRaw}`);
    } else {
      console.log(`${segment}: NO completed imports found`);
    }
  }

  // Also check the last 5 for DELIVERY for context
  console.log('\n=== Last 5 DELIVERY imports ===');
  const deliveryRecent = await prisma.sourceFileImport.findMany({
    where: { segment: 'DELIVERY' as any },
    orderBy: { tradingDate: 'desc' },
    take: 5,
    select: { tradingDate: true, status: true, rowsAccepted: true, importedAt: true },
  });
  for (const r of deliveryRecent) {
    const td = r.tradingDate instanceof Date ? r.tradingDate.toISOString().split('T')[0] : String(r.tradingDate);
    console.log(`  ${td} | ${r.status} | rowsAccepted=${r.rowsAccepted}`);
  }

  console.log('\n=== Last 5 INDEX imports ===');
  const indexRecent = await prisma.sourceFileImport.findMany({
    where: { segment: 'INDEX' as any },
    orderBy: { tradingDate: 'desc' },
    take: 5,
    select: { tradingDate: true, status: true, rowsAccepted: true, importedAt: true },
  });
  for (const r of indexRecent) {
    const td = r.tradingDate instanceof Date ? r.tradingDate.toISOString().split('T')[0] : String(r.tradingDate);
    console.log(`  ${td} | ${r.status} | rowsAccepted=${r.rowsAccepted}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
