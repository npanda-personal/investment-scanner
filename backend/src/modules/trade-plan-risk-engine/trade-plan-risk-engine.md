# Trade Plan & Risk Management Engine

The Trade Plan & Risk Management Engine is responsible for converting strategy-backed candidates into practical trade-review plans.

It sits between the Strategy Decision Engine and the future Paper/Algo Trading modules.

## Ownership
It owns:
- Trade plan preview (entry zone, stop loss, target, R/R)
- Position sizing based on user portfolio or capital base constraints
- Portfolio exposure checks
- Risk grading
- Plan blockers and invalidation rules
- Plan persistence

It does NOT own:
- Raw signals
- Strategy rules
- Backtest simulation
- Market data ingestion
- Portfolio holdings
- Broker execution or order placement
- Live trading

## Hardening Audit Findings & Rules

### Paper Trading Readiness Audit

Current decision-to-plan flow status:

| Stage | Status | Issue | Severity | Current behavior | Expected behavior | Why it matters | Recommended fix | Safe now |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Market Data Foundation | PARTIAL | Latest price and history are consumed, but candidate listing does not join region/asset metadata directly. | MEDIUM | Generation reads latest price/history by instrument; persisted listing accepts `region`/`assetType` but cannot fully enforce them from the plan table alone. | Future paper review candidates must be scoped to region and `STOCK`. | Prevents cross-region or wrong-asset candidates. | Keep passing market scope to generation/listing; add natural scope fields to persisted plan model in a future migration. | No |
| Data Quality Engine | PASS | Readiness uses public service diagnostics/evaluations. | LOW | Blocks `UNUSABLE` coverage and `ILLIQUID`, warns on unknown/missing quality. | Data quality must be acceptable before paper review. | Avoids promoting stale or unusable data. | Continue consuming public service helpers; do not duplicate scoring. | Yes |
| Strategy Framework | PARTIAL | Old stored automation labels may exist. | HIGH | Repository maps old stored readiness values away for display; model now exposes conservative paper-test terminology. | No live-trading readiness label should be returned. | Prevents future paper module from confusing review readiness with live eligibility. | Keep mapping old values; run a future data cleanup migration. | Yes |
| Backtesting Strategy Lab | PARTIAL | Backtest proof is available through Strategy Framework performance summaries, not embedded in plans. | HIGH | Readiness classification checks for a Strategy Framework performance summary at list/generate time. | A selected timeframe backtest/rating must be present. | Future paper review needs historical simulation proof. | Persist selected timeframe/proof snapshot on plans in a future migration. | No |
| Strategy Decision Engine | PASS | Strategy decision proof is available through public service history/latest APIs. | LOW | Plan generation blocks CLOSED market gates and hard decision blockers. | Only candidate-level decisions with reasons and confidence may be promoted. | Prevents weak/blocked decisions from being reviewed as paper candidates. | Keep using public service APIs only. | Yes |
| Trade Plan & Risk Engine | PASS | Final readiness classifier added. | LOW | Plans now expose `paperReadinessStatus`, `paperReadinessReasons`, and `paperReadinessBlockers`; `paperReadyOnly=true` filters candidates. | Final pre-trade planning layer owns readiness classification. | Provides one safe upstream contract without creating paper trades. | Keep classifier here until a future paper module consumes it. | Yes |
| Research Hub | PARTIAL | Research priorities do not yet call Trade Plan readiness directly. | MEDIUM | Research Hub shows strategy proof and links users to plan review; wording avoids execution framing. | Hub may show "Paper Review Candidate" only as review context. | Prevents execution-like interpretation. | Future integration can read Trade Plan readiness through public API. | No |

### Persistence Audit

