# TEAM-06 CF-W2-SPL-02 Outbox

Date: 2026-05-26

Owner: Team 06 - Strategy / Signals / Risk implementation worker

Work item: `CF-W2-SPL-02 - Signal Position Ledger active positions surface`

State: Developer implementation complete. Team 10 rejection rework complete. Ready for Team 04 QA rerun.

## Rework Result (Team 10 Rejection Closure)

Rework date: `2026-05-26`

Resolved rejection items:

1. Stale scope-transition totals/page-derived counts are now blocked during scope changes until new scoped data resolves.
2. UI smoke now explicitly covers active loading and active error states.

Rework-only files changed:

- `frontend/src/features/signal-position-ledger/hooks/useSignalPositionLedgerActiveRows.ts`
- `frontend/src/features/signal-position-ledger/components/SignalPositionLedgerPage.tsx`
- `frontend/src/features/signal-position-ledger/components/SignalPositionSummaryStrip.tsx`
- `frontend/tests/ui/signal-position-ledger.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-SPL-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-02-developer-handoff.md`

Validation executed for rework:

- memory checks before heavy commands:
  - `73.7904106205773`
  - `74.0147449946997`
  - `74.3126458428597`
  - `73.8265900346047`
- `cd frontend && npm.cmd run build`
  - pass
- `cd frontend && npm.cmd run dev -- --host 127.0.0.1 --port 5181` (sandboxed)
  - failed (`spawn EPERM`)
- escalated dev-server start on `127.0.0.1:5181` + HTTP probe
  - pass (`200`)
- `cd frontend && $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5181'; npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1` (sandboxed)
  - failed (`EPERM` unlink `.last-run.json`)
- same Playwright command escalated:
  - first run failed (`2 passed, 1 failed`) due strict-locator collision in new error-state assertion
  - rerun after assertion fix passed (`3 passed`)
- language guard (SPL frontend files + SPL UI smoke):
  - no matches
- `git diff --check` over rework files:
  - pass

Scope and guard confirmation:

- No backend changes in this rework pass.
- No forbidden file-scope expansion.
- No commit/push/stage.

## Branch And Base

- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SPL-02`
- Branch: `codex/team06-strategy-signal/CF-W2-SPL-02`
- Required ancestor: `ca31d79 feat: add signal position ledger read model`
- Base check: `git merge-base --is-ancestor ca31d79 HEAD` passed.
- Starting worktree state: clean before edits.
- Commit/push: none.

## Files Changed

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

## Files Inspected

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

- Mounted `signalPositionLedgerRouter` at `/api/v1`, making `GET /api/v1/signals/position-ledger/active` reachable.
- Preserved the accepted active-list DTO and query semantics.
- Ordered active candidates by newest entry trigger timestamp before pagination, with stable symbol and instrument id fallback.
- Added protected frontend route `/signal-position-ledger`.
- Added `Signal Position Ledger` under `Daily Work` after `Today Review`.
- Added a feature-local page with default `Active Positions` tab, scoped active API loading, pagination, page-local summary labels, active row table, loading, empty, and error states.
- Added `Closed History` as placeholder-only. It renders no rows, no counts, no mock data, and calls no separate history API.
- Scope changes reset the active-page offset and refetch with current `region` and `assetType`.

## Validation

- Memory checks:
  - Initial exact counter: `72.6%`
  - Before backend build: `70.7%`
  - Before frontend build: `70.9%`
  - Before UI smoke reruns: `71.0%`, `73.8%`, `73.3%`
  - Before final frontend build: `73.4%`
- `cd backend && npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.routes.test.ts --runInBand`
  - Passed: 2 suites, 10 tests.
- `cd backend && npm.cmd run build`
  - Passed.
- `cd frontend && npm.cmd run build`
  - Passed after final route alignment. Vite reported the existing large chunk warning.
- `cd frontend && npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1`
  - Sandboxed run failed with `spawn EPERM`.
  - Escalated run against default port used another active worktree server and was not valid for this branch.
  - Started this worktree Vite server; Vite assigned `http://127.0.0.1:5175`.
  - Rerun with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175` passed: 1 test.
- QA-plan language guard over scoped files:
  - Passed with no matches.
- `git diff --check`
  - Passed. Git reported LF-to-CRLF normalization warnings only.

## Scope Confirmation

- No Prisma schema, migration, generated, package manifest, lockfile, shared UI, shared helper, Home Page, provider/live/startup/backfill/scheduler/worker/queue, Today Review, Portfolio, Backtesting, Market Data, or Data Quality files were edited.
- No closed-history endpoint, rows, counts, mock data, durable lifecycle storage, or row-detail route was added.
- No backend summary aggregate, search, filter, or extra query semantics were added.
- No commit, push, or staging was performed.

## Assumptions

- Existing app auth and market-scope test helpers remain the accepted UI smoke path.
- `Active positions` total uses backend `totalCount`; all other summary counts are page-local and labeled `This page`.
- The active route can be consumed directly through the mounted `/api/v1/signals/position-ledger/active` endpoint.

## Risks / Notes

- The default Playwright port `5173` was already occupied, and `5174` was also occupied by another worktree. QA should either stop unrelated local dev servers or set `PLAYWRIGHT_BASE_URL` to the Team 06 worktree server port.
- Vite build still reports the pre-existing large chunk warning.
- The Vite server started for validation remains available on `http://127.0.0.1:5175` for QA reuse if desired.

## Next Gate

Team 04 QA Verification can proceed.
