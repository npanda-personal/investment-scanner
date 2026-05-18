# TEAM-03 Assignment - CF-W1-BT-01A Review-Reject Triage

Date: 2026-05-18

Team: Team 03 - Architecture Factory

Mode: docs-only architecture / contract triage.

## Work Item

`CF-W1-BT-01A` - Backtesting DQ fail-closed characterization.

## Trigger

Team 10 rejected the current implementation because the contract says the enabled no-stricter-overrides DQ call shape should characterize `includeLimited = false`, while current source computes `includeLimited: !config.excludeNotReady`, which becomes `true` when `excludeNotReady` is omitted.

## Source Evidence

- Main contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-contract.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-01A-qa-plan.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-01A-work-packet.md`
- Review reject evidence in worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A\docs\execution\codex-parallel-execution-plan-2026-05-16\18-integration-queue\CF-W1-BT-01A-review.md`
- Current source to inspect read-only: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A\backend\src\modules\backtesting-strategy-lab\backtesting-strategy-lab.service.ts`
- Current test/doc implementation to inspect read-only:
  - `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A\backend\tests\modules\backtesting-strategy-lab\backtesting-strategy-lab.service.test.ts`
  - `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A\backend\src\modules\backtesting-strategy-lab\backtesting-strategy-lab.md`

## Allowed Writes

Main workspace only:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W1-BT-01A-contract-triage-2026-05-18.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-BT-01A-triage.md`

Optional only if the correct outcome is to revise documentation gates without source changes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-01A-work-packet.md`

## Forbidden Scope

- no application source or test edits;
- no worktree source/test edits;
- no Prisma/schema/generated files;
- no route registries;
- no shared utilities/UI;
- no package manifests;
- no provider/live/startup/backfill, paid/cloud, broker, or telemetry.

## Required Output

Return one of:

- `Rework allowed in reserved test/doc scope`: current source behavior should be characterized honestly and contract/QA/work-packet can be corrected without source changes.
- `Source change required`: correcting the intended default requires `backtesting-strategy-lab.service.ts`, which is outside `CF-W1-BT-01A` and must become a separate Team 00 Ready/consent decision.

Include exact rationale, file reservations, forbidden files, and next Team 06 / Team 04 routing if rework is allowed.
