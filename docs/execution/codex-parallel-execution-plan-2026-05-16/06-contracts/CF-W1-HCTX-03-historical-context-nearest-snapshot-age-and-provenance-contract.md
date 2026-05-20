# CF-W1-HCTX-03 Historical Context Nearest-Snapshot Age And Provenance Contract

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Draft architecture contract for a bounded first slice. Not Ready for Implementation.

## Contract Intent

Nearest historical-context lookup must tell downstream trust consumers whether the selected persisted snapshot is same-day evidence, a near-date fallback, or merely the nearest available row inside lookback.

The first slice is backend-first and additive only. It must not rewrite lookup selection, widen into repository back-search, or pretend stale fallback evidence is same-day evidence.

## Ownership

`historical-context-snapshots` owns the contract.

Downstream modules such as `signal-quality-lab` must consume this additive provenance packet later instead of rebuilding lag logic.

## Required First-Slice Boundary

Allowed future implementation boundary:

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`

Forbidden:

- repository/controller/router/validation/module/index edits;
- frontend work;
- upstream or downstream module source edits;
- Prisma/schema/migrations;
- route-registry, shared utility, shared UI, package, generated, provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope.

## Required Additive Semantics

The additive payload must preserve semantics equivalent to:

```ts
type SnapshotAgeStatus =
  | 'EXACT_DATE'
  | 'NEAREST_PRIOR'
  | 'FALLBACK_WITHIN_LOOKBACK'
  | 'MISSING_WITHIN_LOOKBACK'
  | 'METADATA_GAP_INPUT'
  | 'NOT_REQUESTED';

interface SnapshotSelectionWarning {
  status: SnapshotAgeStatus;
  requestedDate: string;
  selectedSnapshotDate: string | null;
  lagDays: number | null;
  lookbackDays: number;
  source: string | null;
  reasonSummary: string;
}
```

Recommended additive placement:

```ts
interface SnapshotLookupResult {
  market: any | null;
  sector: any | null;
  country: any | null;
  smartMoney: any | null;
  dataQuality: any | null;
  dataStatus: SnapshotDataStatus;
  gaps: string[];
  ageAndProvenance: {
    market: SnapshotSelectionWarning;
    sector: SnapshotSelectionWarning;
    country: SnapshotSelectionWarning;
    smartMoney: SnapshotSelectionWarning;
    dataQuality: SnapshotSelectionWarning;
    overallReasonSummary: string;
    maxLagDays: number | null;
  };
}
```

Exact type names may differ. The semantics must not.

## Required Mapping Rules

- `EXACT_DATE`: selected snapshot date equals requested date.
- `NEAREST_PRIOR`: selected snapshot exists before requested date and lag is materially visible but still acceptable to expose as nearest evidence.
- `FALLBACK_WITHIN_LOOKBACK`: selected row is inside lookback but should be labeled as fallback evidence, not fresh same-day evidence.
- `MISSING_WITHIN_LOOKBACK`: no row exists for the requested component inside the allowed window.
- `METADATA_GAP_INPUT`: the caller requested a metadata-gap sector like `Unknown`, so sector evidence is intentionally unavailable.
- `NOT_REQUESTED`: optional slice was not requested and must not count as a data gap.

The first slice may compute fallback thresholds from existing requested date plus selected date only. It must not perform new repository searches outside the current lookup rule.

## Compatibility Rules

- preserve current route, params, and lookup selection behavior;
- preserve existing `gaps` and `dataStatus`;
- add metadata only;
- keep all existing component payloads unchanged.

## Test Contract

Focused backend tests must prove:

- exact-date evidence;
- lagged but present evidence;
- fallback wording inside lookback;
- missing evidence inside lookback;
- metadata-gap sector behavior;
- `NOT_REQUESTED` behavior;
- backward-compatible existing lookup payload fields.
