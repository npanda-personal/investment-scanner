import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type { TradePlanResultDto, TradePlanListQuery, TradePlanFunnelQuery } from './trade-plan-risk-engine.types';
import { applyLongPlanGeometryGuards, canonicalizeTradePlanReadiness } from './trade-plan-risk-engine.geometry';

export class TradePlanRiskEngineRepository {
  private db = prisma;
  private readonly repairBatchSize = 500;

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

  async latestForInstrument(
    instrumentId: string,
    strategy?: string,
    portfolioId?: string,
    scope: { region?: string; assetType?: string } = {}
  ): Promise<TradePlanResultDto | null> {
    const where: Prisma.TradePlanResultWhereInput = { instrumentId };
    if (strategy) where.strategy = strategy;
    if (portfolioId) where.portfolioId = portfolioId;
    if (scope.region) where.region = scope.region;
    if (scope.assetType) where.assetType = scope.assetType;
    (where as any).strategyProofSnapshot = { path: ['frameworkBacked'], equals: true };

    const record = await this.db.tradePlanResult.findFirst({
      where,
      orderBy: { generatedAt: 'desc' },
    });

    if (!record) return null;
    const [dto] = await this.canonicalizeAndRepairRecords([record]);
    return dto;
  }

  async list(query: TradePlanListQuery): Promise<{ results: TradePlanResultDto[]; total: number }> {
    const repairScope = this.buildListWhere(query, { includeCanonicalFilters: false });
    await this.repairCanonicalRowsInScope(repairScope);

    const where = this.buildListWhere(query);

    const sortBy = this.sortBy(query.sortBy);

    const total = await this.db.tradePlanResult.count({ where });
    const records = await this.db.tradePlanResult.findMany({
      where,
      orderBy: { [sortBy]: query.sortDirection || 'desc' },
      take: query.limit || 50,
      skip: query.offset || 0,
    });

    return { results: await this.canonicalizeAndRepairRecords(records), total };
  }

  async funnelPlans(query: TradePlanFunnelQuery): Promise<TradePlanResultDto[]> {
    const where = this.buildListWhere(query, { includeCanonicalFilters: false });
    if (query.generatedDate) where.generatedDate = this.normalizeUtcDay(query.generatedDate);
    if (query.from || query.to) {
      where.generatedAt = {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      };
    }
    if (!query.generatedDate && !query.from && !query.to) {
      const latest = await this.db.tradePlanResult.findFirst({
        where: { ...where },
        orderBy: { generatedDate: 'desc' },
        select: { generatedDate: true },
      });
      if (latest?.generatedDate) where.generatedDate = latest.generatedDate;
    }

    await this.repairCanonicalRowsInScope(where);

    const records = await this.db.tradePlanResult.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      take: 5000,
    });
    return this.canonicalizeAndRepairRecords(records);
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

    return canonicalizeTradePlanReadiness(applyLongPlanGeometryGuards({
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
    }));
  }

  private async canonicalizeAndRepairRecords(records: any[]): Promise<TradePlanResultDto[]> {
    const results: TradePlanResultDto[] = [];
    for (const record of records) {
      const dto = this.toDto(record);
      await this.persistCanonicalRepairIfChanged(record, dto);
      results.push(dto);
    }
    return results;
  }

  private async repairCanonicalRowsInScope(where: Prisma.TradePlanResultWhereInput) {
    let cursor: { id: string } | undefined;
    for (;;) {
      const records = await this.db.tradePlanResult.findMany({
        where,
        orderBy: { id: 'asc' },
        take: this.repairBatchSize,
        ...(cursor ? { cursor, skip: 1 } : {}),
      });
      if (records.length === 0) break;
      await this.canonicalizeAndRepairRecords(records);
      if (records.length < this.repairBatchSize) break;
      cursor = { id: records[records.length - 1].id };
    }
  }

  private async persistCanonicalRepairIfChanged(record: any, dto: TradePlanResultDto) {
    const parseJson = (val: any) => {
      if (typeof val === 'string') return JSON.parse(val);
      return val;
    };
    const changed = dto.planStatus !== record.planStatus
      || dto.riskGrade !== record.riskGrade
      || JSON.stringify(dto.blockers || []) !== JSON.stringify(parseJson(record.blockers) || [])
      || JSON.stringify(dto.warnings || []) !== JSON.stringify(parseJson(record.warnings) || [])
      || JSON.stringify(dto.stopLoss || null) !== JSON.stringify(parseJson(record.stopLoss) || null)
      || dto.paperReadinessStatus !== record.paperReadinessStatus
      || JSON.stringify(dto.paperReadinessReasons || []) !== JSON.stringify(parseJson(record.paperReadinessReasons) || [])
      || JSON.stringify(dto.paperReadinessBlockers || []) !== JSON.stringify(parseJson(record.paperReadinessBlockers) || []);
    if (!changed) return;
    await this.db.tradePlanResult.update({
      where: { id: record.id },
      data: {
        planStatus: dto.planStatus,
        riskGrade: dto.riskGrade,
        blockers: dto.blockers as any,
        warnings: dto.warnings as any,
        stopLoss: dto.stopLoss ? dto.stopLoss as any : Prisma.DbNull,
        paperReadinessStatus: dto.paperReadinessStatus,
        paperReadinessReasons: dto.paperReadinessReasons as any,
        paperReadinessBlockers: dto.paperReadinessBlockers as any,
      },
    });
  }

  private sortBy(value?: string) {
    const allowed = new Set(['generatedAt', 'rewardRiskRatio', 'riskGrade', 'planStatus', 'paperReadinessStatus', 'strategyRating']);
    return allowed.has(value || '') ? value! : 'generatedAt';
  }

  private buildListWhere(
    query: TradePlanListQuery | TradePlanFunnelQuery,
    options: { includeCanonicalFilters?: boolean } = {}
  ): Prisma.TradePlanResultWhereInput {
    const includeCanonicalFilters = options.includeCanonicalFilters !== false;
    const where: Prisma.TradePlanResultWhereInput = {};
    if (query.region) where.region = query.region;
    if (query.assetType) where.assetType = query.assetType;
    if (query.strategyCode) where.strategy = query.strategyCode;
    if (includeCanonicalFilters && 'planStatus' in query && query.planStatus) where.planStatus = query.planStatus;
    if (includeCanonicalFilters && 'riskGrade' in query && query.riskGrade) where.riskGrade = query.riskGrade;
    if (includeCanonicalFilters && 'paperReadyOnly' in query && query.paperReadyOnly) where.paperReadinessStatus = 'READY_FOR_PAPER_REVIEW';
    if (includeCanonicalFilters && 'paperReadinessStatus' in query && query.paperReadinessStatus) where.paperReadinessStatus = query.paperReadinessStatus;
    if (query.backtestTimeframe) where.backtestTimeframe = query.backtestTimeframe;
    if ('strategyRating' in query && query.strategyRating) where.strategyRating = query.strategyRating;
    if ('readinessLabel' in query && query.readinessLabel) where.readinessLabel = query.readinessLabel;
    if ('portfolioId' in query && query.portfolioId) where.portfolioId = query.portfolioId;
    if ('minRewardRisk' in query && query.minRewardRisk !== undefined) where.rewardRiskRatio = { gte: query.minRewardRisk };
    if (!query.includeLegacy) {
      (where as any).strategyProofSnapshot = { path: ['frameworkBacked'], equals: true };
    }
    return where;
  }

  private normalizeUtcDay(value: string | Date): Date {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }
}
