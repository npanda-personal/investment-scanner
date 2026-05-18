# CF-W1-SQLAB-02B Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Proposal-only packet ready.

`CF-W1-SQLAB-02B` is not Ready for Implementation. Durable Signal Quality Lab learning memory still requires explicit Team 00 and Architect consent to open Prisma/schema, migrations, generated Prisma artifacts, and module-local repository work.

No honest no-schema durable child exists on current `dev`. `CF-W1-SQLAB-02A` remains the bounded derived-preview child and must stay closed. Durable value requires a module-owned persisted row.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-CF-W1-SQLAB-02B-architecture-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SQLAB-02B-signal-outcome-journal-durable-learning-memory-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SQLAB-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SQLAB-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SQLAB-02A-qa-plan.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.validation.test.ts`

## Current Source Findings

- `signal-quality-lab` still computes outcomes on demand only. The module doc explicitly says no `SignalOutcome` table exists and `recalculate` still reports `outcomesPersisted = false`.
- `SignalQualityLabRepository` is a stub and owns no persisted journal path today.
- Existing `SignalOutcomeSet` rows carry measured forward-return evidence, but no durable learning-memory identity, persistence timestamp, or idempotent update path.
- Prisma has no `signal-quality-lab` owned journal model. Reusing `SignalResult`, `SignalCalibrationResult`, or `TodayReviewRun` would cross ownership boundaries and mix unrelated lifecycles.
- Existing Signal Quality Lab routes are already sufficient for a bounded durable child shape:
  - `POST /signals/quality/recalculate` is the existing bounded batch orchestration entrypoint.
  - `GET /signals/:instrumentId/outcomes` is the existing read surface for per-signal measured outcomes.
- Current controller/router/validation code does not need to change for the first durable child if the implementation keeps the existing endpoints and adds only additive response fields.

## No-Schema Durable Determination

No.

Reason:

- `CF-W1-SQLAB-02A` already covers the only honest no-schema precursor: derived preview metadata on top of on-demand measurement.
- A durable learning memory claim requires a module-owned persisted row with idempotent update behavior.
- Reusing foreign persisted rows would violate module ownership.
- Introducing a file-based or ad hoc local store would bypass the current Prisma-backed modular-monolith architecture and would require a separate architecture decision.

## Architecture Decision

Keep the parent split explicit:

1. `CF-W1-SQLAB-02A`
   - derived journal preview only;
   - no persistence;
   - sequenced after accepted `CF-W1-SQLAB-01`.
2. `CF-W1-SQLAB-02B`
   - proposal-only durable learning-memory packet;
   - future implementation split required before any code starts.

Recommended future implementation split under `02B`:

### `CF-W1-SQLAB-02B1` - Durable Journal Storage Foundation

Purpose:

- add one module-owned persisted learning-memory model for Signal Quality Lab;
- enforce idempotent identity for one measured signal-result plus one selected horizon plus one market scope;
- keep storage ownership inside `signal-quality-lab`.

### `CF-W1-SQLAB-02B2` - Service/API Compatibility

Purpose:

- use the `02B1` storage foundation from existing `recalculate` and `outcomes` flows;
- preserve the additive journal-preview contract established by `02A`;
- upgrade persistence semantics without inventing a second parallel journal DTO.

Dependency:

- `CF-W1-SQLAB-02A` must remain the only preview/UI child and should be accepted or cleanly restacked before `02B2`, because `02A` and `02B2` overlap on `signal-quality-lab.service.ts`, `signal-quality-lab.types.ts`, `signal-quality-lab.md`, and the service test.

## Module-Owned Storage Boundary

Durable learning memory should be a `signal-quality-lab` owned persisted record, logically equivalent to a model such as `SignalOutcomeLearningMemory`.

The persisted row should store:

- identity of the measured signal result;
- selected horizon and market scope;
- current durable learning status;
- concise lesson classification and reason summary;
- enough measured-outcome snapshot data to explain what was persisted at derivation time;
- audit timestamps for creation and latest update.

It should not become:

- a free-form research note system;
- a second outcome engine;
- a calibration-result table;
- a Today Review snapshot clone;
- a strategy-rule history surface.

## Natural Key / Uniqueness Candidates

Minimum idempotent uniqueness candidate:

```text
signalResultId
selectedHorizon
region
assetType
```

Recommended supporting indexed fields:

- `instrumentId`
- `symbol`
- `signalGeneratedAt`
- `derivedAt`
- `outcomeStatus`

Rationale:

- `signalResultId` anchors the durable row to one measured signal source row.
- `selectedHorizon` is required because one signal can have multiple valid learning-memory rows across horizons.
- `region` and `assetType` preserve scoped auditability even though the source signal row already carries instrument identity.
- Repeated reprocessing of the same signal-result and selected horizon should update the same durable row rather than create duplicates.

## Minimum Durable Fields

The future persisted row should cover, at minimum:

- identity and scope:
  - `signalResultId`
  - `instrumentId`
  - `symbol`
  - `region`
  - `assetType`
  - `selectedHorizon`
- signal provenance:
  - `signalDirection`
  - `signalModelVersion`
  - `signalGeneratedAt`
- durable learning state:
  - `outcomeStatus`
  - `lessonClassification`
  - `reasonSummary`
  - `persistenceStatus`
- measured-outcome snapshot:
  - `forwardReturnPercent` when available
  - `priceHistoryAvailable`
  - `futureRowsAvailable`
  - `startPriceDate`
  - `latestAvailablePriceDate`
- derivation/audit fields:
  - `derivedAt`
  - `createdAt`
  - `updatedAt`

Optional but recommended:

- `outcomeSnapshotJson`
- `derivationVersion`
- `sourceOutcomeGeneratedAt`

## Repository / Service / API Impact

### Repository Impact

`02B1` requires real repository ownership, not the current stub:

- upsert one durable row by the natural key;
- fetch durable rows by `instrumentId` plus scope;
- fetch durable rows by `signalResultId` plus selected horizon for batch write/read compatibility.

### Service Impact

`02B2` requires `SignalQualityLabService` changes to:

- derive the durable journal payload from the existing measured outcome, not from new math;
- write/update durable rows from the existing bounded `recalculate(...)` workflow;
- attach durable learning memory to `outcomes(...)` results additively;
- preserve `CF-W1-SQLAB-01` trust framing and `CF-W1-SQLAB-02A` preview semantics.

### API Impact

First durable child can stay on current routes:

- keep `POST /signals/quality/recalculate` as the bounded write/update orchestration path;
- keep `GET /signals/:instrumentId/outcomes` as the read surface;
- keep route registry, router, controller, and validation untouched unless later implementation widens into manual save/edit behavior.

Additive API changes only:

- `recalculate` may truthfully change from `outcomesPersisted = false` to durable insert/update counts when `02B2` lands;
- outcome items may expose durable learning-memory metadata or promote the existing `02A` preview object from derived-only to durable-persisted semantics.

## Generated Type / Migration Impact

Durable value truly requires all of the following:

- `backend/prisma/schema.prisma`
- a new migration under `backend/prisma/migrations/**`
- generated Prisma client or generated types
- module repository code

This is not optional if the requirement is to be honest about durability.

## Exact Future Consent Gate

Before any application writer opens `CF-W1-SQLAB-02B1`, Team 00 and Architect must explicitly approve all of the following together:

1. `backend/prisma/schema.prisma`
2. `backend/prisma/migrations/**`
3. generated Prisma client or generated types
4. `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`

Required gate conditions:

- `CF-W1-SQLAB-02A` remains separately scoped and is not widened in place.
- No other `signal-quality-lab` source writer is active on overlapping files.
- One writer owns the full `02B1` or `02B2` file set at a time.

## Proposed Future File Reservations Only

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

If `02B2` needs to export new stable types from the module root, reserve this only at handoff time:

- `backend/src/modules/signal-quality-lab/index.ts`

## Exact Forbidden Files Before Consent

- all application source and tests outside the proposal docs
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- `backend/src/modules/signal-quality-lab/index.ts`
- `backend/tests/modules/signal-quality-lab/**`
- all frontend `signal-quality-lab` files
- backend and frontend route registries
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/today-trade-review/**`
- shared backend utilities
- shared frontend components
- package manifests
- providers, startup/backfill flows, paid/cloud, broker, or telemetry scope

## Team 04 QA Handoff Notes

Team 04 should review `CF-W1-SQLAB-02B` as proposal completeness only.

Review focus:

- confirm there is no honest no-schema durable child left after `02A`;
- confirm the module-owned storage boundary stays inside `signal-quality-lab`;
- confirm the natural key is tight enough to prevent duplicate durable rows;
- confirm `02B1` and `02B2` are separated sharply enough that schema/generated work cannot be smuggled into the service child;
- confirm route/controller/validation widening is not implied for the first durable child;
- reject any attempt to reuse `SignalResult`, `SignalCalibrationResult`, or `TodayReviewRun` as durable journal storage.

No executable QA command is in scope for this packet.

## Decision Packet Recommendation

No new Decision Packet is required from this pass.

Reason:

- the blocker is explicit consent for known high-risk files, not unresolved product ambiguity;
- this architecture packet already captures the required split, file reservations, and consent boundary.

Open a Decision Packet later only if Team 00 wants to choose between competing storage models outside this proposal boundary.

## Ready Recommendation

- `CF-W1-SQLAB-02B` is `proposal-only`.
- It is blocked from implementation until Team 00 and Architect open the schema/generated/repository consent gate.
- Do not move `CF-W1-SQLAB-02B` to Ready.
