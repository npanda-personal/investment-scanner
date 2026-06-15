/// <reference types="@types/jest" />
import { MarketDataFoundationService } from '../../../src/modules/market-data-foundation';
import { MARKET_MOVERS_SNAPSHOT_COUNT } from '../../../src/modules/market-data-foundation/persistence/market-data-foundation.repository.constants';

// Regression guard for the "Market Price Movers" count on /today-review.
//
// History: the persisted snapshot slice and the serving default drifted (write sliced to 5
// while reads expected more), so every daily MARKET_SCAN_REFRESH regenerated 5 rows and the
// page reverted to top-5 after each fix. Both layers now share MARKET_MOVERS_SNAPSHOT_COUNT.
// These tests fail if either layer is changed without the other, locking the count.

describe('market movers count is permanent (write + read share one constant)', () => {
  it('refreshMarketScanSnapshots persists exactly MARKET_MOVERS_SNAPSHOT_COUNT gainers/losers per range', async () => {
    // 15 gainers + 15 losers (> the count) so the slice is what bounds the result, not scarcity.
    const candidates = [
      ...Array.from({ length: 15 }, (_, i) => ({
        instrumentId: `gain-${i}`,
        symbol: `GAIN${i}`,
        companyName: `Gainer ${i}`,
        sector: 'Technology',
        returnPercent: 0.01 * (i + 1),
      })),
      ...Array.from({ length: 15 }, (_, i) => ({
        instrumentId: `lose-${i}`,
        symbol: `LOSE${i}`,
        companyName: `Loser ${i}`,
        sector: 'Utilities',
        returnPercent: -0.01 * (i + 1),
      })),
    ];

    const inserted: Array<{ scanType: string; scanRange: string | null }> = [];
    const tx = {
      marketScanSnapshot: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn(async ({ data }: { data: Array<{ scanType: string; scanRange: string | null }> }) => {
          inserted.push(...data);
          return { count: data.length };
        }),
      },
    };

    const repository = {
      latestDataTimestamp: jest.fn().mockResolvedValue(new Date('2026-06-15T00:00:00.000Z')),
      marketMoversForRange: jest.fn().mockResolvedValue(candidates),
      scan52wProximity: jest.fn().mockResolvedValue([]),
      scanDeliverySpike: jest.fn().mockResolvedValue([]),
      scanVolumeSpike: jest.fn().mockResolvedValue([]),
      prisma: { $transaction: jest.fn(async (cb: (t: typeof tx) => Promise<void>) => cb(tx)) },
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.refreshMarketScanSnapshots({ region: 'IN', assetType: 'STOCK' });
    expect(result.errors).toEqual([]);

    const gainers1D = inserted.filter((r) => r.scanType === 'MOVERS_GAINERS' && r.scanRange === '1D');
    const losers1D = inserted.filter((r) => r.scanType === 'MOVERS_LOSERS' && r.scanRange === '1D');
    expect(gainers1D).toHaveLength(MARKET_MOVERS_SNAPSHOT_COUNT);
    expect(losers1D).toHaveLength(MARKET_MOVERS_SNAPSHOT_COUNT);

    // Every range that produced movers must persist exactly the constant — never reverts to 5.
    const moverRanges = [...new Set(inserted.filter((r) => r.scanType === 'MOVERS_GAINERS').map((r) => r.scanRange))];
    for (const range of moverRanges) {
      expect(inserted.filter((r) => r.scanType === 'MOVERS_GAINERS' && r.scanRange === range)).toHaveLength(MARKET_MOVERS_SNAPSHOT_COUNT);
      expect(inserted.filter((r) => r.scanType === 'MOVERS_LOSERS' && r.scanRange === range)).toHaveLength(MARKET_MOVERS_SNAPSHOT_COUNT);
    }
  });

  it('marketMovers serves MARKET_MOVERS_SNAPSHOT_COUNT by default when no limit is requested', async () => {
    // Snapshot holds more rows than the default; serving must return exactly the constant.
    const rows = Array.from({ length: MARKET_MOVERS_SNAPSHOT_COUNT + 5 }, (_, i) => ({
      payloadJson: { instrumentId: `m-${i}`, symbol: `SYM${i}`, companyName: `Co ${i}`, returnPercent: 0.01 * (i + 1) },
    }));
    const repository = {
      prisma: {
        marketScanSnapshot: {
          findFirst: jest.fn().mockResolvedValue({ tradingDate: new Date('2026-06-15T00:00:00.000Z') }),
          findMany: jest.fn().mockResolvedValue(rows),
        },
      },
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    // No `limit` passed → falls back to the shared default constant.
    const result = await service.marketMovers({ region: 'IN', assetType: 'STOCK', range: '1D' });

    expect(result.ranges[0].gainers).toHaveLength(MARKET_MOVERS_SNAPSHOT_COUNT);
    expect(result.ranges[0].losers).toHaveLength(MARKET_MOVERS_SNAPSHOT_COUNT);
  });
});
