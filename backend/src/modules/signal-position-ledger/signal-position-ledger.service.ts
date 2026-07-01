import { SignalGenerationEngineService } from '../signal-generation-engine';
import type { SignalResultDto } from '../signal-generation-engine';
import type {
  SignalPositionDataQualitySnapshot,
  SignalPositionLedgerActiveCandidate,
  SignalPositionLedgerActiveListResponse,
  SignalPositionLedgerActiveQuery,
  SignalPositionLedgerActiveRow,
  SignalPositionLedgerMaterializedSnapshot,
  SignalPositionLedgerRowSnapshots,
  SignalPositionLedgerRefreshProgress,
  SignalPositionLedgerRefreshStatus,
  SignalPositionLatestPriceSnapshot,
  SignalPositionLedgerRecomputeResult,
  SignalPositionTriggerContractReadModel,
} from './signal-position-ledger.types';
import { SignalPositionLedgerRepository } from './signal-position-ledger.repository';
import { adjustedEntryPrice, adjustedEntryPricesBatch, adjustedReturn } from './signal-position-ledger.adjustment';
const SOURCE_PAGE_LIMIT = 100;
const PRICE_STALE_DAYS = 5;
const REFRESH_STALE_MS = 15 * 60 * 1000;
const SOURCE_PROVEN_PRICE_STATUS = 'COMPLETE';

// The ledger is intentionally STRICTER than the screener (separation of purpose, owner
// policy 2026-06-25). The screener surfaces the BROAD bullish/bearish candidate set —
// driven by persisted signal_results.direction — while the ledger only TRACKS HIGH-confidence
// entries. A position opens only for a HIGH-confidence signal whose composite score EXCEEDS
// this floor; applied to BOTH entry paths (A: enriched, B: lifecycle). This decouples ledger
// selectivity from screener breadth so relaxing the defensive-exit gate (which broadened the
// screener) does not flood the ledger with weak entries. See signal-defensive-exit-gate.ts.
const LEDGER_MIN_ENTRY_SCORE = 90; // exclusive: score must be > 90

// Fixed-horizon exit policy (owner decision 2026-07). A position is HELD to a fixed
// horizon and closes on the FIRST of: HORIZON_REACHED (entry + 60 trading bars),
// DEFENSIVE_EXIT (earliest EXIT_CANDIDATE strictly after entry), or INVALIDATED
// (earliest invalidation strictly after entry). This replaces the prior asymmetric
// defensive-only exit that closed at the first flag (negative expectancy by
// construction). REDUCE_RISK no longer closes — it rests the position ACTIVE.
const HORIZON_TRADING_DAYS = 60;

// Wide lower bound for the region-benchmark series fetch (alpha computation). Covers
// the full ledger entry history; the actual holding window is sliced in JS.
const BENCHMARK_SERIES_EARLIEST = new Date('2015-01-01T00:00:00.000Z');

type LifecycleCloseEvidence = {
  exitDate: string | null;
  invalidationDate: string | null;
  // Deterministic horizon terminal: date + price of the entry + HORIZON_TRADING_DAYS
  // bar. Present only when that many bars have actually elapsed in stored history.
  horizonDate: string | null;
  horizonPrice: SignalPositionLatestPriceSnapshot | null;
};

type LedgerRefreshState = {
  scopeKey: string;
  region: string;
  assetType: string;
  runId: string;
  status: SignalPositionLedgerRefreshStatus;
  rows: Map<string, SignalPositionLedgerActiveRow>;
  closedRows: Map<string, SignalPositionLedgerActiveRow>;
  totalCount: number;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
  warnings: string[];
  errors: string[];
  promise: Promise<void> | null;
};

type RefreshOptions = {
  force?: boolean;
  wait?: boolean;
};

export class SignalPositionLedgerService {
  private readonly refreshStates = new Map<string, LedgerRefreshState>();
  // Run-scoped region-benchmark series cache (adjustedClose sorted ascending by epoch).
  // Cleared at the start of each refresh/recompute so a run never serves stale prices.
  private readonly benchmarkSeriesByScope = new Map<string, Array<{ date: number; adjustedClose: number }>>();

  constructor(
    private readonly repository = new SignalPositionLedgerRepository(),
    private readonly signalService = new SignalGenerationEngineService(),
  ) {}

  async listActiveRows(query: SignalPositionLedgerActiveQuery): Promise<SignalPositionLedgerActiveListResponse> {
    let state = this.refreshStates.get(this.scopeKey(query));
    const persistedPage = state ? null : await this.loadLedgerPage(query, 'ACTIVE');
    const snapshot = state || persistedPage?.totalCount ? null : await this.loadMaterializedSnapshot(query);
    if (!state && (!persistedPage || persistedPage.totalCount === 0) && this.shouldRefreshSnapshot(snapshot)) {
      state = this.ensureRefreshStarted(query, false);
    }
    const refresh = state ? this.toRefreshProgress(state) : snapshot?.refresh ?? this.toRefreshProgress(null);
    const persistedRows = persistedPage?.items ?? snapshot?.rows ?? [];
    const orderedRows = state ? this.orderLedgerRows([...state.rows.values()], query) : this.orderLedgerRows(persistedRows, query);
    const totalCount = state ? orderedRows.length : persistedPage?.totalCount ?? orderedRows.length;
    const items = state ? orderedRows.slice(query.offset, query.offset + query.limit) : orderedRows;

    const nextOffset = query.offset + items.length;
    return {
      items,
      totalCount,
      limit: query.limit,
      offset: query.offset,
      nextOffset: nextOffset < totalCount ? nextOffset : null,
      hasMore: nextOffset < totalCount,
      scope: {
        region: query.region,
        assetType: query.assetType,
      },
      refresh,
      warnings: this.activeWarnings(state, snapshot?.refresh ?? null),
    };
  }

  async listClosedRows(query: SignalPositionLedgerActiveQuery): Promise<SignalPositionLedgerActiveListResponse> {
    const state = this.refreshStates.get(this.scopeKey(query));
    const persistedPage = state ? null : await this.loadLedgerPage(query, 'CLOSED');
    const refresh = state ? this.toRefreshProgress(state) : this.toRefreshProgress(null);
    const orderedRows = state ? this.orderLedgerRows([...state.closedRows.values()], query) : this.orderLedgerRows(persistedPage?.items ?? [], query);
    const totalCount = state ? orderedRows.length : persistedPage?.totalCount ?? orderedRows.length;
    const items = state ? orderedRows.slice(query.offset, query.offset + query.limit) : orderedRows;
    const nextOffset = query.offset + items.length;
    return {
      items,
      totalCount,
      limit: query.limit,
      offset: query.offset,
      nextOffset: nextOffset < totalCount ? nextOffset : null,
      hasMore: nextOffset < totalCount,
      scope: {
        region: query.region,
        assetType: query.assetType,
      },
      refresh,
      warnings: [],
    };
  }

  async listPersistedActiveRows(query: SignalPositionLedgerActiveQuery): Promise<SignalPositionLedgerActiveListResponse> {
    return this.listPersistedRows(query, 'ACTIVE');
  }

  async listPersistedClosedRows(query: SignalPositionLedgerActiveQuery): Promise<SignalPositionLedgerActiveListResponse> {
    return this.listPersistedRows(query, 'CLOSED');
  }

  async refreshActiveRows(query: SignalPositionLedgerActiveQuery, options: RefreshOptions = {}): Promise<SignalPositionLedgerRefreshProgress> {
    const state = this.ensureRefreshStarted(query, options.force === true);
    if (options.wait && state.promise) await state.promise;
    return this.toRefreshProgress(state);
  }

