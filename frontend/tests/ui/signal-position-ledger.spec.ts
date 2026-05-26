import { expect, test, type Page, type Route } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

const activeRows = [
  {
    signalId: 'signal-new',
    instrumentId: 'stock-new',
    symbol: 'NEW.NS',
    companyName: 'New Industries',
    region: 'IN',
    assetType: 'STOCK',
    triggerType: 'bullish_entry_trigger',
    entryTriggerTimestamp: '2026-05-26T09:15:00.000Z',
    entryTriggerPrice: 100.45,
    entryReasonSummary: 'Breakout confirmation accepted with volume support.',
    strategyId: 'BREAKOUT_CONFIRMATION',
    strategyVersion: '1.0.0',
    entryRuleId: 'ENTRY_BREAKOUT',
    latestTrustedPriceDate: '2026-05-26T00:00:00.000Z',
    latestTrustedPrice: 110.75,
    currentReturnPercent: 10.25,
    currentReturnStatus: 'CURRENT',
    currentDataQualityStatus: 'READY',
    healthState: 'EXIT_TRIGGERED',
    lifecycleEvidenceStatus: 'EXIT_COMPATIBILITY_ONLY',
    trustEvidenceStatus: 'SOURCE_PROVEN',
  },
  {
    signalId: 'signal-watch',
    instrumentId: 'stock-watch',
    symbol: 'WATCH.NS',
    companyName: 'Watch Systems',
    region: 'IN',
    assetType: 'STOCK',
    triggerType: 'bearish_trigger',
    entryTriggerTimestamp: '2026-05-25T09:15:00.000Z',
    entryTriggerPrice: 80,
    entryReasonSummary: 'Bearish trigger accepted with source-proven entry evidence.',
    strategyId: 'DEFENSIVE_EXIT',
    strategyVersion: '1.0.0',
    entryRuleId: 'ENTRY_DEFENSIVE',
    latestTrustedPriceDate: '2026-05-20T00:00:00.000Z',
    latestTrustedPrice: null,
    currentReturnPercent: null,
    currentReturnStatus: 'STALE',
    currentDataQualityStatus: 'READY',
    healthState: 'RISK_WARNING',
    lifecycleEvidenceStatus: 'EXIT_COMPATIBILITY_ONLY',
    trustEvidenceStatus: 'SOURCE_PROVEN_PRICE_STALE',
  },
];

const secondPageRow = {
  ...activeRows[0],
  signalId: 'signal-second-page',
  instrumentId: 'stock-second-page',
  symbol: 'PAGE2.NS',
  companyName: 'Second Page Co',
};

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
  await page.route('**/api/v1/auth/logout', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
}

