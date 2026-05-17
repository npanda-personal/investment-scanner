# CF-W1-L3-AUTH-03 Architecture Review

Date: 2026-05-17

Owner: Team 07 Portfolio / Watchlist / Alerts

## Status

Architecture draft prepared. Not Ready for Implementation.

## Work Item

Alert rule target ownership validation for portfolio- and watchlist-scoped alert rules.

## Source Findings

- Alert routes are authenticated and event inbox operations are scoped through parent alert rule ownership after `CF-W1-L3-AUTH-02`.
- Alert rule create/update validates target IDs syntactically but does not prove `portfolioId` or `watchlistId` belongs to the current user before persistence.
- Alerts Monitoring already depends on `PortfolioManagementService` and `WatchlistManagementService`, so ownership checks can be performed through public module services without importing repositories.
- An unscoped service evaluation path can evaluate all enabled rules and pass no owner into portfolio/watchlist lookups. Future background or manual internal evaluation must use each rule owner, not `default-user`.

## Architecture Decision Draft

Use a backend-only, module-local hardening slice in `alerts-monitoring`.

The service should verify portfolio/watchlist rule targets through public portfolio/watchlist services before creating or updating a rule. Evaluation should preserve the rule owner for portfolio/watchlist lookups. The implementation should avoid schema changes by using existing `AlertRule.userId` as the rule owner.

## Contract Boundaries

Allowed dependency direction:

- `alerts-monitoring` service may call public `PortfolioManagementService` and `WatchlistManagementService`.
- `alerts-monitoring` repository may include owner metadata for internal evaluation only if the implementation preserves public API compatibility.

Forbidden dependency direction:

- `alerts-monitoring` must not import portfolio or watchlist repositories directly.
- `alerts-monitoring` must not modify auth middleware, route registries, shared utilities, Prisma schema, or generated types.

## Exact Future File Reservations

Allowed after Ready promotion:

- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.repository.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend or frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- `backend/src/modules/auth-identity/**`
- portfolio-management source/tests
- watchlist-management source/tests
- notifications-delivery or copilot digest consumers
- frontend feature files
- providers, schedulers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

## Required QA Scenarios

- User A cannot create a portfolio-scoped alert rule for user B's portfolio.
- User A cannot create a watchlist-scoped alert rule for user B's watchlist.
- User A cannot update an owned alert rule to point at user B's portfolio or watchlist.
- Valid owned portfolio/watchlist rule create/update still works.
- Evaluation uses the rule owner when reading portfolio/watchlist resources.
- Event ownership tests from `CF-W1-L3-AUTH-02` remain valid.

## Readiness Result

Not Ready for Implementation. This draft needs QA plan acceptance and Team 00 Ready promotion before Team 07 may touch source or tests.