| Finding | Affected files | Severity | Current behavior | Expected behavior | Why it matters | Recommended fix | Safe now |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Region was not persisted | `schema.prisma`, repository, service | HIGH | Region was accepted in query/generation but not stored on `TradePlanResult`. | Every generated plan stores `region`. | Future paper review must respect market scope without re-querying upstream modules. | Added `region` column and DTO field. | Yes |
| Asset type was not persisted | `schema.prisma`, repository, service | HIGH | Asset scope was not stored. | Every generated plan stores `assetType`. | Future paper review is currently limited to `STOCK`. | Added `assetType` column and persisted from request/default scope. | Yes |
| Backtest timeframe was not persisted | repository, service, types | HIGH | Readiness looked up latest performance live. | Store selected/proven `backtestTimeframe` and compact summary. | Future consumers need auditable historical proof. | Added `backtestTimeframe`, `backtestSummary`, and proof snapshot. | Yes |
| Strategy proof/rating/readiness snapshot was missing | repository, service, types | HIGH | Rating and readiness were reconstructed during listing. | Store proof snapshot at generation time. | Prevents eligibility drift from live upstream changes. | Added `strategyProofSnapshot`, `strategyRating`, `readinessLabel`. | Yes |
| Latest price metadata was missing | repository, service, types | HIGH | Plan levels implied price but did not persist latest price timestamp/source. | Store latest price, timestamp, source/status, scope, currency/exchange. | Future review must know which price was used. | Added `latestPrice`, `latestPriceTimestamp`, `marketDataSnapshot`. | Yes |
| Data quality state was missing | repository, service, types | HIGH | Listing refreshed Data Quality Engine live. | Store available or missing data-quality snapshot. | Future review must not recompute readiness from DQE internals. | Added `dataQualitySnapshot`. | Yes |
| Strategy Decision state was missing | repository, service, types | HIGH | Plan stored only decision id. | Store decision/action/score/confidence/market gate/reasons/blockers snapshot. | Future review needs the decision state used when the plan was generated. | Added `strategyDecisionSnapshot`. | Yes |
| Paper readiness was not persisted | repository, service, types | HIGH | Previous response enriched readiness outside persistence. | Persist status, reasons, and blockers on the row. | Enables candidate filtering without live graph reconstruction. | Added readiness columns and repository mapping. | Yes |
| Candidate filtering recomputed readiness | service, repository | MEDIUM | `paperReadyOnly` loaded a broad set and reclassified. | Use persisted readiness/scope/proof fields. | Keeps listing fast and auditable. | Repository now filters persisted fields directly. | Yes |
| Daily idempotency ignored scope and portfolio | schema, repository | HIGH | Unique key was `instrumentId + strategy + modelVersion + generatedDate`. | Include `region`, `assetType`, and portfolio identity. | Prevents one scope or portfolio from overwriting another. | Unique key now uses `instrumentId`, `strategy`, `modelVersion`, `generatedDate`, `region`, `assetType`, and `portfolioKey`. | Yes |
| Legacy non-framework-backed plans polluted current views | repository, service | HIGH | Plans generated from old non-framework Strategy Decision rows could appear in current Trade Plan tables and blocker counts. | Current Trade Plan reads should show only Strategy Framework-backed proof by default; legacy rows should remain available only for audit. | Prevents stale legacy decisions from looking like valid current review-plan candidates. | Default list/detail/funnel reads now require `strategyProofSnapshot.frameworkBacked = true`; use `includeLegacy=true` for audit diagnostics. | Yes |

### Paper Readiness Contract

`paperReadinessStatus` is a classification only. It does not create paper trades and does not enable broker execution, order placement, live trading, or autonomous trading.

Status values:
- `READY_FOR_PAPER_REVIEW`: All readiness checks pass.
- `WATCH_ONLY`: The setup is reviewable but has proof, confidence, rating, or data-gap concerns.
- `BLOCKED`: A hard blocker exists.
- `INSUFFICIENT_DATA`: Required proof, price, history, plan geometry, or data quality is missing.

