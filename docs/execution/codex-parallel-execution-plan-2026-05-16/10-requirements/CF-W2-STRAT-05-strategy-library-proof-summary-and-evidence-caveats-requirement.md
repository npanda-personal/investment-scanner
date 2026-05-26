# CF-W2-STRAT-05 - Strategy Library Proof Summary And Evidence Caveats Requirement

Date: 2026-05-26

Owner: Team 02 - Product / Requirement Factory

Status: New bounded draft, parked by Team 00 after the Product Owner paused rolling PO/architecture work on 2026-05-26. Not Ready for Implementation.

Parent: `CF-W1-STRAT-02 - Strategy Framework rule versioning and DQ gate policy`

## Product Goal

The app already has a real `/strategies` surface, but it still reads more like a framework console than an investor/trader proof review workflow.

The user should be able to answer, from the Strategy Library itself:

- which strategies are currently backed by stronger versus weaker local proof;
- which timeframe and scope that proof is based on;
- when the proof is limited, stale, sample-thin, blocked, or missing;
- what the first evidence caveat is before the user clicks into Backtesting Lab; and
- what next review action is sensible without drifting into direct buy/sell advice.

The proof story must lead with the first limiting evidence caveat whenever the current proof is limited, blocked, sample-thin, stale, or unavailable.

This is a research-support requirement. It must not become an optimization console, target-price workflow, or strategy-promotion engine.

## Why This Is A Separate Requirement

Accepted strategy trust slices already cover rule-versioning, review provenance, and stale-summary labels. Those were necessary backend and trust-contract foundations.

This requirement is about the user-facing strategy review surface that already exists at `/strategies`.

The current Strategy Framework page exposes ratings, readiness, proof registry, rankings, and deep links, but the highest-value investor/trader gap is still compact evidence surfacing:

- the catalog does not lead with one concise proof summary and caveat;
- the detail view does not make the first limiting evidence as obvious as the optimistic metrics;
- rankings can still read faster than their proof caveats.

This should stay separate from durable storage proposals and from deeper backtesting engine work.

## Current Evidence

Current repo evidence inspected for this requirement:

- `frontend/src/features/strategy-framework/routes.tsx` already mounts `/strategies`.
- `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx` already renders Catalog, Proof Registry, Detail, Performance, Rankings, and Evaluate Stock tabs.
- The existing UI already exposes `latest rating`, `readiness`, proof chips, proof rows, warnings, caps, and deep links into Backtesting Lab.
- `backend/src/modules/strategy-framework/strategy-framework.md` already documents compact proof rows, conservative ratings, readiness labels, and links into Backtesting Lab instead of duplicating detailed simulation internals.

That means the gap is not "create a strategy page." The gap is "make the current strategy page read as truthful strategy evidence first."

## Bounded Requirement

Define a bounded Strategy Library follow-on that makes proof status and evidence caveats more immediately visible on the existing `/strategies` workflow.

The first child should focus on:

- one compact proof summary per strategy row on the Catalog surface;
- one compact evidence caveat block near the top of Strategy Detail;
- one concise explanation on Rankings when a strategy is `LIMITED`, `UNPROVEN`, `BLOCKED`, or sample-capped;
- proof basis wording tied to existing strategy-framework evidence only, such as timeframe, scope, trade-count sufficiency, warning/cap state, missing-evidence reason, and next action;
- explicit unavailable or missing-proof states where the current read path cannot support a concise summary;
- no new proof score, no ranking rewrite, and no new persistence model.

## Acceptance Criteria

- `/strategies` stays the existing user-facing route for strategy review.
- Catalog rows expose a compact proof-summary story that stays aligned with Strategy Detail and Proof Registry for the same strategy and timeframe.
- Detail view surfaces the first limiting evidence caveat near the top instead of hiding it deep in warning chips or secondary sections.
- Rankings do not imply stronger proof than the current proof registry, rating warnings, sample sufficiency, and caps actually support.
- Timeframe and scope basis remain visible wherever proof is summarized.
- If proof is unavailable, missing, blocked, or only partial, the UI says so explicitly instead of implying current strong validation.
- The requirement reuses existing strategy-framework outputs and does not invent walk-forward, holdout, forward-validation, or optimization proof the product does not own.
- Product language remains research-support only and avoids buy/sell, guaranteed, target, or automation-authorizing wording.
- Focused tests later cover: proven proof row, limited proof row, blocked/missing proof row, warning/cap visibility, and list/detail/ranking consistency.

## Non-Goals

- No Prisma schema or migration change.
- No new route or navigation change.
- No shared UI or shared app-shell rewrite.
- No package manifest or generated-file change.
- No new backtesting math, ranking formula, or proof engine.
- No new strategy-definition persistence or revision-history storage.
- No direct changes to Trade Plan, Today Review, Daily Overview, or Signal Position Ledger in the first child.

## Constraints

- Reuse current `strategy-framework` owned proof rows, ratings, readiness labels, warnings, caps, and next-action links where available.
- If the existing read path lacks a needed concise field, Team 03 must prefer additive strategy-framework contract enrichment over shared UI invention.
- Do not restate a strategy as `proven` when current evidence is only historical, limited, warning-capped, or missing sample sufficiency.
- Backtesting Lab remains the detailed run-analysis owner. Strategy Library should summarize and route, not duplicate.

## Dependencies

- Accepted `CF-W1-STRAT-04` stale-summary work remains the trust baseline for not overclaiming strategy evidence.
- Accepted `CF-W1-BT-04` current-proof labeling remains the preferred proof-language basis where backtesting freshness is part of the caveat.
- Team 03 should confirm whether the first child can stay inside `strategy-framework` backend/frontend files only or whether a narrower split is required between API enrichment and feature-local rendering.

## Next Gate

Route to Team 03 for a bounded architecture review and contract proposal, then Team 04 for QA planning.

Team 00 should keep this item out of Ready until Team 03 proves the first child stays additive, feature-local, and free of schema, route, shared UI, and cross-module scoring drift.