test.describe('Signal Position Ledger UI', () => {
  test('shows scoped active positions and keeps history deferred', async ({ page }) => {
    await mockAuthenticatedUser(page);
    const activeRequests: URL[] = [];
    let deferredRequestCount = 0;

    await page.route('**/api/v1/signals/position-ledger/active**', async (route: Route) => {
      const url = new URL(route.request().url());
      activeRequests.push(url);
      expect(url.searchParams.get('assetType')).toBe('STOCK');
      expect(url.searchParams.get('limit')).toBe('25');

      const region = url.searchParams.get('region');
      const offset = Number(url.searchParams.get('offset') || 0);
      if (region === 'US') {
        expect(offset).toBe(0);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [],
            totalCount: 0,
            limit: 25,
            offset: 0,
            nextOffset: null,
            hasMore: false,
            scope: { region: 'US', assetType: 'STOCK' },
            warnings: [],
          }),
        });
        return;
      }

      expect(region).toBe('IN');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: offset === 0 ? activeRows : [secondPageRow],
          totalCount: 30,
          limit: 25,
          offset,
          nextOffset: offset === 0 ? 25 : null,
          hasMore: offset === 0,
          scope: { region: 'IN', assetType: 'STOCK' },
          warnings: [],
        }),
      });
    });

    await page.route('**/api/v1/signals/position-ledger/history**', async (route: Route) => {
      deferredRequestCount += 1;
      await route.abort();
    });
    await page.route('**/api/v1/signals/position-ledger/closed**', async (route: Route) => {
      deferredRequestCount += 1;
      await route.abort();
    });

    await visitModule(page, '/signal-position-ledger', 'Signal Position Ledger');

    await expect(page.getByRole('link', { name: 'Signal Position Ledger' })).toHaveAttribute('href', '/signal-position-ledger');
    await expect(page.getByText('System-picked signal-position evidence for the current market scope. Scope: IN / STOCK.')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Active Positions' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Closed History' })).toBeVisible();
    await expect(page.getByText('Active positions', { exact: true })).toBeVisible();
    await expect(page.getByText('IN / STOCK total')).toBeVisible();
    expect(await page.getByText('This page').count()).toBeGreaterThanOrEqual(3);

    await expect(page.getByRole('columnheader', { name: 'Company' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Entry trigger' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Latest price basis' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Return from entry' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Current state' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Strategy' })).toBeVisible();
    await expect(page.getByText('New Industries')).toBeVisible();
    await expect(page.getByText('NEW.NS')).toBeVisible();
    await expect(page.getByText('Breakout confirmation accepted with volume support.')).toBeVisible();
    await expect(page.getByText('110.75')).toBeVisible();
    await expect(page.getByText('+10.25%')).toBeVisible();
    await expect(page.getByText('Exit-trigger compatibility').first()).toBeVisible();
    await expect(page.getByText('Risk warning').first()).toBeVisible();
    await expect(page.getByText('BREAKOUT_CONFIRMATION')).toBeVisible();
    await expect(page.getByText('Version 1.0.0').first()).toBeVisible();

    await page.getByRole('tab', { name: 'Closed History' }).click();
    await expect(page.getByText('Closed history is not shown yet because durable close date, close price, and close reason proof are not available on the current source path.')).toBeVisible();
    await expect(page.getByText('This tab stays reserved for a later child that adds reusable close-proof truth.')).toBeVisible();
    await expect(page.getByText('New Industries')).toHaveCount(0);
    await expect(page.getByText('IN / STOCK total')).toHaveCount(0);
    await expect(page.getByText('This page')).toHaveCount(0);
    expect(deferredRequestCount).toBe(0);

    await page.getByRole('tab', { name: 'Active Positions' }).click();
    await page.getByRole('button', { name: 'Go to next page' }).click();
    await expect(page.getByText('Second Page Co')).toBeVisible();
    expect(activeRequests.some((url) => url.searchParams.get('region') === 'IN' && url.searchParams.get('offset') === '25')).toBe(true);

    await page.getByRole('button', { name: /Market: India|IN/ }).click();
    await page.getByRole('menuitem', { name: 'United States' }).click();
    await expect(page.getByText('System-picked signal-position evidence for the current market scope. Scope: US / STOCK.')).toBeVisible();
    await expect(page.getByText('No active signal positions are available for US / STOCK.')).toBeVisible();
    expect(activeRequests.some((url) => url.searchParams.get('region') === 'US' && url.searchParams.get('offset') === '0')).toBe(true);
  });

  test('hides prior-scope summary counts while a new scoped response is loading', async ({ page }) => {
    await mockAuthenticatedUser(page);
    let releaseUsResponse: (() => void) | null = null;
    const usResponseGate = new Promise<void>((resolve) => {
      releaseUsResponse = resolve;
    });

    await page.route('**/api/v1/signals/position-ledger/active**', async (route: Route) => {
      const url = new URL(route.request().url());
      const region = url.searchParams.get('region');

      if (region === 'US') {
        expect(url.searchParams.get('offset')).toBe('0');
        await usResponseGate;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [],
            totalCount: 0,
            limit: 25,
            offset: 0,
            nextOffset: null,
            hasMore: false,
            scope: { region: 'US', assetType: 'STOCK' },
            warnings: [],
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: activeRows,
          totalCount: 30,
          limit: 25,
          offset: 0,
          nextOffset: 25,
          hasMore: true,
          scope: { region: 'IN', assetType: 'STOCK' },
          warnings: [],
        }),
      });
    });

    await visitModule(page, '/signal-position-ledger', 'Signal Position Ledger');
    await expect(page.getByText('IN / STOCK total')).toBeVisible();
    await expect(page.getByText('This page').first()).toBeVisible();

    await page.getByRole('button', { name: /Market: India|IN/ }).click();
    await page.getByRole('menuitem', { name: 'United States' }).click();

    await expect(page.getByText('System-picked signal-position evidence for the current market scope. Scope: US / STOCK.')).toBeVisible();
    await expect(page.getByText('Loading active position summary for US / STOCK.')).toBeVisible();
    await expect(page.getByText('IN / STOCK total')).toHaveCount(0);
    await expect(page.getByText('This page')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toBeVisible();

    releaseUsResponse?.();

    await expect(page.getByText('US / STOCK total')).toBeVisible();
    await expect(page.getByText('No active signal positions are available for US / STOCK.')).toBeVisible();
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

    await visitModule(page, '/signal-position-ledger', 'Signal Position Ledger');

    await expect(page.getByRole('alert')).toContainText('Active signal-position data could not be loaded for IN / STOCK.');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.getByRole('table').getByText(/Active signal-position data could not be loaded for IN \/ STOCK\./)).toBeVisible();
    await expect(page.getByText('No active signal positions are available for IN / STOCK.')).toHaveCount(0);
    await expect(page.getByText('New Industries')).toHaveCount(0);
  });
});
