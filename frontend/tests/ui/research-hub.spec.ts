import { expect, test } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

test.describe('Research Hub UI', () => {
  test('exposes proof-driven triage and research-only language', async ({ page }) => {
    const overviewRequests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/v1/research/overview')) {
        overviewRequests.push(url.search);
      }
    });
    await page.route('**/api/v1/research/overview**', async (route) => {
      await route.fulfill({
        json: {
          marketReadiness: {
            marketGate: 'OPEN',
            marketCondition: 'HEALTHY',
            headline: 'Environment is healthy: high-conviction setups allowed.',
            allowedActions: [],
            reasons: [],
            blockers: [],
            dataStatus: 'COMPLETE'
          },
          researchPriorities: {
            tradeCandidates: [],
            watchCandidates: [],
            avoidCandidates: [],
            exitCandidates: []
          },
          strategyProofSummary: {
            strategiesProducingCandidates: [],
            provenCandidateCount: 0,
            unprovenCandidateCount: 0,
            blockedByMarketGateCount: 0,
            missingBacktestCount: 0,
            notes: []
          },
          confirmationSummary: {
            signalSummary: { topBullishCount: 0, topBearishCount: 0, reliabilityAvailable: false, notes: [] },
            smartMoneySummary: { accumulationCount: 0, distributionCount: 0, topConfirmations: [], topContradictions: [] },
            marketContextSummary: { leadingSectors: [], weakSectors: [], breadthStatus: 'Neutral', notes: [] }
          },
          whatChanged: {
            newTradeCandidates: [],
            downgradedCandidates: [],
            warnings: []
          },
          nextActions: [],
          dataGaps: [],
          generatedAt: '2026-05-10T00:00:00.000Z'
        }
      });
    });

    await visitModule(page, '/research', 'Research Command Center');
    await expect(page.getByRole('heading', { name: 'Review Candidates' })).toBeVisible();
    await expect(page.getByText('Strategy Proof').first()).toBeVisible();
    await expect(page.getByText('Confirmation Layers')).toBeVisible();
    await expect(page.getByText('NEW TRADE CANDIDATES')).toHaveCount(0);
    await expect(page.getByText('No framework-backed strategies are producing review candidates yet.')).toBeVisible();
    await expect(page.getByText('No new review candidates since the last evaluation.')).toBeVisible();
    await expect.poll(() => overviewRequests.some((search) => search.includes('region=IN') && search.includes('assetType=STOCK'))).toBe(true);
  });

  test('links to current module routes', async ({ page }) => {
    await visitModule(page, '/research', 'Research Command Center');
    await expect(page.getByRole('heading', { name: 'Research Command Center' })).toBeVisible();

    await expect(page.locator('a[href="/research/strategy"]')).toHaveCount(0);
    await expect(page.locator('a[href="/research/signals"]')).toHaveCount(0);
    await expect(page.locator('a[href="/research/smart-money"]')).toHaveCount(0);
    await expect(page.locator('a[href="/research/market-context"]')).toHaveCount(0);

    await expect(page.locator('a[href="/strategy"]').first()).toBeVisible();
    await expect(page.locator('a[href="/signals"]').first()).toBeVisible();
    await expect(page.locator('a[href="/smart-money"]').first()).toBeVisible();
    await expect(page.locator('a[href="/market-context"]').first()).toBeVisible();
  });
});
