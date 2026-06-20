# DB Audit: Signals / Strategy / Snapshots Group

**Audit date:** 2026-06-16 (re-audit)
**Method:** `reltuples` estimates for large tables; `count(*)` for small/medium ones; null-density via `count(col) / count(*)`.
**Today's date for staleness judgement:** 2026-06-16
**DB:** `investment_scanner`, user `scanner`, Postgres (Docker)

---

## Re-Audit Findings (Prior Items — Read This First)

### 1. `signal_outcomes.benchmarkReturnPercent` / `alphaPercent` — STILL CRITICAL NULL

**Prior finding:** 100% null (106K rows).
**Current state:** 105,610 rows total. **Only 12 rows have non-null `benchmarkReturnPercent`** (all 1D horizon, all for signal date 2026-06-11). `alphaPercent` is also non-null for exactly those 12 rows. All other horizons (5D, 10D, 20D, 60D) are **0% populated** for benchmark/alpha.
**Verdict:** The CB-8 benchmark enrichment code landed in `signal-quality-lab.repository.ts` (raw SQL UPDATE path is present and correct) but the sweep has barely run — only 12 of ~8,577 data-complete rows have been enriched. This is effectively still a gap. The sweep either did not back-fill older rows or the 1D window condition is only partially satisfied for recent signals. `forwardReturnPercent` is non-null for 8,577 rows (data-complete rows), so the underlying price data is present. Backfill has not been triggered at scale.

### 2. `market_pulse_snapshots` status — STILL PARTIALLY BROKEN

**Prior finding:** all status=PARTIAL.
**Current state:** 20 rows total; 15 PARTIAL (latest snapshotDate 2026-06-15, age 1 day), 5 FRESH (latest 2026-06-12, age 4 days). PARTIAL rows are dominant and more recent than the FRESH ones. Not resolved.

### 3. `research_overview_snapshots` — REFRESHED, NO LONGER STALE

**Prior finding:** stale.
**Current state:** 3 rows (IN/STOCK, US/STOCK, EU/STOCK). All computed 2026-06-15 (IN at 21:20 UTC, US at 22:32, EU at 15:49). Age: 1 day. FRESH.

### 4. `portfolio_intelligence_snapshots` — STILL STALE

**Prior finding:** stale (2 rows).
**Current state:** 2 rows. Latest `computedAt` 2026-06-07 (9 days ago). Both HEALTHY status. Snapshots have not been refreshed since 2026-06-07.

### 5. `pipeline_stage_runs` SNAPSHOT_ASSEMBLER — FAILING FOR IN/STOCK

**Prior finding:** SNAPSHOT_ASSEMBLER failing.
**Current state:** 12 total SNAPSHOT_ASSEMBLER stage runs — 10 COMPLETED, 2 FAILED. The most recent run was **FAILED** for IN/STOCK on 2026-06-15 at 21:27 UTC. Error: "Transaction already closed — 5000 ms timeout, 7099 ms elapsed" in `snapshot-assembler.repository.ts:630` (`createMany` inside interactive transaction). US/STOCK and EU/STOCK SNAPSHOT_ASSEMBLER runs completed successfully on 2026-06-15 (small universe: 25 and 24 instruments respectively). IN/STOCK SNAPSHOT_ASSEMBLER is failing due to transaction timeout, blocking daily snapshot materialization for the primary market.

### 6. `trade_plan_results.portfolioImpact` — STILL NEAR-100% NULL

**Prior finding:** ~99.6% null.
**Current state:** 1,293 rows, only 5 non-null `portfolioImpact`. **99.6% null — unchanged.**

---

## Table-by-Table Detail

---

### `signal_results`

**Schema:** `id`, `instrumentId` (FK stocks), `generationRunId` (FK signal_generation_runs, nullable), `symbol`, `companyName?`, `sector?`, `country?`, `score`, `direction`, `confidence`, `triggeredSignals` (JSON), `negativeSignals` (JSON), `explanation`, `generatedAt`, `generatedDate?`, `modelVersion`, `rulesetVersion?`, `sourceDataDate?`, `sourcePriceDate?`, `scoringInputSummary?` (JSON), `dataQualityEligibilitySnapshot?` (JSON), `source`, `dataStatus`, `reliabilityTier?`, `lifecycleState?`, `priorScore?`.
PK: `id`. Unique: `[instrumentId, modelVersion, generatedDate]`. FK → `stocks`, `signal_generation_runs`.

