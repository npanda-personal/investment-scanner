# CF-W1-L3-AUTH-01 QA Plan

Date: 2026-05-17

Owner: Team 04 QA Factory

Status: QA planning only. Do not run commands until the ownership contract is accepted and a scoped implementation handoff exists.

## Scope

Focused backend validation for portfolio and watchlist child-resource ownership.

In scope after approval:
- portfolio holding child-resource access,
- portfolio transaction child-resource access,
- watchlist item child-resource access,
- two-user isolation in service and route tests,
- current-user propagation through module-owned controller/service/repository calls.

Out of scope:
- alert event ownership, which belongs to `CF-W1-L3-AUTH-02`,
- auth middleware platform fallback policy, unless separately approved,
- Prisma schema changes,
- route registry changes,
- frontend/UI checks,
- shared fixtures/utilities unless explicitly reserved.

## Required QA Assertions

- User A cannot list, read, update, delete, or mutate User B portfolio holdings.
- User A cannot list, read, update, delete, or mutate User B portfolio transactions.
- User A cannot list, read, update, delete, or mutate User B watchlist items.
- Child-resource endpoints validate parent ownership before exposing child existence.
- Cross-user failures use a consistent not-found or forbidden response without leaking another user's resource details.
- Authenticated route paths use current-user context for the touched child-resource flows.
- New or changed tests create at least two distinct users and at least one owned parent resource per user.
- Legacy `userId = null` compatibility, if encountered, is documented and cannot allow new cross-user child mutations.
- No broker, provider, paid/cloud, live market-data, startup/backfill, Prisma mutation, package, route-registry, shared UI, or frontend behavior is required.

## Focused Command Guidance

Blocked until contract acceptance and implementation handoff:

```powershell
cd backend
npm.cmd test -- portfolio-management.service.test.ts portfolio-management.routes.test.ts watchlist-management.service.test.ts watchlist-management.routes.test.ts --runInBand
```

Only if validation files are changed in the approved implementation:

```powershell
cd backend
npm.cmd test -- portfolio-management.validation.test.ts watchlist-management.validation.test.ts --runInBand
```

Approval-gated only if auth middleware or shared auth behavior is explicitly in scope:

```powershell
cd backend
npm.cmd test -- auth-identity.ownership.test.ts auth-identity.routes.test.ts --runInBand
```

## Stop Conditions

Stop QA and return to Orchestrator/Architect if validation requires:
- Prisma schema changes,
- auth middleware changes,
- route registry changes,
- alert event ownership decisions,
- shared test fixture rewrites,
- package changes,
- broad backend test runs,
- UI/Playwright checks,
- live services or providers.

## Evidence Required Later

- Accepted architecture contract reference.
- Implementation handoff with exact changed files.
- Exact focused command output.
- Two-user test scenario notes.
- Confirmation forbidden scopes were not touched.
- Skipped checks and reasons.
