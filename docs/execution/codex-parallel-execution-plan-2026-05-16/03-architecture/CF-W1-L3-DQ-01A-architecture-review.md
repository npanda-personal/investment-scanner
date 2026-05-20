# CF-W1-L3-DQ-01A Architecture Review

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Architecture-readiness prepared. Not Ready for Implementation.

Do not promote `CF-W1-L3-DQ-01A` as a fresh application-code packet from Team 03. In the shared `dev` workspace, this child is best treated as a contract-only readiness gate that locks the accepted passive readiness DTO semantics already proven by `CF-W1-L3-PORT-01A` and `CF-W1-L3-PORT-01B`.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-DQ-01A-lane-3-passive-readiness-dto-contract-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/post-decision-source-readiness-audit-2026-05-17.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-DQ-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-PORT-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-PORT-01B-watchlist-readiness-dto-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-PORT-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-WATCH-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-DQ-01B-portfolio-intelligence-reliability-gate-requirement.md`
- current `dev` sources:
  - `backend/src/modules/portfolio-management/portfolio-management.service.ts`
  - `backend/src/modules/portfolio-management/portfolio-management.types.ts`
  - `backend/src/modules/watchlist-management/watchlist-management.service.ts`
  - `backend/src/modules/watchlist-management/watchlist-management.types.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
  - `backend/src/modules/data-quality-engine/index.ts`
- accepted source baselines:
  - `git show f1432e6:backend/src/modules/portfolio-management/portfolio-management.service.ts`
  - `git show f1432e6:backend/src/modules/portfolio-management/portfolio-management.types.ts`
  - `git show f1432e6:backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`
  - `git show a2edfb6:backend/src/modules/watchlist-management/watchlist-management.service.ts`
  - `git show a2edfb6:backend/src/modules/watchlist-management/watchlist-management.types.ts`
  - `git show a2edfb6:backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`

## Current Source Findings

- Plain current `dev` still lacks passive readiness DTO fields in both modules:
  - `PortfolioSummaryDto` has no `readinessSummary`, and `HoldingValuationDto` has no `readiness`.
  - `WatchlistDetailDto` has no `readinessSummary`, and `WatchlistDashboardItemDto` has no `readiness`.
- Accepted `CF-W1-L3-PORT-01A` commit `f1432e6` already defines the portfolio passive readiness DTO shape and mapping behavior.
- Accepted `CF-W1-L3-PORT-01B` commit `a2edfb6` already defines the watchlist passive readiness DTO shape and mapping behavior.
- Neither `f1432e6` nor `a2edfb6` is an ancestor of the current `dev` checkout, so a plain `dev` implementation pass would drift from accepted source truth.
- The accepted `PORT-01A` and `PORT-01B` tests already prove the important passive rules:
  - `LIMITED` remains display-only and blocks action eligibility.
  - missing DQ fails closed even when price or signal data exists.
  - stale, unsupported, scope-mismatched, `NOT_READY`, and `UNUSABLE` evidence block passive trust.
  - automation-only blockers do not override otherwise-ready daily-review and signal tiers.
- `DataQualityEngineService` public DTOs are sufficient for the passive contract. `index.ts` still publicly exports `DataQualityEngineRepository`, so this child must explicitly forbid repository imports even though the export exists.
- Active `CF-W1-L3-WATCH-01` is already using the accepted watchlist readiness baseline in a separate Team 07 lane. Reopening watchlist source files under `DQ-01A` would create unnecessary overlap.

## Architecture Decision

Treat `CF-W1-L3-DQ-01A` as a cross-child contract packet, not as a fresh combined implementation slice.

What this child should do:

- freeze the accepted passive readiness DTO semantics from `PORT-01A` and `PORT-01B`;
- make those semantics the required baseline for downstream Lane 3 consumers;
- clarify that `lastEvaluatedAt` is the current acceptable passive freshness timestamp, rather than inventing a new trusted-date field in this child;
- keep `CF-W1-L3-DQ-01B` and later `INTEL-02` behind this contract acknowledgement.

What this child should not do:

- reopen `portfolio-management` or `watchlist-management` source on plain current `dev`;
- create shared readiness DTO files;
- widen into alert, reliability-label, or review-priority scope;
- duplicate DQE mapping logic in another module.

## Module Locality Result

`CF-W1-L3-DQ-01A` is not module-local as a new implementation packet.

It spans two already-accepted module-local children:

- `CF-W1-L3-PORT-01A` for `portfolio-management`
- `CF-W1-L3-PORT-01B` for `watchlist-management`

That means the honest architecture posture is:

- module-local code work already exists in the accepted child baselines;
- `DQ-01A` itself should stay docs-only in shared `dev`;
- downstream implementation work should open in later child packets, not by reopening both passive DTO modules here.

## Exact File Reservations

Current Team 03 write reservation for this pass only:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-DQ-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01A-lane-3-passive-readiness-dto-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-DQ-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-L3-DQ-01A-architecture.md`
- append-only update if needed: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

Inherited accepted source baselines that should not be reopened under this child:

- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`

Recommended fresh application-file reservation under `DQ-01A`:

- none

## Exact Forbidden Files

- all application source and tests in this pass
- all `CF-W1-L3-WATCH-01` docs and Team 07 worktree-owned watchlist scope
- all `CF-W1-L3-INTEL-02` docs owned by the other Team 03 agent
- Team 02 requirement docs
- Team 04 QA docs
- Team 00 Ready-promotion files
- `backend/src/modules/data-quality-engine/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend/frontend route registries
- shared backend utilities or shared DTO files
- shared frontend components
- package manifests
- generated files
- provider, startup, backfill, live-data, paid/cloud, broker, or telemetry scope

## Dependency And Sequencing Notes

- Hard source dependencies:
  - accepted `CF-W1-L3-PORT-01A` commit `f1432e6`
  - accepted `CF-W1-L3-PORT-01B` commit `a2edfb6`
- Queue dependency:
  - active `CF-W1-L3-WATCH-01` remains in flight and should keep its watchlist writer set.
- Downstream dependency:
  - `CF-W1-L3-DQ-01B` should follow this passive contract so `portfolio-intelligence` does not invent its own passive mapping.
- `CF-W1-L3-INTEL-02` must stay behind both this contract acknowledgement and the later `DQ-01B` reliability gate.

## First Bounded Child Recommendation

Do not create a new combined implementation child under `DQ-01A`.

The first honest follow-on child after this contract is:

- `CF-W1-L3-DQ-01B` as a backend-only `portfolio-intelligence` reliability-gate packet

Reason:

- the passive DTO behavior is already implemented and accepted in `PORT-01A` and `PORT-01B`;
- reopening both passive modules would collide with accepted baselines and active watchlist work;
- the next unresolved trust gap is downstream reliability labeling, not passive DTO mapping.

## QA Planning Result

Team 04 QA planning can start now.

Scope for Team 04:

- verify the passive contract against accepted `PORT-01A` and `PORT-01B` semantics;
- require ancestry/base confirmation for `f1432e6` and `a2edfb6` before any executable validation;
- keep QA contract-level and backend-only for this child;
- route executable downstream validation to the actual implementation-owning child when Team 00 chooses that next packet.

## Readiness Result

Architecture-ready as a docs-only contract gate, but not Ready for Implementation.

Team 03 recommendation to Team 00:

1. acknowledge `DQ-01A` as a passive-contract baseline, not a fresh code packet;
2. keep application-file reservations closed under this child;
3. let Team 04 start QA planning now;
4. route `CF-W1-L3-DQ-01B` next when the passive contract acknowledgement is consumed.
