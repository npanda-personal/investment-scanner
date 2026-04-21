import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetPriceTicksAndTimestamps() {
  console.log('=== Starting Full Reset of Price Ticks ===\n');

  try {
    // Step 1: Count current price ticks
    const priceTicksCount = await prisma.priceTick.count();
    console.log(`1. Current price ticks in database: ${priceTicksCount}`);

    // Step 2: Delete all price ticks
    console.log('2. Deleting all price ticks...');
    const deleteResult = await prisma.priceTick.deleteMany({});
    console.log(`   Deleted ${deleteResult.count} price tick records`);

    // Step 3: Count stocks
    const stocksCount = await prisma.stock.count();
    console.log(`3. Total stocks in database: ${stocksCount}`);

    // Step 4: Set lastSuccessfulDataLoadTimestamp to NULL for all stocks
    console.log('4. Resetting lastSuccessfulDataLoadTimestamp for all stocks...');
    const updateResult = await prisma.stock.updateMany({
      data: { lastSuccessfulDataLoadTimestamp: null }
    });
    console.log(`   Updated ${updateResult.count} stock records`);

    // Step 5: Verify the reset
    const remainingPriceTicks = await prisma.priceTick.count();
    const stocksWithTimestamp = await prisma.stock.count({
      where: { lastSuccessfulDataLoadTimestamp: { not: null } }
    });

    console.log('\n=== Verification ===');
    console.log(`Price ticks after reset: ${remainingPriceTicks} (should be 0)`);
    console.log(`Stocks with timestamp after reset: ${stocksWithTimestamp} (should be 0)`);

    if (remainingPriceTicks === 0 && stocksWithTimestamp === 0) {
      console.log('\n✅ Reset successful! Database is ready for complete reload.');
      console.log('\nNext steps:');
      console.log('1. Run bulk sync to reload all historical data');
      console.log('2. The system will load from 2010-01-01 for all stocks (first-time load)');
      console.log('3. Timestamps will be updated only after successful API calls');
    } else {
      console.log('\n❌ Reset incomplete. Please check the database.');
    }

  } catch (error) {
    console.error('Error during reset:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetPriceTicksAndTimestamps()
  .then(() => {
    console.log('\nReset process completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Reset failed:', error);
    process.exit(1);
  });