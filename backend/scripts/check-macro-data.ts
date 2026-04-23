import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const stocks = await prisma.stock.findMany({
    where: { isActive: true, region: 'US' },
    select: { symbol: true, name: true },
    take: 5,
  });
  console.log('Sample US stocks:', JSON.stringify(stocks, null, 2));

  const count = await prisma.stock.count({ where: { isActive: true, region: 'US' } });
  console.log('US stocks count:', count);

  const latestCount = await prisma.latestPrice.count();
  console.log('LatestPrice count:', latestCount);

  const tickCount = await prisma.priceTick.count();
  console.log('PriceTick count:', tickCount);

  const dateRange = await prisma.priceTick.aggregate({
    _min: { timestamp: true },
    _max: { timestamp: true },
  });
  console.log('Date range:', JSON.stringify(dateRange));

  // Check distinct dates to understand data granularity
  const sampleDates = await prisma.priceTick.findMany({
    where: { symbol: 'AAPL' },
    select: { timestamp: true, close: true },
    orderBy: { timestamp: 'desc' },
    take: 5,
  });
  console.log('Sample AAPL ticks:', JSON.stringify(sampleDates, null, 2));

  // Check how many distinct symbols have data
  const distinctSymbols = await prisma.priceTick.groupBy({
    by: ['symbol'],
    _count: { symbol: true },
  });
  console.log('Distinct symbols with price data:', distinctSymbols.length);

  await prisma.$disconnect();
}

main().catch(console.error);
