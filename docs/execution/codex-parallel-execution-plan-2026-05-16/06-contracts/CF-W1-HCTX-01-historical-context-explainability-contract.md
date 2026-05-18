# CF-W1-HCTX-01 Historical Context Explainability Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Backend-only Historical Context explainability contract prepared. Not Ready for Implementation.

## Contract Intent

Historical Context lookup must explain which persisted snapshot was selected, how far it lags the requested date, and why any requested context slice is partial or missing.

This module remains an evidence surface for research support. It must not overstate certainty when persisted context is absent or incomplete.

## Ownership

`historical-context-snapshots` owns this behavior.

Upstream modules remain evidence producers only:

- Market Context Intelligence
- Smart Money Intelligence
- Market Data Foundation

Downstream modules such as Signal Calibration and Signal Quality must consume this explainability output instead of rebuilding lookup provenance themselves.

## Required Source Boundary

Implementation must stay inside `historical-context-snapshots` service/types/docs/tests and must derive explainability from existing lookup results only.

Forbidden:

- repository, schema, controller, router, validation, provider, package, generated, or frontend scope;
- upstream module source changes;
- duplicate explainability logic in downstream consumers;
- any lookup contract change that removes current `market`, `sector`, `country`, `smartMoney`, `dataQuality`, `dataStatus`, or `gaps`.

## Required Explainability Metadata

Add additive metadata equivalent to:

```ts
type SnapshotLookupReasonCode =
  | 'PERSISTED_EXACT_DATE'
  | 'PERSISTED_NEAREST_PRIOR_DATE'
  | 'MISSING_WITHIN_LOOKBACK'
  | 'METADATA_GAP_INPUT'
  | 'NOT_REQUESTED';

interface SnapshotLookupSelectionEvidence {
  requested: boolean;
  requestedDate: string;
  lookbackDays: number;
  selectedSnapshotDate: string | null;
  lagDays: number | null;
  reasonCode: SnapshotLookupReasonCode;
  reason: string;
}

interface SnapshotLookupExplainability {
  requestedDate: string;
  lookbackDays: number;
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

The exact type name may differ, but the semantics must stay stable.

## Required Mapping Rules

- `PERSISTED_EXACT_DATE` means the selected snapshot date matches the requested date.
- `PERSISTED_NEAREST_PRIOR_DATE` means the selected snapshot date is before the requested date but still inside lookback.
- `MISSING_WITHIN_LOOKBACK` means no persisted snapshot exists for the requested component inside lookback.
- `METADATA_GAP_INPUT` means the caller requested a metadata-gap sector such as `Unknown`, so ranked sector evidence is intentionally unavailable.
- `NOT_REQUESTED` means the optional component was not requested and must not be described as missing evidence.

## Compatibility Rule

- Keep current lookup route, query params, and existing response fields backward-compatible.
- `dataStatus` and `gaps[]` remain present.
- The new explainability metadata is additive and must not require repository, route, controller, validation, or frontend changes.

## Forbidden Behavior

- Do not mark nearest-prior lookup evidence as if it were exact-date evidence.
- Do not collapse metadata-gap input into a generic missing message.
- Do not imply that `NOT_REQUESTED` is a data gap.
- Do not add frontend-only wording or UI-specific formatting to the backend contract.

## Test Contract

Focused backend tests must prove:

- exact-date lookup provenance;
- nearest-prior lookup provenance with lag days;
- partial lookup provenance for missing sector, smart-money, and data-quality evidence;
- metadata-gap sector provenance;
- missing market provenance within lookback;
- additive compatibility of existing lookup response fields.
