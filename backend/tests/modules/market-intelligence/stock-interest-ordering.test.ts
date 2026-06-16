/// <reference types="@types/jest" />
import { StockInterestSnapshotRepository } from '../../../src/modules/market-intelligence/stock-interest-snapshot.repository';
import { CATEGORY_ORDER } from '../../../src/modules/market-intelligence/stock-interest-snapshot.types';

const snapshotDate = new Date('2026-06-16T00:00:00.000Z');
const generatedAt = new Date('2026-06-16T06:00:00.000Z');

const row = (overrides: Record<string, unknown> = {}) => ({
  id: `interest-${Math.random()}`,
  snapshotDate,
  dataThroughDate: new Date('2026-06-13T00:00:00.000Z'),
  generatedAt,
  stockId: 'stock-x',
  symbol: 'XXX',
  company: 'XXX Ltd',
  sector: 'Technology',
  scopeRegion: 'US',
  scopeAssetType: 'STOCK',
  timeframe: '1d',
  category: 'TODAY_TOP_INTEREST',
  score: 50,
  direction: 'bullish interest',
  reasonTags: [],
  riskTags: [],
  freshness: 'FRESH',
  warnings: [],
  calculationVersion: 'stock-interest-v1',
  createdAt: generatedAt,
  updatedAt: generatedAt,
  ...overrides,
});

/**
 * Regression coverage for the ordering bug: the read path used to order by
 * `category: 'asc'` (alphabetical -> ACCUMULATION led) plus `symbol: 'asc'`
 * (which dominated once scores saturated at 100, producing an A-Z wall).
 * latestSnapshots must instead return rows in the service's canonical
 * CATEGORY_ORDER (importance), then score DESC, then symbol ASC.
 */
describe('StockInterestSnapshotRepository.latestSnapshots ordering', () => {
  const buildRepository = (rows: Array<Record<string, unknown>>) => {
    const findFirst = jest.fn().mockResolvedValue({ snapshotDate });
    // Mimic the DB returning rows in the query orderBy (score DESC, symbol ASC),
    // intentionally NOT in canonical category order, to prove the JS sort runs.
    const findMany = jest.fn().mockResolvedValue(rows);
    const repository = new StockInterestSnapshotRepository({
      stockInterestSnapshot: { findFirst, findMany },
    } as any);
    return { repository, findFirst, findMany };
  };

  it('orders categories by CATEGORY_ORDER (TODAY_TOP_INTEREST before ACCUMULATION), not alphabetically', async () => {
    // DB-shaped input deliberately leads with the alphabetically-first category
    // (ACCUMULATION) to confirm the canonical sort overrides it.
    const { repository } = buildRepository([
      row({ symbol: 'AAOI', category: 'ACCUMULATION', score: 100 }),
      row({ symbol: 'ACLS', category: 'ACCUMULATION', score: 100 }),
      row({ symbol: 'ADBE', category: 'BREAKOUTS', score: 100 }),
      row({ symbol: 'NVDA', category: 'TODAY_TOP_INTEREST', score: 100 }),
      row({ symbol: 'AMD', category: 'TODAY_TOP_INTEREST', score: 100 }),
      row({ symbol: 'ZZZ', category: 'RISK_AVOID', score: 100 }),
    ]);

    const rows = await repository.latestSnapshots({ region: 'US', assetType: 'STOCK' });

    const categories = rows.map((item) => item.category);
    // Categories appear grouped in canonical importance order.
    const firstIndexOf = (category: string) => categories.indexOf(category as any);
    expect(firstIndexOf('TODAY_TOP_INTEREST')).toBeLessThan(firstIndexOf('ACCUMULATION'));
    expect(firstIndexOf('ACCUMULATION')).toBeLessThan(firstIndexOf('BREAKOUTS'));
    expect(firstIndexOf('BREAKOUTS')).toBeLessThan(firstIndexOf('RISK_AVOID'));

    // The leading rows are the highest-importance category, not the A-Z wall.
    expect(rows[0].category).toBe('TODAY_TOP_INTEREST');

    // The grouped category sequence is monotonic in CATEGORY_ORDER.
    const ranks = categories.map((c) => CATEGORY_ORDER.indexOf(c as any));
    const sortedRanks = [...ranks].sort((a, b) => a - b);
    expect(ranks).toEqual(sortedRanks);
  });

  it('orders by score DESC within a category before falling back to symbol', async () => {
    // Within TODAY_TOP_INTEREST, a higher-score row with a later symbol must
    // still lead a lower-score row with an earlier symbol — proving score DESC
    // dominates the symbol tiebreak (the bug had symbol dominating).
    const { repository } = buildRepository([
      row({ symbol: 'ZETA', category: 'TODAY_TOP_INTEREST', score: 95 }),
      row({ symbol: 'ALPHA', category: 'TODAY_TOP_INTEREST', score: 80 }),
      row({ symbol: 'BETA', category: 'TODAY_TOP_INTEREST', score: 88 }),
    ]);

    const rows = await repository.latestSnapshots({ region: 'US', assetType: 'STOCK' });

    expect(rows.map((item) => item.symbol)).toEqual(['ZETA', 'BETA', 'ALPHA']);
    expect(rows.map((item) => item.score)).toEqual([95, 88, 80]);
  });

  it('uses symbol ASC as the final tiebreak when category and score are equal', async () => {
    const { repository } = buildRepository([
      row({ symbol: 'MSFT', category: 'TODAY_TOP_INTEREST', score: 100 }),
      row({ symbol: 'AAPL', category: 'TODAY_TOP_INTEREST', score: 100 }),
      row({ symbol: 'GOOG', category: 'TODAY_TOP_INTEREST', score: 100 }),
    ]);

    const rows = await repository.latestSnapshots({ region: 'US', assetType: 'STOCK' });

    expect(rows.map((item) => item.symbol)).toEqual(['AAPL', 'GOOG', 'MSFT']);
  });
});
