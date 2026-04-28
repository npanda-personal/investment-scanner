import { MarketDataFoundationRepository } from './market-data-foundation.repository';
import { MarketDataFoundationService } from './market-data-foundation.service';
import defaultPrisma from '../../db/prisma';

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
  const marketDataService = new MarketDataFoundationService(
    new MarketDataFoundationRepository(defaultPrisma)
  );
  // Use setTimeout to simulate background job with throttling
  setTimeout(async () => {
    try {
      await marketDataService.ingestSymbol(symbol, startDate, endDate);
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
