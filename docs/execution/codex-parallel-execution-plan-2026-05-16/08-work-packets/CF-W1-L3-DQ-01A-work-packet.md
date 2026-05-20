# CF-W1-L3-DQ-01A Work Packet

Date: 2026-05-20

## Work Item

Lane 3 passive readiness DTO contract baseline.

## State

Architecture-readiness prepared. Not Ready for Implementation.

This packet is docs-only in shared `dev`. It does not open a fresh application-code writer set.

Reason:

- accepted passive DTO implementations already exist in `CF-W1-L3-PORT-01A` and `CF-W1-L3-PORT-01B`
- plain current `dev` does not contain accepted commits `f1432e6` or `a2edfb6`
- active `CF-W1-L3-WATCH-01` already owns the watchlist implementation lane

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory
- Lane: Lane 3
- Contract scope only:
  - `portfolio-management` passive readiness baseline
  - `watchlist-management` passive readiness baseline
- Next fresh downstream implementation module after this packet:
  - `portfolio-intelligence` for `CF-W1-L3-DQ-01B`

## Current Allowed Files

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-DQ-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01A-lane-3-passive-readiness-dto-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-DQ-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-L3-DQ-01A-architecture.md`
- append-only update if needed: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Current Forbidden Files

- all application source and tests
- all `CF-W1-L3-WATCH-01` docs or Team 07 worktree files
- all `CF-W1-L3-INTEL-02` docs owned by the other Team 03 agent
- Team 02 requirement files
- Team 04 QA files
- Team 00 Ready-promotion files
- `backend/src/modules/data-quality-engine/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend/frontend route registries
- shared backend utilities or shared DTO files
- shared frontend components
- package manifests
- generated files
- provider/live/startup/backfill scope
- paid/cloud, broker, or telemetry scope

## Future Source Reservation Rule

Do not open a fresh application-file reservation under `DQ-01A`.

Accepted source baselines that this packet depends on but must not reopen:

- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`

## Dependency Summary

- hard dependency: accepted `CF-W1-L3-PORT-01A` commit `f1432e6`
- hard dependency: accepted `CF-W1-L3-PORT-01B` commit `a2edfb6`
- active lane dependency: `CF-W1-L3-WATCH-01` stays in flight and should not be interrupted
- downstream dependency: `CF-W1-L3-DQ-01B` should consume this passive contract before downstream reliability gating is promoted
- later downstream item: `CF-W1-L3-INTEL-02` remains behind both `DQ-01A` and `DQ-01B`

## Required Behavior

This packet must:

- freeze the accepted passive display mapping for portfolio and watchlist readiness DTOs
- keep `LIMITED` passive-only
- keep missing, stale, unsupported, scope-mismatched, `NOT_READY`, and `UNUSABLE` states blocked or untrusted
- preserve accepted automation-only-blocker handling
- treat `lastEvaluatedAt` as the current passive freshness timestamp
- avoid inventing a new cross-module DTO abstraction

## First Bounded Child Recommendation

After Team 00 acknowledges this contract, the next bounded implementation child should be:

- `CF-W1-L3-DQ-01B`

Recommended shape:

- backend-only
- `portfolio-intelligence` module-local
- reliability-gate focus only

Do not reopen `PORT-01A` or `PORT-01B` code under this packet unless Team 00 explicitly routes a separate accepted-baseline integration task.

## QA Handoff Needed

Yes.

Team 04 can start QA planning now because the passive contract is bounded and the accepted source baselines are identifiable.

QA planning for this child should:

- verify the frozen passive mapping against accepted `PORT-01A` and `PORT-01B`
- require ancestry/base confirmation for `f1432e6` and `a2edfb6`
- avoid opening executable app-code QA as if `DQ-01A` were a fresh combined implementation slice

## Stop Conditions

Stop and return to Team 00 / Architect if someone tries to use `DQ-01A` to:

- reopen both passive modules in one writer pass
- edit watchlist files while `WATCH-01` is active
- add shared DTOs or shared mapping helpers
- widen into alert, actionability, reliability-label, or frontend scope
- start implementation from plain current `dev` while it still lacks `f1432e6` and `a2edfb6`

## Next Gate

1. Team 04 QA-plan start is allowed now.
2. Team 00 should treat `DQ-01A` as a contract baseline, not as a Ready code packet.
3. Team 00 may route `CF-W1-L3-DQ-01B` next as the first new implementation child after this acknowledgement.
