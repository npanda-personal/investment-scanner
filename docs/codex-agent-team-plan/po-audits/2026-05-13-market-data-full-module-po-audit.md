# Market Data Full Module PO Audit After MD-A1 - 2026-05-13

Mode: Product Planning / PO Audit  
Owner: Product Owner Agent  
Scope: Market Data Foundation as the upstream trust layer for Signals, Signal Quality, Strategy Decision, Today Review, and Trade Plans.  
Write boundary honored: this report only. Production source was inspected read-only.

## 1. Executive Domain View

Market Data is not yet healthy enough to resume Cycle 3 backlog. The product problem is not that downstream modules lack screens or language. The product problem is that the application still cannot prove enough current, deep, scoped, provider-supported stock data for a useful investor/trader workflow.

The investor/trader cannot rely on the app today because:

- The local `IN / STOCK` catalog is still not equivalent to a reviewable universe. Prior live evidence recorded `catalogCount=2907`, `providerSupportedCount=597`, `trustedCount=0`, and `reviewReady=0`. This audit did not run mutating repair jobs, so those counts remain the latest reviewed live baseline until Orchestrator/QA captures fresh local evidence.
- MD-A1 appears represented in code: `evaluateSyncFreshnessGate` now allows completed EOD catch-up when `latestStoredTradingDate < latestCompletedTradingDateForRegion`, even when the current session would otherwise skip. That fixes one stale-data trap in design, but it does not create trusted stocks by itself.
- The visible `Sync Catalog` action still calls a legacy bulk sync path through `syncAllStocks(4, 4, 3000, ...)`, which posts one request to `/market-data-foundation/stocks/sync-all`. Backend `syncAll` loads all active stock sync tasks, splits them across workers, and awaits all worker promises before returning. This is the clearest remaining user-hostile workflow: it can run for hours with no real progress/status contract.
- The repair workbench has the right conceptual lanes, but bounded lanes must be proven against live local data. A green UI around repair controls is not enough if provider unknowns, stale EOD, shallow history, missing volume, and trusted count do not move.
- Price availability is still the main product unlock. Signals, Signal Quality, Strategy Decision, Today Review, and Trade Plans should remain conservative until Market Data provides current EOD, enough OHLCV depth, and recent volume for a meaningful trusted subset.

Product decision: Cycle 3 downstream backlog remains parked until Market Data can prove at least a non-zero and preferably Lite-threshold Trusted Review Universe from local data, with repair evidence showing which queues moved, which rows are unsupported/manual, and which blockers remain.

## 2. Ranked Root Causes Still Open After MD-A1

1. **Sync Catalog can still run as an unbounded user action with no useful progress.**  
   Evidence: `MarketDataFoundationPage` calls `syncAllStocks(4, 4, 3000, ...)` from `handleCatalogSync`; the API helper posts to `/market-data-foundation/stocks/sync-all`; the controller accepts worker counts up to `10 x 10`; service `syncAll` loads all active tasks and waits for all worker work to finish before returning. This violates the product standard for long-running workflows. It also competes conceptually with the newer bounded repair workbench, leaving users with two operational paths and one dangerous legacy path.

2. **Provider validation drain is not live-proven.**  
   The module has staged `UNKNOWN_FIRST` and `RETRY_FAILED` repair lanes, but the product still needs proof that `providerUnknownValidationNeeded` drains to zero or becomes explicit retry/unsupported/manual diagnosis. Without that, most catalog rows remain catalog-only and downstream modules cannot trust them.

3. **Deep OHLCV history is not guaranteed after a row was shallow-synced.**  
   The architecture notes correctly identify the trap: scheduled/bootstrap or partial sync can mark `lastSuccessfulDataLoadTimestamp`, then later incremental fetches only use a short overlap. `backfillPrices` calls `ingestSymbol(..., fullReload = Boolean(request.fullReload))`; if the caller does not request full reload, shallow rows may never reach 120/200/252 bars. Trusted Review Lite needs at least 120 bars; Data Quality/Strategy/Trade Plan paths need deeper windows.

4. **Latest/stale data still needs live catch-up proof after MD-A1.**  
   MD-A1 addresses the skip-gate defect in code, but the product needs local evidence that missing completed EOD actually gets fetched, stored, and reflected in `storedDataThroughDate`, `latestStoredEodDate`, trusted membership, and scheduler status. A code-level fix is not enough if provider fetches return zero rows, are rate-limited, or are not invoked by the UI path users actually click.

