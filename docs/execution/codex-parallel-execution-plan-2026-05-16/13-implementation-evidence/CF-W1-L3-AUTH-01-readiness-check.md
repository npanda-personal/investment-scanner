# CF-W1-L3-AUTH-01 Readiness Check

Date: 2026-05-17

Owner: Team 00 Master Orchestrator

## Requirement

`CF-W1-L3-AUTH-01` - Portfolio / Watchlist child-resource ownership.

## Current Source Inspected

- `backend/src/modules/portfolio-management/portfolio-management.controller.ts`
- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.repository.ts`
- `backend/src/modules/watchlist-management/watchlist-management.controller.ts`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.repository.ts`

## Current Tests Inspected

- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`
- `backend/tests/modules/portfolio-management/portfolio-management.routes.test.ts`
- `backend/tests/modules/portfolio-management/portfolio-management.validation.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.routes.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.validation.test.ts`

## Evidence

- Portfolio holding update/remove flows currently do not pass `currentUserId` from controller to service/repository.
- Portfolio transaction listing currently does not pass `currentUserId`.
- Watchlist item update/remove flows currently do not pass `currentUserId`.
- Existing tests cover service delegation and routes, but do not prove two-user child-resource ownership boundaries.

## Gate Check

| Gate | Status |
| --- | --- |
| Requirement exists | Pass |
| Acceptance criteria exist | Pass |
| Architecture contract exists | Pass |
| QA plan exists | Pass |
| Work packet exists | Pass |
| Exact file reservations exist | Pass |
| Current source inspected | Pass |
| Current tests inspected | Pass |
| Shared-file conflict | None |
| Product Owner decision missing | No |
| Architect decision missing | No |
| QA decision missing | No |
| Prisma/schema/migration needed | No |
| Route registry needed | No |
| Shared utility/UI needed | No |
| Package/generated/common fixture needed | No |
| Angel One/live provider/broker/paid/cloud risk | No |
| Startup/backfill needed | No |
| UI implementation needed | No |

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

## Stop Conditions

Stop the implementation if it requires:

- auth middleware behavior changes,
- platform `default-user` policy changes,
- schema or migration changes,
- route registry changes,
- alert event ownership changes,
- frontend or shared UI changes,
- package/generated/common fixture changes,
- tests that preserve cross-user access instead of proving fail-closed behavior.

## Decision

Implementation allowed: yes.

Team 07 may pull this bounded module-local item under standing delegation.
