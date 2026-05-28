import { expect, test, type Page, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { visitModule } from './support/moduleAssertions';

const refresh = {
  runId: 'ledger-run-1',
  status: 'COMPLETED',
  totalCount: 5,
  processedCount: 5,
  succeededCount: 5,
  failedCount: 0,
  skippedCount: 0,
  materializedRowCount: 2,
  startedAt: '2026-05-27T00:00:00.000Z',
  completedAt: '2026-05-27T00:01:00.000Z',
  updatedAt: '2026-05-27T00:01:00.000Z',
  warnings: [],
  errors: [],
};

const activeRows = [
  {
    ledgerKey: 'IN:STOCK:stock-new:bullish_entry_trigger:2026-05-26T09:15:00.000Z',
    status: 'ACTIVE',
    signalId: 'signal-new',
    instrumentId: 'stock-new',
    symbol: 'NEW',
    companyName: 'New Industries',
    region: 'IN',
    assetType: 'STOCK',
    triggerType: 'bullish_entry_trigger',
    entryTriggerTimestamp: '2026-05-26T09:15:00.000Z',
    entryTriggerPrice: 100.45,
    entryReasonSummary: 'Breakout confirmation accepted with volume support.',
    strategyId: 'BREAKOUT_CONFIRMATION',
    strategyVersion: '1.0.0',
    strategyDecision: 'ENTRY_CANDIDATE',
    strategyReadinessLabel: 'READY',
    strategyRatingGrade: 'A',
    entryRuleId: 'ENTRY_BREAKOUT',
    latestTrustedPriceDate: '2026-05-27T00:00:00.000Z',
    latestTrustedPrice: 110.75,
    currentReturnPercent: 10.25,
    currentReturnStatus: 'CURRENT',
    currentDataQualityStatus: 'READY',
    healthState: null,
    lifecycleEvidenceStatus: 'ACTIVE_ENTRY',
    trustEvidenceStatus: 'SOURCE_PROVEN',
    calibrationEvidenceStatus: 'AVAILABLE',
    displayWarnings: [],
  },
  {
    ledgerKey: 'IN:STOCK:stock-alpha:bullish_entry_trigger:2026-05-25T09:15:00.000Z',
    status: 'ACTIVE',
    signalId: 'signal-alpha',
    instrumentId: 'stock-alpha',
    symbol: 'ALPHA',
    companyName: 'Alpha Industries',
    region: 'IN',
    assetType: 'STOCK',
    triggerType: 'bullish_entry_trigger',
    entryTriggerTimestamp: '2026-05-25T09:15:00.000Z',
    entryTriggerPrice: 80,
    entryReasonSummary: 'Pullback recovery accepted by strategy evidence.',
    strategyId: 'PULLBACK_RECOVERY',
    strategyVersion: '1.0.0',
    strategyDecision: 'ENTRY_CANDIDATE',
    strategyReadinessLabel: 'READY',
    strategyRatingGrade: 'B',
    entryRuleId: 'ENTRY_PULLBACK',
    latestTrustedPriceDate: '2026-05-27T00:00:00.000Z',
    latestTrustedPrice: 76.8,
    currentReturnPercent: -4,
    currentReturnStatus: 'CURRENT',
    currentDataQualityStatus: 'READY',
    healthState: null,
    lifecycleEvidenceStatus: 'ACTIVE_ENTRY',
    trustEvidenceStatus: 'SOURCE_PROVEN',
    calibrationEvidenceStatus: 'AVAILABLE',
    displayWarnings: [],
  },
];

const closedRows = [
  {
    ...activeRows[0],
    ledgerKey: 'IN:STOCK:stock-old:bullish_entry_trigger:2026-05-20T09:15:00.000Z',
    status: 'CLOSED',
    signalId: 'signal-old-entry',
    instrumentId: 'stock-old',
    symbol: 'OLD',
    companyName: 'Old Industries',
    entryTriggerTimestamp: '2026-05-20T09:15:00.000Z',
    entryTriggerPrice: 90,
    currentReturnPercent: 5,
    healthState: 'EXIT_TRIGGERED',
    lifecycleEvidenceStatus: 'EXIT_TRIGGERED',
    exitSignalId: 'exit-old',
    exitTriggerTimestamp: '2026-05-27T09:15:00.000Z',
    exitTriggerPrice: 94.5,
    exitReasonSummary: 'Price closed below SMA50.',
    exitRuleId: 'PRICE_BELOW_SMA50',
    exitDecision: 'EXIT_CANDIDATE',
    closedAt: '2026-05-27T09:20:00.000Z',
  },
];

async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('investment_scanner_auth_token', 'playwright-signal-position-ledger-token');
    window.localStorage.setItem('market_scope', JSON.stringify({ region: 'IN', assetType: 'STOCK' }));
  });
  await page.route('**/api/v1/auth/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'playwright-signal-position-ledger-user',
        email: 'codex.test@example.com',
        name: 'Codex Test',
        createdAt: '2026-05-26T00:00:00.000Z',
        updatedAt: '2026-05-26T00:00:00.000Z',
        lastLoginAt: '2026-05-26T00:00:00.000Z',
      }),
    });
  });
}

function sortedRows(url: string) {
  const params = new URL(url).searchParams;
  const sortBy = params.get('sortBy') || 'entryTriggerTimestamp';
  const sortDirection = params.get('sortDirection') || 'desc';
  const factor = sortDirection === 'asc' ? 1 : -1;
  return [...activeRows].sort((left, right) => {
    const leftValue = sortBy === 'currentReturnPercent' ? left.currentReturnPercent : Date.parse(left.entryTriggerTimestamp);
    const rightValue = sortBy === 'currentReturnPercent' ? right.currentReturnPercent : Date.parse(right.entryTriggerTimestamp);
    return (leftValue - rightValue) * factor;
  });
}

function ledgerResponse(items: unknown[], totalCount = items.length, limit = 25, offset = 0) {
  return {
    items,
    totalCount,
    limit,
    offset,
    nextOffset: null,
    hasMore: false,
    scope: { region: 'IN', assetType: 'STOCK' },
    refresh,
    warnings: [],
  };
}

test.describe('Signal Position Ledger UI', () => {
  test('shows persisted active entries and closed history', async ({ page }) => {
    await mockAuthenticatedUser(page);
    let latestActiveRequest: URL | null = null;

    await page.route('**/api/v1/signals/position-ledger/active**', async (route: Route) => {
      latestActiveRequest = new URL(route.request().url());
      const params = latestActiveRequest.searchParams;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ledgerResponse(sortedRows(route.request().url()), 28, Number(params.get('limit') || 25), Number(params.get('offset') || 0))),
      });
    });
    await page.route('**/api/v1/signals/position-ledger/closed**', async (route: Route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ledgerResponse(closedRows, 1)) });
    });

    await visitModule(page, '/signal-position-ledger', 'Signal Position Ledger');

    await expect(page.getByText('Rule-triggered entry candidate evidence for the current market scope. Scope: IN / STOCK.')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Entry Trigger Candidates' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('28 open entries and 1 closed entries for IN / STOCK.')).toBeVisible();
    await expect(page.getByText('Ledger pipeline')).toHaveCount(0);
    await expect(page.getByText('NEW - New Industries')).toBeVisible();
    await expect(page.getByText('+10.25%')).toBeVisible();
    await expect.poll(() => latestActiveRequest?.searchParams.get('sortBy')).toBe('entryTriggerTimestamp');
    await expect.poll(() => latestActiveRequest?.searchParams.get('sortDirection')).toBe('desc');

    await page.getByRole('button', { name: 'Return till date' }).click();
    await expect.poll(() => latestActiveRequest?.searchParams.get('sortBy')).toBe('currentReturnPercent');
    await expect.poll(() => latestActiveRequest?.searchParams.get('sortDirection')).toBe('asc');
    await expect(page.getByText('ALPHA - Alpha Industries')).toBeVisible();
    await expect(page.locator('tbody tr').first()).toContainText('ALPHA - Alpha Industries');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const csv = readFileSync(downloadPath!, 'utf8');
    const [header] = csv.trim().split(/\r?\n/);
    expect(header).toBe('"Stock","Entry Price","Trigger Date","Trigger Reason"');
    for (const line of csv.trim().split(/\r?\n/)) {
      expect(line.split(',')).toHaveLength(4);
    }
    expect(csv).toContain('"NEW - New Industries","100.45","2026-05-26T09:15:00.000Z","Breakout confirmation accepted with volume support."');
    expect(csv).not.toContain('Return till date');
    expect(csv).not.toContain('Strategy');

    await page.getByRole('tab', { name: 'Closed History' }).click();
    await expect(page.getByText('OLD - Old Industries')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Exit' })).toBeVisible();
    const closedDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const closedDownload = await closedDownloadPromise;
    const closedDownloadPath = await closedDownload.path();
    expect(closedDownloadPath).toBeTruthy();
    const closedCsv = readFileSync(closedDownloadPath!, 'utf8');
    expect(closedCsv).toContain('"OLD - Old Industries","90","2026-05-20T09:15:00.000Z","Breakout confirmation accepted with volume support."');
    await page.getByText('OLD - Old Industries').click();
    await expect(page.getByText('Price closed below SMA50.')).toBeVisible();
  });

  test('shows scoped active error state without fallback rows', async ({ page }) => {
    await mockAuthenticatedUser(page);

    await page.route('**/api/v1/signals/position-ledger/active**', async (route: Route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Signal position ledger failed for scoped fetch.' }),
      });
    });
    await page.route('**/api/v1/signals/position-ledger/closed**', async (route: Route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ledgerResponse([])) });
    });

    await visitModule(page, '/signal-position-ledger', 'Signal Position Ledger');

    await expect(page.getByRole('alert')).toContainText('Entry trigger candidate data could not be loaded for IN / STOCK.');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.getByText('NEW')).toHaveCount(0);
  });
});
