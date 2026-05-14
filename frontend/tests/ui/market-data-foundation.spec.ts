import { expect, test, type Page } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-market-data-token');
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        id: 'playwright-market-data-user',
        email: 'codex.test@example.com',
        name: 'Codex Test',
        createdAt: '2026-05-13T00:00:00.000Z',
        updatedAt: '2026-05-13T00:00:00.000Z',
        lastLoginAt: '2026-05-13T00:00:00.000Z',
      },
    });
  });
  await page.route('**/api/v1/auth/logout', async (route) => {
    await route.fulfill({ json: { success: true } });
  });
}

async function mockCatalogPageShell(page: Page, sources: any[] = []) {
  await page.route('**/api/v1/instruments**', async (route) => {
    await route.fulfill({
      json: {
        instruments: [],
        pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      },
    });
  });
  await page.route('**/api/v1/market-data/catalog/sources', async (route) => {
    await route.fulfill({ json: { sources } });
  });
}

const catalogSyncStatus = (overrides: Record<string, unknown> = {}) => ({
  success: true,
  runId: 'catalog-sync-test',
  status: 'RUNNING',
  message: 'Catalog sync is running.',
  region: 'IN',
  assetType: 'STOCK',
  scopeType: 'CATALOG',
  batchSize: 25,
  workerCount: 1,
  workerConcurrency: 2,
  delayBetweenBatchesMs: 3000,
  maxBatches: 20,
  totalCount: 100,
  processedCount: 0,
  currentBatchNumber: 1,
  batchesPlanned: 4,
  batchesExecuted: 0,
  succeededCount: 0,
  failedCount: 0,
  skippedCount: 0,
  noOpCount: 0,
  rowsReceived: 0,
  rowsInserted: 0,
  rowsUpdated: 0,
  rowsSkipped: 0,
  warningCount: 0,
  warnings: [],
  recentErrors: [],
  hasMore: true,
  percentComplete: 0,
  startedAt: '2026-05-13T10:15:00.000Z',
  updatedAt: '2026-05-13T10:15:00.000Z',
  completedAt: null,
  ...overrides,
});

