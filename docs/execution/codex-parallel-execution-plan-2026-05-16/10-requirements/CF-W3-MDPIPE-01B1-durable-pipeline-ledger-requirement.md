# CF-W3-MDPIPE-01B1 - Durable Pipeline Ledger Foundation Requirement

Date: 2026-05-25

Owner: Team 00 / Team 03 / Team 05

Status: Accepted for bounded implementation by Product Owner direction to redesign and implement automated incremental pipelines after Architect review.

## Product Problem

Automatic Market Data, Data Quality, signal, calibration, context, backtest, Research, and Today Review refreshes cannot be made reliable or visible from UI screens while progress lives only in memory or component-local state.

If a user starts or waits for a bulk operation, navigates away, and returns, the app must still show whether a pipeline is running, completed, partial, failed, skipped, or blocked, plus last run date/time and progress counts.

## User Value

As an investor/trader, I need backend pipeline progress and freshness status to survive navigation and page reloads so I can trust that screens are showing the latest automated work rather than a stale progress bar or a hidden background task.

## Acceptance Criteria

- Add durable `PipelineRun` persistence for scoped pipeline attempts.
- Add durable `PipelineStageRun` persistence for per-stage progress, status, leases, and cache/fingerprint metadata.
- Support statuses: `PENDING`, `RUNNING`, `COMPLETED`, `PARTIAL`, `FAILED`, `SKIPPED`, `BLOCKED`.
- Persist last run timestamps, data-through date, source/input fingerprints, progress counts, warning/error evidence, and duration.
- Persist stage progress fields needed to rehydrate UI after navigation: `processedCount`, `totalCount`, success/partial/fail/skip counts, `nextOffset`, `hasMore`, lease owner, and lease expiry.
- Include cache metadata (`cacheKey`, `cacheStatus`, `cacheExpiresAt`) so later DB-only downstream stages can skip unchanged work.
- Provide module-local repository/service APIs for creating runs, creating stages, acquiring stage leases, recording mid-run progress, completing stages, completing runs, and reading latest stages.
- Do not wire scheduler fanout, route status APIs, frontend status cards, DQ execution, signal execution, or downstream pipelines in this slice.

## Non-Goals

- No `backend/src/server.ts` changes.
- No backend route registry changes in this slice.
- No frontend implementation in this slice.
- No downstream module source edits.
- No provider/live data execution.
- No external queue, Redis, cloud scheduler, paid provider, broker integration, or telemetry.
- No Trade Plan / target / R:R workflow expansion.

## Next Slices

1. `CF-W3-MDPIPE-01B2` read-only pipeline status API.
2. `CF-W3-MDPIPE-01B3` per-screen status/progress cards that rehydrate after navigation.
3. `CF-W3-MDPIPE-01C` Data Quality scheduled stage using the durable ledger.
4. `CF-W3-MDPIPE-01D` downstream DB-only fanout, one stage family at a time.
