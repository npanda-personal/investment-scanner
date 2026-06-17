/// <reference types="@types/jest" />
/**
 * Unit tests for the region-parameterized Yahoo fundamentals ingest.
 *
 * Covers the two behaviors that the US "Upcoming Results" unblock depends on:
 *  1. `pickEarningsDate` maps `calendarEvents.earnings.earningsDate` → the forward
 *     next-earnings Date that gets written to `Fundamental.officialResultDate`.
 *  2. The `region` option selects the right stock set (region='US' loads US active,
 *     non-delisted stocks) and the resolved earnings date is written verbatim.
 *
 * Yahoo client + Prisma are fully mocked — no network, no DB.
 * Hyphenated filename avoids the jest TS2307 stem-collision with the service file.
 */

// Mock the yahoo-finance2 default export BEFORE importing the service under test.
const quoteSummaryMock = jest.fn();
jest.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ quoteSummary: quoteSummaryMock })),
}));

import {
  YahooFundamentalsService,
  pickEarningsDate,
} from '../../../src/modules/market-data-foundation/ingestion/market-data-foundation.yahoo-fundamentals.service';

describe('pickEarningsDate (calendarEvents.earnings.earningsDate mapping)', () => {
  it('picks the first FORWARD date when both past and future dates are present', () => {
    const past = new Date(Date.now() - 30 * 86400_000);
    const soon = new Date(Date.now() + 7 * 86400_000);
    const later = new Date(Date.now() + 60 * 86400_000);
    const picked = pickEarningsDate([past, later, soon]);
    expect(picked?.getTime()).toBe(soon.getTime());
  });

  it('falls back to the latest available date when all dates are in the past', () => {
    const older = new Date(Date.now() - 60 * 86400_000);
    const newer = new Date(Date.now() - 5 * 86400_000);
    const picked = pickEarningsDate([older, newer]);
    expect(picked?.getTime()).toBe(newer.getTime());
  });

  it('accepts a single (non-array) date value', () => {
    const d = new Date(Date.now() + 10 * 86400_000);
    expect(pickEarningsDate(d)?.getTime()).toBe(d.getTime());
  });

  it('returns null when there is no usable date', () => {
    expect(pickEarningsDate(undefined)).toBeNull();
    expect(pickEarningsDate([])).toBeNull();
    expect(pickEarningsDate('not-a-date')).toBeNull();
  });
});

describe('YahooFundamentalsService.ingestForSymbols region selection + officialResultDate write', () => {
  beforeEach(() => {
    quoteSummaryMock.mockReset();
  });

  function buildFakeRepo() {
    const stockFindMany = jest.fn().mockResolvedValue([
      { id: 'stock-1', symbol: 'AAPL', currency: 'USD' },
    ]);
    const fundamentalUpdate = jest.fn().mockResolvedValue({});
    const stockUpdate = jest.fn().mockResolvedValue({});
    const upsertFundamentals = jest.fn().mockResolvedValue({ id: 'fund-1' });
    const repo = {
      upsertFundamentals,
      prisma: {
        priceTick: { findFirst: jest.fn().mockResolvedValue({ close: 190, adjustedClose: 190 }) },
        stock: { findMany: stockFindMany, update: stockUpdate },
        fundamental: { update: fundamentalUpdate },
      },
    };
    return { repo, stockFindMany, fundamentalUpdate, upsertFundamentals };
  }

  it('loads US active/non-delisted stocks and writes the Yahoo earnings date to officialResultDate', async () => {
    const earningsDate = new Date(Date.now() + 14 * 86400_000);
    quoteSummaryMock.mockResolvedValue({
      assetProfile: { sector: 'Technology', industry: 'Consumer Electronics' },
      summaryDetail: { marketCap: 3_000_000_000_000, currency: 'USD' },
      defaultKeyStatistics: { trailingEps: 6.5, sharesOutstanding: 15_000_000_000 },
      financialData: { totalRevenue: 390_000_000_000, financialCurrency: 'USD' },
      calendarEvents: { earnings: { earningsDate: [earningsDate] } },
    });

    const { repo, stockFindMany, fundamentalUpdate, upsertFundamentals } = buildFakeRepo();
    const service = new YahooFundamentalsService(repo as never);

    const summary = await service.ingestForSymbols({ region: 'us', limit: 1500, concurrency: 4 });

    // Region selection: query scoped to US active, non-delisted.
    expect(stockFindMany).toHaveBeenCalledTimes(1);
    const where = stockFindMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ region: 'US', isActive: true, isDelisted: false });

    // Fundamental upsert happened, then officialResultDate written with the Yahoo date.
    expect(upsertFundamentals).toHaveBeenCalledWith('stock-1', expect.objectContaining({ symbol: 'AAPL' }));
    expect(fundamentalUpdate).toHaveBeenCalledTimes(1);
    expect(fundamentalUpdate.mock.calls[0][0]).toMatchObject({
      where: { id: 'fund-1' },
      data: { officialResultDate: earningsDate },
    });

    expect(summary.region).toBe('US');
    expect(summary.processed).toBe(1);
    expect(summary.updated).toBe(1);
    expect(summary.earningsDates).toBe(1);
    expect(summary.aborted).toBe(false);
  });

  it('defaults to region EU (preserves original behavior) when no region is given', async () => {
    quoteSummaryMock.mockResolvedValue({
      assetProfile: { sector: 'Technology' },
      summaryDetail: { marketCap: 100_000_000, currency: 'EUR' },
      defaultKeyStatistics: {},
      financialData: {},
      calendarEvents: {},
    });
    const { repo, stockFindMany, fundamentalUpdate } = buildFakeRepo();
    const service = new YahooFundamentalsService(repo as never);

    const summary = await service.ingestForSymbols({});

    expect(summary.region).toBe('EU');
    expect(stockFindMany.mock.calls[0][0].where).toMatchObject({ region: 'EU', isActive: true, isDelisted: false });
    // No earnings date in calendarEvents → officialResultDate is not written.
    expect(fundamentalUpdate).not.toHaveBeenCalled();
    expect(summary.earningsDates).toBe(0);
  });
});
