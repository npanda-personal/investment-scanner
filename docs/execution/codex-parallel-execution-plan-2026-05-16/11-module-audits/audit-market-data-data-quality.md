# Audit: Market Data Foundation / Data Quality Engine

Date: 2026-05-17

Mode: Read-only Audit Team A.

Authority: root `AGENTS.md`; `docs/AGENTS.md` deleted/neutralized; `docs/codex-agent-team-plan/**` historical only.

## Scope Inspected

- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/tests/modules/market-data-foundation/**`
- `backend/tests/modules/data-quality-engine/**`
- Active execution docs under `docs/execution/codex-parallel-execution-plan-2026-05-16/**`

No files were edited by the audit stream. No builds, tests, servers, providers, staging, or commits were run by the audit stream.

## Current Gaps

- Market Data storage is still primarily `symbol + timestamp` centered. It does not persist full contract-grade OHLC evidence such as `instrument_id`, asset class, timeframe, provider symbol used, source run id, batch id, source fingerprint, or validation window on each price row.
- Validation blocks malformed OHLC and duplicate batch rows, but future-dated candles and invalid/non-positive `adjustedClose` are not clearly blocked. Spike rejection is disabled unless `MARKET_DATA_REJECT_PRICE_SPIKES` is enabled.
- Duplicate/invalid OHLC and missing-candle evidence is mostly transient or derived, not durable per-instrument readiness evidence.
- Universe signoff blocks on provider unknown/retry, identity, metadata, backfill, latest EOD, minimum review-ready count, and 10% review-ready percentage; active contract `95%` price-ready and `90%` metadata-ready targets are not fully encoded as hard signoff gates.
- Data Quality uses a simple 7-calendar-day stale rule and does not directly consume market-session currentness or durable duplicate/invalid/missing-candle evidence.
- `filterEligibleInstruments` can default missing DQ evaluations to `WARN_AND_PROCESS`; downstream trusted paths must explicitly use fail-closed options until policy is hardened.
- Angel One code exists and is exported, but active docs keep it excluded from Sprint 1B implementation/live validation.

## P0 Findings

- Downstream trusted use remains blocked. Market Data / DQ are not contract-complete enough to unlock signals, alerts, portfolio intelligence, watchlists, copilot reliability summaries, backtests, calibration, or trade-plan workflows.
- Angel One, live providers, broker credentials, provider-heavy startup, and startup backfill remain stop conditions unless Product Owner and Architect approvals are recorded.

## P1 Findings

- Harden `market-data-foundation.validation.ts` for future dates, adjusted-close validity, and explicit spike-policy tests.
- Harden `market-data-foundation.repository.ts` storage/provenance design before claiming contract-grade OHLC auditability.
- Harden `market-data-foundation.service.ts` signoff thresholds and readiness evidence before broad scanner trust.
- Harden `data-quality-engine.service.ts` fail-closed defaults or require strict caller options for downstream use.
- Persist or expose Data Quality use-case tier evidence more durably if downstream modules must audit exact readiness gates.

## P2 Findings

- `market-data-foundation.service.ts` is very large and mixes ingestion, repair, provider selection, readiness, startup-adjacent workflows, catalog parsing, and signoff logic. Refactor only with approved slices.
- Module docs are useful but should be refreshed after any future storage/signoff/DQ policy changes.
- Existing tests are strong characterization coverage, but some active-contract assertions remain documented gaps, not implementation guarantees.

## Candidate Stories

- `CF-W1-MD-01`: Market Data validation hardening characterization for future dates, adjusted close, and spike policy.
- `CF-W1-MD-02`: Durable Market Data readiness evidence / natural-key ADR.
- `CF-W1-MD-03`: Market Data signoff threshold contract tests for `95%` price-ready and `90%` metadata-ready.
- `CF-W1-DQ-01`: Data Quality fail-closed defaults and strict downstream eligibility contract.
- `CF-W1-DQ-02`: Align DQ stale/currentness logic with Market Data latest completed EOD evidence.

## Blocked Work

- Angel One mocked/live validation: blocked pending Product Owner and Architect approval.
- Startup/backfill behavior: blocked pending Architect reservation and startup policy.
- Live Yahoo/exchange/provider validation: blocked unless explicitly approved.
- Contract-grade OHLC persistence changes: blocked pending Prisma/schema/storage ADR.
- Route/API shape changes: blocked pending route registry reservation.

