import { createCacheWarmAdapter } from '../../../src/modules/pipeline-orchestration/pipeline-dag-stages-cache-warm';
import { SETUP_DEFS } from '../../../src/modules/signal-generation-engine/signal-setups';

const makeCtx = (over: Record<string, unknown> = {}) => ({
  tradingDate: '2026-06-18',
  region: 'IN',
  assetType: 'STOCK',
  timeframe: '1d',
  trigger: 'scheduled' as const,
  instrumentScope: null,
  heartbeat: jest.fn(),
  progress: jest.fn(),
  log: jest.fn(),
  ...over,
});

// The eight non-screener endpoints the stage warms (conviction, conviction-fno, stock-interest,
// sector-rotation, today-review, today-review-lite, market-context-summary, market-pulse).
const NON_SCREENER_TASKS = 8;
// One screener combo per Screener tab: "All" + ("All Bullish" + bullish setups) +
// ("All Bearish" + bearish setups) — derived from the taxonomy so it tracks SETUP_DEFS changes.
const SCREENER_COMBOS = 1 + 2 + SETUP_DEFS.length;
const ALL_TASKS = NON_SCREENER_TASKS + SCREENER_COMBOS;

// Populated shapes that pass all guards — mirrors real service return types.
const READY_STOCK_INTEREST = { availability: 'READY', scope: {}, snapshot: { items: [] } };
const READY_SECTOR_ROTATION = { status: 'ready', scope: {}, sectors: [{ name: 'Financials' }] };
const READY_TODAY_REVIEW = { run: { id: '1', tradingDate: '2026-06-18' }, groups: {}, scope: {} };
const READY_MARKET_PULSE = { availability: 'READY', scope: {}, snapshot: {} };
const READY_SCREENER = { count: 5, results: [{}], generatedAt: 'x', warnings: [] };

// Empty shapes that should trigger skip — mirrors real service no-data returns.
const EMPTY_STOCK_INTEREST = { availability: 'EMPTY', scope: {}, snapshot: null };
const MISSING_SECTOR_ROTATION = { status: 'missing', scope: {}, sectors: [] };
const NULL_RUN_TODAY_REVIEW = { run: null, groups: {}, scope: {} };
const EMPTY_MARKET_PULSE = { availability: 'EMPTY', scope: {}, snapshot: null };
const EMPTY_SCREENER = { count: 0, results: [], generatedAt: 'x', warnings: [] };

const makeServices = (over: Record<string, unknown> = {}) => ({
  convictionService: { conviction: jest.fn().mockResolvedValue({ count: 3, results: [{}] }) },
  stockInterestService: { latestSnapshot: jest.fn().mockResolvedValue(READY_STOCK_INTEREST) },
  marketContextService: {
    latestSectorIntelligenceSnapshot: jest.fn().mockResolvedValue(READY_SECTOR_ROTATION),
    latestPersistedSummary: jest.fn().mockResolvedValue({ updatedAt: 'x', regime: 'BULLISH' }),
  },
  marketPulseService: { latestSnapshot: jest.fn().mockResolvedValue(READY_MARKET_PULSE) },
  todayReviewService: { latest: jest.fn().mockResolvedValue(READY_TODAY_REVIEW) },
  screenerService: { screener: jest.fn().mockResolvedValue(READY_SCREENER) },
  cacheService: { isEnabled: jest.fn().mockReturnValue(true), setJson: jest.fn().mockResolvedValue(undefined), delete: jest.fn().mockResolvedValue(undefined), deleteByPrefix: jest.fn().mockResolvedValue(0) },
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
    const services = makeServices({ cacheService: { isEnabled: () => false, setJson: jest.fn(), delete: jest.fn(), deleteByPrefix: jest.fn() } });
    const adapter = createCacheWarmAdapter(services as any);

    const result = await adapter.run(makeCtx() as any);

    expect(result.status).toBe('SKIPPED');
    expect((services.cacheService as any).setJson).not.toHaveBeenCalled();
  });

  it('warms every endpoint (incl. all screener tabs) when data is present → COMPLETED', async () => {
    const services = makeServices();
    const adapter = createCacheWarmAdapter(services as any);

    const result = await adapter.run(makeCtx() as any);

    expect(result.status).toBe('COMPLETED');
    expect(result.succeededCount).toBe(ALL_TASKS);
    expect(services.cacheService.setJson).toHaveBeenCalledTimes(ALL_TASKS);
    // One screener query per tab combo, all under the default (limit=50, no extra filters) keys.
    expect(services.screenerService.screener).toHaveBeenCalledTimes(SCREENER_COMBOS);
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
      screenerService: { screener: jest.fn().mockResolvedValue(EMPTY_SCREENER) },
    });
    const adapter = createCacheWarmAdapter(services as any);

    const result = await adapter.run(makeCtx() as any);

    // Every task hits the delete path (empty/missing data, no regime on summary, count=0 screener).
    expect(result.status).toBe('COMPLETED');
    expect(services.cacheService.setJson).toHaveBeenCalledTimes(0);
    expect(services.cacheService.delete).toHaveBeenCalledTimes(ALL_TASKS);
  });

  it('skips screener warming entirely for a CRYPTO scope (no equity screener rows)', async () => {
    const services = makeServices();
    const adapter = createCacheWarmAdapter(services as any);

    const result = await adapter.run(makeCtx({ assetType: 'CRYPTO' }) as any);

    expect(result.status).toBe('COMPLETED');
    expect(services.screenerService.screener).not.toHaveBeenCalled();
    expect(result.succeededCount).toBe(NON_SCREENER_TASKS);
  });

  it('invalidates screener, movers, signals-top, smart-money and earnings keys before warming', async () => {
    const services = makeServices();
    const adapter = createCacheWarmAdapter(services as any);

    await adapter.run(makeCtx() as any);

    const { deleteByPrefix } = services.cacheService as any;
    expect(deleteByPrefix).toHaveBeenCalledTimes(5);
    expect(deleteByPrefix).toHaveBeenCalledWith(expect.stringContaining('screener'));
    expect(deleteByPrefix).toHaveBeenCalledWith(expect.stringContaining('movers'));
    expect(deleteByPrefix).toHaveBeenCalledWith(expect.stringContaining('signals-top'));
    expect(deleteByPrefix).toHaveBeenCalledWith(expect.stringContaining('smart-money-sectors'));
    expect(deleteByPrefix).toHaveBeenCalledWith(expect.stringContaining('earnings'));
  });

  it('degrades to PARTIAL (never FAILED) when one endpoint throws', async () => {
    const services = makeServices({
      convictionService: { conviction: jest.fn().mockRejectedValue(new Error('boom')) },
    });
    const adapter = createCacheWarmAdapter(services as any);

    const result = await adapter.run(makeCtx() as any);

    // conviction + conviction-fno both go through the rejecting mock → 2 failures, rest succeed.
    expect(result.status).toBe('PARTIAL');
    expect(result.failedCount).toBe(2);
    expect(result.succeededCount).toBe(ALL_TASKS - 2);
    expect(result.warnings?.[0]).toContain('conviction');
  });
});
