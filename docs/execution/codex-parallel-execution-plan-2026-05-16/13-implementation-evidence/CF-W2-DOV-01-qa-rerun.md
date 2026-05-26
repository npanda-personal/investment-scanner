# CF-W2-DOV-01 QA Rerun

Date: 2026-05-26
Owner: Team 04 - QA Factory
Work item: `CF-W2-DOV-01`
Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W2-DOV-01`
Branch: `codex/team08-ux-research/CF-W2-DOV-01`

## Verdict

`ACCEPT`

Team 08's bounded rework resolves the two Team 10 truthfulness rejection findings and preserves the existing Daily Overview acceptance scope.

## Scope Verified

- QA-only pass. No application implementation files were edited by Team 04.
- Evidence writes limited to:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-DOV-01-qa-rerun.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-DOV-01-qa-verification-outbox.md`
- Implementation scope remains frontend-only:
  - `frontend/src/app/HomePage.tsx`
  - `frontend/src/features/daily-overview-dashboard/**`
  - `frontend/tests/ui/daily-overview-dashboard.spec.ts`
- No backend, route registry, navigation metadata, shared UI/hook/context, package, Prisma/schema/generated, provider/live/startup/backfill/scheduler, pipeline command, direct Smart Money fanout, or Backtesting fanout changes were observed.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-01-daily-overview-interactive-market-dashboard-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-DOV-01-ready-promotion.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-DOV-01-code-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-01-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-01-developer-handoff.md`
- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/daily-overview-dashboard/index.ts`
- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

## Team 10 Rejection Rerun

### 1. Dashboard fetch time must not look like source freshness

Pass.

- The browser/client fetch timestamp is now stored as `dashboardFetchedAt` and exposed as `latestDashboardFetchedAt`.
- Header copy renders `Dashboard refetched: ...`, not `Latest loaded`.
- Source freshness renders separately as `Latest source timestamp: ...` only when `latestSourceTimestamp` has source-owned payload timestamps.
- The focused Playwright scenario removes source-owned timestamps from Today Review, Research Overview, Market Context, Data Quality, Signal Run, and Pipeline payloads. It verifies:
  - `Dashboard refetched:` is visible.
  - `Latest source timestamp:` is absent.
  - `Latest loaded:` is absent.

Code evidence:

- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts` calculates `latestDashboardFetchedAt` from section fetch metadata and `latestSourceTimestamp` from payload fields.
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx:184` renders `Dashboard refetched`.
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx:186` renders `Latest source timestamp` only when present.
- `frontend/tests/ui/daily-overview-dashboard.spec.ts:502` covers the no-source-timestamp case.

### 2. Market Context breadth and scope caveat must be truthfully bounded

Pass.

- Market breadth no longer falls back to `marketContext.breadth.dataStatus`.
- The UI uses Research Overview `confirmationSummary.marketContextSummary.breadthStatus` when present and otherwise shows `Breadth: Unavailable`.
- The focused Playwright scenario provides Market Context `breadth.dataStatus: PARTIAL` while removing Research Overview `breadthStatus`. It verifies:
  - `Breadth: Unavailable` is visible.
  - `Breadth: PARTIAL` is absent.
- The region-level Market Context caveat renders for the default `IN / STOCK` scope:
  - `Market context is region-level for this scope; asset-type specific context is still limited.`
  - `Market context: region-level`

Code evidence:

- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx:143` derives `marketBreadth` from Research Overview `breadthStatus` only.
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx:238` renders the visible region-level caveat.
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx:373` renders the compact Evidence Caveats chip.
- `frontend/tests/ui/daily-overview-dashboard.spec.ts:502` verifies no `dataStatus` breadth fallback.

## Existing DOV Acceptance Rerun

Pass.

- First viewport remains investor/trader-first:
  - `Daily Overview`
  - `Market Pulse`
  - `High-Priority Review Candidates`
  - `Watch And Blocked`
  - `Evidence Caveats`
  - `Supporting Navigation`
- Today Review owns candidate lanes:
  - `longReview` -> Bullish review
  - `shortReview` -> Bearish review
  - `exitRiskReview` -> Exit-risk review
- Watch/Blocked remains sourced from Today Review:
  - `watchOnly`
  - `insufficientData`
  - `unproven`
  - `blocked`
- `Coming soon - Market Movers` remains placeholder-only.
- `Coming soon - FII/DII Activity` remains placeholder-only.
- Compact evidence caveats remain visible and secondary.
- Rejected admin/developer first-viewport sections are absent:
  - `Data Trust and Pipeline Health`
  - `Signal and Evidence Health`
  - `Drilldown Strip`
- No advice, target, target-price, profit-target, or reward/risk wording was found by the required language guard.

## Validation

Memory guard before heavy validation:

```powershell
Get-Counter '\Memory\% Committed Bytes In Use'
```

Result: `75.3591777466608`; safe to run build and one Playwright invocation.

Frontend build:

```powershell
cd frontend
npm.cmd run build
```

Result: `PASS`.

Note: Vite emitted the existing large chunk warning for `assets/index-*.js`.

Focused UI smoke:

```powershell
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

Initial sandbox result: `EPERM` while unlinking `frontend/test-results/.last-run.json`.

Escalated rerun:

```powershell
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

Result: `PASS`, 4 tests passed.

Passing scenarios:

- renders first-slice dashboard with approved reads, placeholders, and drilldowns
- does not synthesize source freshness or breadth from dashboard fetch time and data status
- shows explicit unavailable states and section-local research failures without synthetic fallback values
- keeps first viewport usable when a deferred section fails and honors scope from storage

Ready-packet language guard:

```powershell
rg -n "R:R|reward/risk|target price|price target|profit target|buy now|sell now|must buy|must sell|financial advice|hardcoded|fake" frontend/src/app/HomePage.tsx frontend/src/features/daily-overview-dashboard frontend/tests/ui/daily-overview-dashboard.spec.ts
```

Result: `PASS`, no matches.

Additional forbidden-language scan:

```powershell
rg -n -i "buy now|sell now|must buy|must sell|target price|price target|profit target|reward/risk|R:R|financial advice|broker|place order|execute order|take profit|guaranteed|best trade" frontend/src/app/HomePage.tsx frontend/src/features/daily-overview-dashboard frontend/tests/ui/daily-overview-dashboard.spec.ts
```

Result: `PASS`, no matches.

## Skipped Checks

- Backend build/tests skipped because backend scope is forbidden for this work item.
- Broader UI regression skipped because the requested rerun is bounded to Daily Overview and the focused smoke passed.
- Live local data validation skipped because the Playwright spec uses deterministic mocked read API payloads to verify source truth, refresh, scope, failure, and placeholder behavior.

## Risks / Notes

- `Dashboard refetched` remains browser dashboard metadata, not source freshness.
- `Latest source timestamp` intentionally disappears when loaded source payloads omit usable source-owned timestamps.
- Market Context remains region-level unless a future source proves asset-type-specific context.
- `frontend/test-results-team04-dov-rerun/.last-run.json` existed as an untracked Playwright artifact and remains excluded from release staging.

## QA Decision

`CF-W2-DOV-01` is accepted for the Team 04 QA rerun gate. Next gate: Team 10 re-review.
