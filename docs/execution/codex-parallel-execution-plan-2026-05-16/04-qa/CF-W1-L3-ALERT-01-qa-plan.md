# CF-W1-L3-ALERT-01 QA Plan

Date: 2026-05-17

Owner: Team 04 QA Factory

Status: QA planning only. Alert readiness suppression validation is blocked until `CF-W1-L3-DQ-01` policy acceptance, alert readiness contract acceptance, and scoped implementation handoff.

## Scope

Validation plan for Alerts Monitoring suppression of trusted or action-like alert events when Data Quality readiness is missing, limited, stale, not ready, blocked, unsupported, or scope-mismatched.

Target alert surfaces:

- stock price alerts,
- stock signal alerts,
- portfolio holding alerts,
- watchlist price alerts,
- watchlist signal alerts,
- alert digest consumers only as downstream regression after alert event behavior is accepted.

This plan does not approve application source edits, test edits, Prisma changes, routes, shared utilities/UI, packages, generated files, providers, services, startup/backfill, UI implementation, Playwright, builds, broad suites, or live data checks.

## Dependencies

- `CF-W1-L3-DQ-01` must define display-only versus action-like readiness policy.
- Architect must define the alert readiness consumer contract.
- Implementation handoff must state whether Alerts Monitoring receives Data Quality Engine public outputs directly or through approved module DTOs.
- Product Owner must accept whether `LIMITED` readiness can ever create an alert. Conservative default: `LIMITED` blocks action-like alert event creation.

## Required QA Assertions

- Alerts Monitoring consumes approved Data Quality Engine readiness outputs or approved readiness DTOs; it must not duplicate readiness scoring.
- Missing DQ evidence blocks trusted alert event creation.
- `NOT_READY`, `BLOCKED`, stale hard blocker, unsupported scope, provider gap, and scope mismatch block trusted alert event creation.
- `LIMITED` blocks alert event creation unless Product Owner explicitly accepts limited alert behavior.
- Price alerts do not create events from untrusted current price or previous close data.
- Signal alerts do not create events from untrusted latest signal data.
- Portfolio alerts do not create events from holdings or portfolio summaries lacking approved readiness evidence.
- Watchlist alerts do not create events from watchlist items lacking approved readiness evidence.
- Suppressed rules produce auditable skip evidence where the accepted contract requires it.
- Alert event copy remains research-support oriented and avoids direct financial advice.
- Existing user ownership behavior from `CF-W1-L3-AUTH-02` remains protected.

## Scenario Matrix

| DQ/readiness state | Stock price alerts | Stock signal alerts | Portfolio alerts | Watchlist alerts | Expected evidence |
| --- | --- | --- | --- | --- | --- |
| `READY` for required use case | May create event if rule condition is met | May create event if rule condition is met | May create event if rule condition is met | May create event if rule condition is met | Event metadata carries approved readiness evidence if contract requires it. |
| Missing DQ | Suppress | Suppress | Suppress | Suppress | Skip/block reason recorded or returned. |
| `LIMITED` | Suppress by conservative default | Suppress by conservative default | Suppress by conservative default | Suppress by conservative default | Limited reason visible in QA evidence. |
| `NOT_READY` | Suppress | Suppress | Suppress | Suppress | Not-ready blockers visible in QA evidence. |
| `BLOCKED` | Suppress | Suppress | Suppress | Suppress | Blockers visible in QA evidence. |
| Stale hard blocker | Suppress | Suppress | Suppress | Suppress | Latest trusted timestamp or stale reason visible when available. |
| Unsupported region/asset type or scope mismatch | Suppress | Suppress | Suppress | Suppress | Scope mismatch reason visible. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Baseline alert regression after contract acceptance and implementation handoff:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.validation.test.ts --runInBand
```

Ownership regression if alert event listing, event mutation, or parent rule filtering is touched:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.ownership.test.ts alerts-monitoring.routes.test.ts --runInBand
```

Lane 3 readiness regression if DTO or upstream readiness consumer behavior is touched:

```powershell
cd backend
npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts portfolio-management.service.test.ts watchlist-management.service.test.ts portfolio-intelligence.service.test.ts alerts-monitoring.service.test.ts --runInBand
```

Approval-gated backend build after implementation and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

## Unsafe Or Broad Commands Excluded

Do not run by default:

- broad backend suites such as `npm.cmd test` with no file filters,
- Playwright or UI smoke tests,
- dev servers or provider services,
- startup, scheduler, repair, sync, import, or backfill flows,
- Prisma generate, migrate, db push, db execute, or any schema/data mutation,
- provider tests, Angel One, or live provider checks,
- frontend build or UI implementation,
- paid/cloud, telemetry, broker, or real-money flows.

## Stop Conditions

Stop QA and return to Orchestrator/Architect if:

- `CF-W1-L3-DQ-01` is not accepted,
- `LIMITED` alert behavior remains unresolved,
- alert suppression requires Data Quality Engine public contract changes not reserved by Architect,
- implementation needs Prisma, route registry, shared utility/UI, package, provider, startup/backfill, or UI scope,
- tests cannot prove suppression without live provider data,
- alert copy implies direct financial advice or action instructions,
- command scope broadens beyond focused backend Jest patterns.

## Evidence Required Later

- Accepted Lane 3 readiness policy and alert readiness contract.
- Exact implementation handoff with changed files.
- Scenario matrix result for `READY`, missing, `LIMITED`, `NOT_READY`, `BLOCKED`, stale, unsupported, and scope-mismatched cases.
- Focused command output only after approval.
- Confirmation no providers, services, startup/backfill, Prisma mutation, UI implementation, broad suites, Angel One, paid/cloud, broker, or live data checks were used.
- Skipped checks with reason and next owner.
