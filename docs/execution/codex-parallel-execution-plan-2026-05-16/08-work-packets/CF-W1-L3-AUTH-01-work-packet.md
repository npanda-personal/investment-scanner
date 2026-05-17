# CF-W1-L3-AUTH-01 Work Packet

Date: 2026-05-17

## Work Item

Portfolio/watchlist child-resource ownership tests and fix.

## State

Architecture-ready for bounded implementation after QA plan and Orchestrator acceptance.

Implementation has not started.

## Owner / Lane / Modules

- Owner: Team 07 Portfolio / Watchlist / Alerts implementation agent, after assignment.
- Lane: Lane 3.
- Modules: `portfolio-management`, `watchlist-management`.

## Allowed Source Files

- `backend/src/modules/portfolio-management/portfolio-management.controller.ts`
- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.repository.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/src/modules/watchlist-management/watchlist-management.controller.ts`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.repository.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`

## Allowed Test Files

- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`
- `backend/tests/modules/portfolio-management/portfolio-management.routes.test.ts`
- `backend/tests/modules/portfolio-management/portfolio-management.ownership.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.routes.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.ownership.test.ts`

New ownership test files may be created only at the exact paths above.

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/auth-identity/**`
- `backend/src/modules/alerts-monitoring/**`
- `backend/src/shared/**`
- `frontend/src/**`
- package manifests
- generated types
- provider, scheduler, startup, Angel One, broker, or live-market-provider files

## Implementation Tasks

- Pass `currentUserId` through portfolio holding update/remove flows.
- Pass `currentUserId` through portfolio transaction list/create flows.
- Pass `currentUserId` through watchlist item update/remove flows.
- Gate child operations through parent portfolio/watchlist ownership before child row access or mutation.
- Preserve existing route paths and response shapes.
- Preserve legacy `userId = null` compatibility only through the existing parent owner lookup path.

## Stop Conditions

Stop and return to Orchestrator/Architect if implementation requires:

- auth middleware behavior changes,
- default-user platform policy changes,
- schema or migration changes,
- route registry changes,
- alert ownership changes,
- frontend or shared UI changes.

## Future Validation Commands

Do not run during docs-only prep. Later implementation owner should run focused commands after code changes:

```powershell
cd backend
npm.cmd test -- portfolio-management.service.test.ts portfolio-management.ownership.test.ts watchlist-management.service.test.ts watchlist-management.ownership.test.ts --runInBand
```

Add route-focused tests only if controller/user propagation changes are covered by route-level test helpers without shared auth changes.

## Acceptance Criteria

- Cross-user portfolio child access fails closed.
- Cross-user watchlist item access fails closed.
- Owned-user flows still pass.
- No forbidden files are changed.
- QA, code review, Architect, and Product Owner acceptance are recorded before release.

