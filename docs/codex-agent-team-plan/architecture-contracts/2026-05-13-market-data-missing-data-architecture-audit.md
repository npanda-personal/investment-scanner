# Market Data Missing Data Architecture Audit - 2026-05-13

Mode: Architecture Planning Mode  
Owner: Solution Architect for Market Data Availability  
Scope audited: `backend/src/modules/market-data-foundation/**`, `frontend/src/features/market-data-foundation/**`, current MD-A work packets/contracts  
Write scope used: this document only

## 1. Architecture Verdict

Market Data Foundation is closer to a trustworthy local data source than the earlier root-cause notes describe: the current working tree has bounded catalog sync polling, completed-EOD catch-up gating, automatic deep price backfill for supported shallow rows, repair-run evidence, zero-row diagnostics, and adjusted-close null preservation for new provider rows.

Verdict: the module still cannot be considered reliable enough to maintain sufficient stock data before signals/decisions/trades consume it.

The remaining reliability gap is architectural, not just UI wording:

- Catalog-level freshness still uses a scope-level latest stored date and scope-level sync state. One current instrument can make the whole scope look current while many instruments remain missing or stale.
- Provider validation and Yahoo chart calls have no explicit timeout, retry budget, or error taxonomy. A slow/free provider can stall bounded workers and classify transient failures as hard blockers.
- The legacy `/stocks/sync-all` path remains exposed with high concurrency and synchronous full-universe behavior, bypassing the safer MD-A2 run coordinator if anything still calls it.
- Stock identity is still globally keyed by `Stock.symbol` and catalog upsert matching can match by `sourceSymbol` without exchange scoping, which can collapse NSE/BSE rows or store prices under the wrong canonical key.
- India holiday/session knowledge is empty, so latest-completed-EOD can be wrong around exchange holidays.
- Signoff, Trusted Review Lite, and universe `reviewReady` use different metadata semantics. This can leave downstream gates blocked even when price data is sufficient, or confuse operators about which data problem to repair first.

Architecture decision: continue to fix Market Data source availability before downstream modules. Do not relax downstream gates or add paid providers. The next architecture work should tighten per-instrument availability decisions, provider resilience, identity correctness, and validation evidence.

## 2. Ranked Technical Root Causes

### 1. Scope-Level Freshness Can Hide Per-Instrument Missing EOD

Risk: critical. A scope can skip provider work because any row has the latest completed EOD, while many supported rows remain stale or missing.

Affected files/functions:

- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
  - `latestStoredTradingDateForRegion`
  - `getSyncState`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `evaluateSyncFreshnessGate`
  - `syncScheduledRegion`
  - `processCatalogSyncRun`
  - `syncAll`
  - `universeHealth`
  - `repairPlan`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
  - scheduler status freshness fields

Root cause:

`latestStoredTradingDateForRegion` returns the maximum stored price date across the scoped catalog. `evaluateSyncFreshnessGate` treats that maximum plus catalog sync state as enough to skip scope-level provider work when the current session cannot produce a useful new candle or cooldown applies. This proves at least one row is current, not that each eligible supported row is current.

Required amendment:

Freshness gates must distinguish scope max freshness from queue freshness. A catalog/scheduled run may skip only when the eligible candidate distribution proves no supported/unknown active row is missing the latest completed EOD within the bounded run's responsibility. At minimum, expose and test `candidateLatestCompletedMissingCount`.

### 2. Provider Calls Lack Timeout, Retry Budget, And Slow-Call Diagnostics

Risk: critical. Bounded batches can still hang on a slow chart call, and transient Yahoo failures can become `VALIDATION_FAILED` without enough retry classification.

Affected files/functions:

- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
  - `fetchHistorical`
  - `validateProviderSymbol`
  - `fetchCompanyMasterData`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `validateProviders`
  - `backfillPrices`
  - `repairProviderBusinessMetadata`
  - `processCatalogSyncWorkerChunk`
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
  - repair result rendering
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
  - catalog sync progress rendering

Root cause:

