# Market Data Missing/Stale Data Root-Cause PO Audit - 2026-05-13

Mode: Product Planning / PO Audit  
Owner: Product Owner Agent  
Scope: Market Data Foundation availability for trader/investor workflows, local personal use, `IN / STOCK` first, no paid providers/tools/services.  
Write boundary: this report only. Backend and frontend market-data-foundation files were inspected as read-only context.

## 1. Current PO Verdict On Market-Data Readiness

Market Data is still **not ready** as the upstream trust layer for signals, decisions, Today Review, or trade plans.

The current product blocker is not downstream validation language. The blocker is that the app still cannot prove a sufficiently large, current, deep, provider-supported, volume-bearing `IN / STOCK` universe before downstream modules consume the data. Prior live evidence remains the latest accepted business baseline: `catalogCount=2907`, `providerSupportedCount=597`, `trustedCount=0`, `reviewReady=0`, `reviewMode=NO_REVIEW`, and `trustStatus=NOT_TRUSTWORTHY`. I did not run mutating repair jobs or start services for this planning audit.

MD-A2 is released and the visible Sync Catalog workflow now uses a bounded run/status/cancel path. MD-A3 is still the correct immediate implementation packet because shallow supported rows must be deep-backfilled before a trusted review universe can exist. However, the scan also found a remaining scheduled-sync catch-up gap: the scheduler can decide not to call `syncScheduledRegion` before the service-level completed-EOD catch-up gate gets a chance to run. That means the MD-A1 acceptance contract needs amendment or follow-up proof, not just code-level confidence.

PO decision: keep Cycle 3 downstream work parked until Market Data proves, with local evidence, that `IN / STOCK` reaches at least a non-zero trusted universe and preferably the Lite threshold. Do not relax downstream gates to make missing data appear usable.

## 2. Ranked Root Causes For Missing/Stale/Insufficient Stock Data

### 1. Provider support remains unclassified for too much of the stock catalog

Rows with `providerSupportStatus=UNKNOWN` are catalog-only. They cannot be trusted for review, backfill targeting, Today Review, or trade plans. The previous live baseline showed provider validation as the largest blocker.

User impact: the user may see thousands of stocks in the catalog but only a small subset can ever receive Yahoo-backed OHLCV until provider validation drains or classifies rows as unsupported/manual.

### 2. Supported rows still need deep OHLCV backfill, not only recent incremental sync

The module can have provider-supported stocks with recent candles but fewer than the 120 bars required for Trusted Review Lite or fewer than the 200/252 bars needed by deeper downstream evidence. The current MD-A3 direction is right: price backfill must force deep repair for supported shallow rows without exposing `fullReload` as an operator requirement.

User impact: signals, strategy context, data quality, Today Review Lite, Signal Quality, and Trade Plans stay in insufficient-data states even after a stock looks "synced."

### 3. Latest completed EOD freshness can still fail through the scheduler path

The service-level freshness gate now has completed-EOD catch-up behavior, but the scheduler's `runOnce` first calls the market-session decision directly and can skip before calling `syncScheduledRegion`. Before open or during market hours, this can bypass the catch-up path even when the latest completed candle is missing.

User impact: a repaired local universe can become stale and stay stale, so decisions/trades may be based on yesterday's or older data while the scheduler reports a session-based skip.

### 4. Latest stored date can hide per-instrument gaps

Region-level freshness uses the maximum latest stored date across scoped symbols. That is useful for status, but a single current stock does not prove every candidate is current. Trusted membership must remain per-instrument.

User impact: the user may believe `IN / STOCK` is current while many individual stocks still lack the required latest EOD candle.

### 5. Catalog identity is still a correctness risk for Indian stocks

`Stock.symbol` is globally unique and `PriceTick` is keyed by `symbol + timestamp`. NSE/BSE symbols, provider symbols, source symbols, and exchange identity must be deterministic or prices can be stored under the wrong tradable instrument.

User impact: the app can either miss valid stocks or, worse, attach the wrong exchange's price stream to a review/trade candidate.

### 6. BSE equity, F&O underlyings, and broader Indian coverage need local/manual fallback paths

NSE equity has a built-in public catalog URL, but BSE equity and F&O underlyings require configured URLs or manual CSV. Yahoo is not a master security catalog.

User impact: the desired Indian stock universe may remain incomplete unless the product supports local CSV identity/metadata repair clearly and safely.

### 7. Missing or zero volume is a hard availability issue, not a display issue

Trusted Review Lite requires recent volume. Signal Generation, smart-money context, Today Review Lite, and trade-plan confidence all use volume-sensitive logic.

User impact: close prices alone are not enough. Stocks without usable recent volume must stay excluded from review or be visibly degraded.

