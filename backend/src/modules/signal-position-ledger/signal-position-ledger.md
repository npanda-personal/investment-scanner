# Signal Position Ledger Module

## Scope

`signal-position-ledger` is a backend-only, module-local read model for active signal-position rows.

This module currently exposes:

- `GET /signals/position-ledger/health`
- `GET /signals/position-ledger/active`

It is intentionally not mounted in `backend/src/api/routes.ts` in this child.

## Active Row Truth Rules

Rows are included only when current source evidence proves:

- trusted latest persisted signal row in selected scope;
- trigger contract exists;
- `trigger_price_evidence.status = SOURCE_PROVEN`;
- numeric trigger price and trigger timestamp are present;
- trigger type is entry-compatible (`bullish_entry_trigger` or `bearish_trigger`).

Risk-only signals and incomplete trigger evidence are excluded.

## Current Return Rules

`currentReturnPercent` is projected only when:

- source-proven entry trigger price exists;
- latest persisted price exists and is fresh enough;
- price data status is trusted;
- current DQ readiness is usable (`READY` and not `UNUSABLE` coverage).

When price or trust basis is stale/unavailable, the module emits explicit `STALE`/`UNAVAILABLE` status with null return.

## Lifecycle / Health Rules

Current `dev` compatibility health states are intentionally limited:

- `EXIT_TRIGGERED` (from `EXIT_CANDIDATE`)
- `RISK_WARNING` (from `REDUCE_RISK`)

All other lifecycle evidence remains unavailable in this child.

## Non-Goals In This Child

- route-registry mounting
- frontend feature wiring
- schema or migration changes
- durable open/closed lifecycle storage
- closed-history read model
- broker/portfolio P&L or target/reward-risk semantics

