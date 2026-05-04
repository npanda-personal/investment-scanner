import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log('Fetching all price ticks to check for same-day duplicates in JS...');
  
  // We might have too many records to fetch all at once, let's do it per symbol if needed.
  // But let's try a sample of symbols first.
  const symbols = await prisma.priceTick.findMany({
    select: { symbol: true },
    distinct: ['symbol']
  });

  console.log(`Checking duplicates for ${symbols.length} symbols...`);

  let found = 0;
  for (const { symbol } of symbols) {
    const ticks = await prisma.priceTick.findMany({
      where: { symbol },
      select: { id: true, timestamp: true },
      orderBy: { timestamp: 'asc' }
    });

    const byDate = new Map<string, string[]>();
    for (const tick of ticks) {
      const dateStr = tick.timestamp.toISOString().split('T')[0];
      if (!byDate.has(dateStr)) byDate.set(dateStr, []);
      byDate.get(dateStr)!.push(tick.timestamp.toISOString());
    }

    for (const [date, timestamps] of byDate.entries()) {
      if (timestamps.length > 1) {
        console.log(`❌ Duplicate for ${symbol} on ${date}: ${timestamps.join(', ')}`);
        found++;
      }
    }
  }

  if (found === 0) {
    console.log('✅ No duplicates found in the sample of 100 symbols.');
  } else {
    console.log(`Found ${found} duplicate day entries.`);
  }
}

checkDuplicates().catch(console.error).finally(() => prisma.$disconnect());
