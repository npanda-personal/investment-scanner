import { MarketDataFoundationService, MarketDataFoundationRepository, YahooFinanceIngestionService } from '../src/modules/market-data-foundation';
import { PrismaClient } from '@prisma/client';

async function run() {
  const prisma = new PrismaClient();
  const repository = new MarketDataFoundationRepository(prisma);
  const provider = new YahooFinanceIngestionService(prisma);
  const service = new MarketDataFoundationService(repository, provider);

  const symbol = '360ONE.NS';
  console.log(`Checking price count for ${symbol}...`);
  const c1 = await prisma.priceTick.count({ where: { symbol } });
  console.log(`Initial count: ${c1}`);

  console.log('--- SYNC 1 ---');
  await service.syncV1({
    symbol,
    company_name: '360 ONE WAM',
    exchange: 'NSE',
    currency: 'INR',
    asset_type: 'EQUITY'
  });
  const c2 = await prisma.priceTick.count({ where: { symbol } });
  console.log(`Count after sync 1: ${c2} (+${c2 - c1})`);

  console.log('\n--- SYNC 2 ---');
  await service.syncV1({
    symbol,
    company_name: '360 ONE WAM',
    exchange: 'NSE',
    currency: 'INR',
    asset_type: 'EQUITY'
  });
  const c3 = await prisma.priceTick.count({ where: { symbol } });
  console.log(`Count after sync 2: ${c3} (+${c3 - c2})`);

  await prisma.$disconnect();
}

run().catch(console.error);