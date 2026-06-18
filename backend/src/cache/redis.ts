import Redis from 'ioredis';
import { appConfig } from '../config/env';

/**
 * Lazily-constructed shared Redis client (mirrors the prisma singleton in src/db/prisma.ts).
 * Returns null whenever caching is disabled so callers transparently fall through to the DB.
 * Connection errors are swallowed (logged only) — the cache must never crash a request or boot.
 */
let client: Redis | null = null;

export const getRedisClient = (): Redis | null => {
  if (!appConfig.cacheEnabled) {
    return null;
  }
  if (client) {
    return client;
  }

  client = new Redis(appConfig.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
    enableOfflineQueue: false,
    // Give up reconnecting after a few attempts so a down Redis fails fast into DB fallback.
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
  });

  // ioredis emits 'error' on connection problems; an unhandled listener would crash the process.
  client.on('error', (error: Error) => {
    console.error('[cache] redis error', error?.message ?? error);
  });

  return client;
};

/** Best-effort connect at boot. Never throws — read-through falls back to DB if Redis is down. */
export const connectRedis = async (): Promise<void> => {
  const instance = getRedisClient();
  if (!instance) {
    return;
  }
  try {
    await instance.connect();
    console.log('[cache] redis connected');
  } catch (error) {
    console.error('[cache] redis connect failed; serving from DB until it recovers', (error as Error)?.message);
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (!client) {
    return;
  }
  try {
    await client.quit();
  } catch {
    client.disconnect();
  }
  client = null;
};
