# TEAM-07 Assignment - CF-W1-L3-AUTH-01

Date: 2026-05-17

State: Ready for Implementation

## Assignment

Implement the bounded portfolio/watchlist child-resource ownership slice.

## Input Sources

- `10-requirements/CF-W1-L3-AUTH-01-portfolio-watchlist-child-ownership-requirement.md`
- `06-contracts/CF-W1-L3-AUTH-01-portfolio-watchlist-child-ownership-contract.md`
- `04-qa/CF-W1-L3-AUTH-01-qa-plan.md`
- `08-work-packets/CF-W1-L3-AUTH-01-work-packet.md`
- `13-implementation-evidence/CF-W1-L3-AUTH-01-readiness-check.md`

## Allowed Files

Source:

- `backend/src/modules/portfolio-management/portfolio-management.controller.ts`
- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.repository.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/src/modules/watchlist-management/watchlist-management.controller.ts`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.repository.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`

Tests:

- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`
- `backend/tests/modules/portfolio-management/portfolio-management.routes.test.ts`
- `backend/tests/modules/portfolio-management/portfolio-management.ownership.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.routes.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.ownership.test.ts`

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
- generated types/common fixtures
- provider, scheduler, startup, Angel One, broker, or live-market-provider files

## Required Implementation

- Pass `currentUserId` through portfolio holding update/remove flows.
- Pass `currentUserId` through portfolio transaction list/create flows.
- Pass `currentUserId` through watchlist item update/remove flows.
- Gate child operations through parent portfolio/watchlist ownership before child row access or mutation.
- Preserve route paths and response shapes.
- Preserve legacy `userId = null` compatibility only through the existing parent owner lookup path.

## Focused Test Command

```powershell
cd backend
npm.cmd test -- portfolio-management.service.test.ts portfolio-management.ownership.test.ts watchlist-management.service.test.ts watchlist-management.ownership.test.ts --runInBand
```

Route-focused tests may be run only if controller/user propagation changes are validated by existing route-level test helpers without shared auth changes.

## Expected Outbox

Team 07 must report:

- files changed,
- tests run and results,
- skipped tests with reasons,
- whether any forbidden file became necessary,
- whether QA/review/Architect/PO evidence can proceed.