Catalog CSV downloads are timeout and size limited, but Yahoo chart/profile calls are not wrapped with an explicit timeout, latency recording, or retry classification. Free provider slowness is expected, so the architecture needs bounded waiting and machine-readable slow-call evidence.

Required amendment:

Every provider-facing operation must have a local timeout, a retryable/non-retryable classification, and batch-level latency counters such as `providerCalls`, `providerTimeouts`, `providerRetryableFailures`, `slowProviderCalls`, `maxProviderCallMs`, and `p95ProviderCallMs` where practical.

### 3. Legacy Full-Universe Sync Path Remains Unsafe

Risk: high. A compatibility endpoint can still start synchronous provider work for all active stocks and allow high effective concurrency.

Affected files/functions:

- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
  - `syncAllStocks`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `syncAll`
- `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
  - `StockSyncWorker.processTask`
  - `StockSyncWorker.processTasks`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
  - `syncAllStocks`

Root cause:

MD-A2 added a safer sync-run coordinator, but `/stocks/sync-all` still selects the full eligible task set, holds the HTTP request open, permits up to `10 * 10` effective provider concurrency at the controller, and the worker path does not preserve `region`, `assetType`, or completed-EOD provider end date.

Required amendment:

The compatibility path must be made non-default and bounded. Either return `410/400` with guidance to use sync runs for UI/local operations, or internally redirect to a bounded sync run when `async=true`. Do not leave a full-universe synchronous provider path as an easy operator action.

### 4. Scheduled Bootstrap Can Still Create Shallow Rows

Risk: high. Scheduler-first rows can be marked loaded with only a recent lookback, then rely on later repair to become useful.

Affected files/functions:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `syncScheduledRegion`
  - `ingestSymbol`
  - `defaultBackfillStartDate`
  - `updateStockLoadTimestampBySymbol` call site
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
  - `updateStockLoadTimestampBySymbol`
  - `listActiveStockSyncTasks`

Root cause:

`syncScheduledRegion` supplies a short explicit `startDate`; `ingestSymbol` therefore cannot use the first-load 15-year default. The timestamp is then marked loaded using wall-clock time after any non-zero fetch. MD-A3 backfill can repair this, but the scheduler can still manufacture shallow data before repair drains.

Required amendment:

Scheduled sync must not mark a never-loaded stock as sufficiently loaded after a shallow bootstrap. Either use deep first-load bootstrap for never-loaded supported rows, or persist/derive a separate `priceDepthReady` signal so incremental timestamps do not imply useful history.

### 5. Provider Validation Can Produce False Blockers

Risk: high. Valid instruments can stay `UNKNOWN`, `VALIDATION_FAILED`, or `UNSUPPORTED` due to recent 10-day windows, holidays, stale symbols, provider outages, or suspended/illiquid names.

Affected files/functions:

- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
  - `validateProviderSymbol`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `validateProviders`
  - `repairRun`
  - `repairPlan`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
  - `listStocksForProviderValidation`
  - `updateProviderSupportStatus`

Root cause:

Validation uses a recent chart window and mostly returns supported/no-candles/failed. It does not expose enough evidence about requested symbol, suffix, call duration, quote count, empty provider response reason, timeout, or retry date. Clean unsupported rows should remain blocked, but transient failures need a retry lane with evidence.

Required amendment:

MD-A4 must persist or expose enough validation evidence to separate `UNSUPPORTED`, `VALIDATION_FAILED_RETRYABLE`, and `VALIDATION_FAILED_MANUAL_SYMBOL_REPAIR`. Validation should use a completed-EOD-safe window wider than 10 calendar days for local Indian equities unless provider safety forces otherwise.

### 6. Global Symbol Identity Can Collapse Exchange-Specific Rows

Risk: high for BSE/NSE breadth and correctness. Wrong identity can produce missing, stale, or wrong-exchange prices that look valid.

Affected files/functions:

- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
  - `upsertCatalogInstrument`
  - `catalogUpdateData`
  - `updateProviderSupportStatus`
  - `storeHistorical`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `normalizeCatalogSymbol`
  - `providerSymbolForExchange`
  - `importCatalog`
  - `repairCatalogIdentity`
  - `ingestSymbol`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
  - `inferRegion`

Root cause:

`Stock.symbol` and `PriceTick.symbol + timestamp` are global. Catalog import matching includes `sourceSymbol` without requiring exchange/source identity. A BSE row with the same base source symbol as an NSE row can update the existing row instead of creating an exchange-specific instrument. Legacy/manual base symbols can also store prices under symbols that provider region inference treats as US.

Required amendment:

MD-A5 must harden catalog identity before broad BSE/F&O repair. Matching must be scoped by exchange/provider symbol/catalog source, and any future schema migration must move toward `instrumentId` or `symbol + exchange` price identity. Without a migration, manual/catalog imports must at least refuse ambiguous cross-exchange updates and surface them as manual-required.

### 7. Holiday Calendar Absence Causes False Stale Or False Catch-Up

Risk: medium-high around exchange holidays.

Affected files/functions:

- `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
  - `DEFAULT_MARKET_SESSION_CONFIGS`
  - `latestCompletedTradingDateForRegion`
  - `shouldRunMarketDataSync`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
  - `buildCandleSyncStatus`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `trustedReviewDatePolicy`
  - `universeReadinessAndStatsForStocks`

