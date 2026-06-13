// Auto-extracted universe-readiness sibling (Phase 5b). Bodies are byte-identical to the
// pre-extraction inline implementation in market-data-foundation.service.ts, except that
// stays-on-service / cross-cluster collaborators are reached through the host
// (this.X -> this.host.X) and the snapshot-cache field (substrate only) now lives on this class.
// The service constructs this once and keeps byte-identical public delegators.

import type { MarketDataUniverseReadinessHost } from './market-data-foundation.universe-readiness-host';
import type {
  ReviewReadinessSummary,
  InstrumentUniverseReadiness,
  TrustedReviewUniverseHealth,
  TrustedReviewUniverseInstrument,
  TrustedReviewUniverseMode,
  TrustedReviewUniverseStatus,
} from '../market-data-foundation.types';
import type {
  UniverseComputationSnapshot,
  TrustedReviewUniverseOptions,
} from './market-data-foundation.universe-readiness.types';
import { TRUSTED_REVIEW_SCAN_ORDERING } from './market-data-foundation.universe-readiness.types';
import { normalizeProviderStatus } from '../ingestion/market-data-foundation.universe';

export class UniverseReviewService {
  constructor(private readonly host: MarketDataUniverseReadinessHost) {}

  async reviewReadinessSummary(options: TrustedReviewUniverseOptions = {}): Promise<ReviewReadinessSummary> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    if (options.recompute) {
      const summary = await this.computeReviewReadinessSummary(options);
      await this.persistReviewReadinessSnapshot(scope, summary);
      return summary;
    }
    const persisted = await this.loadPersistedReviewReadiness(scope);
    return persisted ?? this.pendingReviewReadinessSummary(scope);
  }

  async persistReviewReadinessSnapshot(scope: { region: string; assetType: string }, summary: ReviewReadinessSummary): Promise<void> {
    try {
      const repo = this.host.repository as any;
      if (typeof repo.upsertReviewReadinessSnapshot !== 'function') return;
      const tradingDate = summary.reviewUniverse.targetTradingDate
        || summary.reviewUniverse.requiredDataThroughDate
        || new Date().toISOString().slice(0, 10);
      await repo.upsertReviewReadinessSnapshot(scope.region, scope.assetType, tradingDate, summary);
    } catch (error) {
      console.warn('[MarketDataFoundation] failed to persist review-readiness snapshot', error);
    }
  }

  async loadPersistedReviewReadiness(scope: { region: string; assetType: string }): Promise<ReviewReadinessSummary | null> {
    try {
      const repo = this.host.repository as any;
      if (typeof repo.latestReviewReadinessSnapshot !== 'function') return null;
      const stored = await repo.latestReviewReadinessSnapshot(scope.region, scope.assetType);
      return stored ? (stored as ReviewReadinessSummary) : null;
    } catch (error) {
      console.warn('[MarketDataFoundation] failed to read persisted review-readiness snapshot', error);
      return null;
    }
  }

  pendingReviewReadinessSummary(scope: { region: string; assetType: string }): ReviewReadinessSummary {
    return {
      scope,
      generatedAt: new Date().toISOString(),
      reviewMode: 'NO_REVIEW',
      trustStatus: 'NOT_TRUSTWORTHY',
      userDecision: 'WAIT',
      reviewUniverse: {
        catalogCount: 0,
        providerSupportedCount: 0,
        trustedCount: 0,
        targetTradingDate: null,
        requiredDataThroughDate: null,
        storedDataThroughDate: null,
      },
      readinessCounts: {
        priceReady: 0,
        contextReady: 0,
        reviewReady: 0,
        missingLatestPrice: 0,
        staleLatestPrice: 0,
        inadequateHistory: 0,
        missingRecentVolume: 0,
        providerUnknown: 0,
        providerValidationFailedRetryable: 0,
        unsupportedExcluded: 0,
      },
      blockers: [],
      nextAction: null,
      warnings: ['Review readiness has not been computed yet for this scope. It is refreshed by the data pipeline; pass ?recompute=true to compute it on demand.'],
    };
  }

  async computeReviewReadinessSummary(options: TrustedReviewUniverseOptions = {}): Promise<ReviewReadinessSummary> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const snapshot = await this.host.tryUniverseComputationSnapshot(scope, options.now);
    const [health, reviewUniverse, repairPlan] = await Promise.all([
      this.host.universeHealth(scope, snapshot ?? undefined),
      snapshot
        ? this.trustedReviewUniverseEvaluation({ ...scope, now: options.now }, snapshot).then((result) => result.health)
        : this.trustedReviewUniverseHealth({ ...scope, now: options.now }),
      this.host.repairPlan(scope, snapshot ?? undefined),
    ]);
    const readinessCounts = {
      priceReady: health.counts.priceReady,
      contextReady: health.counts.contextReady,
      reviewReady: health.counts.reviewReady,
      missingLatestPrice: health.counts.missingLatestPrice,
      staleLatestPrice: health.counts.staleLatestPrice,
      inadequateHistory: health.counts.missingOrInadequatePriceHistory,
      missingRecentVolume: health.counts.missingRecentVolume,
      providerUnknown: repairPlan.providerUnknownValidationNeeded ?? health.counts.providerUnknownValidationNeeded,
      providerValidationFailedRetryable: repairPlan.providerRetryValidationNeeded ?? health.counts.providerRetryValidationNeeded,
      unsupportedExcluded: repairPlan.providerUnsupportedExcluded ?? health.counts.unsupportedExcluded,
    };
    const blockers = this.host.reviewReadinessBlockers(scope, health, reviewUniverse, repairPlan);
    const nextAction = this.host.reviewReadinessNextAction(blockers);
    const userDecision = this.host.reviewReadinessUserDecision(reviewUniverse.mode, health.trustStatus, blockers, nextAction);

    return {
      scope,
      generatedAt: new Date().toISOString(),
      reviewMode: reviewUniverse.mode,
      trustStatus: health.trustStatus,
      userDecision,
      reviewUniverse: {
        catalogCount: reviewUniverse.catalogCount,
        providerSupportedCount: reviewUniverse.providerSupportedCount,
        trustedCount: reviewUniverse.trustedCount,
        targetTradingDate: reviewUniverse.targetTradingDate,
        requiredDataThroughDate: reviewUniverse.requiredDataThroughDate,
        storedDataThroughDate: reviewUniverse.storedDataThroughDate,
      },
      readinessCounts,
      blockers,
      nextAction,
      warnings: [...new Set([
        ...reviewUniverse.warnings,
        ...health.warnings,
        ...repairPlan.warnings,
      ])].slice(0, 12),
    };
  }

  async trustedReviewUniverseHealth(options: TrustedReviewUniverseOptions = {}): Promise<TrustedReviewUniverseHealth> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const snapshot = await this.host.tryUniverseComputationSnapshot(scope, options.now);
    return (await this.trustedReviewUniverseEvaluation(options, snapshot ?? undefined)).health;
  }

  async trustedReviewUniverseEvaluation(
    options: TrustedReviewUniverseOptions = {},
    snapshot?: UniverseComputationSnapshot
  ) {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const now = options.now instanceof Date && Number.isFinite(options.now.getTime()) ? options.now : new Date();
    const stocks = snapshot?.stocks ?? await this.host.repository.listStocksForUniverseHealth(scope);
    const readinessAndStats = snapshot ? null : await this.host.universeReadinessAndStatsForStocks(stocks, { ...scope, now });
    const readinessBySymbol = snapshot?.readinessBySymbol ?? readinessAndStats!.readinessBySymbol;
    const statsBySymbol = snapshot?.statsBySymbol ?? readinessAndStats!.statsBySymbol;
    const reviewDatePolicy = this.host.trustedReviewDatePolicy(scope.region, now);
    const reviewDataThroughPolicy = this.host.reviewDataThroughDatePolicy(
      scope,
      stocks,
      statsBySymbol,
      reviewDatePolicy.requiredDataThroughDate
    );
    const expectedLatestTradingDate = reviewDataThroughPolicy.requiredDataThroughDate;
    const minLiteCount = Math.max(this.host.readPositiveNumber(process.env.TRUSTED_REVIEW_MIN_LITE, 100), 1);
    const minFullCount = Math.max(this.host.readPositiveNumber(process.env.TRUSTED_REVIEW_MIN_FULL, 300), minLiteCount);
    const excludedCounts = this.host.emptyTrustedReviewExcludedCounts();
    const contextGapCounts = this.host.emptyTrustedReviewContextGapCounts();
    const trustedStocks: Array<{
      stock: any;
      readiness: InstrumentUniverseReadiness;
      stats: any;
      contextGaps: string[];
      warnings: string[];
    }> = [];
    let providerSupportedCount = 0;
    let dataThroughDate: string | null = null;
    let storedDataThroughDate: string | null = reviewDataThroughPolicy.storedDataThroughDate;

    for (const stock of stocks) {
      const readiness = readinessBySymbol.get(stock.symbol);
      if (!readiness) continue;
      const stats = this.host.priceStatsForStock(statsBySymbol, stock) || null;
      const isInactiveOrDelisted = stock.isActive === false || stock.isDelisted === true;
      if (isInactiveOrDelisted) {
        excludedCounts.inactiveOrDelisted += 1;
        continue;
      }

      const providerStatus = normalizeProviderStatus(stock.providerSupportStatus);
      const supportEvidence = this.host.trustedReviewSupportEvidence(stock, stats, providerStatus);
      if (!supportEvidence.supported && providerStatus === 'UNKNOWN') {
        excludedCounts.providerUnknown += 1;
        continue;
      }
      if (!supportEvidence.supported && providerStatus === 'VALIDATION_FAILED') {
        excludedCounts.providerRetryFailed += 1;
        continue;
      }
      if (!supportEvidence.supported && providerStatus === 'UNSUPPORTED') {
        excludedCounts.providerUnsupported += 1;
        continue;
      }
      if (!supportEvidence.supported) {
        excludedCounts.providerUnknown += 1;
        continue;
      }

      providerSupportedCount += 1;
      if (!readiness.latestPriceDate) {
        excludedCounts.noLatestPrice += 1;
        continue;
      }
      if (!storedDataThroughDate || readiness.latestPriceDate > storedDataThroughDate) storedDataThroughDate = readiness.latestPriceDate;
      if (!expectedLatestTradingDate || readiness.latestPriceDate < expectedLatestTradingDate) {
        excludedCounts.staleLatestPrice += 1;
        continue;
      }
      if (readiness.priceHistoryBars < 120) {
        excludedCounts.insufficientBarsUnder120 += 1;
        continue;
      }
      if (!readiness.hasRecentVolume) {
        excludedCounts.missingRecentVolume += 1;
        continue;
      }
      if (readiness.readinessBlockers.includes('CRITICAL_CORPORATE_ACTION_PRICE_WARNING')) {
        excludedCounts.corporateActionBlocked += 1;
        continue;
      }
      if (readiness.priceHistoryBars < 252) excludedCounts.insufficientBarsUnder252 += 1;

      const contextGaps = this.host.trustedReviewContextGaps(stock);
      for (const gap of contextGaps) {
        if (gap === 'sector') contextGapCounts.missingSector += 1;
        if (gap === 'industry') contextGapCounts.missingIndustry += 1;
        if (gap === 'marketCap') contextGapCounts.missingMarketCap += 1;
        if (gap === 'isin') contextGapCounts.missingIsin += 1;
        if (gap === 'listingDate') contextGapCounts.missingListingDate += 1;
      }
      const warnings = [
        ...readiness.readinessWarnings,
        ...(readiness.usesAdjustedCloseFallback ? ['Adjusted close is missing for at least one recent candle; close fallback is used for lite review.'] : []),
        ...(readiness.priceHistoryBars < 252 ? ['Less than 252 bars; lite review only.'] : []),
        ...(contextGaps.length > 0 ? [`Context gaps: ${contextGaps.join(', ')}.`] : []),
      ];
      if (!dataThroughDate || readiness.latestPriceDate > dataThroughDate) dataThroughDate = readiness.latestPriceDate;
      trustedStocks.push({ stock, readiness, stats, contextGaps, warnings });
    }

    trustedStocks.sort((left, right) => {
      const volumeDiff = (this.host.numericOrNull(right.stats?.latestVolume) ?? 0) - (this.host.numericOrNull(left.stats?.latestVolume) ?? 0);
      if (volumeDiff !== 0) return volumeDiff;
      const historyDiff = (right.readiness.priceHistoryBars || 0) - (left.readiness.priceHistoryBars || 0);
      if (historyDiff !== 0) return historyDiff;
      const rightDate = right.readiness.latestPriceDate || '';
      const leftDate = left.readiness.latestPriceDate || '';
      if (rightDate !== leftDate) return rightDate.localeCompare(leftDate);
      return String(left.stock.symbol || '').localeCompare(String(right.stock.symbol || ''));
    });

    const trustedCount = trustedStocks.length;
    const status: TrustedReviewUniverseStatus = trustedCount >= minFullCount ? 'READY' : trustedCount >= minLiteCount ? 'LIMITED' : 'NOT_READY';
    const mode: TrustedReviewUniverseMode = status === 'READY' ? 'FULL_REVIEW' : status === 'LIMITED' ? 'LIMITED_REVIEW' : 'NO_REVIEW';
    const warnings: string[] = [];
    if (mode === 'LIMITED_REVIEW') warnings.push('Limited review mode: candidates are generated only from stocks with current price, sufficient OHLCV history, and recent volume.');
    if (mode === 'NO_REVIEW') warnings.push(`Trusted review universe has ${trustedCount} instruments; at least ${minLiteCount} are required for Today review generation.`);
    if (Object.values(contextGapCounts).some((count) => count > 0)) {
      warnings.push('Missing metadata is shown as context gap, not a hard blocker for price-action review.');
    }
    if (excludedCounts.insufficientBarsUnder252 > 0) {
      warnings.push(`${excludedCounts.insufficientBarsUnder252} trusted instruments have fewer than 252 bars and are limited to lite evidence.`);
    }
    if (excludedCounts.requiredHistoryIncomplete > 0) {
      warnings.push(`${excludedCounts.requiredHistoryIncomplete} instruments have incomplete strict signoff history, but Lite review eligibility is based on the current 120-bar OHLCV window.`);
    }
    if (storedDataThroughDate && expectedLatestTradingDate && storedDataThroughDate < expectedLatestTradingDate) {
      warnings.push(`Stored data-through date ${storedDataThroughDate} is older than required data-through date ${expectedLatestTradingDate}.`);
    }
    if (reviewDataThroughPolicy.latestCompletedDataThroughDate && expectedLatestTradingDate && expectedLatestTradingDate < reviewDataThroughPolicy.latestCompletedDataThroughDate) {
      warnings.push(`Official exchange EOD for ${reviewDataThroughPolicy.latestCompletedDataThroughDate} is not available in SourceFileImport/PriceTick evidence; review readiness is using stored exchange data through ${expectedLatestTradingDate}.`);
    }

    return {
      health: {
        scope,
        asOfDate: now.toISOString().slice(0, 10),
        targetTradingDate: reviewDatePolicy.targetTradingDate,
        requiredDataThroughDate: expectedLatestTradingDate,
        storedDataThroughDate,
        catalogCount: stocks.length,
        providerSupportedCount,
        trustedCount,
        status,
        mode,
        minLiteCount,
        minFullCount,
        dataThroughDate: dataThroughDate || storedDataThroughDate,
        scanPolicy: {
          scanLimit: trustedCount,
          scanComplete: true,
          scanOrdering: TRUSTED_REVIEW_SCAN_ORDERING,
        },
        excludedCounts,
        contextGapCounts,
        warnings,
      },
      trustedStocks,
    };
  }

  async listTrustedReviewUniverseInstruments(
    options: TrustedReviewUniverseOptions & { limit?: number; offset?: number } = {}
  ): Promise<TrustedReviewUniverseInstrument[]> {
    const limit = Math.max(1, Math.min(Number(options.limit) || 100, 500));
    const offset = Math.max(Number(options.offset) || 0, 0);
    // Use the snapshot cache so repeated paginated calls (one per 250-instrument page during
    // today-review universe scan) do not re-run the full 2900+ stock evaluation each time.
    const snapshot = await this.host.tryUniverseComputationSnapshot({ region: options.region?.trim().toUpperCase() || 'IN', assetType: options.assetType?.trim().toUpperCase() || 'STOCK' }, options.now instanceof Date ? options.now : undefined);
    const evaluation = await this.trustedReviewUniverseEvaluation(options, snapshot ?? undefined);
    const selected = evaluation.trustedStocks.slice(offset, offset + limit);
    const selectedReadinessBySymbol = new Map(selected.map((item) => [item.stock.symbol, item.readiness]));
    const selectedStatsBySymbol = new Map(selected.map((item) => [item.stock.symbol, item.stats]));
    const baselineByStockId = await this.host.trustedBaselineByStockId(
      selected.map((item) => item.stock),
      selectedReadinessBySymbol,
      selectedStatsBySymbol,
      evaluation.health.scope
    );
    const historyBySymbol = typeof (this.host.repository as any).priceHistoryForSymbols === 'function'
      ? await (this.host.repository as any).priceHistoryForSymbols(selected.map((item) => item.stock.symbol), { perSymbolLimit: 320 })
      : new Map<string, never[]>();

    return selected.map(({ stock, readiness, stats, contextGaps, warnings }) => ({
      id: stock.id,
      symbol: stock.symbol,
      companyName: stock.name || null,
      region: stock.region || evaluation.health.scope.region,
      assetType: stock.assetType || evaluation.health.scope.assetType,
      exchange: stock.exchange || null,
      providerSymbol: stock.providerSymbol || stock.symbol || null,
      latestPriceDate: readiness.latestPriceDate,
      priceHistoryBars: readiness.priceHistoryBars,
      rollingWindowBars: readiness.rollingWindowBars,
      hasRecentVolume: readiness.hasRecentVolume,
      latestClose: this.host.numericOrNull(stats?.latestClose),
      latestVolume: this.host.numericOrNull(stats?.latestVolume),
      adjustedCloseAvailable: !readiness.usesAdjustedCloseFallback,
      usesAdjustedCloseFallback: readiness.usesAdjustedCloseFallback,
      trustedBaselineResidualState: baselineByStockId.get(stock.id)?.trustedBaselineResidualState ?? 'REVIEW_READY',
      trustedBaselineBlockerCodes: baselineByStockId.get(stock.id)?.trustedBaselineBlockerCodes ?? [],
      latestCompletedEodDate: baselineByStockId.get(stock.id)?.latestCompletedEodDate ?? null,
      latestCompletedEodPresent: baselineByStockId.get(stock.id)?.latestCompletedEodPresent ?? false,
      storedDataThroughDate: baselineByStockId.get(stock.id)?.storedDataThroughDate ?? readiness.latestPriceDate,
      requiredHistoryStartDate: baselineByStockId.get(stock.id)?.requiredHistoryStartDate ?? null,
      requiredHistoryEndDate: baselineByStockId.get(stock.id)?.requiredHistoryEndDate ?? null,
      requiredHistoryStatus: baselineByStockId.get(stock.id)?.requiredHistoryStatus ?? 'INCOMPLETE',
      listingDate: baselineByStockId.get(stock.id)?.listingDate ?? null,
      listingDateStatus: baselineByStockId.get(stock.id)?.listingDateStatus ?? 'MISSING_USED_15_YEAR_TARGET',
      providerFallbackState: baselineByStockId.get(stock.id)?.providerFallbackState ?? 'PROVIDER_SUPPORTED',
      // Report a region-correct source label for the default case (non-IN = Yahoo, not NSE/BSE).
      primarySourceAttempted: baselineByStockId.get(stock.id)?.primarySourceAttempted
        ?? ((stock.region && stock.region !== 'IN') ? 'YAHOO_EOD' : 'NSE_BSE_EXCHANGE_EOD'),
      fallbackSourcesAttempted: baselineByStockId.get(stock.id)?.fallbackSourcesAttempted ?? [],
      sourceFallbackReason: baselineByStockId.get(stock.id)?.sourceFallbackReason ?? null,
      contextGaps,
      warnings,
      priceHistory: historyBySymbol.get(stock.symbol) || [],
      /** derivativesEligible: sourced from the stock record when available; null means not yet populated. */
      derivativesEligible: (stock as any).derivativesEligible ?? null,
      /** sector: sourced from catalog metadata; null when absent (will appear in contextGaps as 'sector'). */
      sector: (stock as any).sector ?? null,
    }));
  }
}