5. **Catalog identity remains a correctness risk, not just a metadata nicety.**  
   `Stock.symbol` is globally unique and `PriceTick` keys by `symbol + timestamp`; this is documented but still risky for NSE/BSE collisions and wrong-exchange price streams. Catalog identity repair must prove it updates the matched stock id, fixes provider symbols/source symbols/ISIN/listing date where available, and classifies unresolved rows rather than silently targeting the wrong instrument.

6. **Manual CSV fallback is necessary but still operationally fragile.**  
   Public/free provider and catalog coverage will not cover every Indian row. Manual CSV is the correct local-first fallback for business metadata and some catalog identity gaps, but it must be usable at scale: template export, validation, fingerprint restart, resumable offset, clear unresolved rows, and no hidden reset of operator progress.

7. **Holiday/session logic still has empty holiday arrays.**  
   `DEFAULT_MARKET_SESSION_CONFIGS` has empty `holidays` for `IN`, `US`, and `EU`. That means the app can require a latest completed candle for an exchange holiday and falsely mark otherwise current data stale. The strict freshness rule is correct; the calendar input is incomplete.

8. **Volume and adjusted-close provenance are not trustworthy enough yet.**  
   Trusted review requires recent volume. The provider maps `adjustedClose` to `item.adjClose ?? item.adjclose ?? item.adjustedClose ?? item.close ?? null`, which can make close fallback look like adjusted-close coverage. Volume and adjusted-close fallback must be represented honestly because Signal Generation, Smart Money, Signal Quality, backtesting, and Trade Plans depend on price/volume integrity.

9. **Repair-run UX can still become another long wait.**  
   The workbench starts operational repair with `maxBatchesPerAction` values such as 20 or 50 and waits for the response. It is bounded, which is better than legacy sync, but the user still needs intra-run progress or resumable status if a drain run lasts minutes. MD-A2 should cover this, not only the old Sync Catalog button.

10. **Downstream proof is still missing.**  
    Today Review, Trade Plans, Signal Quality, and Strategy Decision mostly fail closed, which is correct. But after Market Data repair, QA must prove downstream consumers actually consume trusted membership and current local prices rather than stale persisted rows or wrong-scope fallbacks.

## 3. Priority Order Of Fixes

### 1. MD-A2 - Sync Catalog Progress And Bulk Performance

User value: The user can safely refresh/repair market data without starting a hidden multi-hour request.

Acceptance criteria:

- `Sync Catalog` no longer fires one whole-universe synchronous request with no progress.
- The UI shows immediate disabled/loading state, determinate progress where totals are known, partial/final counts, warnings, failures, and retry guidance.
- Backend work is bounded by batch, resumable job/status polling, or a worker-owned run contract.
- `region` and `assetType` are sent on every request.
- Provider-facing concurrency is server-owned and capped; frontend and backend parallelism cannot multiply into uncontrolled provider/database load.
- QA proves the old hours-long/no-progress failure mode cannot happen from the visible button.

### 2. MD-A3 - Deep Price Backfill For Supported Shallow Rows

User value: Supported stocks gain enough historical OHLCV for Today Review Lite, Data Quality, Strategy Decision, Signal Quality, Smart Money, and Trade Plans.

Acceptance criteria:

- Provider-supported rows with fewer than 120 bars are deep-backfilled without requiring the operator to know `fullReload`.
- Rows below 200/252 bars are counted and repaired or explicitly left as still shallow.
- Backfill end date is capped to the latest completed trading date.
- Results expose rows received, inserted, updated, no-op, zero-row, failed, skipped, and remaining candidates.
- At least a sampled trusted set shows current EOD, 120+ bars, recent positive volume, and truthful adjusted-close fallback status.

### 3. Provider Validation Drain And Retry Classification

User value: The catalog becomes a classified universe: supported, unsupported, retry-failed, or manual/correctable.

Acceptance criteria:

- `UNKNOWN_FIRST` drains before retry-failed validation.
- `providerUnknownValidationNeeded` reaches zero or is blocked only by explicit provider/system failure evidence.
- Clean unsupported rows are visible but excluded from price and metadata blockers.
- Retry-failed rows show next retry eligibility and do not hide fresh unknown rows.
- Successful OHLCV ingestion repairs `UNKNOWN` to `SUPPORTED`.

### 4. Catalog Identity And Manual CSV Repair Hardening

User value: Price repair targets the right instruments, and the user has a local/free path for rows public sources cannot classify.

