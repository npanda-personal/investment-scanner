import { Router } from 'express';
import { CacheAdminController } from './cache-admin.controller';

export function createCacheAdminRouter(controller = new CacheAdminController()) {
  const router = Router();
  router.get('/cache/status', controller.status);
  return router;
}

export const cacheAdminRouter = createCacheAdminRouter();
