import prisma from '../../db/prisma';
import { isKnownSector, unknownSectorFilterValues } from '../../shared/utils/sector-metadata';
import type { SnapshotCount, SnapshotQuery } from './historical-context-snapshots.types';

export class HistoricalContextSnapshotsRepository {
  constructor(private readonly db = prisma) {}

  async upsertMarket(input: any): Promise<'inserted' | 'updated'> {
    const region = input.region || 'GLOBAL';
    const where = { snapshotDate_region: { snapshotDate: input.snapshotDate, region } };
    const existing = await this.db.marketContextSnapshot.findUnique({ where });
    await this.db.marketContextSnapshot.upsert({
      where,
      create: input,
      update: input,
    });
    return existing ? 'updated' : 'inserted';
  }

  async upsertSector(input: any): Promise<'inserted' | 'updated'> {
    const region = input.region || 'GLOBAL';
    const where = { snapshotDate_region_sector: { snapshotDate: input.snapshotDate, region, sector: input.sector } };
    const existing = await this.db.sectorContextSnapshot.findUnique({ where });
    await this.db.sectorContextSnapshot.upsert({ where, create: input, update: input });
    return existing ? 'updated' : 'inserted';
  }

  async upsertCountry(input: any): Promise<'inserted' | 'updated'> {
    const region = input.region || 'GLOBAL';
    const where = { snapshotDate_region_country: { snapshotDate: input.snapshotDate, region, country: input.country } };
    const existing = await this.db.countryContextSnapshot.findUnique({ where });
    await this.db.countryContextSnapshot.upsert({ where, create: input, update: input });
    return existing ? 'updated' : 'inserted';
  }

  async upsertSmartMoney(input: any): Promise<'inserted' | 'updated'> {
    const where = { snapshotDate_instrumentId_range: { snapshotDate: input.snapshotDate, instrumentId: input.instrumentId, range: '3M' } };
    const existing = await this.db.smartMoneyContextSnapshot.findUnique({ where });
    await this.db.smartMoneyContextSnapshot.upsert({ where, create: input, update: input });
    return existing ? 'updated' : 'inserted';
  }

  async upsertDataQuality(input: any): Promise<'inserted' | 'updated'> {
    const where = { snapshotDate_instrumentId: { snapshotDate: input.snapshotDate, instrumentId: input.instrumentId } };
    const existing = await this.db.dataQualitySnapshot.findUnique({ where });
    await this.db.dataQualitySnapshot.upsert({ where, create: input, update: input });
    return existing ? 'updated' : 'inserted';
  }

  market(query: SnapshotQuery) {
    return this.db.marketContextSnapshot.findMany({ where: { ...this.dateWhere(query), region: query.region }, orderBy: { snapshotDate: 'desc' }, take: query.limit });
  }

  sectors(query: SnapshotQuery) {
    if (query.sector && !isKnownSector(query.sector)) return Promise.resolve([]);
    const sectorFilter = query.sector || { notIn: unknownSectorFilterValues };
    return this.db.sectorContextSnapshot.findMany({
      where: { ...this.dateWhere(query), region: query.region, sector: sectorFilter },
      orderBy: [{ snapshotDate: 'desc' }, { relativeStrengthScore: 'desc' }],
      ...(query.sector ? { take: query.limit } : {}),
    }).then((rows) => rows.filter((row: any) => isKnownSector(row.sector)).slice(0, query.limit));
  }

  countries(query: SnapshotQuery) {
    return this.db.countryContextSnapshot.findMany({
      where: { ...this.dateWhere(query), region: query.region, country: query.country },
      orderBy: [{ snapshotDate: 'desc' }, { relativeStrengthScore: 'desc' }],
      take: query.limit,
    });
  }

  smartMoney(query: SnapshotQuery) {
    return this.db.smartMoneyContextSnapshot.findMany({
      where: { ...this.dateWhere(query), instrumentId: query.instrumentId, sector: query.sector, ...this.stockScopeWhere(query) },
      orderBy: [{ snapshotDate: 'desc' }, { smartMoneyScore: 'desc' }],
      take: query.limit,
    });
  }

  dataQuality(query: SnapshotQuery) {
    return this.db.dataQualitySnapshot.findMany({
      where: { ...this.dateWhere(query), instrumentId: query.instrumentId },
      orderBy: [{ snapshotDate: 'desc' }, { signalReadinessScore: 'desc' }],
      take: query.limit,
    });
  }

