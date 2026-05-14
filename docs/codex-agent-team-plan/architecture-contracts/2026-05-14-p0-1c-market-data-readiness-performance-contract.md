# P0.1C Market Data Readiness Performance Contract - 2026-05-14

Mode: Architecture Planning Mode
Owner: Solution Architect / Senior Fullstack Lead
Related blocker: `BLK-0006`
Related evidence: [P0.1C operation report](../operations/2026-05-14-md-a5-operational-drain-report.md), [P0.1C QA evidence](../qa-evidence/2026-05-14-md-a5-operational-drain-qa-evidence.md)
Status: `Ready for Implementation`

## Problem

P0.1C trusted-universe operational drain was blocked before mutation. Local read-only and dry-run Market Data calls took about 44-48 seconds and memory crossed the 95% cleanup gate.

This is a code-path performance defect before it is an operational drain problem.

## Root Cause

- `reviewReadinessSummary` recomputes full-universe state through `universeHealth`, `trustedReviewUniverseHealth`, and `repairPlan`.
- `repairRun` dry-run computes `beforeHealth` and `beforeRepairPlan`, so dry-run latency mirrors read-only summary latency.
- `universeHealth`, `trustedReviewUniverseEvaluation`, `repairPlan`, and `priceBackfillCandidates` each load scoped stocks and rebuild readiness/stats.
- `priceReadinessStatsForSymbols` calls `priceQualityRowsForSymbols`, which fans out into per-symbol price-row queries. On the local `IN / STOCK` universe, that query shape is too slow.
- `backfillPrices` executes provider fetches sequentially for the selected page. This affects mutating drain throughput after the pre-drain summary path is fixed.

## Design Direction

### Slice A - Repository Stats Query Shape

Owner: Market Data backend repository developer.

Allowed files:

- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- focused repository tests under `backend/tests/modules/market-data-foundation/`

Required behavior:

- Preserve the output contract of `priceReadinessStatsForSymbols`.
- Replace per-symbol recent-price query fanout with a set-based or bounded-query approach.
- Keep rolling-window, volume, gap, latest-date, first-date, and bar-count semantics unchanged.
- Add a test that fails if the repository falls back to one DB query per symbol for recent price quality rows.

### Slice B - Request-Scope Readiness Snapshot Reuse

Owner: Market Data backend service developer.

Allowed files:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- focused service tests under `backend/tests/modules/market-data-foundation/`

Required behavior:

- Reuse one scoped stock/readiness/stats snapshot inside a single summary request where possible.
- Avoid duplicate full-universe recomputation in `reviewReadinessSummary`.
- Avoid duplicate precompute work for dry-run `repairRun`.
- Preserve DTO shape and blocker/signoff semantics.

### Slice C - Bounded Price Backfill Workers

Owner: Market Data backend service developer after Slices A/B, or the same owner if no file conflict exists.

Allowed files:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- focused service tests under `backend/tests/modules/market-data-foundation/`

Required behavior:

- Process a selected price-backfill page with bounded worker concurrency.
- Default concurrency must remain conservative for Yahoo/free-source safety.
- Summaries must remain deterministic enough for QA: processed, updated, failed, no-op, fallback-required, samples, and warnings must stay accurate.
- No paid provider or paid service is allowed.

## Non-Goals

- Do not relax Market Data trust gates.
- Do not change Data Quality, signal, strategy, or trade-plan readiness rules in this packet.
- Do not run a full mutating drain until the pre-drain paths are materially faster and memory-safe.
- Do not introduce paid provider integrations.

## Acceptance Criteria

- `repair-plan`, `review-readiness-summary`, and dry-run `repair-run` are materially faster on the same local data set. Target: under 10 seconds locally; lower is preferred.
- Response fields and business decisions remain compatible with existing tests and docs.
- Dry-run remains no-mutation.
- Price backfill, if touched, is bounded and reports partial progress honestly.
- Focused backend tests pass before QA.

