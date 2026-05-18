# CF-W1-L3-WATCH-01 - Watchlist Review Actionability Requirement

Status: Requirement draft prepared. Not Ready for Implementation. Docs-only discovery item for the active watchlist workflow.

## Problem

Watchlist Management already tracks instruments, sorts them, and enriches them with price and signal context. What it does not provide is a durable review-actionability layer that helps a trader decide which tracked ideas deserve the next review pass and why.

The current watchlist can show signal score, daily change, notes, and tags, but it does not turn those facts into a bounded, explainable review priority that can be scanned as a review queue.

## User Value

Investors and traders need a watchlist that behaves like a review queue, not just a container of symbols.

They need to know:

- which tracked ideas should be reviewed first;
- why an item is high-priority versus background;
- whether the priority is driven by signal strength, daily movement, user notes/tags, or stale/noisy evidence;
- which items need refreshed evidence versus simple background monitoring;
- how to keep the watchlist useful without turning it into advice, alerts, or a hidden recommendation engine.

## Bounded Requirement

Define a bounded watchlist actionability contract that adds an explicit review-priority state, a reason summary, and one deterministic sort option to the watchlist detail surface using existing enrichment fields.

The first child slice should focus on:

- a small, explainable priority taxonomy for watchlist items such as high review priority, medium review priority, refresh evidence, and background;
- reason summaries based on existing signal score, direction, recency, daily move, and user notes/tags;
- stable ordering that can be explained to the user and reproduced with fixed tie-breaks;
- additive summary counts for how many items fall into each priority band;
- no advice language, no alert creation, no note parsing, and no trust overclaiming;
- keep `PORT-01B` as readiness metadata work, not this actionability layer.

## Evidence Consumed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-WATCH-01-architecture-review.md`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.repository.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `frontend/src/features/watchlist-management/components/WatchlistManagementPage.tsx`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-portfolio-watchlist-alerts.md`

## What This Is Not

- Not DQ readiness metadata.
- Not an alerting feature.
- Not a recommendation engine.
- Not a portfolio-risk engine.
- Not Ready for Implementation.

## Allowed Future Scope

After Team 00/03 reservation and contract prep, the future child slice may use:

- `backend/src/modules/watchlist-management/**`
- `frontend/src/features/watchlist-management/**`
- `backend/tests/modules/watchlist-management/**`

The first pass should stay inside the watchlist workflow and should not depend on portfolio holdings, alert delivery, or new paid services.

## Priority Position

This requirement is ranked behind `CF-W1-BT-02` and `CF-W1-L3-ALERT-03`, and ahead of `CF-W1-L3-INTEL-03`, `CF-W1-CAL-01`, `CF-W1-HCTX-01`, and `CF-W1-MCTX-01` because it closes a direct investor workflow that already exists in the product and can be explained entirely from module-local fields.

## Next Gate

Team 00/03 reservation and an architecture/QA prep packet are required before any implementation handoff.