Root cause:

Holiday arrays are empty. The system can require an EOD candle for a non-trading holiday or declare catch-up needed when the provider correctly has no row.

Required amendment:

MD-A6 must add a free/local holiday calendar path. A static local checked-in calendar or operator CSV is acceptable. If no calendar exists for a region/date, health must surface `MARKET_CALENDAR_UNCERTAIN` instead of silently treating every weekday as a trading day.

### 8. Repair-Run No-Progress Logic Is Too Coarse For Deep Price Work

Risk: medium-high for bulk repair completion.

Affected files/functions:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `repairRun`
  - `executeRepairRunAction`
  - `executeRepairRunBatch`
  - `backfillPrices`
  - `assignPriceBackfillDepthDiagnostics`

Root cause:

Drain mode can stop when the queue count does not decrease after a batch. For price repair, a batch may insert/update many rows yet leave the same symbols in the queue because they are still under 252 bars, missing volume, or waiting for a provider limitation. Queue count alone is not enough to classify no-progress.

Required amendment:

For `BACKFILL_PRICES`, no-progress detection must use row-level evidence: inserted/updated/no-op rows, zero-row provider returns, failures, and per-depth counts. Stop as blocked only when there is no data movement and the same candidates remain.

### 9. Trust Semantics Are Split Between Price Readiness, Trusted Lite, And Full Signoff

Risk: medium. It can confuse operators and keep downstream gates blocked for context gaps after price data is sufficient.

Affected files/functions:

