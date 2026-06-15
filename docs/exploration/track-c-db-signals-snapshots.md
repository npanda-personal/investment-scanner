# Track C — DB Reconnaissance: Signals / Strategy / Snapshots

> Generated: 2026-06-15 | Read-only SELECT / introspection only. Schema source: `backend/prisma/schema.prisma`. DB: `investment_scanner`.

---

## Table of Contents

1. [SignalResult](#1-signalresult--signal_results)
2. [SignalOutcome](#2-signaloutcome--signal_outcomes)
3. [SignalGenerationRun](#3-signalgenerationrun--signal_generation_runs)
4. [SignalCalibrationResult](#4-signalcalibrationresult--signal_calibration_results)
5. [DataQualityEvaluation](#5-dataqualityevaluation--data_quality_evaluations)
6. [StrategyDecisionResult](#6-strategydecisionresult--strategy_decision_results)
7. [StrategyDefinition](#7-strategydefinition--strategy_definitions)
8. [StrategyPerformanceSummary](#8-strategyperformancesummary--strategy_performance_summaries)
9. [TradePlanResult](#9-tradeplanresult--trade_plan_results)
10. [TodayReviewRun](#10-todayreviewrun--today_review_runs)
11. [TodayReviewCandidate](#11-todayreviewcandidate--today_review_candidates)
12. [PipelineRun](#12-pipelinerun--pipeline_runs)
13. [PipelineStageRun](#13-pipelinestagerun--pipeline_stage_runs)
14. [SignalPositionLedgerEntry](#14-signalpositionledgerentry--signal_position_ledger_entries)
15. [WorkbenchSnapshot](#15-workbenchsnapshot--workbench_snapshots)
16. [EarningsIntelligenceSnapshot](#16-earningsintelligencesnapshot--earnings_intelligence_snapshots)
17. [StockInterestSnapshot](#17-stockinterestsnapshot--stock_interest_snapshots)
18. [MarketContextSnapshot](#18-marketcontextsnapshot--market_context_snapshots)
19. [MarketPulseSnapshot](#19-marketpulsesnapshot--market_pulse_snapshots)
20. [SectorContextSnapshot](#20-sectorcontextsnapshot--sector_context_snapshots)
21. [SectorSnapshot](#21-sectorsnapshot--sector_snapshots)
22. [CountryContextSnapshot](#22-countrycontextsnapshot--country_context_snapshots)
23. [SmartMoneyContextSnapshot](#23-smartmoneycontextsnapshot--smart_money_context_snapshots)
24. [DataQualitySnapshot](#24-dataqualitysnapshot--data_quality_snapshots)
25. [MarketScanSnapshot](#25-marketscansnapshot--market_scan_snapshots)
26. [ResearchOverviewSnapshot](#26-researchoverviewsnapshot--research_overview_snapshots)
27. [PortfolioIntelligenceSnapshot](#27-portfoliointelligencesnapshot--portfolio_intelligence_snapshots)

---

## 1. SignalResult — `signal_results`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| instrumentId | String | FK → stocks.id (Cascade) |
| generationRunId | String? | FK → signal_generation_runs.id (SetNull) |
| symbol | String | |
| companyName | String? | |
| sector | String? | |
| country | String? | |
| score | Float | |
| direction | String | |
| confidence | String | |
| triggeredSignals | Json | |
| negativeSignals | Json | |
| explanation | String | |
| generatedAt | DateTime | default now() |
| generatedDate | DateTime? | Normalized UTC midnight |
| modelVersion | String | default "signal-engine-v1" |
| rulesetVersion | String? | |
| sourceDataDate | DateTime? | |
| sourcePriceDate | DateTime? | |
| scoringInputSummary | Json? | |
| dataQualityEligibilitySnapshot | Json? | |
| source | String | default "signal-generation-engine" |
| dataStatus | String | default "PARTIAL" |
| reliabilityTier | String? | |
| lifecycleState | String? | ENTRY\|ACTIVE\|EXIT\|EXPIRED; nullable pre-migration |
| priorScore | Float? | Prior run score for same instrument+modelVersion |
| createdAt / updatedAt | DateTime | |

**Unique:** (instrumentId, modelVersion, generatedDate). **Indexes:** generationRunId, modelVersion+sourceDataDate, instrumentId+generatedAt, direction+score, lifecycleState, sector, country.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 43,410 |
| Latest createdAt | 2026-06-15 |
| generationRunId non-null | 43,410 / 43,410 (100%) |
| generatedDate non-null | 43,410 / 43,410 (100%) |
| lifecycleState non-null | 19,202 / 43,410 (44%) — sparse, pre-migration rows lack it |
| priorScore non-null | 15,702 / 43,410 (36%) |
| reliabilityTier non-null | 43,410 / 43,410 (100%) |
| scoringInputSummary non-null | 43,410 / 43,410 (100%) |
| dataQualityEligibilitySnapshot non-null | 43,410 / 43,410 (100%) |

**Scope:** IN (most), US, EU (small). Data freshness: active through today.

### Endpoints / Readers
- `signal-generation-engine.repository.ts` — upsert, reads by instrument/date/lifecycle
- `market-context-intelligence.repository.ts` — reads latest for signal health checks
- `market-intelligence/index-constituents.repository.ts` — reads for index context
- `market-intelligence/sector-constituents.repository.ts` — reads for sector context
- `portfolio-management.repository.ts` — reads signals for portfolio instruments
- `market-intelligence/instrument-context.service.ts` — reads for per-instrument context
- `signal-position-ledger.repository.ts` — reads for lookahead/exit evidence

---

## 2. SignalOutcome — `signal_outcomes`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| signalResultId | String | FK → signal_results.id (Cascade) |
| instrumentId | String | denormalized |
| symbol | String | |
| direction | String | |
| score | Float | |
| sector, country | String? | |
| modelVersion | String | |
| signalGeneratedDate | DateTime | |
| horizon | String | 1D\|5D\|10D\|20D\|60D |
| dataComplete | Boolean | default false |
| priceAtSignal | Float? | |
| futurePrice | Float? | |
| windowEndDate | DateTime? | |
| forwardReturnPercent | Float? | |
| maxFavorableExcursion / maxAdverseExcursion / maxDrawdownPercent | Float? | |
| benchmarkReturnPercent | Float? | CB-8: Nifty 50 return |
| alphaPercent | Float? | signal return minus benchmark |
| evaluatedAt | DateTime | |

**Unique:** (signalResultId, horizon). **Indexes:** instrumentId+horizon+date, modelVersion+horizon+date, sector+horizon, direction+horizon+dataComplete, dataComplete+horizon+evaluatedAt.

### Population
| Metric | Value |
|---|---|
| Row count (approx) | 105,610 |
| Latest createdAt | 2026-06-11 |
| priceAtSignal non-null | 74,330 / 105,610 (70%) |
| futurePrice non-null | 8,577 / 105,610 (8%) |
| forwardReturnPercent non-null | 8,577 / 105,610 (8%) |
| dataComplete = true | 8,577 / 105,610 (8%) |
| benchmarkReturnPercent non-null | 0 / 105,610 (0%) — entirely null |
| alphaPercent non-null | 0 / 105,610 (0%) — entirely null |

**Notable:** `benchmarkReturnPercent` and `alphaPercent` (CB-8 alpha calculation) are 100% null — the Nifty benchmark enrichment pipeline has never run or written to this table. Only ~8% of outcomes have completed data (futurePrice resolved); the rest are open windows.

### Endpoints / Readers
- `signal-quality-lab.repository.ts` — upsert, update, read outcomes for maturity analysis

---

## 3. SignalGenerationRun — `signal_generation_runs`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| region, assetType | String | scope |
| requestedByUserId | String | |
| status | String | |
| modelVersion, rulesetVersion | String | |
| sourceDataDate | DateTime? | |
| generatedDate | DateTime | |
| batchSize, offset | Int | |
| totalCount…failedCount | Int | counters, default 0 |
| excludedByDataQuality | Int | |
| missingQualityEvaluationCount | Int | |
| durationMs | Int | |
| warnings | Json | |
| startedAt | DateTime | |
| completedAt | DateTime? | |

**Indexes:** region+assetType+modelVersion+generatedDate, status+startedAt.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 2,423 |
| Latest createdAt | 2026-06-15 |
| completedAt non-null | 2,287 / 2,423 (94%) |
| sourceDataDate non-null | 1,696 / 2,423 (70%) |
| Scope breakdown | IN STOCK: 1,586 runs (latest 2026-06-15); US STOCK: 166 (latest 2026-06-14); GLOBAL STOCK: 665 (latest 2026-06-06); EU STOCK: 6 (latest 2026-06-05) |

### Endpoints / Readers
- `signal-generation-engine.repository.ts` — creates, updates, finds runs

---

## 4. SignalCalibrationResult — `signal_calibration_results`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| signalResultId | String | FK (no relation declared — raw string) |
| instrumentId | String | |
| symbol, companyName?, sector?, country? | String? | |
| rawScore, calibratedScore, scoreDelta | Float | |
| rawDirection, calibratedDirection | String | |
| rawConfidence, calibratedConfidence | String | |
| boosts, penalties, calibrationReasons, dataGaps | Json | |
| calibrationModelVersion | String | |
| rawSignalModelVersion | String? | |
| generatedAt, createdAt, updatedAt | DateTime | |

**Unique:** (signalResultId, calibrationModelVersion). **Indexes:** instrumentId+generatedAt, calibratedDirection+calibratedScore, sector, country.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 10,514 |
| Latest createdAt | 2026-06-13 |
| companyName non-null | 10,514 / 10,514 (100%) |
| sector non-null | 9,248 / 10,514 (88%) — 1,266 missing sector |
| rawSignalModelVersion non-null | 10,514 / 10,514 (100%) |

### Endpoints / Readers
- `signal-calibration-engine.repository.ts` — upsert, reads for calibration service
- `signal-calibration-engine.scorer.ts` — reads `dataQualityEvaluation` at runtime for scoring context

---

## 5. DataQualityEvaluation — `data_quality_evaluations`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| instrumentId | String | @unique — one per instrument |
| stock | FK → stocks.id (Cascade) | |
| symbol, companyName?, sector?, industry?, country?, currency? | String? | |
| coverageScore, signalReadinessScore, liquidityScore | Float | |
| coverageStatus, signalReadinessStatus, liquidityStatus | String | |
| eligibleForSignals, eligibleForBacktesting, eligibleForCalibration | Boolean | |
| dataGaps, warnings, readinessReasons, readinessBlockers | Json | |
| evaluatedAt | DateTime | |

**Unique:** instrumentId (one row per instrument). **Indexes:** coverageStatus, signalReadinessStatus, liquidityStatus, sector, country, evaluatedAt.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 10,071 |
| Latest createdAt | 2026-06-14 |
| Coverage | One evaluation per tracked instrument; all columns fully populated |

### Endpoints / Readers
- `data-quality-engine.repository.ts` — upsert + read for DQE pipeline stage
- `signal-calibration-engine.scorer.ts` — reads via service call for per-signal adjustment

---

## 6. StrategyDecisionResult — `strategy_decision_results`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| instrumentId | String? | FK → stocks.id (Cascade) |
| portfolioId, holdingId | String? | optional portfolio context |
| symbol, country?, exchange? | String? | |
| strategy | String | strategy code |
| strategyName? | String? | |
| decision | String | TRADE_CANDIDATE\|WATCH\|WAIT\|AVOID\|EXIT_CANDIDATE etc |
| action | String | CONSIDER_ENTRY etc |
| decisionScore | Int | |
| confidence | String | LOW\|MEDIUM\|HIGH |
| marketCondition, marketGate | String | |
| entryZone | String? | |
| riskPlan | Json? | |
| scoreBreakdown | Json? | |
| reasons, blockers, warnings, dataGaps | Json | |
| strategyVersion | String? | |
| frameworkBacked | Boolean | default false |
| frameworkDecision, frameworkAction | String? | |
| entryRulesPassed, exitRulesTriggered, invalidationRulesTriggered, noiseFiltersTriggered | Json? | |
| strategyRating, readinessLabel | Json?/String? | |
| strategyDefinitionSource, strategyDefinitionDrift | String?/Json? | |
| modelVersion | String | default "strategy-decision-v1" |
| generatedAt, generatedDate | DateTime | |

**Unique:** (instrumentId, strategy, modelVersion, generatedDate). **Indexes:** instrumentId, portfolioId, strategy, strategyDefinitionSource.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 296,118 |
| Latest createdAt | 2026-06-15 |
| instrumentId non-null | 296,118 / 296,118 (100%) |
| riskPlan non-null | 296,118 / 296,118 (100%) |
| scoreBreakdown non-null | 296,018 / 296,118 (~100%) |
| frameworkDecision non-null | 296,018 / 296,118 (~100%) |
| entryRulesPassed non-null | 296,018 / 296,118 (~100%) |
| strategyRating non-null | 296,018 / 296,118 (~100%) |

**Richly-populated table.** The largest table in this group at 296k rows. All major nullable fields are populated. Produced daily per instrument x strategy combination.

### Endpoints / Readers
- `strategy-decision-engine.repository.ts` — upsert, bulk deleteMany+createMany, reads by scope/date
- `snapshot-assembler.repository.ts` — reads for daily snapshot assembly
- `signal-position-ledger.repository.ts` — reads for exit evidence

---

## 7. StrategyDefinition — `strategy_definitions`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| strategyCode | String | |
| name, description | String | |
| category, style, timeframe | String | |
| assetTypes, supportedRegions | Json | |
| strategyVersion | String | |
| status | String | ACTIVE\|DRAFT |
| parameters, entryRules, exitRules, invalidationRules, noiseFilters, riskRules, requiredInputs, marketGateRules | Json | |
| strategyRating | Json? | |
| readinessLabel | String | default "RESEARCH_ONLY" |
| checksum | String | default "LEGACY_UNCHECKED" |
| effectiveAt, createdAt, updatedAt | DateTime | |

**Unique:** (strategyCode, strategyVersion). **Indexes:** strategyCode, status, category, style.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 11 |
| Latest createdAt | 2026-06-08 |
| Contents | 11 strategy definitions: BREAKOUT_CONFIRMATION, DEFENSIVE_EXIT, LOW_QUALITY_DATA_REJECTION, MEAN_REVERSION_PULLBACK, PULLBACK_IN_UPTREND, QUALITY_TREND, RISK_OFF_AVOIDANCE, SECTOR_LEADER_MOMENTUM, SMART_MONEY_ACCUMULATION, TREND_MOMENTUM (all v1.2.0 ACTIVE or DRAFT), BREAKDOWN_MOMENTUM (v1.0.0 DRAFT) |
| readinessLabel | All "RESEARCH_ONLY" |

Small reference table — fully populated as expected.

### Endpoints / Readers
- `strategy-framework.repository.ts` — upsert + findMany + findUnique + count ACTIVE

---

## 8. StrategyPerformanceSummary — `strategy_performance_summaries`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| strategyCode, strategyVersion | String | |
| timeframe, region, assetType, universeKey | String | |
| startingCapital, endingCapital, totalReturn | Float | |
| cagr, maxDrawdown, volatility?, sharpe?, winRate?, profitFactor? | Float? | |
| tradeCount | Int | |
| averageHoldingDays?, exposurePercent? | Float? | |
| benchmarkTotalReturn?, benchmarkCagr?, excessReturn?, excessCagr? | Float? | |
| endOfTestExitPercent?, dataCoveragePercent? | Float? | |
| ratingScore | Int | |
| ratingGrade | String | EXCELLENT\|AVERAGE\|UNPROVEN etc |
| automationEligibility | String | PAPER_TRADING_ELIGIBLE\|WATCHLIST_ONLY\|NOT_ELIGIBLE |
| readinessLabel | String | default "RESEARCH_ONLY" |
| ratingReasons, ratingWarnings, ratingCapsApplied | Json? | |
| backtestRunId | String? | |
| generatedAt, createdAt, updatedAt | DateTime | |

**Unique:** (strategyCode, strategyVersion, timeframe, region, assetType, universeKey). **Indexes:** strategyCode, ratingGrade, automationEligibility.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 41 |
| Latest createdAt | 2026-06-08 |
| Notable results | BREAKOUT_CONFIRMATION 5Y/10Y IN=EXCELLENT (PAPER_TRADING_ELIGIBLE); most others UNPROVEN or NOT_ELIGIBLE |
| All readinessLabel | "RESEARCH_ONLY" |

Small backtest result catalog. Only BREAKOUT_CONFIRMATION has paper-trading eligibility for long backtests in IN.

### Endpoints / Readers
- `strategy-framework.repository.ts` — findMany by code/region, upsert, count

---

## 9. TradePlanResult — `trade_plan_results`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| instrumentId | String | |
| strategyDecisionId | String? | FK ref (no Prisma relation) |
| portfolioId | String? | |
| portfolioKey | String | default "NO_PORTFOLIO" |
| symbol, region?, assetType? | String? | |
| strategy, strategyVersion | String | |
| strategyRating?, readinessLabel?, backtestTimeframe? | String? | |
| backtestSummary | Json? | |
| strategyProofSnapshot, strategyDecisionSnapshot, marketDataSnapshot, dataQualitySnapshot | Json? | |
| latestPrice | Float? | |
| latestPriceTimestamp | DateTime? | |
| paperReadinessStatus?, paperReadinessReasons?, paperReadinessBlockers? | String?/Json? | |
| planStatus | String | |
| riskGrade | String | |
| entryZone, stopLoss, target | Json? | |
| rewardRiskRatio | Float | |
| positionSizing | Json? | |
| portfolioImpact | Json? | |
| invalidationRules, warnings, blockers, dataGaps | Json? | |
| modelVersion | String | |
| generatedAt, generatedDate | DateTime | |

**Unique:** (instrumentId, strategy, modelVersion, generatedDate, region, assetType, portfolioKey).

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 1,293 |
| Latest createdAt | 2026-06-13 |
| strategyDecisionId non-null | 1,293 / 1,293 (100%) |
| latestPrice non-null | 1,277 / 1,293 (99%) |
| backtestSummary non-null | 435 / 1,293 (34%) |
| positionSizing non-null | 1,256 / 1,293 (97%) |
| portfolioImpact non-null | 5 / 1,293 (0.4%) — nearly always null (portfolio context rarely provided) |
| region non-null | 1,293 / 1,293 (100%) |

**Notable:** `portfolioImpact` is 99.6% null (portfolio-aware trade plans nearly absent). `backtestSummary` only 34% populated, suggesting many plans generated without resolved backtest results.

### Endpoints / Readers
- `snapshot-assembler.repository.ts` — reads for daily snapshot assembly

---

## 10. TodayReviewRun — `today_review_runs`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| runDate | DateTime | |
| region, assetType | String | |
| status | String | |
| dataThroughDate | DateTime? | |
| startedAt | DateTime | |
| finishedAt | DateTime? | |
| warnings | Json | |
| candidateCounts | Json | |
| sourceSnapshot | Json | |

**Unique:** (runDate, region, assetType). **Indexes:** region+assetType+runDate.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 30 |
| Latest createdAt | 2026-06-15 |
| Scope | IN STOCK: 21 runs; US STOCK: 9 runs |

Small run log table; all recent and active.

### Endpoints / Readers
- `today-trade-review.repository.ts` — upsert run, update, delete candidates on re-run

---

## 11. TodayReviewCandidate — `today_review_candidates`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| runId | String | FK → today_review_runs.id (Cascade) |
| instrumentId | String | |
| symbol | String | |
| companyName? | String? | |
| direction | String | |
| state | String | |
| setupType? | String? | |
| strategyCode, strategyVersion? | String | |
| rank | Int | |
| grade | String | |
| confidenceScore | Int | |
| reasonSummary | String | |
| blockers, watchReasons | Json | |
| dataQualitySnapshot, marketContextSnapshot, strategyProofSnapshot, tradePlanSnapshot, sourceSignalSnapshot | Json? | |

**Unique:** (runId, instrumentId, strategyCode, direction). **Indexes:** runId+rank, instrumentId, state.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 839 |
| Latest createdAt | 2026-06-15 |

Small candidate list; refreshed daily. All recent.

### Endpoints / Readers
- `today-trade-review.repository.ts` — deleteMany on re-run + bulk create

---

## 12. PipelineRun — `pipeline_runs`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| pipelineKey | String | identifies the pipeline type |
| scopeRegion, scopeAssetType, timeframe | String | |
| triggerType | String | MANUAL\|SCHEDULED etc |
| status | String | |
| idempotencyKey | String | @unique |
| dataThroughDate | DateTime? | |
| sourceFingerprint | String? | |
| changedInstrumentCount, totalCount, processedCount, succeededCount, partialCount, failedCount, skippedCount, unchangedCount | Int | |
| warnings, errors | Json | |
| metadata | Json? | |
| startedAt, completedAt?, durationMs? | DateTime/Int | |

**Indexes:** pipelineKey+scope+timeframe+dataThroughDate, scope+startedAt, status+startedAt.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 1,179 |
| Latest createdAt | 2026-06-15 |
| Pipeline key breakdown | market-intelligence/IN: 901 runs (main workhorse); market-intelligence/US: 123; signal-position-ledger: 57; research-hub-overview: 6; dag-runner: 3; market-data-historical-exchange-backfill: 81 |

### Endpoints / Readers
- `pipeline-orchestration.repository.ts` — create, update, findMany
- `pipeline-dag-persistence.ts` — findUnique by idempotencyKey

---

## 13. PipelineStageRun — `pipeline_stage_runs`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| pipelineRunId | String | FK → pipeline_runs.id (Cascade) |
| stageKey | String | |
| stageOrder | Int | |
| status | String | |
| idempotencyKey | String | @unique |
| scopeRegion, scopeAssetType, timeframe | String | |
| dataThroughDate | DateTime? | |
| inputFingerprint, outputFingerprint | String? | |
| changedInstrumentCount, batchSize?, offset?, nextOffset? | Int? | |
| hasMore | Boolean | default false |
| totalCount…unchangedCount | Int | counters |
| attemptCount | Int | |
| cacheKey?, cacheStatus, cacheExpiresAt? | String?/DateTime? | |
| leaseOwner?, leaseExpiresAt? | String?/DateTime? | |
| startedAt?, completedAt?, durationMs? | DateTime?/Int? | |
| warnings, errors, metadata? | Json | |

**Unique:** (pipelineRunId, stageKey). **Indexes:** pipelineRunId+stageOrder, stageKey+scope+timeframe+dataThroughDate, stageKey+status+leaseExpiresAt.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 34,755 |
| Latest createdAt | 2026-06-15 |

Largest operational log table. Active daily.

### Endpoints / Readers
- `pipeline-dag-persistence.ts` — findFirst, updateMany for DAG stage state
- `pipeline-orchestration.repository.ts` — create, update, findMany

---

## 14. SignalPositionLedgerEntry — `signal_position_ledger_entries`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| ledgerKey | String | @unique |
| scopeRegion, scopeAssetType | String | |
| instrumentId | String | FK → stocks.id (Cascade) |
| stockKey | String | default "" |
| activeSlot | String? | for one-active-per-scope constraint |
| symbol, companyName? | String? | |
| status | String | ACTIVE\|RISK_WARNING\|INVALIDATED |
| entrySignalId? | String? | |
| entryTriggerType | String | default "bullish_entry_trigger" |
| entryTriggerTimestamp | DateTime | |
| entryTriggerPrice | Float | |
| entryReasonSummary | String | |
| strategyId?, strategyVersion?, strategyDecision?, strategyReadinessLabel?, strategyRatingGrade? | String? | |
| entryRuleId? | String? | |
| latestTrustedPriceDate?, latestTrustedPrice?, currentReturnPercent? | Float?/DateTime? | |
| currentReturnStatus, lifecycleEvidenceStatus, trustEvidenceStatus, calibrationEvidenceStatus | String | various defaults |
| displayWarnings | Json | default "[]" |
| exitSignalId?, exitStrategyId?, … exitRuleId?, exitRuleIds | multiple String?/Json | |
| exitTriggerTimestamp?, exitTriggerPrice?, closePriceStatus, exitReasonSummary? | | |
| invalidationSourceDecisionId?, invalidationRuleIds, invalidationTimestamp? | | |
| closedAt?, lastEvaluatedAt? | DateTime? | |

**Unique:** ledgerKey; scopeRegion+scopeAssetType+activeSlot (one-active-per-scope).

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 1,414 |
| Latest createdAt | 2026-06-15 |
| Status breakdown | ACTIVE: 52; RISK_WARNING: 1,126; INVALIDATED: 236 |

**Notable:** 1,126 entries (80%) are in RISK_WARNING state — the ledger is populated but most prior entries have triggered risk warnings rather than clean exits. Only 52 currently ACTIVE.

### Endpoints / Readers
- `signal-position-ledger.repository.ts` — CRUD via `(this.db as any).signalPositionLedgerEntry` (uses raw cast due to Prisma type quirks)

---

## 15. WorkbenchSnapshot — `workbench_snapshots`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| instrumentId | String | @unique — one per instrument |
| stock | FK → stocks.id (Cascade) | |
| symbol | String | |
| computedAt | DateTime | default now() |
| dataThroughDate | DateTime? | |
| payloadJson | Json | full workbench payload (overview/chart/performance/fundamentals/valuation/peers/relative_strength/corporate_actions/trust/signalEvidence) |

**Indexes:** instrumentId, computedAt.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 2,972 |
| computedAt range | 2026-06-06 to 2026-06-15 |
| dataThroughDate non-null | 2,972 / 2,972 (100%) |

**Active, fresh.** One snapshot per instrument; all computed within last 10 days and all have dataThroughDate populated.

### Endpoints / Readers
- `workbench-snapshot.repository.ts` — upsert, findUnique, findMany (by computedAt)
- `market-intelligence/instrument-context.service.ts` — reads via `prisma.workbenchSnapshot.findUnique`

---

## 16. EarningsIntelligenceSnapshot — `earnings_intelligence_snapshots`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| snapshotDate | DateTime | |
| dataThroughDate | DateTime? | |
| stockId | String | FK → stocks.id (Cascade) |
| symbol | String | |
| scopeRegion, scopeAssetType | String | |
| resultDate? | DateTime? | |
| resultDateSource | String | default "UNKNOWN" |
| periodEndDate? | DateTime? | |
| validatedAt? | DateTime? | |
| daysToResult? | Int? | |
| revenueGrowth?, profitGrowth?, epsGrowth?, marginTrend? | Float? | |
| consistencyScore, accelerationScore | Float | |
| reasonTags, riskTags, warnings, categories | Json | default "[]" |
| freshness | String | |
| calculationVersion | String | default "earnings-intelligence-v1" |

**Unique:** (snapshotDate, scopeRegion, scopeAssetType, symbol).

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 16,194 |
| Latest snapshotDate | 2026-06-15 |
| Scope breakdown | IN/STOCK: 15,681 rows (latest 2026-06-15); EU/STOCK: 297 (latest 2026-06-08); US/STOCK: 216 (latest 2026-06-12) |
| dataThroughDate non-null (IN) | 15,681 / 15,681 (100%) |
| resultDate non-null (IN) | 10,784 / 15,681 (69%) — 31% missing result date |
| revenueGrowth non-null (IN) | 15,283 / 15,681 (97%) |
| revenueGrowth non-null (EU) | 2 / 297 (0.7%) — EU fundamentals almost entirely missing |
| revenueGrowth non-null (US) | 0 / 216 (0%) — US earnings growth data absent |

**Notable:** EU and US scopes have effectively no growth data — EU has 2 rows with revenueGrowth, US has 0. Earnings intelligence is only meaningfully operational for IN/STOCK.

### Endpoints / Readers
- `earnings-intelligence.repository.ts` — upsert, findFirst, findMany

---

## 17. StockInterestSnapshot — `stock_interest_snapshots`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| snapshotDate, dataThroughDate?, generatedAt | DateTime | |
| stockId | String | FK → stocks.id (Cascade) |
| symbol, company | String | |
| sector? | String? | |
| scopeRegion, scopeAssetType | String | defaults IN/STOCK |
| timeframe | String | default "1d" |
| category | String | |
| score | Float | |
| direction | String | |
| reasonTags, riskTags, warnings | Json | default "[]" |
| freshness | String | |
| calculationVersion | String | default "stock-interest-v1" |

**Unique:** (snapshotDate, scopeRegion, scopeAssetType, timeframe, category, symbol).

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 9,092 |
| Latest snapshotDate | 2026-06-15 |
| dataThroughDate non-null | 9,000 / 9,092 (99%) |

**Active.** Well-populated and fresh.

### Endpoints / Readers
- `market-intelligence/stock-interest-snapshot.repository.ts` — upsert, delete, findFirst, findMany

---

## 18. MarketContextSnapshot — `market_context_snapshots`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| snapshotDate | DateTime | |
| region | String | default "GLOBAL" |
| regime | String | |
| regimeScore | Float | |
| breadthPercentAboveSma50?, breadthPercentAboveSma200?, advanceDeclineRatio? | Float? | |
| newHighCount?, newLowCount? | Int? | |
| macroStatus?, explanation? | String? | |
| breadthByCapBand? | Json? | |
| fearGreedIndex?, fearGreedLabel? | Float?/String? | crypto only |
| source, dataStatus | String | |

**Unique:** (snapshotDate, region). **Indexes:** snapshotDate.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 151 |
| Region breakdown | IN: 114 rows (latest 2026-06-15); GLOBAL: 16 (latest 2026-06-05); US: 12 (latest 2026-06-14); CRYPTO: 8 (latest 2026-06-15); NSE: 1 (2026-06-04 — stale) |

**GLOBAL region stale** (2026-06-05, 10 days old). NSE region appears to be a legacy/duplicate of IN and hasn't updated.

### Endpoints / Readers
- `historical-context-snapshots.repository.ts` — upsert, findMany, findFirst, count

---

## 19. MarketPulseSnapshot — `market_pulse_snapshots`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| snapshotDate | DateTime | |
| dataThroughDate | DateTime | |
| generatedAt | DateTime | |
| region, assetType, timeframe | String | |
| status | String | |
| marketHealthScore, marketHealthLabel | Float/String | |
| indexTrendScore, sectorStrengthScore, breadthScore, deliveryParticipationScore, dataFreshnessScore | Float | |
| topIndicesJson, strongSectorsJson, weakSectorsJson | Json | |
| breadthSummaryJson, deliverySummaryJson | Json | |
| vixSummaryJson?, advanceDeclineJson? | Json? | |
| candidateCount | Int | |
| warningsJson, sourceSummaryJson | Json | |
| pipelineRunId? | String? | |

**Unique:** (snapshotDate, region, assetType, timeframe).

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 19 |
| pipelineRunId non-null | 1 / 19 (5%) — nearly all without pipeline linkage |
| Status | All IN/STOCK rows show "PARTIAL"; US/STOCK rows show "FRESH" |
| Latest | 2026-06-15 |

**Notable:** `pipelineRunId` is almost entirely null (only 1 row linked to a pipeline run). The table is lightly populated (19 rows total) and IN rows consistently show PARTIAL status — indicating the market pulse pipeline runs but doesn't fully resolve for India.

### Endpoints / Readers
- `market-context-intelligence/market-pulse-snapshot.repository.ts` — findFirst, findMany, upsert

---

## 20. SectorContextSnapshot — `sector_context_snapshots`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| snapshotDate | DateTime | |
| region | String | default "GLOBAL" |
| sector | String | |
| oneMonthReturn?, threeMonthReturn?, sixMonthReturn? | Float? | |
| relativeStrengthScore | Float | |
| instrumentCount | Int | |
| bullishSignalCount?, bearishSignalCount? | Int? | |
| leadershipStatus | String | |
| source, dataStatus | String | |

**Unique:** (snapshotDate, region, sector). **Indexes:** snapshotDate, sector.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 1,315 |
| Region breakdown | IN: 1,114 (latest 2026-06-15); US: 100 (latest 2026-06-14); GLOBAL: 101 (latest 2026-06-05 — stale) |

**GLOBAL stale** (same pattern as MarketContextSnapshot).

### Endpoints / Readers
- `historical-context-snapshots.repository.ts` — upsert, findMany, findFirst

---

## 21. SectorSnapshot — `sector_snapshots`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| snapshotDate | DateTime | |
| dataThroughDate | DateTime | |
| scopeRegion, scopeAssetType | String | defaults IN/STOCK |
| sector | String | |
| classification | String | |
| sectorScore | Int | |
| return1W?, return1M?, return3M? | Float? | |
| trendScore | Int | |
| reasonTags, warnings | Json | default "[]" |
| source | String | default "sector-intelligence" |

**Unique:** (snapshotDate, scopeRegion, scopeAssetType, sector). **Indexes:** scopeRegion+scopeAssetType+snapshotDate, dataThroughDate, classification+sectorScore.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 226 |
| Scope breakdown | IN/STOCK: 160 rows (latest 2026-06-15); US/STOCK: 66 (latest 2026-06-14) |

Active, fresh for both regions.

### Endpoints / Readers
- `market-intelligence/instrument-context.service.ts` — reads via `(prisma as any).sectorSnapshot.findFirst`

---

## 22. CountryContextSnapshot — `country_context_snapshots`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| snapshotDate | DateTime | |
| region | String | default "GLOBAL" |
| country | String | |
| oneMonthReturn?, threeMonthReturn?, sixMonthReturn? | Float? | |
| relativeStrengthScore | Float | |
| bullishSignalCount?, bearishSignalCount? | Int? | |
| source, dataStatus | String | |

**Unique:** (snapshotDate, region, country). **Indexes:** snapshotDate, country.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 173 |
| Region breakdown | IN: 114 (latest 2026-06-15); US: 15 (latest 2026-06-14); GLOBAL: 44 (latest 2026-06-05 — stale) |

Same staleness pattern on GLOBAL as other context snapshots.

### Endpoints / Readers
- `historical-context-snapshots.repository.ts` — upsert, findMany, findFirst, count

---

## 23. SmartMoneyContextSnapshot — `smart_money_context_snapshots`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| snapshotDate | DateTime | |
| instrumentId | String | FK → stocks.id (Cascade) |
| symbol, companyName?, sector? | String? | |
| smartMoneyScore | Float | |
| status, confidence | String | |
| accumulationSignalCount, distributionSignalCount | Int | |
| unusualVolumeDetected | Boolean | |
| explanation? | String? | |
| source, dataStatus | String | |
| latestClose?, latestVolume?, averageVolume20?, dailyChangePercent? | Float? | |
| signals?, insiderOwnership? | Json? | |
| range | String | default "3M" |

**Unique:** (snapshotDate, instrumentId, range). **Indexes:** snapshotDate, instrumentId, sector, status+smartMoneyScore.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 140,220 |
| Range breakdown | 1M: 45,647; 3M: 48,926; 6M: 45,647 |
| Latest snapshotDate | 2026-06-15 |

**Largest snapshot table** in this group at 140k rows. Three time-range variants per instrument per day. Active and fresh.

### Endpoints / Readers
- `historical-context-snapshots.repository.ts` — upsert, findMany, findFirst, count
- `market-intelligence/instrument-context.service.ts` — reads via portfolio snapshot context

---

## 24. DataQualitySnapshot — `data_quality_snapshots`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| snapshotDate | DateTime | |
| instrumentId | String | |
| symbol | String | |
| priceHistoryDays | Int | |
| hasLatestPrice, hasFundamentals, hasSector, hasIndustry | Boolean | |
| dataStatus | String | |
| signalReadinessScore | Float | |

**Unique:** (snapshotDate, instrumentId). **Indexes:** snapshotDate, instrumentId.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 24,926 |
| snapshotDate range | 2026-04-27 to 2026-06-15 |
| Distinct instruments | 2,965 |

**Note:** This is an older/legacy table. It has a narrower schema compared to `DataQualityEvaluation` (no JSON fields for gaps/blockers, no eligibility flags). The `DataQualityEvaluation` table (one row per instrument) appears to be the current authoritative source. This table holds daily history per instrument per date.

### Endpoints / Readers
- `historical-context-snapshots.repository.ts` — upsert, findMany, findFirst, count

---

## 25. MarketScanSnapshot — `market_scan_snapshots`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| scanType | String | MOVERS_GAINERS\|MOVERS_LOSERS\|52W_HIGH\|52W_LOW\|DELIVERY_SPIKE\|VOLUME_SPIKE\|MARKET_MAP |
| scanRange | String? | 1D\|1W\|1M\|3M\|6M\|1Y (null for non-mover scans) |
| region, assetType | String | |
| tradingDate | DateTime | |
| rank | Int | 1-based within type+range+scope+date |
| payloadJson | Json | full row payload (shape varies by scanType) |
| computedAt | DateTime | |

**Unique:** (scanType, scanRange, region, assetType, tradingDate, rank). **Indexes:** lookup by type+range+scope+date, date+scope.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 5,815 |
| Latest tradingDate | 2026-06-15 (IN); 2026-06-12 (US) |
| Scan types | MOVERS_GAINERS/LOSERS (6 ranges each), 52W_HIGH, 52W_LOW, DELIVERY_SPIKE, VOLUME_SPIKE, MARKET_MAP (6 ranges) |
| Scopes | IN/STOCK (all types); US/STOCK (movers, 52W, MARKET_MAP — no DELIVERY_SPIKE/VOLUME_SPIKE) |

Active and fresh. MARKET_MAP is a new scan type not in the schema comment (added after).

### Endpoints / Readers
- `market-data-foundation/analytics/market-data-foundation.serving.scan-reads.ts` — reads via `(db as any).marketScanSnapshot`
- `market-data-foundation/ingestion/market-data-foundation.ingestion.scan-snapshots.ts` — deleteMany + createMany (refresh)

---

## 26. ResearchOverviewSnapshot — `research_overview_snapshots`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| region, assetType | String | |
| overviewJson | Json | full ResearchOverview DTO |
| marketGate | String | denormalized for cheap queries |
| overallStatus | String | denormalized |
| dataGaps | String[] | |
| computedAt | DateTime | |

**Unique:** (region, assetType). **Indexes:** region+assetType+marketGate+overallStatus.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 3 |
| Contents | IN/STOCK (computedAt 2026-06-15, marketGate=SELECTIVE, status=UNPROVEN); US/STOCK (2026-06-14, OPEN, UNPROVEN); EU/STOCK (2026-06-08 — stale, UNKNOWN, INSUFFICIENT_DATA) |

**EU/STOCK stale** (last computed 7 days ago). Only 3 rows total (one per active region scope). The `GET /research/overview` endpoint reads from this table.

### Endpoints / Readers
- `research-hub.service.ts` — findUnique (read) + upsert (refresh) via `(this.db as any).researchOverviewSnapshot`
- `scripts/seedResearchOverview.ts` — one-time seed script

---

## 27. PortfolioIntelligenceSnapshot — `portfolio_intelligence_snapshots`

### Schema
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| portfolioId | String | @unique — one per portfolio |
| portfolio | FK → portfolios.id (Cascade) | |
| computedAt | DateTime | |
| healthScore | Int | denormalized |
| status | String | HEALTHY\|WATCH\|AT_RISK |
| payloadJson | Json | full PortfolioIntelligenceResponse |

**Unique:** portfolioId. **Indexes:** portfolioId+computedAt.

### Population
| Metric | Value |
|---|---|
| Row count (exact) | 2 |
| Contents | Portfolio 1: HEALTHY, computedAt 2026-06-06; Portfolio 2: HEALTHY, computedAt 2026-06-07 |
| Staleness | Both snapshots are 8-9 days old |

**STALE.** Only 2 portfolio snapshots exist and both are nearly 9 days old. `GET /portfolios/:id/intelligence` reads from here without recomputation — users would see week-old intelligence until a refresh runs.

### Endpoints / Readers
- `portfolio-intelligence.repository.ts` — upsert (write), findUnique (read)
- `scripts/seedPortfolioIntelligence.ts` — seed script

---

## Summary Findings

### Empty / Near-Empty Tables (schema exists, barely used)
| Table | Rows | Finding |
|---|---|---|
| `portfolio_intelligence_snapshots` | 2 | Only 2 portfolios tracked; both snapshots 8-9 days stale |
| `research_overview_snapshots` | 3 | EU/STOCK stale (7 days); only 3 total rows |
| `strategy_performance_summaries` | 41 | Very small; most strategies UNPROVEN or NOT_ELIGIBLE |
| `strategy_definitions` | 11 | Small reference table (expected); all RESEARCH_ONLY |
| `today_review_runs` | 30 | Intentionally small (one per day/scope) |
| `market_pulse_snapshots` | 19 | Lightly populated; pipelineRunId 95% null |

### Stale Snapshot Tables (data present but not updated recently)
| Table | Stale Scope | Last Updated |
|---|---|---|
| `market_context_snapshots` | GLOBAL | 2026-06-05 (10 days) |
| `market_context_snapshots` | NSE (legacy) | 2026-06-04 (11 days) |
| `sector_context_snapshots` | GLOBAL | 2026-06-05 (10 days) |
| `country_context_snapshots` | GLOBAL | 2026-06-05 (10 days) |
| `research_overview_snapshots` | EU/STOCK | 2026-06-08 (7 days) |
| `portfolio_intelligence_snapshots` | all | 2026-06-06 / 2026-06-07 (8-9 days) |
| `earnings_intelligence_snapshots` | EU/STOCK, US/STOCK | 2026-06-08 / 2026-06-12 (partial) |

### Richly Populated / Active Tables
| Table | Rows | Notes |
|---|---|---|
| `strategy_decision_results` | 296,118 | Largest; all key columns populated; daily production |
| `smart_money_context_snapshots` | 140,220 | Three time-ranges per instrument; fresh |
| `signal_outcomes` | 105,610 | Outcome tracking; only 8% resolved (dataComplete=true) |
| `signal_results` | 43,410 | Active signal pipeline output; all fully populated |
| `pipeline_stage_runs` | 34,755 | Operational log; active |
| `data_quality_snapshots` | 24,926 | Daily per-instrument quality history |
| `earnings_intelligence_snapshots` | 16,194 | Active for IN; sparse for EU/US |
| `data_quality_evaluations` | 10,071 | Current state per instrument; well-populated |
| `signal_calibration_results` | 10,514 | Calibrated signals; active |
| `stock_interest_snapshots` | 9,092 | Interest scoring per instrument; fresh |

### Notably Null Important Columns
| Table | Column | Null Rate | Impact |
|---|---|---|---|
| `signal_outcomes` | `benchmarkReturnPercent` | 100% null | CB-8 alpha calculation never ran |
| `signal_outcomes` | `alphaPercent` | 100% null | Derived; blocked by above |
| `signal_outcomes` | `futurePrice` / `forwardReturnPercent` | 92% null | Outcome resolution only at 8% |
| `signal_results` | `lifecycleState` | 56% null | Pre-migration rows; newer rows populated |
| `signal_results` | `priorScore` | 64% null | Populated only when prior run exists |
| `trade_plan_results` | `portfolioImpact` | 99.6% null | Portfolio-aware plans almost never generated |
| `trade_plan_results` | `backtestSummary` | 66% null | Backtest linkage incomplete |
| `signal_generation_runs` | `sourceDataDate` | 30% null | Older runs before field was required |
| `earnings_intelligence_snapshots` (IN) | `resultDate` | 31% null | 31% of IN instruments lack NSE result date |
| `earnings_intelligence_snapshots` (EU/US) | `revenueGrowth` | 99%+/100% null | Fundamentals data absent for non-IN |
| `market_pulse_snapshots` | `pipelineRunId` | 95% null | Pipeline not linking stage runs to pulse records |
