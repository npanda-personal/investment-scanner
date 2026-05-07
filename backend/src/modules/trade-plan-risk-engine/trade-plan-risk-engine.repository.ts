import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type { TradePlanResultDto, TradePlanListQuery } from './trade-plan-risk-engine.types';

export class TradePlanRiskEngineRepository {
  private db = prisma;

  async upsert(data: TradePlanResultDto): Promise<TradePlanResultDto> {
    const generatedDate = new Date();
    generatedDate.setUTCHours(0, 0, 0, 0);
    const portfolioKey = data.portfolioId || 'NO_PORTFOLIO';

    const record = await this.db.tradePlanResult.upsert({
      where: {
        instrumentId_strategy_modelVersion_generatedDate_region_assetType_portfolioKey: {
          instrumentId: data.instrumentId,
          strategy: data.strategy,
          modelVersion: data.modelVersion,
          generatedDate: generatedDate,
          region: data.region || 'IN',
          assetType: data.assetType || 'STOCK',
          portfolioKey,
        },
      },
      create: {
        instrumentId: data.instrumentId,
        symbol: data.symbol,
        strategyDecisionId: data.strategyDecisionId,
        portfolioId: data.portfolioId,
        portfolioKey,
        region: data.region || 'IN',
        assetType: data.assetType || 'STOCK',
        strategy: data.strategy,
        strategyVersion: data.strategyVersion,
        strategyRating: data.strategyRating,
        readinessLabel: data.readinessLabel,
        backtestTimeframe: data.backtestTimeframe,
        backtestSummary: data.backtestSummary ? data.backtestSummary as any : Prisma.DbNull,
        strategyProofSnapshot: data.strategyProofSnapshot ? data.strategyProofSnapshot as any : Prisma.DbNull,
        strategyDecisionSnapshot: data.strategyDecisionSnapshot ? data.strategyDecisionSnapshot as any : Prisma.DbNull,
        latestPrice: data.latestPrice ?? null,
        latestPriceTimestamp: data.latestPriceTimestamp ? new Date(data.latestPriceTimestamp) : null,
        marketDataSnapshot: data.marketDataSnapshot ? data.marketDataSnapshot as any : Prisma.DbNull,
        dataQualitySnapshot: data.dataQualitySnapshot ? data.dataQualitySnapshot as any : Prisma.DbNull,
        paperReadinessStatus: data.paperReadinessStatus,
        paperReadinessReasons: data.paperReadinessReasons as any,
        paperReadinessBlockers: data.paperReadinessBlockers as any,
        proofGeneratedAt: data.proofGeneratedAt ? new Date(data.proofGeneratedAt) : null,
        snapshotVersion: data.snapshotVersion,
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
        portfolioKey,
        region: data.region || 'IN',
        assetType: data.assetType || 'STOCK',
        strategyRating: data.strategyRating,
        readinessLabel: data.readinessLabel,
        backtestTimeframe: data.backtestTimeframe,
        backtestSummary: data.backtestSummary ? data.backtestSummary as any : Prisma.DbNull,
        strategyProofSnapshot: data.strategyProofSnapshot ? data.strategyProofSnapshot as any : Prisma.DbNull,
        strategyDecisionSnapshot: data.strategyDecisionSnapshot ? data.strategyDecisionSnapshot as any : Prisma.DbNull,
        latestPrice: data.latestPrice ?? null,
        latestPriceTimestamp: data.latestPriceTimestamp ? new Date(data.latestPriceTimestamp) : null,
        marketDataSnapshot: data.marketDataSnapshot ? data.marketDataSnapshot as any : Prisma.DbNull,
        dataQualitySnapshot: data.dataQualitySnapshot ? data.dataQualitySnapshot as any : Prisma.DbNull,
        paperReadinessStatus: data.paperReadinessStatus,
        paperReadinessReasons: data.paperReadinessReasons as any,
        paperReadinessBlockers: data.paperReadinessBlockers as any,
        proofGeneratedAt: data.proofGeneratedAt ? new Date(data.proofGeneratedAt) : null,
        snapshotVersion: data.snapshotVersion,
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
    if (query.region) where.region = query.region;
    if (query.assetType) where.assetType = query.assetType;
    if (query.strategyCode) where.strategy = query.strategyCode;
    if (query.planStatus) where.planStatus = query.planStatus;
    if (query.riskGrade) where.riskGrade = query.riskGrade;
    if (query.paperReadyOnly) where.paperReadinessStatus = 'READY_FOR_PAPER_REVIEW';
    if (query.paperReadinessStatus) where.paperReadinessStatus = query.paperReadinessStatus;
    if (query.backtestTimeframe) where.backtestTimeframe = query.backtestTimeframe;
    if (query.strategyRating) where.strategyRating = query.strategyRating;
    if (query.readinessLabel) where.readinessLabel = query.readinessLabel;
    if (query.portfolioId) where.portfolioId = query.portfolioId;
    if (query.minRewardRisk !== undefined) where.rewardRiskRatio = { gte: query.minRewardRisk };

    const sortBy = this.sortBy(query.sortBy);

    const total = await this.db.tradePlanResult.count({ where });
    const records = await this.db.tradePlanResult.findMany({
      where,
      orderBy: { [sortBy]: query.sortDirection || 'desc' },
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
      region: record.region,
      assetType: record.assetType,
      strategy: record.strategy,
      strategyVersion: record.strategyVersion,
      strategyRating: record.strategyRating,
      readinessLabel: record.readinessLabel,
      backtestTimeframe: record.backtestTimeframe,
      backtestSummary: parseJson(record.backtestSummary) || null,
      strategyProofSnapshot: parseJson(record.strategyProofSnapshot) || null,
      strategyDecisionSnapshot: parseJson(record.strategyDecisionSnapshot) || null,
      latestPrice: record.latestPrice,
      latestPriceTimestamp: record.latestPriceTimestamp?.toISOString() || null,
      marketDataSnapshot: parseJson(record.marketDataSnapshot) || null,
      dataQualitySnapshot: parseJson(record.dataQualitySnapshot) || null,
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
      paperReadinessStatus: record.paperReadinessStatus as any,
      paperReadinessReasons: parseJson(record.paperReadinessReasons) || [],
      paperReadinessBlockers: parseJson(record.paperReadinessBlockers) || [],
      proofGeneratedAt: record.proofGeneratedAt?.toISOString() || null,
      snapshotVersion: record.snapshotVersion,
      generatedAt: record.generatedAt.toISOString(),
      generatedDate: record.generatedDate?.toISOString(),
      modelVersion: record.modelVersion,
    };
  }

  private sortBy(value?: string) {
    const allowed = new Set(['generatedAt', 'rewardRiskRatio', 'riskGrade', 'planStatus', 'paperReadinessStatus', 'strategyRating']);
    return allowed.has(value || '') ? value! : 'generatedAt';
  }
}
