import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('Cleaning up duplicate price ticks...');
  
  // First, let's check for duplicates
  const duplicates = await prisma.$queryRaw`
    SELECT symbol, timestamp, COUNT(*) as count
    FROM price_ticks
    GROUP BY symbol, timestamp
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 20
  `;
  
  console.log(`Found ${Array.isArray(duplicates) ? duplicates.length : 0} duplicate groups (showing first 20):`);
  
  if (Array.isArray(duplicates)) {
    for (const dup of duplicates) {
      console.log(`  ${dup.symbol} at ${dup.timestamp}: ${dup.count} duplicates`);
    }
  }
  
  // Delete duplicates, keeping only the most recent one (by id)
  console.log('\nDeleting duplicates...');
  
  const result = await prisma.$executeRaw`
    DELETE FROM price_ticks
    WHERE id IN (
      SELECT id
      FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY symbol, timestamp ORDER BY id DESC) as rn
        FROM price_ticks
      ) t
      WHERE t.rn > 1
    )
  `;
  
  console.log(`Deleted ${result} duplicate records`);
  
  // Verify cleanup
  const remainingDuplicates = await prisma.$queryRaw`
    SELECT symbol, timestamp, COUNT(*) as count
    FROM price_ticks
    GROUP BY symbol, timestamp
    HAVING COUNT(*) > 1
  `;
  
  if (Array.isArray(remainingDuplicates) && remainingDuplicates.length === 0) {
    console.log('\n✅ All duplicates cleaned up successfully!');
  } else {
    console.log(`\n❌ Still found ${Array.isArray(remainingDuplicates) ? remainingDuplicates.length : 'some'} duplicate groups`);
  }
}

cleanupDuplicates()
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });