# Frontend Market Intelligence Revamp Read-Model Dependencies

Date: 2026-06-01

## Scope

This frontend revamp is presentation-only. It does not create backend APIs, change Prisma schema, modify Market Data Foundation, change Pipeline Ops, or trigger market-data/data-quality/signal/strategy generation from trader pages.

Trader pages use typed frontend contracts and honest unavailable states until persisted backend read APIs exist.

## Backend APIs Missing

Future persisted read API capabilities are required for:

- Market Pulse snapshot.
- Stock Interest Radar snapshot.
- Earnings Intelligence snapshot.
- Compounder Radar snapshot.
- Trader Setup Radar snapshot.
- Risk Radar snapshot.
- Instrument Context snapshot.

## Future Backend Pipelines

Documented dependency only; not implemented in this revamp:

- `MARKET_PULSE_REFRESH`
- `STOCK_INTEREST_REFRESH`
- `EARNINGS_INTELLIGENCE_REFRESH`
- `COMPOUNDER_REFRESH`
- `TRADER_SETUP_REFRESH`
- `RISK_RADAR_REFRESH`
- `INSTRUMENT_CONTEXT_REFRESH`

## Frontend Policy

- Frontend must not calculate rankings, scores, breadth, sector strength, or candidate lists.
- Frontend displays backend-provided snapshot fields only.
- Missing backend support renders a domain empty state.
- Trader pages must not trigger import, sync, repair, backfill, generation, evaluation, calibration, pipeline commands, or provider calls.
- Personal portfolio, watchlist, alert, notes, and preference workflows remain writable.
- Alert evaluation is not exposed on the trader Alerts page.