### 8. Adjusted-close provenance is still not strong enough for investor trust

The provider now preserves missing adjusted close as null, and readiness exposes fallback warnings. That is the right direction, but acceptance must prove stored data and UI summaries distinguish true adjusted close from close fallback.

User impact: return calculations, calibration, backtests, and split-adjusted historical comparisons can be misleading if close fallback is treated as real adjusted-close coverage.

### 9. Holiday/session inputs are incomplete for India

Market session config still has empty holiday arrays. Strict freshness is correct, but missing holiday knowledge can falsely mark data stale on an exchange holiday or incorrectly expect a candle.

User impact: the user can be blocked from review on valid non-trading days, or the app can produce confusing stale-data repair guidance.

### 10. Legacy bulk sync remains an exposed backend/API path

The visible UI moved to bounded catalog sync, but `/market-data-foundation/stocks/sync-all` still exists and the frontend API still exports `syncAllStocks`. The legacy worker path also does not carry the service gate's provider end-date cap into each worker fetch.

User impact: an accidental or future use of the legacy path can start a large synchronous provider job, fetch beyond the intended completed-EOD cap, and produce weak progress/evidence compared with the released MD-A2 path.

### 11. Repair evidence is not yet accepted as live availability improvement

The workbench and bounded runs are the right operating model, but the product still needs before/after evidence that queues drain and trusted membership increases.

User impact: the user can see good diagnostics and repair buttons while still having zero stocks available for review.

### 12. Downstream consumers are mostly fail-closed, but proof after repair is missing

Today Review, Trade Plans, Strategy Decision, and Signal Quality generally expose missing data rather than hiding it. That behavior should stay. The missing part is proof that, once Market Data improves, downstream modules consume only trusted/current members.

User impact: after repair, the user needs confidence that candidates are coming from the trusted universe and not stale persisted rows or wrong-scope fallbacks.

## 3. Proposed Next Work Items After MD-A3

### P0 - MD-A4 Provider Validation Drain And Retry Classification

Goal: turn `IN / STOCK` from a catalog into a classified universe: supported, unsupported, retry-failed, or manual/correctable.

Acceptance criteria:

- `UNKNOWN_FIRST` provider validation drains before retry-failed rows are retried.
- `providerUnknownValidationNeeded` reaches `0`, or remaining blockers are explicit provider/system failures with next retry evidence.
- Clean unsupported rows are visible and excluded from price and metadata blocker counts.
- Retry-failed rows show next retry eligibility and do not hide fresh unknowns.
- Successful OHLCV ingestion repairs `UNKNOWN` to `SUPPORTED`.

### P0 - MD-A5 Completed-EOD Scheduler Contract Completion

Goal: ensure scheduled and manual sync paths both catch up missing completed EOD candles without fetching in-progress daily candles.

Acceptance criteria:

- Scheduler runs a completed-EOD catch-up when `latestStoredTradingDate < latestCompletedTradingDateForRegion`, even before open or during market hours.
- Service, scheduler status, and sync-state summaries agree on `latestCompletedTradingDate`, `latestStoredTradingDate`, `latestCompletedCandleStored`, and `candleSyncStatus`.
- Provider fetch end date is capped to the latest completed trading date.
- `MISSING_LATEST_COMPLETED` is never treated as a harmless no-new-data skip.
- Local evidence covers `IN / STOCK` before-open, market-open, and post-close cases.

### P0 - MD-A6 Trusted Review Lite Evidence Run

Goal: prove that market-data repair creates actual reviewable stocks, not just better diagnostics.

Acceptance criteria:

- Before/after captures exist for review-readiness summary, universe health, review universe, and repair plan.
- `trustedCount` moves from the prior baseline of `0` to a non-zero count, with a clear path to `TRUSTED_REVIEW_MIN_LITE`.
- At least 20 sampled trusted instruments have current latest EOD, at least 120 bars, recent positive volume, and truthful adjusted-close/fallback status.
- Today Review remains `NO_REVIEW` before threshold and moves only when Market Data trusted membership supports it.
- Remaining blockers are ranked by count and next repair action.

### P1 - MD-A7 Catalog Identity And Manual CSV Repair Hardening

Goal: make Indian symbol identity safe enough for NSE/BSE and manual/public-source repair.

Acceptance criteria:

- Supported catalog identity gaps reach `0` or become explicit unmatched/manual rows.
- Repairs update only the matched stock id.
- Manual CSV can repair provider symbol, source symbol, exchange, ISIN, listing date, sector, industry, and market cap where allowed.
- NSE/BSE duplicate symbol/name collisions cannot update the wrong row.
- Source fingerprint changes restart offsets safely with operator-visible warning.

