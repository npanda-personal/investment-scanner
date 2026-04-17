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
    if (symbol.includes('.')) {
      // Generic fallback: assume US with exchange suffix
      const parts = symbol.split('.');
      return { region: 'US', exchange: parts[1] };
    }
    // Default assumption: US stock
    return { region: 'US', exchange: 'NASDAQ' };
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

    // Use a transaction to ensure consistency
    await this.prisma.$transaction(async (tx: any) => {
      // Insert price ticks
      for (const price of prices) {
        await tx.priceTick.create({
          data: {
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
        });
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
    });

    console.log(`Stored ${prices.length} price ticks for ${prices[0].symbol}`);
  }

  /**
   * Fetch and store historical data for a single symbol with delay.
   */
  async ingestSymbol(
    symbol: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<void> {
    console.log(`Ingesting ${symbol}...`);
    const prices = await this.fetchHistorical(symbol, startDate, endDate);
    await this.storeHistorical(prices);
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