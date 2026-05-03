# Market Data Foundation Ingestion Audit

## 1. Stock (Company Master Data)
- **Model:** `Stock` (owned by `MarketDataFoundationRepository`)
- **Represents:** Master definition of a financial instrument.
- **Current Natural Key:** `symbol` (`@@unique` constraint).
- **Expected Natural Key:** `symbol` + `exchange` (Preferred) or `symbol` (MVP).
- **Prisma Constraints:** `symbol` is unique.
- **Ingestion Method:** Uses `create` without conflict handling, making it non-idempotent if a stock is added twice via external searches.
- **Date Normalization:** `ipoDate` is parsed as a JS Date.
- **Duplicate Risk:** Repeated syncs via `searchAssets` can throw unhandled unique constraint errors. It doesn't create DB duplicates but fails operations.
- **Severity:** MEDIUM
- **Fix:** Change `createStock` to use an `upsert` on the `symbol` or explicitly catch and handle constraints. Keep `symbol` as unique for MVP to avoid breaking relations.

## 2. PriceTick (Historical Prices)
- **Model:** `PriceTick`
- **Represents:** End-of-day OHLCV bars.
- **Current Natural Key:** `symbol` + `timestamp`
- **Expected Natural Key:** `symbol` + `timestamp`
- **Prisma Constraints:** `@@unique([symbol, timestamp])` exists.
- **Ingestion Method:** `upsert` within a `$transaction`.
- **Date Normalization:** `date` is normalized to UTC midnight before insertion.
- **Duplicate Risk:** None in the database. The `upsert` handles it idempotently. However, incremental sync doesn't have an "overlap" window, risking missed bars if provider corrects data.
- **Severity:** LOW (Robust, but needs incremental overlap).
- **Fix:** Modify `ingestSymbol` to use a 3-7 day overlap for `effectiveStartDate`.

## 3. LatestPrice (Latest Snapshot)
- **Model:** `LatestPrice`
- **Represents:** The most recent known price point for fast access.
- **Current Natural Key:** `symbol`
- **Expected Natural Key:** `symbol`
- **Prisma Constraints:** `symbol` is `@id`.
- **Ingestion Method:** `upsert` inside `storeHistorical`.
- **Date Normalization:** Inherits from `PriceTick`.
- **Duplicate Risk:** None, purely idempotent.
- **Severity:** LOW
- **Fix:** None.

## 4. Fundamental (Core Fundamentals)
- **Model:** `Fundamental`
- **Represents:** TTM financial ratios, EPS, Market Cap.
- **Current Natural Key:** `stockId` + `periodType` + `periodEndDate` + `source`
- **Expected Natural Key:** `stockId` + `source` (since we only fetch latest snapshots).
- **Prisma Constraints:** `@@unique([stockId, periodType, periodEndDate, source])`.
- **Ingestion Method:** `upsert`.
- **Date Normalization:** `periodEndDate` is generated as `new Date().toISOString()` at fetch time.
- **Duplicate Risk:** High. Because the fetch date advances every day, `periodEndDate` changes daily. Repeated daily syncs create an unlimited number of logically identical "latest TTM" rows instead of updating one snapshot.
- **Severity:** BLOCKER
- **Fix:** Change the Prisma unique constraint to `@@unique([stockId, periodType, source])` and remove `periodEndDate` from the constraint, OR query the existing TTM row and update it instead of relying on the fetch date for uniqueness.

## 5. CorporateAction (Dividends/Splits)
- **Model:** `CorporateAction`
- **Represents:** Splits and dividends.
- **Current Natural Key:** `stockId` + `actionType` + `effectiveDate` + `source`
- **Expected Natural Key:** `stockId` + `actionType` + `effectiveDate` + `source`
- **Prisma Constraints:** `@@unique([stockId, actionType, effectiveDate, source])`.
- **Ingestion Method:** `upsert`.
- **Date Normalization:** UTC midnight normalization applied.
- **Duplicate Risk:** None. The combination of stock, type, date, and source is safely enforced.
- **Severity:** LOW
- **Fix:** None.

## 6. FxRate
- **Model:** `FxRate`
- **Represents:** Latest FX rates.
- **Current Natural Key:** `pair`
- **Expected Natural Key:** `pair`
- **Prisma Constraints:** `@unique` on `pair`.
- **Ingestion Method:** `upsert`.
- **Date Normalization:** Timestamp is updated on fetch.
- **Duplicate Risk:** None, it updates the single row per pair.
- **Severity:** LOW
- **Fix:** None.

## Sync Summary Counts
- `storeHistorical` computes `rowsInserted` and `rowsUpdated` by checking `existingTimestamps`, which is an honest approach.
- The `syncV1` response object does not fully reflect all the required counts as per instructions (e.g. `instrumentsInserted`, `fundamentalsInserted`, etc.).

## Provider Data Normalization
- The `yahoo-finance2` `chart()` method is correctly used for `HistoricalPrice`.
- Duplicate provider bars in the same response array are not explicitly collapsed before calling `upsert`, but `upsert` handles them (though the same key in a single transaction might cause Prisma to complain).

## Next Steps
1. Create `backend/scripts/audit-market-data-ingestion.ts` to scan for and clean up the `Fundamental` duplicates and verify other tables.
2. Update the Prisma schema for `Fundamental` to `@@unique([stockId, periodType, source])`.
3. Improve `syncV1` API response shape.
4. Implement a 3-day overlap in `ingestSymbol`.