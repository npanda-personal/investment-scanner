import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type { DataQualityEvaluationDto, DataQualityQuery, DataQualitySummary } from './data-quality-engine.types';
import { resolveRelatedMarketRegionFilter } from '../../shared/utils/market-scope';

export class DataQualityEngineRepository {
  constructor(private readonly db = prisma) {}

  async upsertEvaluation(evaluation: DataQualityEvaluationDto): Promise<DataQualityEvaluationDto> {
    const saved = await this.db.dataQualityEvaluation.upsert({
      where: { instrumentId: evaluation.instrumentId },
      create: this.toWrite(evaluation),
      update: this.toWrite(evaluation),
    });
    return this.toDto(saved);
  }

  async latestForInstrument(instrumentId: string): Promise<DataQualityEvaluationDto | null> {
    const evaluation = await this.db.dataQualityEvaluation.findUnique({ where: { instrumentId } });
    return evaluation ? this.toDto(evaluation) : null;
  }

  async latestForInstruments(instrumentIds: string[]): Promise<DataQualityEvaluationDto[]> {
    if (instrumentIds.length === 0) return [];
    const evaluations = await this.db.dataQualityEvaluation.findMany({
      where: { instrumentId: { in: instrumentIds } },
    });
    return evaluations.map((evaluation) => this.toDto(evaluation));
  }

  async list(query: DataQualityQuery): Promise<DataQualityEvaluationDto[]> {
    const rows = await this.db.dataQualityEvaluation.findMany({
      where: this.where(query),
      orderBy: this.orderBy(query),
      take: query.limit,
      skip: query.offset,
    });
    return rows.map((row) => this.toDto(row));
  }

  async count(query: Partial<DataQualityQuery> = {}): Promise<number> {
    return this.db.dataQualityEvaluation.count({ where: this.where(query) });
  }

  async summary(totalInstruments: number, query: Partial<DataQualityQuery> = {}): Promise<DataQualitySummary> {
    const base = { region: query.region, assetType: query.assetType };
    const [good, partial, poor, unusable, ready, latest, all] = await Promise.all([
      this.count({ ...base, status: 'GOOD' }),
      this.count({ ...base, status: 'PARTIAL' }),
      this.count({ ...base, status: 'POOR' }),
      this.count({ ...base, status: 'UNUSABLE' }),
      this.count({ ...base, readinessStatus: 'READY' }),
      this.db.dataQualityEvaluation.findFirst({
        where: this.where(base),
        orderBy: { evaluatedAt: 'desc' },
      }),
      this.db.dataQualityEvaluation.findMany({
        where: this.where(base),
      }),
    ]);
    const hasGap = (needle: string) => all.filter((item) => this.jsonArray(item.dataGaps).some((gap) => gap.includes(needle))).length;
    return {
      totalInstruments,
      goodCoverageCount: good,
      partialCoverageCount: partial,
      poorCoverageCount: poor,
      unusableCoverageCount: unusable,
      signalReadyCount: ready,
      notSignalReadyCount: Math.max(0, all.length - ready),
      stalePriceCount: hasGap('latest price is stale'),
      missingFundamentalsCount: hasGap('Fundamentals are missing'),
      missingSectorCount: hasGap('Sector metadata is missing'),
      missingIndustryCount: hasGap('Industry metadata is missing'),
      missingCountryCount: hasGap('Country metadata is missing'),
      lowLiquidityCount: all.filter((item) => ['THIN', 'ILLIQUID'].includes(item.liquidityStatus)).length,
      missingVolumeCount: all.filter((item) => item.liquidityStatus === 'UNKNOWN' || this.jsonArray(item.dataGaps).some((gap) => gap.includes('Volume data is missing'))).length,
      latestEvaluationAt: latest?.evaluatedAt.toISOString() ?? null,
      dataStatus: all.length === 0 ? 'MISSING' : all.length < totalInstruments ? 'PARTIAL' : 'COMPLETE',
    };
  }