**Population:** 43,459 rows (real count).
- `generatedDate`: 100% non-null.
- `lifecycleState`: 19,251 non-null (~44% — pre-migration rows are null).
- `reliabilityTier`: 100% non-null.
- Latest `generatedDate`: 2026-06-15. FRESH (1 day old).

**Endpoints / modules:** `signal-generation-engine.repository.ts`, `signal-generation-engine.service.ts`, `signal-quality-lab.repository.ts`, `market-intelligence/instrument-context.service.ts` (findFirst for latest signal per instrument), `ai-investment-copilot.repository.ts`.

---

### `signal_outcomes`

**Schema:** `id`, `signalResultId` (FK signal_results), `instrumentId`, `symbol`, `direction`, `score`, `sector?`, `country?`, `modelVersion`, `signalGeneratedDate`, `horizon` (1D/5D/10D/20D/60D), `dataComplete`, `priceAtSignal?`, `futurePrice?`, `windowEndDate?`, `forwardReturnPercent?`, `maxFavorableExcursion?`, `maxAdverseExcursion?`, `maxDrawdownPercent?`, **`benchmarkReturnPercent?`** (CB-8), **`alphaPercent?`** (CB-8), `evaluatedAt`.
Unique: `[signalResultId, horizon]`. FK → `signal_results`.

**Population:** 105,610 rows total; 21,122 rows per horizon (5 horizons).
- Signal date range: 2019-03-01 to 2026-06-11.
- `dataComplete = true`: 8,577 rows (8.1%).
- `forwardReturnPercent` non-null: 8,577 (matches dataComplete).
- **`benchmarkReturnPercent` non-null: 12 rows only (0.01%) — all 1D horizon, signalGeneratedDate 2026-06-11.**
- **`alphaPercent` non-null: same 12 rows.**
- 5D/10D/20D/60D benchmarkReturnPercent: 0 non-null.

**KEY GAP:** CB-8 enrichment code exists and is correct (raw SQL UPDATE in `signal-quality-lab.repository.ts:88-103`) but has fired for only 12 rows. Full back-fill not triggered.

**Endpoints / modules:** `signal-quality-lab` (primary reader/writer for maturity sweep), `signal-calibration-engine.metrics.ts` (reads alpha for performance analytics).

---

### `signal_generation_runs`

**Schema:** `id`, `region`, `assetType`, `requestedByUserId`, `status`, `modelVersion`, `rulesetVersion`, `sourceDataDate?`, `generatedDate`, `batchSize`, `offset`, `totalCount`, `processedCount`, `generatedCount`, `updatedCount`, `noOpCount`, `duplicateOrIdempotentCount`, `skippedCount`, `failedCount`, `excludedByDataQuality`, `missingQualityEvaluationCount`, `durationMs`, `warnings` (JSON), `startedAt`, `completedAt?`.

**Population:** ~2,472 rows (est).
- Status: 2,359 COMPLETED (latest generatedDate 2026-06-15), 136 RUNNING (latest 2026-06-05 — stale orphans from interrupted runs), 24 FAILED (latest 2026-06-04).
- 136 stuck RUNNING rows are likely orphaned (never cleaned up after server restarts).

**Endpoints / modules:** `signal-generation-engine.repository.ts`, `signal-generation-engine.service.ts`.

---

### `signal_calibration_results`

**Schema:** `id`, `signalResultId`, `instrumentId`, `symbol`, `companyName?`, `sector?`, `country?`, `rawScore`, `calibratedScore`, `scoreDelta`, `rawDirection`, `calibratedDirection`, `rawConfidence`, `calibratedConfidence`, `boosts` (JSON), `penalties` (JSON), `calibrationReasons` (JSON), `dataGaps` (JSON), `calibrationModelVersion`, `rawSignalModelVersion?`, `generatedAt`.
Unique: `[signalResultId, calibrationModelVersion]`.

**Population:** 10,514 rows. Latest `generatedAt`: 2026-06-15 21:14. FRESH.

**Endpoints / modules:** `signal-calibration-engine.repository.ts`, `signal-calibration-engine.metrics.ts` (reads for performance analytics).

---

### `data_quality_evaluations`

**Schema:** `id`, `instrumentId` (unique FK stocks), `symbol`, `companyName?`, `sector?`, `industry?`, `country?`, `currency?`, `coverageScore`, `coverageStatus`, `signalReadinessScore`, `signalReadinessStatus`, `liquidityScore`, `liquidityStatus`, `eligibleForSignals`, `eligibleForBacktesting`, `eligibleForCalibration`, `dataGaps` (JSON), `warnings` (JSON), `readinessReasons` (JSON), `readinessBlockers` (JSON), `evaluatedAt`.
One row per instrument (unique on `instrumentId`). FK → `stocks`.

