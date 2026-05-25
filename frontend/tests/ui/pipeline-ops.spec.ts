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

  test('renders pipeline progress from the read-only status API', async ({ page }) => {
    let statusUrl = '';
    let providerCallCount = 0;
    let postCount = 0;

    await page.route('**/api/v1/pipeline/status**', async (route) => {
      statusUrl = route.request().url();
      await route.fulfill({
        json: {
          scope: { region: 'IN', assetType: 'STOCK', timeframe: '1d', pipelineKey: 'market-intelligence' },
          generatedAt: '2026-05-25T09:30:00.000Z',
          activeRun: {
            id: 'run-active',
            status: 'RUNNING',
            triggerType: 'scheduled',
            dataThroughDate: '2026-05-22T00:00:00.000Z',
            changedInstrumentCount: 10,
            totalCount: 100,
            processedCount: 50,
            succeededCount: 48,
            partialCount: 1,
            failedCount: 1,
            skippedCount: 0,
            unchangedCount: 0,
            sourceFingerprint: 'nse:2026-05-22',
            startedAt: '2026-05-25T09:00:00.000Z',
            completedAt: null,
            durationMs: null,
            warnings: [],
            errors: [],
            updatedAt: '2026-05-25T09:10:00.000Z',
          },
          lastRun: null,
          stages: [
            {
              stageKey: 'DATA_QUALITY',
              stageOrder: 2,
              activeStage: {
                id: 'stage-active',
                pipelineRunId: 'run-active',
                stageKey: 'DATA_QUALITY',
                stageOrder: 2,
                status: 'RUNNING',
                dataThroughDate: '2026-05-22T00:00:00.000Z',
                changedInstrumentCount: 10,
                batchSize: 100,
                offset: 0,
                nextOffset: 50,
                hasMore: true,
                totalCount: 100,
                processedCount: 50,
                succeededCount: 48,
                partialCount: 1,
                failedCount: 1,
                skippedCount: 0,
                unchangedCount: 0,
                attemptCount: 1,
                cacheKey: 'dq:IN:STOCK:2026-05-22',
                cacheStatus: 'MISS',
                cacheExpiresAt: null,
                inputFingerprint: 'prices:2026-05-22',
                outputFingerprint: null,
                leaseOwner: 'worker-1',
                leaseExpiresAt: '2026-05-25T09:15:00.000Z',
                startedAt: '2026-05-25T09:00:00.000Z',
                completedAt: null,
                durationMs: null,
                warnings: ['partial evidence is still processing'],
                errors: ['one row failed validation'],
                updatedAt: '2026-05-25T09:10:00.000Z',
              },
              lastStage: null,
            },
          ],
        },
      });
    });

    await page.route('**/api/v1/market-data/**', async (route) => {
      providerCallCount += 1;
      await route.abort();
    });
    page.on('request', (request) => {
      if (request.method() === 'POST') postCount += 1;
    });

    await page.goto('/pipeline-ops');

    await expect(page.locator('h4', { hasText: 'Pipeline Ops' })).toBeVisible();
    const table = page.getByLabel('pipeline operations');
    await expect(table.getByText('Data Quality')).toBeVisible();
    await expect(table.getByText('Readiness evaluation')).toBeVisible();
    await expect(table.getByText('50 / 100').first()).toBeVisible();
    await expect(page.getByText('Fail 1')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trigger' }).first()).toBeDisabled();
    await expect(table.getByText('Market Data')).toBeVisible();

    expect(statusUrl).toContain('region=IN');
    expect(statusUrl).toContain('assetType=STOCK');
    expect(providerCallCount).toBe(0);
    expect(postCount).toBe(0);
  });
});
