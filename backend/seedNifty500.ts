import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

interface CsvRow {
  'Company Name': string;
  'Industry': string;
  'Symbol': string;
  'Series': string;
  'ISIN Code': string;
}

async function seedNifty500() {
  console.log('Starting Nifty 500 CSV upsert...');
  
  const csvFilePath = path.join(__dirname, '..', 'docs', 'ind_nifty500list.csv');
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`CSV file not found at: ${csvFilePath}`);
    process.exit(1);
  }

  const rows: CsvRow[] = [];
  
  // Read and parse CSV
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data: any) => rows.push(data as CsvRow))
      .on('end', () => {
        console.log(`Read ${rows.length} rows from CSV`);
        resolve();
      })
      .on('error', (error: any) => {
        console.error('Error reading CSV:', error);
        reject(error);
      });
  });

  const currentTimestamp = new Date();
  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  // Process each row
  for (const row of rows) {
    try {
      const symbol = `${row.Symbol}.NS`; // Prepend .NS to symbol
      const name = row['Company Name'];
      
      // Prepare data for upsert
      const stockData = {
        symbol,
        name,
        region: 'IN' as const,
        exchange: 'NSE',
        isActive: true,
        lastSuccessfulDataLoadTimestamp: currentTimestamp,
      };

      // Upsert using Prisma's upsert
      const result = await prisma.stock.upsert({
        where: { symbol },
        update: {
          ...stockData,
          updatedAt: currentTimestamp, // Explicitly set updatedAt
        },
        create: stockData,
      });

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        createdCount++;
        console.log(`Created stock: ${symbol} - ${name}`);
      } else {
        updatedCount++;
        console.log(`Updated stock: ${symbol} - ${name}`);
      }
    } catch (error) {
      errorCount++;
      console.error(`Error processing row ${row.Symbol}:`, error);
    }
  }

  console.log('\n=== Seed Summary ===');
  console.log(`Total rows processed: ${rows.length}`);
  console.log(`Created: ${createdCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('Nifty 500 seeding completed.');
}

seedNifty500()
  .catch((error) => {
    console.error('Failed to seed Nifty 500:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });