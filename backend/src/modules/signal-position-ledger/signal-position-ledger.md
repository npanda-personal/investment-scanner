# Signal Position Ledger Module

## Scope

`signal-position-ledger` is a backend read model for rule-triggered entry candidate rows. It is not a brokerage position store and does not prove that a trade is open.

This module currently exposes:

- module-local `GET /signals/position-ledger/health`
- module-local `GET /signals/position-ledger/active`
- module-local `POST /signals/position-ledger/active/refresh`
- mounted `GET /api/v1/signals/position-ledger/health`
- mounted `GET /api/v1/signals/position-ledger/active`
- mounted `POST /api/v1/signals/position-ledger/active/refresh`

The mounted active endpoint preserves the accepted active-list DTO: `items`, `totalCount`, `limit`, `offset`, `nextOffset`, `hasMore`, `scope`, `refresh`, and `warnings`.

Active-list reads are materialized snapshot reads. They do not recompute current prices, DQ evidence, and exit/risk lifecycle details during page render. The refresh endpoint and scheduled `SIGNAL_POSITION_LEDGER` pipeline stage build the snapshot incrementally and persist progress so the UI can render already-materialized rows while a refresh is still running.

## Entry Candidate Truth Rules

Rows are included only when current source evidence proves:

- trusted latest persisted signal row in selected scope;
- trigger contract exists;
- `trigger_price_evidence.status = SOURCE_PROVEN`;
- numeric trigger price and trigger timestamp are present;
- trigger type is `bullish_entry_trigger`;
- Strategy Framework match is `ENTRY_CANDIDATE`;
- current Data Quality readiness is `READY`;
- latest price evidence is current enough to compute a raw price move;
- no current exit/risk decision is present.

Risk-only, bearish, watch-only, DQ-blocked, stale-price, exit-triggered, and incomplete trigger evidence rows are excluded from the primary entry-candidate list.

Entry candidates are ordered by newest `entryTriggerTimestamp` before pagination. Rows with the same timestamp fall back to symbol and then instrument id ordering for stable results.

## Current Return Rules

`currentReturnPercent` is a raw price move since the rule trigger. It is not position P/L. It is projected only when:

- source-proven entry trigger price exists;
- latest persisted price exists and is fresh enough;
- price data status is trusted;
- current DQ readiness is usable (`READY` and not `UNUSABLE` coverage).

When price or trust basis is stale/unavailable, the row is not published in the primary entry-candidate list.

## Lifecycle / Health Rules

Current `dev` compatibility health states are intentionally limited and remove rows from the primary entry-candidate list:

- `EXIT_TRIGGERED` (from `EXIT_CANDIDATE`)
- `RISK_WARNING` (from `REDUCE_RISK`)

All other lifecycle evidence remains unavailable in this child.

`Closed History` remains a frontend placeholder until durable close date, close price, and close reason proof exist.

## Non-Goals In This Child

- schema or migration changes
- durable open/closed lifecycle storage
- closed-history read model
- external account, capital-allocation, or direct action framing

