# CF-W1-MCTX-02 - Market Context Freshness Basis Labels for Persisted vs Generated Summaries Requirement

Date: 2026-05-20

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Market Context is a trust surface, and the user needs to know whether the current regime card came from persisted evidence or was generated on demand because no persisted summary existed. Without that basis label, the card can look more stable or more current than it really is, especially when the module auto-generates and persists a snapshot during the read path.

## Evidence

- `backend/src/modules/market-context-intelligence/market-context-intelligence.md` says the module exposes regime, breadth, and sector rotation, and that sample-count coherence matters on persisted reads.
- The same docs note that the UI shows price sample and SMA denominator samples, but do not define a freshness-basis label.
- The Team 01 audit found `summary()` can auto-run and persist a snapshot when one is missing, which makes persisted-versus-fresh evidence unclear at the review surface.
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md` and `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md` both consume market-context outputs, so a misleading basis label can ripple into downstream trust surfaces.

## Dependencies

- Keep the first child backend-local and additive.
- Reuse the current regime math and sample-count logic.
- Do not add schema, route-registry, shared UI, provider/live, backfill, broker, or telemetry work in the first child.
- Do not introduce a new trust taxonomy that conflicts with existing DQ terminology.

## Bounded Requirement

Define an additive freshness-basis contract that tells the user whether the current summary is persisted, generated, or a fallback path.

The first child should focus on:

- labels that distinguish persisted summary, freshly generated summary, and fallback or derived summary states;
- explicit age or freshness wording when the surface is showing generated evidence instead of a persisted snapshot;
- stable reason text for missing upstream components, partial evidence, and intentionally missing macro context;
- downstream-safe reuse of the basis label without changing the regime math or the public scope contract;
- consistent wording on the summary page and regime widget.

## Acceptance Criteria

- The response or review surface shows whether the current market-context summary is persisted or generated.
- The user can see when a generated summary is acting as a fallback for missing persisted evidence.
- Partial, missing, and low-evidence states have stable reason labels.
- Macro remains explicitly missing when providers are unconfigured.
- Existing regime math, scope behavior, and response fields remain backward-compatible.
- Focused tests cover persisted, generated, fallback, partial, and missing-evidence states.

## Non-Goals

- No regime-score rewrite.
- No provider expansion.
- No schema, route registry, shared UI, provider/live, broker, or telemetry work.
- No duplicate freshness logic in downstream consumers.

## Next Gate

Architecture contract and QA plan for a bounded Market Context freshness-basis slice, with later implementation reserved to the market-context-intelligence module only.
