# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: market-intelligence.spec.ts >> Market Intelligence persisted read-model pages >> Earnings renders backend rows, result date provenance, estimated-date risk, and empty tabs
- Location: tests\ui\market-intelligence.spec.ts:337:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Mar 31, 2026')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText('Mar 31, 2026')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - heading "Earnings Intelligence" [level=6] [ref=e7]
      - generic [ref=e8]:
        - 'button "Market: India" [ref=e10] [cursor=pointer]':
          - img [ref=e12]
          - generic [ref=e14]: "Market: India"
          - img [ref=e16]
        - separator [ref=e18]
        - generic [ref=e20] [cursor=pointer]:
          - checkbox [checked] [ref=e21]
          - img [ref=e22]
        - paragraph [ref=e25]: codex.test@example.com
        - button "Log out" [ref=e26] [cursor=pointer]:
          - img [ref=e27]
  - generic [ref=e30]:
    - generic [ref=e31]:
      - heading "Investment Scanner" [level=6] [ref=e32]
      - button [ref=e33] [cursor=pointer]:
        - img [ref=e34]
    - separator [ref=e36]
    - list [ref=e37]:
      - generic [ref=e39]: Trader Workflow
      - listitem [ref=e40]:
        - link "Market Pulse" [ref=e41] [cursor=pointer]:
          - /url: /
          - img [ref=e43]
          - paragraph [ref=e46]: Market Pulse
      - listitem [ref=e47]:
        - link "Stock Interest Radar" [ref=e48] [cursor=pointer]:
          - /url: /stock-interest-radar
          - img [ref=e50]
          - paragraph [ref=e53]: Stock Interest Radar
      - listitem [ref=e54]:
        - link "Earnings Intelligence" [ref=e55] [cursor=pointer]:
          - /url: /earnings-intelligence
          - img [ref=e57]
          - paragraph [ref=e60]: Earnings Intelligence
      - listitem [ref=e61]:
        - link "Compounder Radar" [ref=e62] [cursor=pointer]:
          - /url: /compounder-radar
          - img [ref=e64]
          - paragraph [ref=e67]: Compounder Radar
      - listitem [ref=e68]:
        - link "Trader Setup Radar" [ref=e69] [cursor=pointer]:
          - /url: /trader-setup-radar
          - img [ref=e71]
          - paragraph [ref=e74]: Trader Setup Radar
      - listitem [ref=e75]:
        - link "Risk Radar" [ref=e76] [cursor=pointer]:
          - /url: /risk-radar
          - img [ref=e78]
          - paragraph [ref=e81]: Risk Radar
      - listitem [ref=e82]:
        - link "Watchlists" [ref=e83] [cursor=pointer]:
          - /url: /watchlists
          - img [ref=e85]
          - paragraph [ref=e88]: Watchlists
      - listitem [ref=e89]:
        - link "Portfolios" [ref=e90] [cursor=pointer]:
          - /url: /portfolios
          - img [ref=e92]
          - paragraph [ref=e95]: Portfolios
      - listitem [ref=e96]:
        - link "Alerts" [ref=e97] [cursor=pointer]:
          - /url: /alerts
          - img [ref=e99]
          - paragraph [ref=e102]: Alerts
      - listitem [ref=e103]:
        - link "Instrument Workspace" [ref=e104] [cursor=pointer]:
          - /url: /instrument-workspace
          - img [ref=e106]
          - paragraph [ref=e109]: Instrument Workspace
    - separator [ref=e110]
    - generic [ref=e112]:
      - paragraph [ref=e113]: Theme
      - button [ref=e114] [cursor=pointer]:
        - img [ref=e115]
  - main [ref=e117]:
    - generic [ref=e120]:
      - generic [ref=e122]:
        - generic [ref=e123]:
          - heading "Earnings Intelligence" [level=4] [ref=e124]
          - generic [ref=e125]:
            - generic [ref=e127]: IN / STOCK
            - generic [ref=e129]: Partial
        - paragraph [ref=e130]: Which result-related stocks deserve attention?
      - generic [ref=e131]:
        - generic [ref=e133]: "Status: Partial"
        - generic [ref=e135]: "Freshness: Partial"
        - generic [ref=e137]: "Snapshot Date: 6/1/2026"
        - generic [ref=e139]: "Data Through: 5/31/2026"
        - generic [ref=e141]: "Generated At: 6/1/2026, 7:45:00 AM"
      - alert [ref=e143]:
        - img [ref=e145]
        - generic [ref=e147]: Estimated result dates are not official calendar events.
      - generic [ref=e149]:
        - generic:
          - img
        - tablist [ref=e152]:
          - tab "Upcoming Results" [selected] [ref=e153] [cursor=pointer]
          - tab "Pre-Result Interest" [ref=e154] [cursor=pointer]
          - tab "Result Winners" [ref=e155] [cursor=pointer]
          - tab "Result Disappointments" [ref=e156] [cursor=pointer]
          - tab "Result Reaction History" [ref=e157] [cursor=pointer]
          - tab "Earnings Watchlist" [ref=e158] [cursor=pointer]
        - img [ref=e161] [cursor=pointer]
      - table [ref=e164]:
        - rowgroup [ref=e165]:
          - row "Symbol Result Date Date Source Period End Validated At Days To Result Revenue Growth Profit Growth EPS Growth Margin Trend Consistency Acceleration Freshness Reasons Risks Warnings" [ref=e166]:
            - columnheader "Symbol" [ref=e167]
            - columnheader "Result Date" [ref=e168]
            - columnheader "Date Source" [ref=e169]
            - columnheader "Period End" [ref=e170]
            - columnheader "Validated At" [ref=e171]
            - columnheader "Days To Result" [ref=e172]
            - columnheader "Revenue Growth" [ref=e173]
            - columnheader "Profit Growth" [ref=e174]
            - columnheader "EPS Growth" [ref=e175]
            - columnheader "Margin Trend" [ref=e176]
            - columnheader "Consistency" [ref=e177]
            - columnheader "Acceleration" [ref=e178]
            - columnheader "Freshness" [ref=e179]
            - columnheader "Reasons" [ref=e180]
            - columnheader "Risks" [ref=e181]
            - columnheader "Warnings" [ref=e182]
        - rowgroup [ref=e183]:
          - row "EARNEST 6/20/2026 Estimated From Period Cadence 3/31/2026 5/10/2026 19 +12.5% +9.3% +7.0% -1.5% 74 81 PARTIAL PRE_RESULT_INTEREST ESTIMATED_RESULT_DATE RESULT_DATE_ESTIMATED_FROM_PERIOD_CADENCE" [ref=e184]:
            - cell "EARNEST" [ref=e185]
            - cell "6/20/2026" [ref=e186]
            - cell "Estimated From Period Cadence" [ref=e187]
            - cell "3/31/2026" [ref=e188]
            - cell "5/10/2026" [ref=e189]
            - cell "19" [ref=e190]
            - cell "+12.5%" [ref=e191]
            - cell "+9.3%" [ref=e192]
            - cell "+7.0%" [ref=e193]
            - cell "-1.5%" [ref=e194]
            - cell "74" [ref=e195]
            - cell "81" [ref=e196]
            - cell "PARTIAL" [ref=e197]
            - cell "PRE_RESULT_INTEREST" [ref=e198]:
              - generic [ref=e201]: PRE_RESULT_INTEREST
            - cell "ESTIMATED_RESULT_DATE" [ref=e202]:
              - generic [ref=e205]: ESTIMATED_RESULT_DATE
            - cell "RESULT_DATE_ESTIMATED_FROM_PERIOD_CADENCE" [ref=e206]:
              - generic [ref=e209]: RESULT_DATE_ESTIMATED_FROM_PERIOD_CADENCE
