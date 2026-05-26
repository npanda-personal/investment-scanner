import prisma from '../../db/prisma';
import { resolveMarketRegionFilter } from '../../shared/utils/market-scope';
import type {
  SignalPositionDataQualitySnapshot,
  SignalPositionExitDecisionSnapshot,
  SignalPositionLatestPriceSnapshot,
  SignalPositionLedgerActiveQuery,
  SignalPositionLedgerSignalPage,
} from './signal-position-ledger.types';
import type { SignalResultDto } from '../signal-generation-engine';

type SignalListQuery = Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'> & {
  limit: number;
  offset: number;
};

export class SignalPositionLedgerRepository {
  constructor(private readonly db = prisma) {}

  async listLatestSignals(query: SignalListQuery): Promise<SignalPositionLedgerSignalPage> {
    const where = this.signalScopeWhere(query.region, query.assetType);
    const [instrumentRows, rows] = await Promise.all([
      this.db.signalResult.findMany({
        where,
        distinct: ['instrumentId'],
        select: { instrumentId: true },
      }),
      this.db.signalResult.findMany({
        where,
        orderBy: [{ instrumentId: 'asc' }, { generatedAt: 'desc' }],
        distinct: ['instrumentId'],
        take: query.limit,
        skip: query.offset,
      }),
    ]);

    const totalCount = instrumentRows.length;
    const nextOffset = query.offset + rows.length;
    return {
      items: rows.map((row) => this.toSignalResult(row)),
      totalCount,
      limit: query.limit,
      offset: query.offset,
      nextOffset: nextOffset < totalCount ? nextOffset : null,
      hasMore: nextOffset < totalCount,
    };
  }

  async latestPriceByInstrumentId(instrumentId: string, scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>): Promise<SignalPositionLatestPriceSnapshot | null> {
    const stock = await this.db.stock.findFirst({
      where: {
        id: instrumentId,
        ...this.stockScopeWhere(scope.region, scope.assetType),
      },
      select: {
        symbol: true,
      },
    });
    if (!stock) return null;

    const latest = await this.db.priceTick.findFirst({
      where: { symbol: stock.symbol },
      orderBy: { timestamp: 'desc' },
      select: {
        timestamp: true,
        close: true,
        adjustedClose: true,
        dataStatus: true,
        source: true,
      },
    });
    if (!latest) return null;

    return {
      date: latest.timestamp.toISOString(),
      close: Number(latest.close),
      adjustedClose: latest.adjustedClose !== null ? Number(latest.adjustedClose) : Number(latest.close),
      dataStatus: latest.dataStatus || 'MISSING',
      source: latest.source || null,
    };
  }

  async latestDataQualityByInstrumentId(instrumentId: string): Promise<SignalPositionDataQualitySnapshot | null> {
    const latest = await this.db.dataQualityEvaluation.findFirst({
      where: { instrumentId },
      orderBy: { evaluatedAt: 'desc' },
      select: {
        signalReadinessStatus: true,
        coverageStatus: true,
        liquidityStatus: true,
        evaluatedAt: true,
      },
    });
    if (!latest) return null;

    return {
      signalReadinessStatus: latest.signalReadinessStatus,
      coverageStatus: latest.coverageStatus,
      liquidityStatus: latest.liquidityStatus,
      lastEvaluatedAt: latest.evaluatedAt.toISOString(),
    };
  }

  async latestExitDecisionByInstrumentId(instrumentId: string): Promise<SignalPositionExitDecisionSnapshot | null> {
    const latest = await this.db.strategyDecisionResult.findFirst({
      where: {
        instrumentId,
        strategy: 'DEFENSIVE_EXIT',
      },
      orderBy: { generatedAt: 'desc' },
      select: {
        strategy: true,
        decision: true,
        generatedAt: true,
      },
    });
    if (!latest) return null;

    return {
      strategy: latest.strategy,
      decision: latest.decision,
      generatedAt: latest.generatedAt.toISOString(),
    };
  }

  private signalScopeWhere(region: string, assetType: string) {
    const stockFilters: Record<string, unknown>[] = [];
    const regionFilter = resolveMarketRegionFilter(region);
    if (Object.keys(regionFilter).length > 0) stockFilters.push(regionFilter as unknown as Record<string, unknown>);
    const assetTypeFilter = this.assetTypeFilter(assetType);
    if (assetTypeFilter) stockFilters.push(assetTypeFilter);
    return stockFilters.length > 0 ? { stock: { AND: stockFilters } } : {};
  }

  private stockScopeWhere(region: string, assetType: string) {
    const filters: Record<string, unknown>[] = [];
    const regionFilter = resolveMarketRegionFilter(region);
    if (Object.keys(regionFilter).length > 0) filters.push(regionFilter as unknown as Record<string, unknown>);
    const assetTypeFilter = this.assetTypeFilter(assetType);
    if (assetTypeFilter) filters.push(assetTypeFilter);
    if (filters.length === 0) return {};
    return { AND: filters };
  }

  private assetTypeFilter(assetType: string): Record<string, unknown> | null {
    const normalized = String(assetType || '').trim().toUpperCase();
    if (!normalized) return null;
    if (normalized === 'STOCK' || normalized === 'EQUITY') {
      return {
        OR: [
          { assetType: { in: ['STOCK', 'EQUITY'], mode: 'insensitive' } },
          { assetType: null },
        ],
      };
    }
    return { assetType: { equals: normalized, mode: 'insensitive' } };
  }

  private toSignalResult(record: any): SignalResultDto {
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
}