Acceptance criteria:

- Provider-supported catalog identity gaps reach zero or become explicit unmatched/manual rows.
- Catalog identity repair updates only the matched stock id.
- Manual CSV supports provider symbol, exchange/source symbol, ISIN/listing date where relevant, and business metadata where provider cannot fill it.
- Source fingerprint changes restart offsets safely with an operator warning.
- NSE/BSE duplicate-symbol/name collisions cannot update the wrong row.

### 5. Latest EOD, Session, And Holiday Accuracy

User value: The trusted universe stays current after it is repaired and does not falsely fail on holidays.

Acceptance criteria:

- MD-A1 catch-up behavior is proven with live/local data for missing completed EOD.
- `latestStoredEodDate`, `expectedLatestTradingDate`, `storedDataThroughDate`, and scheduler candle status agree.
- Weekend and holiday behavior is explicit; missing holiday calendars become visible uncertainty instead of silent false stale blockers.
- The system never fetches in-progress current-day candles for EOD review workflows.

### 6. Volume And Adjusted-Close Honesty

User value: Price-action evidence, return calculations, and smart-money signals are based on real OHLCV quality.

Acceptance criteria:

- Recent volume coverage is measured and exposed per trusted candidate.
- Missing/zero volume excludes rows from trusted review and appears in blocker counts.
- True adjusted-close coverage is distinguishable from close fallback.
- Close fallback remains allowed only as a documented warning, not as fake adjusted-close availability.

### 7. Downstream Proof From Trusted Membership

User value: Once Market Data is fixed, Today Review and Trade Plans show useful candidates because real trusted data exists, not because gates were relaxed.

Acceptance criteria:

- Today Review changes from `NO_REVIEW` only when Trusted Review Universe health supports it.
- Every Today Review candidate is inside the trusted membership snapshot.
- Data Quality ready counts increase only after Market Data rows exist and evaluations run.
- Trade Plans still classify missing/latest/history gaps as insufficient data.
- Signal Quality distinguishes missing price history, insufficient future rows, and not-yet-mature outcomes.

### 7.1 Immediate Business Metadata Remediation Plan For `IN / STOCK`

Current blocker split after the latest live evidence:

- `supportedBusinessMetadataRepairNeeded = 577`
- `businessMetadataAutoRepairable = 0`
- `businessMetadataManualRequired = 813`

This indicates the remaining business-metadata path is mostly manual-fallback:

- the supported queue has no durable free-provider repair candidates after repeated bounded provider repairs;
- the residual 813 rows are unresolved because at least one required field (`sector`, `industry`, or positive numeric `marketCap`) is still missing.

Remediation sequence (no paid providers):

1. **Finish the provider-business pass cleanly.**
   - Keep `PROVIDER_BUSINESS_METADATA_REPAIR` as the no-cost first lane.
   - Run bounded batches until `supportedBusinessMetadataRepairNeeded` is `0` or only manual-required rows remain.
   - Any non-progress loop on this lane must be treated as `PARTIAL` with explicit blocker evidence, not green status.

2. **Use free/free-operator sources for manual enrichment.**
   - Use official exchange catalog files as the identity+context anchor (NSE/BSE lists for symbol, ISIN, listing metadata where available).
   - Use Angel One scrip master only for deterministic identity matching (`providerSymbol`, exchange/series handling, token availability), not as a business-metadata authority.
   - For each unresolved row, fill `sector`, `industry`, and `marketCap` only when all three are present and market-cap is a valid positive number.

3. **Manual import as gate-safe fallback.**
   - Export unresolved rows from manual metadata template.
   - Drive bounded manual CSV imports with stable templates and provider symbols/exact exchanges.
   - Keep unresolved rows explicit in `manualBusinessMetadataRequired` until field completion is confirmed.

4. **Post-remediation proof requirements.**
   - Re-measure `repair-plan` and readiness after the manual pass:
     - `supportedBusinessMetadataRepairNeeded` should fall to `0`;
     - `businessMetadataManualRequired` should fall materially or be explained as still requiring operator curation;
     - `contextReady` should only improve from row-level metadata fill, and trust gates must still respect remaining blockers.

Remaining blockers for this lane:

- No currently documented free source is integrated as an authoritative sector/industry/market-cap provider beyond Yahoo business payloads.
- Exchange catalog feeds are inconsistent in business metadata coverage and should not be assumed complete for all rows.
- Manual curation remains required for rows where exchange/identity enrichment cannot produce all three required fields.

