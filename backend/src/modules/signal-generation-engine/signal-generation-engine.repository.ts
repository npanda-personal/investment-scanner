import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type { SignalHistoryQuery, SignalQuery, SignalResultDto } from './signal-generation-engine.types';
import { resolveMarketRegionFilter } from '../../shared/utils/market-scope';

export interface SignalFunnelDiagnosticsQuery {
  region?: string;
  assetType?: string;
  generatedDate?: string;
  from?: string;
  to?: string;
}

export class SignalGenerationEngineRepository {
  constructor(private readonly db = prisma) {}

  async createSignalResult(result: SignalResultDto): Promise<SignalResultDto> {
    const generatedAt = new Date(result.generated_at);
    const generatedDate = this.normalizeUtcDay(generatedAt);
    const modelVersion = result.modelVersion || 'signal-engine-v1';
    const data = {
      instrumentId: result.instrument_id,
      symbol: result.symbol,
      companyName: result.company_name,
      sector: result.sector,
      country: result.country,
      score: result.score,
      direction: result.direction,
      confidence: result.confidence,
      triggeredSignals: result.triggered_signals as unknown as Prisma.InputJsonValue,
      negativeSignals: result.negative_signals as unknown as Prisma.InputJsonValue,
      explanation: result.explanation,
      generatedAt,
      generatedDate,
      modelVersion,
      source: result.source,
      dataStatus: result.data_status,
    };
    const saved = await this.db.signalResult.upsert({
      where: {
        instrumentId_modelVersion_generatedDate: {
          instrumentId: result.instrument_id,
          modelVersion,
          generatedDate,
        },
      },
      create: data,
      update: data,
    });
    return this.toDto(saved);
  }

  async latestForInstrument(instrumentId: string): Promise<SignalResultDto | null> {
    const result = await this.db.signalResult.findFirst({
      where: { instrumentId },
      orderBy: { generatedAt: 'desc' },
    });
    return result ? this.toDto(result) : null;
  }

  async latestSignals(query: SignalQuery): Promise<{ signals: SignalResultDto[], total: number }> {
    const where = this.buildWhere(query);
    
    // We want the latest signal per instrument that matches the criteria.
    // To use distinct in Prisma, we must order by the distinct field first.
    const results = await this.db.signalResult.findMany({
      where,
      orderBy: [
        { instrumentId: 'asc' },
        { generatedAt: 'desc' },
      ],
      distinct: ['instrumentId'],
    });

    let finalResults = results.map(item => this.toDto(item));

    // Post-filtering for signalType if present (since it's inside JSON)
    if (query.signalType) {
      finalResults = finalResults.filter(result => this.hasSignal(result, query.signalType!));
    }
    
    // Custom sorting on the reduced set
    const sortBy = query.sortBy || 'score';
    const sortDirection = query.sortDirection === 'asc' ? 1 : -1;
    finalResults.sort((a: any, b: any) => {
      let left = a[sortBy];
      let right = b[sortBy];
      
      // Handle nulls in sorting
      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;

      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * sortDirection;
      }
      return String(left).localeCompare(String(right)) * sortDirection;
    });

    const total = finalResults.length;
    const offset = query.offset || 0;
    const limit = query.limit || 25;

