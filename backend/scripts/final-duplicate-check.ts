import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const result: any[] = await prisma.$queryRaw`
    SELECT 
      (SELECT COUNT(*) FROM price_ticks) as total_records,
      (SELECT COUNT(*) FROM (SELECT DISTINCT symbol, to_char(timestamp, 'YYYY-MM-DD') FROM price_ticks) as sub) as unique_days
  `;
  
  const total = Number(result[0].total_records);
  const unique = Number(result[0].unique_days);
  
  console.log(`Total Records: ${total}`);
  console.log(`Unique Symbol/Date Pairs: ${unique}`);
  
  if (total > unique) {
    console.log(`⚠️ Detected ${total - unique} duplicate records (same symbol and date).`);
    
    const examples: any[] = await prisma.$queryRaw`
      SELECT symbol, to_char(timestamp, 'YYYY-MM-DD') as date, COUNT(*) as count
      FROM price_ticks
      GROUP BY symbol, to_char(timestamp, 'YYYY-MM-DD')
      HAVING COUNT(*) > 1
      LIMIT 10
    `;
    console.log('Examples of duplicates:', examples);
  } else {
    console.log('✅ No duplicates found. Every record has a unique symbol/date combination.');
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
