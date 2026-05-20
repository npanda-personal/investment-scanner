# TEAM-03 CF-W1-BT-03 Architecture Outbox

Date: 2026-05-19

Team: Team 03 Architecture Factory

Mode: docs-only architecture readiness in main workspace

## Assignment

Prepare architecture readiness for `CF-W1-BT-03` backtesting proof-basis / overfit guardrail, the current routed high investor/trader-value backtesting trust candidate.

No application code, tests, Prisma schema, route registries, package manifests, generated files, `docs/AGENTS.md`, `docs/codex-agent-team-plan/**`, or Team 02 queue docs were edited.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-03-backtesting-proof-basis-overfit-guardrail-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-03-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-03-backtesting-proof-basis-overfit-guardrail-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-03-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-03-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-backtesting-trade-risk.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-03-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-03-backtesting-proof-basis-overfit-guardrail-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-03-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-BT-03-architecture.md`

## Readiness Verdict

`ACCEPT/READY-CANDIDATE`

Team 03 accepts `CF-W1-BT-03` as a bounded architecture-ready candidate for Team 00 Ready evaluation.

Ready criteria that pass:

- requirement, architecture review, contract, work packet, and Team 04 QA plan exist
- current source exposes the needed module-local evidence: `availabilityStatus`, `numberOfTrades`, `dataCoveragePercent`, `benchmarkComparison`, `exitDiagnostics`, `realismWarnings`, and `calculationAudit`
- no schema, route, repository, controller, validation, module export, package, generated-file, shared UI, shared backend utility, provider, live-data, paid/cloud, broker, or telemetry scope is needed
- proof-basis fields can be additive under current metrics semantics
- saved-run list and selected-run detail can be normalized in the existing page without route, API client, hook, or navigation changes
- Product language remains research-support only and does not create direct advice or validated-certainty claims

Remaining gates before implementation:

- Team 00 must promote the exact handoff
- Team 00 must record the one-writer sequencing decision against `CF-W1-BT-02` and `CF-W1-BT-01A`
- implementation must run in an isolated Team 06 backtesting worktree

## Exact Future File Reservations

Allowed only after Team 00 Ready promotion:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

## Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `frontend/src/features/backtesting-strategy-lab/api/**`
- `frontend/src/features/backtesting-strategy-lab/hooks/**`
- `frontend/src/features/backtesting-strategy-lab/routes.tsx`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- providers, live data, startup/backfill, paid/cloud, broker, telemetry, or credentials
- Team 02-owned queue docs
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Dependencies And Sequencing

Direct source dependency: current `backtesting-strategy-lab` evidence only.

QA dependency: Team 04 plan exists at `04-qa/CF-W1-BT-03-qa-plan.md`.

Writer conflict:

- exact future writer set overlaps accepted/parked `CF-W1-BT-02`
- backend doc/test subset overlaps `CF-W1-BT-01A`

Team 00 sequencing rule:

- do not run `BT-03` in parallel with `BT-02`
- do not run `BT-03` over `BT-01A` doc/test edits in shared `dev`
- either stack on accepted `BT-02`, combine under one explicit backtesting writer, or wait for the overlapping writer set to clear

## Worktree Requirement

Worktree required: yes.

Recommended future branch/worktree:

- Branch: `codex/team06-strategy-signal/CF-W1-BT-03`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-BT-03`
- Base: accepted `CF-W1-BT-02` branch/commit if still parked outside `dev`; otherwise current `dev` after `BT-02` integration

## Validation

No builds, tests, servers, Prisma commands, providers, UI smoke runs, live-data checks, commits, or pushes were run.

Validation was documentation review plus read-only source/test inspection.

## Risks

- `BT-03` is not parallel-safe with `BT-02` or `BT-01A` unless Team 00 makes one explicit backtesting writer decision.
- The packet must disclose absent validation truthfully. Any implementation that fabricates holdout, walk-forward, parameter-sensitivity, optimizer, or Monte Carlo evidence is a reject.
- Current branch/worktree state has unrelated active docs changes from other teams; Team 03 did not stage, revert, or overwrite them.

## Next Gate

Team 00 Ready evaluation for one bounded `CF-W1-BT-03` handoff.
