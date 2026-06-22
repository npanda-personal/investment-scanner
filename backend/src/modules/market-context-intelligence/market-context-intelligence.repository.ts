import { randomUUID } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../db/prisma';
import { isKnownSector } from '../../shared/utils/sector-metadata'; import { getLatestMacroSnapshot } from './market-context-intelligence.macro-read.repository';
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

// Non-IN sector proxy symbols, keyed by region.
// For US: the 11 SPDR Select Sector ETFs seeded with assetType='ETF', source='YAHOO_EOD'.
// Keeping this list here (rather than in the service) so the discovery query is tight
// and does not scan all 5000+ ETFs in the DB.
const SECTOR_PROXY_SYMBOLS_BY_REGION: Record<string, string[]> = {
  US: ['XLK', 'XLF', 'XLV', 'XLE', 'XLY', 'XLP', 'XLI', 'XLB', 'XLRE', 'XLU', 'XLC'],
};

export class MarketContextIntelligenceRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async latestSnapshot(region: string = 'GLOBAL'): Promise<MarketContextSummary | null> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [market, sectors, countries, macro] = await Promise.all([
      this.db.marketContextSnapshot.findUnique({ where: { snapshotDate_region: { snapshotDate: today, region } } }),
      this.db.sectorContextSnapshot.findMany({ where: { snapshotDate: today, region }, orderBy: { relativeStrengthScore: 'desc' } }),
      this.db.countryContextSnapshot.findMany({ where: { snapshotDate: today, region }, orderBy: { relativeStrengthScore: 'desc' } }), getLatestMacroSnapshot('GLOBAL').catch(() => null)
    ]);

    if (!market) return null;

    return this.toSummary(market, sectors, countries, macro);
  }

  async latestPersistedSnapshot(region: string = 'GLOBAL'): Promise<MarketContextSummary | null> {
    const market = await this.db.marketContextSnapshot.findFirst({
      where: { region },
      orderBy: [{ snapshotDate: 'desc' }, { updatedAt: 'desc' }],
    });
    if (!market) return null;

    const [sectors, countries, macro] = await Promise.all([
      this.db.sectorContextSnapshot.findMany({ where: { snapshotDate: market.snapshotDate, region }, orderBy: { relativeStrengthScore: 'desc' } }),
      this.db.countryContextSnapshot.findMany({ where: { snapshotDate: market.snapshotDate, region }, orderBy: { relativeStrengthScore: 'desc' } }), getLatestMacroSnapshot('GLOBAL').catch(() => null)
    ]);

    return this.toSummary(market, sectors, countries, macro);
  }

  async loadSectorIndexInputs(query: { region: string; dataThroughDate?: Date | null }): Promise<SectorIndexInput[]> {
    const normalizedRegion = String(query.region || '').trim().toUpperCase();
    const isIN = normalizedRegion === 'IN';

    let symbols: string[];

    if (isIN) {
      // IN path (unchanged): discover sector index symbols by NSE-specific source tag.
      const symbolRows = await this.db.priceTick.findMany({
        where: {
          region: query.region,
          source: { in: SECTOR_INDEX_PRICE_SOURCES },
          ...(query.dataThroughDate ? { timestamp: { lte: this.endOfUtcDay(query.dataThroughDate) } } : {}),
        },
        distinct: ['symbol'],
        select: { symbol: true },
      });
      symbols = symbolRows.map((row: any) => row.symbol).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b));
    } else {
      // Non-IN path: discover sector-proxy instruments from the stocks table.
      // We filter by both assetType='ETF' AND a curated symbol list (SECTOR_PROXY_SYMBOLS_BY_REGION)
      // so that:
      //   - benchmark indices like ^GSPC/^VIX (assetType='INDEX') are excluded, and
      //   - the 5000+ other US ETFs that are NOT sector proxies are excluded.
      // We must NOT filter by source because Yahoo tags all instruments with YAHOO_EOD —
      // source alone cannot distinguish a sector ETF from a regular stock.
      const knownSymbols = SECTOR_PROXY_SYMBOLS_BY_REGION[normalizedRegion] ?? [];
      if (knownSymbols.length === 0) {
        // No curated list for this region — fall back to assetType='ETF' only.
        // The price-load step and the prices.length > 0 guard will naturally prune
        // ETFs that have no persisted price history.
        const sectorStocks = await this.db.stock.findMany({
          where: {
            region: query.region,
            assetType: 'ETF',
            isActive: true,
            isDelisted: false,
          },
          select: { symbol: true },
        });
        symbols = sectorStocks.map((row: any) => row.symbol).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b));
      } else {
        // Curated list available: discover only the known sector proxies that are
        // active in the stocks table.
        const sectorStocks = await this.db.stock.findMany({
          where: {
            region: query.region,
            assetType: 'ETF',
            symbol: { in: knownSymbols },
            isActive: true,
            isDelisted: false,
          },
          select: { symbol: true },
        });
        symbols = sectorStocks.map((row: any) => row.symbol).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b));
      }
    }

    if (symbols.length === 0) return [];

    const stockWhere = isIN
      ? { region: query.region, assetType: 'INDEX', symbol: { in: symbols }, isActive: true, isDelisted: false }
      : { region: query.region, assetType: 'ETF', symbol: { in: symbols }, isActive: true, isDelisted: false };

    const priceTickWhere = isIN
      ? {
          symbol: { in: symbols },
          region: query.region,
          source: { in: SECTOR_INDEX_PRICE_SOURCES },
          ...(query.dataThroughDate ? { timestamp: { lte: this.endOfUtcDay(query.dataThroughDate) } } : {}),
        }
      : {
          // Non-IN: filter by symbol to select only the sector ETFs discovered above.
          // Do NOT add a source filter — Yahoo tags everything YAHOO_EOD.
          symbol: { in: symbols },
          region: query.region,
          ...(query.dataThroughDate ? { timestamp: { lte: this.endOfUtcDay(query.dataThroughDate) } } : {}),
        };

    const [stocks, latestPrices, priceTicks] = await Promise.all([
      this.db.stock.findMany({
        where: stockWhere,
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
        where: priceTickWhere,
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

  private toSummary(market: any, sectors: any[], countries: any[], loadedMacro?: MacroSnapshot | null): MarketContextSummary {
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

    const macro: MacroSnapshot = loadedMacro ?? {
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
      countryStrength: mappedCountries.slice(0, 8), macro,
      explanation: [market.explanation || ''],
      updatedAt: market.updatedAt.toISOString(),
      dataStatus: market.dataStatus as any,
      fearGreedIndex: market.fearGreedIndex ?? null, fearGreedLabel: market.fearGreedLabel ?? null, btcDominancePct: (market as any).btcDominancePct ?? null, totalCryptoMarketCapUsd: (market as any).totalCryptoMarketCapUsd ?? null, totalCrypto24hVolumeUsd: (market as any).totalCrypto24hVolumeUsd ?? null,
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
   * NR-5 cap-band breadth fix: load a wider universe (up to CAP_BAND_UNIVERSE_LIMIT stocks)
   * so MID and SMALL bands are populated.
   *
   * Design (pool-safe, 2 DB round-trips):
   *   1. SELECT top-N NSE CASH stocks by marketCap (marketCap NOT NULL, > 0)
   *   2. Single bulk SELECT from price_ticks WHERE symbol IN (...) AND rank <= 260
   *      (using a window function so we never ship more than 260 rows per symbol).
   *
   * The result includes only stocks that have at least 2 price rows in the DB
   * (the MIN_SAMPLE=5 guard in calculateBreadthByCapBand handles low-count bands).
   *
   * Cap: CAP_BAND_UNIVERSE_LIMIT = 1500.  If loading feels too heavy in production
   * the cap can be lowered here; ~1000 is enough to reach mid-cap territory given
   * NSE's current ~2,300 mainboard listings where ~200-250 are large-cap.
   */
  static readonly CAP_BAND_UNIVERSE_LIMIT = 1500;

  async loadCapBandUniverse(endDate?: Date): Promise<Array<{
    instrumentId: string;
    symbol: string;
    marketCap: number | null;
    latest: number | null;
    previous: number | null;
    prices: number[];
  }>> {
    // Step 1: fetch top-N instruments with a known positive marketCap.
    // Sorted desc by marketCap so LARGE stocks come first; the tail reaches into
    // mid/small territory once LARGE is exhausted (~200-250 names on NSE).
    const stocks = await this.db.stock.findMany({
      where: {
        exchange: 'NSE',
        instrumentSegment: 'CASH',
        isActive: true,
        isDelisted: false,
        marketCap: { not: null, gt: 0 },
      },
      orderBy: { marketCap: 'desc' },
      take: MarketContextIntelligenceRepository.CAP_BAND_UNIVERSE_LIMIT,
      select: { id: true, symbol: true, marketCap: true },
    });

    if (stocks.length === 0) return [];

    const symbols = stocks.map((s: any) => s.symbol);

    // Step 2: batch-load the 260 most-recent closes per symbol in a single query.
    // We use a raw SQL window function (ROW_NUMBER OVER PARTITION BY symbol ORDER BY
    // timestamp DESC) so we only return the freshest 260 rows per symbol and never
    // pull unbounded data.  The endDate filter keeps this look-ahead-safe when the
    // service is called with a historical asOf date.
    const endFilter = endDate
      ? Prisma.sql`AND pt.timestamp <= ${endDate}`
      : Prisma.sql``;

    const rows = await this.db.$queryRaw<Array<{
      symbol: string;
      close: string;
      adjusted_close: string | null;
      rn: string;
    }>>(Prisma.sql`
      SELECT symbol, close::text, "adjustedClose"::text AS adjusted_close, rn
      FROM (
        SELECT
          symbol,
          close,
          "adjustedClose",
          ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) AS rn
        FROM price_ticks pt
        WHERE symbol = ANY(${symbols}::text[])
          AND source NOT LIKE 'TEST_%'
          ${endFilter}
      ) ranked
      WHERE rn <= 260
      ORDER BY symbol ASC, rn ASC
    `);

    // Group price rows by symbol (rn=1 is latest, rn=2 is previous, etc.)
    const pricesBySymbol = new Map<string, number[]>();
    for (const row of rows) {
      const price = Number(row.adjusted_close ?? row.close);
      if (!Number.isFinite(price) || price <= 0) continue;
      const arr = pricesBySymbol.get(row.symbol) ?? [];
      arr.push(price);
      pricesBySymbol.set(row.symbol, arr);
    }

    return stocks
      .map((stock: any) => {
        const prices = pricesBySymbol.get(stock.symbol) ?? [];
        return {
          instrumentId: stock.id,
          symbol: stock.symbol,
          marketCap: stock.marketCap !== null ? Number(stock.marketCap) : null,
          latest:   prices[0] ?? null,
          previous: prices[1] ?? null,
          prices,
        };
      })
      .filter((item) => item.prices.length >= 2); // need at least latest + previous
  }

  /**
   * CB-41/CB-42: Load closing prices for a named index symbol (e.g. ^NSEI, ^GSPC), most-recent first.
   * Used by the regime calculator to compute an index-trend term.
   * region filter prevents Nifty rows contaminating a US regime calc and vice-versa.
   * region defaults to undefined (no filter) for callers that do not pass a region.
   */
  async loadIndexPrices(symbol: string, limit: number, endDate?: Date, region?: string): Promise<number[]> {
    const rows = await this.db.priceTick.findMany({
      where: {
        symbol,
        ...(region ? { region: String(region).trim().toUpperCase() } : {}),
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

  /**
   * NR-104: Return up to `limit` persisted market-context snapshots for a region,
   * ordered oldest-to-newest (ascending by snapshotDate).
   * Persisted-read only — never generates or writes.
   */
  async breadthInternalsHistory(region: string = 'GLOBAL', limit: number = 60): Promise<Array<{
    snapshotDate: Date;
    breadthPercentAboveSma50: number | null;
    breadthPercentAboveSma200: number | null;
    advanceDeclineRatio: number | null;
    newHighCount: number | null;
    newLowCount: number | null;
    regimeScore: number;
    regime: string;
  }>> {
    const rows = await this.db.marketContextSnapshot.findMany({
      where: { region },
      orderBy: { snapshotDate: 'desc' },
      take: limit,
      select: {
        snapshotDate: true,
        breadthPercentAboveSma50: true,
        breadthPercentAboveSma200: true,
        advanceDeclineRatio: true,
        newHighCount: true,
        newLowCount: true,
        regimeScore: true,
        regime: true,
      },
    });
    // Return oldest → newest
    return rows.reverse();
  }

  /**
   * Returns the latest direction + score per instrument from the most-recent
   * signal-generation run for the given region.
   *
   * Semantics are identical to the former topSignals({ limit, region }) call on
   * SignalGenerationEngineService: fetch rows from the latest generatedDate batch,
   * deduplicate by instrumentId (keep first occurrence = highest score within batch),
   * and return up to `limit` results.
   *
   * No cross-module service import is needed — signal_results is a shared persisted
   * table that both modules are entitled to read directly.
   */
  async latestSignalDirections(
    region?: string,
    limit: number = 100,
  ): Promise<Array<{ instrumentId: string; direction: string; score: number }>> {
    const latestRun = await this.db.signalResult.findFirst({
      where: region ? { country: region } : undefined,
      orderBy: { generatedAt: 'desc' },
      select: { generatedDate: true },
    });
    if (!latestRun) return [];

    const rows = await this.db.signalResult.findMany({
      where: {
        generatedDate: latestRun.generatedDate,
        ...(region ? { country: region } : {}),
      },
      orderBy: { generatedAt: 'desc' },
      take: limit,
      select: { instrumentId: true, direction: true, score: true },
    });

    // Deduplicate: keep first (highest-score) occurrence per instrument within the batch.
    const seen = new Set<string>();
    const result: Array<{ instrumentId: string; direction: string; score: number }> = [];
    for (const row of rows) {
      if (!seen.has(row.instrumentId)) {
        seen.add(row.instrumentId);
        result.push({ instrumentId: row.instrumentId, direction: row.direction, score: Number(row.score) });
      }
    }
    return result;
  }

  private weakSectorSlice(sectors: SectorRotationItem[]) {
    if (sectors.length <= 1) return [];
    return sectors.slice(-Math.min(5, sectors.length - 1)).reverse();
  }
}
