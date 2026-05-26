/// <reference types="@types/jest" />
import { SmartMoneyIntelligenceRepository } from '../../../src/modules/smart-money-intelligence/smart-money-intelligence.repository';

const snapshotDate = new Date('2026-05-25T00:00:00.000Z');

const snapshotRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'snapshot-1',
  snapshotDate,
  instrumentId: 'stock-1',
  symbol: 'AAA',
  companyName: 'AAA Co',
  sector: 'Technology',
  smartMoneyScore: 72,
  status: 'ACCUMULATION',
  confidence: 'MEDIUM',
  explanation: 'Accumulation pressure.',
  source: 'market-data-foundation',
  dataStatus: 'PARTIAL',
  latestClose: 125,
  latestVolume: 2200,
  averageVolume20: 1000,
  dailyChangePercent: 0.02,
  signals: [],
  insiderOwnership: null,
  range: '3M',
  createdAt: snapshotDate,
  updatedAt: snapshotDate,
  ...overrides,
});

describe('SmartMoneyIntelligenceRepository', () => {
  it('loads list rows from the latest available snapshot date for the selected scope and range', async () => {
    const db = {
      smartMoneyContextSnapshot: {
        findFirst: jest.fn().mockResolvedValue({ snapshotDate }),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([snapshotRow()]),
      },
    };
    const repository = new SmartMoneyIntelligenceRepository(db as any);

    const result = await repository.latestSnapshots({ limit: 10, offset: 5, range: '3M', region: 'IN', assetType: 'STOCK' });

    expect(db.smartMoneyContextSnapshot.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { snapshotDate: 'desc' },
      select: { snapshotDate: true },
      where: expect.objectContaining({ range: '3M' }),
    }));
    expect(db.smartMoneyContextSnapshot.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        snapshotDate,
        range: '3M',
        OR: [{ status: 'ACCUMULATION' }, { smartMoneyScore: { gte: 60 } }],
      }),
    });
    expect(db.smartMoneyContextSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { smartMoneyScore: 'desc' },
      skip: 5,
      take: 10,
      where: expect.objectContaining({ snapshotDate, range: '3M' }),
    }));
    expect(result.total).toBe(1);
    expect(result.results[0].symbol).toBe('AAA');
  });

  it('loads latest persisted stock snapshots per instrument instead of only runtime today', async () => {
    const db = {
      smartMoneyContextSnapshot: {
        groupBy: jest.fn().mockResolvedValue([
          { instrumentId: 'stock-1', _max: { snapshotDate } },
          { instrumentId: 'stock-2', _max: { snapshotDate: new Date('2026-05-24T00:00:00.000Z') } },
        ]),
        findMany: jest.fn().mockResolvedValue([
          snapshotRow({ instrumentId: 'stock-1', symbol: 'AAA' }),
          snapshotRow({ instrumentId: 'stock-2', symbol: 'BBB', snapshotDate: new Date('2026-05-24T00:00:00.000Z') }),
        ]),
      },
    };
    const repository = new SmartMoneyIntelligenceRepository(db as any);

    const result = await repository.latestStockSnapshots(['stock-1', 'stock-2'], '3M');

    expect(db.smartMoneyContextSnapshot.groupBy).toHaveBeenCalledWith({
      by: ['instrumentId'],
      where: { instrumentId: { in: ['stock-1', 'stock-2'] }, range: '3M' },
      _max: { snapshotDate: true },
    });
    expect(db.smartMoneyContextSnapshot.findMany).toHaveBeenCalledWith({
      where: {
        range: '3M',
        OR: [
          { instrumentId: 'stock-1', snapshotDate },
          { instrumentId: 'stock-2', snapshotDate: new Date('2026-05-24T00:00:00.000Z') },
        ],
      },
    });
    expect(result.map((item) => item.symbol)).toEqual(['AAA', 'BBB']);
  });
});
