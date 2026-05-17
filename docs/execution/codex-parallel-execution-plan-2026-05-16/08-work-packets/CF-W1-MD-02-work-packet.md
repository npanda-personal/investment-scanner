# CF-W1-MD-02 Work Packet

Date: 2026-05-17

## Work Item

Durable Market Data readiness evidence and natural-key decision preparation.

## State

Formal ADR draft prepared.

Application source, Prisma, migrations, providers, services, tests, generated types, Data Quality handoff, and route changes are blocked until separate implementation slices are approved.

ADR draft: `03-architecture/CF-W1-MD-02-durable-readiness-evidence-adr.md`.

## Owner / Lane / Module

- Owner: Team 03 Architecture Factory for formal ADR preparation.
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

## ADR Outcome

The formal ADR draft compares:

- expand `PriceTick` with durable provenance fields,
- create companion OHLC evidence table,
- create durable readiness evidence table,
- keep current storage and limit claims to derived evidence.

It documents:

- target natural key,
- Prisma and migration impact,
- migration/no-backfill plan,
- rollback plan,
- query and test strategy,
- downstream DQ/signal/backtest/trade-plan impact,
- local/free constraints,
- provider and startup exclusions.

This is planning evidence only. It does not approve source/schema/test implementation.

## Future Split Packets

| Packet | Purpose | Current state |
| --- | --- | --- |
| `CF-W1-MD-02A` | Additive Prisma/schema proposal for companion durable evidence storage. | Blocked by schema/migration approval. |
| `CF-W1-MD-02B` | Market Data repository/service write and read model for companion evidence. | Blocked until schema packet acceptance. |
| `CF-W1-MD-02C` | Data Quality Engine handoff from Market Data public evidence outputs. | Blocked until Market Data evidence read model acceptance. |
| `CF-W1-MD-02D` | Downstream adoption through DQE public outputs. | Blocked until DQE contract acceptance. |

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

## Team 03 Relaunch Update - 2026-05-17

Current state remains ADR/decision-prep only and blocked from app-code implementation.

Exact current write scope for this Team 03 pass:

- `03-architecture/next-contracts-to-prepare.md`
- `03-architecture/CF-W1-MD-02-architecture-review.md`
- `06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md`
- `08-work-packets/CF-W1-MD-02-work-packet.md`
- `17-team-outboxes/TEAM-03-architecture-factory.md`

Future source/schema implementation is not reserved. A later source packet must follow an accepted ADR and explicitly reserve Prisma/schema/migration/source/test files if needed.

Current blocker: formal ADR acceptance, ADR QA checklist acceptance, and separate future implementation slice approvals are not yet recorded. Product claims remain limited to derived/read-path evidence until implementation is approved.
