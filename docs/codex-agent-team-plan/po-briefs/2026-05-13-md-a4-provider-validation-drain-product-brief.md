# MD-A4 Product Brief - Provider Validation Drain And Retry Classification

Date: 2026-05-13  
Mode: Product Planning Mode  
Owner: MD-A4 Product Owner Refinement Agent  
Work item: MD-A4 - Provider Validation Drain And Retry Classification  
Owned artifact: `docs/codex-agent-team-plan/po-briefs/2026-05-13-md-a4-provider-validation-drain-product-brief.md`

## 1. Product Decision

MD-A4 is ready for Orchestrator intake as a P0 Market Data availability packet.

The product problem is that too many `IN / STOCK` catalog rows still have unproven provider support. Rows in `UNKNOWN`, retryable `VALIDATION_FAILED`, or ambiguous provider-blocked states cannot become reliable price-backfill candidates and must stay excluded from trusted review. This is not a validation-message polish problem. The user needs the app to convert catalog rows into a classified stock universe: provider-supported and eligible for OHLCV repair, cleanly unsupported and excluded, retryable with a next attempt, or manual-symbol-repair-required.

MD-A3 repairs supported shallow rows. MD-A4 is the complementary drain: if a large part of the stock catalog remains `UNKNOWN` or retry-failed, price backfill cannot create reviewable stocks no matter how good the backfill lane is.

## 2. Trader And Investor Impact

Unclassified provider support blocks real trading and investing workflows:

- The user may see thousands of Indian stocks in the catalog, but most are not usable for Today Review, Strategy Decision, Signal Quality, or Trade Plans because the app cannot prove Yahoo-backed OHLCV can be fetched.
- Provider-supported count remains artificially low, so MD-A3 price backfill has too few candidates to deepen.
- Retryable provider outages, slow calls, or temporary empty responses can strand valid stocks in a failed state.
- Clean unsupported rows remain mixed with repairable rows unless they are explicitly excluded from price and metadata blocker counts.
- A successful price fetch on a previously `UNKNOWN` stock must repair provider support to `SUPPORTED`; otherwise the app can hold usable price data while still blocking trusted review.

The user-facing value of MD-A4 is a larger classified `IN / STOCK` universe with more stocks eligible for completed-EOD OHLCV backfill and fewer hidden blockers.

## 3. Domain Assumptions

- Scope is `region=IN` and `assetType=STOCK`.
- Market Data completeness target: every active stock should have 15 years of daily OHLCV history. If the company listed less than 15 years ago, the system should store all available daily OHLCV from listing date through the latest completed EOD.
- Listing date is a product-critical field, not optional decoration. It determines whether the required start date is `latestCompletedEod - 15 years` or the actual listing date.
- Yahoo remains one free validation/enrichment/history source only, not the master catalog and not the only acceptable source.
- If Yahoo cannot provide enough reliable completed-EOD OHLCV for Indian stocks, the product must switch to another free source or free-source fallback before accepting missing data as the final answer.
- Preferred free fallback direction for `IN / STOCK` is official/public exchange EOD files, starting with NSE `CM-UDiFF Common Bhavcopy Final (zip)` from `https://www.nseindia.com/all-reports` and BSE Equity Bhav Copy / Historical Bhav Copy from `https://www.bseindia.com/markets/MarketInfo/BhavCopy.aspx`.
- Free tiers from commercial paid-data providers are not approved by default. A provider is acceptable only if the team records the source, terms risk, no-cost status, throttling behavior, and no paid upgrade dependency.
- Public/free provider coverage can be incomplete, slow, throttled, or temporarily unavailable.
- `UNSUPPORTED` is acceptable only when evidence shows the symbol cannot be mapped or a wide completed-EOD-safe validation window returns no useful candles.
- `VALIDATION_FAILED` should mean retryable provider/system failure unless evidence indicates manual symbol repair is needed.
- `UNKNOWN_FIRST` must drain before retry-failed rows consume operator/provider budget.
- Downstream modules must remain fail-closed until Market Data produces trusted, current, volume-bearing rows.

