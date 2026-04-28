import { MarketDataFoundationRepository } from './market-data-foundation.repository';
import { YahooFinanceIngestionService } from './market-data-foundation.provider';
import { enqueueIngestionJob } from './market-data-foundation.queue';
import type {
  CreateStockRequest,
  HistoricalPrice,
  PaginationOptions,
  SearchResult,
  UpdateStockRequest,
} from './market-data-foundation.types';

export class MarketDataFoundationService {
  constructor(
    private readonly repository = new MarketDataFoundationRepository(),
    private readonly marketDataProvider = new YahooFinanceIngestionService()
  ) {}

  list(options: PaginationOptions) {
    return this.repository.listStocks(options);
  }

  get(id: string) {
    return this.repository.findStockById(id);
  }

  async create(data: CreateStockRequest, triggerIngestion = true) {
    const existing = await this.repository.findStockBySymbol(data.symbol);
    if (existing) {
      throw new Error(`Stock with symbol ${data.symbol} already exists`);
    }

    const stock = await this.repository.createStock(data);

    if (triggerIngestion) {
      enqueueIngestionJob(stock.symbol).catch((err) =>
        console.error(`Failed to enqueue ingestion job for ${stock.symbol}:`, err)
      );
    }

    return stock;
  }

  update(id: string, data: UpdateStockRequest) {
    return this.repository.updateStock(id, data);
  }

  delete(id: string) {
    return this.repository.deleteStock(id);
  }

  toggleActive(id: string) {
    return this.repository.toggleStockActive(id);
  }

  async syncData(id: string) {
    const stock = await this.repository.findStockById(id);
    if (!stock) {
      throw new Error('Stock not found');
    }

    try {
      let startDate: Date | undefined;

      if (!stock.lastSuccessfulDataLoadTimestamp) {
        startDate = new Date('2010-01-01');
        console.log(`First-time load for ${stock.symbol} from ${startDate.toISOString().split('T')[0]}`);
      } else {
        startDate = new Date(stock.lastSuccessfulDataLoadTimestamp);
        startDate.setDate(startDate.getDate() + 1);
        console.log(`Incremental load for ${stock.symbol} from ${startDate.toISOString().split('T')[0]}`);
      }

      await this.ingestSymbol(stock.symbol, startDate, new Date());
      await this.repository.updateStockLoadTimestampById(id);

      return { success: true, message: `Data ingestion completed for ${stock.symbol}` };
    } catch (error: any) {
      console.error(`Data ingestion failed for ${stock.symbol}:`, error);
      return { success: false, message: error.message };
    }
  }

