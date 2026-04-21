import { PrismaClient } from '@prisma/client';
import { YahooFinanceIngestionService } from './src/data/ingestion/yahoo.service';

const prisma = new PrismaClient();

async function testIncrementalIngestion() {
  console.log('=== Testing Incremental Ingestion Validation ===\n');
  
  // Test symbols (small set as requested)
  const testSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
  
  const ingestionService = new YahooFinanceIngestionService(prisma, 2000); // 2 second delay
  
  for (const symbol of testSymbols) {
    console.log(`\n--- Testing ${symbol} ---`);
    
    try {
      // 1. Get current state before ingestion
      const stockBefore = await prisma.stock.findUnique({
        where: { symbol }
      });
      
      const priceTickCountBefore = await prisma.priceTick.count({
        where: { symbol }
      });
      
      console.log(`Before ingestion:`);
      console.log(`  - Stock exists: ${!!stockBefore}`);
      console.log(`  - lastSuccessfulDataLoadTimestamp: ${stockBefore?.lastSuccessfulDataLoadTimestamp || 'null'}`);
      console.log(`  - PriceTick records: ${priceTickCountBefore}`);
      
      // 2. Perform ingestion with a small date range (last 7 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      console.log(`\nIngesting data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
      
      await ingestionService.ingestSymbol(symbol, startDate, endDate);
      
      // 3. Check state after ingestion
      const stockAfter = await prisma.stock.findUnique({
        where: { symbol }
      });
      
      const priceTickCountAfter = await prisma.priceTick.count({
        where: { symbol }
      });
      
      console.log(`\nAfter ingestion:`);
      console.log(`  - lastSuccessfulDataLoadTimestamp: ${stockAfter?.lastSuccessfulDataLoadTimestamp || 'null'}`);
      console.log(`  - PriceTick records: ${priceTickCountAfter}`);
      console.log(`  - New records added: ${priceTickCountAfter - priceTickCountBefore}`);
      
      // 4. Verify no duplicates (check for unique constraint violations)
      // We'll check by counting distinct timestamps
      const distinctTimestamps = await prisma.priceTick.groupBy({
        by: ['timestamp'],
        where: { symbol },
        _count: true
      });
      
      const duplicateCount = distinctTimestamps.filter(g => g._count > 1).length;
      console.log(`  - Duplicate timestamp groups: ${duplicateCount}`);
      
      if (duplicateCount > 0) {
        console.error(`  ❌ DUPLICATES DETECTED for ${symbol}!`);
      } else {
        console.log(`  ✅ No duplicates detected`);
      }
      
      // 5. Verify timestamp was updated
      if (stockAfter?.lastSuccessfulDataLoadTimestamp) {
        const isUpdated = stockAfter.lastSuccessfulDataLoadTimestamp > new Date(Date.now() - 60000); // Within last minute
        console.log(`  - lastSuccessfulDataLoadTimestamp updated recently: ${isUpdated ? '✅' : '❌'}`);
      } else {
        console.log(`  ❌ lastSuccessfulDataLoadTimestamp not updated`);
      }
      
      // 6. Test incremental fetch by running ingestion again
      console.log(`\nTesting incremental logic (running ingestion again)...`);
      
      const priceTickCountBeforeSecondRun = await prisma.priceTick.count({
        where: { symbol }
      });
      
      // Run ingestion again with same date range
      await ingestionService.ingestSymbol(symbol, startDate, endDate);
      
      const priceTickCountAfterSecondRun = await prisma.priceTick.count({
        where: { symbol }
      });
      
      const secondRunAdded = priceTickCountAfterSecondRun - priceTickCountBeforeSecondRun;
      console.log(`  - Records added on second run: ${secondRunAdded}`);
      
      if (secondRunAdded === 0) {
        console.log(`  ✅ Incremental loading working (no duplicates added)`);
      } else {
        console.log(`  ❌ Incremental loading failed (${secondRunAdded} duplicates added)`);
      }
      
    } catch (error) {
      console.error(`Error testing ${symbol}:`, error);
    }
    
    // Delay between symbols to respect rate limits
    if (symbol !== testSymbols[testSymbols.length - 1]) {
      console.log('\nWaiting 2 seconds before next symbol...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n=== Test Summary ===');
  console.log('Test completed. Check logs above for results.');
  console.log('\nNext steps:');
  console.log('1. Verify no duplicates were created');
  console.log('2. Verify lastSuccessfulDataLoadTimestamp was updated');
  console.log('3. Verify second ingestion run added zero new records');
  console.log('4. If all tests pass, proceed with full-scale ingestion');
}

testIncrementalIngestion()
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });