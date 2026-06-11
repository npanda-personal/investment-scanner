/// <reference types="@types/jest" />
import {
  MarketDataFoundationScheduler,
  readMarketDataSchedulerConfig,
  startMarketDataStartupPriceBackfill,
} from '../../../src/modules/market-data-foundation';

describe('MarketDataFoundationScheduler', () => {
  it('defaults to daily startup catch-up while ignoring legacy Angel provider scheduler flags', async () => {
    expect(readMarketDataSchedulerConfig({ ANGEL_ONE_ENABLE_MARKET_DATA: 'true' } as any)).toMatchObject({
      enabled: false,
      intervalMinutes: 1440,
      runOnStartup: true,
    });
    expect(readMarketDataSchedulerConfig({
      ANGEL_ONE_ENABLE_MARKET_DATA: 'true',
      MARKET_DATA_SCHEDULER_INTERVAL_MINUTES: '15',
    } as any).intervalMinutes).toBe(1440);

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      await expect(startMarketDataStartupPriceBackfill({
        NODE_ENV: 'development',
        ANGEL_ONE_ENABLE_MARKET_DATA: 'true',
        MARKET_DATA_STARTUP_PRICE_BACKFILL_ENABLED: 'true',
      } as any)).resolves.toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('provider startup price backfill disabled'));
    } finally {
      warn.mockRestore();
    }
  });

  it('skips regions when session decision says sync is not useful and latest completed candle is already stored', async () => {
    const service = {
      activePriceBackfillRun: jest.fn().mockReturnValue(null),
      latestStoredCandleInfo: jest.fn().mockResolvedValue({
        latestTradingDate: '2026-05-04',
        finalConfirmed: false,
        syncState: null,
        tradingDate: '2026-05-05',
      }),
      syncScheduledRegion: jest.fn(),
    };
    const scheduler = new MarketDataFoundationScheduler(service as any, {
      enabled: true,
      intervalMinutes: 15,
      regions: ['IN'],
      assetType: 'STOCK',
      batchSize: 25,
      syncDuringMarketHours: false,
      postCloseSyncWindowMinutes: 120,
      finalizationGraceMinutes: 15,
      skipWeekends: true,
    });

    const result = await scheduler.runOnce(new Date('2026-05-05T03:00:00.000Z'));

    expect(result[0]).toMatchObject({ region: 'IN', skipped: true });
    expect(service.syncScheduledRegion).not.toHaveBeenCalled();
  });

  it('runs catch-up sync when latest completed candle is missing even if session decision would skip', async () => {
    const service = {
      activePriceBackfillRun: jest.fn().mockReturnValue(null),
      latestStoredCandleInfo: jest.fn().mockResolvedValue({
        latestTradingDate: '2026-05-01',
        finalConfirmed: false,
        syncState: null,
        tradingDate: '2026-05-05',
      }),
      syncScheduledRegion: jest.fn().mockResolvedValue({
        region: 'IN',
        assetType: 'STOCK',
        tradingDate: '2026-05-05',
        rowsInserted: 1,
        rowsUpdated: 0,
        rowsNoOp: 0,
      }),
    };
    const scheduler = new MarketDataFoundationScheduler(service as any, {
      enabled: true,
      intervalMinutes: 15,
      regions: ['IN'],
      assetType: 'STOCK',
      batchSize: 25,
      syncDuringMarketHours: false,
      postCloseSyncWindowMinutes: 120,
      finalizationGraceMinutes: 15,
      skipWeekends: true,
    });

    const result = await scheduler.runOnce(new Date('2026-05-05T03:00:00.000Z'));

    expect(result[0]).toMatchObject({ region: 'IN', skipped: false });
    expect(service.syncScheduledRegion).toHaveBeenCalledTimes(1);
  });

  it('retries market data first when the prior sync state is still pending', async () => {
    const service = {
      activePriceBackfillRun: jest.fn().mockReturnValue(null),
      latestStoredCandleInfo: jest.fn().mockResolvedValue({
        latestTradingDate: '2026-05-04',
        finalConfirmed: false,
        syncState: { status: 'PENDING', lastSummary: null },
        tradingDate: '2026-05-05',
      }),
      syncScheduledRegion: jest.fn().mockResolvedValue({
        region: 'IN',
        assetType: 'STOCK',
        tradingDate: '2026-05-05',
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 1,
      }),
    };
    const scheduler = new MarketDataFoundationScheduler(service as any, {
      enabled: true,
      intervalMinutes: 1440,
      regions: ['IN'],
      assetType: 'STOCK',
      batchSize: 25,
      syncDuringMarketHours: false,
      postCloseSyncWindowMinutes: 120,
      finalizationGraceMinutes: 15,
      skipWeekends: true,
    });

    const result = await scheduler.runOnce(new Date('2026-05-05T03:00:00.000Z'), { triggerType: 'startup' });

    expect(result[0]).toMatchObject({ region: 'IN', skipped: false });
    expect(service.syncScheduledRegion).toHaveBeenCalledTimes(1);
  });

  it('uses incremental scheduled sync settings when session is useful', async () => {
    const service = {
      activePriceBackfillRun: jest.fn().mockReturnValue(null),
      latestStoredCandleInfo: jest.fn().mockResolvedValue({
        latestTradingDate: null,
        finalConfirmed: false,
        syncState: null,
        tradingDate: '2026-05-05',
      }),
      syncScheduledRegion: jest.fn().mockResolvedValue({
        region: 'IN',
        assetType: 'STOCK',
        tradingDate: '2026-05-05',
        rowsInserted: 1,
        rowsUpdated: 0,
        rowsNoOp: 0,
      }),
    };
    const scheduler = new MarketDataFoundationScheduler(service as any, {
      enabled: true,
      intervalMinutes: 15,
      regions: ['IN'],
      assetType: 'STOCK',
      batchSize: 25,
      syncDuringMarketHours: false,
      postCloseSyncWindowMinutes: 120,
      finalizationGraceMinutes: 15,
      skipWeekends: true,
    });

    await scheduler.runOnce(new Date('2026-05-05T10:30:00.000Z'));

    expect(service.syncScheduledRegion).toHaveBeenCalledWith('IN', expect.objectContaining({
      assetType: 'STOCK',
      batchSize: 25,
    }));
  });

  it('does not start overlapping scheduled runs', async () => {
    let release!: () => void;
    const activeRun = new Promise<void>((resolve) => {
      release = () => resolve();
    });
    const service = {
      activePriceBackfillRun: jest.fn().mockReturnValue(null),
      latestStoredCandleInfo: jest.fn().mockResolvedValue({
        latestTradingDate: null,
        finalConfirmed: false,
        syncState: null,
        tradingDate: '2026-05-05',
      }),
      syncScheduledRegion: jest.fn().mockReturnValue(activeRun),
    };
    const scheduler = new MarketDataFoundationScheduler(service as any, {
      enabled: true,
      intervalMinutes: 15,
      regions: ['IN'],
      assetType: 'STOCK',
      batchSize: 25,
      syncDuringMarketHours: false,
      postCloseSyncWindowMinutes: 120,
      finalizationGraceMinutes: 15,
      skipWeekends: true,
    });

    const first = scheduler.runOnce(new Date('2026-05-05T10:30:00.000Z'));
    const second = await scheduler.runOnce(new Date('2026-05-05T10:31:00.000Z'));
    release();
    await first;

    expect(second).toEqual([]);
    expect(service.syncScheduledRegion).toHaveBeenCalledTimes(1);
  });

  it('keeps incremental latest-candle sync eligible while a price backfill background run is active', async () => {
    const service = {
      activePriceBackfillRun: jest.fn().mockReturnValue({ runId: 'price-backfill-1', status: 'RUNNING' }),
      latestStoredCandleInfo: jest.fn().mockResolvedValue({
        latestTradingDate: null,
        finalConfirmed: false,
        syncState: null,
        tradingDate: '2026-05-05',
      }),
      syncScheduledRegion: jest.fn().mockResolvedValue({
        region: 'IN',
        assetType: 'STOCK',
        tradingDate: '2026-05-05',
        dataThroughDate: '2026-05-05',
        sourceFingerprint: 'scheduled-region:abc123',
        changedInstrumentIds: [],
        changedInstrumentCount: 0,
        dqStageEligible: false,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
      }),
    };
    const scheduler = new MarketDataFoundationScheduler(service as any, {
      enabled: true,
      intervalMinutes: 15,
      regions: ['IN'],
      assetType: 'STOCK',
      batchSize: 25,
      syncDuringMarketHours: false,
      postCloseSyncWindowMinutes: 120,
      finalizationGraceMinutes: 15,
      skipWeekends: true,
    });

    const result = await scheduler.runOnce(new Date('2026-05-05T10:30:00.000Z'));

    expect(result[0]).toMatchObject({
      skipped: false,
      activePriceBackfillRunId: 'price-backfill-1',
    });
    expect(service.latestStoredCandleInfo).toHaveBeenCalledTimes(1);
    expect(service.syncScheduledRegion).toHaveBeenCalledTimes(1);
  });

  it('status shows whether the latest completed candle is stored', async () => {
    const service = {
      latestStoredCandleInfo: jest.fn().mockResolvedValue({
        latestTradingDate: '2026-05-04',
        finalConfirmed: false,
        syncState: null,
        tradingDate: '2026-05-05',
      }),
    };
    const scheduler = new MarketDataFoundationScheduler(service as any, {
      enabled: false,
      intervalMinutes: 15,
      regions: ['IN'],
      assetType: 'STOCK',
      batchSize: 25,
      syncDuringMarketHours: false,
      postCloseSyncWindowMinutes: 120,
      finalizationGraceMinutes: 15,
      skipWeekends: true,
    });

    const status = await scheduler.status(new Date('2026-05-05T03:00:00.000Z'));

    expect(status.regionStatuses[0]).toMatchObject({
      todayTradingDate: '2026-05-05',
      latestCompletedTradingDate: '2026-05-04',
      latestStoredTradingDate: '2026-05-04',
      todayCandleStored: false,
      latestCompletedCandleStored: true,
      latestStoredCandleIsCurrent: true,
      candleSyncStatus: 'CURRENT',
    });
  });

  it('status flags when the latest completed candle is missing', async () => {
    const service = {
      latestStoredCandleInfo: jest.fn().mockResolvedValue({
        latestTradingDate: '2026-05-01',
        finalConfirmed: false,
        syncState: null,
        tradingDate: '2026-05-05',
      }),
    };
    const scheduler = new MarketDataFoundationScheduler(service as any, {
      enabled: false,
      intervalMinutes: 15,
      regions: ['IN'],
      assetType: 'STOCK',
      batchSize: 25,
      syncDuringMarketHours: false,
      postCloseSyncWindowMinutes: 120,
      finalizationGraceMinutes: 15,
      skipWeekends: true,
    });

    const status = await scheduler.status(new Date('2026-05-05T03:00:00.000Z'));

    expect(status.regionStatuses[0]).toMatchObject({
      latestCompletedTradingDate: '2026-05-04',
      latestStoredTradingDate: '2026-05-01',
      latestCompletedCandleStored: false,
      latestStoredCandleIsCurrent: false,
      candleSyncStatus: 'MISSING_LATEST_COMPLETED',
    });
  });

  it('triggers pipeline catch-up for scheduled and startup runs with a downstream set (FIX D: via runDownstreamCatchUp)', async () => {
    const service = {
      activePriceBackfillRun: jest.fn().mockReturnValue(null),
      latestStoredCandleInfo: jest.fn().mockResolvedValue({
        latestTradingDate: null,
        finalConfirmed: false,
        syncState: null,
        tradingDate: '2026-05-05',
      }),
      syncScheduledRegion: jest.fn().mockResolvedValue({
        region: 'IN',
        assetType: 'STOCK',
        tradingDate: '2026-05-05',
        dataThroughDate: '2026-05-05',
        sourceFingerprint: 'scheduled-region:abc123',
        changedInstrumentIds: ['stock-1'],
        downstreamInstrumentIds: ['stock-1', 'stock-2'],
        changedInstrumentCount: 1,
        dqStageEligible: true,
        rowsInserted: 1,
        rowsUpdated: 0,
        rowsNoOp: 0,
      }),
    };
    const pipelineOrchestration = {
      // Phase 4b: runScheduledDataQualityStage removed; scheduler now routes exclusively
      // through runScheduledPipelineCatchUpFromMarketDataSummary (DAG-backed catch-up).
      runScheduledPipelineCatchUpFromMarketDataSummary: jest.fn().mockResolvedValue({ runStatus: 'COMPLETED' }),
    };
    const scheduler = new MarketDataFoundationScheduler(service as any, {
      enabled: true,
      intervalMinutes: 15,
      regions: ['IN'],
      assetType: 'STOCK',
      batchSize: 25,
      syncDuringMarketHours: false,
      postCloseSyncWindowMinutes: 120,
      finalizationGraceMinutes: 15,
      skipWeekends: true,
    }, pipelineOrchestration as any);

    const scheduledResult = await scheduler.runOnce(new Date('2026-05-05T10:30:00.000Z'));
    await scheduler.runOnce(new Date('2026-05-05T10:31:00.000Z'), { triggerType: 'startup' });

    // Phase 4b: scheduler routes exclusively through runScheduledPipelineCatchUpFromMarketDataSummary.
    // The summary object is passed directly (no sourceFingerprint rewriting in this path).
    expect(pipelineOrchestration.runScheduledPipelineCatchUpFromMarketDataSummary).toHaveBeenCalledTimes(2);
    expect(pipelineOrchestration.runScheduledPipelineCatchUpFromMarketDataSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'IN',
        assetType: 'STOCK',
        tradingDate: '2026-05-05',
        sourceFingerprint: 'scheduled-region:abc123',
        downstreamInstrumentIds: expect.arrayContaining(['stock-1', 'stock-2']),
      }),
      expect.any(Date)
    );
    expect(scheduledResult[0]).toMatchObject({
      skipped: false,
      scheduledDataQuality: expect.objectContaining({ runStatus: 'COMPLETED' }),
    });
  });
});
