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

  async latestForInstrument(instrumentId: string, calibrationModelVersion?: string): Promise<SignalCalibrationResultDto | null> {
    const result = await this.db.signalCalibrationResult.findFirst({
      where: { instrumentId, calibrationModelVersion },
      orderBy: [{ generatedAt: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
    });
    return result ? this.toDto(result) : null;
  }

  async latestForInstruments(instrumentIds: string[], calibrationModelVersion?: string): Promise<SignalCalibrationResultDto[]> {
    const uniqueIds = [...new Set(instrumentIds.filter(Boolean))];
    if (uniqueIds.length === 0) return [];
    const rows = await this.db.signalCalibrationResult.findMany({
      where: { instrumentId: { in: uniqueIds }, calibrationModelVersion },
      orderBy: [{ instrumentId: 'asc' }, { generatedAt: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      distinct: ['instrumentId'],
    });
    return rows.map((row) => this.toDto(row));
  }

  async top(query: CalibrationQuery): Promise<PaginatedCalibrationResponse> {
    const where: Prisma.SignalCalibrationResultWhereInput = {
      calibrationModelVersion: query.calibrationModelVersion,
    };

    const stockWhere = this.stockWhere(query.region, query.assetType);
    if (Object.keys(stockWhere).length > 0) {
      where.instrumentId = { in: await this.instrumentIdsInScope(stockWhere) };
    }

    if (query.search) {
      where.OR = [
        { symbol: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const limit = query.limit || 25;
    const offset = query.offset || 0;

    const rows = await this.db.signalCalibrationResult.findMany({
      where,
      orderBy: [{ generatedAt: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      distinct: ['instrumentId'],
    });

    const latestRows = this.latestRowPerInstrument(rows);
    const filtered = latestRows
      .map((row) => this.toDto(row))
      .filter((item) => this.matchesQuery(item, query))
      .sort((a, b) => this.compareForSort(a, b, query));
    const totalCount = filtered.length;
    const items = await this.attachMarketMetadata(filtered.slice(offset, offset + limit));
    return {
      items,
      totalCount,
      limit,
      offset,
      hasMore: offset + limit < totalCount,
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

  private latestRowPerInstrument(rows: any[]): any[] {
    const seen = new Set<string>();
    const latestRows: any[] = [];
    for (const row of rows) {
      const instrumentId = String(row.instrumentId || '').trim();
      if (!instrumentId || seen.has(instrumentId)) continue;
      seen.add(instrumentId);
      latestRows.push(row);
    }
    return latestRows;
  }

  private matchesQuery(item: SignalCalibrationResultDto, query: CalibrationQuery): boolean {
    if (query.direction && item.calibratedDirection !== query.direction) return false;
    if (query.confidence && item.rawConfidence !== query.confidence) return false;
    if (query.minRawScore !== undefined && item.rawScore < query.minRawScore) return false;
    const minCalibratedScore = query.minCalibratedScore ?? query.minScore;
    if (minCalibratedScore !== undefined && item.calibratedScore < minCalibratedScore) return false;
    if (query.minAbsDelta !== undefined && Math.abs(item.scoreDelta) < query.minAbsDelta) return false;
    if (query.sector && String(item.sector || '').toLowerCase() !== query.sector.toLowerCase()) return false;
    if (query.country && String(item.country || '').toLowerCase() !== query.country.toLowerCase()) return false;
    if (query.hasDataGaps !== undefined && (item.dataGaps.length > 0) !== query.hasDataGaps) return false;
    if (query.calibrationConfidence && item.calibratedConfidence !== query.calibrationConfidence) return false;
    return true;
  }

  private compareForSort(a: SignalCalibrationResultDto, b: SignalCalibrationResultDto, query: CalibrationQuery): number {
    const direction = query.sortDirection === 'asc' ? 1 : -1;
    let comparison = 0;
    if (query.sortBy === 'symbol') comparison = a.symbol.localeCompare(b.symbol);
    else if (query.sortBy === 'rawScore') comparison = a.rawScore - b.rawScore;
    else if (query.sortBy === 'scoreDelta' || query.sortBy === 'delta') comparison = a.scoreDelta - b.scoreDelta;
    else if (query.sortBy === 'generatedAt' || query.sortBy === 'calibratedAt') comparison = new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime();
    else comparison = a.calibratedScore - b.calibratedScore;
    if (comparison !== 0) return comparison * direction;
    return a.symbol.localeCompare(b.symbol) || a.instrumentId.localeCompare(b.instrumentId) || String(a.id || '').localeCompare(String(b.id || ''));
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

}
