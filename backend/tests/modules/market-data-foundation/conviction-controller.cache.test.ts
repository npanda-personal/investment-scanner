import { MarketDataFoundationConvictionController } from '../../../src/modules/market-data-foundation/market-data-foundation.conviction.controller';
import { convictionKey } from '../../../src/cache/cache-keys';

const response = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('MarketDataFoundationConvictionController read-through cache', () => {
  it('serves the cached payload on hit without calling the service', async () => {
    const service = { conviction: jest.fn() };
    const cached = { results: ['cached'] };
    const cache = { cacheReadThrough: jest.fn(async () => cached) };
    const controller = new MarketDataFoundationConvictionController(service as any, cache as any);
    const res = response();

    await controller.conviction({ query: { region: 'IN', assetType: 'STOCK' } } as any, res);

    expect(cache.cacheReadThrough).toHaveBeenCalledTimes(1);
    expect(service.conviction).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(cached);
  });

  it('keys on the normalized scope and runs the service on miss', async () => {
    const service = { conviction: jest.fn().mockResolvedValue({ results: [] }) };
    let usedKey = '';
    // Emulate a miss: run the producer (the service call) like the real cache does.
    const cache = {
      cacheReadThrough: jest.fn(async (key: string, producer: () => Promise<unknown>) => {
        usedKey = key;
        return producer();
      }),
    };
    const controller = new MarketDataFoundationConvictionController(service as any, cache as any);
    const res = response();

    await controller.conviction(
      { query: { region: 'IN', assetType: 'stock', onlyFnoEligible: '1' } } as any,
      res,
    );

    // The controller must build the SAME key the CACHE_WARM stage uses.
    expect(usedKey).toBe(convictionKey({ region: 'IN', assetType: 'STOCK', onlyFnoEligible: true }));
    expect(service.conviction).toHaveBeenCalledWith({ region: 'IN', assetType: 'STOCK', onlyFnoEligible: true });
  });
});
