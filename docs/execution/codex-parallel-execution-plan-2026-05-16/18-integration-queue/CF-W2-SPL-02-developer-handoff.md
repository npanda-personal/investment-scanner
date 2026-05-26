# CF-W2-SPL-02 Developer Handoff

Date: 2026-05-26

Work item: `CF-W2-SPL-02 - Signal Position Ledger active positions surface`

Owner: Team 06 - Strategy / Signals / Risk implementation worker

State: Developer complete. Team 10 rejection rework complete. Ready for Team 04 QA rerun.

## Rework Section (Team 10 Code Review Rejection)

Rework date: `2026-05-26`

Rework scope completed:

1. Fixed stale scope-transition behavior so prior-scope totals/page-derived counts are not shown under a new scope label while the new scoped response is loading.
2. Added explicit UI smoke coverage for active loading and active error states.

Rework files changed in this pass (bounded scope only):

- `frontend/src/features/signal-position-ledger/hooks/useSignalPositionLedgerActiveRows.ts`
- `frontend/src/features/signal-position-ledger/components/SignalPositionLedgerPage.tsx`
- `frontend/src/features/signal-position-ledger/components/SignalPositionSummaryStrip.tsx`
- `frontend/tests/ui/signal-position-ledger.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-SPL-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-02-developer-handoff.md`

Rework behavior changed:

- Hook now guards scope transitions with request-versioning and scoped-data projection so stale prior-scope payloads are not rendered after scope changes.
- On scope change, pagination resets to first page, loading is forced, stale scope errors are suppressed, and active-table/summaries wait for in-scope data.
- Active summary strip now renders a scoped loading state (`Loading active position summary for {scopeLabel}.`) instead of showing counts while scoped data is still loading.
- UI smoke now has dedicated assertions for:
  - active loading during a delayed scope switch;
  - active error rendering with scoped error messaging and no fallback rows.

Rework validation commands/results:

- `Get-Counter '\Memory\% Committed Bytes In Use'`
  - `73.7904106205773`
- `cd frontend && npm.cmd run build`
  - pass (existing Vite large-chunk warning remains)
- `Get-Counter '\Memory\% Committed Bytes In Use'`
  - `74.0147449946997`
- `cd frontend && npm.cmd run dev -- --host 127.0.0.1 --port 5181` (sandboxed probe)
  - failed: `spawn EPERM` (sandbox restriction)
- `Start-Process npm.cmd run dev -- --host 127.0.0.1 --port 5181` (escalated) + `Invoke-WebRequest http://127.0.0.1:5181`
  - pass (`200`)
- `Get-Counter '\Memory\% Committed Bytes In Use'`
  - `74.3126458428597`
- `cd frontend && $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5181'; npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1` (sandboxed)
  - failed: `EPERM` unlink `frontend/test-results/.last-run.json`
- same Playwright command (escalated)
  - first run: `2 passed, 1 failed` (new assertion strict-locator collision)
  - rerun after assertion fix: `3 passed`
- `Get-Counter '\Memory\% Committed Bytes In Use'`
  - `73.8265900346047`
- `rg -n -i '\b(active trade|active trades|open trade|open trades|closed trade|closed trades|buy|sell|target|profit target|price target|reward/risk|risk:reward|R:R|broker|execution|realized P/L|realized profit|financial advice|must buy|must sell)\b' frontend/src/features/signal-position-ledger frontend/tests/ui/signal-position-ledger.spec.ts`
  - no matches
- `git diff --check -- frontend/src/features/signal-position-ledger/hooks/useSignalPositionLedgerActiveRows.ts frontend/src/features/signal-position-ledger/components/SignalPositionLedgerPage.tsx frontend/src/features/signal-position-ledger/components/SignalPositionSummaryStrip.tsx frontend/tests/ui/signal-position-ledger.spec.ts docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-SPL-02-outbox.md docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-02-developer-handoff.md`
  - pass

Rework scope confirmation:

- No backend files changed in this rework pass.
- No route registry, shared UI/helper, schema/migration/generated/package/lockfile, or closed-history API/data/count files changed.
- No commit or push performed.

## Branch / Worktree

- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SPL-02`
- Branch: `codex/team06-strategy-signal/CF-W2-SPL-02`
- Required dependency: `ca31d79 feat: add signal position ledger read model`
- Dependency check: passed with `git merge-base --is-ancestor ca31d79 HEAD`
- Commit/push: not performed

## Changed Files

- `backend/src/api/routes.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.md`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.routes.test.ts`
- `frontend/src/features/signal-position-ledger/types.ts`
- `frontend/src/features/signal-position-ledger/api/signalPositionLedgerApi.ts`
- `frontend/src/features/signal-position-ledger/hooks/useSignalPositionLedgerActiveRows.ts`
- `frontend/src/features/signal-position-ledger/components/SignalPositionLedgerPage.tsx`
- `frontend/src/features/signal-position-ledger/components/ActivePositionsTable.tsx`
- `frontend/src/features/signal-position-ledger/components/SignalPositionSummaryStrip.tsx`
- `frontend/src/features/signal-position-ledger/components/ClosedHistoryPlaceholder.tsx`
- `frontend/src/features/signal-position-ledger/routes.tsx`
- `frontend/src/features/signal-position-ledger/index.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/tests/ui/signal-position-ledger.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-SPL-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-02-developer-handoff.md`

