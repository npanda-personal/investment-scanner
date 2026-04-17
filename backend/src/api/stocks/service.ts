import { PrismaClient } from '@prisma/client';
import defaultPrisma from '../../db/prisma';
import { YahooFinanceIngestionService } from '../../data/ingestion/yahoo.service';
import type { SearchResult } from '../../data/ingestion/yahoo.service';
import { enqueueIngestionJob } from '../../queue/ingestion.queue';

export interface CreateStockRequest {
  symbol: string;
  name: string;
  region: string;
  exchange?: string;
}

export interface UpdateStockRequest {
  name?: string;
  region?: string;
  exchange?: string;
  isActive?: boolean;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: 'symbol' | 'name' | 'lastSuccessfulDataLoadTimestamp' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  region?: string;
  search?: string;
}

export class StockService {
  public prisma: PrismaClient;
  private ingestionService: YahooFinanceIngestionService;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma;
    this.ingestionService = new YahooFinanceIngestionService(this.prisma);
  }

  /**
   * List stocks with pagination, sorting, and filtering.
   */
  async list(options: PaginationOptions) {
    const {
      page,
      pageSize,
      sortBy = 'symbol',
      sortOrder = 'asc',
      region,
      search,
    } = options;

    const skip = (page - 1) * pageSize;

    const where: any = {};
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

  /**
   * Get a stock by ID.
   */
  async get(id: string) {
    return this.prisma.stock.findUnique({
      where: { id },
    });
  }

  /**
   * Create a new stock and optionally trigger data ingestion.
   */
  async create(data: CreateStockRequest, triggerIngestion = true) {
    const existing = await this.prisma.stock.findUnique({
      where: { symbol: data.symbol },
    });
    if (existing) {
      throw new Error(`Stock with symbol ${data.symbol} already exists`);
    }

    const stock = await this.prisma.stock.create({
      data: {
        symbol: data.symbol,
        name: data.name,
        region: data.region,
        exchange: data.exchange,
        isActive: true,
        lastSuccessfulDataLoadTimestamp: null,
      },
    });

    if (triggerIngestion) {
      // Enqueue background ingestion job with throttling
      enqueueIngestionJob(stock.symbol).catch((err) =>
        console.error(`Failed to enqueue ingestion job for ${stock.symbol}:`, err)
      );
    }

    return stock;
  }

  /**
   * Update stock details.
   */
  async update(id: string, data: UpdateStockRequest) {
    return this.prisma.stock.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a stock.
   */
  async delete(id: string) {
    return this.prisma.stock.delete({
      where: { id },
    });
  }

  /**
   * Toggle active/inactive status.
   */
  async toggleActive(id: string) {
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

  /**
   * Trigger data ingestion for a stock (historical data) synchronously.
   * This is used for manual sync (user‑triggered).
   */
  async syncData(id: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { id },
    });
    if (!stock) {
      throw new Error('Stock not found');
    }

    try {
      // Fetch last 15 years of historical data
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 15);
      await this.ingestionService.ingestSymbol(stock.symbol, startDate, new Date());

      // Update last successful load timestamp
      await this.prisma.stock.update({
        where: { id },
        data: { lastSuccessfulDataLoadTimestamp: new Date() },
      });

      return { success: true, message: `Data ingestion completed for ${stock.symbol}` };
    } catch (error: any) {
      console.error(`Data ingestion failed for ${stock.symbol}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Search for assets with database-first fallback to external API.
   * If an asset is not found locally, it will be searched via Yahoo Finance,
   * persisted to the local database, and then returned.
   */
  async searchAssets(query: string): Promise<any[]> {
    // First, search local database
    const localResults = await this.prisma.stock.findMany({
      where: {
        OR: [
          { symbol: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });

    if (localResults.length > 0) {
      return localResults.map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        region: stock.region,
        exchange: stock.exchange,
        source: 'database',
      }));
    }

    // If no local results, search external API
    const externalResults: SearchResult[] = await this.ingestionService.search(query);
    const createdStocks = [];

    for (const ext of externalResults) {
      // Check if already exists (maybe just added by previous iteration)
      const existing = await this.prisma.stock.findUnique({
        where: { symbol: ext.symbol },
      });
      if (existing) {
        createdStocks.push(existing);
        continue;
      }
      // Infer region and exchange from symbol
      const regionInfo = this.ingestionService.inferRegion(ext.symbol);
      const stock = await this.create({
        symbol: ext.symbol,
        name: ext.name,
        region: regionInfo.region || 'US',
        exchange: regionInfo.exchange,
      }, true); // trigger ingestion in background
      createdStocks.push(stock);
    }

    // Return combined results (should be only external ones)
    return createdStocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      region: stock.region,
      exchange: stock.exchange,
      source: 'external',
    }));
  }
}