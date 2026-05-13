# Stock Table Missing Data Diagnosis - 2026-05-13

Mode: Product Planning / Architecture Diagnosis / QA Planning  
Owner: Product Owner Agent with Solution Architect, QA, implementation, performance, and data-source lanes  
Scope: `stocks` table, `IN / STOCK` first, with cross-checks against `price_ticks` and market-data repair state.  
Write boundary honored: read-only database/code diagnosis plus this report. No stock rows were changed.

## 1. Executive Decision

The `stocks` table is not ready for downstream Signals, Strategy Decision, Today Review, or Trade Plans. The issue is not only missing validation messages. The table still has large unworked data gaps, and some rows have inconsistent symbol/price identity.

The product standard is:

- Every active `IN / STOCK` must have trustworthy identity, provider/data status, and enough price history before it can enter trusted review.
- Business context fields should be populated where free/public sources can provide them. Rows that cannot be automatically populated must be moved to durable manual-required repair states, not silently left as nullable rows.
- Yahoo insufficiency is not final evidence. If Yahoo does not provide enough data, the system must attempt or queue official/free exchange fallback before the stock is considered unresolved.
- Paid providers, broker APIs, hosted paid services, and commercial free-tier dependencies remain rejected.

## 2. Current Database Evidence

Read-only Prisma diagnostics were run against the local database on 2026-05-13.

### Universe Shape

| Scope | Count |
| --- | ---: |
| All `stocks` rows | 3,915 |
| Active rows | 3,914 |
| Active `IN / STOCK` rows | 2,912 |
| Active `IN / ETF` rows | 321 |
| Active `IN / INDEX` rows | 167 |
| Active non-IN/null asset rows | 514 |

### Active `IN / STOCK` Nulls

| Column | Missing rows | Product interpretation |
| --- | ---: | --- |
| `sector` | 2,900 | P1 business context gap; blocks full signoff. |
| `industry` | 2,900 | P1 business context gap; blocks full signoff. |
| `marketCap` | 2,900 | P1 business context gap; must be positive and source-backed. |
| `lastSuccessfulDataLoadTimestamp` | 1,508 | P0 operational data availability gap. |
| `ipoDate` | 914 | P0 listing-date/history-window gap. |
| `isin` | 914 | P0 identity/disambiguation gap. |
| `providerError` | 2,910 | Usually acceptable null; only required when provider validation fails. |
| `underlyingSymbol`, `expiryDate`, `contractMonth`, `lotSize`, `contractStatus` | 2,912 each | Expected nulls for cash stock rows. Do not populate during stock metadata repair. |

No active `IN / STOCK` rows had blank strings for the inspected nullable string columns. No null-equivalent sector/industry values such as `UNKNOWN`, `N/A`, `NA`, `NONE`, `NULL`, or `-` were present. No non-positive `marketCap` values were present.

### Provider And Price Coverage

| Metric | Count |
| --- | ---: |
| `providerSupportStatus = UNKNOWN` | 1,506 |
| `providerSupportStatus = SUPPORTED` | 1,404 |
| `providerSupportStatus = VALIDATION_FAILED` | 2 |
| Active `IN / STOCK` rows with no `price_ticks` | 1,515 |
| Active `IN / STOCK` rows with any `price_ticks` | 1,397 |
| Rows with data through 2026-05-12 or later | 910 |
| Supported rows without `price_ticks` under `Stock.symbol` | 7 |
| Unknown provider rows without prices | 1,506 |
| Failed provider rows without prices | 2 |

Price-history depth is also insufficient:

| Coverage bucket | Count |
| --- | ---: |
| No prices | 1,515 |
| Has 15 years or more from 2011-05-13 cutoff | 588 |
| Starts after 15-year cutoff | 809 |
| Under 1 year of rows | 129 |
| 1 to 5 years | 363 |
| 5 to 10 years | 238 |
| 10+ years | 667 |

Rows with less than 15 years are not automatically wrong if the company listed later, but they must have `ipoDate`/listing-date evidence so the history gate can prove coverage from listing date.

## 3. Root Causes

### RC1 - Most Missing Fields Have Not Been Worked Through Repair States

Durable repair states show the system has not processed most gaps:

| Gap | State evidence |
| --- | --- |
| Missing business metadata | 2,896 rows have no `PROVIDER_BUSINESS_METADATA` state; only 4 are `MANUAL_REQUIRED`, 8 are `RESOLVED`. |
| Missing identity fields | 914 rows have no `CATALOG_IDENTITY` state. |
| Provider business attempts | Only 15 attempts exist for active `IN / STOCK` rows. |

This means the current problem is not only provider failure. The repair workflow has not drained the stock universe.

### RC2 - Symbol/Price Identity Is Inconsistent For Some Stocks

