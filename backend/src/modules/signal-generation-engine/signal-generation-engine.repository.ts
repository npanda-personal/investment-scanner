import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type { SignalHistoryQuery, SignalQuery, SignalResultDto } from './signal-generation-engine.types';

export class SignalGenerationEngineRepository {
  constructor(private readonly db = prisma) {}

  async createSignalResult(result: SignalResultDto): Promise<SignalResultDto> {
    const created = await this.db.signalResult.create({
      data: {
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
        generatedAt: new Date(result.generated_at),
        modelVersion: result.modelVersion || 'signal-engine-v1',
        source: result.source,
        dataStatus: result.data_status,
      },
    });
    return this.toDto(created);
  }

  async latestForInstrument(instrumentId: string): Promise<SignalResultDto | null> {
    const result = await this.db.signalResult.findFirst({
      where: { instrumentId },
      orderBy: { generatedAt: 'desc' },
    });
    return result ? this.toDto(result) : null;
  }

  async latestSignals(query: SignalQuery): Promise<SignalResultDto[]> {
    const results = await this.db.signalResult.findMany({
      where: {
        direction: query.direction,
        score: query.minScore !== undefined ? { gte: query.minScore } : undefined,
        sector: query.sector ? { equals: query.sector, mode: 'insensitive' } : undefined,
        country: query.country ? { equals: query.country, mode: 'insensitive' } : undefined,
      },
      orderBy: [{ generatedAt: 'desc' }, { score: 'desc' }],
      take: Math.max(query.limit * 5, query.limit),
    });

    const latestByInstrument = new Map<string, SignalResultDto>();
    for (const result of results.map((item) => this.toDto(item))) {
      if (query.signalType && !this.hasSignal(result, query.signalType)) continue;
      if (!latestByInstrument.has(result.instrument_id)) latestByInstrument.set(result.instrument_id, result);
      if (latestByInstrument.size >= query.limit) break;
    }
    return [...latestByInstrument.values()].sort((a, b) => b.score - a.score);
  }

  async signalHistory(query: SignalHistoryQuery): Promise<SignalResultDto[]> {
    const results = await this.db.signalResult.findMany({
      where: {
        instrumentId: query.instrumentId,
        direction: query.direction,
        score: query.minScore !== undefined ? { gte: query.minScore } : undefined,
        sector: query.sector ? { equals: query.sector, mode: 'insensitive' } : undefined,
        country: query.country ? { equals: query.country, mode: 'insensitive' } : undefined,
        generatedAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      orderBy: { generatedAt: 'desc' },
      take: query.limit,
    });
    return results.map((item) => this.toDto(item)).filter((result) => !query.signalType || this.hasSignal(result, query.signalType));
  }

  private hasSignal(result: SignalResultDto, signalType: string): boolean {
    const needle = signalType.toLowerCase();
    return [...result.triggered_signals, ...result.negative_signals].some((signal) =>
      signal.code.toLowerCase().includes(needle) || signal.category.toLowerCase() === needle
    );
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
