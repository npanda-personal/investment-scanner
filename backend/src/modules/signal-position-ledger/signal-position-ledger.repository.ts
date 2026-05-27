import prisma from '../../db/prisma';
import { resolveMarketRegionFilter } from '../../shared/utils/market-scope';
import type {
  SignalPositionDataQualitySnapshot,
  SignalPositionExitDecisionSnapshot,
  SignalPositionLatestPriceSnapshot,
  SignalPositionLedgerActiveQuery,
  SignalPositionLedgerActiveRow,
  SignalPositionLedgerMaterializedSnapshot,
  SignalPositionLedgerRefreshProgress,
  SignalPositionLedgerRefreshStatus,
  SignalPositionLedgerRowSnapshots,
  SignalPositionLedgerSignalPage,
} from './signal-position-ledger.types';
import type { SignalResultDto } from '../signal-generation-engine';

type SignalListQuery = Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'> & {
  limit: number;
  offset: number;
};

type MaterializedRefreshSaveInput = Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'> & {
  runId: string;
  status: SignalPositionLedgerRefreshStatus;
  rows: SignalPositionLedgerActiveRow[];
  totalCount: number;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
  startedAt: Date;
  completedAt?: Date | null;
  warnings: string[];
  errors: string[];
};

const LEDGER_PIPELINE_KEY = 'signal-position-ledger';
const LEDGER_TIMEFRAME = '1d';

export class SignalPositionLedgerRepository {
  constructor(private readonly db = prisma) {}

  async listLatestSignals(query: SignalListQuery): Promise<SignalPositionLedgerSignalPage> {
    const where = this.signalScopeWhere(query.region, query.assetType);
    const rowsWithLookahead = await this.db.signalResult.findMany({
      where,
      orderBy: [{ instrumentId: 'asc' }, { generatedAt: 'desc' }],
      distinct: ['instrumentId'],
      take: query.limit + 1,
      skip: query.offset,
    });

    const hasMore = rowsWithLookahead.length > query.limit;
    const rows = rowsWithLookahead.slice(0, query.limit);
    const nextOffset = query.offset + rows.length;
    return {
      items: rows.map((row) => this.toSignalResult(row)),
      totalCount: nextOffset + (hasMore ? 1 : 0),
      limit: query.limit,
      offset: query.offset,
      nextOffset: hasMore ? nextOffset : null,
      hasMore,
    };
  }

  async latestSnapshotsByInstrumentIds(
    instrumentIds: string[],
    scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
  ): Promise<Map<string, SignalPositionLedgerRowSnapshots>> {
    const uniqueIds = Array.from(new Set(instrumentIds.filter(Boolean)));
    const snapshots = new Map<string, SignalPositionLedgerRowSnapshots>();
    for (const instrumentId of uniqueIds) {
      snapshots.set(instrumentId, { latestPrice: null, quality: null, exitDecision: null });
    }
    if (uniqueIds.length === 0) return snapshots;

    const stocks = await this.db.stock.findMany({
      where: {
        id: { in: uniqueIds },
        ...this.stockScopeWhere(scope.region, scope.assetType),
      },
      select: {
        id: true,
        symbol: true,
      },
    });

    const symbolToInstrumentId = new Map(stocks.map((stock: { id: string; symbol: string }) => [stock.symbol, stock.id]));
    const symbols = Array.from(symbolToInstrumentId.keys());

    const [prices, qualities, exitDecisions] = await Promise.all([
      symbols.length > 0
        ? this.db.priceTick.findMany({
            where: { symbol: { in: symbols } },
            orderBy: [{ symbol: 'asc' }, { timestamp: 'desc' }],
            distinct: ['symbol'],
            select: {
              symbol: true,
              timestamp: true,
              close: true,
              adjustedClose: true,
              dataStatus: true,
              source: true,
            },
          })
        : Promise.resolve([]),
      this.db.dataQualityEvaluation.findMany({
        where: { instrumentId: { in: uniqueIds } },
        orderBy: [{ instrumentId: 'asc' }, { evaluatedAt: 'desc' }],
        distinct: ['instrumentId'],
        select: {
          instrumentId: true,
          signalReadinessStatus: true,
          coverageStatus: true,
          liquidityStatus: true,
          evaluatedAt: true,
        },
      }),
      this.db.strategyDecisionResult.findMany({
        where: {
          instrumentId: { in: uniqueIds },
          strategy: 'DEFENSIVE_EXIT',
        },
        orderBy: [{ instrumentId: 'asc' }, { generatedAt: 'desc' }],
        distinct: ['instrumentId'],
        select: {
          instrumentId: true,
          strategy: true,
          decision: true,
          generatedAt: true,
        },
      }),
    ]);

    for (const price of prices) {
      const instrumentId = symbolToInstrumentId.get(price.symbol);
      if (!instrumentId) continue;
      const current = snapshots.get(instrumentId);
      if (!current) continue;
      current.latestPrice = {
        date: price.timestamp.toISOString(),
        close: Number(price.close),
        adjustedClose: price.adjustedClose !== null ? Number(price.adjustedClose) : Number(price.close),
        dataStatus: price.dataStatus || 'MISSING',
        source: price.source || null,
      };
    }

    for (const quality of qualities) {
      const current = snapshots.get(quality.instrumentId);
      if (!current) continue;
      current.quality = {
        signalReadinessStatus: quality.signalReadinessStatus,
        coverageStatus: quality.coverageStatus,
        liquidityStatus: quality.liquidityStatus,
        lastEvaluatedAt: quality.evaluatedAt.toISOString(),
      };
    }

    for (const exitDecision of exitDecisions) {
      if (!exitDecision.instrumentId) continue;
      const current = snapshots.get(exitDecision.instrumentId);
      if (!current) continue;
      current.exitDecision = {
        strategy: exitDecision.strategy,
        decision: exitDecision.decision,
        generatedAt: exitDecision.generatedAt.toISOString(),
      };
    }

    return snapshots;
  }

