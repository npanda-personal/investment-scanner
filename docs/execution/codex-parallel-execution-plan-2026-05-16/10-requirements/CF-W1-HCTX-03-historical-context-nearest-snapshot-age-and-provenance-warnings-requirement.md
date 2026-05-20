# CF-W1-HCTX-03 - Historical Context Nearest-Snapshot Age and Provenance Warnings Requirement

Date: 2026-05-20

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Historical context snapshots are useful only when the reader can tell whether the selected snapshot is close enough to the requested date to support review. A nearest-snapshot lookup that succeeds silently can still be a weak fallback if the selected row is old, partially proxied, or only the nearest available evidence inside the lookback window. Traders and research users need that age and provenance stated plainly.

## Evidence

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md` says lookup returns the nearest snapshots on or before the requested date within a lookback window.
- The same module docs show the current lookup surface already exposes coverage and nearest-date behavior, but not a concise age/provenance warning for the selected snapshot.
- The Team 01 audit found that the service returns coverage plus a latest date, but does not expose a freshness label or age/proximity warning for the selected snapshot.
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md` shows downstream review grouping depends on the nearest persisted market-context snapshot for each signal date, so stale-looking historical context can affect trust even when the lookup succeeds.

## Dependencies

- Keep the first child backend-local and additive.
- Reuse the existing nearest-snapshot lookup semantics; do not rewrite the selection algorithm.
- Do not introduce schema, route-registry, shared UI, provider/live, backfill, broker, or telemetry changes in the first child.
- Do not duplicate data-quality freshness scoring; this slice should surface lookup age and provenance, not recalculate trust.

## Bounded Requirement

Define an additive lookup-provenance contract that makes nearest-snapshot age visible without changing the lookup rule.

The first child should focus on:

- requested date, selected snapshot date, and lag days;
- lookback window and whether the selected snapshot was the nearest available evidence or an ideal same-day match;
- stable age/provenance labels for fresh, near, fallback, and out-of-lookback cases;
- explicit missing-snapshot and metadata-gap wording when the requested context cannot be resolved;
- backend-first DTO enrichment that downstream review surfaces can reuse without duplicating logic.

## Acceptance Criteria

- Lookup output exposes requested date, selected snapshot date, lag days, and lookback window.
- The response or review surface shows whether the selected snapshot is fresh enough, near enough, or only a fallback within the lookback window.
- Missing-snapshot, metadata-gap, and out-of-lookback cases have stable reason text instead of generic partial output.
- Existing nearest-snapshot behavior stays backward-compatible and additive.
- Focused tests cover same-day, near-date, fallback, missing, and metadata-gap lookup cases.

## Non-Goals

- No Prisma schema, route registry, provider, broker, paid/cloud, or telemetry work.
- No nearest-date algorithm rewrite.
- No duplicate freshness scoring in downstream consumers.

## Next Gate

Architecture contract and QA plan for a bounded historical-context freshness/provenance slice, with later implementation reserved to the historical-context-snapshots module only.
