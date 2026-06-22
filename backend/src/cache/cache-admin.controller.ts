import type { Request, Response } from 'express';
import { getRedisClient } from './redis';
import { appConfig } from '../config/env';

const PREFIX = 'cache:v1:';

export class CacheAdminController {
  status = async (_req: Request, res: Response) => {
    if (!appConfig.cacheEnabled) {
      return res.json({
        enabled: false,
        connected: false,
        keyCount: 0,
        keys: [],
        message: 'Page-response cache is disabled (CACHE_ENABLED is not "true").',
      });
    }

    const client = getRedisClient();
    if (!client) {
      return res.json({
        enabled: true,
        connected: false,
        keyCount: 0,
        keys: [],
        message: 'Redis client is not available.',
      });
    }

    try {
      const keys: string[] = [];
      let cursor = '0';
      do {
        const [nextCursor, batch] = await client.scan(cursor, 'MATCH', `${PREFIX}*`, 'COUNT', '100');
        cursor = nextCursor;
        keys.push(...batch);
      } while (cursor !== '0');

      const pipeline = client.pipeline();
      for (const key of keys) {
        pipeline.ttl(key);
        pipeline.strlen(key);
      }
      const results = await pipeline.exec();

      const keyDetails = keys.map((key, i) => ({
        key,
        ttlSeconds: (results?.[i * 2]?.[1] as number) ?? -1,
        sizeBytes: (results?.[i * 2 + 1]?.[1] as number) ?? 0,
      }));

      return res.json({
        enabled: true,
        connected: true,
        keyCount: keys.length,
        keys: keyDetails,
      });
    } catch (error) {
      return res.status(500).json({
        enabled: true,
        connected: false,
        keyCount: 0,
        keys: [],
        error: (error as Error)?.message ?? 'Redis query failed',
      });
    }
  };
}
