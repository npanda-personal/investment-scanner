import YahooFinance from 'yahoo-finance2';
import { PrismaClient, Prisma } from '@prisma/client';
import { setTimeout } from 'timers/promises';
import defaultPrisma from '../../db/prisma';

export interface HistoricalPrice {
  symbol: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface RegionInfo {
  region?: string;
  exchange?: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type?: string;
  exchange?: string;
  region?: string;
}

export class YahooFinanceIngestionService {
  public prisma: PrismaClient;
  private batchDelayMs: number;
  private yahooFinance: any;

  constructor(prisma?: PrismaClient, batchDelayMs: number = 1000) {
    this.prisma = prisma || defaultPrisma;
    this.batchDelayMs = batchDelayMs;
    this.yahooFinance = new YahooFinance();
  }

  /**
   * Infer region and exchange from symbol (basic heuristic).
   * This can be extended with a proper mapping.
   */
  inferRegion(symbol: string): RegionInfo {
    // Simple mapping based on suffix or prefix
    if (symbol.endsWith('.DE')) return { region: 'EU', exchange: 'XETRA' };
    if (symbol.endsWith('.L')) return { region: 'UK', exchange: 'LSE' };
    if (symbol.endsWith('.TO')) return { region: 'CA', exchange: 'TSX' };
    if (symbol.endsWith('.V')) return { region: 'CA', exchange: 'TSXV' };
    if (symbol.endsWith('.AS')) return { region: 'EU', exchange: 'Euronext' };
    if (symbol.endsWith('.PA')) return { region: 'EU', exchange: 'Euronext' };
    if (symbol.endsWith('.MI')) return { region: 'EU', exchange: 'Borsa Italiana' };
    // Indian exchanges
    if (symbol.endsWith('.NS')) return { region: 'IN', exchange: 'NSE' };
    if (symbol.endsWith('.BO')) return { region: 'IN', exchange: 'BSE' };
    if (symbol.includes('.')) {
      // Generic fallback: assume US with exchange suffix
      const parts = symbol.split('.');
      return { region: 'US', exchange: parts[1] };
    }
    // Default assumption: US stock
    return { region: 'US', exchange: 'NASDAQ' };
  }

  /**
   * Search for symbols using Yahoo Finance search.
   */
  async search(query: string): Promise<SearchResult[]> {
    try {
      const response = await this.yahooFinance.search(query);
      // The yahoo-finance2 search returns an object with a 'quotes' array
      const quotes = Array.isArray(response) ? response : response.quotes || [];
      const results: SearchResult[] = [];
      for (const item of quotes) {
        if (!item.symbol) continue;
        try {
          const region = this.inferRegion(item.symbol).region;
          results.push({
            symbol: item.symbol,
            name: item.name || '',
            type: item.type || '',
            exchange: item.exchange || '',
            region,
          });
        } catch (err) {
          // skip items with region inference errors
          continue;
        }
      }
      return results;
    } catch (error) {
      console.error(`Failed to search for "${query}":`, error);
      throw error;
    }
  }

