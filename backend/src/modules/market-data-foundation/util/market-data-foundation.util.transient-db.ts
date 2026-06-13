// Transient-database recovery leaf utilities extracted from MarketDataFoundationService.
// Free functions, no instance/repository state. Behavior is byte-identical to the prior methods.
import { sleep } from './market-data-foundation.util.concurrency';
import { readPositiveNumber } from './market-data-foundation.util.download';
import { errorMessage } from './market-data-foundation.util.misc';

export function isTransientDatabaseError(error: unknown): boolean {
  const typed = error as { code?: string; message?: string } | null | undefined;
  const code = typeof typed?.code === 'string' ? typed.code : '';
  const message = error instanceof Error ? error.message : String(typed?.message || '');
  return ['P1001', 'P1002', 'P1017', 'P2024'].includes(code)
    || /server has closed the connection|database system is in recovery mode|not yet accepting connections|connection terminated|connection reset|can't reach database|connection pool timeout|timed out/i.test(message);
}

export function transientDatabaseMessage(error: unknown): string {
  const raw = errorMessage(error, 'database unavailable').replace(/\s+/g, ' ').trim();
  const fatal = raw.match(/FATAL:\s*.*?(?=\s+Invalid `|\s+at\s+|$)/i)?.[0];
  const detail = raw.match(/DETAIL:\s*.*?(?=\s+Invalid `|\s+at\s+|$)/i)?.[0];
  const connector = raw.match(/Server has closed the connection\.?|database system is in recovery mode|database system is not yet accepting connections|Consistent recovery state has not been yet reached\.?|connection terminated|connection reset|connection pool timeout|timed out/i)?.[0];
  return [fatal, detail].filter(Boolean).join(' ') || connector || 'database temporarily unavailable';
}

export async function withTransientDatabaseRetry<T>(operation: () => Promise<T>, label: string): Promise<T> {
  const maxAttempts = Math.max(1, Math.min(readPositiveNumber(process.env.MARKET_DATA_DB_TRANSIENT_RETRY_ATTEMPTS, 4), 8));
  const baseDelayMs = Math.max(25, Math.min(readPositiveNumber(process.env.MARKET_DATA_DB_TRANSIENT_RETRY_DELAY_MS, 250), 5_000));
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDatabaseError(error) || attempt >= maxAttempts) throw error;
      const delayMs = Math.min(baseDelayMs * attempt, 10_000);
      console.warn(`[MarketDataFoundation] transient database error during ${label}; retrying attempt ${attempt + 1}/${maxAttempts}: ${transientDatabaseMessage(error)}`);
      await sleep(delayMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Transient database operation failed');
}
