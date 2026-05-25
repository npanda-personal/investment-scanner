# CF-W3-MDPIPE-01B1 - Durable Pipeline Ledger Architecture

Date: 2026-05-25

Architect: Team 03

Status: Accepted and implemented as the first prerequisite for downstream pipeline fanout.

## Decision

Implement a backend-only `pipeline-orchestration` module with Prisma-backed `PipelineRun` and `PipelineStageRun` records before wiring Data Quality, signals, Research, Today Review, or UI progress cards.

The architect rejected a no-schema DQ-only scheduler shortcut because it would be non-durable, repeat offset-zero work, misuse Market Data sync state, or silently expand scheduler/startup behavior.

## Module Boundary

New module:

- `backend/src/modules/pipeline-orchestration`

The module owns:

- run/stage persistence,
- idempotency key generation,
- stage leases,
- mid-run progress persistence,
- cache/fingerprint metadata,
- latest stage lookup.

The module does not own:

- Market Data ingestion,
- Data Quality evaluation,
- Signal/Strategy/Backtest execution,
- Research or Today Review projection,
- scheduler startup,
- routes or UI.

## Persistence

`PipelineRun` records the scoped pipeline attempt.

`PipelineStageRun` records each stage attempt and supports:

- idempotency by stage/scope/date/fingerprint,
- single-worker lease claim,
- batch progress,
- navigation-resilient UI progress,
- cache metadata for DB-only downstream reads.

## Performance Direction

Later stages must read from local persisted data and avoid external providers unless a separate provider/live decision approves it.

The ledger supports performance by recording:

- `inputFingerprint` / `outputFingerprint`,
- `cacheKey` / `cacheStatus` / `cacheExpiresAt`,
- `changedInstrumentCount`,
- bounded batch offsets,
- `hasMore`,
- per-stage warning/error evidence.

This enables stage workers to skip unchanged inputs and lets UI screens show last progress without recomputing datasets.

## File Reservation

Allowed source:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/202605250001_pipeline_orchestration_ledger/migration.sql`
- `backend/src/modules/pipeline-orchestration/**`
- `backend/tests/modules/pipeline-orchestration/**`
- active execution docs

Forbidden in this slice:

- `backend/src/server.ts`
- `backend/src/api/routes.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- downstream module source/tests
- frontend files
- package manifests
- provider/live behavior
- startup/backfill expansion
