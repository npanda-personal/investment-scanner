import { PrismaClient } from '@prisma/client';
import type { StockSyncTask, WorkerResult } from './market-data-foundation.types';

export class StockSyncWorker {
  private workerId: number;
  private prisma: PrismaClient;
  private concurrency: number;

  constructor(workerId: number, concurrency: number = 3) {
    this.workerId = workerId;
    this.prisma = new PrismaClient();
    this.concurrency = concurrency;
  }

  async processTask(task: StockSyncTask, options: { force?: boolean; skipFreshnessGate?: boolean } = {}): Promise<WorkerResult> {
    void options;
    return {
      symbol: task.symbol,
      success: false,
      message: 'Legacy provider ingestion workers are disabled for NSE/BSE-only market data. Use exchange-file imports or Pipeline Ops.',
      timestamp: new Date().toISOString(),
      workerId: this.workerId
    };
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
