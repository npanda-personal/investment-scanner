import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type { StrategyDecisionDto, StrategyQuery } from './strategy-decision-engine.types';
import { resolveMarketRegionFilter } from '../../shared/utils/market-scope';

export interface StrategyDecisionFunnelDiagnosticsQuery {
  region?: string;
  assetType?: string;
  strategyCode?: string;
  generatedDate?: string;
  from?: string;
  to?: string;
  frameworkBacked?: boolean;
  includeLegacy?: boolean;
  includeHistory?: boolean;
}

export class StrategyDecisionEngineRepository {
  constructor(private readonly db = prisma) {}

  async create(data: StrategyDecisionDto): Promise<StrategyDecisionDto> {
    const generatedDate = this.normalizeUtcDay(data.generatedAt);
    const instrumentId = data.instrumentId || 'GLOBAL';
    const entryZone = this.serializeEntryZone(data.entryZone);
    const record = await this.db.strategyDecisionResult.upsert({
      where: {
        instrumentId_strategy_modelVersion_generatedDate: {
          instrumentId,
          strategy: data.strategy,
          modelVersion: data.modelVersion,
          generatedDate,
        },
      },
      update: {
        decision: data.decision,
        action: data.action,
        decisionScore: data.decisionScore,
        scoreBreakdown: (data.scoreBreakdown as any) || Prisma.JsonNull,
        confidence: data.confidence,
        marketCondition: data.marketCondition,
        marketGate: data.marketGate,
        entryZone,
        riskPlan: (data.riskPlan as any) || Prisma.JsonNull,
        reasons: data.reasons as any,
        blockers: data.blockers as any,
        warnings: data.warnings as any,
        dataGaps: data.dataGaps as any,
        strategyVersion: data.strategyVersion || null,
        frameworkBacked: Boolean(data.frameworkBacked),
        frameworkDecision: data.frameworkDecision || null,
        frameworkAction: data.frameworkAction || null,
        entryRulesPassed: (data.entryRulesPassed as any) || Prisma.JsonNull,
        exitRulesTriggered: (data.exitRulesTriggered as any) || Prisma.JsonNull,
        noiseFiltersTriggered: (data.noiseFiltersTriggered as any) || Prisma.JsonNull,
        strategyRating: (data.strategyRating as any) || Prisma.JsonNull,
        readinessLabel: data.readinessLabel || null,
        generatedAt: new Date(data.generatedAt),
        country: data.country || null,
        exchange: data.exchange || null,
      },
      create: {
        portfolioId: data.portfolioId,
        holdingId: data.holdingId,
        symbol: data.symbol,
        country: data.country || null,
        exchange: data.exchange || null,
        strategy: data.strategy,
        decision: data.decision,
        action: data.action,
        decisionScore: data.decisionScore,
        scoreBreakdown: (data.scoreBreakdown as any) || Prisma.JsonNull,
        confidence: data.confidence,
        marketCondition: data.marketCondition,
        marketGate: data.marketGate,
        entryZone,
        riskPlan: (data.riskPlan as any) || Prisma.JsonNull,
        reasons: data.reasons as any,
        blockers: data.blockers as any,
        warnings: data.warnings as any,
        dataGaps: data.dataGaps as any,
        strategyVersion: data.strategyVersion || null,
        frameworkBacked: Boolean(data.frameworkBacked),
        frameworkDecision: data.frameworkDecision || null,
        frameworkAction: data.frameworkAction || null,
        entryRulesPassed: (data.entryRulesPassed as any) || Prisma.JsonNull,
        exitRulesTriggered: (data.exitRulesTriggered as any) || Prisma.JsonNull,
        noiseFiltersTriggered: (data.noiseFiltersTriggered as any) || Prisma.JsonNull,
        strategyRating: (data.strategyRating as any) || Prisma.JsonNull,
        readinessLabel: data.readinessLabel || null,
        modelVersion: data.modelVersion,
        generatedAt: new Date(data.generatedAt),
        generatedDate,
        ...(data.instrumentId ? { stock: { connect: { id: data.instrumentId } } } : {}),
      },
    });
    return this.toDto(record);
  }

