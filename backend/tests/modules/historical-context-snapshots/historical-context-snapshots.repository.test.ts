/// <reference types="@types/jest" />
import { HistoricalContextSnapshotsRepository, normalizeSnapshotDate } from '../../../src/modules/historical-context-snapshots';

const snapshotDate = normalizeSnapshotDate('2026-05-10');

describe('historical context snapshots repository', () => {
  it('filters market, sector, and country snapshot reads by region scope', async () => {
    const db = {
      marketContextSnapshot: { findMany: jest.fn().mockResolvedValue([]) },
      sectorContextSnapshot: { findMany: jest.fn().mockResolvedValue([]) },
      countryContextSnapshot: { findMany: jest.fn().mockResolvedValue([]) },
      smartMoneyContextSnapshot: { findMany: jest.fn().mockResolvedValue([]) },
      dataQualitySnapshot: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const repository = new HistoricalContextSnapshotsRepository(db as any);
    const query = { date: snapshotDate, region: 'IN', assetType: 'STOCK', limit: 25 };

    await repository.market(query);
    await repository.sectors({ ...query, sector: 'Financials' });
    await repository.countries({ ...query, country: 'India' });
    await repository.smartMoney({ ...query, instrumentId: 'stock-1' });

    expect(db.marketContextSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { snapshotDate, region: 'IN' },
    }));
    expect(db.sectorContextSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { snapshotDate, region: 'IN', sector: 'Financials' },
    }));
    expect(db.countryContextSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { snapshotDate, region: 'IN', country: 'India' },
    }));
    expect(db.smartMoneyContextSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        snapshotDate,
        instrumentId: 'stock-1',
        stock: { is: { region: 'IN', assetType: { in: ['STOCK', 'EQUITY'] } } },
      }),
    }));
  });

  it('looks up nearest context without falling back to another region', async () => {
    const db = {
      marketContextSnapshot: { findFirst: jest.fn().mockResolvedValue(null) },
      sectorContextSnapshot: { findFirst: jest.fn().mockResolvedValue(null) },
      countryContextSnapshot: { findFirst: jest.fn().mockResolvedValue(null) },
      smartMoneyContextSnapshot: { findFirst: jest.fn().mockResolvedValue(null) },
      dataQualitySnapshot: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const repository = new HistoricalContextSnapshotsRepository(db as any);

    await repository.lookup(snapshotDate, 7, { region: 'IN', assetType: 'STOCK', sector: 'Financials', country: 'India', instrumentId: 'stock-1' });

    expect(db.marketContextSnapshot.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ region: 'IN' }),
    }));
    expect(db.sectorContextSnapshot.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ region: 'IN', sector: 'Financials' }),
    }));
    expect(db.countryContextSnapshot.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ region: 'IN', country: 'India' }),
    }));
    expect(db.smartMoneyContextSnapshot.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ instrumentId: 'stock-1', stock: { is: { region: 'IN', assetType: { in: ['STOCK', 'EQUITY'] } } } }),
    }));
  });

  it('excludes unknown sector rows from ranked sector lists while returning named sectors', async () => {
    const db = {
      sectorContextSnapshot: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'unknown', sector: 'Unknown', leadershipStatus: 'LEADING' },
          { id: 'financials', sector: 'Financials', leadershipStatus: 'LEADING' },
        ]),
      },
    };
    const repository = new HistoricalContextSnapshotsRepository(db as any);

    const rows = await repository.sectors({ date: snapshotDate, region: 'IN', assetType: 'STOCK', limit: 25 });

    expect(db.sectorContextSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        region: 'IN',
        sector: expect.objectContaining({ notIn: expect.arrayContaining(['Unknown', 'N/A', 'NA']) }),
      }),
    }));
    expect(rows).toEqual([{ id: 'financials', sector: 'Financials', leadershipStatus: 'LEADING' }]);
  });

  it('applies the list limit after filtering metadata-gap sector variants', async () => {
    const db = {
      sectorContextSnapshot: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'blank', sector: ' ', leadershipStatus: 'LEADING', relativeStrengthScore: 99 },
          { id: 'na', sector: ' NA ', leadershipStatus: 'LEADING', relativeStrengthScore: 98 },
          { id: 'financials', sector: 'Financial Services', leadershipStatus: 'IMPROVING', relativeStrengthScore: 62 },
        ]),
      },
    };
    const repository = new HistoricalContextSnapshotsRepository(db as any);

    const rows = await repository.sectors({ date: snapshotDate, region: 'IN', assetType: 'STOCK', limit: 1 });

    expect(db.sectorContextSnapshot.findMany).toHaveBeenCalledWith(expect.not.objectContaining({ take: 1 }));
    expect(rows).toEqual([
      { id: 'financials', sector: 'Financial Services', leadershipStatus: 'IMPROVING', relativeStrengthScore: 62 },
    ]);
  });

  it('counts only known sectors as ranked coverage and reports metadata-gap rows separately', async () => {
    const db = {
      marketContextSnapshot: {
        count: jest.fn().mockResolvedValue(2),
        findFirst: jest.fn().mockResolvedValue({ snapshotDate }),
      },
      sectorContextSnapshot: {
        findMany: jest.fn().mockResolvedValue([
          { sector: 'Unknown' },
          { sector: ' ' },
          { sector: 'Financial Services' },
        ]),
      },
      countryContextSnapshot: { count: jest.fn().mockResolvedValue(2) },
      smartMoneyContextSnapshot: { count: jest.fn().mockResolvedValue(10) },
      dataQualitySnapshot: { count: jest.fn().mockResolvedValue(5) },
    };
    const repository = new HistoricalContextSnapshotsRepository(db as any);

    const coverage = await repository.coverage({ region: 'IN', assetType: 'STOCK' });

    expect(coverage).toEqual(expect.objectContaining({
      sectorSnapshots: 1,
      sectorMetadataGapSnapshots: 2,
    }));
  });

  it('does not look up Unknown as a ranked sector snapshot', async () => {
    const db = {
      marketContextSnapshot: { findFirst: jest.fn().mockResolvedValue({ regime: 'RISK_ON' }) },
      sectorContextSnapshot: { findFirst: jest.fn().mockResolvedValue({ sector: 'Unknown' }) },
      countryContextSnapshot: { findFirst: jest.fn().mockResolvedValue(null) },
      smartMoneyContextSnapshot: { findFirst: jest.fn().mockResolvedValue(null) },
      dataQualitySnapshot: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const repository = new HistoricalContextSnapshotsRepository(db as any);

    const result = await repository.lookup(snapshotDate, 7, { region: 'IN', assetType: 'STOCK', sector: 'Unknown' });

    expect(result.sector).toBeNull();
    expect(db.sectorContextSnapshot.findFirst).not.toHaveBeenCalled();
  });
});
