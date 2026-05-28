import { expect, test, type Page, type Route } from '@playwright/test';
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

function ledgerResponse(items: unknown[], totalCount = items.length) {
  return {
    items,
    totalCount,
    limit: 25,
    offset: 0,
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

    await page.route('**/api/v1/signals/position-ledger/active**', async (route: Route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ledgerResponse(activeRows, 28)) });
    });
    await page.route('**/api/v1/signals/position-ledger/closed**', async (route: Route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ledgerResponse(closedRows, 1)) });
    });

    await visitModule(page, '/signal-position-ledger', 'Signal Position Ledger');

    await expect(page.getByText('Rule-triggered entry candidate evidence for the current market scope. Scope: IN / STOCK.')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Entry Trigger Candidates' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Entry trigger candidates', { exact: true })).toBeVisible();
    await expect(page.getByText('IN / STOCK total')).toBeVisible();
    await expect(page.getByText('NEW - New Industries')).toBeVisible();
    await expect(page.getByText('+10.25%')).toBeVisible();

    await page.getByRole('tab', { name: 'Closed History' }).click();
    await expect(page.getByText('OLD - Old Industries')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Exit' })).toBeVisible();
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
