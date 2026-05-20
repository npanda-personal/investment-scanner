# CF-W1-L3-DQ-01B Work Packet

Date: 2026-05-20

## Work Item

Portfolio Intelligence reliability gate.

## State

Architecture-readiness prepared. Not Ready for Implementation.

This packet is a bounded backend-only `portfolio-intelligence` child. It is the next implementation-scale child after the `DQ-01A` passive readiness contract gate, but it still requires the accepted `PORT-01A` baseline before code work starts.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Lane: Lane 3
- Module: `portfolio-intelligence`

## Current Allowed Files

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-DQ-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01B-portfolio-intelligence-reliability-gate-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-DQ-01B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-L3-DQ-01B-architecture.md`

## Current Forbidden Files

- all application source and tests in this pass
- all `WATCH-01` worktree/docs
- all `DQ-01A` docs now owned by the completed contract/QA gate
- all `INTEL-02` docs
- Team 02 requirement files
- Team 04 QA files
- Team 00 Ready-promotion files
- shared Team 03 outbox unless Team 00 explicitly requests a factory-board append

## Future Source Reservation

Allowed future writer set after Team 00 sequencing and Ready promotion:

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

## Future Forbidden Files

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.repository.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.controller.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.router.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.validation.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.module.ts`
- `backend/src/modules/portfolio-intelligence/index.ts`
- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/watchlist-management/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend/frontend route registries
- shared backend utilities or shared DTO files
- shared frontend components
- package manifests
- generated files
- all `frontend/src/features/portfolio-intelligence/**`
- all `frontend/tests/ui/**`
- alerts-monitoring and notifications-delivery source/tests
- provider/live/startup/backfill scope
- paid/cloud, broker, or telemetry scope

## Dependency Summary

- hard contract dependency: `DQ-01A`
- hard implementation dependency: accepted `PORT-01A` commit `f1432e6`
- no code dependency: `PORT-01B`
- sequencing-only dependency: active `WATCH-01`
- same-writer-set dependency: `INTEL-02`
- same-problem-space note: earlier `INTEL-01` reliability docs should not become a separate parallel writer lane

## Required Behavior

This child must:

- consume accepted readiness metadata through `PortfolioManagementService.summary()`
- add explicit top-level reliability metadata to `PortfolioIntelligenceResponse`
- distinguish `RELIABLE`, `LIMITED`, `DIAGNOSTIC`, and `BLOCKED`
- fail closed when readiness metadata is missing or blocked
- suppress trusted action-like claims when readiness is not trusted
- preserve current response fields and review ranking shape where practical
- stay narrower than `INTEL-02` by not adding full traceability provenance

This child must not:

- import DQE repositories or duplicate DQE mapping logic
- reopen `portfolio-management` or watchlist source
- widen into frontend, route, Prisma, shared utility, or traceability-only scope

## QA Handoff Needed

Yes.

Team 04 QA planning can start now.

Expected QA-planning focus:

- backend-only `portfolio-intelligence` scenarios
- reliable, limited, diagnostic-only, and blocked states
- missing-readiness fail-closed behavior
- action-like suppression when reliability is not trusted
- ancestry/base confirmation that implementation includes accepted `f1432e6`
- explicit separation from later `INTEL-02` traceability scope

## Stop Conditions

Stop and return to Team 00 / Architect if someone tries to:

- implement from plain current `dev` while it still lacks accepted `f1432e6`
- reopen `portfolio-management`, `watchlist-management`, or DQE source
- treat `PORT-01B` or `WATCH-01` as a code dependency for this child
- run `DQ-01B` and `INTEL-02` as separate concurrent `portfolio-intelligence` writers
- add `latestTrustedDataDate` or source-provenance packets that belong to `INTEL-02`

## Next Gate

1. Team 04 QA planning can start now.
2. Team 00 should keep this child out of Ready until the accepted `PORT-01A` baseline is confirmed on the implementation base.
3. Team 00 should keep `INTEL-02` behind `DQ-01B` unless it intentionally combines the shared writer set into one packet.
