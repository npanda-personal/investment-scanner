# CF-W1-L3-PORT-01A QA Evidence

Date: 2026-05-18

Owner: Team 04 QA Factory

## Work Item

`CF-W1-L3-PORT-01A` - portfolio-management readiness DTOs.

## Source Under Test

- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team07-CF-W1-L3-PORT-01A`
- Developer handoff: `18-integration-queue/CF-W1-L3-PORT-01A-developer-handoff.md`

## Files Reviewed

- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`
- `06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`
- `10-requirements/CF-W1-L3-PORT-01A-portfolio-readiness-dto-requirement.md`
- `04-qa/CF-W1-L3-PORT-01-qa-plan.md`

## Memory Gate

The first CIM memory query was blocked by OS permissions. A .NET memory check succeeded:

- Total physical memory: `16936132608`
- Available physical memory: `3845718016`
- Approximate utilization: `77.3%`

Focused validation was allowed because utilization was below the 90% start threshold.

## Focused QA Command

Run from `C:\work\repo\investment-scanner-worktrees\team07-CF-W1-L3-PORT-01A\backend`:

```powershell
npm.cmd test -- portfolio-management.service.test.ts --runInBand
```

Result:

- Test suites: `1 passed`
- Tests: `7 passed`
- Snapshots: `0`
- Duration: `3.91 s`

## Scenario Coverage

| Scenario | QA result |
| --- | --- |
| Data Quality public boundary | Passed. Implementation imports `DataQualityEngineService` and `DataQualityEvaluationDto` from the public module export and does not import `DataQualityEngineRepository`. |
| Backward-compatible portfolio output | Passed. Existing valuation, price, signal, `dataStatus`, and route-level behavior are preserved by additive DTO fields. |
| `READY` DQ evidence | Passed. Tests assert holding readiness and portfolio summary readiness are `READY` with action eligibility. |
| `LIMITED` DQ evidence | Passed. Tests assert passive display remains `LIMITED` while action eligibility is `BLOCKED`. |
| Missing DQ evidence | Passed. Tests assert missing evaluation blocks readiness even when `dataStatus = COMPLETE`. |
| `NOT_READY`, `UNUSABLE`, stale/hard-block evidence | Passed. Tests assert blocked readiness, blocked action eligibility, and blocker propagation. |
| Forbidden scope | Passed by review. Changed files stay inside the Ready handoff's portfolio-management source/docs/test reservation plus Team 07 docs; no Prisma, route, shared utility/UI, package, generated, provider, startup/backfill, frontend, watchlist, alerts, portfolio-intelligence, Angel One, broker, live-provider, paid/cloud, or telemetry paths are changed. |

## Skipped Checks

- Ownership/routes regression tests were not run because ownership, controllers, and routes were not changed.
- UI smoke tests were not run because this is a backend-only DTO slice with no frontend scope.
- Backend build was not rerun by Team 04; Team 07 developer handoff reports `npm.cmd run build` passed.

## QA Result

Focused validation passed for the scoped `CF-W1-L3-PORT-01A` handoff, but this QA result is superseded for release acceptance by Team 10's later code-review rejection.

Team 10 found that the portfolio mapper can treat automation-only Data Quality blockers as portfolio display blockers. Team 07 must revise inside the existing file reservation, and Team 04 must rerun focused QA after that revision.

Next gates: Team 07 revision, Team 04 QA rerun, Team 10 re-review, Architect Signoff, delegated Product Owner acceptance, then scoped commit if all standing criteria pass.