- `backend/src/modules/market-data-foundation/market-data-foundation.universe.ts`
  - `classifyInstrumentUniverseReadiness`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `universeHealth`
  - `trustedReviewUniverseEvaluation`
  - `universeSignoffFromHealth`
  - `universeSignoffFromRepairPlan`
  - `reviewReadinessSummary`
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`

Root cause:

Trusted Review Lite treats missing sector/industry/market cap/ISIN/listing date as context gaps after price data is sufficient. Universe `reviewReady` and full signoff require metadata completeness. This is defensible, but contracts must make it explicit which gate downstream workflows consume and which repair lane blocks full signoff only.

Required amendment:

MD-A5/MD-A7 must clarify three separate states: `PRICE_TRUSTED_FOR_LITE`, `CONTEXT_READY`, and `FULL_SIGNOFF_READY`. Downstream consumers must continue to use the intended trusted-membership API, not raw catalog or universe `reviewReady` counts.

### 10. Adjusted-Close Provenance Is Improved For New Rows But Legacy Rows Remain Ambiguous

Risk: medium for trust and backtest quality.

Affected files/functions:

- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
  - `fetchHistorical`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
  - `storeHistorical`
  - `priceReadinessStatsForSymbols`
  - `priceQualityStats`
- `backend/src/modules/market-data-foundation/market-data-foundation.universe.ts`
  - adjusted-close fallback warning rules

Root cause:

Current provider mapping stores `adjustedClose=null` when absent, which is correct for new rows. Older rows that copied `close` into `adjustedClose` cannot be distinguished without migration or a deliberate scrub/reload policy.

Required amendment:

MD-A7 must define a no-schema fallback: expose legacy ambiguity warnings and allow deep reload/scrub for selected symbols. If a future schema is approved, persist adjusted-close provenance explicitly.

## 3. Contract Amendments Needed

### MD-A1 - Latest Completed EOD Catch-Up Gate

Amendment:

- Keep completed-EOD catch-up, but change the proof target from `latestStoredTradingDateForRegion >= latestCompletedTradingDate` to per-eligible-row freshness distribution.
- Add repository/service evidence fields:
  - `candidateLatestCompletedMissingCount`
  - `supportedLatestCompletedMissingCount`
  - `unknownLatestCompletedMissingCount`
  - `latestStoredEodDateMax`
  - `latestStoredEodDateMinForEligible`
- Tests must prove a catalog/scheduled run does not skip when one symbol is current and another supported symbol is missing latest completed EOD.

### MD-A2 - Sync Catalog Progress And Bulk Performance

Amendment:

- Deprecate or bound `/stocks/sync-all`; frontend already uses sync runs, but compatibility must not remain an unsafe provider loop.
- Worker calls must preserve `region`, `assetType`, and completed-EOD `providerEndDate`.
- Add slow-provider metrics and timeout counts to run status.
- Validation must include a start request returning under 2 seconds and no provider work in the start HTTP request.
- Manual validation must show no request uses effective provider concurrency above the configured run cap.

### MD-A3 - Deep Price Backfill For Supported Shallow Rows

Amendment:

- Keep the existing `BACKFILL_PRICES` lane as canonical.
- Add no-progress logic based on price rows inserted/updated/no-op and zero-row counts, not only queue count.
- Add scheduler bootstrap rule: never-loaded supported rows must use deep first-load history or remain marked shallow until backfill completes.
- Add provider timeout/slow-call metrics to price-backfill summary.
- Add evidence for per-symbol start mode: `DEEP`, `INCREMENTAL`, `ZERO_ROWS`, `TIMEOUT`, `FAILED_RETRYABLE`.

### MD-A4 - Provider Validation Drain And Retry Classification

Amendment:

- Widen validation evidence beyond a 10-day chart count.
- Introduce retry taxonomy in the API summary, even if durable schema changes are deferred:
  - `supported`
  - `unsupportedNoProviderSymbol`
  - `unsupportedNoCandlesAfterWideWindow`
  - `retryableTimeout`
  - `retryableProviderError`
  - `manualSymbolRepairRequired`
- Validation must cap per-call latency and continue the batch after per-symbol failures.

### MD-A5 - Catalog Identity And Manual CSV Repair Hardening

Amendment:

- Require exchange-aware matching for NSE/BSE rows. Do not match by `sourceSymbol` alone across exchange/catalog sources.
- Surface ambiguous cross-exchange matches as manual-required instead of updating an existing row.
- Manual CSV import must include provider symbol, exchange, source symbol, and optional ISIN/listing date where available.
- Add an identity collision report before broad BSE/F&O import.

### MD-A6 - Holiday/Session Accuracy

Amendment:

- Add free/local India holiday source support.
- Health and scheduler status must expose holiday calendar version/source and uncertainty.
- Tests must cover an Indian exchange holiday where no EOD candle should be required.

### MD-A7 - Adjusted-Close And Volume Coverage Honesty

Amendment:

- Preserve the current new-row `adjustedClose=null` behavior when the provider omits adjustment.
- Add legacy ambiguity warning counts.
- Do not treat adjusted-close fallback as full adjusted coverage.
- Validate volume coverage over the same rolling window used for trusted membership.

### Additional Packet Recommended: MD-A8 - Provider Resilience And Observability

Reason:

Timeouts, retry budgets, latency histograms, and slow-call UI/API evidence cut across MD-A2, MD-A3, and MD-A4. If not folded into those packets with one backend owner, create MD-A8 with single-writer control of provider/service diagnostics.

## 4. Proposed Implementation Sequence And Single-Writer Scopes

Sequence is designed to avoid multiple agents writing the same hot files at once.

1. Lane MD-A1B: Per-instrument freshness gate
   - Single writer: backend architect/developer for freshness.
   - Write scope:
     - `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
     - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
     - scheduler/session focused tests
   - Output: catalog/scheduled skip decisions cannot hide stale supported candidates.

