# CF-W2-SPL-02 Work Packet

Date: 2026-05-26

Owner: Team 03 - Solution Architecture Factory

## Status

`READY-CANDIDATE AFTER QA`

This is a docs-only work packet. Team 00 must promote and reserve the shared files before implementation starts.

## Work Item

`CF-W2-SPL-02` - Signal Position Ledger active positions surface.

## Required Dependency

Implementation base must include:

- `ca31d79 feat: add signal position ledger read model`

Do not implement against a base that lacks `backend/src/modules/signal-position-ledger/**`.

## Goal

Expose the accepted Signal Position Ledger active read model through:

- a mounted backend API route;
- a dedicated protected frontend page;
- first-class navigation;
- default `Active Positions` tab;
- placeholder-only `Closed History` tab.

## Implementation Owner And Lane

Recommended owner:

- Team 06 if Team 00 wants the Strategy / Signals / Risk lane to own both backend route and feature page.
- Team 08 may pair only for UX review or UI smoke feedback.

Team 00 must be the shared-file reservation owner for:

- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`

One writer must own the whole implementation pass.

## In Scope

Backend:

- mount `signalPositionLedgerRouter` at `/api/v1`;
- ensure active rows are sorted newest entry trigger first before pagination;
- update module doc if route exposure changes;
- add focused backend tests for route exposure and ordering.

Frontend:

- create `frontend/src/features/signal-position-ledger/**`;
- call `GET /api/v1/signals/position-ledger/active`;
- use current market scope;
- preserve pagination;
- render summary strip with `totalCount` and page-local status counts only;
- render `Active Positions` default tab;
- render `Closed History` placeholder tab with no API call;
- add route and nav entry;
- add UI smoke test.

## Out Of Scope

- closed-history API, table, rows, counts, or mocks;
- backend summary aggregate;
- search/filter API;
- row detail route;
- Home Page launch card;
- Prisma schema, migrations, generated files;
- package manifest or lockfile changes;
- shared UI or shared hook changes;
- provider/live/startup/backfill/scheduler work;
- broker, portfolio accounting, execution, realized P/L, target, reward/risk, or advice semantics.

## Exact Allowed Files

Backend:

- `backend/src/api/routes.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.md`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.routes.test.ts`
- optional: `backend/tests/api/routes.test.ts`

Frontend:

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

Implementation evidence docs, if Team 00 assigns them:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-SPL-02-developer-handoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-SPL-02-outbox.md`

## Exact Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- package manifests and lockfiles
- `backend/src/db/**`
- `backend/src/shared/**`
- `frontend/src/shared/**`
- `frontend/src/contexts/MarketScopeContext.tsx`
- `frontend/tests/ui/support/**` unless Team 04 explicitly reserves it
- `frontend/src/app/HomePage.tsx`
- all Today Review implementation files
- all Trade Plan Risk Engine implementation files
- all Portfolio implementation files
- all Backtesting implementation files
- provider/live/startup/backfill/scheduler/worker/queue files
- any closed-history source files
- any row-detail route/page files

## Implementation Steps

1. Verify the implementation base includes `ca31d79`.
2. Mount `signalPositionLedgerRouter` in `backend/src/api/routes.ts`.
3. Add or update backend tests for the mounted router and newest-entry ordering.
4. If needed, update `SignalPositionLedgerService` to sort collected active candidates by `triggerContract.trigger_timestamp` descending before slicing.
5. Update `signal-position-ledger.md` to document the mounted `/api/v1/signals/position-ledger/active` exposure.
6. Add frontend feature types, API client, hook, page, and feature route.
7. Register `signalPositionLedgerRoutes` in `frontend/src/app/routes.tsx`.
8. Add the `Signal Position Ledger` navigation item under `Daily Work` after `Today Review`.
9. Add a Playwright smoke test proving active tab behavior and closed-tab no-call behavior.
10. Run focused backend tests, backend build, frontend build, and UI smoke.
11. Produce developer handoff with exact changed files, tests, skipped checks, assumptions, risks, and next gate.

## Backend Acceptance Conditions

- `/api/v1/signals/position-ledger/active` is reachable.
- Response remains the accepted active-list shape.
- Query params include current scope and pagination.
- Rows are sorted newest entry trigger first before pagination.
- No closed-history endpoint is added.
- No schema, package, generated, provider, or startup file changes occur.

## Frontend Acceptance Conditions

- `/signal-position-ledger` is reachable from navigation.
- Page title and nav label are `Signal Position Ledger`.
- `Active Positions` is selected by default.
- Active API is called with `region`, `assetType`, `limit`, and `offset`.
- Scope changes reset pagination and refetch.
- Active rows show company, symbol, scope, entry timestamp/date, entry trigger price, reason summary, latest price basis, current return status/value, compatibility state, trust labels, strategy id, and strategy version.
- Summary counts beyond `totalCount` are page-local and labeled as such.
- `Closed History` is visible but calls no API and shows no rows, counts, mock data, or returns.
- Rows are not clickable.
- Forbidden product language is absent.

## Suggested Validation Commands

Check memory before heavy commands per root rules.

Backend:

```powershell
cd backend
npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.routes.test.ts --runInBand
npm.cmd run build
```

Frontend:

```powershell
cd frontend
npm.cmd run build
```

UI smoke:

```powershell
npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1
```

If a route registry test is added:

```powershell
cd backend
npm.cmd test -- routes.test.ts --runInBand
```

## Handoff Requirements

Developer handoff must include:

- work item and state;
- branch/worktree;
- exact files changed;
- exact files inspected;
- behavior changed;
- APIs preserved/changed;
- docs changed;
- tests run;
- tests skipped and reasons;
- UI smoke evidence;
- closed-tab no-call evidence;
- assumptions;
- risks;
- blockers;
- next gate.

## Stop Conditions

Stop and return to Team 00 if:

- `ca31d79` is not present on the implementation base;
- implementation needs backend aggregates, filters, search, row details, or closed history;
- shared-file collision exists with another active implementation;
- tests require changes outside allowed files;
- forbidden language or broker/portfolio/execution semantics appear necessary to satisfy UI design.

