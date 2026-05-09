import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type {
  StrategyDefinition,
  StrategyListQuery,
  StrategyPerformanceQuery,
  StrategyPerformanceSummaryDto,
  StrategyRankingsQuery,
} from './strategy-framework.types';

export class StrategyFrameworkRepository {
  constructor(private readonly db = prisma) {}

  async upsertDefinitions(strategies: StrategyDefinition[]): Promise<void> {
    for (const strategy of strategies) {
      await this.db.strategyDefinition.upsert({
        where: { code: strategy.code },
        create: this.toDefinitionData(strategy),
        update: this.toDefinitionData(strategy),
      });
    }
  }

  async listDefinitions(query: StrategyListQuery): Promise<StrategyDefinition[]> {
    const rows = await this.db.strategyDefinition.findMany({
      where: {
        status: query.status,
        category: query.category,
        style: query.style,
      },
      orderBy: [{ status: 'asc' }, { code: 'asc' }],
    });
    return rows.map(this.toDefinitionDto).filter((strategy) => {
      const regionOk = !query.region || strategy.supportedRegions.includes(query.region) || strategy.supportedRegions.includes('GLOBAL');
      const assetOk = !query.assetType || strategy.assetTypes.includes(query.assetType);
      return regionOk && assetOk;
    });
  }

  async getDefinition(code: string): Promise<StrategyDefinition | null> {
    const row = await this.db.strategyDefinition.findUnique({ where: { code: code.toUpperCase() } });
    return row ? this.toDefinitionDto(row) : null;
  }

  async latestPerformanceForStrategies(codes: string[], query: StrategyPerformanceQuery = {}): Promise<StrategyPerformanceSummaryDto[]> {
    if (codes.length === 0) return [];
    const rows = await this.db.strategyPerformanceSummary.findMany({
      where: {
        strategyCode: { in: codes },
        timeframe: query.timeframe,
        region: query.region,
        assetType: query.assetType,
        universeKey: query.universeKey,
      },
      orderBy: [{ generatedAt: 'desc' }],
    });
    return rows.map(this.toPerformanceDto);
  }

  async performance(code: string, query: StrategyPerformanceQuery): Promise<StrategyPerformanceSummaryDto[]> {
    const rows = await this.db.strategyPerformanceSummary.findMany({
      where: {
        strategyCode: code.toUpperCase(),
        timeframe: query.timeframe,
        region: query.region,
        assetType: query.assetType,
        universeKey: query.universeKey,
      },
      orderBy: [{ timeframe: 'asc' }, { generatedAt: 'desc' }],
    });
    return rows.map(this.toPerformanceDto);
  }

  async rankings(query: StrategyRankingsQuery): Promise<StrategyPerformanceSummaryDto[]> {
    const rows = await this.db.strategyPerformanceSummary.findMany({
      where: {
        timeframe: query.timeframe,
        region: query.region,
        assetType: query.assetType,
        universeKey: query.universeKey,
      },
      orderBy: [{ ratingScore: 'desc' }, { strategyCode: 'asc' }],
    });
    return rows.map(this.toPerformanceDto).filter((row) => !query.minRating || ratingRank(row.ratingGrade) >= ratingRank(query.minRating));
  }

  async upsertPerformance(summary: StrategyPerformanceSummaryDto): Promise<StrategyPerformanceSummaryDto> {
    const data = {
      strategyCode: summary.strategyCode,
      strategyVersion: summary.strategyVersion,
      timeframe: summary.timeframe,
      region: summary.region,
      assetType: summary.assetType,
      universeKey: summary.universeKey || 'DEFAULT',
      startingCapital: summary.startingCapital,
      endingCapital: summary.endingCapital,
      totalReturn: summary.totalReturn,
      cagr: summary.cagr,
      maxDrawdown: summary.maxDrawdown,
      volatility: summary.volatility,
      sharpe: summary.sharpe,
      winRate: summary.winRate,
      profitFactor: summary.profitFactor,
      tradeCount: summary.tradeCount,
      averageHoldingDays: summary.averageHoldingDays,
      exposurePercent: summary.exposurePercent,
      benchmarkTotalReturn: summary.benchmarkTotalReturn,
      benchmarkCagr: summary.benchmarkCagr,
      excessReturn: summary.excessReturn,
      excessCagr: summary.excessCagr,
      endOfTestExitPercent: summary.endOfTestExitPercent,
      dataCoveragePercent: summary.dataCoveragePercent,
      ratingScore: summary.ratingScore,
      ratingGrade: summary.ratingGrade,
      automationEligibility: summary.automationEligibility,
      readinessLabel: summary.readinessLabel,
      ratingReasons: (summary.ratingReasons || []) as unknown as Prisma.InputJsonValue,
      ratingWarnings: (summary.ratingWarnings || []) as unknown as Prisma.InputJsonValue,
      ratingCapsApplied: (summary.ratingCapsApplied || []) as unknown as Prisma.InputJsonValue,
      backtestRunId: summary.backtestRunId ?? null,
      generatedAt: new Date(summary.generatedAt),
    };
    const row = await this.db.strategyPerformanceSummary.upsert({
      where: {
        strategyCode_strategyVersion_timeframe_region_assetType_universeKey: {
          strategyCode: data.strategyCode,
          strategyVersion: data.strategyVersion,
          timeframe: data.timeframe,
          region: data.region,
          assetType: data.assetType,
          universeKey: data.universeKey,
        },
      },
      create: data,
      update: data,
    });
    return this.toPerformanceDto(row);
  }