  async searchAssets(query: string): Promise<any[]> {
    const localResults = await this.repository.searchStocks(query);

    if (localResults.length > 0) {
      return localResults.map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        region: stock.region,
        exchange: stock.exchange,
        source: 'database',
      }));
    }

    const externalResults: SearchResult[] = await this.marketDataProvider.search(query);
    const createdStocks = [];

    for (const ext of externalResults) {
      const existing = await this.repository.findStockBySymbol(ext.symbol);
      if (existing) {
        createdStocks.push(existing);
        continue;
      }

      const regionInfo = this.marketDataProvider.inferRegion(ext.symbol);
      const stock = await this.create({
        symbol: ext.symbol,
        name: ext.name,
        region: regionInfo.region || 'US',
        exchange: regionInfo.exchange,
      }, true);
      createdStocks.push(stock);
    }

    return createdStocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      region: stock.region,
      exchange: stock.exchange,
      source: 'external',
    }));
  }

  async yahooSearch(query: string): Promise<any[]> {
    const externalResults: SearchResult[] = await this.marketDataProvider.search(query);
    return externalResults.map(result => ({
      symbol: result.symbol,
      name: result.name,
      type: result.type,
      exchange: result.exchange,
      region: result.region,
      source: 'yahoo',
    }));
  }

  searchProvider(query: string) {
    return this.marketDataProvider.search(query);
  }

  fetchCoreFundamentals(symbol: string) {
    return this.marketDataProvider.fetchCoreFundamentals(symbol);
  }

  fetchCorporateActions(symbol: string) {
    return this.marketDataProvider.fetchCorporateActions(symbol);
  }

  listPrices(symbol: string, limit: number) {
    return this.repository.listPrices(symbol, limit);
  }

  fetchHistorical(symbol: string, startDate?: Date, endDate?: Date) {
    return this.marketDataProvider.fetchHistorical(symbol, startDate, endDate);
  }

  async storeHistorical(prices: HistoricalPrice[]): Promise<void> {
    try {
      await this.repository.storeHistorical(
        prices,
        this.marketDataProvider.inferRegion.bind(this.marketDataProvider)
      );
    } catch (error) {
      console.error(`  Failed to store price ticks for ${prices[0]?.symbol}:`, error);
      throw error;
    }
  }

  async ingestSymbol(symbol: string, startDate?: Date, endDate?: Date): Promise<void> {
    console.log(`Ingesting ${symbol}...`);

    const stock = await this.repository.findStockBySymbol(symbol);
    let effectiveStartDate = startDate;

    if (!effectiveStartDate) {
      if (stock?.lastSuccessfulDataLoadTimestamp) {
        effectiveStartDate = new Date(stock.lastSuccessfulDataLoadTimestamp);
        effectiveStartDate.setDate(effectiveStartDate.getDate() + 1);
        console.log(`  Using incremental start date: ${effectiveStartDate.toISOString().split('T')[0]} (based on lastSuccessfulDataLoadTimestamp)`);
      } else {
        effectiveStartDate = new Date();
        effectiveStartDate.setDate(effectiveStartDate.getDate() - 30);
        console.log(`  Using default start date: ${effectiveStartDate.toISOString().split('T')[0]} (first-time load)`);
      }
    }

    const effectiveEndDate = endDate || new Date();

    if (effectiveStartDate >= effectiveEndDate) {
      console.log(`  Skipping ${symbol}: already up to date (last load: ${stock?.lastSuccessfulDataLoadTimestamp})`);
      return;
    }

    console.log(`  Fetching data from ${effectiveStartDate.toISOString().split('T')[0]} to ${effectiveEndDate.toISOString().split('T')[0]}`);

    const prices = await this.fetchHistorical(symbol, effectiveStartDate, effectiveEndDate);

    if (prices.length === 0) {
      console.log(`  No new price data available for ${symbol}`);
      await this.repository.updateStockLoadTimestampBySymbol(symbol);
      return;
    }

    await this.storeHistorical(prices);
    await this.repository.updateStockLoadTimestampBySymbol(symbol);

    console.log(`  Successfully ingested ${prices.length} price ticks for ${symbol}`);
  }

  async ingestSymbols(symbols: string[], startDate?: Date, endDate?: Date): Promise<void> {
    for (const symbol of symbols) {
      try {
        await this.ingestSymbol(symbol, startDate, endDate);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Ingestion failed for ${symbol}:`, error);
      }
    }
  }

  async syncAll(
    workerCount: number = 4,
    workerConcurrency: number = 4,
    delayBetweenBatchesMs: number = 3000
  ) {
    try {
      const allStocks = await this.repository.listActiveStockSyncTasks();
      const totalStocks = allStocks.length;
      const results: Array<{symbol: string, success: boolean, message: string, timestamp: string, workerId?: number}> = [];
      const errors: Array<{symbol: string, success: boolean, message: string, timestamp: string, workerId?: number}> = [];

      console.log(`Starting bulk sync for ${totalStocks} active stocks`);
      console.log(`Configuration: ${workerCount} workers, ${workerConcurrency} concurrency per worker, ${delayBetweenBatchesMs}ms delay between batches`);
      console.log(`Estimated speedup: ${workerCount * workerConcurrency}x faster than sequential processing\n`);

      const workerModule = await import('./market-data-foundation.worker');
      const StockSyncWorker = workerModule.StockSyncWorker;
      const workers: InstanceType<typeof StockSyncWorker>[] = [];

      for (let i = 0; i < workerCount; i++) {
        workers.push(new StockSyncWorker(i + 1, workerConcurrency));
      }

      const tasksPerWorker = Math.ceil(totalStocks / workerCount);
      const workerTasks: Array<Array<any>> = [];

      for (let i = 0; i < workerCount; i++) {
        const startIdx = i * tasksPerWorker;
        const endIdx = Math.min(startIdx + tasksPerWorker, totalStocks);
        workerTasks.push(allStocks.slice(startIdx, endIdx));
      }

      console.log('Task distribution:');
      workerTasks.forEach((tasks, idx) => {
        console.log(`   Worker ${idx + 1}: ${tasks.length} stocks`);
      });
      console.log('');

      const workerPromises = workers.map(async (worker, idx) => {
        const tasks = workerTasks[idx];
        if (tasks.length === 0) return [];

        console.log(`Worker ${idx + 1} starting with ${tasks.length} tasks...`);
        const workerResults = await worker.processTasks(tasks);

        if (idx < workers.length - 1) {
          console.log(`Waiting ${delayBetweenBatchesMs}ms before next worker batch...`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatchesMs));
        }

        return workerResults;
      });

      const allWorkerResults = await Promise.all(workerPromises);
      const flattenedResults = allWorkerResults.flat();
      results.push(...flattenedResults);
      flattenedResults.filter(r => !r.success).forEach(r => errors.push(r));

      await Promise.all(workers.map(worker => worker.disconnect()));

      const totalSuccesses = results.filter(r => r.success).length;
      const totalFailures = results.filter(r => !r.success).length;

      console.log('\nBulk sync completed!');
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
      console.error('Bulk sync failed:', error);
      return {
        success: false,
        message: `Bulk sync failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  disconnect() {
    return this.repository.prisma.$disconnect();
  }
}

export class StockService extends MarketDataFoundationService {}
