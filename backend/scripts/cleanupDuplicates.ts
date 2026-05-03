import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('Detecting duplicates...');

  let hasMore = true;
  let totalDeleted = 0;
  
  while (hasMore) {
    const duplicates: any[] = await prisma.$queryRaw`
      SELECT symbol, DATE("timestamp" AT TIME ZONE 'UTC') as dt, array_agg(id) as ids
      FROM price_ticks
      GROUP BY symbol, DATE("timestamp" AT TIME ZONE 'UTC')
      HAVING COUNT(*) > 1
      LIMIT 5000;
    `;

    if (duplicates.length === 0) {
      console.log('No more duplicates found.');
      hasMore = false;
      break;
    }

    console.log(`Found ${duplicates.length} duplicate groups in this batch. Cleaning up...`);

    let deletedCount = 0;
    for (const dup of duplicates) {
      const ids: string[] = dup.ids;
      const records = await prisma.priceTick.findMany({
        where: { id: { in: ids } },
        orderBy: { timestamp: 'desc' }
      });

      if (records.length > 1) {
        let toKeep = records.find(r => r.timestamp.toISOString().endsWith('T00:00:00.000Z')) || records[0];
        const toDelete = records.filter(r => r.id !== toKeep.id);

        for (const row of toDelete) {
          await prisma.priceTick.delete({ where: { id: row.id } });
          deletedCount++;
          totalDeleted++;
        }
      }
    }
    console.log(`Deleted ${deletedCount} rows in this batch. Total: ${totalDeleted}`);
  }
}

cleanupDuplicates().catch(console.error).finally(() => prisma.$disconnect());