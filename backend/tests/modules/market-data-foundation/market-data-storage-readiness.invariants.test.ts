/// <reference types="@types/jest" />
import { MarketDataFoundationRepository } from '../../../src/modules/market-data-foundation/market-data-foundation.repository';
import { classifyInstrumentUniverseReadiness } from '../../../src/modules/market-data-foundation/ingestion/market-data-foundation.universe';
import {
  partitionHistoricalPrices,
  validateHistoricalPrice,
} from '../../../src/modules/market-data-foundation/ingestion/market-data-foundation.validation';
import type { HistoricalPrice } from '../../../src/modules/market-data-foundation/market-data-foundation.types';

const expectedLatestTradingDate = '2026-05-15';

const price = (overrides: Partial<HistoricalPrice> = {}): HistoricalPrice => ({
  symbol: 'RELIANCE.NS',
  date: new Date('2026-05-15T15:30:00.000Z'),
  open: 2800,
  high: 2825,
  low: 2790,
  close: 2810,
  adjustedClose: 2810,
  volume: 1_500_000,
  source: 'NSE_SECURITY_BHAVDATA',
  ...overrides,
});

const completeInstrument = (priceStats: any, overrides: Record<string, unknown> = {}) => ({
  isActive: true,
  isDelisted: false,
  providerSupportStatus: 'SUPPORTED',
  providerSymbol: 'RELIANCE.NS',
  providerError: null,
  sector: 'Energy',
  industry: 'Integrated Oil and Gas',
  country: 'India',
  currency: 'INR',
  marketCap: 100_000_000,
  isin: 'INE002A01018',
  ipoDate: '2000-01-01',
  region: 'IN',
  assetType: 'STOCK',
  expectedLatestTradingDate,
  priceStats,
  ...overrides,
});

const createStoreHarness = (existingRows: any[] = []) => {
  const createMany = jest.fn().mockResolvedValue({ count: 0 });
  const update = jest.fn().mockResolvedValue({});
  const latestPriceUpsert = jest.fn().mockResolvedValue({});
  const prisma = {
    priceTick: {
      findMany: jest.fn().mockResolvedValue(existingRows),
    },
    latestPrice: {
      upsert: latestPriceUpsert,
    },
    $transaction: jest.fn(async (callback: any): Promise<any> => callback({
      priceTick: { createMany, update },
      latestPrice: { upsert: latestPriceUpsert },
    })),
  } as any;

  return {
    createMany,
    latestPriceUpsert,
    prisma,
    repository: new MarketDataFoundationRepository(prisma),
    update,
  };
};