2. Lane MD-A8/MD-A4B: Provider timeout and retry taxonomy
   - Single writer: backend provider owner.
   - Write scope:
     - `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
     - provider/service types as needed
     - provider validation tests
   - Output: provider calls are bounded, classified, and measured.

3. Lane MD-A3B: Deep price repair completion semantics
   - Single writer: backend price-backfill owner.
   - Write scope:
     - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
     - `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
     - backend price-backfill tests
   - Coordination: starts after Lane 1 or works from an agreed service patch boundary.
   - Output: row-level no-progress detection, scheduler shallow-bootstrap prevention, price diagnostics.

4. Lane MD-A2B: Legacy sync-all containment
   - Single writer: backend catalog-sync owner.
   - Write scope:
     - `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
     - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
     - `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
     - sync-run tests
   - Output: no operator path can start unbounded synchronous full-universe provider work.

5. Lane MD-A5B: Exchange-aware identity and manual CSV hardening
   - Single writer: backend catalog identity owner.
   - Write scope:
     - `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
     - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
     - catalog import/identity tests
   - Output: NSE/BSE collisions are blocked or repaired with explicit evidence.

6. Lane MD-A6B: Local holiday calendar
   - Single writer: session/calendar owner.
   - Write scope:
     - `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
     - optional local calendar data under the module if approved
     - session/scheduler tests
   - Output: latest-completed-EOD honors free/local holiday data.

7. Lane MD-A7B: Adjusted-close and volume honesty
   - Single writer: price-quality owner.
   - Write scope:
     - `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
     - `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
     - `backend/src/modules/market-data-foundation/market-data-foundation.universe.ts`
     - focused tests
   - Output: adjusted-close fallback and volume coverage are truthful for trusted membership.