Seven active `IN / STOCK` rows are marked as having successful data loads but have zero `price_ticks` under `Stock.symbol`:

| Stock symbol | Provider symbol | Current evidence |
| --- | --- | --- |
| `CCL` | `CCL.NS` | 4,036 price rows exist under provider symbol, none under stock symbol. |
| `HAL` | `HAL.NS` | 2,002 price rows exist under provider symbol, none under stock symbol. |
| `IEX` | `IEX.NS` | 2,111 price rows exist under provider symbol, none under stock symbol. |
| `MOS` | `MOS.NS` | No price rows under either symbol. |
| `PNC` | `PNC.NS` | No price rows under either symbol. |
| `PPL` | `PPL.NS` | No price rows under either symbol. |
| `PTC` | `PTC.NS` | No price rows under either symbol. |

There are 12 active `IN / STOCK` rows where `symbol` and `providerSymbol` differ. This is a P0 correctness risk because `PriceTick` is keyed by `symbol + timestamp`, not by stock id.

### RC3 - Catalog Identity Repair Is Present But Not Fully Drained

The app has catalog identity repair endpoints and source fingerprinting, but active `IN / STOCK` still has 914 missing `isin`/`ipoDate` rows and no durable catalog identity state for those rows. Existing repair-run evidence shows partial runs stopped with warnings rather than finishing the queue.

### RC4 - Business Metadata Needs A Free/Public Fallback Strategy

Yahoo can fill sector, industry, and market cap for some stocks, but current coverage is only 12 complete active `IN / STOCK` rows. Yahoo should remain an opportunistic free source, not the sole strategy.

BSE's public List of Securities page exposes fields for Security Code, Issuer Name, Security Id, Security Name, Status, Group, Face Value, ISIN, Industry, and Market Capitalisation. That makes BSE a useful free/public fallback for `industry`, `marketCap`, and identity where matching is safe.

### RC5 - Price Availability Is Still The Main Downstream Blocker

1,515 active `IN / STOCK` rows have no local prices, and only 910 rows have data through 2026-05-12 or later. Official/free NSE/BSE EOD fallback must be part of the repair lane before downstream modules are allowed to trust the universe.

### RC6 - Long-Running Repair/Sync Paths Can Still Look Stuck

The performance lane found that provider work can still be too large per request, some progress is only written at the end of a run, and full-universe scans repeat. This matches the user-observed multi-hour sync behavior. Repair must use bounded batches, persisted progress, cancellation/resume, and memory-aware concurrency.

## 4. Field-By-Field Repair Policy

| Field group | Required handling |
| --- | --- |
| `symbol`, `exchange`, `region`, `assetType`, `instrumentSegment`, `currency` | P0. Populate from deterministic catalog rules or official exchange/security master files. Block ambiguous rows. |
| `sourceSymbol`, `providerSymbol`, `displaySymbol`, `catalogSource` | P0. Repair from official catalog rows and provider validation. Do not let provider symbols write prices to a different stock key without reconciliation. |
| `isin`, `ipoDate` | P0 for `IN / STOCK`. Fill from official NSE/BSE catalog/security master files or source-fingerprinted manual CSV. Earliest official EOD row can be used only as disclosed inference. |
| `providerSupportStatus`, `providerError` | P0 operational evidence. `UNKNOWN` must enter provider validation. Yahoo no-data for Indian stocks should become fallback-required/retry/manual, not final clean unsupported until official/free fallback is attempted or queued. |
| `lastSuccessfulDataLoadTimestamp` | P0 operational field. Set only after successful OHLCV storage and cross-check against actual `price_ticks`. |
| `sector`, `industry`, `marketCap` | P1 business context. Fill from Yahoo where available, BSE public List of Securities/manual public-source CSV where Yahoo misses. `marketCap` must be positive. |
| Derivative contract fields | Not required for cash `IN / STOCK`; null is correct unless derivative instruments become explicit scope. |

## 5. Approved Free/Public Source Strategy

1. Existing local rows are accepted only when source/provenance is clear and the row passes current readiness checks.
2. Official/public NSE sources:
   - NSE All Reports (`https://www.nseindia.com/all-reports`) includes capital-market bhavcopy and security files, including listed-security security files.
   - Existing configured URL evidence uses `https://archives.nseindia.com/content/equities/EQUITY_L.csv`.
3. Official/public BSE sources:
   - BSE List of Securities (`https://www.bseindia.com/corporates/List_scrips.html`) exposes ISIN, industry, and market capitalisation fields.
   - BSE Standardised Security Master format documents `BSE_EQ_SCRIP_DDMMYYYY.csv` with scrip code, symbol, scrip name, ISIN, status, and other security fields.
   - BSE BhavCopy page (`https://www.bseindia.com/markets/MarketInfo/BhavCopy.aspx?ln=en-us`) exposes latest and historical equity bhavcopy downloads.
4. Yahoo remains a free opportunistic provider for validation/profile metadata, but it is not final authority when it misses Indian stocks.
5. Manual CSV is allowed only when derived from official/public sources and must include source name, source date, fingerprint/hash, accepted/rejected counts, and unresolved rows.
6. Rejected sources: paid providers, paid exchange products, broker APIs/account downloads, hosted paid queues, and commercial free-tier market-data vendors.

## 6. Implementation Work Packets

### SMD-1 - Stock Missing-Data Audit Endpoint And Export

Goal: produce repeatable per-column stock diagnostics without ad hoc SQL.

Acceptance criteria:

- Endpoint/report returns per-column null, blank, null-equivalent, and invalid-value counts by scope.
- Separates expected nulls from actionable gaps.
- Exports unresolved rows by gap type: identity, provider, business metadata, price coverage, symbol mismatch.
- Does not mutate data.

### SMD-2 - Identity Repair Drain With Durable States

Goal: populate `isin`, `ipoDate`, and identity symbols from official/free sources.

Acceptance criteria:

- Drains `CATALOG_IDENTITY_REPAIR` for active `IN / STOCK` rows.
- Uses official NSE source first and BSE/manual official CSV where NSE does not cover the row.
- Persists per-stock repair states for resolved, unmatched, ambiguous, manual-required, and retryable source failures.
- Blocks ambiguous symbol/ISIN/exchange collisions.

### SMD-3 - Symbol/Price Identity Reconciliation

Goal: fix rows where successful prices are stored under a different symbol than `Stock.symbol`.

Acceptance criteria:

- Detects all `Stock.symbol <> providerSymbol` cases and all successful-load/no-price inconsistencies.
- Migrates or reconciles price rows only when the target stock id is unambiguous.
- Prevents future writes from storing prices under provider symbols while readiness checks look under stock symbols.
- Leaves a future architecture decision for moving `PriceTick` to `instrumentId`; do not do a broad migration without contract.

### SMD-4 - Provider Validation And Free EOD Fallback Drain

Goal: eliminate unknown provider rows and create local OHLCV coverage from free sources.

Acceptance criteria:

- Drains `UNKNOWN` provider validation first, then retry-failed validation.
- Yahoo failures for Indian stocks become official/free fallback-required before clean unsupported.
- Price backfill proves 15 years of daily data or listing-date-to-date coverage.
- BSE/NSE official EOD fallback is source-fingerprinted and bounded.
- `lastSuccessfulDataLoadTimestamp` is consistent with actual stored `price_ticks`.

### SMD-5 - Business Metadata Repair And Manual Import Hardening

Goal: fill `sector`, `industry`, and positive `marketCap` at scale.

Acceptance criteria:

- Yahoo provider business repair is drained for supported rows where it has useful data.
- BSE public List of Securities or source-fingerprinted manual public-source CSV fills unresolved `industry`/`marketCap` where safe.
- Manual import can handle business metadata and identity-only repair as separate modes.
- Remaining unresolved rows have durable `MANUAL_REQUIRED` or retry states with reasons.

### SMD-6 - Performance, Progress, And Memory Safety

Goal: prevent multi-hour opaque sync/repair behavior.

Acceptance criteria:

- Long operations persist progress after every batch/action.
- UI can show current action, processed count, remaining count, warnings, and next action.
- Cancellation/resume is available for repair runs.
- Provider calls use global source-level concurrency caps.
- Orchestrator/worker memory rule is enforced: no process-heavy start at or above 95 percent memory; after crossing, wait below 90 percent before starting more work.

## 7. QA Acceptance Model

QA must verify:

- Every active `IN / STOCK` gap is either populated with proper data or has a durable repair state and is excluded from trusted review.
- Cash stocks with null derivative contract fields are not flagged as defects.
- `providerError` null is acceptable unless provider validation failed.
- `missing_metadata_fields`, readiness blockers, repair-plan counts, and exported audit rows agree for null-equivalent values.
- No paid provider, broker API, or commercial free-tier dependency is introduced.
- Downstream modules cannot consume rows with unresolved P0 identity/provider/price gaps.

## 8. Immediate Team Recommendation

Do not start downstream backlog work yet. Start SMD-1, SMD-2, and SMD-3 in parallel because they have mostly separate write scopes:

- SMD-1: audit/reporting surface.
- SMD-2: catalog identity repair states and free source drains.
- SMD-3: symbol/price identity reconciliation.

SMD-4 and SMD-5 follow after identity and audit evidence are reliable. SMD-6 should be applied across every long-running repair path touched by these packets.
