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

type LedgerRowsQuery = Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'> & {
  status: 'ACTIVE' | 'CLOSED';
  limit: number;
  offset: number;
  sortBy?: SignalPositionLedgerActiveQuery['sortBy'];
  sortDirection?: SignalPositionLedgerActiveQuery['sortDirection'];
};

const LEDGER_PIPELINE_KEY = 'signal-position-ledger';
const LEDGER_TIMEFRAME = '1d';
const LEDGER_MATERIALIZED_VERSION = 'signal-position-ledger-materialized-v2';

export class SignalPositionLedgerRepository {
  constructor(private readonly db = prisma) {}

  async listLedgerRows(query: LedgerRowsQuery): Promise<{ items: SignalPositionLedgerActiveRow[]; totalCount: number; hasMore: boolean; nextOffset: number | null }> {
    const delegate = (this.db as any).signalPositionLedgerEntry;
    if (!delegate || typeof delegate.findMany !== 'function') {
      return { items: [], totalCount: 0, hasMore: false, nextOffset: null };
    }

    const where = {
      scopeRegion: query.region,
      scopeAssetType: query.assetType,
      status: query.status,
    };
    const canCount = query.status === 'CLOSED' && typeof delegate.count === 'function';
    const [totalCount, rows] = await Promise.all([
      canCount ? delegate.count({ where }) : Promise.resolve(0),
      delegate.findMany({
        where,
        orderBy: [{ entryTriggerTimestamp: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);
    const mapped = rows.map((row: any) => this.toLedgerRow(row));
    const sorted = this.sortLedgerRows(query.status === 'ACTIVE' ? this.dedupeActiveRows(mapped) : mapped, query);
    const items = sorted.slice(query.offset, query.offset + query.limit);
    const effectiveTotalCount = canCount ? totalCount : sorted.length;
    const nextOffset = query.offset + items.length;
    return {
      items,
      totalCount: effectiveTotalCount,
      hasMore: nextOffset < effectiveTotalCount,
      nextOffset: nextOffset < effectiveTotalCount ? nextOffset : null,
    };
  }

  async listAllLedgerRows(scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>, status: 'ACTIVE' | 'CLOSED'): Promise<SignalPositionLedgerActiveRow[]> {
    const delegate = (this.db as any).signalPositionLedgerEntry;
    if (!delegate || typeof delegate.findMany !== 'function') return [];
    const rows = await delegate.findMany({
      where: {
        scopeRegion: scope.region,
        scopeAssetType: scope.assetType,
        status,
      },
      orderBy: status === 'CLOSED'
        ? [{ exitTriggerTimestamp: 'desc' }, { updatedAt: 'desc' }]
        : [{ entryTriggerTimestamp: 'asc' }, { createdAt: 'asc' }],
    });
    const mapped = rows.map((row: any) => this.toLedgerRow(row));
    return status === 'ACTIVE' ? this.dedupeActiveRows(mapped) : mapped;
  }

  private dedupeActiveRows(rows: SignalPositionLedgerActiveRow[]): SignalPositionLedgerActiveRow[] {
    const byStock = new Map<string, SignalPositionLedgerActiveRow>();
    for (const row of rows) {
      const key = this.stockKey(row.symbol);
      const existing = byStock.get(key);
      if (!existing || Date.parse(row.entryTriggerTimestamp) < Date.parse(existing.entryTriggerTimestamp)) byStock.set(key, row);
    }
    return [...byStock.values()];
  }

  private sortLedgerRows(rows: SignalPositionLedgerActiveRow[], query: Pick<SignalPositionLedgerActiveQuery, 'sortBy' | 'sortDirection'>): SignalPositionLedgerActiveRow[] {
    const sortBy = query.sortBy || 'entryTriggerTimestamp';
    const direction = query.sortDirection || 'desc';
    const factor = direction === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => {
      const leftValue = sortBy === 'currentReturnPercent'
        ? this.sortableReturn(left)
        : this.sortableDate(left.entryTriggerTimestamp);
      const rightValue = sortBy === 'currentReturnPercent'
        ? this.sortableReturn(right)
        : this.sortableDate(right.entryTriggerTimestamp);
      if (leftValue === null && rightValue === null) return left.symbol.localeCompare(right.symbol);
      if (leftValue === null) return 1;
      if (rightValue === null) return -1;
      const delta = leftValue - rightValue;
      if (delta !== 0) return delta * factor;
      return left.symbol.localeCompare(right.symbol);
    });
  }

  private sortableDate(value: string | null | undefined): number | null {
    const timestamp = Date.parse(value || '');
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  private sortableReturn(row: SignalPositionLedgerActiveRow): number | null {
    if (row.currentReturnStatus !== 'CURRENT') return null;
    return typeof row.currentReturnPercent === 'number' && Number.isFinite(row.currentReturnPercent) ? row.currentReturnPercent : null;
  }

  async listLegacyMaterializedRows(scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>): Promise<SignalPositionLedgerActiveRow[]> {
    const rows = await this.db.pipelineRun.findMany({
      where: {
        pipelineKey: LEDGER_PIPELINE_KEY,
        scopeRegion: scope.region,
        scopeAssetType: scope.assetType,
        timeframe: LEDGER_TIMEFRAME,
      },
      orderBy: [{ startedAt: 'desc' }, { updatedAt: 'desc' }],
      take: 20,
      select: { metadata: true },
    });
    const byInstrument = new Map<string, SignalPositionLedgerActiveRow>();
    for (const run of rows) {
      const metadata = this.objectOrNull(run.metadata);
      const materializedRows = Array.isArray(metadata?.rows) ? metadata.rows : [];
      for (const value of materializedRows) {
        if (!this.isActiveRow(value)) continue;
        const row = this.normalizeLegacyRow(value, scope);
        const key = this.stockKey(row.symbol);
        const existing = byInstrument.get(key);
        if (!existing || Date.parse(row.entryTriggerTimestamp) < Date.parse(existing.entryTriggerTimestamp)) {
          byInstrument.set(key, row);
        }
      }
    }
    return [...byInstrument.values()];
  }

  async findActiveLedgerRowByInstrument(scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>, instrumentId: string): Promise<SignalPositionLedgerActiveRow | null> {
    const delegate = (this.db as any).signalPositionLedgerEntry;
    if (!delegate || typeof delegate.findFirst !== 'function') return null;
    const row = await delegate.findFirst({
      where: {
        scopeRegion: scope.region,
        scopeAssetType: scope.assetType,
        instrumentId,
        status: 'ACTIVE',
      },
      orderBy: [{ entryTriggerTimestamp: 'asc' }, { createdAt: 'asc' }],
    });
    return row ? this.toLedgerRow(row) : null;
  }

  async upsertActiveLedgerRow(row: SignalPositionLedgerActiveRow): Promise<void> {
    const delegate = (this.db as any).signalPositionLedgerEntry;
    if (!delegate || typeof delegate.upsert !== 'function') return;
    await delegate.upsert({
      where: { ledgerKey: row.ledgerKey },
      create: this.toLedgerWrite(row),
      update: this.toLedgerUpdate(row, false),
    });
  }

  async closeLedgerRow(row: SignalPositionLedgerActiveRow): Promise<void> {
    const delegate = (this.db as any).signalPositionLedgerEntry;
    if (!delegate || typeof delegate.update !== 'function') return;
    await delegate.update({
      where: { ledgerKey: row.ledgerKey },
      data: this.toLedgerUpdate(row, true),
    });
  }

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
          reasons: true,
          exitRulesTriggered: true,
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
        reasons: Array.isArray(exitDecision.reasons) ? exitDecision.reasons.map(String) : [],
        exitRulesTriggered: Array.isArray(exitDecision.exitRulesTriggered) ? exitDecision.exitRulesTriggered.map(String) : [],
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
    if (metadata?.version !== LEDGER_MATERIALIZED_VERSION) return null;
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
      version: LEDGER_MATERIALIZED_VERSION,
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
        reasons: true,
        exitRulesTriggered: true,
      },
    });
    if (!latest) return null;

    return {
      strategy: latest.strategy,
      decision: latest.decision,
      generatedAt: latest.generatedAt.toISOString(),
      reasons: Array.isArray(latest.reasons) ? latest.reasons.map(String) : [],
      exitRulesTriggered: Array.isArray(latest.exitRulesTriggered) ? latest.exitRulesTriggered.map(String) : [],
    };
  }

  async priceAtOrBeforeInstrumentId(instrumentId: string, date: Date, scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>): Promise<SignalPositionLatestPriceSnapshot | null> {
    const stock = await this.db.stock.findFirst({
      where: {
        id: instrumentId,
        ...this.stockScopeWhere(scope.region, scope.assetType),
      },
      select: { symbol: true },
    });
    if (!stock) return null;

    const latest = await this.db.priceTick.findFirst({
      where: {
        symbol: stock.symbol,
        timestamp: { lte: date },
      },
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

  private normalizeLegacyRow(value: any, scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>): SignalPositionLedgerActiveRow {
    const region = value.region || scope.region;
    const assetType = value.assetType || scope.assetType;
    const entryTriggerTimestamp = value.entryTriggerTimestamp;
    const ledgerKey = value.ledgerKey || [
      String(region).trim().toUpperCase(),
      String(assetType).trim().toUpperCase(),
      value.instrumentId,
      'bullish_entry_trigger',
      new Date(entryTriggerTimestamp).toISOString(),
    ].join(':');
    return {
      ...value,
      ledgerKey,
      status: value.status === 'CLOSED' ? 'CLOSED' : 'ACTIVE',
      region,
      assetType,
      lifecycleEvidenceStatus: value.lifecycleEvidenceStatus || 'ACTIVE_ENTRY',
      exitSignalId: value.exitSignalId ?? null,
      exitTriggerTimestamp: value.exitTriggerTimestamp ?? null,
      exitTriggerPrice: value.exitTriggerPrice ?? null,
      exitReasonSummary: value.exitReasonSummary ?? null,
      exitRuleId: value.exitRuleId ?? null,
      exitDecision: value.exitDecision ?? null,
      closedAt: value.closedAt ?? null,
    };
  }

  private toLedgerRow(row: any): SignalPositionLedgerActiveRow {
    return {
      ledgerKey: row.ledgerKey,
      status: row.status === 'CLOSED' ? 'CLOSED' : 'ACTIVE',
      signalId: row.entrySignalId ?? null,
      instrumentId: row.instrumentId,
      symbol: row.symbol,
      companyName: row.companyName ?? null,
      region: row.scopeRegion,
      assetType: row.scopeAssetType,
      triggerType: row.entryTriggerType || 'bullish_entry_trigger',
      entryTriggerTimestamp: row.entryTriggerTimestamp?.toISOString?.() ?? String(row.entryTriggerTimestamp),
      entryTriggerPrice: Number(row.entryTriggerPrice),
      entryReasonSummary: row.entryReasonSummary,
      strategyId: row.strategyId ?? null,
      strategyVersion: row.strategyVersion ?? null,
      strategyDecision: row.strategyDecision ?? null,
      strategyReadinessLabel: row.strategyReadinessLabel ?? null,
      strategyRatingGrade: row.strategyRatingGrade ?? null,
      entryRuleId: row.entryRuleId ?? null,
      latestTrustedPriceDate: row.latestTrustedPriceDate?.toISOString?.() ?? null,
      latestTrustedPrice: row.latestTrustedPrice === null || row.latestTrustedPrice === undefined ? null : Number(row.latestTrustedPrice),
      currentReturnPercent: row.currentReturnPercent === null || row.currentReturnPercent === undefined ? null : Number(row.currentReturnPercent),
      currentReturnStatus: row.currentReturnStatus || 'UNAVAILABLE',
      currentDataQualityStatus: row.currentDataQualityStatus ?? null,
      healthState: row.status === 'CLOSED' ? 'EXIT_TRIGGERED' : null,
      lifecycleEvidenceStatus: row.status === 'CLOSED' ? 'EXIT_TRIGGERED' : 'ACTIVE_ENTRY',
      trustEvidenceStatus: row.trustEvidenceStatus || 'SOURCE_PROVEN_PRICE_UNAVAILABLE',
      calibrationEvidenceStatus: row.calibrationEvidenceStatus || 'UNAVAILABLE',
      displayWarnings: Array.isArray(row.displayWarnings) ? row.displayWarnings.map(String) : [],
      exitSignalId: row.exitSignalId ?? null,
      exitTriggerTimestamp: row.exitTriggerTimestamp?.toISOString?.() ?? null,
      exitTriggerPrice: row.exitTriggerPrice === null || row.exitTriggerPrice === undefined ? null : Number(row.exitTriggerPrice),
      exitReasonSummary: row.exitReasonSummary ?? null,
      exitRuleId: row.exitRuleId ?? null,
      exitDecision: row.exitDecision ?? null,
      closedAt: row.closedAt?.toISOString?.() ?? null,
    };
  }

  private toLedgerWrite(row: SignalPositionLedgerActiveRow) {
    return {
      ledgerKey: row.ledgerKey,
      scopeRegion: row.region || 'IN',
      scopeAssetType: row.assetType || 'STOCK',
      instrumentId: row.instrumentId,
      symbol: row.symbol,
      companyName: row.companyName,
      stockKey: this.stockKey(row.symbol),
      activeSlot: row.status === 'ACTIVE' ? this.stockKey(row.symbol) : null,
      status: row.status,
      entrySignalId: row.signalId,
      entryTriggerType: row.triggerType,
      entryTriggerTimestamp: new Date(row.entryTriggerTimestamp),
      entryTriggerPrice: row.entryTriggerPrice,
      entryReasonSummary: row.entryReasonSummary,
      strategyId: row.strategyId,
      strategyVersion: row.strategyVersion,
      strategyDecision: row.strategyDecision,
      strategyReadinessLabel: row.strategyReadinessLabel,
      strategyRatingGrade: row.strategyRatingGrade,
      entryRuleId: row.entryRuleId,
      latestTrustedPriceDate: row.latestTrustedPriceDate ? new Date(row.latestTrustedPriceDate) : null,
      latestTrustedPrice: row.latestTrustedPrice,
      currentReturnPercent: row.currentReturnPercent,
      currentReturnStatus: row.currentReturnStatus,
      currentDataQualityStatus: row.currentDataQualityStatus,
      trustEvidenceStatus: row.trustEvidenceStatus,
      calibrationEvidenceStatus: row.calibrationEvidenceStatus,
      displayWarnings: row.displayWarnings || [],
      exitSignalId: row.exitSignalId ?? null,
      exitTriggerTimestamp: row.exitTriggerTimestamp ? new Date(row.exitTriggerTimestamp) : null,
      exitTriggerPrice: row.exitTriggerPrice ?? null,
      exitReasonSummary: row.exitReasonSummary ?? null,
      exitRuleId: row.exitRuleId ?? null,
      exitDecision: row.exitDecision ?? null,
      closedAt: row.closedAt ? new Date(row.closedAt) : null,
      lastEvaluatedAt: new Date(),
    };
  }

  private toLedgerUpdate(row: SignalPositionLedgerActiveRow, includeExit: boolean) {
    const data: Record<string, unknown> = {
      symbol: row.symbol,
      companyName: row.companyName,
      stockKey: this.stockKey(row.symbol),
      activeSlot: row.status === 'ACTIVE' ? this.stockKey(row.symbol) : null,
      latestTrustedPriceDate: row.latestTrustedPriceDate ? new Date(row.latestTrustedPriceDate) : null,
      latestTrustedPrice: row.latestTrustedPrice,
      currentReturnPercent: row.currentReturnPercent,
      currentReturnStatus: row.currentReturnStatus,
      currentDataQualityStatus: row.currentDataQualityStatus,
      trustEvidenceStatus: row.trustEvidenceStatus,
      calibrationEvidenceStatus: row.calibrationEvidenceStatus,
      displayWarnings: row.displayWarnings || [],
      lastEvaluatedAt: new Date(),
    };
    if (includeExit) {
      Object.assign(data, {
        status: 'CLOSED',
        activeSlot: null,
        exitSignalId: row.exitSignalId ?? null,
        exitTriggerTimestamp: row.exitTriggerTimestamp ? new Date(row.exitTriggerTimestamp) : null,
        exitTriggerPrice: row.exitTriggerPrice ?? null,
        exitReasonSummary: row.exitReasonSummary ?? null,
        exitRuleId: row.exitRuleId ?? null,
        exitDecision: row.exitDecision ?? null,
        closedAt: row.closedAt ? new Date(row.closedAt) : new Date(),
      });
    }
    return data;
  }

  private stockKey(symbol: string): string {
    return String(symbol || '').trim().replace(/\.(NS|BO)$/i, '').toUpperCase();
  }
}