  async health(configuredCount: number) {
    const [withResults, missing] = await Promise.all([
      this.db.strategyPerformanceSummary.groupBy({ by: ['strategyCode'] }).then((rows) => rows.length),
      this.db.strategyDefinition.count({ where: { status: 'ACTIVE' } }),
    ]);
    return {
      strategiesWithBacktestResults: withResults,
      missingPerformanceCount: Math.max(0, configuredCount - withResults),
      activeDefinitionsCount: missing,
    };
  }

  private toDefinitionData(strategy: StrategyDefinition) {
    return {
      code: strategy.code,
      name: strategy.name,
      description: strategy.description,
      category: strategy.category,
      style: strategy.style,
      timeframe: strategy.timeframe,
      assetTypes: strategy.assetTypes as unknown as Prisma.InputJsonValue,
      supportedRegions: strategy.supportedRegions as unknown as Prisma.InputJsonValue,
      version: strategy.version,
      status: strategy.status,
      parameters: strategy.parameters as Prisma.InputJsonValue,
      entryRules: strategy.entryRules as unknown as Prisma.InputJsonValue,
      exitRules: strategy.exitRules as unknown as Prisma.InputJsonValue,
      noiseFilters: strategy.noiseFilters as unknown as Prisma.InputJsonValue,
      riskRules: strategy.riskRules as unknown as Prisma.InputJsonValue,
      requiredInputs: strategy.requiredInputs as unknown as Prisma.InputJsonValue,
      marketGateRules: strategy.marketGateRules as unknown as Prisma.InputJsonValue,
    };
  }

  private toDefinitionDto(row: any): StrategyDefinition {
    return {
      code: row.code,
      name: row.name,
      description: row.description,
      category: row.category,
      style: row.style,
      timeframe: row.timeframe,
      assetTypes: Array.isArray(row.assetTypes) ? row.assetTypes : [],
      supportedRegions: Array.isArray(row.supportedRegions) ? row.supportedRegions : [],
      version: row.version,
      status: row.status,
      parameters: row.parameters || {},
      entryRules: Array.isArray(row.entryRules) ? row.entryRules : [],
      exitRules: Array.isArray(row.exitRules) ? row.exitRules : [],
      noiseFilters: Array.isArray(row.noiseFilters) ? row.noiseFilters : [],
      riskRules: Array.isArray(row.riskRules) ? row.riskRules : [],
      requiredInputs: Array.isArray(row.requiredInputs) ? row.requiredInputs : [],
      marketGateRules: Array.isArray(row.marketGateRules) ? row.marketGateRules : [],
      explanationTemplate: '',
      examples: { triggers: [], blocks: [] },
      id: row.id,
    };
  }

  private toPerformanceDto(row: any): StrategyPerformanceSummaryDto {
    return {
      id: row.id,
      strategyCode: row.strategyCode,
      strategyVersion: row.strategyVersion,
      timeframe: row.timeframe,
      region: row.region,
      assetType: row.assetType,
      universeKey: row.universeKey,
      startingCapital: row.startingCapital,
      endingCapital: row.endingCapital,
      totalReturn: row.totalReturn,
      cagr: row.cagr,
      maxDrawdown: row.maxDrawdown,
      volatility: row.volatility,
      sharpe: row.sharpe,
      winRate: row.winRate,
      profitFactor: row.profitFactor,
      tradeCount: row.tradeCount,
      averageHoldingDays: row.averageHoldingDays,
      exposurePercent: row.exposurePercent,
      benchmarkTotalReturn: row.benchmarkTotalReturn,
      benchmarkCagr: row.benchmarkCagr,
      excessReturn: row.excessReturn,
      excessCagr: row.excessCagr,
      endOfTestExitPercent: row.endOfTestExitPercent,
      dataCoveragePercent: row.dataCoveragePercent,
      ratingScore: row.ratingScore,
      ratingGrade: row.ratingGrade,
      automationEligibility: automationFromStored(row.automationEligibility),
      readinessLabel: row.readinessLabel || readinessFromAutomation(row.automationEligibility),
      ratingReasons: Array.isArray(row.ratingReasons) ? row.ratingReasons : [],
      ratingWarnings: Array.isArray(row.ratingWarnings) ? row.ratingWarnings : [],
      ratingCapsApplied: Array.isArray(row.ratingCapsApplied) ? row.ratingCapsApplied : [],
      backtestRunId: row.backtestRunId,
      generatedAt: row.generatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function ratingRank(grade: string): number {
  return { UNPROVEN: 0, WEAK: 1, AVERAGE: 2, GOOD: 3, EXCELLENT: 4 }[grade] ?? 0;
}

function readinessFromAutomation(value: string): StrategyPerformanceSummaryDto['readinessLabel'] {
  if (value === 'PAPER_TRADING_ELIGIBLE' || value === 'LIVE_TRADING_ELIGIBLE_FUTURE') return 'PAPER_TEST_CANDIDATE';
  if (value === 'WATCHLIST_ONLY') return 'WATCHLIST_CANDIDATE';
  return 'RESEARCH_ONLY';
}

function automationFromStored(value: string): StrategyPerformanceSummaryDto['automationEligibility'] {
  if (value === 'PAPER_TRADING_ELIGIBLE' || value === 'LIVE_TRADING_ELIGIBLE_FUTURE' || value === 'PAPER_TEST_CANDIDATE') return 'PAPER_TEST_CANDIDATE';
  if (value === 'WATCHLIST_ONLY') return 'WATCHLIST_ONLY';
  return 'NOT_ELIGIBLE';
}
