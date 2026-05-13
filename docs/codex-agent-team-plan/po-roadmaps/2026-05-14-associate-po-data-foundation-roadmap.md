# Associate PO Roadmap - Data Foundation, Quality, Universe Coverage, Operations

Date: 2026-05-14
Mode: Product Planning only
Scope: trusted free market data before signals, decisions, backtests, trade plans, or broker automation

## Current capability

- Market Data Foundation already has the right core product contract: scoped universe health, explicit universe states, strict signoff, Trusted Review Universe, bounded repair lanes, and persisted repair-run evidence.
- The market-data UI now exposes catalog import, catalog sync run start/status/cancel, trusted-universe repair workbench, operational repair run, scheduler status, coverage diagnostics, and manual metadata import/template flows.
- The backend already supports staged provider validation (`UNKNOWN_FIRST`, then retry), supported-only identity/business-metadata/price repair, 15-year or listing-date coverage diagnostics, and free-source exchange EOD parsing for NSE/BSE bhavcopy-style files.
- Data Quality Engine is scoped, batch-safe, and user-operable. It exposes coverage/readiness/liquidity outputs, diagnostics, and progress UX through the shared batch runner.
- Historical Context Snapshots already persist market/sector/country/smart-money/data-quality snapshots and can support downstream historical evaluation once the underlying data is trustworthy.
- Tests and docs are strong on contracts and fail-closed behavior. The repo is already conservative about downstream gating.

## Product gaps

- Trusted universe health is well-specified but not yet proven as operationally healthy in current local data; this is still the main blocker to user value.
- Full-history coverage is measured, but the product does not yet appear to have a proven, repeatable default drain from Yahoo insufficiency into approved free exchange-history fallback at scale.
- Data Quality still uses simple heuristics for staleness and readiness; it is useful as a gate, but not yet a full trust ledger for backtests versus daily review versus calibration.
- Operational repair is bounded, but repair runs are still request/response actions rather than clearly resumable, pollable long-running jobs with intra-run progress.
- Scheduler freshness depends on disabled-by-default automation and incomplete holiday calendars, so stale/false-stale risk remains.
- The repo still carries a documented identity risk because `Stock.symbol` remains globally unique instead of `symbol + exchange`.
- Repair workbench scope is effectively centered on `IN / STOCK`; that is correct for now, but it is a domain assumption, not a general foundation operating model.
- Historical context snapshot generation is manual and limited; downstream historical proof will stay patchy unless coverage generation becomes routine.

## Priority order

1. Restore a trusted `IN / STOCK` baseline.
2. Make full historical coverage and free-source fallback operational, not just documented.
3. Harden Data Quality into a clearer trust contract by use case.
4. Improve operations, progress UX, and resumability for long repair workflows.
5. Close market-calendar and freshness reliability gaps.
6. Automate historical snapshot coverage after the foundation is trustworthy.

## Roadmap

### P0 - Trusted universe recovery

Current focus: drain provider unknowns, stale EOD, shallow history, and missing recent volume until Trusted Review Universe reaches durable non-zero value, then Lite threshold.

Acceptance criteria:
- `review-readiness-summary` for `IN / STOCK` moves from repair guidance to at least durable `LIMITED_REVIEW`.
- Provider unknown and retry-failed queues reach zero or explicit classified residual states.
- Trusted stocks have current completed EOD, 120+ bars, recent volume, and honest adjusted-close fallback status.
- Downstream remains fail-closed until trusted membership exists.

Dependencies:
- Market Data Foundation repair lanes, scheduler status, catalog identity repair, provider validation, price backfill.

Risks:
- Yahoo coverage/rate limits; incorrect identity can make backfill target the wrong row.

### P0 - Full history and free-source fallback

Current focus: turn 15-year/listing-date coverage from diagnostic output into a repeatable repair program using approved free exchange EOD sources when Yahoo is shallow or missing.

Acceptance criteria:
- Every active `IN / STOCK` row is classified as history complete, fallback needed, incomplete after fallback, listing-date repair required, identity repair required, retry-blocked, or manual-review required.
- Coverage is measured through latest completed EOD, not calendar days or in-progress candles.
- Exchange-source provenance is stored in repair evidence for fallback imports/validation.
- Trusted review counts do not rise from shallow history alone.

Dependencies:
- Exchange EOD adapter, listing date quality, catalog identity, approved NSE/BSE public file ingestion path.

Risks:
- Missing listing dates, source-format drift, and local operator burden for manual public-file imports.

### P1 - Data Quality trust tiers

Current focus: separate "good enough for daily review" from "good enough for backtests/calibration/full-history research."

Acceptance criteria:
- Data Quality outputs explicitly distinguish review readiness, backtest readiness, calibration readiness, and historical-depth trust.
- Staleness and coverage logic consume Market Data Foundation freshness/signoff contracts instead of relying mainly on a simple 7-day heuristic.
- Diagnostics expose which blocker belongs to market data trust, metadata context, liquidity, or downstream evidence sufficiency.

Dependencies:
- Stable Market Data health/readiness fields and historical coverage ledger.

Risks:
- Re-scoring can create churn in downstream counts if contracts are not versioned and explained.

### P1 - Operations and progress UX

Current focus: make repair workflows operationally safe for real local runs, not just technically bounded.

Acceptance criteria:
- Long repair runs and catalog syncs provide pollable status, partial results, cancel/resume semantics, and clear next-action guidance.
- UI progress shows queue drained, remaining blockers, warnings, and "another run needed" without waiting on opaque long requests.
- Operators can distinguish no-progress, retry-later, manual-required, and source-changed restart cases quickly.

Dependencies:
- Existing catalog sync run APIs, repair-run persistence, frontend progress components.

Risks:
- Extra job-state machinery can drift from actual queue state if not anchored to persisted run evidence.

### P1 - Calendar and freshness reliability

Current focus: remove false stale and false current states.

Acceptance criteria:
- Holiday calendars for supported markets are maintained from approved free sources or explicit local config.
- `MISSING_LATEST_COMPLETED` always stays visible until the missing completed candle is actually stored.
- Scheduler/manual catch-up behavior is consistent with review target session and never treats in-progress daily candles as final EOD.

Dependencies:
- Market session helper, scheduler config/status, local calendar source choice.

Risks:
- Calendar mistakes can undermine trust across the whole stack even when price data exists.

### P2 - Historical snapshot coverage automation

Current focus: once foundation trust is real, make historical context/data-quality snapshots routine enough to support signal quality, calibration, and research history.

Acceptance criteria:
- Snapshot generation is scheduled or operator-guided with bounded recurring coverage.
- Coverage reporting shows where historical lookup is missing because source data was not generated versus unavailable.
- Performance limits remain explicit for stock-level smart-money and data-quality snapshots.

Dependencies:
- Trusted market data baseline, stable scope contract, snapshot module ownership.

Risks:
- Automating snapshots too early will only persist low-trust context at scale.

## Domain recommendation

Do not spend the next cycle on new downstream intelligence until P0 is locally proven with live evidence. For this domain, the product unlock remains simple: a free, trusted, scoped, current, deep, and operable market-data foundation that downstream modules can consume without exceptions.
