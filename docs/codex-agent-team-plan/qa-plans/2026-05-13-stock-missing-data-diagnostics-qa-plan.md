# Stock Missing-Data Diagnostics QA Plan - 2026-05-13

## Mode And Scope

Mode: QA acceptance planning.

Write scope for this pass: this QA plan only. No production code, DB edits, services, provider-heavy runs, or test files are changed in this pass. Executable backend/UI tests should be added only after coordination with the implementation owner because the codebase is actively shared.

Primary scope: active `IN / STOCK` instruments and the read-only diagnostics that explain whether missing Stock fields are populated, intentionally nullable, excluded, or assigned a repair state.

Primary read-only endpoints for evidence:
- `GET /api/v1/market-data/stocks/missing-data-diagnostics`
- `GET /api/v1/market-data/universe/health`
- `GET /api/v1/market-data/review-readiness-summary`
- `GET /api/v1/market-data/universe/repair-plan`
- `GET /api/v1/instruments?region=IN&assetType=STOCK`
- `GET /api/v1/instruments/:id?region=IN&assetType=STOCK`

Mutation endpoints such as provider validation, catalog identity repair, provider business repair, manual metadata import, and price backfill are out of scope for this read-only QA lane except as contract references.

## Acceptance Checks

### SMD-01 - Expected Derivative Nulls Are Ignored For Cash Stocks

Setup: active `IN / STOCK` cash-equity instrument with `underlyingSymbol`, `expiryDate`, `contractMonth`, `lotSize`, and `contractStatus` all null.

Expected:
- Instrument remains in `STOCK`/`CASH` scope.
- Derivative fields are not listed in `missing_metadata_fields`.
- No universe blocker, repair-plan count, or downstream block is created solely from those derivative nulls.
- `derivatives_eligible` may be derived independently and must not imply missing futures contract fields.

### SMD-02 - Null providerError Is Ignored

Setup: active `IN / STOCK` instrument with `providerSupportStatus=SUPPORTED`, valid provider symbol, and `providerError=null`.

Expected:
- `providerError=null` is not a blocker.
- No `CRITICAL_PROVIDER_SYMBOL_MISMATCH` or provider retry count is produced.
- The instrument's provider readiness is driven by `providerSupportStatus`, provider symbol, and price/coverage facts, not by absence of an error string.

### SMD-03 - Identity Gaps Are Counted Separately

Setup: active provider-supported `IN / STOCK` instrument missing one or more deterministic identity fields: `exchange`, `providerSymbol`, `sourceSymbol`, `displaySymbol`, `catalogSource`, `isin`, or `ipoDate`.

Expected:
- `MISSING_ISIN` and `MISSING_LISTING_DATE` appear when `isin` or `ipoDate` are absent.
- `supportedCatalogIdentityRepairNeeded` and `catalogIdentityRepairNeeded` count supported identity gaps.
- Readiness evidence points to `CATALOG_IDENTITY_REPAIR`, not provider business metadata or price backfill.
- Unmatched/no-op identity repair remains visible as unresolved; it must not be reported as successful population.

### SMD-04 - Business Metadata Gaps Are Counted, Including Null-Equivalent Values

Setup: active provider-supported `IN / STOCK` instrument with sector/industry values of blank, `Unknown`, `N/A`, `NA`, `None`, or `Null`, and/or `marketCap` null, zero, or negative.

Expected:
- `MISSING_SECTOR`, `MISSING_INDUSTRY`, and `MISSING_MARKET_CAP` are reported as applicable.
- `supportedBusinessMetadataRepairNeeded`, `businessMetadataAutoRepairable`, `businessMetadataRetryEligible`, and `manualBusinessMetadataRequired` remain distinct.
- Null-equivalent sector/industry values are not treated as curated metadata.
- Manual fallback requires valid sector, valid industry, and positive numeric market cap before resolving business metadata.

### SMD-05 - Price Gaps Are Counted Separately From Metadata

Setup: active provider-supported `IN / STOCK` instrument with no latest price, stale latest price, inadequate rolling history, missing volume, or incomplete 15-year/listing-date coverage.

Expected:
- Price blockers are counted under price fields such as `missingLatestPrice`, `staleLatestPrice`, `missingOrInadequatePriceHistory`, `missingRecentVolume`, `supportedPriceBackfillNeeded`, and `historyCoverageIncomplete`.
- `requiredHistoryStartDate` uses listing date when the company is listed less than 15 years and falls back to the 15-year requirement when listing date is absent.
- Zero-row Yahoo/provider results are surfaced as fallback-required, not as successful repair.
- Price gaps do not get hidden behind metadata repair counts.

