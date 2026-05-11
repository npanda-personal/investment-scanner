import { expect, test } from '@playwright/test';
import { visitModule } from './support/moduleAssertions';

test.describe('Market Context Intelligence UI', () => {
  test('shows coherent breadth samples and excludes Unknown sector leadership', async ({ page }) => {
    await page.route('**/api/v1/market-context/summary**', async (route) => {
      await route.fulfill({
        json: {
          regime: {
            regime: 'RISK_ON',
            score: 71,
            explanation: 'risk-on because broad return is 4.2% and 75.4% of sampled instruments are above SMA50.',
            updatedAt: '2026-05-10T00:00:00.000Z',
            dataStatus: 'PARTIAL',
          },
          topSectors: [
            {
              sector: 'Financial Services',
              return1M: 0.03,
              return3M: 0.06,
              return6M: 0.09,
              relativeStrengthScore: 62,
              instrumentCount: 1,
              bullishSignalCount: 0,
              bearishSignalCount: 0,
              leadershipStatus: 'IMPROVING',
            },
          ],
          weakSectors: [],
          breadth: {
            percentAboveSma50: 0.754,
            percentAboveSma200: 0.471,
            sma50SampleCount: 500,
            sma200SampleCount: 500,
            advanceDeclineRatio: 1.5,
            newHigh52WeekCount: 17,
            newLow52WeekCount: 4,
            bullishSignalCount: 0,
            bearishSignalCount: 0,
            instrumentCount: 500,
            dataStatus: 'PARTIAL',
          },
          countryStrength: [],
          macro: {
            interestRateProxy: null,
            inflationProxy: null,
            usdStrengthProxy: null,
            commodityProxy: null,
            macroStatus: 'UNKNOWN',
            dataStatus: 'MISSING',
            explanation: 'Macro providers are not configured yet.',
          },
          explanation: ['Financial Services is the named sector leader.'],
          updatedAt: '2026-05-10T00:00:00.000Z',
          dataStatus: 'PARTIAL',
        },
      });
    });

    await visitModule(page, '/market-context', 'Market Context Intelligence');

    await expect(page.getByText('Above SMA50', { exact: true })).toBeVisible();
    await expect(page.getByText('75.4%', { exact: true })).toBeVisible();
    await expect(page.getByText('47.1%', { exact: true })).toBeVisible();
    await expect(page.getByText('Price Sample')).toBeVisible();
    await expect(page.getByText('SMA Samples')).toBeVisible();
    await expect(page.getByText('500 / 500')).toBeVisible();
    const sectorRotation = page.getByRole('heading', { name: 'Sector Rotation' }).locator('..');
    await expect(sectorRotation.getByText('Unknown', { exact: true })).toHaveCount(0);
    await expect(sectorRotation.getByText('Financial Services', { exact: true })).toBeVisible();
  });
});
