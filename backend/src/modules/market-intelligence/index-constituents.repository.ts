import { PrismaClient } from '@prisma/client';
import defaultPrisma from '../../db/prisma';
import type { IndexConstituentRow } from './index-constituents.types';

const EXCHANGE_PRICE_SOURCES = [
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
  'YAHOO_EOD', // US/EU exchange EOD (Yahoo provider) — needed for non-IN index constituents
];

/**
 * Reads all persisted data needed to render index constituents.
 * Pure read — no writes, no live calculations.
 */
export class IndexConstituentsRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async loadConstituents(symbols: readonly string[], region: string = 'IN'): Promise<IndexConstituentRow[]> {
    if (symbols.length === 0) return [];

    const symbolList = [...symbols];
    const normalizedRegion = String(region || 'IN').trim().toUpperCase() || 'IN';

    // 1. Catalog: resolve symbol → id, name, sector, marketCap (region-scoped — the
    // index belongs to a region, e.g. S&P 500 → US, Nifty 50 → IN).
    const stocks = await this.db.stock.findMany({
      where: {
        symbol: { in: symbolList },
        region: normalizedRegion,
        isDelisted: false,
      },
      select: {
        id: true,
        symbol: true,
        name: true,
        sector: true,
        marketCap: true,
      },
    });
    const stockBySymbol = new Map<string, typeof stocks[number]>();
    for (const s of stocks) {
      stockBySymbol.set(s.symbol, s);
    }

    // 2. Latest prices
    const latestPrices = await this.db.latestPrice.findMany({
      where: { symbol: { in: symbolList } },
      select: { symbol: true, price: true, timestamp: true },
    });
    const latestBySymbol = new Map<string, { price: number; timestamp: Date }>();
    for (const lp of latestPrices) {
      const existing = latestBySymbol.get(lp.symbol);
      const ts = new Date(lp.timestamp).getTime();
      if (!existing || ts > new Date(existing.timestamp).getTime()) {
        latestBySymbol.set(lp.symbol, { price: Number(lp.price), timestamp: new Date(lp.timestamp) });
      }
    }

    // 3. Price ticks — last 5 trading days (10 calendar days covers weekends)
    //    We need: today's close (latest bar) and the prior bar to compute 1D %.
    const since = new Date();
    since.setDate(since.getDate() - 10);

    const recentTicks = await this.db.priceTick.findMany({
      where: {
        symbol: { in: symbolList },
        source: { in: EXCHANGE_PRICE_SOURCES },
        timestamp: { gte: since },
      },
      orderBy: [{ symbol: 'asc' }, { timestamp: 'asc' }],
      select: { symbol: true, timestamp: true, adjustedClose: true, close: true },
    });

    // Group and find last 2 bars per symbol
    const barsBySymbol = new Map<string, Array<{ timestamp: Date; close: number }>>();
    for (const tick of recentTicks) {
      const close = tick.adjustedClose !== null ? Number(tick.adjustedClose) : Number(tick.close);
      if (!Number.isFinite(close) || close <= 0) continue;
      const arr = barsBySymbol.get(tick.symbol) ?? [];
      arr.push({ timestamp: new Date(tick.timestamp), close });
      barsBySymbol.set(tick.symbol, arr);
    }

    // 4. Latest signal per instrument (persisted read — most recent generatedDate)
    const instrumentIds = stocks.map((s) => s.id);
    const signalRows = instrumentIds.length === 0 ? [] : await this.db.signalResult.findMany({
      where: { instrumentId: { in: instrumentIds } },
      orderBy: [{ instrumentId: 'asc' }, { generatedDate: 'desc' }],
      distinct: ['instrumentId'],
      select: { instrumentId: true, direction: true, score: true },
    });
    const signalByInstrumentId = new Map<string, { direction: string; score: number }>();
    for (const sig of signalRows) {
      signalByInstrumentId.set(sig.instrumentId, { direction: sig.direction, score: Number(sig.score) });
    }

    // 5. Assemble one row per symbol in the original member order
    return symbolList.map((symbol): IndexConstituentRow => {
      const stock = stockBySymbol.get(symbol);
      const latest = latestBySymbol.get(symbol);
      const bars = barsBySymbol.get(symbol) ?? [];
      const signal = stock ? (signalByInstrumentId.get(stock.id) ?? null) : null;

      // 1D change: last bar vs second-to-last bar (or null when insufficient history)
      let change1D: number | null = null;
      if (bars.length >= 2) {
        const prev = bars[bars.length - 2].close;
        const curr = bars[bars.length - 1].close;
        if (prev > 0 && curr > 0) {
          change1D = ((curr - prev) / prev) * 100;
        }
      }

      return {
        instrumentId: stock?.id ?? null,
        symbol,
        companyName: stock?.name ?? null,
        sector: stock?.sector ?? null,
        marketCap: stock?.marketCap !== undefined && stock.marketCap !== null ? Number(stock.marketCap) : null,
        latestPrice: latest?.price ?? null,
        latestPriceTimestamp: latest?.timestamp?.toISOString() ?? null,
        change1D,
        signalDirection: signal?.direction ?? null,
        signalScore: signal?.score ?? null,
      };
    });
  }
}
