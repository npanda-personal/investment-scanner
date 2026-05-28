# Signal Position Ledger Module

## Scope

`signal-position-ledger` is a backend lifecycle store for rule-triggered entry candidates and rule-triggered exits. It is not a brokerage position store and does not prove that a trade is open.

This module currently exposes:

- module-local `GET /signals/position-ledger/health`
- module-local `GET /signals/position-ledger/active`
- module-local `GET /signals/position-ledger/closed`
- module-local `POST /signals/position-ledger/active/refresh`
- mounted `GET /api/v1/signals/position-ledger/health`
- mounted `GET /api/v1/signals/position-ledger/active`
- mounted `GET /api/v1/signals/position-ledger/closed`
- mounted `POST /api/v1/signals/position-ledger/active/refresh`

The mounted active endpoint preserves the accepted active-list DTO: `items`, `totalCount`, `limit`, `offset`, `nextOffset`, `hasMore`, `scope`, `refresh`, and `warnings`.

Active and closed reads are persisted lifecycle reads. They do not recompute current prices, DQ evidence, or exit/risk lifecycle details during page render. The refresh endpoint and scheduled `SIGNAL_POSITION_LEDGER` pipeline stage upsert active entries and close rows when exit triggers are detected.

## Entry Candidate Truth Rules

Rows are created only when source evidence proves:

- trusted latest persisted signal row in selected scope;
- trigger contract exists;
- `trigger_price_evidence.status = SOURCE_PROVEN`;
- numeric trigger price and trigger timestamp are present;
- trigger type is `bullish_entry_trigger`;
- Strategy Framework match is `ENTRY_CANDIDATE`;
- current Data Quality readiness is `READY`;
- no current exit trigger is present.

Only one active entry is allowed per stock per scope. The first active entry trigger owns the lifecycle. Later entry triggers for the same stock are ignored while an active row exists. Missing current candidates, stale price evidence, DQ drift, or risk-warning evidence must not remove an active row. Only an exit trigger can move an active row to closed history.

Entry candidates are ordered by first `entryTriggerTimestamp` before pagination. Rows with the same timestamp fall back to symbol and then instrument id ordering for stable results.

## Current Return Rules

`currentReturnPercent` is a raw price move since the rule trigger. It is not position P/L. It is projected only when:

- source-proven entry trigger price exists;
- latest persisted price exists and is fresh enough;
- price data status is trusted;
- current DQ readiness is usable (`READY` and not `UNUSABLE` coverage).

When price or trust basis is stale/unavailable, the row remains active and the return is hidden or marked unavailable.

## Lifecycle / Health Rules

Current lifecycle states:

- `ACTIVE`: active entry trigger candidate.
- `CLOSED`: exit trigger detected; entry evidence remains preserved and exit trigger date, exit price, and exit reason are shown in closed history.

`REDUCE_RISK` may be shown as a risk warning but does not close the row. `EXIT_CANDIDATE` closes the row.

## Non-Goals In This Child

- external account, capital-allocation, or direct action framing

