# CF-W1-L3-DQ-01 Work Packet

Date: 2026-05-19

## Work Item

Lane 3 readiness consumer parent policy and child-reservation routing.

## State

Parent architecture packet refreshed. Parent item remains `BLOCKED`.

This packet is docs-only. It is not a direct source-implementation handoff and must not be promoted as a broad app-code item.

## Owner / Lane / Modules

- Owner for this pass: Team 03 Architecture Factory
- Lane: Lane 3
- Future child modules:
  - `portfolio-management`
  - `watchlist-management`
  - `alerts-monitoring`
  - `portfolio-intelligence`
  - research/copilot trust surfaces only after separate UX approval

## Current Allowed Files

For this Team 03 pass only:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-DQ-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-DQ-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-L3-DQ-01-architecture.md`

## Current Forbidden Files

- all application source and tests
- `04-qa/**`
- `10-requirements/**`
- `00-control/**`
- `12-ready-queue/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities or shared DTO files
- shared frontend components
- package manifests
- generated files and generated types
- Data Quality Engine source or public export files
- provider/live/startup/backfill behavior
- frontend features or Playwright files

## Parent Policy Rules

- `READY` may support trusted display and action-like workflows only within a child contract.
- `LIMITED` may appear only in passive portfolio/watchlist/research context with visible reasons and no reliability/action semantics.
- Missing DQ, `NOT_READY`, `UNUSABLE`, stale hard blockers, unsupported scope, scope mismatch, and provider-gap blockers remain blocked for trusted summaries, reliability labels, alerts, and action-like workflows.
- Lane 3 modules must use DQ public outputs and must not duplicate scoring logic.

## Exact Child Reservation Map

### Upstream baseline child

`CF-W1-L3-PORT-01A` portfolio-management readiness DTOs

- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`

Instruction:

- this parent packet does not reopen those files in shared `dev`;
- dedicated worktree evidence shows Team 10 re-review and Team 03 Architect Signoff already passed;
- next gate for this child is delegated Product Owner acceptance, then Team 00 staged-scope verification and scoped local commit;
- downstream child routing must treat `CF-W1-L3-PORT-01A` as the accepted-source dependency for later Lane 3 trust consumers, but that dependency is not satisfied in clean `dev` yet.

### Next fresh readiness-consumer candidate

`CF-W1-L3-PORT-01B` watchlist-management readiness DTOs

- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`

Blocked until:

- `CF-W1-L3-PORT-01A` delegated Product Owner acceptance passes;
- Team 00 finishes staged-scope verification and the scoped local commit for `CF-W1-L3-PORT-01A`;
- clean `dev` has the accepted portfolio readiness DTO shape available for downstream reuse.

### Separate active child

`CF-W1-L3-ALERT-01` alert readiness suppression

- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
- optional if ownership-sensitive paths are touched: `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`

Sequencing rule:

- do not allow a parallel writer on the above alert files while `CF-W1-L3-AUTH-03` or another alert child is active.

### Downstream blocked child

`CF-W1-L3-INTEL-01` portfolio-intelligence reliability gate

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

Blocked until:

- `CF-W1-L3-PORT-01A` is accepted and committed on clean `dev`;
- Team 00 promotes the exact `portfolio-intelligence` child packet;
- no portfolio-management files are needed in the same pass.

## QA Handoff

Team 04 should use the parent policy QA plan only as a baseline:

- `04-qa/CF-W1-L3-DQ-01-qa-plan.md`

Module-specific child QA plans should drive execution:

- `04-qa/CF-W1-L3-PORT-01-qa-plan.md`
- `04-qa/CF-W1-L3-ALERT-01-qa-plan.md`

Parent-level policy assertions for every child:

1. DQ public service boundary only.
2. Missing DQ never becomes trusted because price/signal fields exist.
3. `LIMITED` stays passive-only.
4. stale, unsupported, scope-mismatched, provider-gap, `NOT_READY`, and `UNUSABLE` evidence fail closed for trusted/action-like use.
5. no direct financial advice wording.

Next fresh child QA focus after `PORT-01A` lands:

- `CF-W1-L3-PORT-01B` must prove passive `LIMITED` watchlist display only;
- missing DQ must surface as blocked/untrusted context rather than trusted `currentPrice` or `latestSignal`;
- no shared-file widening, route change, schema change, or frontend/shared-UI spillover is allowed.

## Stop / Split Conditions

Stop and return to Team 00 / Architect if a child would require:

- Prisma/schema/migration work
- backend or frontend route changes
- shared backend utilities or shared DTO extraction
- shared UI work
- package or generated-file changes
- Data Quality Engine source/export changes
- provider/live/startup/backfill behavior
- broad UX scope
- auth/subscription ownership changes in the same pass

## Current Blockers

- Parent docs were stale about child-reservation state and are now refreshed, but the parent item is still not a direct implementation packet.
- `CF-W1-L3-PORT-01A` has not yet cleared delegated Product Owner acceptance and Team 00 staged-scope verification/local commit in the shared execution packet read during this pass.
- clean `dev` still does not contain the accepted portfolio readiness DTO shape, so downstream readiness-consumer children cannot rely on accepted source in this workspace.
- `CF-W1-L3-PORT-01B` remains blocked behind accepted `CF-W1-L3-PORT-01A` source on clean `dev`.
- `CF-W1-L3-INTEL-01` remains blocked behind accepted and committed portfolio readiness DTOs.
- Copilot/research trust surfaces remain blocked until UX approval and explicit frontend reservations.

## Next Gate

Do not promote `CF-W1-L3-DQ-01` itself as an app-code item.

Use this refreshed parent packet only to:

1. keep child boundaries explicit;
2. keep one writer per module file set;
3. route `CF-W1-L3-PORT-01A` through delegated Product Owner acceptance and Team 00 staged-scope verification/local commit;
4. after `PORT-01A` lands on clean `dev`, let Team 00 evaluate `CF-W1-L3-PORT-01B` as the next fresh Lane 3 readiness-consumer Ready candidate.