**Population:** 10,071 rows. Latest `evaluatedAt`: 2026-06-15 21:13. FRESH.
- `eligibleForSignals = true`: 4,876 (48%).

**Endpoints / modules:** `data-quality-engine` (writer), referenced as input to signal-generation and snapshot-assembler pipelines.

---

### `strategy_decision_results`

**Schema:** `id`, `instrumentId?` (FK stocks, nullable), `portfolioId?`, `holdingId?`, `symbol?`, `country?`, `exchange?`, `strategy`, `strategyName?`, `decision`, `action`, `decisionScore`, `confidence`, `marketCondition`, `marketGate`, `entryZone?`, `riskPlan?` (JSON), `scoreBreakdown?` (JSON), `reasons` (JSON), `blockers` (JSON), `warnings` (JSON), `dataGaps` (JSON), `strategyVersion?`, `frameworkBacked`, `frameworkDecision?`, `frameworkAction?`, `entryRulesPassed?` (JSON), `exitRulesTriggered?` (JSON), `invalidationRulesTriggered?` (JSON), `noiseFiltersTriggered?` (JSON), `strategyRating?` (JSON), `readinessLabel?`, `strategyDefinitionSource?`, `strategyDefinitionDrift?` (JSON), `modelVersion`, `generatedAt`, `generatedDate`.
Unique: `[instrumentId, strategy, modelVersion, generatedDate]`. FK → `stocks`.

**Population:** ~296,590 rows (est — largest table in scope group). Latest `generatedDate`: 2026-06-15. FRESH.
- Decision distribution: INSUFFICIENT_DATA 161,592 (54%), AVOID 82,776 (28%), REDUCE_RISK 19,078, HOLD 14,600, WATCH 12,053, WAIT 2,856, TRADE_CANDIDATE 2,006, EXIT_CANDIDATE 1,451.

**Endpoints / modules:** `strategy-decision-engine.repository.ts`, `strategy-decision-engine.service.ts`, `today-trade-review.repository.ts`, `ai-investment-copilot.repository.ts`, `pipeline-dag-stages-extended.ts`.

---

### `strategy_definitions`

**Schema:** `id`, `strategyCode`, `name`, `description`, `category`, `style`, `timeframe`, `assetTypes` (JSON), `supportedRegions` (JSON), `strategyVersion`, `status`, `parameters` (JSON), `entryRules` (JSON), `exitRules` (JSON), `invalidationRules` (JSON), `noiseFilters` (JSON), `riskRules` (JSON), `requiredInputs` (JSON), `marketGateRules` (JSON), `strategyRating?` (JSON), `readinessLabel`, `checksum`, `effectiveAt`.
Unique: `[strategyCode, strategyVersion]`.

**Population:** 11 rows (real count). Status: 8 ACTIVE, 3 DRAFT. Static configuration table — not time-series.

**Endpoints / modules:** `strategy-framework.repository.ts`, `strategy-decision-engine.repository.ts` (reads definitions to validate decisions).

---

### `strategy_performance_summaries`

**Schema:** `id`, `strategyCode`, `strategyVersion`, `timeframe`, `region`, `assetType`, `universeKey`, `startingCapital`, `endingCapital`, `totalReturn`, `cagr?`, `maxDrawdown`, `volatility?`, `sharpe?`, `winRate?`, `profitFactor?`, `tradeCount`, `averageHoldingDays?`, `exposurePercent?`, `benchmarkTotalReturn?`, `benchmarkCagr?`, `excessReturn?`, `excessCagr?`, `endOfTestExitPercent?`, `dataCoveragePercent?`, `ratingScore`, `ratingGrade`, `automationEligibility`, `readinessLabel`, `ratingReasons?` (JSON), `ratingWarnings?` (JSON), `ratingCapsApplied?` (JSON), `backtestRunId?`, `generatedAt`.
Unique: `[strategyCode, strategyVersion, timeframe, region, assetType, universeKey]`.

**Population:** 41 rows. Latest `generatedAt`: 2026-06-11 (5 days old). Near-fresh.

**Endpoints / modules:** `backtesting-strategy-lab` (writer), `strategy-decision-engine.repository.ts` (reads rating/grade), `research-hub.service.ts`.

---

### `trade_plan_results`

