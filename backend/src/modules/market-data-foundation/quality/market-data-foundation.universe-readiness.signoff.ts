// Auto-extracted universe-readiness sibling (Phase 5b). Bodies are byte-identical to the
// pre-extraction inline implementation in market-data-foundation.service.ts, except that
// stays-on-service / cross-cluster collaborators are reached through the host
// (this.X -> this.host.X) and the snapshot-cache field (substrate only) now lives on this class.
// The service constructs this once and keeps byte-identical public delegators.

import type { MarketDataUniverseReadinessHost } from './market-data-foundation.universe-readiness-host';
import type {
  MarketDataRepairPlan,
  MarketDataRepairRunAction,
  MarketDataUniverseSignoff,
  MarketDataUniverseHealth,
  InstrumentUniverseReadiness,
} from '../market-data-foundation.types';
import { UNIVERSE_STATES } from '../ingestion/market-data-foundation.universe';

export class UniverseSignoffService {
  constructor(private readonly host: MarketDataUniverseReadinessHost) {}

  public emptyUniverseCounts(): MarketDataUniverseHealth['counts'] {
    const counts = {
      byUniverseState: Object.fromEntries(UNIVERSE_STATES.map((state) => [state, 0])) as unknown as MarketDataUniverseHealth['counts']['byUniverseState'],
      readiness: {
        priceReady: 0,
        contextReady: 0,
        reviewReady: 0,
      },
      totalCatalogInstruments: 0,
      activeInstruments: 0,
      inactiveOrDelistedInstruments: 0,
      providerSupported: 0,
      providerUnknown: 0,
      providerUnknownValidationNeeded: 0,
      providerRetryValidationNeeded: 0,
      providerRetryBlocked: 0,
      providerManualRepairRequired: 0,
      nextProviderRetryAtMin: null,
      historyCoverageIncomplete: 0,
      historyCoverageListingDateMissing: 0,
      historyCoverageFallbackRequired: 0,
      providerUnsupportedExcluded: 0,
      providerValidationFailed: 0,
      unsupported: 0,
      unsupportedExcluded: 0,
      supportedCatalogIdentityRepairNeeded: 0,
      supportedBusinessMetadataRepairNeeded: 0,
      supportedPriceBackfillNeeded: 0,
      catalogOnly: 0,
      priceReady: 0,
      contextReady: 0,
      reviewReady: 0,
      staleOrIncomplete: 0,
      missingLatestPrice: 0,
      staleLatestPrice: 0,
      missingOrInadequatePriceHistory: 0,
      missingRecentVolume: 0,
      missingSector: 0,
      missingIndustry: 0,
      missingCountry: 0,
      missingCurrency: 0,
      missingMarketCap: 0,
      missingIsin: 0,
      missingListingDate: 0,
    } as MarketDataUniverseHealth['counts'];
    for (const state of UNIVERSE_STATES) {
      counts[state] = 0;
    }
    return counts;
  }

  latestDateFromReadiness(readinessBySymbol: Map<string, InstrumentUniverseReadiness>): string | null {
    let latest: string | null = null;
    for (const readiness of readinessBySymbol.values()) {
      if (readiness.latestPriceDate && (!latest || readiness.latestPriceDate > latest)) latest = readiness.latestPriceDate;
    }
    return latest;
  }

  public percent(value: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return Number(((value / denominator) * 100).toFixed(1));
  }

  minReviewReadyRequired(): number {
    return Math.max(this.host.readPositiveNumber(process.env.MARKET_DATA_SIGNOFF_MIN_REVIEW_READY, 300), 1);
  }

  public universeSignoffFromHealth(health: Omit<MarketDataUniverseHealth, 'universeSignoff'>): MarketDataUniverseSignoff {
    const counts = health.counts;
    const planLike = {
      providerValidationNeeded: counts.providerUnknownValidationNeeded ?? counts.providerUnknown,
      retryFailedValidations: counts.providerRetryValidationNeeded ?? counts.providerValidationFailed ?? 0,
      catalogIdentityRepairNeeded: counts.supportedCatalogIdentityRepairNeeded ?? Math.max(counts.missingIsin, counts.missingListingDate),
      businessMetadataAutoRepairable: counts.supportedBusinessMetadataRepairNeeded ?? Math.max(counts.missingSector, counts.missingIndustry, counts.missingMarketCap),
      businessMetadataRetryEligible: 0,
      manualBusinessMetadataRequired: counts.supportedBusinessMetadataRepairNeeded ?? Math.max(counts.missingSector, counts.missingIndustry, counts.missingMarketCap),
      priceBackfillNeeded: counts.supportedPriceBackfillNeeded ?? counts.staleOrIncomplete,
      historyCoverageFallbackRequired: counts.historyCoverageFallbackRequired ?? 0,
    };
    return this.buildUniverseSignoff({
      providerUnknown: counts.providerUnknown,
      providerRetryValidationNeeded: planLike.retryFailedValidations,
      catalogIdentityRepairNeeded: planLike.catalogIdentityRepairNeeded,
      businessMetadataAutoRepairable: planLike.businessMetadataAutoRepairable,
      businessMetadataRetryEligible: planLike.businessMetadataRetryEligible,
      priceBackfillNeeded: planLike.priceBackfillNeeded,
      historyCoverageFallbackRequired: planLike.historyCoverageFallbackRequired,
      latestStoredEodDate: health.latestStoredEodDate,
      expectedLatestTradingDate: health.expectedLatestTradingDate,
      reviewReadyActual: counts.reviewReady,
      reviewReadyPercentage: health.coverage.reviewReadyPercentage,
      manualBusinessMetadataRequired: planLike.manualBusinessMetadataRequired,
      trustStatus: health.trustStatus,
    });
  }

  universeSignoffFromRepairPlan(
    plan: Pick<MarketDataRepairPlan,
      'providerValidationNeeded'
      | 'retryFailedValidations'
      | 'catalogIdentityRepairNeeded'
      | 'supportedCatalogIdentityRepairNeeded'
      | 'businessMetadataAutoRepairable'
      | 'businessMetadataRetryEligible'
      | 'manualBusinessMetadataRequired'
      | 'priceBackfillNeeded'
      | 'supportedPriceBackfillNeeded'
      | 'historyCoverageFallbackRequired'
      | 'totalCatalogInstruments'>,
    evidence: {
      activeInstruments: number;
      reviewReadyActual: number;
      latestStoredEodDate: string | null;
      expectedLatestTradingDate: string | null;
      trustStatus?: MarketDataUniverseHealth['trustStatus'];
    }
  ): MarketDataUniverseSignoff {
    const reviewReadyPercentage = this.percent(evidence.reviewReadyActual, evidence.activeInstruments || plan.totalCatalogInstruments || 1);
    const supportedCatalogIdentityRepairNeeded = plan.supportedCatalogIdentityRepairNeeded ?? plan.catalogIdentityRepairNeeded;
    const supportedPriceBackfillNeeded = plan.supportedPriceBackfillNeeded ?? plan.priceBackfillNeeded;
    const impliedTrustStatus: MarketDataUniverseHealth['trustStatus'] = plan.providerValidationNeeded === 0
      && plan.retryFailedValidations === 0
      && supportedCatalogIdentityRepairNeeded === 0
      && plan.businessMetadataAutoRepairable + plan.businessMetadataRetryEligible === 0
      && plan.manualBusinessMetadataRequired === 0
      && supportedPriceBackfillNeeded === 0
      && Boolean(evidence.latestStoredEodDate && evidence.expectedLatestTradingDate && evidence.latestStoredEodDate >= evidence.expectedLatestTradingDate)
      && evidence.reviewReadyActual >= this.minReviewReadyRequired()
      && reviewReadyPercentage >= 10
      ? 'OK'
      : 'NOT_TRUSTWORTHY';
    return this.buildUniverseSignoff({
      providerUnknown: plan.providerValidationNeeded,
      providerRetryValidationNeeded: plan.retryFailedValidations,
      catalogIdentityRepairNeeded: supportedCatalogIdentityRepairNeeded,
      businessMetadataAutoRepairable: plan.businessMetadataAutoRepairable,
      businessMetadataRetryEligible: plan.businessMetadataRetryEligible,
      priceBackfillNeeded: supportedPriceBackfillNeeded,
      historyCoverageFallbackRequired: plan.historyCoverageFallbackRequired ?? 0,
      latestStoredEodDate: evidence.latestStoredEodDate,
      expectedLatestTradingDate: evidence.expectedLatestTradingDate,
      reviewReadyActual: evidence.reviewReadyActual,
      reviewReadyPercentage,
      manualBusinessMetadataRequired: plan.manualBusinessMetadataRequired,
      trustStatus: evidence.trustStatus || impliedTrustStatus,
    });
  }

  buildUniverseSignoff(input: {
    providerUnknown: number;
    providerRetryValidationNeeded: number;
    catalogIdentityRepairNeeded: number;
    businessMetadataAutoRepairable: number;
    businessMetadataRetryEligible: number;
    priceBackfillNeeded: number;
    historyCoverageFallbackRequired?: number;
    latestStoredEodDate: string | null;
    expectedLatestTradingDate: string | null;
    reviewReadyActual: number;
    reviewReadyPercentage: number;
    manualBusinessMetadataRequired: number;
    trustStatus: MarketDataUniverseHealth['trustStatus'];
  }): MarketDataUniverseSignoff {
    const minReviewReadyRequired = this.minReviewReadyRequired();
    const blockers: MarketDataUniverseSignoff['blockers'] = [];
    const addBlocker = (
      code: string,
      count: number,
      required: number | string,
      nextAction: MarketDataRepairRunAction | 'MANUAL_METADATA_IMPORT' | null,
      severity: 'warning' | 'critical' = 'critical'
    ) => {
      if (count > 0) blockers.push({ code, severity, count, required, nextAction });
    };

    addBlocker('PROVIDER_UNKNOWN_REMAINING', input.providerUnknown, 0, 'VALIDATE_PROVIDERS');
    addBlocker('PROVIDER_VALIDATION_RETRY_FAILED_REMAINING', input.providerRetryValidationNeeded, 0, 'RETRY_FAILED_PROVIDERS');
    addBlocker('CATALOG_IDENTITY_REPAIR_REMAINING', input.catalogIdentityRepairNeeded, 0, 'CATALOG_IDENTITY_REPAIR');
    addBlocker('BUSINESS_METADATA_AUTO_REPAIRABLE_REMAINING', input.businessMetadataAutoRepairable, 0, 'PROVIDER_BUSINESS_METADATA_REPAIR');
    addBlocker('BUSINESS_METADATA_RETRY_ELIGIBLE_REMAINING', input.businessMetadataRetryEligible, 0, 'PROVIDER_BUSINESS_METADATA_REPAIR');
    addBlocker('PRICE_BACKFILL_REMAINING', input.priceBackfillNeeded, 0, 'BACKFILL_PRICES');
    addBlocker('PRICE_BACKFILL_FALLBACK_REQUIRED', input.historyCoverageFallbackRequired ?? 0, 0, null);
    addBlocker('MANUAL_BUSINESS_METADATA_REQUIRED', input.manualBusinessMetadataRequired, 0, 'MANUAL_METADATA_IMPORT');
    if (!input.latestStoredEodDate || !input.expectedLatestTradingDate || input.latestStoredEodDate < input.expectedLatestTradingDate) {
      blockers.push({
        code: 'LATEST_EOD_BEHIND_EXPECTED',
        severity: 'critical',
        count: 1,
        required: input.expectedLatestTradingDate || 'known expected trading date',
        nextAction: input.priceBackfillNeeded > 0 ? 'BACKFILL_PRICES' : null,
      });
    }
    if (input.reviewReadyActual < minReviewReadyRequired) {
      blockers.push({
        code: 'REVIEW_READY_BELOW_MINIMUM',
        severity: 'critical',
        count: input.reviewReadyActual,
        required: minReviewReadyRequired,
        nextAction: this.signoffNextActionFromCounts(input),
      });
    }
    if (input.reviewReadyPercentage < 10) {
      blockers.push({
        code: 'REVIEW_READY_PERCENTAGE_BELOW_MINIMUM',
        severity: 'critical',
        count: input.reviewReadyPercentage,
        required: '>=10%',
        nextAction: this.signoffNextActionFromCounts(input),
      });
    }
    if (input.trustStatus !== 'OK') {
      blockers.push({
        code: 'TRUST_STATUS_NOT_OK',
        severity: 'critical',
        count: 1,
        required: 'OK',
        nextAction: this.signoffNextActionFromCounts(input),
      });
    }

    const nextAction = blockers.find((blocker) => blocker.nextAction)?.nextAction || null;
    const status = blockers.length === 0 ? 'PASS' : 'FAIL';
    return {
      status,
      minReviewReadyRequired,
      reviewReadyActual: input.reviewReadyActual,
      blockers,
      nextAction,
      downstreamAllowed: status === 'PASS',
    };
  }

  signoffNextActionFromCounts(input: {
    providerUnknown: number;
    providerRetryValidationNeeded: number;
    catalogIdentityRepairNeeded: number;
    businessMetadataAutoRepairable: number;
    businessMetadataRetryEligible: number;
    priceBackfillNeeded: number;
    manualBusinessMetadataRequired: number;
  }): MarketDataRepairRunAction | 'MANUAL_METADATA_IMPORT' | null {
    if (input.providerUnknown > 0) return 'VALIDATE_PROVIDERS';
    if (input.providerRetryValidationNeeded > 0) return 'RETRY_FAILED_PROVIDERS';
    if (input.catalogIdentityRepairNeeded > 0) return 'CATALOG_IDENTITY_REPAIR';
    if (input.businessMetadataAutoRepairable > 0 || input.businessMetadataRetryEligible > 0) return 'PROVIDER_BUSINESS_METADATA_REPAIR';
    if (input.priceBackfillNeeded > 0) return 'BACKFILL_PRICES';
    if (input.manualBusinessMetadataRequired > 0) return 'MANUAL_METADATA_IMPORT';
    return null;
  }

  topUniverseBlockers(blockerCounts: Map<string, number>): MarketDataUniverseHealth['topBlockers'] {
    const labels: Record<string, string> = {
      PROVIDER_UNKNOWN: 'Provider support not validated',
      PROVIDER_UNSUPPORTED: 'Provider validation failed or unsupported',
      PROVIDER_SYMBOL_MISSING: 'Provider symbol missing',
      MISSING_LATEST_PRICE: 'Latest EOD price missing',
      STALE_LATEST_PRICE: 'Latest EOD price is stale',
      INADEQUATE_PRICE_HISTORY: 'Less than 252 daily bars',
      INADEQUATE_SMA200_HISTORY: 'Less than 200 daily bars',
      INADEQUATE_ROLLING_PRICE_WINDOW: 'Last 252-session window is incomplete',
      PRICE_HISTORY_GAPS: 'Price history has large date gaps',
      MISSING_RECENT_VOLUME: 'Recent volume missing',
      LOW_RECENT_VOLUME_COVERAGE: 'Recent volume coverage is incomplete',
      MISSING_SECTOR: 'Sector metadata missing',
      MISSING_INDUSTRY: 'Industry metadata missing',
      MISSING_COUNTRY: 'Country metadata missing',
      MISSING_CURRENCY: 'Currency metadata missing',
      MISSING_MARKET_CAP: 'Market cap metadata missing',
      MISSING_ISIN: 'ISIN metadata missing',
      MISSING_LISTING_DATE: 'Listing date metadata missing',
      DELISTED_OR_INACTIVE: 'Inactive or delisted instrument',
      CRITICAL_PROVIDER_SYMBOL_MISMATCH: 'Critical provider symbol mismatch',
    };
    return Array.from(blockerCounts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 10)
      .map(([code, count]) => ({
        code,
        label: labels[code] || code.replace(/_/g, ' ').toLowerCase(),
        count,
        severity: this.isCriticalUniverseBlocker(code) ? 'critical' : 'warning',
      }));
  }

