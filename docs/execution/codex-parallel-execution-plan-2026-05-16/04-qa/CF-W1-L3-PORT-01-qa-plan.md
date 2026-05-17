# CF-W1-L3-PORT-01 QA Plan

Date: 2026-05-17

Owner: Team 04 QA Factory

Status: Child QA plan prepared. Not executable until Team 00 selects `CF-W1-L3-PORT-01A` portfolio or `CF-W1-L3-PORT-01B` watchlist, records exact file reservations, and implementation handoff exists.

## Scope

Backend-only QA plan for passive display readiness DTOs under accepted `CF-W1-L3-DQ-01` Option B.

Covered child slices:

- `CF-W1-L3-PORT-01A`: portfolio-management holding and summary readiness DTOs.
- `CF-W1-L3-PORT-01B`: watchlist-management item and detail readiness DTOs.

This plan does not approve source edits, test edits, Prisma/schema changes, route changes, shared DTOs/utilities, shared UI, frontend work, providers, startup/backfill, Angel One, broker, paid/cloud services, UI smoke, broad suites, staging, commits, or pushes.

## Contract Inputs

- `03-architecture/CF-W1-L3-PORT-01-architecture-review.md`
- `06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`
- `08-work-packets/CF-W1-L3-PORT-01-work-packet.md`
- `04-qa/post-decision-child-scenario-matrix-2026-05-17.md`

## Required QA Assertions

- Portfolio/watchlist services consume Data Quality Engine public service outputs only.
- No Lane 3 module imports `DataQualityEngineRepository` or duplicates DQ scoring, stale thresholds, liquidity scoring, or coverage scoring.
- Existing price, valuation, signal, and route response fields remain backward-compatible.
- `dataStatus = COMPLETE` in portfolio output does not imply DQ trust.
- `READY` DQ adds readiness evidence and allows trusted display/action eligibility only as defined by the child contract.
- `LIMITED` DQ allows passive display only with reasons and blocks action eligibility.
- Missing DQ returns blocked/untrusted readiness evidence.
- `NOT_READY`, `UNUSABLE`, stale hard blocker, unsupported scope, scope mismatch, or blocked tier returns blocked/untrusted readiness evidence.
- Readiness summaries accurately count ready, limited, blocked, and missing evaluations.
- No direct financial advice or action wording is introduced.

## Scenario Matrix

| Slice | Scenario | Expected QA result |
| --- | --- | --- |
| Portfolio | `READY` holding DQ | `HoldingValuationDto.readiness.displayStatus = READY`, action eligibility follows signal tier and `eligibleForSignals`; existing valuation fields remain present. |
| Portfolio | `LIMITED` holding DQ | Passive display remains possible with reasons; `actionStatus = BLOCKED`; summary increments limited count. |
| Portfolio | Missing holding DQ | Holding readiness is blocked with missing-evaluation blocker; no fallback trust from non-null price. |
| Portfolio | `NOT_READY`, `UNUSABLE`, stale, unsupported, scope mismatch, or blocked tier | Holding readiness is blocked and blocker evidence is preserved. |
| Portfolio | Mixed holdings | `PortfolioReadinessSummaryDto` counts ready, limited, blocked, and missing holdings; `canUseForActionWorkflows` is false if any required action evidence is blocked. |
| Watchlist | `READY` item DQ | `WatchlistItemReadinessDto.displayStatus = READY`; existing price/signal/research fields remain present. |
| Watchlist | `LIMITED` item DQ | Passive display remains possible with reasons; `actionStatus = BLOCKED`; summary increments limited count. |
| Watchlist | Missing item DQ | Item readiness is blocked with missing-evaluation blocker; no fallback trust from latest signal or price fields. |
| Watchlist | `NOT_READY`, `UNUSABLE`, stale, unsupported, scope mismatch, or blocked tier | Item readiness is blocked and blocker evidence is preserved. |
| Boundary | Data Quality import path | Tests or review prove modules use Data Quality public exports and not the repository. |

## Focused Command Guidance

Run only after the corresponding child implementation exists.

Portfolio-only slice:

```powershell
cd backend
npm.cmd test -- portfolio-management.service.test.ts --runInBand
```

Watchlist-only slice:

```powershell
cd backend
npm.cmd test -- watchlist-management.service.test.ts --runInBand
```

Combined backend-only exception, only if Team 00 records one owner and combined file reservations:

```powershell
cd backend
npm.cmd test -- portfolio-management.service.test.ts watchlist-management.service.test.ts --runInBand
```

Ownership/routes regression only if ownership or controller paths are touched:

```powershell
cd backend
npm.cmd test -- portfolio-management.ownership.test.ts watchlist-management.ownership.test.ts portfolio-management.routes.test.ts watchlist-management.routes.test.ts --runInBand
```

## QA Rejection Criteria

- Implementation touches Data Quality Engine source/export files without a new accepted packet.
- Implementation creates shared readiness DTOs or shared utilities.
- Implementation treats `LIMITED` as action-ready.
- Missing DQ silently becomes trusted because price or signal fields exist.
- Portfolio/watchlist routes or frontend surfaces are changed without reservation.
- Tests require live providers, startup/backfill, Prisma mutation, broad suites, or UI smoke.

## Evidence Required Later

- Exact child slice selected: portfolio-only, watchlist-only, or Team 00-approved combined backend pass.
- Exact changed-file list from implementation handoff.
- Scenario results for `READY`, `LIMITED`, missing, `NOT_READY`, blocked tier, stale, unsupported, and scope mismatch.
- Focused command output for implemented slice.
- Confirmation no forbidden/shared/provider/UI/schema paths were touched or run.
- Skipped checks and next owner.