**Schema:** `id`, `instrumentId`, `strategyDecisionId?`, `portfolioId?`, `portfolioKey`, `symbol`, `region?`, `assetType?`, `strategy`, `strategyVersion`, `strategyRating?`, `readinessLabel?`, `backtestTimeframe?`, `backtestSummary?` (JSON), `strategyProofSnapshot?` (JSON), `strategyDecisionSnapshot?` (JSON), `latestPrice?`, `latestPriceTimestamp?`, `marketDataSnapshot?` (JSON), `dataQualitySnapshot?` (JSON), `paperReadinessStatus?`, `paperReadinessReasons?` (JSON), `paperReadinessBlockers?` (JSON), `proofGeneratedAt?`, `snapshotVersion?`, `planStatus`, `riskGrade`, `entryZone?` (JSON), `stopLoss?` (JSON), `target?` (JSON), `rewardRiskRatio`, **`portfolioImpact?`** (JSON), `invalidationRules?` (JSON), `warnings?` (JSON), `blockers?` (JSON), `dataGaps?` (JSON), `modelVersion`, `generatedAt`, `generatedDate`.
Unique: `[instrumentId, strategy, modelVersion, generatedDate, region, assetType, portfolioKey]`. FK → `instruments`.

**Population:** 1,293 rows. Latest `generatedAt`: 2026-06-13 (3 days old). Near-fresh.
- **`portfolioImpact`: 5 non-null (0.4%) — 99.6% null. Unchanged from prior audit.**

**Endpoints / modules:** `trade-plan-risk-engine.repository.ts`, `trade-plan-risk-engine.service.ts`, `today-trade-review.repository.ts`, `ai-investment-copilot.repository.ts`.

---

### `today_review_runs`

**Schema:** `id`, `runDate`, `region`, `assetType`, `status`, `dataThroughDate?`, `startedAt`, `finishedAt?`, `warnings` (JSON), `candidateCounts` (JSON), `sourceSnapshot` (JSON).
Unique: `[runDate, region, assetType]`. Children: `TodayReviewCandidate`.

**Population:** 32 rows (real count).
- Status: PARTIAL 28 (latest runDate 2026-06-15), RUNNING 3 (latest 2026-06-14 — stuck), COMPLETED 1 (2026-05-11 — only ever-completed run).
- 28/32 runs are PARTIAL; the TODAY_REVIEW pipeline has never cleanly completed for any recent date.

**Endpoints / modules:** `today-trade-review.repository.ts`, `today-trade-review.service.ts`. Route: `GET /api/today-trade-review`.

---

### `today_review_candidates`

**Schema:** `id`, `runId` (FK today_review_runs), `instrumentId`, `symbol`, `companyName?`, `direction`, `state`, `setupType?`, `strategyCode`, `strategyVersion?`, `rank`, `grade`, `confidenceScore`, `reasonSummary`, `blockers` (JSON), `watchReasons` (JSON), `dataQualitySnapshot?` (JSON), `marketContextSnapshot?` (JSON), `strategyProofSnapshot?` (JSON), `tradePlanSnapshot?` (JSON), `sourceSignalSnapshot?` (JSON).
Unique: `[runId, instrumentId, strategyCode, direction]`. FK → `today_review_runs`.

**Population:** 839 rows. Latest `createdAt`: 2026-06-15 21:22. FRESH (embedded in PARTIAL parent runs).

**Endpoints / modules:** `today-trade-review.repository.ts`. Route: `GET /api/today-trade-review/candidates`.

---

### `pipeline_runs`

**Schema:** `id`, `pipelineKey`, `scopeRegion`, `scopeAssetType`, `timeframe`, `triggerType`, `status`, `idempotencyKey` (unique), `dataThroughDate?`, `sourceFingerprint?`, `changedInstrumentCount`, `totalCount`, `processedCount`, `succeededCount`, `partialCount`, `failedCount`, `skippedCount`, `unchangedCount`, `warnings` (JSON), `errors` (JSON), `metadata?` (JSON), `startedAt`, `completedAt?`, `durationMs?`.

**Population:** ~1,186 rows (est). Latest `startedAt`: 2026-06-16 07:37 (today). FRESH.
- Status: COMPLETED 714, PARTIAL 369, FAILED 45, ABANDONED 40, SKIPPED 11, CANCELLED 7, BLOCKED 3.

**Endpoints / modules:** `pipeline-orchestration.service.ts`, `pipeline-dag-persistence.ts`. Route: `GET /api/pipeline/runs`.

---

### `pipeline_stage_runs`

