# CF-W2-SPL-02 Architecture Review

Date: 2026-05-26

Owner: Team 03 - Solution Architecture Factory

## Status

Docs-only architecture review complete.

Verdict: `READY-CANDIDATE AFTER QA`

This packet does not authorize implementation by itself. It defines the bounded implementation reservation Team 00 may promote after Team 04 QA planning, with one writer for the shared route and navigation files.

## Work Item

`CF-W2-SPL-02` - Signal Position Ledger active positions surface.

Parent:

- `CF-W2-SPL-01 - Signal Position Ledger`

Required accepted dependency:

- `CF-W2-SPL-01B - Signal Position Ledger active positions read model`
- local Team 06 commit: `ca31d79 feat: add signal position ledger read model`

## Evidence Inspected

- `AGENTS.md`
- `docs/ux-ui-best-practices.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/shared-file-control.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01-signal-position-ledger-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-02-signal-position-ledger-active-surface-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W2-SPL-02-signal-position-ledger-active-surface-ux-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-SPL-02-ux-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-SPL-01B-active-position-read-model-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/shared/components/PageHeader.tsx`
- `frontend/src/shared/components/DataTable.tsx`
- `frontend/src/shared/components/StatusBadge.tsx`
- accepted `ca31d79` files under `backend/src/modules/signal-position-ledger/**`

## Current-State Findings

1. The current main workspace does not mount `signal-position-ledger` in `backend/src/api/routes.ts`.
2. The current main workspace does not define `frontend/src/features/signal-position-ledger/**`.
3. The current main workspace does not register a `/signal-position-ledger` route or navigation item.
4. The accepted `ca31d79` backend module already exports `signalPositionLedgerRouter`.
5. The accepted backend router already defines:
   - `GET /signals/position-ledger/health`
   - `GET /signals/position-ledger/active`
6. Mounting the accepted router at `/api/v1` produces the surfaced endpoint:
   - `GET /api/v1/signals/position-ledger/active`
7. The accepted active-list response already includes `totalCount`, `limit`, `offset`, `nextOffset`, `hasMore`, `scope`, `warnings`, and active row items.
8. The accepted service collects eligible active candidates before slicing the requested page, but the source ordering in the repository is not guaranteed to be newest `entryTriggerTimestamp` first. Slice 2 must correct ordering inside the existing backend read model before pagination.

## Architecture Decision

Proceed with one bounded surfaced child that:

- mounts the accepted `signal-position-ledger` backend router;
- adds a dedicated frontend feature at `frontend/src/features/signal-position-ledger`;
- registers `/signal-position-ledger`;
- adds first-class navigation label `Signal Position Ledger`;
- renders `Active Positions` as the only truth-bearing tab;
- renders `Closed History` as placeholder-only;
- preserves the `CF-W2-SPL-01B` active-list DTO shape;
- adds no closed-history API, no schema, no migrations, no generated files, no package changes, and no shared UI edits.

This is acceptable as bounded Team 00 controlled implementation, not a true Product Owner Decision Packet.

## Decision Packet Assessment

A true Product Owner decision is not needed for this child if Team 00 records the shared-file reservations before implementation.

Reasons:

- the Product Owner direction already names the page and nav label as `Signal Position Ledger`;
- the default tab and closed-history placeholder behavior are already defined by the requirement and UX plan;
- no schema, persistence, provider, package, cost, cloud, telemetry, broker, or durable lifecycle behavior is opened;
- shared-file edits are routine route/navigation exposure and can be controlled by Team 00 one-writer reservation.

Escalate to a true Decision Packet only if implementation proposes any of the following:

- closed-history rows, counts, API, or storage;
- scope-wide summary aggregates beyond existing `totalCount`;
- search/filter/sort API expansion beyond newest-entry default ordering;
- Prisma/schema/migration/generated/package changes;
- broker, execution, portfolio accounting, realized P/L, target, reward/risk, or advice language;
- shared UI redesign or navigation group redesign beyond adding one item.

## Route And Navigation Decision

Backend route mounting:

- import `signalPositionLedgerRouter` from `../modules/signal-position-ledger`;
- mount it in `apiModules` with `{ path: '/api/v1', router: signalPositionLedgerRouter }`;
- resulting active endpoint: `GET /api/v1/signals/position-ledger/active`;
- no new backend endpoint and no route path rewrite.

Frontend route:

- route path: `/signal-position-ledger`;
- feature route export: `signalPositionLedgerRoutes`;
- route registry imports the feature public export from `@/features/signal-position-ledger`.

Navigation:

- label: `Signal Position Ledger`;
- group: `Daily Work`;
- placement: after `Today Review`;
- match prefixes: `['/signal-position-ledger/']`;
- icon: reuse an existing Material UI icon already imported in navigation metadata where practical, such as `FactCheckIcon`, to avoid broad nav styling churn.

Rationale:

- the user journey begins from daily review of active system-picked evidence;
- `Decision and Proof` remains a reasonable future fallback, but the UX first choice is actionable enough and does not require Product Owner escalation.

## Backend Contract Decision

Preserve the accepted active-list response shape from `CF-W2-SPL-01B`.

Required backend behavior in this child:

- expose the accepted active endpoint through route mounting;
- preserve query parameters: `region`, `assetType`, `limit`, `offset`;
- preserve default limit `25` and max limit `100`;
- preserve `totalCount`, `nextOffset`, and `hasMore` semantics;
- guarantee default ordering by newest `entryTriggerTimestamp` before pagination;
- keep active rows sourced only from accepted active read model evidence;
- expose no closed-history endpoint.

No backend summary aggregate should be added in this slice.

## Summary Strip Decision

Use only truth already returned by the active list endpoint:

- `Active positions`: use response `totalCount`, because it is scope-wide for the accepted active read model.
- `Current page`: use `items.length` where helpful.
- `Exit-trigger compatibility`: derive from returned `items` only and label as `This page`.
- `Risk warning`: derive from returned `items` only and label as `This page`.
- `Return basis limited`: derive from returned `items` only and label as `This page`.

Do not present page-local derived counts as scope-wide counts.

Do not add a backend aggregate unless a later child explicitly opens a summary contract and tests it. The accepted 01B implementation already scans all candidates before pagination, but adding aggregate fields would still change the API contract and is not required for this user-visible first slice.

## Filters, Sorting, And Search Decision

Slice 1 must ship with:

- global market scope from the existing app context;
- server-backed pagination using `limit` and `offset`;
- default backend ordering by newest entry trigger first.

Slice 1 must not ship with:

- client-side sorting over a single paginated slice;
- client-side search that implies the whole result set was searched;
- status filters, return-basis filters, trigger-type filters, or strategy filters unless the backend API explicitly supports them.

If search or filters are added later, they should be server-side query semantics on the `signal-position-ledger` module contract, with pagination reset to the first page and QA coverage for query parameters.

## Frontend Architecture Decision

Create a feature-local implementation:

- feature API client calls `/api/v1/signals/position-ledger/active`;
- hook reads `useMarketScope()` and refetches on `scope.region`, `scope.assetType`, `limit`, or `offset` changes;
- page owns `Active Positions` and `Closed History` tab state;
- active tab renders a dense table/list using existing shared component imports where practical;
- closed tab renders only the deferred-proof placeholder and makes no API call;
- rows are not clickable in slice 1;
- no row-detail route is opened.

Existing shared components may be imported but not edited:

- `PageHeader`
- `DataTable`
- `StatusBadge`

MUI `Tabs` / `Tab` may be used feature-locally following existing app patterns.

## Allowed Implementation Files

Team 00 must reserve one writer for all files below in the implementation pass.

Backend shared route exposure:

- `backend/src/api/routes.ts`

Backend SPL read-model correction and docs, only if needed for newest-entry default ordering and mounted-route documentation:

- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.md`

Backend tests:

- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.routes.test.ts`
- optional route registry assertion only if Team 00 wants direct coverage: `backend/tests/api/routes.test.ts`

Frontend feature:

- `frontend/src/features/signal-position-ledger/types.ts`
- `frontend/src/features/signal-position-ledger/api/signalPositionLedgerApi.ts`
- `frontend/src/features/signal-position-ledger/hooks/useSignalPositionLedgerActiveRows.ts`
- `frontend/src/features/signal-position-ledger/components/SignalPositionLedgerPage.tsx`
- `frontend/src/features/signal-position-ledger/components/ActivePositionsTable.tsx`
- `frontend/src/features/signal-position-ledger/components/SignalPositionSummaryStrip.tsx`
- `frontend/src/features/signal-position-ledger/components/ClosedHistoryPlaceholder.tsx`
- `frontend/src/features/signal-position-ledger/routes.tsx`
- `frontend/src/features/signal-position-ledger/index.ts`

Frontend shared route/navigation exposure:

- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`

Frontend UI smoke:

- `frontend/tests/ui/signal-position-ledger.spec.ts`

Docs/evidence after implementation:

- implementation handoff and QA/review evidence under the active execution folder as assigned by Team 00.

## Forbidden Implementation Files

Forbidden for this child:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- package manifests and lockfiles
- `backend/src/db/**`
- `backend/src/shared/**`
- `frontend/src/shared/**`
- `frontend/src/contexts/MarketScopeContext.tsx`
- `frontend/tests/ui/support/**` unless Team 04 explicitly reserves a shared test-helper update
- `frontend/src/app/HomePage.tsx`
- all Today Review source/tests except read-only imports
- all Trade Plan Risk Engine source/tests
- all Portfolio source/tests
- all Backtesting source/tests
- all provider/live/startup/backfill/scheduler/worker/queue files
- any new closed-history backend or frontend files
- any new row-detail route files

## QA Expectations

Team 04 should prepare QA for:

- backend active endpoint is reachable at `/api/v1/signals/position-ledger/active`;
- endpoint preserves `region`, `assetType`, `limit`, `offset`, `totalCount`, `nextOffset`, and `hasMore`;
- active rows are newest entry trigger first;
- frontend route `/signal-position-ledger` is protected and reachable through navigation;
- `Active Positions` is the default selected tab;
- active tab calls only the active endpoint with current market scope and pagination;
- closed tab makes no API request and renders no rows, counts, mock data, or close returns;
- summary counts beyond `totalCount` are labeled page-local if shown;
- empty, loading, and error states use domain-specific research-support copy;
- no forbidden language appears in rendered page text.

Suggested verification after implementation:

```powershell
cd backend
npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.routes.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

```powershell
npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1
```

## Risks

- `CF-W2-SPL-01B` commit `ca31d79` must be present on the implementation base before route mounting.
- Backend default ordering needs a narrow service/test correction before the page can honestly claim newest-entry ordering.
- Page-local status counts can be misread as scope-wide unless the UI labels them clearly.
- Navigation and route registry edits are shared files; Team 00 must enforce one writer.

## Architecture Verdict

`READY-CANDIDATE AFTER QA`

Reason:

- the child is bounded to route exposure, a feature-local frontend page, and one narrow default-order correction in the accepted read model;
- no true product consent blocker exists if closed history remains placeholder-only;
- no schema, storage, generated, package, broker, provider, paid, cloud, or lifecycle expansion is required;
- shared files are acceptable as Team 00 controlled reservations with one writer.

