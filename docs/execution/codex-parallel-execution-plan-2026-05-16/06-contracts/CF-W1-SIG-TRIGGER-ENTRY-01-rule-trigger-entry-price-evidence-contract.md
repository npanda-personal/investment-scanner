# CF-W1-SIG-TRIGGER-ENTRY-01 Rule Trigger Entry Price Evidence Contract

Date: 2026-05-24

Owner: Team 03 - Architecture Factory

Status: Accepted For Bounded Signal Generation Implementation

## Contract Intent

Add an additive Signal Generation compatibility evidence packet that lets downstream Trusted Signal Candidate work distinguish a source-proven rule-trigger price from reference prices, entry zones, Trade Plan geometry, target prices, or R:R-derived values.

This contract does not approve durable trigger persistence, Today Review adoption, Prisma/schema changes, route changes, shared utilities, frontend work, package changes, generated files, provider/live-data work, startup/backfill, broker, paid/cloud, or telemetry scope.

## Allowed Files

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- focused existing Signal Generation service / DQ invariant tests for regression validation

## Forbidden Files

- Prisma schema or migrations
- generated files
- backend or frontend route registries
- `backend/src/modules/signal-generation-engine` controller, router, module, index, config, validation, or repository files unless separately approved
- Strategy Framework source
- Strategy Decision source
- Today Review source
- Market Data source
- frontend source or shared UI
- package manifests
- provider/live-data, startup/backfill, broker, paid/cloud, telemetry, or credential files

## Required Semantics

- Keep `SignalResultDto.triggerContract` additive and backward-compatible.
- Add source-proven trigger price only when Strategy Framework enrichment has an ENTRY strategy result with bullish direction, at least one passed entry rule id/code, a finite latest local price-row adjusted close, a source price timestamp, and strategy timeframe.
- If the signal row already carries a source-price date, the local latest price-row date must match that source-price date before trigger price evidence may be marked source-proven.
- Mark missing or mismatched evidence as `UNAVAILABLE`; do not infer or invent trigger price.
- Label the trigger-price packet as compatibility-only, not durable persisted trigger audit.
- Keep missing exit rule, invalidation rule, lifecycle, and persistence timestamps explicitly unavailable.
- Do not introduce target price, profit target, R:R, buy/sell advice, guarantee, broker, or automation wording.

## Acceptance Criteria

- Existing Signal Generation DTO behavior remains backward-compatible.
- Source-proven trigger price appears only when the local row and Strategy Framework rule evidence prove it.
- Missing price/rule/date/timeframe evidence leaves `trigger_price` null and includes unavailable reasons.
- Data Quality trusted read/run invariants continue to pass.
- `CF-W1-TSC-01` remains a downstream adoption item; this contract alone does not approve Today Review classification changes.
