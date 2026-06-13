// Auto-extracted universe-readiness sibling (Phase 5b). Bodies are byte-identical to the
// pre-extraction inline implementation in market-data-foundation.service.ts, except that
// stays-on-service / cross-cluster collaborators are reached through the host
// (this.X -> this.host.X) and the snapshot-cache field (substrate only) now lives on this class.
// The service constructs this once and keeps byte-identical public delegators.

import type { MarketDataUniverseReadinessHost } from './market-data-foundation.universe-readiness-host';
import type {
  MarketDataRepairPlan,
  MarketDataUniverseHealth,
  ReviewReadinessBlocker,
  ReviewReadinessNextAction,
  ReviewReadinessSummary,
  TrustedReviewUniverseHealth,
  TrustedReviewUniverseMode,
  UniverseTrustStatus,
} from '../market-data-foundation.types';
import { latestCompletedTradingDateForRegion, tradingDateForRegion, getMarketSessionConfig } from '../ingestion/market-data-foundation.market-session';

export class UniverseReviewPolicyService {
  constructor(private readonly host: MarketDataUniverseReadinessHost) {}

  emptyTrustedReviewExcludedCounts() {
    return {
      providerUnknown: 0,
      providerRetryFailed: 0,
      providerUnsupported: 0,
      inactiveOrDelisted: 0,
      noLatestPrice: 0,
      staleLatestPrice: 0,
      requiredHistoryIncomplete: 0,
      insufficientBarsUnder120: 0,
      insufficientBarsUnder252: 0,
      missingRecentVolume: 0,
      corporateActionBlocked: 0,
    };
  }

  emptyTrustedReviewContextGapCounts() {
    return {
      missingSector: 0,
      missingIndustry: 0,
      missingMarketCap: 0,
      missingIsin: 0,
      missingListingDate: 0,
    };
  }

  trustedReviewDatePolicy(region: string, now: Date) {
    const todayTradingDate = tradingDateForRegion(region, now);
    const requiredDataThroughDate = latestCompletedTradingDateForRegion(region, now);
    if (!todayTradingDate) {
      return {
        targetTradingDate: null,
        requiredDataThroughDate,
      };
    }
    const targetTradingDate = this.isConfiguredTradingDate(region, todayTradingDate) && (!requiredDataThroughDate || requiredDataThroughDate < todayTradingDate)
      ? todayTradingDate
      : this.nextConfiguredTradingDate(region, todayTradingDate) || todayTradingDate;
    return {
      targetTradingDate,
      requiredDataThroughDate,
    };
  }

  reviewDataThroughDatePolicy(
    scope: { region: string; assetType: string },
    stocks: any[],
    statsBySymbol: Map<string, any>,
    latestCompletedDataThroughDate: string | null
  ) {
    const storedDataThroughDate = this.latestApprovedExchangeDataThroughDate(stocks, statsBySymbol)
      || this.latestStoredPriceDataThroughDate(stocks, statsBySymbol);
    let requiredDataThroughDate = latestCompletedDataThroughDate || storedDataThroughDate;

    if (storedDataThroughDate && latestCompletedDataThroughDate && storedDataThroughDate < latestCompletedDataThroughDate) {
      const previousTradingDate = this.previousConfiguredTradingDate(scope.region, latestCompletedDataThroughDate);
      if (previousTradingDate && storedDataThroughDate >= previousTradingDate) {
        requiredDataThroughDate = storedDataThroughDate;
      }
    }

    return {
      latestCompletedDataThroughDate,
      requiredDataThroughDate,
      storedDataThroughDate,
    };
  }

  latestApprovedExchangeDataThroughDate(stocks: any[], statsBySymbol: Map<string, any>): string | null {
    let latest: string | null = null;
    for (const stock of stocks) {
      const stats = this.host.priceStatsForStock(statsBySymbol, stock);
      const date = this.approvedExchangeLatestPriceDate(stats);
      if (date && (!latest || date > latest)) latest = date;
    }
    return latest;
  }

  latestStoredPriceDataThroughDate(stocks: any[], statsBySymbol: Map<string, any>): string | null {
    let latest: string | null = null;
    for (const stock of stocks) {
      const stats = this.host.priceStatsForStock(statsBySymbol, stock);
      const date = this.normalizeDateString(stats?.latestPriceDate);
      if (date && (!latest || date > latest)) latest = date;
    }
    return latest;
  }

