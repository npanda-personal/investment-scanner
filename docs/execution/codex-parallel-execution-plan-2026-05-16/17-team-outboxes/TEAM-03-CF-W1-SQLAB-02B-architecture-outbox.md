# TEAM-03 CF-W1-SQLAB-02B Architecture Outbox

Date: 2026-05-24

Team: Team 03 - Architecture Factory

Work item: `CF-W1-SQLAB-02B` - Signal Outcome Journal Durable Learning Memory

Status: Not Ready for Implementation. Storage-consent-gated.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SQLAB-02B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SQLAB-02B-durable-learning-memory-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SQLAB-02B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-SQLAB-02B-architecture-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SQLAB-02B-signal-outcome-journal-durable-learning-memory-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SQLAB-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SQLAB-02-work-packet.md`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/prisma/schema.prisma`

## Exact Evidence

- Signal Quality Lab still documents on-demand outcome measurement only and explicitly says no outcome persistence table exists in the MVP.
- `SignalQualityLabService.recalculate(...)` still returns `outcomesPersisted = false` with zero inserted and updated counts.
- `SignalQualityLabRepository` is still a stub, so there is no current module-owned durable learning-memory write path.
- `SignalOutcomeSet` types expose measured outcomes only; they do not expose a durable local memory identity.
- Prisma contains `SignalResult`, `SignalCalibrationResult`, and `TodayReviewRun`, but none are a `signal-quality-lab` owned durable learning-memory surface.

## Verdict

`CF-W1-SQLAB-02B` remains blocked.

Smallest honest future child:

- `CF-W1-SQLAB-02B1` - durable learning-memory storage foundation only

Natural key:

```text
signalResultId
selectedHorizon
region
assetType
```

Owner:

- `signal-quality-lab` only

## Future Allowed Files

### `CF-W1-SQLAB-02B1`

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.repository.test.ts`

### `CF-W1-SQLAB-02B2`

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `backend/src/modules/signal-quality-lab/index.ts` only if stable exports are required

## Future Forbidden Files Until Consent

- all other application source and tests
- all frontend `signal-quality-lab` files
- route registries
- shared backend utilities
- shared frontend components
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/today-trade-review/**`
- package manifests
- any shared research-memory abstraction

## Blockers

- Team 00 has not yet recorded explicit consent for:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/**`
  - generated Prisma client or generated types
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `CF-W1-SQLAB-02B2` must remain blocked behind `02B1`.
- One writer per file remains mandatory if Team 00 later opens the packet.

## Teams Ready To Pick This Up

- Team 00: ready to decide whether to keep the item blocked or open the storage-consent gate.
- Team 04: ready for docs-only QA completeness review.
- Team 06: not ready until Team 00 explicitly opens `CF-W1-SQLAB-02B1`.

## Next Gate

Team 00 orchestration decision only. Do not move `CF-W1-SQLAB-02B` to Ready-for-implementation without recorded storage consent.
