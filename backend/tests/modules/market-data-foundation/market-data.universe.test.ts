/// <reference types="@types/jest" />
import { MarketDataFoundationService, classifyInstrumentUniverseReadiness, latestCompletedTradingDateForRegion } from '../../../src/modules/market-data-foundation';

const freshDate = '2026-05-11';
const expectedDate = '2026-05-11';

const readyPriceStats = {
  priceHistoryBars: 252,
  latestPriceDate: freshDate,
  latestVolume: 1000,
  latestAdjustedClose: 100,
  latestClose: 100,
};

const completeHistoryPriceStats = (overrides: Record<string, unknown> = {}): any => ({
  ...readyPriceStats,
  firstPriceDate: '2000-01-01',
  priceHistoryBars: 4000,
  rollingWindowBars: 252,
  rollingWindowCoveragePercent: 100,
  maxPriceGapDays: 1,
  recentVolumeCoveragePercent: 100,
  adjustedCloseCoveragePercent: 100,
  usesAdjustedCloseFallback: false,
  ...overrides,
});

const baseInstrument = {
  isActive: true,
  isDelisted: false,
  providerSupportStatus: 'SUPPORTED',
  providerSymbol: 'RELIANCE.NS',
  sector: 'Energy',
  industry: 'Oil & Gas',
  marketCap: 1000,
  country: 'India',
  currency: 'INR',
  isin: 'INE002A01018',
  ipoDate: new Date('2000-01-01T00:00:00.000Z'),
  expectedLatestTradingDate: expectedDate,
};

