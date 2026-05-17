# CF-W1-L3-AUTH-02 QA Plan

Date: 2026-05-17

Owner: Team 04 QA Factory

Status: QA planning only. Do not run commands until Product Owner and Architect accept the alert event ownership model and a scoped implementation handoff exists.

## Scope

Focused backend validation for alert rule and alert event ownership in Alerts Monitoring.

In scope after approval:
- current-user scoping for alert rule evaluation,
- current-user scoping for alert event inbox listing,
- current-user scoping for mark-read, dismiss, and mark-all-read actions,
- two-user isolation in service and route tests,
- ownership validation for portfolio/watchlist alert rule references,
- compatibility behavior for any documented legacy nullable-owner alert rules or events.

Out of scope:
- portfolio/watchlist child-resource ownership already owned by `CF-W1-L3-AUTH-01`,
- alert data-quality suppression owned by `CF-W1-L3-ALERT-01`,
- notification digest consumers unless explicitly pulled into the accepted contract,
- copilot alert consumers unless explicitly pulled into the accepted contract,
- frontend/UI checks,
- provider/live market-data checks,
- startup, scheduler, or backfill behavior,
- route registry, package, shared UI, or shared fixture changes unless separately approved.

## Ownership Model Decision Gate

QA remains blocked until one model is accepted:

- Direct event owner: `AlertEvent` stores a direct owner field. This requires explicit Prisma/schema/migration approval before implementation or executable QA.
- Rule-owner join: `AlertEvent` ownership is enforced through its owned `AlertRule`. This requires an accepted repository/service contract for event queries and mutations to join through the rule owner.

QA must reject any implementation that leaves `AlertEvent` list/read/dismiss/mark-all-read behavior globally scoped.

## Required QA Assertions

- User A evaluating alerts creates or returns events only for User A owned enabled rules.
- User A evaluation does not evaluate or create events for User B rules.
- User A cannot list User B alert events.
- User A cannot mark User B alert events as read.
- User A cannot dismiss User B alert events.
- User A mark-all-read affects only User A active events.
- Cross-user event actions fail closed with not-found or forbidden behavior and do not leak event title, message, metadata, or rule existence.
- Alert event duplicate suppression remains scoped to the current user's owned rule/event set.
- Portfolio-scoped alert rules validate that the referenced portfolio belongs to the rule owner.
- Watchlist-scoped alert rules validate that the referenced watchlist belongs to the rule owner.
- Stock/instrument alert rules do not bypass rule ownership even when the instrument itself is globally visible.
- Returned event DTOs preserve current public fields unless the accepted contract explicitly changes the response shape.
- If legacy nullable-owner alert rules or events are preserved, their read/action behavior is documented and cannot allow new cross-user mutations.
- No broker, paid/cloud, provider-heavy, live market-data, startup/backfill, UI, package, route-registry, or shared-component behavior is required.

## Focused Command Guidance

Commands below are guidance only. They were not run during this documentation-only planning task.

Blocked until ownership decision, contract acceptance, and implementation handoff:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.routes.test.ts --runInBand
```

Only if request/response validation changes are included in the approved implementation:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.validation.test.ts --runInBand
```

Approval-gated only if shared auth behavior is explicitly in scope:

```powershell
cd backend
npm.cmd test -- auth-identity.ownership.test.ts auth-identity.routes.test.ts --runInBand
```

## Stop Conditions

Stop QA and return to Orchestrator/Architect if validation requires:
- choosing the alert event ownership model during QA,
- Prisma schema or migration work without explicit approval,
- route registry changes,
- shared auth middleware changes,
- shared test fixture rewrites,
- notification or copilot consumer changes outside the accepted contract,
- package changes,
- broad backend test runs,
- frontend build, Playwright, or UI smoke tests,
- live services, startup flows, schedulers, backfills, or providers.

## Evidence Required Later

- Accepted Product Owner and Architect ownership decision.
- Accepted architecture contract with the chosen ownership model.
- Implementation handoff with exact changed files.
- Exact focused command output.
- Two-user alert rule/event isolation scenario notes.
- Confirmation that forbidden scopes were not touched.
- Skipped checks and reasons.

## QA Blockers

- Alert event ownership model is unresolved: direct event owner versus rule-owner join.
- Direct event ownership may require Prisma schema approval.
- Rule-owner join needs an accepted repository/query contract before implementation.
- Alert readiness suppression remains separate and must not be treated as covered by this plan.
