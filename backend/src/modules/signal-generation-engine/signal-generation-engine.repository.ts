import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type { SignalGenerationRunAudit, SignalHistoryQuery, SignalQuery, SignalResultDto, SignalWriteResult, SignalWriteStatus } from './signal-generation-engine.types';
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
    return (await this.createSignalResultWithStatus(result)).result;
  }

  async createSignalResultWithStatus(result: SignalResultDto): Promise<SignalWriteResult> {
    const generatedAt = new Date(result.generated_at);
    const generatedDate = this.normalizeUtcDay(generatedAt);
    const modelVersion = result.modelVersion || 'signal-engine-v1';
    const rulesetVersion = result.rulesetVersion || modelVersion;
    const data = {
      instrumentId: result.instrument_id,
      generationRunId: result.generationRunId ?? null,
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
      rulesetVersion,
      sourceDataDate: result.sourceDataDate ? new Date(result.sourceDataDate) : null,
      sourcePriceDate: result.sourcePriceDate ? new Date(result.sourcePriceDate) : null,
      scoringInputSummary: result.scoringInputSummary as unknown as Prisma.InputJsonValue,
      dataQualityEligibilitySnapshot: result.dataQualityEligibility as unknown as Prisma.InputJsonValue,
      source: result.source,
      dataStatus: result.data_status,
    };
    const where = {
      instrumentId_modelVersion_generatedDate: {
        instrumentId: result.instrument_id,
        modelVersion,
        generatedDate,
      },
    };
    const existing = typeof this.db.signalResult.findUnique === 'function'
      ? await this.db.signalResult.findUnique({ where }).catch(() => null)
      : null;
    const saved = await this.db.signalResult.upsert({
      where,
      create: data,
      update: data,
    });
    return {
      result: this.toDto(saved),
      status: this.writeStatus(existing, data),
    };
  }

  async createRunAudit(input: {
    region: string;
    assetType: string;
    requestedByUserId: string;
    modelVersion: string;
    rulesetVersion: string;
    sourceDataDate: Date | null;
    generatedDate: Date;
    batchSize: number;
    offset: number;
    totalCount: number;
    warnings: string[];
  }): Promise<SignalGenerationRunAudit> {
    const created = await this.db.signalGenerationRun.create({
      data: {
        region: input.region,
        assetType: input.assetType,
        requestedByUserId: input.requestedByUserId,
        status: 'RUNNING',
        modelVersion: input.modelVersion,
        rulesetVersion: input.rulesetVersion,
        sourceDataDate: input.sourceDataDate,
        generatedDate: input.generatedDate,
        batchSize: input.batchSize,
        offset: input.offset,
        totalCount: input.totalCount,
        warnings: input.warnings as unknown as Prisma.InputJsonValue,
      },
    });
    return this.runToDto(created);
  }

  async completeRunAudit(id: string, input: {
    status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
    sourceDataDate: Date | null;
    processedCount: number;
    generatedCount: number;
    updatedCount: number;
    noOpCount: number;
    duplicateOrIdempotentCount: number;
    skippedCount: number;
    failedCount: number;
    excludedByDataQuality: number;
    missingQualityEvaluationCount: number;
    durationMs: number;
    warnings: string[];
  }): Promise<SignalGenerationRunAudit> {
    const updated = await this.db.signalGenerationRun.update({
      where: { id },
      data: {
        status: input.status,
        sourceDataDate: input.sourceDataDate,
        processedCount: input.processedCount,
        generatedCount: input.generatedCount,
        updatedCount: input.updatedCount,
        noOpCount: input.noOpCount,
        duplicateOrIdempotentCount: input.duplicateOrIdempotentCount,
        skippedCount: input.skippedCount,
        failedCount: input.failedCount,
        excludedByDataQuality: input.excludedByDataQuality,
        missingQualityEvaluationCount: input.missingQualityEvaluationCount,
        durationMs: input.durationMs,
        warnings: input.warnings as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
    return this.runToDto(updated);
  }

  async latestRunAudit(query: { region?: string; assetType?: string; modelVersion?: string }): Promise<SignalGenerationRunAudit | null> {
    const record = await this.db.signalGenerationRun.findFirst({
      where: {
        region: query.region,
        assetType: query.assetType,
        modelVersion: query.modelVersion,
      },
      orderBy: { startedAt: 'desc' },
    });
    return record ? this.runToDto(record) : null;
  }

  async latestForInstrument(instrumentId: string): Promise<SignalResultDto | null> {
    const result = await this.db.signalResult.findFirst({
      where: { instrumentId },
      orderBy: { generatedAt: 'desc' },
    });
    return result ? this.toDto(result) : null;
  }

  async latestSignals(query: SignalQuery): Promise<{ signals: SignalResultDto[], total: number }> {
    const finalResults = await this.latestFilteredSignals(query);
    const total = finalResults.length;
    const offset = query.offset || 0;
    const limit = query.limit || 25;

    return {
      signals: finalResults.slice(offset, offset + limit),
      total,
    };
  }

  async directionCounts(query: SignalQuery): Promise<Record<'BULLISH' | 'NEUTRAL' | 'BEARISH', number>> {
    const signals = await this.latestFilteredSignals({
      ...query,
      direction: undefined,
      offset: 0,
    });
    return signals.reduce<Record<'BULLISH' | 'NEUTRAL' | 'BEARISH', number>>((acc, signal) => {
      acc[signal.direction] += 1;
      return acc;
    }, { BULLISH: 0, NEUTRAL: 0, BEARISH: 0 });
  }

  async latestSignalUniverse(query: SignalQuery): Promise<SignalResultDto[]> {
    const results = await this.latestFilteredSignals(query);
    const offset = query.offset || 0;
    return results.slice(offset, offset + query.limit);
  }

  async latestSignalUniverseCount(query: Omit<SignalQuery, 'limit'>): Promise<number> {
    return (await this.latestFilteredSignals({ ...(query as SignalQuery), limit: Number.MAX_SAFE_INTEGER })).length;
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
      modelVersion: query.modelVersion,
      OR: query.search ? [
        { symbol: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
      ] : undefined,
    };
  }

  private async latestFilteredSignals(query: SignalQuery & Partial<SignalFunnelDiagnosticsQuery>): Promise<SignalResultDto[]> {
    const where = this.buildWhere({ ...query, direction: undefined, confidence: undefined, minScore: undefined, signalType: undefined });

    const results = await this.db.signalResult.findMany({
      where,
      orderBy: [
        { instrumentId: 'asc' },
        { generatedAt: 'desc' },
      ],
      distinct: ['instrumentId'],
    });

    return this.sortSignals(
      results.map((item) => this.toDto(item))
        .filter((result) => this.isTrustedReadSignal(result))
        .filter((result) => !query.direction || result.direction === query.direction)
        .filter((result) => !query.confidence || result.confidence === query.confidence)
        .filter((result) => query.minScore === undefined || result.score >= query.minScore)
        .filter((result) => !query.signalType || this.hasSignal(result, query.signalType)),
      query
    );
  }

  private sortSignals(results: SignalResultDto[], query: Pick<SignalQuery, 'sortBy' | 'sortDirection'>): SignalResultDto[] {
    const sortBy = this.normalizeSortBy(query.sortBy);
    const sortDirection = query.sortDirection === 'asc' ? 1 : -1;
    return [...results].sort((a, b) => {
      const left = this.sortValue(a, sortBy);
      const right = this.sortValue(b, sortBy);

      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;

      if (typeof left === 'number' && typeof right === 'number') return (left - right) * sortDirection;
      return String(left).localeCompare(String(right)) * sortDirection;
    });
  }

  private normalizeSortBy(value?: string): string {
    const normalized = String(value || '').trim();
    const allowed = new Set(['score', 'symbol', 'companyName', 'generatedAt', 'direction', 'confidence', 'dailyChangePercent']);
    return allowed.has(normalized) ? normalized : 'score';
  }

  private sortValue(signal: SignalResultDto, sortBy: string): string | number | null {
    switch (sortBy) {
      case 'symbol': return signal.symbol;
      case 'companyName': return signal.company_name;
      case 'generatedAt': return new Date(signal.generated_at).getTime();
      case 'direction': return signal.direction;
      case 'confidence': return signal.confidence;
      case 'dailyChangePercent': return signal.dailyChangePercent;
      case 'score':
      default:
        return signal.score;
    }
  }

  private relatedMarketScopeFilter(region?: string, assetType?: string): Prisma.SignalResultWhereInput {
    const stockFilters: Prisma.StockWhereInput[] = [];
    const regionFilter = resolveMarketRegionFilter(region);
    if (Object.keys(regionFilter).length > 0) stockFilters.push(regionFilter);
    const normalizedAssetType = assetType?.trim().toUpperCase();
    if (normalizedAssetType) {
      if (normalizedAssetType === 'STOCK' || normalizedAssetType === 'EQUITY') {
        stockFilters.push({
          OR: [
            { assetType: { in: ['STOCK', 'EQUITY'], mode: 'insensitive' } },
            { assetType: null },
          ],
        });
      } else {
        stockFilters.push({ assetType: { equals: normalizedAssetType, mode: 'insensitive' } });
      }
    }
    return stockFilters.length > 0 ? { stock: { AND: stockFilters } } : {};
  }

  private hasSignal(result: SignalResultDto, signalType: string): boolean {
    const needle = signalType.toLowerCase();
    return [...result.triggered_signals, ...result.negative_signals].some((signal) =>
      signal.code.toLowerCase().includes(needle) || signal.category.toLowerCase() === needle
    );
  }

  private isTrustedReadSignal(result: SignalResultDto): boolean {
    const dataQuality = result.dataQualityEligibility;
    return result.auditStatus === 'CURRENT'
      && dataQuality?.filterApplied === true
      && dataQuality.eligible === true
      && dataQuality.signalReadinessStatus === 'READY';
  }

  private normalizeUtcDay(value: Date): Date {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private writeStatus(existing: any, data: Record<string, unknown>): SignalWriteStatus {
    if (!existing) return 'CREATED';
    const same =
      existing.symbol === data.symbol &&
      existing.companyName === data.companyName &&
      existing.sector === data.sector &&
      existing.country === data.country &&
      existing.score === data.score &&
      existing.direction === data.direction &&
      existing.confidence === data.confidence &&
      JSON.stringify(existing.triggeredSignals || []) === JSON.stringify(data.triggeredSignals || []) &&
      JSON.stringify(existing.negativeSignals || []) === JSON.stringify(data.negativeSignals || []) &&
      existing.explanation === data.explanation &&
      (existing.rulesetVersion || existing.modelVersion) === data.rulesetVersion &&
      this.dateValue(existing.sourceDataDate) === this.dateValue(data.sourceDataDate) &&
      this.dateValue(existing.sourcePriceDate) === this.dateValue(data.sourcePriceDate) &&
      JSON.stringify(existing.scoringInputSummary || null) === JSON.stringify(data.scoringInputSummary || null) &&
      JSON.stringify(existing.dataQualityEligibilitySnapshot || null) === JSON.stringify(data.dataQualityEligibilitySnapshot || null) &&
      existing.source === data.source &&
      existing.dataStatus === data.dataStatus;
    return same ? 'NO_OP' : 'UPDATED';
  }

  private dateValue(value: unknown): string | null {
    if (!value) return null;
    return new Date(value as any).toISOString();
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
      generatedDate: record.generatedDate?.toISOString() ?? null,
      modelVersion: record.modelVersion || 'signal-engine-v1',
      rulesetVersion: record.rulesetVersion || record.modelVersion || 'signal-engine-v1',
      sourceDataDate: record.sourceDataDate?.toISOString() ?? null,
      sourcePriceDate: record.sourcePriceDate?.toISOString() ?? null,
      scoringInputSummary: record.scoringInputSummary || null,
      dataQualityEligibility: record.dataQualityEligibilitySnapshot || null,
      auditStatus: record.rulesetVersion && record.scoringInputSummary && record.dataQualityEligibilitySnapshot ? 'CURRENT' : 'LEGACY_MISSING',
      generationRunId: record.generationRunId ?? null,
      source: record.source,
      data_status: record.dataStatus,
    };
  }

  private runToDto(record: any): SignalGenerationRunAudit {
    return {
      id: record.id,
      scope: { region: record.region, assetType: record.assetType },
      requestedByUserId: record.requestedByUserId,
      status: record.status,
      modelVersion: record.modelVersion,
      rulesetVersion: record.rulesetVersion,
      sourceDataDate: record.sourceDataDate?.toISOString() ?? null,
      generatedDate: record.generatedDate.toISOString(),
      batchSize: record.batchSize,
      offset: record.offset,
      totalCount: record.totalCount,
      processedCount: record.processedCount,
      generatedCount: record.generatedCount,
      updatedCount: record.updatedCount,
      noOpCount: record.noOpCount,
      duplicateOrIdempotentCount: record.duplicateOrIdempotentCount,
      skippedCount: record.skippedCount,
      failedCount: record.failedCount,
      excludedByDataQuality: record.excludedByDataQuality,
      missingQualityEvaluationCount: record.missingQualityEvaluationCount,
      durationMs: record.durationMs,
      startedAt: record.startedAt.toISOString(),
      completedAt: record.completedAt?.toISOString() ?? null,
      warnings: Array.isArray(record.warnings) ? record.warnings : [],
    };
  }
}
