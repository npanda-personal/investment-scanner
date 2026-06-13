// Auto-extracted universe-readiness sibling (Phase 5b). Bodies are byte-identical to the
// pre-extraction inline implementation in market-data-foundation.service.ts, except that
// stays-on-service / cross-cluster collaborators are reached through the host
// (this.X -> this.host.X) and the snapshot-cache field (substrate only) now lives on this class.
// The service constructs this once and keeps byte-identical public delegators.

import type { MarketDataUniverseReadinessHost } from './market-data-foundation.universe-readiness-host';
import type {
  MarketDataRepairPlan,
  MarketDataUniverseHealth,
  PaginationOptions,
} from '../market-data-foundation.types';
import type {
  UniverseComputationSnapshot,
} from './market-data-foundation.universe-readiness.types';
import { latestCompletedTradingDateForRegion } from '../ingestion/market-data-foundation.market-session';
import { normalizeProviderStatus } from '../ingestion/market-data-foundation.universe';
import { isCryptoScope } from '../../../shared/data-access/market-repository-router';

export class UniverseHealthService {
  constructor(private readonly host: MarketDataUniverseReadinessHost) {}

  async universeHealth(
    options: Pick<PaginationOptions, 'region' | 'assetType'> = {},
    snapshot?: UniverseComputationSnapshot
  ): Promise<MarketDataUniverseHealth> {
    // Crypto scope → reduced, honest universe-health (price coverage only; the equity
    // readiness/blocker model — ISIN, sector, delivery — is not applicable to crypto).
    if (isCryptoScope(options)) {
      return this.host.cryptoUniverseHealth();
    }
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const activeSnapshot = snapshot ?? await this.host.tryUniverseComputationSnapshot(scope);
    const stocks = activeSnapshot?.stocks ?? await this.host.repository.listStocksForUniverseHealth(scope);
    const readinessAndStats = activeSnapshot ? null : await this.host.universeReadinessAndStatsForStocks(stocks, scope);
    const readinessBySymbol = activeSnapshot?.readinessBySymbol ?? readinessAndStats!.readinessBySymbol;
    const statsBySymbol = activeSnapshot?.statsBySymbol ?? readinessAndStats!.statsBySymbol;
    const validationWindow = activeSnapshot?.validationWindow ?? this.host.providerValidationWindow(scope);
    const latestStoredEodDate = this.host.latestDateFromReadiness(readinessBySymbol);
    const expectedLatestTradingDate = this.host.reviewDataThroughDatePolicy(
      scope,
      stocks,
      statsBySymbol,
      latestCompletedTradingDateForRegion(scope.region)
    ).requiredDataThroughDate;
    const priceBackfillBlockedStockIds = activeSnapshot?.priceBackfillBlockedStockIds ?? await this.host.blockedPriceBackfillStockIds(scope);
    const generatedAt = new Date().toISOString();
    const counts = this.host.emptyUniverseCounts();
    const blockerCounts = new Map<string, number>();
    let metadataCompleteCount = 0;

    for (const stock of stocks) {
      const readiness = readinessBySymbol.get(stock.symbol);
      if (!readiness) continue;
      counts.totalCatalogInstruments += 1;
      counts[readiness.universeState] += 1;
      counts.byUniverseState[readiness.universeState] += 1;
      const isInactiveOrDelisted = stock.isActive === false || stock.isDelisted === true;
      if (isInactiveOrDelisted) counts.inactiveOrDelistedInstruments += 1;
      else counts.activeInstruments += 1;
      const providerStatus = normalizeProviderStatus(stock.providerSupportStatus);
      if (!isInactiveOrDelisted) {
        const priceBackfillBlockReason = providerStatus === 'SUPPORTED'
          ? this.host.priceBackfillBlockReason(activeSnapshot?.repairStatesByStockId, stock.id, priceBackfillBlockedStockIds.has(stock.id))
          : null;
        let priceBackfillFallbackCounted = false;
        const recordSupportedPriceBackfillNeed = () => {
          if (priceBackfillBlockReason === 'retry') return;
          if (priceBackfillBlockReason === 'manual') {
            if (!priceBackfillFallbackCounted) {
              counts.historyCoverageFallbackRequired = (counts.historyCoverageFallbackRequired || 0) + 1;
              priceBackfillFallbackCounted = true;
            }
            return;
          }
          counts.supportedPriceBackfillNeeded += 1;
        };
        if (providerStatus === 'SUPPORTED') counts.providerSupported += 1;
        if (providerStatus === 'UNKNOWN') {
          counts.providerUnknown += 1;
          counts.providerUnknownValidationNeeded += 1;
        }
        if (providerStatus === 'VALIDATION_FAILED') {
          counts.providerRetryValidationNeeded += 1;
          counts.providerValidationFailed += 1;
        }
        if (providerStatus === 'UNSUPPORTED') {
          counts.unsupported += 1;
          counts.unsupportedExcluded += 1;
          counts.providerUnsupportedExcluded += 1;
        }
        if (providerStatus === 'VALIDATION_FAILED') counts.unsupported += 1;
        if (providerStatus === 'SUPPORTED' && (readiness.readinessBlockers.includes('MISSING_ISIN') || readiness.readinessBlockers.includes('MISSING_LISTING_DATE'))) {
          counts.supportedCatalogIdentityRepairNeeded += 1;
        }
        if (providerStatus === 'SUPPORTED' && (readiness.readinessBlockers.includes('MISSING_SECTOR') || readiness.readinessBlockers.includes('MISSING_INDUSTRY') || readiness.readinessBlockers.includes('MISSING_MARKET_CAP'))) {
          counts.supportedBusinessMetadataRepairNeeded += 1;
        }
        if (providerStatus === 'SUPPORTED' && readiness.priceReadiness !== 'READY') {
          recordSupportedPriceBackfillNeed();
        }
        if (providerStatus === 'SUPPORTED') {
          const historyDiagnostics = this.host.requiredHistoryDiagnostics(stock, validationWindow, this.host.priceStatsForStock(statsBySymbol, stock));
          if (!historyDiagnostics.requiredHistoryComplete) {
            counts.historyCoverageIncomplete = (counts.historyCoverageIncomplete || 0) + 1;
            if (readiness.priceReadiness === 'READY') recordSupportedPriceBackfillNeed();
          }
          if (historyDiagnostics.listingDateMissing) {
            counts.historyCoverageListingDateMissing = (counts.historyCoverageListingDateMissing || 0) + 1;
          }
        }
        if (readiness.universeState === 'CATALOG_ONLY') counts.catalogOnly += 1;
        if (readiness.universeState === 'STALE_OR_INCOMPLETE') counts.staleOrIncomplete += 1;
        if (readiness.isPriceReady) {
          counts.priceReady += 1;
          counts.readiness.priceReady += 1;
        }
        if (readiness.isContextReady) {
          counts.contextReady += 1;
          counts.readiness.contextReady += 1;
        }
        if (readiness.isReviewReady) {
          counts.reviewReady += 1;
          counts.readiness.reviewReady += 1;
        }
        if (!readiness.latestPriceDate) counts.missingLatestPrice += 1;
        if (readiness.readinessBlockers.includes('STALE_LATEST_PRICE')) counts.staleLatestPrice += 1;
        if (readiness.readinessBlockers.includes('INADEQUATE_PRICE_HISTORY') || readiness.readinessBlockers.includes('INADEQUATE_ROLLING_PRICE_WINDOW') || readiness.readinessBlockers.includes('PRICE_HISTORY_GAPS')) counts.missingOrInadequatePriceHistory += 1;
        if (readiness.readinessBlockers.includes('MISSING_RECENT_VOLUME') || readiness.readinessBlockers.includes('LOW_RECENT_VOLUME_COVERAGE')) counts.missingRecentVolume += 1;
        if (readiness.readinessBlockers.includes('MISSING_SECTOR')) counts.missingSector += 1;
        if (readiness.readinessBlockers.includes('MISSING_INDUSTRY')) counts.missingIndustry += 1;
        if (readiness.readinessBlockers.includes('MISSING_COUNTRY')) counts.missingCountry += 1;
        if (readiness.readinessBlockers.includes('MISSING_CURRENCY')) counts.missingCurrency += 1;
        if (readiness.readinessBlockers.includes('MISSING_MARKET_CAP')) counts.missingMarketCap += 1;
        if (readiness.readinessBlockers.includes('MISSING_ISIN')) counts.missingIsin += 1;
        if (readiness.readinessBlockers.includes('MISSING_LISTING_DATE')) counts.missingListingDate += 1;
        if (readiness.metadataCompletenessScore === 100) metadataCompleteCount += 1;
      }
      for (const blocker of readiness.readinessBlockers) {
        blockerCounts.set(blocker, (blockerCounts.get(blocker) || 0) + 1);
      }
    }

    const activeDenominator = counts.activeInstruments || counts.totalCatalogInstruments || 1;
    await this.host.assignProviderValidationQueueCounts(counts, scope, activeSnapshot);
    const coverage = {
      priceCoveragePercentage: this.host.percent(counts.priceReady, activeDenominator),
      metadataCoveragePercentage: this.host.percent(metadataCompleteCount, activeDenominator),
      reviewReadyPercentage: this.host.percent(counts.reviewReady, activeDenominator),
    };
    const warnings: string[] = [];
    if (counts.providerUnknown > 0) warnings.push(`${counts.providerUnknown} instruments still have UNKNOWN provider support.`);
    if (counts.providerRetryValidationNeeded > 0) warnings.push(`${counts.providerRetryValidationNeeded} provider validations failed and need an explicit retry or provider diagnosis.`);
    if (counts.missingLatestPrice > 0) warnings.push(`${counts.missingLatestPrice} instruments have no latest stored EOD price.`);
    if (counts.missingSector > 0 || counts.missingIndustry > 0) {
      warnings.push(`${counts.missingSector} instruments are missing sector and ${counts.missingIndustry} are missing industry metadata.`);
    }
    if (counts.missingIsin > 0 || counts.missingListingDate > 0) {
      warnings.push(`${counts.missingIsin} instruments are missing ISIN and ${counts.missingListingDate} are missing listing date metadata.`);
    }
    if (counts.reviewReady === 0 && counts.totalCatalogInstruments > 0) warnings.push('No instruments currently satisfy REVIEW_READY rules.');

    const trustReasons = this.host.universeTrustReasons(counts, coverage);
    const healthWithoutSignoff = {
      scope,
      generatedAt,
      latestStoredEodDate,
      expectedLatestTradingDate,
      counts,
      coverage,
      topBlockers: this.host.topUniverseBlockers(blockerCounts),
      warnings,
      trustStatus: this.host.universeTrustStatus(counts, coverage),
      trustReasons,
    } as Omit<MarketDataUniverseHealth, 'universeSignoff'>;
    return {
      ...healthWithoutSignoff,
      universeSignoff: this.host.universeSignoffFromHealth(healthWithoutSignoff),
    };
  }

  async repairPlan(
    options: Pick<PaginationOptions, 'region' | 'assetType'> = {},
    snapshot?: UniverseComputationSnapshot
  ): Promise<MarketDataRepairPlan> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const activeSnapshot = snapshot ?? await this.host.tryUniverseComputationSnapshot(scope);
    const stocks = activeSnapshot?.stocks ?? await this.host.repository.listStocksForUniverseHealth(scope);
    const readinessAndStats = activeSnapshot ? null : await this.host.universeReadinessAndStatsForStocks(stocks, scope);
    const readinessBySymbol = activeSnapshot?.readinessBySymbol ?? readinessAndStats!.readinessBySymbol;
    const statsBySymbol = activeSnapshot?.statsBySymbol ?? readinessAndStats!.statsBySymbol;
    const validationWindow = activeSnapshot?.validationWindow ?? this.host.providerValidationWindow(scope);
    const priceBackfillBlockedStockIds = activeSnapshot?.priceBackfillBlockedStockIds ?? await this.host.blockedPriceBackfillStockIds(scope);
    let providerUnknownValidationNeeded = 0;
    let providerRetryValidationNeeded = 0;
    let providerUnsupportedExcluded = 0;
    let providerValidationFailed = 0;
    let providerValidationNeeded = 0;
    let retryFailedValidations = 0;
    let providerRetryBlocked = 0;
    let providerManualRepairRequired = 0;
    let nextProviderRetryAtMin: string | null = null;
    let historyCoverageIncomplete = 0;
    let historyCoverageListingDateMissing = 0;
    let historyCoverageFallbackRequired = 0;
    let supportedCatalogIdentityRepairNeeded = 0;
    let supportedBusinessMetadataRepairNeeded = 0;
    let supportedPriceBackfillNeeded = 0;
    let unsupportedExcluded = 0;
    let catalogIdentityRepairNeeded = 0;
    let priceBackfillNeeded = 0;
    let businessMetadataRepairNeeded = 0;
    let businessMetadataAutoRepairable = 0;
    let businessMetadataManualRequired = 0;
    let businessMetadataRetryBlocked = 0;
    let businessMetadataRetryEligible = 0;
    let businessMetadataRecentlyAttempted = 0;
    let metadataEnrichmentNeeded = 0;
    let manualMetadataRequired = 0;
    let manualBusinessMetadataRequired = 0;
    let missingIsin = 0;
    let missingListingDate = 0;
    let missingSector = 0;
    let missingIndustry = 0;
    let missingMarketCap = 0;
    let manualSectorIndustryRequired = 0;
    let activeInstruments = 0;
    let reviewReadyActual = 0;
    let latestStoredEodDate: string | null = null;
    const expectedLatestTradingDate = latestCompletedTradingDateForRegion(scope.region);

    for (const stock of stocks) {
      if (stock.isActive === false || stock.isDelisted === true) continue;
      activeInstruments += 1;
      const providerStatus = normalizeProviderStatus(stock.providerSupportStatus);
      const readiness = readinessBySymbol.get(stock.symbol);
      if (readiness?.isReviewReady) reviewReadyActual += 1;
      if (readiness?.latestPriceDate && (!latestStoredEodDate || readiness.latestPriceDate > latestStoredEodDate)) latestStoredEodDate = readiness.latestPriceDate;
      const isProviderSupported = providerStatus === 'SUPPORTED';
      if (providerStatus === 'UNKNOWN') providerUnknownValidationNeeded += 1;
      if (providerStatus === 'VALIDATION_FAILED') {
        providerRetryValidationNeeded += 1;
        providerValidationFailed += 1;
      }
      if (providerStatus === 'UNSUPPORTED') {
        providerUnsupportedExcluded += 1;
        unsupportedExcluded += 1;
      }
      const priceBackfillFallbackRequired = isProviderSupported && priceBackfillBlockedStockIds.has(stock.id);
      const priceBackfillBlockReason = isProviderSupported
        ? this.host.priceBackfillBlockReason(activeSnapshot?.repairStatesByStockId, stock.id, priceBackfillFallbackRequired)
        : null;
      let priceBackfillFallbackCounted = false;
      const recordPriceBackfillNeed = () => {
        if (priceBackfillBlockReason === 'retry') return;
        if (priceBackfillBlockReason === 'manual') {
          if (!priceBackfillFallbackCounted) {
            historyCoverageFallbackRequired += 1;
            priceBackfillFallbackCounted = true;
          }
          return;
        }
        priceBackfillNeeded += 1;
        supportedPriceBackfillNeeded += 1;
      };
      if (this.host.needsCatalogIdentityRepair(stock)) catalogIdentityRepairNeeded += 1;
      if (isProviderSupported && this.host.needsCatalogIdentityRepair(stock)) supportedCatalogIdentityRepairNeeded += 1;
      if (isProviderSupported && readiness?.priceReadiness !== 'READY') {
        recordPriceBackfillNeed();
      }
      if (isProviderSupported) {
        const historyDiagnostics = this.host.requiredHistoryDiagnostics(stock, validationWindow, this.host.priceStatsForStock(statsBySymbol, stock));
        if (!historyDiagnostics.requiredHistoryComplete) {
          historyCoverageIncomplete += 1;
          if (readiness?.priceReadiness === 'READY') {
            recordPriceBackfillNeed();
          }
        }
        if (historyDiagnostics.listingDateMissing) historyCoverageListingDateMissing += 1;
      }
      if (this.host.needsBusinessMetadataRepair(stock)) businessMetadataRepairNeeded += 1;
      if (isProviderSupported && this.host.needsBusinessMetadataRepair(stock)) supportedBusinessMetadataRepairNeeded += 1;
      if (isProviderSupported && this.host.needsBusinessMetadataRepair(stock)) manualBusinessMetadataRequired += 1;
      if (this.host.needsMetadataEnrichment(stock)) metadataEnrichmentNeeded += 1;
      if (this.host.isBlank(stock.isin)) missingIsin += 1;
      if (!stock.ipoDate) missingListingDate += 1;
      if (!this.host.hasValidMetadataValue(stock.sector)) missingSector += 1;
      if (!this.host.hasValidMetadataValue(stock.industry)) missingIndustry += 1;
      if (!this.host.hasValidMarketCap(stock.marketCap)) missingMarketCap += 1;
      if (!this.host.hasValidMetadataValue(stock.sector) || !this.host.hasValidMetadataValue(stock.industry)) manualSectorIndustryRequired += 1;
      if (this.host.needsMetadataEnrichment(stock)) manualMetadataRequired += 1;
    }
    providerValidationNeeded = providerUnknownValidationNeeded;
    retryFailedValidations = providerRetryValidationNeeded;

    const repositoryAny = this.host.repository as any;
    let businessMetadataQueueRepairable = 0;
    const snapshotRepairCounts = activeSnapshot?.repairStatesByStockId
      ? this.host.repairPlanCountsFromSnapshot(activeSnapshot)
      : null;
    if (snapshotRepairCounts) {
      businessMetadataQueueRepairable = snapshotRepairCounts.businessMetadataQueueRepairable;
      businessMetadataAutoRepairable = snapshotRepairCounts.businessMetadataAutoRepairable;
      businessMetadataManualRequired = snapshotRepairCounts.businessMetadataManualRequired;
      businessMetadataRetryBlocked = snapshotRepairCounts.businessMetadataRetryBlocked;
      businessMetadataRetryEligible = snapshotRepairCounts.businessMetadataRetryEligible;
      businessMetadataRecentlyAttempted = snapshotRepairCounts.businessMetadataRecentlyAttempted;
      providerRetryBlocked = snapshotRepairCounts.providerRetryBlocked;
      providerManualRepairRequired = snapshotRepairCounts.providerManualRepairRequired;
      nextProviderRetryAtMin = snapshotRepairCounts.nextProviderRetryAtMin;
      providerRetryValidationNeeded = snapshotRepairCounts.providerRetryValidationNeeded(providerValidationFailed);
      retryFailedValidations = providerRetryValidationNeeded;
    } else if (typeof repositoryAny.countStocksForBusinessMetadataRepair === 'function') {
      businessMetadataQueueRepairable = await repositoryAny.countStocksForBusinessMetadataRepair({
        ...scope,
        includeManualRequired: false,
        includeRetryable: false,
      });
      businessMetadataAutoRepairable = businessMetadataQueueRepairable;
    } else {
      businessMetadataAutoRepairable = businessMetadataRepairNeeded;
      businessMetadataQueueRepairable = businessMetadataAutoRepairable;
    }
    if (!snapshotRepairCounts && typeof repositoryAny.countBusinessMetadataRepairStates === 'function') {
      businessMetadataManualRequired = await repositoryAny.countBusinessMetadataRepairStates({
        ...scope,
        statuses: ['MANUAL_REQUIRED'],
      });
      businessMetadataRetryBlocked = await repositoryAny.countBusinessMetadataRepairStates({
        ...scope,
        statuses: ['FAILED_RETRYABLE'],
        retryTiming: 'blocked',
      });
      businessMetadataRetryEligible = await repositoryAny.countBusinessMetadataRepairStates({
        ...scope,
        statuses: ['FAILED_RETRYABLE'],
        retryTiming: 'eligible',
      });
      const retryCooldown = await repositoryAny.countBusinessMetadataRepairStates({
        ...scope,
        statuses: ['RETRY_COOLDOWN'],
      });
      businessMetadataRecentlyAttempted = businessMetadataManualRequired + businessMetadataRetryBlocked + retryCooldown;
      businessMetadataAutoRepairable = Math.max(businessMetadataQueueRepairable - businessMetadataRetryEligible, 0);
    } else {
      businessMetadataRecentlyAttempted = Math.max(businessMetadataRepairNeeded - businessMetadataAutoRepairable, 0);
      businessMetadataManualRequired = businessMetadataRecentlyAttempted;
    }
    if (!snapshotRepairCounts && typeof repositoryAny.countProviderValidationRepairStates === 'function') {
      const [retryEligible, retryBlocked, manualRequired, nextRetryAt] = await Promise.all([
        repositoryAny.countProviderValidationRepairStates({ ...scope, status: 'eligible' }),
        repositoryAny.countProviderValidationRepairStates({ ...scope, status: 'blocked' }),
        repositoryAny.countProviderValidationRepairStates({ ...scope, status: 'manual' }),
        typeof repositoryAny.nextProviderValidationRetryAt === 'function'
          ? repositoryAny.nextProviderValidationRetryAt(scope)
          : Promise.resolve(null),
      ]);
      const knownStateTotal = retryEligible + retryBlocked + manualRequired;
      const retryWithoutState = Math.max(providerValidationFailed - knownStateTotal, 0);
      providerRetryBlocked = retryBlocked;
      providerManualRepairRequired = manualRequired;
      providerRetryValidationNeeded = retryEligible + retryWithoutState;
      retryFailedValidations = providerRetryValidationNeeded;
      nextProviderRetryAtMin = nextRetryAt ? nextRetryAt.toISOString() : null;
    }

    const warnings: string[] = [];
    if (providerValidationNeeded > 0) warnings.push(`${providerValidationNeeded} instruments still carry legacy UNKNOWN provider status; NSE/BSE review readiness uses exchange-file evidence, but full-catalog provider signoff remains incomplete.`);
    if (retryFailedValidations > 0) warnings.push(`${retryFailedValidations} failed provider validations need explicit retry or provider diagnosis.`);
    if (providerRetryBlocked > 0) warnings.push(`${providerRetryBlocked} provider validations are retry-blocked until cooldown expires.`);
    if (providerManualRepairRequired > 0) warnings.push(`${providerManualRepairRequired} provider validations require manual symbol/source repair.`);
    if (supportedCatalogIdentityRepairNeeded > 0) warnings.push(`${supportedCatalogIdentityRepairNeeded} provider-supported instruments need catalog identity repair for ISIN, listing date, exchange, or provider symbol.`);
    if (supportedPriceBackfillNeeded > 0) warnings.push(`${supportedPriceBackfillNeeded} provider-supported instruments need price backfill or latest EOD repair.`);
    if (historyCoverageFallbackRequired > 0) warnings.push(`${historyCoverageFallbackRequired} provider-supported instruments require approved free official/public exchange fallback for price history.`);
    if (historyCoverageIncomplete > 0) warnings.push(`${historyCoverageIncomplete} provider-supported instruments do not yet have the required 15-year/listing-date daily OHLCV window.`);
    if (historyCoverageListingDateMissing > 0) warnings.push(`${historyCoverageListingDateMissing} provider-supported instruments are missing listing date, so the 15-year target remains required and listing-date repair stays visible.`);
    if (businessMetadataAutoRepairable > 0) warnings.push(`${businessMetadataAutoRepairable} instruments are auto-repairable through provider business metadata repair.`);
    if (businessMetadataManualRequired > 0) warnings.push(`${businessMetadataManualRequired} instruments are marked manual-required after provider business metadata attempts.`);
    if (businessMetadataRetryBlocked > 0) warnings.push(`${businessMetadataRetryBlocked} provider business metadata repairs are retry-blocked until their next retry time.`);
    if (businessMetadataRetryEligible > 0) warnings.push(`${businessMetadataRetryEligible} provider business metadata repairs are retry-eligible.`);
    if (manualBusinessMetadataRequired > 0) warnings.push(`${manualBusinessMetadataRequired} instruments may require manual business metadata for sector, industry, or market cap if provider enrichment cannot fill them.`);

    const topActions: MarketDataRepairPlan['topActions'] = [
      { action: 'VALIDATE_PROVIDERS' as const, label: 'Validate unknown providers', count: providerValidationNeeded },
      { action: 'RETRY_FAILED_PROVIDERS' as const, label: 'Retry failed providers', count: retryFailedValidations },
      { action: 'CATALOG_IDENTITY_REPAIR' as const, label: 'Repair catalog identity', count: supportedCatalogIdentityRepairNeeded },
      { action: 'PROVIDER_BUSINESS_METADATA_REPAIR' as const, label: 'Enrich provider business metadata', count: businessMetadataAutoRepairable + businessMetadataRetryEligible },
      { action: 'BACKFILL_PRICES' as const, label: 'Backfill prices', count: supportedPriceBackfillNeeded },
      { action: 'MANUAL_METADATA_IMPORT' as const, label: 'Import manual metadata', count: manualBusinessMetadataRequired },
    ].filter((item) => item.count > 0);
    const businessMetadataBlockerDiagnostics = scope.region === 'IN' && scope.assetType === 'STOCK'
      ? this.host.businessMetadataBlockerDiagnostics(stocks)
      : undefined;

    const planWithoutSignoff = {
      scope,
      generatedAt: new Date().toISOString(),
      totalCatalogInstruments: stocks.length,
      providerUnknownValidationNeeded,
      providerRetryValidationNeeded,
      providerUnsupportedExcluded,
      providerValidationFailed,
      providerValidationNeeded,
      retryFailedValidations,
      providerRetryBlocked,
      providerManualRepairRequired,
      nextProviderRetryAtMin,
      historyCoverageIncomplete,
      historyCoverageListingDateMissing,
      historyCoverageFallbackRequired,
      supportedCatalogIdentityRepairNeeded,
      supportedBusinessMetadataRepairNeeded,
      supportedPriceBackfillNeeded,
      unsupportedExcluded,
      catalogIdentityRepairNeeded,
      priceBackfillNeeded,
      businessMetadataRepairNeeded,
      businessMetadataAutoRepairable,
      businessMetadataManualRequired,
      businessMetadataRetryBlocked,
      businessMetadataRetryEligible,
      businessMetadataRecentlyAttempted,
      metadataEnrichmentNeeded,
      manualMetadataRequired,
      manualBusinessMetadataRequired,
      missingIsin,
      missingListingDate,
      missingSector,
      missingIndustry,
      missingMarketCap,
      businessMetadataBlockerDiagnostics,
      manualSectorIndustryRequired,
      topActions,
      warnings,
    } as Omit<MarketDataRepairPlan, 'universeSignoff'>;
    return {
      ...planWithoutSignoff,
      universeSignoff: this.host.universeSignoffFromRepairPlan(planWithoutSignoff, {
        activeInstruments,
        reviewReadyActual,
        latestStoredEodDate,
        expectedLatestTradingDate,
      }),
    };
  }
}