**Schema:** `id`, `pipelineRunId` (FK pipeline_runs), `stageKey`, `stageOrder`, `status`, `idempotencyKey` (unique), `scopeRegion`, `scopeAssetType`, `timeframe`, `dataThroughDate?`, `inputFingerprint?`, `outputFingerprint?`, `changedInstrumentCount`, `batchSize?`, `offset?`, `nextOffset?`, `hasMore`, `totalCount`, `processedCount`, `succeededCount`, `partialCount`, `failedCount`, `skippedCount`, `unchangedCount`, `attemptCount`, `cacheKey?`, `cacheStatus`, `cacheExpiresAt?`, `leaseOwner?`, `leaseExpiresAt?`, `startedAt?`, `completedAt?`, `durationMs?`, `warnings` (JSON), `errors` (JSON), `metadata?` (JSON).
Unique: `[pipelineRunId, stageKey]`. FK → `pipeline_runs`.

**Population:** 34,804 rows (real count). Latest `createdAt`: 2026-06-16 07:41 (today). FRESH.

**SNAPSHOT_ASSEMBLER status (12 total stage rows):**
- COMPLETED 10: US/STOCK 2026-06-15 (25 instruments, 0 failed), EU/STOCK 2026-06-15 (24 instruments).
- FAILED 2: IN/STOCK 2026-06-15 21:27 UTC. Error: interactive transaction timeout — `createMany` in `snapshot-assembler.repository.ts:630` exceeded 5,000 ms (actual: 7,099 ms). Root cause: IN/STOCK universe is too large for the 5s interactive transaction limit.

**Endpoints / modules:** `pipeline-dag-persistence.ts`, `pipeline-orchestration.service.ts`. Route: `GET /api/pipeline/stage-runs`.

---

### `signal_position_ledger_entries`

**Schema:** `id`, `ledgerKey` (unique), `scopeRegion`, `scopeAssetType`, `instrumentId` (FK stocks), `stockKey`, `activeSlot?`, `symbol`, `companyName?`, `status`, `entrySignalId?`, `entryTriggerType`, `entryTriggerTimestamp`, `entryTriggerPrice`, `entryReasonSummary`, `strategyId?`, `strategyVersion?`, `strategyDecision?`, `strategyReadinessLabel?`, `strategyRatingGrade?`, `entryRuleId?`, `latestTrustedPriceDate?`, `latestTrustedPrice?`, `currentReturnPercent?`, `currentReturnStatus`, `currentDataQualityStatus?`, `lifecycleEvidenceStatus`, `trustEvidenceStatus`, `calibrationEvidenceStatus`, `displayWarnings` (JSON), `exitSignalId?`, `exitStrategyId?`, `exitStrategyVersion?`, `exitSourceDecisionId?`, `exitTriggerTimestamp?`, `exitTriggerPrice?`, `closePriceStatus`, `exitReasonSummary?`, `exitRuleId?`, `exitRuleIds` (JSON), `exitDecision?`, `invalidationSourceDecisionId?`, `invalidationRuleIds` (JSON), `invalidationTimestamp?`, `closedAt?`, `lastEvaluatedAt?`.
Unique: `[scopeRegion, scopeAssetType, activeSlot]` (one active slot per scope). FK → `stocks`.

**Population:** ~1,429 rows (est).
- Status: RISK_WARNING 1,133 (79%), INVALIDATED 238 (17%), ACTIVE 58 (4%).
- Latest entry (ACTIVE/RISK_WARNING): 2026-06-15. FRESH.

**Endpoints / modules:** `signal-position-ledger.repository.ts`, `signal-position-ledger.service.ts`. Route: `GET /api/signal-position-ledger`.

---

### `workbench_snapshots`

**Schema:** `id`, `instrumentId` (unique FK stocks), `symbol`, `computedAt`, `dataThroughDate?`, `payloadJson` (JSON — full workbench payload: overview/chart/performance/fundamentals/valuation/peers/relative_strength/corporate_actions/trust/signalEvidence).
One row per instrument.

**Population:** 2,972 rows. Latest `computedAt`: 2026-06-15 22:42. FRESH.

**Endpoints / modules:** `workbench-snapshot.repository.ts` (upsert + findUnique + findMany), `market-intelligence/instrument-context.service.ts` (findUnique). Route: `GET /api/workbench/:symbol`.

---

### `earnings_intelligence_snapshots`

**Schema:** `id`, `snapshotDate`, `dataThroughDate?`, `stockId` (FK stocks), `symbol`, `scopeRegion`, `scopeAssetType`, `resultDate?`, `resultDateSource`, `periodEndDate?`, `validatedAt?`, `daysToResult?`, `revenueGrowth?`, `profitGrowth?`, `epsGrowth?`, `marginTrend?`, `consistencyScore`, `accelerationScore`, `reasonTags` (JSON), `riskTags` (JSON), `warnings` (JSON), `freshness`, `categories` (JSON), `calculationVersion`.
Unique: `[snapshotDate, scopeRegion, scopeAssetType, symbol]`. FK → `stocks`.

