import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type { StrategyDecisionDto, StrategyQuery } from './strategy-decision-engine.types';
import { resolveRelatedMarketRegionFilter } from '../../shared/utils/market-scope';

export class StrategyDecisionEngineRepository {
  constructor(private readonly db = prisma) {}

  async create(data: StrategyDecisionDto): Promise<StrategyDecisionDto> {
    const generatedDate = this.normalizeUtcDay(data.generatedAt);
    const record = await this.db.strategyDecisionResult.upsert({
      where: {
        instrumentId_strategy_modelVersion_generatedDate: {
          instrumentId: data.instrumentId || 'GLOBAL',
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
        entryZone: (data.entryZone as any) || Prisma.JsonNull,
        riskPlan: (data.riskPlan as any) || Prisma.JsonNull,
        reasons: data.reasons as any,
        blockers: data.blockers as any,
        warnings: data.warnings as any,
        dataGaps: data.dataGaps as any,
        generatedAt: new Date(data.generatedAt),
        country: data.country || null,
        exchange: data.exchange || null,
      },
      create: {
        instrumentId: data.instrumentId || 'GLOBAL',
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
        entryZone: (data.entryZone as any) || Prisma.JsonNull,
        riskPlan: (data.riskPlan as any) || Prisma.JsonNull,
        reasons: data.reasons as any,
        blockers: data.blockers as any,
        warnings: data.warnings as any,
        dataGaps: data.dataGaps as any,
        modelVersion: data.modelVersion,
        generatedAt: new Date(data.generatedAt),
        generatedDate,
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
    const regionFilter = resolveRelatedMarketRegionFilter(query.region);
    
    const where: Prisma.StrategyDecisionResultWhereInput = {
      ...regionFilter,
      strategy: query.strategy,
      decision: query.decision,
      decisionScore: query.minScore ? { gte: query.minScore } : undefined,
      confidence: query.confidence,
      country: query.country,
    };

    const total = await this.db.strategyDecisionResult.count({ where });
    const records = await this.db.strategyDecisionResult.findMany({
      where,
      orderBy: query.sortBy ? { [query.sortBy]: query.sortDirection || 'desc' } : { generatedAt: 'desc' },
      take: query.limit || 25,
      skip: query.offset || 0,
    });

    return {
      results: records.map((record) => this.toDto(record)),
      total,
    };
  }

  async exits(portfolioId?: string, region?: string): Promise<StrategyDecisionDto[]> {
    const regionFilter = resolveRelatedMarketRegionFilter(region);
    const records = await this.db.strategyDecisionResult.findMany({
      where: {
        ...regionFilter,
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
      entryZone: record.entryZone || undefined,
      riskPlan: record.riskPlan || undefined,
      reasons: record.reasons as string[],
      blockers: record.blockers as string[],
      warnings: record.warnings as string[],
      dataGaps: record.dataGaps as string[],
      modelVersion: record.modelVersion,
      generatedAt: record.generatedAt.toISOString(),
    };
  }

  private normalizeUtcDay(value: string | Date): Date {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }
}
