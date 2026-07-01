import prisma from '../../db/prisma';
import { resolveMarketRegionFilter } from '../../shared/utils/market-scope';
import { resolveMarketProfile } from '../../shared/utils/market-profile';
import type {
  SignalPositionDataQualitySnapshot,
  SignalPositionExitDecisionSnapshot,
  SignalPositionLatestPriceSnapshot,
  SignalPositionLedgerActiveQuery,
  SignalPositionLedgerActiveRow,
  SignalPositionLedgerStatus,
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
  status: SignalPositionLedgerStatus;
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
      status: this.ledgerStatusWhere(query.status),
    };
    const canCount = typeof delegate.count === 'function';
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

  async listAllLedgerRows(scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>, status: SignalPositionLedgerStatus): Promise<SignalPositionLedgerActiveRow[]> {
    const delegate = (this.db as any).signalPositionLedgerEntry;
    if (!delegate || typeof delegate.findMany !== 'function') return [];
    const rows = await delegate.findMany({
      where: {
        scopeRegion: scope.region,
        scopeAssetType: scope.assetType,
        status: this.ledgerStatusWhere(status),
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
        status: this.ledgerStatusWhere('ACTIVE'),
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

  /**
   * Every historical ledger row for a scope, ANY status, WITHOUT the active-slot
   * dedup that listAllLedgerRows applies. Each row is a distinct opened position
   * (distinct ledgerKey / entry candle). Used only by the one-time rebuild
   * (recomputeClosedHistory) which must see the full un-collapsed entry history to
   * replay it chronologically. Ordered oldest-entry-first for the replay walk.
   */
  async listEveryLedgerRow(
    scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
  ): Promise<SignalPositionLedgerActiveRow[]> {
    const delegate = (this.db as any).signalPositionLedgerEntry;
    if (!delegate || typeof delegate.findMany !== 'function') return [];
    const rows = await delegate.findMany({
      where: { scopeRegion: scope.region, scopeAssetType: scope.assetType },
      orderBy: [{ entryTriggerTimestamp: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((row: any) => this.toLedgerRow(row));
  }

  /**
   * One-time rebuild primitive: atomically replace ALL ledger rows for a scope with a
   * freshly recomputed set. Deletes every existing row for the scope, then bulk-inserts
   * each recomputed row via the FULL write mapper (toLedgerWrite persists status +
   * terminal fields on the create path — unlike closeLedgerRow's update-by-key, which
   * requires the row to still exist). Runs in a single transaction (generous timeout —
   * the shared Postgres default 5s tx window is too small for a full-scope rebuild) so
   * the scope is never left half-rebuilt.
   *
   * CALLER CONTRACT: at most one active-like row (activeSlot != null) per
   * (scope, stockKey) — the spl_entries_one_active_stock_key unique constraint rejects
   * duplicates. recomputeClosedHistory guarantees this by chronological replay.
   */
  async replaceScopeLedgerRows(
    scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
    rows: SignalPositionLedgerActiveRow[],
  ): Promise<{ deleted: number; inserted: number }> {
    const delegate = (this.db as any).signalPositionLedgerEntry;
    if (!delegate || typeof delegate.deleteMany !== 'function' || typeof delegate.createMany !== 'function') {
      return { deleted: 0, inserted: 0 };
    }
    const where = { scopeRegion: scope.region, scopeAssetType: scope.assetType };
    const data = rows.map((row) => this.toLedgerWrite(row));
    return await this.db.$transaction(
      async (tx: any) => {
        const del = await tx.signalPositionLedgerEntry.deleteMany({ where });
        const ins = data.length
          ? await tx.signalPositionLedgerEntry.createMany({ data })
          : { count: 0 };
        return { deleted: del.count, inserted: ins.count };
      },
      { timeout: 120_000, maxWait: 120_000 },
    );
  }

  async listLatestSignals(query: SignalListQuery): Promise<SignalPositionLedgerSignalPage> {
    const scopeWhere = this.signalScopeWhere(query.region, query.assetType);
    // Only consider instruments whose signal lifecycle is ACTIVE or ENTRY —
    // EXIT-lifecycle signals are leaving the monitored universe and must not
    // generate new ledger entries.  This also reduces the source page size by
    // ~10%, avoiding wasted enrichment cycles on already-exited instruments.
    const lifecycleWhere = { lifecycleState: { in: ['ACTIVE', 'ENTRY'] as string[] } };
    const where = { ...scopeWhere, ...lifecycleWhere };
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
      (this.db as any).strategyDecisionResult.findMany({
        where: {
          instrumentId: { in: uniqueIds },
          strategy: 'DEFENSIVE_EXIT',
        },
        orderBy: [{ instrumentId: 'asc' }, { generatedAt: 'desc' }],
        distinct: ['instrumentId'],
        select: {
          id: true, instrumentId: true,
          strategy: true, strategyVersion: true,
          decision: true,
          generatedAt: true, generatedDate: true,
          reasons: true,
          exitRulesTriggered: true,
          invalidationRulesTriggered: true,
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
        id: exitDecision.id ?? null, strategy: exitDecision.strategy,
        strategyVersion: exitDecision.strategyVersion ?? null,
        decision: exitDecision.decision,
        generatedAt: exitDecision.generatedAt.toISOString(),
        generatedDate: exitDecision.generatedDate?.toISOString() ?? null,
        reasons: Array.isArray(exitDecision.reasons) ? exitDecision.reasons.map(String) : [],
        exitRulesTriggered: Array.isArray(exitDecision.exitRulesTriggered) ? exitDecision.exitRulesTriggered.map(String) : [],
        invalidationRulesTriggered: Array.isArray(exitDecision.invalidationRulesTriggered) ? exitDecision.invalidationRulesTriggered.map(String) : [],
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
    const stock = await this.db.stock.findFirst({ where: { id: instrumentId, ...this.stockScopeWhere(scope.region, scope.assetType) }, select: { symbol: true } });
    if (!stock) return null;
    const latest = await this.db.priceTick.findFirst({ where: { symbol: stock.symbol }, orderBy: { timestamp: 'desc' }, select: { timestamp: true, close: true, adjustedClose: true, dataStatus: true, source: true } });
    if (!latest) return null;
    return { date: latest.timestamp.toISOString(), close: Number(latest.close), adjustedClose: latest.adjustedClose !== null ? Number(latest.adjustedClose) : Number(latest.close), dataStatus: latest.dataStatus || 'MISSING', source: latest.source || null };
  }

  async latestDataQualityByInstrumentId(instrumentId: string): Promise<SignalPositionDataQualitySnapshot | null> {
    const latest = await this.db.dataQualityEvaluation.findFirst({ where: { instrumentId }, orderBy: { evaluatedAt: 'desc' }, select: { signalReadinessStatus: true, coverageStatus: true, liquidityStatus: true, evaluatedAt: true } });
    if (!latest) return null;
    return { signalReadinessStatus: latest.signalReadinessStatus, coverageStatus: latest.coverageStatus, liquidityStatus: latest.liquidityStatus, lastEvaluatedAt: latest.evaluatedAt.toISOString() };
  }

  async latestExitDecisionByInstrumentId(instrumentId: string): Promise<SignalPositionExitDecisionSnapshot | null> {
    const latest = await (this.db as any).strategyDecisionResult.findFirst({
      where: {
        instrumentId,
        strategy: 'DEFENSIVE_EXIT',
      },
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true, strategy: true, strategyVersion: true,
        decision: true,
        generatedAt: true, generatedDate: true,
        reasons: true,
        exitRulesTriggered: true,
        invalidationRulesTriggered: true,
      },
    });
    if (!latest) return null;

    return {
      id: latest.id ?? null, strategy: latest.strategy,
      strategyVersion: latest.strategyVersion ?? null,
      decision: latest.decision,
      generatedAt: latest.generatedAt.toISOString(),
      generatedDate: latest.generatedDate?.toISOString() ?? null,
      reasons: Array.isArray(latest.reasons) ? latest.reasons.map(String) : [],
      exitRulesTriggered: Array.isArray(latest.exitRulesTriggered) ? latest.exitRulesTriggered.map(String) : [],
      invalidationRulesTriggered: Array.isArray(latest.invalidationRulesTriggered) ? latest.invalidationRulesTriggered.map(String) : [],
    };
  }

  async priceAtOrBeforeInstrumentId(instrumentId: string, date: Date, scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>): Promise<SignalPositionLatestPriceSnapshot | null> {
    const stock = await this.db.stock.findFirst({ where: { id: instrumentId, ...this.stockScopeWhere(scope.region, scope.assetType) }, select: { symbol: true } });
    if (!stock) return null;
    const latest = await this.db.priceTick.findFirst({ where: { symbol: stock.symbol, timestamp: { lte: date } }, orderBy: { timestamp: 'desc' }, select: { timestamp: true, close: true, adjustedClose: true, dataStatus: true, source: true } });
    if (!latest) return null;
    return { date: latest.timestamp.toISOString(), close: Number(latest.close), adjustedClose: latest.adjustedClose !== null ? Number(latest.adjustedClose) : Number(latest.close), dataStatus: latest.dataStatus || 'MISSING', source: latest.source || null };
  }

  /**
   * Per (instrumentId, entryDate), the FIRST candle date on/after entry where a
   * DEFENSIVE_EXIT close criterion was met — resolved separately for the two
   * close reasons so a closed position is backdated to the day its criterion was
   * actually met (the candle date), not the day the refresh happened to run:
   *  - exitDate:         earliest generatedDate where the decision is
   *                      EXIT_CANDIDATE (the strategy's aggregated exit verdict —
   *                      DECISION-DRIVEN, not raw exit-rule fires). REDUCE_RISK no
   *                      longer closes a position (fixed-horizon policy): a risk
   *                      warning rests the position ACTIVE rather than forcing a
   *                      full close.
   *  - invalidationDate: earliest generatedDate where any invalidation rule triggered.
   * Either field is null when that criterion was never met in the window.
   *
   * Both criteria require evidence STRICTLY AFTER the entry candle
   * (generatedDate > entryDate): defensive/invalidation evidence coincident with
   * the entry candle is entry-time adverse selection, not a close signal, and must
   * not backdate a zero-hold close to the entry day. Coincident evidence is handled
   * separately by the intake guard (coincidentDefensiveEvidence).
   *
   * NOTE: kept in lockstep with the signal-generation defensive-exit ENTRY gate
   * (isUnderDefensiveExit). Both deliberately ignore raw `exitRulesTriggered.length > 0`:
   * sub-threshold exit rules that net to a HOLD verdict must NOT close a position (nor
   * suppress a new entry). A genuine exit always escalates the decision, so nothing real
   * is missed. See signal-defensive-exit-gate.ts header.
   */
  async firstCloseEvidenceDates(
    entries: Array<{ instrumentId: string; entryDate: string }>,
  ): Promise<Map<string, { exitDate: string | null; invalidationDate: string | null }>> {
    if (entries.length === 0) return new Map();
    const ids = entries.map((e) => e.instrumentId), dates = entries.map((e) => e.entryDate);
    const rows: Array<{ instrumentId: string; exitDate: Date | null; invalidationDate: Date | null }> =
      await this.db.$queryRawUnsafe(`
      SELECT sub."instrumentId",
        MIN(sdr."generatedDate") FILTER (
          WHERE sdr.decision IN ('EXIT_CANDIDATE')
        ) AS "exitDate",
        MIN(sdr."generatedDate") FILTER (
          WHERE jsonb_array_length(COALESCE(sdr."invalidationRulesTriggered"::jsonb, '[]'::jsonb)) > 0
        ) AS "invalidationDate"
      -- entryDate cast to plain timestamp (not timestamptz) so the comparison to
      -- sdr."generatedDate" (timestamp WITHOUT time zone) is naive-to-naive and
      -- independent of the DB session TimeZone. UTC-ISO inputs ('…Z') parse to the
      -- same UTC wall-clock under ::timestamp.
      FROM unnest($1::text[], $2::timestamp[]) AS sub("instrumentId", "entryDate")
      JOIN strategy_decision_results sdr ON sdr."instrumentId" = sub."instrumentId"
        AND sdr.strategy = 'DEFENSIVE_EXIT' AND sdr."generatedDate" > sub."entryDate"
      GROUP BY sub."instrumentId"
    `, ids, dates);
    const result = new Map<string, { exitDate: string | null; invalidationDate: string | null }>();
    for (const r of rows) {
      result.set(r.instrumentId, {
        exitDate: r.exitDate ? new Date(r.exitDate).toISOString() : null,
        invalidationDate: r.invalidationDate ? new Date(r.invalidationDate).toISOString() : null,
      });
    }
    return result;
  }

  /**
   * Batch next-bar fill: first price tick STRICTLY AFTER exitDate per instrument.
   * Strict `>` (not `>=`) so a defensive/invalidation close resolves to a genuine
   * forward bar and can never collapse onto the exit/entry candle itself — the
   * source of the historical flat (0%) same-candle closes.
   */
  async firstPriceAtOrAfterBatch(
    entries: Array<{ instrumentId: string; exitDate: Date }>,
    scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
  ): Promise<Map<string, SignalPositionLatestPriceSnapshot>> {
    const result = new Map<string, SignalPositionLatestPriceSnapshot>();
    if (entries.length === 0) return result;

    const uniqueInstrumentIds = Array.from(new Set(entries.map((e) => e.instrumentId)));

    const stocks = await this.db.stock.findMany({
      where: {
        id: { in: uniqueInstrumentIds },
        ...this.stockScopeWhere(scope.region, scope.assetType),
      },
      select: { id: true, symbol: true },
    });

    if (stocks.length === 0) return result;

    const instrumentIdToSymbol = new Map(stocks.map((s: { id: string; symbol: string }) => [s.id, s.symbol]));

    // Resolve in-scope entries to (instrumentId, symbol, exitDate), keeping the
    // earliest exit date per instrument when an id appears more than once.
    const byId = new Map<string, { symbol: string; exitDate: Date }>();
    for (const e of entries) {
      const symbol = instrumentIdToSymbol.get(e.instrumentId);
      if (!symbol || !Number.isFinite(e.exitDate.getTime())) continue;
      const existing = byId.get(e.instrumentId);
      if (!existing || e.exitDate < existing.exitDate) byId.set(e.instrumentId, { symbol, exitDate: e.exitDate });
    }
    if (byId.size === 0) return result;

    const ids = Array.from(byId.keys());
    const syms = ids.map((id) => byId.get(id)!.symbol);
    const dates = ids.map((id) => byId.get(id)!.exitDate.toISOString());

    // One DISTINCT ON query returns the single earliest tick on-or-after each
    // instrument's own exit date (next-bar fill). Bounded per symbol — replaces
    // the prior unbounded findMany that pulled full forward history into JS.
    const rows: Array<{
      instrumentId: string;
      timestamp: Date;
      close: unknown;
      adjustedClose: unknown;
      dataStatus: string | null;
      source: string | null;
    }> = await this.db.$queryRawUnsafe(
      `
      SELECT DISTINCT ON (sub."instrumentId")
        sub."instrumentId", pt.timestamp, pt.close, pt."adjustedClose", pt."dataStatus", pt.source
      FROM unnest($1::text[], $2::text[], $3::timestamptz[]) AS sub("instrumentId", symbol, exit_date)
      JOIN price_ticks pt ON pt.symbol = sub.symbol AND pt.timestamp > sub.exit_date
      ORDER BY sub."instrumentId", pt.timestamp ASC
      `,
      ids,
      syms,
      dates,
    );

    for (const r of rows) {
      const close = Number(r.close);
      const adjusted = r.adjustedClose !== null && r.adjustedClose !== undefined ? Number(r.adjustedClose) : close;
      result.set(r.instrumentId, {
        date: new Date(r.timestamp).toISOString(),
        close,
        adjustedClose: adjusted,
        dataStatus: r.dataStatus || 'MISSING',
        source: r.source || null,
      });
    }

    return result;
  }

  /** Batch price tick at-or-before date per instrument. */
  async priceAtDateBatch(
    entries: Array<{ instrumentId: string; date: Date }>,
    scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
  ): Promise<Map<string, SignalPositionLatestPriceSnapshot>> {
    const result = new Map<string, SignalPositionLatestPriceSnapshot>();
    if (entries.length === 0) return result;

    const uniqueIds = Array.from(new Set(entries.map((e) => e.instrumentId)));
    const stocks = await this.db.stock.findMany({
      where: {
        id: { in: uniqueIds },
        ...this.stockScopeWhere(scope.region, scope.assetType),
      },
      select: { id: true, symbol: true },
    });
    if (stocks.length === 0) return result;

    const idToSymbol = new Map(stocks.map((s: { id: string; symbol: string }) => [s.id, s.symbol]));

    // Resolve in-scope entries to (instrumentId, symbol, date), keeping the
    // latest requested date per instrument when an id appears more than once.
    const byId = new Map<string, { symbol: string; date: Date }>();
    for (const e of entries) {
      const symbol = idToSymbol.get(e.instrumentId);
      if (!symbol || !Number.isFinite(e.date.getTime())) continue;
      const existing = byId.get(e.instrumentId);
      if (!existing || existing.date < e.date) byId.set(e.instrumentId, { symbol, date: e.date });
    }
    if (byId.size === 0) return result;

    const ids = Array.from(byId.keys());
    const syms = ids.map((id) => byId.get(id)!.symbol);
    const dates = ids.map((id) => byId.get(id)!.date.toISOString());

    // One DISTINCT ON query returns the single latest tick on-or-before each
    // instrument's own date. Bounded per symbol, so no full-history fetch and
    // no cross-region symbol-collision over-fetch (the prior unbounded findMany
    // pulled every matching tick into JS and could blow up napi serialization).
    const rows: Array<{
      instrumentId: string;
      timestamp: Date;
      close: unknown;
      adjustedClose: unknown;
      dataStatus: string | null;
      source: string | null;
    }> = await this.db.$queryRawUnsafe(
      `
      SELECT DISTINCT ON (sub."instrumentId")
        sub."instrumentId", pt.timestamp, pt.close, pt."adjustedClose", pt."dataStatus", pt.source
      FROM unnest($1::text[], $2::text[], $3::timestamptz[]) AS sub("instrumentId", symbol, max_date)
      JOIN price_ticks pt ON pt.symbol = sub.symbol AND pt.timestamp <= sub.max_date
      ORDER BY sub."instrumentId", pt.timestamp DESC
      `,
      ids,
      syms,
      dates,
    );

    for (const r of rows) {
      const close = Number(r.close);
      const adjusted = r.adjustedClose !== null && r.adjustedClose !== undefined ? Number(r.adjustedClose) : close;
      result.set(r.instrumentId, {
        date: new Date(r.timestamp).toISOString(),
        close,
        adjustedClose: adjusted,
        dataStatus: r.dataStatus || 'MISSING',
        source: r.source || null,
      });
    }

    return result;
  }

  /**
   * Fixed-horizon close price: the price tick exactly `offset` trading bars STRICTLY
   * AFTER the entry candle, per instrument (entry candle = bar 0, so the returned bar
   * is entry + `offset` trading days). Returns an entry ONLY when that bar exists —
   * i.e. the full horizon has elapsed in the stored price history. Positions younger
   * than `offset` bars are absent from the map and stay ACTIVE (no horizon close yet).
   *
   * ROW_NUMBER() over the strictly-forward bars picks the Nth (`offset`) bar in one
   * query, mirroring the bounded per-symbol pattern of the other batch price helpers.
   */
  async priceAtTradingDayOffsetBatch(
    entries: Array<{ instrumentId: string; entryDate: Date }>,
    offset: number,
    scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
  ): Promise<Map<string, SignalPositionLatestPriceSnapshot>> {
    const result = new Map<string, SignalPositionLatestPriceSnapshot>();
    if (entries.length === 0 || !Number.isInteger(offset) || offset <= 0) return result;

    const uniqueIds = Array.from(new Set(entries.map((e) => e.instrumentId)));
    const stocks = await this.db.stock.findMany({
      where: { id: { in: uniqueIds }, ...this.stockScopeWhere(scope.region, scope.assetType) },
      select: { id: true, symbol: true },
    });
    if (stocks.length === 0) return result;
    const idToSymbol = new Map(stocks.map((s: { id: string; symbol: string }) => [s.id, s.symbol]));

    // Keep the EARLIEST entry date per instrument when an id appears more than once,
    // so the horizon bar is measured from the position's own entry candle.
    const byId = new Map<string, { symbol: string; entryDate: Date }>();
    for (const e of entries) {
      const symbol = idToSymbol.get(e.instrumentId);
      if (!symbol || !Number.isFinite(e.entryDate.getTime())) continue;
      const existing = byId.get(e.instrumentId);
      if (!existing || e.entryDate < existing.entryDate) byId.set(e.instrumentId, { symbol, entryDate: e.entryDate });
    }
    if (byId.size === 0) return result;

    const ids = Array.from(byId.keys());
    const syms = ids.map((id) => byId.get(id)!.symbol);
    const dates = ids.map((id) => byId.get(id)!.entryDate.toISOString());

    const rows: Array<{
      instrumentId: string;
      timestamp: Date;
      close: unknown;
      adjustedClose: unknown;
      dataStatus: string | null;
      source: string | null;
    }> = await this.db.$queryRawUnsafe(
      `
      SELECT "instrumentId", timestamp, close, "adjustedClose", "dataStatus", source
      FROM (
        SELECT sub."instrumentId", pt.timestamp, pt.close, pt."adjustedClose", pt."dataStatus", pt.source,
          ROW_NUMBER() OVER (PARTITION BY sub."instrumentId" ORDER BY pt.timestamp ASC) AS rn
        FROM unnest($1::text[], $2::text[], $3::timestamptz[]) AS sub("instrumentId", symbol, entry_date)
        JOIN price_ticks pt ON pt.symbol = sub.symbol AND pt.timestamp > sub.entry_date
      ) ranked
      WHERE rn = $4
      `,
      ids,
      syms,
      dates,
      offset,
    );

    for (const r of rows) {
      const close = Number(r.close);
      const adjusted = r.adjustedClose !== null && r.adjustedClose !== undefined ? Number(r.adjustedClose) : close;
      result.set(r.instrumentId, {
        date: new Date(r.timestamp).toISOString(),
        close,
        adjustedClose: adjusted,
        dataStatus: r.dataStatus || 'MISSING',
        source: r.source || null,
      });
    }
    return result;
  }

  /**
   * Intake guard (Gap E): the set of instruments whose ENTRY candle itself already
   * carries coincident DEFENSIVE_EXIT evidence — an EXIT_CANDIDATE decision or an
   * invalidation rule fire on the SAME candle date as entry. Such a position is
   * born-dead (entry-time adverse selection) and must not be opened. Same-day only
   * (generatedDate::date = entryDate::date): a pre-entry exit from an earlier cycle
   * must NOT block a legitimate fresh re-entry, and strictly-after evidence is the
   * normal early-close path handled by firstCloseEvidenceDates.
   */
  async coincidentDefensiveEvidenceBatch(
    entries: Array<{ instrumentId: string; entryDate: string }>,
  ): Promise<Set<string>> {
    const flagged = new Set<string>();
    if (entries.length === 0) return flagged;
    const ids = entries.map((e) => e.instrumentId);
    const dates = entries.map((e) => e.entryDate);
    const rows: Array<{ instrumentId: string }> = await this.db.$queryRawUnsafe(
      `
      SELECT DISTINCT sub."instrumentId"
      FROM unnest($1::text[], $2::timestamp[]) AS sub("instrumentId", "entryDate")
      JOIN strategy_decision_results sdr ON sdr."instrumentId" = sub."instrumentId"
        AND sdr.strategy = 'DEFENSIVE_EXIT'
        AND sdr."generatedDate"::date = sub."entryDate"::date
        AND (
          sdr.decision = 'EXIT_CANDIDATE'
          OR jsonb_array_length(COALESCE(sdr."invalidationRulesTriggered"::jsonb, '[]'::jsonb)) > 0
        )
      `,
      ids,
      dates,
    );
    for (const r of rows) flagged.add(r.instrumentId);
    return flagged;
  }

  /**
   * Region-benchmark daily series (adjustedClose) for alpha computation, resolved via
   * the same market profile signal-quality-lab uses (^NSEI/IN, ^GSPC/US, etc.).
   * Returns [] when the benchmark symbol has no stored ticks (callers treat that as
   * "benchmark unavailable" → null alpha). Sorted ascending by date.
   */
  async listBenchmarkSeries(
    region: string,
    assetType: string,
    earliest?: Date,
    latest?: Date,
  ): Promise<Array<{ date: string; adjustedClose: number }>> {
    const benchmarkSymbol = resolveMarketProfile({ region, assetType }).benchmark.symbol;
    if (!benchmarkSymbol) return [];
    const where: Record<string, unknown> = { symbol: benchmarkSymbol };
    if (earliest || latest) {
      const ts: Record<string, Date> = {};
      if (earliest) ts.gte = earliest;
      if (latest) ts.lte = latest;
      where.timestamp = ts;
    }
    const ticks = await this.db.priceTick.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true, close: true, adjustedClose: true },
    });
    return ticks.map((t: { timestamp: Date; close: unknown; adjustedClose: unknown }) => {
      const close = Number(t.close);
      const adjusted = t.adjustedClose !== null && t.adjustedClose !== undefined ? Number(t.adjustedClose) : close;
      return { date: t.timestamp.toISOString(), adjustedClose: adjusted };
    });
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
      lifecycleState: record.lifecycleState ?? null,
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
    const status = this.normalizeLedgerStatus(value.status);
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
      status,
      region,
      assetType,
      healthState: value.healthState ?? this.healthStateForStatus(status),
      lifecycleEvidenceStatus: this.lifecycleEvidenceStatus(value.lifecycleEvidenceStatus, status),
      exitSignalId: value.exitSignalId ?? null,
      exitStrategyId: value.exitStrategyId ?? null,
      exitStrategyVersion: value.exitStrategyVersion ?? null,
      exitSourceDecisionId: value.exitSourceDecisionId ?? null,
      exitTriggerTimestamp: value.exitTriggerTimestamp ?? null,
      exitTriggerPrice: value.exitTriggerPrice ?? null,
      closePriceStatus: value.closePriceStatus ?? (value.exitTriggerPrice ? 'SOURCE_PROVEN' : 'UNAVAILABLE'),
      exitReasonSummary: value.exitReasonSummary ?? null,
      exitRuleId: value.exitRuleId ?? null,
      exitRuleIds: Array.isArray(value.exitRuleIds) ? value.exitRuleIds.map(String) : value.exitRuleId ? [String(value.exitRuleId)] : [],
      exitDecision: value.exitDecision ?? null,
      invalidationSourceDecisionId: value.invalidationSourceDecisionId ?? null,
      invalidationRuleIds: Array.isArray(value.invalidationRuleIds) ? value.invalidationRuleIds.map(String) : [],
      invalidationTimestamp: value.invalidationTimestamp ?? null,
      closedAt: value.closedAt ?? null,
    };
  }

  private toLedgerRow(row: any): SignalPositionLedgerActiveRow {
    const status = this.normalizeLedgerStatus(row.status);
    return {
      ledgerKey: row.ledgerKey,
      status,
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
      healthState: this.healthStateForStatus(status),
      lifecycleEvidenceStatus: this.lifecycleEvidenceStatus(row.lifecycleEvidenceStatus, status),
      trustEvidenceStatus: row.trustEvidenceStatus || 'SOURCE_PROVEN_PRICE_UNAVAILABLE',
      calibrationEvidenceStatus: row.calibrationEvidenceStatus || 'UNAVAILABLE',
      displayWarnings: Array.isArray(row.displayWarnings) ? row.displayWarnings.map(String) : [],
      exitSignalId: row.exitSignalId ?? null,
      exitStrategyId: row.exitStrategyId ?? null,
      exitStrategyVersion: row.exitStrategyVersion ?? null,
      exitSourceDecisionId: row.exitSourceDecisionId ?? null,
      exitTriggerTimestamp: row.exitTriggerTimestamp?.toISOString?.() ?? null,
      exitTriggerPrice: row.exitTriggerPrice === null || row.exitTriggerPrice === undefined ? null : Number(row.exitTriggerPrice),
      closePriceStatus: row.closePriceStatus === 'SOURCE_PROVEN' ? 'SOURCE_PROVEN' : 'UNAVAILABLE',
      exitReasonSummary: row.exitReasonSummary ?? null,
      exitRuleId: row.exitRuleId ?? null,
      exitRuleIds: Array.isArray(row.exitRuleIds) ? row.exitRuleIds.map(String) : row.exitRuleId ? [String(row.exitRuleId)] : [],
      exitDecision: row.exitDecision ?? null,
      invalidationSourceDecisionId: row.invalidationSourceDecisionId ?? null,
      invalidationRuleIds: Array.isArray(row.invalidationRuleIds) ? row.invalidationRuleIds.map(String) : [],
      invalidationTimestamp: row.invalidationTimestamp?.toISOString?.() ?? null,
      closedAt: row.closedAt?.toISOString?.() ?? null,
      closeReason: (row.closeReason as SignalPositionLedgerActiveRow['closeReason']) ?? null,
      horizonTradingDays: row.horizonTradingDays === null || row.horizonTradingDays === undefined ? null : Number(row.horizonTradingDays),
      benchmarkReturnPercent: row.benchmarkReturnPercent === null || row.benchmarkReturnPercent === undefined ? null : Number(row.benchmarkReturnPercent),
      alphaPercent: row.alphaPercent === null || row.alphaPercent === undefined ? null : Number(row.alphaPercent),
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
      activeSlot: this.isActiveLikeStatus(row.status) ? this.stockKey(row.symbol) : null,
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
      lifecycleEvidenceStatus: row.lifecycleEvidenceStatus,
      trustEvidenceStatus: row.trustEvidenceStatus,
      calibrationEvidenceStatus: row.calibrationEvidenceStatus,
      displayWarnings: row.displayWarnings || [],
      exitSignalId: row.exitSignalId ?? null,
      exitStrategyId: row.exitStrategyId ?? null,
      exitStrategyVersion: row.exitStrategyVersion ?? null,
      exitSourceDecisionId: row.exitSourceDecisionId ?? null,
      exitTriggerTimestamp: row.exitTriggerTimestamp ? new Date(row.exitTriggerTimestamp) : null,
      exitTriggerPrice: row.exitTriggerPrice ?? null,
      closePriceStatus: row.closePriceStatus ?? 'UNAVAILABLE',
      exitReasonSummary: row.exitReasonSummary ?? null,
      exitRuleId: row.exitRuleId ?? null,
      exitRuleIds: row.exitRuleIds || [],
      exitDecision: row.exitDecision ?? null,
      invalidationSourceDecisionId: row.invalidationSourceDecisionId ?? null,
      invalidationRuleIds: row.invalidationRuleIds || [],
      invalidationTimestamp: row.invalidationTimestamp ? new Date(row.invalidationTimestamp) : null,
      closedAt: row.status === 'CLOSED' && row.closedAt ? new Date(row.closedAt) : null,
      closeReason: row.closeReason ?? null,
      horizonTradingDays: row.horizonTradingDays ?? null,
      benchmarkReturnPercent: row.benchmarkReturnPercent ?? null,
      alphaPercent: row.alphaPercent ?? null,
      lastEvaluatedAt: new Date(),
    };
  }

  private toLedgerUpdate(row: SignalPositionLedgerActiveRow, includeExit: boolean) {
    const data: Record<string, unknown> = {
      symbol: row.symbol,
      companyName: row.companyName,
      stockKey: this.stockKey(row.symbol),
      status: row.status,
      activeSlot: this.isActiveLikeStatus(row.status) ? this.stockKey(row.symbol) : null,
      latestTrustedPriceDate: row.latestTrustedPriceDate ? new Date(row.latestTrustedPriceDate) : null,
      latestTrustedPrice: row.latestTrustedPrice,
      currentReturnPercent: row.currentReturnPercent,
      currentReturnStatus: row.currentReturnStatus,
      currentDataQualityStatus: row.currentDataQualityStatus,
      lifecycleEvidenceStatus: row.lifecycleEvidenceStatus,
      trustEvidenceStatus: row.trustEvidenceStatus,
      calibrationEvidenceStatus: row.calibrationEvidenceStatus,
      displayWarnings: row.displayWarnings || [],
      exitSignalId: row.exitSignalId ?? null,
      exitStrategyId: row.exitStrategyId ?? null,
      exitStrategyVersion: row.exitStrategyVersion ?? null,
      exitSourceDecisionId: row.exitSourceDecisionId ?? null,
      exitTriggerTimestamp: row.exitTriggerTimestamp ? new Date(row.exitTriggerTimestamp) : null,
      exitTriggerPrice: row.exitTriggerPrice ?? null,
      closePriceStatus: row.closePriceStatus ?? 'UNAVAILABLE',
      exitReasonSummary: row.exitReasonSummary ?? null,
      exitRuleId: row.exitRuleId ?? null,
      exitRuleIds: row.exitRuleIds || [],
      exitDecision: row.exitDecision ?? null,
      invalidationSourceDecisionId: row.invalidationSourceDecisionId ?? null,
      invalidationRuleIds: row.invalidationRuleIds || [],
      invalidationTimestamp: row.invalidationTimestamp ? new Date(row.invalidationTimestamp) : null,
      lastEvaluatedAt: new Date(),
    };
    if (includeExit) {
      Object.assign(data, {
        status: row.status,
        activeSlot: this.isActiveLikeStatus(row.status) ? this.stockKey(row.symbol) : null,
        closedAt: row.status === 'CLOSED' ? (row.closedAt ? new Date(row.closedAt) : new Date()) : null,
        closeReason: row.closeReason ?? null,
        horizonTradingDays: row.horizonTradingDays ?? null,
        benchmarkReturnPercent: row.benchmarkReturnPercent ?? null,
        alphaPercent: row.alphaPercent ?? null,
      });
    }
    return data;
  }

  private ledgerStatusWhere(status: SignalPositionLedgerStatus) {
    return status === 'ACTIVE' ? { in: ['ACTIVE', 'RISK_WARNING', 'EXIT_TRIGGERED'] } : status;
  }

  private normalizeLedgerStatus(value: unknown): SignalPositionLedgerStatus {
    if (value === 'RISK_WARNING' || value === 'EXIT_TRIGGERED' || value === 'INVALIDATED' || value === 'CLOSED') return value;
    return 'ACTIVE';
  }

  private isActiveLikeStatus(status: SignalPositionLedgerStatus): boolean {
    return status === 'ACTIVE' || status === 'RISK_WARNING' || status === 'EXIT_TRIGGERED';
  }

  private healthStateForStatus(status: SignalPositionLedgerStatus): SignalPositionLedgerActiveRow['healthState'] {
    if (status === 'RISK_WARNING') return 'RISK_WARNING';
    if (status === 'EXIT_TRIGGERED' || status === 'CLOSED') return 'EXIT_TRIGGERED';
    return null;
  }

  private lifecycleEvidenceStatus(value: unknown, status: SignalPositionLedgerStatus): SignalPositionLedgerActiveRow['lifecycleEvidenceStatus'] {
    if (value === 'RISK_WARNING' || value === 'EXIT_TRIGGERED' || value === 'INVALIDATED' || value === 'CLOSED' || value === 'UNAVAILABLE' || value === 'ACTIVE_ENTRY') return value;
    if (status === 'RISK_WARNING') return 'RISK_WARNING';
    if (status === 'EXIT_TRIGGERED') return 'EXIT_TRIGGERED';
    if (status === 'INVALIDATED') return 'INVALIDATED';
    if (status === 'CLOSED') return 'CLOSED';
    return 'ACTIVE_ENTRY';
  }

  private stockKey(symbol: string): string {
    return String(symbol || '').trim().replace(/\.(NS|BO)$/i, '').toUpperCase();
  }
}

