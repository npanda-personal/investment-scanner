# Sprint 1B Wave 2 Market Data Storage Characterization Audit

Date: 2026-05-17

Status: Workstream B documentation-only audit.

## 1. Scope

Read-only audit scope:
- `backend/src/modules/market-data-foundation/**`
- `backend/tests/modules/market-data-foundation/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/market-data-dq-readiness-contract.md`

Wave 2 implementation scope inspected:
- `backend/tests/modules/market-data-foundation/market-data-storage-readiness.invariants.test.ts`

No application source, existing tests, Prisma schema, route registry, shared utility, shared UI, package manifest, provider, startup, or frontend file was modified for this audit.

## 2. Existing Repository / Storage Behavior Already Characterized

Existing tests already cover:
- Bulk insert/update summary behavior.
- Duplicate prevention through `createMany({ skipDuplicates: true })`.
- Update behavior for changed daily candles.
- No-op behavior for unchanged daily candles.
- Source updates when a fallback source confirms an existing candle.
- Price readiness stats using repository query output.
- Validation partitioning for malformed and duplicate historical prices.
- Universe readiness classification for stale/latest price, missing price, unsupported/manual-required states, and metadata gaps.

## 3. New Wave 2 Test Coverage

The new Wave 2 test adds focused characterization for:
- Normalized daily storage timestamp behavior.
- Stored provider/source evidence where current repository behavior exposes it: `source`, `region`, `exchange`, and `dataStatus`.
- Latest price upsert evidence.
- Symbol/date idempotency for identical stored candles.
- Changed candle updates through the repository's current `symbol_timestamp` key.
- Duplicate candle handling before storage.
- Invalid OHLC row skipping before storage.
- Zero-volume storage visibility with readiness blocking.
- Stale and missing latest-candle readiness blockers from repository readiness stats.
- Unsupported and manual-required instrument readiness blockers.
- Local validation behavior without Angel One, live providers, startup, or UI dependencies.

Focused command:

```text
cd backend
npm test -- market-data-storage-readiness.invariants.test.ts
```

Result:

```text
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
```

## 4. Evidence Still Missing

The active readiness contract still requires evidence not fully represented by current storage behavior:
- Durable `instrument_id` on price rows.
- Asset class and timeframe on persisted price rows.
- Provider symbol used for ingestion.
- Source run id, batch id, or source fingerprint on persisted price rows.
- Validation window start/end on stored readiness evidence.
- Provider classification and retry/cooldown state stored with readiness evidence.
- Missing-candle cause classification.
- Per-instrument duplicate and invalid OHLC counts stored as durable readiness evidence.
- Contract-level `95%` price-ready and `90%` metadata-ready threshold decisions in storage/signoff outputs.
- Per-use-case `READY`, `LIMITED`, and `BLOCKED` storage/readiness records for downstream consumers.

## 5. What Cannot Be Tested Without Source Changes

The following cannot be made to pass as contract-complete behavior without changing source and possibly schema:
- Persisting `instrument_id`, asset class, timeframe, provider symbol, run id, source fingerprint, and validation window on each OHLC row.
- Database-level natural key enforcement beyond the current observed `symbol_timestamp` usage.
- Durable missing-candle cause classification.
- Durable duplicate/invalid OHLC evidence records.
- Durable retry-cooldown state tied to stored price/readiness evidence.
- Full use-case-tier readiness storage for signals, backtests, calibration, alerts, portfolio, watchlists, and copilot.

## 6. Natural-Key / Idempotency Assessment

Current characterized behavior:
- Repository write lookup is symbol/date-centric.
- New daily candles are normalized to UTC midnight before storage.
- Existing rows are compared by `symbol_timestamp`.
- Identical candles are not rewritten.
- Changed candles are updated by `symbol_timestamp`.
- Bulk insert uses `skipDuplicates: true`.

Contract gap:
- Root `AGENTS.md` and the active readiness contract prefer a natural key that includes at least instrument identity or symbol, region, asset type, timeframe, date, and source where practical.
- Current characterized behavior is useful but narrower than the contract target.

## 7. Provider / Source Provenance Assessment

Sufficiently visible today:
- `source`
- `region`
- `exchange`
- `dataStatus`
- latest price symbol/region/timestamp

Not sufficiently visible today:
- provider symbol used
- source run id
- batch id
- source fingerprint
- validation window
- retry/cooldown state
- provider classification
- fallback attempt state

## 8. Future Implementation Need

Future implementation is likely needed for full contract compliance, but not inside this Wave 2 test-only scope.

Likely future work:
- Architect decision on whether Prisma schema changes are required for durable readiness/provenance evidence.
- Repository/storage design for instrument-aware natural keys.
- Durable readiness evidence model or existing-model extension.
- Missing-candle cause classification.
- Provider retry/cooldown evidence persistence.
- Per-use-case readiness tier records for downstream consumers.

## 9. Recommended Next Smallest Upstream Slice

Recommended upstream follow-up:
- Architecture decision record for Market Data durable readiness evidence and natural-key strategy.

If the next wave must remain test/doc-only:
- Add backend-only characterization tests for repository read models that downstream modules would consume, without changing source.

If implementation is approved later:
- Start with source-only validation hardening for future-dated candles and non-positive adjusted close where existing contract language is clear.

Do not begin Prisma/schema work without explicit Product Owner and Architect approval.