### SMD-06 - Symbol / Provider Price Mismatch Is Surfaced

Setup: provider-supported instrument whose provider identity is suspicious or mismatched, for example stored symbol and provider symbol point to different instruments, or provider evidence records a critical symbol/provider mismatch.

Expected:
- `provider_error` or readiness evidence surfaces the mismatch.
- Readiness blockers include `CRITICAL_PROVIDER_SYMBOL_MISMATCH` when the provider error indicates a critical symbol/provider mismatch.
- The instrument is not review-ready while mismatch is unresolved.
- Next action is symbol/catalog identity repair or provider validation diagnosis, not silent price acceptance.

### SMD-07 - No Paid Provider Source Is Introduced

Setup: inspect representative diagnostics and repair evidence for provider/source naming.

Expected:
- Sources are limited to existing/free/public paths such as Yahoo, NSE/BSE official/public exchange data, manual CSV, configured catalog URLs, or existing DB provenance.
- No paid provider, broker API, order-routing source, or credentialed data service appears in source labels, request payloads, docs, UI copy, or tests.
- A fallback-required state remains acceptable when free official/public data cannot prove coverage.

### SMD-08 - Diagnostics Are Read-Only

Setup: call only the read-only endpoints listed in this plan.

Expected:
- Requests use `GET`.
- Responses include scope, counts, blockers, warnings, signoff, readiness, and representative instrument fields without launching provider validation, price backfill, catalog import, manual import, or scheduler work.
- Repeating the same read-only request produces no DB mutation evidence such as new repair attempts, changed repair states, changed stock load timestamps, or new price rows.

### SMD-09 - Downstream Remains Blocked When P0 Gaps Are Unresolved

Setup: scoped `IN / STOCK` universe has unresolved hard blockers such as provider unknown/retry-failed rows, provider-supported identity gaps, provider-supported price backfill gaps, stale required EOD, fallback-required price coverage, market calendar uncertainty, or insufficient trusted universe.

Expected:
- `universeSignoff.status=FAIL` and `downstreamAllowed=false` when strict P0 blockers remain.
- `reviewMode=NO_REVIEW` and Today Review publishes no candidates when trusted universe thresholds are not met.
- If only business metadata context gaps remain and the price-action trusted universe is otherwise sufficient, the response must explicitly label limited/context-gap behavior rather than implying full strict signoff.
- UI/API copy points to the next bounded repair action and does not claim the universe is fixed.

## Focused Test Scenarios To Add After Coordination

- Backend service test: derivative contract nulls on active cash stock do not affect missing metadata, repair plan, or review readiness.
- Backend service test: `providerError=null` is neutral, while critical provider mismatch text creates `CRITICAL_PROVIDER_SYMBOL_MISMATCH`.
- Backend service/repository test: identity-only gaps count under catalog identity repair and do not enter provider business metadata repair.
- Backend service/repository test: business metadata null-equivalent values and non-positive market cap count as missing and route to provider/manual business repair.
- Backend service test: price gaps and required-history gaps count under price backfill/coverage fields and keep downstream blocked until resolved or classified fallback-required.
- Backend route/API test: read-only diagnostics endpoints do not call mutating service methods.
- UI fixture test: data-health/readiness screen renders derivative nulls as ignored, provider error null as neutral, identity/business/price gaps as separate counts, mismatch warning, no paid-source labels, and blocked downstream state.
- Contract test: `review-readiness-summary`, `universe/health`, `repair-plan`, and `instruments` agree on scope, blocker vocabulary, and signoff status for the same fixture.

## Evidence To Collect

- API samples from the read-only endpoints with `region=IN&assetType=STOCK`.
- Representative instrument rows showing expected derivative nulls and `provider_error=null`.
- Repair-plan counts for identity, business, and price gaps.
- Readiness/signoff fields proving downstream blocked state for unresolved P0 gaps.
- Source/provenance scan proving no paid provider or broker source is introduced.
- Test output after coordinated test implementation.

## Rejection Criteria

- A nullable derivative contract field is reported as missing for a cash stock.
- `providerError=null` creates a blocker or retry state.
- Identity, business, and price gaps are collapsed into one generic missing-data count.
- Null-equivalent sector/industry values count as populated metadata.
- Critical symbol/provider mismatch is not visible in API/UI diagnostics.
- Read-only diagnostics trigger provider calls, repair attempts, price writes, catalog imports, or scheduler work.
- Paid/broker/provider source appears anywhere in the missing-data diagnostics path.
- Downstream review proceeds or UI shows success while P0 provider, identity, price, freshness, fallback, or trusted-universe blockers remain unresolved.
