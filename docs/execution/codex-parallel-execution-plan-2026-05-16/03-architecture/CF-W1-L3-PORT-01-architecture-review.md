# CF-W1-L3-PORT-01 Architecture Review

Date: 2026-05-17

Owner: Team 03 Architecture Factory

## Status

Architecture child contract prepared. Not Ready for Implementation.

This is the first child slice under `CF-W1-L3-DQ-01` after Product Owner approval of Option B: passive `LIMITED` display with action-like blocking.

## Evidence Inspected

- `AGENTS.md`
- `00-control/active-work-board.md`
- `03-architecture/next-contracts-to-prepare.md`
- `06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `07-decisions/DECISION-20260517-lane3-readiness-consumer-policy-resolution.md`
- `08-work-packets/CF-W1-L3-DQ-01-work-packet.md`
- `10-requirements/CF-W1-L3-DQ-01-lane-3-readiness-consumer-policy-requirement.md`
- `12-ready-queue/blocked-by-upstream-dependency.md`
- `12-ready-queue/ready-for-implementation.md`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`

## Current Source Findings

- Portfolio summary values holdings from latest price and latest signal, then marks `dataStatus` as `COMPLETE` whenever current prices are non-null.
- Portfolio holding DTOs do not expose Data Quality readiness, readiness blockers, source freshness, or downstream action eligibility.
- Watchlist detail enriches items with current price and latest signal, then returns no Data Quality readiness evidence.
- Watchlist item DTOs do not expose whether displayed price or signal context is trusted, limited, or blocked.
- Data Quality Engine exposes public service methods for latest instrument evaluation and batch evaluation lookup.
- Data Quality evaluation DTOs already include coverage, signal readiness, liquidity, eligibility, readiness reasons/blockers, optional use-case tiers, and `lastEvaluatedAt`.
- Lane 3 modules currently can import `DataQualityEngineService` through the Data Quality public module export without importing its repository directly.
- `DataQualityUseCaseTiers` and related tier types are not re-exported from `data-quality-engine/index.ts`; this child slice should not change Data Quality public exports unless a separate Architect approval reserves that file.

## Architecture Decision

Prepare a backend-only, additive DTO contract for portfolio and watchlist passive display readiness.

The child contract must:

- consume Data Quality Engine public outputs only;
- avoid duplicating readiness scoring, stale-data thresholds, liquidity scoring, or coverage scoring in Lane 3 modules;
- add readiness evidence to portfolio/watchlist DTOs without changing route registries or Prisma schema;
- preserve backward-compatible existing price, valuation, and signal fields;
- make downstream trusted/action-like use fail closed when DQ is missing, blocked, stale, unsupported, or not ready;
- mark `LIMITED` as passive display only, with reasons and no action/reliability eligibility.

## Policy Mapping

Use the accepted parent policy:

| Data Quality state | Passive portfolio/watchlist display | Trusted display / reliability / action-like use |
| --- | --- | --- |
| `READY` | Allowed with DQ evidence | Allowed when module-specific rules pass |
| `LIMITED` | Allowed only as limited display with visible reasons | Blocked |
| Missing DQ | Blocked/untrusted state | Blocked |
| `NOT_READY`, `UNUSABLE`, stale hard blocker, unsupported, scope mismatch | Blocked/untrusted state | Blocked |

Implementation should use `evaluation.useCaseTiers.dailyReview.status` as the passive display tier when available. It may fall back to `evaluation.signalReadinessStatus` only as a Data Quality Engine public output, not as a copied scoring algorithm.

Action-like eligibility must require Data Quality `READY` evidence. A future alert child slice must not create events from `LIMITED`, missing, or blocked readiness.

## Reservation Model

This architecture review defines one DTO contract for both portfolio and watchlist, but default implementation must be split into one module at a time:

- `CF-W1-L3-PORT-01A`: portfolio-management DTO readiness.
- `CF-W1-L3-PORT-01B`: watchlist-management DTO readiness.

Team 00 may combine both only if it records a single backend owner, confirms no shared/high-risk files are touched, and Team 04 accepts a combined focused QA plan.

## Exact Future File Reservations

Portfolio child slice allowed files:

- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`

Watchlist child slice allowed files:

- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend route registry
- frontend route registry
- shared backend utilities
- shared frontend components
- package manifests
- generated types
- Data Quality Engine source or public export changes
- Signal Generation source changes
- Portfolio Intelligence source changes
- Alerts Monitoring source changes
- frontend feature files
- providers, schedulers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

## Required QA Scenarios

Team 04 should refresh a child QA plan before implementation is pulled. Minimum focused backend scenarios:

- `READY` evaluation adds readiness DTO evidence and allows trusted display/action eligibility flags according to contract.
- `LIMITED` evaluation keeps passive display available but blocks trusted/action eligibility.
- Missing DQ evaluation returns blocked/untrusted readiness evidence and does not silently mark the holding/item as trusted.
- `NOT_READY` or blocked use-case tier returns blocked/untrusted readiness evidence.
- Existing price and signal fields remain backward-compatible.
- Services import Data Quality through public module exports and do not import the DQ repository.

## Readiness Result

Architecture child contract is prepared for `CF-W1-L3-PORT-01`.

Do not move this item to `Ready for Implementation` until Team 04 accepts the child QA plan, Team 00 selects either portfolio or watchlist as the first implementation slice, and exact file reservations are copied into the ready queue or implementation handoff.