Readiness thresholds:
- Strategy proof: `frameworkBacked = true`, strategy code/version present, rating not `WEAK` or `UNPROVEN`, readiness label not `NOT_AUTOMATION_READY`, and a backtest summary is available.
- Strategy decision: decision must be `TRADE_CANDIDATE` or equivalent entry candidate, market gate must not be `CLOSED`, confidence must be `MEDIUM` or `HIGH`, reasons must exist, and hard blockers must be absent.
- Trade plan: `planStatus = VALID`, `riskGrade = LOW` or `MEDIUM`, entry zone/stop/target/position sizing/invalidation rules present, no hard blockers, and reward/risk must be at least `1.5`.
- Long-plan geometry: stop loss must be below the planned entry assumption. When an entry zone exists, the stop must be below the relevant entry-zone floor/planned entry; a stop inside the zone or above the planned entry blocks the plan and paper readiness.
- Canonical readiness: hard blockers are authoritative. If geometry or any other hard blocker sets `planStatus = BLOCKED`, the canonicalizer owns `riskGrade = HIGH`, `paperReadinessStatus = BLOCKED`, clears `paperReadinessReasons`, and records plan/blocker reasons in `paperReadinessBlockers`. Positive readiness reasons must not coexist with active blockers.
- Data quality: latest price present, sufficient price history, coverage not `UNUSABLE`, liquidity not `ILLIQUID`, and stale price warnings handled.
- Scope: region must be provided from global market scope and `assetType` must be `STOCK`.
- Safety: actions are review, plan, simulate, and paper review candidate only.

Batch-generated plans do not require a portfolio selection. When neither `portfolioId` nor `capitalBase` is supplied, the service uses the model `defaultCapitalBase` of `100000` only to estimate review quantity, max risk amount, and exposure percentage. This is a planning assumption, not a portfolio value and not execution sizing. Plans generated this way include a position-sizing note so paper-readiness is not blocked solely because the batch request omitted portfolio details.

Legacy Strategy Decision rows may not contain `strategyVersion`. Trade Plan snapshots continue to default the strategy version to `1.0.0` for the generated plan and readiness proof so otherwise valid framework-backed decisions are not blocked by a missing legacy version field.

## Persisted Proof Snapshot Contract

Each generated `TradePlanResult` persists these additive fields:

- Scope: `region`, `assetType`
- Strategy proof: `strategyRating`, `readinessLabel`, `backtestTimeframe`, `backtestSummary`, `strategyProofSnapshot`
- Strategy decision: `strategyDecisionSnapshot`
- Market data: `latestPrice`, `latestPriceTimestamp`, `marketDataSnapshot`
- Data quality: `dataQualitySnapshot`
- Readiness: `paperReadinessStatus`, `paperReadinessReasons`, `paperReadinessBlockers`
- Metadata: `proofGeneratedAt`, `snapshotVersion`

`strategyProofSnapshot` stores strategy code/version, rating, readiness label, whether the decision was Strategy Framework-backed, selected backtest timeframe, compact backtest metrics, `proofStatus`, and proof warnings.

`strategyDecisionSnapshot` stores decision id, decision/action, score, confidence, market gate/condition, framework flag, reasons, blockers, warnings, data gaps, and the decision generation timestamp.

`marketDataSnapshot` stores instrument id, symbol, latest price, latest price timestamp, latest completed/stored trading dates when available, currency, exchange, region, asset type, source, and data status.

Frontend money displays must use the persisted `marketDataSnapshot.currency` when present, with scoped fallback (`INR` for `IN`, otherwise `USD`). Entry, stop, target, position value, max risk, planning capital, and latest price should never be hardcoded to `$`.

`dataQualitySnapshot` stores coverage, signal-readiness, liquidity, scores, eligibility, warnings, blockers, and generation timestamp. If no data-quality evaluation exists, it stores `status: "MISSING"` with a warning and blocker.

`paperReadinessStatus`, reasons, and blockers are persisted at generation time. Candidate listing and funnel filters first run the same canonical geometry/readiness repair over the relevant stable scope, then apply persisted readiness/status/risk filters against repaired rows. This keeps `paperReadyOnly=true`, `paperReadinessStatus`, `planStatus`, `riskGrade`, totals, and funnel counts from selecting stale legacy rows whose stop/entry geometry is now blocked.

