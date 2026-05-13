import type { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type { CalibrationQuery, PaginatedCalibrationResponse, SignalCalibrationResultDto } from './signal-calibration-engine.types';
import { resolveMarketRegionFilter } from '../../shared/utils/market-scope';

export class SignalCalibrationEngineRepository {
  constructor(private readonly db = prisma) {}

  async create(result: SignalCalibrationResultDto): Promise<SignalCalibrationResultDto> {
    const data = {
      signalResultId: result.signalResultId,
      instrumentId: result.instrumentId,
      symbol: result.symbol,
      companyName: result.companyName,
      sector: result.sector,
      country: result.country,
      rawScore: result.rawScore,
      calibratedScore: result.calibratedScore,
      scoreDelta: result.scoreDelta,
      rawDirection: result.rawDirection,
      calibratedDirection: result.calibratedDirection,
      rawConfidence: result.rawConfidence,
      calibratedConfidence: result.calibratedConfidence,
      boosts: result.boosts as unknown as Prisma.InputJsonValue,
      penalties: result.penalties as unknown as Prisma.InputJsonValue,
      calibrationReasons: result.calibrationReasons as unknown as Prisma.InputJsonValue,
      dataGaps: result.dataGaps as unknown as Prisma.InputJsonValue,
      calibrationModelVersion: result.calibrationModelVersion,
      rawSignalModelVersion: result.rawSignalModelVersion,
      generatedAt: new Date(result.generatedAt),
    };
    const saved = await this.db.signalCalibrationResult.upsert({
      where: {
        signalResultId_calibrationModelVersion: {
          signalResultId: result.signalResultId,
          calibrationModelVersion: result.calibrationModelVersion,
        },
      },
      create: data,
      update: data,
    });
    return { ...result, ...this.toDto(saved), ...this.evidenceFields(result) };
  }

  async latestForInstrument(instrumentId: string): Promise<SignalCalibrationResultDto | null> {
    const result = await this.db.signalCalibrationResult.findFirst({
      where: { instrumentId },
      orderBy: { generatedAt: 'desc' },
    });
    return result ? this.toDto(result) : null;
  }

  async top(query: CalibrationQuery): Promise<PaginatedCalibrationResponse> {
    const where: Prisma.SignalCalibrationResultWhereInput = {
      calibratedDirection: query.direction,
      rawConfidence: query.confidence,
      rawScore: query.minRawScore !== undefined ? { gte: query.minRawScore } : undefined,
      calibratedScore: query.minCalibratedScore !== undefined || query.minScore !== undefined
        ? { gte: query.minCalibratedScore ?? query.minScore }
        : undefined,
      sector: query.sector ? { equals: query.sector, mode: 'insensitive' } : undefined,
      country: query.country ? { equals: query.country, mode: 'insensitive' } : undefined,
      calibratedConfidence: this.confidenceFilter(query),
      dataGaps: query.hasDataGaps === undefined ? undefined : query.hasDataGaps ? { not: [] as any } : { equals: [] as any },
    };
    if (query.minAbsDelta !== undefined) {
      where.OR = [
        { scoreDelta: { gte: query.minAbsDelta } },
        { scoreDelta: { lte: -query.minAbsDelta } },
      ];
    }

    if (query.search) {
      where.AND = [
        ...this.asAndArray(where.AND),
        {
          OR: [
        { symbol: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const stockWhere = this.stockWhere(query.region, query.assetType);
    if (Object.keys(stockWhere).length > 0) {
      where.instrumentId = { in: await this.instrumentIdsInScope(stockWhere) };
    }

    const orderBy: Prisma.SignalCalibrationResultOrderByWithRelationInput = {};
    if (query.sortBy === 'symbol') orderBy.symbol = query.sortDirection;
    else if (query.sortBy === 'rawScore') orderBy.rawScore = query.sortDirection;
    else if (query.sortBy === 'calibratedScore') orderBy.calibratedScore = query.sortDirection;
    else if (query.sortBy === 'scoreDelta' || query.sortBy === 'delta') orderBy.scoreDelta = query.sortDirection;
    else orderBy.generatedAt = query.sortDirection || 'desc';

    const limit = query.limit || 25;
    const offset = query.offset || 0;

    const [totalCount, rows] = await Promise.all([
      this.db.signalCalibrationResult.count({ where }),
      this.db.signalCalibrationResult.findMany({
        where,
        orderBy: [orderBy, { id: 'asc' }],
        take: limit,
        skip: offset,
      }),
    ]);

    const items = await this.attachMarketMetadata(rows.map((row) => this.toDto(row)));
    return {
      items,
      totalCount,
      limit,
      offset,
      hasMore: offset + rows.length < totalCount,
      sortBy: query.sortBy || 'generatedAt',
      sortDirection: query.sortDirection || 'desc',
    };
  }

  async count() {
    const [total, latest] = await Promise.all([
      this.db.signalCalibrationResult.count(),
      this.db.signalCalibrationResult.findFirst({ orderBy: { generatedAt: 'desc' } }),
    ]);
    return { total, latestGeneratedAt: latest?.generatedAt ?? null };
  }

  async instrumentInScope(instrumentId: string, region?: string, assetType?: string) {
    const where = this.stockWhere(region, assetType);
    const stock = await this.db.stock.findFirst({
      where: { ...where, id: instrumentId },
      select: { id: true, symbol: true, name: true, exchange: true, region: true, country: true, assetType: true },
    });
    return stock;
  }

  private toDto(row: any): SignalCalibrationResultDto {
    return {
      id: row.id,
      signalResultId: row.signalResultId,
      instrumentId: row.instrumentId,
      symbol: row.symbol,
      companyName: row.companyName,
      sector: row.sector,
      country: row.country,
      exchange: row.exchange ?? null,
      region: row.region ?? null,
      assetType: row.assetType ?? null,
      rawScore: row.rawScore,
      calibratedScore: row.calibratedScore,
      scoreDelta: row.scoreDelta,
      rawDirection: row.rawDirection as any,
      calibratedDirection: row.calibratedDirection as any,
      rawConfidence: row.rawConfidence as any,
      calibratedConfidence: row.calibratedConfidence as any,
      boosts: Array.isArray(row.boosts) ? row.boosts : [],
      penalties: Array.isArray(row.penalties) ? row.penalties : [],
      calibrationReasons: Array.isArray(row.calibrationReasons) ? row.calibrationReasons : [],
      dataGaps: Array.isArray(row.dataGaps) ? row.dataGaps : [],
      calibrationModelVersion: row.calibrationModelVersion,
      rawSignalModelVersion: row.rawSignalModelVersion,
      generatedAt: row.generatedAt.toISOString(),
      dataStatus: row.dataGaps?.length ? 'PARTIAL' : 'COMPLETE',
      researchUrl: `/research/stocks/${row.instrumentId}`,
    };
  }

  private async instrumentIdsInScope(stockWhere: Prisma.StockWhereInput): Promise<string[]> {
    const stocks = await this.db.stock.findMany({ where: stockWhere, select: { id: true } });
    return stocks.map((stock) => stock.id);
  }

  private stockWhere(region?: string, assetType?: string): Prisma.StockWhereInput {
    const filters: Prisma.StockWhereInput[] = [];
    const regionFilter = resolveMarketRegionFilter(region);
    if (Object.keys(regionFilter).length > 0) filters.push(regionFilter);
    const normalizedAssetType = assetType?.trim().toUpperCase();
    if (normalizedAssetType === 'STOCK') {
      filters.push({ OR: [{ assetType: { in: ['STOCK', 'EQUITY'], mode: 'insensitive' } }, { assetType: null }] });
    } else if (normalizedAssetType) {
      filters.push({ assetType: { equals: normalizedAssetType, mode: 'insensitive' } });
    }
    return filters.length > 0 ? { AND: filters } : {};
  }

  private confidenceFilter(query: CalibrationQuery): string | Prisma.StringFilter | undefined {
    if (query.calibrationConfidence) return query.calibrationConfidence;
    if (query.evidenceStatus === 'INSUFFICIENT') return 'INSUFFICIENT_SAMPLE';
    if (query.evidenceStatus === 'LOW_SAMPLE') return 'LOW';
    if (query.evidenceStatus === 'SUFFICIENT') return { in: ['MEDIUM', 'HIGH'] };
    return undefined;
  }

  private async attachMarketMetadata(items: SignalCalibrationResultDto[]): Promise<SignalCalibrationResultDto[]> {
    if (items.length === 0) return items;
    const stocks = await this.db.stock.findMany({
      where: { id: { in: [...new Set(items.map((item) => item.instrumentId))] } },
      select: { id: true, exchange: true, region: true, assetType: true, country: true, name: true },
    });
    const byId = new Map(stocks.map((stock) => [stock.id, stock]));
    return items.map((item) => {
      const stock = byId.get(item.instrumentId);
      return stock ? {
        ...item,
        companyName: item.companyName ?? stock.name ?? null,
        exchange: stock.exchange ?? null,
        region: stock.region ?? null,
        assetType: stock.assetType ?? null,
        country: item.country ?? stock.country ?? null,
      } : item;
    });
  }

  private evidenceFields(result: SignalCalibrationResultDto) {
    return {
      calibrationApplied: result.calibrationApplied,
      adjustmentCapApplied: result.adjustmentCapApplied,
      sampleSizePenaltyApplied: result.sampleSizePenaltyApplied,
      calibrationEvidence: result.calibrationEvidence,
      calibrationReadiness: result.calibrationReadiness,
      overallEvaluatedSamples: result.overallEvaluatedSamples,
      groupEvaluatedSamples: result.groupEvaluatedSamples,
      evidenceStatus: result.evidenceStatus,
      confidenceTier: result.confidenceTier,
      downstreamInfluence: result.downstreamInfluence,
      authoritativeScore: result.authoritativeScore,
      warningsCount: result.warningsCount,
    };
  }

  private asAndArray(value: Prisma.SignalCalibrationResultWhereInput['AND']): Prisma.SignalCalibrationResultWhereInput[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }
}
