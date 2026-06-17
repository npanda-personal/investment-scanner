# Signal Generation Engine

The Signal Generation Engine owns daily/on-demand signal generation, composite scoring, and persistence. It is fully integrated with the **Global Market Scope**, allowing users to filter signals and generation runs by region.

## Global Market Scope Integration

All signal APIs and dashboard views respect the global `region` and `assetType` context:
- `region`: Filter signals by mapped exchanges and country metadata (IN, US, EU, GLOBAL).
- `assetType`: Filter signals by asset class (default: STOCK).

### Backend Support
The following filters are standardized in the `SignalQuery` and `SignalRunRequest` DTOs:
- `region`: Standard region code.
- `assetType`: Asset class code.

Repositories compose the shared `resolveMarketRegionFilter` helper through the `stock` relation for accurate regional filtering.

## API Reference

| Endpoint | Purpose | Region Support |
| --- | --- | --- |
| `GET /api/v1/signals/top` | Top signals with score thresholds | Supported |
| `GET /api/v1/signals/screener`| Filtered signal screener | Supported |
| `POST /api/v1/signals/run` | Manual generation for a region or list | Supported |

## Batch Generation Behavior

`POST /api/v1/signals/run` processes one bounded batch per request. It accepts `batchSize` or `limit`, `offset`, `region`, `assetType`, data-quality filter flags, optional Strategy Framework matching flags, and additive performance controls. Batch size defaults to 100 and is clamped to 100. The default is owned by `signal_generation_engine_batch_size` in the module config files, not by user input. `batchSize`/`limit` is a per-request batch size, not a total "run all" cap; full-universe execution is frontend orchestration over repeated bounded requests.

Within each backend batch, instruments are processed with bounded concurrency. `maxConcurrency` defaults to 4 from `signal_generation_engine_workers_count`, is clamped to 6 by `signal_generation_engine_max_workers_count`, and falls back to 1 for single-symbol/single-instrument runs. `providerThrottleMs` defaults to 250ms for full-context generation, but lightweight batch generation uses stored fundamentals only and does not provider-throttle because it avoids Yahoo fallback by design. The backend env overrides are module-scoped: `SIGNAL_GENERATION_ENGINE_WORKERS_COUNT` and `SIGNAL_GENERATION_ENGINE_PROVIDER_THROTTLE_MS`.

Batch generation uses `researchContextMode=LIGHTWEIGHT`. It reads the instrument, price history, and stored fundamentals needed for raw technical, momentum, and fundamental scoring, but it does not call the full Stock Research Workbench aggregate or fetch missing fundamentals from Yahoo for every instrument. Single-symbol/single-instrument generation still uses `researchContextMode=FULL`, so peer-relative context and provider-backed missing-fundamental recovery remain available for targeted inspection without multiplying user-facing research work across large universe runs.

Pipeline automation can call `SignalGenerationEngineService.run()` with explicit `instrumentIds`. That internal path bypasses region-wide pagination, keeps generation bounded to the upstream changed set, and still applies the same Data Quality filter and lightweight stored-data batch context. It is used by the scheduled Pipeline Orchestration `RAW_SIGNALS` stage after scheduled Data Quality completes.

The frontend dispatches bounded backend batches through a small module-owned request pool, `signal_generation_engine_batch_request_workers_count`, after the first response returns `totalCount`. This overlaps independent offsets while backend workers still bound per-batch CPU/database work. The request pool is intentionally hidden from users and should remain small.

The dashboard does not expose batch size or worker controls to users. It enables the Data Quality filter by default for manual full-scope generation so low-readiness rows are gated when evaluations exist, while missing evaluations can still warn and process according to backend request settings. To adjust local operational defaults, edit:
- `frontend/src/features/signal-generation-engine/config.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.config.ts`

