# CF-W1-L3-DQ-01 QA Plan

Date: 2026-05-17

Owner: Team 04 QA Factory

Status: QA planning only. Product Owner and Architect decision is required for Lane 3 display-vs-action readiness policy before implementation validation.

## Scope

Validation plan for Lane 3 consumers of Data Quality readiness:
- portfolio-management,
- watchlist-management,
- alerts-monitoring,
- portfolio-intelligence where portfolio context reliability is affected,
- copilot/research summaries only after a separate UX/trust contract.

This plan does not approve source changes, tests, UI work, services, providers, builds, Prisma changes, route registry changes, or package changes.

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

UI smoke is excluded by default. It requires explicit UI scope approval, running-app plan, memory/resource check, and a focused Playwright spec.

## Stop Conditions

Stop QA and return to Product Owner/Architect if:
- display-vs-action readiness policy remains unresolved,
- `LIMITED` readiness semantics are ambiguous,
- alert event behavior becomes a user-ownership/schema decision,
- implementation requires Prisma, route registry, shared utilities, shared UI, package, provider, startup/backfill, or UI scope,
- tests require live providers or services,
- commands broaden beyond focused backend patterns.

## Evidence Required Later

- Accepted Lane 3 readiness policy contract.
- Exact changed-file list from implementation handoff.
- Focused command output for touched modules.
- Scenario matrix for missing, `LIMITED`, `NOT_READY`, `BLOCKED`, stale, and `READY`.
- Confirmation no forbidden broad/provider/UI/startup checks were run.
- Skipped checks with reason and next owner.
