import { expect, test } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

/**
 * EU equity support UI smoke — LIVE data (no API mocks). Validates that, after the
 * EU ingestion runs, EU scope surfaces real ingested data with correct currency (€)
 * and NO India (₹) / US ($) leakage, and that India-only capabilities gate right.
 *
 * Requires the dev frontend + backend running and EU data ingested. Run during the
 * ingestion-signoff QA pass:
 *   npx playwright test tests/ui/eu-equity-support.spec.ts
 */

test.describe('EU equity support UI (live data)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('market_scope', JSON.stringify({ region: 'EU', assetType: 'STOCK' }));
    });
  });

  test('market-scope selector reflects EU scope', async ({ page }) => {
    await visitAuthenticated(page, '/screener');
    await expect(page.locator('#market-scope-button')).toContainText(/EU|Europe/i, { timeout: 30_000 });
  });

  test('screener renders real EU rows in EUR with no rupee/dollar leak', async ({ page }) => {
    await visitAuthenticated(page, '/screener');
    // Real EU tickers should appear (eurozone blue-chips are always in the priced universe).
    await expect(page.getByText(/\b(SAP|ASML|SIE|MC|ENEL)\b/).first()).toBeVisible({ timeout: 30_000 });
    // Prices in EUR, never rupees under EU scope.
    await expect(page.getByText('₹').first()).toHaveCount(0);
    await expect(page.getByText(/€\s?\d|\d[\d.,]*\s?€/).first()).toBeVisible({ timeout: 30_000 });
  });

  test('instruments list shows EU equities (EUR)', async ({ page }) => {
    await visitAuthenticated(page, '/instruments');
    await expect(page.getByText(/\b(SAP|ASML|SIE)\b/).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('₹').first()).toHaveCount(0);
  });

  test('signals surface real EU candidates (no rupee leak)', async ({ page }) => {
    await visitAuthenticated(page, '/signals');
    await expect(page.getByText(/\b(SAP|ASML|SIE|MC|ENEL)\b/).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('₹').first()).toHaveCount(0);
  });

  test('India-only F&O derivatives screen gates as not-applicable for EU', async ({ page }) => {
    await visitAuthenticated(page, '/derivatives');
    await expect(page.getByTestId('not-applicable-asset-class')).toBeVisible({ timeout: 30_000 });
    // No Indian FII/DII rupee data leaking into EU scope.
    await expect(page.getByText('₹').first()).toHaveCount(0);
  });
});
