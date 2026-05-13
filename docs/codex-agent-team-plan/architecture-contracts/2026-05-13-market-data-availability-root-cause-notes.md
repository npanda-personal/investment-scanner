# Market Data Availability Root-Cause Notes - 2026-05-13

## 1. Architecture Summary Of Market Data Pipeline And Trust Gates

Market Data Foundation is the source of truth for the local `IN / STOCK` universe. The intended pipeline is:

1. Catalog import creates scoped instruments with region, asset type, exchange, provider symbol, source symbol, ISIN/listing-date where available, and `providerSupportStatus`.
2. Provider validation classifies active catalog rows as `SUPPORTED`, `UNSUPPORTED`, `VALIDATION_FAILED`, or still `UNKNOWN`.
3. Catalog identity repair fills deterministic exchange/provider/ISIN/listing-date fields from stable catalog sources or manual CSV.
4. Provider business metadata repair fills sector, industry, and market cap when Yahoo can provide them; manual CSV is the fallback.
5. Price ingestion/backfill stores daily OHLCV in `PriceTick` and latest price snapshots, with provider throttling and bounded repair batches.
6. Universe health classifies every scoped row into explicit states and readiness dimensions.
7. Trusted Review Universe selects only active supported `IN / STOCK` rows with current latest EOD, at least 120 OHLCV bars, recent volume, adjusted-close coverage or close fallback warning, and no critical corporate-action blocker.
8. Downstream modules consume Market Data public APIs and snapshots. They must not create workaround eligibility when Market Data source data is missing or stale.

Current trust gates from the docs:

- Full Catalog Health is strict operator signoff. It can fail while a smaller trusted subset is usable.
- Trusted Review Universe is the only Today Review eligibility input. `FULL_REVIEW`, `LIMITED_REVIEW`, and `NO_REVIEW` are determined by trusted membership counts and data-through dates.
- `PRICE_READY` requires latest stored EOD at or after the expected latest completed trading date, rolling-window coverage, acceptable gaps, volume coverage, and adjusted-close/fallback status.
- Missing sector, industry, market cap, ISIN, or listing date is a context gap for Today Review Lite, not a price-action blocker.
- Repair runs must be explicit, bounded, dependency ordered, snapshot before/after state, and expose remaining blockers.

Recent Cycle 2 live evidence showed `reviewMode=NO_REVIEW`, `trustedCount=0`, `reviewReady=0`, and top blocker `PROVIDER_VALIDATION`. That proves messaging/gating is present, but actual usable market data is not yet present.

## 2. Root-Cause Candidates, Ranked By Likelihood And Blast Radius

1. Latest completed candle is missing, but freshness/session gating can still skip provider fetches because the current session has no useful new daily candle.
   - Observed failure mode from Orchestrator: latest completed EOD is missing, yet `evaluateSyncFreshnessGate` maps `BEFORE_MARKET_OPEN`, default `MARKET_OPEN`, or `MARKET_CLOSED_NO_SYNC` into skip reasons and returns `shouldSkip=true`.
   - Mechanism: `shouldRunMarketDataSync` answers whether the current session's daily candle is useful to fetch. Before open or during market hours with in-progress candles disabled, it correctly says no. But if `latestStoredTradingDate < latestCompletedTradingDateForRegion`, the system still needs a catch-up fetch capped to the latest completed trading date. The current gate can conflate "do not fetch today's in-progress candle" with "do not fetch any missing completed EOD."
   - Existing scheduler tests show status can flag `MISSING_LATEST_COMPLETED`, but run decisions can still skip when the current session is not useful.
   - Blast radius: full. A stale/missing prior completed candle keeps Trusted Review Universe at `NO_REVIEW`, while scheduled repair never reaches the provider.

2. Provider validation is not drained, so price repair never reaches most catalog rows.
   - Evidence: Cycle 2 live evidence reported top blocker `PROVIDER_VALIDATION` with zero trusted rows.
   - Mechanism: `repairPlan` and `priceBackfillCandidates` count/backfill only provider-supported rows. `UNKNOWN` rows must pass `validateProviders` before price backfill can improve availability.
   - Blast radius: full. Signals, Strategy Decision, Today Review, and Trade Plans cannot get enough trusted instruments.

