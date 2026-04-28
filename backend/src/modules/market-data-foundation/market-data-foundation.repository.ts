import { Prisma, PrismaClient } from '@prisma/client';
import defaultPrisma from '../../db/prisma';
import type {
  CreateStockRequest,
  HistoricalPrice,
  PaginationOptions,
  UpdateStockRequest,
} from './market-data-foundation.types';
import { partitionHistoricalPrices } from './market-data-foundation.validation';
import type { YahooFinanceIngestionService } from './market-data-foundation.provider';

export class MarketDataFoundationRepository {
  constructor(public readonly prisma: PrismaClient = defaultPrisma) {}

  async listStocks(options: PaginationOptions) {
    const {
      page,
      pageSize,
      sortBy = 'symbol',
      sortOrder = 'asc',
      region,
      search,
    } = options;
    const skip = (page - 1) * pageSize;
    const where: Prisma.StockWhereInput = {};

    if (region) {
      where.region = region;
    }
    if (search) {
      where.OR = [
        { symbol: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [stocks, total] = await Promise.all([
      this.prisma.stock.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
      }),
      this.prisma.stock.count({ where }),
    ]);

    return {
      stocks,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  findStockById(id: string) {
    return this.prisma.stock.findUnique({ where: { id } });
  }

  findStockBySymbol(symbol: string) {
    return this.prisma.stock.findUnique({ where: { symbol } });
  }

  createStock(data: CreateStockRequest) {
    return this.prisma.stock.create({
      data: {
        symbol: data.symbol,
        name: data.name,
        region: data.region,
        exchange: data.exchange,
        isActive: true,
        lastSuccessfulDataLoadTimestamp: null,
      },
    });
  }

  updateStock(id: string, data: UpdateStockRequest) {
    return this.prisma.stock.update({ where: { id }, data });
  }

  deleteStock(id: string) {
    return this.prisma.stock.delete({ where: { id } });
  }

  async toggleStockActive(id: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { id },
      select: { isActive: true },
    });
    if (!stock) {
      throw new Error('Stock not found');
    }
    return this.prisma.stock.update({
      where: { id },
      data: { isActive: !stock.isActive },
    });
  }

  searchStocks(query: string, take = 10) {
    return this.prisma.stock.findMany({
      where: {
        OR: [
          { symbol: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      take,
    });
  }

  listActiveStockSyncTasks() {
    return this.prisma.stock.findMany({
      where: { isActive: true },
      select: { id: true, symbol: true, lastSuccessfulDataLoadTimestamp: true },
    });
  }

  updateStockLoadTimestampById(id: string, timestamp = new Date()) {
    return this.prisma.stock.update({
      where: { id },
      data: { lastSuccessfulDataLoadTimestamp: timestamp },
    });
  }

  updateStockLoadTimestampBySymbol(symbol: string, timestamp = new Date()) {
    return this.prisma.stock.update({
      where: { symbol },
      data: { lastSuccessfulDataLoadTimestamp: timestamp },
    });
  }

  async listPrices(symbol: string, limit: number) {
    const prices = await this.prisma.priceTick.findMany({
      where: { symbol },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        timestamp: true,
        open: true,
        high: true,
        low: true,
        close: true,
        volume: true,
        region: true,
        exchange: true,
      },
    });

    return prices.map((price) => ({
      ...price,
      open: price.open.toString(),
      high: price.high.toString(),
      low: price.low.toString(),
      close: price.close.toString(),
      volume: price.volume !== null ? price.volume.toString() : null,
    }));
  }

  async storeHistorical(
    prices: HistoricalPrice[],
    inferRegion: YahooFinanceIngestionService['inferRegion']
  ): Promise<void> {
    const validation = partitionHistoricalPrices(prices);
    if (validation.invalid.length > 0) {
      console.warn(`Skipped ${validation.invalid.length} malformed historical price rows before storage`);
    }
    prices = validation.valid;
    if (prices.length === 0) return;

    const regionInfo = inferRegion(prices[0].symbol);
    const latest = prices.reduce((prev, current) =>
      prev.date > current.date ? prev : current
    );

    console.log(`  Storing ${prices.length} price ticks for ${prices[0].symbol}...`);

    await this.prisma.$transaction(async (tx: any) => {
      const batchSize = 100;
      for (let i = 0; i < prices.length; i += batchSize) {
        const batch = prices.slice(i, i + batchSize);
        const upsertOperations = batch.map(price =>
          tx.priceTick.upsert({
            where: {
              symbol_timestamp: {
                symbol: price.symbol,
                timestamp: price.date,
              },
            },
            update: {
              open: new Prisma.Decimal(price.open),
              high: new Prisma.Decimal(price.high),
              low: new Prisma.Decimal(price.low),
              close: new Prisma.Decimal(price.close),
              volume: price.volume ? BigInt(price.volume) : null,
              source: 'yahoo',
              region: regionInfo.region,
              exchange: regionInfo.exchange,
            },
            create: {
              symbol: price.symbol,
              region: regionInfo.region,
              exchange: regionInfo.exchange,
              timestamp: price.date,
              open: new Prisma.Decimal(price.open),
              high: new Prisma.Decimal(price.high),
              low: new Prisma.Decimal(price.low),
              close: new Prisma.Decimal(price.close),
              volume: price.volume ? BigInt(price.volume) : null,
              source: 'yahoo',
            },
          })
        );

        await Promise.all(upsertOperations);

        if (batch.length === batchSize) {
          console.log(`    Processed ${i + batchSize} of ${prices.length} records...`);
        }
      }

      await tx.latestPrice.upsert({
        where: { symbol: latest.symbol },
        update: {
          region: regionInfo.region,
          price: new Prisma.Decimal(latest.close),
          timestamp: latest.date,
          updatedAt: new Date(),
        },
        create: {
          symbol: latest.symbol,
          region: regionInfo.region,
          price: new Prisma.Decimal(latest.close),
          timestamp: latest.date,
          updatedAt: new Date(),
        },
      });
    }, {
      maxWait: 30000,
      timeout: 60000,
    });

    console.log(`  Successfully stored ${prices.length} price ticks for ${prices[0].symbol}`);
  }
}
