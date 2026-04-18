import { PrismaClient, Prisma } from '@prisma/client';
import defaultPrisma from '../db/prisma';
import { WatchlistService } from '../api/watchlists/service';
import { ConditionEvaluator, ConditionNode, MarketData } from './evaluator';

export interface CreateScannerRuleRequest {
  name: string;
  description?: string;
  condition: any; // JSON condition
  sourceWatchlistId?: string;
  sourceSymbols?: string[];
  targetWatchlistId: string;
  isActive?: boolean;
  schedule?: string; // cron expression
  nextScanAt?: Date;
}

export interface UpdateScannerRuleRequest {
  name?: string;
  description?: string;
  condition?: any;
  sourceWatchlistId?: string | null;
  sourceSymbols?: string[] | null;
  targetWatchlistId?: string;
  isActive?: boolean;
  schedule?: string | null;
  nextScanAt?: Date | null;
}

export class ScannerService {
  public prisma: PrismaClient;
  private watchlistService: WatchlistService;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma;
    this.watchlistService = new WatchlistService(this.prisma);
  }

  /**
   * List all scanner rules for a given user.
   */
  async list(userId: string) {
    return this.prisma.scannerRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        targetWatchlist: true,
        sourceWatchlist: true,
        ScanLog: {
          orderBy: { triggeredAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  /**
   * Create a new scanner rule for a user.
   */
  async create(userId: string, data: CreateScannerRuleRequest) {
    const { sourceSymbols, ...rest } = data;
    const sourceSymbolsJson = sourceSymbols ? sourceSymbols : Prisma.JsonNull;
    return this.prisma.scannerRule.create({
      data: {
        userId,
        ...rest,
        sourceSymbols: sourceSymbolsJson,
        condition: data.condition as Prisma.InputJsonValue,
      },
      include: {
        targetWatchlist: true,
        sourceWatchlist: true,
      },
    });
  }

  /**
   * Get a specific scanner rule by ID, ensuring it belongs to the user.
   */
  async get(userId: string, ruleId: string) {
    return this.prisma.scannerRule.findFirst({
      where: {
        id: ruleId,
        userId,
      },
      include: {
        targetWatchlist: true,
        sourceWatchlist: true,
        ScanLog: {
          orderBy: { triggeredAt: 'desc' },
          take: 20,
        },
      },
    });
  }

  /**
   * Update a scanner rule.
   */
  async update(userId: string, ruleId: string, data: UpdateScannerRuleRequest) {
    const { sourceSymbols, ...rest } = data;
    const updateData: any = { ...rest };
    if (sourceSymbols !== undefined) {
      updateData.sourceSymbols = sourceSymbols === null ? Prisma.JsonNull : sourceSymbols;
    }
    if (updateData.condition) {
      updateData.condition = updateData.condition as Prisma.InputJsonValue;
    }
    return this.prisma.scannerRule.update({
      where: {
        id: ruleId,
        userId, // ensure ownership
      },
      data: updateData,
      include: {
        targetWatchlist: true,
        sourceWatchlist: true,
      },
    });
  }
  // scanner service ready

  /**
   * Delete a scanner rule.
   */
  async delete(userId: string, ruleId: string) {
    return this.prisma.scannerRule.delete({
      where: {
        id: ruleId,
        userId,
      },
    });
  }

  /**
   * Evaluate a single rule against the latest market data.
   */
  async evaluateRule(ruleId: string): Promise<{ triggered: boolean; symbol?: string; data?: any }> {
    const rule = await this.prisma.scannerRule.findUnique({
      where: { id: ruleId },
      include: { sourceWatchlist: true },
    });
    if (!rule) {
      throw new Error(`Scanner rule ${ruleId} not found`);
    }
    const condition = rule.condition as unknown as ConditionNode;
    console.log(`[ScannerService] Evaluating rule ${ruleId} condition:`, JSON.stringify(condition, null, 2));
    const evaluator = new ConditionEvaluator(this.prisma);
    // Dummy market data for testing – replace with real data from database
    const dummyData: MarketData = {
      symbol: 'AAPL',
      latestPrice: {
        open: 150,
        high: 155,
        low: 149,
        close: 152,
        volume: 1000000,
        timestamp: new Date(),
      },
      historicalPrices: [], // not needed for price conditions
    };
    const triggered = evaluator.evaluate(condition, dummyData);
    console.log(`[ScannerService] Rule ${ruleId} triggered:`, triggered);
    if (triggered) {
      console.log(`[ScannerService] Rule ${ruleId} triggered for symbol AAPL`);
      return { triggered: true, symbol: 'AAPL', data: dummyData };
    }
    return { triggered: false };
  }

  /**
   * Run scanning for all active rules (to be called by a scheduled job).
   */
  async scanActiveRules() {
    const activeRules = await this.prisma.scannerRule.findMany({
      where: { isActive: true },
      include: { targetWatchlist: true, sourceWatchlist: true },
    });
    const results = [];
    for (const rule of activeRules) {
      try {
        const evalResult = await this.evaluateRule(rule.id);
        if (evalResult.triggered && evalResult.symbol) {
          // Add symbol to target watchlist
          await this.watchlistService.addSymbol(rule.userId, rule.targetWatchlistId, evalResult.symbol);
          // Log the trigger
          await this.logTrigger(rule.id, evalResult.symbol, evalResult.data, true);
          results.push({ ruleId: rule.id, triggered: true, symbol: evalResult.symbol });
        }
      } catch (error) {
        console.error(`Error scanning rule ${rule.id}:`, error);
        await this.logTrigger(rule.id, '', null, false, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    // scanner service ready
    return results;
  }

  /**
   * Log a scan trigger.
   */
  private async logTrigger(
    ruleId: string,
    symbol: string,
    matchedData: any,
    addedToWatchlist: boolean,
    error?: string
  ) {
    return this.prisma.scanLog.create({
      data: {
        ruleId,
        symbol,
        matchedData,
        addedToWatchlist,
        error,
      },
    });
  }

  /**
   * Get scan logs for a rule.
   */
  async getLogs(ruleId: string, limit = 50) {
    return this.prisma.scanLog.findMany({
      where: { ruleId },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
    });
  }
}