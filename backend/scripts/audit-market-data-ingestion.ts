import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditAndClean(dryRun = true) {
  console.log(`Starting Market Data Ingestion Audit (Dry Run: ${dryRun})\n`);

  // 1. Audit Fundamentals
  console.log('--- FUNDAMENTALS ---');
  const fundamentals = await prisma.fundamental.findMany({
    orderBy: { periodEndDate: 'desc' }
  });

  const fundamentalsByKey = new Map<string, typeof fundamentals>();
  for (const row of fundamentals) {
    const key = `${row.stockId}_${row.periodType}_${row.source}`;
    if (!fundamentalsByKey.has(key)) fundamentalsByKey.set(key, []);
    fundamentalsByKey.get(key)!.push(row);
  }

  let fundDuplicateGroups = 0;
  let fundDuplicateRows = 0;

  for (const [, rows] of fundamentalsByKey.entries()) {
    if (rows.length > 1) {
      fundDuplicateGroups++;
      fundDuplicateRows += rows.length - 1;
      
      if (!dryRun) {
        // Keep the one with the latest lastUpdatedTimestamp, or latest periodEndDate, or just the first in the sorted array (which is the latest periodEndDate)
        const toDelete = rows.slice(1);
        for (const row of toDelete) {
          await prisma.fundamental.delete({ where: { id: row.id } });
        }
      }
    }
  }

  console.log(`Fundamental Duplicate Groups: ${fundDuplicateGroups}`);
  console.log(`Fundamental Duplicate Rows: ${fundDuplicateRows}`);
  if (!dryRun && fundDuplicateRows > 0) {
    console.log(`Cleaned up ${fundDuplicateRows} duplicate Fundamentals.`);
  }
  console.log('');

  // 2. Audit PriceTicks
  console.log('--- PRICETICKS ---');
  // Since there's a unique constraint on symbol + timestamp, there CANNOT be DB duplicates.
  // We can just verify count.
  const priceCount = await prisma.priceTick.count();
  console.log(`PriceTick Rows: ${priceCount}`);
  console.log('DB constraints prevent duplicate PriceTicks.\n');

  // 3. Audit LatestPrices
  console.log('--- LATEST PRICES ---');
  const latestCount = await prisma.latestPrice.count();
  console.log(`LatestPrice Rows: ${latestCount}`);
  console.log('DB constraints prevent duplicate LatestPrices.\n');

  // 4. Audit Corporate Actions
  console.log('--- CORPORATE ACTIONS ---');
  const actionsCount = await prisma.corporateAction.count();
  console.log(`CorporateAction Rows: ${actionsCount}`);
  console.log('DB constraints prevent duplicate Corporate Actions for the same date/type.\n');

  // 5. Audit FxRates
  console.log('--- FX RATES ---');
  const fxCount = await prisma.fxRate.count();
  console.log(`FxRate Rows: ${fxCount}`);
  console.log('DB constraints prevent duplicate FxRates.\n');

  // 6. Audit Stocks
  console.log('--- STOCKS ---');
  const stocks = await prisma.stock.findMany();
  const stocksByKey = new Map<string, typeof stocks>();
  for (const row of stocks) {
    const key = `${row.symbol}_${row.exchange || 'UNKNOWN'}`;
    if (!stocksByKey.has(key)) stocksByKey.set(key, []);
    stocksByKey.get(key)!.push(row);
  }

  let stockDuplicateGroups = 0;
  let stockDuplicateRows = 0;

  for (const [key, rows] of stocksByKey.entries()) {
    if (rows.length > 1) {
      stockDuplicateGroups++;
      stockDuplicateRows += rows.length - 1;
      console.log(`Duplicate Stock Found: ${key} (${rows.length} rows)`);
    }
  }

  console.log(`Stock Duplicate Groups: ${stockDuplicateGroups}`);
  console.log(`Stock Duplicate Rows: ${stockDuplicateRows}`);
  if (stockDuplicateRows > 0) {
    console.log('NOTE: Stock duplicates must be handled carefully due to foreign keys.');
  }

  console.log('\nAudit Complete.');
  await prisma.$disconnect();
}

const isCleanup = process.argv.includes('--cleanup');
auditAndClean(!isCleanup).catch(console.error);
