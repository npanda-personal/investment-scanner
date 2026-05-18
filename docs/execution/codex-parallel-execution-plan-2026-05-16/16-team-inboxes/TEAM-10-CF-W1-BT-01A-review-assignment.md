# TEAM-10 Assignment - CF-W1-BT-01A Review

Date: 2026-05-18

Team: Team 10 - Review / Release

State: Review after Team 04 QA rerun ACCEPT

## Assignment

Review `CF-W1-BT-01A` after Team 06 corrected characterization rework and Team 04 QA rerun `ACCEPT`.

Do not implement application code. Do not edit source or tests.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-BT-01A`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A`
- Base: stacked on accepted parked `CF-W1-BT-02` commit `bb49ce2`

## Evidence To Review

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-requirement.md`
- Corrected contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-contract.md`
- Corrected QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-01A-qa-plan.md`
- Corrected work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-01A-work-packet.md`
- Team 03 triage: `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W1-BT-01A-contract-triage-2026-05-18.md`
- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-01A-developer-handoff.md`
- Team 04 QA rerun: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-01A-qa-rerun.md`

## Review Focus

Verify:

- the slice remains characterization-only;
- no `backtesting-strategy-lab` source file changed;
- tests/docs accurately characterize current source behavior:
  - default enabled DQ path uses `excludeNotReady = true`;
  - default enabled DQ path uses `includeLimited = true`;
  - default path excludes `NOT_READY` while allowing `LIMITED`;
  - explicit `excludeNotReady = false` is pass-through only and does not claim `NOT_READY` eligibility;
- accepted `CF-W1-BT-02` behavior is preserved in the stacked branch;
- no simulation math, scoring, route, DTO, persistence, frontend, schema, generated, shared, package, provider/live, paid/cloud, broker, telemetry, or unrelated branch behavior changed;
- validation evidence is adequate for a test/doc-only characterization child.

## Allowed Evidence Writes

You may write only:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-01A-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-10-CF-W1-BT-01A-review.md`

If needed, you may append to:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-10-review-release.md`

## Expected Output

Return `ACCEPT` or `REJECT`.

If accepted, next gate is Team 03 Architect Signoff.

If rejected, include exact file/line evidence and whether the fix is bounded inside the existing Team 06 reservation.