```

# Test source

```ts
  281 |             snapshotDate: '2026-06-01',
  282 |             dataThroughDate: '2026-05-31',
  283 |             generatedAt: '2026-06-01T05:45:00.000Z',
  284 |             score: 98,
  285 |             symbol: 'HIGHSECOND',
  286 |             company: 'High Second Ltd',
  287 |             sector: 'Financial Services',
  288 |             category: 'TODAY_TOP_INTEREST',
  289 |             direction: 'Bullish trigger',
  290 |             reasonTags: ['backend-order-second'],
  291 |             riskTags: ['event-risk'],
  292 |             freshness: 'FRESH',
  293 |             warnings: [],
  294 |           },
  295 |           {
  296 |             snapshotDate: '2026-06-01',
  297 |             dataThroughDate: '2026-05-31',
  298 |             generatedAt: '2026-06-01T05:45:00.000Z',
  299 |             score: 8,
  300 |             symbol: 'RISKROW',
  301 |             company: 'Risk Row Ltd',
  302 |             sector: 'Materials',
  303 |             category: 'RISK_AVOID',
  304 |             direction: 'Risk warning',
  305 |             reasonTags: ['weak-context'],
  306 |             riskTags: ['negative-trend'],
  307 |             freshness: 'STALE',
  308 |             warnings: ['stale-stock-interest-row'],
  309 |           },
  310 |         ],
  311 |         message: 'Persisted Stock Interest snapshot rows loaded.',
  312 |         warnings: ['3 row-level Stock Interest data warnings across 1 symbols.'],
  313 |       },
  314 |     });
  315 | 
  316 |     await visitAuthenticated(page, '/stock-interest-radar');
  317 | 
  318 |     const rows = page.locator('tbody tr');
  319 |     await expect(rows.nth(0)).toContainText('LOWFIRST');
  320 |     await expect(rows.nth(1)).toContainText('HIGHSECOND');
  321 |     await expect(page.getByText('backend-order-first')).toBeVisible();
  322 |     await expect(page.getByText('event-risk')).toBeVisible();
  323 |     await expect(page.getByText('3 row-level Stock Interest data warnings across 1 symbols.')).toBeVisible();
  324 |     await expect(page.getByText('stale-stock-interest-row')).toHaveCount(0);
  325 |     await expect(page.getByText('RISKROW')).toHaveCount(0);
  326 | 
  327 |     await page.getByRole('tab', { name: 'Risk / Avoid' }).click();
  328 |     await expect(page.getByText('RISKROW')).toBeVisible();
  329 |     await expect(page.getByText('negative-trend')).toBeVisible();
  330 |     await expect(page.getByText('stale-stock-interest-row')).toHaveCount(0);
  331 | 
  332 |     await page.getByRole('tab', { name: 'Growth Consistency' }).click();
  333 |     await expect(page.getByText('No Growth Consistency rows were present in the backend snapshot.')).toBeVisible();
  334 |     await expectNoSharedMutationsOrOperatorControls(page, apiRequests);
  335 |   });
  336 | 
  337 |   test('Earnings renders backend rows, result date provenance, estimated-date risk, and empty tabs', async ({ page }) => {
  338 |     const earningsRow = {
  339 |       id: 'earnings-row-1',
  340 |       snapshotDate: '2026-06-01',
  341 |       dataThroughDate: '2026-05-31',
  342 |       symbol: 'EARNEST',
  343 |       resultDate: '2026-06-20',
  344 |       resultDateSource: 'ESTIMATED_FROM_PERIOD_CADENCE',
  345 |       periodEndDate: '2026-03-31',
  346 |       validatedAt: '2026-05-10',
  347 |       daysToResult: 19,
  348 |       revenueGrowth: 12.5,
  349 |       profitGrowth: 9.25,
  350 |       epsGrowth: 7,
  351 |       marginTrend: -1.5,
  352 |       consistencyScore: 74,
  353 |       accelerationScore: 81,
  354 |       reasonTags: ['PRE_RESULT_INTEREST'],
  355 |       riskTags: ['ESTIMATED_RESULT_DATE'],
  356 |       warnings: ['RESULT_DATE_ESTIMATED_FROM_PERIOD_CADENCE'],
  357 |       freshness: 'PARTIAL',
  358 |       categories: ['UPCOMING_RESULTS', 'EARNINGS_WATCHLIST'],
  359 |     };
  360 |     const apiRequests = await setupReadOnlyPage(page, {
  361 |       earnings: {
  362 |         scope: { region: 'IN', assetType: 'STOCK' },
  363 |         snapshotDate: '2026-06-01',
  364 |         dataThroughDate: '2026-05-31',
  365 |         generatedAt: '2026-06-01T05:45:00.000Z',
  366 |         freshness: 'PARTIAL',
  367 |         categories: {
  368 |           ...emptyEarningsCategories,
  369 |           UPCOMING_RESULTS: [earningsRow],
  370 |           EARNINGS_WATCHLIST: [earningsRow],
  371 |         },
  372 |         items: [earningsRow],
  373 |         warnings: ['Estimated result dates are not official calendar events.'],
  374 |       },
  375 |     });
  376 | 
  377 |     await visitAuthenticated(page, '/earnings-intelligence');
  378 | 
  379 |     await expect(page.getByText('EARNEST')).toBeVisible();
  380 |     await expect(page.getByText('Estimated From Period Cadence')).toBeVisible();
> 381 |     await expect(page.getByText('Mar 31, 2026')).toBeVisible();
      |                                                  ^ Error: expect(locator).toBeVisible() failed
  382 |     await expect(page.getByText('May 10, 2026')).toBeVisible();
  383 |     await expect(page.getByText('ESTIMATED_RESULT_DATE')).toBeVisible();
  384 |     await expect(page.getByText('RESULT_DATE_ESTIMATED_FROM_PERIOD_CADENCE')).toBeVisible();
  385 |     await expect(page.getByText('+12.5%')).toBeVisible();
  386 |     await expect(page.getByText('-1.5%')).toBeVisible();
  387 |     await expect(page.getByText('Estimated result dates are not official calendar events.')).toBeVisible();
  388 | 
  389 |     await page.getByRole('tab', { name: 'Earnings Watchlist' }).click();
  390 |     await expect(page.getByText('EARNEST')).toBeVisible();
  391 | 
  392 |     await page.getByRole('tab', { name: 'Result Winners' }).click();
  393 |     await expect(page.getByText('No Result Winners rows were present in the backend snapshot.')).toBeVisible();
  394 |     await expectNoSharedMutationsOrOperatorControls(page, apiRequests);
  395 |   });
  396 | });
  397 | 
```