describe('market data storage readiness characterization invariants', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores normalized daily candles with provider/source provenance and latest price evidence', async () => {
    const { createMany, latestPriceUpsert, prisma, repository } = createStoreHarness();

    const summary = await repository.storeHistorical([
      price(),
    ], () => ({ region: 'IN', exchange: 'NSE' }));

    expect(prisma.priceTick.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        symbol: 'RELIANCE.NS',
        timestamp: { in: [new Date('2026-05-15T00:00:00.000Z')] },
      },
      select: expect.objectContaining({ source: true }),
    }));
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0][0]).toMatchObject({ skipDuplicates: true });
    expect(createMany.mock.calls[0][0].data).toHaveLength(1);
    expect(createMany.mock.calls[0][0].data[0]).toMatchObject({
      symbol: 'RELIANCE.NS',
      region: 'IN',
      exchange: 'NSE',
      timestamp: new Date('2026-05-15T00:00:00.000Z'),
      source: 'NSE_SECURITY_BHAVDATA',
      dataStatus: 'COMPLETE',
    });
    expect(createMany.mock.calls[0][0].data[0].adjustedClose.toString()).toBe('2810');
    expect(createMany.mock.calls[0][0].data[0].volume).toBe(BigInt(1_500_000));
    expect(latestPriceUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { symbol: 'RELIANCE.NS' },
      update: expect.objectContaining({
        region: 'IN',
        timestamp: new Date('2026-05-15T00:00:00.000Z'),
      }),
      create: expect.objectContaining({
        symbol: 'RELIANCE.NS',
        region: 'IN',
        timestamp: new Date('2026-05-15T00:00:00.000Z'),
      }),
    }));
    expect(summary).toMatchObject({
      rowsReceived: 1,
      rowsInserted: 1,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
    });
  });

  it('characterizes symbol/date idempotency and changed-row updates through the repository natural key', async () => {
    const unchanged = createStoreHarness([
      {
        timestamp: new Date('2026-05-15T00:00:00.000Z'),
        open: 2800,
        high: 2825,
        low: 2790,
        close: 2810,
        adjustedClose: 2810,
        volume: BigInt(1_500_000),
        source: 'NSE_SECURITY_BHAVDATA',
      },
    ]);

    const unchangedSummary = await unchanged.repository.storeHistorical([
      price(),
    ], () => ({ region: 'IN', exchange: 'NSE' }));

    expect(unchanged.createMany).not.toHaveBeenCalled();
    expect(unchanged.update).not.toHaveBeenCalled();
    expect(unchangedSummary).toMatchObject({
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsNoOp: 1,
    });

    const changed = createStoreHarness([
      {
        timestamp: new Date('2026-05-15T00:00:00.000Z'),
        open: 2800,
        high: 2825,
        low: 2790,
        close: 2805,
        adjustedClose: 2805,
        volume: BigInt(1_500_000),
        source: 'NSE_SECURITY_BHAVDATA',
      },
    ]);

    const changedSummary = await changed.repository.storeHistorical([
      price({ close: 2810, adjustedClose: 2810 }),
    ], () => ({ region: 'IN', exchange: 'NSE' }));

    expect(changed.createMany).not.toHaveBeenCalled();
    expect(changed.update).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        symbol_timestamp: {
          symbol: 'RELIANCE.NS',
          timestamp: new Date('2026-05-15T00:00:00.000Z'),
        },
      },
      data: expect.objectContaining({
        region: 'IN',
        exchange: 'NSE',
        source: 'NSE_SECURITY_BHAVDATA',
        dataStatus: 'COMPLETE',
      }),
    }));
    expect(changed.update.mock.calls[0][0].data.close.toString()).toBe('2810');
    expect(changedSummary).toMatchObject({
      rowsInserted: 0,
      rowsUpdated: 1,
      rowsNoOp: 0,
    });
  });

  it('characterizes duplicate and invalid OHLC rows as skipped storage evidence', async () => {
    const { createMany, repository } = createStoreHarness();

    const summary = await repository.storeHistorical([
      price({ adjustedClose: null }),
      price({ adjustedClose: 2810 }),
      price({
        date: new Date('2026-05-16T00:00:00.000Z'),
        open: 2850,
        high: 2825,
        low: 2830,
        close: 2860,
      }),
    ], () => ({ region: 'IN', exchange: 'NSE' }));

    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0][0].data).toHaveLength(1);
    expect(createMany.mock.calls[0][0].data[0].adjustedClose.toString()).toBe('2810');
    expect(summary).toMatchObject({
      rowsReceived: 3,
      rowsInserted: 1,
      rowsSkipped: 2,
      duplicateProviderRowsSkipped: 1,
    });
    expect(summary.warnings).toEqual(expect.arrayContaining([
      'RELIANCE.NS: duplicate price bar in batch',
      'RELIANCE.NS: low cannot be greater than high',
      'RELIANCE.NS: open must be within low/high range',
      'RELIANCE.NS: close must be within low/high range',
    ]));
  });

  it('keeps zero-volume rows visible in storage while readiness remains blocked', async () => {
    const { createMany, repository } = createStoreHarness();

    const zeroVolumeValidation = validateHistoricalPrice(price({ volume: 0 }));
    const summary = await repository.storeHistorical([
      price({ volume: 0 }),
    ], () => ({ region: 'IN', exchange: 'NSE' }));
    const readiness = classifyInstrumentUniverseReadiness(completeInstrument({
      priceHistoryBars: 4000,
      firstPriceDate: '2010-01-01',
      latestPriceDate: expectedLatestTradingDate,
      latestVolume: 0,
      latestAdjustedClose: 2810,
      latestClose: 2810,
      rollingWindowBars: 252,
      rollingWindowCoveragePercent: 100,
      maxPriceGapDays: 1,
      recentVolumeCoveragePercent: 0,
      adjustedCloseCoveragePercent: 100,
      usesAdjustedCloseFallback: false,
    }));

    expect(zeroVolumeValidation).toEqual([]);
    expect(createMany.mock.calls[0][0].data[0].volume).toBe(BigInt(0));
    expect(summary).toMatchObject({
      rowsReceived: 1,
      rowsInserted: 1,
      rowsSkipped: 0,
    });
    expect(readiness).toMatchObject({
      hasRecentVolume: false,
      priceReadiness: 'MISSING_RECENT_VOLUME',
      isPriceReady: false,
      isReviewReady: false,
    });
    expect(readiness.readinessBlockers).toEqual(expect.arrayContaining([
      'MISSING_RECENT_VOLUME',
      'LOW_RECENT_VOLUME_COVERAGE',
    ]));
  });

  it('turns storage readiness stats into stale and missing latest candle blockers', async () => {
    const latestTimestamp = new Date('2026-05-14T00:00:00.000Z');
    const prisma = {
      priceTick: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([{
        symbol: 'STALE.NS',
        priceHistoryBars: 4000,
        firstTimestamp: new Date('2010-01-01T00:00:00.000Z'),
        latestTimestamp,
        latestVolume: BigInt(1_000_000),
        latestAdjustedClose: '100',
        latestClose: '100',
        rollingWindowBars: 252,
        volumeRows: 252,
        adjustedCloseRows: 252,
        maxPriceGapDays: 1,
      }]),
    };
    const repository = new MarketDataFoundationRepository(prisma as any);

    const stats = await repository.priceReadinessStatsForSymbols(['STALE.NS', 'MISSING.NS']);
    const stale = classifyInstrumentUniverseReadiness(completeInstrument(stats.get('STALE.NS')));
    const missing = classifyInstrumentUniverseReadiness(completeInstrument(stats.get('MISSING.NS'), {
      providerSymbol: 'MISSING.NS',
    }));

    expect(stats.get('STALE.NS')).toMatchObject({
      priceHistoryBars: 4000,
      latestPriceDate: '2026-05-14',
      rollingWindowBars: 252,
      rollingWindowCoveragePercent: 100,
    });
    expect(stats.get('MISSING.NS')).toMatchObject({
      priceHistoryBars: 0,
      latestPriceDate: null,
    });
    expect(stale).toMatchObject({
      priceReadiness: 'STALE_LATEST_PRICE',
      latestPriceDate: '2026-05-14',
      expectedLatestTradingDate,
      isReviewReady: false,
    });
    expect(stale.readinessBlockers).toEqual(expect.arrayContaining(['STALE_LATEST_PRICE']));
    expect(missing).toMatchObject({
      priceReadiness: 'MISSING_LATEST_PRICE',
      latestPriceDate: null,
      isReviewReady: false,
    });
    expect(missing.readinessBlockers).toEqual(expect.arrayContaining(['MISSING_LATEST_PRICE']));
  });

  it('keeps unsupported and manual-required instruments out of trusted readiness', () => {
    const readyPriceStats = {
      priceHistoryBars: 4000,
      firstPriceDate: '2010-01-01',
      latestPriceDate: expectedLatestTradingDate,
      latestVolume: 1_000_000,
      latestAdjustedClose: 100,
      latestClose: 100,
      rollingWindowBars: 252,
      rollingWindowCoveragePercent: 100,
      maxPriceGapDays: 1,
      recentVolumeCoveragePercent: 100,
      adjustedCloseCoveragePercent: 100,
      usesAdjustedCloseFallback: false,
    };

    const unsupported = classifyInstrumentUniverseReadiness(completeInstrument(readyPriceStats, {
      providerSupportStatus: 'UNSUPPORTED',
    }));
    const manualRequired = classifyInstrumentUniverseReadiness(completeInstrument(readyPriceStats, {
      providerSymbol: null,
    }));

    expect(unsupported).toMatchObject({
      universeState: 'UNSUPPORTED',
      providerReadiness: 'UNSUPPORTED',
      isPriceReady: true,
      isContextReady: true,
      isReviewReady: false,
    });
    expect(unsupported.readinessBlockers).toEqual(expect.arrayContaining(['PROVIDER_UNSUPPORTED']));

    expect(manualRequired).toMatchObject({
      providerReadiness: 'SUPPORTED',
      isPriceReady: true,
      isContextReady: true,
      isReviewReady: false,
    });
    expect(manualRequired.readinessBlockers).toEqual(expect.arrayContaining(['PROVIDER_SYMBOL_MISSING']));
  });

  it('characterizes local validation behavior without Angel One, live providers, startup, or UI dependencies', () => {
    const partition = partitionHistoricalPrices([price()]);

    expect(partition.valid).toHaveLength(1);
    expect(partition.invalid).toHaveLength(0);
  });
});
