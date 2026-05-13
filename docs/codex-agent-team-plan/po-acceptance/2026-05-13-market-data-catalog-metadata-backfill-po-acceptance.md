# Market Data Catalog Metadata Backfill PO Acceptance - 2026-05-13

## Product Scope

Accept the hotfix for the catalog metadata backfill workflow reported during Market Data module testing.

## Accepted Outcomes

- The Catalog Source dropdown now affects the backfill metadata payload and backend scope.
- Selecting `NSE ETF Securities` sends `assetType: ETF` and `catalogSource: NSE_ETF_SECURITIES`.
- The backend no longer treats every catalog metadata backfill as a whole `IN / STOCK` pass when a more specific catalog source is selected.
- Backfill metadata now uses bounded parallel workers instead of serial row processing, reducing the bottleneck for large batch runs.
- Provider validation remains optional and bounded separately.

## Product Decision

PO acceptance: accepted for this narrow Market Data workflow fix.

The broader Market Data product gate remains open. The system still must continue resolving missing price history, provider status, metadata, and Data Quality Engine readiness before downstream signals, decisions, backtests, and trade planning are considered trustworthy.