  async latestForInstrument(instrumentId: string, strategy?: string): Promise<StrategyDecisionDto | null> {
    const record = await this.db.strategyDecisionResult.findFirst({
      where: { instrumentId, strategy },
      orderBy: { generatedAt: 'desc' },
    });
    return record ? this.toDto(record) : null;
  }

  async history(instrumentId: string): Promise<StrategyDecisionDto[]> {
    const records = await this.db.strategyDecisionResult.findMany({
      where: { instrumentId },
      orderBy: { generatedAt: 'desc' },
      take: 50,
    });
    return records.map((record) => this.toDto(record));
  }

  async candidates(query: StrategyQuery): Promise<{ results: StrategyDecisionDto[]; total: number }> {
    const where: Prisma.StrategyDecisionResultWhereInput = {
      ...this.buildScopeWhere(query.region, query.assetType),
      strategy: query.strategy,
      decision: query.decision,
      decisionScore: query.minScore ? { gte: query.minScore } : undefined,
      confidence: query.confidence,
      frameworkBacked: query.frameworkBacked ?? (query.includeLegacy ? undefined : true),
      readinessLabel: query.readinessLabels?.length ? { in: query.readinessLabels } : undefined,
      OR: query.strategyRatingGrades?.length ? query.strategyRatingGrades.map((ratingGrade) => ({
        strategyRating: {
          path: ['ratingGrade'],
          equals: ratingGrade,
        } as any,
      })) : undefined,
      country: query.country,
    };
    const scopedWhere = await this.applyLatestGeneratedDateScope(where, query.includeHistory);
    if (!scopedWhere) return { results: [], total: 0 };

    const total = await this.db.strategyDecisionResult.count({ where: scopedWhere });
    const records = await this.db.strategyDecisionResult.findMany({
      where: scopedWhere,
      orderBy: this.resolveOrderBy(query.sortBy, query.sortDirection),
      take: query.limit || 25,
      skip: query.offset || 0,
    });

    return {
      results: records.map((record) => this.toDto(record)),
      total,
    };
  }

  async funnelDiagnostics(query: StrategyDecisionFunnelDiagnosticsQuery): Promise<{ results: StrategyDecisionDto[]; total: number }> {
    const where: Prisma.StrategyDecisionResultWhereInput = {
      ...this.buildScopeWhere(query.region, query.assetType),
      strategy: query.strategyCode,
      frameworkBacked: query.frameworkBacked ?? (query.includeLegacy ? undefined : true),
      generatedDate: query.generatedDate ? this.normalizeUtcDay(query.generatedDate) : undefined,
      generatedAt: query.from || query.to ? {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      } : undefined,
    };
    const scopedWhere = await this.applyLatestGeneratedDateScope(where, query.includeHistory || Boolean(query.generatedDate || query.from || query.to));
    if (!scopedWhere) return { results: [], total: 0 };
    const [total, records] = await Promise.all([
      this.db.strategyDecisionResult.count({ where: scopedWhere }),
      this.db.strategyDecisionResult.findMany({
        where: scopedWhere,
        orderBy: { generatedAt: 'desc' },
        take: 5000,
      }),
    ]);
    return { results: records.map((record) => this.toDto(record)), total };
  }

  async exits(portfolioId?: string, region?: string, assetType?: string): Promise<StrategyDecisionDto[]> {
    const records = await this.db.strategyDecisionResult.findMany({
      where: {
        ...this.buildScopeWhere(region, assetType),
        portfolioId,
        strategy: 'DEFENSIVE_EXIT',
        decision: { in: ['EXIT_CANDIDATE', 'REDUCE_RISK'] },
      },
      orderBy: { decisionScore: 'desc' },
    });
    return records.map((record) => this.toDto(record));
  }

  async count() {
    return this.db.strategyDecisionResult.count();
  }

  async latestGeneratedAt() {
    const record = await this.db.strategyDecisionResult.findFirst({
      orderBy: { generatedAt: 'desc' },
      select: { generatedAt: true },
    });
    return record?.generatedAt || null;
  }

