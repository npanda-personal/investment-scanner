# Angel One Data Sync Redesign Backlog

## Status

Promoted by Product Owner on 2026-05-15 as an active P0.1C provider-path revision because Yahoo rate limits are blocking trusted Indian price-history backfill.

Implementation remains read-only market data only. Live orders remain out of scope and disabled.

## Product Intent

Redesign Indian market data sync to use the user's Angel One account as the primary Indian market data source for stock catalog support, price candles, and tick/quote data where the Angel One API can provide reliable coverage.

Yahoo must remain available for US markets and may remain as a non-IN fallback where it is still useful. Do not delete Yahoo as a provider.

## Scope

- `IN / STOCK` market data provider strategy.
- Angel One integration for Indian stock catalog identity, daily OHLCV, and intraday/tick/quote data where available through the user's account.
- Provider abstraction so Indian and US markets can use different source priority rules.
- Sync performance redesign for batches, bounded workers, progress visibility, retries, and resumable operation evidence.
- Data provenance so each price/candle/tick row records provider/source.

## Non-Negotiables

- No paid libraries, paid tools, or paid third-party data providers.
- Angel One usage depends on the user's existing broker account and approved API access.
- Do not introduce live trading or order placement in this item; this backlog item is data-provider sync only.
- Existing Yahoo behavior must remain intact for US markets.
- Angel One rate limits must be respected before any bulk request is sent. Historical candles default to one in-flight provider request with throttling; no retry storm or force-all loop is allowed.
- Bulk backfill cannot start until a one-symbol Angel historical smoke test succeeds.

## Acceptance Direction

- Product Owner must define which Angel One data endpoints are acceptable for research/support use and what account/API setup is required.
- Solution Architect must design provider boundaries, credentials handling, rate limits, retry/cooldown behavior, and source fallback rules.
- QA must verify bounded sync performance, progress visibility, source provenance, and no regression to US/Yahoo flows.
- Initial provider-path revision may proceed under P0.1C because the PO explicitly promoted it to unblock trusted Indian market data.
- Current smoke result: user corrected credentials; Angel login/session, scrip-master lookup, and bounded historical candle drains are working for `IN / STOCK` with zero provider failures in recent batches. Continue with `ANGEL_ONE_ENABLE_MARKET_DATA=true`, orders disabled, `force=false`, bounded concurrency, and provider throttling.
