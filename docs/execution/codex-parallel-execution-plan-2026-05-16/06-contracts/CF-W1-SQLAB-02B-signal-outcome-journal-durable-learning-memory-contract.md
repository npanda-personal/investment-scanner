# CF-W1-SQLAB-02B Signal Outcome Journal Durable Learning Memory Contract

Date: 2026-05-18

## Status

Proposal-only packet ready.

This contract defines the future durable-learning boundary for Signal Quality Lab. It does not approve Prisma/schema edits, migrations, generated artifacts, repository changes, service changes, route changes, tests, builds, or frontend work.

## Contract Intent

Signal Quality Lab needs one honest durable learning-memory path for measured signal outcomes.

The persisted row must:

- stay module-owned by `signal-quality-lab`;
- remain grounded in measured outcome evidence;
- update idempotently for the same signal-result and selected horizon;
- preserve research-support wording.

The persisted row must not:

- become a generic note-taking system;
- compete with the measured outcome engine;
- reuse foreign persistence surfaces for convenience;
- introduce advice, target-price, or execution semantics.

## Required Storage Boundary

Future durable storage must be a dedicated `signal-quality-lab` owned persisted record, logically equivalent to `SignalOutcomeLearningMemory`.

This contract explicitly rejects storing durable learning memory in:

- `SignalResult`
- `SignalCalibrationResult`
- `TodayReviewRun`
- ad hoc JSON files
- shared utility caches
- frontend-only local state

## Minimum Natural Key Contract

The durable learning-memory record must be idempotent on this minimum key:

```text
signalResultId
selectedHorizon
region
assetType
```

This contract rejects keys that allow uncontrolled duplicates for the same measured signal-result and selected horizon.

## Minimum Durable Field Contract

Future durable storage must preserve, at minimum:

- `signalResultId`
- `instrumentId`
- `symbol`
- `region`
- `assetType`
- `selectedHorizon`
- `signalDirection`
- `signalModelVersion`
- `signalGeneratedAt`
- `outcomeStatus`
- `lessonClassification`
- `reasonSummary`
- `persistenceStatus`
- `forwardReturnPercent` when available
- `priceHistoryAvailable`
- `futureRowsAvailable`
- `startPriceDate`
- `latestAvailablePriceDate`
- `derivedAt`
- `createdAt`
- `updatedAt`

Optional snapshot JSON is allowed only as additive evidence, not as a replacement for the required queryable identity and state fields.

## Durable Semantics Contract

The durable row must support, at minimum:

- evaluated learning state;
- pending future-data learning state;
- missing price-history learning state;
- idempotent update for reruns on the same signal-result and selected horizon;
- re-derivation from measured outcomes without inventing new scoring or rule logic.

The measured outcome remains the source of truth.

The durable row is a persisted learning memory about that measured outcome.

## API Compatibility Contract

First durable child should reuse the current Signal Quality Lab routes:

- `POST /signals/quality/recalculate`
- `GET /signals/:instrumentId/outcomes`

Contract for the first durable child:

- no new route path;
- no route-registry change;
- no new required query params;
- no controller or validation widening by default;
- additive response changes only.

If future implementation needs manual save/edit behavior or separate journal-management routes, that exceeds this contract and must return to Team 00.

## `02A` Compatibility Contract

`CF-W1-SQLAB-02B` must build on the preview semantics defined by `CF-W1-SQLAB-02A`, not replace them with a second parallel object.

Required behavior:

- keep the `02A` additive preview shape or equivalent stable field path;
- widen persistence semantics from derived-only to durable-persisted when storage exists;
- preserve backward compatibility for consumers already reading measured outcomes.

## Exact Future Child Split Contract

### `CF-W1-SQLAB-02B1`

- schema/generated/repository durable-foundation child only;
- owns:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/**`
  - generated Prisma client or generated types
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
  - `backend/tests/modules/signal-quality-lab/signal-quality-lab.repository.test.ts`

### `CF-W1-SQLAB-02B2`

- service/API compatibility child only after `02B1`;
- owns:
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
  - `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- may reserve `backend/src/modules/signal-quality-lab/index.ts` only if new stable exports are required.

## Explicit Rejections In This Pass

Reject all of the following from `CF-W1-SQLAB-02B`:

- Prisma/schema edits now
- migrations now
- generated Prisma output now
- repository/service/source edits now
- route/controller/validation changes now
- frontend changes now
- shared UI or shared utility changes
- route registry changes
- signal-generation-engine source changes
- signal-calibration-engine source changes
- today-trade-review source changes
- package changes
- providers, startup/backfill, paid/cloud, broker, or telemetry scope

## Acceptance Criteria For This Contract

- module-owned durable storage boundary is explicit;
- minimum natural key is explicit;
- minimum durable fields are explicit;
- existing-route additive posture is explicit;
- `02A` compatibility is explicit;
- `02B1` and `02B2` split is explicit;
- schema/generated/repository consent gate remains blocked.

## QA Handoff Notes

Team 04 should review this contract for:

- natural-key completeness;
- durable-field completeness;
- additive API posture;
- strict rejection of foreign persistence reuse;
- sharp `02B1` versus `02B2` separation;
- no silent widening into routes, frontend, or cross-module adoption.

No command execution is authorized by this contract.