8. Lane MD-FE-Evidence: UI/API evidence rendering
   - Single writer: frontend market-data owner after backend fields stabilize.
   - Write scope:
     - `frontend/src/features/market-data-foundation/types.ts`
     - `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
     - `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
     - `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
     - UI tests
   - Output: slow calls, retry categories, stale distributions, and repair results are visible without false green states.

## 5. Validation Requirements Per Issue

### Scope-Level Freshness

- Unit test: one supported symbol has latest completed EOD, another supported symbol is missing it. Catalog/scheduled sync must not skip.
- API evidence: scheduler status or repair plan exposes stale/missing distribution, not only max latest date.
- Regression: final-confirmed skip still applies only when all eligible rows for that scope are current or no eligible repair remains.

### Provider Timeout And Slow Calls

- Provider tests must simulate:
  - timeout,
  - thrown provider error,
  - zero-row response,
  - slow success above threshold,
  - normal success.
- Batch tests must prove per-symbol timeout does not fail the whole batch.
- Performance evidence:
  - record max provider call duration,
  - record timeout count,
  - record slow-call count,
  - direct start endpoints return quickly,
  - bounded batch wall time is no greater than `batchSize * timeout + throttle overhead` under worst-case mocked timeout.

### Legacy Sync-All Containment

- API test proves UI path never posts to `/stocks/sync-all`.
- Backend test proves `/stocks/sync-all` cannot start an unbounded full-universe provider run without an explicit compatibility flag, or returns a bounded run response.
- Performance test proves no route allows effective provider concurrency above the architecture cap.

### Scheduler Shallow Bootstrap

- Test a never-loaded supported row selected by scheduler.
- Expected result: first load uses deep start date or row remains visibly shallow/not-depth-ready until `BACKFILL_PRICES` repairs it.
- Regression: normal already-depth-ready rows still use incremental overlap.

### Provider Validation Classification

- Tests for `UNKNOWN_FIRST` and `RETRY_FAILED` queues remain.
- New tests assert timeout and transient provider errors become retryable, not permanent unsupported.
- Zero-candle unsupported classification requires a sufficiently wide completed-EOD-safe window and evidence in response warnings/counts.

### Identity Collision

- Import NSE and BSE rows sharing `sourceSymbol`.
- Expected result: two exchange-specific rows if canonical symbols differ, or an explicit ambiguous/manual-required result. No silent update of the wrong row.
- Test legacy base-symbol ingestion stores and reports region/exchange consistently.

### Holiday Calendar

- Test an India holiday on a weekday.
- Expected result: latest completed trading date resolves to the prior trading day; no false stale blocker for the holiday date.
- Test missing calendar source reports uncertainty when the date is configured as requiring calendar proof.

### Repair-Run Bulk Bounds

- Tests must assert:
  - price repair batch size hard max remains 100 or lower,
  - catalog sync batch size and concurrency caps remain enforced,
  - `BACKFILL_PRICES` in drain mode continues when rows inserted/updated but queue count is unchanged,
  - drain stops when there are only zero-row/failure/skipped results and same candidates remain.

### Trust Semantics

- API tests must prove:
  - `trustedCount` can include price-ready names with metadata context gaps,
  - `universeSignoff.downstreamAllowed` remains false until full signoff criteria pass,
  - UI text does not call a context-gap-only state "missing price data."

## 6. Risks, Rollback Notes, And No-Paid-Service Constraints

Risks:

- Free Yahoo endpoints can throttle, change response shapes, or be unavailable. The system must degrade through retryable failures and partial repair evidence.
- Tight timeouts can increase retryable failures on slow networks. Keep the timeout configurable with a conservative local default.
- Exchange-aware identity hardening may reveal duplicate/ambiguous catalog rows that require manual repair.
- Holiday calendar changes can alter expected EOD dates and temporarily reduce trusted counts until data is reconciled.
- Deprecating `/stocks/sync-all` can affect ad hoc local scripts. Provide a bounded compatibility route or clear error message.

Rollback notes:

- Provider timeout/taxonomy changes should be reversible by configuration to longer timeouts and by keeping old status values mapped for compatibility.
- Sync-all containment can preserve the route while forcing bounded run behavior, avoiding frontend rollback.
- Identity hardening should prefer refusing ambiguous updates over destructive merge/split operations. Do not delete or rewrite existing prices in the first pass.
- Holiday calendar should be additive and versioned. If a calendar file is wrong, disabling it should fall back to `MARKET_CALENDAR_UNCERTAIN`, not blind trust.
- Adjusted-close legacy ambiguity should be reported before any scrub/reload operation.

No-paid-service constraints:

- No paid market data providers, paid exchange master products, broker APIs, hosted queues, paid retry services, paid observability tools, or paid UI/chart libraries.
- Allowed inputs:
  - existing Yahoo integration through current open-source package,
  - public/free exchange CSV or JSON endpoints,
  - checked-in local/static holiday data,
  - operator-curated local CSV files,
  - local in-process workers/status only.
- Downstream modules must not create fallback eligibility when Market Data says data is missing, stale, shallow, unsupported, or untrustworthy.

## Final Architecture Position

The priority remains source-data availability before signals and decisions. The highest-risk gaps to close next are per-instrument freshness gating, bounded/observable provider calls, legacy full-universe sync containment, and exchange-safe identity. MD-A3 is directionally correct but must be paired with provider timeouts and row-level repair-progress semantics, otherwise a bounded repair lane can still stall or stop before data becomes sufficient.
