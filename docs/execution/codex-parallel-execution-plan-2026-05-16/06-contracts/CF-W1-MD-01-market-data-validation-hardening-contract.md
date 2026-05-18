# CF-W1-MD-01 Market Data Validation Hardening Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

Status: Contract prepared after Option A decision. Not Ready for Implementation.

## Decision Input

Product Owner approved Option A in `07-decisions/DECISION-20260517-market-data-validation-hardening-policy-resolution.md`.

This approves conservative validation hardening only. It does not approve durable readiness storage, Prisma/schema changes, provider behavior, startup/backfill, or frontend work.

## Contract Intent

Harden Market Data Foundation historical-price validation so malformed, future-dated, or misleading OHLC rows cannot silently become trusted downstream evidence.

## Required Behavior

- Future-dated candles are rejected relative to an accepted evaluation date or latest completed market session date.
- `adjustedClose`, when present, must be finite, greater than zero, and within accepted policy bounds.
- Missing `adjustedClose` is allowed only as fallback/incomplete evidence and must not be treated as a trusted completeness claim.
- Negative volume remains invalid.
- Zero or suspicious volume is warning/readiness evidence unless a later asset-class policy marks it invalid.
- Spike rejection remains opt-in until durable corporate-action evidence exists.
- Existing OHLC finite-number, positive-price, low/high, duplicate-row, and opt-in spike behaviors remain deterministic.
- Validation reason strings remain stable and explainable for future durable readiness evidence.

## Exact Future File Reservations

Allowed after Team 00 Ready promotion:

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

Forbidden:

- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
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
- missing `adjustedClose` fallback/incomplete handling;
- negative volume invalid behavior remains;
- zero or suspicious volume follows accepted warning/readiness policy;
- duplicate row selection remains deterministic;
- opt-in spike rejection remains off by default and deterministic when enabled;
- no provider/live/startup/backfill or schema path is required.

## Stop Conditions

Stop and return to Team 00 / Architect if the implementation needs repository persistence changes, durable storage, Prisma/schema, provider/source context, shared utility, route registry, generated, package, startup/backfill, live data, or frontend scope.
