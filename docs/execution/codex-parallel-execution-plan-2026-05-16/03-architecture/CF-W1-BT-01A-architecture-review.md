# CF-W1-BT-01A Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Characterization-only.

This child is bounded enough for docs/test prep, but it should not be promoted as a source-behavior change. Current evidence supports a characterization packet only: focused backend service tests plus module-doc clarification of existing Data Quality and history-completeness semantics.

## Evidence Inspected

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

## Current Source Findings

- `backtesting-strategy-lab` is the owning module for backtest runs and metrics, so this slice should stay inside that module's tests/docs boundary.
- The current DQ path is optional. When `config.useDataQualityFilter` is false or absent, `applyDataQualityFilter()` returns the full input universe unchanged and reports zero exclusions.
- When DQ filtering is enabled, the current defaults are still descriptive rather than fail-closed:
  - `excludeNotReady` defaults to `true`;
  - `includeLimited` is derived from `!config.excludeNotReady`;
  - `excludeMissingQuality` defaults to `false`;
  - `missingQualityBehavior` becomes `WARN_AND_PROCESS` unless `excludeMissingQuality` is explicitly true.
- Registered-strategy history completeness is already explicit:
  - `minimumBarsForTimeframe()` sets the threshold;
  - `availabilityStatus()` returns `INSUFFICIENT_HISTORY` when no instrument has enough history;
  - `availabilityStatus()` returns `PARTIAL` when some instruments are missing or short but at least one still qualifies.
- Existing tests already prove one DQ-enabled metadata path and one insufficient-history path, but they do not yet characterize:
  - the fail-open default when DQ filtering is disabled;
  - the missing-quality default warning/process behavior;
  - the limited/not-ready option pass-through;
  - the mixed history-completeness `PARTIAL` outcome.

## Architecture Decision

Prepare `CF-W1-BT-01A` as a characterization-only child.

The smallest bounded child is:

1. focused service-level characterization tests for current DQ and history behavior; and
2. module-doc clarification of what current behavior means for research-support trust.

No source-behavior change is approved in this packet. If focused characterization unexpectedly requires a service edit, stop and return the item to Team 00 / Architect as a new blocker instead of widening scope.

## Exact Future File Reservations

Allowed files for the characterization-only child:

- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`

## Explicitly Forbidden Files

- all application source files outside Team 00 promotion
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.routes.test.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.test.ts`
- all frontend source and UI tests
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- backend and frontend route registries
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- shared backend utilities
- shared frontend components
- package manifests
- provider, startup/backfill, live-data, paid/cloud, broker, and telemetry files

## Characterization Expectations

The focused tests should prove current behavior, not desired future policy:

- DQ filter disabled: full candidate universe continues through the simulation path.
- DQ filter enabled with defaults: the DQE call uses warning/process semantics for missing quality and does not claim fail-closed behavior.
- DQ filter enabled with `excludeNotReady: false`: current options permit limited readiness to remain processable.
- DQ filter enabled with `excludeMissingQuality: true`: current options switch missing-quality behavior to skip/exclude.
- Registered timeframe history completeness: no qualifying history returns `INSUFFICIENT_HISTORY`; mixed sufficient and insufficient history returns `PARTIAL`.
- Warning strings remain research-support oriented and do not read as direct advice.

## Sequencing And Shared-Writer Risk

- `CF-W1-BT-02` already has accepted branch-local work parked outside `dev` and reserved broader `backtesting-strategy-lab` files.
- This child is still safe as a concept, but Team 00 must not run it as a parallel writer on top of overlapping `backtesting-strategy-lab` files in shared `dev`.
- Safe sequencing options:
  - integrate or stack after the accepted `CF-W1-BT-02` work; or
  - assign one dedicated writer in a worktree that already contains the accepted BT-02 baseline.

This is a sequencing constraint, not a reason to widen the child.

## QA Planning Handoff For Team 04

Team 04 can prepare a focused QA plan now.

Required scenarios:

- DQ disabled baseline stays fail-open and is labeled as current behavior, not trusted fail-closed behavior.
- Default DQ-enabled path records warning/process missing-quality semantics.
- `excludeMissingQuality: true` changes the DQE call and the resulting filtered universe.
- `excludeNotReady: false` changes the DQE call to allow limited readiness inputs.
- Registered run with no qualifying history returns `INSUFFICIENT_HISTORY`.
- Registered run with mixed qualifying and non-qualifying history returns `PARTIAL`.
- Current warning strings stay in research-support terms such as warning, review, readiness, and reliability.
- No test introduces simulation-math, route, schema, or UI scope.

## Recommendation

- Ready-candidate: no
- Characterization-only: yes
- Blocked: no

Team 00 should route this as a characterization-only backend test/doc packet, not as a backtesting rewrite or trust-policy change.
