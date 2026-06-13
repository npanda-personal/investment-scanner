// Auto-extracted universe-readiness sibling (Phase 5b). Bodies are byte-identical to the
// pre-extraction inline implementation in market-data-foundation.service.ts, except that
// stays-on-service / cross-cluster collaborators are reached through the host
// (this.X -> this.host.X) and the snapshot-cache field (substrate only) now lives on this class.
// The service constructs this once and keeps byte-identical public delegators.

import type { MarketDataUniverseReadinessHost } from './market-data-foundation.universe-readiness-host';
import type { MarketDataFoundationService } from '../market-data-foundation.service';
import type {
  InstrumentUniverseReadiness,
  TrustedBaselineListingDateStatus,
  TrustedBaselineProviderFallbackState,
  TrustedBaselineRequiredHistoryStatus,
  TrustedBaselineResidualState,
  PaginationOptions,
} from '../market-data-foundation.types';
import type {
  UniverseComputationSnapshot,
  UniverseComputationSnapshotCacheEntry,
  TrustedBaselineSnapshot,
  RepairStateLookup,
} from './market-data-foundation.universe-readiness.types';
import { latestCompletedTradingDateForRegion } from '../ingestion/market-data-foundation.market-session';
import { classifyInstrumentUniverseReadiness, normalizeProviderStatus } from '../ingestion/market-data-foundation.universe';

export class UniverseReadinessService {
  // Snapshot-cache state (moved from MarketDataFoundationService). Single instance shared by
  // serving reads (populate/read) and repair (invalidate via the service delegator), so cache
  // coherence is preserved.
  private readonly universeSnapshotCacheTtlMs: number;
  private readonly universeSnapshotCache = new Map<string, UniverseComputationSnapshotCacheEntry>();

  constructor(private readonly host: MarketDataUniverseReadinessHost) {
    this.universeSnapshotCacheTtlMs = Math.max(
      this.host.readPositiveNumber(process.env.MARKET_DATA_UNIVERSE_SNAPSHOT_CACHE_TTL_MS, 60000),
      1000
    );
  }

