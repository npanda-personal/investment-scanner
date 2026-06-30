/// <reference types="@types/jest" />
import { UniverseCurationService } from '../../../src/modules/market-data-foundation/market-data-foundation.universe-curation.service';

/** Build a mock CoverageRepository capturing what the service persists/enforces. */
function mockCoverage(ranked: any[], instruments: any[], recentlyActive: any[] = []) {
  const captured: { entries: any[]; enforcedIds: string[] } = { entries: [], enforcedIds: [] };
  const coverage = {
    rankRegionLiquidity: jest.fn().mockResolvedValue(ranked),
    listRegionInstruments: jest.fn().mockResolvedValue(instruments),
    listRecentlyActiveInstruments: jest.fn().mockResolvedValue(recentlyActive),
    replaceTrackedCoverage: jest.fn().mockImplementation((_region: string, entries: any[]) => {
      captured.entries = entries;
      return Promise.resolve(entries.length);
    }),
    applyActiveEnforcement: jest.fn().mockImplementation((_region: string, ids: string[]) => {
      captured.enforcedIds = ids;
      return Promise.resolve({ activated: ids.length, deactivated: 7 });
    }),
  };
  return { coverage, captured };
}

describe('UniverseCurationService', () => {
  it('tracks top-N by liquidity (STANDARD) and pins indices/seeded ETFs as CORE', async () => {
    const ranked = [
      { stockId: 'a', symbol: 'AAA', assetType: 'STOCK', turnover: 100 },
      { stockId: 'b', symbol: 'BBB', assetType: 'STOCK', turnover: 90 },
      { stockId: 'c', symbol: 'CCC', assetType: 'STOCK', turnover: 80 },
    ];
    const instruments = [
      ...ranked.map((r) => ({ stockId: r.stockId, symbol: r.symbol, assetType: 'STOCK', catalogSource: 'NASDAQ_TRADER_LISTED' })),
      { stockId: 'idx', symbol: '^GSPC', assetType: 'INDEX', catalogSource: 'US_INDEX_SEED' },
      { stockId: 'etf', symbol: 'XLK', assetType: 'ETF', catalogSource: 'US_INDEX_SEED' },
    ];
    const { coverage, captured } = mockCoverage(ranked, instruments);

    const summary = await new UniverseCurationService(coverage as any).curateRegion('US', { targetTrackedCount: 2 });

    expect(summary.trackedByLiquidity).toBe(2);
    expect(summary.pinnedCore).toBe(2);
    expect(summary.protectedActive).toBe(0);
    expect(summary.trackedTotal).toBe(4); // AAA, BBB (liquidity) + ^GSPC, XLK (pins); CCC excluded
    expect(summary.deactivated).toBe(7);

    const bySymbol = Object.fromEntries(captured.entries.map((e) => [e.symbol, e]));
    expect(bySymbol.AAA).toMatchObject({ trackingTier: 'STANDARD', reason: 'LIQUIDITY', liquidityRank: 1, liquidityScore: 100 });
    expect(bySymbol.BBB).toMatchObject({ trackingTier: 'STANDARD', reason: 'LIQUIDITY', liquidityRank: 2 });
    expect(bySymbol['^GSPC']).toMatchObject({ trackingTier: 'CORE', reason: 'INDEX' });
    expect(bySymbol.XLK).toMatchObject({ trackingTier: 'CORE', reason: 'ETF' });
    expect(bySymbol.CCC).toBeUndefined();
    expect(new Set(captured.enforcedIds)).toEqual(new Set(['a', 'b', 'idx', 'etf']));
  });

  it('overrides tier to CORE when a seeded ETF also ranks in the liquidity top-N', async () => {
    const ranked = [{ stockId: 'etf', symbol: 'XLK', assetType: 'ETF', turnover: 100 }];
    const instruments = [{ stockId: 'etf', symbol: 'XLK', assetType: 'ETF', catalogSource: 'US_INDEX_SEED' }];
    const { coverage, captured } = mockCoverage(ranked, instruments);

    const summary = await new UniverseCurationService(coverage as any).curateRegion('US', { targetTrackedCount: 10 });

    expect(summary.trackedTotal).toBe(1);
    expect(summary.protectedActive).toBe(0);
    // Selected by liquidity (rank 1) but, being a seeded ETF, persisted as CORE.
    expect(captured.entries[0]).toMatchObject({ symbol: 'XLK', trackingTier: 'CORE', reason: 'ETF', liquidityRank: 1 });
  });

  it('protection tier adds instruments with recent signals that fall below the liquidity cutoff', async () => {
    const ranked = [
      { stockId: 'a', symbol: 'AAA', assetType: 'STOCK', turnover: 100 },
    ];
    const instruments = [{ stockId: 'a', symbol: 'AAA', assetType: 'STOCK', catalogSource: 'NASDAQ_TRADER_LISTED' }];
    // CFR-like: below liquidity cutoff but has a recent signal
    const recentlyActive = [
      { stockId: 'cfr', symbol: 'CFR' },
    ];
    const { coverage, captured } = mockCoverage(ranked, instruments, recentlyActive);

    const summary = await new UniverseCurationService(coverage as any).curateRegion('US', { targetTrackedCount: 1 });

    expect(summary.trackedByLiquidity).toBe(1);
    expect(summary.protectedActive).toBe(1);
    expect(summary.trackedTotal).toBe(2); // AAA (liquidity) + CFR (protection)
    const bySymbol = Object.fromEntries(captured.entries.map((e: any) => [e.symbol, e]));
    expect(bySymbol.CFR).toMatchObject({ trackingTier: 'STANDARD', reason: 'MANUAL', liquidityScore: null, liquidityRank: null });
    expect(new Set(captured.enforcedIds)).toContain('cfr');
  });
});
