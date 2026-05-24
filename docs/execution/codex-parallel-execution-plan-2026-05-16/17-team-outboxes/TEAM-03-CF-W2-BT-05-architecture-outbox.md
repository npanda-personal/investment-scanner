# TEAM-03 CF-W2-BT-05 Architecture Outbox

Date: 2026-05-24

Team: Team 03 Architecture Factory

Mode: docs-only architecture readiness in main workspace

## Assignment

Prepare architecture readiness for `CF-W2-BT-05`, the next safe non-overlapping backtesting trust candidate while Today Review files remain reserved in Team 07's active worktree.

No application code, tests, Prisma schema, route registries, package manifests, generated files, `docs/AGENTS.md`, root `AGENTS.md`, or `docs/codex-agent-team-plan/**` were edited.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-BT-05-backtesting-rule-exit-invalidation-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-04-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-04-backtesting-run-current-proof-freshness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-04-work-packet.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/src/modules/strategy-framework/strategy-framework.evaluator.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `git branch --contains 8f984b1`
- `git branch --contains 2bd794f`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-BT-05-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-BT-05-backtesting-rule-exit-invalidation-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-BT-05-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-BT-05-architecture-outbox.md`

## Readiness Verdict

`ACCEPT / READY-CANDIDATE`

Team 03 accepts `CF-W2-BT-05` as a bounded architecture-ready candidate for Team 04 QA planning and later Team 00 Ready evaluation.

Ready criteria that pass:

- current source supports a no-schema backend-only evidence slice inside `backtesting-strategy-lab`
- comparable-run freshness can use existing saved-run timestamps
- exit counts already separate operational buckets from `TAKE_PROFIT`
- registered strategy evaluation already exposes rule-level exit identifiers in memory
- unsupported invalidation evidence can be surfaced honestly without inference
- no Today Review source overlap is required
- no schema, route, repository, controller, frontend, shared utility/UI, package, generated-file, provider/live, startup/backfill, or target/R:R/profit-target scope is needed

Remaining gates before implementation:

- Team 04 must prepare the QA plan
- Team 00 must promote the exact handoff
- implementation must stack on accepted `CF-W1-BT-04` commit `2bd794f`
- implementation must run in an isolated Team 06 backtesting worktree

## Exact Future File Reservations

Allowed only after Team 00 Ready promotion:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`

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
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/signal-quality-lab/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/market-data-foundation/**`
- `frontend/src/features/backtesting-strategy-lab/**`
- `frontend/src/features/today-review/**`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`
- `frontend/tests/ui/today-review*.spec.ts`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- providers, live data, startup/backfill, paid/cloud, broker, telemetry, or credentials
- `docs/AGENTS.md`
- root `AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Dependencies And Sequencing

Direct source dependency: current `backtesting-strategy-lab` evidence only.

Writer conflict:

- future writer set overlaps accepted parked `CF-W1-BT-04`
- current `dev` does not contain that accepted backtesting writer set

Team 00 sequencing rule:

- do not run `CF-W2-BT-05` in parallel with any other `backtesting-strategy-lab` implementation
- stack the implementation on accepted `CF-W1-BT-04` commit `2bd794f`
- keep Today Review source/files out of scope while Team 07 owns the active writer set

## Worktree Requirement

Worktree required: yes.

Recommended future branch/worktree:

- Branch: `codex/team06-strategy-signal/CF-W2-BT-05`
- Worktree: `../investment-scanner-worktrees/team06-CF-W2-BT-05`
- Base: accepted `CF-W1-BT-04` commit `2bd794f`

## Validation

No builds, tests, servers, Prisma commands, providers, UI smoke runs, live-data checks, commits, or pushes were run.

Validation was documentation review plus read-only source/test inspection.

## Risks

- Historical registered runs do not currently preserve stable documented exit rule codes, so partial evidence is the honest first-child limit.
- Dedicated invalidation proof is not modeled today; any implementation that infers it from stop loss, trailing stop, max hold, take profit, or human-readable reasons is a reject.
- Current workspace contains unrelated untracked docs from other teams; Team 03 did not stage, revert, or overwrite them.

## Next Gate

Team 04 QA planning for `CF-W2-BT-05`, then Team 00 Ready evaluation.
