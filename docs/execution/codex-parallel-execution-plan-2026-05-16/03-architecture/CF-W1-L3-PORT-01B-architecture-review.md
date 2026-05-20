# CF-W1-L3-PORT-01B Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Watchlist-only child architecture packet refreshed. READY-CANDIDATE for Team 00 sequencing.

This child inherits the accepted parent `CF-W1-L3-PORT-01` contract. Team 00 confirmed `CF-W1-L3-PORT-01A` is stable and accepted on branch `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A` at commit `f1432e6`, including delegated Product Owner acceptance packet `09-summaries/CF-W1-L3-PORT-01A-po-acceptance-packet.md`.

Current `dev` does not contain `f1432e6` at this refresh. Future implementation should either stack on `f1432e6` or use a later clean `dev` only after Team 00 confirms that `dev` contains `f1432e6`.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-L3-PORT-01B-watchlist-readiness-dto-requirement.md`
- `03-architecture/CF-W1-L3-PORT-01-architecture-review.md`
- `06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`
- `08-work-packets/CF-W1-L3-PORT-01-work-packet.md`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `git show f1432e6:docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W1-L3-PORT-01A-po-acceptance-packet.md`
- `git show f1432e6:docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-PORT-01A-developer-handoff.md`
- `git show f1432e6:backend/src/modules/portfolio-management/portfolio-management.types.ts`

## Current Source Findings

- `watchlist-management.detail()` reads the owned watchlist, lists items, enriches current price and latest signal, and returns no Data Quality readiness evidence.
- `WatchlistDashboardItemDto` has `currentPrice`, `dailyChangePercent`, `latestSignal`, and `researchUrl`, but no readiness fields.
- `WatchlistDetailDto` has no readiness summary field.
- The module already receives `userId` at the watchlist boundary; this child is about readiness DTOs, not watchlist ownership mutation rules.
- `CF-W1-L3-PORT-01A` accepted DTO semantics include module-local readiness DTO names, `displayStatus`, `actionStatus`, missing-evaluation blocking, daily-review passive display tier, signal-tier action eligibility, and focused automation-only blocker coverage.
- Current `dev` lacks `f1432e6`, so implementing from plain current `dev` would risk re-deriving or drifting from the accepted portfolio readiness mapper.

## Architecture Decision

Prepare `CF-W1-L3-PORT-01B` as a watchlist-only READY-CANDIDATE child that reuses the parent readiness DTO contract and accepted `CF-W1-L3-PORT-01A` semantics without touching portfolio files.

The child must:

- consume DQE public outputs only;
- add `readiness` to each watchlist dashboard item;
- add `readinessSummary` to the watchlist detail DTO;
- preserve existing watchlist fields and sorting behavior;
- surface `LIMITED`, missing, stale, blocked, unsupported, or scope-mismatched DQ states as limited or blocked context rather than trusted readiness.

## Exact Future File Reservations

- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`

## Forbidden Files

- portfolio-management source/tests
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- Data Quality Engine source or public export changes
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- alerts-monitoring source/tests
- portfolio-intelligence source/tests
- frontend feature files
- providers, startup/backfill, paid/cloud, broker, or telemetry flows

## Dependency And Independence Notes

- `CF-W1-L3-PORT-01B` depends on accepted `CF-W1-L3-PORT-01A` DTO naming and mapping semantics so the watchlist child does not diverge from the established portfolio readiness contract.
- That prerequisite is satisfied by accepted commit `f1432e6`, but not by the current `dev` checkout.
- Base recommendation: if Team 00 promotes implementation before `f1432e6` lands on `dev`, create the `PORT-01B` branch/worktree from `f1432e6`; if Team 00 first integrates `f1432e6` into `dev`, create the `PORT-01B` branch/worktree from that later clean `dev`.
- It does not require simultaneous portfolio file edits once `CF-W1-L3-PORT-01A` is accepted.
- After `CF-W1-L3-PORT-01A` acceptance, `CF-W1-L3-PORT-01B` can run independently as a watchlist-only backend slice inside the exact watchlist file reservation above.

## Required QA Scenarios

Focused backend QA should prove:

- ready DQ adds trusted watchlist readiness evidence;
- limited DQ keeps passive display only;
- missing DQ yields blocked readiness;
- stale or blocked tier evidence yields blocked readiness;
- existing current price, daily move, latest signal, and `researchUrl` fields remain backward-compatible.

## Readiness Result

READY-CANDIDATE.

The file reservations are exact, open decisions are clear, and accepted `CF-W1-L3-PORT-01A` commit `f1432e6` provides the stable readiness shape. Team 03 does not self-promote to Ready for Implementation; Team 00 must sequence the implementation handoff and choose either stacked base `f1432e6` or a later clean `dev` that contains `f1432e6`.
