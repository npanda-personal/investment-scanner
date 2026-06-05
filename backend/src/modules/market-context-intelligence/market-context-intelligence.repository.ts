import { randomUUID } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../db/prisma';
import { isKnownSector } from '../../shared/utils/sector-metadata';
import type { 
  MarketContextSummary, 
  MarketRegimeSummary, 
  SectorRotationItem, 
  MarketBreadth, 
  CountryStrengthItem,
  MacroSnapshot,
  SectorIndexInput,
  SectorSnapshotDto,
} from './market-context-intelligence.types';

const SECTOR_INDEX_PRICE_SOURCES = ['NIFTY_SECTOR_INDEX'];

export class MarketContextIntelligenceRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async latestSnapshot(region: string = 'GLOBAL'): Promise<MarketContextSummary | null> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [market, sectors, countries] = await Promise.all([
      this.db.marketContextSnapshot.findUnique({ where: { snapshotDate_region: { snapshotDate: today, region } } }),
      this.db.sectorContextSnapshot.findMany({ where: { snapshotDate: today, region }, orderBy: { relativeStrengthScore: 'desc' } }),
      this.db.countryContextSnapshot.findMany({ where: { snapshotDate: today, region }, orderBy: { relativeStrengthScore: 'desc' } })
    ]);

    if (!market) return null;

    return this.toSummary(market, sectors, countries);
  }

  async latestPersistedSnapshot(region: string = 'GLOBAL'): Promise<MarketContextSummary | null> {
    const market = await this.db.marketContextSnapshot.findFirst({
      where: { region },
      orderBy: [{ snapshotDate: 'desc' }, { updatedAt: 'desc' }],
    });
    if (!market) return null;

    const [sectors, countries] = await Promise.all([
      this.db.sectorContextSnapshot.findMany({ where: { snapshotDate: market.snapshotDate, region }, orderBy: { relativeStrengthScore: 'desc' } }),
      this.db.countryContextSnapshot.findMany({ where: { snapshotDate: market.snapshotDate, region }, orderBy: { relativeStrengthScore: 'desc' } })
    ]);

    return this.toSummary(market, sectors, countries);
  }

  async loadSectorIndexInputs(query: { region: string; dataThroughDate?: Date | null }): Promise<SectorIndexInput[]> {
    const symbolRows = await this.db.priceTick.findMany({
      where: {
        region: query.region,
        source: { in: SECTOR_INDEX_PRICE_SOURCES },
        ...(query.dataThroughDate ? { timestamp: { lte: this.endOfUtcDay(query.dataThroughDate) } } : {}),
      },
      distinct: ['symbol'],
      select: { symbol: true },
    });
    const symbols = symbolRows.map((row: any) => row.symbol).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b));
    if (symbols.length === 0) return [];

    const [stocks, latestPrices, priceTicks] = await Promise.all([
      this.db.stock.findMany({
        where: {
          region: query.region,
          assetType: 'INDEX',
          symbol: { in: symbols },
          isActive: true,
          isDelisted: false,
        },
        select: {
          id: true,
          symbol: true,
          displaySymbol: true,
          sourceSymbol: true,
          name: true,
        },
      }),
      this.db.latestPrice.findMany({
        where: {
          symbol: { in: symbols },
          OR: [{ region: query.region }, { region: null }],
        },
        select: {
          symbol: true,
          price: true,
          timestamp: true,
        },
      }),
      this.db.priceTick.findMany({
        where: {
          symbol: { in: symbols },
          region: query.region,
          source: { in: SECTOR_INDEX_PRICE_SOURCES },
          ...(query.dataThroughDate ? { timestamp: { lte: this.endOfUtcDay(query.dataThroughDate) } } : {}),
        },
        orderBy: [{ symbol: 'asc' }, { timestamp: 'desc' }],
        select: {
          symbol: true,
          timestamp: true,
          close: true,
          adjustedClose: true,
        },
      }),
    ]);

    const latestBySymbol = new Map<string, any>();
    for (const row of latestPrices as any[]) {
      const existing = latestBySymbol.get(row.symbol);
      if (!existing || new Date(row.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
        latestBySymbol.set(row.symbol, row);
      }
    }

    const pricesBySymbol = new Map<string, SectorIndexInput['prices']>();
    for (const row of priceTicks as any[]) {
      const prices = pricesBySymbol.get(row.symbol) || [];
      prices.push({
        timestamp: new Date(row.timestamp),
        close: this.numberOrNull(row.close) ?? 0,
        adjustedClose: this.numberOrNull(row.adjustedClose),
      });
      pricesBySymbol.set(row.symbol, prices);
    }

    return (stocks as any[])
      .map((stock) => {
        const latest = latestBySymbol.get(stock.symbol);
        return {
          instrumentId: stock.id,
          symbol: stock.symbol,
          displayName: stock.displaySymbol || stock.sourceSymbol || stock.name || stock.symbol,
          sourceSymbol: stock.sourceSymbol || null,
          latestPrice: latest ? this.numberOrNull(latest.price) : null,
          latestTimestamp: latest ? new Date(latest.timestamp) : null,
          prices: pricesBySymbol.get(stock.symbol) || [],
        };
      })
      .filter((row) => row.prices.length > 0);
  }

  async saveSectorSnapshots(
    snapshots: SectorSnapshotDto[],
    scope: { region: string; assetType: string }
  ): Promise<{ savedCount: number; createdCount: number; updatedCount: number }> {
    if (snapshots.length === 0) return { savedCount: 0, createdCount: 0, updatedCount: 0 };
    const snapshotDate = new Date(`${snapshots[0].snapshotDate}T00:00:00.000Z`);
    const sectors = snapshots.map((snapshot) => snapshot.sector);
    const existing = await this.db.$queryRaw<Array<{ sector: string }>>(Prisma.sql`
      SELECT "sector"
      FROM "sector_snapshots"
      WHERE "snapshotDate" = ${snapshotDate}
        AND "scopeRegion" = ${scope.region}
        AND "scopeAssetType" = ${scope.assetType}
        AND "sector" IN (${Prisma.join(sectors)})
    `);
    const existingSectors = new Set((existing as any[]).map((row) => row.sector));

    await this.db.$transaction(snapshots.map((snapshot) => {
      const dataThroughDate = new Date(`${snapshot.dataThroughDate}T00:00:00.000Z`);
      const reasonTags = JSON.stringify(this.jsonArray(snapshot.reasonTags));
      const warnings = JSON.stringify(this.jsonArray(snapshot.warnings));
      return this.db.$executeRaw(Prisma.sql`
        INSERT INTO "sector_snapshots" (
          "id",
          "snapshotDate",
          "dataThroughDate",
          "scopeRegion",
          "scopeAssetType",
          "sector",
          "classification",
          "sectorScore",
          "return1W",
          "return1M",
          "return3M",
          "trendScore",
          "reasonTags",
          "warnings",
          "source",
          "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${snapshotDate},
          ${dataThroughDate},
          ${scope.region},
          ${scope.assetType},
          ${snapshot.sector},
          ${snapshot.classification},
          ${snapshot.sectorScore},
          ${snapshot.return1W},
          ${snapshot.return1M},
          ${snapshot.return3M},
          ${snapshot.trendScore},
          CAST(${reasonTags} AS JSONB),
          CAST(${warnings} AS JSONB),
          'sector-intelligence',
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("snapshotDate", "scopeRegion", "scopeAssetType", "sector")
        DO UPDATE SET
          "dataThroughDate" = EXCLUDED."dataThroughDate",
          "classification" = EXCLUDED."classification",
          "sectorScore" = EXCLUDED."sectorScore",
          "return1W" = EXCLUDED."return1W",
          "return1M" = EXCLUDED."return1M",
          "return3M" = EXCLUDED."return3M",
          "trendScore" = EXCLUDED."trendScore",
          "reasonTags" = EXCLUDED."reasonTags",
          "warnings" = EXCLUDED."warnings",
          "source" = EXCLUDED."source",
          "updatedAt" = CURRENT_TIMESTAMP
      `);
    }));

    const updatedCount = snapshots.filter((snapshot) => existingSectors.has(snapshot.sector)).length;
    return {
      savedCount: snapshots.length,
      createdCount: snapshots.length - updatedCount,
      updatedCount,
    };
  }

  async latestSectorSnapshots(scope: { region: string; assetType: string }): Promise<SectorSnapshotDto[]> {
    const latestRows = await this.db.$queryRaw<Array<{ snapshotDate: Date }>>(Prisma.sql`
      SELECT "snapshotDate"
      FROM "sector_snapshots"
      WHERE "scopeRegion" = ${scope.region}
        AND "scopeAssetType" = ${scope.assetType}
      ORDER BY "snapshotDate" DESC, "updatedAt" DESC
      LIMIT 1
    `);
    const latest = latestRows[0] || null;
    if (!latest) return [];

    const rows = await this.db.$queryRaw<any[]>(Prisma.sql`
      SELECT
        "snapshotDate",
        "dataThroughDate",
        "sector",
        "classification",
        "sectorScore",
        "return1W",
        "return1M",
        "return3M",
        "trendScore",
        "reasonTags",
        "warnings"
      FROM "sector_snapshots"
      WHERE "scopeRegion" = ${scope.region}
        AND "scopeAssetType" = ${scope.assetType}
        AND "snapshotDate" = ${latest.snapshotDate}
      ORDER BY "sectorScore" DESC, "sector" ASC
    `);
    return (rows as any[]).map((row) => this.toSectorSnapshotDto(row));
  }

  private toSummary(market: any, sectors: any[], countries: any[]): MarketContextSummary {
    const regime: MarketRegimeSummary = {
      regime: market.regime as any,
      score: Number(market.regimeScore),
      explanation: market.explanation || '',
      updatedAt: market.updatedAt.toISOString(),
      dataStatus: market.dataStatus as any,
    };

    const breadthInstrumentCount = sectors.reduce((sum, sector) => sum + (sector.instrumentCount || 0), 0);
    const breadth: MarketBreadth = {
      percentAboveSma50: market.breadthPercentAboveSma50,
      percentAboveSma200: market.breadthPercentAboveSma200,
      sma50SampleCount: market.breadthPercentAboveSma50 === null ? 0 : breadthInstrumentCount,
      sma200SampleCount: market.breadthPercentAboveSma200 === null ? 0 : breadthInstrumentCount,
      advanceDeclineRatio: market.advanceDeclineRatio,
      newHigh52WeekCount: market.newHighCount || 0,
      newLow52WeekCount: market.newLowCount || 0,
      bullishSignalCount: 0,
      bearishSignalCount: 0,
      instrumentCount: breadthInstrumentCount,
      dataStatus: market.dataStatus as any,
    };

    const mappedSectors: SectorRotationItem[] = sectors.filter((sector) => this.isKnownMetadata(sector.sector)).map(s => ({
      sector: s.sector,
      return1M: s.oneMonthReturn,
      return3M: s.threeMonthReturn,
      return6M: s.sixMonthReturn,
      relativeStrengthScore: Math.round(s.relativeStrengthScore),
      instrumentCount: s.instrumentCount,
      bullishSignalCount: s.bullishSignalCount || 0,
      bearishSignalCount: s.bearishSignalCount || 0,
      leadershipStatus: s.leadershipStatus as any,
    }));

    const mappedCountries: CountryStrengthItem[] = countries.map(c => ({
      country: c.country,
      return1M: c.oneMonthReturn,
      return3M: c.threeMonthReturn,
      return6M: c.sixMonthReturn,
      relativeStrengthScore: Math.round(c.relativeStrengthScore),
      instrumentCount: 0,
      bullishSignalCount: c.bullishSignalCount || 0,
    }));

    const macro: MacroSnapshot = {
      interestRateProxy: null,
      inflationProxy: null,
      usdStrengthProxy: null,
      commodityProxy: null,
      macroStatus: (market.macroStatus as any) || 'UNKNOWN',
      dataStatus: 'MISSING',
      explanation: 'Macro providers are not configured yet.',
    };

    return {
      regime,
      topSectors: mappedSectors.slice(0, 5),
      weakSectors: this.weakSectorSlice(mappedSectors),
      breadth,
      breadthByCapBand: Array.isArray(market.breadthByCapBand) ? (market.breadthByCapBand as any[]) : [],
      countryStrength: mappedCountries.slice(0, 8),
      macro,
      explanation: [market.explanation || ''],
      updatedAt: market.updatedAt.toISOString(),
      dataStatus: market.dataStatus as any,
    };
  }

  async saveSnapshot(summary: MarketContextSummary, region: string = 'GLOBAL', asOf?: Date): Promise<void> {
    // When asOf is provided, persist the snapshot under that historical date (point-in-time).
    // When omitted, use today (existing behaviour for scheduled/live runs).
    const today = asOf ? new Date(asOf) : new Date();
    today.setUTCHours(0, 0, 0, 0);

    await this.db.$transaction([
      this.db.marketContextSnapshot.upsert({
        where: { snapshotDate_region: { snapshotDate: today, region } },
        create: {
          snapshotDate: today,
          region,
          regime: summary.regime.regime,
          regimeScore: summary.regime.score,
          breadthPercentAboveSma50: summary.breadth.percentAboveSma50,
          breadthPercentAboveSma200: summary.breadth.percentAboveSma200,
          advanceDeclineRatio: summary.breadth.advanceDeclineRatio,
          newHighCount: summary.breadth.newHigh52WeekCount,
          newLowCount: summary.breadth.newLow52WeekCount,
          breadthByCapBand: (summary.breadthByCapBand ?? []) as unknown as Prisma.InputJsonValue,
          macroStatus: summary.macro.macroStatus,
          explanation: summary.regime.explanation,
          source: 'market-context-intelligence',
          dataStatus: summary.regime.dataStatus,
        },
        update: {
          regime: summary.regime.regime,
          regimeScore: summary.regime.score,
          breadthPercentAboveSma50: summary.breadth.percentAboveSma50,
          breadthPercentAboveSma200: summary.breadth.percentAboveSma200,
          advanceDeclineRatio: summary.breadth.advanceDeclineRatio,
          newHighCount: summary.breadth.newHigh52WeekCount,
          newLowCount: summary.breadth.newLow52WeekCount,
          breadthByCapBand: (summary.breadthByCapBand ?? []) as unknown as Prisma.InputJsonValue,
          macroStatus: summary.macro.macroStatus,
          explanation: summary.regime.explanation,
          dataStatus: summary.regime.dataStatus,
        }
      }),
      ...summary.topSectors.concat(summary.weakSectors).map(s => 
        this.db.sectorContextSnapshot.upsert({
          where: {
            snapshotDate_region_sector: {
              snapshotDate: today,
              region,
              sector: s.sector
            }
          },
          create: {
            snapshotDate: today,
            region,
            sector: s.sector,
            oneMonthReturn: s.return1M,
            threeMonthReturn: s.return3M,
            sixMonthReturn: s.return6M,
            relativeStrengthScore: s.relativeStrengthScore,
            instrumentCount: s.instrumentCount,
            bullishSignalCount: s.bullishSignalCount,
            bearishSignalCount: s.bearishSignalCount,
            leadershipStatus: s.leadershipStatus,
            source: 'market-context-intelligence',
            dataStatus: 'COMPLETE',
          },
          update: {
            oneMonthReturn: s.return1M,
            threeMonthReturn: s.return3M,
            sixMonthReturn: s.return6M,
            relativeStrengthScore: s.relativeStrengthScore,
            instrumentCount: s.instrumentCount,
            bullishSignalCount: s.bullishSignalCount,
            bearishSignalCount: s.bearishSignalCount,
            leadershipStatus: s.leadershipStatus,
          }
        })
      ),
      ...summary.countryStrength.map(c => 
        this.db.countryContextSnapshot.upsert({
          where: {
            snapshotDate_region_country: {
              snapshotDate: today,
              region,
              country: c.country
            }
          },
          create: {
            snapshotDate: today,
            region,
            country: c.country,
            oneMonthReturn: c.return1M,
            threeMonthReturn: c.return3M,
            sixMonthReturn: c.return6M,
            relativeStrengthScore: c.relativeStrengthScore,
            bullishSignalCount: c.bullishSignalCount,
            bearishSignalCount: 0,
            source: 'market-context-intelligence',
            dataStatus: 'COMPLETE',
          },
          update: {
            oneMonthReturn: c.return1M,
            threeMonthReturn: c.return3M,
            sixMonthReturn: c.return6M,
            relativeStrengthScore: c.relativeStrengthScore,
            bullishSignalCount: c.bullishSignalCount,
          }
        })
      )
    ]);
  }

  private isKnownMetadata(value: string | null | undefined) {
    return isKnownSector(value);
  }

  private toSectorSnapshotDto(row: any): SectorSnapshotDto {
    return {
      snapshotDate: this.dateOnly(row.snapshotDate),
      dataThroughDate: this.dateOnly(row.dataThroughDate),
      sector: row.sector,
      classification: row.classification,
      sectorScore: Number(row.sectorScore),
      return1W: this.numberOrNull(row.return1W),
      return1M: this.numberOrNull(row.return1M),
      return3M: this.numberOrNull(row.return3M),
      trendScore: Number(row.trendScore),
      reasonTags: this.stringArray(row.reasonTags),
      warnings: this.stringArray(row.warnings),
    };
  }

  private numberOrNull(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private jsonArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : [];
  }

  private dateOnly(value: Date | string): string {
    return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);
  }

  private endOfUtcDay(value: Date): Date {
    const end = new Date(value);
    end.setUTCHours(23, 59, 59, 999);
    return end;
  }


  /**
   * CB-41/CB-42: Load closing prices for a named index symbol (e.g. ^NSEI), most-recent first.
   * Used by the regime calculator to compute an index-trend term.
   */
  async loadIndexPrices(symbol: string, limit: number, endDate?: Date): Promise<number[]> {
    const rows = await this.db.priceTick.findMany({
      where: {
        symbol,
        ...(endDate ? { timestamp: { lte: endDate } } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: { close: true },
    });
    return rows
      .map((row: any) => Number(row.close))
      .filter((v: number) => Number.isFinite(v) && v > 0);
  }

  private weakSectorSlice(sectors: SectorRotationItem[]) {
    if (sectors.length <= 1) return [];
    return sectors.slice(-Math.min(5, sectors.length - 1)).reverse();
  }
}
