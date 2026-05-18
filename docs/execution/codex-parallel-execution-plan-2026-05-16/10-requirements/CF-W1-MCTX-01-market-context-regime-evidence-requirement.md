# CF-W1-MCTX-01 - Market Context Regime Evidence Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Market Context is a core investor review surface. Traders need to know whether the current regime label is grounded in broad, visible evidence or whether it is only a partial summary with weak denominators and missing upstream inputs. A regime label without evidence can feel more certain than it is, and that weakens trust in every downstream research and decision workflow that consumes it.

## Evidence

- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts` calculates regime from breadth, recent return proxy, and sector strength, but `summary()` can auto-run and persist a snapshot when one is missing, which makes persisted-versus-fresh evidence unclear at the review surface.
- The same service currently returns `dataStatus = PARTIAL` whenever any sample exists and `MISSING` only when none exist, so the current contract does not separate trustworthy, low-sample, and missing-evidence states.
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md` shows regime, breadth, and sector rotation are already surfaced, but the review surface still relies on a compact explanation string and raw sample counts.
- `frontend/src/features/market-context-intelligence/components/MarketContextPage.tsx` shows regime chip, score, sample counts, and macro status, but not whether the evidence is persisted, partial, low-denominator, or missing upstream components beyond the compact copy.
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md` and `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md` both depend on market-context outputs, so regime ambiguity can ripple into other trust surfaces.
- The current docs do not yet force a clear regime-evidence story for partial snapshots, missing macro context, or limited breadth denominators.

## Dependencies

- Historical Context Snapshots and Signal Calibration depend on bounded, explainable regime output and must not receive a breaking contract drift.
- Any trust-state framing should align with current Market Data and Data Quality evidence terminology instead of introducing a conflicting label set.
- The first child should separate persisted summary evidence from on-demand generation evidence because `summary()` can currently auto-generate when persisted context is absent.

## Bounded Requirement

Define a bounded regime-evidence contract that explains what drove the current market label without changing the underlying regime math.

The first child slice should focus on:

- additive provenance showing whether the returned summary came from a persisted snapshot or a fresh generation path;
- clear denominator evidence for breadth percentages, sector breadth, and price sample counts so the label does not outrun its sample base;
- stable reason strings for partial evidence, low denominator coverage, and intentionally missing macro context;
- bounded explanation fields that downstream Historical Context and Calibration consumers can reuse;
- no regime-score rewrite, no provider expansion, no schema change, and no new trust taxonomy that conflicts with existing DQ terminology.

## Acceptance Criteria

- Regime output distinguishes trustworthy, partial, low-evidence, and missing-evidence states with stable reason strings.
- The user can see which evidence drove the regime, including breadth denominators, sector breadth contribution, persisted-versus-fresh summary provenance, and any missing upstream components.
- Partial or missing evidence does not overstate market strength or weakness.
- Existing response fields stay backward-compatible unless a later accepted contract explicitly adds more evidence fields.
- Macro remains explicitly missing when providers are unconfigured; the child must not imply live macro coverage.
- Focused tests cover trustworthy, partial, missing, and evidence-gap regime states.

## Non-Goals

- No Prisma schema, route registry, provider, paid/cloud, broker, or telemetry work.
- No change to the underlying regime math in this draft.
- No duplicate trust logic in downstream consumers.

## Next Gate

Architecture contract and QA plan are already prepared for a bounded Market Context regime-evidence slice. The next Team 00 action is Ready evaluation and exact implementation handoff sequencing for the reserved `market-context-intelligence` files only.

## Ready-Evaluation Notes

- `03-architecture/CF-W1-MCTX-01-architecture-review.md` already narrows the child to one module-local vertical slice with exact backend and feature-local file reservations.
- `04-qa/CF-W1-MCTX-01-qa-plan.md` already confirms focused QA coverage for trustworthy, partial, low-evidence, and missing-evidence regime states.
- This child is more dispatchable than prep-only parent items because it does not require Prisma, routes, shared UI, Market Data source changes, DQE source changes, or provider work.
- Team 02 should keep `CF-W1-MCTX-01` ahead of prep-only follow-ons when ranking the next unassigned Team 00 handoff, unless Team 00 explicitly changes the live routing order.