## 4. Prioritized Acceptance Criteria

### P0 - Drain Fresh Unknowns Before Retrying Failures

- `GET /api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK` exposes separate counts for `providerUnknownValidationNeeded`, `providerRetryValidationNeeded`, `providerUnsupportedExcluded`, and `providerValidationFailed`.
- The recommended next lane remains `VALIDATE_PROVIDERS` while `providerUnknownValidationNeeded > 0`.
- `Retry failed providers` is not the preferred drain action until `UNKNOWN_FIRST` reaches `0` or the remaining unknowns are explicitly blocked by provider/system evidence.
- Mutating validation queues re-read from `offset=0` until empty so repaired rows do not cause skipped rows.

### P0 - Classify Outcomes Into Product-Useful States

- Every processed row ends in one of these product states: `SUPPORTED`, clean `UNSUPPORTED`, retryable validation failure with next retry evidence, or manual symbol repair required.
- Clean unsupported rows are counted as excluded and do not inflate price-backfill, metadata, trusted-review, or missing-data blockers.
- Retryable rows expose enough evidence to decide whether the next action is retry now, retry later, or manual symbol repair.
- Validation results include the requested provider symbol, outcome category, error/warning sample, and enough timing/provider evidence to distinguish timeout/provider error/zero candles/manual-symbol problem.

### P0 - Convert Successful Provider Proof Into Price Availability

- Successful provider validation updates the row to `SUPPORTED` and increases the supported candidate pool for price backfill.
- Successful OHLCV ingestion for a previously `UNKNOWN` row repairs provider support to `SUPPORTED`.
- Provider support is only product-useful if the provider/free fallback can support the required history window: 15 years or listing-date-to-latest-completed-EOD for younger companies.
- After MD-A4, `supportedPriceBackfillNeeded` can increase because formerly unknown rows became eligible; that is a success, not a regression.
- `review-readiness-summary` and `universe/health` show `providerUnknown` and retry blockers decreasing without claiming review readiness until price depth, freshness, volume, and trust criteria pass.

### P0 - Bound Free Provider Calls And Continue Through Failures

- Each provider validation call has a bounded wait, failure classification, and batch continuation behavior.
- A timeout or transient provider error for one symbol does not fail the whole batch.
- Batch evidence includes processed, supported, unsupported, validation-failed, skipped, warning, duration, and remaining queue counts.
- Validation uses a completed-EOD-safe window wide enough for Indian equities so holidays, illiquidity, or recent no-trade windows do not create false unsupported classifications.

### P1 - Make Retry Eligibility Visible

- Retry-failed rows show retry eligibility, retry-blocked/recently-attempted counts, and representative next retry evidence where available.
- Retry runs process only `VALIDATION_FAILED` rows when `providerValidationQueue=RETRY_FAILED`.
- Repeated retry failures do not hide fresh `UNKNOWN` rows or erase manual-symbol-repair evidence.

### P1 - Operator Workflow Is Bounded And Repeatable

- The Market Data Foundation UI shows Provider unknown, Retry failed providers, Unsupported excluded, and Supported price backfill needed for `IN / STOCK`.
- `Validate unknown providers` and `Retry failed providers` remain bounded batch actions with visible progress/result summaries.
- A drain-mode repair run can repeat provider validation batches until the queue is empty or blocked, and the latest repair run records before/after health and repair-plan counts.

## 5. Non-Goals

- No paid market-data providers, paid exchange files, paid APIs, broker APIs, hosted queues, paid retry services, paid observability tools, or paid UI/chart libraries.
- No dependency on a paid commercial provider's free tier unless Product Owner and Architect explicitly approve it as no-cost, sustainable for personal local use, and replaceable.
- No downstream gate relaxation in Today Review, Strategy Decision, Signal Quality, Trade Plans, or Data Quality.
- No advice wording changes, buy/sell recommendation changes, portfolio automation, order placement, live trading, or autonomous trading.
- No attempt to make unsupported rows look usable.
- No broad BSE/F&O identity redesign in this packet; ambiguous symbol identity should be surfaced for MD-A5/manual repair, not silently guessed.
- No requirement that MD-A4 itself deep-backfills prices; it must create and prove supported candidates for the existing price-backfill lane.
- No permanent `UNSUPPORTED` decision based only on Yahoo insufficiency when an approved free exchange-data fallback has not been attempted or explicitly ruled out.

## 6. Exact Workflow To Validate In Market Data Foundation

### UI Workflow

1. Open Market Data Foundation.
2. Set scope to India and stocks: `region=IN`, `assetType=STOCK`.
3. Capture the baseline cards in Universe Repair Workflow:
   - Provider unknown
   - Retry failed providers
   - Unsupported excluded
   - Supported price backfill needed
4. Open the Needs Validation preset or filter `providerSupportStatus=UNKNOWN` to inspect representative blocked rows.
5. Click `Validate unknown providers`.
6. Confirm the result summary shows `Provider queue: UNKNOWN_FIRST`, processed count, updated count, failed count, supported/unsupported/validation-failed counts, warnings, and whether another bounded run is needed.
7. Refresh health and repeat `Validate unknown providers` until `providerUnknownValidationNeeded=0` or the remaining unknown blockers are explicit provider/system failures with evidence.
8. Only after unknowns are drained, click `Retry failed providers`.
9. Confirm the result summary shows `Provider queue: RETRY_FAILED` and retry outcomes do not change the recommended lane back to retry while fresh unknowns exist.
10. Refresh health and verify:
    - `providerUnknownValidationNeeded` decreased to `0` or explicit blockers.
    - `providerRetryValidationNeeded` decreased or shows retry/manual evidence.
    - `providerUnsupportedExcluded` increased only for clean unsupported rows.
    - `providerSupported` and/or `supportedPriceBackfillNeeded` increased where valid stocks were found.
11. Click `Backfill prices` only as a follow-up proof for newly supported candidates; do not use price backfill to mask unclassified provider rows.
12. Verify Today Review remains blocked or limited until trusted price, freshness, volume, and depth criteria are satisfied.

### API Workflow

Baseline evidence:

- `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK`
- `GET /api/v1/market-data/universe/health?region=IN&assetType=STOCK`
- `GET /api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK`
- `GET /api/v1/market-data/universe/repair-workbench?region=IN&assetType=STOCK`
- Optional row inspection: `GET /api/v1/instruments?region=IN&assetType=STOCK&providerSupportStatus=UNKNOWN`

Unknown drain:

```json
POST /api/v1/market-data/provider/validate
{
  "region": "IN",
  "assetType": "STOCK",
  "batchSize": 50,
  "offset": 0,
  "providerValidationQueue": "UNKNOWN_FIRST"
}
```

Drain run option:

```json
POST /api/v1/market-data/universe/repair-run
{
  "region": "IN",
  "assetType": "STOCK",
  "batchSize": 50,
  "maxBatchesPerAction": 10,
  "mode": "DRAIN_UNTIL_BLOCKED",
  "actions": ["VALIDATE_PROVIDERS"],
  "providerValidationQueue": "UNKNOWN_FIRST"
}
```

Retry-failed lane after unknowns are drained:

```json
POST /api/v1/market-data/provider/validate
{
  "region": "IN",
  "assetType": "STOCK",
  "batchSize": 50,
  "offset": 0,
  "providerValidationQueue": "RETRY_FAILED"
}
```

Final evidence:

- Re-run the baseline endpoints.
- `GET /api/v1/market-data/universe/repair-runs/latest?region=IN&assetType=STOCK`
- `GET /api/v1/instruments?region=IN&assetType=STOCK&providerSupportStatus=SUPPORTED`
- `GET /api/v1/instruments?region=IN&assetType=STOCK&providerSupportStatus=UNSUPPORTED`
- `GET /api/v1/instruments?region=IN&assetType=STOCK&providerSupportStatus=VALIDATION_FAILED`

## 7. Product Evidence Required Before Acceptance

PO acceptance requires live/local evidence, not only tests or screenshots:

- Before/after `review-readiness-summary` showing provider unknown and retry blockers moving in the right direction while downstream review stays conservative.
- Before/after `universe/health` showing provider-supported, provider-unknown, retry-failed, unsupported-excluded, trusted count, review mode, and trust status.
- Before/after `repair-plan` showing `providerUnknownValidationNeeded`, `providerRetryValidationNeeded`, `providerUnsupportedExcluded`, and `supportedPriceBackfillNeeded`.
- A latest repair-run record showing scoped `IN / STOCK` provider validation, queue mode, batch size, terminal status, before/after repair-plan counts, warning samples, and whether another run is needed.
- Batch summaries for both `UNKNOWN_FIRST` and `RETRY_FAILED` when retry failures exist.
- Representative row samples for each final category:
  - supported and now eligible for price backfill;
  - clean unsupported and excluded;
  - retryable provider failure with next retry evidence;
  - manual-symbol-repair-required or identity-blocked if present.
- Proof that a successful OHLCV fetch on an `UNKNOWN` row changes provider support to `SUPPORTED`.
- Proof that unsupported rows are excluded from price/metadata blocker counts and are not candidates for trusted review.
- Proof that no downstream module was changed to accept stale, shallow, unclassified, unsupported, or retry-failed market data.

## 8. Rejections

PO will reject MD-A4 if any of the following are true:

- The work only changes messages while `UNKNOWN` or retry-failed rows still block price backfill without clear classification.
- `RETRY_FAILED` rows are retried before fresh `UNKNOWN` rows are drained.
- Provider failures are collapsed into permanent unsupported without timeout/provider-error/manual-repair evidence.
- Yahoo no-data or shallow-data evidence is treated as final even though an approved free source such as NSE/BSE bhavcopy could supply completed-EOD OHLCV.
- Zero-candle validation uses a window too narrow to be credible for Indian equities.
- A slow provider call can stall the whole batch indefinitely.
- Unsupported rows continue to inflate missing-price, missing-metadata, trusted-review, or price-backfill blocker counts.
- A successful provider validation or OHLCV fetch does not repair provider support to `SUPPORTED`.
- A row is called data-complete without meeting the 15-year or listing-date-to-latest-completed-EOD history requirement.
- The UI/API claims review readiness only because provider support improved, while price depth, latest completed EOD, and volume are still insufficient.
- Any paid provider, paid tool, broker integration, or downstream gate relaxation is introduced.

## 9. Risks And Residual Gaps After MD-A4

- Free Yahoo endpoints can throttle, change behavior, or miss valid Indian equities; MD-A4 can classify and retry, but it cannot guarantee full market coverage.
- If Yahoo coverage remains insufficient, the next implementation must move to approved free exchange EOD sources rather than paid providers or acceptance of missing data.
- Some valid stocks may require MD-A5 catalog identity/manual provider-symbol repair before validation can succeed.
- BSE breadth, F&O underlyings, NSE/BSE collisions, ISIN/listing-date repair, and exchange-aware identity remain MD-A5 scope.
- Holiday/session uncertainty can still create false stale or zero-candle interpretations until MD-A6.
- Volume and adjusted-close provenance still need MD-A7 evidence before full investor trust.
- MD-A4 may increase price-backfill queues by discovering more supported rows; MD-A3/price repair must still run to convert support into usable OHLCV depth.
- Trusted Review Lite may remain below threshold after MD-A4 if supported rows are shallow, stale, missing volume, or context-blocked.

## 10. Orchestrator Intake Recommendation

Recommended intake status: `READY_FOR_ORCHESTRATOR`.

Suggested packet title: `MD-A4 - Provider Validation Drain And Retry Classification`.

Suggested implementation owner: Market Data Foundation lane, with backend provider/service ownership first and frontend evidence updates after API fields stabilize.

Suggested sequencing: run MD-A4 immediately after MD-A3 if unknown/retry provider blockers remain high. Pull MD-A4 ahead of further price work if current evidence shows too few `SUPPORTED` `IN / STOCK` rows to make MD-A3 backfill materially useful.
