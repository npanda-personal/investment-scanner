import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type { TradePlanResultDto, TradePlanListQuery } from './trade-plan-risk-engine.types';

export class TradePlanRiskEngineRepository {
  private db = prisma;

  async upsert(data: TradePlanResultDto): Promise<TradePlanResultDto> {
    const generatedDate = new Date();
    generatedDate.setUTCHours(0, 0, 0, 0);

    const record = await this.db.tradePlanResult.upsert({
      where: {
        instrumentId_strategy_modelVersion_generatedDate: {
          instrumentId: data.instrumentId,
          strategy: data.strategy,
          modelVersion: data.modelVersion,
          generatedDate: generatedDate,
        },
      },
      create: {
        instrumentId: data.instrumentId,
        symbol: data.symbol,
        strategyDecisionId: data.strategyDecisionId,
        portfolioId: data.portfolioId,
        strategy: data.strategy,
        strategyVersion: data.strategyVersion,
        planStatus: data.planStatus,
        riskGrade: data.riskGrade,
        entryZone: data.entryZone ? data.entryZone as any : Prisma.DbNull,
        stopLoss: data.stopLoss ? data.stopLoss as any : Prisma.DbNull,
        target: data.target ? data.target as any : Prisma.DbNull,
        rewardRiskRatio: data.rewardRiskRatio,
        positionSizing: data.positionSizing ? data.positionSizing as any : Prisma.DbNull,
        portfolioImpact: data.portfolioImpact ? data.portfolioImpact as any : Prisma.DbNull,
        invalidationRules: data.invalidationRules as any,
        warnings: data.warnings as any,
        blockers: data.blockers as any,
        dataGaps: data.dataGaps as any,
        modelVersion: data.modelVersion,
        generatedDate: generatedDate,
        generatedAt: new Date(data.generatedAt),
      },
      update: {
        strategyDecisionId: data.strategyDecisionId,
        portfolioId: data.portfolioId,
        planStatus: data.planStatus,
        riskGrade: data.riskGrade,
        entryZone: data.entryZone ? data.entryZone as any : Prisma.DbNull,
        stopLoss: data.stopLoss ? data.stopLoss as any : Prisma.DbNull,
        target: data.target ? data.target as any : Prisma.DbNull,
        rewardRiskRatio: data.rewardRiskRatio,
        positionSizing: data.positionSizing ? data.positionSizing as any : Prisma.DbNull,
        portfolioImpact: data.portfolioImpact ? data.portfolioImpact as any : Prisma.DbNull,
        invalidationRules: data.invalidationRules as any,
        warnings: data.warnings as any,
        blockers: data.blockers as any,
        dataGaps: data.dataGaps as any,
        generatedAt: new Date(data.generatedAt),
      },
    });

    return this.toDto(record);
  }

  async latestForInstrument(instrumentId: string, strategy?: string, portfolioId?: string): Promise<TradePlanResultDto | null> {
    const where: Prisma.TradePlanResultWhereInput = { instrumentId };
    if (strategy) where.strategy = strategy;
    if (portfolioId) where.portfolioId = portfolioId;

    const record = await this.db.tradePlanResult.findFirst({
      where,
      orderBy: { generatedAt: 'desc' },
    });

    return record ? this.toDto(record) : null;
  }

  async list(query: TradePlanListQuery): Promise<{ results: TradePlanResultDto[]; total: number }> {
    const where: Prisma.TradePlanResultWhereInput = {};
    if (query.strategyCode) where.strategy = query.strategyCode;
    if (query.planStatus) where.planStatus = query.planStatus;
    if (query.riskGrade) where.riskGrade = query.riskGrade;
    if (query.portfolioId) where.portfolioId = query.portfolioId;
    if (query.minRewardRisk !== undefined) where.rewardRiskRatio = { gte: query.minRewardRisk };

    // Note: region and assetType are conceptually filtered at a higher level or by joining with instruments.
    // For simplicity, we query the table directly here.

    const total = await this.db.tradePlanResult.count({ where });
    const records = await this.db.tradePlanResult.findMany({
      where,
      orderBy: { [query.sortBy || 'generatedAt']: query.sortDirection || 'desc' },
      take: query.limit || 50,
      skip: query.offset || 0,
    });

    return { results: records.map((r: any) => this.toDto(r)), total };
  }

  async getHealthStats() {
    const count = await this.db.tradePlanResult.count();
    const latest = await this.db.tradePlanResult.findFirst({ orderBy: { generatedAt: 'desc' } });
    return {
      count,
      latestGeneratedAt: latest?.generatedAt.toISOString() || null,
      modelVersion: 'trade-plan-risk-v1',
    };
  }

  private toDto(record: any): TradePlanResultDto {
    const parseJson = (val: any) => {
      if (typeof val === 'string') return JSON.parse(val);
      return val;
    };

    return {
      id: record.id,
      instrumentId: record.instrumentId,
      symbol: record.symbol,
      strategyDecisionId: record.strategyDecisionId,
      portfolioId: record.portfolioId,
      strategy: record.strategy,
      strategyVersion: record.strategyVersion,
      planStatus: record.planStatus as any,
      riskGrade: record.riskGrade as any,
      entryZone: parseJson(record.entryZone) || null,
      stopLoss: parseJson(record.stopLoss) || null,
      target: parseJson(record.target) || null,
      rewardRiskRatio: record.rewardRiskRatio,
      positionSizing: parseJson(record.positionSizing) || null,
      portfolioImpact: parseJson(record.portfolioImpact) || null,
      invalidationRules: parseJson(record.invalidationRules) || [],
      warnings: parseJson(record.warnings) || [],
      blockers: parseJson(record.blockers) || [],
      dataGaps: parseJson(record.dataGaps) || [],
      generatedAt: record.generatedAt.toISOString(),
      generatedDate: record.generatedDate?.toISOString(),
      modelVersion: record.modelVersion,
    };
  }
}