  private async applyLatestGeneratedDateScope(
    where: Prisma.StrategyDecisionResultWhereInput,
    includeHistory?: boolean
  ): Promise<Prisma.StrategyDecisionResultWhereInput | null> {
    if (includeHistory || where.generatedDate || where.generatedAt) return where;
    const latest = await this.db.strategyDecisionResult.findFirst({
      where,
      orderBy: { generatedDate: 'desc' },
      select: { generatedDate: true },
    });
    return latest?.generatedDate ? { ...where, generatedDate: latest.generatedDate } : null;
  }

  private toDto(record: any): StrategyDecisionDto {
    return {
      id: record.id,
      instrumentId: record.instrumentId === 'GLOBAL' ? undefined : record.instrumentId,
      portfolioId: record.portfolioId,
      holdingId: record.holdingId,
      symbol: record.symbol,
      country: record.country || undefined,
      exchange: record.exchange || undefined,
      strategy: record.strategy as any,
      decision: record.decision as any,
      action: record.action as any,
      decisionScore: record.decisionScore,
      scoreBreakdown: record.scoreBreakdown || undefined,
      confidence: record.confidence as any,
      marketCondition: record.marketCondition as any,
      marketGate: record.marketGate as any,
      entryZone: this.parseEntryZone(record.entryZone),
      riskPlan: record.riskPlan || undefined,
      reasons: record.reasons as string[],
      blockers: record.blockers as string[],
      warnings: record.warnings as string[],
      dataGaps: record.dataGaps as string[],
      strategyVersion: record.strategyVersion || undefined,
      frameworkBacked: Boolean(record.frameworkBacked),
      frameworkDecision: record.frameworkDecision || undefined,
      frameworkAction: record.frameworkAction || undefined,
      entryRulesPassed: Array.isArray(record.entryRulesPassed) ? record.entryRulesPassed : undefined,
      exitRulesTriggered: Array.isArray(record.exitRulesTriggered) ? record.exitRulesTriggered : undefined,
      noiseFiltersTriggered: Array.isArray(record.noiseFiltersTriggered) ? record.noiseFiltersTriggered : undefined,
      strategyRating: record.strategyRating || undefined,
      readinessLabel: record.readinessLabel || undefined,
      modelVersion: record.modelVersion,
      generatedAt: record.generatedAt.toISOString(),
    };
  }

  private normalizeUtcDay(value: string | Date): Date {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private buildScopeWhere(region?: string, assetType?: string): Prisma.StrategyDecisionResultWhereInput {
    const stockFilters: Prisma.StockWhereInput[] = [];
    const regionFilter = resolveMarketRegionFilter(region);
    if (Object.keys(regionFilter).length > 0) stockFilters.push(regionFilter);
    if (assetType) stockFilters.push(this.buildAssetTypeFilter(assetType));
    return stockFilters.length > 0 ? { stock: { AND: stockFilters } } : {};
  }

  private buildAssetTypeFilter(assetType: string): Prisma.StockWhereInput {
    const normalized = assetType.trim().toUpperCase();
    if (normalized === 'STOCK') return { assetType: { in: ['STOCK', 'EQUITY'] } };
    return { assetType: normalized };
  }

  private resolveOrderBy(sortBy?: string, sortDirection?: 'asc' | 'desc'): Prisma.StrategyDecisionResultOrderByWithRelationInput {
    const direction = sortDirection === 'asc' ? 'asc' : 'desc';
    const allowedSorts = new Set(['generatedAt', 'decisionScore', 'strategy', 'decision', 'confidence', 'marketGate', 'symbol', 'frameworkBacked', 'readinessLabel']);
    return allowedSorts.has(sortBy || '') ? { [sortBy as string]: direction } : { generatedAt: 'desc' };
  }

  private serializeEntryZone(value: StrategyDecisionDto['entryZone']): string | null {
    return value ? JSON.stringify(value) : null;
  }

  private parseEntryZone(value: unknown): StrategyDecisionDto['entryZone'] | undefined {
    if (!value) return undefined;
    if (typeof value !== 'string') return value as StrategyDecisionDto['entryZone'];
    try {
      return JSON.parse(value) as StrategyDecisionDto['entryZone'];
    } catch {
      return undefined;
    }
  }
}
