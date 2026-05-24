# CF-W1-SQLAB-02B Architecture Review

Date: 2026-05-24

Owner: Team 03 - Architecture Factory

## Status

Not Ready for Implementation.

This is a docs-only readiness packet for durable Signal Quality Lab learning memory. It is explicitly storage-consent-gated. No Prisma/schema, migration, generated artifact, repository, service, controller, router, validation, frontend, test, package, or shared-file implementation work is authorized by this pass.

`CF-W1-SQLAB-02A` remains the only honest no-schema child. `CF-W1-SQLAB-02B` stays blocked until Team 00 deliberately records schema/repository/generated approval for a `signal-quality-lab` owned persistence slice.

## Evidence Inspected

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

## Current Source Findings

- `signal-quality-lab` still measures outcomes on demand. The module doc says no outcome persistence table exists in the MVP.
- `SignalQualityLabService.recalculate(...)` still returns `inserted = 0`, `updated = 0`, and `outcomesPersisted = false`, which confirms there is no current durable journal write path.
- `SignalQualityLabRepository` is still a stub and does not own any durable learning-memory row.
- `SignalOutcomeSet` and related types expose measured outcomes, maturity, and missing-history evidence only. They do not expose a durable learning-memory identity or persistence timestamp.
- Prisma currently has `SignalResult`, `SignalCalibrationResult`, and `TodayReviewRun`, but no `signal-quality-lab` owned durable learning-memory model. Reusing those foreign models would cross module ownership.

## Architecture Decision

Keep durable learning memory owned by `signal-quality-lab`.

Do not invent a shared research-memory abstraction. Do not reuse `SignalResult`, `SignalCalibrationResult`, `TodayReviewRun`, or any other foreign row as storage for post-event learning.

The smallest honest future implementation child is:

### `CF-W1-SQLAB-02B1` - Durable Learning Memory Storage Foundation

Purpose:

- add one module-owned durable row for post-event learning memory;
- establish the idempotent natural key;
- keep all storage ownership inside `signal-quality-lab`;
- stop before service/read-path widening.

Only after `02B1` exists should Team 00 open:

### `CF-W1-SQLAB-02B2` - Durable Read/Write Compatibility

Purpose:

- consume the `02B1` storage row from existing Signal Quality Lab flows;
- attach durable-memory presence and state additively to current read surfaces;
- preserve the derived semantics already defined by `CF-W1-SQLAB-02A`.

## Natural Key And Idempotency Shape

Minimum durable identity:

```text
signalResultId
selectedHorizon
region
assetType
```

Idempotency rule:

- one durable memory row per measured signal-result plus selected horizon plus market scope;
- repeated processing of the same measured result must update that row;
- derived fields such as `reasonSummary`, lesson classification, or outcome snapshot are update payload, not identity.

Rationale:

- `signalResultId` anchors the row to an already-persisted signal source record;
- `selectedHorizon` is required because one signal can legitimately produce multiple horizon-specific learning rows;
- `region` and `assetType` keep the stored memory auditable to the market scope contract even if the source signal already carries instrument identity.

## Minimum Durable Field Set

The first durable row should cover, at minimum:

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
  - `signalRulesetVersion` when available
  - `signalGeneratedAt`
- durable learning state:
  - `outcomeStatus` with bounded states:
    - `EVALUATED`
    - `PENDING_FUTURE_DATA`
    - `MISSING_PRICE_HISTORY`
  - `lessonClassification`
  - `reasonSummary`
- measured-outcome snapshot:
  - `forwardReturnPercent` when available
  - `priceHistoryAvailable`
  - `futureRowsAvailable`
  - `startPriceDate`
  - `latestAvailablePriceDate`
- audit fields:
  - `derivedAt`
  - `createdAt`
  - `updatedAt`

Optional but acceptable later:

- `sourceOutcomeGeneratedAt`
- `derivationVersion`
- `outcomeSnapshotJson`

## Explicit Storage Consent Gate

Do not open implementation unless Team 00 later records explicit approval for all of:

1. `backend/prisma/schema.prisma`
2. `backend/prisma/migrations/**`
3. generated Prisma client or generated types
4. `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`

This consent gate exists because there is no honest way to claim durability inside the current source baseline without opening those files.

## Future Allowed Files

### Allowed future files for `CF-W1-SQLAB-02B1`

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.repository.test.ts`

### Allowed future files for `CF-W1-SQLAB-02B2`

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `backend/src/modules/signal-quality-lab/index.ts` only if stable public exports are required

## Forbidden Until Consent

- all application source and tests outside the future allowed file sets above
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
- providers, startup/backfill flows, paid/cloud services, broker scope, telemetry, or any shared research-memory abstraction

## Stop Conditions

Stop and return to Team 00 if future work requires any of the following before explicit storage consent is recorded:

- Prisma/schema or migration edits;
- generated Prisma output;
- repository implementation;
- service/controller/router/validation changes;
- frontend or shared UI work;
- reuse of foreign persistence surfaces;
- widening into Today Review, calibration ownership, alerts, strategy revision history, or generic research notes.

Also stop if Team 00 attempts to merge `02B1` and `02B2` into one writer pass. The split is the control.

## Readiness Verdict

`CF-W1-SQLAB-02B` is not Ready.

What is ready:

- Team 00 can make a storage-consent decision with an exact file gate.
- Team 04 can review the packet for QA completeness.

What is not ready:

- Team 06 or any implementation writer starting application changes.
