import { createCacheWarmAdapter } from '../../../src/modules/pipeline-orchestration/pipeline-dag-stages-cache-warm';

const makeCtx = () => ({
  tradingDate: '2026-06-18',
  region: 'IN',
  assetType: 'STOCK',
  timeframe: '1d',
  trigger: 'scheduled' as const,
  instrumentScope: null,
  heartbeat: jest.fn(),
  progress: jest.fn(),
  log: jest.fn(),
});

const makeServices = (over: Record<string, unknown> = {}) => ({
  convictionService: { conviction: jest.fn().mockResolvedValue({ results: [] }) },
  stockInterestService: { latestSnapshot: jest.fn().mockResolvedValue({ snapshot: [] }) },
  marketContextService: {
    latestSectorIntelligenceSnapshot: jest.fn().mockResolvedValue({ sectors: [] }),
    latestPersistedSummary: jest.fn().mockResolvedValue({ updatedAt: 'x' }),
  },
  marketPulseService: { latestSnapshot: jest.fn().mockResolvedValue({ snapshot: null }) },
  todayReviewService: { latest: jest.fn().mockResolvedValue({ run: null }) },
  cacheService: { isEnabled: jest.fn().mockReturnValue(true), setJson: jest.fn().mockResolvedValue(undefined) },
  ...over,
});

describe('CACHE_WARM adapter', () => {
  it('is the terminal stage (key, order, scope)', () => {
    const adapter = createCacheWarmAdapter(makeServices() as any);
    expect(adapter.key).toBe('CACHE_WARM');
    expect(adapter.stageOrder).toBe(20);
    expect(adapter.supportsInstrumentScope).toBe(false);
  });

  it('skips immediately when the cache is disabled', async () => {
    const services = makeServices({ cacheService: { isEnabled: () => false, setJson: jest.fn() } });
    const adapter = createCacheWarmAdapter(services as any);

    const result = await adapter.run(makeCtx() as any);

    expect(result.status).toBe('SKIPPED');
    expect((services.cacheService as any).setJson).not.toHaveBeenCalled();
  });

  it('warms every endpoint → COMPLETED with one write per endpoint', async () => {
    const services = makeServices();
    const adapter = createCacheWarmAdapter(services as any);

    const result = await adapter.run(makeCtx() as any);

    expect(result.status).toBe('COMPLETED');
    expect(result.succeededCount).toBe(6);
    expect(services.cacheService.setJson).toHaveBeenCalledTimes(6);
  });

  it('degrades to PARTIAL (never FAILED) when one endpoint throws', async () => {
    const services = makeServices({
      convictionService: { conviction: jest.fn().mockRejectedValue(new Error('boom')) },
    });
    const adapter = createCacheWarmAdapter(services as any);

    const result = await adapter.run(makeCtx() as any);

    expect(result.status).toBe('PARTIAL');
    expect(result.failedCount).toBe(1);
    expect(result.succeededCount).toBe(5);
    expect(result.warnings?.[0]).toContain('conviction');
  });
});
