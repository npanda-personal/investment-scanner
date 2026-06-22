import { CacheAdminController } from '../../src/cache/cache-admin.controller';

jest.mock('../../src/config/env', () => ({
  appConfig: { cacheEnabled: true },
}));

jest.mock('../../src/cache/redis', () => ({
  getRedisClient: jest.fn(),
}));

import { appConfig } from '../../src/config/env';
import { getRedisClient } from '../../src/cache/redis';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('CacheAdminController', () => {
  const controller = new CacheAdminController();

  afterEach(() => jest.restoreAllMocks());

  it('returns disabled status when cache is off', async () => {
    (appConfig as any).cacheEnabled = false;
    const res = mockResponse();
    await controller.status({} as any, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ enabled: false, keyCount: 0 }));
    (appConfig as any).cacheEnabled = true;
  });

  it('returns connected=false when Redis client is null', async () => {
    (getRedisClient as jest.Mock).mockReturnValue(null);
    const res = mockResponse();
    await controller.status({} as any, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, connected: false }));
  });

  it('returns key details when Redis is available', async () => {
    const mockClient = {
      scan: jest.fn()
        .mockResolvedValueOnce(['0', ['cache:v1:a', 'cache:v1:b']]),
      pipeline: jest.fn().mockReturnValue({
        ttl: jest.fn().mockReturnThis(),
        strlen: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 3600], [null, 100],
          [null, 7200], [null, 200],
        ]),
      }),
    };
    (getRedisClient as jest.Mock).mockReturnValue(mockClient);
    const res = mockResponse();
    await controller.status({} as any, res);
    expect(res.json).toHaveBeenCalledWith({
      enabled: true,
      connected: true,
      keyCount: 2,
      keys: [
        { key: 'cache:v1:a', ttlSeconds: 3600, sizeBytes: 100 },
        { key: 'cache:v1:b', ttlSeconds: 7200, sizeBytes: 200 },
      ],
    });
  });

  it('returns error on Redis failure', async () => {
    (getRedisClient as jest.Mock).mockReturnValue({
      scan: jest.fn().mockRejectedValue(new Error('connection refused')),
    });
    const res = mockResponse();
    await controller.status({} as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'connection refused' }));
  });
});