3. Scheduled bootstrap sync can create shallow history, then later incremental backfill may not deepen it.
   - `syncScheduledRegion` passes an explicit recent `startDate` based on `lookbackTradingDays`, defaulting to roughly the last week, into `ingestSymbol`.
   - Because a start date is supplied, `ingestSymbol` does not use its 15-year first-load default for new rows.
   - Once rows are stored, `updateStockLoadTimestampBySymbol` marks the stock as loaded. Later non-full reloads use `lastSuccessfulDataLoadTimestamp - 3 days`, so shallow rows remain shallow unless `fullReload` or a deep-backfill rule is used.
   - Blast radius: high. Rows can have recent candles and provider support but still fail 120/252-bar trusted/readiness thresholds.

4. Price backfill candidate execution is dependency-correct but insufficient for shallow loaded rows.
   - `backfillPrices` selects supported rows whose price readiness is not ready, but calls `ingestSymbol` without a deep start date unless `request.fullReload` is true.
   - For rows with `lastSuccessfulDataLoadTimestamp` but fewer than 120/252 bars, this likely fetches only a short overlap and cannot repair history depth.
   - Blast radius: high for any dataset previously touched by scheduler or partial manual sync.

5. Free provider validation can produce retry/unsupported states that need bounded retry/manual diagnosis.
   - Yahoo chart validation uses a recent 10-day window. Provider outages, symbol suffix issues, holidays, suspensions, or Yahoo coverage gaps can create `VALIDATION_FAILED` or `UNSUPPORTED`.
   - Clean unsupported rows should stay excluded, but transient failures need retry, not downstream fallback.
   - Blast radius: high if many valid NSE/BSE symbols stay `UNKNOWN` or `VALIDATION_FAILED`.

6. Catalog/provider-symbol coverage is incomplete for BSE, F&O underlyings, and broker/public scrip masters.
   - NSE equity has a default public URL. BSE equity and NSE F&O underlyings have no stable default URL and require env URL or manual CSV.
   - Yahoo is not an exchange master catalog, so catalog import plus provider validation is mandatory.
   - Blast radius: medium to high depending on whether the desired review universe is NSE-only or broader `IN / STOCK`.

7. Market-session and latest-completed-EOD logic has no holiday calendar data.
   - `DEFAULT_MARKET_SESSION_CONFIGS` has empty holiday arrays.
   - `latestCompletedTradingDateForRegion` may require data for an exchange holiday as if it were a trading day, causing false stale EOD blockers.
   - Blast radius: medium. It can suppress otherwise valid data around holidays.

8. Adjusted-close coverage is not reliably distinguishable from close fallback.
   - Yahoo fetch maps `adjustedClose` to `close` when adjusted close is absent.
   - Readiness then sees non-null adjusted close and may not expose fallback coverage accurately.
   - Blast radius: medium for data quality/trust, lower for raw data availability.

9. Global `Stock.symbol` and `PriceTick.symbol + timestamp` identity can collapse exchange-specific rows.
   - Architecture already documents `Stock.symbol` global uniqueness as a limitation.
   - NSE/BSE duplicate symbols or broad symbol upsert matching can store one price stream under a symbol that downstream treats as a scoped instrument.
   - Blast radius: medium. It may cause duplicates, missing BSE coverage, or wrong-exchange prices.

10. Latest stored data-through dates can hide per-instrument gaps if QA only checks max date.
   - Health exposes max latest dates, but actual trusted membership is per instrument.
   - QA must verify distributions and trusted membership pages, not just `latestStoredEodDate`.
   - Blast radius: medium if validation relies on a single max date.

11. Downstream windows are larger than the minimal trusted threshold.
   - Signal Generation can request up to 5000 bars.
   - Signal Quality requests up to 6000 bars and requires future rows after signal generation dates.
   - Strategy Decision uses 500 bars; Trade Plans use 200 bars; Data Quality uses 200/252 thresholds.
   - Blast radius: medium. A 120-bar Trusted Review Lite universe can run Today Review Lite but still leave deeper quality/calibration/backtest evidence limited.

