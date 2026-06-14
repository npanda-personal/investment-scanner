import { Prisma, PrismaClient } from '@prisma/client';
import type { PaginationOptions } from '../market-data-foundation.types';
import { computeAdjustmentFactor, normalizeUtcDay } from './market-data-foundation.repository.helpers';
import { scopedStockSqlWhere, stockWhere } from './market-data-foundation.repository.query-scope';

export type DeliverySnapshotInput = {
  stockId: string;
  symbol: string;
  exchange: string;
  tradingDate: Date;
  tradedQuantity?: number | null;
  deliverableQuantity?: number | null;
  deliveryPercent?: number | null;
  source: string;
  sourceFileImportId?: string | null;
};

export class PriceReadsRepository {
  constructor(private readonly prisma: PrismaClient) {}



  async listPrices(symbol: string, limit: number, startDate?: Date, endDate?: Date) {
    const prices = await this.prisma.priceTick.findMany({
      where: {
        symbol,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        source: { not: { startsWith: 'TEST_' } },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        timestamp: true,
        open: true,
        high: true,
        low: true,
        close: true,
        adjustedClose: true,
        volume: true,
        region: true,
        exchange: true,
        source: true,
        ingestionTimestamp: true,
        lastUpdatedTimestamp: true,
        dataStatus: true,
      },
    });

    return prices.map((price) => {
      const factor = computeAdjustmentFactor(price.close, price.adjustedClose);
      return {
        ...price,
        open: price.open.toString(),
        high: price.high.toString(),
        low: price.low.toString(),
        close: price.close.toString(),
        adjustedClose: price.adjustedClose?.toString() ?? null,
        volume: price.volume !== null ? price.volume.toString() : null,
        adjustmentFactor: factor,
        adjustedOpen: Number((Number(price.open) * factor).toFixed(4)),
        adjustedHigh: Number((Number(price.high) * factor).toFixed(4)),
        adjustedLow: Number((Number(price.low) * factor).toFixed(4)),
        adjustedVolume: price.volume !== null ? Number((Number(price.volume) / factor).toFixed(0)) : null,
      };
    });
  }



  async listForwardPriceWindowsByInstrumentIds(
    instrumentIds: string[],
    startDate: Date,
    options: Pick<PaginationOptions, 'region' | 'assetType'> = {}
  ) {
    const uniqueIds = [...new Set(instrumentIds.filter(Boolean))];
    if (uniqueIds.length === 0) return new Map<string, any[]>();

    const stocks = await this.prisma.stock.findMany({
      where: { ...stockWhere(options), id: { in: uniqueIds } },
      select: { id: true, symbol: true },
    });
    if (stocks.length === 0) return new Map<string, any[]>();

    const symbolByInstrumentId = new Map(stocks.map((stock) => [stock.id, stock.symbol]));
    const instrumentIdBySymbol = new Map(stocks.map((stock) => [stock.symbol, stock.id]));
    const prices = await this.prisma.priceTick.findMany({
      where: {
        symbol: { in: stocks.map((stock) => stock.symbol) },
        timestamp: { gte: startDate },
        source: { not: { startsWith: 'TEST_' } },
      },
      orderBy: [{ symbol: 'asc' }, { timestamp: 'asc' }],
      select: {
        symbol: true,
        timestamp: true,
        close: true,
        adjustedClose: true,
      },
    });

    const byInstrumentId = new Map(uniqueIds.map((id) => [id, [] as any[]]));
    for (const price of prices) {
      const instrumentId = instrumentIdBySymbol.get(price.symbol);
      if (!instrumentId) continue;
      byInstrumentId.get(instrumentId)?.push({
        date: price.timestamp,
        close: price.close.toString(),
        adjusted_close: price.adjustedClose?.toString() ?? price.close.toString(),
      });
    }

    for (const [instrumentId] of symbolByInstrumentId) {
      if (!byInstrumentId.has(instrumentId)) byInstrumentId.set(instrumentId, []);
    }
    return byInstrumentId;
  }