The frontend owns user-triggered full-universe orchestration: it starts with `offset=0`, calls the backend once per batch, advances with `nextOffset`, and stops only when `hasMore=false` or a fatal batch error occurs. The run button stays disabled while this loop is active and the dashboard shows a real progress bar based on `processedCount / totalCount`.

The run response remains backward-compatible with `generated`, `skipped`, `errors`, `warnings`, `results`, and `generated_at`, and additively includes `processedCount`, `totalCount`, `batchSize`, `maxConcurrency`, `providerThrottleMs`, `offset`, `nextOffset`, `hasMore`, `generatedCount`, `updatedCount`, `noOpCount`, `skippedCount`, `failedCount`, `directionCountsGenerated`, `scope`, `latestGeneratedAt`, `eligibleInstrumentCount`, `attemptedGenerationCount`, and `durationMs`. One instrument failure increments `failedCount` and does not stop the rest of the batch when the remaining instruments can continue safely.

`SignalResult` persistence is idempotent by `instrumentId + modelVersion + generatedDate`. Same-day reruns update the logical row instead of creating duplicates. The repository also exposes additive write status metadata (`CREATED`, `UPDATED`, `NO_OP`) so run summaries can distinguish new rows from same-day updates and unchanged reruns.

When `useDataQualityFilter=true`, the response includes data-quality counts: `beforeFilter`, `afterFilter`, `eligibleInstrumentCount`, `attemptedGenerationCount`, `excludedByDataQuality`, and `missingQualityEvaluationCount`. These counts are separate from generation failures so skipped rows are easier to diagnose.

Raw signal scoring and direction thresholds are unchanged.

## Table/List Behavior

`GET /api/v1/signals/top` and `GET /api/v1/signals/screener` support `region`, `assetType`, `direction`, `confidence`, `minScore`, `signalType`, strategy filters, `limit`, `offset`, `sortBy`, and `sortDirection`. Direction filters are normalized case-insensitively to stored values: `BULLISH`, `NEUTRAL`, and `BEARISH`. Region inputs are normalized to canonical scope codes, and `assetType=STOCK` includes current `STOCK` rows plus existing `EQUITY` and legacy `null` stock asset types so scoped signal lists remain compatible with the current catalog.

Latest means the actual latest persisted signal per instrument. List endpoints first reduce to the latest row per instrument within scope/date/search filters, then apply `direction`, `confidence`, `minScore`, and `signalType`. This prevents an older bullish row from appearing when the current latest row is neutral or bearish.

List responses still return `signals`, `total`, `limit`, and `offset`, and add `items`, `totalCount`, `hasMore`, `filtersApplied`, `scope`, and `directionCounts`. Direction counts are scoped to the current region/asset type and current non-direction filters so tabs can show `Bullish (X)`, `Bearish (Y)`, and `Neutral (Z)`. Counts are based on latest rows, not historical rows.

Supported `sortBy` values are allowlisted: `score`, `symbol`, `companyName`, `generatedAt`, `direction`, `confidence`, and `dailyChangePercent`. Unknown sort fields safely fall back to `score`. `sortDirection` accepts `asc` or `desc`.

After the final frontend batch completes, the Signal Generation page resets pagination to page 1 and refetches the current table with the same `region` and `assetType` used for the run. The selected direction tab is preserved. If the selected tab has no rows but other directions do, the empty state explains the available direction counts instead of contradicting the run summary.

Known limitations:
- The dashboard does not currently implement cancel/retry for signal generation batches.
- Data quality filtering is applied per bounded batch; progress metadata is based on the selected scoped instrument universe.
- List retrieval currently reduces latest rows in application code after a scoped Prisma fetch. This is acceptable for local-sized universes but should become a window-function/raw-query or dedicated latest table if the persisted signal history grows substantially.
- Enrichment still performs per-row previous-close lookups and per-row strategy price-history lookups when strategy matching is requested because no public batch previous-close/history API exists yet.
- Backend batch offsets are expected to use the `nextOffset` returned by the previous response. Arbitrary non-batch-aligned offsets are not a supported user workflow.
- The dashboard intentionally does not expose sorting by enriched price or daily-change fields because those values are calculated after the persisted signal page is selected. Server-backed sorting is limited to persisted signal fields such as score, symbol, direction, confidence, and generated time.

