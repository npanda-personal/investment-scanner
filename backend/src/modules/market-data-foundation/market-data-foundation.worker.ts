import { PrismaClient } from '@prisma/client';
import { MarketDataFoundationRepository } from './market-data-foundation.repository';
import { MarketDataFoundationService } from './market-data-foundation.service';
import type { StockSyncTask, WorkerResult } from './market-data-foundation.types';

export class StockSyncWorker {
  private workerId: number;
  private prisma: PrismaClient;
  private marketDataService: MarketDataFoundationService;
  private concurrency: number;

  constructor(workerId: number, concurrency: number = 3) {
    this.workerId = workerId;
    this.prisma = new PrismaClient();
    this.marketDataService = new MarketDataFoundationService(
      new MarketDataFoundationRepository(this.prisma)
    );
    this.concurrency = concurrency;
  }

  async processTask(task: StockSyncTask): Promise<WorkerResult> {
    try {
      // Determine start date based on lastSuccessfulDataLoadTimestamp
      let startDate: Date | undefined;
      
      if (!task.lastSuccessfulDataLoadTimestamp) {
        // First-time load: start from Jan 1, 2010
        startDate = new Date('2010-01-01');
        console.log(`[Worker ${this.workerId}] First-time load for ${task.symbol} from ${startDate.toISOString().split('T')[0]}`);
      } else {
        // Incremental load: start from day after last successful load
        startDate = new Date(task.lastSuccessfulDataLoadTimestamp);
        startDate.setDate(startDate.getDate() + 1);
        console.log(`[Worker ${this.workerId}] Incremental load for ${task.symbol} from ${startDate.toISOString().split('T')[0]}`);
      }

      await this.marketDataService.ingestSymbol(task.symbol, startDate, new Date());

      return {
        symbol: task.symbol,
        success: true,
        message: 'Sync completed',
        timestamp: new Date().toISOString(),
        workerId: this.workerId
      };
    } catch (error: any) {
      console.error(`[Worker ${this.workerId}] Failed to sync ${task.symbol}:`, error.message);
      return {
        symbol: task.symbol,
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
        workerId: this.workerId
      };
    }
  }

  async processTasks(tasks: StockSyncTask[]): Promise<WorkerResult[]> {
    const results: WorkerResult[] = [];
    
    // Process tasks with limited concurrency
    const taskChunks = this.chunkArray(tasks, this.concurrency);
    
    for (let i = 0; i < taskChunks.length; i++) {
      const chunk = taskChunks[i];
      console.log(`[Worker ${this.workerId}] Processing chunk ${i + 1}/${taskChunks.length} (${chunk.length} tasks)`);
      
      // Process chunk in parallel
      const chunkPromises = chunk.map(task => this.processTask(task));
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
      
      // Add small delay between chunks if not the last chunk
      if (i < taskChunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    return results;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
