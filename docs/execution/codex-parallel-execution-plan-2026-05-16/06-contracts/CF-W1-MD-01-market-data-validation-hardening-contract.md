# CF-W1-MD-01 Market Data Validation Hardening Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

Status: Narrowed contract prepared after Option A decision and Team 05 readiness inspection. Not Ready for Implementation.

## Decision Input

Product Owner approved Option A in `07-decisions/DECISION-20260517-market-data-validation-hardening-policy-resolution.md`.

This approves conservative validation hardening only. It does not approve durable readiness storage, Prisma/schema changes, provider behavior, startup/backfill, or frontend work.

After Team 05 readiness inspection on 2026-05-18, the first promotable slice is narrowed further to a reject-only validation child inside the existing validator/test/doc surface.

## Contract Intent

Harden Market Data Foundation historical-price validation so malformed, future-dated, or misleading OHLC rows cannot silently become trusted downstream evidence.

## Narrowed Child Intent

The first Ready-recommendable child is reject-only validation hardening:

- future-dated candle rejection;
- invalid `adjustedClose` rejection when `adjustedClose` is present;
- negative volume remains invalid;
- duplicate-row determinism remains unchanged;
- spike rejection remains opt-in and off by default.

This narrowed child must not introduce a warning/evidence channel, readiness-storage behavior, repository/provider plumbing, or frontend semantics.

## Required Behavior

- Future-dated candles are rejected relative to a backward-compatible optional evaluation-date boundary or the validator's existing default behavior until a later packet explicitly reserves wider call-site plumbing.
- `adjustedClose`, when present, must be finite, greater than zero, and within accepted policy bounds.
- Negative volume remains invalid.
- Spike rejection remains opt-in until durable corporate-action evidence exists.
- Existing OHLC finite-number, positive-price, low/high, duplicate-row, and opt-in spike behaviors remain deterministic.
- Validation reason strings remain stable and explainable for future durable readiness evidence.

## Explicitly Deferred From This Narrowed Child

- missing `adjustedClose` fallback/incomplete evidence;
- zero-volume or suspicious-volume warning/readiness evidence;
- deterministic suspicious-volume thresholds or reason strings;
- repository/provider/startup call-site changes needed to plumb a formal latest-session boundary everywhere.

## Exact Future File Reservations

Allowed after Team 00 Ready promotion:

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

Forbidden:

- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.exchange-eod-adapter.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.angel-one-provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.queue.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/tests/modules/market-data-foundation/market-data-readiness-evidence.invariants.test.ts`
- `backend/tests/modules/market-data-foundation/market-data-storage-readiness.invariants.test.ts`
- Data Quality Engine source or tests
- Prisma schema or migrations
- generated files
- route registries
- shared backend utilities
- package manifests
- providers, schedulers, startup/backfill, repair, sync, import, Angel One, broker, live-provider, paid/cloud, or telemetry flows
- frontend source, shared UI, or Playwright tests
- durable readiness storage or natural-key implementation under `CF-W1-MD-02`

## Test Contract

Focused tests must prove:

- future-dated candle rejection;
- invalid `adjustedClose` rejection;
- negative volume invalid behavior remains;
- duplicate row selection remains deterministic;
- opt-in spike rejection remains off by default and deterministic when enabled;
- no provider/live/startup/backfill or schema path is required.

Deferred test scenarios for a later child:

- missing `adjustedClose` fallback/incomplete evidence;
- zero-volume or suspicious-volume warning/readiness evidence.

## Stop Conditions

Stop and return to Team 00 / Architect if the implementation needs repository persistence changes, durable storage, Prisma/schema, provider/source context, shared utility, route registry, generated, package, startup/backfill, live data, frontend scope, or a validator-owned warning/evidence channel.