  async loadLatestMaterializedSnapshot(
    scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
  ): Promise<SignalPositionLedgerMaterializedSnapshot | null> {
    const row = await this.db.pipelineRun.findFirst({
      where: {
        pipelineKey: LEDGER_PIPELINE_KEY,
        scopeRegion: scope.region,
        scopeAssetType: scope.assetType,
        timeframe: LEDGER_TIMEFRAME,
      },
      orderBy: [{ startedAt: 'desc' }, { updatedAt: 'desc' }],
    });
    if (!row) return null;

    const metadata = this.objectOrNull(row.metadata);
    const rows = Array.isArray(metadata?.rows)
      ? metadata.rows.filter(this.isActiveRow)
      : [];
    return {
      rows,
      refresh: this.toRefreshProgress(row, rows.length),
    };
  }

  async saveMaterializedSnapshot(input: MaterializedRefreshSaveInput): Promise<void> {
    const idempotencyKey = `${LEDGER_PIPELINE_KEY}:${input.runId}`;
    const metadata = {
      version: 'signal-position-ledger-materialized-v1',
      rows: input.rows,
    } as any;
    await this.db.pipelineRun.upsert({
      where: { idempotencyKey },
      create: {
        pipelineKey: LEDGER_PIPELINE_KEY,
        scopeRegion: input.region,
        scopeAssetType: input.assetType,
        timeframe: LEDGER_TIMEFRAME,
        triggerType: 'scheduled',
        status: input.status,
        idempotencyKey,
        totalCount: input.totalCount,
        processedCount: input.processedCount,
        succeededCount: input.succeededCount,
        failedCount: input.failedCount,
        skippedCount: input.skippedCount,
        warnings: input.warnings,
        errors: input.errors,
        metadata,
        startedAt: input.startedAt,
        completedAt: input.completedAt ?? null,
        durationMs: input.completedAt ? input.completedAt.getTime() - input.startedAt.getTime() : null,
      },
      update: {
        status: input.status,
        totalCount: input.totalCount,
        processedCount: input.processedCount,
        succeededCount: input.succeededCount,
        failedCount: input.failedCount,
        skippedCount: input.skippedCount,
        warnings: input.warnings,
        errors: input.errors,
        metadata,
        completedAt: input.completedAt ?? null,
        durationMs: input.completedAt ? input.completedAt.getTime() - input.startedAt.getTime() : null,
      },
    });
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

  private toRefreshProgress(row: any, rowCount: number): SignalPositionLedgerRefreshProgress {
    return {
      runId: String(row.idempotencyKey || '').replace(`${LEDGER_PIPELINE_KEY}:`, '') || null,
      status: this.refreshStatus(row.status),
      totalCount: Number(row.totalCount || 0),
      processedCount: Number(row.processedCount || 0),
      succeededCount: Number(row.succeededCount || 0),
      failedCount: Number(row.failedCount || 0),
      skippedCount: Number(row.skippedCount || 0),
      materializedRowCount: rowCount,
      startedAt: row.startedAt?.toISOString?.() ?? null,
      completedAt: row.completedAt?.toISOString?.() ?? null,
      updatedAt: row.updatedAt?.toISOString?.() ?? null,
      warnings: Array.isArray(row.warnings) ? row.warnings.map(String) : [],
      errors: Array.isArray(row.errors) ? row.errors.map(String) : [],
    };
  }

  private refreshStatus(value: unknown): SignalPositionLedgerRefreshStatus {
    if (value === 'RUNNING' || value === 'COMPLETED' || value === 'FAILED') return value;
    return 'IDLE';
  }

  private objectOrNull(value: unknown): Record<string, any> | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null;
  }

  private isActiveRow(value: unknown): value is SignalPositionLedgerActiveRow {
    if (!value || typeof value !== 'object') return false;
    const row = value as Partial<SignalPositionLedgerActiveRow>;
    return typeof row.instrumentId === 'string'
      && typeof row.symbol === 'string'
      && typeof row.entryTriggerTimestamp === 'string'
      && typeof row.entryTriggerPrice === 'number'
      && typeof row.entryReasonSummary === 'string';
  }
}

