import { PipelineOrchestrationService } from '../../../src/modules/pipeline-orchestration';
import { marketPulseKey, stockInterestKey } from '../../../src/cache/cache-keys';
import { parseStockInterestScope } from '../../../src/modules/market-intelligence';

// invalidatePageCacheForCommand only touches this.cacheService, so we exercise it on a bare
// prototype instance (no heavy constructor) with an injected cache mock.
const makeService = (cacheService: any) => {
  const svc: any = Object.create(PipelineOrchestrationService.prototype);
  svc.cacheService = cacheService;
  return svc;
};

const response = (over: Record<string, unknown> = {}) => ({
  commandKey: 'MARKET_PULSE_REFRESH',
  status: 'COMPLETED',
  scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-context' },
  ...over,
});

describe('executeCommand page-cache invalidation hook', () => {
  it('DELs the market-pulse key after a successful MARKET_PULSE_REFRESH', async () => {
    const cache = { isEnabled: () => true, delete: jest.fn().mockResolvedValue(undefined) };
    await makeService(cache).invalidatePageCacheForCommand(response());
    expect(cache.delete).toHaveBeenCalledWith(marketPulseKey({ region: 'IN', assetType: 'STOCK', timeframe: '1d' }));
  });

  it('invalidates on PARTIAL too (some snapshots updated)', async () => {
    const cache = { isEnabled: () => true, delete: jest.fn().mockResolvedValue(undefined) };
    await makeService(cache).invalidatePageCacheForCommand(
      response({ commandKey: 'STOCK_INTEREST_REFRESH', status: 'PARTIAL' }),
    );
    expect(cache.delete).toHaveBeenCalledWith(stockInterestKey(parseStockInterestScope({ region: 'IN', assetType: 'STOCK' })));
  });

  it('does NOT invalidate for PIPELINE_RUN_ALL (the DAG already warms)', async () => {
    const cache = { isEnabled: () => true, delete: jest.fn() };
    await makeService(cache).invalidatePageCacheForCommand(response({ commandKey: 'PIPELINE_RUN_ALL' }));
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('does NOT invalidate when the command failed', async () => {
    const cache = { isEnabled: () => true, delete: jest.fn() };
    await makeService(cache).invalidatePageCacheForCommand(response({ status: 'FAILED' }));
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('does NOT touch Redis when the cache is disabled', async () => {
    const cache = { isEnabled: () => false, delete: jest.fn() };
    await makeService(cache).invalidatePageCacheForCommand(response());
    expect(cache.delete).not.toHaveBeenCalled();
  });
});
