# CF-W1-HCTX-01 - Historical Context Explainability Requirement

Date: 2026-05-18

## Status

Promoted by Team 00 on 2026-05-18 as a bounded backend-only `historical-context-snapshots` implementation slice after requirement, architecture, contract, work-packet, QA-plan, file-reservation, and open-decision gates passed.

## Product Value

Historical context snapshots are the evidence layer behind regime review, calibration, and post-event research. Investors and traders need to know which snapshot was selected, how close it is to the requested date, which context slices were present, and why a lookup is partial or missing. Without that explanation, historical context can look more certain than it is.

## Evidence

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts` shows `SnapshotLookupResult` currently exposes only `market`, `sector`, `country`, `smartMoney`, `dataQuality`, `dataStatus`, and `gaps`.
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts` performs nearest-snapshot lookup but does not return additive provenance such as requested date, selected snapshot date, lag days, lookback used, or per-slice evidence source.
- The same module depends on `market-context-intelligence` and `smart-money-intelligence`, so missing or stale upstream context can be hidden unless surfaced clearly.
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md` depends on historical context snapshots for regime and adjustment evidence, making lookup provenance directly relevant to downstream trust.
- `frontend/src/features/historical-context-snapshots/components/HistoricalContextSnapshotsPage.tsx` shows chips, basic snapshot strings, and `gaps[]`, but not a clear explanation of selected-date lag, persisted-vs-missing evidence, or what a partial lookup means for downstream research.

## Dependencies

- Market Context and Smart Money persisted snapshot reads must remain bounded and explainable.
- Any new lookup provenance must stay additive and must not break current downstream consumers such as Signal Calibration.
- Future currentness policy work from Data Quality should be referenced, not duplicated, when historical evidence is stale or absent.
- The first contract should prefer a backend lookup-provenance slice over a larger frontend redesign because the current API/DTO is where requested-date versus selected-snapshot ambiguity starts.

## Bounded Requirement

Define a bounded historical-context lookup provenance contract that makes nearest-snapshot selection visible without changing the existing lookup semantics.

The first child slice should focus on:

- additive lookup provenance for requested date, selected snapshot date, lag days, lookback window, region, and asset class;
- per-slice explanation for `market`, `sector`, `country`, `smartMoney`, and `dataQuality` so the user can tell whether each slice is present, missing, metadata-gapped, or outside lookback;
- stable reason text for metadata-gap and no-snapshot cases instead of generic partial output;
- backend-first DTO enrichment that downstream consumers can reuse without duplicating explanation logic;
- no nearest-date algorithm rewrite, no schema work, and no silent fallback that makes a stale snapshot read as same-day evidence.

## Acceptance Criteria

- Historical context lookup output explains which nearest snapshot was selected for each requested slice and why.
- The response or review surface exposes requested date, selected snapshot date, lag days, lookback window, scope, and explicit gap reasons for missing market, sector, country, smart-money, or data-quality context.
- Partial lookups are visibly diagnostic, not silently complete.
- Downstream consumers can tell when context is persisted evidence versus a missing, metadata-gap, or out-of-lookback fallback.
- Existing `market`, `sector`, `country`, `smartMoney`, `dataQuality`, `dataStatus`, and `gaps[]` behavior remains backward-compatible; new provenance is additive.
- Focused tests cover complete, partial, missing, and metadata-gap lookup cases.

## Non-Goals

- No Prisma schema, route registry, provider, broker, paid/cloud, or telemetry work.
- No calibration, market-context, or signal-quality scoring rewrite.
- No duplicate explanation logic in downstream consumers.

## Next Gate

Architecture contract and QA plan for a bounded historical-context explainability slice, with later implementation reserved to the historical-context-snapshots module only.
