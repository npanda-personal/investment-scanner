# TEAM-04 Assignment - CF-W1-SIG-02 QA Verification

Date: 2026-05-18

Team: Team 04 - QA Factory

State: QA verification after Team 06 implementation handoff

## Assignment

Verify `CF-W1-SIG-02` after Team 06 implementation in the stacked Signal Generation worktree.

Do not implement application code. Do not edit source or tests.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-SIG-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SIG-02`
- Base: accepted parked `CF-W1-SIG-TRIGGER-02A` commit `788c237`

## Evidence To Review

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-02-canonical-trigger-evidence-compatibility-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SIG-02-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SIG-02-canonical-trigger-evidence-compatibility-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SIG-02-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SIG-02-qa-plan.md`
- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SIG-02-developer-handoff.md`
- Team 06 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-SIG-02-outbox.md`

## Required QA Checks

Verify:

- `SignalResultDto.triggerContract` remains the single canonical trigger packet;
- no sibling trigger packet was introduced;
- current non-legacy rows have explicit field provenance and packet-origin semantics;
- persisted `created_at` and `updated_at` are surfaced from owned Signal Result evidence;
- linked generation-run status/timing is surfaced only from repository-backed run evidence;
- source-price-date vs source-data-date timestamp semantics are explicit;
- `latestForInstrument()` fallback-created responses are labeled request-local;
- `asset_class`, `region`, `strategy_id`, and `strategy_version` remain compatibility-only where applicable;
- `trigger_price`, `timeframe`, rule ids, and richer lifecycle status remain unavailable;
- strict DQ trusted read/run/latest behavior remains fail-closed;
- no schema, generated, route, controller, router, validation, module, index, config, frontend, downstream, shared, package, provider/live, paid/cloud, broker, telemetry, or credential scope was introduced.

## Required Validation

Check memory/resource safety if practical, then run:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.repository.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd run build
```

## Allowed Evidence Writes

You may write only:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SIG-02-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-SIG-02-qa-verification.md`

If needed, you may append to:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Expected Output

Return `ACCEPT` or `REJECT`.

If accepted, next gate is Team 10 review.

If rejected, include exact evidence and whether the fix is bounded inside the existing Team 06 reservation.
