# CF-W1-MD-02 Architecture Review

Date: 2026-05-17

Owner: Team 03 Architecture Factory

## Status

ADR/decision-prep review prepared. Source, schema, migration, provider, route, service, startup, and test implementation are blocked.

## Evidence Inspected

- `AGENTS.md`
- `00-control/active-work-board.md`
- `00-control/risk-register.md`
- `10-requirements/CF-W1-MD-02-durable-market-data-readiness-evidence-requirement.md`
- `04-qa/CF-W1-MD-02-qa-plan.md`
- `12-ready-queue/ready-for-implementation.md`
- `12-ready-queue/blocked-by-shared-file.md`
- `06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md`
- `08-work-packets/CF-W1-MD-02-work-packet.md`
- `backend/prisma/schema.prisma` read-only lines for `PriceTick` and `LatestPrice`
- current backend module/test structure for `market-data-foundation`

## Architecture Finding

The current `PriceTick` natural key is `symbol + timestamp`, and `LatestPrice` is keyed by `symbol`. That is narrower than the root Market Data/OHLC policy target, which expects instrument identity or canonical symbol, region, asset type, timeframe, timestamp or trading date, and source where practical.

Durable readiness evidence cannot be safely implemented without deciding whether evidence belongs in existing price rows, a companion OHLC evidence table, a durable readiness evidence table, or remains derived/read-path only with limited product claims.

## ADR Options To Present Later

The future Decision Packet/ADR should compare:

- expand existing `PriceTick`/latest-price records with durable provenance fields,
- create a companion OHLC evidence table,
- create a durable readiness evidence table,
- keep current storage and explicitly limit product claims to derived/read-path evidence.

The ADR must define natural key, append/upsert/derived semantics, Prisma impact, migration/backfill policy, rollback, query strategy, focused tests, downstream handoff, and local/free constraints.

## File Reservations

No source, schema, migration, or test files are reserved by this review.

Future source reservation is forbidden until ADR approval. If later approved, exact reservations may include:

- `backend/prisma/schema.prisma` and a migration folder only if schema change is approved,
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`,
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`,
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`,
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`,
- focused tests under `backend/tests/modules/market-data-foundation/**`.

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/tests/modules/market-data-foundation/**`
- `backend/tests/modules/data-quality-engine/**`
- route registries
- shared utilities
- package manifests
- generated Prisma/types
- provider, scheduler, startup, repair, backfill, Angel One, broker, and live-provider files
- frontend source, UI tests, and route files
- `04-qa/**`, `10-requirements/**`, `00-control/**`, `12-ready-queue/**`, and decision inbox files for this Team 03 assignment

## Blockers

- Storage model and natural key are not accepted.
- Prisma/migration impact is unknown.
- Migration/backfill/no-backfill and rollback approach are not accepted.
- DQE handoff and downstream durable-vs-derived claims need ADR treatment.

## Readiness Result

Architecture-ready for docs-only ADR/decision recommendation prep. Blocked for all source/schema/test implementation.

