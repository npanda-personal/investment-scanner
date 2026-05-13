# Associate UX Navigation and Information Architecture Audit

Date: 2026-05-14
Artifact owner: Associate UX - Navigation and Information Architecture
Repo: `C:\work\repo\investment-scanner`

## Scope

Audit the current route structure, navigation, page-to-page transitions, back-flow, module grouping, and findability. This review is limited to navigation and information architecture. It does not propose runtime code changes.

## Current Problems

### 1. The app shell is organized by module buckets, not by user workflow

The main drawer groups pages into `Overview`, `Research`, `Portfolio`, `Intelligence Lab`, and `Account` in [NavigationLayout.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/app/NavigationLayout.tsx:49>). That structure reflects internal feature ownership more than the sequence users actually follow:

`Market Data -> Data Quality -> Signals -> Strategy -> Today Review / Research Hub -> Trade Plans -> Portfolio actions`.

This makes the app harder to scan because users must infer the product model before they can find the next task.

### 2. The top bar title is not route-family aware

The shell resolves the active title only from exact pathname matches in [NavigationLayout.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/app/NavigationLayout.tsx:108>). Deep routes therefore fall back to the generic product title instead of preserving workspace context.

This is most visible on drill-in pages such as stock detail, trade-plan detail, and candidate detail. The user loses the parent workspace name exactly when they need orientation most.

### 3. Stock navigation is split across three overlapping route families

There are three separate stock entry paths:

- `market-data-foundation/:id`
- `stocks/:id` aliasing the market data workspace
- `research/stocks/:id` for the research workbench

See [market-data-foundation/routes.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/features/market-data-foundation/routes.tsx:8>) and [stock-research-workbench/routes.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/features/stock-research-workbench/routes.tsx:5>).

This creates ambiguity around which page is the canonical stock workspace. It also weakens link predictability from cards, tables, and drilldowns.

### 4. Back-flow is local, not system-level

The shared [PageHeader](</abs/path/c:/work/repo/investment-scanner/frontend/src/shared/components/PageHeader.tsx:37>) supports a `backTo` prop, but the shell does not preserve lineage or breadcrumbs.

That means back behavior is page-by-page instead of workspace-by-workspace. Examples:

- Today Review candidate detail has its own back target in [TodayReviewCandidateDetailPage.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx:63>)
- Stock research uses a separate button back to Market Data in [StockResearchWorkbenchPage.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx:107>)
- Trade Plan detail uses an ad hoc back button instead of the shared header pattern in [TradePlanDetail.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/features/trade-plan-risk-engine/components/TradePlanDetail.tsx:86>)

The result is a fractured navigation model where similar drilldown pages behave differently.

### 5. The home page does not route users to the right primary workflows

The home page cards in [HomePage.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/app/HomePage.tsx:11>) mix launch pads and duplicate entry points:

- The `Stock Research Workbench` card links to `/market-data-foundation` instead of the research workspace.
- The page omits a clear `Today Review` launch even though that is one of the main daily workflows.
- The copy implies a task, but the link target sometimes lands on a prerequisite screen rather than the task itself.

This hurts findability because the first screen is not a reliable launcher for the app's highest-frequency jobs.

### 6. Several page titles and nav labels are inconsistent

The shell label for `Today Review` contains a broken apostrophe in [NavigationLayout.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/app/NavigationLayout.tsx:53>).

The Research Hub nav label is `Overview` in [NavigationLayout.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/app/NavigationLayout.tsx:61>), while the page itself is titled `Research Command Center` in [ResearchOverviewPage.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/features/research-hub/components/ResearchOverviewPage.tsx:108>).

Those inconsistencies weaken route recognition and make the product feel internally named rather than task named.

### 7. The route tree is flat at the shell level

The app route registry mounts many feature routes as siblings under the same `NavigationLayout` in [routes.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/app/routes.tsx:36>). That is technically simple, but it hides the workflow hierarchy.

Users see a flat menu of engines and labs instead of a structured progression from foundation to decision to review to portfolio action.

## Proposed IA

### Primary navigation bands

Reorganize the shell around the user's decision flow:

1. Daily Work
   - Today Review
   - Research Command Center

2. Foundation
   - Market Data Foundation
   - Data Quality
   - Historical Context Snapshots