Latest-plan detail reads, candidate lists, and funnel reads apply the same long-plan geometry guard and readiness canonicalizer used during generation. If a persisted legacy row has a stop inside or above the long entry zone, the read path returns `BLOCKED` / `HIGH` / `paperReadinessStatus = BLOCKED`, clears stale positive readiness reasons, records the geometry blocker, and persists that repaired status back to the row. Stop-loss rationale repair is idempotent; repeated reads do not append the geometry text repeatedly. `INSUFFICIENT_DATA` plans keep `paperReadinessStatus = INSUFFICIENT_DATA` and `riskGrade = UNDEFINED`; generic data-gap blockers are not collapsed into `BLOCKED`. The detail UI deduplicates identical blocker text across readiness and plan-blocker sections so the same hard blocker is not rendered twice while the API still exposes both canonical arrays. This prevents old generated plans from continuing to appear `VALID` or paper-ready after the rule is fixed.

Future Paper Trading module rule: consume Trade Plan & Risk Engine public output and persisted snapshots only. It must not reach into upstream repositories or reconstruct eligibility from Strategy Decision, Strategy Framework, Market Data, or Data Quality internals.

## Idempotency

Generated plans are idempotent per UTC generated date using:

`instrumentId + strategy + modelVersion + generatedDate + region + assetType + portfolioKey`

`portfolioKey` is `portfolioId` when present and `NO_PORTFOLIO` otherwise. This avoids nullable-unique ambiguity for no-portfolio plans and lets same-day generation update the existing row/snapshots for the same instrument, strategy, scope, and portfolio context.

### Plan Status
- `VALID`: Requires R/R >= 1.5, good data quality, market gate open, robust stop/target methods.
- `WATCH`: Strategy is unproven, price is extended above preferred entry, or R/R is between 1.0 and 1.5.
- `BLOCKED`: R/R < 1.0, market gate CLOSED for long setups, unusable data quality, illiquid, or mathematically invalid target/stop geometry. For long plans, a stop inside or above the entry-zone floor/planned entry is a blocker.
- `INSUFFICIENT_DATA`: Missing latest price or sufficient price history to compute technicals.

### Risk Grade
- `LOW`: R/R >= 2.0, strategy rating GOOD/EXCELLENT, clean data quality, and strong stop methods.
- `MEDIUM`: R/R >= 1.5 with minor warnings.
- `HIGH`: Fallback stop methods used, strategy unproven, high volatility, or portfolio concentration limits breached.
- `UNDEFINED`: Insufficient data.

### Methodology
- **Entry Zone**: Evaluates Breakout vs Pullback. Flags `WEAK` quality if price is already extended far above SMA50 or recent breakout zones. Entry zones are normalized before stop/target/sizing. If current price is below the preferred zone, planning geometry uses the preferred entry floor and adds a waiting-for-entry warning; if current price is inside the zone, it uses current price; if price is above the zone, it uses current price so risk is not understated.
- **Stop Loss**: Prioritizes robust 10-day swing lows or SMA50 support. Falls back to ATR or fixed percentages (which flags `FALLBACK` quality and `HIGH` risk). Guards against stops being too tight (< 1%), above entry, or inside/above the long entry zone. The blocker text is: `Stop loss is inside or above the long entry zone; plan is blocked until the stop is below the planned entry floor.`
- **Target**: Defaults to 2R but flags `WEAK` if the expected move requires an unrealistic leap relative to recent volatility. Target <= Entry for longs results in `BLOCKED`.
- **Target Transparency**: 2R targets expose `target.method = REWARD_RISK_MULTIPLE`, `target.rationale = "Target is modeled at 2R by default."`, and target quality. This is modeled risk geometry, not a predicted price.
- **Position Sizing**: Safely scales based on `capitalBase`, actual connected portfolio value, or the model default planning capital base of `100000` when neither is supplied. Blocks quantities < 1. Exposes single-position portfolio concentration checks against a default 10% maximum.
- **Data Quality Integration**: Consumes `DataQualityEngineService`. Blocks on `UNUSABLE` coverage or `ILLIQUID` status.

