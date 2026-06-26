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

/** Loud, unmissable banner so an operator can't miss that the cache silently degraded to DB. */
const warnCacheDegraded = (reason: string): void => {
  const line = '='.repeat(72);
  console.warn(
    `\n${line}\n` +
      `[cache] ⚠  CACHE_ENABLED=true BUT REDIS IS UNREACHABLE (${reason}).\n` +
      `[cache] ⚠  Every cached endpoint will fall through to Postgres on EVERY request —\n` +
      `[cache] ⚠  the page-cache concurrency relief is OFF. Start Redis:\n` +
      `[cache] ⚠      docker compose --profile cache up -d redis\n` +
      `${line}\n`,
  );
};

/**
 * Best-effort connect at boot. Never throws — read-through falls back to DB if Redis is down.
 * A successful connect() does NOT prove a usable server, so we PING and emit a loud banner on
 * failure: the failure mode this guards against is a long-lived backend silently serving every
 * request from Postgres while the operator believes the cache is helping.
 */
export const connectRedis = async (): Promise<void> => {
  const instance = getRedisClient();
  if (!instance) {
    return;
  }
  try {
    await instance.connect();
    await instance.ping();
    console.log('[cache] redis connected and reachable (page-cache active)');
  } catch (error) {
    warnCacheDegraded((error as Error)?.message ?? 'connect/ping failed');
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
