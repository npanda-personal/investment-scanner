import { appConfig } from '../config/env';
import { getRedisClient } from './redis';

/** Minimal surface we use from the Redis client — keeps the service trivially mockable in tests. */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', ttlSeconds: number): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
}

export interface CacheReadResult<T> {
  data: T;
  cacheHit: boolean;
}

/** Safety net so a skipped/failed pipeline run can't serve infinitely-stale data (~36h). */
const DEFAULT_TTL_SECONDS = 36 * 60 * 60;

/**
 * Read-through JSON cache over Redis. Every operation degrades gracefully: when caching is
 * disabled or Redis is unreachable, reads miss and writes no-op, so callers always fall through
 * to their producer (the existing DB-backed service call). The cache never throws into a request.
 */
export class CacheService {
  constructor(private readonly getClient: () => RedisLike | null = getRedisClient) {}

  isEnabled(): boolean {
    return appConfig.cacheEnabled;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const client = this.getClient();
    if (!client) {
      return null;
    }
    try {
      const raw = await client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      console.error('[cache] getJson failed', key, (error as Error)?.message);
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<void> {
    const client = this.getClient();
    if (!client) {
      return;
    }
    try {
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      console.error('[cache] setJson failed', key, (error as Error)?.message);
    }
  }

  /** Best-effort delete of one or more keys (e.g. invalidation after a manual snapshot refresh). */
  async delete(...keys: string[]): Promise<void> {
    const client = this.getClient();
    if (!client || keys.length === 0) {
      return;
    }
    try {
      await client.del(...keys);
    } catch (error) {
      console.error('[cache] delete failed', keys, (error as Error)?.message);
    }
  }

  /**
   * Return the cached value for `key`, or run `producer`, cache its result, and return it.
   * A null/undefined producer result is returned but never cached (avoids pinning empty pages).
   * Pass `shouldCache` to add domain-level checks (e.g. skip caching an `availability:'EMPTY'`
   * envelope that is truthy but carries no real data).
   */
  async cacheReadThrough<T>(
    key: string,
    producer: () => Promise<T>,
    ttlSeconds: number = DEFAULT_TTL_SECONDS,
    shouldCache?: (value: T) => boolean,
  ): Promise<CacheReadResult<T>> {
    const cached = await this.getJson<T>(key);
    if (cached !== null) {
      return { data: cached, cacheHit: true };
    }
    const fresh = await producer();
    if (fresh !== null && fresh !== undefined && (!shouldCache || shouldCache(fresh))) {
      await this.setJson(key, fresh, ttlSeconds);
    }
    return { data: fresh, cacheHit: false };
  }
}

/** Shared singleton used by controllers; injectable (with a default) into the pipeline stage. */
export const cacheService = new CacheService();
