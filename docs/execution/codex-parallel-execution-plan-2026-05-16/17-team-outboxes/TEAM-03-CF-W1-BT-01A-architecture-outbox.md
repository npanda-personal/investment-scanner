# TEAM-03 CF-W1-BT-01A Architecture Outbox

Date: 2026-05-18

Team: Team 03 - Architecture Factory

Work item: `CF-W1-BT-01A` backtesting DQ fail-closed characterization

Status: Characterization-only

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-BT-01A-architecture-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-upstream-dependency.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-decision.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/module-ownership-map.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-backtesting-trade-risk.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/TEAM-06-lane2-dq-fail-closed-audit-2026-05-17.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`

## Exact Evidence

- The current service still bypasses DQ filtering entirely when `useDataQualityFilter` is false or absent.
- When filtering is enabled, current defaults remain descriptive rather than fail-closed: missing quality defaults to `WARN_AND_PROCESS`, and limited readiness can still be caller-allowed through `excludeNotReady=false`.
- Registered-history completeness is already explicit through current `INSUFFICIENT_HISTORY` and `PARTIAL` outcomes.
- Existing service tests cover one DQ-enabled metadata path and one insufficient-history path, but they do not yet characterize the current fail-open default, missing-quality defaults, limited-readiness option pass-through, or mixed-history `PARTIAL` outcome.
- `CF-W1-BT-02` is already accepted and locally committed outside `dev`, with a broader reserved writer set over the same module. That makes sequencing necessary even though this child is much smaller.

## Exact Future File Reservation

Characterization-only writer set:

- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`

## Forbidden

- all `backtesting-strategy-lab` source files
- route tests and validation tests
- all frontend files
- Prisma/schema/migrations
- generated files
- route registries
- shared backend utilities
- shared frontend components
- `data-quality-engine`, `market-data-foundation`, `strategy-framework`, and `trade-plan-risk-engine` source
- package/provider/live-data/startup/backfill/paid-cloud/broker/telemetry files

## QA Handoff

Team 04 should plan only current-behavior characterization:

1. DQ-disabled fail-open baseline.
2. DQ-enabled default missing-quality warning/process semantics.
3. `excludeMissingQuality=true` skip/exclude behavior.
4. `excludeNotReady=false` limited/not-ready option pass-through.
5. Registered `INSUFFICIENT_HISTORY` and mixed-history `PARTIAL` outcomes.
6. Research-support warning wording remains intact.

## Next Gate

Team 00 review and sequencing.

Recommended routing:

1. keep `CF-W1-BT-01A` as a characterization-only child;
2. do not promote it as a source-behavior rewrite;
3. if Team 00 wants execution, sequence it behind accepted `CF-W1-BT-02` branch state or stack both under one writer in a dedicated worktree.