## 4. PO Rejections

The Product Owner rejects the following as unacceptable behavior:

- A button that can run for hours without progress, partial results, or safe cancellation/retry guidance.
- Treating catalog size, active-stock count, or provider-supported count as reviewable universe size.
- Marking a shallow recent sync as complete when the row still lacks 120/200/252 bars needed by downstream workflows.
- Skipping provider fetches when the latest completed EOD is missing, unless a real holiday/session blocker is shown.
- Fetching in-progress daily candles for EOD review workflows to make freshness look current.
- Relaxing Today Review, Strategy Decision, Signal Quality, or Trade Plan gates to hide missing Market Data.
- Reporting adjusted-close coverage when the stored value is only close fallback.
- Treating missing/zero volume as a minor display issue.
- Allowing NSE/BSE identity collisions or broad symbol upserts to update the wrong instrument.
- Requiring paid providers, paid hosted tools, broker APIs, live trading, or advice wording to solve this local-first market-data problem.

## 5. Required Live/Local Proof Before Market Data Is Healthy Enough For Cycle 3

Market Data is not healthy enough until live/local evidence proves:

- `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK` shows provider, price, stale, history, volume, and trusted-universe counts moving in the right direction.
- `GET /api/v1/market-data/universe/health?region=IN&assetType=STOCK` exposes strict signoff blockers, exact readiness dimensions, latest expected/stored EOD, and no hidden catalog-only universe claim.
- `GET /api/v1/market-data/review-universe?region=IN&assetType=STOCK` reaches at least non-zero trusted membership, and preferably `LIMITED_REVIEW` threshold.
- `GET /api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK` shows provider unknown, retry failed, catalog identity, business metadata, manual metadata, and price backfill queues before and after repair.
- A repair-run or batch evidence record shows bounded processing, queue decrease or explicit no-progress diagnosis, failures, zero-row provider returns, warnings, and remaining blockers.
- At least 20 sampled trusted instruments have current latest EOD, 120+ OHLCV bars, recent positive volume, and truthful adjusted-close/fallback status.
- A deeper sample has enough 200/252-bar coverage for Data Quality, Strategy Decision, Trade Plan setup, and SMA-style logic.
- The visible Sync Catalog and repair-workbench actions show progress and cannot lock the UI behind one unbounded request.
- Today Review remains fail-closed before trusted readiness and only publishes candidates from the trusted membership snapshot after readiness improves.
- Trade Plans and Signal Quality still expose insufficient-data/not-yet-mature states honestly where data remains missing.

## 6. Open Questions And Escalations For Architect / Orchestrator

1. Should MD-A2 formally retire or wrap the legacy `/market-data-foundation/stocks/sync-all` path behind the same bounded repair/job contract used by Market Data health repair?
2. Should the visible `Sync Catalog` button become a catalog import/identity/provider validation workflow instead of a whole-universe OHLCV sync?
3. Is the next accepted product milestone `trustedCount > 0`, `LIMITED_REVIEW >= 100`, or strict `universeSignoff.status=PASS`? PO recommendation: unlock `LIMITED_REVIEW` first, keep strict signoff as the operator gate.
4. Does Architect want deep backfill to default to 15 years, 3 years, or threshold-targeted bars for shallow supported rows?
5. Should `fullReload` be hidden from normal users and replaced with domain actions such as `Repair shallow history` and `Repair stale EOD`?
6. What local/free holiday source is acceptable for India, and should absence of a calendar block freshness signoff or only warn?
7. Can adjusted-close provenance be represented without a schema change, or is a small persistence change needed to distinguish true adjusted close from close fallback?
8. Should manual CSV cover identity repair and business metadata in one operator workflow, or remain split by ownership to avoid mixing deterministic identity with business context?
9. What is the maximum provider call budget per minute for local Yahoo usage, and should it be centrally enforced in Market Data service/worker rather than exposed through worker query params?
10. After MD-A2, should the next packet remain MD-A3 deep price backfill even if provider validation is still high? PO recommendation: yes, if a supported shallow subset exists; otherwise run provider drain first until enough supported rows exist to backfill.

## PO Priority Decision

Immediate next packet remains **MD-A2 - Sync Catalog Progress And Bulk Performance**.

Recommended next packet after MD-A2: **MD-A3 - Deep Price Backfill For Supported Shallow Rows**, unless MD-A2 live evidence shows there are too few provider-supported rows to backfill. In that case, pull provider validation drain first, then return to MD-A3.