  private where(query: Partial<DataQualityQuery>): any {
    const regionStockFilter = resolveRelatedMarketRegionFilter(query.region).stock as Prisma.StockWhereInput | undefined;
    const assetStockFilter = this.assetTypeWhere(query.assetType);
    const stockFilters = [regionStockFilter, assetStockFilter].filter((item): item is Prisma.StockWhereInput => Boolean(item && Object.keys(item).length > 0));
    const stockFilter: Prisma.StockWhereInput = stockFilters.length > 1 ? { AND: stockFilters } : stockFilters[0] || {};
    
    return {
      stock: Object.keys(stockFilter).length > 0 ? stockFilter : undefined,
      OR: query.search ? [
        { symbol: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
      ] : undefined,
      coverageStatus: query.status,
      signalReadinessStatus: query.readinessStatus,
      liquidityStatus: query.liquidityStatus,
      sector: query.sector ? { contains: query.sector, mode: 'insensitive' } : undefined,
      country: query.country ? { contains: query.country, mode: 'insensitive' } : undefined,
      eligibleForSignals: query.eligibleForSignals,
      eligibleForBacktesting: query.eligibleForBacktesting,
      coverageScore: query.minCoverageScore !== undefined ? { gte: query.minCoverageScore } : undefined,
      signalReadinessScore: query.minReadinessScore !== undefined ? { gte: query.minReadinessScore } : undefined,
    };
  }

  private orderBy(query: Partial<DataQualityQuery>): Prisma.DataQualityEvaluationOrderByWithRelationInput[] {
    const direction = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const allowed: Record<string, Prisma.DataQualityEvaluationOrderByWithRelationInput> = {
      symbol: { symbol: direction },
      companyName: { companyName: direction },
      coverageScore: { coverageScore: direction },
      signalReadinessScore: { signalReadinessScore: direction },
      liquidityScore: { liquidityScore: direction },
      evaluatedAt: { evaluatedAt: direction },
    };
    return [allowed[query.sortBy || ''] || { signalReadinessScore: 'asc' }, { evaluatedAt: 'desc' }];
  }

  private assetTypeWhere(assetType?: string): Prisma.StockWhereInput {
    const normalized = String(assetType || '').trim().toUpperCase();
    if (!normalized) return {};
    if (normalized === 'STOCK') {
      return {
        OR: [
          { assetType: { in: ['STOCK', 'EQUITY'], mode: 'insensitive' } },
          { assetType: null },
        ],
      };
    }
    return { assetType: { equals: normalized, mode: 'insensitive' } };
  }

  private toWrite(evaluation: DataQualityEvaluationDto) {
    return {
      instrumentId: evaluation.instrumentId,
      symbol: evaluation.symbol,
      companyName: evaluation.companyName,
      sector: evaluation.sector,
      industry: evaluation.industry,
      country: evaluation.country,
      currency: evaluation.currency,
      coverageScore: evaluation.coverageScore,
      coverageStatus: evaluation.coverageStatus,
      signalReadinessScore: evaluation.signalReadinessScore,
      signalReadinessStatus: evaluation.signalReadinessStatus,
      liquidityScore: evaluation.liquidityScore,
      liquidityStatus: evaluation.liquidityStatus,
      eligibleForSignals: evaluation.eligibleForSignals,
      eligibleForBacktesting: evaluation.eligibleForBacktesting,
      eligibleForCalibration: evaluation.eligibleForCalibration,
      dataGaps: evaluation.dataGaps as unknown as Prisma.InputJsonValue,
      warnings: evaluation.warnings as unknown as Prisma.InputJsonValue,
      readinessReasons: evaluation.readinessReasons as unknown as Prisma.InputJsonValue,
      readinessBlockers: evaluation.readinessBlockers as unknown as Prisma.InputJsonValue,
      evaluatedAt: new Date(evaluation.lastEvaluatedAt),
    };
  }

  private toDto(record: any): DataQualityEvaluationDto {
    return {
      id: record.id,
      instrumentId: record.instrumentId,
      symbol: record.symbol,
      companyName: record.companyName,
      sector: record.sector,
      industry: record.industry,
      country: record.country,
      currency: record.currency,
      coverageScore: record.coverageScore,
      coverageStatus: record.coverageStatus,
      signalReadinessScore: record.signalReadinessScore,
      signalReadinessStatus: record.signalReadinessStatus,
      liquidityScore: record.liquidityScore,
      liquidityStatus: record.liquidityStatus,
      eligibleForSignals: record.eligibleForSignals,
      eligibleForBacktesting: record.eligibleForBacktesting,
      eligibleForCalibration: record.eligibleForCalibration,
      dataGaps: this.jsonArray(record.dataGaps),
      warnings: this.jsonArray(record.warnings),
      readinessReasons: this.jsonArray(record.readinessReasons),
      readinessBlockers: this.jsonArray(record.readinessBlockers),
      recommendedFixes: this.recommendedFixes(this.jsonArray(record.dataGaps), this.jsonArray(record.readinessBlockers)),
      lastEvaluatedAt: record.evaluatedAt.toISOString(),
      researchUrl: `/research/stocks/${record.instrumentId}`,
    };
  }

  private jsonArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : [];
  }

  private recommendedFixes(gaps: string[], blockers: string[]): string[] {
    const text = [...gaps, ...blockers].join(' ');
    const fixes = new Set<string>();
    if (text.includes('price history') || text.includes('SMA200') || text.includes('backtesting')) fixes.add('Sync more historical price data.');
    if (text.includes('latest price')) fixes.add('Refresh latest price data.');
    if (text.includes('Sector') || text.includes('Industry')) fixes.add('Add sector/industry metadata.');
    if (text.includes('Country')) fixes.add('Add country metadata.');
    if (text.includes('Fundamentals')) fixes.add('Sync or add fundamentals.');
    if (text.includes('Volume')) fixes.add('Refresh price history with volume data.');
    return [...fixes];
  }
}
