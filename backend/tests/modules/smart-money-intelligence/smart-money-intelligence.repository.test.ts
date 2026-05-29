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
  accumulationSignalCount: 0,
  distributionSignalCount: 0,
  unusualVolumeDetected: false,
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
        groupBy: jest.fn().mockResolvedValue([{ snapshotDate, _count: { _all: 10 } }]),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([snapshotRow()]),
      },
    };
    const repository = new SmartMoneyIntelligenceRepository(db as any);

    const result = await repository.latestSnapshots({ limit: 10, offset: 5, range: '3M', region: 'IN', assetType: 'STOCK' });

    expect(db.smartMoneyContextSnapshot.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      by: ['snapshotDate'],
      orderBy: { snapshotDate: 'desc' },
      _count: { _all: true },
      _max: { updatedAt: true },
      where: expect.objectContaining({ range: '3M', status: { not: 'INSUFFICIENT_DATA' } }),
    }));
    expect(db.smartMoneyContextSnapshot.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        snapshotDate,
        range: '3M',
        AND: expect.arrayContaining([
          { status: { not: 'INSUFFICIENT_DATA' } },
          { OR: [{ status: 'ACCUMULATION' }, { smartMoneyScore: { gte: 60 } }] },
        ]),
      }),
    });
    expect(db.smartMoneyContextSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ smartMoneyScore: 'desc' }, { symbol: 'asc' }, { instrumentId: 'asc' }],
      skip: 5,
      take: 10,
      where: expect.objectContaining({ snapshotDate, range: '3M' }),
    }));
    expect(result.total).toBe(1);
    expect(result.results[0].symbol).toBe('AAA');
    expect(result.results[0].evidence?.provenance.source).toBe('PERSISTED_SNAPSHOT');
  });

  it('does not switch list reads to a less-covered partial refresh date', async () => {
    const partialDate = new Date('2026-05-26T00:00:00.000Z');
    const db = {
      smartMoneyContextSnapshot: {
        groupBy: jest.fn().mockResolvedValue([
          { snapshotDate: partialDate, _count: { _all: 1 } },
          { snapshotDate, _count: { _all: 5 } },
        ]),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([snapshotRow()]),
      },
    };
    const repository = new SmartMoneyIntelligenceRepository(db as any);

    await repository.latestSnapshots({ limit: 10, range: '3M', region: 'IN', assetType: 'STOCK' });

    expect(db.smartMoneyContextSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ snapshotDate }),
    }));
  });

  it('prefers fresher source-date rows over equally covered legacy runtime-date rows', async () => {
    const legacyRuntimeDate = new Date('2026-05-29T00:00:00.000Z');
    const sourceDate = new Date('2026-05-25T00:00:00.000Z');
    const db = {
      smartMoneyContextSnapshot: {
        groupBy: jest.fn().mockResolvedValue([
          {
            snapshotDate: legacyRuntimeDate,
            _count: { _all: 5 },
            _max: { updatedAt: new Date('2026-05-29T01:00:00.000Z') },
          },
          {
            snapshotDate: sourceDate,
            _count: { _all: 5 },
            _max: { updatedAt: new Date('2026-05-30T01:00:00.000Z') },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([snapshotRow({ snapshotDate: sourceDate })]),
      },
    };
    const repository = new SmartMoneyIntelligenceRepository(db as any);

    await repository.latestSnapshots({ limit: 10, range: '3M', region: 'IN', assetType: 'STOCK' });

    expect(db.smartMoneyContextSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ snapshotDate: sourceDate }),
    }));
  });

  it('loads latest persisted stock snapshots per instrument instead of only runtime today', async () => {
    const stockOneUpdatedAt = new Date('2026-05-30T01:00:00.000Z');
    const stockTwoUpdatedAt = new Date('2026-05-24T01:00:00.000Z');
    const db = {
      smartMoneyContextSnapshot: {
        groupBy: jest.fn().mockResolvedValue([
          { instrumentId: 'stock-1', _max: { updatedAt: stockOneUpdatedAt } },
          { instrumentId: 'stock-2', _max: { updatedAt: stockTwoUpdatedAt } },
        ]),
        findMany: jest.fn().mockResolvedValue([
          snapshotRow({ instrumentId: 'stock-1', symbol: 'AAA', updatedAt: stockOneUpdatedAt }),
          snapshotRow({ instrumentId: 'stock-2', symbol: 'BBB', snapshotDate: new Date('2026-05-24T00:00:00.000Z'), updatedAt: stockTwoUpdatedAt }),
        ]),
      },
    };
    const repository = new SmartMoneyIntelligenceRepository(db as any);

    const result = await repository.latestStockSnapshots(['stock-1', 'stock-2'], '3M');

    expect(db.smartMoneyContextSnapshot.groupBy).toHaveBeenCalledWith({
      by: ['instrumentId'],
      where: { instrumentId: { in: ['stock-1', 'stock-2'] }, range: '3M' },
      _max: { updatedAt: true },
    });
    expect(db.smartMoneyContextSnapshot.findMany).toHaveBeenCalledWith({
      where: {
        range: '3M',
        OR: [
          { instrumentId: 'stock-1', updatedAt: stockOneUpdatedAt },
          { instrumentId: 'stock-2', updatedAt: stockTwoUpdatedAt },
        ],
      },
      orderBy: [
        { updatedAt: 'desc' },
        { snapshotDate: 'desc' },
      ],
    });
    expect(result.map((item) => item.symbol)).toEqual(['AAA', 'BBB']);
  });

  it('loads a single persisted stock by freshest generation before legacy runtime date', async () => {
    const sourceDate = new Date('2026-05-25T00:00:00.000Z');
    const db = {
      smartMoneyContextSnapshot: {
        findFirst: jest.fn().mockResolvedValue(snapshotRow({
          snapshotDate: sourceDate,
          updatedAt: new Date('2026-05-30T01:00:00.000Z'),
        })),
      },
    };
    const repository = new SmartMoneyIntelligenceRepository(db as any);

    const result = await repository.latestStockSnapshot('stock-1', '3M');

    expect(db.smartMoneyContextSnapshot.findFirst).toHaveBeenCalledWith({
      where: {
        instrumentId: 'stock-1',
        range: '3M',
      },
      orderBy: [
        { updatedAt: 'desc' },
        { snapshotDate: 'desc' },
      ],
    });
    expect(result?.snapshotDate).toBe('2026-05-25');
  });

  it('stores snapshots under the source data-through date and no-ops unchanged rows', async () => {
    const db = {
      smartMoneyContextSnapshot: {
        findUnique: jest.fn().mockResolvedValue(snapshotRow()),
        upsert: jest.fn(),
      },
    };
    const repository = new SmartMoneyIntelligenceRepository(db as any);

    const result = await repository.saveSnapshot({
      ...snapshotRow(),
      updatedAt: snapshotDate.toISOString(),
      range: '3M',
      signals: [],
      insiderOwnership: null as any,
      researchUrl: '/research/stocks/stock-1',
      snapshotDate: '2026-05-25',
      dataThroughDate: '2026-05-25',
    } as any);

    expect(result).toBe('unchanged');
    expect(db.smartMoneyContextSnapshot.findUnique).toHaveBeenCalledWith({
      where: {
        snapshotDate_instrumentId_range: {
          snapshotDate,
          instrumentId: 'stock-1',
          range: '3M',
        },
      },
    });
    expect(db.smartMoneyContextSnapshot.upsert).not.toHaveBeenCalled();
  });

  it('does not rewrite unchanged JSON evidence when persisted key order differs', async () => {
    const signal = {
      type: 'UNUSUAL_VOLUME',
      label: 'Unusual volume',
      direction: 'ACCUMULATION',
      strength: 15,
      details: 'Latest volume is 2.2x the 20-day average.',
    };
    const ownership = {
      insiderBuyCount: null,
      insiderSellCount: null,
      netInsiderActivity: null,
      institutionalOwnershipPercent: null,
      ownershipDataStatus: 'MISSING',
      source: 'not-configured',
      explanation: 'Free insider and institutional ownership provider is not configured for the MVP.',
    };
    const db = {
      smartMoneyContextSnapshot: {
        findUnique: jest.fn().mockResolvedValue(snapshotRow({
          accumulationSignalCount: 1,
          unusualVolumeDetected: true,
          signals: [{
            details: signal.details,
            strength: signal.strength,
            direction: signal.direction,
            label: signal.label,
            type: signal.type,
          }],
          insiderOwnership: {
            explanation: ownership.explanation,
            source: ownership.source,
            ownershipDataStatus: ownership.ownershipDataStatus,
            institutionalOwnershipPercent: ownership.institutionalOwnershipPercent,
            netInsiderActivity: ownership.netInsiderActivity,
            insiderSellCount: ownership.insiderSellCount,
            insiderBuyCount: ownership.insiderBuyCount,
          },
        })),
        upsert: jest.fn(),
      },
    };
    const repository = new SmartMoneyIntelligenceRepository(db as any);

    const result = await repository.saveSnapshot({
      ...snapshotRow(),
      updatedAt: snapshotDate.toISOString(),
      range: '3M',
      signals: [signal],
      insiderOwnership: ownership,
      researchUrl: '/research/stocks/stock-1',
      snapshotDate: '2026-05-25',
      dataThroughDate: '2026-05-25',
    } as any);

    expect(result).toBe('unchanged');
    expect(db.smartMoneyContextSnapshot.upsert).not.toHaveBeenCalled();
  });
});
