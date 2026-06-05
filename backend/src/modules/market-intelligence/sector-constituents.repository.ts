import { PrismaClient } from '@prisma/client';
import defaultPrisma from '../../db/prisma';

/**
 * Maps Nifty sector index names (used by sector_snapshots) to Yahoo Finance
 * sector taxonomy (used by the stocks catalog). The sector intelligence snapshot
 * is built from Nifty index prices, so its sector codes differ from stock metadata.
 * Exact match is tried first; if empty, all mapped names are tried as an OR filter.
 */
const SECTOR_INDEX_TO_CATALOG: Record<string, string[]> = {
  'IT': ['Information Technology', 'Technology'],
  'Bank': ['Financial Services'],
  'Private Bank': ['Financial Services'],
  'PSU Bank': ['Financial Services'],
  'Financial Services': ['Financial Services'],
  'Pharma': ['Healthcare'],
  'Healthcare': ['Healthcare'],
  'Auto': ['Consumer Cyclical'],
  'Metal': ['Basic Materials'],
  'Energy': ['Energy'],
  'Oil & Gas': ['Energy'],
  'Media': ['Communication Services'],
  'FMCG': ['Consumer Defensive'],
  'Consumer Durables': ['Consumer Cyclical', 'Consumer Defensive'],
  'Realty': ['Real Estate'],
  'Infrastructure': ['Industrials'],
  'Commodities': ['Basic Materials'],
};

export interface SectorConstituentRow {
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  marketCap: number | null;
  latestPrice: number | null;
  latestPriceTimestamp: string | null;
  return1W: number | null;
  return1M: number | null;
  signalDirection: string | null;
  signalScore: number | null;
  relativeStrength: number | null;
}

const CONSTITUENT_PRICE_SOURCES = [
  'NSE',
  'NSE_CM',
  'NSE_CM_UDIFF',
  'NSE_CM_UDIFF_BHAVCOPY',
  'NSE_UDIFF_CM_BHAVCOPY',
  'NSE_SECURITY_BHAVDATA',
  'BSE',
  'BSE_CM',
  'BSE_CM_BHAVCOPY',
  'BSE_CM_BACKUP_BHAVCOPY',
  'BSE_UDIFF_CM_BHAVCOPY',
];

const CONSTITUENT_LIMIT = 30;

