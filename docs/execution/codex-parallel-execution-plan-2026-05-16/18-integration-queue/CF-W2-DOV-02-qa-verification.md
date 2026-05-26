# CF-W2-DOV-02 QA Verification

Date: 2026-05-26
Work item: `CF-W2-DOV-02`
Owner: Team 04 - QA Factory
State: `REJECT`
Branch verified: `codex/team08-ux-research/CF-W2-DOV-02`
Worktree verified: `C:\work\repo\investment-scanner-worktrees\team08-CF-W2-DOV-02`

## Verdict

`REJECT`

The bounded Daily Overview implementation stays inside the reserved frontend slice and the required build, smoke, language-guard, and diff checks pass. QA is still rejecting the packet because the spec set does not include a distinct mocked `MISSING_SIGNAL_QUALITY_EVIDENCE` scenario, so the required `unavailable/missing evidence` state is not separately verified from the fetch-failure path.

## Exact files changed by Team 08

- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx`
- `frontend/src/features/daily-overview-dashboard/components/CalibrationEvidenceSummaryPanel.tsx`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-02-developer-handoff.md`

## Exact files inspected by Team 04

Main workspace authority docs:

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-02-daily-overview-calibration-evidence-through-summary-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-DOV-02-daily-overview-calibration-evidence-summary-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-DOV-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W2-DOV-02-dependency-integration-base-evidence.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-DOV-02-ready-promotion.md`

Worktree evidence:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-DOV-02-developer-handoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-DOV-02-outbox.md`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx`
- `frontend/src/features/daily-overview-dashboard/components/CalibrationEvidenceSummaryPanel.tsx`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

## Scope verification

Pass:

- Changed implementation stayed inside the reserved Daily Overview feature plus the allowed Team 08 handoff docs.
- No forbidden file diff was detected under:
  - `frontend/src/app/HomePage.tsx`
  - `frontend/src/app/routes.tsx`
  - `frontend/src/app/navigationMetadata.tsx`
  - `frontend/src/shared/**`
  - `frontend/src/contexts/**`
  - `frontend/src/features/signal-calibration-engine/**`
  - `frontend/tests/ui/signal-calibration-engine.spec.ts`
  - `backend/**`
  - Prisma/schema/generated/package files

## Behavior verification

Pass:

- Panel placement is below the primary candidate-review sections. The panel is inserted after the `High-Priority Review Candidates` and `Watch And Blocked` grid in `DailyOverviewDashboardPage.tsx` lines `363-368`.
- The Daily Overview consumer reads calibration scoped page summary truth from `/api/v1/signals/calibration/top` and returns `response.pageSummary`, with no `/signals/calibration/health` fallback in the feature consumer path. Verified in `dailyOverviewDashboardApi.ts` lines `56-71`.
- The panel renders scope label, horizon label, latest measurable evidence date, waiting-for-maturity wording, reason summary, and drillthrough link to `/signals/calibration`. Verified in `CalibrationEvidenceSummaryPanel.tsx` lines `27-85`.
- The panel does not render first-row truth, row `generatedAt`, or visible-row counts in the summary UI.
- Research-support language guard passed with no forbidden wording matches.

## Failing finding

1. Required missing-evidence coverage is absent from the UI smoke spec.

Evidence:

- The spec covers:
  - measured state in `daily-overview-dashboard.spec.ts` lines `372-628`;
  - waiting / horizon-limited state in lines `633-805`;
  - fetch failure / unavailable state in lines `808-911`;
  - scoped label behavior and deferred-section resilience in lines `921-1048`.
- The only reference to `MISSING_SIGNAL_QUALITY_EVIDENCE` in the spec is the helper input type declaration at line `257`.
- No test actually fulfills `/api/v1/signals/calibration/top` with `pageSummary.calibrationEvidence.evidenceBasis.status = 'MISSING_SIGNAL_QUALITY_EVIDENCE'` and asserts the required `Unavailable` state.

Impact:

- The requirement and QA brief asked Team 04 to confirm `measured`, `waiting/horizon-limited`, `unavailable/missing evidence`, and `fetch failure` states are tested.
- Current coverage proves fetch-failure fallback, but it does not prove the distinct contract path where calibration returns a truthful page summary whose evidence basis is missing.

Required fix before re-QA:

- Add one focused Playwright scenario that returns a successful calibration page summary with:
  - `calibrationEvidence.evidenceBasis.status = 'MISSING_SIGNAL_QUALITY_EVIDENCE'`
  - no measurable evidence date
  - a calibration-owned reason summary
- Assert the panel shows `Unavailable`, shows the missing-evidence reason, and does not rely on fetch failure or any health/row proxy.

## Tests run

- Memory gate:
  - `Get-Counter '\Memory\% Committed Bytes In Use'` -> `77.28`
- Diff check:
  - `git diff --check -- frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx frontend/src/features/daily-overview-dashboard/components/CalibrationEvidenceSummaryPanel.tsx frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts frontend/src/features/daily-overview-dashboard/types.ts frontend/tests/ui/daily-overview-dashboard.spec.ts` -> pass
- Focused language guard:
  - `rg -n -i "buy now|sell now|must buy|must sell|target price|price target|profit target|reward/risk|R:R|trade plan|best trade|broker|execute order|place order|guaranteed|financial advice" frontend/src/features/daily-overview-dashboard frontend/tests/ui/daily-overview-dashboard.spec.ts` -> pass, no matches
- Frontend build:
  - `cd frontend && npm.cmd run build` -> pass with existing Vite chunk-size warning
- Dedicated worktree server:
  - started outside sandbox on `http://127.0.0.1:5187`
- Focused UI smoke:
  - `cd frontend && PLAYWRIGHT_BASE_URL=http://127.0.0.1:5187 npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1` -> pass, `4` tests

## Tests skipped

- Backend build/tests
- Broader frontend UI regression suite
- Live local market-data verification

## Skipped-test reason

- This packet is bounded to Daily Overview frontend verification only.

## Assumptions

- Team 08 implemented on the required Team 00 verified base `50bccc8`.
- Existing Vite chunk-size warning is pre-existing and outside this packet.

## Risks

- Without the missing-evidence-basis scenario, the regression suite can still pass while the contract-specific `MISSING_SIGNAL_QUALITY_EVIDENCE` mapping drifts later.

## Blockers

- Add the missing Playwright scenario for the successful-but-missing-evidence contract path.

## Shared-file requests

- None.

## Next gate recommendation

- Return to Team 08 for a spec-only follow-up inside `frontend/tests/ui/daily-overview-dashboard.spec.ts`.
- After that change, rerun Team 04 QA verification on the same worktree or a rebased replacement worktree.
- Do not advance to Code Review / Lead Validation yet.

## Evidence notes

- Sandbox blocked both the Vite dev server and Playwright artifact write path, so QA reran those two commands outside the sandbox with focused approval.
- No commit was created.
- No push was performed.
