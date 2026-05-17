# Sprint 1B Wave 1 Market Data Storage Audit

Date: 2026-05-17

Status: Workstream B read-only audit evidence.

## 1. Scope Inspected

Read-only scope:
- `backend/src/modules/market-data-foundation/**`
- `backend/tests/modules/market-data-foundation/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/market-data-dq-readiness-contract.md`

No files were modified, staged, reverted, or deleted during this audit. No tests were run for this workstream.

## 2. What Is Already Covered

Current Market Data Foundation behavior already has useful readiness/storage foundations:
- Repository storage has idempotent daily candle behavior.
- Historical prices are validated and partitioned before storage.
- Stored rows are normalized to UTC day.
- Inserts skip duplicates, updates change existing rows by `symbol_timestamp`, and latest price is upserted.
- Existing tests cover insert, update, no-op behavior, source updates, duplicate in-batch handling, readiness stats, repair-state blocking, stale/latest price readiness, invalid OHLC validation, zero-volume evidence, unsupported/manual-required states, and local-only readiness invariants.
- Readiness classification blocks missing latest price, stale price, uncertain market calendar, inadequate rolling history, large recent gaps, missing recent volume, provider unknown or unsupported status, missing provider symbol, inactive or delisted rows, and missing `IN/STOCK` metadata.
- Service-level signoff can block downstream use with `downstreamAllowed: false`.

## 3. Missing Evidence

The current storage and readiness behavior does not yet fully satisfy the active readiness contract:
- Price storage appears symbol/date-centric rather than complete instrument/use-case evidence-centric.
- Durable contract evidence such as `instrument_id`, `asset_type`, `timeframe`, source run or batch id, source fingerprint, provider symbol used, and validation window is not clearly persisted on price rows.
- Database-level uniqueness could not be confirmed because Prisma schema inspection was out of this workstream scope.
- Future-dated candles and malformed or non-positive `adjustedClose` are not clearly blocked at validation/storage.
- Duplicate and invalid OHLC evidence is surfaced as transient sync warnings rather than durable readiness evidence with per-instrument counts.
- Missing candle classification by market-calendar cause is not present as durable evidence.
- The contract thresholds of `95%` price-ready and `90%` metadata-ready are not fully represented in current signoff logic.
- Per-use-case `READY`, `LIMITED`, and `BLOCKED` tiers for signal, backtest, calibration, alerts, portfolio, or copilot consumption remain unproven.

## 4. Future Tests Possible Without Source Changes

Additional backend-only tests are possible without source changes.

Safe future test targets:
- Repository/service behavior with mocked Prisma clients.
- Local validation fixtures.
- Universe readiness classification fixtures.
- Existing signoff behavior.
- Current gaps as explicit characterization tests.

Those tests can document current behavior and expose gaps without provider calls, live services, Prisma migrations, route changes, startup behavior, or UI work.

## 5. Source Changes Required For Full Contract Compliance

Full readiness-contract compliance will likely require source changes later.

Likely source-change areas:
- Tighter validation for future-dated candles and adjusted-close validity.
- Durable readiness evidence fields.
- Stricter threshold and signoff logic.
- Missing-candle cause classification.
- Provider/source provenance storage.
- Per-use-case readiness tier outputs.
- Potential Prisma/storage changes for contract-grade natural keys and provenance.

These are not approved by Wave 1.

## 6. Shared / High-Risk Risks

High-risk areas for future work:
- Prisma schema and storage-key changes.
- API response shape changes.
- Route registry changes if new endpoints are required.
- Shared utility extraction if validation logic is generalized.
- Threshold hardening that blocks existing workflows.
- Provenance changes that affect ingestion, repair runs, and downstream consumers.

All of these require explicit Architect reservation and Product Owner approval.

## 7. Exclusion Confirmation

This audit did not use or approve:
- Angel One.
- Live providers.
- Broker credentials.
- Provider-heavy tests.
- Startup scheduler behavior.
- Startup backfill behavior.
- UI changes.
- Prisma schema changes.
- Route registry changes.
- Shared files.

## 8. Recommended Next Smallest Slice

Recommended next smallest implementation slice:
- Backend-only Market Data storage/readiness characterization tests for future-dated candle handling, adjusted-close validation, duplicate/invalid evidence expectations, `95%`/`90%` threshold expectations, and `downstreamAllowed` blocking.

Recommended boundary:
- Test-only.
- No source changes.
- No Prisma/schema changes.
- No routes.
- No Angel One.
- No live provider calls.
- No startup/backfill.
- No UI.

If those tests reveal failing contract expectations, stop and create an Architect decision record before changing source.