describe('Market Data Foundation universe readiness', () => {
  it('classifies catalog-only rows as not review-ready', () => {
    const readiness = classifyInstrumentUniverseReadiness({
      ...baseInstrument,
      providerSupportStatus: 'UNKNOWN',
      priceStats: null,
    });

    expect(readiness.universeState).toBe('CATALOG_ONLY');
    expect(readiness.isReviewReady).toBe(false);
    expect(readiness.readinessBlockers).toEqual(expect.arrayContaining(['PROVIDER_UNKNOWN']));
  });

  it('keeps provider-supported rows without prices out of review-ready state', () => {
    const readiness = classifyInstrumentUniverseReadiness({
      ...baseInstrument,
      priceStats: { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null },
    });

    expect(['PROVIDER_SUPPORTED', 'STALE_OR_INCOMPLETE']).toContain(readiness.universeState);
    expect(readiness.isReviewReady).toBe(false);
    expect(readiness.readinessBlockers).toEqual(expect.arrayContaining(['MISSING_LATEST_PRICE', 'INADEQUATE_PRICE_HISTORY', 'MISSING_RECENT_VOLUME']));
  });

  it('classifies stale latest prices as stale or incomplete', () => {
    const readiness = classifyInstrumentUniverseReadiness({
      ...baseInstrument,
      priceStats: { ...readyPriceStats, latestPriceDate: '2026-04-30' },
    });

    expect(readiness.universeState).toBe('STALE_OR_INCOMPLETE');
    expect(readiness.readinessBlockers).toEqual(expect.arrayContaining(['STALE_LATEST_PRICE']));
  });

  it('treats Friday data as stale when Monday EOD is expected', () => {
    const readiness = classifyInstrumentUniverseReadiness({
      ...baseInstrument,
      expectedLatestTradingDate: '2026-05-11',
      priceStats: { ...readyPriceStats, latestPriceDate: '2026-05-08' },
    });

    expect(readiness.priceReadiness).toBe('STALE_LATEST_PRICE');
    expect(readiness.universeState).toBe('STALE_OR_INCOMPLETE');
    expect(readiness.readinessBlockers).toEqual(expect.arrayContaining(['STALE_LATEST_PRICE']));
  });

  it('blocks price readiness when the expected trading date is uncertain', () => {
    const readiness = classifyInstrumentUniverseReadiness({
      ...baseInstrument,
      expectedLatestTradingDate: null,
      priceStats: readyPriceStats,
    });

    expect(readiness.priceReadiness).toBe('MARKET_CALENDAR_UNCERTAIN');
    expect(readiness.isPriceReady).toBe(false);
    expect(readiness.universeState).toBe('STALE_OR_INCOMPLETE');
    expect(readiness.readinessBlockers).toEqual(expect.arrayContaining(['MARKET_CALENDAR_UNCERTAIN']));
  });

  it('allows 252 fresh bars with volume to become price-ready before metadata is complete', () => {
    const readiness = classifyInstrumentUniverseReadiness({
      ...baseInstrument,
      sector: null,
      industry: null,
      priceStats: readyPriceStats,
    });

    expect(readiness.universeState).toBe('PRICE_READY');
    expect(readiness.isPriceReady).toBe(true);
    expect(readiness.isContextReady).toBe(false);
    expect(readiness.readinessBlockers).toEqual(expect.arrayContaining(['MISSING_SECTOR', 'MISSING_INDUSTRY']));
  });

  it('blocks price readiness when the rolling 252-session window has gaps', () => {
    const readiness = classifyInstrumentUniverseReadiness({
      ...baseInstrument,
      priceStats: {
        ...readyPriceStats,
        rollingWindowBars: 240,
        rollingWindowCoveragePercent: 95.2,
        maxPriceGapDays: 12,
        recentVolumeCoveragePercent: 100,
        adjustedCloseCoveragePercent: 100,
        usesAdjustedCloseFallback: false,
      },
    });

    expect(readiness.priceReadiness).toBe('INADEQUATE_HISTORY');
    expect(readiness.isPriceReady).toBe(false);
    expect(readiness.readinessBlockers).toEqual(expect.arrayContaining(['INADEQUATE_ROLLING_PRICE_WINDOW', 'PRICE_HISTORY_GAPS']));
  });

  it('classifies valid metadata plus price readiness as review-ready', () => {
    const readiness = classifyInstrumentUniverseReadiness({
      ...baseInstrument,
      priceStats: readyPriceStats,
    });

    expect(readiness.universeState).toBe('REVIEW_READY');
    expect(readiness.isReviewReady).toBe(true);
    expect(readiness.readinessBlockers).toEqual([]);
  });

  it('blocks IN/STOCK review readiness when market cap is missing', () => {
    const readiness = classifyInstrumentUniverseReadiness({
      ...baseInstrument,
      marketCap: null,
      priceStats: readyPriceStats,
    });

    expect(readiness.isReviewReady).toBe(false);
    expect(readiness.metadataReadiness).toBe('MISSING_REQUIRED_METADATA');
    expect(readiness.readinessBlockers).toEqual(expect.arrayContaining(['MISSING_MARKET_CAP']));
  });

  it('reports missing listing date as a critical blocker when it blocks review readiness', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { ...stockRow('missing-listing', 'LISTING.NS', 'SUPPORTED'), ipoDate: null },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['LISTING.NS', { ...readyPriceStats, latestPriceDate: '2099-01-01' }],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.universeHealth({ region: 'IN', assetType: 'STOCK' });
    const listingBlocker = result.topBlockers.find((item) => item.code === 'MISSING_LISTING_DATE');

    expect(result.counts.reviewReady).toBe(0);
    expect(listingBlocker).toMatchObject({ severity: 'critical', count: 1 });
  });

  it('classifies unsupported provider rows as unsupported', () => {
    const readiness = classifyInstrumentUniverseReadiness({
      ...baseInstrument,
      providerSupportStatus: 'UNSUPPORTED',
      priceStats: readyPriceStats,
    });

    expect(readiness.universeState).toBe('UNSUPPORTED');
    expect(readiness.isReviewReady).toBe(false);
    expect(readiness.readinessBlockers).toEqual(expect.arrayContaining(['PROVIDER_UNSUPPORTED']));
  });

  it('classifies inactive or delisted rows outside the current review universe', () => {
    const readiness = classifyInstrumentUniverseReadiness({
      ...baseInstrument,
      isActive: false,
      priceStats: readyPriceStats,
    });

    expect(readiness.universeState).toBe('DELISTED_OR_INACTIVE');
    expect(readiness.isReviewReady).toBe(false);
    expect(readiness.readinessBlockers).toEqual(expect.arrayContaining(['DELISTED_OR_INACTIVE']));
  });

  it('counts scoped universe health states and blockers', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        stockRow('catalog', 'CATALOG.NS', 'UNKNOWN'),
        stockRow('ready', 'READY.NS', 'SUPPORTED'),
        stockRow('stale', 'STALE.NS', 'SUPPORTED'),
        { ...stockRow('unsupported', 'UNSUPPORTED.NS', 'UNSUPPORTED'), providerError: 'no chart data' },
        { ...stockRow('inactive', 'INACTIVE.NS', 'SUPPORTED'), isActive: false },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['CATALOG.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['READY.NS', completeHistoryPriceStats({ latestPriceDate: '2099-01-01' })],
        ['STALE.NS', completeHistoryPriceStats({ latestPriceDate: '2020-01-01' })],
        ['UNSUPPORTED.NS', completeHistoryPriceStats({ latestPriceDate: '2099-01-01' })],
        ['INACTIVE.NS', completeHistoryPriceStats({ latestPriceDate: '2099-01-01' })],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.universeHealth({ region: 'IN', assetType: 'STOCK' });

    expect(repository.listStocksForUniverseHealth).toHaveBeenCalledWith({ region: 'IN', assetType: 'STOCK' });
    expect(result.counts.totalCatalogInstruments).toBe(5);
    expect(result.counts.activeInstruments).toBe(4);
    expect(result.counts.catalogOnly).toBe(1);
    expect(result.counts.reviewReady).toBe(1);
    expect(result.counts.readiness.reviewReady).toBe(1);
    expect(result.counts.staleOrIncomplete).toBe(1);
    expect(result.counts.byUniverseState.CATALOG_ONLY).toBe(1);
    expect(result.counts.byUniverseState.REVIEW_READY).toBe(1);
    expect(result.counts.byUniverseState.STALE_OR_INCOMPLETE).toBe(1);
    expect(result.counts.readiness.priceReady).toBeGreaterThan(result.counts.byUniverseState.PRICE_READY);
    expect(result.counts.missingLatestPrice).toBe(1);
    expect(result.counts.staleLatestPrice).toBe(1);
    expect(result.coverage.reviewReadyPercentage).toBe(25);
    expect(result.topBlockers.map((item) => item.code)).toEqual(expect.arrayContaining(['PROVIDER_UNKNOWN', 'MISSING_LATEST_PRICE', 'STALE_LATEST_PRICE']));
    expect(result.trustStatus).toBe('PARTIAL');
  });

  it('marks an all-UNKNOWN active provider universe as not trustworthy', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        stockRow('catalog-1', 'CATALOG1.NS', 'UNKNOWN'),
        stockRow('catalog-2', 'CATALOG2.NS', 'UNKNOWN'),
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['CATALOG1.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['CATALOG2.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.universeHealth({ region: 'IN', assetType: 'STOCK' });

    expect(result.counts.providerUnknown).toBe(2);
    expect(result.trustStatus).toBe('NOT_TRUSTWORTHY');
    expect(result.trustReasons).toEqual(expect.arrayContaining(['Provider support is UNKNOWN for the entire active scoped universe.']));
  });

  it('repairs UNKNOWN provider status from existing usable price history on read', async () => {
    const markProviderSupportedFromStoredPrices = jest.fn().mockResolvedValue({ count: 1 });
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        stockRow('priced-unknown', 'PRICED.NS', 'UNKNOWN'),
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['PRICED.NS', { ...readyPriceStats, latestPriceDate: '2099-01-01' }],
      ])),
      markProviderSupportedFromStoredPrices,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.universeHealth({ region: 'IN', assetType: 'STOCK' });

    expect(markProviderSupportedFromStoredPrices).toHaveBeenCalledWith(['PRICED.NS']);
    expect(result.counts.providerUnknown).toBe(0);
    expect(result.counts.providerSupported).toBe(1);
    expect(result.counts.catalogOnly).toBe(0);
  });

  it('includes supported current OHLCV rows in the trusted review universe even when metadata is missing', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { ...stockRow('lite-ready', 'LITE.NS', 'SUPPORTED'), sector: null, industry: null, marketCap: null, isin: null, ipoDate: null },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['LITE.NS', completeHistoryPriceStats({ latestPriceDate: '2099-01-01' })],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.trustedReviewUniverseHealth({ region: 'IN', assetType: 'STOCK' });

    expect(result.trustedCount).toBe(1);
    expect(result.contextGapCounts).toMatchObject({
      missingSector: 1,
      missingIndustry: 1,
      missingMarketCap: 1,
      missingIsin: 1,
      missingListingDate: 1,
    });
    expect(result.excludedCounts.insufficientBarsUnder120).toBe(0);
    expect(result.warnings).toEqual(expect.arrayContaining(['Missing metadata is shown as context gap, not a hard blocker for price-action review.']));
  });

  it('exposes additive trusted-baseline fields on trusted review instruments', async () => {
    const latestCompleted = latestCompletedTradingDateForRegion('IN') as string;
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          ...stockRow('trusted-1', 'TRUSTED.NS', 'SUPPORTED'),
          sourceSymbol: 'TRUSTED',
          displaySymbol: 'TRUSTED',
          catalogSource: 'NSE_EQUITY_SECURITIES',
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['TRUSTED.NS', completeHistoryPriceStats({ latestPriceDate: latestCompleted })],
      ])),
      priceHistoryForSymbols: jest.fn().mockResolvedValue(new Map([
        ['TRUSTED.NS', [{ date: latestCompleted, open: 1, high: 2, low: 1, close: 2, adjustedClose: 2, volume: 100 }]],
      ])),
      listRepairStatesForStocks: jest.fn().mockResolvedValue(new Map()),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const rows = await service.listTrustedReviewUniverseInstruments({ region: 'IN', assetType: 'STOCK', limit: 25, offset: 0 });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      symbol: 'TRUSTED.NS',
      trustedBaselineResidualState: 'REVIEW_READY',
      requiredHistoryStatus: 'COMPLETE',
      listingDateStatus: 'PRESENT_OLDER_THAN_15Y_USED_15Y',
      providerFallbackState: 'PROVIDER_SUPPORTED',
      latestCompletedEodDate: latestCompleted,
      primarySourceAttempted: 'YAHOO',
    });
    expect(Array.isArray(rows[0].trustedBaselineBlockerCodes)).toBe(true);
  });

  it('publishes the pre-market target session with the previous completed EOD requirement', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        stockRow('lite-ready', 'LITE.NS', 'SUPPORTED'),
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['LITE.NS', completeHistoryPriceStats({ latestPriceDate: '2026-05-11' })],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.trustedReviewUniverseHealth({
      region: 'IN',
      assetType: 'STOCK',
      now: new Date('2026-05-12T02:00:00.000Z'),
    } as any);

    expect(result.targetTradingDate).toBe('2026-05-12');
    expect(result.requiredDataThroughDate).toBe('2026-05-11');
    expect(result.storedDataThroughDate).toBe('2026-05-11');
    expect(result.trustedCount).toBe(1);
  });

  it('publishes post-close review for the next target session using today EOD as required data-through', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        stockRow('lite-ready', 'LITE.NS', 'SUPPORTED'),
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['LITE.NS', completeHistoryPriceStats({ latestPriceDate: '2026-05-12' })],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.trustedReviewUniverseHealth({
      region: 'IN',
      assetType: 'STOCK',
      now: new Date('2026-05-12T10:30:00.000Z'),
    } as any);

    expect(result.targetTradingDate).toBe('2026-05-13');
    expect(result.requiredDataThroughDate).toBe('2026-05-12');
    expect(result.storedDataThroughDate).toBe('2026-05-12');
  });

  it('excludes non-trusted provider and OHLCV states from the trusted review universe', async () => {
    const rows = [
      stockRow('unknown', 'UNKNOWN.NS', 'UNKNOWN'),
      stockRow('retry', 'RETRY.NS', 'VALIDATION_FAILED'),
      stockRow('unsupported', 'UNSUPPORTED.NS', 'UNSUPPORTED'),
      stockRow('stale', 'STALE.NS', 'SUPPORTED'),
      stockRow('noprice', 'NOPRICE.NS', 'SUPPORTED'),
      stockRow('short', 'SHORT.NS', 'SUPPORTED'),
      stockRow('novolume', 'NOVOLUME.NS', 'SUPPORTED'),
    ];
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue(rows),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['UNKNOWN.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null }],
        ['RETRY.NS', completeHistoryPriceStats({ latestPriceDate: '2099-01-01' })],
        ['UNSUPPORTED.NS', completeHistoryPriceStats({ latestPriceDate: '2099-01-01' })],
        ['STALE.NS', completeHistoryPriceStats({ latestPriceDate: '2020-01-01' })],
        ['NOPRICE.NS', completeHistoryPriceStats({ latestPriceDate: null, latestVolume: null })],
        ['SHORT.NS', completeHistoryPriceStats({ priceHistoryBars: 119, latestPriceDate: '2099-01-01' })],
        ['NOVOLUME.NS', completeHistoryPriceStats({ latestPriceDate: '2099-01-01', latestVolume: null })],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.trustedReviewUniverseHealth({ region: 'IN', assetType: 'STOCK' });

    expect(result.trustedCount).toBe(0);
    expect(result.excludedCounts).toMatchObject({
      providerUnknown: 1,
      providerRetryFailed: 1,
      providerUnsupported: 1,
      staleLatestPrice: 1,
      noLatestPrice: 1,
      insufficientBarsUnder120: 1,
      missingRecentVolume: 1,
    });
  });

  it('reports LIMITED and READY trusted review statuses from configurable thresholds', async () => {
    const makeRows = (count: number) => Array.from({ length: count }, (_, index) => stockRow(`ready-${index}`, `READY${index}.NS`, 'SUPPORTED'));
    const makeStats = (rows: any[]) => new Map(rows.map((row) => [row.symbol, completeHistoryPriceStats({ latestPriceDate: '2099-01-01' })]));
    const limitedRows = makeRows(100);
    const readyRows = makeRows(300);
    const limitedService = new MarketDataFoundationService({
      listStocksForUniverseHealth: jest.fn().mockResolvedValue(limitedRows),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(makeStats(limitedRows)),
    } as any, {} as any);
    const readyService = new MarketDataFoundationService({
      listStocksForUniverseHealth: jest.fn().mockResolvedValue(readyRows),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(makeStats(readyRows)),
    } as any, {} as any);

    await expect(limitedService.trustedReviewUniverseHealth({ region: 'IN', assetType: 'STOCK' })).resolves.toMatchObject({
      trustedCount: 100,
      status: 'LIMITED',
      mode: 'LIMITED_REVIEW',
    });
    await expect(readyService.trustedReviewUniverseHealth({ region: 'IN', assetType: 'STOCK' })).resolves.toMatchObject({
      trustedCount: 300,
      status: 'READY',
      mode: 'FULL_REVIEW',
    });
  });

  it('builds a canonical review readiness summary with one bounded repair action', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        stockRow('catalog', 'CATALOG.NS', 'UNKNOWN'),
        stockRow('stale', 'STALE.NS', 'SUPPORTED'),
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['CATALOG.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['STALE.NS', { ...readyPriceStats, latestPriceDate: '2020-01-01' }],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.reviewReadinessSummary({ region: 'IN', assetType: 'STOCK' });

    expect(result).toMatchObject({
      scope: { region: 'IN', assetType: 'STOCK' },
      reviewMode: 'NO_REVIEW',
      userDecision: 'REPAIR_DATA',
      reviewUniverse: {
        catalogCount: 2,
        trustedCount: 0,
      },
      readinessCounts: {
        providerUnknown: 1,
        staleLatestPrice: 1,
      },
      nextAction: {
        code: 'VALIDATE_PROVIDERS',
        label: 'Validate unknown providers',
        boundedRequest: { batchSize: 50, region: 'IN', assetType: 'STOCK' },
      },
    });
    expect(result.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'PROVIDER_VALIDATION', severity: 'HARD_BLOCKER', affectedCount: 1 }),
      expect.objectContaining({ category: 'PRICE_BACKFILL', nextActionCode: 'BACKFILL_PRICES' }),
      expect.objectContaining({ category: 'INSUFFICIENT_TRUSTED_UNIVERSE', severity: 'HARD_BLOCKER' }),
    ]));
  });

  it('marks the review readiness summary ready when trusted and strict signoff are both healthy', async () => {
    const originalMinLite = process.env.TRUSTED_REVIEW_MIN_LITE;
    const originalMinFull = process.env.TRUSTED_REVIEW_MIN_FULL;
    const originalSignoffMin = process.env.MARKET_DATA_SIGNOFF_MIN_REVIEW_READY;
    process.env.TRUSTED_REVIEW_MIN_LITE = '1';
    process.env.TRUSTED_REVIEW_MIN_FULL = '1';
    process.env.MARKET_DATA_SIGNOFF_MIN_REVIEW_READY = '1';
    try {
      const repository = {
        listStocksForUniverseHealth: jest.fn().mockResolvedValue([
          {
            ...stockRow('ready', 'READY.NS', 'SUPPORTED'),
            sourceSymbol: 'READY',
            displaySymbol: 'READY',
            catalogSource: 'NSE_EQUITY_SECURITIES',
          },
        ]),
        priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
          ['READY.NS', completeHistoryPriceStats({ latestPriceDate: '2099-01-01' })],
        ])),
      };
      const service = new MarketDataFoundationService(repository as any, {} as any);

      const result = await service.reviewReadinessSummary({ region: 'IN', assetType: 'STOCK' });

      expect(result.reviewMode).toBe('FULL_REVIEW');
      expect(result.trustStatus).toBe('OK');
      expect(result.userDecision).toBe('READY_FOR_REVIEW');
      expect(result.nextAction).toBeNull();
      expect(result.blockers).toEqual([]);
    } finally {
      process.env.TRUSTED_REVIEW_MIN_LITE = originalMinLite;
      process.env.TRUSTED_REVIEW_MIN_FULL = originalMinFull;
      process.env.MARKET_DATA_SIGNOFF_MIN_REVIEW_READY = originalSignoffMin;
    }
  });
});

function stockRow(id: string, symbol: string, providerSupportStatus: string) {
  return {
    id,
    symbol,
    name: symbol,
    region: 'IN',
    exchange: 'NSE',
    country: 'India',
    sector: 'Energy',
    industry: 'Oil & Gas',
    currency: 'INR',
    isin: 'INE002A01018',
    ipoDate: new Date('2000-01-01T00:00:00.000Z'),
    marketCap: 1000,
    assetType: 'STOCK',
    providerSymbol: symbol,
    providerSupportStatus,
    providerError: null,
    isActive: true,
    isDelisted: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    dataStatus: 'PARTIAL',
  };
}