## Business Logic & Data Sources (per data point)

The table below describes every input the scoring engine consumes, what the engine does with it, and where it originates. "EXTERNAL" means the raw data is fetched from an outside provider; "INTERNAL" means the value is produced by another module in this codebase and arrives via a persisted read or a service call.

| Input | Meaning & how it is used | Source type | Provider / module |
|---|---|---|---|
| Price history (OHLCV + adjusted_close / adjusted_high / adjusted_low / adjusted_volume) | Drives all technical and momentum factors: SMA-50, SMA-200, RSI-14, ADX-14, ATR-14, OBV trend, 52-week high/low, 1M/3M/6M return. 520 trailing bars are loaded per instrument (`SIGNAL_GENERATION_PRICE_WINDOW`). Adjusted fields are preferred over raw so corporate-action splits do not distort indicators. | EXTERNAL (raw) / INTERNAL (read) | Yahoo Finance (global prices, US equities); NSE EOD (India equities). Accessed via `market-data-foundation` price reads. |
| Delivery % (NSE only) | Additive conviction annotation: high delivery (≥ 40 %) suggests institutional/positional interest; low delivery (< 20 %) flags intraday churn. **Does not alter the composite score** — surfaced only in the signal explanation text. Gated on `SignalScoringConfig.hasDelivery`; non-NSE scopes (US / EU / crypto) never read or annotate it. | EXTERNAL (raw) / INTERNAL (read) | NSE bhavcopy delivery data; accessed via `market-data-foundation`. India-only. |
| Fundamentals — EPS (`eps`), P/E ratio (`pe_ratio`), dividend yield (`dividend_yield`), net income (`net_income`), revenue (`revenue`), market cap (`market_cap`) | The Prisma `Fundamental` model exposes exactly these six fields. Used for: positive/negative EPS vote (PROFITABILITY family); P/E vs peer-average vote (VALUATION family, v3+v4); yield vs peer-average vote (INCOME family, v3+v4); net-margin quality vote `net_income / revenue` (PROFITABILITY family, **v4 only** — SG-5). `market_cap` is used for reliability-tier classification, not scoring. **ROE, debt ratios, margins history, earnings-surprise, and revenue/earnings growth are not ingested** — the engine cannot vote on them. | EXTERNAL (raw) / INTERNAL (read) | NSE XBRL filings (India); SEC EDGAR filings (US). Accessed via `market-data-foundation` fundamentals reads. |
| Peer averages (`peer_average_pe`, `peer_average_dividend_yield`, `relative_to_peer_average`) | Used for P/E vs peers, yield vs peers, and outperforming/underperforming peers momentum votes. Computed as the average of top peers in the same sector and region, ordered by market cap. **Available in FULL (single-symbol) mode only today.** Batch mode does not call the workbench aggregate, so these fields are null for all batch-generated signals (SG-4, pending). | INTERNAL | `stock-research-workbench` (same sector + region, top peers by market cap). FULL mode only (`researchContextMode=FULL`). |
| Market regime / breadth / sector leadership | Regime gate: when `RISK_ON` and `regimeGateShortsEnabled` is true, bearish signals on non-derivatives instruments are downgraded to `risk_warning` and confidence is lowered. Breadth below `BREADTH_WEAK_THRESHOLD` is annotated; very weak breadth below `BREADTH_VERY_WEAK_THRESHOLD` suppresses longs additionally. Regime is region-scoped — an IN regime snapshot never bleeds into a US/EU signal run. | INTERNAL | `market-context-intelligence` persisted snapshots (region-scoped). |
| Smart-money status / score | Surfaced as strategy-framework enrichment context (blockers / data-gaps) when strategy matching is requested. Never alters the raw composite score. Absent context is reported as a `dataGap`, not treated as healthy. | INTERNAL | `smart-money-intelligence` persisted snapshots; batch-fetched per instrument batch during strategy-aware enrichment. |
| Data-quality eligibility verdict | Gates the instrument universe before generation when `useDataQualityFilter=true`. Instruments flagged NOT_READY or INELIGIBLE are excluded and counted in `excludedByDataQuality`. Strategy Framework also gates on the DQ verdict — a missing or ineligible verdict blocks a strategy match from reaching `SOURCE_PROVEN`. | INTERNAL | `data-quality-engine` (verdict persisted-read; `filterByVerdict()` call). |
| Calibration overlay | Persisted-read overlay joining the latest `SignalCalibrationResult` per instrument to signal list responses. Never triggers a live recompute; absent when the reader is not injected. Exposes `calibratedScore` and `calibratedDirection` alongside the raw score. | INTERNAL | `signal-calibration-engine` persisted snapshots (persisted-read only; injected as `CalibrationPersistedReader`). |

