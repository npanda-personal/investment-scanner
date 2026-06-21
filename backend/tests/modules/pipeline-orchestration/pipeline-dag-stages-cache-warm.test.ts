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

// Populated shapes that pass all guards — mirrors real service return types.
const READY_STOCK_INTEREST = { availability: 'READY', scope: {}, snapshot: { items: [] } };
const READY_SECTOR_ROTATION = { status: 'ready', scope: {}, sectors: [{ name: 'Financials' }] };
const READY_TODAY_REVIEW = { run: { id: '1', tradingDate: '2026-06-18' }, groups: {}, scope: {} };
const READY_MARKET_PULSE = { availability: 'READY', scope: {}, snapshot: {} };

// Empty shapes that should trigger skip — mirrors real service no-data returns.
const EMPTY_STOCK_INTEREST = { availability: 'EMPTY', scope: {}, snapshot: null };
const MISSING_SECTOR_ROTATION = { status: 'missing', scope: {}, sectors: [] };
const NULL_RUN_TODAY_REVIEW = { run: null, groups: {}, scope: {} };
const EMPTY_MARKET_PULSE = { availability: 'EMPTY', scope: {}, snapshot: null };

const makeServices = (over: Record<string, unknown> = {}) => ({
  convictionService: { conviction: jest.fn().mockResolvedValue({ count: 3, results: [{}] }) },
  stockInterestService: { latestSnapshot: jest.fn().mockResolvedValue(READY_STOCK_INTEREST) },
  marketContextService: {
    latestSectorIntelligenceSnapshot: jest.fn().mockResolvedValue(READY_SECTOR_ROTATION),
    latestPersistedSummary: jest.fn().mockResolvedValue({ updatedAt: 'x' }),
  },
  marketPulseService: { latestSnapshot: jest.fn().mockResolvedValue(READY_MARKET_PULSE) },
  todayReviewService: { latest: jest.fn().mockResolvedValue(READY_TODAY_REVIEW) },
  cacheService: { isEnabled: jest.fn().mockReturnValue(true), setJson: jest.fn().mockResolvedValue(undefined), delete: jest.fn().mockResolvedValue(undefined) },
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
    const services = makeServices({ cacheService: { isEnabled: () => false, setJson: jest.fn(), delete: jest.fn() } });
    const adapter = createCacheWarmAdapter(services as any);

    const result = await adapter.run(makeCtx() as any);

    expect(result.status).toBe('SKIPPED');
    expect((services.cacheService as any).setJson).not.toHaveBeenCalled();
  });

  it('warms every endpoint when data is present → COMPLETED with 6 writes', async () => {
    const services = makeServices();
    const adapter = createCacheWarmAdapter(services as any);

    const result = await adapter.run(makeCtx() as any);

    expect(result.status).toBe('COMPLETED');
    expect(result.succeededCount).toBe(6);
    expect(services.cacheService.setJson).toHaveBeenCalledTimes(6);
  });

  it('deletes stale keys and skips writes for empty-availability envelopes', async () => {
    const services = makeServices({
      convictionService: { conviction: jest.fn().mockResolvedValue({ count: 0, results: [] }) },
      stockInterestService: { latestSnapshot: jest.fn().mockResolvedValue(EMPTY_STOCK_INTEREST) },
      marketContextService: {
        latestSectorIntelligenceSnapshot: jest.fn().mockResolvedValue(MISSING_SECTOR_ROTATION),
        latestPersistedSummary: jest.fn().mockResolvedValue({ updatedAt: 'x' }),
      },
      marketPulseService: { latestSnapshot: jest.fn().mockResolvedValue(EMPTY_MARKET_PULSE) },
      todayReviewService: { latest: jest.fn().mockResolvedValue(NULL_RUN_TODAY_REVIEW) },
    });
    const adapter = createCacheWarmAdapter(services as any);

    const result = await adapter.run(makeCtx() as any);

    // Only market-context-summary writes (non-null summary); all 5 guarded endpoints delete their keys.
    expect(result.status).toBe('COMPLETED');
    expect(services.cacheService.setJson).toHaveBeenCalledTimes(1);
    expect(services.cacheService.delete).toHaveBeenCalledTimes(5);
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
