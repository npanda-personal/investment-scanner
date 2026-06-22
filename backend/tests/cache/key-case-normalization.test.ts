import { MarketContextIntelligenceController } from '../../src/modules/market-context-intelligence/market-context-intelligence.controller';
import { MarketIntelligenceController } from '../../src/modules/market-intelligence/market-intelligence.controller';
import { marketPulseKey, sectorRotationKey, marketContextSummaryKey } from '../../src/cache/cache-keys';

// A lowercase request must cache under the SAME canonical (uppercase region/assetType, lowercase
// timeframe) key the CACHE_WARM stage and manual-command invalidation target — and must call the
// underlying service with that same canonical scope (services are case-sensitive on region).

const response = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

const capturingCache = () => {
  const keys: string[] = [];
  return {
    keys,
    cacheReadThrough: jest.fn(async (key: string, producer: () => Promise<unknown>) => {
      keys.push(key);
      return { data: await producer(), cacheHit: false };
    }),
  };
};

describe('page-cache key case normalization', () => {
  it('marketPulse: lowercase request → canonical key + canonical service scope', async () => {
    const cache = capturingCache();
    const marketPulseService = { latestSnapshot: jest.fn().mockResolvedValue({ availability: 'EMPTY', snapshot: null }) };
    const controller = new MarketContextIntelligenceController({} as any, marketPulseService as any, {} as any, cache as any);

    await controller.marketPulse({ query: { region: 'in', assetType: 'stock', timeframe: '1D' } } as any, response());

    const expectedScope = { region: 'IN', assetType: 'STOCK', timeframe: '1d' };
    expect(cache.keys[0]).toBe(marketPulseKey(expectedScope));
    expect(marketPulseService.latestSnapshot).toHaveBeenCalledWith(expectedScope);
  });

  it('summary: lowercase region → canonical key + canonical service scope', async () => {
    const cache = capturingCache();
    const service = { latestPersistedSummary: jest.fn().mockResolvedValue(null) };
    const controller = new MarketContextIntelligenceController(service as any, {} as any, {} as any, cache as any);

    await controller.summary({ query: { region: 'in' } } as any, response());

    expect(cache.keys[0]).toBe(marketContextSummaryKey('IN'));
    expect(service.latestPersistedSummary).toHaveBeenCalledWith('IN');
  });

  it('sectorRotation: lowercase request → canonical key + canonical service scope', async () => {
    const cache = capturingCache();
    const marketContextService = { latestSectorIntelligenceSnapshot: jest.fn().mockResolvedValue({ sectors: [], warnings: [] }) };
    const controller = new MarketIntelligenceController({} as any, {} as any, marketContextService as any, {} as any, cache as any);

    await controller.sectorRotation({ query: { region: 'us', assetType: 'stock' } } as any, response());

    const expectedScope = { region: 'US', assetType: 'STOCK' };
    expect(cache.keys[0]).toBe(sectorRotationKey(expectedScope));
    expect(marketContextService.latestSectorIntelligenceSnapshot).toHaveBeenCalledWith(expectedScope);
  });
});
