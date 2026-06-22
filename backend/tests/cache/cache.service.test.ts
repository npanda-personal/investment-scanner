import { CacheService } from '../../src/cache/cache.service';

const makeClient = () => {
  const store = new Map<string, string>();
  return {
    store,
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    set: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    del: jest.fn(async (...keys: string[]) => {
      let removed = 0;
      for (const k of keys) {
        if (store.delete(k)) removed += 1;
      }
      return removed;
    }),
    scan: jest.fn(async () => ['0', []] as [string, string[]]),
  };
};

describe('CacheService', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the cached value on hit without calling the producer', async () => {
    const client = makeClient();
    client.store.set('k', JSON.stringify({ a: 1 }));
    const svc = new CacheService(() => client as any);
    const producer = jest.fn(async () => ({ a: 999 }));

    const result = await svc.cacheReadThrough('k', producer);

    expect(result).toEqual({ a: 1 });
    expect(producer).not.toHaveBeenCalled();
  });

  it('runs the producer and caches its result on miss', async () => {
    const client = makeClient();
    const svc = new CacheService(() => client as any);
    const producer = jest.fn(async () => ({ a: 2 }));

    const result = await svc.cacheReadThrough('k', producer);

    expect(result).toEqual({ a: 2 });
    expect(producer).toHaveBeenCalledTimes(1);
    expect(client.set).toHaveBeenCalledWith('k', JSON.stringify({ a: 2 }), 'EX', expect.any(Number));
  });

  it('degrades gracefully: returns the producer result when Redis get throws', async () => {
    const client = {
      get: jest.fn(async () => {
        throw new Error('redis down');
      }),
      set: jest.fn(async () => {}),
    };
    const svc = new CacheService(() => client as any);
    const producer = jest.fn(async () => ({ ok: true }));

    const result = await svc.cacheReadThrough('k', producer);

    expect(result).toEqual({ ok: true });
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it('never caches a null producer result', async () => {
    const client = makeClient();
    const svc = new CacheService(() => client as any);

    const result = await svc.cacheReadThrough('k', async () => null);

    expect(result).toBeNull();
    expect(client.set).not.toHaveBeenCalled();
  });

  it('disabled (no client) → producer runs and Redis is never touched', async () => {
    const svc = new CacheService(() => null);
    const producer = jest.fn(async () => 'x');

    const result = await svc.cacheReadThrough('k', producer);

    expect(result).toBe('x');
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it('delete() removes the given keys via the client', async () => {
    const client = makeClient();
    client.store.set('a', '1');
    client.store.set('b', '2');
    const svc = new CacheService(() => client as any);

    await svc.delete('a', 'b');

    expect(client.del).toHaveBeenCalledWith('a', 'b');
    expect(client.store.has('a')).toBe(false);
    expect(client.store.has('b')).toBe(false);
  });

  it('delete() no-ops when disabled and when given no keys', async () => {
    const disabled = new CacheService(() => null);
    await expect(disabled.delete('a')).resolves.toBeUndefined();

    const client = makeClient();
    const svc = new CacheService(() => client as any);
    await svc.delete();
    expect(client.del).not.toHaveBeenCalled();
  });

  it('cacheReadThroughWithMeta: returns { data, cacheHit: true } on cache hit', async () => {
    const client = makeClient();
    client.store.set('k', JSON.stringify({ a: 1 }));
    const svc = new CacheService(() => client as any);
    const producer = jest.fn(async () => ({ a: 999 }));

    const result = await svc.cacheReadThroughWithMeta('k', producer);

    expect(result).toEqual({ data: { a: 1 }, cacheHit: true });
    expect(producer).not.toHaveBeenCalled();
  });

  it('cacheReadThroughWithMeta: runs producer and returns { data, cacheHit: false } on miss', async () => {
    const client = makeClient();
    const svc = new CacheService(() => client as any);
    const producer = jest.fn(async () => ({ a: 2 }));

    const result = await svc.cacheReadThroughWithMeta('k', producer);

    expect(result).toEqual({ data: { a: 2 }, cacheHit: false });
    expect(producer).toHaveBeenCalledTimes(1);
    expect(client.set).toHaveBeenCalledWith('k', JSON.stringify({ a: 2 }), 'EX', expect.any(Number));
  });

  it('cacheReadThroughWithMeta: null producer result is not cached', async () => {
    const client = makeClient();
    const svc = new CacheService(() => client as any);

    const result = await svc.cacheReadThroughWithMeta('k', async () => null as any);

    expect(result).toEqual({ data: null, cacheHit: false });
    expect(client.set).not.toHaveBeenCalled();
  });

  it('cacheReadThroughWithMeta: degrades gracefully when Redis get throws', async () => {
    const client = {
      get: jest.fn(async () => { throw new Error('redis down'); }),
      set: jest.fn(async () => {}),
      scan: jest.fn(async () => ['0', []] as [string, string[]]),
    };
    const svc = new CacheService(() => client as any);
    const producer = jest.fn(async () => ({ ok: true }));

    const result = await svc.cacheReadThroughWithMeta('k', producer);

    expect(result).toEqual({ data: { ok: true }, cacheHit: false });
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it('deleteByPrefix: deletes all keys matching prefix in single scan pass', async () => {
    const client = makeClient();
    client.scan.mockResolvedValueOnce(['0', ['cache:v1:screener:a', 'cache:v1:screener:b']]);
    const svc = new CacheService(() => client as any);

    const count = await svc.deleteByPrefix('cache:v1:screener:');

    expect(count).toBe(2);
    expect(client.scan).toHaveBeenCalledWith('0', 'MATCH', 'cache:v1:screener:*', 'COUNT', 100);
    expect(client.del).toHaveBeenCalledWith('cache:v1:screener:a', 'cache:v1:screener:b');
  });

  it('deleteByPrefix: iterates cursor until exhausted (multi-page)', async () => {
    const client = makeClient();
    client.scan
      .mockResolvedValueOnce(['nextcursor', ['key1']])
      .mockResolvedValueOnce(['0', ['key2']]);
    const svc = new CacheService(() => client as any);

    const count = await svc.deleteByPrefix('cache:v1:movers:');

    expect(count).toBe(2);
    expect(client.scan).toHaveBeenCalledTimes(2);
    expect(client.del).toHaveBeenCalledTimes(2);
  });

  it('deleteByPrefix: returns 0 and swallows error on Redis failure', async () => {
    const client = makeClient();
    client.scan.mockRejectedValueOnce(new Error('redis timeout'));
    const svc = new CacheService(() => client as any);

    const count = await svc.deleteByPrefix('cache:v1:screener:');

    expect(count).toBe(0);
    expect(console.error).toHaveBeenCalled();
  });

  it('deleteByPrefix: no-ops when cache is disabled', async () => {
    const svc = new CacheService(() => null);

    const count = await svc.deleteByPrefix('cache:v1:screener:');

    expect(count).toBe(0);
  });
});
