import { RateLimiterManager, defaultRateLimiters } from './rate-limiter';
import { BatchRequest } from '../types/scanner-extended';

/**
 * Configuration for batch processing
 */
export interface BatchConfig {
  chunkSize: number;
  maxConcurrentChunks: number;
  delayBetweenChunks: number; // ms
  requestTimeout: number; // ms
  maxRetries: number;
  rateLimiterName?: string;
}

/**
 * Default batch configuration
 */
export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  chunkSize: 25,
  maxConcurrentChunks: 2,
  delayBetweenChunks: 1000,
  requestTimeout: 10000,
  maxRetries: 2,
  rateLimiterName: 'yahoo'
};

/**
 * Result of a batch operation
 */
export interface BatchResult<T> {
  data: T[];
  errors: Array<{ symbol: string; error: any }>;
  metadata: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalTimeMs: number;
    averageTimePerRequestMs: number;
  };
}

/**
 * Manages batch API requests with chunking, rate limiting, and retries
 */
export class BatchAPIManager {
  private rateLimiterManager: RateLimiterManager;
  private config: BatchConfig;

  constructor(
    config: Partial<BatchConfig> = {},
    rateLimiterManager: RateLimiterManager = defaultRateLimiters
  ) {
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
    this.rateLimiterManager = rateLimiterManager;
  }

  /**
   * Chunk an array into smaller arrays of specified size
   */
  chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Execute a batch request with chunking and rate limiting
   */
  async executeBatch<T>(request: BatchRequest<T>): Promise<BatchResult<T>> {
    const startTime = Date.now();
    const chunks = this.chunkArray(request.symbols, request.chunkSize);
    const results: T[] = [];
    const errors: Array<{ symbol: string; error: any }> = [];
    
    let completedChunks = 0;
    const totalChunks = chunks.length;

    // Process chunks with concurrency control
    const processChunk = async (chunk: string[], chunkIndex: number): Promise<void> => {
      try {
        // Apply rate limiting if configured
        if (this.config.rateLimiterName) {
          await this.rateLimiterManager.acquire(this.config.rateLimiterName);
        }

        // Add delay between chunks (except first chunk)
        if (chunkIndex > 0 && this.config.delayBetweenChunks > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenChunks));
        }

        // Execute request with retry logic
        const chunkResult = await this.withRetry(
          () => request.requestFn(chunk),
          this.config.maxRetries,
          this.config.requestTimeout
        );

        results.push(...chunkResult);
        completedChunks++;
        
        // Emit progress event (could be used for WebSocket updates)
        this.emitProgress(completedChunks, totalChunks, chunk);

      } catch (error) {
        // Record errors for each symbol in the chunk
        chunk.forEach(symbol => {
          errors.push({ symbol, error });
        });
        completedChunks++;
      }
    };

    // Process chunks with limited concurrency
    const concurrencyLimit = Math.min(this.config.maxConcurrentChunks, chunks.length);
    
    for (let i = 0; i < chunks.length; i += concurrencyLimit) {
      const currentChunks = chunks.slice(i, i + concurrencyLimit);
      const chunkPromisesBatch = currentChunks.map((chunk, index) =>
        processChunk(chunk, i + index)
      );
      
      await Promise.all(chunkPromisesBatch);
    }

    const totalTimeMs = Date.now() - startTime;

    return {
      data: results,
      errors,
      metadata: {
        totalRequests: chunks.length,
        successfulRequests: chunks.length - errors.length,
        failedRequests: errors.length,
        totalTimeMs,
        averageTimePerRequestMs: totalTimeMs / chunks.length
      }
    };
  }

  /**
   * Retry a function with exponential backoff
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    timeoutMs: number
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
        });

        // Race between the function and timeout
        return await Promise.race([fn(), timeoutPromise]);
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff: 1s, 2s, 4s, etc.
        const backoffMs = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    
    throw lastError;
  }

  /**
   * Emit progress event (to be extended for WebSocket/event emission)
   */
  private emitProgress(_completed: number, _total: number, _currentChunk: string[]): void {
    // This is a placeholder for progress events
    // In a real implementation, this would emit events via WebSocket or EventEmitter
    // For now, we just log progress (commented out to reduce noise)
    // console.log(`Progress: ${_completed}/${_total} (${Math.round((_completed / _total) * 100)}%)`);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): BatchConfig {
    return { ...this.config };
  }
}

/**
 * Factory function to create a batch manager with specific configuration
 */
export function createBatchManager(config: Partial<BatchConfig> = {}): BatchAPIManager {
  return new BatchAPIManager(config);
}

/**
 * Specialized batch manager for market data fetching
 */
export class MarketDataBatchManager extends BatchAPIManager {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTtl: number; // ms

  constructor(
    config: Partial<BatchConfig> = {},
    cacheTtl: number = 5 * 60 * 1000 // 5 minutes default
  ) {
    super({ ...config, rateLimiterName: 'yahoo' });
    this.cacheTtl = cacheTtl;
  }


  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheTtl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    // This would need tracking of cache hits/misses for accurate hit rate
    return {
      size: this.cache.size,
      hitRate: 0 // Placeholder
    };
  }
}