  async latestPrice(symbol: string) {
    const latestTick = await this.prisma.priceTick.findFirst({
      where: { symbol, source: { not: { startsWith: 'TEST_' } } },
      orderBy: { timestamp: 'desc' },
      select: {
        timestamp: true,
        open: true,
        high: true,
        low: true,
        close: true,
        adjustedClose: true,
        volume: true,
        region: true,
        exchange: true,
        source: true,
        ingestionTimestamp: true,
        lastUpdatedTimestamp: true,
        dataStatus: true,
      },
    });

    if (latestTick) {
      const factor = computeAdjustmentFactor(latestTick.close, latestTick.adjustedClose);
      return {
        ...latestTick,
        open: latestTick.open.toString(),
        high: latestTick.high.toString(),
        low: latestTick.low.toString(),
        close: latestTick.close.toString(),
        adjustedClose: latestTick.adjustedClose?.toString() ?? null,
        volume: latestTick.volume !== null ? latestTick.volume.toString() : null,
        adjustmentFactor: factor,
        adjustedOpen: Number((Number(latestTick.open) * factor).toFixed(4)),
        adjustedHigh: Number((Number(latestTick.high) * factor).toFixed(4)),
        adjustedLow: Number((Number(latestTick.low) * factor).toFixed(4)),
        adjustedVolume: latestTick.volume !== null ? Number((Number(latestTick.volume) / factor).toFixed(0)) : null,
      };
    }

    const latestPrice = await this.prisma.latestPrice.findUnique({
      where: { symbol },
    });
    if (!latestPrice) {
      return null;
    }

    return {
      timestamp: latestPrice.timestamp,
      open: null,
      high: null,
      low: null,
      close: latestPrice.price.toString(),
      adjustedClose: latestPrice.price.toString(),
      volume: null,
      region: latestPrice.region,
      exchange: null,
      source: 'latest_prices',
      ingestionTimestamp: latestPrice.updatedAt,
      lastUpdatedTimestamp: latestPrice.updatedAt,
      dataStatus: 'PARTIAL',
    };
  }



  async latestDataTimestamp(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    // Read freshness from latest_prices (one row per symbol, ~16K rows) instead of scanning
    // the price_ticks hypertable (~39M rows). latest_prices is the canonical "newest price per
    // symbol" the ingestion pipeline rebuilds after every load, so MAX(timestamp) over it is
    // exactly the freshness signal this metric needs — ~30ms vs the prior 14–80s scan that made
    // the Data Health tab appear stuck under shared-DB contention. TEST symbols are excluded to
    // preserve the original query's intent (latest_prices has no source column).
    const rows = await this.prisma.$queryRaw<Array<{ timestamp: Date | null }>>(Prisma.sql`
      SELECT MAX(latest_prices.timestamp) AS timestamp
      FROM latest_prices
      INNER JOIN stocks ON stocks.symbol = latest_prices.symbol
      WHERE ${scopedStockSqlWhere(options)}
        AND UPPER(latest_prices.symbol) NOT LIKE 'TEST\\_%'
        AND latest_prices.timestamp <= NOW()
    `);

    return rows[0]?.timestamp ?? null;
  }



  async latestStoredTradingDateForRegion(region: string, assetType: string): Promise<string | null> {
    const latest = await this.latestDataTimestamp({ region, assetType });
    return latest?.toISOString().slice(0, 10) ?? null;
  }



  async latestPriceExists(symbol: string): Promise<boolean> {
    const row = await this.prisma.latestPrice.findUnique({
      where: { symbol },
      select: { symbol: true },
    });
    return Boolean(row);
  }



  async reassignPriceRowsToCanonicalSymbol(input: {
    stockId: string;
    fromSymbol: string;
    toSymbol: string;
  }): Promise<{ priceRowsMoved: number; latestPricesMoved: number }> {
    return this.prisma.$transaction(async (tx) => {
      const [targetLatest, canonicalPriceRows] = await Promise.all([
        tx.latestPrice.findUnique({ where: { symbol: input.toSymbol }, select: { symbol: true } }),
        tx.priceTick.count({ where: { symbol: input.toSymbol } }),
      ]);
      if (targetLatest) {
        throw new Error(`TARGET_LATEST_PRICE_COLLISION: ${input.toSymbol} already has latest price.`);
      }
      if (canonicalPriceRows > 0) {
        throw new Error(`CANONICAL_PRICE_ROWS_EXIST: ${input.toSymbol} already has price rows.`);
      }

      const priceRows = await tx.priceTick.updateMany({
        where: { symbol: input.fromSymbol },
        data: { symbol: input.toSymbol },
      });
      const latestRows = await tx.latestPrice.updateMany({
        where: { symbol: input.fromSymbol },
        data: { symbol: input.toSymbol },
      });
      if (priceRows.count > 0) {
        await tx.stock.update({
          where: { id: input.stockId },
          data: { lastSuccessfulDataLoadTimestamp: new Date() },
        });
      }

      return {
        priceRowsMoved: priceRows.count,
        latestPricesMoved: latestRows.count,
      };
    });
  }