  async universeReadinessAndStatsForStocks(
    stocks: any[],
    options: Pick<PaginationOptions, 'region' | 'assetType'> & { now?: Date } = {}
  ): Promise<{ readinessBySymbol: Map<string, InstrumentUniverseReadiness>; statsBySymbol: Map<string, any> }> {
    if (stocks.length === 0) return { readinessBySymbol: new Map(), statsBySymbol: new Map() };
    const identitySymbols = [...new Set(stocks.flatMap((stock) => [
      stock.symbol,
      stock.providerSymbol,
      stock.sourceSymbol,
      stock.displaySymbol,
    ]).filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
    const statsBySymbol = typeof (this.host.repository as any).priceReadinessStatsForSymbols === 'function'
      ? await this.host.repository.priceReadinessStatsForSymbols(identitySymbols)
      : new Map<string, never>();
    await this.repairProviderSupportFromStoredPrices(stocks, statsBySymbol as Map<string, any>);
    const expectedLatestTradingDate = this.host.reviewDataThroughDatePolicy(
      {
        region: options.region?.trim().toUpperCase() || 'IN',
        assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
      },
      stocks,
      statsBySymbol as Map<string, any>,
      latestCompletedTradingDateForRegion(options.region || 'IN', options.now)
    ).requiredDataThroughDate;
    const readinessBySymbol = new Map(stocks.map((stock) => {
      const priceStats = this.host.priceStatsForStock(statsBySymbol as Map<string, any>, stock);
      const readiness = classifyInstrumentUniverseReadiness({
        isActive: stock.isActive,
        isDelisted: stock.isDelisted,
        providerSupportStatus: stock.providerSupportStatus,
        providerSymbol: stock.providerSymbol || stock.symbol,
        providerError: stock.providerError,
        sector: stock.sector,
        industry: stock.industry,
        country: stock.country || this.host.defaultCountryForInstrument(stock.symbol, stock.exchange, stock.region),
        currency: stock.currency || this.host.defaultCurrencyForInstrument(stock.symbol, stock.exchange, stock.region),
        marketCap: stock.marketCap,
        isin: stock.isin,
        ipoDate: stock.ipoDate,
        region: stock.region || options.region,
        assetType: stock.assetType || options.assetType,
        expectedLatestTradingDate,
        priceStats,
      });
      return [stock.symbol, readiness];
    }));
    return { readinessBySymbol, statsBySymbol };
  }

  async trustedBaselineByStockId(
    stocks: any[],
    readinessBySymbol: Map<string, InstrumentUniverseReadiness>,
    statsBySymbol: Map<string, any>,
    options: Pick<PaginationOptions, 'region' | 'assetType'> = {}
  ): Promise<Map<string, TrustedBaselineSnapshot>> {
    if (stocks.length === 0) return new Map();
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const validationWindow = this.providerValidationWindow(scope);
    const repositoryAny = this.host.repository as any;
    const repairStatesByStockId = typeof repositoryAny.listRepairStatesForStocks === 'function'
      ? await repositoryAny.listRepairStatesForStocks(
        stocks.map((stock) => stock.id),
        { ...scope, repairTypes: ['PROVIDER_VALIDATION', 'PRICE_BACKFILL', 'CATALOG_IDENTITY'] }
      )
      : new Map<string, any[]>();
    const baselineByStockId = new Map<string, TrustedBaselineSnapshot>();

    for (const stock of stocks) {
      const readiness = readinessBySymbol.get(stock.symbol);
      if (!readiness) continue;
      const stats = this.host.priceStatsForStock(statsBySymbol, stock);
      const supportEvidence = this.host.trustedReviewSupportEvidence(stock, stats, normalizeProviderStatus(stock.providerSupportStatus));
      const historyDiagnostics = this.host.requiredHistoryDiagnostics(stock, validationWindow, stats);
      const repairStates = this.repairStateLookup(repairStatesByStockId.get(stock.id));
      const sourceFallbackReason = this.sourceFallbackReasonForBaseline(repairStates.priceBackfill);
      const requiredHistoryStatus = this.requiredHistoryStatusForBaseline(historyDiagnostics, sourceFallbackReason);
      const listingDateStatus = this.listingDateStatusForBaseline(historyDiagnostics, validationWindow.defaultRequiredHistoryStartDateIso);
      const providerFallbackState = this.providerFallbackStateForBaseline(
        stock,
        repairStates.providerValidation,
        sourceFallbackReason,
        requiredHistoryStatus,
        supportEvidence.supported
      );
      const residualState = this.residualStateForBaseline(
        stock,
        readiness,
        historyDiagnostics,
        listingDateStatus,
        providerFallbackState,
        requiredHistoryStatus,
        sourceFallbackReason,
        supportEvidence.supported
      );
      const fallbackSourcesAttempted = this.fallbackSourcesAttemptedForBaseline(repairStates.priceBackfill, sourceFallbackReason);
      const blockerCodes = this.trustedBaselineBlockerCodes(
        stock,
        readiness,
        residualState,
        requiredHistoryStatus,
        listingDateStatus,
        providerFallbackState,
        sourceFallbackReason,
        supportEvidence.supported
      );
      baselineByStockId.set(stock.id, {
        trustedBaselineResidualState: residualState,
        trustedBaselineBlockerCodes: blockerCodes,
        latestCompletedEodDate: historyDiagnostics.latestCompletedEodDate,
        latestCompletedEodPresent: Boolean(
          historyDiagnostics.latestCompletedEodDate
          && historyDiagnostics.storedHistoryEndDate
          && historyDiagnostics.storedHistoryEndDate >= historyDiagnostics.latestCompletedEodDate
        ),
        storedDataThroughDate: historyDiagnostics.storedHistoryEndDate || readiness.latestPriceDate,
        requiredHistoryStartDate: historyDiagnostics.requiredHistoryStartDate,
        requiredHistoryEndDate: historyDiagnostics.latestCompletedEodDate,
        requiredHistoryStatus,
        listingDate: historyDiagnostics.listingDate,
        listingDateStatus,
        providerFallbackState,
        primarySourceAttempted: 'NSE_BSE_EXCHANGE_EOD',
        fallbackSourcesAttempted,
        sourceFallbackReason,
      });
    }

    return baselineByStockId;
  }

  repairStateLookup(states: any[] | undefined): RepairStateLookup {
    const byType = new Map<string, any>();
    for (const state of states || []) {
      const repairType = String(state?.repairType || '').toUpperCase();
      if (!repairType || byType.has(repairType)) continue;
      byType.set(repairType, state);
    }
    return {
      providerValidation: byType.get('PROVIDER_VALIDATION') || null,
      priceBackfill: byType.get('PRICE_BACKFILL') || null,
      catalogIdentity: byType.get('CATALOG_IDENTITY') || null,
    };
  }

  listingDateStatusForBaseline(
    historyDiagnostics: ReturnType<MarketDataFoundationService['requiredHistoryDiagnostics']>,
    defaultRequiredHistoryStartDateIso: string
  ): TrustedBaselineListingDateStatus {
    if (!historyDiagnostics.listingDate) return 'MISSING_USED_15_YEAR_TARGET';
    if (historyDiagnostics.listingDate > defaultRequiredHistoryStartDateIso) return 'PRESENT_USED_LISTING_DATE';
    return 'PRESENT_OLDER_THAN_15Y_USED_15Y';
  }

  requiredHistoryStatusForBaseline(
    historyDiagnostics: ReturnType<MarketDataFoundationService['requiredHistoryDiagnostics']>,
    sourceFallbackReason: string | null
  ): TrustedBaselineRequiredHistoryStatus {
    if (sourceFallbackReason) return 'FALLBACK_REQUIRED';
    return historyDiagnostics.requiredHistoryComplete ? 'COMPLETE' : 'INCOMPLETE';
  }

  providerFallbackStateForBaseline(
    stock: any,
    providerValidationState: any,
    sourceFallbackReason: string | null,
    requiredHistoryStatus: TrustedBaselineRequiredHistoryStatus,
    exchangeEvidenceSupported = false
  ): TrustedBaselineProviderFallbackState {
    if (stock.isActive === false || stock.isDelisted === true || (normalizeProviderStatus(stock.providerSupportStatus) === 'UNSUPPORTED' && !exchangeEvidenceSupported)) {
      return 'PROVIDER_UNSUPPORTED_OR_INACTIVE';
    }
    const providerStatus = normalizeProviderStatus(stock.providerSupportStatus);
    if (providerStatus === 'UNKNOWN') return 'PROVIDER_UNKNOWN';
    if (providerStatus === 'VALIDATION_FAILED') {
      const retryBlocked = this.isProviderValidationRetryBlocked(providerValidationState);
      return retryBlocked ? 'RETRY_BLOCKED_PROVIDER_VALIDATION' : 'PROVIDER_VALIDATION_FAILED';
    }
    if (sourceFallbackReason === 'YAHOO_ZERO_ROWS') return 'YAHOO_INSUFFICIENT_FALLBACK_REQUIRED';
    if (sourceFallbackReason || requiredHistoryStatus === 'FALLBACK_REQUIRED') return 'FALLBACK_ATTEMPTED_STILL_INCOMPLETE';
    if (exchangeEvidenceSupported) return 'PROVIDER_SUPPORTED';
    return 'PROVIDER_SUPPORTED';
  }

  residualStateForBaseline(
    stock: any,
    readiness: InstrumentUniverseReadiness,
    historyDiagnostics: ReturnType<MarketDataFoundationService['requiredHistoryDiagnostics']>,
    listingDateStatus: TrustedBaselineListingDateStatus,
    providerFallbackState: TrustedBaselineProviderFallbackState,
    requiredHistoryStatus: TrustedBaselineRequiredHistoryStatus,
    sourceFallbackReason: string | null,
    exchangeEvidenceSupported = false
  ): TrustedBaselineResidualState {
    if (stock.isActive === false || stock.isDelisted === true || (normalizeProviderStatus(stock.providerSupportStatus) === 'UNSUPPORTED' && !exchangeEvidenceSupported)) {
      return 'UNSUPPORTED_OR_INACTIVE_EXCLUDED';
    }
    if (providerFallbackState === 'RETRY_BLOCKED_PROVIDER_VALIDATION') return 'RETRY_BLOCKED_PROVIDER_VALIDATION';
    if (!exchangeEvidenceSupported && (providerFallbackState === 'PROVIDER_UNKNOWN' || providerFallbackState === 'PROVIDER_VALIDATION_FAILED')) return 'PROVIDER_VALIDATION_PENDING';
    if (sourceFallbackReason === 'YAHOO_ZERO_ROWS') return 'FALLBACK_REQUIRED_AFTER_YAHOO_ZERO_ROWS';
    if (providerFallbackState === 'FALLBACK_ATTEMPTED_STILL_INCOMPLETE') return 'FALLBACK_ATTEMPTED_STILL_INCOMPLETE';
    if (this.host.needsCatalogIdentityRepair(stock)) return 'CATALOG_IDENTITY_REPAIR_REQUIRED';
    if (!exchangeEvidenceSupported && listingDateStatus === 'MISSING_USED_15_YEAR_TARGET') return 'LISTING_DATE_MISSING_REQUIRED_15Y';
    if (!exchangeEvidenceSupported && requiredHistoryStatus !== 'COMPLETE') return 'REQUIRED_HISTORY_INCOMPLETE';
    if (readiness.priceReadiness !== 'READY' || (!exchangeEvidenceSupported && !historyDiagnostics.requiredHistoryComplete)) return 'REQUIRED_HISTORY_INCOMPLETE';
    return 'REVIEW_READY';
  }

  trustedBaselineBlockerCodes(
    stock: any,
    readiness: InstrumentUniverseReadiness,
    residualState: TrustedBaselineResidualState,
    requiredHistoryStatus: TrustedBaselineRequiredHistoryStatus,
    listingDateStatus: TrustedBaselineListingDateStatus,
    providerFallbackState: TrustedBaselineProviderFallbackState,
    sourceFallbackReason: string | null,
    exchangeEvidenceSupported = false
  ): string[] {
    const blockers = new Set<string>(readiness.readinessBlockers);
    if (!exchangeEvidenceSupported && requiredHistoryStatus !== 'COMPLETE') blockers.add('REQUIRED_HISTORY_INCOMPLETE');
    if (!exchangeEvidenceSupported && listingDateStatus === 'MISSING_USED_15_YEAR_TARGET') blockers.add('LISTING_DATE_MISSING_REQUIRED_15Y');
    if (sourceFallbackReason === 'YAHOO_ZERO_ROWS') blockers.add('FALLBACK_REQUIRED_AFTER_YAHOO_ZERO_ROWS');
    if (providerFallbackState === 'FALLBACK_ATTEMPTED_STILL_INCOMPLETE') blockers.add('FALLBACK_ATTEMPTED_STILL_INCOMPLETE');
    if (providerFallbackState === 'RETRY_BLOCKED_PROVIDER_VALIDATION') blockers.add('RETRY_BLOCKED_PROVIDER_VALIDATION');
    if (!exchangeEvidenceSupported && (providerFallbackState === 'PROVIDER_UNKNOWN' || providerFallbackState === 'PROVIDER_VALIDATION_FAILED')) blockers.add('PROVIDER_VALIDATION_PENDING');
    if (this.host.needsCatalogIdentityRepair(stock)) blockers.add('CATALOG_IDENTITY_REPAIR_REQUIRED');
    if (residualState !== 'REVIEW_READY') blockers.add(residualState);
    return Array.from(blockers);
  }

  sourceFallbackReasonForBaseline(priceBackfillState: any): string | null {
    if (!priceBackfillState) return null;
    const fields = this.asJsonObject(priceBackfillState.fieldsFilledJson);
    const fromFields = typeof fields?.sourceFallbackReason === 'string' && fields.sourceFallbackReason.trim().length > 0
      ? fields.sourceFallbackReason.trim().toUpperCase()
      : null;
    if (fromFields) return fromFields;
    const manualReason = String(priceBackfillState.manualRequiredReason || '').trim();
    if (!this.isOfficialFallbackManualReason(manualReason)) return null;
    const yahooZeroRows = /zero usable price rows/i.test(manualReason);
    if (yahooZeroRows) return 'YAHOO_ZERO_ROWS';
    return 'OFFICIAL_FALLBACK_ATTEMPTED_STILL_INCOMPLETE';
  }

  fallbackSourcesAttemptedForBaseline(priceBackfillState: any, sourceFallbackReason: string | null): string[] {
    const fields = this.asJsonObject(priceBackfillState?.fieldsFilledJson);
    const attempted = new Set<string>();
    if (Array.isArray(fields?.fallbackSourcesAttempted)) {
      for (const item of fields.fallbackSourcesAttempted) {
        if (typeof item === 'string' && item.trim().length > 0) attempted.add(item.trim().toUpperCase());
      }
    }
    if (typeof fields?.fallbackSourceAttempted === 'string' && fields.fallbackSourceAttempted.trim().length > 0) {
      attempted.add(fields.fallbackSourceAttempted.trim().toUpperCase());
    }
    if (attempted.size === 0 && sourceFallbackReason) {
      attempted.add(sourceFallbackReason === 'YAHOO_ZERO_ROWS' ? 'OFFICIAL_PUBLIC_EXCHANGE_PENDING' : 'OFFICIAL_PUBLIC_EXCHANGE_ATTEMPTED');
    }
    return Array.from(attempted);
  }

  isProviderValidationRetryBlocked(providerValidationState: any): boolean {
    if (!providerValidationState) return false;
    const status = String(providerValidationState.status || '').toUpperCase();
    if (status === 'RETRY_COOLDOWN') return true;
    if (status !== 'FAILED_RETRYABLE') return false;
    if (!providerValidationState.nextRetryAt) return false;
    const retryAt = new Date(providerValidationState.nextRetryAt);
    return Number.isFinite(retryAt.getTime()) && retryAt.getTime() > Date.now();
  }

  asJsonObject(value: unknown): Record<string, any> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, any>;
  }

  isOfficialFallbackManualReason(reason: string): boolean {
    if (!reason) return false;
    return /official\/public exchange fallback/i.test(reason);
  }

  isDerivativeLikeInstrument(stock: any): boolean {
    const assetType = String(stock.assetType || '').trim().toUpperCase();
    const segment = String(stock.instrumentSegment || '').trim().toUpperCase();
    return ['FUTURE', 'FUTURES', 'OPTION', 'OPTIONS', 'DERIVATIVE', 'DERIVATIVES'].includes(assetType)
      || ['FUTURE', 'FUTURES', 'OPTION', 'OPTIONS', 'DERIVATIVE', 'DERIVATIVES'].includes(segment);
  }

  numericOrNull(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  providerValidationWindow(scope: { region: string; assetType: string }, now = new Date()) {
    const latestCompletedEodDate = latestCompletedTradingDateForRegion(scope.region, now);
    const endDate = latestCompletedEodDate ? this.host.endOfTradingDateUtc(latestCompletedEodDate) : new Date();
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - (scope.region === 'IN' && scope.assetType === 'STOCK' ? 45 : 30));
    startDate.setUTCHours(0, 0, 0, 0);
    const defaultRequiredHistoryStartDate = new Date(endDate);
    defaultRequiredHistoryStartDate.setUTCFullYear(defaultRequiredHistoryStartDate.getUTCFullYear() - 15);
    defaultRequiredHistoryStartDate.setUTCHours(0, 0, 0, 0);
    return {
      latestCompletedEodDate,
      startDate,
      endDate,
      startDateIso: startDate.toISOString().slice(0, 10),
      endDateIso: latestCompletedEodDate,
      defaultRequiredHistoryStartDate,
      defaultRequiredHistoryStartDateIso: defaultRequiredHistoryStartDate.toISOString().slice(0, 10),
    };
  }

  async repairProviderSupportFromStoredPrices(stocks: any[], statsBySymbol: Map<string, { priceHistoryBars?: number; latestPriceDate?: string | null }>) {
    const symbols = stocks
      .filter((stock) => normalizeProviderStatus(stock.providerSupportStatus) === 'UNKNOWN')
      .filter((stock) => {
        const stats = this.host.priceStatsForStock(statsBySymbol, stock);
        return Boolean(stats?.latestPriceDate && Number(stats.priceHistoryBars || 0) > 0);
      })
      .map((stock) => stock.symbol);
    if (symbols.length === 0) return;
    if (typeof (this.host.repository as any).markProviderSupportedFromStoredPrices === 'function') {
      await this.host.repository.markProviderSupportedFromStoredPrices(symbols);
    }
    const symbolSet = new Set(symbols);
    for (const stock of stocks) {
      if (symbolSet.has(stock.symbol)) {
        stock.providerSupportStatus = 'SUPPORTED';
        stock.providerError = null;
      }
    }
  }

  async universeComputationSnapshot(
    scope: { region: string; assetType: string },
    now?: Date
  ): Promise<UniverseComputationSnapshot> {
    const stocks = await this.host.repository.listStocksForUniverseHealth(scope);
    const [readinessAndStats, repairStatesByStockId] = await Promise.all([
      this.universeReadinessAndStatsForStocks(stocks, { ...scope, now }),
      this.host.repairStatesByStockId(scope, stocks),
    ]);
    return {
      scope,
      stocks,
      readinessBySymbol: readinessAndStats.readinessBySymbol,
      statsBySymbol: readinessAndStats.statsBySymbol,
      validationWindow: this.providerValidationWindow(scope, now),
      priceBackfillBlockedStockIds: this.host.blockedPriceBackfillStockIdsFromStates(repairStatesByStockId, now)
        ?? await this.host.blockedPriceBackfillStockIds(scope),
      repairStatesByStockId,
    };
  }

  universeSnapshotCacheKey(scope: { region: string; assetType: string }) {
    return `${scope.region.trim().toUpperCase()}|${scope.assetType.trim().toUpperCase()}`;
  }

  invalidateUniverseComputationSnapshot(scope?: { region: string; assetType: string }) {
    if (!scope) {
      this.universeSnapshotCache.clear();
      return;
    }
    this.universeSnapshotCache.delete(this.universeSnapshotCacheKey(scope));
  }

  async cachedUniverseComputationSnapshot(
    scope: { region: string; assetType: string },
    now?: Date
  ): Promise<UniverseComputationSnapshot> {
    if (now) return this.universeComputationSnapshot(scope, now);
    const key = this.universeSnapshotCacheKey(scope);
    const currentTime = Date.now();
    const cached = this.universeSnapshotCache.get(key);
    if (cached?.snapshot && cached.expiresAt > currentTime) return cached.snapshot;
    if (cached?.promise && cached.expiresAt > currentTime) return cached.promise;

    const promise = this.universeComputationSnapshot(scope)
      .then((snapshot) => {
        this.universeSnapshotCache.set(key, {
          snapshot,
          expiresAt: Date.now() + this.universeSnapshotCacheTtlMs,
        });
        return snapshot;
      })
      .catch((error) => {
        const active = this.universeSnapshotCache.get(key);
        if (active?.promise === promise) this.universeSnapshotCache.delete(key);
        throw error;
      });
    this.universeSnapshotCache.set(key, {
      promise,
      expiresAt: currentTime + Math.max(this.universeSnapshotCacheTtlMs, 30000),
    });
    return promise;
  }

  async tryUniverseComputationSnapshot(
    scope: { region: string; assetType: string },
    now?: Date
  ): Promise<UniverseComputationSnapshot | null> {
    const repositoryAny = this.host.repository as any;
    if (
      typeof repositoryAny.listStocksForUniverseHealth !== 'function'
      || typeof repositoryAny.priceReadinessStatsForSymbols !== 'function'
    ) {
      return null;
    }
    return this.cachedUniverseComputationSnapshot(scope, now);
  }
}
