# CF-W3-MDPIPE-01 - Incremental Pipeline Architecture

Date: 2026-05-25

Architect: Team 03

Status: Accepted architecture direction. First source slice is bounded to Market Data Foundation.

## Current State

- `MarketDataFoundationScheduler` already runs every 15 minutes when enabled, but it only calls Market Data sync.
- `syncScheduledRegion()` and catalog sync still fall back to symbol-centered fetch loops.
- Angel One historical calls are globally throttled and chunked, making them unsuitable as the broad-universe latest EOD loader.
- Official NSE EOD parsing and URL builders already exist in Market Data Foundation, but they are used as a per-symbol fallback instead of a date-bulk primary path.
- Downstream modules expose a mix of run, evaluate, refresh, and on-demand read methods. There is no single cross-module durable pipeline ledger.

## Target Model

Use a local in-process pipeline scheduler backed by durable run/stage state in a later slice. The scheduler should run every 15 minutes, detect whether the latest completed trading date or source fingerprint changed, then run only required stages.

No external queue, Redis, cloud scheduler, paid provider, broker, or telemetry is allowed.

## Source Strategy

- Primary latest EOD source for `IN/STOCK`: official exchange daily bulk files where available.
- Fallback: Angel One for validation, token/deep-gap repair, or uncovered rows.
- Existing Yahoo-compatible paths remain for non-IN or legacy fallback scopes.

## Stage Contract

Each future stage should accept:

- `region`
- `assetType`
- `timeframe`
- `dataThroughDate`
- `changedInstrumentIds` or `changedSymbols`
- `triggerType` (`scheduled`, `manual`, `startup`, `repair`)
- `sourceRunId` or stage predecessor identifier when durable ledger exists
- batch limits and worker concurrency

Each stage should return:

- status
- processed count
- inserted/updated/no-op/skipped counts where applicable
- warnings/errors
- input and output freshness evidence
- next action if blocked

## Dependency Graph

1. Market Data Foundation latest EOD load.
2. Data Quality Engine evaluation.
3. Signal Generation Engine raw signals.
4. Signal Calibration Engine.
5. Historical Context Snapshots.
6. Market Context Intelligence and sector rotation.
7. Signal Quality Lab.
8. Smart Money Intelligence.
9. Strategy Decision Engine.
10. Backtesting Strategy Lab bounded proof refresh.
11. Trade Plan Risk Engine only as compatibility or Trusted Signal Candidate health support.
12. Research Hub / Research Command Center projection.
13. Today Review projection.

## Slice 1 Architecture

`CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD`

Add a Market Data Foundation service-level official EOD bulk path:

1. Determine latest completed trading date for `IN/STOCK`.
2. Download one official NSE security bhavdata CSV for that date.
3. Parse it with the existing exchange EOD adapter.
4. Match parsed rows against active stale local instruments by symbol/provider/source/display aliases.
5. Store matched rows under canonical local symbols with existing idempotent `storeHistorical()` semantics.
6. Update per-instrument and catalog sync state summaries.
7. Fall back to the existing per-symbol provider loop if the official file is unavailable, disabled, or has no matching rows.

## Slice 1 File Reservation

Allowed source files:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

Allowed tests:

- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.scheduler.test.ts`

Allowed active execution docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/**`

Forbidden in Slice 1:

- Prisma schema or migrations.
- Backend route registry.
- Frontend route registry.
- Shared backend utilities.
- Shared UI.
- Package manifests.
- Generated files.
- New external services.
- Startup/backfill behavior expansion beyond the existing scheduler path.
- Downstream module source edits.
- Frontend implementation.

## Later Architecture

A durable pipeline ledger should add:

- `PipelineRun`
- `PipelineStageRun`
- per-source/date/fingerprint cache metadata
- stage leases
- idempotency keys by scope, stage, data-through date, and model/rule version

That later slice requires explicit schema/migration approval.

## Architect Decision

Accept the phased architecture. Implement Slice 1 first because it removes the largest current bottleneck without requiring schema, route, package, shared utility, UI, or downstream module changes.
