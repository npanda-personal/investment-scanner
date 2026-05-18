# TEAM-03 CF-W1-BT-01A Triage Outbox

Date: 2026-05-19

Team: Team 03 - Architecture Factory

Work item: `CF-W1-BT-01A` backtesting DQ fail-closed characterization

State / mode: docs-only review-reject triage

Decision: `Rework allowed in reserved test/doc scope`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W1-BT-01A-contract-triage-2026-05-18.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-BT-01A-triage.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-CF-W1-BT-01A-triage-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-BT-01A-architecture-outbox.md`
- `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A\docs\execution\codex-parallel-execution-plan-2026-05-16\18-integration-queue\CF-W1-BT-01A-review.md`
- `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A\backend\src\modules\backtesting-strategy-lab\backtesting-strategy-lab.service.ts`
- `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A\backend\tests\modules\backtesting-strategy-lab\backtesting-strategy-lab.service.test.ts`
- `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A\backend\src\modules\backtesting-strategy-lab\backtesting-strategy-lab.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`

## Behavior Changed

No application behavior changed.

Authority docs now characterize the current source honestly:

- no-override DQ path uses `includeLimited = true`, not `false`;
- the same path still keeps `excludeNotReady = true`;
- explicit `excludeNotReady = false` is documented as flag pass-through only, not as proof that `NOT_READY` becomes eligible.

## Contracts Changed

Yes. The contract, QA plan, and work packet were corrected to match the current source path and current DQE semantics.

## Tests Run

None.

## Tests Skipped

- backend tests
- backend build
- frontend/UI checks
- local server or provider validation

Skipped because this was a docs-only triage pass.

## Risks

- The current source still has surprising DQ flag coupling: omitting `excludeNotReady` results in `includeLimited = true` while `excludeNotReady = true`.
- If a later owner wants the true default behavior to be stricter, that will require a separate source-change packet outside this child.
- Team 06 and Team 04 still need to respect the existing `CF-W1-BT-02` sequencing constraint on the shared backtesting test/doc files.

## Allowed Files For Rework

Team 06 reserved rework scope:

- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`

## Forbidden Files

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- repository/controller/router/validation/module/export files
- route tests and validation tests
- all frontend files
- Prisma/schema/migrations/generated files
- route registries
- shared backend utilities and shared frontend components
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- package/provider/live-data/startup/backfill/paid-cloud/broker/telemetry files

## Next Routing

1. Team 06: rework only the reserved backtesting test/doc files so the characterization test and module doc match the true no-override call shape.
2. Team 04: rerun QA against the corrected characterization contract after Team 06 rework.
3. Team 00: keep sequencing behind accepted parked `CF-W1-BT-02` branch state or assign one dedicated writer in a worktree containing that accepted baseline.

## Product Owner Action

Not required for this rework.

Required only if Product Owner wants a stricter runtime default than the current source and therefore wants a new source-change child.
