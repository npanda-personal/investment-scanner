import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySeed() {
  console.log('Verifying Nifty 500 seed...');
  
  // Count total stocks
  const totalCount = await prisma.stock.count();
  console.log(`Total stocks in database: ${totalCount}`);
  
  // Count Indian stocks
  const indianCount = await prisma.stock.count({
    where: { region: 'IN' }
  });
  console.log(`Indian stocks (region=IN): ${indianCount}`);
  
  // Count NSE stocks
  const nseCount = await prisma.stock.count({
    where: { exchange: 'NSE' }
  });
  console.log(`NSE stocks (exchange=NSE): ${nseCount}`);
  
  // Get a few sample records
  const samples = await prisma.stock.findMany({
    where: { region: 'IN', exchange: 'NSE' },
    take: 5,
    orderBy: { symbol: 'asc' }
  });
  
  console.log('\nSample records:');
  samples.forEach(stock => {
    console.log(`  ${stock.symbol}: ${stock.name} (active: ${stock.isActive}, lastLoad: ${stock.lastSuccessfulDataLoadTimestamp})`);
  });
  
  // Check for specific symbols that should have been updated
  const updatedSymbols = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS'];
  for (const symbol of updatedSymbols) {
    const stock = await prisma.stock.findUnique({
      where: { symbol }
    });
    if (stock) {
      console.log(`\n${symbol}: Found - name: ${stock.name}, updatedAt: ${stock.updatedAt}`);
    } else {
      console.log(`\n${symbol}: NOT FOUND`);
    }
  }
}

verifySeed()
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });