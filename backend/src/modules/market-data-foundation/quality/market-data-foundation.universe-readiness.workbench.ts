// Auto-extracted universe-readiness sibling (Phase 5b). Bodies are byte-identical to the
// pre-extraction inline implementation in market-data-foundation.service.ts, except that
// stays-on-service / cross-cluster collaborators are reached through the host
// (this.X -> this.host.X) and the snapshot-cache field (substrate only) now lives on this class.
// The service constructs this once and keeps byte-identical public delegators.

import type { MarketDataUniverseReadinessHost } from './market-data-foundation.universe-readiness-host';
import type {
  MarketDataRepairLane,
  MarketDataRepairLaneCode,
  MarketDataRepairRunAction,
  MarketDataRepairRunRecord,
  TrustedUniverseRepairWorkbench,
} from '../market-data-foundation.types';
import type {
  TrustedReviewUniverseOptions,
} from './market-data-foundation.universe-readiness.types';

export class UniverseRepairWorkbenchService {
  constructor(private readonly host: MarketDataUniverseReadinessHost) {}

  async trustedUniverseRepairWorkbench(options: TrustedReviewUniverseOptions = {}): Promise<TrustedUniverseRepairWorkbench> {
    const scope = {
      region: 'IN' as const,
      assetType: 'STOCK' as const,
    };
    const [readinessSummary, repairPlan, latestRun] = await Promise.all([
      this.host.reviewReadinessSummary({ ...options, region: scope.region, assetType: scope.assetType }),
      this.host.repairPlan(scope),
      this.host.latestRepairRun(scope),
    ]);
    const runActive = latestRun?.status === 'RUNNING';
    const boundedBatchSize = 50;
    const trustedUniverseBlocker = readinessSummary.blockers.find((item) => item.category === 'INSUFFICIENT_TRUSTED_UNIVERSE');
    const lanes: MarketDataRepairLane[] = [
      this.buildRepairLane({
        code: 'PROVIDER_VALIDATION',
        label: 'Provider validation',
        actionCodes: ['VALIDATE_PROVIDERS', 'RETRY_FAILED_PROVIDERS'],
        actionCode: (repairPlan.providerUnknownValidationNeeded ?? repairPlan.providerValidationNeeded) > 0 ? 'VALIDATE_PROVIDERS' : 'RETRY_FAILED_PROVIDERS',
        endpoint: '/api/v1/market-data/provider/validate',
        affectedCount: (repairPlan.providerUnknownValidationNeeded ?? repairPlan.providerValidationNeeded ?? 0) + (repairPlan.providerRetryValidationNeeded ?? repairPlan.retryFailedValidations ?? 0),
        eligibleNowCount: (repairPlan.providerUnknownValidationNeeded ?? repairPlan.providerValidationNeeded ?? 0) + (repairPlan.providerRetryValidationNeeded ?? repairPlan.retryFailedValidations ?? 0),
        retryableFailureCount: repairPlan.providerRetryValidationNeeded ?? repairPlan.retryFailedValidations ?? 0,
        manualRequiredCount: 0,
        skippedRecentAttemptCount: 0,
        expectedEffect: 'Validates UNKNOWN and retry-failed provider support before instruments can enter downstream price and identity repair lanes.',
        latestRun,
        runActive,
        boundedBatchSize,
        request: {
          region: scope.region,
          assetType: scope.assetType,
          batchSize: boundedBatchSize,
          offset: 0,
          queueMode: (repairPlan.providerUnknownValidationNeeded ?? repairPlan.providerValidationNeeded ?? 0) > 0 ? 'UNKNOWN_FIRST' : 'RETRY_FAILED',
        },
      }),
      this.buildRepairLane({
        code: 'PRICE_BACKFILL',
        label: 'Price backfill',
        actionCodes: ['BACKFILL_PRICES'],
        actionCode: 'BACKFILL_PRICES',
        endpoint: '/api/v1/market-data/prices/backfill',
        affectedCount: repairPlan.supportedPriceBackfillNeeded ?? repairPlan.priceBackfillNeeded ?? 0,
        eligibleNowCount: repairPlan.supportedPriceBackfillNeeded ?? repairPlan.priceBackfillNeeded ?? 0,
        retryableFailureCount: 0,
        manualRequiredCount: 0,
        skippedRecentAttemptCount: 0,
        expectedEffect: 'Backfills bounded EOD price history for provider-supported stocks that are missing latest or adequate historical bars.',
        latestRun,
        runActive,
        boundedBatchSize,
        request: { region: scope.region, assetType: scope.assetType, batchSize: boundedBatchSize, offset: 0 },
      }),
      this.buildRepairLane({
        code: 'STALE_EOD',
        label: 'Stale EOD',
        actionCodes: ['BACKFILL_PRICES'],
        actionCode: 'BACKFILL_PRICES',
        endpoint: '/api/v1/market-data/prices/backfill',
        affectedCount: readinessSummary.readinessCounts.staleLatestPrice,
        eligibleNowCount: Math.min(readinessSummary.readinessCounts.staleLatestPrice, repairPlan.supportedPriceBackfillNeeded ?? repairPlan.priceBackfillNeeded ?? 0),
        retryableFailureCount: 0,
        manualRequiredCount: 0,
        skippedRecentAttemptCount: 0,
        expectedEffect: 'Refreshes stale daily candles toward the required data-through date without launching an unbounded full-universe sweep.',
        latestRun,
        runActive,
        boundedBatchSize,
        request: { region: scope.region, assetType: scope.assetType, batchSize: boundedBatchSize, offset: 0 },
      }),
      this.buildRepairLane({
        code: 'CATALOG_IDENTITY',
        label: 'Catalog identity',
        actionCodes: ['CATALOG_IDENTITY_REPAIR'],
        actionCode: 'CATALOG_IDENTITY_REPAIR',
        endpoint: '/api/v1/market-data/catalog/identity-repair',
        affectedCount: repairPlan.supportedCatalogIdentityRepairNeeded ?? repairPlan.catalogIdentityRepairNeeded ?? 0,
        eligibleNowCount: repairPlan.supportedCatalogIdentityRepairNeeded ?? repairPlan.catalogIdentityRepairNeeded ?? 0,
        retryableFailureCount: 0,
        manualRequiredCount: 0,
        skippedRecentAttemptCount: 0,
        expectedEffect: 'Repairs provider symbol, source symbol, ISIN, listing date, and exchange identity from the configured bounded catalog source.',
        latestRun,
        runActive,
        boundedBatchSize,
        request: { region: scope.region, assetType: scope.assetType, batchSize: boundedBatchSize, offset: 0 },
      }),
      this.buildRepairLane({
        code: 'PROVIDER_BUSINESS_METADATA',
        label: 'Provider business metadata',
        actionCodes: ['PROVIDER_BUSINESS_METADATA_REPAIR'],
        actionCode: 'PROVIDER_BUSINESS_METADATA_REPAIR',
        endpoint: '/api/v1/market-data/metadata/provider-business/repair',
        affectedCount: repairPlan.supportedBusinessMetadataRepairNeeded ?? repairPlan.businessMetadataRepairNeeded ?? 0,
        eligibleNowCount: repairPlan.businessMetadataAutoRepairable + repairPlan.businessMetadataRetryEligible,
        retryableFailureCount: repairPlan.businessMetadataRetryEligible,
        manualRequiredCount: repairPlan.businessMetadataManualRequired + repairPlan.manualBusinessMetadataRequired,
        skippedRecentAttemptCount: repairPlan.businessMetadataRecentlyAttempted,
        expectedEffect: 'Fills sector, industry, market cap, ISIN, or listing-date fields when provider business metadata is available.',
        latestRun,
        runActive,
        boundedBatchSize,
        request: { region: scope.region, assetType: scope.assetType, batchSize: boundedBatchSize, offset: 0 },
      }),
      this.buildRepairLane({
        code: 'MANUAL_METADATA_IMPORT',
        label: 'Manual metadata import',
        actionCodes: ['MANUAL_METADATA_IMPORT'],
        actionCode: 'MANUAL_METADATA_IMPORT',
        endpoint: '/api/v1/market-data/metadata/manual-import',
        affectedCount: repairPlan.manualBusinessMetadataRequired ?? repairPlan.manualMetadataRequired ?? 0,
        eligibleNowCount: 0,
        retryableFailureCount: 0,
        manualRequiredCount: repairPlan.manualBusinessMetadataRequired ?? repairPlan.manualMetadataRequired ?? 0,
        skippedRecentAttemptCount: 0,
        expectedEffect: 'Imports operator-curated business metadata from an explicit CSV payload after provider repair cannot fill the gap.',
        latestRun,
        runActive,
        boundedBatchSize,
        disabledReason: (repairPlan.manualBusinessMetadataRequired ?? repairPlan.manualMetadataRequired ?? 0) > 0 ? 'Requires explicit manual metadata CSV payload.' : undefined,
        request: { region: scope.region, assetType: scope.assetType, batchSize: boundedBatchSize, offset: 0 },
      }),
      this.buildRepairLane({
        code: 'INSUFFICIENT_TRUSTED_UNIVERSE',
        label: 'Insufficient trusted universe',
        actionCodes: [],
        actionCode: 'REVIEW_REPAIR_PLAN',
        endpoint: '/api/v1/market-data/universe/repair-plan',
        affectedCount: trustedUniverseBlocker?.affectedCount ?? 0,
        eligibleNowCount: 0,
        retryableFailureCount: 0,
        manualRequiredCount: 0,
        skippedRecentAttemptCount: 0,
        expectedEffect: 'Reconciles trusted count, blocker counts, and review mode after the concrete repair lanes complete.',
        latestRun,
        runActive,
        boundedBatchSize,
        disabledReason: 'Run a concrete provider, catalog, metadata, or price lane first.',
        request: { region: scope.region, assetType: scope.assetType, batchSize: boundedBatchSize },
      }),
    ];

    const recommendedNextLane = this.recommendedRepairLane(readinessSummary.nextAction?.code, lanes);
    return {
      scope,
      generatedAt: new Date().toISOString(),
      readinessSummary,
      repairRun: latestRun,
      lanes,
      recommendedNextLane,
      warnings: [...new Set([
        ...readinessSummary.warnings,
        ...repairPlan.warnings,
        ...(latestRun?.warnings || []),
      ])].slice(0, 20),
    };
  }

  buildRepairLane(input: {
    code: MarketDataRepairLaneCode;
    label: string;
    actionCodes: MarketDataRepairRunAction[];
    actionCode: MarketDataRepairRunAction | 'REVIEW_REPAIR_PLAN';
    endpoint: string;
    affectedCount: number;
    eligibleNowCount: number;
    retryableFailureCount: number;
    manualRequiredCount: number;
    skippedRecentAttemptCount: number;
    boundedBatchSize: number;
    expectedEffect: string;
    latestRun: MarketDataRepairRunRecord | null;
    runActive: boolean;
    disabledReason?: string;
    request: MarketDataRepairLane['nextAction']['request'];
  }): MarketDataRepairLane {
    const lastActionRun = input.latestRun && input.actionCodes.length > 0
      ? (input.latestRun.actions || []).find((action) => input.actionCodes.includes(action.action))
      : null;
    const disabledReason = input.runActive
      ? 'A market data repair run is already active.'
      : input.disabledReason || (input.eligibleNowCount <= 0 ? 'No eligible rows in this lane.' : undefined);
    return {
      code: input.code,
      label: input.label,
      scope: { region: 'IN', assetType: 'STOCK' },
      affectedCount: input.affectedCount,
      eligibleNowCount: input.eligibleNowCount,
      retryableFailureCount: input.retryableFailureCount,
      manualRequiredCount: input.manualRequiredCount,
      skippedRecentAttemptCount: input.skippedRecentAttemptCount,
      boundedBatchSize: input.boundedBatchSize,
      expectedEffect: input.expectedEffect,
      lastRun: input.latestRun && (lastActionRun || input.code === 'INSUFFICIENT_TRUSTED_UNIVERSE')
        ? {
          id: input.latestRun.id,
          status: input.latestRun.status,
          startedAt: input.latestRun.startedAt,
          completedAt: input.latestRun.completedAt,
          successCount: lastActionRun?.totals.updated ?? input.latestRun.summary?.updated ?? 0,
          failureCount: lastActionRun?.totals.failed ?? input.latestRun.summary?.failed ?? 0,
          skippedCount: lastActionRun?.totals.skipped ?? input.latestRun.summary?.skipped ?? 0,
          warningCount: (lastActionRun?.warnings || input.latestRun.warnings || []).length,
        }
        : null,
      nextAction: {
        enabled: !disabledReason,
        actionCode: input.actionCode,
        method: 'POST',
        endpoint: input.endpoint,
        request: input.request,
        disabledReason,
      },
    };
  }

  recommendedRepairLane(actionCode: string | undefined, lanes: MarketDataRepairLane[]): MarketDataRepairLaneCode | null {
    const mapped = ({
      VALIDATE_PROVIDERS: 'PROVIDER_VALIDATION',
      RETRY_FAILED_PROVIDERS: 'PROVIDER_VALIDATION',
      CATALOG_IDENTITY_REPAIR: 'CATALOG_IDENTITY',
      PROVIDER_BUSINESS_METADATA_REPAIR: 'PROVIDER_BUSINESS_METADATA',
      MANUAL_METADATA_IMPORT: 'MANUAL_METADATA_IMPORT',
      BACKFILL_PRICES: 'PRICE_BACKFILL',
      REVIEW_REPAIR_PLAN: 'INSUFFICIENT_TRUSTED_UNIVERSE',
    } as Record<string, MarketDataRepairLaneCode>)[actionCode || ''];
    if (mapped) return mapped;
    return lanes.find((lane) => lane.nextAction.enabled)?.code || null;
  }
}