  approvedExchangeLatestPriceDate(stats: any): string | null {
    const approvedDate = this.normalizeDateString(stats?.approvedExchangeLatestPriceDate);
    if (approvedDate) return approvedDate;
    if (stats && stats.approvedExchangePriceRows === undefined && stats.sourceFileImportPriceRows === undefined) {
      return this.normalizeDateString(stats.latestPriceDate);
    }
    return null;
  }

  trustedReviewSupportEvidence(stock: any, stats: any, providerStatus: string) {
    if (providerStatus === 'SUPPORTED') return { supported: true, source: 'PROVIDER_SUPPORTED' };
    const hasExchangeIdentity = this.hasApprovedExchangeIdentity(stock);
    const approvedRows = Number(stats?.approvedExchangePriceRows || 0);
    const sourceFileRows = Number(stats?.sourceFileImportPriceRows || 0);
    const latestDate = this.normalizeDateString(stats?.latestPriceDate);
    const approvedLatestDate = this.approvedExchangeLatestPriceDate(stats);
    const latestSnapshotDate = this.normalizeDateString(stats?.latestSnapshotDate);
    const snapshotMatches = !latestSnapshotDate || !latestDate || latestSnapshotDate >= latestDate;
    const latestHasApprovedEvidence = Boolean(
      approvedLatestDate
      && latestDate
      && approvedLatestDate >= latestDate
      && (stats?.approvedExchangeLatestSource || stats?.approvedExchangeLatestSourceFileImportId || stats?.latestSourceFileImportId)
    );
    const supported = hasExchangeIdentity
      && snapshotMatches
      && (approvedRows > 0 || sourceFileRows > 0)
      && latestHasApprovedEvidence;
    return {
      supported,
      source: supported ? 'NSE_BSE_EXCHANGE_EVIDENCE' : 'MISSING_NSE_BSE_EXCHANGE_EVIDENCE',
    };
  }

  hasApprovedExchangeIdentity(stock: any): boolean {
    const directExchange = String(stock?.exchange || '').trim().toUpperCase();
    if (directExchange === 'NSE' || directExchange === 'BSE') return true;
    const identities = Array.isArray(stock?.exchangeIdentities) ? stock.exchangeIdentities : [];
    return identities.some((identity: any) => {
      const exchange = String(identity?.exchange || '').trim().toUpperCase();
      const status = String(identity?.status || '').trim().toUpperCase();
      return (exchange === 'NSE' || exchange === 'BSE') && (!status || !['DELISTED', 'INACTIVE', 'UNSUPPORTED'].includes(status));
    });
  }

  normalizeDateString(value: unknown): string | null {
    if (!value) return null;
    if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString().slice(0, 10);
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  isConfiguredTradingDate(region: string, date: string) {
    const config = getMarketSessionConfig(region);
    if (!config) return false;
    const cursor = this.utcDateAtNoon(date);
    const weekday = cursor.getUTCDay();
    return config.weekdays.includes(weekday) && !config.holidays.includes(date);
  }

  nextConfiguredTradingDate(region: string, date: string) {
    const config = getMarketSessionConfig(region);
    if (!config) return null;
    const cursor = this.utcDateAtNoon(date);
    for (let i = 0; i < 10; i += 1) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      const candidate = cursor.toISOString().slice(0, 10);
      if (config.weekdays.includes(cursor.getUTCDay()) && !config.holidays.includes(candidate)) return candidate;
    }
    return null;
  }

