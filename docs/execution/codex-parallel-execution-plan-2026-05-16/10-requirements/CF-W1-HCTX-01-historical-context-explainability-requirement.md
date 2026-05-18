# CF-W1-HCTX-01 - Historical Context Explainability Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Historical context snapshots are the evidence layer behind regime review, calibration, and post-event research. Investors and traders need to know which snapshot was selected, how close it is to the requested date, which context slices were present, and why a lookup is partial or missing. Without that explanation, historical context can look more certain than it is.

## Evidence

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md` documents nearest-date lookup, `dataStatus`, and `gaps[]`, but the review surface still relies on raw fields rather than an explicit provenance story.
- The same module depends on `market-context-intelligence` and `smart-money-intelligence`, so missing or stale upstream context can be hidden unless surfaced clearly.
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md` depends on historical context snapshots for regime and adjustment evidence, making lookup provenance directly relevant to downstream trust.
- The frontend snapshot page currently shows chips and gaps, but does not yet force a clear explanation of selected-date lag, persisted-vs-missing evidence, or what a partial lookup means for downstream research.

## Acceptance Criteria

- Historical context lookup output explains which nearest snapshot was selected and why.
- The response or review surface exposes lookup lag, scope, and explicit gap reasons for missing market, sector, country, smart-money, or data-quality context.
- Partial lookups are visibly diagnostic, not silently complete.
- Downstream consumers can tell when context is persisted evidence versus a missing or metadata-gap fallback.
- Focused tests cover complete, partial, missing, and metadata-gap lookup cases.

## Non-Goals

- No Prisma schema, route registry, provider, broker, paid/cloud, or telemetry work.
- No calibration, market-context, or signal-quality scoring rewrite.
- No duplicate explanation logic in downstream consumers.

## Next Gate

Architecture contract and QA plan for a bounded historical-context explainability slice, with later implementation reserved to the historical-context-snapshots module only.
