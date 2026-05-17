/// <reference types="@types/jest" />
import { parseIndianExchangeEodCsv } from '../../../src/modules/market-data-foundation/market-data-foundation.exchange-eod-adapter';
import { YahooFinanceIngestionService } from '../../../src/modules/market-data-foundation/market-data-foundation.provider';
import { classifyInstrumentUniverseReadiness } from '../../../src/modules/market-data-foundation/market-data-foundation.universe';
import {
  partitionHistoricalPrices,
  validateHistoricalPrice,
} from '../../../src/modules/market-data-foundation/market-data-foundation.validation';
import type { HistoricalPrice } from '../../../src/modules/market-data-foundation/market-data-foundation.types';

const expectedLatestTradingDate = '2026-05-15';

const completePriceStats = (overrides: Record<string, unknown> = {}) => ({
  priceHistoryBars: 4000,
  firstPriceDate: '2010-01-01',
  latestPriceDate: expectedLatestTradingDate,
  latestVolume: 1_500_000,
  latestAdjustedClose: 2810,
  latestClose: 2810,
  rollingWindowBars: 252,
  rollingWindowCoveragePercent: 100,
  maxPriceGapDays: 1,
  recentVolumeCoveragePercent: 100,
  adjustedCloseCoveragePercent: 100,
  usesAdjustedCloseFallback: false,
  ...overrides,
});

const completeInstrument = (overrides: Record<string, unknown> = {}) => ({
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
  priceStats: completePriceStats(),
  ...overrides,
});

const price = (overrides: Partial<HistoricalPrice> = {}): HistoricalPrice => ({
  symbol: 'RELIANCE.NS',
  date: new Date('2026-05-15T00:00:00.000Z'),
  open: 2800,
  high: 2825,
  low: 2790,
  close: 2810,
  adjustedClose: 2810,
  volume: 1_500_000,
  source: 'local-test',
  ...overrides,
});

