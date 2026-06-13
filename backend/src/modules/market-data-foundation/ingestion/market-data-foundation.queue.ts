/**
 * Enqueue a stock ingestion job with optional delay.
 * Legacy provider ingestion is disabled for the NSE/BSE-only reset.
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
  void startDate;
  void endDate;
  void delayMs;
  console.warn(`Legacy provider ingestion queue is disabled for ${symbol}; use NSE/BSE exchange-file imports.`);
  return {
    id: 'provider-ingestion-disabled-' + Date.now(),
    symbol,
    status: 'disabled',
    code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
  };
}

// Dummy exports for compatibility
export const ingestionQueue = null;
export const ingestionWorker = null;
