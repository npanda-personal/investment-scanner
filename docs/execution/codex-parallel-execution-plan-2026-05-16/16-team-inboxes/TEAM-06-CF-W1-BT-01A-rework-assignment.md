# TEAM-06 Assignment - CF-W1-BT-01A Rework

Date: 2026-05-18

Team: Team 06 - Strategy / Signal / Risk

State: Active rework assignment

## Assignment

Rework `CF-W1-BT-01A` after Team 10 rejected the prior characterization as inaccurate against current source behavior.

This is a bounded test/doc characterization rework only. Do not implement application behavior changes.

You are not alone in the codebase. Work only in the dedicated Team 06 worktree and do not revert accepted `CF-W1-BT-02` edits.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-BT-01A`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A`
- Base: accepted parked `CF-W1-BT-02` branch commit `bb49ce2`

## Source Evidence

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-requirement.md`
- Corrected contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-contract.md`
- Corrected QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-01A-qa-plan.md`
- Corrected work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-01A-work-packet.md`
- Team 03 triage: `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W1-BT-01A-contract-triage-2026-05-18.md`
- Team 10 review rejection: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-01A-review.md`

## Allowed Files

You may edit only these files in the Team 06 worktree:

- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-01A-developer-handoff.md`

## Forbidden Files

Do not edit:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- any other backtesting source file
- Prisma schema or migrations
- generated files
- backend or frontend route registries
- frontend source or UI tests
- shared backend utilities
- shared frontend UI
- package manifests
- provider, live-data, startup/backfill, paid/cloud, broker, telemetry, or credentials files
- unrelated accepted branch work

## Required Correction

Characterize current source behavior accurately:

- The default enabled DQ path passes `excludeNotReady = true`.
- The default enabled DQ path currently passes `includeLimited = true` because source computes `includeLimited: !config.excludeNotReady`.
- This default path excludes `NOT_READY` while allowing `LIMITED`.
- Explicit `excludeNotReady = false` is only flag pass-through evidence and must not claim that `NOT_READY` rows become eligible.
- The child must stay framed as current behavior characterization, not a global backtesting fail-closed policy.

Remove or revise any prior test/doc wording that says the default no-override path uses `includeLimited = false`.

## Required Validation

Check memory/resource safety if practical, then run in the worktree:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
npm.cmd run build
```

If a command cannot run, record the exact blocker, skipped command, risk, and next owner.

## Expected Handoff

Update:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-01A-developer-handoff.md`

Report:

- exact files changed;
- exact behavior characterized;
- tests/builds run and results;
- forbidden files confirmed untouched;
- remaining risks;
- whether Team 04 QA rerun can proceed.

Next gate: Team 04 QA rerun.
