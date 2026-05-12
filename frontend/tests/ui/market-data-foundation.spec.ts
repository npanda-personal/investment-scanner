import { expect, test } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

test.describe('Market Data Foundation UI', () => {
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
    await page.route('**/api/v1/market-data/universe/repair-plan**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK' },
          generatedAt: '2026-05-11T00:00:00.000Z',
          totalCatalogInstruments: 2910,
          providerUnknownValidationNeeded: 2909,
          providerRetryValidationNeeded: 7,
          providerUnsupportedExcluded: 0,
          providerValidationFailed: 7,
          providerValidationNeeded: 2909,
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
          validationFailed: providerPayload.providerValidationQueue === 'RETRY_FAILED' ? 7 : 5,
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
          updated: 40,
          skipped: 10,
          failed: 0,
          noOp: 0,
          manualRequired: 0,
          warnings: [],
          durationMs: 1,
          priceRowsReceived: 12000,
          priceRowsInserted: 8000,
          priceRowsUpdated: 4000,
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

    await expect(page.getByRole('heading', { name: 'Universe Health' })).toBeVisible();
    await expect(page.getByText('Trust: NOT_TRUSTWORTHY')).toBeVisible();
    await expect(page.getByText('2,910 / 0')).toBeVisible();
    await expect(page.getByText('2,909 unknown, 7 retry failed, 0 unsupported excluded')).toBeVisible();
    await expect(page.getByRole('heading', { name: '0.0%' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: '0.1%' }).first()).toBeVisible();
    await expect(page.getByText('Latest EOD price is stale')).toBeVisible();
    await expect(page.getByText('Latest EOD price missing')).toBeVisible();
    await expect(page.getByText('Less than 252 daily bars')).toBeVisible();
    await expect(page.getByText('Recent volume missing')).toBeVisible();
    await expect(page.getByText('Sector metadata missing')).toBeVisible();
    await expect(page.getByText('Industry metadata missing')).toBeVisible();
    await expect(page.getByText(/Today's Plan remains blocked/)).toBeVisible();
    await expect(page.getByText('Universe Signoff')).toBeVisible();
    await expect(page.getByText('Signoff: FAIL')).toBeVisible();
    await expect(page.getByText('Downstream allowed: no')).toBeVisible();
    await expect(page.getByText('Review-ready: 0 / 300')).toBeVisible();
    await expect(page.getByText('Next action: VALIDATE_PROVIDERS')).toBeVisible();
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
      dryRun: false,
      mode: 'DRAIN_UNTIL_BLOCKED',
    });
    await expect(page.getByText(/Universe signoff FAIL; downstream allowed: no; next action VALIDATE_PROVIDERS/)).toBeVisible();
    await expect(page.getByText('Universe Repair Workflow')).toBeVisible();
    await expect(page.getByText('Provider unknown', { exact: true })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^Retry failed providers$/ })).toBeVisible();
    await expect(page.getByText('Unsupported excluded', { exact: true })).toBeVisible();
    await expect(page.getByText('Supported identity gaps', { exact: true })).toBeVisible();
    await expect(page.getByText('Supported price backfill needed', { exact: true })).toBeVisible();
    await expect(page.getByText('Supported business metadata gaps', { exact: true })).toBeVisible();
    await expect(page.getByText('Business metadata auto-repairable')).toBeVisible();
    await expect(page.getByText('Business metadata manual-required')).toBeVisible();
    await expect(page.getByText('Business metadata retry-blocked')).toBeVisible();
    await expect(page.getByText('Business metadata retry-eligible')).toBeVisible();
    await expect(page.getByText('Recently attempted/skipped')).toBeVisible();
    await expect(page.getByText('Manual business metadata required')).toBeVisible();
    await expect(page.getByText('Manual sector/industry required')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '2,801' })).toBeVisible();
    await page.getByRole('button', { name: 'Validate unknown providers' }).click();
    await expect.poll(() => providerPayload).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 50,
      offset: 0,
      providerValidationQueue: 'UNKNOWN_FIRST',
    });
    await expect(page.getByText(/Last repair batch processed 50 of 2,909/)).toBeVisible();
    await expect(page.getByText(/Provider queue: UNKNOWN_FIRST/)).toBeVisible();

    await page.getByRole('button', { name: 'Retry failed providers' }).click();
    await expect.poll(() => providerPayload).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 50,
      offset: 0,
      providerValidationQueue: 'RETRY_FAILED',
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
    await expect(page.getByText('CSV must include marketCap.')).toBeVisible();
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
    await expect(page.getByText('Sector cannot be Unknown, N/A, NA, None, Null, or blank.')).toBeVisible();
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
    await expect(page.getByText(/Last repair batch processed 50 of 585/)).toBeVisible();
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
});
