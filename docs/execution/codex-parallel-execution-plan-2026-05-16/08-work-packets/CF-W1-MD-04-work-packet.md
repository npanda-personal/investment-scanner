# CF-W1-MD-04 Work Packet

Date: 2026-05-19

## Work Item

Market Data per-instrument freshness and sync provenance.

## State

Ready candidate for one bounded backend-local child. Not yet promoted for implementation.

This slice is intentionally additive, no-schema, no-route, and backend-only.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 05 Market Data / Data Quality
- Lane: Lane 1
- Module: `market-data-foundation`

## Allowed Files After Ready Promotion

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.queue.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.universe.ts`
- `backend/src/modules/market-data-foundation/index.ts`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.scheduler.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.market-session.test.ts`
- backend and frontend route registries
- all frontend `market-data-foundation` files
- shared backend utilities
- shared frontend components
- package manifests
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/research-hub/**`
- `backend/src/modules/today-trade-review/**`
- provider, startup/backfill, live-provider, paid/cloud, broker, telemetry, or credential files

## Required Behavior

Future implementation must:

- add additive per-instrument freshness evidence to existing Market Data instrument responses;
- expose latest completed trading date, latest stored trading date, lag-days basis, and stable source-side freshness reason codes;
- expose stable sync provenance for no-new-data skip, no-op storage, normal stored rows, and catch-up paths on existing sync responses;
- expose stable catalog run freshness summary fields so region-current/instrument-stale mismatch is machine-safe rather than only a warning string;
- preserve existing stale-task selection behavior already fixed on `dev`;
- preserve current routes, query params, provider behavior, scheduler behavior, repository behavior, and research-support wording;
- keep DQE ownership untouched and avoid introducing Market Data-owned readiness labels.

## Explicitly Deferred

- repository-backed batch loading of persisted instrument sync-state rows
- Prisma/schema/generated changes
- controller/router/validation changes
- provider/scheduler/worker/queue changes
- frontend rendering
- Data Quality Engine adoption
- Today Review adoption
- Research Hub adoption
- shared DTO or shared utility work

## Dependency And Parallel-Safety Notes

- `CF-W1-MD-04` is still a docs-only item and is not currently in Ready.
- The live runtime queue shows active work on `CF-W1-SIG-02`, not on Market Data source.
- The recent stale-catalog fix already landed on `dev`; this packet must not reopen that implementation scope.
- The future writer set is entirely inside `market-data-foundation`.

Result:

- no active shared-`dev` writer overlap was found
- safe for parallel routing from a file-reservation standpoint
- not safe to run in parallel with any future Market Data packet that also reserves `market-data-foundation.service.ts`, `market-data-foundation.types.ts`, `market-data-foundation.md`, or `market-data.service.test.ts`

## QA Handoff Notes For Team 04

Team 04 should prepare focused backend QA for:

- current, stale, missing, and unknown per-instrument freshness mapping
- lag-days exposure and latest-completed-vs-latest-stored date pairing
- region-current/instrument-stale mismatch exposure
- no-new-data skip provenance
- no-op storage provenance
- catch-up-eligible and catch-up-stored provenance
- preserved sync behavior with no provider/scheduler drift
- no accidental DQE-style readiness scoring introduced by Market Data

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts --runInBand
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- repository edits
- Prisma/schema/generated changes
- route/controller/validation changes
- provider/scheduler/worker/queue changes
- frontend work
- shared utility or shared DTO changes
- Data Quality Engine, Research Hub, or Today Review source edits
- widening into readiness or eligibility scoring

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation and sequencing.

This packet is bounded enough for Ready review, but Team 03 does not self-promote implementation.
