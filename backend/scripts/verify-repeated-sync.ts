import { MarketDataFoundationService, MarketDataFoundationRepository, YahooFinanceIngestionService } from '../src/modules/market-data-foundation';
import { PrismaClient } from '@prisma/client';

async function run() {
  const prisma = new PrismaClient();
  const repository = new MarketDataFoundationRepository(prisma);
  const provider = new YahooFinanceIngestionService(prisma);
  const service = new MarketDataFoundationService(repository, provider);

  console.log('--- FIRST SYNC ---');
  const firstSync = await service.syncV1({
    symbol: 'AAPL',
    company_name: 'Apple Inc.',
    exchange: 'NASDAQ',
    currency: 'USD',
    asset_type: 'EQUITY'
  });
  console.log(JSON.stringify(firstSync, null, 2));

  console.log('\n--- SECOND SYNC ---');
  const secondSync = await service.syncV1({
    symbol: 'AAPL',
    company_name: 'Apple Inc.',
    exchange: 'NASDAQ',
    currency: 'USD',
    asset_type: 'EQUITY'
  });
  console.log(JSON.stringify(secondSync, null, 2));

  await prisma.$disconnect();
}

run().catch(console.error);