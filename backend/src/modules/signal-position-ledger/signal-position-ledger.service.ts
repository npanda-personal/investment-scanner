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
  SignalPositionTriggerContractReadModel,
} from './signal-position-ledger.types';
import { SignalPositionLedgerRepository } from './signal-position-ledger.repository';

const SOURCE_PAGE_LIMIT = 100;
const PRICE_STALE_DAYS = 5;
const REFRESH_STALE_MS = 15 * 60 * 1000;

type LedgerRefreshState = {
  scopeKey: string;
  region: string;
  assetType: string;
  runId: string;
  status: SignalPositionLedgerRefreshStatus;
  rows: Map<string, SignalPositionLedgerActiveRow>;
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

  constructor(
    private readonly repository = new SignalPositionLedgerRepository(),
    private readonly signalService = new SignalGenerationEngineService(),
  ) {}

  async listActiveRows(query: SignalPositionLedgerActiveQuery): Promise<SignalPositionLedgerActiveListResponse> {
    let state = this.refreshStates.get(this.scopeKey(query));
    const snapshot = state ? null : await this.loadMaterializedSnapshot(query);
    if (!state && this.shouldRefreshEmptySnapshot(snapshot)) {
      state = this.ensureRefreshStarted(query, false);
    }
    const refresh = state ? this.toRefreshProgress(state) : snapshot?.refresh ?? this.toRefreshProgress(null);
    const orderedRows = this.orderActiveRows(state ? [...state.rows.values()] : snapshot?.rows ?? []);
    const totalCount = orderedRows.length;
    const items = orderedRows.slice(query.offset, query.offset + query.limit);

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

  private orderActiveRows(rows: SignalPositionLedgerActiveRow[]): SignalPositionLedgerActiveRow[] {
    return [...rows].sort((left, right) => {
      const rightTime = Date.parse(right.entryTriggerTimestamp || '');
      const leftTime = Date.parse(left.entryTriggerTimestamp || '');
      const timeDelta = (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
      if (timeDelta !== 0) return timeDelta;

      const symbolDelta = left.symbol.localeCompare(right.symbol);
      if (symbolDelta !== 0) return symbolDelta;

      return left.instrumentId.localeCompare(right.instrumentId);
    });
  }

  private toActiveRow(candidate: SignalPositionLedgerActiveCandidate, snapshots: SignalPositionLedgerRowSnapshots): SignalPositionLedgerActiveRow {
    const { signal, triggerContract } = candidate;
    const { latestPrice, quality, exitDecision } = snapshots;
    const primaryStrategy = signal.strategyMatches?.[0] ?? null;

    const returnProjection = this.currentReturnProjection(triggerContract.trigger_price as number, latestPrice, quality);
    const healthState = this.healthStateForDecision(exitDecision?.decision);

    return {
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
      lifecycleEvidenceStatus: healthState ? 'EXIT_COMPATIBILITY_ONLY' : 'UNAVAILABLE',
      trustEvidenceStatus: returnProjection.trustEvidenceStatus,
      calibrationEvidenceStatus: primaryStrategy?.readinessLabel || primaryStrategy?.ratingGrade ? 'AVAILABLE' : 'UNAVAILABLE',
      displayWarnings: this.displayWarnings(primaryStrategy, quality, returnProjection.currentReturnStatus),
    };
  }

  private isTrustedSourceSignal(signal: SignalResultDto): boolean {
    const quality = signal.dataQualityEligibility;
    const hasNoiseBlocker = (signal.blockedStrategies || []).some((item) => (item.noiseFiltersTriggered || []).length > 0);
    return signal.auditStatus === 'CURRENT'
      && signal.direction === 'BULLISH'
      && quality?.filterApplied === true
      && quality.eligible === true
      && quality.signalReadinessStatus === 'READY'
      && !hasNoiseBlocker;
  }

  private isTrustedEnrichedSignal(signal: SignalResultDto): boolean {
    const primaryStrategy = signal.strategyMatches?.[0] ?? null;
    const hasNoiseBlocker = (signal.blockedStrategies || []).some((item) => (item.noiseFiltersTriggered || []).length > 0);
    const activeReviewDecision = primaryStrategy?.decision === 'ENTRY_CANDIDATE'
      || primaryStrategy?.decision === 'WATCH';
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
    if (!trigger.strategy_id || !trigger.strategy_version || !trigger.entry_rule_id) return false;
    return true;
  }

  private isPublishableActiveCandidate(row: SignalPositionLedgerActiveRow): boolean {
    if (row.triggerType !== 'bullish_entry_trigger') return false;
    if (row.strategyDecision !== 'ENTRY_CANDIDATE' && row.strategyDecision !== 'WATCH') return false;
    if (row.currentDataQualityStatus !== 'READY') return false;
    if (row.currentReturnStatus !== 'CURRENT') return false;
    if (row.healthState === 'EXIT_TRIGGERED' || row.healthState === 'RISK_WARNING') return false;
    return true;
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

  private healthStateForDecision(decision?: string | null): SignalPositionLedgerActiveRow['healthState'] {
    if (decision === 'EXIT_CANDIDATE') return 'EXIT_TRIGGERED';
    if (decision === 'REDUCE_RISK') return 'RISK_WARNING';
    return null;
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
    try {
      while (hasMore && state.status === 'RUNNING') {
        const page = await this.repository.listLatestSignals({
          region: query.region,
          assetType: query.assetType,
          limit: SOURCE_PAGE_LIMIT,
          offset: sourceOffset,
        });

        state.totalCount = Math.max(state.totalCount, page.totalCount, page.offset + page.items.length);
        state.processedCount += page.items.length;

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

        const snapshots = await this.loadRowSnapshots(candidates, query);
        for (const candidate of candidates) {
          const row = this.toActiveRow(candidate, snapshots.get(candidate.signal.instrument_id) ?? this.emptySnapshots());
          if (!this.isPublishableActiveCandidate(row)) {
            state.skippedCount += 1;
            continue;
          }
          state.rows.set(this.rowKey(row), row);
          state.succeededCount += 1;
        }

        hasMore = page.hasMore;
        sourceOffset = page.nextOffset ?? (sourceOffset + page.items.length);
        state.updatedAt = new Date().toISOString();
        await this.persistRefreshState(state);
        if (page.items.length === 0) break;
      }
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
    return row.signalId || `${row.instrumentId}:${row.entryTriggerTimestamp}:${row.triggerType}`;
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

  private shouldRefreshEmptySnapshot(snapshot: SignalPositionLedgerMaterializedSnapshot | null): boolean {
    if (!snapshot) return false;
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

