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
  convictionService: { conviction: jest.fn().mockResolvedValue({ count: 0, results: [] }) },
  stockInterestService: { latestSnapshot: jest.fn().mockResolvedValue(READY_STOCK_INTEREST) },
  marketContextService: {
    latestSectorIntelligenceSnapshot: jest.fn().mockResolvedValue(READY_SECTOR_ROTATION),
    latestPersistedSummary: jest.fn().mockResolvedValue({ updatedAt: 'x' }),
  },
  marketPulseService: { latestSnapshot: jest.fn().mockResolvedValue(READY_MARKET_PULSE) },
  todayReviewService: { latest: jest.fn().mockResolvedValue(READY_TODAY_REVIEW) },
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

  it('warms every endpoint when data is present → COMPLETED with 6 writes', async () => {
    const services = makeServices();
    const adapter = createCacheWarmAdapter(services as any);

    const result = await adapter.run(makeCtx() as any);

    expect(result.status).toBe('COMPLETED');
    expect(result.succeededCount).toBe(6);
    expect(services.cacheService.setJson).toHaveBeenCalledTimes(6);
  });

  it('skips write for each endpoint that returns an empty-availability envelope', async () => {
    const services = makeServices({
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

    // conviction (always written) + market-context-summary (non-null) = 2 writes;
    // stock-interest, sector-rotation, today-review, market-pulse are all skipped.
    expect(result.status).toBe('COMPLETED');
    expect(services.cacheService.setJson).toHaveBeenCalledTimes(2);
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
