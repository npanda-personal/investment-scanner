import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

interface CsvRow {
  Symbol: string;
  Security: string;
  'GICS Sector': string;
  'GICS Sub-Industry': string;
  'Headquarters Location': string;
  'Date added': string;
  CIK: string;
  Founded: string;
}

// Simple heuristic to determine exchange based on symbol or sector
function inferExchange(symbol: string, sector: string): string {
  // Known NASDAQ-heavy sectors
  const nasdaqSectors = ['Information Technology', 'Communication Services'];
  const nasdaqSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'AMD', 'INTC'];
  
  if (nasdaqSymbols.includes(symbol)) {
    return 'NASDAQ';
  }
  
  if (nasdaqSectors.includes(sector)) {
    return 'NASDAQ';
  }
  
  // Default to NYSE
  return 'NYSE';
}

async function seedUSStocks() {
  console.log('Starting US Stocks CSV upsert...');
  
  const csvFilePath = path.join(__dirname, '..', 'docs', 'constituents.csv');
  
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
      const symbol = row.Symbol;
      const name = row.Security;
      const sector = row['GICS Sector'];
      const exchange = inferExchange(symbol, sector);
      
      // Prepare data for upsert
      const stockData = {
        symbol,
        name,
        region: 'US' as const,
        exchange,
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
        console.log(`Created stock: ${symbol} - ${name} (${exchange})`);
      } else {
        updatedCount++;
        console.log(`Updated stock: ${symbol} - ${name} (${exchange})`);
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
  console.log('US Stocks seeding completed.');
}

seedUSStocks()
  .catch((error) => {
    console.error('Failed to seed US stocks:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });