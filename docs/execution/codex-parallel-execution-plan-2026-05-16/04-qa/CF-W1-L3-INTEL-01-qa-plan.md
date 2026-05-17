# CF-W1-L3-INTEL-01 QA Plan

Date: 2026-05-17

Owner: Team 07 Portfolio / Watchlist / Alerts

## Status

QA plan draft prepared. Not executable until `CF-W1-L3-PORT-01A` is implemented and accepted, this child contract is accepted, exact file reservations are promoted, and implementation handoff exists.

## Scope

Backend-only QA plan for Portfolio Intelligence reliability gating.

This plan does not approve source edits, test edits, Prisma/schema changes, route changes, shared DTOs/utilities, shared UI, frontend work, providers, startup/backfill, Angel One, broker, paid/cloud services, UI smoke, broad suites, staging, commits, or pushes.

## Required QA Assertions

- Portfolio Intelligence consumes portfolio readiness DTOs from Portfolio Management.
- Missing readiness evidence fails closed.
- `READY` readiness allows reliable metadata.
- `LIMITED` readiness marks output limited and blocks action-like reliability claims.
- Blocked/not-ready/unusable/stale/unsupported/scope-mismatched evidence marks reliability blocked.
- Existing response fields remain backward-compatible.
- No Data Quality repository imports or duplicated DQ scoring logic are introduced.
- Product language remains research-support oriented.

## Scenario Matrix

| Scenario | Expected QA result |
| --- | --- |
| READY portfolio readiness | Response includes reliable metadata and keeps existing health/review fields. |
| LIMITED portfolio readiness | Response includes limited metadata; action-like reliability is blocked or downgraded. |
| Missing readiness DTO | Response includes blocked/not-enough-trusted-data metadata; no trust inferred from `dataStatus = COMPLETE`. |
| Blocked readiness summary | Response includes blocker reasons and blocks reliability claims. |
| Mixed holdings | Summary counts or reasons reflect limited/blocked holdings. |
| Existing compatibility | `healthScore`, `status`, `redFlags`, `reviewRanking`, `groupedSummary`, `signalOverlay`, and `dataStatus` remain present. |

## Focused Command Guidance

Run only after implementation handoff exists:

```powershell
cd backend
npm.cmd test -- portfolio-intelligence.service.test.ts --runInBand
```

Route tests only if controller/router behavior is touched:

```powershell
cd backend
npm.cmd test -- portfolio-intelligence.routes.test.ts --runInBand
```

## Rejection Criteria

- Implementation touches Portfolio Management, Data Quality Engine, Prisma, route registries, shared utilities, shared UI, frontend, package manifests, generated files, providers, startup/backfill, or live-provider paths.
- Missing readiness metadata is treated as trusted.
- `LIMITED` readiness permits reliable action-like labels.
- Tests pass by freezing current fail-open behavior instead of proving reliability gating.

## Evidence Required Later

- Exact implementation handoff and changed-file list.
- Focused test output.
- Scenario results for READY, LIMITED, missing readiness, and blocked readiness.
- Confirmation no forbidden files or provider flows were used.
- Skipped checks with reason and next owner.
