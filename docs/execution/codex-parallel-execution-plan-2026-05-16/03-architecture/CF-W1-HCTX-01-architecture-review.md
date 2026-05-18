# CF-W1-HCTX-01 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready candidate for a bounded backend-first child. Not yet promoted for implementation.

This refresh narrows `CF-W1-HCTX-01` to a four-file `historical-context-snapshots` writer set. The first child stays additive, no-schema, no-route, no-provider, no-shared, and no-frontend.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `10-requirements/CF-W1-HCTX-01-historical-context-explainability-requirement.md`
- `10-requirements/next-top-10-candidates.md`
- `10-requirements/top-10-ready-candidates.md`
- `03-architecture/CF-W1-HCTX-01-architecture-review.md`
- `06-contracts/CF-W1-HCTX-01-historical-context-explainability-contract.md`
- `08-work-packets/CF-W1-HCTX-01-work-packet.md`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- `backend/src/modules/historical-context-snapshots/index.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.routes.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.repository.test.ts`
- `frontend/src/features/historical-context-snapshots/types.ts`
- `frontend/src/features/historical-context-snapshots/components/HistoricalContextSnapshotsPage.tsx`

## Current Source Findings

- `historical-context-snapshots.service.lookup(...)` already owns the response assembly for `dataStatus` and `gaps[]`, so additive explainability belongs in this service layer.
- `historical-context-snapshots.repository.lookup(...)` already returns nearest persisted rows on or before the requested date inside the caller-provided lookback. Each row carries `snapshotDate`, and several rows already carry `source` and `dataStatus`.
- Current `SnapshotLookupResult` exposes only `market`, `sector`, `country`, `smartMoney`, `dataQuality`, `dataStatus`, and `gaps[]`. Requested date, selected snapshot date, lag days, scope, and per-slice provenance are still implicit.
- Existing service tests already cover partial and metadata-gap flows. The smallest safe first child is to extend the service DTO and service test, not to widen into repository, route, or frontend files.
- The current frontend page renders only `dataStatus`, chips, and `gaps[]`. That consumer gap is real, but frontend implementation is not required for the first backend-first child and is explicitly deferred.

## Module Boundary Review

`historical-context-snapshots` owns this requirement.

Reasons:

- lookup selection and nearest-snapshot provenance are defined inside this module;
- this module already owns metadata-gap treatment for sector lookup;
- downstream modules such as Signal Calibration and Signal Quality consume snapshot evidence and should not duplicate explanation logic.

Upstream modules remain evidence producers only:

- `market-context-intelligence`
- `smart-money-intelligence`
- `market-data-foundation` for data-quality snapshot inputs only

Downstream consumers remain read-only:

- `signal-calibration-engine`
- future `historical-context-snapshots` frontend consumers

The first child must not edit upstream or downstream module code.

## Architecture Decision

Prepare `CF-W1-HCTX-01` as one bounded `historical-context-snapshots` child that enriches the lookup DTO with persisted-evidence provenance derived from existing lookup rows.

The first implementation should introduce stable additive metadata semantically equivalent to:

```ts
type SnapshotLookupReasonCode =
  | 'PERSISTED_EXACT_DATE'
  | 'PERSISTED_NEAREST_PRIOR_DATE'
  | 'MISSING_WITHIN_LOOKBACK'
  | 'METADATA_GAP_INPUT'
  | 'NOT_REQUESTED';

interface SnapshotLookupSelectionEvidence {
  requested: boolean;
  source: string | null;
  selectedSnapshotDate: string | null;
  lagDays: number | null;
  reasonCode: SnapshotLookupReasonCode;
  reasonSummary: string;
}

interface SnapshotLookupExplainability {
  requestedDate: string;
  lookbackDays: number;
  region: string;
  assetType: string;
  market: SnapshotLookupSelectionEvidence;
  sector: SnapshotLookupSelectionEvidence;
  country: SnapshotLookupSelectionEvidence;
  smartMoney: SnapshotLookupSelectionEvidence;
  dataQuality: SnapshotLookupSelectionEvidence;
  selectedNearestSnapshotDate: string | null;
  maxLagDays: number | null;
  partial: boolean;
  summary: string;
}
```

