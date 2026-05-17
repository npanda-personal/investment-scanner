# Architect Signoff - P0.1C Angel One Read-Only Provider

Date: 2026-05-16
Mode: Architect Signoff Mode
Owner: Solution Architect / Orchestrator
Work item: P0.1C Angel One Provider-Path Revision

## Inputs Reviewed

- Contract: `docs/codex-agent-team-plan/architecture-contracts/2026-05-16-p0-1c-angel-one-readonly-provider-contract.md`
- QA evidence: `docs/codex-agent-team-plan/qa-evidence/2026-05-14-md-a5-operational-drain-qa-evidence.md`
- Backend implementation:
  - `backend/src/modules/market-data-foundation/market-data-foundation.angel-one-provider.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `backend/.env.example`
- Focused tests:
  - `backend/tests/modules/market-data-foundation/market-data.service.test.ts`

## Signoff Decision

Status: `APPROVED`

Architect signoff approves the Angel One provider path for the scoped purpose only: read-only `IN / STOCK` historical market-data population through the user's existing broker account.

## Approved Conditions

- Angel One market data is opt-in and default-off in `.env.example`.
- The provider is enabled only when credentials are configured.
- The implementation is read-only for this module; no order placement path is introduced.
- Yahoo remains available for US markets and non-IN fallback paths.
- Historical drains use bounded concurrency, provider throttling, and bounded retry/cooldown behavior.
- Direct `backfillPrices` and repair-run backfill default to `force=false`; explicit `force=true` or `fullReload=true` is required for forced reload.
- Downstream signals, strategies, backtests, and trade plans remain blocked while market-data trust is `NOT_TRUSTWORTHY`.

## Validation Evidence

- Direct force-default test: passed.
- Repair-run force-default test: passed.
- Backend build after force-default fix: passed.
- Live bounded drain batches continue with explicit `force=false` and zero provider failures in recent runs.

## Follow-Up

Continue monitoring malformed Angel historical rows as provider-noise evidence. Escalate only if malformed rows become the reason a symbol cannot meet required-history coverage.
