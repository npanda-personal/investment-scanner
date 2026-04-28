import { YahooFinanceIngestionService } from '../providers/yahoo-finance.provider';
import defaultPrisma from '../../../db/prisma';

/**
 * Enqueue a stock ingestion job with optional delay.
 * Since Redis is not available, we run ingestion synchronously after delay.
 * @param symbol Stock symbol
 * @param startDate Start date for historical data (default: 15 years ago)
 * @param endDate End date (default: today)
 * @param delayMs Delay before processing (for throttling)
 */
export async function enqueueIngestionJob(
  symbol: string,
  startDate?: Date,
  endDate?: Date,
  delayMs: number = 1000
) {
  console.warn(`Redis unavailable, running ingestion synchronously for ${symbol} after ${delayMs}ms`);
  const ingestionService = new YahooFinanceIngestionService(defaultPrisma);
  // Use setTimeout to simulate background job with throttling
  setTimeout(async () => {
    try {
      await ingestionService.ingestSymbol(symbol, startDate, endDate);
      // Update stock's lastSuccessfulDataLoadTimestamp
      // Using bracket notation to avoid TypeScript errors
      await (defaultPrisma as any).stock.update({
        where: { symbol },
        data: { lastSuccessfulDataLoadTimestamp: new Date() },
      });
      console.log(`Synchronous ingestion completed for ${symbol}`);
    } catch (error) {
      console.error(`Synchronous ingestion failed for ${symbol}:`, error);
    }
  }, delayMs);
  // Return a dummy job object
  return { id: 'sync-' + Date.now(), symbol };
}

// Dummy exports for compatibility
export const ingestionQueue = null;
export const ingestionWorker = null;
