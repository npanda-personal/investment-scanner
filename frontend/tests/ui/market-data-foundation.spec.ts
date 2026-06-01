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
    await expect(page.getByRole('button', { name: 'Sync Catalog' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add Instrument' })).toBeVisible();
    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Segment/Class').first()).toBeVisible();
    await expect(page.getByText('Data Health').first()).toBeVisible();
    await expect(page.getByText('Provider Support').first()).toHaveCount(0);
    await expect(page.getByText('No configured URL for this source')).toHaveCount(0);
  });

  test('import and backfill panel exposes usable catalog actions', async ({ page }) => {
    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await page.getByRole('tab', { name: 'Import & Backfill' }).click();
    await expect(page.getByRole('button', { name: 'Import Catalog' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Backfill Metadata' })).toBeVisible();
    await expect(page.getByText('NSE Equity Securities')).toBeVisible();
  });

  test('Market Data Ops owns historical backfill workers and source-file evidence', async ({ page }) => {
    let backfillPayload: any = null;
    let resumeCount = 0;
    let retryCount = 0;
    let cancelCount = 0;
    let sourceImportRequestCount = 0;
    let sourceImportRequestUrl = '';
    let schedulerStatusRequestCount = 0;
    let backfillStatusRequestCount = 0;
    let currentBackfillStatus = 'PARTIAL';

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
    ]);
    await page.route('**/api/v1/market-data/scheduler/status', async (route) => {
      schedulerStatusRequestCount += 1;
      await route.fulfill({ json: { enabled: false, activeRun: false, lastRunAt: null, regionStatuses: [] } });
    });
    await page.route('**/api/v1/market-data/source-file-imports**', async (route) => {
      sourceImportRequestCount += 1;
      sourceImportRequestUrl = route.request().url();
      await route.fulfill({
        json: {
          count: 1,
          imports: [{
            id: 'source-nse-cm',
            source: 'NSE',
            segment: 'CM',
            tradingDate: '2026-05-22T00:00:00.000Z',
            fileName: 'NSE_UdIFF_CM_2026-05-22_extra_long_exchange_filename_that_must_not_expand_the_page_table.csv',
            fileUrl: null,
            fileHash: 'hash-nse-cm',
            fileSize: 1024,
            status: 'COMPLETED',
            rowsRaw: 3,
            rowsAccepted: 3,
            rowsRejected: 0,
            parserVersion: 'udiff-v1',
            importedAt: '2026-05-25T08:20:00.000Z',
            errorMessage: null,
            createdAt: '2026-05-25T08:20:00.000Z',
            updatedAt: '2026-05-25T08:20:00.000Z',
          }],
        },
      });
    });

    const completedBackfillJobs = [
        {
          id: 'hist-job-2026-05-20',
          tradingDate: '2026-05-20',
          dateRange: '2026-05-20',
          status: 'COMPLETED',
          source: 'NSE+BSE',
          rowsImported: 10,
          rowsInserted: 5,
          rowsUpdated: 2,
          rowsNoOp: 3,
          rowsSkipped: 0,
          bseFills: 1,
          error: null,
          retryCount: 0,
          startedAt: '2026-05-25T09:30:01.000Z',
          completedAt: '2026-05-25T09:30:03.000Z',
          sourceFileImportId: 'source-nse-cm',
        },
        {
          id: 'hist-job-2026-05-21',
          tradingDate: '2026-05-21',
          dateRange: '2026-05-21',
          status: 'NOT_AVAILABLE',
          source: 'NSE+BSE',
          rowsImported: 0,
          rowsInserted: 0,
          rowsUpdated: 0,
          rowsNoOp: 0,
          rowsSkipped: 8,
          bseFills: 0,
          error: 'HTTP 404',
          retryCount: 1,
          startedAt: '2026-05-25T09:30:04.000Z',
          completedAt: '2026-05-25T09:30:05.000Z',
          sourceFileImportId: null,
        },
    ];
    const runningBackfillJobs = [
      '2026-05-23',
      '2026-05-24',
      '2026-05-25',
    ].map((date) => ({
      id: `hist-job-${date}`,
      tradingDate: date,
      dateRange: date,
      status: 'RUNNING',
      source: 'NSE+BSE',
      rowsImported: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsNoOp: 0,
      rowsSkipped: 0,
      bseFills: 0,
      error: null,
      retryCount: 0,
      startedAt: '2026-05-25T09:30:06.000Z',
      completedAt: null,
      sourceFileImportId: null,
    }));
    const backfillResponse = (status = 'PARTIAL') => {
      const running = status === 'RUNNING';
      return {
        runId: 'hist-run-1',
        status,
        source: 'NSE',
        segment: 'CM',
        region: 'IN',
        assetType: 'STOCK',
        startDate: backfillPayload?.startDate || '2026-05-20',
        endDate: backfillPayload?.endDate || '2026-05-22',
        maxDates: null,
        workerCount: 3,
        maxWorkers: 5,
        maxRetries: 2,
        totalDates: running ? 4 : 3,
        pending: 0,
        running: running ? 3 : 0,
        completed: running ? 0 : 2,
        skipped: 0,
        failed: 0,
        notAvailable: 1,
        retryCount: 1,
        currentWorkers: running ? 3 : 0,
        rowsRead: running ? 0 : 20,
        rowsParsed: running ? 0 : 18,
        rowsInserted: running ? 0 : 5,
        rowsUpdated: running ? 0 : 2,
        rowsNoOp: running ? 0 : 3,
        rowsSkipped: running ? 0 : 8,
        bseFills: running ? 0 : 1,
        progressPercent: running ? 25 : 100,
        estimatedRemainingMs: running ? 12000 : null,
        startedAt: '2026-05-25T09:30:00.000Z',
        completedAt: running ? null : '2026-05-25T09:31:00.000Z',
        warnings: ['HTTP 404'],
        errors: [],
        jobs: running ? [...runningBackfillJobs, completedBackfillJobs[1]] : completedBackfillJobs,
      };
    };

    await page.route('**/api/v1/market-data/exchange-files/historical-backfill/runs**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      if (method === 'POST' && url.endsWith('/historical-backfill/runs')) {
        backfillPayload = route.request().postDataJSON();
        currentBackfillStatus = 'PARTIAL';
        await route.fulfill({ json: backfillResponse() });
        return;
      }
      if (method === 'POST' && url.endsWith('/resume')) {
        resumeCount += 1;
        currentBackfillStatus = 'RUNNING';
        await route.fulfill({ json: backfillResponse('RUNNING') });
        return;
      }
      if (method === 'POST' && url.endsWith('/retry-failed')) {
        retryCount += 1;
        currentBackfillStatus = 'RUNNING';
        await route.fulfill({ json: backfillResponse('RUNNING') });
        return;
      }
      if (method === 'POST' && url.endsWith('/cancel')) {
        cancelCount += 1;
        currentBackfillStatus = 'CANCELLED';
        await route.fulfill({ json: backfillResponse('CANCELLED') });
        return;
      }
      if (method === 'GET') {
        backfillStatusRequestCount += 1;
        await route.fulfill({ json: backfillResponse(currentBackfillStatus) });
        return;
      }
      await route.fulfill({ json: backfillResponse(currentBackfillStatus) });
    });

    await visitModule(page, '/market-data-foundation', 'Market Data Foundation');
    await page.getByRole('tab', { name: 'Import & Backfill' }).click();

    await expect(page.getByText('Historical Exchange Candle Backfill')).toBeVisible();
    await expect(page.getByText('Latest 10')).toBeVisible();
    await expect.poll(() => sourceImportRequestCount).toBeGreaterThanOrEqual(1);
    expect(new URL(sourceImportRequestUrl).searchParams.get('limit')).toBe('10');
    expect(new URL(sourceImportRequestUrl).searchParams.get('sortBy')).toBe('importedAt');
    expect(new URL(sourceImportRequestUrl).searchParams.get('sortDirection')).toBe('desc');

    const countBeforeTradingDateSort = sourceImportRequestCount;
    await page.getByText('Trading Date').click();
    await expect.poll(() => sourceImportRequestCount).toBeGreaterThan(countBeforeTradingDateSort);
    expect(new URL(sourceImportRequestUrl).searchParams.get('sortBy')).toBe('tradingDate');
    expect(new URL(sourceImportRequestUrl).searchParams.get('sortDirection')).toBe('desc');

    const countBeforeImportedSort = sourceImportRequestCount;
    await page.getByText('Imported').click();
    await expect.poll(() => sourceImportRequestCount).toBeGreaterThan(countBeforeImportedSort);
    expect(new URL(sourceImportRequestUrl).searchParams.get('sortBy')).toBe('importedAt');
    expect(new URL(sourceImportRequestUrl).searchParams.get('sortDirection')).toBe('desc');
    const countAfterInitialEvidenceLoad = sourceImportRequestCount;
    const statusPollCountAfterInitialLoad = schedulerStatusRequestCount;
    await expect(page.getByLabel('Date range')).toBeChecked();
    await expect(page.getByLabel('By year')).toBeVisible();
    await expect(page.getByLabel('Max dates')).toHaveCount(0);
    await expect(page.getByLabel('Worker count')).toHaveCount(0);
    await expect(page.getByLabel('Max retries')).toHaveCount(0);

    await page.getByLabel('Start Date').fill('2026-05-20');
    await page.getByLabel('End Date').fill('2026-05-22');
    await page.getByRole('button', { name: 'Run Backfill' }).click();
    await expect.poll(() => backfillPayload).toMatchObject({
      region: 'IN',
      assetType: 'STOCK',
      startDate: '2026-05-20',
      endDate: '2026-05-22',
      includeBseFill: true,
    });
    expect(backfillPayload).not.toHaveProperty('maxDates');
    expect(backfillPayload).not.toHaveProperty('workerCount');
    expect(backfillPayload).not.toHaveProperty('maxRetries');

    await expect(page.getByText('Historical Backfill Run')).toBeVisible();
    await expect(page.getByText('0 active / 3 configured')).toBeVisible();
    await expect(page.getByText('Needs attention: Official exchange file is not available for one or more dates.')).toBeVisible();
    await expect(page.getByLabel('Historical backfill date jobs')).toHaveCount(0);
    await expect(page.getByText('HTTP 404')).toHaveCount(0);
    expect(sourceImportRequestCount).toBeGreaterThanOrEqual(countAfterInitialEvidenceLoad);

    backfillPayload = null;
    await page.getByLabel('By year').check();
    await page.getByRole('combobox', { name: 'Year' }).click();
    await page.getByRole('option', { name: '2025' }).click();
    await page.getByRole('button', { name: 'Run Backfill' }).click();
    await expect.poll(() => backfillPayload).toMatchObject({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });
    expect(sourceImportRequestCount).toBeGreaterThanOrEqual(countAfterInitialEvidenceLoad);

    const countBeforeManualEvidenceRefresh = sourceImportRequestCount;
    await page.getByRole('button', { name: 'Refresh Evidence' }).click();
    await expect.poll(() => sourceImportRequestCount).toBeGreaterThan(countBeforeManualEvidenceRefresh);
    expect(new URL(sourceImportRequestUrl).searchParams.get('limit')).toBe('10');
    const countBeforeAutoEvidenceRefresh = sourceImportRequestCount;
    await page.waitForTimeout(10_500);
    expect(sourceImportRequestCount).toBe(countBeforeAutoEvidenceRefresh);
    expect(backfillStatusRequestCount).toBe(0);
    expect(schedulerStatusRequestCount).toBe(statusPollCountAfterInitialLoad);
    await page.getByRole('button', { name: 'View SourceFileImport details source-nse-cm' }).click();
    const sourceFileDialog = page.getByRole('dialog', { name: 'SourceFileImport Details' });
    await expect(sourceFileDialog).toBeVisible();
    await expect(sourceFileDialog.getByText('hash-nse-cm')).toBeVisible();
    await expect(sourceFileDialog.getByText('NSE_UdIFF_CM_2026-05-22_extra_long_exchange_filename_that_must_not_expand_the_page_table.csv')).toBeVisible();
    await page.getByRole('button', { name: 'Close SourceFileImport details' }).click();

    const runControls = page.getByLabel('Historical backfill run controls');
    await runControls.getByRole('button', { name: 'Resume Backfill' }).click();
    await expect.poll(() => resumeCount).toBe(1);
    await expect(page.getByText('3 active / 3 configured')).toBeVisible();
    await expect(page.getByText('2026-05-23, 2026-05-24, 2026-05-25')).toBeVisible();
    const countBeforeActiveEvidenceRefresh = sourceImportRequestCount;
    await page.waitForTimeout(10_500);
    await expect.poll(() => sourceImportRequestCount).toBeGreaterThan(countBeforeActiveEvidenceRefresh);
    expect(backfillStatusRequestCount).toBeGreaterThan(0);
    await runControls.getByRole('button', { name: 'Retry Failed Dates' }).click();
    await expect.poll(() => retryCount).toBe(1);
    await runControls.getByRole('button', { name: 'Cancel Backfill' }).click();
    await expect.poll(() => cancelCount).toBe(1);
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
