# CF-W1-L3-AUTH-03 - Alert Rule Target Ownership Requirement

Date: 2026-05-17

## Status

Requirement draft prepared by Team 07. Not Ready for Implementation. Current Team 00 routing keeps this behind `CF-W1-L3-ALERT-01` and ahead of the post-decision platform auth/subscription and Copilot items.

This is a follow-up to the completed `CF-W1-L3-AUTH-02` alert event ownership slice. That slice scoped alert event inbox operations through parent `AlertRule.userId`, but current source evidence still shows alert rule create/update can persist portfolio or watchlist references without proving the referenced resource belongs to the current user. Service-level evaluation also supports an unscoped `evaluate()` path that can fall back to default-user portfolio/watchlist lookups.

## Product Value

Portfolio and watchlist alert rules must not point at another user's portfolio or watchlist. Alert evaluation must preserve the rule owner when reading user-owned portfolio/watchlist resources so alert events cannot be generated from the wrong user's data.

## Current Evidence

- `backend/src/modules/alerts-monitoring/alerts-monitoring.validation.ts` validates that portfolio/watchlist IDs are present for scoped rules, but does not validate ownership.
- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts` creates and updates alert rules after syntactic validation only.
- `backend/src/modules/alerts-monitoring/alerts-monitoring.repository.ts` persists `portfolioId` and `watchlistId` directly from input.
- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts` evaluates portfolio and watchlist rules with the caller-supplied `userId`; when `evaluate()` is called without `userId`, portfolio/watchlist services can fall back to `default-user`.
- `CF-W1-L3-AUTH-02` protected event list/read/dismiss paths but intentionally left broader alert ownership follow-up work split out.
- Current Team 00 routing keeps this as the next Lane 3 follow-up after `CF-W1-L3-ALERT-01`.

## Acceptance Criteria

- Portfolio-scoped alert rule creation verifies the referenced portfolio is readable by the current user before persisting the rule.
- Watchlist-scoped alert rule creation verifies the referenced watchlist is readable by the current user before persisting the rule.
- Portfolio/watchlist target changes during alert rule update are verified against the current user before persisting the update.
- Cross-user or missing portfolio/watchlist targets fail closed with the same non-leaking not-found style used by owned modules.
- Alert evaluation preserves the alert rule owner for portfolio/watchlist lookups, including any internal all-enabled-rules evaluation path.
- Existing parent-rule alert event ownership from `CF-W1-L3-AUTH-02` remains intact.
- Route paths, Prisma schema, migrations, package manifests, shared auth utilities, shared UI, and frontend files are unchanged.
- Existing public response fields remain backward-compatible unless a later accepted contract explicitly allows additive internal owner metadata.
- Focused tests cover create/update target ownership and evaluation owner propagation.

## Non-Goals

- No direct `AlertEvent.userId` schema ownership.
- No Prisma schema, migration, generated type, route registry, shared utility, frontend, notification digest, copilot digest, provider, startup/backfill, or live-data work.
- No Data Quality readiness suppression; that remains `CF-W1-L3-ALERT-01`.
- No subscription or platform-wide `default-user` policy change.

## Future Candidate Files After Ready Promotion

- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.repository.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`

## Stop Conditions

- Implementation requires Prisma/schema/migration, route registry, shared auth utility, package, generated type, provider, startup/backfill, frontend, notification, or copilot changes.
- The team cannot preserve route response compatibility without exposing owner metadata.
- The rule owner cannot be carried through evaluation without changing repository or DTO contracts beyond the accepted file reservation.
- The work conflicts with Team 09 platform auth decisions.

## Next Gate

Architecture/QA acceptance and Team 00 Ready promotion for a bounded backend-only Alerts Monitoring slice.
