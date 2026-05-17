# TEAM-05 Market Data / Data Quality Domain Audit

Date: 2026-05-17

Team: TEAM-05 - Market Data / Data Quality

Mode: read-only audit/refinement.

## Scope

Primary domain:

- `market-data-foundation`
- `data-quality-engine`
- OHLC evidence
- readiness gates
- data trust
- provider-safe workflows

No application source, Prisma schema, migrations, route registries, shared utilities/UI, package files, frontend files, providers, services, tests, staging, commits, or pushes were changed.

## Subagents Used

- Product / Requirement explorer: ready queue, blocker, and requirement refinement check.
- Architecture explorer: Market Data / Data Quality contract and storage-readiness check.
- QA explorer: QA plan and focused-test coverage check.

All subagents were read-only.

## Ready Work Check

No Team 05 application-code item is Ready for Implementation.

Evidence:

- `12-ready-queue/ready-for-implementation.md` says no active application-code item is ready.
- `CF-W1-MD-02` is approved only as ADR direction: companion durable readiness/evidence storage.
- `CF-W1-MD-01` is still blocked by validation policy decisions.
- `CF-W2-DQ-01` is already completed and must not be repulled.

## Current Domain Evidence

- Canonical `backend/prisma/schema.prisma` still keys `PriceTick` by `symbol + timestamp` and `LatestPrice` by `symbol`.
- The target OHLC/readiness natural key still needs a formal ADR covering instrument or canonical symbol, region, asset type, timeframe, trading date or timestamp, source, and source symbol where needed.
- Market Data currently stores useful but incomplete provenance such as adjusted close, source, ingestion timestamp, and data status. It does not yet persist contract-grade evidence for provider symbol, source fingerprint/run id, validation window, duplicate or invalid provider rows, missing-candle cause, or stale-currentness basis.
- `market-data-foundation.validation.ts` covers basic historical price validation, negative volume, duplicate batch rows, and opt-in spike rejection.
- Future-dated historical candles are not covered by accepted validation policy.
- `adjustedClose` is used in duplicate scoring and coverage, but invalid, zero, negative, missing, or out-of-range adjusted-close behavior remains policy-gated.
- Data Quality Engine defaults missing quality evaluations to fail-closed in `filterEligibleInstruments()` through `missingQualityBehavior ?? 'SKIP'` and exposes use-case tiers.
- Data Quality stale logic remains a 7-calendar-day rule instead of durable latest-completed-session evidence from Market Data.

## Requirement Refinement Findings

### CF-W1-MD-02

State: ADR prep only; source/schema/test implementation blocked.

Needed next:

- Formal ADR for companion durable readiness/evidence storage.
- ADR QA checklist acceptance.
- Future split packets for schema/migration proposal, Market Data repository/service changes, optional DQE handoff, and focused tests.

Do not implement until the ADR is accepted and exact source/schema/test files are reserved.

### CF-W1-MD-01

State: policy/QA prep only; executable validation blocked.

Needed next:

- First-class requirement or policy artifact for future-dated candles, adjusted-close behavior, suspicious volume, spike rejection, and corporate-action-safe spike handling.
- Product Owner + Architect policy decision before source or test changes.

### CF-W2-DQ-01

State: completed bounded Data Quality fail-closed defaults slice.

Do not repull. Downstream consumer enforcement remains separate work.

## QA Readiness

No executable QA was run or approved for this Team 05 pass.

Future command guidance after approved implementation handoff:

```powershell
cd backend
npm.cmd test -- market-data.validation.test.ts --runInBand
```

If storage/readiness repository behavior changes:

```powershell
cd backend
npm.cmd test -- market-data.validation.test.ts market-data-readiness-evidence.invariants.test.ts market-data-storage-readiness.invariants.test.ts market-data.universe.test.ts market-data.repository.test.ts --runInBand
```

If Data Quality source changes:

```powershell
cd backend
npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts data-quality-engine.repository.test.ts data-quality-engine.validation.test.ts data-quality-engine.routes.test.ts --runInBand
```

Provider/scheduler tests remain explicit-approval, mocked-only, and excluded from this pass.

## Blockers

- No active Team 05 app-code Ready queue item.
- Formal `CF-W1-MD-02` ADR is not recorded and accepted.
- Prisma schema, migrations, generated types, and natural-key changes require separate approval.
- Market Data source/test changes require exact later file reservations.
- DQE handoff changes require a separate slice if the ADR needs them.
- `CF-W1-MD-01` policy remains unresolved.
- Angel One, live providers, startup/backfill, repair/backfill behavior, route registries, shared utilities, package changes, and frontend/UI work remain excluded.
- The shared worktree contains many dirty active-execution docs from other teams; Team 05 did not touch them.

## Decisions Opened

None.

Existing open decisions are Team 09 policy blockers and do not block this Team 05 read-only pass.

## Next Recommended Assignment

Route `CF-W1-MD-02` to formal ADR drafting and ADR QA checklist.

Keep Team 05 in audit/refinement mode until one of these is true:

- a Team 05 implementation packet is moved to Ready with exact file reservations, or
- a Team 05 docs-only requirement/ADR support packet is assigned with non-conflicting files.
