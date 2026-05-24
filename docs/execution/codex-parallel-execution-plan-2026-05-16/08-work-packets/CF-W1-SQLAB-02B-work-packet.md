# CF-W1-SQLAB-02B Work Packet

Date: 2026-05-24

## Work Item

`CF-W1-SQLAB-02B` - Signal Outcome Journal Durable Learning Memory

## State

Docs-only architecture readiness packet.

Not Ready for Implementation. Blocked by storage consent.

This packet exists to leave Team 00 with an exact future storage decision, not to promote application work. No source, test, schema, route, generated, package, or shared-file implementation is authorized by this pass.

## Owner / Lane / Module

- Architecture owner: Team 03 - Architecture Factory
- Future orchestration owner: Team 00
- Future QA owner: Team 04
- Future implementation lane: Lane 2
- Governing module: `signal-quality-lab`

## Files Changed In This Docs Pass

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SQLAB-02B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SQLAB-02B-durable-learning-memory-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SQLAB-02B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-SQLAB-02B-architecture-outbox.md`

## Current Allowed Files

Only the four docs above.

## Future Allowed Files After Explicit Storage Consent

### `CF-W1-SQLAB-02B1` only

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.repository.test.ts`

### `CF-W1-SQLAB-02B2` only after `02B1`

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `backend/src/modules/signal-quality-lab/index.ts` only if a stable export is required

## Current Forbidden Files

- all application source and tests
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- all frontend `signal-quality-lab` files
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/today-trade-review/**`
- package manifests
- providers, startup/backfill work, paid/cloud scope, broker scope, telemetry, or shared research-memory abstractions

## Required Future Behavior

When Team 00 later opens the storage gate, the first honest implementation child must:

- create one module-owned durable learning-memory row per `signalResultId + selectedHorizon + region + assetType`;
- keep Signal Quality Lab as the owner of durable memory;
- preserve measured outcome as the source of truth for lesson derivation;
- distinguish `EVALUATED`, `PENDING_FUTURE_DATA`, and `MISSING_PRICE_HISTORY`;
- keep language in research-support terms only.

## Explicitly Deferred

- any implementation in this pass
- route/controller/validation widening
- frontend/UI work
- generic notes or editable journaling
- Today Review ownership changes
- calibration ownership changes
- shared abstractions
- startup/backfill or provider work

## Dependencies

- `CF-W1-SQLAB-02A` remains the only no-schema child and must stay separately scoped.
- `CF-W1-SQLAB-02B1` cannot start until Team 00 records explicit consent for schema, migration, generated artifacts, and repository work.
- `CF-W1-SQLAB-02B2` cannot start until `02B1` exists and Team 00 sequences overlapping writer files under one writer.

## Stop Conditions

Stop and return to Team 00 if any future request under this packet tries to:

- open schema or repository files without consent;
- combine `02B1` and `02B2`;
- reuse `SignalResult`, `SignalCalibrationResult`, or `TodayReviewRun` as storage;
- widen into shared utilities, shared UI, route registries, or package changes;
- widen into advice, target-price, reward/risk, or Trade Plan semantics.

## QA Handoff

Team 04 can pick this up as a docs-only readiness review.

Review focus:

- storage-consent gate remains explicit;
- smallest honest future child is `02B1`, not a hidden no-schema slice;
- natural key is tight enough for idempotent update behavior;
- `02B2` remains additive and sequenced after `02B1`.

No command execution is authorized by this work packet.

## Next Gate

1. Team 00 decides whether to keep `CF-W1-SQLAB-02B` blocked or explicitly open `CF-W1-SQLAB-02B1`.
2. Team 04 may review the packet for QA completeness.
3. Team 06 remains blocked until Team 00 opens the storage gate and assigns a single writer.