### P1 - MD-A8 Holiday/Session Accuracy For IN

Goal: prevent false stale-EOD blockers caused by missing Indian market holiday knowledge.

Acceptance criteria:

- A free/local India holiday source or local fixture is available to Market Data.
- Absence of holiday data is exposed as calendar uncertainty when it affects freshness.
- Holidays do not require impossible latest candles.
- Weekends and holidays preserve the rule against fetching in-progress EOD data.

### P1 - MD-A9 Volume And Adjusted-Close Honesty Proof

Goal: prove OHLCV quality is trustworthy enough for investor workflows.

Acceptance criteria:

- Recent volume coverage is measured per trusted candidate.
- Missing/zero volume excludes rows from trusted review and appears in blocker counts.
- True adjusted-close coverage is distinguishable from close fallback in readiness summaries and instrument detail.
- Close fallback is allowed only as an explicit warning.

### P2 - MD-A10 Retire Or Guard Legacy Bulk Sync

Goal: remove accidental use of the legacy whole-universe sync path as an availability risk.

Acceptance criteria:

- `/stocks/sync-all` is either retired, admin-guarded, or internally redirected to the bounded sync-run contract.
- Frontend code no longer exports or calls a legacy bulk-sync helper unless it wraps the bounded run path.
- Worker sync receives the same scope, freshness, provider-end-date, and EOD cap as the released sync-run path.
- QA proves the visible and documented operator path cannot start an unbounded whole-catalog provider job.

### P2 - MD-A11 Downstream Trusted-Membership Proof

Goal: prove repaired data is consumed safely without weakening downstream gates.

Acceptance criteria:

- Every Today Review candidate is inside the trusted membership snapshot for the run.
- Strategy Decision candidates outside trusted membership stay excluded from Today Review.
- Trade Plans still classify missing latest price/history/proof as insufficient data.
- Signal Quality distinguishes missing price history, insufficient future rows, and not-yet-mature outcomes.

## 4. Dependencies

- MD-A3 deep price backfill must be implemented and accepted before judging whether remaining insufficient-history blockers are provider/data limitations or repair defects.
- Provider validation depends on Yahoo coverage, correct provider symbols, public exchange catalogs, and local/manual CSV fallback.
- Trusted Review Lite depends on current latest EOD, at least 120 OHLCV bars, recent volume, and provider support.
- Full signoff depends on stricter 252-bar coverage, metadata completeness, identity repair, calendar accuracy, and minimum review-ready counts.
- Downstream validation depends on Market Data producing trusted membership first.

## 5. Non-Goals

- No paid market-data providers, paid hosted tools, broker APIs, order placement, live trading, or autonomous trading.
- No downstream gate relaxation to hide missing or stale data.
- No advice wording changes or buy/sell recommendation semantics.
- No schema or implementation prescription in this PO audit.
- No attempt to make strict full-catalog signoff a prerequisite for Lite price-action review.

## 6. Existing Work Packet Validity And Amendments

- **MD-A1 - Latest Completed EOD Catch-Up Gate:** still valid, but needs amendment/follow-up. The service-level catch-up behavior is not enough if the scheduler bypasses `syncScheduledRegion` after calling the session decision directly. Add scheduler-path acceptance proof.
- **MD-A2 - Sync Catalog Progress And Bulk Performance:** still valid and released for the visible UI path. Add a follow-up P2 item to retire or guard the legacy `/stocks/sync-all` path and stale frontend helper.
- **MD-A3 - Deep Price Backfill For Supported Shallow Rows:** still valid and remains the immediate next implementation focus. Acceptance must include live/local evidence that supported shallow rows receive deep history, not just unit tests or UI diagnostics.
- **Parked MD-A4 - Provider Validation Drain And Retry Classification:** still valid, should become P0 immediately after MD-A3 unless MD-A3 evidence shows too few supported rows to backfill. If supported rows are too few, pull this forward before further price work.
- **Parked MD-A5 - Catalog Identity And Manual CSV Repair Hardening:** still valid, but should explicitly include NSE/BSE collision safety and manual provider-symbol repair.
- **Parked MD-A6 - Holiday/Session Accuracy:** still valid, and should include the scheduler catch-up bypass evidence if not handled in the MD-A1 amendment.
- **Parked MD-A7 - Adjusted-Close And Volume Coverage Honesty:** still valid. Expand acceptance to include sampled trusted instruments and UI/readiness proof.

## PO Close

The root cause remains upstream data availability. The product should not proceed to downstream trading/signal feature work until Market Data can prove a current, deep, volume-bearing trusted `IN / STOCK` subset from local/free data sources, with unsupported/manual rows classified honestly.
