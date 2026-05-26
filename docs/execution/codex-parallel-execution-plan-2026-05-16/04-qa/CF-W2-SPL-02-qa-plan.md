# CF-W2-SPL-02 QA Plan

Date: 2026-05-26

Owner: Team 04 - QA Factory

## Work Item

`CF-W2-SPL-02` - Signal Position Ledger active positions surface.

This is a docs-only QA plan for the first user-facing Signal Position Ledger surface. It does not approve implementation, commits, pushes, package changes, schema changes, generated-file changes, source edits, route edits, shared UI edits, or test execution by itself.

## QA Readiness State

`QA-PLAN READY`

Executable QA is blocked until Team 00 promotes the work item, confirms the implementation base contains accepted `CF-W2-SPL-01B` commit `ca31d79 feat: add signal position ledger read model`, and records one-writer reservations for the shared route/navigation files.

## Authority And Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-02-signal-position-ledger-active-surface-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W2-SPL-02-signal-position-ledger-active-surface-ux-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-SPL-02-active-surface-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-SPL-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-SPL-02-architecture-outbox.md`
- `backend/package.json`
- `frontend/package.json`

## Implementation Base Prerequisite

Future implementation must stack on a base containing accepted backend dependency:

- `ca31d79 feat: add signal position ledger read model`

Reject implementation handoff if `backend/src/modules/signal-position-ledger/**` is absent or if the surfaced page is built against a replacement read model not matching the accepted `CF-W2-SPL-01B` active-list contract.

## Bounded QA Scope

In scope:

- backend route registry mounting for the accepted Signal Position Ledger router;
- effective active endpoint `GET /api/v1/signals/position-ledger/active`;
- active-list scope, pagination, response-shape, and newest-entry ordering behavior inherited from `CF-W2-SPL-01B`;
- frontend protected route `/signal-position-ledger`;
- navigation label `Signal Position Ledger` under `Daily Work` after `Today Review`;
- `Active Positions` default tab and table/list rendering;
- `Closed History` placeholder-only tab;
- Playwright smoke coverage for route, nav, active API call, rows, summary labels, and closed-tab no-call behavior;
- language guard for research-support wording.

Out of scope:

- closed-history API, rows, counts, mocks, close dates, close prices, close reasons, closed returns, or durable lifecycle storage;
- backend aggregate summary fields beyond existing `totalCount`;
- search, filters, row-detail routes, or client-side sorting over a paginated slice;
- Home Page launch card;
- Prisma schema, migrations, generated files, package manifests, lockfiles, shared UI, shared backend utilities, provider/live/startup/backfill/scheduler/worker/queue files;
- broker execution, portfolio accounting, realized P/L, targets, reward/risk, or direct advice semantics.

## QA Acceptance Matrix