  async priceCoverage(symbol: string) {
    const [count, oldest, latest] = await Promise.all([
      this.prisma.priceTick.count({ where: { symbol } }),
      this.prisma.priceTick.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true },
      }),
      this.prisma.priceTick.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      }),
    ]);

    return {
      count,
      oldestTimestamp: oldest?.timestamp ?? null,
      latestTimestamp: latest?.timestamp ?? null,
    };
  }



  async upsertDeliverySnapshots(snapshots: DeliverySnapshotInput[]): Promise<{ insertedOrUpdated: number }> {
    let insertedOrUpdated = 0;
    for (const snapshot of snapshots) {
      const tradingDate = normalizeUtcDay(snapshot.tradingDate);
      const data = {
        stockId: snapshot.stockId,
        symbol: snapshot.symbol,
        exchange: snapshot.exchange,
        tradingDate,
        tradedQuantity: snapshot.tradedQuantity === null || snapshot.tradedQuantity === undefined ? null : BigInt(Math.trunc(snapshot.tradedQuantity)),
        deliverableQuantity: snapshot.deliverableQuantity === null || snapshot.deliverableQuantity === undefined ? null : BigInt(Math.trunc(snapshot.deliverableQuantity)),
        deliveryPercent: snapshot.deliveryPercent ?? null,
        source: snapshot.source,
        sourceFileImportId: snapshot.sourceFileImportId ?? null,
      };
      await (this.prisma as any).marketDeliverySnapshot.upsert({
        where: {
          stockId_exchange_tradingDate_source: {
            stockId: snapshot.stockId,
            exchange: snapshot.exchange,
            tradingDate,
            source: snapshot.source,
          },
        },
        create: data,
        update: {
          symbol: snapshot.symbol,
          tradedQuantity: data.tradedQuantity,
          deliverableQuantity: data.deliverableQuantity,
          deliveryPercent: data.deliveryPercent,
          sourceFileImportId: data.sourceFileImportId,
        },
      });
      insertedOrUpdated += 1;
    }
    return { insertedOrUpdated };
  }



  /**
   * Returns the latest delivery% snapshot for a given symbol, plus the prior N-1 rows.
   * Persisted-read only — never triggers any computation.
   * Returns null rows when delivery data is absent (source only covers NSE stocks; BSE/others will be null).
   *
   * @param symbol  Canonical stock symbol (no .NS/.BO suffix)
   * @param limit   How many recent trading-day rows to return (default 5, max 20)
   * @param endDate When provided, only rows with tradingDate <= endDate are returned (as-of support)
   */
  async getRecentDeliveryBySymbol(
    symbol: string,
    limit = 5,
    endDate?: Date,
  ): Promise<Array<{
    tradingDate: Date;
    tradedQuantity: bigint | null;
    deliverableQuantity: bigint | null;
    deliveryPercent: number | null;
    source: string;
  }>> {
    const take = Math.max(1, Math.min(limit, 20));
    const rows = await (this.prisma as any).marketDeliverySnapshot.findMany({
      where: {
        symbol,
        ...(endDate ? { tradingDate: { lte: endDate } } : {}),
      },
      orderBy: { tradingDate: 'desc' },
      take,
      select: {
        tradingDate: true,
        tradedQuantity: true,
        deliverableQuantity: true,
        deliveryPercent: true,
        source: true,
      },
    });
    return rows.map((row: any) => ({
      tradingDate: row.tradingDate as Date,
      tradedQuantity: row.tradedQuantity as bigint | null,
      deliverableQuantity: row.deliverableQuantity as bigint | null,
      deliveryPercent: row.deliveryPercent !== null && row.deliveryPercent !== undefined
        ? Number(row.deliveryPercent)
        : null,
      source: row.source as string,
    }));
  }
}
