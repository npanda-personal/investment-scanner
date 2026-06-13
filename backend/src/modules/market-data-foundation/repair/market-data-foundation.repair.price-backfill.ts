// Auto-extracted repair sibling (Phase 5c). Bodies are byte-identical to the pre-extraction inline
// implementation in market-data-foundation.service.ts, except that stays-on-service / cross-engine
// collaborators are reached through the host (this.X -> this.host.X) and pure util/mapper helpers
// are imported directly. The service constructs this once and keeps byte-identical public delegators
// for the controller-facing repair surface.

import type { MarketDataRepairHost } from './market-data-foundation.repair-host';
import type {
  InstrumentUniverseReadiness,
  MarketDataRepairRequest,
  MarketDataRepairSummary,
  PriceBackfillRunRequest,
  StockSyncTask,
} from '../market-data-foundation.types';
import type {
  PriceBackfillCandidate,
} from './market-data-foundation.repair.types';
import type { UniverseComputationSnapshot } from '../quality/market-data-foundation.universe-readiness.types';
import {
  endOfTradingDateUtc as endOfTradingDateUtcUtil,
} from '../util/market-data-foundation.util.dates';
import {
  eachWithConcurrency as eachWithConcurrencyUtil,
} from '../util/market-data-foundation.util.concurrency';
import { normalizeProviderStatus } from '../ingestion/market-data-foundation.universe';
import { latestCompletedTradingDateForRegion } from '../ingestion/market-data-foundation.market-session';
import {
  priceBackfillCandidateTask as priceBackfillCandidateTaskFn,
  filterPriceBackfillCandidatesForPolicy as filterPriceBackfillCandidatesForPolicyFn,
  assignPriceBackfillDepthDiagnostics as assignPriceBackfillDepthDiagnosticsFn,
  addPriceBackfillCoverageSample as addPriceBackfillCoverageSampleFn,
  priceBackfillCandidatePriority as priceBackfillCandidatePriorityFn,
  priceBackfillFetchPlan as priceBackfillFetchPlanFn,
} from './market-data-foundation.repair.price-backfill.candidates';

export class RepairPriceBackfillService {
  constructor(private readonly host: MarketDataRepairHost) {}