**Population:** ~16,243 rows (est).
- freshness: FRESH 13,893 (86%), STALE 2,159 (13%), PARTIAL 191 (1%).
- Latest `snapshotDate`: 2026-06-15. FRESH.

**Endpoints / modules:** `earnings-intelligence.repository.ts` (writer), `research-hub.snapshot-reader.ts`, `ai-investment-copilot.repository.ts`. Route: `GET /api/earnings-intelligence`.

---

### `stock_interest_snapshots`

**Schema:** `id`, `snapshotDate`, `dataThroughDate?`, `generatedAt`, `stockId` (FK stocks), `symbol`, `company`, `sector?`, `scopeRegion`, `scopeAssetType`, `timeframe`, `category`, `score`, `direction`, `reasonTags` (JSON), `riskTags` (JSON), `freshness`, `warnings` (JSON), `calculationVersion`.
Unique: `[snapshotDate, scopeRegion, scopeAssetType, timeframe, category, symbol]`. FK → `stocks`.

**Population:** ~7,974 rows (est).
- Categories: RISK_AVOID 2,104, TODAY_TOP_INTEREST 2,093, ACCUMULATION 2,086, SECTOR_LEADERS 2,075, GROWTH_CONSISTENCY 455, GROWTH_ACCELERATION 455.
- Latest `snapshotDate`: 2026-06-15. FRESH.

**Endpoints / modules:** `stock-interest-snapshot.repository.ts`, `research-hub.snapshot-reader.ts`, `ai-investment-copilot.repository.ts`. Route: consumed by `GET /api/research/overview`.

---

### `market_context_snapshots`

**Schema:** `id`, `snapshotDate`, `region`, `regime`, `regimeScore`, `breadthPercentAboveSma50?`, `breadthPercentAboveSma200?`, `advanceDeclineRatio?`, `newHighCount?`, `newLowCount?`, `macroStatus?`, `explanation?`, `breadthByCapBand?` (JSON), `fearGreedIndex?` (CRYPTO region only), `fearGreedLabel?`, `source`, `dataStatus`.
Unique: `[snapshotDate, region]`.

**Population:** 153 rows.
- Region: IN 114 (latest 2026-06-15), GLOBAL 16 (latest 2026-06-05 — 11 days old, slightly stale), US 13 (latest 2026-06-15), CRYPTO 9 (latest 2026-06-16, today), EU 1 (2026-06-15), NSE 1 (2026-06-04 — legacy stale row).

**Endpoints / modules:** `market-context-intelligence.repository.ts`, `market-context-intelligence.controller.ts`, `pipeline-dag-stages-crypto.ts` (findFirst + update for CRYPTO region). Route: `GET /api/market-context`.

---

### `market_pulse_snapshots`

**Schema:** `id`, `snapshotDate`, `dataThroughDate`, `generatedAt`, `region`, `assetType`, `timeframe`, `status`, `marketHealthScore`, `marketHealthLabel`, `indexTrendScore`, `sectorStrengthScore`, `breadthScore`, `deliveryParticipationScore`, `dataFreshnessScore`, `topIndicesJson` (JSON), `strongSectorsJson` (JSON), `weakSectorsJson` (JSON), `breadthSummaryJson` (JSON), `deliverySummaryJson` (JSON), `vixSummaryJson?` (JSON), `advanceDeclineJson?` (JSON), `candidateCount`, `warningsJson` (JSON), `sourceSummaryJson` (JSON), `pipelineRunId?`.
Unique: `[snapshotDate, region, assetType, timeframe]`.

**Population:** 20 rows.
- Status: PARTIAL 15 (latest snapshotDate 2026-06-15, age 1 day), FRESH 5 (latest 2026-06-12, age 4 days).
- PARTIAL rows are both dominant and more recent than FRESH — still not generating FRESH rows consistently.

**Endpoints / modules:** `market-pulse-snapshot.repository.ts`, `market-context-intelligence.controller.ts`. Route: `GET /api/market-context/pulse`.

---

### `sector_context_snapshots`

**Schema:** `id`, `snapshotDate`, `region`, `sector`, `oneMonthReturn?`, `threeMonthReturn?`, `sixMonthReturn?`, `relativeStrengthScore`, `instrumentCount`, `bullishSignalCount?`, `bearishSignalCount?`, `leadershipStatus`, `source`, `dataStatus`.
Unique: `[snapshotDate, region, sector]`.

