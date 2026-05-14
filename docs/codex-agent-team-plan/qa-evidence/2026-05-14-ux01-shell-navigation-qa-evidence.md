# UX-01 Shell/Navigation/Home QA Evidence

Date: 2026-05-14
Mode: QA Verification Mode
Work item: UX-01 shell/navigation/home
QA owner: UX-01 QA Verifier

## Verdict

Status: **PASS (Re-verified)**
Artifact: `docs/codex-agent-team-plan/qa-evidence/2026-05-14-ux01-shell-navigation-qa-evidence.md`

UX-01 can move to **Lead validation**.

## Evidence Base

1. Source review only (no runtime source edits).
2. Existing build evidence accepted: frontend `npm.cmd run build` passed after the UX-01 revision per handoff input.
3. No Playwright execution (intentionally skipped; see skipped checks).
4. Re-verification focused only on prior rejection items plus nearby regression risk in revised files.

## Acceptance Matrix Verification

1. Nav group/label validation: **PASS**
   - Workflow-first groups present in nav metadata: `Daily Work`, `Foundation`, `Signal Chain`, `Decision and Proof`, `Portfolio Ops`, `Account and Support` (`frontend/src/app/navigationMetadata.tsx`).
   - Required labels present: `Today Review`, `Research Command Center`.
   - No broken label encoding observed in nav metadata.

2. Route-family shell title validation: **PASS**
   - Title is derived from `resolveNavItem(location.pathname)?.label` in shell top bar (`frontend/src/app/NavigationLayout.tsx`).
   - Prefix/alias mapping verified in metadata (`frontend/src/app/navigationMetadata.tsx`):
     - `/today-review/candidates/:candidateId` -> `Today Review` via `matchPrefixes`.
     - `/market-data-foundation/:id` -> `Market Data Foundation` via `matchPrefixes`.
     - `/stocks/:id` -> `Market Data Foundation` via `matchPrefixes`.
     - `/research/stocks/:id` -> `Research Command Center` via `matchPrefixes`.
     - `/trade-plans/:instrumentId` -> `Trade Plans` via `matchPrefixes`.

3. Home launch target validation: **PASS**
   - Home contains only intended primary workflow cards:
     - Today Review
     - Research Command Center
     - Market Data Foundation
     - Trade Plans
     - Portfolios
   - Button targets match expected canonical routes (`frontend/src/app/HomePage.tsx`).

4. Back-flow validation (scoped detail pages): **PASS after re-verification**
   - `/research/stocks/:id` uses `StockResearchWorkbenchPage` with destination `/research` and label `Back to Research Command Center` (`frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`).
   - `/trade-plans/:instrumentId` normal detail view includes canonical `Back to Trade Plans` link to `/trade-plans` (`frontend/src/features/trade-plan-risk-engine/components/TradePlanDetail.tsx`).
   - Today-review detail states use `backTo="/today-review"` and `backLabel="Today Review"` (`frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`).

5. Browser history validation: **SKIPPED**
   - Not executed in browser automation/manual runtime session during this QA pass.
   - Source-only verification cannot prove runtime browser back/forward behavior conclusively.

6. Alias compatibility validation: **PASS (source-level)**
   - Alias route retained:
     - `stocks` redirects to `/market-data-foundation`
     - `stocks/:id` remains routed to detail component
     - file: `frontend/src/features/market-data-foundation/routes.tsx`
   - Nav metadata preserves alias awareness via `aliases` and `matchPrefixes` for `/stocks`.

## Re-Verification Result

Status: **PASS**

Previously rejected items are resolved:

1. Research detail back target now returns to `/research` with `Back to Research Command Center`.
2. Trade plan detail normal success path now includes `Back to Trade Plans` to `/trade-plans`.
3. Today-review candidate detail back labels now use `Today Review`.

Regression check from revised files: **PASS**

- Research peer navigation remains within `/research/stocks/:id`.
- Trade plan no-plan fallback still links to `/trade-plans`.
- Today-review drilldown links remain unchanged and do not alter shell/title routing contracts.

## Remaining Rejection Reasons

None.

## Skipped Checks

1. Playwright/UI automation: **Skipped intentionally**
   Reason: task constraints required Playwright only if necessary and memory-safe; source review plus existing frontend build evidence was sufficient to determine contract compliance/non-compliance.

2. Manual browser history/back-forward run: **Skipped**
   Reason: no runtime browser session executed in this QA pass; recorded as not verified.