| Area | Required pass condition | Reject if |
| --- | --- | --- |
| Backend route mounting | `signalPositionLedgerRouter` is mounted through `backend/src/api/routes.ts` at `/api/v1`, making `GET /api/v1/signals/position-ledger/active` reachable | Router is not mounted, route path is rewritten, or frontend calls a different endpoint |
| Accepted read model | Active route preserves `CF-W2-SPL-01B` response shape: `items`, `totalCount`, `limit`, `offset`, `nextOffset`, `hasMore`, `scope`, `warnings` | Response shape changes without contract approval or page uses a separate fabricated read path |
| Query semantics | Active API accepts only approved `region`, `assetType`, `limit`, and `offset`; defaults and bounds remain aligned to the accepted backend child | Extra query semantics are added for search, filters, sort, or closed history |
| Scope correctness | Active API and frontend calls include current app `region` and `assetType`; scope changes reset offset and refetch | Scope is omitted, stale scope remains visible, or unknown-scope rows leak into scoped view |
| Pagination | `limit`, `offset`, `nextOffset`, and `hasMore` semantics are preserved | Pagination is client-faked, ignored, or broken by page-local filtering |
| Ordering | Backend orders eligible rows by `entryTriggerTimestamp` descending before pagination, with stable fallback only where needed | Frontend sorts one returned page to imply global newest order or backend slices before ordering |
| No closed backend | No closed-history endpoint, route, DTO, storage, or test fixture is introduced | Any closed-history API, data model, mock response, or inferred close field appears |
| Frontend route | `/signal-position-ledger` is registered inside protected app navigation routes | Route is missing, public-only, or opened through a Home Page-only path |
| Navigation | `Signal Position Ledger` appears under `Daily Work` after `Today Review` and navigates to `/signal-position-ledger` | Nav label is missing, placed as broker/trading/portfolio framing, or uses a forbidden trade label |
| Default tab | `Active Positions` is selected by default | Closed History or another unapproved tab is selected first |
| Active table/list | Rows show company, symbol, scope, entry trigger date/timestamp, entry trigger price, reason summary, latest price basis/date, current return value or status, compatibility state, trust labels, strategy id, and strategy version | Required evidence fields are hidden, fabricated, or replaced with portfolio/trade fields |
| Active API call | Active tab calls only `/api/v1/signals/position-ledger/active` with `region`, `assetType`, `limit`, and `offset` | Active page calls closed-history, portfolio, broker, Trade Plan, or unapproved endpoints |
| Summary metrics | `Active positions` uses response `totalCount`; any derived `EXIT_TRIGGERED`, `RISK_WARNING`, or stale/unavailable return count is either omitted or visibly labeled `This page` | Page-local counts are displayed as scope-wide or closed-history counts are shown |
| Closed History placeholder | Tab renders only deferred-proof copy and no rows, counts, mocks, return values, loading table, or API-backed error | Any API call, table row, count badge, mock row, closed return, close price/date/reason, or inferred value appears |
| Empty state | Active empty state names current scope and explains no active signal positions are available | Empty copy says no trades, no holdings, no closed positions, or implies broker inactivity |
| Error state | Active error state names current scope and does not render fallback/fake rows | Error state hides scope, falls back to mock rows, or reuses closed-history copy |
| Loading state | Active loading shows visible structure; Closed History renders placeholder immediately with no spinner/table shell | Page flashes blank for active loading or Closed History shows fake loading rows |
| Accessibility/basic usability | Tabs are keyboard reachable; status/trust labels do not rely on color alone; reason summaries truncate cleanly and expose full text on hover/focus | User cannot reach tab controls by keyboard or essential labels are color-only |
| Product language | User-visible copy and tests use research-support language only | Forbidden broker/trade/advice/target/reward-risk/realized P&L language appears |
| File scope | Implementation stays inside Team 03 allowed files plus assigned evidence docs | Schema, migrations, generated files, package manifests, shared UI, shared backend utilities, Home Page, provider/live/startup, closed-history files, or unrelated modules are edited |

## Backend QA Scenarios

1. Mounted route health: a test proves the accepted router is reachable through the effective API mount, not only as a module-local router.
2. Active list route: `GET /api/v1/signals/position-ledger/active?region=IN&assetType=STOCK&limit=25&offset=0` returns the accepted active-list shape.
3. Scope pass-through: route test proves `region` and `assetType` reach the read model and appear in response `scope`.
4. Pagination pass-through: route test proves `limit`, `offset`, `nextOffset`, and `hasMore` remain consistent.
5. Newest-entry ordering: service or route test seeds/arranges multiple eligible rows and proves descending `entryTriggerTimestamp` order before pagination.
6. No closed route: route tests prove no closed-history endpoint is added or consumed for this child.
7. No aggregate widening: backend response does not add scope-wide summary counts beyond `totalCount`.

## Frontend QA Scenarios

1. Navigation opens `Signal Position Ledger` from `Daily Work`.
2. `/signal-position-ledger` loads under the protected app shell.
3. Page header shows `Signal Position Ledger`, current scope, and research-support framing.
4. `Active Positions` is selected by default.
5. Active API request includes `region`, `assetType`, `limit`, and `offset`.
6. Rendered rows show required active-row fields from the mocked or test-served active response.
7. Default visible order matches newest entry trigger first when fixture rows are intentionally unsorted upstream or asserted through backend test evidence.
8. Summary strip uses `totalCount` for scope-wide active count.
9. Any status counts beyond `totalCount` are omitted or visibly labeled `This page`.
10. Scope change triggers refetch and resets offset to the first page.
11. Active empty state names the current market scope and avoids trade/holding/closed-history wording.
12. Active error state names the current market scope and renders no fallback rows.
13. `Closed History` tab shows deferred-proof placeholder copy only.
14. `Closed History` makes no API request after tab click.
15. `Closed History` shows no rows, no counts, no count badge, no mock data, no close labels, and no return values.
16. Rows are not clickable and no row-detail route is implied.
17. Forbidden product language is absent from rendered text.

## Closed History Rejection Gate

Reject the handoff immediately if `Closed History` includes any of the following:

- API call of any kind for closed history;
- rows, table body, cards, list items, fixtures, or mock data;
- counts, count badges, summary cards, or inferred totals;
- close date, close price, close reason, closed return, realized P/L, win/loss, target, or reward/risk fields;
- loading skeleton rows, spinner-only deferred loading, or API-backed error copy;
- any inferred return value or durable lifecycle claim.

Only the deferred-proof placeholder is allowed. Required placeholder copy:

```text
Closed history is not shown yet because durable close date, close price, and close reason proof are not available on the current source path.
```

## Summary Metric Rules

QA must verify:

