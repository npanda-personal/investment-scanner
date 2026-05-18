# CF-W1-BT-01A Contract Triage - 2026-05-18

Date: 2026-05-19

Owner: Team 03 - Architecture Factory

Work item: `CF-W1-BT-01A`

Decision: `Rework allowed in reserved test/doc scope`

## Triage Question

Team 10 rejected the current `CF-W1-BT-01A` worktree because the authority docs required a no-override DQ call shape of `includeLimited = false`, while the current source still computes:

- `includeLimited: !config.excludeNotReady`
- `excludeNotReady: config.excludeNotReady ?? true`

The triage question was whether this mismatch requires a forbidden service change or whether the characterization packet can be corrected honestly inside the reserved test/doc scope.

## Evidence Inspected

Authority docs in the main workspace:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-CF-W1-BT-01A-triage-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-BT-01A-architecture-outbox.md`

Team 10 review and Team 06 worktree evidence read-only:

- `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A\docs\execution\codex-parallel-execution-plan-2026-05-16\18-integration-queue\CF-W1-BT-01A-review.md`
- `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A\backend\src\modules\backtesting-strategy-lab\backtesting-strategy-lab.service.ts`
- `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A\backend\tests\modules\backtesting-strategy-lab\backtesting-strategy-lab.service.test.ts`
- `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A\backend\src\modules\backtesting-strategy-lab\backtesting-strategy-lab.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`

## Findings

1. Team 10's reject is correct.
   The old contract, QA plan, and work packet all required a no-override DQ call shape with `includeLimited = false`, but the current backtesting source still sends `includeLimited: !config.excludeNotReady`. When `excludeNotReady` is omitted, that evaluates to `true`, not `false`.

2. This is a characterization mismatch, not a source-change blocker.
   The current source can be characterized honestly without touching `backtesting-strategy-lab.service.ts`.

3. Current DQE semantics make the no-override path coherent enough to document.
   `data-quality-engine.service.ts` derives allowed statuses from `includeLimited`. With `includeLimited = true`, the allowed-status path is `READY` plus `LIMITED`. The same call also keeps `excludeNotReady = true`, so `NOT_READY` remains excluded.

4. `excludeNotReady = false` does not prove a broader default policy.
   Under the current DQE allowed-status wiring, flipping `excludeNotReady` to `false` is only a flag pass-through. It does not by itself make `NOT_READY` eligible because the allowed-status path still excludes `NOT_READY`.

## Conclusion

`CF-W1-BT-01A` does not need a forbidden service edit to recover from the reject.

The correct recovery is:

- revise the authority docs to describe the real no-override call shape honestly;
- reroute Team 06 to rework only the reserved test/doc files so the tests and module doc match the current source;
- reroute Team 04 to QA against the corrected characterization contract.

If Product or Architecture instead wants the true no-override runtime behavior to become `includeLimited = false`, that is a separate source-change decision outside this child and outside the reserved Team 06 writer set.

## Authority Doc Corrections Applied

Updated in main workspace:

- `06-contracts/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-contract.md`
- `04-qa/CF-W1-BT-01A-qa-plan.md`
- `08-work-packets/CF-W1-BT-01A-work-packet.md`

The corrections now state:

- default enabled DQ characterization is `excludeNotReady = true` and `includeLimited = true`;
- that no-override combination is descriptive only and still excludes `NOT_READY`;
- explicit `excludeNotReady = false` is a pass-through assertion only and must not be described as making `NOT_READY` eligible.

## Team Routing

### Team 06

Allowed rework scope remains:

- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`

Required rework:

- update the default DQ characterization test to exercise the real no-override path;
- update assertions and module-doc wording to match `includeLimited = true` on the no-override path;
- keep the packet characterization-only.

### Team 04

Rerun QA only after Team 06 rework against the corrected authority docs.

QA should verify:

- no-override call shape is characterized honestly;
- explicit `excludeNotReady = false` is treated only as flag pass-through;
- no claim is made that `NOT_READY` becomes eligible under the current source.

### Team 00

Keep the existing sequencing constraint:

- this child still needs to stay behind the accepted parked `CF-W1-BT-02` backtesting branch state or under one dedicated writer in a worktree containing that baseline.

## Forbidden Files

Still forbidden for this child:

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

## Product Owner Action

Product Owner action is not required for the characterization rework.

Product Owner action is required only if the desired outcome changes from "honest characterization of current source" to "change the backtesting default DQ behavior so the no-override path really uses `includeLimited = false`."
