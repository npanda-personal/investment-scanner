# Resolution Status

Status: Resolved by Product Owner on 2026-05-17.

Approved option: Option B as ADR direction only, companion durable readiness/evidence storage.

Resolution record: `07-decisions/DECISION-20260517-market-data-durable-readiness-storage-adr-resolution.md`

This item is no longer open in `open-decisions.md`. No Prisma/schema/migration/source/test implementation is approved by this decision; future implementation must be split and separately approved.

# Decision Needed

Decide the approved ADR direction for durable Market Data readiness evidence storage before Prisma, Market Data source, or readiness evidence tests are changed.

# Context

Teams 02, 03, and 04 refined `CF-W1-MD-02` and confirmed durable readiness evidence cannot be implemented safely until Product Owner and Architect decide the storage model, natural key, Prisma impact, migration/no-backfill policy, rollback path, query strategy, and Data Quality handoff.

# Affected Workstream

Workstream: `CF-W1-MD-02`  
Module: `market-data-foundation` with downstream `data-quality-engine` handoff  
Lane: Market Data / Data Quality

# Affected Files

No source, schema, migration, or test files may be modified until this decision is resolved.

Potential future files after ADR approval:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/tests/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**` only if a separate DQE handoff slice is approved
- `backend/tests/modules/data-quality-engine/**` only if a separate DQE handoff slice is approved

# Evidence Inspected

- `06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md`
- `03-architecture/CF-W1-MD-02-architecture-review.md`
- `04-qa/CF-W1-MD-02-qa-plan.md`
- `08-work-packets/CF-W1-MD-02-work-packet.md`
- `10-requirements/CF-W1-MD-02-durable-market-data-readiness-evidence-requirement.md`
- read-only inspection of current `PriceTick` and `LatestPrice` schema shape
- `17-team-outboxes/TEAM-02-requirement-factory.md`
- `17-team-outboxes/TEAM-03-architecture-factory.md`
- `17-team-outboxes/TEAM-04-qa-factory.md`

# Options

Option A: Expand existing price rows.

Evolve existing `PriceTick` / latest-price records toward durable provenance and readiness fields. This may be direct but risks mixing raw market data, derived readiness, and migration complexity.

Option B: Add companion durable evidence storage.

Create a separate durable readiness/evidence storage model keyed by canonical symbol or instrument, region, asset type, timeframe, timestamp or trading date, source, and source symbol where needed. Keep Data Quality Engine as evaluator while Market Data owns durable evidence persistence.

Option C: No schema/source change yet.

Keep current storage and explicitly limit product claims to derived/read-path evidence until a fuller storage migration is approved.

# Codex Recommendation

Option B as ADR direction only, not immediate schema implementation.

# Risk If Approved

Future work likely requires Prisma schema, migration, generated types, repository, service, and focused test changes. Those remain separate approval-gated implementation slices.

# Risk If Rejected

Market Data durable evidence remains incomplete, downstream modules cannot fully trust stored readiness evidence, and product claims must remain limited to derived/read-path checks.

# Impact On Parallel Work

Market Data durable evidence source work waits. Market Data validation policy (`CF-W1-MD-01`), Lane 3 readiness policy, Trade Plan contract prep, audits, and QA planning can continue.

# Exact Consent Needed

Product Owner: approve Option A, B, C, or another ADR direction for durable readiness evidence and product claims.

Architect: approve the storage model direction, natural key requirements, Prisma/migration boundaries, rollback/no-backfill policy, query strategy, and DQE handoff boundary.

QA: approve ADR validation expectations and focused test categories before any schema/source/test implementation.

# Safe Next Step If No Decision Yet

Keep `CF-W1-MD-02` out of Ready for Implementation. Continue docs-only ADR comparison, Market Data validation policy refinement, and downstream blocked-queue maintenance.