**Population:** 1,335 rows. Latest `snapshotDate`: 2026-06-15. FRESH.

**Endpoints / modules:** `market-context-intelligence.repository.ts`, `historical-context-snapshots.repository.ts`. Route: `GET /api/market-context/sectors`.

---

### `sector_snapshots`

**Schema:** `id`, `snapshotDate`, `dataThroughDate`, `scopeRegion`, `scopeAssetType`, `sector`, `classification`, `sectorScore`, `return1W?`, `return1M?`, `return3M?`, `trendScore`, `reasonTags` (JSON), `warnings` (JSON), `source`.
Unique: `[snapshotDate, scopeRegion, scopeAssetType, sector]`.

**Population:** 237 rows. Latest `snapshotDate`: 2026-06-15. FRESH.

**Endpoints / modules:** `research-hub.snapshot-reader.ts`. Route: sector section of `GET /api/research/overview`.

---

### `country_context_snapshots`

**Schema:** `id`, `snapshotDate`, `region`, `country`, `oneMonthReturn?`, `threeMonthReturn?`, `sixMonthReturn?`, `relativeStrengthScore`, `bullishSignalCount?`, `bearishSignalCount?`, `source`, `dataStatus`.
Unique: `[snapshotDate, region, country]`.

**Population:** 182 rows. Latest `snapshotDate`: 2026-06-15. FRESH.

**Endpoints / modules:** `market-context-intelligence.repository.ts`, `historical-context-snapshots.repository.ts`. Route: `GET /api/market-context/countries`.

---

### `smart_money_context_snapshots`

**Schema:** `id`, `snapshotDate`, `instrumentId` (FK stocks), `symbol`, `companyName?`, `sector?`, `smartMoneyScore`, `status`, `confidence`, `accumulationSignalCount`, `distributionSignalCount`, `unusualVolumeDetected`, `explanation?`, `source`, `dataStatus`, `latestClose?`, `latestVolume?`, `averageVolume20?`, `dailyChangePercent?`, `signals?` (JSON), `insiderOwnership?` (JSON), `range`.
Unique: `[snapshotDate, instrumentId, range]`. FK → `stocks`.

**Population:** ~140,367 rows (est — second largest in group). Latest `snapshotDate`: 2026-06-15. FRESH.

**Endpoints / modules:** `market-intelligence/instrument-context.service.ts` (findFirst per instrument), `historical-context-snapshots.repository.ts`. Route: `GET /api/instruments/:symbol/context`.

---

### `data_quality_snapshots`

**Schema:** `id`, `snapshotDate`, `instrumentId`, `symbol`, `priceHistoryDays`, `hasLatestPrice`, `hasFundamentals`, `hasSector`, `hasIndustry`, `dataStatus`, `signalReadinessScore`.
Unique: `[snapshotDate, instrumentId]`.

**Population:** 24,975 rows (real count). Latest `snapshotDate`: 2026-06-15. FRESH.

**Note:** Older per-day snapshot model for DQ. The newer canonical model is `instrument_eligibility` (outside this scope group), which supersedes this for pipeline verdicts.

**Endpoints / modules:** `historical-context-snapshots.repository.ts`.

---

### `market_scan_snapshots`

**Schema:** `id`, `scanType` (MOVERS_GAINERS | MOVERS_LOSERS | 52W_HIGH | 52W_LOW | DELIVERY_SPIKE | VOLUME_SPIKE | MARKET_MAP), `scanRange?`, `region`, `assetType`, `tradingDate`, `rank`, `payloadJson` (JSON — full row payload, shape varies by scanType).
Unique: `[scanType, scanRange, region, assetType, tradingDate, rank]`.

**Population:** ~6,688 rows (est).
- scanType distribution: MARKET_MAP 3,017, 52W_HIGH 800, 52W_LOW 796, VOLUME_SPIKE 667, MOVERS_GAINERS 583, MOVERS_LOSERS 520, DELIVERY_SPIKE 305.
- Latest `tradingDate`: 2026-06-15. FRESH.

**Endpoints / modules:** `market-data-foundation.serving.scan-reads.ts` (reads), `market-data-foundation.ingestion.scan-snapshots.ts` (writes). Route: `GET /api/market-scan/:scanType`.

---

### `research_overview_snapshots`

**Schema:** `id`, `region`, `assetType`, `overviewJson` (JSON — full ResearchOverview DTO with pre-diffed whatChanged + actionability), `marketGate`, `overallStatus`, `dataGaps` (String[]), `computedAt`.
Unique: `[region, assetType]`.

