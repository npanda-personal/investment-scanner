# CF-W1-HCTX-02 Historical Context Data-Quality Coverage Scope Contract

Date: 2026-05-19

Owner: Team 03 Architecture Factory

## Status

Ready candidate contract for one bounded backend-only `historical-context-snapshots` child.

## Contract Intent

Keep Historical Context coverage backward-compatible while making data-quality coverage honesty explicit.

The child must preserve the existing raw `dataQualitySnapshots` count and add provenance fields that tell downstream readers whether that count is global-only, missing, stale, or otherwise not safe to interpret as scoped completeness.

## Required Contract Rule

- Keep `SnapshotCoverage.dataQualitySnapshots` as the raw integer count.
- Add one additive provenance packet for data-quality coverage.
- Do not create a new endpoint.
- Do not remove or rename existing coverage fields.

## Required Semantics

Field names may differ, but semantics equivalent to the following are required:

```ts
type DataQualityCoverageScope =
  | 'GLOBAL_ONLY'
  | 'SCOPE_PROVEN'
  | 'UNAVAILABLE';

type DataQualityCoverageEvidence =
  | 'PRESENT'
  | 'MISSING'
  | 'STALE'
  | 'UNKNOWN';

interface DataQualityCoverageProvenance {
  rawCount: number;
  scope: DataQualityCoverageScope;
  evidence: DataQualityCoverageEvidence;
  latestSnapshotDate: string | null;
  comparisonSnapshotDate: string | null;
  warning: string | null;
  reason: string;
}
```

Exact type names may differ. The semantics must not.

## Classification Rules

### Raw Count Preservation

- `rawCount` must equal the existing `dataQualitySnapshots` value.
- `dataQualitySnapshots` remains the backward-compatible field for existing callers.

### Scope Classification

- `GLOBAL_ONLY` means the module has data-quality snapshot rows but cannot prove the count is filtered to the requested `region` and `assetType`.
- `SCOPE_PROVEN` is allowed only when the implementation has explicit owned evidence that the count matches the requested scope.
- `UNAVAILABLE` means no trustworthy scope claim can be made because coverage evidence is absent.

### Evidence Classification

- `MISSING` when there are zero data-quality snapshot rows.
- `STALE` when data-quality coverage exists but the latest data-quality snapshot date is older than the latest Historical Context market snapshot date.
- `UNKNOWN` when coverage exists but the module lacks a safe comparison basis.
- `PRESENT` when coverage exists and freshness can be established from module-owned snapshot dates.

## Current-Source Honesty Rule

On current `dev`, the first child must not fabricate `SCOPE_PROVEN`.

Current-source expectations:

- normal current state: `scope = GLOBAL_ONLY`
- zero-row state: `scope = UNAVAILABLE`, `evidence = MISSING`
- freshness may still be `PRESENT`, `STALE`, or `UNKNOWN` depending on module-owned snapshot dates

## Warning / Reason Rule

The provenance packet must include one stable user-readable explanation.

Minimum explanation cases:

- global-only: the count is global and not proven for the requested market scope
- missing: no data-quality snapshots exist yet
- stale: the latest data-quality snapshot predates the latest market-context snapshot
- unknown: the module cannot compare freshness safely

The existing top-level `warnings[]` array may stay additive, but the provenance packet must carry its own specific reason instead of requiring callers to infer meaning from generic warnings.

## Allowed Data Sources

The first child may use only Historical Context owned evidence:

- `DataQualitySnapshot.count()`
- latest `DataQualitySnapshot.snapshotDate`
- latest Historical Context market snapshot date
- requested `region` and `assetType`

## Forbidden Inference

The child must not:

- duplicate Data Quality Engine coverage, readiness, liquidity, or eligibility scoring;
- infer requested scope from non-owned heuristics;
- claim `IN/STOCK`, `US/STOCK`, or other scoped completeness from the current `DataQualitySnapshot` table alone;
- widen into calibration trust logic or UI rendering.

## Exact File Boundary

Allowed implementation files:

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.repository.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`

Forbidden:

- Prisma/schema/migrations or generated files
- route registries
- Historical Context controller/router/validation/module/index files
- Historical Context route/validation tests
- `data-quality-engine` source or tests
- `signal-calibration-engine` source or tests
- frontend files or Playwright tests
- shared backend utilities or shared frontend components
- package manifests
- provider/live-data, scheduler/startup/backfill, paid/cloud, broker, or telemetry files

## Explicit Non-Goals

- no Prisma relation or persisted scope fields
- no route or query-shape change
- no Data Quality Engine scoring reuse or rewrite
- no frontend coverage card
- no calibration-module consumer change
- no schema-backed `SCOPE_PROVEN` implementation in this child

## QA Contract Notes For Team 04

Focused QA must prove:

- raw count remains present and unchanged;
- global-only counts are labeled explicitly;
- zero-row behavior is explicit and not silently treated as scoped zero completeness;
- stale versus unknown evidence states follow module-owned snapshot-date rules;
- no new caller dependency on frontend changes or DQE source behavior is introduced.
