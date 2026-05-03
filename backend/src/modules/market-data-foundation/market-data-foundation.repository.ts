import { Prisma, PrismaClient } from '@prisma/client';
import defaultPrisma from '../../db/prisma';
import type {
  CorporateAction,
  CreateStockRequest,
  CoreFundamentals,
  FxRateInput,
  HistoricalPrice,
  PaginationOptions,
  SyncSummary,
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
      country,
      exchange,
      assetType,
      currency,
      sector,
      industry,
      search,
    } = options;
    const skip = (page - 1) * pageSize;
    const where: Prisma.StockWhereInput = {};

    if (region) {
      where.region = region;
    }
    if (country) {
      where.country = { contains: country.trim(), mode: 'insensitive' };
    }
    if (exchange) {
      where.exchange = { contains: exchange.trim(), mode: 'insensitive' };
    }
    if (assetType) {
      where.assetType = { contains: assetType.trim(), mode: 'insensitive' };
    }
    if (currency) {
      where.currency = { contains: currency.trim(), mode: 'insensitive' };
    }
    if (sector) {
      where.sector = { contains: sector.trim(), mode: 'insensitive' };
    }
    if (industry) {
      where.industry = { contains: industry.trim(), mode: 'insensitive' };
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

  findStockBySymbolAndExchange(symbol: string, exchange: string) {
    return this.prisma.stock.findFirst({
      where: {
        symbol,
        exchange,
      },
    });
  }

  createStock(data: CreateStockRequest) {
    return this.prisma.stock.create({
      data: {
        symbol: data.symbol,
        name: data.name,
        region: data.region,
        exchange: data.exchange,
        country: data.country,
        sector: data.sector,
        industry: data.industry,
        currency: data.currency,
        marketCap: data.marketCap !== undefined && data.marketCap !== null ? new Prisma.Decimal(data.marketCap) : undefined,
        assetType: data.assetType,
        isDelisted: data.isDelisted ?? false,
        ipoDate: data.ipoDate,
        isin: data.isin,
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

  async listPrices(symbol: string, limit: number, startDate?: Date, endDate?: Date) {
    const prices = await this.prisma.priceTick.findMany({
      where: {
        symbol,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
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

    return prices.map((price) => ({
      ...price,
      open: price.open.toString(),
      high: price.high.toString(),
      low: price.low.toString(),
      close: price.close.toString(),
      adjustedClose: price.adjustedClose?.toString() ?? null,
      volume: price.volume !== null ? price.volume.toString() : null,
    }));
  }

  async latestPrice(symbol: string) {
    const latestTick = await this.prisma.priceTick.findFirst({
      where: { symbol },
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
      return {
        ...latestTick,
        open: latestTick.open.toString(),
        high: latestTick.high.toString(),
        low: latestTick.low.toString(),
        close: latestTick.close.toString(),
        adjustedClose: latestTick.adjustedClose?.toString() ?? null,
        volume: latestTick.volume !== null ? latestTick.volume.toString() : null,
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

  instrumentCount() {
    return this.prisma.stock.count();
  }

  async latestDataTimestamp() {
    const latestPrice = await this.prisma.priceTick.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });

    return latestPrice?.timestamp ?? null;
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

  async storeHistorical(
    prices: HistoricalPrice[],
    inferRegion: YahooFinanceIngestionService['inferRegion']
  ): Promise<SyncSummary> {
    const rowsReceived = prices.length;
    const validation = partitionHistoricalPrices(prices);
    const warnings = validation.invalid.flatMap((invalid) =>
      invalid.errors.map((error) => `${(invalid.item as HistoricalPrice)?.symbol || 'UNKNOWN'}: ${error}`)
    );
    if (validation.invalid.length > 0) {
      console.warn(`Skipped ${validation.invalid.length} malformed historical price rows before storage`);
    }
    prices = validation.valid;
    if (prices.length === 0) {
      return {
        rowsReceived,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: validation.invalid.length,
        warningCount: warnings.length,
        warnings: warnings.slice(0, 10),
      };
    }

    prices = prices.map((price) => ({ ...price, date: this.normalizeUtcDay(price.date) }));

    const regionInfo = inferRegion(prices[0].symbol);
    const latest = prices.reduce((prev, current) =>
      prev.date > current.date ? prev : current
    );
    const existingRows = await this.prisma.priceTick.findMany({
      where: {
        symbol: prices[0].symbol,
        timestamp: { in: prices.map((price) => price.date) },
      },
      select: { timestamp: true },
    });
    const existingTimestamps = new Set(existingRows.map((row) => row.timestamp.toISOString()));
    const rowsUpdated = prices.filter((price) => existingTimestamps.has(price.date.toISOString())).length;
    const rowsInserted = prices.length - rowsUpdated;

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
              adjustedClose: price.adjustedClose !== undefined && price.adjustedClose !== null ? new Prisma.Decimal(price.adjustedClose) : null,
              volume: price.volume !== undefined && price.volume !== null ? BigInt(price.volume) : null,
              source: 'yahoo',
              region: regionInfo.region,
              exchange: regionInfo.exchange,
              dataStatus: 'COMPLETE',
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
              adjustedClose: price.adjustedClose !== undefined && price.adjustedClose !== null ? new Prisma.Decimal(price.adjustedClose) : null,
              volume: price.volume !== undefined && price.volume !== null ? BigInt(price.volume) : null,
              source: 'yahoo',
              dataStatus: 'COMPLETE',
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
    return {
      rowsReceived,
      rowsInserted,
      rowsUpdated,
      rowsSkipped: validation.invalid.length,
      warningCount: warnings.length,
      warnings: warnings.slice(0, 10),
    };
  }

  async updateCompanyMasterData(stockId: string, data: Partial<CreateStockRequest>) {
    return this.prisma.stock.update({
      where: { id: stockId },
      data: {
        name: data.name,
        exchange: data.exchange,
        country: data.country,
        sector: data.sector,
        industry: data.industry,
        currency: data.currency,
        marketCap: data.marketCap !== undefined && data.marketCap !== null ? new Prisma.Decimal(data.marketCap) : undefined,
        assetType: data.assetType,
        isDelisted: data.isDelisted,
        ipoDate: data.ipoDate,
        isin: data.isin,
        source: 'yahoo',
        dataStatus: 'PARTIAL',
      },
    });
  }

  async upsertFundamentals(stockId: string, fundamentals: CoreFundamentals) {
    const periodEndDate = this.normalizePeriodEndDate(fundamentals.asOf);
    const dataStatus = fundamentals.revenue || fundamentals.earnings || fundamentals.eps || fundamentals.ratios.trailingPe
      ? 'PARTIAL'
      : 'MISSING';

    return (this.prisma as any).fundamental.upsert({
      where: {
        stockId_periodType_source: {
          stockId,
          periodType: fundamentals.periodType,
          source: fundamentals.source,
        },
      },
      update: {
        revenue: fundamentals.revenue !== null ? new Prisma.Decimal(fundamentals.revenue) : null,
        eps: fundamentals.eps !== null ? new Prisma.Decimal(fundamentals.eps) : null,
        netIncome: fundamentals.earnings !== null ? new Prisma.Decimal(fundamentals.earnings) : null,
        peRatio: fundamentals.ratios.trailingPe !== null ? new Prisma.Decimal(fundamentals.ratios.trailingPe) : null,
        dividendYield: fundamentals.dividendYield !== null ? new Prisma.Decimal(fundamentals.dividendYield) : null,
        sharesOutstanding: fundamentals.sharesOutstanding !== null ? BigInt(Math.trunc(fundamentals.sharesOutstanding)) : null,
        marketCap: fundamentals.marketCap !== null ? new Prisma.Decimal(fundamentals.marketCap) : null,
        currency: fundamentals.currency,
        periodEndDate,
        dataStatus,
      },
      create: {
        stockId,
        revenue: fundamentals.revenue !== null ? new Prisma.Decimal(fundamentals.revenue) : null,
        eps: fundamentals.eps !== null ? new Prisma.Decimal(fundamentals.eps) : null,
        netIncome: fundamentals.earnings !== null ? new Prisma.Decimal(fundamentals.earnings) : null,
        peRatio: fundamentals.ratios.trailingPe !== null ? new Prisma.Decimal(fundamentals.ratios.trailingPe) : null,
        dividendYield: fundamentals.dividendYield !== null ? new Prisma.Decimal(fundamentals.dividendYield) : null,
        sharesOutstanding: fundamentals.sharesOutstanding !== null ? BigInt(Math.trunc(fundamentals.sharesOutstanding)) : null,
        marketCap: fundamentals.marketCap !== null ? new Prisma.Decimal(fundamentals.marketCap) : null,
        currency: fundamentals.currency,
        periodType: fundamentals.periodType,
        periodEndDate,
        source: fundamentals.source,
        dataStatus,
      },
    });
  }

  async listFundamentals(stockId: string) {
    return (this.prisma as any).fundamental.findMany({
      where: { stockId },
      orderBy: { periodEndDate: 'desc' },
    });
  }

  async upsertCorporateActions(stockId: string, actions: CorporateAction[]) {
    const operations = actions.map((action) => {
      const effectiveDate = this.normalizeUtcDay(action.date);
      return (this.prisma as any).corporateAction.upsert({
        where: {
          stockId_actionType_effectiveDate_source: {
            stockId,
            actionType: action.type,
            effectiveDate,
            source: action.source,
          },
        },
        update: {
          declaredDate: action.declaredDate ? new Date(action.declaredDate) : null,
          paymentDate: action.paymentDate ? new Date(action.paymentDate) : null,
          amount: action.amount !== undefined && action.amount !== null ? new Prisma.Decimal(action.amount) : null,
          splitRatio: action.splitRatio !== undefined && action.splitRatio !== null ? new Prisma.Decimal(action.splitRatio) : null,
          currency: action.currency ?? null,
          dataStatus: 'COMPLETE',
        },
        create: {
          stockId,
          actionType: action.type,
          effectiveDate,
          declaredDate: action.declaredDate ? new Date(action.declaredDate) : null,
          paymentDate: action.paymentDate ? new Date(action.paymentDate) : null,
          amount: action.amount !== undefined && action.amount !== null ? new Prisma.Decimal(action.amount) : null,
          splitRatio: action.splitRatio !== undefined && action.splitRatio !== null ? new Prisma.Decimal(action.splitRatio) : null,
          currency: action.currency ?? null,
          source: action.source,
          dataStatus: 'COMPLETE',
        },
      });
    });

    return Promise.all(operations);
  }

  async listCorporateActions(stockId: string) {
    return (this.prisma as any).corporateAction.findMany({
      where: { stockId },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async upsertFxRate(input: FxRateInput) {
    return (this.prisma as any).fxRate.upsert({
      where: { pair: input.pair },
      update: {
        rate: new Prisma.Decimal(input.rate),
        rateTimestamp: input.rateTimestamp,
        source: input.source,
        dataStatus: input.dataStatus ?? 'COMPLETE',
      },
      create: {
        pair: input.pair,
        baseCurrency: input.baseCurrency,
        quoteCurrency: input.quoteCurrency,
        rate: new Prisma.Decimal(input.rate),
        rateTimestamp: input.rateTimestamp,
        source: input.source,
        dataStatus: input.dataStatus ?? 'COMPLETE',
      },
    });
  }

  async listFxRates() {
    return (this.prisma as any).fxRate.findMany({ orderBy: { pair: 'asc' } });
  }

  async findFxRate(pair: string) {
    return (this.prisma as any).fxRate.findUnique({ where: { pair } });
  }

  private normalizePeriodEndDate(value: string | Date): Date {
    return this.normalizeUtcDay(value);
  }

  private normalizeUtcDay(value: string | Date): Date {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }
}
