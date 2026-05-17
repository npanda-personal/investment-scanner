# CF-W1-L3-DQ-01 QA Plan

Date: 2026-05-17

Owner: Team 04 QA Factory

Status: Product policy accepted; QA planning only. Child implementation validation remains blocked until module-specific contracts, exact file reservations, and implementation handoffs exist.

Current status refresh: Product Owner approved Option B on 2026-05-17. This does not make `CF-W1-L3-DQ-01` app-code ready and does not approve QA execution.

## Scope

Validation plan for Lane 3 consumers of Data Quality readiness:
- portfolio-management,
- watchlist-management,
- alerts-monitoring,
- portfolio-intelligence where portfolio context reliability is affected,
- copilot/research summaries only after a separate UX/trust contract.

This plan does not approve source changes, tests, UI work, services, providers, builds, Prisma changes, route registry changes, or package changes.

It also explicitly excludes Angel One, live services, startup/backfill flows, UI smoke, broad suites, Prisma mutation commands, and any live-provider or paid/cloud validation unless a future approved implementation packet requires and scopes them.

## Required QA Assertions

- Lane 3 modules consume Data Quality Engine public readiness outputs instead of duplicating readiness scoring.
- Missing DQ evaluation does not become trusted or action-ready.
- `NOT_READY`, `BLOCKED`, stale, unsupported, scope-mismatched, or provider-gap states block action-like workflows.
- `LIMITED` behavior follows the accepted Product Owner/Architect policy and is never silently treated as fully trusted.
- Portfolio and watchlist display-only behavior, if approved, shows readiness status and blocker reasons without implying financial advice.
- Alerts do not create trusted or action-like events from missing, stale, limited, blocked, or not-ready DQ inputs.
- Portfolio Intelligence does not emit reliability, review priority, or action-style language without approved readiness evidence.
- API/DTO fields used by UI or downstream modules are contract-defined before UI implementation.
- No provider calls, startup/backfill behavior, paid/cloud dependency, broker integration, route registry edit, Prisma mutation, shared UI edit, or Playwright run is required by default.

## Focused Command Guidance

Baseline DQ regression, blocked until contract acceptance and implementation handoff:

```powershell
cd backend
npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand
```

Lane 3 display/readiness consumers, blocked until corresponding module implementation exists:

```powershell
cd backend
npm.cmd test -- portfolio-management.service.test.ts watchlist-management.service.test.ts portfolio-intelligence.service.test.ts --runInBand
```

Alert readiness suppression, blocked until alert readiness contract and implementation exist:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.routes.test.ts alerts-monitoring.validation.test.ts --runInBand
```

UI smoke is excluded by default. It requires explicit UI scope approval, running-app plan, exact focused Playwright spec, Team 00 validation approval, and memory/resource check.

## Stop Conditions

Stop QA and return to Product Owner/Architect if:
- child readiness contract or exact file reservation is missing,
- `LIMITED` readiness is treated as action-ready or reliability-bearing without a new Product Owner decision,
- alert event behavior becomes a user-ownership/schema decision,
- implementation requires Prisma, route registry, shared utilities, shared UI, package, provider, startup/backfill, or UI scope,
- tests require live providers or services,
- commands broaden beyond focused backend patterns.
- any request tries to treat setup authorization as approval for app-code readiness or validation execution.

## Evidence Required Later

- Accepted Lane 3 readiness policy contract.
- Exact changed-file list from implementation handoff.
- Focused command output for touched modules.
- Scenario matrix for missing, `LIMITED`, `NOT_READY`, `BLOCKED`, stale, and `READY`.
- Confirmation no forbidden broad/provider/UI/startup checks were run.
- Skipped checks with reason and next owner.