  public async backfillPrices(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    const started = Date.now();
    const scope = this.host.repairScope(request);
    const batch = this.host.mutatingRepairBatch(request);
    const workerConcurrency = this.host.priceBackfillConcurrency(request);
    const providerThrottleMs = this.host.priceBackfillProviderThrottleMs();
    const excludeStockIds = new Set((request.excludeStockIds || []).filter(Boolean));
    const includeRetryableBlocked = request.force === true || request.fullReload === true;
    const latestCompletedDate = latestCompletedTradingDateForRegion(scope.region);
    const candidates = this.filterPriceBackfillCandidatesForPolicy(
      await this.priceBackfillCandidates(scope, excludeStockIds, { includeRetryableBlocked }),
      request.policy,
      latestCompletedDate
    );
    const page = candidates.slice(0, batch.batchSize);
    const summary = this.host.emptyRepairSummary(scope, batch, candidates.length, true);
    summary.workerConcurrency = workerConcurrency;
    summary.providerThrottleMs = providerThrottleMs;
    summary.priceRowsReceived = 0;
    summary.priceRowsInserted = 0;
    summary.priceRowsUpdated = 0;
    summary.priceRowsNoOp = 0;
    summary.officialEodBulk = null;
    summary.zeroRowProviderReturns = 0;
    summary.deepReloaded = 0;
    summary.incrementalCaughtUp = 0;
    summary.historyCoverageFallbackRequired = 0;
    summary.sampleCoverageResults = [];
    summary.processedStockIds = [];
    summary.latestCompletedEodDate = latestCompletedDate;

    if (!latestCompletedDate) {
      summary.remainingCandidates = candidates.length;
      this.assignPriceBackfillDepthDiagnostics(summary, candidates);
      summary.warnings.push(`MARKET_CALENDAR_UNCERTAIN: latest completed EOD is unavailable for ${scope.region}.`);
      this.host.finishRepairSummary(summary, started);
      return summary;
    }

    const safeEndDate = endOfTradingDateUtcUtil(latestCompletedDate);
    summary.targetEndDate = safeEndDate.toISOString();
    const providerPage = await this.applyOfficialEodBulkForIncrementalPriceBackfill({
      policy: request.policy,
      scope,
      targetTradingDate: latestCompletedDate,
      candidates,
      page,
      summary,
    });

    await eachWithConcurrencyUtil(providerPage, workerConcurrency, async (candidate) => {
      const { stock, mode, startDate } = this.priceBackfillFetchPlan(candidate, latestCompletedDate, request);
      summary.processedCount += 1;
      if (stock.id) summary.processedStockIds!.push(stock.id);
      if (mode === 'DEEP') summary.deepReloaded = (summary.deepReloaded || 0) + 1;
      else summary.incrementalCaughtUp = (summary.incrementalCaughtUp || 0) + 1;
      try {
        await this.host.throttleIngestion(providerThrottleMs);
        const result = await this.host.ingestSymbol(stock.symbol, startDate, safeEndDate, Boolean(request.fullReload), {
          force: request.force === true || request.fullReload === true,
          region: scope.region,
          assetType: scope.assetType,
          skipFreshnessGate: true,
          preserveProviderSupportOnZeroRows: true,
        });
        summary.priceRowsReceived = (summary.priceRowsReceived || 0) + result.rowsReceived;
        summary.priceRowsInserted = (summary.priceRowsInserted || 0) + result.rowsInserted;
        summary.priceRowsUpdated = (summary.priceRowsUpdated || 0) + result.rowsUpdated;
        summary.priceRowsNoOp = (summary.priceRowsNoOp || 0) + (result.rowsNoOp || 0);
        if (result.rowsReceived === 0 && !result.noNewData) {
          summary.zeroRowProviderReturns = (summary.zeroRowProviderReturns || 0) + 1;
          summary.historyCoverageFallbackRequired = (summary.historyCoverageFallbackRequired || 0) + 1;
          summary.skipped += 1;
          const manualRequiredReason = 'Yahoo returned zero usable price rows; approved free official/public exchange fallback is required before accepting missing history.';
          await this.host.recordPriceBackfillRepairAttempt(stock, scope, 'YAHOO_ZERO_ROWS', {
            rowsReceived: result.rowsReceived,
            rowsInserted: result.rowsInserted,
            rowsUpdated: result.rowsUpdated,
            rowsNoOp: result.rowsNoOp || 0,
          }, null, manualRequiredReason, 'MANUAL_REQUIRED');
          summary.warnings.push(`${stock.symbol}: provider returned zero usable price rows; approved free official/public exchange fallback is required before accepting missing history.`);
          this.addPriceBackfillCoverageSample(summary, candidate, 'YAHOO_ZERO_ROWS');
        } else if (result.rowsInserted > 0 || result.rowsUpdated > 0) {
          summary.updated += 1;
          this.addPriceBackfillCoverageSample(summary, candidate, null);
        } else if ((result.rowsNoOp || 0) > 0) {
          summary.noOp = (summary.noOp || 0) + 1;
          this.addPriceBackfillCoverageSample(summary, candidate, null);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'price backfill failed';
        if (this.host.isYahooRateLimitError(errorMessage)) {
          summary.failed += 1;
          summary.providerRetryableFailures = (summary.providerRetryableFailures || 0) + 1;
          await this.host.recordPriceBackfillRepairAttempt(stock, scope, 'YAHOO_RATE_LIMITED', {}, errorMessage, null, 'FAILED_RETRYABLE');
          summary.warnings.push(`${stock.symbol}: Yahoo rate limit hit; retry is cooling down before another provider call.`);
          this.addPriceBackfillCoverageSample(summary, candidate, 'YAHOO_RATE_LIMITED');
          return;
        }
        if (this.host.isAngelOneTokenNotFoundError(errorMessage)) {
          summary.manualRequired = (summary.manualRequired || 0) + 1;
          summary.historyCoverageFallbackRequired = (summary.historyCoverageFallbackRequired || 0) + 1;
          const manualRequiredReason = 'Angel One scrip master token was not found; catalog symbol lifecycle or broker-symbol mapping must be reviewed before retrying automatic backfill.';
          await this.host.recordPriceBackfillRepairAttempt(stock, scope, 'ANGEL_ONE_TOKEN_NOT_FOUND', {}, errorMessage, manualRequiredReason, 'MANUAL_REQUIRED');
          summary.warnings.push(`${stock.symbol}: ${manualRequiredReason}`);
          this.addPriceBackfillCoverageSample(summary, candidate, 'ANGEL_ONE_TOKEN_NOT_FOUND');
          return;
        }
        summary.failed += 1;
        summary.historyCoverageFallbackRequired = (summary.historyCoverageFallbackRequired || 0) + 1;
        await this.host.recordPriceBackfillRepairAttempt(stock, scope, 'YAHOO_PROVIDER_ERROR', {}, errorMessage, null, 'FAILED_RETRYABLE');
        summary.warnings.push(`${stock.symbol}: ${errorMessage}`);
        this.addPriceBackfillCoverageSample(summary, candidate, 'YAHOO_PROVIDER_ERROR');
      }
    });

    const attemptedStockIds = new Set([...excludeStockIds, ...(summary.processedStockIds || [])]);
    const remainingCandidates = this.filterPriceBackfillCandidatesForPolicy(
      await this.priceBackfillCandidates(scope, attemptedStockIds, { includeRetryableBlocked }),
      request.policy,
      latestCompletedDate
    );
    summary.remainingCandidates = remainingCandidates.length;
    summary.hasMore = remainingCandidates.length > 0;
    summary.nextOffset = summary.hasMore ? 0 : null;
    this.assignPriceBackfillDepthDiagnostics(summary, remainingCandidates);
    if (summary.processedCount > 0) {
      this.host.invalidateUniverseComputationSnapshot(scope);
    }
    this.host.finishRepairSummary(summary, started);
    return summary;
  }


  private async priceBackfillCandidates(
    scope: { region: string; assetType: string },
    excludeStockIds: Set<string> = new Set(),
    options: { includeRetryableBlocked?: boolean } = {}
  ): Promise<PriceBackfillCandidate[]> {
    const stocks = await this.host.repository.listStocksForUniverseHealth(scope);
    const { readinessBySymbol, statsBySymbol } = await this.host.universeReadinessAndStatsForStocks(stocks, scope);
    const validationWindow = this.host.providerValidationWindow(scope);
    const blockedStockIds = await this.blockedPriceBackfillStockIds(scope, options.includeRetryableBlocked === true);
    return stocks
      .flatMap((stock): PriceBackfillCandidate[] => {
        if (stock.isActive === false || stock.isDelisted === true) return [];
        if (stock.id && excludeStockIds.has(stock.id)) return [];
        if (normalizeProviderStatus(stock.providerSupportStatus) !== 'SUPPORTED') return [];
        if (blockedStockIds.has(stock.id)) return [];
        const readiness = readinessBySymbol.get(stock.symbol);
        if (!readiness) return [];
        const historyDiagnostics = this.host.requiredHistoryDiagnostics(stock, validationWindow, this.host.priceStatsForStock(statsBySymbol, stock));
        if (readiness.priceReadiness === 'READY' && historyDiagnostics.requiredHistoryComplete) return [];
        return [{ stock, readiness, historyDiagnostics }];
      })
      .sort((left, right) => {
        const leftPriority = this.priceBackfillCandidatePriority(left.readiness);
        const rightPriority = this.priceBackfillCandidatePriority(right.readiness);
        if (leftPriority !== rightPriority) return leftPriority - rightPriority;
        return String(left.stock.symbol).localeCompare(String(right.stock.symbol));
      });
  }


  public async countPriceBackfillRunCandidates(
    scope: { region: string; assetType: string },
    request: PriceBackfillRunRequest
  ): Promise<number> {
    if (request.policy === 'INCREMENTAL_LATEST_ONLY') {
      const latestCompletedDate = latestCompletedTradingDateForRegion(scope.region);
      const candidates = await this.priceBackfillCandidates(scope);
      return this.filterPriceBackfillCandidatesForPolicy(candidates, request.policy, latestCompletedDate).length;
    }

    const repairPlan = await this.host.repairPlan(scope);
    return repairPlan.supportedPriceBackfillNeeded ?? repairPlan.priceBackfillNeeded ?? 0;
  }


  private async applyOfficialEodBulkForIncrementalPriceBackfill(input: {
    policy: MarketDataRepairRequest['policy'];
    scope: { region: string; assetType: string };
    targetTradingDate: string;
    candidates: PriceBackfillCandidate[];
    page: PriceBackfillCandidate[];
    summary: MarketDataRepairSummary;
  }): Promise<PriceBackfillCandidate[]> {
    if (input.policy !== 'INCREMENTAL_LATEST_ONLY' || input.page.length === 0) return input.page;

    const officialCandidates = input.candidates.length > 0 ? input.candidates : input.page;
    const tasks = officialCandidates.map((candidate) => this.priceBackfillCandidateTask(candidate));
    const officialBulk = await this.host.tryOfficialNseEodBulkLatestCandle({
      region: input.scope.region,
      assetType: input.scope.assetType,
      targetTradingDate: input.targetTradingDate,
      tasks,
    });
    input.summary.officialEodBulk = officialBulk.evidence;
    if (officialBulk.evidence.sourceFingerprint) {
      input.summary.sourceFingerprint = officialBulk.evidence.sourceFingerprint;
    }
    for (const warning of officialBulk.evidence.warnings || []) {
      input.summary.warnings.push(warning);
    }
    if (officialBulk.evidence.fallbackReason && !['OFFICIAL_EOD_DISABLED', 'OFFICIAL_EOD_NO_TASKS'].includes(officialBulk.evidence.fallbackReason)) {
      input.summary.warnings.push(`Official NSE EOD bulk fallback: ${officialBulk.evidence.fallbackReason}`);
    }

    if (officialBulk.matchedTaskIds.size === 0) return input.page;

    const byId = new Map(officialCandidates.map((candidate) => [String(candidate.stock.id), candidate]));
    for (const taskId of officialBulk.matchedTaskIds) {
      const candidate = byId.get(taskId);
      const taskSummary = officialBulk.summaryByTaskId.get(taskId);
      if (!candidate || !taskSummary) continue;

      input.summary.processedCount += 1;
      input.summary.processedStockIds!.push(taskId);
      input.summary.priceRowsReceived = (input.summary.priceRowsReceived || 0) + (taskSummary.rowsReceived || 0);
      input.summary.priceRowsInserted = (input.summary.priceRowsInserted || 0) + (taskSummary.rowsInserted || 0);
      input.summary.priceRowsUpdated = (input.summary.priceRowsUpdated || 0) + (taskSummary.rowsUpdated || 0);
      input.summary.priceRowsNoOp = (input.summary.priceRowsNoOp || 0) + (taskSummary.rowsNoOp || 0);
      if ((taskSummary.rowsInserted || 0) > 0 || (taskSummary.rowsUpdated || 0) > 0) {
        input.summary.updated += 1;
      } else if ((taskSummary.rowsNoOp || 0) > 0) {
        input.summary.noOp = (input.summary.noOp || 0) + 1;
      } else {
        input.summary.skipped += 1;
      }
      if ((taskSummary.warningCount || 0) > 0) {
        input.summary.warnings.push(...(taskSummary.warnings || []));
      }
      this.addPriceBackfillCoverageSample(input.summary, candidate, null);
    }

    return input.page.filter((candidate) => !officialBulk.matchedTaskIds.has(String(candidate.stock.id)));
  }


  private priceBackfillCandidateTask(candidate: PriceBackfillCandidate): StockSyncTask {
    return priceBackfillCandidateTaskFn(candidate);
  }


  private filterPriceBackfillCandidatesForPolicy(
    candidates: PriceBackfillCandidate[],
    policy: MarketDataRepairRequest['policy'],
    latestCompletedDate: string | null
  ): PriceBackfillCandidate[] {
    return filterPriceBackfillCandidatesForPolicyFn(candidates, policy, latestCompletedDate);
  }


  public async repairStatesByStockId(
    scope: { region: string; assetType: string },
    stocks: any[]
  ): Promise<Map<string, any[]> | undefined> {
    const repositoryAny = this.host.repository as any;
    if (typeof repositoryAny.listRepairStatesForStocks !== 'function') return undefined;
    return repositoryAny.listRepairStatesForStocks(
      stocks.map((stock) => stock.id),
      {
        ...scope,
        repairTypes: ['PROVIDER_VALIDATION', 'PROVIDER_BUSINESS_METADATA', 'PRICE_BACKFILL'],
      }
    );
  }


  public blockedPriceBackfillStockIdsFromStates(
    repairStatesByStockId: Map<string, any[]> | undefined,
    now = new Date()
  ): Set<string> | null {
    if (!repairStatesByStockId) return null;
    const blocked = new Set<string>();
    for (const [stockId, states] of repairStatesByStockId.entries()) {
      const priceState = states.find((state) => state.repairType === 'PRICE_BACKFILL');
      if (!priceState) continue;
      if (
        priceState.status === 'MANUAL_REQUIRED'
        || priceState.status === 'RETRY_COOLDOWN'
        || (priceState.status === 'FAILED_RETRYABLE' && priceState.nextRetryAt instanceof Date && priceState.nextRetryAt > now)
      ) {
        blocked.add(stockId);
      }
    }
    return blocked;
  }


  private repairStateForStock(
    repairStatesByStockId: Map<string, any[]> | undefined,
    stockId: string,
    repairType: string
  ) {
    return repairStatesByStockId?.get(stockId)?.find((state) => state.repairType === repairType) || null;
  }


  public priceBackfillBlockReason(
    repairStatesByStockId: Map<string, any[]> | undefined,
    stockId: string,
    blockedWithoutState: boolean
  ): 'manual' | 'retry' | null {
    const state = this.repairStateForStock(repairStatesByStockId, stockId, 'PRICE_BACKFILL');
    if (!state) return blockedWithoutState ? 'manual' : null;
    if (state.status === 'MANUAL_REQUIRED') return 'manual';
    if (state.status === 'RETRY_COOLDOWN') return 'retry';
    if (state.status === 'FAILED_RETRYABLE') {
      if (!state.nextRetryAt) return 'retry';
      const nextRetryAt = state.nextRetryAt instanceof Date ? state.nextRetryAt : new Date(state.nextRetryAt);
      return Number.isNaN(nextRetryAt.getTime()) || nextRetryAt > new Date() ? 'retry' : null;
    }
    return null;
  }


  private retryStateBucket(state: any, now = new Date()): 'manual' | 'blocked' | 'eligible' | 'cooldown' | null {
    if (!state) return null;
    if (state.status === 'MANUAL_REQUIRED') return 'manual';
    if (state.status === 'RETRY_COOLDOWN') return 'cooldown';
    if (state.status === 'FAILED_RETRYABLE') {
      return state.nextRetryAt instanceof Date && state.nextRetryAt > now ? 'blocked' : 'eligible';
    }
    return null;
  }


  public repairPlanCountsFromSnapshot(snapshot: UniverseComputationSnapshot) {
    const now = new Date();
    let businessMetadataQueueRepairable = 0;
    let businessMetadataManualRequired = 0;
    let businessMetadataRetryBlocked = 0;
    let businessMetadataRetryEligible = 0;
    let businessMetadataRetryCooldown = 0;
    let providerRetryEligible = 0;
    let providerRetryBlocked = 0;
    let providerManualRepairRequired = 0;
    let nextProviderRetryAt: Date | null = null;

    for (const stock of snapshot.stocks) {
      if (stock.isActive === false || stock.isDelisted === true) continue;
      const providerStatus = normalizeProviderStatus(stock.providerSupportStatus);
      const providerState = this.repairStateForStock(snapshot.repairStatesByStockId, stock.id, 'PROVIDER_VALIDATION');
      const providerBucket = this.retryStateBucket(providerState, now);
      if (providerBucket === 'manual') providerManualRepairRequired += 1;
      if (providerStatus === 'VALIDATION_FAILED') {
        if (providerBucket === 'blocked' || providerBucket === 'cooldown') providerRetryBlocked += 1;
        if (providerBucket === 'eligible') providerRetryEligible += 1;
        if (providerState?.nextRetryAt instanceof Date && providerState.nextRetryAt > now) {
          nextProviderRetryAt = !nextProviderRetryAt || providerState.nextRetryAt < nextProviderRetryAt
            ? providerState.nextRetryAt
            : nextProviderRetryAt;
        }
      }

      if (providerStatus !== 'SUPPORTED' || !this.host.needsBusinessMetadataRepair(stock)) continue;
      const businessState = this.repairStateForStock(snapshot.repairStatesByStockId, stock.id, 'PROVIDER_BUSINESS_METADATA');
      const businessBucket = this.retryStateBucket(businessState, now);
      if (businessBucket === 'manual') {
        businessMetadataManualRequired += 1;
        continue;
      }
      if (businessBucket === 'blocked') {
        businessMetadataRetryBlocked += 1;
        continue;
      }
      if (businessBucket === 'cooldown') {
        businessMetadataRetryCooldown += 1;
        continue;
      }
      businessMetadataQueueRepairable += 1;
      if (businessBucket === 'eligible') businessMetadataRetryEligible += 1;
    }

    const businessMetadataAutoRepairable = Math.max(businessMetadataQueueRepairable - businessMetadataRetryEligible, 0);
    return {
      businessMetadataQueueRepairable,
      businessMetadataAutoRepairable,
      businessMetadataManualRequired,
      businessMetadataRetryBlocked,
      businessMetadataRetryEligible,
      businessMetadataRecentlyAttempted: businessMetadataManualRequired + businessMetadataRetryBlocked + businessMetadataRetryCooldown,
      providerRetryBlocked,
      providerManualRepairRequired,
      nextProviderRetryAtMin: nextProviderRetryAt ? nextProviderRetryAt.toISOString() : null,
      providerRetryValidationNeeded: (providerValidationFailed: number) => {
        const knownStateTotal = providerRetryEligible + providerRetryBlocked + providerManualRepairRequired;
        return providerRetryEligible + Math.max(providerValidationFailed - knownStateTotal, 0);
      },
    };
  }


  public async blockedPriceBackfillStockIds(
    scope: { region: string; assetType: string },
    includeRetryableBlocked = false
  ): Promise<Set<string>> {
    const repositoryAny = this.host.repository as any;
    if (typeof repositoryAny.listBlockedPriceBackfillStockIds !== 'function') return new Set();
    const ids = await repositoryAny.listBlockedPriceBackfillStockIds({
      ...scope,
      includeRetryable: includeRetryableBlocked,
    });
    return new Set(ids);
  }


  private priceBackfillCandidatePriority(readiness: InstrumentUniverseReadiness): number {
    return priceBackfillCandidatePriorityFn(readiness);
  }


  private priceBackfillFetchPlan(
    candidate: PriceBackfillCandidate,
    latestCompletedDate: string,
    request: MarketDataRepairRequest
  ): { stock: any; mode: 'DEEP' | 'INCREMENTAL'; startDate: Date } {
    return priceBackfillFetchPlanFn(candidate, latestCompletedDate, request);
  }


  private assignPriceBackfillDepthDiagnostics(summary: MarketDataRepairSummary, candidates: PriceBackfillCandidate[]) {
    return assignPriceBackfillDepthDiagnosticsFn(summary, candidates);
  }


  private addPriceBackfillCoverageSample(
    summary: MarketDataRepairSummary,
    candidate: PriceBackfillCandidate,
    sourceFallbackReason: string | null
  ) {
    return addPriceBackfillCoverageSampleFn(summary, candidate, sourceFallbackReason);
  }

}