  public universeTrustStatus(
    counts: MarketDataUniverseHealth['counts'],
    coverage: MarketDataUniverseHealth['coverage']
  ): MarketDataUniverseHealth['trustStatus'] {
    if (counts.totalCatalogInstruments === 0) return 'NOT_TRUSTWORTHY';
    if (counts.activeInstruments > 0 && counts.providerUnknown >= counts.activeInstruments) return 'NOT_TRUSTWORTHY';
    if (counts.reviewReady === 0) return 'NOT_TRUSTWORTHY';
    if (coverage.priceCoveragePercentage < 50 || coverage.metadataCoveragePercentage < 50) return 'NOT_TRUSTWORTHY';
    if (counts.catalogOnly > 0 || counts.staleOrIncomplete > 0 || counts.unsupported > 0) return 'PARTIAL';
    return 'OK';
  }

  public universeTrustReasons(
    counts: MarketDataUniverseHealth['counts'],
    coverage: MarketDataUniverseHealth['coverage']
  ): string[] {
    const reasons: string[] = [];
    if (counts.totalCatalogInstruments === 0) reasons.push('No scoped catalog instruments were found.');
    if (counts.activeInstruments > 0 && counts.providerUnknown >= counts.activeInstruments) {
      reasons.push('Provider support is UNKNOWN for the entire active scoped universe.');
    } else if (counts.providerUnknown > 0) {
      reasons.push(`${counts.providerUnknown} active instruments still need provider validation.`);
    }
    if (counts.reviewReady === 0 && counts.totalCatalogInstruments > 0) reasons.push('Review-ready universe is empty under strict rules.');
    if (coverage.priceCoveragePercentage < 50) reasons.push(`Price coverage is ${coverage.priceCoveragePercentage}%.`);
    if (coverage.metadataCoveragePercentage < 50) reasons.push(`Metadata coverage is ${coverage.metadataCoveragePercentage}%.`);
    if (counts.catalogOnly > 0) reasons.push(`${counts.catalogOnly} instruments are catalog-only and not reviewable.`);
    if (counts.staleOrIncomplete > 0) reasons.push(`${counts.staleOrIncomplete} provider-supported instruments have stale or incomplete prices.`);
    return reasons.length > 0 ? reasons : ['Universe health satisfies strict review-ready checks.'];
  }

  isCriticalUniverseBlocker(code: string): boolean {
    return [
      'PROVIDER_UNKNOWN',
      'PROVIDER_UNSUPPORTED',
      'MISSING_LATEST_PRICE',
      'STALE_LATEST_PRICE',
      'INADEQUATE_PRICE_HISTORY',
      'INADEQUATE_ROLLING_PRICE_WINDOW',
      'PRICE_HISTORY_GAPS',
      'MISSING_RECENT_VOLUME',
      'LOW_RECENT_VOLUME_COVERAGE',
      'MISSING_SECTOR',
      'MISSING_INDUSTRY',
      'MISSING_MARKET_CAP',
      'MISSING_ISIN',
      'MISSING_LISTING_DATE',
      'CRITICAL_PROVIDER_SYMBOL_MISMATCH',
    ].includes(code);
  }
}
