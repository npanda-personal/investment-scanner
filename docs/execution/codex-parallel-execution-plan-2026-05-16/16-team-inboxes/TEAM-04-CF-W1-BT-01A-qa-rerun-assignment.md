# TEAM-04 Assignment - CF-W1-BT-01A QA Rerun

Date: 2026-05-18

Team: Team 04 - QA Factory

State: QA rerun after Team 06 corrected characterization rework

## Assignment

Verify `CF-W1-BT-01A` after Team 06 corrected the Backtesting DQ characterization to match current source behavior.

Do not implement application code. Do not edit source or tests. This is QA verification only.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-BT-01A`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A`
- Base: stacked on accepted parked `CF-W1-BT-02` commit `bb49ce2`

## Source Evidence

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-requirement.md`
- Corrected contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-contract.md`
- Corrected QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-01A-qa-plan.md`
- Corrected work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-01A-work-packet.md`
- Team 03 triage: `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W1-BT-01A-contract-triage-2026-05-18.md`
- Team 06 handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-01A-developer-handoff.md`

## Required QA Checks

Verify:

- implementation remains characterization-only;
- no `backtesting-strategy-lab` source file changed;
- changed implementation files are limited to:
  - `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- default enabled DQ path is characterized as:
  - `excludeNotReady = true`
  - `includeLimited = true`
  - excludes `NOT_READY` while allowing `LIMITED`
- explicit `excludeNotReady = false` is characterized only as flag pass-through and does not claim `NOT_READY` eligibility;
- no simulation math, scoring, route, DTO, persistence, frontend, schema, generated, shared, package, provider/live, paid/cloud, broker, telemetry, or unrelated branch behavior changed.

## Required Validation

Check memory/resource safety if practical, then run in the Team 06 worktree:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
npm.cmd run build
```

## Allowed Evidence Writes

You may write only these worktree docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-01A-qa-rerun.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-BT-01A-qa-rerun.md`

If needed, you may append to:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Expected Output

Return `ACCEPT` or `REJECT`.

If accepted, next gate is Team 10 review.

If rejected, include exact file/line evidence and whether the fix is bounded inside the existing Team 06 reservation.
