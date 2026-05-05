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

  async processTask(task: StockSyncTask, options: { force?: boolean; skipFreshnessGate?: boolean } = {}): Promise<WorkerResult> {
    try {
      const summary = await this.marketDataService.ingestSymbol(task.symbol, undefined, new Date(), options.force === true, {
        force: options.force,
        skipFreshnessGate: options.skipFreshnessGate,
      });

      return {
        symbol: task.symbol,
        success: true,
        message: summary.noNewData
          ? `No new data to ingest: ${summary.skippedReasons?.join(', ') || 'skipped'}`
          : `Sync completed: ${summary.rowsInserted} inserted, ${summary.rowsUpdated} updated, ${summary.rowsSkipped} skipped`,
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

  async processTasks(tasks: StockSyncTask[], options: { force?: boolean; skipFreshnessGate?: boolean } = {}): Promise<WorkerResult[]> {
    const results: WorkerResult[] = [];
    
    // Process tasks with limited concurrency
    const taskChunks = this.chunkArray(tasks, this.concurrency);
    
    for (let i = 0; i < taskChunks.length; i++) {
      const chunk = taskChunks[i];
      console.log(`[Worker ${this.workerId}] Processing chunk ${i + 1}/${taskChunks.length} (${chunk.length} tasks)`);
      
      // Process chunk in parallel
      const chunkPromises = chunk.map(task => this.processTask(task, options));
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
