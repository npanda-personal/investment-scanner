# CF-W1-MCTX-01 - Market Context Regime Evidence Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Market Context is a core investor review surface. Traders need to know whether the current regime label is grounded in broad, visible evidence or whether it is only a partial summary with weak denominators and missing upstream inputs. A regime label without evidence can feel more certain than it is, and that weakens trust in every downstream research and decision workflow that consumes it.

## Evidence

- `backend/src/modules/market-context-intelligence/market-context-intelligence.md` shows regime, breadth, and sector rotation are already surfaced, but the review surface still relies on a compact explanation string and raw sample counts.
- The service calculates regime from breadth, recent return proxy, and sector strength, while the frontend shows only regime chip, score, and sample counts.
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md` and `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md` both depend on market-context outputs, so regime ambiguity can ripple into other trust surfaces.
- The current docs do not yet force a clear regime-evidence story for partial snapshots, missing macro context, or limited breadth denominators.

## Acceptance Criteria

- Regime output distinguishes trustworthy, partial, and missing-evidence states with stable reason strings.
- The user can see which evidence drove the regime, including breadth denominators and any missing upstream components.
- Partial or missing evidence does not overstate market strength or weakness.
- Existing response fields stay backward-compatible unless a later accepted contract explicitly adds more evidence fields.
- Focused tests cover trustworthy, partial, missing, and evidence-gap regime states.

## Non-Goals

- No Prisma schema, route registry, provider, paid/cloud, broker, or telemetry work.
- No change to the underlying regime math in this draft.
- No duplicate trust logic in downstream consumers.

## Next Gate

Architecture contract and QA plan for a bounded Market Context regime-evidence slice, with later implementation reserved to the market-context-intelligence module only.