3. Signal Chain
   - Signal Generation
   - Signal Quality
   - Signal Calibration
   - Smart Money
   - Market Context

4. Decision and Proof
   - Strategy Framework
   - Strategy Decision
   - Backtesting
   - Trade Plans

5. Portfolio Ops
   - Portfolios
   - Watchlists
   - Alerts

6. Account and Support
   - AI Copilot
   - Billing
   - Notifications
   - Account

### Canonical route model

Keep one canonical route per user-facing workspace and use redirects for aliases:

- `Today Review` -> `/today-review`
- `Research Command Center` -> `/research`
- `Market Data Foundation` -> `/market-data-foundation`
- `Stock Research Workspace` -> one canonical stock route family, with aliases redirected
- `Signal Generation` -> `/signals`
- `Signal Quality` -> `/signals/quality`
- `Signal Calibration` -> `/signals/calibration`
- `Strategy Decision` -> `/strategy`
- `Strategy Framework` -> `/strategies`
- `Backtests` -> `/backtests`
- `Trade Plans` -> `/trade-plans`
- `Portfolios` -> `/portfolios`
- `Watchlists` -> `/watchlists`
- `Alerts` -> `/alerts`

### Route hierarchy behavior

- Preserve parent workspace context on nested routes.
- Show a workspace title for deep routes, not only the leaf page name.
- Use one consistent back target policy for drilldowns:
  - parent workspace back button for canonical drill-ins
  - browser history back only for transient modals or ephemeral overlays
- Keep the shell title in sync with the active workspace and route family.

### Home page role

Turn the home page into a launch surface for the highest-frequency workflows:

- Today Review
- Research Command Center
- Market Data Foundation
- Trade Plans
- Portfolios

The home screen should launch tasks, not duplicate the entire module catalog.

## Acceptance Criteria

1. The main nav is grouped by workflow bands, not by internal engine families.
2. Every primary route has one canonical destination and one visible label.
3. Alias URLs redirect to the canonical route without breaking bookmarks.
4. Deep pages keep the correct parent workspace title in the shell.
5. Stock drill-ins have one obvious return path back to the parent stock workspace.
6. Today Review, Research Hub, and stock workspaces are reachable from the home page without detours.
7. Nav labels and page titles use the same product language.
8. The broken apostrophe in `Today Review` is eliminated as part of the content cleanup.
9. Browser back/forward works predictably across Today Review -> candidate detail -> research -> trade plan drilldowns.

## Risks

- Route consolidation can break saved bookmarks if aliases are removed instead of redirected.
- A partial shell update may improve the labels but leave back-flow inconsistent.
- Renaming the stock workspace without a canonical route policy could increase confusion before it reduces it.
- If the shell title logic is updated without a route-family model, deep pages will still lose context.

## Priority Order

1. Define canonical route families and alias redirects, starting with stock and research drilldowns.
2. Make the shell title route-family aware so deep pages preserve workspace context.
3. Rebuild the left navigation around workflow bands.
4. Repair the home page launch targets so each card lands on the intended task.
5. Normalize page titles and nav copy, including the Today Review apostrophe defect.
6. Standardize back targets across all detail pages.

## Evidence References

- [frontend/src/app/routes.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/app/routes.tsx:27>)
- [frontend/src/app/NavigationLayout.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/app/NavigationLayout.tsx:49>)
- [frontend/src/app/HomePage.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/app/HomePage.tsx:4>)
- [frontend/src/shared/components/PageHeader.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/shared/components/PageHeader.tsx:16>)
- [frontend/src/features/market-data-foundation/routes.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/features/market-data-foundation/routes.tsx:1>)
- [frontend/src/features/stock-research-workbench/routes.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/features/stock-research-workbench/routes.tsx:1>)
- [frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx:23>)
- [frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx:87>)
- [frontend/src/features/trade-plan-risk-engine/components/TradePlanDetail.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/features/trade-plan-risk-engine/components/TradePlanDetail.tsx:23>)
- [frontend/src/features/research-hub/components/ResearchOverviewPage.tsx](</abs/path/c:/work/repo/investment-scanner/frontend/src/features/research-hub/components/ResearchOverviewPage.tsx:108>)

## Status

Complete. The audit artifact has been produced for review and downstream planning.
