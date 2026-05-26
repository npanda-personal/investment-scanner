# CF-W2-SPL-02 Code Review

Date: 2026-05-26
Owner: Team 10 - Review / Release
Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SPL-02`
Branch: `codex/team06-strategy-signal/CF-W2-SPL-02`

## Verdict

`ACCEPT`

Team 10 rereview accepts the Team 06 rework. Team 03 Architect Signoff may proceed.

## Rereview Scope

1. Confirm the previous high finding is fixed: stale prior-scope totals/page-derived counts do not render under a newly selected scope while scoped data is loading.
2. Confirm the previous medium finding is fixed: QA evidence and UI smoke explicitly cover active loading and active error states.
3. Confirm the rework stayed inside the allowed frontend rework files plus assigned docs.
4. Confirm no forbidden widening was added into backend source/tests/routes beyond the already accepted slice, route/navigation beyond the already accepted slice, other features, shared UI/context, schema/generated/package/provider/startup/scheduler scope, or Closed History API/data/detail scope.
5. Confirm research-support language and release readiness remain acceptable.

## Findings

No blocking findings in this rereview pass.

## Previous Rejection Closure

1. High finding fixed.
   - `frontend/src/features/signal-position-ledger/hooks/useSignalPositionLedgerActiveRows.ts:47-112` now versions requests with `latestRequestRef`, invalidates stale responses on scope change, projects out-of-scope payloads to an empty scoped response, and suppresses stale-scope error reuse.
   - `frontend/src/features/signal-position-ledger/components/SignalPositionSummaryStrip.tsx:27-47` now renders `Loading active position summary for {scopeLabel}.` during active scoped loading instead of reading `totalCount` and page-derived metrics from the prior scope payload.
   - `frontend/tests/ui/signal-position-ledger.spec.ts:190-253` explicitly exercises the delayed scope switch and asserts that `IN / STOCK total` and all `This page` derived counts are absent while `US / STOCK` is loading.

2. Medium finding fixed.
   - `frontend/tests/ui/signal-position-ledger.spec.ts:190-253` adds explicit active loading-state coverage.
   - `frontend/tests/ui/signal-position-ledger.spec.ts:256-274` adds explicit active error-state coverage, including scoped error copy, visible retry control, and absence of fallback rows or empty-state copy.
   - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-02-qa-verification.md` now records the rerun commands and the specific assertions that satisfy the loading/error requirements from the QA plan.

## Dependency And Scope Confirmation

- `git merge-base --is-ancestor ca31d79 HEAD` passed. Required dependency `ca31d79 feat: add signal position ledger read model` remains present on the implementation base.
- Current application-file scope still matches the Team 00 allowed implementation list for SPL-02:
  - backend: `backend/src/api/routes.ts`, `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`, `backend/src/modules/signal-position-ledger/signal-position-ledger.md`, `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`, `backend/tests/modules/signal-position-ledger/signal-position-ledger.routes.test.ts`
  - frontend: `frontend/src/app/routes.tsx`, `frontend/src/app/navigationMetadata.tsx`, `frontend/src/features/signal-position-ledger/**`, `frontend/tests/ui/signal-position-ledger.spec.ts`
  - docs evidence: Team 04, Team 06, and Team 10 queue/outbox files
- The Team 06 rerework evidence names only the four allowed frontend files plus assigned Team 06 docs:
  - `frontend/src/features/signal-position-ledger/hooks/useSignalPositionLedgerActiveRows.ts`
  - `frontend/src/features/signal-position-ledger/components/SignalPositionLedgerPage.tsx`
  - `frontend/src/features/signal-position-ledger/components/SignalPositionSummaryStrip.tsx`
  - `frontend/tests/ui/signal-position-ledger.spec.ts`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-SPL-02-outbox.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-02-developer-handoff.md`
- No contradictory widening was found into:
  - other frontend feature folders
  - shared frontend components or context files
  - Prisma schema, migrations, generated files, package manifests, lockfiles
  - provider/live/startup/scheduler/worker/queue scope
  - Closed History API routes, clients, rows, counts, detail routes, or durable data claims

## Correctness Review Notes

- Backend route mount remains correct: `backend/src/api/routes.ts:29-60` mounts `signalPositionLedgerRouter` at `/api/v1`, which preserves `GET /api/v1/signals/position-ledger/active`.
- Frontend route and navigation remain bounded and aligned with the work packet: `frontend/src/app/routes.tsx:39-42`, `frontend/src/app/navigationMetadata.tsx:35-40`, `frontend/src/features/signal-position-ledger/routes.tsx:4-5`.
- Closed History remains placeholder-only: `frontend/src/features/signal-position-ledger/components/ClosedHistoryPlaceholder.tsx:4-15` and `frontend/src/features/signal-position-ledger/api/signalPositionLedgerApi.ts:4-10` show no closed-history client or data path.
- Research-support language remains acceptable. Team 10 reran a light language-guard inspection across the reviewed backend/frontend files and found no forbidden buy/sell/target/broker/advice wording.

## Validation Evidence Reviewed

Reviewed Team 06 and Team 04 evidence for:

- backend focused tests: `npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.routes.test.ts --runInBand`
- backend build: `npm.cmd run build`
- frontend build: `npm.cmd run build`
- Playwright smoke rerun: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5181 npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1`
- language guard and `git diff --check`
- memory checks recorded below the AGENTS.md threshold before heavy commands

Team 10 light inspection commands in this rereview:

- `git status --short -uall`
- `git branch --show-current`
- `git log --oneline --decorate -n 8`
- `git diff --name-only`
- `git merge-base --is-ancestor ca31d79 HEAD`
- targeted `Get-Content` review of the rework files, route/nav files, and QA evidence
- targeted `rg` inspection for route usage, Closed History scope, and language drift

Team 10 did not rerun heavy builds/tests because the Team 04 rerun packet adequately covers the rejected behavior and the rereview outcome turned on bounded code inspection plus QA evidence sufficiency rather than execution failure.

## Skipped Checks

- No additional heavy build/test reruns were performed by Team 10.
- No live backend-fed browser run was added in this rereview pass.

## Residual Risks

- The active loading/error smoke remains mock-backed rather than a live backend-fed browser flow in this pass.
- Local port contention remains an environment risk for future Playwright reruns; explicit `PLAYWRIGHT_BASE_URL` should continue to be recorded.
- Frontend build still emits the pre-existing Vite large-chunk warning.

## Next Gate

`ACCEPT` for Team 10 rereview. Team 03 Architect Signoff may proceed.
