import { PrismaClient } from '@prisma/client';
import prisma from '../../db/prisma';
import type { SmartMoneyListQuery, SmartMoneyRange, SmartMoneyStockSummary, SectorSmartMoneySummary } from './smart-money-intelligence.types';

export class SmartMoneyIntelligenceRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async latestSnapshots(query: SmartMoneyListQuery, isDistribution: boolean = false): Promise<{ results: SmartMoneyStockSummary[], total: number }> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const where: any = {
      snapshotDate: today,
      range: query.range,
      ...(query.sector && { sector: query.sector }),
    };

    if (isDistribution) {
      where.OR = [{ status: 'DISTRIBUTION' }, { smartMoneyScore: { lte: 40 } }];
    } else {
      where.OR = [{ status: 'ACCUMULATION' }, { smartMoneyScore: { gte: 60 } }];
    }

    const orderBy: any = {
      smartMoneyScore: isDistribution ? 'asc' : 'desc'
    };

    const [count, rows] = await Promise.all([
      this.db.smartMoneyContextSnapshot.count({ where }),
      this.db.smartMoneyContextSnapshot.findMany({
        where,
        orderBy,
        skip: query.offset || 0,
        take: query.limit,
      })
    ]);

    return {
      results: rows.map(r => this.mapSnapshotToSummary(r)),
      total: count,
    };
  }

  async latestStockSnapshot(instrumentId: string, range: SmartMoneyRange): Promise<SmartMoneyStockSummary | null> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const row = await this.db.smartMoneyContextSnapshot.findFirst({
      where: {
        snapshotDate: today,
        instrumentId,
        range,
      }
    });

    if (!row) return null;
    return this.mapSnapshotToSummary(row);
  }

  async latestSectorSnapshots(range: SmartMoneyRange): Promise<SectorSmartMoneySummary[]> {
     const today = new Date();
     today.setUTCHours(0, 0, 0, 0);

     const rows = await this.db.smartMoneyContextSnapshot.findMany({
       where: { snapshotDate: today, range }
     });

     // We aggregate on the fly from the daily snapshots.
     // In a truly massive system, we'd persist SectorSmartMoneySummary as well,
     // but aggregating 5,000 integers in memory takes <1ms and is fine for this scale,
     // unlike fetching price bars and recalculating signals from scratch.
     const groups = new Map<string, SmartMoneyStockSummary[]>();
     rows.forEach(r => {
       const summary = this.mapSnapshotToSummary(r);
       const sector = summary.sector || 'Unknown';
       groups.set(sector, [...(groups.get(sector) || []), summary]);
     });

     return [...groups.entries()].map(([sector, items]) => {
       const average = Math.round(items.reduce((sum, item) => sum + item.smartMoneyScore, 0) / Math.max(1, items.length));
       const sectorStatus: any = average >= 65 ? 'ACCUMULATING' : average <= 40 ? 'DISTRIBUTING' : 'NEUTRAL';
       const dataStatus: any = items.some((item) => item.dataStatus === 'PARTIAL') ? 'PARTIAL' : 'COMPLETE';
       return {
         sector,
         averageSmartMoneyScore: average,
         accumulationCount: items.filter((item) => item.status === 'ACCUMULATION').length,
         distributionCount: items.filter((item) => item.status === 'DISTRIBUTION').length,
         unusualVolumeCount: items.filter((item) => item.signals.some((signal) => signal.type === 'UNUSUAL_VOLUME')).length,
         instrumentCount: items.length,
         sectorStatus,
         dataStatus,
         updatedAt: new Date().toISOString(),
       };
     }).sort((a, b) => b.averageSmartMoneyScore - a.averageSmartMoneyScore);
  }

  async saveSnapshot(summary: SmartMoneyStockSummary): Promise<void> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await this.db.smartMoneyContextSnapshot.upsert({
      where: {
        snapshotDate_instrumentId_range: {
          snapshotDate: today,
          instrumentId: summary.instrumentId,
          range: summary.range,
        }
      },
      create: {
        snapshotDate: today,
        instrumentId: summary.instrumentId,
        symbol: summary.symbol,
        companyName: summary.companyName,
        sector: summary.sector,
        smartMoneyScore: summary.smartMoneyScore,
        status: summary.status,
        confidence: summary.confidence,
        accumulationSignalCount: summary.signals.filter(s => s.direction === 'ACCUMULATION').length,
        distributionSignalCount: summary.signals.filter(s => s.direction === 'DISTRIBUTION').length,
        unusualVolumeDetected: summary.signals.some(s => s.type === 'UNUSUAL_VOLUME'),
        explanation: summary.explanation,
        source: summary.source,
        dataStatus: summary.dataStatus,
        latestClose: summary.latestClose,
        latestVolume: summary.latestVolume,
        averageVolume20: summary.averageVolume20,
        dailyChangePercent: summary.dailyChangePercent,
        signals: summary.signals as any,
        insiderOwnership: summary.insiderOwnership as any,
        range: summary.range,
      },
      update: {
        companyName: summary.companyName,
        sector: summary.sector,
        smartMoneyScore: summary.smartMoneyScore,
        status: summary.status,
        confidence: summary.confidence,
        accumulationSignalCount: summary.signals.filter(s => s.direction === 'ACCUMULATION').length,
        distributionSignalCount: summary.signals.filter(s => s.direction === 'DISTRIBUTION').length,
        unusualVolumeDetected: summary.signals.some(s => s.type === 'UNUSUAL_VOLUME'),
        explanation: summary.explanation,
        source: summary.source,
        dataStatus: summary.dataStatus,
        latestClose: summary.latestClose,
        latestVolume: summary.latestVolume,
        averageVolume20: summary.averageVolume20,
        dailyChangePercent: summary.dailyChangePercent,
        signals: summary.signals as any,
        insiderOwnership: summary.insiderOwnership as any,
      }
    });
  }

  private mapSnapshotToSummary(row: any): SmartMoneyStockSummary {
    return {
      instrumentId: row.instrumentId,
      symbol: row.symbol,
      companyName: row.companyName,
      sector: row.sector,
      smartMoneyScore: row.smartMoneyScore,
      status: row.status as any,
      confidence: row.confidence as any,
      explanation: row.explanation || '',
      updatedAt: row.updatedAt.toISOString(),
      dataStatus: row.dataStatus as any,
      source: row.source,
      range: row.range as SmartMoneyRange,
      latestClose: row.latestClose,
      latestVolume: row.latestVolume,
      averageVolume20: row.averageVolume20,
      dailyChangePercent: row.dailyChangePercent,
      signals: (row.signals as any) || [],
      insiderOwnership: (row.insiderOwnership as any) || {
        insiderBuyCount: null,
        insiderSellCount: null,
        netInsiderActivity: null,
        institutionalOwnershipPercent: null,
        ownershipDataStatus: 'MISSING',
        source: 'not-configured',
        explanation: 'Free insider and institutional ownership provider is not configured for the MVP.',
      },
      researchUrl: `/research/stocks/${row.instrumentId}`
    };
  }
}
