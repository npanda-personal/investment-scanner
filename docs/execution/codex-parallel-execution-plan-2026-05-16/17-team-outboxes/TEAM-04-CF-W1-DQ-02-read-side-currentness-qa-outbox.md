# TEAM-04 QA Outbox - CF-W1-DQ-02 Read-Side Currentness

Date: 2026-05-25

## Work Item

`CF-W1-DQ-02-RS1` - Data Quality Engine read-side/public-contract currentness reconstruction.

## Verdict

`QA-PLAN READY`

Team 04 completed docs-only QA planning for the bounded DQE read-side packet. No executable QA was run. The packet is ready for Team 00 Ready evaluation only if the implementation stays inside the exact seven-file DQE writer set and preserves one-writer ownership.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-DQ-02-read-side-currentness-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-DQ-02-read-side-currentness-qa-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-04-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-DQ-02-residual-read-side-currentness-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-DQ-02-read-side-currentness-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-DQ-02-read-side-currentness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-DQ-02-read-side-currentness-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-DQ-02A-qa-plan.md`

## Scope Summary

The QA plan is aligned to one truthful currentness story across:

- `summary()`
- `list()`
- `diagnostics()` when a persisted row already exists
- `getLatestEvaluationForInstrument()`
- `getEvaluationsForInstruments()`

Required scenario coverage is explicitly planned for:

- current completed session
- current finalization pending
- stale missed completed session
- missing latest price
- session evidence unavailable
- provider-gap blocked
- contradictory evidence
- fail-closed propagation
- summary counts derived from the same reconstructed per-row basis as row/detail/latest-helper reads

Current source evidence supports the packet shape Team 03 described:

- repository `summary()` still derives stale counts from `dataGaps` string matching
- service `diagnostics()` still returns persisted rows directly when present
- latest-helper reads still proxy repository rows directly
- types still lack a read-side currentness contract

## Recommended Test Commands

Recommend, but do not run in this planning pass:

```powershell
cd backend
npm.cmd test -- data-quality-engine.repository.test.ts data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand
```

```powershell
cd backend
npm.cmd run build
```

## Exact Reject Conditions

Reject the future implementation handoff if any of the following is true:

- scope widens outside:
  - `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.md`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`
- any controller/router/route-registry/schema/generated/package/shared-utility/Market Data/frontend/provider/startup/backfill scope is touched
- `summary`, `list`, `diagnostics`, `getLatestEvaluationForInstrument()`, and `getEvaluationsForInstruments()` do not tell the same currentness story for the same instrument/evidence
- summary counts are still derived from string matching or a separate heuristic instead of the same reconstructed per-row basis used by row/detail/latest-helper reads
- currentness is inferred from persisted stale text alone when authoritative read-time evidence is available
- missing, blocked, unavailable, or contradictory evidence is allowed to imply freshness
- fail-closed propagation is weakened for helper consumers or eligibility filtering
- durable stored currentness fields, schema changes, route widening, or Market Data source edits are introduced

## Blockers

- No Team 04 planning blocker remains.
- Executable QA remains blocked until Team 00 promotes one exact implementation handoff for the reserved DQE files only.
- If implementation proves truthful reconstruction needs Market Data writers, schema/storage widening, route/controller changes, or shared/package/generated scope, the packet must stop and return to Team 00 / Architect as a decision/escalation path instead of widening silently.

## Tests Run

- none

## Tests Skipped

- `npm.cmd test -- data-quality-engine.repository.test.ts data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand`
- `npm.cmd run build`

## Skipped-Test Reason

- docs-only QA planning pass; no implementation handoff exists and the assignment explicitly forbids running tests/builds/services/providers/Prisma/UI smoke/live data

## Next Gate For Team 00

- Evaluate `CF-W1-DQ-02-RS1` for Ready promotion as one bounded `data-quality-engine` child only
- Copy the exact seven-file DQE writer set into the Ready record
- Reserve one DQE writer for the full repository/service/types/doc/test set in a single pass
- Keep the packet out of Ready if implementation needs Market Data writers, route widening, schema/storage, shared/package/generated scope, or frontend work
