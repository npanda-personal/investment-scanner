# CF-W1-SIG-TRIGGER-01 QA Plan

Date: 2026-05-17

Owner: Team 04 QA Factory

Status: Accepted for bounded Option A DTO projection validation.

## Scope

Focused backend validation for optional module-local Signal Generation `TriggerObjectV1` projection.

In scope:
- additive optional `triggerContract` DTO field,
- explicit `CONTRACT_INCOMPLETE` and `LEGACY_INCOMPLETE` status,
- explicit unavailable field list and incomplete reasons,
- no invented trigger price, lifecycle state, rule IDs, timeframe, timestamps, strategy version, DQ evidence, source data, or audit evidence,
- preservation of existing Signal Generation DQ behavior.

Out of scope:
- frontend/UI changes,
- downstream consumer migrations,
- signal quality scoring or calibration behavior,
- Trade Plan target/no-target migration,
- alert generation/readiness suppression,
- provider/live market-data checks,
- startup, scheduler, or backfill behavior,
- Prisma/schema, route registry, package, shared utility, shared UI, generated type, or persisted trigger-storage changes.

## Required QA Assertions

- Enriched/read signal outputs include an optional `triggerContract`.
- Projection uses existing signal and enrichment fields only.
- Missing trigger price, lifecycle state, rule IDs, timeframe, persistence timestamps, absent DQ snapshots, and absent strategy versions are marked unavailable.
- Legacy rows are marked `LEGACY_INCOMPLETE`.
- Non-legacy incomplete rows are marked `CONTRACT_INCOMPLETE`.
- Existing Signal Generation DQ tests still pass.
- No direct advice or arbitrary target-price language is introduced.
- No broker, paid/cloud, provider-heavy, live market-data, startup/backfill, UI, package, route-registry, shared-component, generated, or schema behavior is required.

## Focused Command

```powershell
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-engine.validation.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

The combined daemon validation command may include adjacent accepted Alerts Monitoring suites when both bounded tracks are being reconciled together, but SIG-TRIGGER acceptance depends only on the Signal Generation suites above.

## Stop Conditions

Stop QA and return to Orchestrator/Architect if validation requires:
- changing Prisma schema or generated types,
- route registry changes,
- shared utility or shared fixture changes,
- frontend/UI changes,
- downstream consumer changes,
- broad backend suites,
- provider/live market-data calls,
- startup flows, schedulers, or backfills,
- target-price semantics,
- package changes.

## Evidence Required

- Product Owner Option A resolution.
- Implementation handoff with exact changed files.
- Exact focused command output.
- Contract-incomplete and legacy-incomplete assertion notes.
- Confirmation that forbidden scopes were not touched.
- Skipped checks and reasons.
