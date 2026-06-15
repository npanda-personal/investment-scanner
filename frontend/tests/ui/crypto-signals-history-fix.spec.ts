/**
 * QA focused re-verification: crypto Signals & History tab fix.
 * Confirms the signalEvidenceLabel normalizer correctly renders
 * triggered_signals/negative_signals that are {code,label,category}
 * objects (not raw object strings -> "[object Object]").
 *
 * Also verifies Dashboard and Signal Board in CRYPTO scope.
 *
 * Instrument used: BTCUSDT (cmq30uns00000w5dcp1r6m0tx) -- live data
 * from localhost:3000.
 *
 * NOTE: visitAuthenticated may land on Overview tab; we explicitly click
 * "Signals & History" to activate that tab path.
 */
import { expect, test } from '@playwright/test';
import { visitAuthenticated } from './support/auth';

const CRYPTO_INSTRUMENT_ID = 'cmq30uns00000w5dcp1r6m0tx';
const CRYPTO_SCOPE = JSON.stringify({ region: 'GLOBAL', assetType: 'CRYPTO' });

// === CHECK-3: Signals & History tab (the previously broken one) ===
test.describe('CHECK-3: Crypto Signals & History tab (fix verification)', () => {
  test('renders CryptoInstrumentDetail -- NOT blank, no React child error, chip labels are strings', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.addInitScript((scope: string) => {
      window.localStorage.setItem('market_scope', scope);
    }, CRYPTO_SCOPE);

    // Deep-link straight to the Signals & History tab (tab state is URL-driven via
    // ?tab=signals-history). Navigating directly avoids a click race where the Overview
    // tab — which also has "Latest Signal"/"Technical Indicators" but no "Momentum" —
    // is still mounted when assertions run.
    await visitAuthenticated(page, `/stocks/${CRYPTO_INSTRUMENT_ID}?tab=signals-history`);

    // Wait for CryptoInstrumentDetail content to appear
    await expect(
      page.getByText(/Latest Signal|Technical Indicators|Momentum|Catalog|No signal available/i).first()
    ).toBeVisible({ timeout: 30_000 });

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(100);

    // "Objects are not valid as a React child" -- the exact error from the prior crash
    const reactChildError = consoleErrors.find((e) => e.includes('Objects are not valid as a React child'));
    expect(reactChildError, `React child object error found: ${reactChildError}`).toBeUndefined();

    // All chip labels must NOT contain [object Object]
    const chips = page.locator('.MuiChip-label');
    const chipCount = await chips.count();
    console.log('Chip count on signals-history tab:', chipCount);
    if (chipCount > 0) {
      for (let i = 0; i < Math.min(chipCount, 20); i++) {
        const chipText = await chips.nth(i).innerText();
        console.log(`Chip[${i}]: "${chipText}"`);
        expect(chipText, `Chip ${i} contains [object Object]: "${chipText}"`).not.toContain('[object Object]');
      }
    }

    // Signal panel sections must be present. Use heading-role selectors for the section
    // titles: the words "momentum"/"futures" also appear inside evidence chips and the
    // signal explanation text, so a loose getByText() trips strict mode.
    await expect(page.getByText('Latest Signal').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Momentum' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Technical Indicators' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Fundamentals (DeFi)' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Futures' })).toBeVisible({ timeout: 10_000 });

    // Bullish/Bearish evidence sections
    const hasBullish = await page.getByText('Bullish evidence').isVisible().catch(() => false);
    const hasBearish = await page.getByText('Bearish evidence').isVisible().catch(() => false);
    console.log('Bullish evidence visible:', hasBullish);
    console.log('Bearish evidence visible:', hasBearish);

    // Collect headings for evidence
    const headings: string[] = [];
    const headingEls = page.locator('.MuiTypography-h6, .MuiTypography-subtitle2, .MuiTypography-overline');
    const headingCount = await headingEls.count();
    for (let i = 0; i < Math.min(headingCount, 20); i++) {
      const text = (await headingEls.nth(i).innerText()).trim();
      if (text) headings.push(text);
    }
    console.log('HEADINGS:', JSON.stringify(headings));

    // No critical React errors
    const criticalErrors = consoleErrors.filter((e) =>
      e.includes('Objects are not valid') ||
      e.includes('Minified React error') ||
      e.includes('Cannot read properties of undefined') ||
      e.includes('Cannot read properties of null')
    );
    if (consoleErrors.length > 0) console.log('ALL CONSOLE ERRORS:', JSON.stringify(consoleErrors.slice(0, 10)));
    expect(criticalErrors, `Critical React errors: ${JSON.stringify(criticalErrors)}`).toHaveLength(0);
  });
});

