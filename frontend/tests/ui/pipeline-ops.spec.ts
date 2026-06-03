import { expect, test, type Page } from '@playwright/test';

async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-pipeline-ops-token');
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        id: 'playwright-pipeline-ops-user',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2026-05-25T00:00:00.000Z',
        updatedAt: '2026-05-25T00:00:00.000Z',
        lastLoginAt: '2026-05-25T00:00:00.000Z',
      },
    });
  });
  await page.route('**/api/v1/auth/logout', async (route) => {
    await route.fulfill({ json: { success: true } });
  });
}

test.describe('Pipeline Ops UI', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test('runs only the daily pipeline and does not expose market-data backfill controls', async ({ page }) => {
    let statusRequestCount = 0;
    let commandPostCount = 0;
    let commandPayload: any = null;
    let marketDataCallCount = 0;

    await page.route('**/api/v1/pipeline/status**', async (route) => {
      statusRequestCount += 1;
      const refreshed = statusRequestCount > 1;
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
          generatedAt: refreshed ? '2026-05-25T09:31:00.000Z' : '2026-05-25T09:30:00.000Z',
          activeRun: refreshed ? null : {
            id: 'run-active-initial',
            status: 'RUNNING',
            triggerType: 'manual',
            dataThroughDate: '2026-05-23T00:00:00.000Z',
            changedInstrumentCount: 5,
            totalCount: 100,
            processedCount: 25,
            succeededCount: 25,
            partialCount: 0,
            failedCount: 0,
            skippedCount: 0,
            unchangedCount: 0,
            sourceFingerprint: 'daily:pipeline',
            startedAt: '2026-05-25T09:25:00.000Z',
            completedAt: null,
            durationMs: null,
            warnings: [],
            errors: [],
            updatedAt: '2026-05-25T09:26:00.000Z',
          },
          lastRun: refreshed ? {
            id: 'run-complete',
            status: 'COMPLETED',
            triggerType: 'manual',
            dataThroughDate: '2026-05-23T00:00:00.000Z',
            changedInstrumentCount: 5,
            totalCount: 100,
            processedCount: 100,
            succeededCount: 100,
            partialCount: 0,
            failedCount: 0,
            skippedCount: 0,
            unchangedCount: 0,
            sourceFingerprint: 'daily:pipeline',
            startedAt: '2026-05-25T09:25:00.000Z',
            completedAt: '2026-05-25T09:30:30.000Z',
            durationMs: 30000,
            warnings: [],
            errors: [],
            updatedAt: '2026-05-25T09:30:30.000Z',
          } : null,
          stages: [
            {
              stageKey: 'MARKET_DATA',
              stageOrder: 1,
              activeStage: null,
              lastStage: {
                id: 'stage-market-data',
                pipelineRunId: 'run-complete',
                stageKey: 'MARKET_DATA',
                stageOrder: 1,
                status: 'COMPLETED',
                dataThroughDate: '2026-05-23T00:00:00.000Z',
                changedInstrumentCount: 5,
                batchSize: 100,
                offset: 0,
                nextOffset: null,
                hasMore: false,
                totalCount: 100,
                processedCount: 100,
                succeededCount: 100,
                partialCount: 0,
                failedCount: 0,
                skippedCount: 0,
                unchangedCount: 0,
                attemptCount: 1,
                cacheKey: 'daily:market-data',
                cacheStatus: 'MISS',
                cacheExpiresAt: null,
                inputFingerprint: 'exchange:latest',
                outputFingerprint: 'exchange:2026-05-23',
                leaseOwner: null,
                leaseExpiresAt: null,
                startedAt: '2026-05-25T09:25:00.000Z',
                completedAt: '2026-05-25T09:30:30.000Z',
                durationMs: 30000,
                warnings: [],
                errors: [],
                metadata: { rowsInserted: 10, rowsUpdated: 2 },
                updatedAt: '2026-05-25T09:30:30.000Z',
              },
            },
            {
              stageKey: 'DATA_QUALITY',
              stageOrder: 2,
              activeStage: refreshed ? null : {
                id: 'stage-active',
                pipelineRunId: 'run-active-initial',
                stageKey: 'DATA_QUALITY',
                stageOrder: 2,
                status: 'RUNNING',
                dataThroughDate: '2026-05-23T00:00:00.000Z',
                changedInstrumentCount: 5,
                batchSize: 25,
                offset: 0,
                nextOffset: 25,
                hasMore: true,
                totalCount: 100,
                processedCount: 25,
                succeededCount: 25,
                partialCount: 0,
                failedCount: 0,
                skippedCount: 0,
                unchangedCount: 0,
                attemptCount: 1,
                cacheKey: 'dq:IN:STOCK:2026-05-23',
                cacheStatus: 'MISS',
                cacheExpiresAt: null,
                inputFingerprint: 'prices:2026-05-23',
                outputFingerprint: null,
                leaseOwner: 'worker-1',
                leaseExpiresAt: '2026-05-25T09:35:00.000Z',
                startedAt: '2026-05-25T09:25:00.000Z',
                completedAt: null,
                durationMs: null,
                warnings: [],
                errors: [],
                metadata: {},
                updatedAt: '2026-05-25T09:26:00.000Z',
              },
              lastStage: null,
            },
          ],
        },
      });
    });

    await page.route('**/api/v1/pipeline/commands/catalog**', async (route) => {
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
          generatedAt: '2026-05-25T09:30:00.000Z',
          commands: [
            {
              commandKey: 'PIPELINE_RUN_ALL',
              stageKey: 'PIPELINE',
              moduleName: 'Pipeline',
              operationName: 'Run daily market pipeline',
              availability: 'ENABLED',
              disabledReason: null,
              runModes: ['full_latest_trading_date', 'incremental_changed_only', 'single_batch'],
              defaultBatchSize: 100,
              maxBatchSize: 100,
              providerAccess: 'NONE',
              schedulerAccess: 'NONE',
              downstreamFanout: 'APPROVED',
            },
          ],
        },
      });
    });

    await page.route('**/api/v1/pipeline/commands', async (route) => {
      commandPostCount += 1;
      commandPayload = route.request().postDataJSON();
      await route.fulfill({
        json: {
          commandId: 'daily-pipeline-command',
          commandKey: 'PIPELINE_RUN_ALL',
          stageKey: 'PIPELINE',
          status: 'COMPLETED',
          scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
          runMode: 'full_latest_trading_date',
          pipelineRunId: 'run-complete',
          stageRunId: null,
          idempotencyKey: commandPayload.idempotencyKey,
          lease: { acquired: true, reason: 'ACQUIRED', leaseOwner: null, leaseExpiresAt: null },
          batch: { batchSize: 100, offset: 0, nextOffset: null, hasMore: false },
          counts: { totalCount: 100, processedCount: 100, succeededCount: 100, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0 },
          warnings: [],
          errors: [],
          statusUrl: '/api/v1/pipeline/status?region=IN&assetType=STOCK&timeframe=1d&pipelineKey=market-intelligence&limit=100',
          startedAt: '2026-05-25T09:25:00.000Z',
          completedAt: '2026-05-25T09:30:30.000Z',
        },
      });
    });

    await page.route('**/api/v1/market-data/**', async (route) => {
      marketDataCallCount += 1;
      await route.abort();
    });

    await page.goto('/pipeline-ops');

    await expect(page.getByRole('heading', { name: 'Daily Pipeline Ops' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Daily Pipeline' })).toBeEnabled();
    await expect(page.getByText('Historical Exchange Backfill')).toHaveCount(0);
    await expect(page.getByText('SourceFileImport Evidence')).toHaveCount(0);
    await expect(page.getByText('Manual Verified Fundamentals')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Start Backfill' })).toHaveCount(0);

    const table = page.getByLabel('pipeline operations');
    await expect(table.getByText('Market Data')).toBeVisible();
    await expect(table.getByText('Data Quality')).toBeVisible();
    await expect(table.getByRole('button', { name: 'Trigger' })).toHaveCount(0);

    expect(commandPostCount).toBe(0);
    await page.getByRole('button', { name: 'Run Daily Pipeline' }).click();

    await expect.poll(() => commandPostCount).toBe(1);
    expect(commandPayload).toMatchObject({
      commandKey: 'PIPELINE_RUN_ALL',
      region: 'IN',
      assetType: 'STOCK',
      runMode: 'full_latest_trading_date',
      batchSize: 100,
      offset: 0,
    });
    expect(statusRequestCount).toBeGreaterThan(1);
    expect(marketDataCallCount).toBe(0);
  });
});