export class SectorConstituentsRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /**
   * Resolve a sector name (which may be a Nifty index sector name like "IT" or a
   * Yahoo Finance name like "Technology") to the set of catalog sector values to query.
   * Tries an exact match first; falls back to mapped names if no stocks are found.
   */
  private resolveSectorNames(sector: string): string[] {
    const mapped = SECTOR_INDEX_TO_CATALOG[sector];
    if (mapped && mapped.length > 0) {
      return [sector, ...mapped];
    }
    return [sector];
  }

  async constituentsForSector(query: {
    sector: string;
    region: string;
    assetType: string;
  }): Promise<SectorConstituentRow[]> {
    const sectorNames = this.resolveSectorNames(query.sector);

    // 1. Load mainboard stocks for this sector (ordered by market cap desc)
    // Try exact match first; if empty try all resolved names (handles Nifty→Yahoo mapping).
    let stocks = await this.db.stock.findMany({
      where: {
        sector: query.sector,
        region: query.region,
        assetType: query.assetType,
        isActive: true,
        isDelisted: false,
      },
      orderBy: [{ marketCap: 'desc' }, { symbol: 'asc' }],
      take: CONSTITUENT_LIMIT,
      select: { id: true, symbol: true, name: true, marketCap: true },
    });

    if (stocks.length === 0 && sectorNames.length > 1) {
      stocks = await this.db.stock.findMany({
        where: {
          sector: { in: sectorNames },
          region: query.region,
          assetType: query.assetType,
          isActive: true,
          isDelisted: false,
        },
        orderBy: [{ marketCap: 'desc' }, { symbol: 'asc' }],
        take: CONSTITUENT_LIMIT,
        select: { id: true, symbol: true, name: true, marketCap: true },
      });
    }

    if (stocks.length === 0) return [];

    const symbols = stocks.map((s) => s.symbol);

    // 2. Latest prices
    const latestPrices = await this.db.latestPrice.findMany({
      where: {
        symbol: { in: symbols },
        OR: [{ region: query.region }, { region: null }],
      },
      select: { symbol: true, price: true, timestamp: true },
    });
    const latestPriceBySymbol = new Map<string, { price: number; timestamp: Date }>();
    for (const lp of latestPrices) {
      const existing = latestPriceBySymbol.get(lp.symbol);
      const ts = new Date(lp.timestamp).getTime();
      if (!existing || ts > new Date(existing.timestamp).getTime()) {
        latestPriceBySymbol.set(lp.symbol, {
          price: Number(lp.price),
          timestamp: new Date(lp.timestamp),
        });
      }
    }

    // 3. Price history for 1W/1M return computation (35 calendar days covers weekends/holidays)
    const since = new Date();
    since.setDate(since.getDate() - 35);

    const priceTicks = await this.db.priceTick.findMany({
      where: {
        symbol: { in: symbols },
        source: { in: CONSTITUENT_PRICE_SOURCES },
        timestamp: { gte: since },
      },
      orderBy: [{ symbol: 'asc' }, { timestamp: 'asc' }],
      select: { symbol: true, timestamp: true, adjustedClose: true, close: true },
    });

    // Group bars by symbol
    const barsBySymbol = new Map<string, Array<{ timestamp: Date; close: number }>>();
    for (const tick of priceTicks) {
      const close = tick.adjustedClose !== null ? Number(tick.adjustedClose) : Number(tick.close);
      if (!Number.isFinite(close) || close <= 0) continue;
      const arr = barsBySymbol.get(tick.symbol) ?? [];
      arr.push({ timestamp: new Date(tick.timestamp), close });
      barsBySymbol.set(tick.symbol, arr);
    }

    // 4. Latest signal per instrument (most recent generatedDate, any direction)
    const signalRows = await this.db.signalResult.findMany({
      where: {
        instrumentId: { in: stocks.map((s) => s.id) },
      },
      orderBy: [{ instrumentId: 'asc' }, { generatedDate: 'desc' }],
      distinct: ['instrumentId'],
      select: {
        instrumentId: true,
        direction: true,
        score: true,
      },
    });
    const signalByInstrument = new Map<string, { direction: string; score: number }>();
    for (const sig of signalRows) {
      signalByInstrument.set(sig.instrumentId, {
        direction: sig.direction,
        score: Number(sig.score),
      });
    }

    // 5. Assemble rows
    return stocks.map((stock): SectorConstituentRow => {
      const latest = latestPriceBySymbol.get(stock.symbol);
      const bars = barsBySymbol.get(stock.symbol) ?? [];
      const signal = signalByInstrument.get(stock.id) ?? null;

      const return1W = this.computeReturn(bars, 7, latest?.price ?? null);
      const return1M = this.computeReturn(bars, 30, latest?.price ?? null);

      return {
        instrumentId: stock.id,
        symbol: stock.symbol,
        companyName: stock.name ?? null,
        marketCap: stock.marketCap !== null ? Number(stock.marketCap) : null,
        latestPrice: latest?.price ?? null,
        latestPriceTimestamp: latest?.timestamp?.toISOString() ?? null,
        return1W,
        return1M,
        signalDirection: signal?.direction ?? null,
        signalScore: signal?.score ?? null,
        relativeStrength: null, // placeholder — RS requires benchmark series
      };
    });
  }

  /**
   * Compute percent return over the past N calendar days using adjusted closes.
   * Uses the earliest bar at or after `daysBack` days ago as the base price,
   * and either the latestPrice (from LatestPrice table) or the most recent bar close.
   */
  private computeReturn(
    bars: Array<{ timestamp: Date; close: number }>,
    daysBack: number,
    latestOverride: number | null
  ): number | null {
    if (bars.length === 0) return null;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);

    // Base = first bar whose timestamp is <= cutoff (go earlier than cutoff, take the latest of those)
    const baseBars = bars.filter((b) => b.timestamp <= cutoff);
    if (baseBars.length === 0) return null;
    const baseClose = baseBars[baseBars.length - 1].close;

    const endClose = latestOverride !== null && Number.isFinite(latestOverride) && latestOverride > 0
      ? latestOverride
      : bars[bars.length - 1].close;

    if (!Number.isFinite(baseClose) || baseClose <= 0) return null;
    if (!Number.isFinite(endClose) || endClose <= 0) return null;

    return ((endClose - baseClose) / baseClose) * 100;
  }
}
