# Regression Todo Runbook

Use this checklist whenever a module change does not yet have full automated UI coverage. The goal is to preserve the exact regression effort, make every manual check repeatable, and convert stable manual checks into module-owned Playwright tests over time.

## Preconditions

- Backend and frontend are running locally.
- Login uses the local test user: `codex.test@example.com` / `CodexTest123!`.
- Default market scope is `IN / STOCK` unless the task explicitly changes scope.
- Do not run full-universe/provider-heavy jobs from the automated UI suite. Run those manually in the browser when the task requires real data mutation or provider access.

## Standard Regression Flow

1. Login - manual
   - Open `http://localhost:5173/login`.
   - Sign in with the local test user.
   - Confirm protected navigation works and the global market scope is visible.
   - Confirm the current task's target route loads without auth loops or blank screens.

2. Data validation - UI test suite
   - Add or update the module-owned spec under `frontend/tests/ui/`.
   - Prefer stable UI/API assertions over heading-only checks.
   - Verify that data-bearing screens show scoped data or a domain-specific empty state.
   - Run the relevant UI specs from `frontend/`.

   ```bash
   npm.cmd run test:ui -- signal-generation-engine.spec.ts signal-calibration-engine.spec.ts strategy-framework.spec.ts strategy-decision-engine.spec.ts backtesting-strategy-lab.spec.ts --output=playwright-results-connected-chain
   ```

   - For broad shared UI changes, run the full local UI suite.

   ```bash
   npm.cmd run test:ui -- --output=playwright-results-full
   ```

3. Backend/API validation - automated where changed
   - Run targeted backend tests for every backend module touched.

   ```bash
   npm.cmd test -- signal-generation-engine signal-calibration-engine strategy-framework strategy-decision-engine backtesting-strategy-lab --runInBand
   ```

   - If Market Data Foundation or Data Quality changed, include their module test patterns too.

4. Data flow test - manual with details
   - Open each touched route in the browser.
   - Confirm the route uses the current global scope.
   - Confirm tables/cards/counts reflect the same filtered dataset.
   - Confirm empty states explain the exact missing prerequisite.
   - Confirm bulk buttons are disabled while running and show final inserted/updated/no-op/skipped/failed style summaries when applicable.
   - Record exact data observations in the task summary: route, filter/scope, visible count, API count if checked, and any skipped/empty-state reason.

5. Regression script upkeep - mandatory when manual checks remain
   - If the manual check is new and not covered by an existing section below, add it to this file before finishing the task.
   - If a manual check becomes stable and safe to automate, move it into the owning module's Playwright spec and leave a short note here only if a real bulk/provider step still needs manual verification.

## Connected Chain Manual Checks

Use these when testing the strategy, signals, calibration, decision, and backtest chain.

1. Signal Generation - manual
   - Route: `/signals`.
   - Verify `IN / STOCK` scope.
   - Confirm signal rows, direction counts, and stale/empty messaging agree.
   - Confirm rows expose symbol, score/direction, timestamp, and source context.

2. Signal Calibration - manual
   - Route: `/signals/calibration`.
   - Verify horizon controls change the scoped data.
   - Confirm rows show raw score, calibrated score, score delta, evidence status, sample counts, and `calibrationApplied`.
   - If evidence is insufficient, confirm calibrated score equals raw score and the UI explains why.

3. Strategy Framework - manual
   - Route: `/strategies`.
   - Confirm category tabs separate entry, exit, gate, filter, and draft strategies.
   - Confirm only active ENTRY strategies enable Backtest in Lab.
   - Confirm support/draft strategies are visible but not sent to standalone backtests.

4. Strategy Decision - manual
   - Route: `/strategy`.
   - Confirm `Market Gate` is scoped to the current header region and is not using a stale `GLOBAL` market-context snapshot for `IN`.
   - Confirm evaluation selectors do not include gate/filter/draft strategies as standalone candidates.
   - Confirm candidate data is scoped and uses strategy-decision language rather than trading/order language.
   - Confirm pagination or batch progress does not process only one avoidable tiny batch when larger safe batches are configured.

5. Backtesting Strategy Lab - manual
   - Route: `/backtests`.
   - Confirm registered strategy selector contains active ENTRY strategies only.
   - Confirm saved run history is scoped by region and asset type.
   - If there are no scoped runs, confirm the empty state names the scope.

6. Trade Plan & Risk Management - manual
   - Route: `/trade-plans`.
   - Confirm funnel diagnostics, latest plan table, and detail links use the current `IN / STOCK` scope.
   - Confirm batch generation controls disable while running, show processed/total progress, and end with a summary that separates generated, skipped, failed, paper-ready, and blocker counts.
   - After a real generation run, confirm paper-readiness blockers are legitimate proof/data/risk blockers, not only `Position sizing is missing` for batch-generated plans without a selected portfolio.
   - Always verify the real browser funnel after Trade Plan readiness logic changes. A mock UI test is not sufficient: open `/trade-plans`, run or inspect the latest real batch result, compare Paper Ready count with the API/database blockers, and document whether zero ready is caused by legitimate proof/data/risk blockers.
   - Confirm the funnel blocker list reflects the latest generated plan date by default; older stale generated dates should not keep obsolete blockers at the top after a new batch run.
   - Do not run a full real batch as part of routine smoke testing unless Trade Plan generation behavior changed. If a real run is required, record candidate count, generated count, failed count, proof timeframe, and top blockers.
   - Open one visible plan detail and confirm proof snapshot, Strategy Decision snapshot, latest price, coverage, liquidity, and paper-readiness blockers are visible.

## Research And Smart Money Manual Checks

Use these when testing Research Hub or Smart Money Intelligence.

1. Research Hub - manual
   - Route: `/research`.
   - Confirm the overview request includes `region=IN&assetType=STOCK`.
   - Confirm the page loads without triggering signal generation, smart-money refresh, strategy evaluation, backtest execution, or provider fetches.
   - Confirm review candidates come from Strategy Decision/Framework proof, while raw signal counts are shown only as confirmation context.
   - Record overview response time when performance is part of the task.

2. Smart Money Intelligence - manual
   - Route: `/smart-money`.
   - Confirm `1M`, `3M`, and `6M` each request top accumulation, distribution, and sector endpoints with the selected range.
   - Confirm top rows/totals are not silently cloned across ranges. If the same rows appear, inspect API payloads before accepting it as market behavior.
   - For real snapshot refresh behavior, click `Refresh Snapshots` manually only when a data-changing run is required. Confirm batches continue until `hasMore=false`, progress is visible, and the final summary separates generated, skipped, and failed counts.

## Evidence Template

Copy this into the task summary when a manual regression was required.

```text
Regression evidence:
- Date:
- Modules/routes:
- Automated UI tests:
- Backend tests:
- Browser checks:
- Data observations:
- Issues found:
- Fixes applied:
- Manual checks to automate next:
```

## Convert Manual Checks To UI Tests

- If the same manual browser check is repeated twice, add a module-owned Playwright assertion.
- If the check requires real provider calls, keep the provider call manual and automate the surrounding UI states with a stubbed request.
- If the check validates cross-module data flow, prefer a focused connected-chain spec over a large catch-all spec.
- Keep test files modular: one spec per module or connected workflow.
