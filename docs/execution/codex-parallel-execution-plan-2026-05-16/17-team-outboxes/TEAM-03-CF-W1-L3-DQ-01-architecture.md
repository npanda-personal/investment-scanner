# TEAM-03 CF-W1-L3-DQ-01 Architecture

Date: 2026-05-19

Team: Team 03 - Architecture Factory

Work item: `CF-W1-L3-DQ-01` Lane 3 readiness consumer policy

Status: `BLOCKED` for Ready promotion as a parent item; split is accepted, but the next fresh consumer gate cannot advance from shared `dev` yet.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-DQ-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-DQ-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-L3-DQ-01-architecture.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-DQ-01-lane-3-readiness-consumer-policy-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-DQ-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-DQ-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-PORT-01A-architect-signoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-PORT-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-INTEL-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-PORT-01A-team10-rereview-release.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

## Exact Evidence

- The parent packet was stale: it still described `CF-W1-L3-PORT-01A` as only a future baseline even though later execution docs show it passed Team 10 re-review and Team 03 Architect Signoff in its dedicated worktree.
- `portfolio-management` in current `dev` still infers `dataStatus` from missing current prices rather than accepted DQ trust.
- `watchlist-management` still exposes current price and latest signal with no readiness fields in current `dev`.
- `portfolio-intelligence` still relies on portfolio summary data that does not yet prove accepted readiness trust in current `dev`.
- `alerts-monitoring` still evaluates from price/signal presence in current `dev`, but alert work is already split into the separate `CF-W1-L3-ALERT-01` child.
- DQE public service methods are sufficient for Lane 3 reads, but `diagnostics()` is not a safe default consumer path because it can evaluate and persist on miss.
- `data-quality-engine/index.ts` publicly exports the repository, so the child contracts must forbid repository imports explicitly even though the export exists.
- The accepted `CF-W1-L3-PORT-01A` DTO shape is still absent from shared `dev`, so downstream consumers cannot yet depend on accepted `portfolio-management` readiness fields in this workspace.
- No delegated Product Owner acceptance artifact or Team 00 staged-scope verification/local-commit artifact for `CF-W1-L3-PORT-01A` was found in the shared execution docs read during this pass.

## Exact Future File Reservations

Upstream baseline already assigned in a dedicated worktree:

- `CF-W1-L3-PORT-01A`
  - `backend/src/modules/portfolio-management/portfolio-management.service.ts`
  - `backend/src/modules/portfolio-management/portfolio-management.types.ts`
  - `backend/src/modules/portfolio-management/portfolio-management.md`
  - `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`

Next fresh readiness-consumer candidate after `PORT-01A` lands on clean `dev`:

- `CF-W1-L3-PORT-01B`
  - `backend/src/modules/watchlist-management/watchlist-management.service.ts`
  - `backend/src/modules/watchlist-management/watchlist-management.types.ts`
  - `backend/src/modules/watchlist-management/watchlist-management.md`
  - `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`

Downstream reliability child after accepted portfolio source lands on clean `dev`:

- `CF-W1-L3-INTEL-01`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
  - `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

Separate alert child remains single-writer:

- `CF-W1-L3-ALERT-01`
  - `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
  - `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
  - `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
  - `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
  - optional only if ownership-sensitive behavior is touched: `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`

## Exact Forbidden Scope

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities or shared DTO files
- shared frontend components
- package manifests
- generated files and generated types
- Data Quality Engine source or public-export edits
- providers, live data, startup/backfill, scheduler, Angel One, broker, paid/cloud, or telemetry scope
- frontend feature work
- broad UX work under this parent packet

## QA Handoff

Team 04 should treat this parent packet as routing guidance only.

Use:

- `04-qa/CF-W1-L3-DQ-01-qa-plan.md` as the cross-child policy baseline
- `04-qa/CF-W1-L3-PORT-01-qa-plan.md` for portfolio/watchlist DTO children
- `04-qa/CF-W1-L3-ALERT-01-qa-plan.md` for alert suppression

Required policy assertions:

1. DQ public service boundary only.
2. Missing DQ never becomes trusted from price/signal presence alone.
3. `LIMITED` stays passive-only.
4. stale, unsupported, scope-mismatched, provider-gap, `NOT_READY`, and `UNUSABLE` evidence fail closed for trusted/action-like use.
5. no direct financial advice wording.

Next fresh child QA focus after `PORT-01A` lands:

- `CF-W1-L3-PORT-01B` must preserve passive-only `LIMITED` watchlist semantics;
- missing DQ must not allow trusted `currentPrice` or `latestSignal` framing;
- no route/schema/shared-file/frontend spillover.

## Next Gate

Team 00 should keep `CF-W1-L3-DQ-01` as a parent routing packet only.

Recommended routing:

1. route `CF-W1-L3-PORT-01A` through delegated Product Owner acceptance;
2. require Team 00 staged-scope verification and scoped local commit for `CF-W1-L3-PORT-01A`;
3. once clean `dev` contains the accepted portfolio readiness DTOs, evaluate `CF-W1-L3-PORT-01B` as the next fresh Lane 3 readiness-consumer Ready candidate;
4. keep `CF-W1-L3-INTEL-01` blocked until `PORT-01A` source is accepted on clean `dev`;
5. keep alert-module work single-writer only while `CF-W1-L3-ALERT-01` and `CF-W1-L3-AUTH-03` contend for the same files.