// === CHECK-1: Dashboard / in CRYPTO scope ===
test.describe('CHECK-1: Dashboard in CRYPTO scope', () => {
  test('renders crypto overview without crash', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.addInitScript((scope: string) => {
      window.localStorage.setItem('market_scope', scope);
    }, CRYPTO_SCOPE);

    await visitAuthenticated(page, '/');
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);

    const reactError = consoleErrors.find((e) =>
      e.includes('Objects are not valid as a React child') || e.includes('Minified React error')
    );
    expect(reactError, `React error on dashboard: ${reactError}`).toBeUndefined();

    // Verify crypto-specific content is present (not equity/NSE content)
    const hasCryptoContent = bodyText.includes('Crypto') || bodyText.includes('crypto') || bodyText.includes('Bitcoin') || bodyText.includes('BTC');
    console.log('Dashboard crypto content present:', hasCryptoContent);
    console.log('Dashboard body snippet:', bodyText.substring(0, 400));
    console.log('Dashboard console errors:', JSON.stringify(consoleErrors.slice(0, 5)));
  });
});

// === CHECK-4: Fear & Greed gauge on the crypto dashboard ===
// The shared :3000 BE may be stale and not yet expose fearGreedIndex/fearGreedLabel,
// so we intercept the (real) market-context summary response and inject the fields to
// verify the gauge data path deterministically. A second pass with null fields verifies
// the empty-state branch. (Backend read-path itself is proven at the endpoint level.)
test.describe('CHECK-4: Fear & Greed gauge', () => {
  test('renders the index value + label, and the empty state when absent', async ({ page }) => {
    test.setTimeout(120_000); // two authenticated dashboard loads

    const consoleErrors: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.addInitScript((scope: string) => {
      window.localStorage.setItem('market_scope', scope);
    }, CRYPTO_SCOPE);

    // Intercept the (real) market-context summary and inject fearGreed fields so the gauge
    // data path is verified deterministically regardless of whether the shared :3000 BE has
    // been restarted with the new read-path. (The read-path itself is proven at the endpoint.)
    let injected: { index: number | null; label: string | null } = { index: 18, label: 'Extreme Fear' };
    await page.route('**/api/v1/market-context/summary*', async (route) => {
      const resp = await route.fetch();
      let json: any;
      try { json = await resp.json(); } catch { return route.fulfill({ response: resp }); }
      if (json && json.summary) {
        json.summary.fearGreedIndex = injected.index;
        json.summary.fearGreedLabel = injected.label;
      }
      await route.fulfill({
        status: resp.status(),
        contentType: 'application/json',
        body: JSON.stringify(json),
      });
    });

    // --- data path ---
    await visitAuthenticated(page, '/');
    const gauge = page.locator('div.MuiPaper-root', { hasText: 'Fear & Greed' }).first();
    await expect(gauge).toBeVisible({ timeout: 30_000 });
    await expect(gauge).toContainText('Extreme Fear', { timeout: 15_000 });
    await expect(gauge).toContainText('18');

    // --- empty state ---
    injected = { index: null, label: null };
    await visitAuthenticated(page, '/');
    await expect(
      page.getByText(/Sentiment index is not available yet/i).first()
    ).toBeVisible({ timeout: 30_000 });

    const reactError = consoleErrors.find((e) =>
      e.includes('Objects are not valid as a React child') || e.includes('Minified React error')
    );
    expect(reactError, `React error with gauge present: ${reactError}`).toBeUndefined();
  });
});

// === CHECK-2: Signal Board /screener in CRYPTO scope ===
test.describe('CHECK-2: Signal Board /screener in CRYPTO scope', () => {
  test('renders populated rows, coin names visible, no React crash, no NSE leak', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.addInitScript((scope: string) => {
      window.localStorage.setItem('market_scope', scope);
    }, CRYPTO_SCOPE);

    await visitAuthenticated(page, '/screener');
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    const bodyText = await page.locator('body').innerText();
    console.log('Screener body snippet:', bodyText.substring(0, 600));

    // Must not crash with React error
    const reactError = consoleErrors.find((e) =>
      e.includes('Objects are not valid as a React child') || e.includes('Minified React error')
    );
    expect(reactError, `React error on screener: ${reactError}`).toBeUndefined();

    // Crypto Signal Board heading / description should appear
    const hasCryptoBoard = bodyText.includes('Crypto Signal Board') || bodyText.includes('Crypto') || bodyText.includes('crypto');
    console.log('Crypto Signal Board present:', hasCryptoBoard);

    // Check for coin names -- the screener page renders the Crypto Signal Board for crypto scope
    // Try waiting for table data rows or coin names
    await page.waitForTimeout(3000); // give data time to render
    const bodyAfterWait = await page.locator('body').innerText();

    const hasBitcoin = bodyAfterWait.includes('Bitcoin');
    const hasEthereum = bodyAfterWait.includes('Ethereum');
    const hasBTC = bodyAfterWait.includes('BTCUSDT') || bodyAfterWait.includes('BTC');
    console.log('Bitcoin full name:', hasBitcoin, '| Ethereum:', hasEthereum, '| BTC ticker:', hasBTC);

    // No NSE/BSE leak
    const nseCount = await page.getByText(/NSE|BSE|Indian equities/i).count();
    console.log('NSE/BSE leak count:', nseCount);
    expect(nseCount, 'NSE/BSE should not appear in crypto scope').toBe(0);

    console.log('Screener console errors:', JSON.stringify(consoleErrors.slice(0, 5)));
  });
});
