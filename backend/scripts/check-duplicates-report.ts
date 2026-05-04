import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log('Checking for price_ticks with the same symbol and date but different timestamps...');

  const duplicates: any[] = await prisma.$queryRaw`
    SELECT 
      symbol, 
      to_char("timestamp", 'YYYY-MM-DD') as dt, 
      COUNT(*) as count,
      array_agg(timestamp ORDER BY timestamp ASC) as timestamps
    FROM price_ticks
    GROUP BY symbol, to_char("timestamp", 'YYYY-MM-DD')
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 20;
  `;

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found! Every symbol has at most one price record per calendar day.');
  } else {
    console.log(`❌ Found ${duplicates.length} (or more) stock/date combinations with duplicate records.`);
    console.log('\nExamples:');
    duplicates.forEach(d => {
      console.log(`Symbol: ${d.symbol.padEnd(10)} | Date: ${new Date(d.dt).toISOString().split('T')[0]} | Records: ${d.count}`);
      console.log(`   Timestamps: ${d.timestamps.map((t: any) => new Date(t).toISOString()).join(', ')}`);
    });

    const totalDuplicates: any[] = await prisma.$queryRaw`
      SELECT COUNT(*) as total
      FROM (
        SELECT symbol, DATE("timestamp" AT TIME ZONE 'UTC')
        FROM price_ticks
        GROUP BY symbol, DATE("timestamp" AT TIME ZONE 'UTC')
        HAVING COUNT(*) > 1
      ) as sub;
    `;
    console.log(`\nTotal duplicate groups: ${totalDuplicates[0].total}`);
  }
}

checkDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
