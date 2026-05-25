import { expect, test, type Page } from '@playwright/test';

async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-pipeline-ops-token');
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        id: 'playwright-pipeline-ops-user',
        email: 'codex.test@example.com',
        name: 'Codex Test',
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

  test('uses command catalog safety matrix and posts only one data-quality command click', async ({ page }) => {
    let statusUrl = '';
    let statusRequestCount = 0;
    let commandPostCount = 0;
    let commandPayload: any = null;
    let providerCallCount = 0;

    await page.route('**/api/v1/pipeline/status**', async (route) => {
      statusRequestCount += 1;
      statusUrl = route.request().url();
      const isRefreshedAfterCommand = statusRequestCount > 1;
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
          generatedAt: isRefreshedAfterCommand ? '2026-05-25T09:31:00.000Z' : '2026-05-25T09:30:00.000Z',
          activeRun: isRefreshedAfterCommand ? null : {
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
            sourceFingerprint: 'manual:dq',
            startedAt: '2026-05-25T09:25:00.000Z',
            completedAt: null,
            durationMs: null,
            warnings: [],
            errors: [],
            updatedAt: '2026-05-25T09:26:00.000Z',
          },
          lastRun: isRefreshedAfterCommand ? {
            id: 'run-complete',
            status: 'COMPLETED',
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
            sourceFingerprint: 'manual:dq',
            startedAt: '2026-05-25T09:25:00.000Z',
            completedAt: '2026-05-25T09:30:30.000Z',
            durationMs: 30000,
            warnings: [],
            errors: [],
            updatedAt: '2026-05-25T09:30:30.000Z',
          } : null,
          stages: [
            {
              stageKey: 'DATA_QUALITY',
              stageOrder: 2,
              activeStage: isRefreshedAfterCommand ? null : {
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
                leaseExpiresAt: '2026-05-25T09:15:00.000Z',
                startedAt: '2026-05-25T09:25:00.000Z',
                completedAt: null,
                durationMs: null,
                warnings: [],
                errors: [],
                updatedAt: '2026-05-25T09:26:00.000Z',
              },
              lastStage: isRefreshedAfterCommand ? {
                id: 'stage-completed',
                pipelineRunId: 'run-complete',
                stageKey: 'DATA_QUALITY',
                stageOrder: 2,
                status: 'COMPLETED',
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
                outputFingerprint: 'dq:batch:0',
                leaseOwner: null,
                leaseExpiresAt: null,
                startedAt: '2026-05-25T09:25:00.000Z',
                completedAt: '2026-05-25T09:30:30.000Z',
                durationMs: 30000,
                warnings: [],
                errors: [],
                updatedAt: '2026-05-25T09:30:30.000Z',
              } : null,
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
              commandKey: 'MARKET_DATA_INCREMENTAL_EOD_LOAD',
              stageKey: 'MARKET_DATA',
              moduleName: 'Market Data',
              operationName: 'Incremental EOD data load',
              availability: 'FORBIDDEN',
              disabledReason: 'Provider/live ingestion is forbidden from Pipeline Ops in this slice.',
              runModes: ['single_batch'],
              defaultBatchSize: 25,
              maxBatchSize: 100,
              providerAccess: 'FORBIDDEN',
              schedulerAccess: 'FORBIDDEN',
              downstreamFanout: 'FORBIDDEN',
            },
            {
              commandKey: 'DATA_QUALITY_EVALUATE_SCOPE',
              stageKey: 'DATA_QUALITY',
              moduleName: 'Data Quality',
              operationName: 'Readiness evaluation',
              availability: 'ENABLED',
              disabledReason: null,
              runModes: ['single_batch'],
              defaultBatchSize: 25,
              maxBatchSize: 100,
              providerAccess: 'NONE',
              schedulerAccess: 'NONE',
              downstreamFanout: 'NONE',
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
          commandId: 'pipeline-ledger-v1:manual-command:DATA_QUALITY_EVALUATE_SCOPE:IN:STOCK:1d:market-intelligence:0:25:test',
          commandKey: 'DATA_QUALITY_EVALUATE_SCOPE',
          stageKey: 'DATA_QUALITY',
          status: 'COMPLETED',
          scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
          runMode: 'single_batch',
          pipelineRunId: 'run-complete',
          stageRunId: 'stage-completed',
          idempotencyKey: 'pipeline-ledger-v1:manual-command:DATA_QUALITY_EVALUATE_SCOPE:IN:STOCK:1d:market-intelligence:0:25:test',
          lease: { acquired: true, reason: 'ACQUIRED', leaseOwner: null, leaseExpiresAt: null },
          batch: { batchSize: 25, offset: 0, nextOffset: 25, hasMore: true },
          counts: { totalCount: 100, processedCount: 25, succeededCount: 25, partialCount: 0, failedCount: 0, skippedCount: 0, unchangedCount: 0 },
          warnings: [],
          errors: [],
          statusUrl: '/api/v1/pipeline/status?region=IN&assetType=STOCK&timeframe=1d&pipelineKey=market-intelligence&limit=100',
          startedAt: '2026-05-25T09:25:00.000Z',
          completedAt: '2026-05-25T09:30:30.000Z',
        },
      });
    });

    await page.route('**/api/v1/market-data/**', async (route) => {
      providerCallCount += 1;
      await route.abort();
    });

    await page.goto('/pipeline-ops');

    await expect(page.locator('h4', { hasText: 'Bulk Pipeline Dashboard' })).toBeVisible();
    const table = page.getByLabel('pipeline operations');
    await expect(table.getByText('Data Quality')).toBeVisible();
    await expect(table.getByText('Readiness evaluation')).toBeVisible();
    await expect(table.getByText('Market Data')).toBeVisible();

    const marketDataRow = table.locator('tr', { hasText: 'Market Data' }).first();
    await expect(marketDataRow.getByRole('button', { name: 'Trigger' })).toBeDisabled();

    const dataQualityRow = table.locator('tr', { hasText: 'Data Quality' }).first();
    const dataQualityTrigger = dataQualityRow.getByRole('button', { name: 'Trigger' });
    await expect(dataQualityTrigger).toBeEnabled();

    expect(commandPostCount).toBe(0);
    await dataQualityTrigger.click();

    await expect(dataQualityRow.getByText('COMPLETED')).toBeVisible();
    expect(commandPostCount).toBe(1);
    expect(statusRequestCount).toBeGreaterThan(1);
    expect(commandPayload.commandKey).toBe('DATA_QUALITY_EVALUATE_SCOPE');
    expect(commandPayload.runMode).toBe('single_batch');
    expect(typeof commandPayload.idempotencyKey).toBe('string');
    expect(commandPayload.idempotencyKey.length).toBeGreaterThan(10);

    expect(statusUrl).toContain('region=IN');
    expect(statusUrl).toContain('assetType=STOCK');
    expect(providerCallCount).toBe(0);
  });
});
