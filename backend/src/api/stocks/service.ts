import { PrismaClient } from '@prisma/client';
import defaultPrisma from '../../db/prisma';
import { YahooFinanceIngestionService } from '../../data/ingestion/yahoo.service';
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
}