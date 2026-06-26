/// <reference types="@types/jest" />
import { StockInterestSnapshotService } from '../../../src/modules/market-intelligence';
import type { StockInterestCalculationInput } from '../../../src/modules/market-intelligence';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

function baseInput(overrides: Partial<StockInterestCalculationInput> = {}): StockInterestCalculationInput {
  return {
    region: 'IN',
    assetType: 'STOCK',
    stocks: [
      { id: 'stock-1', symbol: 'AAA', company: 'AAA Ltd', sector: 'Technology' },
      { id: 'stock-2', symbol: 'BBB', company: 'BBB Ltd', sector: 'Technology' },
      { id: 'stock-3', symbol: 'CCC', company: 'CCC Ltd', sector: 'Financial Services' },
      { id: 'stock-4', symbol: 'DDD', company: 'DDD Ltd', sector: 'Industrials' },
    ],
    priceTicks: [
      ...prices('AAA', [95, 100, 105, 112, 124], [1000, 1100, 1200, 1800, 2600]),
      ...prices('BBB', [90, 91, 92, 93, 94], [900, 900, 950, 1000, 1200]),
      ...prices('CCC', [150, 145, 138, 132, 126], [1600, 1500, 1700, 2200, 2600]),
      ...prices('DDD', [70, 74, 79, 84, 91], [800, 900, 1000, 1200, 1800]),
    ],
    latestPrices: [
      { symbol: 'AAA', price: 124, timestamp: day('2026-05-29') },
      { symbol: 'BBB', price: 94, timestamp: day('2026-05-29') },
      { symbol: 'CCC', price: 126, timestamp: day('2026-05-29') },
      { symbol: 'DDD', price: 91, timestamp: day('2026-05-29') },
    ],
    deliverySnapshots: [
      { symbol: 'AAA', tradingDate: day('2026-05-29'), deliveryPercent: 68 },
      { symbol: 'BBB', tradingDate: day('2026-05-29'), deliveryPercent: 44 },
      { symbol: 'CCC', tradingDate: day('2026-05-29'), deliveryPercent: 31 },
      { symbol: 'DDD', tradingDate: day('2026-05-29'), deliveryPercent: 59 },
    ],
    fundamentals: [
      { stockId: 'stock-1', symbol: 'AAA', periodEndDate: day('2025-03-31'), revenue: 100, netIncome: 10, eps: 5 },
      { stockId: 'stock-1', symbol: 'AAA', periodEndDate: day('2026-03-31'), revenue: 130, netIncome: 18, eps: 8 },
      { stockId: 'stock-2', symbol: 'BBB', periodEndDate: day('2025-03-31'), revenue: 100, netIncome: 11, eps: 6 },
      { stockId: 'stock-2', symbol: 'BBB', periodEndDate: day('2026-03-31'), revenue: 112, netIncome: 13, eps: 7 },
      { stockId: 'stock-3', symbol: 'CCC', periodEndDate: day('2025-03-31'), revenue: 100, netIncome: 20, eps: 9 },
      { stockId: 'stock-3', symbol: 'CCC', periodEndDate: day('2026-03-31'), revenue: 86, netIncome: 14, eps: 5 },
    ],
    ...overrides,
  };
}

function prices(symbol: string, closes: number[], volumes: number[]) {
  return closes.map((close, index) => ({
    symbol,
    timestamp: day(`2026-05-${25 + index}`),
    open: close - 1,
    high: close + 2,
    low: close - 2,
    close,
    adjustedClose: close,
    volume: volumes[index],
  }));
}