  /**
   * Fetch historical daily data for a symbol from Yahoo Finance.
   * @param symbol Yahoo Finance symbol (e.g., 'AAPL', 'VOW.DE')
   * @param startDate start date (default: 30 days ago)
   * @param endDate end date (default: today)
   */
  async fetchHistorical(
    symbol: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<HistoricalPrice[]> {
    const queryOptions = {
      period1: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      period2: endDate || new Date(),
      interval: '1d' as const,
    };

    try {
      // yahooFinance.historical returns an array of historical quotes
      const result = (await this.yahooFinance.historical(symbol, queryOptions)) as any[];
      return result.map((item: any) => ({
        symbol,
        date: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
      }));
    } catch (error) {
      console.error(`Failed to fetch historical data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Store a list of historical prices into PriceTick table.
   * Also updates the LatestPrice table.
   */
  async storeHistorical(prices: HistoricalPrice[]): Promise<void> {
    if (prices.length === 0) return;

    const regionInfo = this.inferRegion(prices[0].symbol);
    const latest = prices.reduce((prev, current) =>
      prev.date > current.date ? prev : current
    );

    console.log(`  Storing ${prices.length} price ticks for ${prices[0].symbol}...`);

    try {
      // Use a transaction with increased timeout for large datasets
      await this.prisma.$transaction(async (tx: any) => {
        // Process in smaller batches to avoid transaction timeout
        const batchSize = 100;
        for (let i = 0; i < prices.length; i += batchSize) {
          const batch = prices.slice(i, i + batchSize);
          
          // Create upsert operations for the batch
          const upsertOperations = batch.map(price =>
            tx.priceTick.upsert({
              where: {
                symbol_timestamp: {
                  symbol: price.symbol,
                  timestamp: price.date,
                },
              },
              update: {
                open: new Prisma.Decimal(price.open),
                high: new Prisma.Decimal(price.high),
                low: new Prisma.Decimal(price.low),
                close: new Prisma.Decimal(price.close),
                volume: price.volume ? BigInt(price.volume) : null,
                source: 'yahoo',
                region: regionInfo.region,
                exchange: regionInfo.exchange,
              },
              create: {
                symbol: price.symbol,
                region: regionInfo.region,
                exchange: regionInfo.exchange,
                timestamp: price.date,
                open: new Prisma.Decimal(price.open),
                high: new Prisma.Decimal(price.high),
                low: new Prisma.Decimal(price.low),
                close: new Prisma.Decimal(price.close),
                volume: price.volume ? BigInt(price.volume) : null,
                source: 'yahoo',
              },
            })
          );

          // Execute batch in parallel but within transaction
          await Promise.all(upsertOperations);
          
          if (batch.length === batchSize) {
            console.log(`    Processed ${i + batchSize} of ${prices.length} records...`);
          }
        }

        // Upsert latest price
        await tx.latestPrice.upsert({
          where: { symbol: latest.symbol },
          update: {
            region: regionInfo.region,
            price: new Prisma.Decimal(latest.close),
            timestamp: latest.date,
            updatedAt: new Date(),
          },
          create: {
            symbol: latest.symbol,
            region: regionInfo.region,
            price: new Prisma.Decimal(latest.close),
            timestamp: latest.date,
            updatedAt: new Date(),
          },
        });
      }, {
        maxWait: 30000, // 30 seconds max wait
        timeout: 60000, // 60 seconds timeout for large datasets
      });

      console.log(`  Successfully stored ${prices.length} price ticks for ${prices[0].symbol}`);
    } catch (error) {
      console.error(`  Failed to store price ticks for ${prices[0].symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch and store historical data for a single symbol with delay.
   * Uses incremental loading based on lastSuccessfulDataLoadTimestamp.
   */
  async ingestSymbol(
    symbol: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<void> {
    console.log(`Ingesting ${symbol}...`);
    
    // Get the stock record to check last successful load timestamp
    const stock = await this.prisma.stock.findUnique({
      where: { symbol }
    });
    
    // Determine effective start date for incremental loading
    let effectiveStartDate = startDate;
    
    if (!effectiveStartDate) {
      if (stock?.lastSuccessfulDataLoadTimestamp) {
        // For incremental loads, start from the day after last successful load
        // to avoid fetching already stored data
        effectiveStartDate = new Date(stock.lastSuccessfulDataLoadTimestamp);
        effectiveStartDate.setDate(effectiveStartDate.getDate() + 1);
        console.log(`  Using incremental start date: ${effectiveStartDate.toISOString().split('T')[0]} (based on lastSuccessfulDataLoadTimestamp)`);
      } else {
        // First-time load: default to 30 days ago
        effectiveStartDate = new Date();
        effectiveStartDate.setDate(effectiveStartDate.getDate() - 30);
        console.log(`  Using default start date: ${effectiveStartDate.toISOString().split('T')[0]} (first-time load)`);
      }
    }
    
    // Ensure we don't fetch future dates
    const effectiveEndDate = endDate || new Date();
    
    // Don't fetch if start date is after end date (already up to date)
    if (effectiveStartDate >= effectiveEndDate) {
      console.log(`  Skipping ${symbol}: already up to date (last load: ${stock?.lastSuccessfulDataLoadTimestamp})`);
      return;
    }
    
    console.log(`  Fetching data from ${effectiveStartDate.toISOString().split('T')[0]} to ${effectiveEndDate.toISOString().split('T')[0]}`);
    
    const prices = await this.fetchHistorical(symbol, effectiveStartDate, effectiveEndDate);
    
    if (prices.length === 0) {
      console.log(`  No new price data available for ${symbol}`);
      // Still update timestamp to indicate successful check
      await this.prisma.stock.update({
        where: { symbol },
        data: { lastSuccessfulDataLoadTimestamp: new Date() }
      });
      return;
    }
    
    await this.storeHistorical(prices);
    
    // Update lastSuccessfulDataLoadTimestamp after successful storage
    await this.prisma.stock.update({
      where: { symbol },
      data: { lastSuccessfulDataLoadTimestamp: new Date() }
    });
    
    console.log(`  Successfully ingested ${prices.length} price ticks for ${symbol}`);
  }

  /**
   * Batch ingestion for multiple symbols with rate limiting.
   */
  async ingestSymbols(
    symbols: string[],
    startDate?: Date,
    endDate?: Date
  ): Promise<void> {
    for (const symbol of symbols) {
      try {
        await this.ingestSymbol(symbol, startDate, endDate);
        await setTimeout(this.batchDelayMs); // respect rate limits
      } catch (error) {
        console.error(`Ingestion failed for ${symbol}:`, error);
        // Continue with next symbol
      }
    }
  }

  /**
   * Close the Prisma client (call when service is no longer needed).
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}