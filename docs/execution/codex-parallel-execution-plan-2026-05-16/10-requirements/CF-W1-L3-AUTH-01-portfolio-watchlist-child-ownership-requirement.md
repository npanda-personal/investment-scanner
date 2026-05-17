# CF-W1-L3-AUTH-01 - Portfolio / Watchlist Child Ownership Requirement

Date: 2026-05-17

## Status

Accepted after bounded implementation.

Architecture contract, QA plan, exact work packet, readiness check, focused tests, QA evidence, code review, Architect signoff, and delegated Product Owner acceptance are recorded for the module-local slice. Remaining Lane 3 alert ownership, Data Quality readiness consumer policy, and platform `default-user` policy are separate requirements.

## Product Value

Portfolio holdings, portfolio transactions, and watchlist items are user-owned child resources. A current user must not be able to list, create, update, or remove child resources through another user's parent portfolio or watchlist. Cross-user attempts must fail closed without revealing that another user's child resource exists.

## Current Evidence

Latest inputs:

- `11-module-audits/audit-portfolio-watchlist-alerts.md`
- `11-module-audits/daemon-cycle-readiness-audit-2026-05-17.md`
- `17-team-outboxes/TEAM-01-audit-factory-2026-05-17.md`
- `17-team-outboxes/TEAM-03-architecture-factory-2026-05-17.md`
- `17-team-outboxes/TEAM-04-qa-factory-2026-05-17.md`
- `17-team-outboxes/TEAM-07-portfolio-watchlist-alerts-2026-05-17.md`
- `17-team-outboxes/TEAM-09-platform-auth-subscription-notifications-2026-05-17.md`

Observed gaps:

- Portfolio child mutations and listings still miss consistent current-user propagation for some holding and transaction flows.
- Watchlist item mutations still miss consistent current-user propagation for some item flows.
- Routers use authenticated context, but this requirement must not become the platform-wide `default-user` fallback decision.
- Alert event ownership is a separate higher-risk requirement because `AlertEvent` has no direct `userId`.

## Exact Dependencies

- Current-user identity must be available from existing authenticated route/controller context for the touched portfolio and watchlist flows.
- Parent portfolio ownership must be provable for `portfolioId` plus current user before holding or transaction child access.
- Parent watchlist ownership must be provable for `watchlistId` plus current user before watchlist item access.
- `06-contracts/CF-W1-L3-AUTH-01-portfolio-watchlist-child-ownership-contract.md` must be accepted or updated by Architecture.
- `04-qa/CF-W1-L3-AUTH-01-qa-plan.md` must be accepted or updated by QA.
- `08-work-packets/CF-W1-L3-AUTH-01-work-packet.md` must be accepted by Orchestrator with exact file reservations.
- The ready queue must explicitly move this item before any implementation starts.

Non-dependencies:

- This requirement does not depend on `CF-W1-L3-DQ-01`; data readiness is a separate Lane 3 policy.
- This requirement does not resolve `CF-W1-AUTH-01`; if platform-level fallback removal is required, stop and return to that auth policy item.
- This requirement does not resolve `CF-W1-L3-AUTH-02`; alert event ownership remains separate.

## Candidate Acceptance Criteria

Future accepted implementation must satisfy all approved contract details, including:

- Portfolio holding update and removal prove parent portfolio ownership for the current user before child mutation.
- Portfolio transaction listing and creation prove parent portfolio ownership for the current user before child listing or creation.
- Watchlist item update and removal prove parent watchlist ownership for the current user before child mutation.
- Cross-user child access fails closed with the same not-found behavior used for missing parent resources or another accepted non-leaking response.
- Cross-user tests use at least two distinct users and prove no child-resource existence leak.
- Existing owned-user portfolio and watchlist child-resource flows continue to pass.
- Existing route paths and public response shapes remain unchanged.
- Legacy `userId = null` compatibility is not broadened and cannot allow new cross-user child mutation.
- Subscription gates, auth middleware, route registries, Prisma schema, shared utilities, frontend files, provider paths, and package files are unchanged.
- Module docs are updated if the implementation changes ownership behavior.
- QA, code review, Architect signoff, and Product Owner acceptance are recorded before release.

## Current Allowed Files

For this documentation-only requirement pass:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-AUTH-01-portfolio-watchlist-child-ownership-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`

## Future Allowed Files After Approval

Likely module-local implementation files after accepted contract, QA plan, and Orchestrator work packet:

- `backend/src/modules/portfolio-management/portfolio-management.controller.ts`
- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.repository.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`
- `backend/tests/modules/portfolio-management/portfolio-management.routes.test.ts`
- `backend/tests/modules/portfolio-management/portfolio-management.ownership.test.ts`
- `backend/src/modules/watchlist-management/watchlist-management.controller.ts`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.repository.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.routes.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.ownership.test.ts`

New ownership test files may be created only at the exact paths above unless Orchestrator updates the reservation.

## Forbidden Without Separate Approval

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
- root `AGENTS.md`, `docs/AGENTS.md`, or `docs/codex-agent-team-plan/**`

## Shared-File Risk

Risk: Medium.

The intended slice is module-local, but it touches user-owned backend modules that may also be involved in Lane 3 readiness work. It must be serialized with any other writer in `portfolio-management` or `watchlist-management`. Risk escalates to High and the work must stop if schema, auth middleware, route registry, shared utility, shared test fixture, alert ownership, package, generated type, or frontend changes are needed.

## Stop Conditions

- Implementation requires auth middleware or platform `default-user` policy changes.
- Implementation requires Prisma schema or migration changes.
- Implementation requires route registry changes or public route shape changes.
- Implementation needs alert event ownership or notification/copilot alert digest ownership.
- Implementation needs shared test fixture rewrites, package changes, provider paths, services, or UI work.
- Tests would only preserve current cross-user access instead of proving fail-closed behavior.

## Next Gate

Scoped local commit by Team 00, then remove this item from the active Ready queue and continue the daemon loop.
