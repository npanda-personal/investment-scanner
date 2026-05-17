# CF-W1-MD-02 Work Packet

Date: 2026-05-17

## Work Item

Durable Market Data readiness evidence and natural-key decision preparation.

## State

Architecture-ready for later Decision Packet / ADR drafting only.

Application source, Prisma, migrations, providers, services, tests, and route changes are blocked.

## Owner / Lane / Module

- Owner: Team 03 Architecture Factory for decision preparation.
- Lane: Lane 1.
- Module: market-data-foundation.

## Current Allowed Files

Only active execution documentation under:

- `03-architecture/**`
- `06-contracts/**`
- `08-work-packets/**`

## Current Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/tests/modules/market-data-foundation/**`
- `backend/src/api/routes.ts`
- shared utilities
- package manifests
- generated Prisma types
- provider, scheduler, startup, repair, backfill, Angel One, broker, or live-provider files

## Decision Packet Inputs Needed Later

The future Decision Packet / ADR should compare:

- expand `PriceTick` with durable provenance fields,
- create companion OHLC evidence table,
- create durable readiness evidence table,
- keep current storage and limit claims to derived evidence.

It must cover:

- target natural key,
- Prisma and migration impact,
- backfill/migration plan,
- rollback plan,
- query and test strategy,
- downstream DQ/signal/backtest/trade-plan impact,
- local/free constraints,
- provider and startup exclusions.

## Future Source Reservation After Decision

Only after decision approval, a source work packet may reserve exact files such as:

- `backend/prisma/schema.prisma` and migration folder, if schema change is approved.
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- focused module tests under `backend/tests/modules/market-data-foundation/**`

These are not reserved for implementation by this packet.

## Stop Conditions

Stop if asked to implement before Product Owner and Architect choose the storage model.

Do not create live-provider, Angel One, startup/backfill, or repair-run work as part of this item.

## Acceptance Criteria For This Packet

- Durable evidence contract is documented.
- Natural-key decision point is explicit.
- No source/schema implementation is opened.
- Future Decision Packet requirement is clear.

