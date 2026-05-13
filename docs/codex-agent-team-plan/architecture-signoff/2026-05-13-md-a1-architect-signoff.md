# MD-A1 Architect Signoff - Latest Completed EOD Catch-Up Gate

Date: 2026-05-13
Mode: Architect Signoff Mode
Work item: MD-A1 Latest Completed EOD Catch-Up Gate
Decision: Signoff
Next owner: Product Owner for acceptance

## Inputs Reviewed

- `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-market-data-availability-root-cause-notes.md`
- `docs/codex-agent-team-plan/work-packets/2026-05-13-market-data-availability-work-packets.md#md-a1---latest-completed-eod-catch-up-gate`
- `docs/codex-agent-team-plan/developer-handoffs/2026-05-13-md-a1-developer-handoff.md`
- `docs/codex-agent-team-plan/qa-evidence/2026-05-13-md-a1-qa-evidence.md`
- `docs/codex-agent-team-plan/lead-validation/2026-05-13-md-a1-lead-validation.md`
- Current git diff for Market Data Foundation service, tests, and docs.

## Architecture Validation

MD-A1 meets the architecture ask. `evaluateSyncFreshnessGate` now compares the region latest stored trading date with `latestCompletedTradingDateForRegion(region, now)` before applying final-confirmed, cooldown, and market-session no-new-data skips.

When the latest completed EOD candle is missing, the freshness gate allows provider fetches instead of skipping for before-open, market-open/no-in-progress, and closed/no-new-data states. This directly fixes the observed failure mode where latest completed EOD `2026-05-12` was missing while latest stored EOD was `2026-05-11`.

Provider fetch remains capped to completed EOD. The gate produces `providerEndDate` from the latest completed trading date, and both instrument ingestion and scheduled region batches use that cap. During market hours on `2026-05-13`, the focused test verifies the provider end date is `2026-05-12T23:59:59.999Z`, so the in-progress `2026-05-13` candle is not requested.

Final-confirmed and cooldown semantics remain intact when the latest completed candle is already stored. The updated tests retain coverage for final-confirmed skip, before-open no-catch-up skip, weekend no-catch-up skip, and recently synced behavior through the same freshness gate.

## Scope Validation

Changed source/test/docs scope remains appropriate for MD-A1:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- Market Data planning/evidence docs under `docs/codex-agent-team-plan`

No downstream Signal, Signal Quality, Calibration, Strategy Decision, Today Review, Trade Plan, frontend, Prisma schema, migration, package, dependency, paid provider, hosted service, broker integration, or tooling workaround was introduced.

## Verification

Command run from `backend`:

```powershell
npm.cmd test -- market-data.service.test.ts market-data.market-session.test.ts --runInBand
```

Result:

```text
Test Suites: 2 passed, 2 total
Tests:       96 passed, 96 total
```

## Deferred Risks

- MD-A1 does not execute a live provider repair run; operational data repair remains a later gate.
- Deep or shallow-history repair remains MD-A2.
- Provider validation drain and retry classification remain MD-A3.
- Holiday/session accuracy and missing holiday calendar risk remain MD-A5.
- Adjusted-close and volume provenance honesty remains MD-A6.
- Per-instrument gaps beyond the region-level latest stored date remain covered by later repair/backfill work.

## Decision

Architect signoff granted. MD-A1 can proceed to Product Owner acceptance.