## Inspected Files

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-SPL-02-ready-promotion.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-06-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-02-signal-position-ledger-active-surface-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W2-SPL-02-signal-position-ledger-active-surface-ux-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-SPL-02-active-surface-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-SPL-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-02-qa-plan.md`
- `backend/src/api/routes.ts`
- `backend/src/modules/signal-position-ledger/index.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.controller.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.md`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.router.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.types.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.validation.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.repository.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.validation.test.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.routes.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.routes.test.ts`
- `backend/package.json`
- `backend/tsconfig.json`
- `frontend/package.json`
- `frontend/tsconfig.json`
- `frontend/playwright.config.ts`
- `frontend/vite.config.ts`
- `frontend/src/App.tsx`
- `frontend/src/main.tsx`
- `frontend/src/app/NavigationLayout.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/app/routes.tsx`
- `frontend/src/contexts/MarketScopeContext.tsx`
- `frontend/src/shared/components/DataTable.tsx`
- `frontend/src/shared/components/MarketScopeSelector.tsx`
- `frontend/src/shared/components/PageHeader.tsx`
- `frontend/src/shared/components/StatusBadge.tsx`
- `frontend/src/shared/components/index.ts`
- `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/index.ts`
- `frontend/src/features/signal-calibration-engine/routes.tsx`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/tests/ui/support/auth.ts`
- `frontend/tests/ui/support/moduleAssertions.ts`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`
- `frontend/tests/ui/today-trade-review.spec.ts`
- `frontend/tests/ui/data-quality-engine.spec.ts`
- `frontend/tests/ui/strategy-framework.spec.ts`

## Behavior Changed

- Backend route registry now mounts `signalPositionLedgerRouter` at `/api/v1`.
- Effective active endpoint is now reachable at `GET /api/v1/signals/position-ledger/active`.
- Active rows are ordered by newest entry trigger timestamp before pagination.
- Active-list DTO shape and query semantics remain aligned with the accepted read model.
- Frontend protected route `/signal-position-ledger` is registered.
- Navigation includes `Signal Position Ledger` under `Daily Work` after `Today Review`.
- New feature-local frontend surface renders:
  - `Active Positions` as the default tab.
  - Active rows with company/symbol, scope, entry trigger timestamp/price, reason summary, latest trusted price basis, current return status/value, compatibility state, trust labels, strategy id, and strategy version.
  - Summary strip where only active total uses `totalCount`; derived metrics are labeled `This page`.
  - `Closed History` placeholder-only with no separate API call and no data rows/counts.
- Market-scope changes reset offset to `0` and refetch active rows.

## Contracts Changed

- No DTO fields were added or removed.
- No extra active query parameters were added.
- No closed-history contract was added.
- Route exposure changed only through mounting the accepted router.

## Validation Evidence

- Memory safety:
  - First exact counter: `72.6%`
  - Before backend build: `70.7%`
  - Before frontend build: `70.9%`
  - Before UI smoke reruns: `71.0%`, `73.8%`, `73.3%`
  - Before final frontend build: `73.4%`
- Backend focused tests:
  - `npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.routes.test.ts --runInBand`
  - Passed: 2 suites, 10 tests.
- Backend build:
  - `npm.cmd run build`
  - Passed.
- Frontend build:
  - `npm.cmd run build`
  - Passed after final route alignment.
  - Note: Vite reported the existing large chunk warning.
- UI smoke:
  - Initial sandboxed run failed with `spawn EPERM`.
  - Escalated run against default port was invalid because that port served another active worktree.
  - Started the Team 06 frontend dev server; Vite assigned `http://127.0.0.1:5175`.
  - Rerun with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1`
  - Passed: 1 test.
- Language guard from QA plan over scoped source/test files:
  - Passed with no matches.
- Diff hygiene:
  - `git diff --check` passed with LF-to-CRLF normalization warnings only.

## Skipped Checks

- No required backend or frontend build/test check remains skipped.
- No live local data validation was run because the UI smoke uses mocked active-list responses and the backend tests cover route/order/read-model behavior.

## Scope Confirmation

- Edited only allowed implementation files plus assigned reporting docs.
- Did not edit Prisma schema, migrations, generated files, package manifests, lockfiles, shared UI, shared test helpers, Home Page, provider/live/startup/backfill/scheduler/worker/queue files, or unrelated modules.
- Did not add closed-history API, rows, counts, mock data, durable lifecycle storage, or row-detail routes.
- Did not add backend aggregates, search, filters, or extra query semantics.
- Did not stage, commit, or push.

## Assumptions

- Existing auth and market-scope UI helpers are the accepted protected-route smoke path.
- Page-local derived metrics are acceptable when visibly labeled `This page`.
- QA can reuse the worktree Vite server on `http://127.0.0.1:5175`, or start a clean server and set `PLAYWRIGHT_BASE_URL` accordingly.

## Risks / Blockers

- No implementation blocker remains.
- Default Playwright port contention exists in the local environment; QA should verify which worktree is served before using default port `5173`.
- Vite large chunk warning remains unrelated to this slice.

## Next Gate

Team 04 QA Verification can proceed.