**Population:** 3 rows.
- IN/STOCK: marketGate=SELECTIVE, overallStatus=UNPROVEN, computedAt 2026-06-15 21:20. Age: 1 day. FRESH.
- US/STOCK: marketGate=OPEN, overallStatus=UNPROVEN, computedAt 2026-06-15 22:32. Age: 1 day. FRESH.
- EU/STOCK: marketGate=OPEN, overallStatus=UNPROVEN, computedAt 2026-06-15 15:49. Age: 1 day. FRESH.
**Status: REFRESHED. No longer stale (was stale in prior audit).**

**Endpoints / modules:** `research-hub.snapshot-reader.ts`, `research-hub.service.ts`. Script: `seedResearchOverview.ts`. Route: `GET /api/research/overview`.

---

### `portfolio_intelligence_snapshots`

**Schema:** `id`, `portfolioId` (unique FK portfolios), `computedAt`, `healthScore` (Int — denormalized scalar), `status` (HEALTHY | WATCH | AT_RISK — denormalized scalar), `payloadJson` (JSON — full PortfolioIntelligenceResponse).
One row per portfolio.

**Population:** 2 rows.
- Portfolio 1: healthScore=83, HEALTHY, computedAt 2026-06-06 12:21. Age: **10 days. STALE.**
- Portfolio 2: healthScore=78, HEALTHY, computedAt 2026-06-07 23:30. Age: **9 days. STALE.**

**Refresh not triggered** since 2026-06-07. Likely because `refreshPortfolioIntelligence()` is triggered on holdings change + daily cron, and neither fired for these portfolios.

**Endpoints / modules:** `portfolio-intelligence.repository.ts` (upsert + findUnique), `seedPortfolioIntelligence.ts` (seed script). Route: `GET /api/portfolios/:id/intelligence`.

---

## Summary Table

| Table | Est. Rows | Latest Data | Status |
|---|---|---|---|
| strategy_decision_results | ~296,590 | 2026-06-15 | FRESH |
| smart_money_context_snapshots | ~140,367 | 2026-06-15 | FRESH |
| signal_outcomes | 105,610 | 2026-06-11 | FRESH — bench/alpha 0.01% populated (critical gap) |
| pipeline_stage_runs | 34,804 | 2026-06-16 | FRESH — IN SNAPSHOT_ASSEMBLER failing (tx timeout) |
| data_quality_snapshots | 24,975 | 2026-06-15 | FRESH |
| signal_results | 43,459 | 2026-06-15 | FRESH — lifecycleState 44% null (pre-migration rows) |
| earnings_intelligence_snapshots | ~16,243 | 2026-06-15 | FRESH (86% FRESH freshness) |
| signal_calibration_results | 10,514 | 2026-06-15 | FRESH |
| data_quality_evaluations | 10,071 | 2026-06-15 | FRESH |
| stock_interest_snapshots | ~7,974 | 2026-06-15 | FRESH |
| market_scan_snapshots | ~6,688 | 2026-06-15 | FRESH |
| workbench_snapshots | 2,972 | 2026-06-15 | FRESH |
| signal_generation_runs | ~2,472 | 2026-06-15 | FRESH — 136 stuck RUNNING orphans |
| signal_position_ledger_entries | ~1,429 | 2026-06-15 | FRESH |
| sector_context_snapshots | 1,335 | 2026-06-15 | FRESH |
| pipeline_runs | ~1,186 | 2026-06-16 | FRESH |
| trade_plan_results | 1,293 | 2026-06-13 | Near-fresh — portfolioImpact 99.6% null |
| today_review_candidates | 839 | 2026-06-15 | FRESH (in PARTIAL parent runs) |
| sector_snapshots | 237 | 2026-06-15 | FRESH |
| country_context_snapshots | 182 | 2026-06-15 | FRESH |
| market_context_snapshots | 153 | 2026-06-15 | FRESH (GLOBAL region 11 days stale) |
| strategy_performance_summaries | 41 | 2026-06-11 | Near-fresh (5 days) |
| today_review_runs | 32 | 2026-06-15 | PARTIAL dominant (28/32); only 1 COMPLETED ever |
| strategy_definitions | 11 | — | Static config — 8 ACTIVE, 3 DRAFT |
| market_pulse_snapshots | 20 | 2026-06-15 | PARTIAL dominant — not generating FRESH consistently |
| research_overview_snapshots | 3 | 2026-06-15 | FRESH — resolved since prior audit |
| portfolio_intelligence_snapshots | 2 | 2026-06-07 | STALE — 9–10 days |
