# CF-W1-SQLAB-02B Durable Learning Memory Contract

Date: 2026-05-24

Owner: Team 03 - Architecture Factory

## Status

Not Ready for Implementation.

This contract is storage-consent-gated. It defines the future durable learning-memory boundary for `signal-quality-lab`, but it does not approve schema, migration, generated artifact, repository, service, route, test, or frontend work.

## Contract Intent

Signal Quality Lab should remain the owner of post-event learning interpretation and, if later approved, the owner of one durable local learning-memory row per measured signal-result and selected horizon.

This contract is for auditable research memory only. It must not become:

- a generic notes system;
- a cross-module research-memory abstraction;
- a target-price or reward/risk store;
- a Trade Plan surface;
- a direct-advice workflow.

## Required Ownership Boundary

Durable learning memory must stay inside `signal-quality-lab`.

Forbidden storage owners:

- `SignalResult`
- `SignalCalibrationResult`
- `TodayReviewRun`
- any shared JSON bucket owned by another module
- any file-based side store outside the current Prisma-backed application architecture

## Minimum Durable Identity Contract

One durable row per:

```text
signalResultId
selectedHorizon
region
assetType
```

Required idempotent behavior:

- reprocessing the same measured outcome updates the existing row;
- durable identity must not depend on lesson wording, reason text, or outcome snapshot details;
- duplicate durable rows for the same identity are a contract failure.

## Required Durable State Contract

Durable memory must distinguish at least:

- `EVALUATED`
- `PENDING_FUTURE_DATA`
- `MISSING_PRICE_HISTORY`

Durable lesson classification must remain bounded and research-support oriented. Acceptable first-pass labels include:

- `FAVORABLE_FOLLOW_THROUGH`
- `ADVERSE_FOLLOW_THROUGH`
- `FLAT_FOLLOW_THROUGH`
- `PENDING_FUTURE_DATA`
- `MISSING_PRICE_HISTORY`

`reasonSummary` must be concise, measured-outcome-based, and free of target-price, reward/risk, guarantee, or direct-advice language.

## Minimum Durable Field Contract

The first durable row must preserve, at minimum:

- identity and scope:
  - `signalResultId`
  - `instrumentId`
  - `symbol`
  - `region`
  - `assetType`
  - `selectedHorizon`
- provenance:
  - `signalDirection`
  - `signalModelVersion`
  - `signalRulesetVersion` when available
  - `signalGeneratedAt`
- durable learning memory:
  - `outcomeStatus`
  - `lessonClassification`
  - `reasonSummary`
- measured-outcome basis:
  - `forwardReturnPercent` when available
  - `priceHistoryAvailable`
  - `futureRowsAvailable`
  - `startPriceDate`
  - `latestAvailablePriceDate`
- audit:
  - `derivedAt`
  - `createdAt`
  - `updatedAt`

Optional JSON snapshot storage is acceptable later only as additive evidence, not as the sole durable identity or sole readable contract.

## Child Split Contract

### `CF-W1-SQLAB-02B1`

Storage foundation only.

Purpose:

- open schema, migration, generated, repository, and type/doc/test files needed to create the durable row;
- stop before service/read-path adoption.

Allowed future files:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.repository.test.ts`

### `CF-W1-SQLAB-02B2`

Service/read compatibility only after `02B1`.

Purpose:

- write durable memory through existing bounded Signal Quality Lab orchestration;
- surface durable-memory presence and state additively on existing read paths;
- preserve `CF-W1-SQLAB-02A` derived semantics where compatible.

Allowed future files:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `backend/src/modules/signal-quality-lab/index.ts` only if required for stable public exports

## Explicit Consent Gate

Before `CF-W1-SQLAB-02B1` starts, Team 00 must record explicit consent for:

1. `backend/prisma/schema.prisma`
2. `backend/prisma/migrations/**`
3. generated Prisma client or generated types
4. `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`

Without those approvals, no durable claim is honest and no implementation writer may start.

## Forbidden Before Consent

- all application source and tests outside this docs packet
- service/controller/router/validation changes
- frontend changes
- route registry changes
- shared backend utility changes
- shared frontend component changes
- package manifest changes
- foreign-module storage reuse
- startup/backfill flows
- paid/cloud, broker, or telemetry additions

## Stop Conditions

Stop and return to Team 00 if future routing attempts to:

- combine `02B1` and `02B2` into one pass;
- widen durable memory into editable notes;
- widen durable memory into Today Review or calibration ownership;
- introduce a shared research-memory abstraction;
- claim implementation readiness without explicit storage consent.

## Acceptance Criteria For This Contract

- `signal-quality-lab` remains the durable-memory owner.
- The minimum natural key is fixed.
- Idempotent update behavior is fixed.
- The bounded durable status set is fixed.
- The `02B1` / `02B2` split is fixed.
- Storage consent blockers remain explicit.