  previousConfiguredTradingDate(region: string, date: string) {
    const config = getMarketSessionConfig(region);
    if (!config) return null;
    const cursor = this.utcDateAtNoon(date);
    for (let i = 0; i < 10; i += 1) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      const candidate = cursor.toISOString().slice(0, 10);
      if (config.weekdays.includes(cursor.getUTCDay()) && !config.holidays.includes(candidate)) return candidate;
    }
    return null;
  }

  utcDateAtNoon(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  trustedReviewContextGaps(stock: any): string[] {
    const gaps: string[] = [];
    if (!this.host.hasValidMetadataValue(stock.sector)) gaps.push('sector');
    if (!this.host.hasValidMetadataValue(stock.industry)) gaps.push('industry');
    if (!this.host.hasValidMarketCap(stock.marketCap)) gaps.push('marketCap');
    if (this.host.isBlank(stock.isin)) gaps.push('isin');
    if (!stock.ipoDate) gaps.push('listingDate');
    return gaps;
  }

  reviewReadinessBlockers(
    scope: { region: string; assetType: string },
    health: MarketDataUniverseHealth,
    reviewUniverse: TrustedReviewUniverseHealth,
    repairPlan: MarketDataRepairPlan
  ): ReviewReadinessBlocker[] {
    const blockers: ReviewReadinessBlocker[] = [];
    const add = (blocker: ReviewReadinessBlocker) => {
      if (blocker.affectedCount > 0) blockers.push(blocker);
    };
    const boundedRequest = { batchSize: 50, region: scope.region, assetType: scope.assetType };
    const providerUnknown = repairPlan.providerUnknownValidationNeeded ?? repairPlan.providerValidationNeeded ?? 0;
    const providerRetry = repairPlan.providerRetryValidationNeeded ?? repairPlan.retryFailedValidations ?? 0;
    add({
      category: 'PROVIDER_VALIDATION',
      severity: 'CONTEXT_GAP',
      affectedCount: providerUnknown + providerRetry,
      explanation: 'Legacy provider status is not authoritative for NSE/BSE review readiness; rows without exchange-file evidence remain outside the trusted set until official prices or exchange identity are present.',
      nextActionCode: 'REVIEW_REPAIR_PLAN',
      nextActionLabel: 'Review exchange evidence',
      actionRoute: '/market-data?tab=data-health',
      boundedRequest,
    });
    add({
      category: 'CATALOG_IDENTITY',
      severity: 'HARD_BLOCKER',
      affectedCount: repairPlan.supportedCatalogIdentityRepairNeeded ?? repairPlan.catalogIdentityRepairNeeded ?? 0,
      explanation: 'Provider-supported instruments still need deterministic catalog identity fields before strict review signoff.',
      nextActionCode: 'CATALOG_IDENTITY_REPAIR',
      nextActionLabel: this.host.repairRunActionLabel('CATALOG_IDENTITY_REPAIR'),
      actionRoute: '/market-data?tab=data-health',
      boundedRequest,
    });
    add({
      category: 'PRICE_BACKFILL',
      severity: reviewUniverse.mode === 'NO_REVIEW' ? 'HARD_BLOCKER' : 'CONTEXT_GAP',
      affectedCount: repairPlan.supportedPriceBackfillNeeded ?? repairPlan.priceBackfillNeeded ?? 0,
      explanation: reviewUniverse.mode === 'NO_REVIEW'
        ? 'Official EOD evidence is insufficient for the minimum trusted review universe.'
        : 'Additional historical/backfill work remains for strict signoff, but the trusted review universe already has enough official EOD evidence for review.',
      nextActionCode: 'BACKFILL_PRICES',
      nextActionLabel: this.host.repairRunActionLabel('BACKFILL_PRICES'),
      actionRoute: '/market-data?tab=data-health',
      boundedRequest,
    });
    add({
      category: 'STALE_EOD',
      severity: 'HARD_BLOCKER',
      affectedCount: reviewUniverse.excludedCounts.staleLatestPrice,
      explanation: 'Stored EOD data is older than the required data-through date for these instruments.',
      nextActionCode: 'BACKFILL_PRICES',
      nextActionLabel: this.host.repairRunActionLabel('BACKFILL_PRICES'),
      actionRoute: '/market-data?tab=data-health',
      boundedRequest,
    });
    add({
      category: 'BUSINESS_METADATA',
      severity: 'CONTEXT_GAP',
      affectedCount: repairPlan.businessMetadataAutoRepairable + repairPlan.businessMetadataRetryEligible + repairPlan.manualBusinessMetadataRequired,
      explanation: 'Business metadata gaps reduce context quality; Lite review can proceed for price-ready instruments but strict signoff remains incomplete.',
      nextActionCode: repairPlan.businessMetadataAutoRepairable + repairPlan.businessMetadataRetryEligible > 0 ? 'PROVIDER_BUSINESS_METADATA_REPAIR' : 'MANUAL_METADATA_IMPORT',
      nextActionLabel: repairPlan.businessMetadataAutoRepairable + repairPlan.businessMetadataRetryEligible > 0
        ? this.host.repairRunActionLabel('PROVIDER_BUSINESS_METADATA_REPAIR')
        : this.host.repairRunActionLabel('MANUAL_METADATA_IMPORT'),
      actionRoute: '/market-data?tab=data-health',
      boundedRequest,
    });
    const trustedShortfall = Math.max(0, reviewUniverse.minLiteCount - reviewUniverse.trustedCount);
    add({
      category: 'INSUFFICIENT_TRUSTED_UNIVERSE',
      severity: reviewUniverse.mode === 'NO_REVIEW' ? 'HARD_BLOCKER' : 'LIMITED_REVIEW',
      affectedCount: trustedShortfall || (reviewUniverse.mode === 'LIMITED_REVIEW' ? Math.max(0, reviewUniverse.minFullCount - reviewUniverse.trustedCount) : 0),
      explanation: reviewUniverse.mode === 'NO_REVIEW'
        ? 'Trusted review universe is below the minimum Lite threshold, so Today Review cannot publish candidates.'
        : 'Trusted review universe is below the full-review threshold, so Today Review runs in limited mode.',
      nextActionCode: 'REVIEW_REPAIR_PLAN',
      nextActionLabel: 'Review bounded repair plan',
      actionRoute: '/market-data?tab=data-health',
      boundedRequest,
    });
    if (!health.expectedLatestTradingDate || !reviewUniverse.requiredDataThroughDate) {
      add({
        category: 'MARKET_CALENDAR_UNCERTAIN',
        severity: 'HARD_BLOCKER',
        affectedCount: 1,
        explanation: 'The latest required trading date is unavailable, so EOD review freshness cannot be proven.',
        nextActionCode: 'WAIT',
        nextActionLabel: 'Wait for market calendar confirmation',
        actionRoute: '/market-data?tab=data-health',
      });
    }
    return blockers.sort((left, right) => {
      const severityRank = { HARD_BLOCKER: 0, LIMITED_REVIEW: 1, CONTEXT_GAP: 2 };
      return severityRank[left.severity] - severityRank[right.severity] || right.affectedCount - left.affectedCount;
    });
  }

  reviewReadinessNextAction(blockers: ReviewReadinessBlocker[]): ReviewReadinessNextAction | null {
    const actionPriority = ['BACKFILL_PRICES', 'CATALOG_IDENTITY_REPAIR', 'PROVIDER_BUSINESS_METADATA_REPAIR', 'MANUAL_METADATA_IMPORT', 'REVIEW_REPAIR_PLAN', 'WAIT'];
    const ordered = [...blockers].sort((left, right) => {
      const severityRank = { HARD_BLOCKER: 0, LIMITED_REVIEW: 1, CONTEXT_GAP: 2 };
      const leftActionRank = actionPriority.indexOf(left.nextActionCode);
      const rightActionRank = actionPriority.indexOf(right.nextActionCode);
      return severityRank[left.severity] - severityRank[right.severity]
        || (leftActionRank === -1 ? actionPriority.length : leftActionRank) - (rightActionRank === -1 ? actionPriority.length : rightActionRank)
        || right.affectedCount - left.affectedCount;
    });
    const blocker = ordered.find((item) => !['WAIT', 'REVIEW_REPAIR_PLAN'].includes(item.nextActionCode))
      || ordered.find((item) => item.nextActionCode !== 'WAIT')
      || ordered[0];
    if (!blocker) return null;
    return {
      code: blocker.nextActionCode,
      label: blocker.nextActionLabel,
      actionRoute: blocker.actionRoute,
      boundedRequest: blocker.boundedRequest,
    };
  }

  reviewReadinessUserDecision(
    mode: TrustedReviewUniverseMode,
    trustStatus: UniverseTrustStatus,
    blockers: ReviewReadinessBlocker[],
    nextAction: ReviewReadinessNextAction | null
  ): ReviewReadinessSummary['userDecision'] {
    if (mode === 'FULL_REVIEW' && trustStatus === 'OK' && blockers.every((blocker) => blocker.severity !== 'HARD_BLOCKER')) return 'READY_FOR_REVIEW';
    if (mode === 'NO_REVIEW') return nextAction && nextAction.code !== 'WAIT' ? 'REPAIR_DATA' : 'WAIT';
    if (blockers.some((blocker) => blocker.severity === 'HARD_BLOCKER' && blocker.category !== 'INSUFFICIENT_TRUSTED_UNIVERSE')) return 'REPAIR_DATA';
    return 'PROCEED_LIMITED';
  }
}