describe('market data readiness evidence invariants', () => {
  it('represents missing latest candle and stale latest candle evidence clearly', () => {
    const missingLatest = classifyInstrumentUniverseReadiness(completeInstrument({
      priceStats: completePriceStats({ latestPriceDate: null }),
    }));
    const stale = classifyInstrumentUniverseReadiness(completeInstrument({
      priceStats: completePriceStats({ latestPriceDate: '2026-05-14' }),
    }));

    expect(missingLatest).toMatchObject({
      priceReadiness: 'MISSING_LATEST_PRICE',
      latestPriceDate: null,
      expectedLatestTradingDate,
      isPriceReady: false,
      isReviewReady: false,
    });
    expect(missingLatest.readinessBlockers).toEqual(expect.arrayContaining(['MISSING_LATEST_PRICE']));

    expect(stale).toMatchObject({
      universeState: 'STALE_OR_INCOMPLETE',
      priceReadiness: 'STALE_LATEST_PRICE',
      latestPriceDate: '2026-05-14',
      expectedLatestTradingDate,
      isPriceReady: false,
      isReviewReady: false,
    });
    expect(stale.readinessBlockers).toEqual(expect.arrayContaining(['STALE_LATEST_PRICE']));
  });

  it('represents duplicate candle and invalid OHLC evidence without repository or schema changes', () => {
    const duplicatePartition = partitionHistoricalPrices([
      price({ source: 'NSE_SECURITY_BHAVDATA', adjustedClose: null }),
      price({ source: 'NSE_SECURITY_BHAVDATA', adjustedClose: 2810 }),
    ]);
    const invalidOhlc = validateHistoricalPrice(price({
      open: 2850,
      high: 2825,
      low: 2830,
      close: 2860,
    }));

    expect(duplicatePartition.valid).toHaveLength(1);
    expect(duplicatePartition.invalid).toHaveLength(1);
    expect(duplicatePartition.invalid[0].errors).toContain('duplicate price bar in batch');
    expect((duplicatePartition as any).duplicateProviderRowsSkipped).toBe(1);

    expect(invalidOhlc).toEqual(expect.arrayContaining([
      'low cannot be greater than high',
      'open must be within low/high range',
      'close must be within low/high range',
    ]));
  });

  it('keeps zero-volume candles as visible evidence while blocking price readiness when volume is unusable', () => {
    const zeroVolumeValidation = validateHistoricalPrice(price({ volume: 0 }));
    const zeroVolumeReadiness = classifyInstrumentUniverseReadiness(completeInstrument({
      priceStats: completePriceStats({
        latestVolume: 0,
        recentVolumeCoveragePercent: 0,
      }),
    }));

    expect(zeroVolumeValidation).toEqual([]);
    expect(zeroVolumeReadiness).toMatchObject({
      hasRecentVolume: false,
      priceReadiness: 'MISSING_RECENT_VOLUME',
      recentVolumeCoveragePercent: 0,
      isPriceReady: false,
      isReviewReady: false,
    });
    expect(zeroVolumeReadiness.readinessBlockers).toEqual(expect.arrayContaining([
      'MISSING_RECENT_VOLUME',
      'LOW_RECENT_VOLUME_COVERAGE',
    ]));
  });

  it('represents unsupported and manual-required instruments as not trusted', () => {
    const unsupported = classifyInstrumentUniverseReadiness(completeInstrument({
      providerSupportStatus: 'UNSUPPORTED',
    }));
    const manualRequired = classifyInstrumentUniverseReadiness(completeInstrument({
      providerSymbol: null,
    }));

    expect(unsupported).toMatchObject({
      universeState: 'UNSUPPORTED',
      providerReadiness: 'UNSUPPORTED',
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

  it('keeps retryable provider evidence distinct from fallback-required evidence using mocked local provider behavior only', async () => {
    const provider = new YahooFinanceIngestionService(undefined, 0);
    const chart = jest.fn().mockRejectedValue(new Error('429 Too Many Requests'));
    (provider as any).yahooFinance = { chart };

    const result = await provider.validateProviderSymbol('RETRY.NS', {
      region: 'IN',
      assetType: 'STOCK',
      validationWindowStartDate: new Date('2026-05-01T00:00:00.000Z'),
      validationWindowEndDate: new Date('2026-05-15T00:00:00.000Z'),
      timeoutMs: 1000,
    });

    expect(chart).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      supported: false,
      failed: true,
      classification: 'RETRYABLE_RATE_LIMITED',
      provider: 'yahoo',
      providerSymbol: 'RETRY.NS',
      candlesFound: 0,
      sourceName: 'YAHOO_CHART',
    });
    expect(result.fallbackSourceAttempted).toBeUndefined();
    expect(result.freeFallbackRequired).toBeUndefined();
    expect(result.classification).not.toBe('FREE_FALLBACK_REQUIRED');
  });

  it('keeps provider/source provenance on local exchange EOD rows and excludes non-stock rows from trusted prices', () => {
    const csv = [
      'SYMBOL,SERIES,DATE1,OPEN_PRICE,HIGH_PRICE,LOW_PRICE,CLOSE_PRICE,TTL_TRD_QNTY,INSTRUMENT TYPE',
      'RELIANCE,EQ,15-May-2026,2800,2825,2790,2810,1234567,EQUITY',
      'RELIANCE,EQ,15-May-2026,2800,2825,2790,2810,1234567,FUTSTK',
    ].join('\n');

    const result = parseIndianExchangeEodCsv(csv, {
      source: 'NSE_SECURITY_BHAVDATA',
      sourceUrl: 'local-fixture://sec_bhavdata_full_15052026.csv',
    });

    expect(result).toMatchObject({
      sourceName: 'NSE_SECURITY_BHAVDATA',
      rowsRead: 2,
      rowsParsed: 1,
      rowsSkipped: 1,
    });
    expect(result.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.sourceIdentity).toMatchObject({
      sourceName: 'NSE_SECURITY_BHAVDATA',
      exchange: 'NSE',
      sourceUrl: 'local-fixture://sec_bhavdata_full_15052026.csv',
      rowCount: 2,
    });
    expect(result.sourceIdentity.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.sourceIdentity.rowsSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.prices).toEqual([
      expect.objectContaining({
        symbol: 'RELIANCE.NS',
        source: 'NSE_SECURITY_BHAVDATA',
        open: 2800,
        high: 2825,
        low: 2790,
        close: 2810,
        volume: 1_234_567,
      }),
    ]);
  });

  it('does not require Angel One, live providers, broker credentials, startup behavior, or UI scope', () => {
    const readiness = classifyInstrumentUniverseReadiness(completeInstrument());
    const validation = partitionHistoricalPrices([price()]);

    expect(readiness.isReviewReady).toBe(true);
    expect(validation.valid).toHaveLength(1);
    expect(validation.invalid).toHaveLength(0);
  });
});
