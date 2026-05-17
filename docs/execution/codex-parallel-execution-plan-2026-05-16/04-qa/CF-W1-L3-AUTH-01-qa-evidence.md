# CF-W1-L3-AUTH-01 QA Evidence

Date: 2026-05-17

Owner: Team 04 QA Factory

Mode: QA rerun after rework. No app source or test files modified by QA.

## Scope Reviewed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-AUTH-01-portfolio-watchlist-child-ownership-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-AUTH-01-portfolio-watchlist-child-ownership-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-AUTH-01-work-packet.md`
- `backend/src/modules/portfolio-management/portfolio-management.controller.ts`
- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.repository.ts`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`
- `backend/tests/modules/portfolio-management/portfolio-management.ownership.test.ts`
- `backend/src/modules/watchlist-management/watchlist-management.controller.ts`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.repository.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.ownership.test.ts`

## Command Run

Memory check before Jest succeeded by .NET `ComputerInfo`: 74.02% used, 4.1 GB free. CIM-based memory check was access denied, so the local .NET fallback reading was used.

```text
cd backend
npm.cmd test -- portfolio-management.service.test.ts portfolio-management.ownership.test.ts watchlist-management.service.test.ts watchlist-management.ownership.test.ts --runInBand
```

## Command Result

Pass.

```text
Test Suites: 4 passed, 4 total
Tests:       24 passed, 24 total
Snapshots:   0 total
Time:        3.191 s, estimated 4 s
Ran all test suites matching portfolio-management.service.test.ts|portfolio-management.ownership.test.ts|watchlist-management.service.test.ts|watchlist-management.ownership.test.ts.
```

Team 00 reran the same focused command from the current worktree before acceptance and commit preparation:

```text
Test Suites: 4 passed, 4 total
Tests:       24 passed, 24 total
Snapshots:   0 total
Time:        2.892 s, estimated 3 s
Ran all test suites matching portfolio-management.service.test.ts|portfolio-management.ownership.test.ts|watchlist-management.service.test.ts|watchlist-management.ownership.test.ts.
```

## Prior Rejection Rerun Checks

| Prior rejection | Rerun result | Evidence |
| --- | --- | --- |
| Cross-user parent-not-found errors did not preserve route-level not-found behavior | Pass | Portfolio and watchlist controllers now map errors ending in `not found` to HTTP 404 and return only the not-found message. Ownership tests cover controller misses returning `{ error: 'Portfolio not found' }` and `{ error: 'Watchlist not found' }`. |
| Ownership was not proven before validation on update/create paths | Pass | Portfolio service now calls `requirePortfolio()` before validation/mutation for portfolio update, holding add/update/remove, transaction list/create. Watchlist service now calls `requireWatchlist()` before validation/mutation for watchlist update, item add/update/remove. Ownership tests use invalid cross-user payloads and prove parent-not-found is returned before child repository or market-data calls. |

## Behavioral Evidence

- Portfolio parent ownership checks are present before child access/mutation at `portfolio-management.service.ts:50`, `:60`, `:68`, `:74`, `:125`, and `:130`.
- Portfolio parent-not-found behavior is centralized through `requirePortfolio()` at `portfolio-management.service.ts:190`, returning `Portfolio not found`.
- Portfolio controller 404 mapping for not-found errors is at `portfolio-management.controller.ts:116`.
- Portfolio ownership tests cover no cross-user holding mutation, ownership before child validation, ownership before portfolio update validation, no cross-user transaction listing/creation, authenticated user propagation, and non-leaking controller 404 behavior.
- Watchlist parent ownership checks are present before child access/mutation at `watchlist-management.service.ts:52`, `:62`, `:72`, and `:78`.
- Watchlist parent-not-found behavior is centralized through `requireWatchlist()` at `watchlist-management.service.ts:126`, returning `Watchlist not found`.
- Watchlist controller 404 mapping for not-found errors is at `watchlist-management.controller.ts:80`.
- Watchlist ownership tests cover no cross-user item mutation, ownership before child validation, ownership before watchlist update validation, no cross-user item listing, authenticated user propagation, and non-leaking controller 404 behavior.

## Forbidden File Check

Pass.

Observed changed AUTH-01 app/test paths are within the work packet's allowed source and test scope:

- `backend/src/modules/portfolio-management/portfolio-management.controller.ts`
- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/tests/modules/portfolio-management/portfolio-management.ownership.test.ts`
- `backend/src/modules/watchlist-management/watchlist-management.controller.ts`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.ownership.test.ts`

No forbidden app paths were changed: no Prisma schema/migrations, route registries, auth-identity, alerts-monitoring, shared backend/frontend, frontend files, package manifests, generated types, provider, scheduler, startup, Angel One, broker, or live-market-provider files.

Repository files were inspected and are allowed by the work packet, but they were not changed in this rerun scope.

Unrelated dirty docs were present and excluded from this AUTH-01 QA decision, including `04-qa/next-validation-plans.md` and untracked AUTH-02 / SIG-TRIGGER planning docs.

## Skipped Checks

- Backend build/typecheck, broad Jest, route test files, Prisma commands, app startup, providers, UI/Playwright, and live local data validation were not run because the Product Owner explicitly limited this QA rerun to the focused Jest command above.
- Full HTTP route tests were not run. Controller-level status/user propagation coverage is included in the focused ownership tests.

## QA Decision

Pass `CF-W1-L3-AUTH-01` QA rerun with no blocking findings.

The requested focused command passes, the prior rejection points are addressed, parent ownership is proven before validation/mutation on the reviewed paths, not-found responses are non-leaking 404/parent-not-found behavior, and no forbidden app files were changed. Next gates remain Code Review / Lead Validation, Architect signoff, and Product Owner acceptance.
