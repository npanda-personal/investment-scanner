/// <reference types="@types/jest" />
import { MarketDataFoundationScheduler } from '../../../src/modules/market-data-foundation';

describe('MarketDataFoundationScheduler', () => {
  it('skips regions when session decision says sync is not useful', async () => {
    const service = {
      latestStoredCandleInfo: jest.fn().mockResolvedValue({
        latestTradingDate: null,
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

  it('uses incremental scheduled sync settings when session is useful', async () => {
    const service = {
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
      lookbackTradingDays: 3,
    }));
  });

  it('does not start overlapping scheduled runs', async () => {
    let release!: () => void;
    const activeRun = new Promise<void>((resolve) => {
      release = () => resolve();
    });
    const service = {
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
});
