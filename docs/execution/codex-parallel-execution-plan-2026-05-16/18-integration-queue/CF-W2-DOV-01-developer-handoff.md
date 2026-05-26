# CF-W2-DOV-01 Developer Handoff

Date: 2026-05-26
Work item: `CF-W2-DOV-01`
Owner: Team 08 - UX / Research frontend implementation worker
State: `READY_FOR_TEAM_04_QA_RERUN_AFTER_TEAM_10_REWORK`
Branch: `codex/team08-ux-research/CF-W2-DOV-01`
Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W2-DOV-01`

## Summary

The `/` route remains a thin `HomePage.tsx` shell over the feature-local Daily Overview dashboard. Team 10's bounded rejection findings were reworked: dashboard refetch time is now clearly labeled separately from optional source-owned timestamps, and Market Breadth no longer falls back to Market Context `dataStatus`.

No backend, route registry, shared UI, package, Prisma, generated, provider/live, scheduler, or command files were edited.

## Files changed

- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-01-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-01-developer-handoff.md`

Pre-existing original Team 08 implementation files still present but not edited in this bounded rework:

- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/daily-overview-dashboard/index.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`

## Files inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-DOV-01-code-review.md`
- All seven requested DOV authority docs under the active execution folder
- `docs/ux-ui-best-practices.md`
- `frontend/src/app/HomePage.tsx`
- Daily Overview feature files under the allowed writer scope
- Today Review, Research Hub, Data Quality, Market Context, Signal Generation, and Pipeline Ops frontend types/API surfaces used as read-only contract references
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

## Section-to-source mapping

| Dashboard section | Source basis |
| --- | --- |
| Header rail | `useMarketScope()` plus `Dashboard refetched` from browser refetch time; optional `Latest source timestamp` only from source-owned timestamps in loaded payloads |
| Market Pulse | Today Review latest, review-readiness summary, Research Overview market readiness, Market Context summary as region-level supporting context |
| High-Priority Review Candidates | Today Review `longReview`, `shortReview`, `exitRiskReview` |
| Watch And Blocked | Today Review `watchOnly`, `insufficientData`, `unproven`, `blocked` |
| Evidence Caveats | Review-readiness trust, Data Quality summary, latest signal run, Pipeline status, market context limitation |
| Supporting Navigation | Approved route links with additive chips only from loaded payloads |
| Coming soon placeholders | `Coming soon - Market Movers`; `Coming soon - FII/DII Activity` |

## Behavior changed

- `latestLoadedAt` was replaced with `latestDashboardFetchedAt` and `latestSourceTimestamp` in Daily Overview state.
- Header copy now says `Dashboard refetched`, not `Latest loaded`.
- `Latest source timestamp` is shown only when loaded source payloads expose usable timestamps such as Today Review run timestamps, Research `generatedAt`, Market Context `updatedAt`, Data Quality `latestEvaluationAt`, Signal run timestamps, or Pipeline timestamps.
- Market Breadth uses Research Overview `confirmationSummary.marketContextSummary.breadthStatus` only; Market Context `breadth.dataStatus` is no longer rendered as breadth.
- The region-level Market Context caveat is always visible for this dashboard slice, including default `IN / STOCK`.
- `HomePage.tsx` remains a thin shell over `DailyOverviewDashboardPage`.
- Primary dashboard sections now match the refreshed first-viewport direction:
  - Header rail
  - Market Pulse
  - High-Priority Review Candidates
  - Watch And Blocked
  - compact Evidence Caveats
  - Supporting Navigation
- The old `Data Trust and Pipeline Health`, `Signal and Evidence Health`, and `Drilldown Strip` identity sections are not rendered.
- Candidate lanes no longer use Research Priorities as a primary toggle; Today Review groups own the visible candidate lanes.
- Market Movers and FII/DII are explicit placeholder-only areas with no inferred rows, stats, freshness, or summaries.
- Section-local errors remain visible, including deferred Market Context failure.
- Refresh remains read-only and refetches existing GET APIs only.

## Commands and results

- Memory guard: `Get-Counter '\Memory\% Committed Bytes In Use'`
  - Pass: `76.252428925655`.
- `rg -n "R:R|reward/risk|target price|price target|profit target|buy now|sell now|must buy|must sell|financial advice|hardcoded|fake" frontend/src/app/HomePage.tsx frontend/src/features/daily-overview-dashboard frontend/tests/ui/daily-overview-dashboard.spec.ts`
  - Pass: no matches.
- `cd frontend && npm.cmd run build`
  - Pass.
  - Vite warning: chunk larger than 500 kB after minification.
- Initial `cd frontend && npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1`
  - Non-escalated run blocked by `EPERM` unlinking `frontend/test-results/.last-run.json`.
  - Escalated rerun executed.
- Final `cd frontend && npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1`
  - Pass: 4 passed.

## Skipped checks

- Backend tests/builds skipped because backend scope is forbidden.
- Broader UI regression cluster skipped because required focused DOV smoke passed and the scope was bounded.
- Live local data validation skipped; Playwright uses deterministic mocked read API payloads for the allowed source set.

## Assumptions

- Latest Product Owner direction supersedes older DOV docs where they still require admin-style first-viewport sections.
- Dashboard refetch time must not be interpreted as source freshness; source freshness is omitted unless source-owned timestamps are available.
- Supporting Navigation may still include operational destination links as secondary navigation, not as product identity.

## Risks / known limitations

- Market Context remains region-level where asset-type-specific truth is not proven.
- If all loaded source payloads omit source-owned timestamps, the header intentionally shows no source timestamp chip.
- Research Hub remains supporting context; Today Review is the primary candidate truth.
- The worktree contains unrelated/unreviewed Team 04/code-review evidence artifacts and result directories that predated this pass; they were not reverted or staged.

## Next gate

Team 04 QA can start the refreshed DOV QA rerun.