## Scoring engine versions (v3 to v4) & region isolation

### Engine versions

Two composite engines coexist and are selected by `SignalScoringConfig.scoringEngineVersion`:

**v3 — legacy count-based composite** (`modelVersion: 'signal-engine-v3'`)

The original scoring path. Composite is an evidence-scaled weighted average of three Laplace-smoothed Bayesian category fractions. Evidence scaling uses a raw aligning-signal count (not decorrelated) and a cross-category agreement fraction. Category weights are fixed regardless of which categories have evidence. Confidence is graded on data sufficiency alone (bars / fundamentals / signal count / staleness). The crypto lane and the `DEFAULT_SIGNAL_SCORING_CONFIG` both use v3. v3 scoring is reproduced byte-for-byte when the default config is supplied, so all existing India-equity scoring and crypto scoring are unchanged.

**v4 — evidence model** (`modelVersion: 'signal-engine-v4'`)

Activated by passing `engineVersion: 'v4'` to `resolveSignalScoringConfig`. Live manual generation uses v4; the crypto lane and DEFAULT config stay on v3. Persistence is keyed by `modelVersion`, so a v4 run produces distinct rows that do not overwrite v3 rows.

v4 fixes identified in the evidence-model design:

- **Per-instrument no-evidence weight redistribution (fix #2)**: a category that produces zero evidence for a given instrument has its weight dropped to zero and the remaining category weights are renormalized. Under v3, a category with no evidence is pinned at a neutral 0.5, dragging the composite toward NEUTRAL even when the other two categories are in strong agreement.
- **Family-decorrelated conviction (fix #3)**: the count component of the evidence factor is driven by the number of distinct `FactorFamily` values that fired in the dominant direction (TREND, BREAKOUT_LEVEL, MEAN_REVERSION, OVEREXTENSION, VOLUME, MOMENTUM, RELATIVE_STRENGTH, PROFITABILITY, VALUATION, INCOME), not the raw count of collinear signals. Seven signals from one uptrend count as a small number of independent families, not seven separate confirmations. Defined in `signal-evidence.ts`.
- **Graded per-factor strength (fix #4)**: each factor contributes a base strength in (0, 1] via `STRENGTH_BY_CODE` rather than a uniform binary vote. Confirmed or extreme factors (e.g. `CONFIRMED_VOLUME_BREAKOUT`, `RSI_EXTREME_OVERBOUGHT`, `SIX_MONTH_ACCELERATION`) carry higher weight than their bare counterparts.
- **Monotonic composite (fix #7)**: `compositeV4` never removes a vote — adding a same-direction factor can only raise, never lower, the composite score.
- **Vol-normalized momentum thresholds (SG-3)**: on the v4 path, `volatilityScale()` computes the instrument's own trailing 63-day daily-return volatility and scales the 1M/3M momentum bullish/bearish thresholds proportionally (clamped to [0.5, 2.5] × reference). A high-beta name therefore needs a proportionally larger move to cast a bullish momentum vote; a low-vol name can vote on a smaller move. Falls back to scale = 1 when history is insufficient (matches fixed v3 thresholds).
- **Net-margin quality vote (SG-5)**: v4 adds a derived fundamental vote: `net_income / revenue ≥ 10 %` → `HEALTHY_NET_MARGIN` (PROFITABILITY family); `< 0` → `NEGATIVE_NET_MARGIN`. This is the only derived quality vote because `net_income` and `revenue` are the only extra fundamental fields actually ingested beyond EPS. ROE, debt ratios, and growth metrics are not sourced.
- **Conviction-based confidence (SG-6)**: `signal-confidence.ts` (`resolveConfidence`) adds the v4 composite's `|displacement|` (how far the weighted lean sits from 0.5) to the confidence tier. Both data sufficiency **and** conviction must clear the bar — a score sitting at 51 on thin evidence no longer qualifies as HIGH confidence. The `dataComplete` flag is surfaced separately so the UI can distinguish thin data from low conviction. The conviction fed into the tier is the breadth-gated `effectiveDisplacement` (below), not the raw displacement.
- **Evidence-breadth gate (SG-9)**: a BULLISH/BEARISH call requires confirmation across more than one analysis dimension. v4's per-instrument weight redistribution (fix #2) plus agreement-over-evidenced-categories means a single evidenced category otherwise yields a renormalized weight of 1.0 *and* agreement = 1.0, so one moving-average vote (or several collinear technical families) could reach a confident BULLISH score (~73) that the v3 path (which dilutes via the two neutral-0.5 categories) keeps NEUTRAL (~54). `compositeV4` now requires evidence from at least `minBreadthCategories` (default 2) of the technical/momentum/fundamental categories; when fewer carry evidence, a directional score is **capped into the NEUTRAL deadband** (`bullish − 1` / `bearish + 1`) and the reported conviction (`effectiveDisplacement`) is reduced proportionally. Category breadth — not intra-category family count — is the independence unit, so a lone category cannot bypass the gate by firing several families, and the cap holds regardless of how strong that single dimension is. Symmetric for longs and shorts; monotonicity-preserving. The knob lives in `V4EvidenceConfig` / `DEFAULT_V4_EVIDENCE` and is overridable per cohort via the optional `SignalScoringConfig.v4Evidence`; the v3 path never reads it, so crypto/legacy scoring stays byte-identical.

v4 explainability rides in `scoringInputSummary.v4` (a `V4Components` object: `rawLean`, `displacement`, `evidenceFactor`, `alignedFamilies`, `effectiveWeights`, `categoryHasEvidence`, `categoryScores`, plus the breadth-gate fields `evidencedCategories`, `breadthDamped`, `effectiveDisplacement`). This is stored as JSON in the existing `scoringInputSummary` column — no schema change is required.

### Region isolation (SG-1)

Region is resolved via `signal-scope.ts` before every read, generation step, and context lookup. The isolation contract is:

- A **concrete region** (IN / US / EU) is applied strictly to every price read, fundamentals read, peer-set selection, market-context lookup, smart-money lookup, and cohort key. Selecting US or EU never surfaces Indian data, and vice versa.
- **GLOBAL** is an explicit cross-region aggregate, never a silent default. It is never assigned to an absent or unknown region input.
- An **unknown or absent region** resolves to GLOBAL (cross-region aggregate), not to IN. The legacy `canonicalRegion(value) || 'IN'` default and the repository's latestPersistedMarketContext IN fallback were both removed as part of SG-1.
- **Crypto** routes to the isolated crypto plane (`isCryptoPlane = true`, `cohortKey = 'CRYPTO|GLOBAL'`); it never mixes with equity instrument rows.
- The `cohortKey` (`<assetType>|<region>`, e.g. `STOCK|IN`, `STOCK|US`, `CRYPTO|GLOBAL`) is the isolation boundary for cross-sectional features such as vol-normalization, universe RS percentile, and peer aggregates (SG-2 / SG-3 / SG-4).
- `concreteRegionOrNull()` is the guard callers use for context reads: it returns null for GLOBAL or crypto, and callers must skip region-specific context rather than defaulting to IN.

## Scoring and Signals
Composite score (0-100) is calculated from Technical, Momentum, and Fundamental signals.

... (rest of definition remains same) ...

## Strategy Framework Integration

Raw signal generation remains owned here. Strategy Framework is consumed only as an opt-in strategy-aware enrichment path so existing signal behavior is preserved. Signal Generation resolves strategy matching through the Strategy Framework service contract, which reads persisted strategy definitions first and uses registry fallback definitions only when persistence is empty or unavailable.

Supported request/query flags:
- `strategyCode`
- `includeStrategyMatches`
- `onlyStrategyEligible`
- `excludeNoiseFiltered`
- `hasStrategyMatch`
- `hasBlockedStrategies`
- `frameworkBackedDecisionAvailable`

When enabled, signal results may include `strategyMatches[]` and `blockedStrategies[]` explaining which registered strategies matched or were blocked by noise filters/data gaps. These arrays are derived on demand and are not part of raw `SignalResult` persistence.

`strategyMatches[]` includes `strategyCode`, `strategyName`, `strategyVersion`, `decision`, `score`, `confidence`, `reasons`, `entryRulesPassed`, `timeframe`, `readinessLabel`, `ratingGrade`, `strategyDefinitionSource`, and `strategyDefinitionDrift`. The definition source/drift fields propagate Strategy Framework provider diagnostics so callers can distinguish persisted definitions from registry fallback definitions.

When a strategy-aware enrichment pass evaluates an ENTRY strategy against a local stored price row, the match may also include `triggerPriceEvidence`. This is compatibility-only evidence, not durable trigger persistence. It is marked `SOURCE_PROVEN` only when:

- the Strategy Framework result is bullish;
- at least one entry rule id/code is present;
- the latest local price row has a finite adjusted close;
- the latest local price row timestamp is available and, when the signal row has a source-price date, the two dates match;
- the strategy timeframe is available.

If any of those inputs is missing or mismatched, `triggerPriceEvidence.status` remains `UNAVAILABLE` with a reason. This prevents downstream consumers from confusing reference prices, entry zones, Trade Plan geometry, target prices, or R:R-derived values with a source-proven rule-trigger price.

Strategy matching passes latest-first price bars into Strategy Framework so registered strategies that require bar evidence, such as breakout base/volume checks, can use the same local source rows as the trigger-price evidence path.

Strategy matching passes the signal row's `dataQualityEligibility` into Strategy Framework. It does not infer Data Quality readiness from market-data row completeness. If DQ eligibility is missing, incomplete, limited, not ready, or ineligible, Strategy Framework returns a blocked strategy rather than a source-proven entry match.

When Strategy Framework matching is requested, Signal Generation uses persisted-only Market Context and Smart Money evidence when those module readers are available. It does not call on-demand Smart Money detail generation during signal list enrichment. Missing market, sector, or smart-money context remains visible as `blockedStrategies[].dataGaps` and must not be treated as healthy/supportive evidence.

`blockedStrategies[]` includes `strategyCode`, `strategyName`, `strategyVersion`, `timeframe`, `category`, `blockers`, `warnings`, `dataGaps`, `noiseFiltersTriggered`, a compact `reason`, definition source/drift diagnostics, and unavailable `triggerPriceEvidence` when an explicit strategy was evaluated but cannot produce a source-proven entry trigger. This preserves explicit strategy metadata for support/filter strategies without counting them as entry matches.

## Trigger Contract Projection

Signal responses add an optional module-local `triggerContract` projection for the first bounded `TriggerObjectV1` compatibility slice. The projection is derived only from current signal records and enrichment context.

The projection includes explicit `contractStatus`, `unavailable_fields`, `incomplete_reasons`, and `trigger_price_evidence` markers. It does not invent rule versions, trigger prices, lifecycle states, Data Quality evidence, strategy versions, timestamps, source data, or audit evidence when the current record cannot prove them.

When strategy-aware enrichment attaches source-proven trigger-price evidence, `triggerContract.trigger_price`, `trigger_timestamp`, `timeframe`, and `entry_rule_id` are populated from that evidence. The packet remains `CONTRACT_INCOMPLETE` while other required future fields such as exit/invalidation rule ids, lifecycle state, and persistence timestamps are unavailable.

Known limitations:
- `trigger_price` is available only as compatibility evidence during strategy-aware enrichment when the local source price row and Strategy Framework rule evidence prove it. It is not persisted as durable trigger audit evidence.
- Explicitly evaluated support/filter strategies can populate `strategy_id`, `strategy_version`, and `timeframe` in the trigger contract with `UNAVAILABLE` trigger-price evidence, but they cannot populate entry trigger price, timestamp, or entry rule ids.
- lifecycle status, exit/invalidation rule IDs, persistence `created_at`, and persistence `updated_at` remain unavailable unless future persistence work records them.
- Legacy rows without current audit or Data Quality snapshots are marked `LEGACY_INCOMPLETE`.
- Persisted trigger snapshots, normalized trigger tables, route changes, shared type changes, frontend changes, and downstream consumer adoption are separate future decisions.

Filtering behavior:
- `onlyStrategyEligible=true`: keeps signals with at least one Strategy Framework match.
- `excludeNoiseFiltered=true`: removes signals where all considered strategies were blocked by noise filters.
- `hasStrategyMatch=true`: keeps signals with at least one match.
- `hasBlockedStrategies=true`: keeps signals with at least one blocked strategy.
- `strategyCode=CODE`: evaluates only that registered strategy for enrichment/filtering.

Performance boundaries:
- Default signal endpoints remain lightweight unless strategy matching flags are present. The dashboard exposes "Show strategy context" as an explicit opt-in; otherwise Strategy Framework columns show that context is not loaded rather than implying no strategy match exists.
- Strategy matching runs only for returned rows.
- Matching fetches bounded price history for those rows and uses Strategy Framework evaluators instead of duplicating strategy rules.
- Individual Strategy Framework matching failures produce a blocked strategy entry instead of failing the whole signal response.

Product language:
- Raw signal score/direction is a confirmation input.
- Strategy Decision remains the candidate review surface.
- Signal UI should not label raw signals as trade decisions.

## Frontend Structure
- `SignalsDashboardPage`: Subscribes to `useMarketScope()`. Automatically refetches signals when the header region or asset type changes.
- `Manual Run`: Generation runs default to the active market scope, bounded module-owned batch settings, and the Data Quality filter enabled.
- `Strategy Context`: Strategy matching and blocked-strategy diagnostics are loaded only when explicitly requested or when strategy filters require them.
- `SignalTable`: Row click opens a raw-signal diagnostics drawer with score, direction, confidence, triggered/negative factors, warnings, and strategy context when loaded. Explicit buttons handle navigation to Research and Strategy Decision so table inspection does not unexpectedly route away.

## Tests
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`: Verifies idempotent upsert, write status, latest-row filtering, direction counts, asset scope compatibility, and sort allowlisting.
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`: Verifies scoring, thresholds, lightweight batch research context, batch metadata, data-quality counts, stale data warnings, confidence behavior, and Strategy Framework canonical region context.
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`: Verifies the optional trigger contract projection marks unavailable fields and legacy rows without inventing trigger evidence.
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`: Verifies query/run parsing, direction normalization, scope normalization, offset parsing, and sort allowlisting.

Verification commands:

```bash
npm run build
npm test -- signal-generation-engine --runInBand
```
