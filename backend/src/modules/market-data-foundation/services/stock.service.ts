import { PrismaClient } from '@prisma/client';
import defaultPrisma from '../../../db/prisma';
import { YahooFinanceIngestionService } from '../providers/yahoo-finance.provider';
import type { SearchResult } from '../providers/yahoo-finance.provider';
import { enqueueIngestionJob } from '../queue/ingestion.queue';

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
   * Simple incremental loading logic:
   * - If stock has lastSuccessfulDataLoadTimestamp → incremental load from that timestamp
   * - If no lastSuccessfulDataLoadTimestamp → full load from Jan 1, 2010
   */
  async syncData(id: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { id },
    });
    if (!stock) {
      throw new Error('Stock not found');
    }

    try {
      // Determine start date based on lastSuccessfulDataLoadTimestamp
      let startDate: Date | undefined;
      
      if (!stock.lastSuccessfulDataLoadTimestamp) {
        // First-time load: start from Jan 1, 2010
        startDate = new Date('2010-01-01');
        console.log(`First-time load for ${stock.symbol} from ${startDate.toISOString().split('T')[0]}`);
      } else {
        // Incremental load: start from day after last successful load
        startDate = new Date(stock.lastSuccessfulDataLoadTimestamp);
        startDate.setDate(startDate.getDate() + 1);
        console.log(`Incremental load for ${stock.symbol} from ${startDate.toISOString().split('T')[0]}`);
      }

      // Use ingestSymbol with determined start date
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

  /**
   * Search Yahoo Finance directly without auto-creating stocks.
   * Returns search results with region information inferred from symbol.
   * Used by the global search bar in the frontend.
   */
  async yahooSearch(query: string): Promise<any[]> {
    const externalResults: SearchResult[] = await this.ingestionService.search(query);
    return externalResults.map(result => ({
      symbol: result.symbol,
      name: result.name,
      type: result.type,
      exchange: result.exchange,
      region: result.region,
      source: 'yahoo',
    }));
  }

  /**
   * Trigger data ingestion for all active stocks using horizontal worker system.
   * Uses 3-5 workers with 3-5 concurrency each for optimal Yahoo API usage.
   * Returns progress information.
   */
  async syncAll(
    workerCount: number = 4,          // 4 workers (horizontal scaling)
    workerConcurrency: number = 4,    // 4 concurrent requests per worker
    delayBetweenBatchesMs: number = 3000  // 3 seconds delay between batches
  ) {
    try {
      // Get all active stocks
      const allStocks = await this.prisma.stock.findMany({
        where: { isActive: true },
        select: { id: true, symbol: true, lastSuccessfulDataLoadTimestamp: true },
      });

      const totalStocks = allStocks.length;
      const results: Array<{symbol: string, success: boolean, message: string, timestamp: string, workerId?: number}> = [];
      const errors: Array<{symbol: string, success: boolean, message: string, timestamp: string, workerId?: number}> = [];

      console.log(`🚀 Starting bulk sync for ${totalStocks} active stocks`);
      console.log(`⚙️  Configuration: ${workerCount} workers, ${workerConcurrency} concurrency per worker, ${delayBetweenBatchesMs}ms delay between batches`);
      console.log(`📊 Estimated speedup: ${workerCount * workerConcurrency}x faster than sequential processing\n`);

      // Import worker dynamically to avoid circular dependencies
      const workerModule = await import('../workers/stock-sync.worker');
      const StockSyncWorker = workerModule.StockSyncWorker;

      // Create workers
      const workers: InstanceType<typeof StockSyncWorker>[] = [];
      for (let i = 0; i < workerCount; i++) {
        workers.push(new StockSyncWorker(i + 1, workerConcurrency));
      }

      // Distribute tasks evenly among workers
      const tasksPerWorker = Math.ceil(totalStocks / workerCount);
      const workerTasks: Array<Array<any>> = [];

      for (let i = 0; i < workerCount; i++) {
        const startIdx = i * tasksPerWorker;
        const endIdx = Math.min(startIdx + tasksPerWorker, totalStocks);
        workerTasks.push(allStocks.slice(startIdx, endIdx));
      }

      console.log(`📦 Task distribution:`);
      workerTasks.forEach((tasks, idx) => {
        console.log(`   Worker ${idx + 1}: ${tasks.length} stocks`);
      });
      console.log('');

      // Process all workers in parallel
      const workerPromises = workers.map(async (worker, idx) => {
        const tasks = workerTasks[idx];
        if (tasks.length === 0) return [];

        console.log(`👷 Worker ${idx + 1} starting with ${tasks.length} tasks...`);
        const workerResults = await worker.processTasks(tasks);
        
        // Add delay between worker completions to avoid overwhelming the system
        if (idx < workers.length - 1) {
          console.log(`⏳ Waiting ${delayBetweenBatchesMs}ms before next worker batch...`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatchesMs));
        }
        
        return workerResults;
      });

      // Wait for all workers to complete
      const allWorkerResults = await Promise.all(workerPromises);
      
      // Flatten results
      const flattenedResults = allWorkerResults.flat();
      results.push(...flattenedResults);
      
      // Separate errors
      flattenedResults.filter(r => !r.success).forEach(r => errors.push(r));

      // Clean up workers
      await Promise.all(workers.map(worker => worker.disconnect()));

      // Calculate statistics
      const totalSuccesses = results.filter(r => r.success).length;
      const totalFailures = results.filter(r => !r.success).length;

      console.log(`\n✅ Bulk sync completed!`);
      console.log(`   Successfully processed: ${totalSuccesses} stocks`);
      console.log(`   Failed: ${totalFailures} stocks`);
      console.log(`   Total time saved: ~${Math.round((totalStocks * 6) / 60)} minutes estimated`);

      return {
        success: true,
        message: `Bulk sync completed using ${workerCount} workers. ${totalSuccesses} succeeded, ${totalFailures} failed.`,
        totalStocks,
        succeeded: totalSuccesses,
        failed: totalFailures,
        workerCount,
        workerConcurrency,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('❌ Bulk sync failed:', error);
      return {
        success: false,
        message: `Bulk sync failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }
}