## 3. Files, Functions, And APIs To Inspect Or Modify Later

Market Data source files:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `validateProviders`
  - `backfillPrices`
  - `priceBackfillCandidates`
  - `syncScheduledRegion`
  - `ingestSymbol`
  - `universeHealth`
  - `trustedReviewUniverseHealth`
  - `trustedReviewUniverseEvaluation`
  - `listTrustedReviewUniverseInstruments`
  - `universeReadinessAndStatsForStocks`
  - `repairProviderSupportFromStoredPrices`
  - `defaultBackfillStartDate`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
  - `listActiveStockSyncTasks`
  - `listStocksForProviderValidation`
  - `priceReadinessStatsForSymbols`
  - `priceHistoryForSymbols`
  - `storeHistorical`
  - `listPrices`
  - `latestStoredTradingDateForRegion`
  - `updateStockLoadTimestampBySymbol`
  - `updateProviderSupportStatus`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
  - `fetchHistorical`
  - `validateProviderSymbol`
  - `fetchCompanyMasterData`
- `backend/src/modules/market-data-foundation/market-data-foundation.universe.ts`
  - `classifyInstrumentUniverseReadiness`
  - `STANDARD_REVIEW_MIN_BARS`
  - volume, gap, adjusted-close, and freshness blockers
- `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
  - `shouldRunMarketDataSync`
  - `latestCompletedTradingDateForRegion`
  - holiday/session config
- `backend/src/modules/market-data-foundation/market-data-foundation.catalog-sources.ts`
  - default NSE catalog support
  - BSE/F&O manual CSV/env URL limitations

Market Data APIs:

- `GET /api/v1/market-data/review-readiness-summary`
- `GET /api/v1/market-data/universe/health`
- `GET /api/v1/market-data/review-universe`
- `GET /api/v1/market-data/review-universe/instruments`
- `GET /api/v1/market-data/universe/repair-plan`
- `POST /api/v1/market-data/universe/repair-run`
- `POST /api/v1/market-data/providers/validate`
- `POST /api/v1/market-data/prices/backfill`
- `GET /api/v1/market-data/scheduler/status`

Downstream consumers to keep read-only until source data is fixed:

- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
  - `evaluateInstrument` requires latest price, 50/200 rows, volume, and metadata for stronger readiness.
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
  - `generateForInstrument` requests 5000 bars.
  - enrichment requests 2 and 500 bars.
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
  - `prices` requests 6000 bars.
  - `forwardOutcome` requires future price rows for each horizon.
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
  - consumes Signal Quality horizon availability and should stay conservative with zero samples.
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
  - `buildDecisionContext` requests 500 bars and latest derived price.
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
  - `loadRunSources`
  - `loadTrustedInstrumentsForReview`
  - trusted-universe membership fail-closed behavior.
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
  - `generate` uses latest price and 200 bars.

## 4. Data Repair Strategy Options With Local/Free Constraints

Option A: Latest-completed-EOD catch-up repair.

- When `latestStoredTradingDate < latestCompletedTradingDateForRegion`, allow a bounded provider fetch capped to the missing latest completed trading date even if the current session is before open, market-open with in-progress candles disabled, or otherwise has no useful new daily candle.
- This must not fetch today's in-progress candle for EOD review workflows.
- The skip reason should distinguish "current session candle not useful" from "completed EOD catch-up needed."

Option B: Dependency-ordered bounded repair using current APIs.

- Run provider validation for `UNKNOWN_FIRST` in small batches until that queue drains.
- Then run retry-failed validation in bounded batches.
- Then run catalog identity repair from configured NSE catalog or manual CSV.
- Then run price backfill for provider-supported rows.
- Then run provider business metadata repair/manual CSV only for full-catalog signoff, not as a blocker for Trusted Review Lite.
- This is safest operationally, but it will not fully solve shallow history unless price backfill uses a deep start date for rows below the required bar threshold.

Option C: Deep price repair for supported shallow rows.

- For supported active `IN / STOCK` rows with latest EOD but fewer than 120/252 bars, bypass incremental `lastSuccessfulDataLoadTimestamp` and fetch from a bounded deep start date.
- Use the existing 15-year default or a smaller explicit floor such as 3 years if provider throttling becomes painful.
- Keep batch size and throttling strict; record rows received, inserted, updated, no-op, zero-row, and next action.
- This addresses the likely scheduler/shallow-history trap.

Option D: Manual catalog and metadata CSV fallback.

- Use public NSE equity CSV by default where available.
- Use manual CSV for BSE equity, F&O underlyings, broker/public scrip master, ISIN/listing date, and business metadata gaps where no stable free URL exists.
- Manual CSV must remain bounded, fingerprinted, resumable, and auditable.
- This is required because no paid providers, exchange master products, or hosted data services are allowed.

Option E: Bounded provider retry and manual unsupported diagnosis.

- Retry `VALIDATION_FAILED` separately after `UNKNOWN` drains.
- For repeated failures, keep rows blocked and visible rather than marking them trusted.
- Valid Yahoo suffix fixes can be handled by catalog identity repair or manual CSV.
- Clean Yahoo-unsupported rows stay excluded from price blockers.

Option F: Session/EOD correction.

- Keep in-progress candles out of EOD review workflows.
- Add or ingest a free/local holiday calendar for India, or expose holiday uncertainty as a blocker when no calendar is configured.
- This prevents false stale EOD on market holidays without weakening the freshness rule.

## 5. Proposed Implementation Packets, Sequencing, And Shared-File Risks

Packet 1: Latest-completed-EOD catch-up gate.

- Goal: stop skipping provider fetches when the latest completed candle is missing but the current session has no useful new daily candle.
- Write scope: `backend/src/modules/market-data-foundation/*` and `backend/tests/modules/market-data-foundation/*`.
- Likely changes:
  - In `evaluateSyncFreshnessGate` or the scheduler decision path, compare `latestStoredTradingDateForRegion` with `latestCompletedTradingDateForRegion`.
  - If latest completed EOD is missing, allow a bounded catch-up fetch through latest completed trading date.
  - Preserve skips for confirmed final candle, cooldown where appropriate, weekends/holidays without a missing completed candle, and in-progress current-day candles.
  - Add tests for before-open and market-open cases where current session is not useful but the previous completed EOD is missing.
- Shared-file risk: low if contained to Market Data service/session tests.

Packet 2: Market Data deep availability repair.

- Goal: make supported shallow rows acquire enough current OHLCV for Trusted Review Lite and downstream 200/252-bar users.
- Write scope: `backend/src/modules/market-data-foundation/*` and `backend/tests/modules/market-data-foundation/*`.
- Likely changes:
  - Make scheduler first-load behavior use deep bootstrap history for never-loaded instruments, or avoid setting `lastSuccessfulDataLoadTimestamp` as if shallow data is complete.
  - Make price backfill detect shallow history and force a deep start date even when `lastSuccessfulDataLoadTimestamp` exists.
  - Preserve EOD cap at latest completed trading date.
  - Preserve bounded batch size, provider throttle, and idempotent upserts.
- Shared-file risk: none if no schema/package edits are needed.

Packet 3: Provider validation and catalog-symbol diagnosis.

- Goal: drain valid `UNKNOWN` rows into `SUPPORTED` without misclassifying transient provider errors as permanent unsupported.
- Write scope: `backend/src/modules/market-data-foundation/*` and focused tests.
- Likely changes:
  - Improve validation evidence for provider symbol used, suffix tried, returned candle count, and retry classification.
  - Keep Yahoo failures retryable when they look like transient network/provider errors.
  - Add bounded alternate `.NS`/`.BO` diagnosis only when catalog exchange supports it and without broad symbol guessing.
- Shared-file risk: avoid schema unless durable per-symbol diagnosis fields are insufficient.

Packet 4: Catalog/manual CSV repair hardening.

- Goal: improve deterministic provider symbol, ISIN, listing-date, and BSE/F&O catalog availability using only public/local CSV inputs.
- Write scope: `market-data-foundation` only plus tests.
- Likely changes:
  - Validate manual CSV examples and import summaries for BSE/F&O/provider symbol suffixes.
  - Keep source fingerprint restart behavior.
  - Ensure NSE/BSE duplicate names do not update the wrong stock.
- Shared-file risk: none unless UI file reservation is separately assigned.

Packet 5: EOD/session and holiday accuracy.

- Goal: prevent false stale EOD due to missing holiday data while preserving current EOD strictness.
- Write scope: `market-data-foundation.market-session.ts`, tests.
- Likely changes:
  - Add local/free holiday source configuration or static local calendar fixture.
  - Make holiday-calendar absence visible when it affects expected EOD.
- Shared-file risk: low.

Packet 6: Adjusted-close provenance and coverage honesty.

- Goal: distinguish true provider adjusted close from close fallback.
- Write scope: `market-data-foundation.provider.ts`, repository/service readiness tests.
- Likely changes:
  - Stop writing close as adjustedClose when provider adjustment is absent, or persist fallback provenance if schema already supports it.
  - Keep downstream DTO close fallback for display but expose readiness warning accurately.
- Shared-file risk: possible schema risk if provenance cannot be represented without a new field.

Recommended sequence: Packet 1 first, then Packet 2, then Packet 3 if provider validation remains top blocker, then Packet 4 for unsupported/manual catalog gaps, then Packet 5 and Packet 6.

## 6. QA Evidence Needed To Prove Availability Improved

Evidence must prove actual stored data improved, not just text changed.

- Before/after API captures:
  - `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK`
  - `GET /api/v1/market-data/universe/health?region=IN&assetType=STOCK`
  - `GET /api/v1/market-data/review-universe?region=IN&assetType=STOCK`
  - `GET /api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK`
- Required improved fields:
  - provider unknown count decreases.
  - provider supported count increases.
  - supported price backfill needed decreases.
  - `trustedCount` increases from zero.
  - `storedDataThroughDate` reaches `requiredDataThroughDate` for trusted members.
  - trusted membership pages load completely, or a configured partial scan is explicitly disclosed.
- Per-instrument sampled proof:
  - At least 20 sampled trusted instruments have latest EOD at or after required data-through date.
  - Each sampled trusted instrument has at least 120 OHLCV rows.
  - A deeper sample should show 200/252 bars for Data Quality, Strategy Decision, and Trade Plan readiness where intended.
  - Recent volume is positive and recent volume coverage passes the gate.
  - Adjusted-close fallback warnings are truthful.
- Repair-run proof:
  - Bounded batch size, action order, rows received/inserted/updated/no-op, zero-row warnings, failures, `hasMore`, and `anotherRunNeeded`.
  - Re-running the same batch is idempotent and mostly no-op after data is present.
  - No full unbounded provider job starts from UI/API smoke.
- Downstream non-workaround proof:
  - Today Review remains `NO_REVIEW` before trusted threshold and only moves to `LIMITED_REVIEW` or `FULL_REVIEW` from Market Data trusted membership.
  - Today Review candidates, if any, are all inside trusted membership.
  - Data Quality ready/eligible counts increase only after Market Data rows exist and evaluations run.
  - Signal Quality still reports not-yet-mature versus missing future price honestly.

## 7. Architect Constraints

- No paid libraries, paid market data providers, paid hosted services, broker APIs, order placement, or live-trading automation.
- Personal/local use only.
- Use free/local/public inputs: Yahoo where already integrated, public exchange CSVs/JSON where stable, manual CSV where free provider coverage is incomplete.
- Do not change downstream modules to pretend data exists.
- Do not lower trusted-review or freshness thresholds to make the UI green.
- Do not fetch in-progress daily candles for EOD review workflows.
- Keep repair actions explicit, bounded, scope-limited, auditable, and idempotent.
- Treat Market Data source correctness as the active priority before Signal Generation, Signal Quality, Calibration, Strategy Decision, Today Review, or Trade Plans are changed.
