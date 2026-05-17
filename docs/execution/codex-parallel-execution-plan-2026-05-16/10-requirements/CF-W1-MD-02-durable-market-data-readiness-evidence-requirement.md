# CF-W1-MD-02 - Durable Market Data Readiness Evidence Requirement

Date: 2026-05-17

## Status

ADR direction resolved. Not Ready for Implementation.

Product Owner approved Option B as ADR direction only on 2026-05-17: companion durable readiness/evidence storage. Application source, tests, Prisma schema, migrations, routes, providers, services, startup/backfill, schedulers, and package changes remain blocked until separate implementation slices are approved.

## Product Value

Downstream modules can only treat market data as trusted when Market Data Foundation can explain the source, scope, identity, freshness, and validation evidence behind the OHLC/latest-price records it provides. Durable readiness evidence is needed before signal, alert, portfolio, watchlist, backtesting, calibration, trade-plan, or copilot workflows can claim contract-grade market-data trust.

## Current Evidence

Latest inputs:

- `11-module-audits/audit-market-data-data-quality.md`
- `11-module-audits/daemon-cycle-readiness-audit-2026-05-17.md`
- `17-team-outboxes/TEAM-01-audit-factory-2026-05-17.md`
- `17-team-outboxes/TEAM-03-architecture-factory-2026-05-17.md`
- `17-team-outboxes/TEAM-04-qa-factory-2026-05-17.md`
- `17-team-outboxes/TEAM-05-market-data-data-quality-2026-05-17.md`
- `12-ready-queue/blocked-by-shared-file.md`

Observed gaps:

- Current price storage is still centered primarily on `symbol + timestamp`, which is narrower than the target OHLC/readiness natural key.
- Durable per-instrument/candle evidence is incomplete for provider symbol, source fingerprint, batch/run identity, validation window, duplicate/invalid OHLC rows, missing-candle cause, stale-currentness basis, and adjusted-close fallback.
- Some validation behavior remains policy-gated, including future-dated candles, adjusted-close validity, and spike rejection.
- Data Quality stale logic is still calendar-day based rather than tied to latest-completed-session evidence.
- Existing characterization tests are useful but do not prove full durable provenance or contract-grade readiness storage.

## Exact Dependencies

- Product Owner and Architect must choose the storage/evidence strategy before source or schema work starts.
- The future ADR must align with root `AGENTS.md` Market Data and OHLC policy, Data Quality ownership, global market scope, batch orchestration, and local-first zero-incremental-cost constraints.
- Data Quality Engine must remain the owner of readiness evaluation; Market Data Foundation must not duplicate downstream DQ scoring logic.
- The future ADR must define how downstream modules distinguish durable evidence from derived/read-path evidence.
- `06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md` must be accepted or updated by Architecture.
- `04-qa/CF-W1-MD-02-qa-plan.md` must be accepted or updated by QA for ADR review.
- Any later source work requires a separate approved work packet and ready-queue entry.

## Resolved ADR Direction

Resolution: `07-decisions/DECISION-20260517-market-data-durable-readiness-storage-adr-resolution.md`

Approved direction:

- Use companion durable readiness/evidence storage.
- Target natural key should include canonical symbol or instrument, region, asset type, timeframe, timestamp or trading date, source, and source symbol where needed.
- Market Data owns durable evidence persistence.
- Data Quality Engine remains the evaluator.
- Until implementation is approved, product claims remain limited to derived/read-path evidence.

The ADR still must cover:

- append-only versus idempotent/upserted versus derived/cached semantics,
- Prisma schema and migration impact,
- historical backfill or no-backfill plan,
- rollback plan,
- query strategy,
- focused test strategy,
- downstream Data Quality and signal/portfolio/watchlist/alert/backtest/trade-plan impact,
- local/free constraints,
- provider, Angel One, startup, scheduler, and repair/backfill exclusions.

## Candidate Acceptance Criteria

For the ADR / decision phase:

- The ADR defines whether OHLC/price records are append-only, idempotent/upserted, derived, cached, provider-specific, normalized canonical records, or some documented combination.
- The ADR defines a natural key that includes instrument identity or canonical symbol, region, asset type, timeframe, timestamp or trading date, and source.
- The ADR accounts for source symbol/provider symbol, source timestamp where available, ingested timestamp, provider/source name, batch/run identity or source fingerprint, and validation-window evidence.
- The ADR explains how duplicate, missing, invalid OHLC, stale currentness, unsupported scope, provider gaps, zero/suspicious volume, and adjusted-close fallback become durable or explicitly non-durable readiness evidence.
- The ADR defines the Data Quality Engine handoff without moving DQE ownership into Market Data Foundation.
- The ADR lists exact proposed Prisma/schema changes, if any, and keeps them blocked until explicit approval.
- The ADR includes migration, rollback, query, and focused-test strategy.
- The ADR preserves local-first, zero-incremental-cost constraints and introduces no paid/cloud/provider lock-in.
- Downstream consumers know which evidence is durable and which remains derived or not available.
- No source, test, Prisma, provider, service, route, package, generated, startup/backfill, repair, or UI work is performed in this phase.

## Current Allowed Files

For this documentation-only requirement pass:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-02-durable-market-data-readiness-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`

## Future Allowed Files For ADR Prep Only

After Orchestrator assignment, the next safe work remains active execution documentation only, likely under:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/**`

These are not source reservations.

## Forbidden Without Separate Approval

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/tests/modules/market-data-foundation/**`
- `backend/tests/modules/data-quality-engine/**`
- `backend/src/api/routes.ts`
- shared utilities
- package manifests
- generated Prisma/types
- provider, scheduler, startup, repair, backfill, Angel One, broker, or live-provider files
- frontend source, UI tests, or route files
- root `AGENTS.md`, `docs/AGENTS.md`, or `docs/codex-agent-team-plan/**`

## Shared-File Risk

Risk: High.

Any implementation could affect Prisma schema, OHLC storage semantics, generated types, Market Data repository/service contracts, Data Quality handoff behavior, and downstream trust claims. No source or schema reservation is safe until the ADR is accepted. This item must remain docs-only until the Product Owner and Architect choose the storage model.

## Stop Conditions

- The storage model or natural key remains ambiguous.
- A proposed path changes Prisma schema, migrations, generated types, Market Data source, Data Quality source, routes, packages, providers, startup/backfill, repair jobs, or UI before ADR approval.
- The ADR requires live providers, Angel One, paid/cloud services, broker behavior, or external telemetry.
- The DQE handoff is unclear or duplicates readiness scoring outside Data Quality Engine ownership.
- Tests would claim durable evidence while the evidence is still transient or derived.

## Next Gate

Formal ADR preparation and ADR QA checklist acceptance. This requirement cannot move to app-code readiness until separate implementation work packets reserve exact source, schema, migration, generated, repository/service, Data Quality handoff, and test files as applicable.