  async coverage(query: Pick<SnapshotQuery, 'region' | 'assetType'> = {}) {
    const [marketSnapshots, sectorRows, countrySnapshots, smartMoneySnapshots, dataQualitySnapshots, latest] = await Promise.all([
      this.db.marketContextSnapshot.count({ where: { region: query.region } }),
      this.db.sectorContextSnapshot.findMany({ where: { region: query.region }, select: { sector: true } }),
      this.db.countryContextSnapshot.count({ where: { region: query.region } }),
      this.db.smartMoneyContextSnapshot.count({ where: this.stockScopeWhere(query) }),
      this.db.dataQualitySnapshot.count(),
      this.db.marketContextSnapshot.findFirst({ where: { region: query.region }, orderBy: { snapshotDate: 'desc' } }),
    ]);
    const sectorSnapshots = sectorRows.filter((row: any) => isKnownSector(row.sector)).length;
    return {
      marketSnapshots,
      sectorSnapshots,
      sectorMetadataGapSnapshots: sectorRows.length - sectorSnapshots,
      countrySnapshots,
      smartMoneySnapshots,
      dataQualitySnapshots,
      latestSnapshotDate: latest?.snapshotDate ?? null,
    };
  }

  async lookup(date: Date, lookbackDays: number, filters: { instrumentId?: string; sector?: string; country?: string; region?: string; assetType?: string }) {
    const gte = new Date(date.getTime() - lookbackDays * 86400000);
    const dateFilter = { lte: date, gte };
    const sectorLookup = filters.sector && isKnownSector(filters.sector)
      ? this.db.sectorContextSnapshot.findFirst({ where: { snapshotDate: dateFilter, region: filters.region, sector: filters.sector }, orderBy: { snapshotDate: 'desc' } })
      : Promise.resolve(null);
    const [market, sector, country, smartMoney, dataQuality] = await Promise.all([
      this.db.marketContextSnapshot.findFirst({ where: { snapshotDate: dateFilter, region: filters.region }, orderBy: { snapshotDate: 'desc' } }),
      sectorLookup,
      filters.country ? this.db.countryContextSnapshot.findFirst({ where: { snapshotDate: dateFilter, region: filters.region, country: filters.country }, orderBy: { snapshotDate: 'desc' } }) : Promise.resolve(null),
      filters.instrumentId ? this.db.smartMoneyContextSnapshot.findFirst({ where: { snapshotDate: dateFilter, instrumentId: filters.instrumentId, ...this.stockScopeWhere(filters) }, orderBy: { snapshotDate: 'desc' } }) : Promise.resolve(null),
      filters.instrumentId ? this.db.dataQualitySnapshot.findFirst({ where: { snapshotDate: dateFilter, instrumentId: filters.instrumentId }, orderBy: { snapshotDate: 'desc' } }) : Promise.resolve(null),
    ]);
    return { market, sector, country, smartMoney, dataQuality };
  }

  /**
   * Bulk range-query for MarketContextSnapshot rows used by per-bar regime
   * lookup in the backtesting path.  Returns rows ordered ascending by
   * snapshotDate — one findMany for the whole range, never per-bar.
   */
  marketContextSnapshotsInRange(params: {
    region: string;
    from: Date;
    to: Date;
  }): Promise<Array<{ snapshotDate: Date; regime: string; breadthPercentAboveSma50: number | null }>> {
    return this.db.marketContextSnapshot.findMany({
      where: {
        region: params.region,
        snapshotDate: { gte: params.from, lte: params.to },
      },
      select: { snapshotDate: true, regime: true, breadthPercentAboveSma50: true },
      orderBy: { snapshotDate: 'asc' },
    });
  }

  emptyCount(): SnapshotCount {
    return { inserted: 0, updated: 0, skipped: 0 };
  }

  private dateWhere(query: SnapshotQuery) {
    if (query.date) return { snapshotDate: query.date };
    if (query.from || query.to) return { snapshotDate: { gte: query.from, lte: query.to } };
    return {};
  }

  private stockScopeWhere(query: { region?: string; assetType?: string }) {
    if (!query.region && !query.assetType) return {};
    const stock: Record<string, unknown> = {};
    if (query.region) stock.region = query.region;
    if (query.assetType) stock.assetType = query.assetType === 'STOCK' ? { in: ['STOCK', 'EQUITY'] } : query.assetType;
    return {
      stock: { is: stock },
    };
  }
}
