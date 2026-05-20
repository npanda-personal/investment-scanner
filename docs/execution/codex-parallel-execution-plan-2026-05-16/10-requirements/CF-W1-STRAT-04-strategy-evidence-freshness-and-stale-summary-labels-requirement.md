# CF-W1-STRAT-04 - Strategy Evidence Freshness and Stale-Summary Labels Requirement

Date: 2026-05-20

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Strategy evidence can be correct but still stale. A catalog or performance summary that was built from older evidence, limited samples, or a missing rerun basis should not read like current proof. Strategy users need a compact freshness and stale-summary label so they can tell whether the evidence is up to date, partially stale, or structurally limited.

## Evidence

- `backend/src/modules/strategy-framework/strategy-framework.md` says Strategy Framework owns definitions, versions, ratings, readiness labels, and compact performance summaries.
- The same docs show rating reasons, warnings, and caps already exist, but historical persisted rows may not have warning/cap fields until rerun.
- The Team 01 audit found the catalog/performance surface does not expose a concise freshness or rerun basis that tells users whether strategy proof is current, stale, or structurally limited.
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md` remains the source of detailed simulation internals, so Strategy Framework should stay on the compact summary side.

## Dependencies

- Keep the first child backend-local and additive.
- Reuse existing missing-evidence, sample-sufficiency, rating, and performance-summary outputs.
- Do not change backtesting simulation internals, strategy rule behavior, schema, routes, shared UI, provider/live, backfill, broker, or telemetry in the first child.
- Do not create a second strategy-evidence model outside Strategy Framework.

## Bounded Requirement

Define an additive freshness contract that labels strategy summaries as current, stale, partial, or structurally limited.

The first child should focus on:

- freshness and rerun labels for compact performance summaries and catalog rows;
- clear evidence-basis wording when the summary is missing warning/cap fields, sample sufficiency is weak, or the current view is derived from older evidence;
- stable reason strings derived from `missingEvidenceReason`, sample sufficiency, rating warnings, and rating caps;
- compact explanation text that downstream consumers can reuse without reinterpreting the raw evidence;
- no change to the underlying rating or performance math.

## Acceptance Criteria

- Catalog and performance views show whether the strategy summary is current, stale, partial, or structurally limited.
- The user can tell why a summary should be rerun or treated cautiously.
- Existing strategy math, ratings, and versioning remain unchanged.
- Historical persisted rows remain backward-compatible even if the freshness label is derived from existing fields.
- Focused tests cover current, stale, partial, rerun-needed, and limited-evidence states.

## Non-Goals

- No backtesting simulation rewrite.
- No rule-behavior rewrite.
- No schema, route registry, shared UI, provider/live, broker, or telemetry work.
- No duplicate evidence logic in downstream consumers.

## Next Gate

Architecture contract and QA plan for a bounded Strategy Framework freshness/stale-summary slice, with later implementation reserved to the strategy-framework module only.