  async health() {
    return {
      status: 'ok',
      module: 'signal-position-ledger',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * ONE-TIME rebuild of the corrupt closed-position history under the fixed-horizon
   * lifecycle (owner decision 2026-07). The legacy defensive-only exit closed most
   * positions at the first flag (~2-day holds, negative expectancy by construction),
   * producing a misleading realized-return card. This replays every historical entry:
   *
   *  1. Enumerate every opened position for the scope (all statuses, NO dedup).
   *  2. Reset each to a pristine ACTIVE entry row (entry identity + strategy metadata
   *     only; every exit/current field cleared).
   *  3. Replay chronologically PER STOCK, holding the one-open-position-per-stock
   *     invariant (the activeSlot unique constraint): an entry that opened while a
   *     prior position for the same stock was still open (a legacy 2-day-close
   *     re-entry artifact) is dropped as a SHADOW; an entry whose own entry candle
   *     already carries coincident defensive/invalidation evidence is dropped as
   *     BORN-DEAD (the Gap-E intake guard). Each surviving opener runs through
   *     lifecycleRow → HORIZON_REACHED / DEFENSIVE_EXIT / INVALIDATED / stays-ACTIVE.
   *  4. Atomically replace the scope's rows with the recomputed set.
   *
   * Not part of the daily pipeline — invoked by scripts/rebuild-ledger.ts.
   */
  async recomputeClosedHistory(
    scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
  ): Promise<SignalPositionLedgerRecomputeResult> {
    const query: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'> = {
      region: scope.region,
      assetType: scope.assetType,
    };
    const repo = this.repository as any;
    // Fresh region-benchmark series per rebuild run (mirrors refresh start).
    this.benchmarkSeriesByScope.clear();

    const result: SignalPositionLedgerRecomputeResult = {
      scope: { region: scope.region, assetType: scope.assetType },
      scanned: 0, shadowsDropped: 0, bornDeadDropped: 0, kept: 0,
      closedHorizon: 0, closedDefensive: 0, invalidated: 0, exitTriggered: 0,
      active: 0, deleted: 0, inserted: 0,
    };

    if (typeof repo.listEveryLedgerRow !== 'function' || typeof repo.replaceScopeLedgerRows !== 'function') {
      return result;
    }

    const historical: SignalPositionLedgerActiveRow[] = await repo.listEveryLedgerRow(query);
    result.scanned = historical.length;
    if (historical.length === 0) return result;

    // Latest per-instrument snapshots (price / quality / exitDecision) are keyed by
    // instrumentId only, so batch once across every distinct instrument. (Per-entry
    // close evidence is resolved per-opener below, since firstCloseEvidenceDates keys
    // by instrumentId and would collapse a stock's multiple entry windows.)
    const distinctInstruments = [...new Set(historical.map((row) => row.instrumentId))];
    const snapshotCandidates: SignalPositionLedgerActiveCandidate[] = distinctInstruments.map((instrumentId) => {
      const sample = historical.find((row) => row.instrumentId === instrumentId)!;
      return {
        signal: { id: sample.signalId || '', instrument_id: instrumentId, symbol: sample.symbol, company_name: sample.companyName } as any,
        triggerContract: {} as any,
      };
    });
    const snapshots = await this.loadRowSnapshots(snapshotCandidates, query);

    // Group by stock and replay each group oldest-entry-first.
    const byStock = new Map<string, SignalPositionLedgerActiveRow[]>();
    for (const row of historical) {
      const key = this.stockKey(row.symbol);
      const bucket = byStock.get(key);
      if (bucket) bucket.push(row); else byStock.set(key, [row]);
    }

    const kept: SignalPositionLedgerActiveRow[] = [];
    for (const bucket of byStock.values()) {
      bucket.sort((left, right) => Date.parse(left.entryTriggerTimestamp) - Date.parse(right.entryTriggerTimestamp));
      // Epoch (ms) at which the currently-open position for this stock closes.
      // -Infinity = nothing open yet; Infinity = a position is still open (held).
      let openUntil = -Infinity;
      for (const original of bucket) {
        const entryMs = Date.parse(original.entryTriggerTimestamp);
        // A position is still open on this entry candle → this re-entry never should
        // have opened under the held lifecycle. Drop it as a shadow.
        if (Number.isFinite(entryMs) && entryMs <= openUntil) {
          result.shadowsDropped += 1;
          continue;
        }
        // Intake guard (Gap E): reject a born-dead entry whose entry candle already
        // carries coincident defensive/invalidation evidence. Does not advance the
        // window — no position opened.
        if (typeof repo.coincidentDefensiveEvidenceBatch === 'function' && original.entryTriggerTimestamp) {
          const flagged: Set<string> = await repo.coincidentDefensiveEvidenceBatch([
            { instrumentId: original.instrumentId, entryDate: original.entryTriggerTimestamp },
          ]);
          if (flagged.has(original.instrumentId)) {
            result.bornDeadDropped += 1;
            continue;
          }
        }
        const rowSnapshots = snapshots.get(original.instrumentId) ?? this.emptySnapshots();
        const recomputed = await this.recomputeEntry(this.toPristineEntryRow(original), rowSnapshots, query);
        kept.push(recomputed);
        if (recomputed.status === 'CLOSED') {
          if (recomputed.closeReason === 'HORIZON_REACHED') result.closedHorizon += 1;
          else result.closedDefensive += 1;
          openUntil = this.closeEpoch(recomputed);
        } else if (recomputed.status === 'INVALIDATED') {
          result.invalidated += 1;
          openUntil = this.closeEpoch(recomputed);
        } else if (recomputed.status === 'EXIT_TRIGGERED') {
          result.exitTriggered += 1;
          openUntil = Infinity; // occupies the active slot until the close price resolves
        } else {
          result.active += 1;
          openUntil = Infinity; // still open (held); no further entry for this stock
        }
      }
    }

    const { deleted, inserted } = await repo.replaceScopeLedgerRows(query, kept);
    result.kept = kept.length;
    result.deleted = deleted;
    result.inserted = inserted;
    return result;
  }

  /** Recompute one opener's terminal/active state under the fixed-horizon lifecycle. */
  private async recomputeEntry(
    entryRow: SignalPositionLedgerActiveRow,
    snapshots: SignalPositionLedgerRowSnapshots,
    query: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
  ): Promise<SignalPositionLedgerActiveRow> {
    const evidence = await this.firstCloseEvidence(entryRow);
    const lifecycle = await this.lifecycleRow(entryRow, snapshots, query, evidence);
    if (!lifecycle) {
      // No terminal evidence and horizon not reached → rest ACTIVE with current evidence.
      return this.withCurrentEvidence(entryRow, snapshots);
    }
    if (lifecycle.status === 'CLOSED' || lifecycle.status === 'INVALIDATED') {
      return await this.enrichTerminalRow(lifecycle);
    }
    return lifecycle; // ACTIVE (horizon bar not source-proven) or EXIT_TRIGGERED (fill pending)
  }

  /**
   * Strip a stored row back to its pristine entry state (entry identity + strategy
   * metadata) so it can be replayed cleanly through the lifecycle. All exit/current/
   * terminal fields are cleared; status resets to ACTIVE.
   */
  private toPristineEntryRow(row: SignalPositionLedgerActiveRow): SignalPositionLedgerActiveRow {
    return {
      ledgerKey: row.ledgerKey,
      status: 'ACTIVE',
      signalId: row.signalId,
      instrumentId: row.instrumentId,
      symbol: row.symbol,
      companyName: row.companyName,
      region: row.region,
      assetType: row.assetType,
      triggerType: row.triggerType,
      entryTriggerTimestamp: row.entryTriggerTimestamp,
      entryTriggerPrice: row.entryTriggerPrice,
      entryReasonSummary: row.entryReasonSummary,
      strategyId: row.strategyId,
      strategyVersion: row.strategyVersion,
      strategyDecision: row.strategyDecision,
      strategyReadinessLabel: row.strategyReadinessLabel,
      strategyRatingGrade: row.strategyRatingGrade,
      entryRuleId: row.entryRuleId,
      latestTrustedPriceDate: null,
      latestTrustedPrice: null,
      currentReturnPercent: null,
      currentReturnStatus: 'UNAVAILABLE',
      currentDataQualityStatus: null,
      healthState: null,
      lifecycleEvidenceStatus: 'ACTIVE_ENTRY',
      trustEvidenceStatus: 'SOURCE_PROVEN_PRICE_UNAVAILABLE',
      calibrationEvidenceStatus: 'UNAVAILABLE',
      displayWarnings: [],
    };
  }

  /** Close epoch (ms) of a terminal row; Infinity when no usable close date (treat as still open). */
  private closeEpoch(row: SignalPositionLedgerActiveRow): number {
    const ts = row.closedAt ?? row.exitTriggerTimestamp ?? row.entryTriggerTimestamp;
    const ms = Date.parse(ts || '');
    return Number.isFinite(ms) ? ms : Infinity;
  }

  private async listPersistedRows(
    query: SignalPositionLedgerActiveQuery,
    status: 'ACTIVE' | 'CLOSED',
  ): Promise<SignalPositionLedgerActiveListResponse> {
    const persistedPage = await this.loadLedgerPage(query, status);
    const items = persistedPage?.items ?? [];
    const totalCount = persistedPage?.totalCount ?? items.length;
    const nextOffset = persistedPage?.nextOffset ?? null;
    return {
      items,
      totalCount,
      limit: query.limit,
      offset: query.offset,
      nextOffset,
      hasMore: persistedPage?.hasMore ?? false,
      scope: {
        region: query.region,
        assetType: query.assetType,
      },
      refresh: this.toRefreshProgress(null),
      warnings: status === 'ACTIVE' && totalCount === 0
        ? ['No persisted Signal Position Ledger entries are available for this scope yet.']
        : [],
    };
  }

  private orderLedgerRows(rows: SignalPositionLedgerActiveRow[], query: Pick<SignalPositionLedgerActiveQuery, 'sortBy' | 'sortDirection'>): SignalPositionLedgerActiveRow[] {
    const sortBy = query.sortBy || 'entryTriggerTimestamp';
    const direction = query.sortDirection || 'desc';
    const factor = direction === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => {
      const leftValue = sortBy === 'currentReturnPercent' ? this.sortableReturn(left) : this.sortableDate(left.entryTriggerTimestamp);
      const rightValue = sortBy === 'currentReturnPercent' ? this.sortableReturn(right) : this.sortableDate(right.entryTriggerTimestamp);
      if (leftValue === null && rightValue === null) return left.symbol.localeCompare(right.symbol);
      if (leftValue === null) return 1;
      if (rightValue === null) return -1;
      const delta = leftValue - rightValue;
      if (delta !== 0) return delta * factor;
      const symbolDelta = left.symbol.localeCompare(right.symbol);
      if (symbolDelta !== 0) return symbolDelta;
      return left.instrumentId.localeCompare(right.instrumentId);
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

  private toActiveRow(candidate: SignalPositionLedgerActiveCandidate, snapshots: SignalPositionLedgerRowSnapshots): SignalPositionLedgerActiveRow {
    const { signal, triggerContract } = candidate;
    const { latestPrice, quality, exitDecision } = snapshots;
    const primaryStrategy = signal.strategyMatches?.[0] ?? null;

    const returnProjection = this.currentReturnProjection(triggerContract.trigger_price as number, latestPrice, quality);
    const healthState = this.healthStateForDecision(exitDecision?.decision);
    const status = this.statusForHealthState(healthState);
    const exitEvidence = this.exitEvidenceForDecision(exitDecision);

    return {
      ledgerKey: this.lifecycleKey({
        // Region: trigger contract → signal instrument → legacy 'IN' fallback.
        region: triggerContract.region || (signal as any).region || 'IN',
        assetType: triggerContract.asset_class || 'STOCK',
        instrumentId: signal.instrument_id,
        entryTriggerTimestamp: triggerContract.trigger_timestamp as string,
      }),
      status,
      signalId: triggerContract.signal_id || signal.id || null,
      instrumentId: signal.instrument_id,
      symbol: signal.symbol,
      companyName: signal.company_name || null,
      region: triggerContract.region || null,
      assetType: triggerContract.asset_class || null,
      triggerType: triggerContract.trigger_type as SignalPositionLedgerActiveRow['triggerType'],
      entryTriggerTimestamp: triggerContract.trigger_timestamp as string,
      entryTriggerPrice: Number(triggerContract.trigger_price),
      entryReasonSummary: triggerContract.reason_summary,
      strategyId: triggerContract.strategy_id || null,
      strategyVersion: triggerContract.strategy_version || null,
      strategyDecision: primaryStrategy?.decision ?? null,
      strategyReadinessLabel: primaryStrategy?.readinessLabel ?? null,
      strategyRatingGrade: primaryStrategy?.ratingGrade ?? null,
      entryRuleId: triggerContract.entry_rule_id || null,
      latestTrustedPriceDate: latestPrice?.date || null,
      latestTrustedPrice: latestPrice?.adjustedClose ?? latestPrice?.close ?? null,
      currentReturnPercent: returnProjection.currentReturnPercent,
      currentReturnStatus: returnProjection.currentReturnStatus,
      currentDataQualityStatus: quality?.signalReadinessStatus ?? null,
      healthState,
      lifecycleEvidenceStatus: healthState === 'RISK_WARNING'
        ? 'RISK_WARNING'
        : healthState === 'EXIT_TRIGGERED'
          ? 'EXIT_TRIGGERED'
          : 'ACTIVE_ENTRY',
      trustEvidenceStatus: returnProjection.trustEvidenceStatus,
      calibrationEvidenceStatus: primaryStrategy?.readinessLabel || primaryStrategy?.ratingGrade ? 'AVAILABLE' : 'UNAVAILABLE',
      displayWarnings: this.displayWarnings(primaryStrategy, quality, returnProjection.currentReturnStatus),
      ...exitEvidence,
    };
  }

  /**
   * Ledger entry confidence floor — see LEDGER_MIN_ENTRY_SCORE. Only HIGH-confidence signals
   * scoring above the floor may open a tracked position. Reads already-persisted score/confidence
   * from signal_results; independent of the screener's direction-only selection.
   */
  private isHighConfidenceEntry(signal: SignalResultDto): boolean {
    return signal.confidence === 'HIGH'
      && Number.isFinite(signal.score)
      && signal.score > LEDGER_MIN_ENTRY_SCORE;
  }

  private isTrustedSourceSignal(signal: SignalResultDto): boolean {
    const quality = signal.dataQualityEligibility;
    const hasNoiseBlocker = (signal.blockedStrategies || []).some((item) => (item.noiseFiltersTriggered || []).length > 0);
    return signal.auditStatus === 'CURRENT'
      && signal.direction === 'BULLISH'
      && this.isHighConfidenceEntry(signal)
      && quality?.filterApplied === true
      && quality.eligible === true
      && quality.signalReadinessStatus === 'READY'
      && !hasNoiseBlocker;
  }

  private isTrustedEnrichedSignal(signal: SignalResultDto): boolean {
    const primaryStrategy = signal.strategyMatches?.[0] ?? null;
    const hasNoiseBlocker = (signal.blockedStrategies || []).some((item) => (item.noiseFiltersTriggered || []).length > 0);
    const activeReviewDecision = primaryStrategy?.decision === 'ENTRY_CANDIDATE';
    return this.isTrustedSourceSignal(signal)
      && activeReviewDecision
      && primaryStrategy.direction === 'BULLISH'
      && !hasNoiseBlocker;
  }

  private isEligibleActiveTrigger(trigger: SignalPositionTriggerContractReadModel): boolean {
    if (trigger.trigger_type !== 'bullish_entry_trigger') return false;
    if (trigger.trigger_price_evidence?.status !== 'SOURCE_PROVEN') return false;
    if (typeof trigger.trigger_price !== 'number' || !Number.isFinite(trigger.trigger_price)) return false;
    if (!trigger.trigger_timestamp) return false;
    // PATH B lifecycle-entry contracts omit strategy_id — still SOURCE_PROVEN.
    return true;
  }

  private isPublishableActiveCandidate(row: SignalPositionLedgerActiveRow): boolean {
    if (row.triggerType !== 'bullish_entry_trigger') return false;
    // PATH B rows have null strategyDecision (no live eval) — still publishable.
    if (row.strategyDecision !== null && row.strategyDecision !== 'ENTRY_CANDIDATE') return false;
    if (row.currentDataQualityStatus !== 'READY') return false;
    if (row.status === 'EXIT_TRIGGERED' || row.healthState === 'EXIT_TRIGGERED') return false;
    return true;
  }

  /**
   * PATH B: Build trigger contracts for lifecycle-entry signals without running the
   * full strategy-framework evaluation.  For each signal with lifecycleState=ENTRY,
   * look up the price tick at or before the signal's sourcePriceDate (the date on
   * which the signal was generated) and use it as the SOURCE_PROVEN trigger price.
   *
   * This produces a minimal but valid trigger contract — trigger_type, trigger_price,
   * trigger_timestamp, and SOURCE_PROVEN evidence are all set.  strategy_id,
   * strategy_version, and entry_rule_id are null (no live strategy eval ran); the
   * isPublishableActiveCandidate check accepts null strategyDecision for PATH B rows.
   *
   * Returns a Map keyed by instrumentId for O(1) lookup in the caller.
   */
  private async buildLifecycleTriggerContracts(
    signals: SignalResultDto[],
    scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
  ): Promise<Map<string, SignalPositionTriggerContractReadModel>> {
    const result = new Map<string, SignalPositionTriggerContractReadModel>();
    if (signals.length === 0) return result;

    const repositoryWithBatch = this.repository as SignalPositionLedgerRepository & {
      priceAtDateBatch?: (
        entries: Array<{ instrumentId: string; date: Date }>,
        scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
      ) => Promise<Map<string, SignalPositionLatestPriceSnapshot>>;
    };
    if (typeof repositoryWithBatch.priceAtDateBatch !== 'function') return result;

    const entries = signals.flatMap((signal) => {
      const rawDate = signal.sourcePriceDate ?? signal.sourceDataDate;
      if (!rawDate) return [];
      const date = new Date(rawDate);
      if (!Number.isFinite(date.getTime())) return [];
      return [{ instrumentId: signal.instrument_id, date }];
    });

    const priceMap = await repositoryWithBatch.priceAtDateBatch(entries, scope);

    for (const signal of signals) {
      const rawDate = signal.sourcePriceDate ?? signal.sourceDataDate;
      if (!rawDate) continue;
      const priceSnapshot = priceMap.get(signal.instrument_id);
      if (!priceSnapshot) continue;
      const closePrice = priceSnapshot.adjustedClose ?? priceSnapshot.close;
      if (!Number.isFinite(closePrice) || closePrice <= 0) continue;
      if (priceSnapshot.dataStatus !== 'COMPLETE') continue;

      result.set(signal.instrument_id, {
        signal_id: signal.id ?? null,
        instrument_id: signal.instrument_id,
        symbol: signal.symbol,
        asset_class: 'STOCK',
        region: scope.region,
        strategy_id: null,
        strategy_version: null,
        trigger_type: 'bullish_entry_trigger',
        trigger_price: closePrice,
        trigger_timestamp: priceSnapshot.date,
        entry_rule_id: null,
        reason_summary: signal.explanation,
        data_quality_status: signal.dataQualityEligibility?.signalReadinessStatus ?? null,
        trigger_price_evidence: { status: 'SOURCE_PROVEN' },
      });
    }

    return result;
  }

  /**
   * Gap E intake guard: the set of candidate instruments whose entry candle already
   * carries coincident DEFENSIVE_EXIT (EXIT_CANDIDATE / invalidation) evidence.
   * Batched against strategy_decision_results (same-candle only). Empty set when the
   * repository doesn't expose the batch (defensive against partial mocks).
   */
  private async coincidentIntakeGuard(candidates: SignalPositionLedgerActiveCandidate[]): Promise<Set<string>> {
    const repo = this.repository as any;
    if (typeof repo.coincidentDefensiveEvidenceBatch !== 'function') return new Set<string>();
    const entries = candidates.flatMap((c) => {
      const entryDate = c.triggerContract?.trigger_timestamp;
      return entryDate ? [{ instrumentId: c.signal.instrument_id, entryDate }] : [];
    });
    if (entries.length === 0) return new Set<string>();
    return await repo.coincidentDefensiveEvidenceBatch(entries);
  }

  private currentReturnProjection(
    entryPrice: number,
    latestPrice: SignalPositionLatestPriceSnapshot | null,
    quality: SignalPositionDataQualitySnapshot | null,
  ) {
    if (!latestPrice || !Number.isFinite(latestPrice.adjustedClose || latestPrice.close) || entryPrice <= 0) {
      return {
        currentReturnPercent: null,
        currentReturnStatus: 'UNAVAILABLE' as const,
        trustEvidenceStatus: 'SOURCE_PROVEN_PRICE_UNAVAILABLE' as const,
      };
    }

    if (!quality) {
      return {
        currentReturnPercent: null,
        currentReturnStatus: 'UNAVAILABLE' as const,
        trustEvidenceStatus: 'SOURCE_PROVEN_DQ_UNAVAILABLE' as const,
      };
    }

    if (quality.signalReadinessStatus !== 'READY' || quality.coverageStatus === 'UNUSABLE') {
      return {
        currentReturnPercent: null,
        currentReturnStatus: 'UNAVAILABLE' as const,
        trustEvidenceStatus: 'SOURCE_PROVEN_DQ_LIMITED' as const,
      };
    }

    const priceDate = new Date(latestPrice.date);
    const staleCutoff = new Date();
    staleCutoff.setUTCDate(staleCutoff.getUTCDate() - PRICE_STALE_DAYS);
    const staleByDate = !Number.isFinite(priceDate.getTime()) || priceDate < staleCutoff;
    const staleByStatus = latestPrice.dataStatus !== 'COMPLETE';
    if (staleByDate || staleByStatus) {
      return {
        currentReturnPercent: null,
        currentReturnStatus: 'STALE' as const,
        trustEvidenceStatus: 'SOURCE_PROVEN_PRICE_STALE' as const,
      };
    }

    const currentPrice = latestPrice.adjustedClose || latestPrice.close;
    const currentReturnPercent = Number((((currentPrice - entryPrice) / entryPrice) * 100).toFixed(4));
    return {
      currentReturnPercent,
      currentReturnStatus: 'CURRENT' as const,
      trustEvidenceStatus: 'SOURCE_PROVEN' as const,
    };
  }

  // Owner policy 2026-06-23: REDUCE_RISK no longer rests in the defunct RISK_WARNING (see loadExistingLedgerState) — genuine on/after-entry exit evidence is closed by lifecycleRow, otherwise the position rests ACTIVE.
  private healthStateForDecision(decision?: string | null): SignalPositionLedgerActiveRow['healthState'] {
    if (decision === 'EXIT_CANDIDATE') return 'EXIT_TRIGGERED';
    return null;
  }

  private statusForHealthState(healthState: SignalPositionLedgerActiveRow['healthState']): SignalPositionLedgerActiveRow['status'] {
    if (healthState === 'EXIT_TRIGGERED') return 'EXIT_TRIGGERED';
    return 'ACTIVE';
  }

  private isActiveLikeStatus(status: SignalPositionLedgerActiveRow['status']): boolean {
    return status === 'ACTIVE' || status === 'RISK_WARNING' || status === 'EXIT_TRIGGERED';
  }

  private hasInvalidationEvidence(exitDecision: SignalPositionLedgerRowSnapshots['exitDecision']): boolean {
    return (exitDecision?.invalidationRulesTriggered || []).length > 0;
  }

  // Fixed-horizon policy (2026-07): REDUCE_RISK no longer closes a position — it rests
  // ACTIVE and is held to horizon. Only EXIT_CANDIDATE + invalidation close early, and a
  // HOLD verdict carrying only sub-threshold exit-rule fires is never a close (mirrors
  // firstCloseEvidenceDates + the entry gate isUnderDefensiveExit). The former
  // hasRiskWarningEvidence() helper was removed with its only caller.

  private exitEvidenceForDecision(exitDecision: SignalPositionLedgerRowSnapshots['exitDecision']): Partial<SignalPositionLedgerActiveRow> {
    if (!exitDecision) {
      return {
        closePriceStatus: 'UNAVAILABLE',
        exitRuleIds: [],
        invalidationRuleIds: [],
      };
    }
    const exitRuleIds = exitDecision.exitRulesTriggered || [];
    const invalidationRuleIds = exitDecision.invalidationRulesTriggered || [];
    return {
      exitStrategyId: exitDecision.strategy || null,
      exitStrategyVersion: exitDecision.strategyVersion || null,
      exitSourceDecisionId: exitDecision.id || null,
      exitRuleId: exitRuleIds[0] ?? null,
      exitRuleIds,
      exitDecision: exitDecision.decision,
      closePriceStatus: 'UNAVAILABLE',
      invalidationSourceDecisionId: invalidationRuleIds.length > 0 ? exitDecision.id ?? null : null,
      invalidationRuleIds,
      invalidationTimestamp: invalidationRuleIds.length > 0 ? exitDecision.generatedAt : null,
    };
  }

  private displayWarnings(
    primaryStrategy: NonNullable<SignalResultDto['strategyMatches']>[number] | null,
    quality: SignalPositionDataQualitySnapshot | null,
    currentReturnStatus: SignalPositionLedgerActiveRow['currentReturnStatus'],
  ): string[] {
    const warnings: string[] = [];
    if (!primaryStrategy?.ratingGrade || !primaryStrategy?.readinessLabel) {
      warnings.push('Forward-validation evidence is unavailable.');
    }
    if (!quality || quality.signalReadinessStatus !== 'READY') {
      warnings.push('Current data-quality readiness is not READY.');
    }
    if (currentReturnStatus === 'STALE') warnings.push('Latest price is stale; raw price move is hidden.');
    if (currentReturnStatus === 'UNAVAILABLE') warnings.push('Latest price is unavailable; raw price move is hidden.');
    return warnings;
  }

  private async loadRowSnapshots(
    candidates: SignalPositionLedgerActiveCandidate[],
    scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
  ): Promise<Map<string, SignalPositionLedgerRowSnapshots>> {
    const instrumentIds = candidates.map((candidate) => candidate.signal.instrument_id);
    const repositoryWithBatch = this.repository as SignalPositionLedgerRepository & {
      latestSnapshotsByInstrumentIds?: (
        instrumentIds: string[],
        scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
      ) => Promise<Map<string, SignalPositionLedgerRowSnapshots>>;
    };
    if (typeof repositoryWithBatch.latestSnapshotsByInstrumentIds === 'function') {
      return repositoryWithBatch.latestSnapshotsByInstrumentIds(instrumentIds, scope);
    }

    const snapshots = new Map<string, SignalPositionLedgerRowSnapshots>();
    await Promise.all(candidates.map(async (candidate) => {
      const [latestPrice, quality, exitDecision] = await Promise.all([
        this.repository.latestPriceByInstrumentId(candidate.signal.instrument_id, scope),
        this.repository.latestDataQualityByInstrumentId(candidate.signal.instrument_id),
        this.repository.latestExitDecisionByInstrumentId(candidate.signal.instrument_id),
      ]);
      snapshots.set(candidate.signal.instrument_id, { latestPrice, quality, exitDecision });
    }));
    return snapshots;
  }

  private emptySnapshots(): SignalPositionLedgerRowSnapshots {
    return {
      latestPrice: null,
      quality: null,
      exitDecision: null,
    };
  }

  private ensureRefreshStarted(query: SignalPositionLedgerActiveQuery, force: boolean): LedgerRefreshState {
    const scopeKey = this.scopeKey(query);
    const existing = this.refreshStates.get(scopeKey);
    if (existing?.status === 'RUNNING') return existing;
    if (!force && existing && !this.isRefreshStale(existing)) return existing;

    const now = new Date().toISOString();
    const state: LedgerRefreshState = {
      scopeKey,
      region: query.region,
      assetType: query.assetType,
      runId: `signal-position-ledger-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'RUNNING',
      rows: new Map(),
      closedRows: new Map(),
      totalCount: 0,
      processedCount: 0,
      succeededCount: 0,
      failedCount: 0,
      skippedCount: 0,
      startedAt: now,
      completedAt: null,
      updatedAt: now,
      warnings: [],
      errors: [],
      promise: null,
    };
    state.promise = this.runIncrementalRefresh(state, { ...query, offset: 0 });
    this.refreshStates.set(scopeKey, state);
    void this.persistRefreshState(state);
    return state;
  }

  private async runIncrementalRefresh(state: LedgerRefreshState, query: SignalPositionLedgerActiveQuery): Promise<void> {
    let sourceOffset = 0;
    let hasMore = true;
    const touchedInstruments = new Set<string>();
    // Fresh benchmark series per run so alpha never uses stale prices.
    this.benchmarkSeriesByScope.clear();
    try {
      await this.loadExistingLedgerState(state, query);
      while (hasMore && state.status === 'RUNNING') {
        const page = await this.repository.listLatestSignals({
          region: query.region,
          assetType: query.assetType,
          limit: SOURCE_PAGE_LIMIT,
          offset: sourceOffset,
        });

        state.totalCount = Math.max(state.totalCount, page.totalCount, page.offset + page.items.length);
        state.processedCount += page.items.length;

        // PATH A — strategy-framework enrichment (expensive, pre-filtered set only).
        const trusted = page.items.filter((signal) => this.isTrustedSourceSignal(signal));
        state.skippedCount += page.items.length - trusted.length;
        const enriched = trusted.length > 0
          ? await this.signalService.enrichSignals(trusted, { includeStrategyMatches: true })
          : [];

        const candidates: SignalPositionLedgerActiveCandidate[] = [];

        for (const signal of enriched) {
          if (!this.isTrustedEnrichedSignal(signal)) {
            state.skippedCount += 1;
            continue;
          }
          const trigger = signal.triggerContract as SignalPositionTriggerContractReadModel | undefined;
          if (!trigger) {
            state.skippedCount += 1;
            continue;
          }
          if (!this.isEligibleActiveTrigger(trigger)) {
            state.skippedCount += 1;
            continue;
          }
          candidates.push({ signal, triggerContract: trigger });
        }

        // PATH B — lifecycle-entry path (persisted-price trigger, no live strategy eval).
        // Only exclude instruments PATH A actually PUBLISHED, not the full enriched set.
        const pathAPublishedIds = new Set(candidates.map((c) => c.signal.instrument_id));
        const ledgerInstruments = new Set([
          ...[...state.rows.values()].map((r) => r.instrumentId),
          ...[...state.closedRows.values()].map((r) => r.instrumentId),
        ]);
        const lifecycleEntryCandidates = page.items.filter(
          (signal) => (signal.lifecycleState === 'ENTRY' || signal.lifecycleState === 'ACTIVE')
            && signal.direction === 'BULLISH'
            && signal.auditStatus === 'CURRENT'
            && (signal.dataQualityEligibility?.eligible === true)
            && this.isHighConfidenceEntry(signal)
            && !pathAPublishedIds.has(signal.instrument_id)
            && !ledgerInstruments.has(signal.instrument_id),
        );
        const lifecycleTriggerContracts = await this.buildLifecycleTriggerContracts(lifecycleEntryCandidates, query);

        // Collect PATH B candidates.
        for (const signal of lifecycleEntryCandidates) {
          const trigger = lifecycleTriggerContracts.get(signal.instrument_id);
          if (!trigger) {
            state.skippedCount += 1;
            continue;
          }
          if (!this.isEligibleActiveTrigger(trigger)) {
            state.skippedCount += 1;
            continue;
          }
          candidates.push({ signal, triggerContract: trigger });
        }

        const snapshots = await this.loadRowSnapshots(candidates, query);
        // Intake guard (Gap E): the born-dead set — candidates whose entry candle
        // already carries coincident EXIT_CANDIDATE/invalidation evidence. Such a NEW
        // entry must not be opened (entry-time adverse selection). Existing positions
        // are unaffected — they resolve via the normal lifecycle.
        const coincidentGuardSet = await this.coincidentIntakeGuard(candidates);
        for (const candidate of candidates) {
          const rowSnapshots = snapshots.get(candidate.signal.instrument_id) ?? this.emptySnapshots();
          const row = this.toActiveRow(candidate, rowSnapshots);
          touchedInstruments.add(row.instrumentId);
          const existingActive = this.activeRowForStock(state, row) ?? this.activeRowForInstrument(state, row.instrumentId);
          // Only guards brand-new entries; updates to an existing position pass through.
          if (!existingActive && coincidentGuardSet.has(row.instrumentId)) {
            state.skippedCount += 1;
            continue;
          }
          if (existingActive && existingActive.ledgerKey !== row.ledgerKey) {
            const lifecycleRow = await this.lifecycleRow(existingActive, rowSnapshots, query);
            const refreshed = lifecycleRow ?? this.withCurrentEvidence(existingActive, rowSnapshots);
            if (refreshed.status === 'CLOSED' || refreshed.status === 'INVALIDATED') {
              await this.persistTerminalRow(refreshed);
              state.rows.delete(refreshed.ledgerKey);
              if (refreshed.status === 'CLOSED') state.closedRows.set(refreshed.ledgerKey, refreshed);
              state.succeededCount += 1;
              continue;
            }
            await this.persistActiveRow(refreshed);
            state.rows.set(refreshed.ledgerKey, refreshed);
            state.skippedCount += 1;
            continue;
          }
          const lifecycleRow = await this.lifecycleRow(existingActive ?? row, rowSnapshots, query);
          if (lifecycleRow) {
            if (!existingActive && (lifecycleRow.status === 'CLOSED' || lifecycleRow.status === 'INVALIDATED' || lifecycleRow.status === 'EXIT_TRIGGERED')) {
              state.skippedCount += 1;
              continue;
            }
            if (lifecycleRow.status === 'CLOSED' || lifecycleRow.status === 'INVALIDATED') {
              await this.persistTerminalRow(lifecycleRow);
              state.rows.delete(lifecycleRow.ledgerKey);
              if (lifecycleRow.status === 'CLOSED') state.closedRows.set(lifecycleRow.ledgerKey, lifecycleRow);
              state.succeededCount += 1;
              continue;
            }
            state.rows.set(this.rowKey(lifecycleRow), lifecycleRow);
            await this.persistActiveRow(lifecycleRow);
            state.succeededCount += 1;
            continue;
          }
          if (!this.isPublishableActiveCandidate(row)) {
            state.skippedCount += 1;
            continue;
          }
          state.rows.set(this.rowKey(row), row);
          await this.persistActiveRow(row);
          state.succeededCount += 1;
        }

        hasMore = page.hasMore;
        sourceOffset = page.nextOffset ?? (sourceOffset + page.items.length);
        state.updatedAt = new Date().toISOString();
        await this.persistRefreshState(state);
        if (page.items.length === 0) break;
      }
      await this.refreshUntouchedActiveRows(state, query, touchedInstruments);
      await this.resolveExitTriggeredRows(state, query);
      if (state.totalCount < state.processedCount) state.totalCount = state.processedCount;
      state.status = 'COMPLETED';
      state.completedAt = new Date().toISOString();
      state.updatedAt = state.completedAt;
      if (state.processedCount > 0 && state.rows.size === 0) {
        state.warnings.push('No active rows satisfied source-proven entry trigger evidence in the selected scope.');
      }
      await this.persistRefreshState(state);
    } catch (error) {
      state.status = 'FAILED';
      state.failedCount += 1;
      state.completedAt = new Date().toISOString();
      state.updatedAt = state.completedAt;
      state.errors.push(error instanceof Error ? error.message : 'Signal position ledger refresh failed.');
      await this.persistRefreshState(state).catch(() => undefined);
    }
  }

  private toRefreshProgress(state: LedgerRefreshState | null | undefined): SignalPositionLedgerRefreshProgress {
    if (!state) {
      return {
        runId: null,
        status: 'IDLE',
        totalCount: 0,
        processedCount: 0,
        succeededCount: 0,
        failedCount: 0,
        skippedCount: 0,
        materializedRowCount: 0,
        startedAt: null,
        completedAt: null,
        updatedAt: null,
        warnings: [],
        errors: [],
      };
    }

    return {
      runId: state.runId,
      status: state.status,
      totalCount: state.totalCount,
      processedCount: state.processedCount,
      succeededCount: state.succeededCount,
      failedCount: state.failedCount,
      skippedCount: state.skippedCount,
      materializedRowCount: state.rows.size,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      updatedAt: state.updatedAt,
      warnings: state.warnings,
      errors: state.errors,
    };
  }

  private activeWarnings(state: LedgerRefreshState | undefined, persisted: SignalPositionLedgerRefreshProgress | null): string[] {
    const warnings = [...(state?.warnings ?? persisted?.warnings ?? [])];
    if (state?.status === 'RUNNING') {
      warnings.push(`Signal Position Ledger refresh is running; ${state.rows.size} materialized rows are currently available.`);
    }
    if (!state && !persisted) {
      warnings.push('No Signal Position Ledger pipeline snapshot is available yet. Start a ledger refresh or wait for the automated pipeline.');
    }
    return warnings;
  }

  private isRefreshStale(state: LedgerRefreshState): boolean {
    if (state.status === 'RUNNING') return false;
    const updatedAt = Date.parse(state.updatedAt);
    if (!Number.isFinite(updatedAt)) return true;
    return Date.now() - updatedAt > REFRESH_STALE_MS;
  }

  private scopeKey(query: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>): string {
    return `${query.region.trim().toUpperCase()}:${query.assetType.trim().toUpperCase()}`;
  }

  private rowKey(row: SignalPositionLedgerActiveRow): string {
    return row.ledgerKey || row.signalId || `${row.instrumentId}:${row.entryTriggerTimestamp}:${row.triggerType}`;
  }

  private lifecycleKey(input: { region: string; assetType: string; instrumentId: string; entryTriggerTimestamp: string }): string {
    const date = new Date(input.entryTriggerTimestamp);
    const timestamp = Number.isFinite(date.getTime()) ? date.toISOString() : input.entryTriggerTimestamp;
    return [
      input.region.trim().toUpperCase(),
      input.assetType.trim().toUpperCase(),
      input.instrumentId,
      'bullish_entry_trigger',
      timestamp,
    ].join(':');
  }

  private activeRowForInstrument(state: LedgerRefreshState, instrumentId: string): SignalPositionLedgerActiveRow | null {
    return [...state.rows.values()].find((row) => row.instrumentId === instrumentId && this.isActiveLikeStatus(row.status)) ?? null;
  }

  private activeRowForStock(state: LedgerRefreshState, row: SignalPositionLedgerActiveRow): SignalPositionLedgerActiveRow | null {
    const key = this.stockKey(row.symbol);
    return [...state.rows.values()].find((existing) => this.isActiveLikeStatus(existing.status) && this.stockKey(existing.symbol) === key) ?? null;
  }

  private stockKey(symbol: string): string {
    return String(symbol || '').trim().replace(/\.(NS|BO)$/i, '').toUpperCase();
  }

  private async loadMaterializedSnapshot(
    query: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
  ) {
    const repositoryWithCache = this.repository as SignalPositionLedgerRepository & {
      loadLatestMaterializedSnapshot?: (
        query: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
      ) => Promise<{ rows: SignalPositionLedgerActiveRow[]; refresh: SignalPositionLedgerRefreshProgress } | null>;
    };
    if (typeof repositoryWithCache.loadLatestMaterializedSnapshot !== 'function') return null;
    return repositoryWithCache.loadLatestMaterializedSnapshot(query);
  }

  private async loadLedgerPage(query: SignalPositionLedgerActiveQuery, status: 'ACTIVE' | 'CLOSED') {
    const repositoryWithLedger = this.repository as SignalPositionLedgerRepository & {
      listLedgerRows?: (query: SignalPositionLedgerActiveQuery & { status: 'ACTIVE' | 'CLOSED' }) => Promise<{
        items: SignalPositionLedgerActiveRow[];
        totalCount: number;
        hasMore: boolean;
        nextOffset: number | null;
      }>;
    };
    if (typeof repositoryWithLedger.listLedgerRows !== 'function') return null;
    return repositoryWithLedger.listLedgerRows({ ...query, status });
  }

  private async loadExistingLedgerState(state: LedgerRefreshState, query: SignalPositionLedgerActiveQuery): Promise<void> {
    const repositoryWithLedger = this.repository as SignalPositionLedgerRepository & {
      listAllLedgerRows?: (
        scope: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
        status: 'ACTIVE' | 'CLOSED',
      ) => Promise<SignalPositionLedgerActiveRow[]>;
    };
    if (typeof repositoryWithLedger.listAllLedgerRows !== 'function') return;
    const [activeRows, closedRows] = await Promise.all([
      repositoryWithLedger.listAllLedgerRows(query, 'ACTIVE'),
      repositoryWithLedger.listAllLedgerRows(query, 'CLOSED'),
    ]);
    let seedActiveRows = activeRows;
    if (seedActiveRows.length === 0 && typeof (repositoryWithLedger as any).listLegacyMaterializedRows === 'function') {
      seedActiveRows = await (repositoryWithLedger as any).listLegacyMaterializedRows(query);
      for (const row of seedActiveRows) await this.persistActiveRow(row);
    }
    // Owner policy (2026-06-23): RISK_WARNING is a defunct resting status — nothing
    // rests there. Normalize any stale RISK_WARNING carried over from the prior policy
    // to ACTIVE once, at load, so no downstream branch (touched re-entry, untouched,
    // current-evidence carry-through) can persist a row still resting in it.
    for (const row of seedActiveRows) {
      if (row.status === 'RISK_WARNING') {
        row.status = 'ACTIVE';
        row.healthState = null;
        row.lifecycleEvidenceStatus = 'ACTIVE_ENTRY';
      }
    }
    const byStock = new Map<string, SignalPositionLedgerActiveRow>();
    for (const row of seedActiveRows) {
      const key = this.stockKey(row.symbol);
      const existing = byStock.get(key);
      if (!existing || Date.parse(row.entryTriggerTimestamp) < Date.parse(existing.entryTriggerTimestamp)) byStock.set(key, row);
    }
    state.rows = new Map([...byStock.values()].map((row) => [row.ledgerKey, row]));
    state.closedRows = new Map(closedRows.map((row) => [row.ledgerKey, row]));
  }

  private withCurrentEvidence(row: SignalPositionLedgerActiveRow, snapshots: SignalPositionLedgerRowSnapshots): SignalPositionLedgerActiveRow {
    const returnProjection = this.currentReturnProjection(row.entryTriggerPrice, snapshots.latestPrice, snapshots.quality);
    return {
      ...row,
      latestTrustedPriceDate: snapshots.latestPrice?.date || row.latestTrustedPriceDate,
      latestTrustedPrice: snapshots.latestPrice?.adjustedClose ?? snapshots.latestPrice?.close ?? row.latestTrustedPrice,
      currentReturnPercent: returnProjection.currentReturnPercent,
      currentReturnStatus: returnProjection.currentReturnStatus,
      currentDataQualityStatus: snapshots.quality?.signalReadinessStatus ?? row.currentDataQualityStatus,
      trustEvidenceStatus: returnProjection.trustEvidenceStatus,
      displayWarnings: this.displayWarnings(null, snapshots.quality, returnProjection.currentReturnStatus),
    };
  }

  /**
   * Owner policy (2026-06-23): historical close evidence is authoritative.
   * A position that EVER met a close criterion since entry is closed AS OF the
   * candle date the criterion was FIRST met — not the refresh-run date, and
   * regardless of whether the latest decision looks clean again ("anything
   * satisfying the exit criteria on a date should be closed"). A later
   * re-qualification opens a fresh entry trigger (new ledgerKey), so closing
   * here never forfeits a re-entry. Invalidation is classified ahead of exit
   * when it was met first. When no historical evidence is found we fall back to
   * the latest snapshot decision (and its date) so edge cases still resolve.
   *
   * `evidence` is the batched firstCloseEvidenceDates result for this row; when
   * omitted (few-row paths) it is resolved per-row.
   */
  private async lifecycleRow(
    row: SignalPositionLedgerActiveRow,
    snapshots: SignalPositionLedgerRowSnapshots,
    query: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
    evidence?: LifecycleCloseEvidence,
  ): Promise<SignalPositionLedgerActiveRow | null> {
    const ev = evidence ?? await this.firstCloseEvidence(row);
    const exitDecision = snapshots.exitDecision;

    // 1) Fixed-horizon lifecycle: close on the EARLIEST qualifying terminal event.
    //    Early defensive/invalidation evidence is strictly-after-entry
    //    (firstCloseEvidenceDates); the horizon is the deterministic entry + N-bar
    //    close. Tie priority INVALIDATED > DEFENSIVE_EXIT > HORIZON_REACHED, so a
    //    defensive/invalidation event coincident with the horizon date closes as the
    //    defensive event, not the horizon.
    const winner = this.earliestTerminal(ev);
    if (winner === 'INVALIDATED') return await this.invalidatedRow(row, snapshots, query, ev.invalidationDate!);
    if (winner === 'DEFENSIVE_EXIT') return await this.exitLifecycleRow(row, snapshots, query, ev.exitDate!);
    if (winner === 'HORIZON_REACHED') return await this.horizonRow(row, snapshots, query, ev.horizonDate!, ev.horizonPrice!);

    // 2) Fallback: no SQL evidence and the horizon has not elapsed — honor the latest
    //    snapshot decision, but only when it is STRICTLY AFTER entry so a same-candle
    //    or pre-entry decision can never backdate a zero-hold flat close. REDUCE_RISK
    //    never closes (fixed-horizon policy); only EXIT_CANDIDATE + invalidation do.
    if (!exitDecision) return null;
    const latestDate = exitDecision.generatedDate || exitDecision.generatedAt || new Date().toISOString();
    if (row.entryTriggerTimestamp && latestDate <= row.entryTriggerTimestamp) {
      return null;
    }
    if (this.hasInvalidationEvidence(exitDecision)) {
      return await this.invalidatedRow(row, snapshots, query, latestDate);
    }
    if (exitDecision.decision === 'EXIT_CANDIDATE') {
      return await this.exitLifecycleRow(row, snapshots, query, latestDate);
    }
    return null;
  }

  /**
   * The earliest qualifying terminal event among the three close reasons. Dates are
   * ISO strings (lexicographically ordered for identical format). Tie priority
   * INVALIDATED (0) > DEFENSIVE_EXIT (1) > HORIZON_REACHED (2). Returns null when no
   * terminal event has occurred (position stays ACTIVE).
   */
  private earliestTerminal(ev: LifecycleCloseEvidence): 'INVALIDATED' | 'DEFENSIVE_EXIT' | 'HORIZON_REACHED' | null {
    const cands: Array<{ kind: 'INVALIDATED' | 'DEFENSIVE_EXIT' | 'HORIZON_REACHED'; date: string; rank: number }> = [];
    if (ev.invalidationDate) cands.push({ kind: 'INVALIDATED', date: ev.invalidationDate, rank: 0 });
    if (ev.exitDate) cands.push({ kind: 'DEFENSIVE_EXIT', date: ev.exitDate, rank: 1 });
    if (ev.horizonDate && ev.horizonPrice) cands.push({ kind: 'HORIZON_REACHED', date: ev.horizonDate, rank: 2 });
    if (cands.length === 0) return null;
    cands.sort((a, b) => (a.date === b.date ? a.rank - b.rank : a.date < b.date ? -1 : 1));
    return cands[0].kind;
  }

  /**
   * Close-evidence for a single row: earliest strictly-after-entry defensive/invalidation
   * dates (firstCloseEvidenceDates) PLUS the deterministic entry + HORIZON_TRADING_DAYS
   * bar (horizonEvidenceForRow). Used by the few-row paths; the bulk path batches both.
   */
  private async firstCloseEvidence(row: SignalPositionLedgerActiveRow): Promise<LifecycleCloseEvidence> {
    const empty: LifecycleCloseEvidence = { exitDate: null, invalidationDate: null, horizonDate: null, horizonPrice: null };
    if (!row.entryTriggerTimestamp) return empty;
    const repo = this.repository as any;
    let base: { exitDate: string | null; invalidationDate: string | null } = { exitDate: null, invalidationDate: null };
    if (typeof repo.firstCloseEvidenceDates === 'function') {
      const map = await repo.firstCloseEvidenceDates([{ instrumentId: row.instrumentId, entryDate: row.entryTriggerTimestamp }]);
      base = map.get(row.instrumentId) ?? base;
    }
    const horizon = await this.horizonEvidenceForRow(row);
    return { ...base, ...horizon };
  }

  /** Deterministic horizon terminal for a single row (entry + HORIZON_TRADING_DAYS bar). */
  private async horizonEvidenceForRow(
    row: SignalPositionLedgerActiveRow,
  ): Promise<{ horizonDate: string | null; horizonPrice: SignalPositionLatestPriceSnapshot | null }> {
    const repo = this.repository as any;
    if (typeof repo.priceAtTradingDayOffsetBatch !== 'function' || !row.entryTriggerTimestamp) {
      return { horizonDate: null, horizonPrice: null };
    }
    const entryDate = new Date(row.entryTriggerTimestamp);
    if (!Number.isFinite(entryDate.getTime())) return { horizonDate: null, horizonPrice: null };
    const scope = { region: row.region ?? '', assetType: row.assetType ?? 'STOCK' };
    const map: Map<string, SignalPositionLatestPriceSnapshot> = await repo.priceAtTradingDayOffsetBatch(
      [{ instrumentId: row.instrumentId, entryDate }],
      HORIZON_TRADING_DAYS,
      scope,
    );
    const price = map.get(row.instrumentId) ?? null;
    return { horizonDate: price?.date ?? null, horizonPrice: price };
  }

  private async exitLifecycleRow(
    row: SignalPositionLedgerActiveRow,
    snapshots: SignalPositionLedgerRowSnapshots,
    query: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
    exitDate: string,
  ): Promise<SignalPositionLedgerActiveRow> {
    const exitDecision = snapshots.exitDecision;
    // exitDate is the candle date the exit criteria was first met (resolved by
    // lifecycleRow). The close price is resolved at/before that date.
    const exitPriceSnap = await this.exitPrice(row.instrumentId, exitDate, query);
    const closePrice = this.sourceProvenClosePrice(exitPriceSnap);
    const exitEvidence = this.exitEvidenceForDecision(exitDecision);
    const adjEntry = await adjustedEntryPrice(this.repository as any, row.instrumentId, row.entryTriggerTimestamp, row.entryTriggerPrice, query, closePrice);
    const { pct: finalReturn, status: retStatus } = adjustedReturn(adjEntry, closePrice, row.currentReturnPercent);
    const exitReason = exitDecision?.reasons?.length
      ? exitDecision.reasons.join(' ')
      : 'Exit trigger generated by strategy exit rules.';
    const baseRow = {
      ...this.withCurrentEvidence(row, snapshots),
      ...exitEvidence,
      healthState: 'EXIT_TRIGGERED' as const,
      lifecycleEvidenceStatus: 'EXIT_TRIGGERED' as const,
      exitTriggerTimestamp: exitDate,
      exitReasonSummary: exitReason,
      exitDecision: exitDecision?.decision ?? 'EXIT_CANDIDATE',
      closeReason: 'DEFENSIVE_EXIT' as const,
      horizonTradingDays: null,
    };
    if (!exitPriceSnap || closePrice === null) {
      return {
        ...baseRow,
        status: 'EXIT_TRIGGERED',
        exitTriggerPrice: null,
        closePriceStatus: 'UNAVAILABLE',
        closedAt: null,
      };
    }
    return {
      ...baseRow,
      status: 'CLOSED',
      lifecycleEvidenceStatus: 'CLOSED',
      currentReturnPercent: finalReturn,
      currentReturnStatus: retStatus,
      latestTrustedPriceDate: exitPriceSnap.date,
      latestTrustedPrice: closePrice,
      exitTriggerPrice: closePrice,
      closePriceStatus: 'SOURCE_PROVEN',
      closedAt: exitDate,
    };
  }

  /**
   * HORIZON_REACHED terminal: the position was held to entry + HORIZON_TRADING_DAYS
   * bars and closes at that bar's price (passed in directly from
   * priceAtTradingDayOffsetBatch — no at/before lookup). This is the dominant fix:
   * it lets winners run to a fixed evaluation horizon instead of exiting into the
   * first defensive flag. When the horizon bar is not source-proven the position
   * stays ACTIVE (honest — no fabricated close) and resolves on a later refresh.
   */
  private async horizonRow(
    row: SignalPositionLedgerActiveRow,
    snapshots: SignalPositionLedgerRowSnapshots,
    query: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
    horizonDate: string,
    horizonPrice: SignalPositionLatestPriceSnapshot,
  ): Promise<SignalPositionLedgerActiveRow> {
    const closePrice = this.sourceProvenClosePrice(horizonPrice);
    if (closePrice === null) {
      return {
        ...this.withCurrentEvidence(row, snapshots),
        status: 'ACTIVE',
        healthState: null,
        lifecycleEvidenceStatus: 'ACTIVE_ENTRY',
      };
    }
    const adjEntry = await adjustedEntryPrice(this.repository as any, row.instrumentId, row.entryTriggerTimestamp, row.entryTriggerPrice, query, closePrice);
    const { pct: finalReturn, status: retStatus } = adjustedReturn(adjEntry, closePrice, row.currentReturnPercent);
    return {
      ...this.withCurrentEvidence(row, snapshots),
      status: 'CLOSED',
      healthState: null,
      lifecycleEvidenceStatus: 'CLOSED',
      closeReason: 'HORIZON_REACHED',
      horizonTradingDays: HORIZON_TRADING_DAYS,
      currentReturnPercent: finalReturn,
      currentReturnStatus: retStatus,
      latestTrustedPriceDate: horizonPrice.date,
      latestTrustedPrice: closePrice,
      exitTriggerTimestamp: horizonDate,
      exitTriggerPrice: closePrice,
      closePriceStatus: 'SOURCE_PROVEN',
      exitDecision: 'HORIZON_REACHED',
      exitReasonSummary: `Position held to the ${HORIZON_TRADING_DAYS}-trading-day evaluation horizon.`,
      closedAt: horizonDate,
    };
  }

  private async invalidatedRow(row: SignalPositionLedgerActiveRow, snapshots: SignalPositionLedgerRowSnapshots, query: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>, exitDate: string): Promise<SignalPositionLedgerActiveRow> {
    const exitDecision = snapshots.exitDecision;
    // exitDate is the candle date invalidation was first met (resolved by
    // lifecycleRow); close price resolved at/before that date.
    const ep = await this.exitPrice(row.instrumentId, exitDate, query), cp = this.sourceProvenClosePrice(ep);
    const adjE = await adjustedEntryPrice(this.repository as any, row.instrumentId, row.entryTriggerTimestamp, row.entryTriggerPrice, query, cp);
    const ret = adjE !== null && adjE > 0 && cp !== null ? Number((((cp - adjE) / adjE) * 100).toFixed(4)) : adjE === null ? null : row.currentReturnPercent;
    return {
      ...this.withCurrentEvidence(row, snapshots), ...this.exitEvidenceForDecision(exitDecision),
      status: 'INVALIDATED', healthState: null, lifecycleEvidenceStatus: 'INVALIDATED', closeReason: 'INVALIDATED' as const, horizonTradingDays: null,
      closePriceStatus: cp !== null ? 'SOURCE_PROVEN' : 'UNAVAILABLE', exitTriggerPrice: cp, exitTriggerTimestamp: exitDate,
      currentReturnPercent: cp !== null ? ret : row.currentReturnPercent, currentReturnStatus: cp !== null && adjE !== null ? 'CURRENT' : adjE === null ? 'UNAVAILABLE' : row.currentReturnStatus,
      latestTrustedPriceDate: ep?.date ?? row.latestTrustedPriceDate, latestTrustedPrice: cp ?? row.latestTrustedPrice,
      invalidationSourceDecisionId: exitDecision?.id ?? null, invalidationRuleIds: exitDecision?.invalidationRulesTriggered ?? [],
      invalidationTimestamp: exitDate, closedAt: cp !== null ? exitDate : null,
    };
  }

  private async exitPrice(instrumentId: string, exitDate: string, query: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>): Promise<SignalPositionLatestPriceSnapshot | null> {
    const repo = this.repository as any;
    if (typeof repo.priceAtOrBeforeInstrumentId !== 'function') return null;
    const date = new Date(exitDate);
    if (!Number.isFinite(date.getTime())) return null;
    return await repo.priceAtOrBeforeInstrumentId(instrumentId, date, query) ?? null;
  }

  private sourceProvenClosePrice(price: SignalPositionLatestPriceSnapshot | null): number | null {
    if (!price) return null;
    const priceDate = Date.parse(price.date);
    if (!Number.isFinite(priceDate)) return null;
    if (price.dataStatus !== SOURCE_PROVEN_PRICE_STATUS) return null;
    if (!price.source) return null;
    const closePrice = price.adjustedClose || price.close;
    return Number.isFinite(closePrice) && closePrice > 0 ? closePrice : null;
  }

  private async refreshUntouchedActiveRows(
    state: LedgerRefreshState,
    query: SignalPositionLedgerActiveQuery,
    touchedInstruments: Set<string>,
  ): Promise<void> {
    const untouched = [...state.rows.values()].filter((row) => !touchedInstruments.has(row.instrumentId));
    if (untouched.length === 0) return;
    const snapshots = await this.loadRowSnapshots(untouched.map((row) => ({
      signal: { id: row.signalId || '', instrument_id: row.instrumentId, symbol: row.symbol, company_name: row.companyName } as any,
      triggerContract: {} as any,
    })), query);
    const adjMap = await adjustedEntryPricesBatch(this.repository as any, untouched.map((r) => ({ instrumentId: r.instrumentId, entryTimestamp: r.entryTriggerTimestamp, storedEntryPrice: r.entryTriggerPrice })), query);
    // Batch historical close evidence + deterministic horizon for all untouched rows
    // (the bulk close path). Both are merged into the LifecycleCloseEvidence passed to
    // lifecycleRow so the horizon terminal is evaluated alongside defensive/invalidation.
    const repo = this.repository as any;
    const evidenceMap: Map<string, { exitDate: string | null; invalidationDate: string | null }> =
      typeof repo.firstCloseEvidenceDates === 'function'
        ? await repo.firstCloseEvidenceDates(untouched.map((r) => ({ instrumentId: r.instrumentId, entryDate: r.entryTriggerTimestamp })))
        : new Map();
    const horizonEntries = untouched
      .map((r) => ({ instrumentId: r.instrumentId, entryDate: new Date(r.entryTriggerTimestamp) }))
      .filter((e) => Number.isFinite(e.entryDate.getTime()));
    const horizonMap: Map<string, SignalPositionLatestPriceSnapshot> =
      typeof repo.priceAtTradingDayOffsetBatch === 'function'
        ? await repo.priceAtTradingDayOffsetBatch(horizonEntries, HORIZON_TRADING_DAYS, query)
        : new Map();
    for (const row of untouched) {
      const rowSnapshots = snapshots.get(row.instrumentId) ?? this.emptySnapshots();
      const base = evidenceMap.get(row.instrumentId) ?? { exitDate: null, invalidationDate: null };
      const horizonPrice = horizonMap.get(row.instrumentId) ?? null;
      const evidence: LifecycleCloseEvidence = { ...base, horizonDate: horizonPrice?.date ?? null, horizonPrice };
      const lifecycleRow = await this.lifecycleRow(row, rowSnapshots, query, evidence);
      if (lifecycleRow?.status === 'CLOSED' || lifecycleRow?.status === 'INVALIDATED') {
        await this.persistTerminalRow(lifecycleRow);
        state.rows.delete(lifecycleRow.ledgerKey);
        if (lifecycleRow.status === 'CLOSED') state.closedRows.set(lifecycleRow.ledgerKey, lifecycleRow);
      } else if (lifecycleRow) {
        await this.persistActiveRow(lifecycleRow);
        state.rows.set(lifecycleRow.ledgerKey, lifecycleRow);
      } else {
        const adjE = adjMap.get(row.instrumentId), useRow = adjE != null && adjE !== row.entryTriggerPrice ? { ...row, entryTriggerPrice: adjE } : row;
        const refreshed = this.withCurrentEvidence(adjE === null ? row : useRow, rowSnapshots);
        if (adjE === null) { refreshed.currentReturnPercent = null; refreshed.currentReturnStatus = 'UNAVAILABLE'; }
        // Owner policy (2026-06-23): RISK_WARNING is a defunct resting status. A position
        // that lifecycleRow leaves open (no current exit/invalidation evidence) is a
        // continuing position and rests as ACTIVE. Any stale RISK_WARNING carried over
        // from the prior policy is normalized here so nothing rests in RISK_WARNING.
        // Data degradation stays visible via currentDataQualityStatus/currentReturnStatus.
        if (refreshed.status === 'RISK_WARNING') {
          refreshed.status = 'ACTIVE';
          refreshed.healthState = null;
          refreshed.lifecycleEvidenceStatus = 'ACTIVE_ENTRY';
        }
        await this.persistActiveRow(refreshed);
        state.rows.set(refreshed.ledgerKey, refreshed);
      }
    }
  }

  /**
   * Close-price evidence resolver — runs ONLY inside runIncrementalRefresh.
   * For each EXIT_TRIGGERED row, fetches the FIRST price tick on/after the exit
   * trigger date (next-bar fill). Advances to CLOSED with realizedReturn if a
   * source-proven tick exists; otherwise leaves EXIT_TRIGGERED (honest pending).
   * Batched to avoid per-row round-trips.
   */
  private async resolveExitTriggeredRows(
    state: LedgerRefreshState,
    query: Pick<SignalPositionLedgerActiveQuery, 'region' | 'assetType'>,
  ): Promise<void> {
    const exitTriggeredRows = [...state.rows.values()].filter((row) => row.status === 'EXIT_TRIGGERED');
    if (exitTriggeredRows.length === 0) return;

    const batchEntries = exitTriggeredRows.flatMap((row) => {
      const ts = row.exitTriggerTimestamp;
      if (!ts) return [];
      const exitDate = new Date(ts);
      if (!Number.isFinite(exitDate.getTime())) return [];
      return [{ instrumentId: row.instrumentId, exitDate }];
    });

    if (batchEntries.length === 0) return;

    const repo = this.repository as any;
    if (typeof repo.firstPriceAtOrAfterBatch !== 'function') return;
    const priceMap = await repo.firstPriceAtOrAfterBatch(batchEntries, query);
    const adjEntries = exitTriggeredRows.map((r) => ({ instrumentId: r.instrumentId, entryTimestamp: r.entryTriggerTimestamp, storedEntryPrice: r.entryTriggerPrice }));
    const adjMap = await adjustedEntryPricesBatch(repo, adjEntries, query);
    for (const row of exitTriggeredRows) {
      const closePriceSnapshot = priceMap.get(row.instrumentId) ?? null;
      const closePrice = this.sourceProvenClosePrice(closePriceSnapshot);
      if (closePrice === null) continue;
      const adjE = adjMap.has(row.instrumentId) ? adjMap.get(row.instrumentId)! : row.entryTriggerPrice;
      if (adjE === null) { this.repository.upsertActiveLedgerRow({ ...row, currentReturnPercent: null, currentReturnStatus: 'UNAVAILABLE' } as any); continue; }
      const { pct: realizedReturnPercent, status: retSt } = adjustedReturn(adjE, closePrice, null); const closedRow: SignalPositionLedgerActiveRow = {
        ...row,
        status: 'CLOSED',
        lifecycleEvidenceStatus: 'CLOSED',
        exitTriggerPrice: closePrice,
        closePriceStatus: 'SOURCE_PROVEN',
        latestTrustedPriceDate: closePriceSnapshot!.date,
        latestTrustedPrice: closePrice,
        currentReturnPercent: realizedReturnPercent,
        currentReturnStatus: retSt,
        // Close DATE must reflect the candle the exit criterion was met, never the
        // refresh-run date. (The fill price is the first source-proven tick on/after
        // that candle, since no at/before price existed — that is why this row was
        // EXIT_TRIGGERED — but the close date stays historical.)
        closedAt: row.exitTriggerTimestamp ?? closePriceSnapshot!.date,
      };

      await this.persistTerminalRow(closedRow);
      state.rows.delete(closedRow.ledgerKey);
      state.closedRows.set(closedRow.ledgerKey, closedRow);
      state.succeededCount += 1;
    }
  }

  private async persistActiveRow(row: SignalPositionLedgerActiveRow): Promise<void> {
    const repositoryWithLedger = this.repository as SignalPositionLedgerRepository & {
      upsertActiveLedgerRow?: (row: SignalPositionLedgerActiveRow) => Promise<void>;
    };
    if (typeof repositoryWithLedger.upsertActiveLedgerRow !== 'function') return;
    await repositoryWithLedger.upsertActiveLedgerRow(row);
  }

  private async persistTerminalRow(row: SignalPositionLedgerActiveRow): Promise<void> {
    const repositoryWithLedger = this.repository as SignalPositionLedgerRepository & {
      closeLedgerRow?: (row: SignalPositionLedgerActiveRow) => Promise<void>;
    };
    if (typeof repositoryWithLedger.closeLedgerRow !== 'function') return;
    await repositoryWithLedger.closeLedgerRow(await this.enrichTerminalRow(row));
  }

  /**
   * Stamp a terminal (CLOSED/INVALIDATED) row with its closeReason (defaulted from
   * status when a builder didn't set it) and region-benchmark return + alpha over the
   * position's own holding window (entry → close candle). Centralized here so every
   * close path — horizon, defensive, invalidation, EXIT_TRIGGERED→CLOSED fill — gets
   * benchmark/alpha consistently. Alpha is null where the region has no benchmark series.
   */
  private async enrichTerminalRow(row: SignalPositionLedgerActiveRow): Promise<SignalPositionLedgerActiveRow> {
    if (row.status !== 'CLOSED' && row.status !== 'INVALIDATED') return row;
    const closeReason = row.closeReason ?? (row.status === 'INVALIDATED' ? 'INVALIDATED' : 'DEFENSIVE_EXIT');
    const closeTs = row.closedAt ?? row.exitTriggerTimestamp ?? null;
    const { benchmarkReturnPercent, alphaPercent } = await this.benchmarkAndAlpha(
      row.region,
      row.assetType,
      row.entryTriggerTimestamp,
      closeTs,
      row.currentReturnPercent,
    );
    return { ...row, closeReason, benchmarkReturnPercent, alphaPercent };
  }

  /** Region-benchmark series (adjustedClose by epoch, ascending), cached per run/scope. */
  private async getBenchmarkSeries(region: string, assetType: string): Promise<Array<{ date: number; adjustedClose: number }>> {
    const key = `${region || ''}:${assetType || 'STOCK'}`;
    const cached = this.benchmarkSeriesByScope.get(key);
    if (cached) return cached;
    const repo = this.repository as any;
    let raw: Array<{ date: string; adjustedClose: number }> = [];
    if (typeof repo.listBenchmarkSeries === 'function') {
      raw = await repo.listBenchmarkSeries(region, assetType, BENCHMARK_SERIES_EARLIEST).catch(() => []);
    }
    const series = raw
      .map((p) => ({ date: Date.parse(p.date), adjustedClose: Number(p.adjustedClose) }))
      .filter((p) => Number.isFinite(p.date) && Number.isFinite(p.adjustedClose) && p.adjustedClose > 0)
      .sort((a, b) => a.date - b.date);
    this.benchmarkSeriesByScope.set(key, series);
    return series;
  }

  /** Last benchmark adjustedClose at or before epoch `t` (binary search). */
  private benchmarkAtOrBefore(series: Array<{ date: number; adjustedClose: number }>, t: number): number | null {
    let lo = 0, hi = series.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (series[mid].date <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans >= 0 ? series[ans].adjustedClose : null;
  }

  private async benchmarkAndAlpha(
    region: string | null,
    assetType: string | null,
    entryTs: string | null,
    closeTs: string | null,
    positionReturnPercent: number | null,
  ): Promise<{ benchmarkReturnPercent: number | null; alphaPercent: number | null }> {
    const none = { benchmarkReturnPercent: null, alphaPercent: null };
    if (!entryTs || !closeTs) return none;
    const e = Date.parse(entryTs), c = Date.parse(closeTs);
    if (!Number.isFinite(e) || !Number.isFinite(c)) return none;
    const series = await this.getBenchmarkSeries(region ?? '', assetType ?? 'STOCK');
    if (series.length === 0) return none;
    const be = this.benchmarkAtOrBefore(series, e);
    const bc = this.benchmarkAtOrBefore(series, c);
    if (be === null || bc === null || be <= 0) return none;
    const benchmarkReturnPercent = Number((((bc - be) / be) * 100).toFixed(4));
    const alphaPercent = positionReturnPercent === null ? null : Number((positionReturnPercent - benchmarkReturnPercent).toFixed(4));
    return { benchmarkReturnPercent, alphaPercent };
  }

  private shouldRefreshSnapshot(snapshot: SignalPositionLedgerMaterializedSnapshot | null): boolean {
    if (!snapshot) return true;
    if (snapshot.rows.length > 0) return false;
    if (snapshot.refresh.status === 'RUNNING') return false;
    if ((snapshot.refresh.processedCount || 0) === 0) return false;
    const updatedAt = Date.parse(snapshot.refresh.updatedAt || '');
    if (!Number.isFinite(updatedAt)) return true;
    return Date.now() - updatedAt > REFRESH_STALE_MS;
  }

  private async persistRefreshState(state: LedgerRefreshState): Promise<void> {
    const repositoryWithCache = this.repository as SignalPositionLedgerRepository & {
      saveMaterializedSnapshot?: (input: {
        region: string;
        assetType: string;
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
      }) => Promise<void>;
    };
    if (typeof repositoryWithCache.saveMaterializedSnapshot !== 'function') return;
    await repositoryWithCache.saveMaterializedSnapshot({
      region: state.region,
      assetType: state.assetType,
      runId: state.runId,
      status: state.status,
      rows: [...state.rows.values()],
      totalCount: state.totalCount,
      processedCount: state.processedCount,
      succeededCount: state.succeededCount,
      failedCount: state.failedCount,
      skippedCount: state.skippedCount,
      startedAt: new Date(state.startedAt),
      completedAt: state.completedAt ? new Date(state.completedAt) : null,
      warnings: state.warnings,
      errors: state.errors,
    });
  }
}

