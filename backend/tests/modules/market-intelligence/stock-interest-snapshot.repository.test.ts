/// <reference types="@types/jest" />
import { StockInterestSnapshotRepository } from '../../../src/modules/market-intelligence/stock-interest-snapshot.repository';

const snapshotDate = new Date('2026-06-01T00:00:00.000Z');
const generatedAt = new Date('2026-06-01T06:00:00.000Z');

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'interest-1',
  snapshotDate,
  dataThroughDate: new Date('2026-05-29T00:00:00.000Z'),
  generatedAt,
  stockId: 'stock-1',
  symbol: 'AAA',
  company: 'AAA Ltd',
  sector: 'Technology',
  scopeRegion: 'IN',
  scopeAssetType: 'STOCK',
  timeframe: '1d',
  category: 'TODAY_TOP_INTEREST',
  score: 91,
  direction: 'bullish interest',
  reasonTags: ['strong-price-volume'],
  riskTags: ['partial-fundamentals'],
  freshness: 'FRESH',
  warnings: [],
  calculationVersion: 'stock-interest-v1',
  createdAt: generatedAt,
  updatedAt: generatedAt,
  ...overrides,
});

describe('StockInterestSnapshotRepository', () => {
  it('upserts snapshots by date, scope, category, and symbol for idempotency', async () => {
    const upsert = jest.fn().mockResolvedValue(row());
    const repository = new StockInterestSnapshotRepository({
      stockInterestSnapshot: { upsert },
    } as any);

    await repository.upsertSnapshots([{
      snapshotDate,
      dataThroughDate: new Date('2026-05-29T00:00:00.000Z'),
      generatedAt,
      stockId: 'stock-1',
      symbol: 'AAA',
      company: 'AAA Ltd',
      sector: 'Technology',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      category: 'TODAY_TOP_INTEREST',
      score: 91,
      direction: 'bullish interest',
      reasonTags: ['strong-price-volume'],
      riskTags: ['partial-fundamentals'],
      freshness: 'FRESH',
      warnings: [],
      calculationVersion: 'stock-interest-v1',
    }]);

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        snapshotDate_scopeRegion_scopeAssetType_timeframe_category_symbol: {
          snapshotDate,
          scopeRegion: 'IN',
          scopeAssetType: 'STOCK',
          timeframe: '1d',
          category: 'TODAY_TOP_INTEREST',
          symbol: 'AAA',
        },
      },
      create: expect.objectContaining({
        symbol: 'AAA',
        score: 91,
        reasonTags: ['strong-price-volume'],
      }),
      update: expect.objectContaining({
        score: 91,
        freshness: 'FRESH',
        warnings: [],
      }),
    }));
  });

  it('loads the latest snapshot rows in persisted score order without recalculating API output', async () => {
    const findFirst = jest.fn().mockResolvedValue({ snapshotDate });
    const findMany = jest.fn().mockResolvedValue([
      row({ symbol: 'AAA', score: 91 }),
      row({ id: 'interest-2', symbol: 'BBB', score: 70 }),
    ]);
    const repository = new StockInterestSnapshotRepository({
      stockInterestSnapshot: { findFirst, findMany },
    } as any);

    const rows = await repository.latestSnapshots({ region: 'IN', assetType: 'STOCK' });

    expect(findFirst).toHaveBeenCalledWith({
      where: { scopeRegion: 'IN', scopeAssetType: 'STOCK', timeframe: '1d' },
      orderBy: [{ snapshotDate: 'desc' }, { generatedAt: 'desc' }, { updatedAt: 'desc' }],
      select: { snapshotDate: true },
    });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { scopeRegion: 'IN', scopeAssetType: 'STOCK', timeframe: '1d', snapshotDate },
      orderBy: [
        { score: 'desc' },
        { symbol: 'asc' },
      ],
    }));
    expect(rows.map((item) => item.symbol)).toEqual(['AAA', 'BBB']);
  });

  it('prunes stale snapshot rows only for the symbols recalculated in the current batch', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    const repository = new StockInterestSnapshotRepository({
      stockInterestSnapshot: { deleteMany },
    } as any);

    const count = await repository.pruneSnapshotRowsForSymbols({
      snapshotDate,
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      symbols: ['AAA', 'BBB', 'AAA'],
      keepKeys: [
        { category: 'TODAY_TOP_INTEREST', symbol: 'AAA' },
        { category: 'RISK_AVOID', symbol: 'BBB' },
      ],
    });

    expect(count).toBe(2);
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        snapshotDate,
        scopeRegion: 'IN',
        scopeAssetType: 'STOCK',
        timeframe: '1d',
        symbol: { in: ['AAA', 'BBB'] },
        NOT: {
          OR: [
            { category: 'TODAY_TOP_INTEREST', symbol: 'AAA' },
            { category: 'RISK_AVOID', symbol: 'BBB' },
          ],
        },
      },
    });
  });
});
