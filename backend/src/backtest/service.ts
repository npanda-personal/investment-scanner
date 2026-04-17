import { PrismaClient, Prisma } from '@prisma/client';
import defaultPrisma from '../db/prisma';
import { YahooFinanceIngestionService } from '../data/ingestion/yahoo.service';

export interface CreateBacktestConfigRequest {
  name: string;
  description?: string;
  watchlistIds: string[];
  startDate: Date;
  endDate: Date;
  strategyConfig: any;
  positionSizing?: any;
  stopLoss?: number;
  takeProfit?: number;
}

export interface UpdateBacktestConfigRequest {
  name?: string;
  description?: string;
  watchlistIds?: string[];
  startDate?: Date;
  endDate?: Date;
  strategyConfig?: any;
  positionSizing?: any;
  stopLoss?: number | null;
  takeProfit?: number | null;
}

export interface BacktestResultSummary {
  sharpeRatio?: number;
  maxDrawdown?: number;
  winRate?: number;
  profitFactor?: number;
  totalReturn?: number;
  totalTrades?: number;
  equityCurve?: Array<{ timestamp: Date; equity: number }>;
  tradeLedger?: Array<any>;
  monthlyReturns?: Array<{ month: string; return: number }>;
}

export class BacktestService {
  public prisma: PrismaClient;
  // @ts-ignore unused for now, kept for future extension
  private _ingestionService: YahooFinanceIngestionService;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma;
    this._ingestionService = new YahooFinanceIngestionService(this.prisma);
  }

  /**
   * List all backtest configurations for a given user.
   */
  async list(userId: string) {
    return this.prisma.backtestConfig.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        results: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Create a new backtest configuration.
   */
  async create(userId: string, data: CreateBacktestConfigRequest) {
    return this.prisma.backtestConfig.create({
      data: {
        userId,
        watchlistIds: data.watchlistIds,
        startDate: data.startDate,
        endDate: data.endDate,
        strategyConfig: data.strategyConfig as Prisma.InputJsonValue,
        positionSizing: data.positionSizing ? (data.positionSizing as Prisma.InputJsonValue) : Prisma.JsonNull,
        stopLoss: data.stopLoss,
        takeProfit: data.takeProfit,
        name: data.name,
        description: data.description,
      },
    });
  }

  /**
   * Get a specific backtest configuration by ID, ensuring it belongs to the user.
   */
  async get(userId: string, configId: string) {
    return this.prisma.backtestConfig.findFirst({
      where: {
        id: configId,
        userId,
      },
      include: {
        results: {
          orderBy: { startedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Update a backtest configuration.
   */
  async update(userId: string, configId: string, data: UpdateBacktestConfigRequest) {
    const updateData: any = { ...data };
    if (data.watchlistIds !== undefined) {
      updateData.watchlistIds = data.watchlistIds;
    }
    if (data.strategyConfig !== undefined) {
      updateData.strategyConfig = data.strategyConfig as Prisma.InputJsonValue;
    }
    if (data.positionSizing !== undefined) {
      updateData.positionSizing = data.positionSizing ? (data.positionSizing as Prisma.InputJsonValue) : Prisma.JsonNull;
    }
    return this.prisma.backtestConfig.update({
      where: {
        id: configId,
        userId, // ensure ownership
      },
      data: updateData,
    });
  }

  /**
   * Delete a backtest configuration.
   */
  async delete(userId: string, configId: string) {
    return this.prisma.backtestConfig.delete({
      where: {
        id: configId,
        userId,
      },
    });
  }

  /**
   * Run a backtest for a given configuration.
   * This is a placeholder that returns dummy results.
   * TODO: implement actual backtest engine.
   */
  async runBacktest(userId: string, configId: string): Promise<BacktestResultSummary> {
    const config = await this.get(userId, configId);
    if (!config) {
      throw new Error('Backtest configuration not found');
    }

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    // Dummy results for now
    const summary: BacktestResultSummary = {
      sharpeRatio: 1.2,
      maxDrawdown: -0.05,
      winRate: 0.6,
      profitFactor: 1.8,
      totalReturn: 0.15,
      totalTrades: 42,
      equityCurve: [
        { timestamp: new Date('2026-01-01'), equity: 10000 },
        { timestamp: new Date('2026-01-31'), equity: 11500 },
      ],
      tradeLedger: [],
      monthlyReturns: [],
    };

    // Store the result in the database
    await this.prisma.backtestResult.create({
      data: {
        configId,
        startedAt: new Date(),
        completedAt: new Date(),
        status: 'completed',
        sharpeRatio: summary.sharpeRatio,
        maxDrawdown: summary.maxDrawdown,
        winRate: summary.winRate,
        profitFactor: summary.profitFactor,
        totalReturn: summary.totalReturn,
        totalTrades: summary.totalTrades,
        equityCurve: summary.equityCurve,
        tradeLedger: summary.tradeLedger,
        monthlyReturns: summary.monthlyReturns,
      },
    });

    return summary;
  }

  /**
   * Get all results for a configuration.
   */
  async getResults(configId: string, limit = 10) {
    return this.prisma.backtestResult.findMany({
      where: { configId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get a specific result by ID.
   */
  async getResult(resultId: string) {
    return this.prisma.backtestResult.findUnique({
      where: { id: resultId },
      include: { config: true },
    });
  }
}