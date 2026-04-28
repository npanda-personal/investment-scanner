import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyUSSeed() {
  console.log('Verifying US Stocks seed...');
  
  // Count total stocks
  const totalCount = await prisma.stock.count();
  console.log(`Total stocks in database: ${totalCount}`);
  
  // Count US stocks
  const usCount = await prisma.stock.count({
    where: { region: 'US' }
  });
  console.log(`US stocks (region=US): ${usCount}`);
  
  // Count by exchange
  const nyseCount = await prisma.stock.count({
    where: { region: 'US', exchange: 'NYSE' }
  });
  const nasdaqCount = await prisma.stock.count({
    where: { region: 'US', exchange: 'NASDAQ' }
  });
  console.log(`NYSE stocks: ${nyseCount}`);
  console.log(`NASDAQ stocks: ${nasdaqCount}`);
  
  // Get a few sample records
  const samples = await prisma.stock.findMany({
    where: { region: 'US' },
    take: 10,
    orderBy: { symbol: 'asc' }
  });
  
  console.log('\nSample US records:');
  samples.forEach(stock => {
    console.log(`  ${stock.symbol}: ${stock.name} (${stock.exchange}, active: ${stock.isActive})`);
  });
  
  // Check for specific symbols that should have been updated
  const updatedSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'JPM', 'JNJ', 'V', 'WMT'];
  console.log('\nChecking specific symbols:');
  for (const symbol of updatedSymbols) {
    const stock = await prisma.stock.findUnique({
      where: { symbol }
    });
    if (stock) {
      console.log(`  ${symbol}: Found - name: ${stock.name}, exchange: ${stock.exchange}, updatedAt: ${stock.updatedAt}`);
    } else {
      console.log(`  ${symbol}: NOT FOUND`);
    }
  }
  
  // Check some newly created symbols
  const newSymbols = ['ABNB', 'SNOW', 'COIN', 'PLTR', 'DASH'];
  console.log('\nChecking newly created symbols:');
  for (const symbol of newSymbols) {
    const stock = await prisma.stock.findUnique({
      where: { symbol }
    });
    if (stock) {
      console.log(`  ${symbol}: Found - name: ${stock.name}, exchange: ${stock.exchange}`);
    } else {
      console.log(`  ${symbol}: NOT FOUND`);
    }
  }
}

verifyUSSeed()
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });