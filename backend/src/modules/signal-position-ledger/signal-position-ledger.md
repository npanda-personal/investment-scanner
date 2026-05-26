# Signal Position Ledger Module

## Scope

`signal-position-ledger` is a backend read model for active signal-position rows.

This module currently exposes:

- module-local `GET /signals/position-ledger/health`
- module-local `GET /signals/position-ledger/active`
- mounted `GET /api/v1/signals/position-ledger/health`
- mounted `GET /api/v1/signals/position-ledger/active`

The mounted active endpoint preserves the accepted active-list DTO: `items`, `totalCount`, `limit`, `offset`, `nextOffset`, `hasMore`, `scope`, and `warnings`.

## Active Row Truth Rules

Rows are included only when current source evidence proves:

- trusted latest persisted signal row in selected scope;
- trigger contract exists;
- `trigger_price_evidence.status = SOURCE_PROVEN`;
- numeric trigger price and trigger timestamp are present;
- trigger type is entry-compatible (`bullish_entry_trigger` or `bearish_trigger`).

Risk-only signals and incomplete trigger evidence are excluded.

Active rows are ordered by newest `entryTriggerTimestamp` before pagination. Rows with the same timestamp fall back to symbol and then instrument id ordering for stable results.

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

`Closed History` remains a frontend placeholder until durable close date, close price, and close reason proof exist.

## Non-Goals In This Child

- schema or migration changes
- durable open/closed lifecycle storage
- closed-history read model
- external account, capital-allocation, or direct action framing