describe('StockInterestSnapshotService', () => {
  const generatedAt = new Date('2026-06-01T06:00:00.000Z');

  it('generates all approved Stock Interest categories from persisted calculation inputs', () => {
    const service = new StockInterestSnapshotService({} as any);

    const rows = service.calculateSnapshots(baseInput(), { generatedAt });

    expect([...new Set(rows.map((row) => row.category))].sort()).toEqual([
      'ACCUMULATION',
      'BREAKOUTS',
      'GROWTH_ACCELERATION',
      'GROWTH_CONSISTENCY',
      'RISK_AVOID',
      'SECTOR_LEADERS',
      'TODAY_TOP_INTEREST',
    ]);
    expect(rows.find((row) => row.category === 'TODAY_TOP_INTEREST')).toMatchObject({
      symbol: 'AAA',
      direction: 'bullish interest',
      freshness: 'FRESH',
    });
    expect(rows.find((row) => row.category === 'RISK_AVOID')).toMatchObject({
      symbol: 'CCC',
      direction: 'risk warning',
    });
  });

  it('orders each category by score descending and symbol as a stable tie breaker', () => {
    const service = new StockInterestSnapshotService({} as any);

    const rows = service.calculateSnapshots(baseInput(), { generatedAt });
    const topInterest = rows.filter((row) => row.category === 'TODAY_TOP_INTEREST');

    expect(topInterest.map((row) => row.symbol)).toEqual(['AAA', 'DDD', 'BBB', 'CCC']);
    expect(topInterest.map((row) => row.score)).toEqual([...topInterest.map((row) => row.score)].sort((a, b) => b - a));
  });

  it('refreshes persisted snapshots through the repository and preserves idempotent unchanged counts', async () => {
    const repository = {
      loadCalculationInput: jest.fn().mockResolvedValue(baseInput()),
      upsertSnapshots: jest.fn()
        .mockImplementationOnce(async (rows: unknown[]) => ({ createdCount: rows.length, updatedCount: 0, unchangedCount: 0 }))
        .mockImplementationOnce(async (rows: unknown[]) => ({ createdCount: 0, updatedCount: 0, unchangedCount: rows.length })),
      pruneSnapshotRowsForSymbols: jest.fn().mockResolvedValue(0),
    };
    const service = new StockInterestSnapshotService(repository as any);

    const first = await service.refreshSnapshots({ region: 'IN', assetType: 'STOCK', generatedAt });
    const second = await service.refreshSnapshots({ region: 'IN', assetType: 'STOCK', generatedAt });

    expect(repository.loadCalculationInput).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
    }));
    expect(repository.upsertSnapshots).toHaveBeenCalledTimes(2);
    expect(repository.pruneSnapshotRowsForSymbols).toHaveBeenCalledTimes(2);
    expect(repository.pruneSnapshotRowsForSymbols).toHaveBeenNthCalledWith(1, expect.objectContaining({
      snapshotDate: new Date('2026-06-01T00:00:00.000Z'),
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      symbols: ['AAA', 'BBB', 'CCC', 'DDD'],
      keepKeys: expect.arrayContaining([
        expect.objectContaining({ category: 'TODAY_TOP_INTEREST', symbol: 'AAA' }),
        expect.objectContaining({ category: 'RISK_AVOID', symbol: 'CCC' }),
      ]),
    }));
    expect(first).toMatchObject({
      status: 'COMPLETED',
      totalCount: (repository.upsertSnapshots.mock.calls[0][0] as unknown[]).length,
      succeededCount: (repository.upsertSnapshots.mock.calls[0][0] as unknown[]).length,
      unchangedCount: 0,
    });
    expect(second).toMatchObject({
      status: 'COMPLETED',
      totalCount: (repository.upsertSnapshots.mock.calls[1][0] as unknown[]).length,
      succeededCount: 0,
      unchangedCount: (repository.upsertSnapshots.mock.calls[1][0] as unknown[]).length,
    });
  });

  it('pages the entire universe and ranks globally across batches, not just the first alphabetical batch', async () => {
    // Two distinct pages of a 4-stock universe. The strongest candidate (ZZZ)
    // lives on the SECOND page and is alphabetically LAST — so if the old
    // single-batch / clamped-alphabetical behaviour regressed, it could never
    // be selected. A correct global pass must page both batches and rank ZZZ
    // to the top of TODAY_TOP_INTEREST on raw score.
    const page = (
      stocks: Array<{ id: string; symbol: string; company: string; sector: string }>,
      ticks: ReturnType<typeof prices>,
      latest: Array<{ symbol: string; price: number; timestamp: Date }>
    ): StockInterestCalculationInput => ({
      region: 'IN',
      assetType: 'STOCK',
      totalUniverseCount: 4,
      stocks,
      priceTicks: ticks,
      latestPrices: latest,
      deliverySnapshots: [],
      fundamentals: [],
    });

    const page1 = page(
      [
        { id: 's-aaa', symbol: 'AAA', company: 'AAA Ltd', sector: 'Technology' },
        { id: 's-bbb', symbol: 'BBB', company: 'BBB Ltd', sector: 'Technology' },
      ],
      [
        ...prices('AAA', [100, 101, 102, 103, 104], [1000, 1000, 1000, 1000, 1100]),
        ...prices('BBB', [100, 100, 100, 100, 100], [900, 900, 900, 900, 900]),
      ],
      [
        { symbol: 'AAA', price: 104, timestamp: day('2026-05-29') },
        { symbol: 'BBB', price: 100, timestamp: day('2026-05-29') },
      ]
    );
    const page2 = page(
      [
        { id: 's-zzz', symbol: 'ZZZ', company: 'ZZZ Ltd', sector: 'Energy' },
        { id: 's-yyy', symbol: 'YYY', company: 'YYY Ltd', sector: 'Energy' },
      ],
      [
        ...prices('ZZZ', [50, 60, 72, 86, 104], [1000, 1500, 2200, 3000, 5000]),
        ...prices('YYY', [100, 99, 98, 97, 96], [900, 900, 900, 900, 900]),
      ],
      [
        { symbol: 'ZZZ', price: 104, timestamp: day('2026-05-29') },
        { symbol: 'YYY', price: 96, timestamp: day('2026-05-29') },
      ]
    );

    const repository = {
      loadCalculationInput: jest.fn(async ({ offset }: { offset: number }) =>
        offset === 0 ? page1 : offset === 2 ? page2 : page([], [], [])
      ),
      upsertSnapshots: jest.fn(async (rows: unknown[]) => ({ createdCount: rows.length, updatedCount: 0, unchangedCount: 0 })),
      pruneSnapshotRowsForSymbols: jest.fn().mockResolvedValue(0),
    };
    const service = new StockInterestSnapshotService(repository as any);

    const result = await service.refreshSnapshots({ region: 'IN', assetType: 'STOCK', generatedAt });

    // Paged the whole universe: two loads (offset 0, then 2), then terminated.
    expect(repository.loadCalculationInput).toHaveBeenCalledTimes(2);
    expect(repository.loadCalculationInput).toHaveBeenNthCalledWith(1, expect.objectContaining({ offset: 0 }));
    expect(repository.loadCalculationInput).toHaveBeenNthCalledWith(2, expect.objectContaining({ offset: 2 }));
    // Global ranking persists once, across all batches.
    expect(repository.upsertSnapshots).toHaveBeenCalledTimes(1);
    expect(repository.pruneSnapshotRowsForSymbols).toHaveBeenCalledWith(expect.objectContaining({
      symbols: ['AAA', 'BBB', 'ZZZ', 'YYY'],
    }));
    expect(result).toMatchObject({ status: 'COMPLETED', nextOffset: null, hasMore: false });

    // The second-page, alphabetically-last strong mover tops TODAY_TOP_INTEREST.
    const persisted = repository.upsertSnapshots.mock.calls[0][0] as Array<{ category: string; symbol: string }>;
    const topInterest = persisted.filter((row) => row.category === 'TODAY_TOP_INTEREST');
    expect(topInterest[0]?.symbol).toBe('ZZZ');
    expect(topInterest.map((row) => row.symbol)).toEqual(expect.arrayContaining(['AAA', 'ZZZ']));
  });

  it('collapses noisy row-level warnings into one top-level latest snapshot warning', async () => {
    const repository = {
      latestSnapshots: jest.fn().mockResolvedValue([
        {
          snapshotDate: '2026-06-01',
          dataThroughDate: '2026-06-01',
          generatedAt: '2026-06-01T06:00:00.000Z',
          category: 'TODAY_TOP_INTEREST',
          symbol: 'AAA',
          company: 'AAA Ltd',
          sector: null,
          score: 90,
          direction: 'bullish interest',
          reasonTags: [],
          riskTags: [],
          freshness: 'FRESH',
          warnings: ['AAA: insufficient persisted fundamentals.', 'AAA: sector metadata is unavailable.'],
        },
        {
          snapshotDate: '2026-06-01',
          dataThroughDate: '2026-06-01',
          generatedAt: '2026-06-01T06:00:00.000Z',
          category: 'RISK_AVOID',
          symbol: 'BBB',
          company: 'BBB Ltd',
          sector: null,
          score: 70,
          direction: 'risk warning',
          reasonTags: [],
          riskTags: [],
          freshness: 'FRESH',
          warnings: ['BBB: insufficient persisted fundamentals.'],
        },
      ]),
    };
    const service = new StockInterestSnapshotService(repository as any);

    const envelope = await service.latestSnapshot({ region: 'IN', assetType: 'STOCK' });

    expect(envelope.warnings).toHaveLength(1);
    expect(envelope.warnings[0]).toContain('3 row-level Stock Interest data warnings across 2 symbols');
  });
});
