import prisma from '../../db/prisma';
import type { SnapshotCount, SnapshotQuery } from './historical-context-snapshots.types';

export class HistoricalContextSnapshotsRepository {
  constructor(private readonly db = prisma) {}

  async upsertMarket(input: any): Promise<'inserted' | 'updated'> {
    const existing = await this.db.marketContextSnapshot.findUnique({ where: { snapshotDate: input.snapshotDate } });
    await this.db.marketContextSnapshot.upsert({
      where: { snapshotDate: input.snapshotDate },
      create: input,
      update: input,
    });
    return existing ? 'updated' : 'inserted';
  }

  async upsertSector(input: any): Promise<'inserted' | 'updated'> {
    const where = { snapshotDate_sector: { snapshotDate: input.snapshotDate, sector: input.sector } };
    const existing = await this.db.sectorContextSnapshot.findUnique({ where });
    await this.db.sectorContextSnapshot.upsert({ where, create: input, update: input });
    return existing ? 'updated' : 'inserted';
  }

  async upsertCountry(input: any): Promise<'inserted' | 'updated'> {
    const where = { snapshotDate_country: { snapshotDate: input.snapshotDate, country: input.country } };
    const existing = await this.db.countryContextSnapshot.findUnique({ where });
    await this.db.countryContextSnapshot.upsert({ where, create: input, update: input });
    return existing ? 'updated' : 'inserted';
  }

  async upsertSmartMoney(input: any): Promise<'inserted' | 'updated'> {
    const where = { snapshotDate_instrumentId: { snapshotDate: input.snapshotDate, instrumentId: input.instrumentId } };
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
    return this.db.marketContextSnapshot.findMany({ where: this.dateWhere(query), orderBy: { snapshotDate: 'desc' }, take: query.limit });
  }

  sectors(query: SnapshotQuery) {
    return this.db.sectorContextSnapshot.findMany({
      where: { ...this.dateWhere(query), sector: query.sector },
      orderBy: [{ snapshotDate: 'desc' }, { relativeStrengthScore: 'desc' }],
      take: query.limit,
    });
  }

  countries(query: SnapshotQuery) {
    return this.db.countryContextSnapshot.findMany({
      where: { ...this.dateWhere(query), country: query.country },
      orderBy: [{ snapshotDate: 'desc' }, { relativeStrengthScore: 'desc' }],
      take: query.limit,
    });
  }

  smartMoney(query: SnapshotQuery) {
    return this.db.smartMoneyContextSnapshot.findMany({
      where: { ...this.dateWhere(query), instrumentId: query.instrumentId, sector: query.sector },
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

  async coverage() {
    const [marketSnapshots, sectorSnapshots, countrySnapshots, smartMoneySnapshots, dataQualitySnapshots, latest] = await Promise.all([
      this.db.marketContextSnapshot.count(),
      this.db.sectorContextSnapshot.count(),
      this.db.countryContextSnapshot.count(),
      this.db.smartMoneyContextSnapshot.count(),
      this.db.dataQualitySnapshot.count(),
      this.db.marketContextSnapshot.findFirst({ orderBy: { snapshotDate: 'desc' } }),
    ]);
    return { marketSnapshots, sectorSnapshots, countrySnapshots, smartMoneySnapshots, dataQualitySnapshots, latestSnapshotDate: latest?.snapshotDate ?? null };
  }

  async lookup(date: Date, lookbackDays: number, filters: { instrumentId?: string; sector?: string; country?: string }) {
    const gte = new Date(date.getTime() - lookbackDays * 86400000);
    const dateFilter = { lte: date, gte };
    const [market, sector, country, smartMoney, dataQuality] = await Promise.all([
      this.db.marketContextSnapshot.findFirst({ where: { snapshotDate: dateFilter }, orderBy: { snapshotDate: 'desc' } }),
      filters.sector ? this.db.sectorContextSnapshot.findFirst({ where: { snapshotDate: dateFilter, sector: filters.sector }, orderBy: { snapshotDate: 'desc' } }) : Promise.resolve(null),
      filters.country ? this.db.countryContextSnapshot.findFirst({ where: { snapshotDate: dateFilter, country: filters.country }, orderBy: { snapshotDate: 'desc' } }) : Promise.resolve(null),
      filters.instrumentId ? this.db.smartMoneyContextSnapshot.findFirst({ where: { snapshotDate: dateFilter, instrumentId: filters.instrumentId }, orderBy: { snapshotDate: 'desc' } }) : Promise.resolve(null),
      filters.instrumentId ? this.db.dataQualitySnapshot.findFirst({ where: { snapshotDate: dateFilter, instrumentId: filters.instrumentId }, orderBy: { snapshotDate: 'desc' } }) : Promise.resolve(null),
    ]);
    return { market, sector, country, smartMoney, dataQuality };
  }

  emptyCount(): SnapshotCount {
    return { inserted: 0, updated: 0, skipped: 0 };
  }

  private dateWhere(query: SnapshotQuery) {
    if (query.date) return { snapshotDate: query.date };
    if (query.from || query.to) return { snapshotDate: { gte: query.from, lte: query.to } };
    return {};
  }
}
