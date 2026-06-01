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

  test('data health tab renders exchange source evidence and readiness counts', async ({ page }) => {
    await mockCatalogPageShell(page);
    await page.route('**/api/v1/market-data/health**', async (route) => {
      await route.fulfill({ json: { status: 'ok', source: 'NSE/BSE', instrumentCount: 2910, latestDataTimestamp: '2026-05-27T00:00:00.000Z', data_status: 'COMPLETE' } });
    });
    await page.route('**/api/v1/market-data/universe/health**', async (route) => {
      await route.fulfill({ json: { counts: { reviewReady: 144, priceReady: 2600, catalogOnly: 166 }, coverage: {}, topBlockers: [] } });
    });
    await page.route('**/api/v1/market-data/review-readiness-summary**', async (route) => {
      await route.fulfill({ json: { blockers: [{ code: 'STALE_LATEST_PRICE', label: 'Latest price stale' }] } });
    });
    await page.route('**/api/v1/market-data/review-universe**', async (route) => {
      await route.fulfill({ json: { status: 'LIMITED', mode: 'LIMITED_REVIEW' } });
    });
    await page.route('**/api/v1/market-data/scheduler/status', async (route) => {
      await route.fulfill({
        json: {
          enabled: false,
          intervalMinutes: 1440,
          regions: ['IN'],
          assetType: 'STOCK',
          activeRun: false,
          lastRunAt: '2026-05-27T17:10:00.000Z',
          nextSuggestedRunAt: null,
          regionStatuses: [{ region: 'IN', assetType: 'STOCK', candleSyncStatus: 'MISSING_LATEST_COMPLETED' }],
        },
      });
    });
    await page.route('**/api/v1/market-data/source-file-imports**', async (route) => {
      await route.fulfill({
        json: {
          count: 1,
          imports: [{
            id: 'source-file-1',
            source: 'NSE',
            segment: 'CM',
            tradingDate: '2026-05-27',
            fileName: 'BhavCopy_NSE_CM_20260527.csv',
            fileUrl: 'local-fixture://nse-cm.csv',
            fileHash: 'abc',
            fileSize: 2048,
            status: 'COMPLETED',
            rowsRaw: 2613,
            rowsAccepted: 2613,
            rowsRejected: 0,
            parserVersion: 'nse-cm-udiff-v1',
            importedAt: '2026-05-27T17:10:00.000Z',
            errorMessage: null,
            createdAt: '2026-05-27T17:10:00.000Z',
            updatedAt: '2026-05-27T17:10:00.000Z',
          }],
        },
      });
    });

    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await page.getByRole('tab', { name: 'Data Health' }).click();

    await expect(page.getByRole('heading', { name: 'Exchange Data Health' })).toBeVisible();
    await expect(page.getByText('NSE/BSE-only market-data status. Provider validation and provider backfill are disabled.')).toBeVisible();
    await expect(page.getByText('Stored Market Data')).toBeVisible();
    await expect(page.getByText('2,910 instruments')).toBeVisible();
    await expect(page.getByText('Latest Exchange Evidence')).toBeVisible();
    await expect(page.getByRole('heading', { name: '2026-05-27' })).toBeVisible();
    await expect(page.getByText('NSE CM').first()).toBeVisible();
    await expect(page.getByText('Accepted 2,613').first()).toBeVisible();
    await expect(page.getByText('Scheduler')).toBeVisible();
    await expect(page.getByText('MISSING_LATEST_COMPLETED')).toBeVisible();
    await expect(page.getByText('Readiness Snapshot')).toBeVisible();
    await expect(page.getByText('Review ready 144')).toBeVisible();
    await expect(page.getByText('Price ready 2,600')).toBeVisible();
    await expect(page.getByText('Catalog only 166')).toBeVisible();
    await expect(page.getByText('Trusted mode LIMITED_REVIEW')).toBeVisible();
    await expect(page.getByText('Review blockers 1')).toBeVisible();
    await expect(page.getByText('Recent Source Files')).toBeVisible();
    await expect(page.getByText('BhavCopy_NSE_CM_20260527.csv')).toHaveCount(2);
    await expect(page.getByText('Downstream Gate')).toHaveCount(0);
  });
  test('data health tab remains usable when review readiness summary is unavailable', async ({ page }) => {
    await mockCatalogPageShell(page);
    await page.route('**/api/v1/market-data/health**', async (route) => {
      await route.fulfill({ json: { status: 'ok', source: 'database', instrumentCount: 0, latestDataTimestamp: null, data_status: 'MISSING' } });
    });
    await page.route('**/api/v1/market-data/universe/health**', async (route) => {
      await route.fulfill({ json: { counts: { reviewReady: 0, priceReady: 0, catalogOnly: 0 }, coverage: {}, topBlockers: [] } });
    });
    await page.route('**/api/v1/market-data/review-readiness-summary**', async (route) => {
      await route.fulfill({ status: 404, json: { error: 'Review readiness unavailable' } });
    });
    await page.route('**/api/v1/market-data/review-universe**', async (route) => {
      await route.fulfill({ json: { status: 'NOT_READY', mode: 'NO_REVIEW' } });
    });
    await page.route('**/api/v1/market-data/scheduler/status', async (route) => {
      await route.fulfill({ json: { enabled: false, activeRun: false, lastRunAt: null, regionStatuses: [] } });
    });
    await page.route('**/api/v1/market-data/source-file-imports**', async (route) => {
      await route.fulfill({ json: { count: 0, imports: [] } });
    });

    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await page.getByRole('tab', { name: 'Data Health' }).click();

    await expect(page.getByRole('heading', { name: 'Exchange Data Health' })).toBeVisible();
    await expect(page.getByText('Review blockers 0')).toBeVisible();
    await expect(page.getByText('No completed import')).toBeVisible();
    await expect(page.getByText('No source-file imports recorded yet.')).toBeVisible();
    await expect(page.getByText('Downstream Gate')).toHaveCount(0);
    await expect(page.getByText('Unable to load market data status')).toHaveCount(0);
  });
  test('catalog table exposes scoped instrument fields and compact filters', async ({ page }) => {
    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await expect(page.getByRole('button', { name: 'Sync Catalog' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Instrument' })).toBeVisible();
    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Segment/Class').first()).toBeVisible();
    await expect(page.getByText('Data Health').first()).toBeVisible();
    await expect(page.getByText('Provider Support').first()).toHaveCount(0);
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
    });
    await expect(page.getByText('Backfill processed 0/0')).toBeVisible();
  });
});