The exact property and type names may differ, but the semantics must stay stable and additive.

Recommended first-pass mapping:

- `PERSISTED_EXACT_DATE`: matching snapshot exists on the requested date.
- `PERSISTED_NEAREST_PRIOR_DATE`: lookup selected a persisted snapshot before the requested date within lookback.
- `MISSING_WITHIN_LOOKBACK`: requested component has no persisted snapshot on or before the requested date inside the lookback window.
- `METADATA_GAP_INPUT`: the request asked for a metadata-gap sector such as `Unknown`, so ranked sector evidence is intentionally unavailable.
- `NOT_REQUESTED`: optional component was not part of the lookup request.

Important narrowing: this first child must not add a second repository lookup just to distinguish "never generated" from "older than lookback." The honest bounded explanation is "missing within lookback."

Recommended response shape:

- keep existing `market`, `sector`, `country`, `smartMoney`, `dataQuality`, `dataStatus`, and `gaps[]`;
- add one top-level explainability object such as `lookupExplainability`;
- keep reason text stable and backend-owned so downstream consumers do not recreate it.

## Exact Future File Reservations

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.router.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- `backend/src/modules/historical-context-snapshots/index.ts`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/market-context-intelligence/**`
- `backend/src/modules/smart-money-intelligence/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/shared/**`
- `frontend/src/features/historical-context-snapshots/**`
- `frontend/src/shared/**`
- package manifests
- generated files
- provider files
- frontend implementation or tests unless separately approved
- live-market, paid/cloud, broker, or telemetry flows

## Dependency And Conflict Notes

- No Prisma, route, provider, shared DTO, generated-type, package, or frontend blocker is required for the first bounded slice.
- This packet depends on persisted snapshot rows already carrying `snapshotDate` and current lookup behavior returning those rows intact.
- The first child must remain backend-only. If a later packet wants the Historical Context page or Calibration surfaces to render the new fields, that is a separate consumer pass and needs its own reservation.
- This packet conflicts with any active Lane 1 work reserving `historical-context-snapshots.service.ts`, `historical-context-snapshots.types.ts`, `historical-context-snapshots.md`, or the focused service test.

## QA Handoff Notes For Team 04

Focused backend QA should prove:

- exact-date lookup returns `PERSISTED_EXACT_DATE`, `lagDays = 0`, and the expected selected snapshot date;
- nearest-prior lookup within lookback returns `PERSISTED_NEAREST_PRIOR_DATE`, positive lag, and correct top-level `maxLagDays`;
- partial lookup with missing sector, smart-money, or data-quality evidence returns `MISSING_WITHIN_LOOKBACK` only for requested slices and keeps unrequested slices out of generic gap treatment;
- metadata-gap sector lookup returns `METADATA_GAP_INPUT` and does not describe the sector as a ranked missing snapshot;
- missing market snapshot inside lookback returns a clearly partial or missing response and never reads as exact-date evidence;
- existing response fields remain present and backward-compatible while the new explainability object is additive.

Suggested future focused command after implementation:

```powershell
cd backend
npm.cmd test -- historical-context-snapshots.service.test.ts --runInBand
```

## Ready Recommendation

`Ready candidate`

Reason:

- additive backend-owned DTO enrichment is source-supported today;
- the smallest child fits inside one module with one four-file writer set;
- no schema, route registry, shared utility/UI, Market Context source, Smart Money source, Signal Calibration source, provider, package, generated, or frontend implementation work is needed.

Remaining gate:

- Team 04 QA planning handoff;
- Team 00 sequencing and Ready promotion.
