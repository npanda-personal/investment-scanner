# CF-W1-L3-AUTH-02 QA Plan

Date: 2026-05-17

Owner: Team 04 QA Factory

Status: Accepted for bounded Option B backend validation.

## Scope

Focused backend validation for alert event ownership through parent `AlertRule.userId`.

In scope:
- current-user scoping for alert rule evaluation,
- current-user scoping for alert event inbox listing,
- current-user scoping for mark-read, dismiss, mark-all-read, and summary,
- two-user isolation in controller/service/repository behavior,
- ownership preservation for portfolio/watchlist alert rule references,
- fail-closed handling for null-owner, orphaned, deleted-parent, or unresolvable events in authenticated event paths.

Out of scope:
- direct `AlertEvent.userId` schema ownership,
- notification digest consumers,
- copilot alert consumers,
- alert Data Quality readiness suppression,
- frontend/UI checks,
- provider/live market-data checks,
- startup, scheduler, or backfill behavior,
- route registry, package, shared UI, shared utility, generated type, or fixture changes.

## Required QA Assertions

- User A event list does not include User B events.
- User A cannot mark User B alert events as read.
- User A cannot dismiss User B alert events.
- User A mark-all-read affects only User A active events.
- User A summary counts only User A events.
- Cross-user event actions fail closed with not-found behavior and do not leak event details.
- Evaluation controller path evaluates only current-user enabled rules.
- Portfolio-scoped and watchlist-scoped alert rule evaluation preserve the rule owner when calling child-resource services.
- Returned event DTOs preserve current public fields.
- No broker, paid/cloud, provider-heavy, live market-data, startup/backfill, UI, package, route-registry, shared-component, generated, or schema behavior is required.

## Focused Command

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.ownership.test.ts alerts-monitoring.routes.test.ts --runInBand
```

The combined daemon validation command may include adjacent accepted Signal Generation suites when both bounded tracks are being reconciled together, but AUTH-02 acceptance depends only on the alerts-monitoring suites above.

## Stop Conditions

Stop QA and return to Orchestrator/Architect if validation requires:
- Prisma schema or migration work,
- route registry changes,
- shared auth middleware changes,
- shared test fixture rewrites,
- notification or copilot consumer changes,
- package changes,
- broad backend suites,
- frontend build, Playwright, or UI smoke tests,
- live services, startup flows, schedulers, backfills, or providers.

## Evidence Required

- Product Owner Option B resolution.
- Exact changed files.
- Focused command output.
- Two-user alert event isolation notes.
- Confirmation that forbidden scopes were not touched.
- Skipped checks and reasons.
