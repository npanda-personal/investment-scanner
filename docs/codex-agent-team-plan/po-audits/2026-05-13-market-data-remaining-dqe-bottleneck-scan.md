# Market Data Remaining DQE Bottleneck Scan - 2026-05-13

## Context

After recent Market Data repairs, Data Quality readiness improved materially. The READY status count is now above 1200 locally, but the remaining non-green universe still needs root-cause sequencing before downstream work reopens.

This scan used local database reads only.

## Current Local Counts

- Active `IN / STOCK`: `2912`
- Evaluated by DQE: `2907`
- Strict green: `981`
- `signalReadinessStatus=READY`: `1277`
- `LIMITED`: `76`
- `NOT_READY`: `1554`
- Unevaluated: `5`

## Main Remaining Bottlenecks

| Bottleneck | Count | Product Interpretation | Next Action |
|---|---:|---|---|
| Supported, zero local price bars, no price-backfill state | 733 | These should be the fastest remaining availability unlock. Provider is marked supported but no OHLCV exists locally. | Continue bounded `BACKFILL_PRICES` drain; confirm no queue starvation. |
| Provider unknown, zero local data | 642 | These cannot be trusted until provider validation runs. | Run bounded `VALIDATE_PROVIDERS` before price backfill. |
| Supported with enough price history but metadata missing | 306 | Price data is usable, but sector/industry/market-cap context blocks stronger trusted decisions. | Run provider/manual business metadata repair. |
| Provider validation failed, zero local data | 130 | Likely needs symbol repair, official/public fallback, or unsupported classification. | Review failed-validation taxonomy and free official/public fallback path. |
| Supported shallow history | 113 | Has some data but below SMA200/trusted threshold. | Continue bounded deep price backfill. |
| Unevaluated | 5 | DQE did not evaluate these rows. | Run one small DQE batch for missing evaluations. |
| Supported low liquidity | 2 | Data may be present but not tradable/liquid enough. | Keep fail-closed unless PO explicitly allows low-liquidity research-only workflows. |

## DQE Top Gaps

- Sector metadata missing: `1924`
- Industry metadata missing: `1924`
- Fewer than 200 price rows: `1618`
- Fewer than 50 price rows: `1554`
- Latest price stale: `1528`
- Latest price missing: `1505`
- Volume data missing: `1505`

## Provider Breakdown Among Non-Green Rows

| Provider Status | Count | Zero Bars | Under 200 Bars | READY Status |
|---|---:|---:|---:|---:|
| `SUPPORTED` | 1159 | 736 | 849 | 296 |
| `UNKNOWN` | 642 | 642 | 642 | 0 |
| `VALIDATION_FAILED` | 130 | 130 | 130 | 0 |

## Recommended Priority Order

1. Drain supported zero-bar and shallow supported rows with bounded `BACKFILL_PRICES`.
2. Validate `UNKNOWN` provider rows in bounded batches.
3. Run business metadata repair for rows with adequate OHLCV but missing context.
4. Separate validation-failed symbols into unsupported, symbol-repair, and official/public fallback buckets.
5. Re-run DQE after each repair batch and track strict green, READY, and blocker deltas.

## Product Boundary

Do not relax DQE gates to make counts look better. The goal remains trusted data for personal investment decisions: OHLCV first, then provider identity, metadata, and liquidity.
