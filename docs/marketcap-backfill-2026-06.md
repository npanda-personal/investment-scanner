# marketCap backfill investigation — 302 NULL-marketCap IN stocks (2026-06-05)

## Determination: a safe automatic backfill is **NOT available**. Do not run one. Low urgency.

### The 302 stocks
```
SELECT COUNT(*) FROM stocks WHERE region='IN' AND "assetType" IN ('STOCK','EQUITY')
  AND "isDelisted"=false AND "isActive"=true AND "marketCap" IS NULL;  -- = 302
```
Breakdown:
- **278 are `NSE_SME_EQUITY_SECURITIES`** (SME board), **24 are `NSE_EQUITY_SECURITIES`** (small mainboard).
- Only **25 of the 302 have any rows in `price_ticks`** at all (the other 277 are catalog-only).

### How `marketCap` is normally populated (market-data-foundation.service.ts)
Three writer paths exist; none can serve these stocks:
1. **Manual metadata CSV import** — `POST /api/v1/market-data/metadata/manual-import` (controller.importManualMetadata). Requires a CSV with `SYMBOL`, `SECTOR`, `INDUSTRY`, `MARKETCAP` columns (service.ts ~3070-3112). Operator supplies the values from an external source.
2. **XBRL / manual-verified fundamentals ingest** — propagates `fundamentals.marketCap` → `stocks.marketCap`.
3. **Provider (Yahoo) enrichment** — `marketCapSource:'yahoo'` (service.ts ~3043, 13113). **FORBIDDEN** under the NSE/BSE-only hard constraint (provider routes return `410 EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY`).

There is **no `sharesOutstanding` column on `stocks`**, so there is no internal price×shares compute.

### Why no internal source exists for these 302 (evidence)
```
-- fundamentals.marketCap available for the 302:        0
-- fundamentals rows of any kind for the 302:           22 (of 302)
-- fundamentals.sharesOutstanding available for the 302: 0
```
So: nothing to copy from `fundamentals.marketCap`, and no `sharesOutstanding` to compute `cap = shares × price`. The free NSE data simply does not cover these (mostly SME) names. Fabricating a value would violate the accuracy-first / no-fake-data constraint.

### Why it is not urgent / not blocking
- The backtest `ALL` universe is top-50 by `marketCap DESC NULLS LAST` (NULLS-LAST already fixed in commit `62b3cc6`). These are 278 SME + 24 small mainboard names — they would **never rank in the top-50** even with a populated cap, and NULLS-LAST already keeps them from displacing real large-caps. Backtest correctness is already protected.
- They are also excludable explicitly: `... AND "marketCap" IS NOT NULL` or by catalogSource if SME should be out of scope for a given run.

## If/when the operator obtains real marketCap values
Use the manual metadata import (the only NSE/BSE-compliant path). Prepare a CSV with header `SYMBOL,SECTOR,INDUSTRY,MARKETCAP` (sector/industry are required by the importer — reuse the stocks' existing values), then:
```
GET  /api/v1/market-data/metadata/manual-template     # download the expected template
POST /api/v1/market-data/metadata/manual-import       # body: { csvText, region:'IN', assetType:'STOCK', batchSize, offset }
```
Alternatively, if these names ever gain NSE XBRL filings, the bulk fundamentals ingest (task #10 path) would propagate `marketCap` automatically.

**Not done here:** no values were written. No external/forbidden source was used. No `.env` or DB connection settings were touched.