## API Endpoints
- `GET /api/v1/trade-plans/health`
- `GET /api/v1/trade-plans/model` (Includes model rules, paper readiness criteria, thresholds, and safety constraints)
- `GET /api/v1/trade-plans/funnel` (Explains Raw Signals -> Strategy Decisions -> eligible plan candidates -> generated plans -> paper readiness for `region`, `assetType`, optional `strategyCode`, `generatedDate`, `from`, `to`, `backtestTimeframe`, and `includeLegacy`)
- `GET /api/v1/trade-plans/candidates` (Supports `region`, `assetType`, `strategyCode`, `planStatus`, `riskGrade`, `minRewardRisk`, `paperReadyOnly`, `paperReadinessStatus`, `backtestTimeframe`, `strategyRating`, `readinessLabel`, `portfolioId`, `includeLegacy`, `limit`, `offset`, `sortBy`, `sortDirection`)
- `GET /api/v1/trade-plans/:instrumentId` (Supports `region`, `assetType`, `strategyCode`, and `portfolioId`; scoped requests must not return a plan from a different market scope)
- `POST /api/v1/trade-plans/generate`
- `POST /api/v1/trade-plans/generate/batch` (Uses bounded backend worker concurrency within each request and returns `processedCount`, `candidateCount`, `rawCandidateCount`, `eligibleCandidateCount`, `generatedCount`, `skippedCount`, `paperReadinessSummary`, `topBlockers`, `totalCount`, `nextOffset`, `hasMore`, and per-candidate `failures` for frontend multi-batch orchestration)

## Generation Funnel Diagnostics

Trade Plan counts are expected to differ from Signal counts. Raw bullish or bearish signals are context only; batch Trade Plan generation does not generate plans directly from raw signals. The generation path is:

`Raw Signals -> Strategy Framework matches/context -> Strategy Decisions -> eligible entry candidates -> generated Trade Plans -> readiness classification -> Paper Ready`

The funnel endpoint returns:

- Raw signal counts by direction for the selected `region` and `assetType`.
- Strategy Decision counts by decision status, framework-backed status, and strategy.
- Candidate discovery counts, including skipped candidates and skip reasons before generation. The eligible-plan count is sourced from the same Strategy Decision review-candidate query used by batch generation, while the skip-reason breakdown is a bounded diagnostic sample.
- `strategyDecisions.tradeCandidates` is also sourced from the exact Strategy Decision candidate query used by batch generation, not from the bounded diagnostic sample. This prevents the funnel from showing one sampled candidate while the generator correctly finds many.
- Generated plan counts by plan status, risk grade, strategy, and paper readiness. When no date range is supplied, funnel diagnostics use the latest generated UTC date for the selected scope so stale older plan rows do not dominate current blocker counts.
- Generated plan lists, latest-plan detail reads, and funnel generated-plan counts are proof-safe by default. Rows whose persisted `strategyProofSnapshot.frameworkBacked` is not `true` are hidden unless `includeLegacy=true` is explicitly supplied. Legacy rows are kept for auditability and are not deleted.
- Paper readiness blocker/reason aggregation from persisted plan snapshots.
- Proof diagnostics by backtest timeframe and strategy rating.
- Data quality diagnostics for missing snapshots, unusable coverage, illiquidity, and unknown liquidity.
- Recommendations that explain whether caution is expected or data/proof should be regenerated.

Eligible long entry plan decisions:

- `TRADE_CANDIDATE`
- `ENTRY_CANDIDATE`

`WATCH` decisions are excluded from batch generation unless a future request explicitly enables watch-plan generation. They may still produce a `WATCH` plan when an explicit instrument/strategy generation request is made and the service determines the setup is reviewable but cautious.

Not eligible for long entry plan batch generation:

- `AVOID`
- `EXIT_CANDIDATE`
- `REDUCE_RISK`
- `HOLD`
- `INSUFFICIENT_DATA`
- `DEFENSIVE_EXIT` strategy decisions

Exit candidates may later receive a separate exit-review plan flow, but they are not mixed into long entry plan generation.

Common paper readiness blocker categories include:

- Weak or unproven strategy rating
- Missing backtest summary
- Missing data quality snapshot
- Market gate closed
- Plan status not valid
- Risk grade HIGH
- Reward/risk below threshold
- Missing or stale latest price
- Insufficient price history
- Missing Strategy Decision proof
- Not framework-backed
- Illiquid or unknown liquidity

Proof timeframe behavior:

