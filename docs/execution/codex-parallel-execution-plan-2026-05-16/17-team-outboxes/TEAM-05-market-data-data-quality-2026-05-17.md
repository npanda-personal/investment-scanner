# TEAM-05 Market Data / Data Quality Outbox - 2026-05-17

Mode: read-only audit/refinement.

Files changed: none.

Tests, services, providers, installs, staging, and commits: none.

## Queue Status

No Team 5 inbox assignment exists. No Market Data / Data Quality implementation item is ready.

`CF-W1-MD-02` is P0 and architecture-docs-ready, but blocked from source/schema work by the Prisma/OHLC storage-model decision.

`CF-W1-MD-01` is P1 and still needs a QA plan plus accepted validation policy before test/source work.

## Findings

- Current price storage is still centered on `symbol + timestamp`; this is narrower than the target readiness contract.
- Durable per-instrument/candle evidence is incomplete for duplicate/invalid OHLC, missing-candle cause, provider symbol, source fingerprint, batch/run id, and validation-window evidence.
- Market Data validation rejects malformed OHLC, non-finite prices, non-positive OHLC, negative volume, and duplicate in-batch rows, but future-date, adjusted close, and spike-policy behavior still need accepted policy.
- Data Quality fail-closed defaults are improved, but stale logic remains a calendar-day rule rather than latest-completed-session evidence.

## Blockers

- `CF-W1-MD-02`: requires ADR and Product/Architect approval before Prisma/schema, storage-key, or durable evidence source changes.
- `CF-W1-MD-01`: requires QA plan and explicit accepted validation policy for future dates, adjusted close, and spike behavior.

## Recommendation

Next best work is docs-only: prepare `CF-W1-MD-02` durable readiness evidence ADR. Then prepare `CF-W1-MD-01` QA plan/test-only packet after validation policy is accepted.