- `Active positions` uses backend `totalCount` and is the only scope-wide summary count approved in this child.
- `Current page`, if shown, uses `items.length`.
- `Exit-trigger compatibility`, `Risk warning`, and `Return basis limited`, if shown, are derived only from current response `items` and visibly labeled `This page`.
- No count derived from one paginated page is presented as scope-wide.
- No closed-history, realized P/L, win/loss, target, or broker/accounting metrics are shown.

## Language Guard

Reject user-visible copy, test names, comments intended for UI copy, docs in implementation handoff, and acceptance evidence if they introduce forbidden language:

- `active trade`
- `open trade`
- `closed trade`
- `buy`
- `sell`
- `target`
- `profit target`
- `price target`
- `reward/risk`
- `risk:reward`
- `R:R`
- `broker`
- `execution`
- `realized P/L`
- `realized profit`
- `financial advice`
- `must buy`
- `must sell`

Preferred wording:

- `active position`
- `active signal position`
- `entry trigger`
- `bearish trigger`
- `exit-trigger compatibility`
- `risk warning`
- `current return`
- `return basis stale`
- `return unavailable`
- `reason summary`
- `strategy version`
- `lifecycle proof deferred`

## Required Focused Commands After Implementation

Check memory before build or UI smoke execution:

```powershell
Get-Counter '\Memory\% Committed Bytes In Use'
```

Backend focused tests, including service ordering and mounted route behavior:

```powershell
cd backend
npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.routes.test.ts --runInBand
```

If route registry coverage is implemented in a separate API routes test, run it as a required additional focused command:

```powershell
cd backend
npm.cmd test -- routes.test.ts --runInBand
```

Backend build:

```powershell
cd backend
npm.cmd run build
```

Frontend build:

```powershell
cd frontend
npm.cmd run build
```

Playwright smoke for Signal Position Ledger:

```powershell
cd frontend
npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1
```

Language guard:

```powershell
rg -n -i '\b(active trade|active trades|open trade|open trades|closed trade|closed trades|buy|sell|target|profit target|price target|reward/risk|risk:reward|R:R|broker|execution|realized P/L|realized profit|financial advice|must buy|must sell)\b' backend/src/api/routes.ts backend/src/modules/signal-position-ledger backend/tests/modules/signal-position-ledger frontend/src/app/routes.tsx frontend/src/app/navigationMetadata.tsx frontend/src/features/signal-position-ledger frontend/tests/ui/signal-position-ledger.spec.ts
```

Expected language-guard result: no matches. Any match must be inspected and rejected unless it appears only inside an explicit negative assertion in a test or QA evidence.

## Evidence Required From Future QA Execution

Future QA evidence must record:

- branch/worktree and base confirmation including `ca31d79`;
- exact implementation handoff under test;
- exact files changed and inspected;
- memory check result or reason it could not be measured;
- focused backend test command results;
- backend build result;
- frontend build result;
- Playwright smoke result;
- language guard result and any reviewed false positives;
- route mounting evidence for `/api/v1/signals/position-ledger/active`;
- closed-tab no-call evidence;
- summary metric label evidence;
- screenshots or trace notes for active, empty/error where practical, and Closed History placeholder states;
- skipped checks and reasons;
- risks, blockers, next gate, and QA pass/reject recommendation.

## QA Rejection Criteria

Reject the implementation if:

- `ca31d79` dependency is not present on the implementation base;
- shared route/navigation files were edited without Team 00 one-writer reservation;
- `/api/v1/signals/position-ledger/active` is unreachable;
- backend ordering is not newest entry trigger first before pagination;
- frontend route `/signal-position-ledger` is not reachable from first-class navigation;
- `Active Positions` is not the default selected tab;
- active data is not scoped by `region` and `assetType`;
- active rows omit required evidence fields;
- summary counts beyond `totalCount` are shown as scope-wide without backend aggregate approval;
- `Closed History` calls any API or shows rows, counts, mocks, close fields, or inferred returns;
- forbidden broker/trade/advice/target/reward-risk/realized P&L wording appears;
- implementation widens into schema, migrations, generated files, packages, shared UI, Home Page, provider/live/startup, row details, search/filter APIs, or closed-history source.

## Blockers

No QA-planning blocker remains.

Executable QA remains blocked until:

- Team 00 promotes `CF-W2-SPL-02`;
- Team 00 records one-writer shared-file reservations;
- an implementation handoff exists on a base containing accepted `ca31d79`.

## Team 00 Promotion Recommendation

Team 04 recommends Team 00 may promote `CF-W2-SPL-02` after recording the required shared-file reservations and confirming the implementation base contains `ca31d79`.

## Next Gate

Team 00 sequencing, shared-file reservation, and implementation handoff for QA verification.
