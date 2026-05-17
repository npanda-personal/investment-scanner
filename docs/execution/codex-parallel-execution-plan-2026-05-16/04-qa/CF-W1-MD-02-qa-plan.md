# CF-W1-MD-02 QA Plan

Date: 2026-05-17

Owner: Team 04 QA Factory

Status: QA planning only. `CF-W1-MD-02` is an ADR/contract-prep item until Product Owner and Architect approve storage and Prisma/OHLC decisions.

Current status refresh: recent setup authorization permits ADR/work-packet preparation, but it does not approve schema/source/test execution, Prisma commands, provider checks, or Market Data readiness validation.

## Scope

QA plan for durable Market Data readiness evidence and natural-key ADR review.

ADR review scope:
- natural key for idempotent OHLC/price evidence,
- source/provenance fields,
- readiness evidence durability,
- duplicate/missing/invalid candle evidence,
- Data Quality Engine handoff,
- query and test strategy,
- migration and rollback plan,
- local-first and zero-incremental-cost constraints.

No source, tests, Prisma schema, routes, package files, providers, services, live services, startup/backfill, UI, UI smoke, broad suites, Prisma mutation commands, Angel One, or build checks are approved by this plan.

## Required ADR QA Assertions

- ADR defines whether OHLC/price records are append-only, idempotent/upserted, derived, cached, provider-specific, or normalized canonical records.
- ADR defines a natural key that includes instrument or symbol identity, region, asset type, timeframe, timestamp/date, and source.
- ADR accounts for provider/source metadata such as source symbol, source timestamp when available, ingested timestamp, provider/source name, and validation-window evidence.
- ADR explains how duplicate, missing, invalid OHLC, stale currentness, unsupported scope, and provider gaps become durable readiness evidence.
- ADR explains how Data Quality Engine consumes or references Market Data readiness evidence without duplicating ownership.
- ADR includes migration path, rollback path, query strategy, and focused test strategy.
- ADR states which Prisma/schema changes are proposed and keeps them blocked until explicit approval.
- ADR preserves local-first, zero-incremental-cost constraints and does not introduce paid/cloud/provider lock-in.
- ADR excludes live providers, Angel One, startup/backfill behavior, broker execution, and UI work unless later approval gates are recorded.

## Focused Command Guidance

No executable command is approved for the ADR-only phase.

Future backend characterization after ADR approval and scoped implementation:

```powershell
cd backend
npm.cmd test -- market-data-readiness-evidence.invariants.test.ts market-data-storage-readiness.invariants.test.ts market-data.universe.test.ts market-data.validation.test.ts market-data.repository.test.ts --runInBand
```

Provider and startup-adjacent tests remain excluded by default. The following command is approval-gated only for mocked-provider scope with explicit no-live-provider controls, Team 00 validation approval, and no startup/backfill execution:

```powershell
cd backend
npm.cmd test -- market-data.provider.test.ts market-data.scheduler.test.ts market-data.exchange-eod-adapter.test.ts --runInBand
```

Backend build is approval-gated after accepted implementation, Team 00 validation approval, and resource check:

```powershell
cd backend
npm.cmd run build
```

Frontend build, Playwright/UI smoke, live local provider validation, live services, Angel One validation, repair/backfill jobs, broad suites, and Prisma mutation commands are excluded unless explicitly approved later in a scoped implementation packet.

## Stop Conditions

Stop QA and return to Orchestrator/Architect if:
- ADR proposes schema/storage changes without Product Owner and Architect approval,
- natural key or provenance model is ambiguous,
- DQ handoff ownership is unclear,
- tests require live providers or services,
- startup/backfill behavior is needed,
- Prisma mutation commands are requested,
- provider-heavy, broad, UI, or paid/cloud validation is requested.
- any request treats setup authorization as approval for schema/source/test work.

## Evidence Required Later

- ADR file reference and approval state.
- Natural-key and provenance checklist result.
- Migration/rollback checklist result.
- Focused command output only after approved implementation.
- Confirmation no live providers, startup/backfill, Prisma mutation, UI, paid/cloud, or broker paths were used.
- Skipped checks and reasons.