- `backtestTimeframe` may be supplied to `POST /generate` and `POST /generate/batch`.
- Supported values are currently `1Y`, `3Y`, `5Y`, `10Y`, and `15Y` by convention.
- Existing persisted plans are not changed automatically when a new timeframe is selected.
- The funnel endpoint reports how many plans use each timeframe and recommends trying `3Y` or `5Y` when current plans are dominated by `10Y` proof and history is insufficient.
- Generated plans persist the requested proof timeframe even when the matching Strategy Framework performance summary is missing, so missing-proof diagnostics still show which timeframe was requested. Once the matching backtest summary exists, regenerating plans stores the actual proof summary for that timeframe.
- Default behavior remains the existing service behavior when no timeframe is supplied.

## Integration
- **Frontend Dashboard:** Available at `/trade-plans`. Integrates with the shared `DataTable` to provide pagination and sorting (e.g., on the Status and Risk Grade columns). Batch generation starts with one discovery batch, then runs remaining offsets with a small frontend worker pool.
- **Scoped Detail Reads:** `/trade-plans/:instrumentId` passes the global `region` and `assetType` to avoid showing wrong-scope persisted plans.
- **Persisted Geometry/Readiness Repair:** Detail, list, and funnel reads use the generation geometry guard and readiness canonicalizer, then update stale persisted status/risk/readiness/reasons/blockers when legacy rows are now blocked by stop/entry geometry. List filters and funnel counts are evaluated after repair so stale `READY_FOR_PAPER_REVIEW` rows cannot appear in paper-ready candidates.
- **Frontend Funnel Panel:** Shows raw bullish signals, Strategy Decision count, eligible review candidates, generated plans, paper-ready count, blocked/watch/insufficient count, top blockers, skipped candidate reasons, recommendations, and a zero-paper-ready explanation.
- **Candidate Taxonomy:** API fields retain `tradeCandidates` and `TRADE_CANDIDATE` for compatibility, but user-facing Trade Plan wording uses "eligible review candidates" and "paper review candidate" language.
- **Batch Progress UI:** Batch generation disables the run button, shows processed/total candidates, generated and failed counts, request count, and selected proof timeframe while requests are running. The final summary separates discovered, eligible, skipped, paper-ready, failed, and top blocker counts.
- **Batch Proof Selector:** The dashboard can send `backtestTimeframe` (`1Y`, `3Y`, `5Y`, `10Y`, `15Y`) during batch generation and includes the selected proof timeframe in completion messaging. The default generation proof is `3Y` because the current local IN/STOCK universe often lacks clean 10-year history.
- Can be triggered manually via `/api/v1/trade-plans/generate`.
- Reads `StrategyDecisionResult` from the database.
- Consumes `MarketDataFoundation` for the latest price and historical SMA approximation.
- Consumes `PortfolioManagement` for capital sizing and concentration checks.
- Consumes `DataQualityEngine` for signal readiness and liquidity blocking.

## Verification
- Prisma Client: `npx prisma generate` from `backend`
- Backend build: `npm run build` from `backend`
- Backend focused tests: `npm test -- --runInBand --runTestsByPath tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts` from `backend`
- Backend scope helper tests: `npm test -- --runInBand --runTestsByPath tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts tests/modules/strategy-decision-engine/strategy-decision-engine.repository.test.ts` from `backend`
- Frontend build: `npm run build` from `frontend`
- Frontend focused UI smoke: `npm run test:ui -- trade-plan-risk-engine.spec.ts --output=playwright-results-trade-plan` from `frontend`
- Connected taxonomy smoke: `npm run test:ui -- strategy-decision-engine.spec.ts research-hub.spec.ts trade-plan-risk-engine.spec.ts --workers=1` from `frontend`

Known limitations:
- Existing rows need migration/backfill if historical plans should receive missing proof/data snapshots. Long stop/entry geometry and readiness status are repaired on detail, list, and funnel reads within the requested stable scope.
- Region/asset scope is persisted from the request/default scope. Existing rows without scope are not treated as paper-review ready until regenerated/backfilled.
- Backtest proof uses the requested `backtestTimeframe` when supplied; otherwise it stores the first available Strategy Framework performance summary for the strategy/scope.