    return {
      signals: finalResults.slice(offset, offset + limit),
      total,
    };
  }

  async latestSignalUniverse(query: SignalQuery): Promise<SignalResultDto[]> {
    const results = await this.db.signalResult.findMany({
      where: this.buildWhere(query),
      orderBy: [{ instrumentId: 'asc' }, { generatedAt: 'desc' }],
      distinct: ['instrumentId'],
      skip: query.offset ?? 0,
      take: query.limit,
    });
    return results.map((item) => this.toDto(item)).filter((result) => !query.signalType || this.hasSignal(result, query.signalType));
  }

  async latestSignalUniverseCount(query: Omit<SignalQuery, 'limit'>): Promise<number> {
    const groups = await this.db.signalResult.groupBy({
      by: ['instrumentId'],
      where: this.buildWhere(query as SignalQuery),
    });
    return groups.length;
  }

  async funnelDiagnostics(query: SignalFunnelDiagnosticsQuery) {
    const results = await this.db.signalResult.findMany({
      where: this.buildWhere({
        limit: 5000,
        region: query.region,
        assetType: query.assetType,
        from: query.from,
        to: query.to,
        generatedDate: query.generatedDate,
      } as SignalQuery & SignalFunnelDiagnosticsQuery),
      orderBy: [{ instrumentId: 'asc' }, { generatedAt: 'desc' }],
      distinct: ['instrumentId'],
    });

    const byDirection = results.reduce<Record<string, number>>((acc, item) => {
      acc[item.direction] = (acc[item.direction] || 0) + 1;
      return acc;
    }, {});

    return {
      total: results.length,
      bullish: byDirection.BULLISH || 0,
      bearish: byDirection.BEARISH || 0,
      neutral: byDirection.NEUTRAL || 0,
      byDirection,
    };
  }

  async signalHistory(query: SignalHistoryQuery): Promise<SignalResultDto[]> {
    const results = await this.db.signalResult.findMany({
      where: {
        ...this.buildWhere(query),
        instrumentId: query.instrumentId,
        generatedAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      orderBy: { generatedAt: 'desc' },
      take: query.limit,
      skip: query.offset ?? 0,
    });
    return results.map((item) => this.toDto(item)).filter((result) => !query.signalType || this.hasSignal(result, query.signalType));
  }

  async signalHistoryCount(query: Omit<SignalHistoryQuery, 'limit'>): Promise<number> {
    return this.db.signalResult.count({
      where: {
        ...this.buildWhere(query as SignalQuery),
        instrumentId: query.instrumentId,
        generatedAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
    });
  }

  private buildWhere(query: SignalQuery & SignalFunnelDiagnosticsQuery): Prisma.SignalResultWhereInput {
    const generatedDate = query.generatedDate ? this.normalizeUtcDay(new Date(query.generatedDate)) : undefined;
    
    return {
      ...this.relatedMarketScopeFilter(query.region, query.assetType),
      direction: query.direction,
      confidence: query.confidence,
      score: query.minScore !== undefined ? { gte: query.minScore } : undefined,
      generatedDate,
      generatedAt: query.from || query.to ? {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      } : undefined,
      sector: query.sector ? { contains: query.sector, mode: 'insensitive' } : undefined,
      country: query.country ? { contains: query.country, mode: 'insensitive' } : undefined,
      OR: query.search ? [
        { symbol: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
      ] : undefined,
    };
  }

  private relatedMarketScopeFilter(region?: string, assetType?: string): Prisma.SignalResultWhereInput {
    const stockFilters: Prisma.StockWhereInput[] = [];
    const regionFilter = resolveMarketRegionFilter(region);
    if (Object.keys(regionFilter).length > 0) stockFilters.push(regionFilter);
    if (assetType) stockFilters.push({ assetType });
    return stockFilters.length > 0 ? { stock: { AND: stockFilters } } : {};
  }

  private hasSignal(result: SignalResultDto, signalType: string): boolean {
    const needle = signalType.toLowerCase();
    return [...result.triggered_signals, ...result.negative_signals].some((signal) =>
      signal.code.toLowerCase().includes(needle) || signal.category.toLowerCase() === needle
    );
  }

  private normalizeUtcDay(value: Date): Date {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private toDto(record: any): SignalResultDto {
    return {
      id: record.id,
      instrument_id: record.instrumentId,
      symbol: record.symbol,
      company_name: record.companyName,
      sector: record.sector,
      country: record.country,
      currentPrice: null,
      previousClose: null,
      dailyChange: null,
      dailyChangePercent: null,
      currency: null,
      priceTimestamp: null,
      score: record.score,
      direction: record.direction,
      confidence: record.confidence,
      triggered_signals: Array.isArray(record.triggeredSignals) ? record.triggeredSignals : [],
      negative_signals: Array.isArray(record.negativeSignals) ? record.negativeSignals : [],
      explanation: record.explanation,
      generated_at: record.generatedAt.toISOString(),
      modelVersion: record.modelVersion || 'signal-engine-v1',
      source: record.source,
      data_status: record.dataStatus,
    };
  }
}
