/**
 * Rate limiter for API calls using token bucket algorithm
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(requestsPerSecond: number) {
    this.maxTokens = requestsPerSecond;
    this.tokens = requestsPerSecond;
    this.refillRate = requestsPerSecond;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // in seconds
    const newTokens = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        this.refill();
        
        if (this.tokens >= 1) {
          this.tokens -= 1;
          resolve();
        } else {
          // Calculate wait time for next token
          const waitTime = (1 - this.tokens) / this.refillRate * 1000;
          setTimeout(tryAcquire, Math.max(10, waitTime));
        }
      };
      
      tryAcquire();
    });
  }

  getTokens(): number {
    this.refill();
    return this.tokens;
  }
}

/**
 * Rate limiter manager for multiple API endpoints
 */
export class RateLimiterManager {
  private limiters: Map<string, RateLimiter> = new Map();

  registerLimiter(name: string, requestsPerSecond: number): void {
    this.limiters.set(name, new RateLimiter(requestsPerSecond));
  }

  async acquire(limiterName: string): Promise<void> {
    const limiter = this.limiters.get(limiterName);
    if (!limiter) {
      throw new Error(`Rate limiter '${limiterName}' not found`);
    }
    return limiter.acquire();
  }

  getLimiter(limiterName: string): RateLimiter | undefined {
    return this.limiters.get(limiterName);
  }
}

// Default rate limiters for common APIs
export const defaultRateLimiters = new RateLimiterManager();
defaultRateLimiters.registerLimiter('yahoo', 100 / 3600); // 100 requests per hour
defaultRateLimiters.registerLimiter('alpha-vantage', 5 / 60); // 5 requests per minute
defaultRateLimiters.registerLimiter('polygon', 5); // 5 requests per second (premium)