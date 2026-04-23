import { PrismaClient, Prisma } from '@prisma/client';
import defaultPrisma from '../db/prisma';
import { BacktestEngine, BacktestConfigInput } from './engine';

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
  private engine: BacktestEngine;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma;
    this.engine = new BacktestEngine(this.prisma);
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
   * Run a backtest for a given configuration using the real BacktestEngine.
   */
  async runBacktest(userId: string, configId: string): Promise<BacktestResultSummary> {
    const config = await this.get(userId, configId);
    if (!config) {
      throw new Error('Backtest configuration not found');
    }

    // Resolve watchlist IDs to actual symbols
    // Watchlist model has a `symbols` field (String[]) directly
    const watchlists = await this.prisma.watchlist.findMany({
      where: { id: { in: config.watchlistIds as string[] } },
    });
    const symbols = [...new Set(watchlists.flatMap((wl) => wl.symbols))];

    if (symbols.length === 0) {
      throw new Error('No symbols found in the selected watchlists');
    }

    // Extract engine config from the backtest config
    const engineConfig: BacktestConfigInput = {
      startDate: config.startDate,
      endDate: config.endDate,
      initialCapital: 10_000,
      stopLoss: config.stopLoss ? Number(config.stopLoss) : undefined,
      takeProfit: config.takeProfit ? Number(config.takeProfit) : undefined,
      maxHoldingDays: (config.strategyConfig as any)?.maxHoldingDays ?? 10,
      positionSizeFraction: (config.strategyConfig as any)?.positionSizeFraction ?? undefined,
      symbols,
    };

    // Run the engine
    const result = await this.engine.run(engineConfig);

    // Build summary
    const summary: BacktestResultSummary = {
      sharpeRatio: result.metrics.sharpeRatio,
      maxDrawdown: result.metrics.maxDrawdown,
      winRate: result.metrics.winRate,
      profitFactor: result.metrics.profitFactor,
      totalReturn: result.metrics.totalReturn,
      totalTrades: result.metrics.totalTrades,
      equityCurve: result.equityCurve,
      tradeLedger: result.tradeLedger,
      monthlyReturns: this.computeMonthlyReturns(result.equityCurve),
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
        equityCurve: summary.equityCurve as Prisma.InputJsonValue,
        tradeLedger: summary.tradeLedger as Prisma.InputJsonValue,
        monthlyReturns: summary.monthlyReturns as Prisma.InputJsonValue,
      },
    });

    return summary;
  }

  /**
   * Compute monthly returns from an equity curve.
   */
  private computeMonthlyReturns(
    equityCurve: Array<{ timestamp: Date; equity: number }>
  ): Array<{ month: string; return: number }> {
    if (equityCurve.length < 2) return [];

    const monthlyMap = new Map<string, number[]>();

    for (const pt of equityCurve) {
      const monthKey = `${pt.timestamp.getFullYear()}-${String(pt.timestamp.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, []);
      }
      monthlyMap.get(monthKey)!.push(pt.equity);
    }

    const monthlyReturns: Array<{ month: string; return: number }> = [];
    let prevMonthEnd: number | null = null;

    const sortedMonths = Array.from(monthlyMap.keys()).sort();
    for (const month of sortedMonths) {
      const values = monthlyMap.get(month)!;
      const monthStart = values[0];
      const monthEnd = values[values.length - 1];

      if (prevMonthEnd !== null) {
        const ret = (monthStart - prevMonthEnd) / prevMonthEnd;
        monthlyReturns.push({ month, return: ret });
      }

      const ret = (monthEnd - monthStart) / monthStart;
      monthlyReturns.push({ month, return: ret });

      prevMonthEnd = monthEnd;
    }

    return monthlyReturns;
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