test.describe('Market Data Foundation UI', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test('data health tab renders universe readiness counts and blockers', async ({ page }) => {
    const signoffFail = {
      status: 'FAIL',
      minReviewReadyRequired: 300,
      reviewReadyActual: 0,
      blockers: [
        { code: 'PROVIDER_UNKNOWN_REMAINING', severity: 'critical', count: 2909, required: 0, nextAction: 'VALIDATE_PROVIDERS' },
        { code: 'MANUAL_BUSINESS_METADATA_REQUIRED', severity: 'critical', count: 2801, required: 0, nextAction: 'MANUAL_METADATA_IMPORT' },
      ],
      nextAction: 'VALIDATE_PROVIDERS',
      downstreamAllowed: false,
    };
    const signoffAfterRun = {
      ...signoffFail,
      reviewReadyActual: 7,
      blockers: [
        { code: 'PROVIDER_UNKNOWN_REMAINING', severity: 'critical', count: 2864, required: 0, nextAction: 'VALIDATE_PROVIDERS' },
      ],
    };
    await page.route('**/api/v1/instruments**', async (route) => {
      await route.fulfill({
        json: {
          instruments: [
            {
              id: 'ready-1',
              symbol: 'READY.NS',
              company_name: 'Ready Limited',
              exchange: 'NSE',
              country: 'India',
              region: 'IN',
              sector: 'Energy',
              industry: 'Oil & Gas',
              currency: 'INR',
              market_cap: null,
              asset_type: 'STOCK',
              instrument_segment: 'CASH',
              provider_support_status: 'SUPPORTED',
              metadata_completeness_score: 100,
              missing_metadata_fields: [],
              universe_state: 'STALE_OR_INCOMPLETE',
              price_history_bars: 260,
              latest_price_date: '2026-05-08',
              expected_latest_trading_date: '2026-05-11',
              has_recent_volume: true,
              readiness_blockers: ['STALE_LATEST_PRICE'],
              is_active: true,
              is_delisted: false,
              ipo_date: null,
              isin: null,
              source: 'database',
              ingestion_timestamp: '2026-05-08T00:00:00.000Z',
              last_updated_timestamp: '2026-05-08T00:00:00.000Z',
              data_status: 'COMPLETE',
            },
          ],
          pagination: { page: 1, pageSize: 25, total: 2910, totalPages: 117 },
        },
      });
    });
    await page.route('**/api/v1/market-data/catalog/sources', async (route) => {
      await route.fulfill({ json: { sources: [] } });
    });
    await page.route('**/api/v1/market-data/health**', async (route) => {
      await route.fulfill({
        json: {
          status: 'ok',
          module: 'market-data-foundation',
          instrumentCount: 2910,
          latestDataTimestamp: '2026-05-08T00:00:00.000Z',
          source: 'database',
          ingestion_timestamp: '2026-05-11T00:00:00.000Z',
          last_updated_timestamp: '2026-05-08T00:00:00.000Z',
          data_status: 'PARTIAL',
          timestamp: '2026-05-11T00:00:00.000Z',
          region: 'IN',
          assetType: 'STOCK',
        },
      });
    });
    await page.route('**/api/v1/market-data/universe/health**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          generatedAt: '2026-05-11T00:00:00.000Z',
          latestStoredEodDate: '2026-05-08',
          expectedLatestTradingDate: '2026-05-11',
          counts: {
            CATALOG_ONLY: 2910,
            PROVIDER_SUPPORTED: 0,
            PRICE_READY: 0,
            CONTEXT_READY: 0,
            REVIEW_READY: 0,
            UNSUPPORTED: 0,
            STALE_OR_INCOMPLETE: 585,
            DELISTED_OR_INACTIVE: 0,
            totalCatalogInstruments: 2910,
            activeInstruments: 2910,
            inactiveOrDelistedInstruments: 0,
            providerSupported: 1,
            providerUnknown: 2909,
            providerUnknownValidationNeeded: 2909,
            providerRetryValidationNeeded: 7,
            historyCoverageIncomplete: 144,
            historyCoverageListingDateMissing: 140,
            historyCoverageFallbackRequired: 2,
            providerUnsupportedExcluded: 0,
            providerValidationFailed: 7,
            unsupported: 0,
            unsupportedExcluded: 0,
            supportedCatalogIdentityRepairNeeded: 1,
            supportedBusinessMetadataRepairNeeded: 1,
            supportedPriceBackfillNeeded: 1,
            catalogOnly: 2909,
            priceReady: 0,
            contextReady: 0,
            reviewReady: 0,
            staleOrIncomplete: 585,
            missingLatestPrice: 2325,
            staleLatestPrice: 585,
            missingOrInadequatePriceHistory: 2325,
            missingRecentVolume: 2325,
            missingSector: 2909,
            missingIndustry: 2909,
            missingCountry: 0,
            missingCurrency: 0,
            missingMarketCap: 2909,
            missingIsin: 2910,
            missingListingDate: 2910,
          },
          coverage: {
            priceCoveragePercentage: 0,
            metadataCoveragePercentage: 0.1,
            reviewReadyPercentage: 0,
          },
          topBlockers: [
            { code: 'PROVIDER_UNKNOWN', label: 'Provider support not validated', count: 2909, severity: 'critical' },
            { code: 'STALE_LATEST_PRICE', label: 'Latest EOD price is stale', count: 585, severity: 'critical' },
            { code: 'MISSING_LATEST_PRICE', label: 'Latest EOD price missing', count: 2325, severity: 'critical' },
            { code: 'INADEQUATE_PRICE_HISTORY', label: 'Less than 252 daily bars', count: 2325, severity: 'critical' },
            { code: 'MISSING_RECENT_VOLUME', label: 'Recent volume missing', count: 2325, severity: 'critical' },
            { code: 'MISSING_SECTOR', label: 'Sector metadata missing', count: 2909, severity: 'critical' },
            { code: 'MISSING_INDUSTRY', label: 'Industry metadata missing', count: 2909, severity: 'critical' },
          ],
          warnings: ['Provider UNKNOWN for most instruments.'],
          trustStatus: 'NOT_TRUSTWORTHY',
          trustReasons: [
            '2909 active instruments still need provider validation.',
            'Price coverage is 0.0%.',
            'Metadata coverage is 0.1%.',
          ],
          universeSignoff: signoffFail,
        },
      });
    });
    await page.route('**/api/v1/market-data/review-universe**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          asOfDate: '2026-05-12',
          targetTradingDate: '2026-05-12',
          requiredDataThroughDate: '2026-05-11',
          storedDataThroughDate: '2026-05-11',
          catalogCount: 2910,
          providerSupportedCount: 585,
          trustedCount: 144,
          status: 'LIMITED',
          mode: 'LIMITED_REVIEW',
          minLiteCount: 100,
          minFullCount: 300,
          dataThroughDate: '2026-05-11',
          scanPolicy: {
            scanLimit: 144,
            scanComplete: true,
            scanOrdering: 'recentVolumeDesc_priceHistoryCompleteness_latestFreshness_symbol',
          },
          excludedCounts: {
            providerUnknown: 2325,
            providerRetryFailed: 7,
            providerUnsupported: 0,
            inactiveOrDelisted: 0,
            noLatestPrice: 100,
            staleLatestPrice: 200,
            insufficientBarsUnder120: 30,
            insufficientBarsUnder252: 144,
            missingRecentVolume: 20,
            corporateActionBlocked: 0,
          },
          contextGapCounts: {
            missingSector: 140,
            missingIndustry: 140,
            missingMarketCap: 140,
            missingIsin: 140,
            missingListingDate: 140,
          },
          warnings: ['Missing metadata is shown as context gap, not a hard blocker for price-action review.'],
        },
      });
    });
    await page.route('**/api/v1/market-data/review-readiness-summary**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          generatedAt: '2026-05-12T00:00:00.000Z',
          reviewMode: 'LIMITED_REVIEW',
          trustStatus: 'NOT_TRUSTWORTHY',
          userDecision: 'REPAIR_DATA',
          reviewUniverse: {
            catalogCount: 2910,
            providerSupportedCount: 585,
            trustedCount: 144,
            targetTradingDate: '2026-05-12',
            requiredDataThroughDate: '2026-05-11',
            storedDataThroughDate: '2026-05-11',
          },
          readinessCounts: {
            priceReady: 144,
            contextReady: 0,
            reviewReady: 0,
            missingLatestPrice: 2325,
            staleLatestPrice: 200,
            inadequateHistory: 30,
            missingRecentVolume: 20,
            providerUnknown: 2909,
            providerValidationFailedRetryable: 7,
            unsupportedExcluded: 0,
          },
          blockers: [
            { category: 'PROVIDER_VALIDATION', severity: 'HARD_BLOCKER', affectedCount: 2916, explanation: 'Provider support is not proven.', nextActionCode: 'VALIDATE_PROVIDERS', nextActionLabel: 'Validate unknown providers', boundedRequest: { batchSize: 50, region: 'IN', assetType: 'STOCK' } },
            { category: 'INSUFFICIENT_TRUSTED_UNIVERSE', severity: 'LIMITED_REVIEW', affectedCount: 156, explanation: 'Below full review threshold.', nextActionCode: 'REVIEW_REPAIR_PLAN', nextActionLabel: 'Review bounded repair plan', boundedRequest: { batchSize: 50, region: 'IN', assetType: 'STOCK' } },
          ],
          nextAction: { code: 'VALIDATE_PROVIDERS', label: 'Validate unknown providers', boundedRequest: { batchSize: 50, region: 'IN', assetType: 'STOCK' } },
          warnings: ['Limited review mode.'],
        },
      });
    });
    let unknownProvidersDrained = false;
    await page.route('**/api/v1/market-data/universe/repair-plan**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          generatedAt: '2026-05-11T00:00:00.000Z',
          totalCatalogInstruments: 2910,
          providerUnknownValidationNeeded: unknownProvidersDrained ? 0 : 2909,
          providerRetryValidationNeeded: 7,
          providerRetryBlocked: 8,
          providerManualRepairRequired: 5,
          nextProviderRetryAtMin: '2026-05-13T12:45:00.000Z',
          historyCoverageIncomplete: 144,
          historyCoverageListingDateMissing: 140,
          historyCoverageFallbackRequired: 2,
          sampleCoverageResults: [
            {
              symbol: 'PLAN.NS',
              requiredHistoryStartDate: '2011-05-12',
              requiredHistoryEndDate: '2026-05-12',
              listingDate: null,
              listingDateMissing: true,
              storedHistoryStartDate: '2018-01-01',
              storedHistoryEndDate: '2026-05-10',
              storedHistoryBars: 1830,
              requiredHistoryComplete: false,
              coverageStatus: 'NEEDS_BACKFILL',
              sourceFallbackReason: 'YAHOO_SHALLOW_HISTORY',
            },
          ],
          providerUnsupportedExcluded: 0,
          providerValidationFailed: 7,
          providerValidationNeeded: unknownProvidersDrained ? 0 : 2909,
          retryFailedValidations: 7,
          supportedCatalogIdentityRepairNeeded: 1,
          supportedBusinessMetadataRepairNeeded: 1,
          supportedPriceBackfillNeeded: 1,
          unsupportedExcluded: 0,
          catalogIdentityRepairNeeded: 2910,
          priceBackfillNeeded: 585,
          businessMetadataRepairNeeded: 2909,
          businessMetadataAutoRepairable: 0,
          businessMetadataManualRequired: 109,
          businessMetadataRetryBlocked: 40,
          businessMetadataRetryEligible: 12,
          businessMetadataRecentlyAttempted: 149,
          metadataEnrichmentNeeded: 2909,
          manualMetadataRequired: 2910,
          manualBusinessMetadataRequired: 2801,
          missingIsin: 2910,
          missingListingDate: 2910,
          missingSector: 2909,
          missingIndustry: 2909,
          missingMarketCap: 2909,
          manualSectorIndustryRequired: 0,
          topActions: [
            { action: 'VALIDATE_PROVIDERS', label: 'Validate unknown providers', count: 2909 },
            { action: 'RETRY_FAILED_PROVIDERS', label: 'Retry failed providers', count: 7 },
            { action: 'CATALOG_IDENTITY_REPAIR', label: 'Repair catalog identity', count: 1 },
            { action: 'PROVIDER_BUSINESS_METADATA_REPAIR', label: 'Enrich provider business metadata', count: 12 },
            { action: 'BACKFILL_PRICES', label: 'Backfill prices', count: 585 },
            { action: 'MANUAL_METADATA_IMPORT', label: 'Import manual metadata', count: 2801 },
          ],
          warnings: ['2909 instruments need provider validation before review workflows can trust them.'],
          universeSignoff: signoffFail,
        },
      });
    });
    await page.route('**/api/v1/market-data/stocks/missing-data-diagnostics**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          generatedAt: '2026-05-12T08:00:00.000Z',
          counts: {
            activeStocks: 2910,
            providerValidationNeeded: 2916,
            catalogIdentityRepairNeeded: 12,
            businessMetadataRepairNeeded: 2801,
            manualBusinessMetadataRequired: 2801,
            priceBackfillNeeded: 585,
            identityMismatches: 3,
            missingProviderSymbol: 2,
            providerSymbolMismatch: 1,
          },
          actionCounts: {
            providerValidationNeeded: 2916,
            catalogIdentityRepairNeeded: 12,
            providerBusinessMetadataRepairNeeded: 2801,
            manualMetadataImportNeeded: 2801,
            priceBackfillNeeded: 585,
          },
          identityMismatchWarnings: [
            {
              symbol: 'BAD.NS',
              issue: 'Provider symbol suffix mismatch',
              providerSymbol: 'BAD',
              expectedProviderSymbol: 'BAD.NS',
              sourceSymbol: 'BAD',
              exchange: 'NSE',
              severity: 'warning',
            },
          ],
          warnings: ['3 identity mismatches require catalog identity repair.'],
        },
      });
    });
    await page.route('**/api/v1/market-data/universe/repair-workbench**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          generatedAt: '2026-05-12T00:00:00.000Z',
          readinessSummary: {},
          repairRun: {
            id: 'repair-run-last',
            scope: { region: 'IN', assetType: 'STOCK' },
            status: 'COMPLETED',
            startedAt: '2026-05-12T06:00:00.000Z',
            completedAt: '2026-05-12T06:01:00.000Z',
          },
          recommendedNextLane: 'PROVIDER_VALIDATION',
          warnings: ['2909 instruments need provider validation before review workflows can trust them.'],
          lanes: [
            {
              code: 'PROVIDER_VALIDATION',
              label: 'Provider validation',
              scope: { region: 'IN', assetType: 'STOCK' },
              affectedCount: 2916,
              eligibleNowCount: 2916,
              retryableFailureCount: 7,
              manualRequiredCount: 0,
              skippedRecentAttemptCount: 0,
              boundedBatchSize: 50,
              expectedEffect: 'Validates UNKNOWN and retry-failed provider support before instruments can enter downstream price and identity repair lanes.',
              lastRun: { id: 'repair-run-last', status: 'COMPLETED', startedAt: '2026-05-12T06:00:00.000Z', completedAt: '2026-05-12T06:01:00.000Z', successCount: 45, failureCount: 5, skippedCount: 0, warningCount: 1 },
              nextAction: { enabled: true, actionCode: 'VALIDATE_PROVIDERS', method: 'POST', endpoint: '/api/v1/market-data/provider/validate', request: { region: 'IN', assetType: 'STOCK', batchSize: 50, offset: 0, queueMode: 'UNKNOWN_FIRST' } },
            },
            {
              code: 'PRICE_BACKFILL',
              label: 'Price backfill',
              scope: { region: 'IN', assetType: 'STOCK' },
              affectedCount: 585,
              eligibleNowCount: 585,
              retryableFailureCount: 0,
              manualRequiredCount: 0,
              skippedRecentAttemptCount: 0,
              boundedBatchSize: 50,
              expectedEffect: 'Backfills bounded EOD price history for provider-supported stocks.',
              lastRun: null,
              nextAction: { enabled: true, actionCode: 'BACKFILL_PRICES', method: 'POST', endpoint: '/api/v1/market-data/prices/backfill', request: { region: 'IN', assetType: 'STOCK', batchSize: 50, offset: 0 } },
            },
            {
              code: 'STALE_EOD',
              label: 'Stale EOD',
              scope: { region: 'IN', assetType: 'STOCK' },
              affectedCount: 200,
              eligibleNowCount: 200,
              retryableFailureCount: 0,
              manualRequiredCount: 0,
              skippedRecentAttemptCount: 0,
              boundedBatchSize: 50,
              expectedEffect: 'Refreshes stale daily candles toward the required data-through date.',
              lastRun: null,
              nextAction: { enabled: true, actionCode: 'BACKFILL_PRICES', method: 'POST', endpoint: '/api/v1/market-data/prices/backfill', request: { region: 'IN', assetType: 'STOCK', batchSize: 50, offset: 0 } },
            },
            {
              code: 'CATALOG_IDENTITY',
              label: 'Catalog identity',
              scope: { region: 'IN', assetType: 'STOCK' },
              affectedCount: 1,
              eligibleNowCount: 1,
              retryableFailureCount: 0,
              manualRequiredCount: 0,
              skippedRecentAttemptCount: 0,
              boundedBatchSize: 50,
              expectedEffect: 'Repairs provider symbol, ISIN, listing date, and exchange identity.',
              lastRun: null,
              nextAction: { enabled: true, actionCode: 'CATALOG_IDENTITY_REPAIR', method: 'POST', endpoint: '/api/v1/market-data/catalog/identity-repair', request: { region: 'IN', assetType: 'STOCK', batchSize: 50, offset: 0 } },
            },
            {
              code: 'PROVIDER_BUSINESS_METADATA',
              label: 'Provider business metadata',
              scope: { region: 'IN', assetType: 'STOCK' },
              affectedCount: 1,
              eligibleNowCount: 12,
              retryableFailureCount: 12,
              manualRequiredCount: 2910,
              skippedRecentAttemptCount: 149,
              boundedBatchSize: 50,
              expectedEffect: 'Fills business metadata when provider data is available.',
              lastRun: null,
              nextAction: { enabled: true, actionCode: 'PROVIDER_BUSINESS_METADATA_REPAIR', method: 'POST', endpoint: '/api/v1/market-data/metadata/provider-business/repair', request: { region: 'IN', assetType: 'STOCK', batchSize: 50, offset: 0 } },
            },
            {
              code: 'MANUAL_METADATA_IMPORT',
              label: 'Manual metadata import',
              scope: { region: 'IN', assetType: 'STOCK' },
              affectedCount: 2801,
              eligibleNowCount: 0,
              retryableFailureCount: 0,
              manualRequiredCount: 2801,
              skippedRecentAttemptCount: 0,
              boundedBatchSize: 50,
              expectedEffect: 'Imports operator-curated business metadata from an explicit CSV payload.',
              lastRun: null,
              nextAction: { enabled: false, actionCode: 'MANUAL_METADATA_IMPORT', method: 'POST', endpoint: '/api/v1/market-data/metadata/manual-import', request: { region: 'IN', assetType: 'STOCK', batchSize: 50, offset: 0 }, disabledReason: 'Requires explicit manual metadata CSV payload.' },
            },
            {
              code: 'INSUFFICIENT_TRUSTED_UNIVERSE',
              label: 'Insufficient trusted universe',
              scope: { region: 'IN', assetType: 'STOCK' },
              affectedCount: 156,
              eligibleNowCount: 0,
              retryableFailureCount: 0,
              manualRequiredCount: 0,
              skippedRecentAttemptCount: 0,
              boundedBatchSize: 50,
              expectedEffect: 'Reconciles trusted count, blocker counts, and review mode after concrete repairs.',
              lastRun: { id: 'repair-run-last', status: 'COMPLETED', startedAt: '2026-05-12T06:00:00.000Z', completedAt: '2026-05-12T06:01:00.000Z', successCount: 45, failureCount: 5, skippedCount: 0, warningCount: 1 },
              nextAction: { enabled: false, actionCode: 'REVIEW_REPAIR_PLAN', method: 'POST', endpoint: '/api/v1/market-data/universe/repair-plan', request: { region: 'IN', assetType: 'STOCK', batchSize: 50 }, disabledReason: 'Run a concrete provider, catalog, metadata, or price lane first.' },
            },
          ],
        },
      });
    });
    await page.route('**/api/v1/market-data/universe/repair-runs/latest**', async (route) => {
      await route.fulfill({
        json: {
          id: 'repair-run-last',
          scope: { region: 'IN', assetType: 'STOCK' },
          status: 'COMPLETED',
          startedAt: '2026-05-12T06:00:00.000Z',
          completedAt: '2026-05-12T06:01:00.000Z',
          beforeHealth: null,
          afterHealth: null,
          beforeRepairPlan: null,
          afterRepairPlan: null,
          actions: [],
          summary: null,
          warnings: ['Catalog source unavailable.'],
          anotherRunNeeded: true,
          hardBlockersRemaining: [
            { code: 'PROVIDER_UNKNOWN', label: 'Provider support not validated', count: 2909, severity: 'critical' },
          ],
          expectedNextAction: 'CATALOG_IDENTITY_REPAIR',
          afterTrustStatus: 'NOT_TRUSTWORTHY',
          universeSignoff: signoffFail,
          error: 'Catalog source unavailable.',
        },
      });
    });
    const repairRunPayloads: any[] = [];
    await page.route('**/api/v1/market-data/universe/repair-run', async (route) => {
      const payload = route.request().postDataJSON();
      repairRunPayloads.push(payload);
      const baseHealth = {
        scope: { region: 'IN', assetType: 'STOCK' },
        generatedAt: '2026-05-12T00:00:00.000Z',
        latestStoredEodDate: '2026-05-08',
        expectedLatestTradingDate: '2026-05-11',
        counts: {
          reviewReady: 0,
          providerSupported: 1,
          providerUnknown: 2909,
          priceReady: 0,
        },
        coverage: {
          metadataCoveragePercentage: 0.1,
        },
        topBlockers: [
          { code: 'PROVIDER_UNKNOWN', label: 'Provider support not validated', count: 2909, severity: 'critical' },
        ],
        warnings: [],
        trustStatus: 'NOT_TRUSTWORTHY',
        trustReasons: ['Review-ready universe is empty under strict rules.'],
        universeSignoff: signoffFail,
      };
      const afterHealth = {
          ...baseHealth,
          counts: {
            ...baseHealth.counts,
            providerSupported: payload.dryRun ? 1 : 46,
            providerUnknown: payload.dryRun ? 2909 : 2864,
            priceReady: payload.dryRun ? 0 : 8,
            reviewReady: payload.dryRun ? 0 : 7,
        },
        coverage: { metadataCoveragePercentage: payload.dryRun ? 0.1 : 0.2 },
        universeSignoff: payload.dryRun ? signoffFail : signoffAfterRun,
      };
      await route.fulfill({
        json: {
          id: payload.dryRun ? null : 'repair-run-1',
          dryRun: Boolean(payload.dryRun),
          scope: { region: 'IN', assetType: 'STOCK' },
          status: payload.dryRun ? 'COMPLETED' : 'PARTIAL',
          startedAt: '2026-05-12T07:00:00.000Z',
          completedAt: '2026-05-12T07:01:00.000Z',
          beforeHealth: baseHealth,
          afterHealth,
          beforeRepairPlan: { providerValidationNeeded: 2909, providerUnknownValidationNeeded: 2909, providerRetryValidationNeeded: 7 },
          afterRepairPlan: { providerValidationNeeded: payload.dryRun ? 2909 : 2864, providerUnknownValidationNeeded: payload.dryRun ? 2909 : 2864, providerRetryValidationNeeded: 7 },
          actions: [
            {
              action: 'VALIDATE_PROVIDERS',
              label: 'Validate unknown providers',
              estimatedTotal: 2909,
              estimatedBatchCount: 59,
              batchesPlanned: 20,
              batchesExecuted: payload.dryRun ? 0 : 1,
              dryRun: Boolean(payload.dryRun),
              hasMore: true,
              anotherRunNeeded: true,
              totals: { processedCount: payload.dryRun ? 0 : 50, updated: payload.dryRun ? 0 : 45, skipped: 0, failed: payload.dryRun ? 0 : 5, noOp: 0, manualRequired: 0 },
              summaries: [],
              warnings: ['Another bounded run is needed.'],
            },
            {
              action: 'CATALOG_IDENTITY_REPAIR',
              label: 'Repair catalog identity',
              estimatedTotal: 2910,
              estimatedBatchCount: 59,
              batchesPlanned: 20,
              batchesExecuted: payload.dryRun ? 0 : 0,
              dryRun: Boolean(payload.dryRun),
              hasMore: true,
              anotherRunNeeded: true,
              totals: { processedCount: 0, updated: 0, skipped: 0, failed: 0, noOp: 0, manualRequired: 0 },
              summaries: [],
              warnings: [],
              error: payload.dryRun ? undefined : 'Catalog source unavailable.',
            },
          ],
          summary: {
            actionsRequested: payload.actions,
            batchesExecuted: payload.dryRun ? 0 : 1,
            updated: payload.dryRun ? 0 : 45,
            skipped: 0,
            failed: payload.dryRun ? 0 : 5,
            noOp: 0,
            manualRequired: 0,
          },
          warnings: payload.dryRun
            ? ['Dry run only: no provider, catalog, metadata, or price rows were mutated.', 'Today Plan remains blocked because review-ready universe is 0.']
            : ['Catalog source unavailable.', 'Today Plan remains blocked because universe trust is NOT_TRUSTWORTHY.'],
          anotherRunNeeded: true,
          hardBlockersRemaining: [
            { code: 'PROVIDER_UNKNOWN', label: 'Provider support not validated', count: payload.dryRun ? 2909 : 2864, severity: 'critical' },
          ],
          expectedNextAction: 'VALIDATE_PROVIDERS',
          afterTrustStatus: 'NOT_TRUSTWORTHY',
          universeSignoff: payload.dryRun ? signoffFail : signoffAfterRun,
          error: payload.dryRun ? null : 'Catalog source unavailable.',
        },
      });
    });
    let providerPayload: any = null;
    let catalogPayload: any = null;
    let metadataPayload: any = null;
    const manualPayloads: any[] = [];
    let pricePayload: any = null;
    await page.route('**/api/v1/market-data/provider/validate', async (route) => {
      providerPayload = route.request().postDataJSON();
      if (providerPayload.providerValidationQueue === 'UNKNOWN_FIRST') unknownProvidersDrained = true;
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          processedCount: providerPayload.providerValidationQueue === 'RETRY_FAILED' ? 7 : 50,
          totalCount: providerPayload.providerValidationQueue === 'RETRY_FAILED' ? 7 : 2909,
          batchSize: 50,
          offset: providerPayload.offset,
          nextOffset: 50,
          hasMore: true,
          updated: 45,
          skipped: 0,
          failed: 5,
          noOp: 0,
          manualRequired: 0,
          warnings: ['5 provider validations failed and can be retried.'],
          durationMs: 1,
          providerValidationQueue: providerPayload.providerValidationQueue,
          providerValidated: providerPayload.providerValidationQueue === 'RETRY_FAILED' ? 7 : 50,
          providerSupported: providerPayload.providerValidationQueue === 'RETRY_FAILED' ? 0 : 45,
          providerUnsupported: providerPayload.providerValidationQueue === 'RETRY_FAILED' ? 0 : 3,
          validationFailed: providerPayload.providerValidationQueue === 'RETRY_FAILED' ? 7 : 5,
          supportedFromStoredPrices: providerPayload.providerValidationQueue === 'RETRY_FAILED' ? 0 : 1,
          unsupportedNoProviderSymbol: 1,
          unsupportedNoCandlesWideWindow: 2,
          retryableTimeout: 1,
          retryableProviderError: 3,
          retryableRateLimited: 1,
          manualSymbolRepairRequired: 2,
          retryCooldownSkipped: providerPayload.providerValidationQueue === 'RETRY_FAILED' ? 8 : 0,
          manualRequiredSkipped: 5,
          providerCalls: 49,
          providerTimeouts: 1,
          providerRetryableFailures: 5,
          freeFallbackRequired: 1,
          fallbackSourceAttempted: 'NSE_CM_UDIFF_BHAVCOPY',
          slowProviderCalls: 3,
          maxProviderCallMs: 4500,
          p95ProviderCallMs: 2800,
          validationWindowStartDate: '2026-03-28',
          validationWindowEndDate: '2026-05-12',
          requiredHistoryStartDate: '2011-05-12',
          requiredHistoryCoverageStatus: 'FALLBACK_REQUIRED',
          listingDate: '2018-08-10',
          latestCompletedEodDate: '2026-05-12',
          remainingUnknown: providerPayload.providerValidationQueue === 'RETRY_FAILED' ? 0 : 2859,
          remainingRetryEligible: providerPayload.providerValidationQueue === 'RETRY_FAILED' ? 0 : 12,
          remainingRetryBlocked: 8,
          remainingManualRequired: 5,
          nextRetryAtMin: '2026-05-13T12:45:00.000Z',
          sampleResults: [
            { symbol: 'ABC.NS', providerSymbol: 'ABC.NS', status: 'SUPPORTED', classification: 'SUPPORTED_WITH_CANDLES', candlesFound: 32, providerCallMs: 820, nextRetryAt: null, message: null },
            { symbol: 'TIMEOUT.NS', providerSymbol: 'TIMEOUT.NS', status: 'VALIDATION_FAILED', classification: 'RETRYABLE_TIMEOUT', candlesFound: 0, providerCallMs: 4500, nextRetryAt: '2026-05-13T12:45:00.000Z', message: 'Provider timeout' },
          ],
        },
      });
    });
    await page.route('**/api/v1/market-data/catalog/identity-repair', async (route) => {
      catalogPayload = route.request().postDataJSON();
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          processedCount: 50,
          totalCount: 2910,
          batchSize: 50,
          offset: catalogPayload.offset,
          nextOffset: 50,
          hasMore: true,
          updated: 25,
          skipped: 25,
          failed: 0,
          noOp: 25,
          manualRequired: 0,
          warnings: [],
          durationMs: 1,
          catalogIdentityRepaired: 25,
          matchedExistingRows: 50,
          unmatchedCatalogRows: 0,
          fieldsFilled: { isin: 25, ipoDate: 25 },
        },
      });
    });
    await page.route('**/api/v1/market-data/metadata/provider-business/repair', async (route) => {
      metadataPayload = route.request().postDataJSON();
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          processedCount: 50,
          totalCount: 2909,
          batchSize: 50,
          offset: metadataPayload.offset,
          nextOffset: 50,
          hasMore: true,
          updated: 50,
          skipped: 0,
          failed: 0,
          noOp: 0,
          partialSuccess: 50,
          manualRequired: 50,
          providerNotFound: 0,
          skippedRecentAttempt: 149,
          remainingAutoRepairable: 2750,
          remainingManualRequired: 159,
          warnings: ['Partial metadata repair: sector and industry were filled, but marketCap is still required. Manual metadata remains required.'],
          durationMs: 1,
          metadataEnriched: 50,
          fieldsFilled: { sector: 50, industry: 50 },
        },
      });
    });
    await page.route('**/api/v1/market-data/metadata/manual-import', async (route) => {
      const manualPayload = route.request().postDataJSON();
      manualPayloads.push(manualPayload);
      const hasMore = manualPayload.offset === 0;
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          processedCount: 50,
          totalCount: 100,
          batchSize: 50,
          offset: manualPayload.offset,
          nextOffset: hasMore ? 50 : null,
          hasMore,
          updated: 50,
          skipped: 0,
          failed: 0,
          noOp: 0,
          partialSuccess: 0,
          manualRequired: 0,
          warnings: [],
          durationMs: 1,
          fieldsFilled: { sector: 50, industry: 50, marketCap: 50 },
        },
      });
    });
    await page.route('**/api/v1/market-data/metadata/manual-template**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          generatedAt: '2026-05-12T07:30:00.000Z',
          count: 2,
          csvText: 'symbol,providerSymbol,companyName,exchange,currentSector,currentIndustry,currentMarketCap,sector,industry,marketCap,requiredFields,suggestedSource,notes\nABB,ABB.NS,ABB India,NSE,,,,Industrials,Electrical Equipment,1000,"sector;industry;marketCap",manual,Fill from curated source\n',
          rows: [
            {
              symbol: 'ABB.NS',
              providerSymbol: 'ABB.NS',
              companyName: 'ABB India',
              exchange: 'NSE',
              currentSector: null,
              currentIndustry: null,
              currentMarketCap: null,
              requiredFields: ['sector', 'industry', 'marketCap'],
              suggestedSource: 'manual',
              notes: 'Fill from curated source',
            },
          ],
        },
      });
    });
    await page.route('**/api/v1/market-data/prices/backfill', async (route) => {
      pricePayload = route.request().postDataJSON();
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          processedCount: 50,
          totalCount: 585,
          batchSize: 50,
          offset: pricePayload.offset,
          nextOffset: 50,
          hasMore: true,
          updated: 0,
          skipped: 50,
          failed: 0,
          noOp: 0,
          manualRequired: 0,
          warnings: ['Zero rows returned by provider for 2 supported symbols.'],
          durationMs: 1,
          priceRowsReceived: 0,
          priceRowsInserted: 0,
          priceRowsUpdated: 0,
          priceRowsNoOp: 0,
          zeroRowProviderReturns: 2,
          deepReloaded: 0,
          incrementalCaughtUp: 0,
          remainingCandidates: 585,
          latestCompletedEodDate: '2026-05-12',
          targetEndDate: '2026-05-12T23:59:59.999Z',
          stillUnder120: 30,
          stillUnder200: 75,
          stillUnder252: 144,
          historyCoverageIncomplete: 144,
          historyCoverageListingDateMissing: 20,
          historyCoverageFallbackRequired: 2,
          sampleCoverageResults: [
            {
              symbol: 'BACKFILL.NS',
              requiredHistoryStartDate: '2011-05-12',
              requiredHistoryEndDate: '2026-05-12',
              listingDate: '2018-08-10',
              listingDateMissing: false,
              storedHistoryStartDate: '2020-01-01',
              storedHistoryEndDate: '2026-05-10',
              storedHistoryBars: 1200,
              requiredHistoryComplete: false,
              coverageStatus: 'NEEDS_BACKFILL',
              sourceFallbackReason: 'YAHOO_SHALLOW_HISTORY',
            },
          ],
        },
      });
    });
    await page.route('**/api/v1/market-data/scheduler/status', async (route) => {
      await route.fulfill({
        json: {
          enabled: false,
          intervalMinutes: 15,
          regions: ['IN'],
          assetType: 'STOCK',
          activeRun: false,
          lastRunAt: null,
          nextSuggestedRunAt: null,
          regionStatuses: [
            {
              region: 'IN',
              assetType: 'STOCK',
              sessionState: 'MARKET_CLOSED_NO_SYNC',
              shouldRunNow: false,
              reason: 'Closed',
              todayTradingDate: '2026-05-11',
              latestCompletedTradingDate: '2026-05-11',
              latestStoredTradingDate: '2026-05-08',
              todayCandleStored: false,
              latestCompletedCandleStored: false,
              latestStoredCandleIsCurrent: false,
              candleSyncStatus: 'MISSING_LATEST_COMPLETED',
              finalConfirmed: false,
            },
          ],
        },
      });
    });

    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await page.getByRole('tab', { name: 'Data Health' }).click();

    await expect(page.getByText('Downstream Gate')).toBeVisible();
    await expect(page.getByText('Gate: LIMITED')).toBeVisible();
    await expect(page.getByText('Required data-through: 2026-05-11').first()).toBeVisible();
    await expect(page.getByText('Stored data-through: 2026-05-11').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Next bounded action: VALIDATE_PROVIDERS/ })).toBeVisible();
    await expect(page.getByText('PROVIDER_UNKNOWN: Provider support not validated (2,909)')).toBeVisible();
    await expect(page.getByText('Latest run outcome: Completed')).toBeVisible();
    const topBandOutcomeChipClass = await page.locator('.MuiChip-root', { hasText: 'Latest run outcome: Completed' }).getAttribute('class');
    expect(topBandOutcomeChipClass).toContain('MuiChip-colorWarning');

    await expect(page.getByRole('heading', { name: 'Universe Health' })).toBeVisible();
    await expect(page.getByText('Trust: NOT_TRUSTWORTHY').first()).toBeVisible();
    await expect(page.getByText('2,910 / 0')).toBeVisible();
    await expect(page.getByText('2,909 unknown, 7 retry failed, 0 unsupported excluded')).toBeVisible();
    await expect(page.getByRole('heading', { name: '0.0%' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: '0.1%' }).first()).toBeVisible();
    await expect(page.getByText('Latest EOD price is stale', { exact: true })).toBeVisible();
    await expect(page.getByText('Latest EOD price missing', { exact: true })).toBeVisible();
    await expect(page.getByText('Less than 252 daily bars', { exact: true })).toBeVisible();
    await expect(page.getByText('Recent volume missing', { exact: true })).toBeVisible();
    await expect(page.getByText('Sector metadata missing', { exact: true })).toBeVisible();
    await expect(page.getByText('Industry metadata missing', { exact: true })).toBeVisible();
    await expect(page.getByText(/Today's Plan remains blocked/)).toBeVisible();
    await expect(page.getByText('Universe Signoff')).toBeVisible();
    await expect(page.getByText('Signoff: FAIL').first()).toBeVisible();
    await expect(page.getByText('Downstream allowed: no').first()).toBeVisible();
    await expect(page.getByText('Review-ready: 0 / 300').first()).toBeVisible();
    await expect(page.getByText('15-year/listing-date coverage incomplete: 144')).toBeVisible();
    await expect(page.getByText('Listing date missing for coverage: 140')).toBeVisible();
    await expect(page.getByText('History fallback required: 2')).toBeVisible();
    await expect(page.getByText('Next action: VALIDATE_PROVIDERS').first()).toBeVisible();
    await expect(page.getByText('Stock Missing Data Diagnostics')).toBeVisible();
    await expect(page.getByText('Identity mismatch warnings: 3')).toBeVisible();
    await expect(page.getByText('BAD.NS: Provider symbol suffix mismatch; provider BAD -> BAD.NS; source BAD; exchange NSE.')).toBeVisible();
    await expect(page.getByText('3 identity mismatches require catalog identity repair.')).toBeVisible();
    await expect(page.getByText('Review Readiness Summary')).toBeVisible();
    await expect(page.getByText('Decision: REPAIR_DATA')).toBeVisible();
    await expect(page.getByText('Trusted / catalog: 144 / 2,910')).toBeVisible();
    await expect(page.getByText('Next action: Validate unknown providers')).toBeVisible();
    await expect(page.getByText('Bounded request: batch 50')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Trusted Review Universe' })).toBeVisible();
    await expect(page.getByText('Status: LIMITED').first()).toBeVisible();
    await expect(page.getByText('Mode: LIMITED_REVIEW').first()).toBeVisible();
    await expect(page.getByText('Trusted review universe: 144')).toBeVisible();
    await expect(page.getByText('Target session: 2026-05-12').first()).toBeVisible();
    await expect(page.getByText('Required data-through: 2026-05-11').first()).toBeVisible();
    await expect(page.getByText('Stored data-through: 2026-05-11').first()).toBeVisible();
    await expect(page.getByText('Stale latest price excluded: 200')).toBeVisible();
    await expect(page.getByText('Under 120 bars excluded: 30')).toBeVisible();
    await expect(page.getByText('Under 252 bars excluded: 144')).toBeVisible();
    await expect(page.getByText('Missing volume excluded: 20')).toBeVisible();
    await expect(page.getByText('Missing sector context gaps: 140')).toBeVisible();
    await expect(page.getByText('Scan ordering: recentVolumeDesc_priceHistoryCompleteness_latestFreshness_symbol')).toBeVisible();
    await expect(page.getByText('Missing metadata is shown as context gap, not a hard blocker for price-action review.').first()).toBeVisible();
    await expect(page.getByText('Operational Repair Run')).toBeVisible();
    await expect(page.getByText('Last run: COMPLETED')).toBeVisible();
    const latestRunChipClass = await page.locator('.MuiChip-root', { hasText: 'Last run: COMPLETED' }).getAttribute('class');
    expect(latestRunChipClass).toContain('MuiChip-colorWarning');
    await expect(page.getByText(/Latest repair run is not signoff-ready; trust NOT_TRUSTWORTHY; next action CATALOG_IDENTITY_REPAIR/)).toBeVisible();
    await page.getByRole('button', { name: 'Run dry-run' }).click();
    await expect.poll(() => repairRunPayloads[0]).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 50,
      maxBatchesPerAction: 20,
      workerConcurrency: 4,
      dryRun: true,
      actions: [
        'VALIDATE_PROVIDERS',
        'CATALOG_IDENTITY_REPAIR',
        'PROVIDER_BUSINESS_METADATA_REPAIR',
        'BACKFILL_PRICES',
      ],
    });
    await expect(page.getByText(/Dry-run expected actions/)).toBeVisible();
    await expect(page.getByText('Validate unknown providers: 2,909 planned')).toBeVisible();
    await page.getByRole('button', { name: 'Start repair run' }).click();
    await expect.poll(() => repairRunPayloads[1]).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      workerConcurrency: 4,
      dryRun: false,
    });
    await expect(page.getByText(/Repair run PARTIAL/)).toBeVisible();
    await expect(page.getByText('Provider-supported: 1 -> 46')).toBeVisible();
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: 'Repair run PARTIAL' })
        .getByText("Today's Plan remains blocked because universe trust is NOT_TRUSTWORTHY."),
    ).toBeVisible();
    await expect(page.getByText(/Another bounded repair run is needed; next action VALIDATE_PROVIDERS/)).toBeVisible();
    const runAlertClass = await page.getByRole('alert').filter({ hasText: 'Repair run PARTIAL' }).getAttribute('class');
    expect(runAlertClass).toContain('MuiAlert-standardWarning');
    await page.getByRole('button', { name: 'Run Drain' }).click();
    await expect.poll(() => repairRunPayloads[2]).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      workerConcurrency: 4,
      dryRun: false,
      mode: 'DRAIN_UNTIL_BLOCKED',
    });
    await expect(page.getByText(/Universe signoff FAIL; downstream allowed: no; next action VALIDATE_PROVIDERS/)).toBeVisible();
    await expect(page.getByText('Universe Repair Workflow')).toBeVisible();
    await expect(page.getByText('Trusted Universe Repair Workbench')).toBeVisible();
    await expect(page.getByText('Recommended: PROVIDER_VALIDATION')).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^PROVIDER_VALIDATION$/ })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^PRICE_BACKFILL$/ })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^STALE_EOD$/ })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^CATALOG_IDENTITY$/ })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^PROVIDER_BUSINESS_METADATA$/ })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^MANUAL_METADATA_IMPORT$/ })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^INSUFFICIENT_TRUSTED_UNIVERSE$/ })).toBeVisible();
    const providerValidationLane = page
      .getByRole('heading', { name: 'Provider validation' })
      .locator('xpath=ancestor::div[contains(@class, "MuiBox-root")][2]');
    await expect(providerValidationLane.getByText('Latest run COMPLETED: success 45, failed 5, skipped 0, warnings 1.', { exact: true })).toBeVisible();
    await expect(page.getByText('POST /api/v1/market-data/provider/validate; IN/STOCK; batch 50').first()).toBeVisible();
    await expect(page.getByText('Requires explicit manual metadata CSV payload.')).toBeVisible();
    await expect(page.getByText('Provider unknown', { exact: true })).toBeVisible();
    await expect(page.getByText('Retry eligible providers', { exact: true })).toBeVisible();
    await expect(page.getByText('Retry cooldown providers', { exact: true })).toBeVisible();
    await expect(page.getByText('Manual provider repair', { exact: true })).toBeVisible();
    await expect(page.getByText('Retry blocked until 2,909 unknown provider rows drain.')).toBeVisible();
    await expect(page.getByText('Retry failed providers disabled: UNKNOWN queue still has 2,909 rows.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry failed providers' })).toBeVisible();
    await expect(page.getByText('Unsupported excluded', { exact: true })).toBeVisible();
    await expect(page.getByText('Supported identity gaps', { exact: true })).toBeVisible();
    await expect(page.getByText('Supported price backfill needed', { exact: true })).toBeVisible();
    await expect(page.getByText('15-year/listing-date incomplete', { exact: true })).toBeVisible();
    await expect(page.getByText('Missing listing date coverage', { exact: true })).toBeVisible();
    await expect(page.getByText('Fallback-required coverage', { exact: true })).toBeVisible();
    await expect(page.getByText('Every IN/STOCK needs 15 years of daily OHLCV, or listing-date-to-latest coverage when the listing is newer.')).toBeVisible();
    await expect(page.getByText(/Coverage sample PLAN\.NS: NEEDS_BACKFILL; required 2011-05-12 to 2026-05-12; listing date missing; stored 2018-01-01 to 2026-05-10 \(1,830 bars\); complete no; fallback reason YAHOO_SHALLOW_HISTORY\./)).toBeVisible();
    await expect(page.getByText('Supported business metadata gaps', { exact: true })).toBeVisible();
    await expect(page.getByText('Business metadata auto-repairable')).toBeVisible();
    await expect(page.getByText('Business metadata manual-required')).toBeVisible();
    await expect(page.getByText('Business metadata retry-blocked')).toBeVisible();
    await expect(page.getByText('Business metadata retry-eligible')).toBeVisible();
    await expect(page.getByText('Recently attempted/skipped')).toBeVisible();
    await expect(page.getByText('Manual business metadata required')).toBeVisible();
    await expect(page.getByText('Manual sector/industry required')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '2,801' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry failed providers' })).toBeDisabled();
    await page.getByRole('button', { name: 'Validate unknown providers' }).click();
    await expect.poll(() => providerPayload).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 50,
      offset: 0,
      providerValidationQueue: 'UNKNOWN_FIRST',
      force: false,
    });
    await expect(page.getByText(/Last repair batch processed 50 of 2,909/)).toBeVisible();
    await expect(page.getByText(/Provider queue: UNKNOWN_FIRST/)).toBeVisible();
    await expect(page.getByText(/Provider validation: validated 50, supported 45, unsupported 3, failed 5/)).toBeVisible();
    await expect(page.getByText(/Provider classifications: stored-price supported 1, no provider symbol 1, no candles in wide window 2, manual symbol repair 2/)).toBeVisible();
    await expect(page.getByText(/Retry diagnostics: timeout 1, provider error 3, rate limit 1, cooldown skipped 0, manual skipped 5/)).toBeVisible();
    await expect(page.getByText(/Remaining provider queues: unknown 2,859, retry eligible 12, retry blocked 8, manual 5/)).toBeVisible();
    await expect(page.getByText(/Provider timing: calls 49, timeouts 1, retryable failures 5, slow calls 3, max 4,500 ms, p95 2,800 ms/)).toBeVisible();
    await expect(page.getByText(/Validation window 2026-03-28 to 2026-05-12; free fallback required 1; source attempted NSE_CM_UDIFF_BHAVCOPY; paid providers forbidden/)).toBeVisible();
    await expect(page.getByText(/Coverage target: 15-year\/listing-date daily OHLCV from 2011-05-12 through latest completed EOD 2026-05-12; listing date 2018-08-10; status FALLBACK_REQUIRED/)).toBeVisible();
    await expect(page.getByText(/Sample ABC\.NS: SUPPORTED_WITH_CANDLES via ABC\.NS; candles 32; 820 ms/)).toBeVisible();

    await expect(page.getByRole('button', { name: 'Retry failed providers' })).toBeEnabled();
    await page.getByRole('button', { name: 'Retry failed providers' }).click();
    await expect.poll(() => providerPayload).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 50,
      offset: 0,
      providerValidationQueue: 'RETRY_FAILED',
      force: false,
    });

    await page.getByRole('button', { name: 'Repair catalog identity' }).click();
    await expect.poll(() => catalogPayload).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 50,
      offset: 0,
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
    });
    await expect(page.getByText(/Catalog identity repaired for 25 rows/)).toBeVisible();

    await page.getByRole('button', { name: 'Enrich provider business metadata' }).click();
    await expect.poll(() => metadataPayload).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 50,
      offset: 0,
      force: false,
      workerConcurrency: 4,
    });
    await expect(page.getByText(/updated 50, skipped 0, failed 0, no-op 0, manual required 50/)).toBeVisible();
    await expect(page.getByText(/Partial metadata repairs: 50/)).toBeVisible();
    await expect(page.getByText(/marketCap is still required/)).toBeVisible();
    await expect(page.getByText(/Recently attempted\/skipped: 149/)).toBeVisible();
    await expect(page.getByText(/Remaining manual-required: 159/)).toBeVisible();
    const repairAlertClass = await page.getByRole('alert').filter({ hasText: 'Last repair batch processed 50 of 2,909' }).getAttribute('class');
    expect(repairAlertClass).toContain('MuiAlert-standardWarning');

    await expect(page.getByRole('button', { name: 'Export Manual Metadata Template' })).toBeVisible();
    await page.getByRole('button', { name: 'Export Manual Metadata Template' }).click();
    await expect(page.getByText(/Manual metadata template loaded with 2 unresolved rows/)).toBeVisible();
    await expect(page.getByLabel('Manual metadata CSV')).toHaveValue(/symbol,providerSymbol,companyName/);
    await page.getByLabel('Manual metadata CSV').fill('symbol,sector,industry\nABB,Industrials,Electrical Equipment\n');
    await expect(page.getByText('CSV must include marketCap.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import manual metadata' })).toBeDisabled();
    await page.getByLabel('Manual metadata CSV').fill('symbol,sector,industry,marketCap\nABB,Industrials,Electrical Equipment,1000\n');
    await expect(page.getByText('marketCap is required to fully resolve business metadata')).toHaveCount(0);
    await page.getByRole('button', { name: 'Import manual metadata' }).click();
    await expect.poll(() => manualPayloads[0]).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      offset: 0,
      csvText: 'symbol,sector,industry,marketCap\nABB,Industrials,Electrical Equipment,1000\n',
    });
    await expect(page.getByText(/More source rows remain; next offset 50/)).toBeVisible();
    await page.getByRole('button', { name: 'Import manual metadata' }).click();
    await expect.poll(() => manualPayloads[1]).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      offset: 50,
      csvText: 'symbol,sector,industry,marketCap\nABB,Industrials,Electrical Equipment,1000\n',
    });
    await expect(page.getByText(/No more rows in this repair queue/)).toBeVisible();

    await page.getByLabel('Manual metadata CSV').fill('symbol,sector,industry,marketCap\nABB,Unknown,N/A,0\n');
    await expect(page.getByText('Sector cannot be Unknown, N/A, NA, None, Null, or blank.', { exact: true })).toBeVisible();
    await expect(page.getByText('marketCap must be a positive number.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import manual metadata' })).toBeDisabled();

    await page.getByRole('button', { name: 'Backfill prices' }).click();
    await expect.poll(() => pricePayload).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 50,
      offset: 0,
      force: true,
    });
    expect(pricePayload).not.toHaveProperty('fullReload');
    await expect(page.getByText(/Last repair batch processed 50 of 585/)).toBeVisible();
    await expect(page.getByText('Another bounded run is needed; rerun this batch action from offset 0.')).toBeVisible();
    await expect(page.getByText('Price rows received 0, inserted 0, updated 0, no-op 0.')).toBeVisible();
    await expect(page.getByText('Zero-row provider returns 2; deep reloaded 0; incremental caught up 0; remaining candidates 585.')).toBeVisible();
    await expect(page.getByText('Latest completed EOD 2026-05-12; target end 2026-05-12T23:59:59.999Z.')).toBeVisible();
    await expect(page.getByText('Still under 120 30, under 200 75, under 252 144.')).toBeVisible();
    await expect(page.getByText('15-year/listing-date coverage: incomplete 144, missing listing date 20, fallback required 2.')).toBeVisible();
    await expect(page.getByText(/Coverage sample BACKFILL\.NS: NEEDS_BACKFILL; required 2011-05-12 to 2026-05-12; listing date 2018-08-10; stored 2020-01-01 to 2026-05-10 \(1,200 bars\); complete no; fallback reason YAHOO_SHALLOW_HISTORY\./)).toBeVisible();
    await expect(page.getByText('Zero rows returned by provider for 2 supported symbols.')).toBeVisible();
    const priceRepairAlertClass = await page.getByRole('alert').filter({ hasText: 'Zero-row provider returns 2' }).getAttribute('class');
    expect(priceRepairAlertClass).toContain('MuiAlert-standardWarning');
  });

  test('data health tab remains usable when review readiness summary is unavailable', async ({ page }) => {
    const signoffFail = {
      status: 'FAIL',
      minReviewReadyRequired: 300,
      reviewReadyActual: 0,
      blockers: [{ code: 'PROVIDER_UNKNOWN_REMAINING', severity: 'critical', count: 2, required: 0, nextAction: 'VALIDATE_PROVIDERS' }],
      nextAction: 'VALIDATE_PROVIDERS',
      downstreamAllowed: false,
    };
    await page.route('**/api/v1/instruments**', async (route) => {
      await route.fulfill({ json: { instruments: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } } });
    });
    await page.route('**/api/v1/market-data/catalog/sources', async (route) => {
      await route.fulfill({ json: { sources: [] } });
    });
    await page.route('**/api/v1/market-data/health**', async (route) => {
      await route.fulfill({
        json: {
          status: 'ok',
          module: 'market-data-foundation',
          instrumentCount: 2,
          latestDataTimestamp: null,
          source: 'database',
          ingestion_timestamp: '2026-05-11T00:00:00.000Z',
          last_updated_timestamp: null,
          data_status: 'PARTIAL',
          timestamp: '2026-05-11T00:00:00.000Z',
          region: 'IN',
          assetType: 'STOCK',
        },
      });
    });
    await page.route('**/api/v1/market-data/universe/health**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          generatedAt: '2026-05-11T00:00:00.000Z',
          latestStoredEodDate: null,
          expectedLatestTradingDate: '2026-05-11',
          counts: {
            totalCatalogInstruments: 2,
            activeInstruments: 2,
            inactiveOrDelistedInstruments: 0,
            providerSupported: 0,
            providerUnknown: 2,
            providerUnknownValidationNeeded: 2,
            providerRetryValidationNeeded: 0,
            providerUnsupportedExcluded: 0,
            providerValidationFailed: 0,
            unsupported: 0,
            unsupportedExcluded: 0,
            supportedCatalogIdentityRepairNeeded: 0,
            supportedBusinessMetadataRepairNeeded: 0,
            supportedPriceBackfillNeeded: 0,
            catalogOnly: 2,
            priceReady: 0,
            contextReady: 0,
            reviewReady: 0,
            staleOrIncomplete: 0,
            missingLatestPrice: 2,
            staleLatestPrice: 0,
            missingOrInadequatePriceHistory: 2,
            missingRecentVolume: 2,
            missingSector: 0,
            missingIndustry: 0,
            missingCountry: 0,
            missingCurrency: 0,
            missingMarketCap: 0,
            missingIsin: 0,
            missingListingDate: 0,
            byUniverseState: { CATALOG_ONLY: 2, PROVIDER_SUPPORTED: 0, PRICE_READY: 0, CONTEXT_READY: 0, REVIEW_READY: 0, UNSUPPORTED: 0, STALE_OR_INCOMPLETE: 0, DELISTED_OR_INACTIVE: 0 },
            readiness: { priceReady: 0, contextReady: 0, reviewReady: 0 },
          },
          coverage: { priceCoveragePercentage: 0, metadataCoveragePercentage: 0, reviewReadyPercentage: 0 },
          topBlockers: [{ code: 'PROVIDER_UNKNOWN', label: 'Provider support not validated', count: 2, severity: 'critical' }],
          warnings: ['Provider UNKNOWN for scoped instruments.'],
          trustStatus: 'NOT_TRUSTWORTHY',
          trustReasons: ['2 active instruments still need provider validation.'],
          universeSignoff: signoffFail,
        },
      });
    });
    await page.route('**/api/v1/market-data/review-readiness-summary**', async (route) => {
      await route.fulfill({ status: 500, json: { error: 'Review readiness summary failed' } });
    });
    await page.route('**/api/v1/market-data/review-universe**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          asOfDate: '2026-05-12',
          targetTradingDate: '2026-05-12',
          requiredDataThroughDate: '2026-05-11',
          storedDataThroughDate: null,
          catalogCount: 2,
          providerSupportedCount: 0,
          trustedCount: 0,
          status: 'NOT_READY',
          mode: 'NO_REVIEW',
          minLiteCount: 100,
          minFullCount: 300,
          dataThroughDate: null,
          scanPolicy: { scanLimit: 0, scanComplete: true, scanOrdering: 'recentVolumeDesc_priceHistoryCompleteness_latestFreshness_symbol' },
          excludedCounts: { providerUnknown: 2, providerRetryFailed: 0, providerUnsupported: 0, inactiveOrDelisted: 0, noLatestPrice: 0, staleLatestPrice: 0, insufficientBarsUnder120: 0, insufficientBarsUnder252: 0, missingRecentVolume: 0, corporateActionBlocked: 0 },
          contextGapCounts: { missingSector: 0, missingIndustry: 0, missingMarketCap: 0, missingIsin: 0, missingListingDate: 0 },
          warnings: ['Trusted review universe is not ready.'],
        },
      });
    });
    await page.route('**/api/v1/market-data/universe/repair-plan**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          generatedAt: '2026-05-11T00:00:00.000Z',
          totalCatalogInstruments: 2,
          providerUnknownValidationNeeded: 2,
          providerRetryValidationNeeded: 0,
          providerUnsupportedExcluded: 0,
          providerValidationFailed: 0,
          providerValidationNeeded: 2,
          retryFailedValidations: 0,
          supportedCatalogIdentityRepairNeeded: 0,
          supportedBusinessMetadataRepairNeeded: 0,
          supportedPriceBackfillNeeded: 0,
          unsupportedExcluded: 0,
          catalogIdentityRepairNeeded: 0,
          priceBackfillNeeded: 0,
          businessMetadataRepairNeeded: 0,
          businessMetadataAutoRepairable: 0,
          businessMetadataManualRequired: 0,
          businessMetadataRetryBlocked: 0,
          businessMetadataRetryEligible: 0,
          businessMetadataRecentlyAttempted: 0,
          metadataEnrichmentNeeded: 0,
          manualMetadataRequired: 0,
          manualBusinessMetadataRequired: 0,
          missingIsin: 0,
          missingListingDate: 0,
          missingSector: 0,
          missingIndustry: 0,
          missingMarketCap: 0,
          manualSectorIndustryRequired: 0,
          topActions: [{ action: 'VALIDATE_PROVIDERS', label: 'Validate unknown providers', count: 2 }],
          warnings: ['2 UNKNOWN instruments need provider validation before review workflows can trust them.'],
          universeSignoff: signoffFail,
        },
      });
    });
    await page.route('**/api/v1/market-data/stocks/missing-data-diagnostics**', async (route) => {
      await route.fulfill({ status: 404, json: { error: 'Stock missing-data diagnostics unavailable' } });
    });
    await page.route('**/api/v1/market-data/universe/repair-runs/latest**', async (route) => {
      await route.fulfill({ json: null });
    });
    await page.route('**/api/v1/market-data/universe/repair-workbench**', async (route) => {
      await route.fulfill({ json: null });
    });
    await page.route('**/api/v1/market-data/scheduler/status', async (route) => {
      await route.fulfill({
        json: {
          enabled: false,
          intervalMinutes: 15,
          regions: ['IN'],
          assetType: 'STOCK',
          activeRun: false,
          lastRunAt: null,
          nextSuggestedRunAt: null,
          regionStatuses: [],
        },
      });
    });

    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await page.getByRole('tab', { name: 'Data Health' }).click();

    await expect(page.getByText('Downstream Gate')).toBeVisible();
    await expect(page.getByText('Gate: BLOCKED')).toBeVisible();
    await expect(page.getByRole('button', { name: /Next bounded action: NONE/ })).toBeDisabled();
    await expect(page.getByText('Disabled: no bounded lane action is available for this scope.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Universe Health' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Trusted Review Universe' })).toBeVisible();
    await expect(page.getByText('Review Readiness Summary')).toBeVisible();
    await expect(page.getByText('Decision: WAIT')).toBeVisible();
    await expect(page.getByText('Trusted / catalog: 0 / 0')).toBeVisible();
    await expect(page.getByText('Next action: none')).toBeVisible();
    await expect(page.getByText('Unable to load market data status')).toHaveCount(0);
  });

  test('catalog table exposes scoped instrument fields and compact filters', async ({ page }) => {
    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await expect(page.getByRole('button', { name: 'Sync Catalog' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingestion' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Instrument' })).toBeVisible();
    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Segment/Class').first()).toBeVisible();
    await expect(page.getByText('Provider Support').first()).toBeVisible();
    await expect(page.getByText('No configured URL for this source')).toHaveCount(0);
  });

  test('sync catalog starts a run, shows progress, and never posts sync-all', async ({ page }) => {
    await mockCatalogPageShell(page);
    let startPayload: any = null;
    let syncAllPosted = false;
    let schedulerRefreshCount = 0;
    let pollCount = 0;

    await page.route('**/api/market-data-foundation/stocks/sync-all**', async (route) => {
      if (route.request().method() === 'POST') syncAllPosted = true;
      await route.fulfill({ status: 500, json: { success: false, message: 'Legacy sync-all should not be called.' } });
    });
    await page.route('**/api/market-data-foundation/stocks/sync-runs', async (route) => {
      startPayload = route.request().postDataJSON();
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.fulfill({
        status: 202,
        json: catalogSyncStatus({ runId: 'catalog-sync-progress', message: 'Catalog sync started.' }),
      });
    });
    await page.route('**/api/market-data-foundation/stocks/sync-runs/catalog-sync-progress', async (route) => {
      pollCount += 1;
      await route.fulfill({
        json: pollCount === 1
          ? catalogSyncStatus({
              runId: 'catalog-sync-progress',
              processedCount: 25,
              succeededCount: 22,
              failedCount: 1,
              skippedCount: 2,
              noOpCount: 5,
              rowsInserted: 40,
              rowsUpdated: 4,
              rowsSkipped: 8,
              warningCount: 1,
              currentBatchNumber: 1,
              batchesExecuted: 1,
              percentComplete: 25,
              message: 'Processing batch 1 of 4.',
            })
          : catalogSyncStatus({
              runId: 'catalog-sync-progress',
              status: 'COMPLETED',
              processedCount: 100,
              succeededCount: 95,
              failedCount: 1,
              skippedCount: 4,
              noOpCount: 12,
              rowsInserted: 120,
              rowsUpdated: 9,
              rowsSkipped: 18,
              warningCount: 1,
              currentBatchNumber: 4,
              batchesExecuted: 4,
              hasMore: false,
              percentComplete: 100,
              completedAt: '2026-05-13T10:16:00.000Z',
              message: 'Catalog sync completed.',
            }),
      });
    });
    await page.route('**/api/v1/market-data/scheduler/status', async (route) => {
      schedulerRefreshCount += 1;
      await route.fulfill({
        json: {
          enabled: false,
          intervalMinutes: 15,
          regions: ['IN'],
          assetType: 'STOCK',
          activeRun: false,
          lastRunAt: null,
          nextSuggestedRunAt: null,
          regionStatuses: [],
        },
      });
    });

    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await page.getByRole('button', { name: 'Sync Catalog' }).click();

    await expect(page.getByRole('button', { name: 'Syncing Catalog...' })).toBeDisabled();
    await expect(page.getByRole('progressbar', { name: 'Catalog sync progress' })).toBeVisible();
    await expect(page.getByText('Scope: IN/STOCK; status PENDING')).toBeVisible();
    await expect.poll(() => startPayload).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 25,
      workerCount: 1,
      workerConcurrency: 2,
      delayBetweenBatchesMs: 3000,
      maxBatches: 20,
    });
    await expect(page.getByText('Processed 25 / 100')).toBeVisible();
    await expect(page.getByText('Rows inserted 40')).toBeVisible();
    await expect(page.locator('.MuiChip-label').filter({ hasText: /^Batch 1 of 4$/ })).toBeVisible();
    await expect(page.getByText('Catalog sync COMPLETED for IN/STOCK: processed 100 of 100')).toBeVisible();
    expect(syncAllPosted).toBe(false);
    expect(schedulerRefreshCount).toBeGreaterThan(0);
  });

  test('partial catalog sync offers continue for the same scope', async ({ page }) => {
    await mockCatalogPageShell(page);
    const startPayloads: any[] = [];
    let pollCount = 0;

    await page.route('**/api/market-data-foundation/stocks/sync-all**', async (route) => {
      await route.fulfill({ status: 500, json: { success: false, message: 'Legacy sync-all should not be called.' } });
    });
    await page.route('**/api/market-data-foundation/stocks/sync-runs', async (route) => {
      const payload = route.request().postDataJSON();
      startPayloads.push(payload);
      await route.fulfill({
        status: 202,
        json: catalogSyncStatus({
          runId: startPayloads.length === 1 ? 'catalog-sync-partial' : 'catalog-sync-continued',
          region: payload.region,
          assetType: payload.assetType,
          message: 'Catalog sync started.',
        }),
      });
    });
    await page.route('**/api/market-data-foundation/stocks/sync-runs/catalog-sync-partial', async (route) => {
      pollCount += 1;
      await route.fulfill({
        json: catalogSyncStatus({
          runId: 'catalog-sync-partial',
          status: pollCount === 1 ? 'PARTIAL' : 'RUNNING',
          processedCount: 50,
          succeededCount: 48,
          failedCount: 1,
          skippedCount: 1,
          rowsInserted: 80,
          rowsUpdated: 6,
          rowsSkipped: 3,
          currentBatchNumber: 2,
          batchesExecuted: 2,
          hasMore: true,
          percentComplete: 50,
          completedAt: '2026-05-13T10:18:00.000Z',
          message: 'Max batches reached; more rows remain.',
        }),
      });
    });
    await page.route('**/api/v1/market-data/scheduler/status', async (route) => {
      await route.fulfill({
        json: {
          enabled: false,
          intervalMinutes: 15,
          regions: ['IN'],
          assetType: 'STOCK',
          activeRun: false,
          lastRunAt: null,
          nextSuggestedRunAt: null,
          regionStatuses: [],
        },
      });
    });

    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await page.getByRole('button', { name: 'Sync Catalog' }).click();

    await expect(page.getByText('Catalog sync PARTIAL for IN/STOCK: processed 50 of 100')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue catalog sync' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue catalog sync' }).click();
    await expect.poll(() => startPayloads.length).toBe(2);
    expect(startPayloads[1]).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 25,
      workerCount: 1,
      workerConcurrency: 2,
    });
  });

  test('active catalog sync can be canceled', async ({ page }) => {
    await mockCatalogPageShell(page);
    let cancelPosted = false;

    await page.route('**/api/market-data-foundation/stocks/sync-runs', async (route) => {
      await route.fulfill({
        status: 202,
        json: catalogSyncStatus({ runId: 'catalog-sync-cancel', processedCount: 10, percentComplete: 10 }),
      });
    });
    await page.route('**/api/market-data-foundation/stocks/sync-runs/catalog-sync-cancel/cancel', async (route) => {
      cancelPosted = route.request().method() === 'POST';
      await route.fulfill({
        json: catalogSyncStatus({
          runId: 'catalog-sync-cancel',
          status: 'PARTIAL',
          processedCount: 10,
          succeededCount: 9,
          skippedCount: 1,
          hasMore: true,
          percentComplete: 10,
          completedAt: '2026-05-13T10:19:00.000Z',
          message: 'Cancellation requested. The current batch will finish before the run stops.',
        }),
      });
    });
    await page.route('**/api/market-data-foundation/stocks/sync-runs/catalog-sync-cancel', async (route) => {
      await route.fulfill({ json: catalogSyncStatus({ runId: 'catalog-sync-cancel', processedCount: 10, percentComplete: 10 }) });
    });
    await page.route('**/api/v1/market-data/scheduler/status', async (route) => {
      await route.fulfill({
        json: {
          enabled: false,
          intervalMinutes: 15,
          regions: ['IN'],
          assetType: 'STOCK',
          activeRun: false,
          lastRunAt: null,
          nextSuggestedRunAt: null,
          regionStatuses: [],
        },
      });
    });

    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await page.getByRole('button', { name: 'Sync Catalog' }).click();
    await page.getByRole('button', { name: 'Cancel catalog sync' }).click();

    await expect.poll(() => cancelPosted).toBe(true);
    await expect(page.getByText('status PARTIAL')).toBeVisible();
    await expect(page.locator('p').filter({ hasText: /^Cancellation requested\. The current batch will finish before the run stops\.$/ })).toBeVisible();
  });

  test('import and backfill panel exposes usable catalog actions', async ({ page }) => {
    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await page.getByRole('tab', { name: 'Import & Backfill' }).click();
    await expect(page.getByRole('button', { name: 'Import Catalog' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Backfill Metadata' })).toBeVisible();
    await expect(page.getByText('NSE Equity Securities')).toBeVisible();
  });

  test('configured catalog import sends safe source mode without running a real import', async ({ page }) => {
    let importPayload: any = null;
    await page.route('**/api/v1/market-data/catalog/import', async (route) => {
      importPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          catalogSource: importPayload.catalogSource,
          importMode: importPayload.importMode,
          downloaded: true,
          fileSizeBytes: 1024,
          tempFileDeleted: true,
          sourceRows: 1,
          processedCount: 1,
          totalCount: 1,
          batchSize: importPayload.batchSize,
          offset: importPayload.offset,
          nextOffset: null,
          hasMore: false,
          insertedCount: 0,
          updatedCount: 0,
          noOpCount: 1,
          invalidCount: 0,
          providerValidatedCount: 0,
          providerUnsupportedCount: 0,
          warnings: [],
          durationMs: 1,
        }),
      });
    });

    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await page.getByRole('tab', { name: 'Import & Backfill' }).click();
    await page.getByRole('button', { name: 'Import Catalog' }).click();

    await expect.poll(() => importPayload).toMatchObject({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
      validateProvider: false,
      batchSize: 100,
      offset: 0,
    });
    await expect(page.getByText('NSE_EQUITY_SECURITIES: 0 inserted, 0 updated, 1 no-op')).toBeVisible();
  });

  test('catalog metadata backfill sends selected catalog source scope', async ({ page }) => {
    let backfillPayload: any = null;
    await mockAuthenticatedUser(page);
    await mockCatalogPageShell(page, [
      {
        catalogSource: 'NSE_EQUITY_SECURITIES',
        displayName: 'NSE Equity Securities',
        enabled: true,
        region: 'IN',
        assetType: 'STOCK',
        segmentClass: 'CASH',
        fileType: 'csv',
        parserType: 'NSE_EQUITY_SECURITIES',
        importModes: ['CONFIGURED_URL'],
        urlConfigured: true,
        urlSource: 'DEFAULT',
        supportsManualCsv: true,
        supportsConfiguredUrl: true,
        supportsInternalSeed: false,
        lastImportedAt: null,
      },
      {
        catalogSource: 'NSE_ETF_SECURITIES',
        displayName: 'NSE ETF Securities',
        enabled: true,
        region: 'IN',
        assetType: 'ETF',
        segmentClass: 'ETF',
        fileType: 'csv',
        parserType: 'NSE_ETF_SECURITIES',
        importModes: ['CONFIGURED_URL'],
        urlConfigured: true,
        urlSource: 'DEFAULT',
        supportsManualCsv: true,
        supportsConfiguredUrl: true,
        supportsInternalSeed: false,
        lastImportedAt: null,
      },
    ]);
    await page.route('**/api/v1/market-data/catalog/backfill-metadata', async (route) => {
      backfillPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          catalogSource: backfillPayload.catalogSource,
          processedCount: 0,
          totalCount: 0,
          batchSize: backfillPayload.batchSize,
          workerConcurrency: 16,
          offset: backfillPayload.offset,
          nextOffset: null,
          hasMore: false,
          updated: 0,
          noOp: 0,
          skipped: 0,
          validated: 0,
          providerUnsupported: 0,
          warnings: [],
          durationMs: 1,
        }),
      });
    });

    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await page.getByRole('tab', { name: 'Import & Backfill' }).click();
    await page.getByLabel('Catalog Source').click();
    await page.getByRole('option', { name: 'NSE ETF Securities' }).click();
    await page.getByRole('button', { name: 'Backfill Metadata' }).click();

    await expect.poll(() => backfillPayload).toMatchObject({
      region: 'IN',
      assetType: 'ETF',
      catalogSource: 'NSE_ETF_SECURITIES',
      batchSize: 100,
      offset: 0,
      validateProvider: false,
    });
    await expect(page.getByText('Backfill processed 0/0')).toBeVisible();
  });
});
